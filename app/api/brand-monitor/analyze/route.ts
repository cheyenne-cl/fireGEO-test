import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandAnalyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/api-errors";
import { performAnalysis } from "@/lib/analyze-common";

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError("Please log in to use this feature");
    }

    const body = await request.json();
    const { analysisId, company } = body;

    // Handle both new analysis and existing analysis loading
    if (!analysisId && (!company || !company.name)) {
      throw new ValidationError("Invalid request", {
        analysisId: "Analysis ID is required for existing analysis",
        company: "Company info is required for new analysis",
      });
    }



    const {
      prompts: customPrompts,
      competitors: userSelectedCompetitors,
      useWebSearch = false,
    } = body;

    if (!company || !company.name) {
      throw new ValidationError("Company info required", {
        company: "Company name is required",
      });
    }

    // Record the analysis
    try {
      console.log(
        "[Brand Monitor] Recording analysis - User ID:",
        sessionResponse.user.id
      );
      await db.execute(
        db.insert(brandAnalyses).values({
          id: analysisId,
          userId: sessionResponse.user.id,
          url: company.website || "",
          companyName: company.name,
          industry: company.industry,
          competitors: JSON.stringify(userSelectedCompetitors),
          prompts: JSON.stringify(customPrompts),
          creditsUsed: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
      console.log("[Brand Monitor] Analysis recorded successfully");
    } catch (err) {
      console.error("Failed to record analysis:", err);
      throw new Error("Unable to record analysis. Please try again");
    }

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Function to send SSE events
    const sendEvent = async (event: any) => {
      await writer.write(encoder.encode(JSON.stringify(event)));
    };

    // Start the async processing
    (async () => {
      try {
        // Send initial credit info
        await sendEvent({
                  type: "progress",
        stage: "complete",
        data: {
          message: "Analysis completed successfully",
        },
          timestamp: new Date(),
        });

        // Perform the analysis using common logic
        const analysisResult = await performAnalysis({
          company,
          prompts: customPrompts,
          competitors: userSelectedCompetitors,
          useWebSearch,
          sendEvent,
        });

        // Send final complete event with all data
        await sendEvent({
          type: "complete",
          stage: "finalizing",
          data: {
            analysis: analysisResult,
          },
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Analysis error:", error);
        await sendEvent({
          type: "error",
          stage: "error",
          data: {
            message: error instanceof Error ? error.message : "Analysis failed",
          },
          timestamp: new Date(),
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    // For SSE endpoints, we need to return a proper error response
    // instead of using handleApiError which returns NextResponse
    console.error("Brand monitor analyze API error:", error);

    if (
      error instanceof AuthenticationError ||

      error instanceof ValidationError
    ) {
      return new Response(
        JSON.stringify({
          error: {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString(),
            metadata: undefined,
          },
        }),
        {
          status: error.statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
