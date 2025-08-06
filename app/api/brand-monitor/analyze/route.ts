import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandAnalyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  AuthenticationError,
  ValidationError,
  InsufficientCreditsError,
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

    // Check if user has enough credits (10 credits for analysis)
    const userCredits = 100; // Hardcoded for now
    const requiredCredits = 10;

    if (userCredits < requiredCredits) {
      throw new InsufficientCreditsError(
        "Insufficient credits. You need at least 10 credits to analyze a company.",
        requiredCredits,
        userCredits
      );
    }

    // Track usage (10 credits)
    try {
      console.log(
        "[Brand Monitor] Tracking usage - Customer ID:",
        sessionResponse.user.id,
        "Count:",
        requiredCredits
      );
      const trackResult = await db.execute(
        db.select().from(brandAnalyses).where(eq(brandAnalyses.id, analysisId))
      );
      console.log(
        "[Brand Monitor] Track result:",
        JSON.stringify(trackResult, null, 2)
      );
    } catch (err) {
      console.error("[Brand Monitor] Failed to track usage:", err);
      // Log more details about the error
      if (err instanceof Error) {
        console.error("[Brand Monitor] Error details:", {
          message: err.message,
          stack: err.stack,
          response: (err as any).response?.data,
        });
      }
      throw new InsufficientCreditsError(
        "Unable to process credit deduction. Please try again",
        requiredCredits,
        userCredits
      );
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

    // Track usage with Autumn (deduct credits)
    try {
      console.log(
        "[Brand Monitor] Recording usage - Customer ID:",
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
          creditsUsed: requiredCredits,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
      console.log("[Brand Monitor] Usage recorded successfully");
    } catch (err) {
      console.error("Failed to track usage:", err);
      throw new InsufficientCreditsError(
        "Unable to process credit deduction. Please try again",
        requiredCredits,
        userCredits
      );
    }

    // Get remaining credits after deduction
    let remainingCredits = userCredits;
    try {
      const usage = await db.query.brandAnalyses.findFirst({
        where: eq(brandAnalyses.id, analysisId),
      });
      remainingCredits = usage?.creditsUsed || 0;
    } catch (err) {
      console.error("Failed to get remaining credits:", err);
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
          type: "credits",
          stage: "credits",
          data: {
            remainingCredits,
            creditsUsed: requiredCredits,
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
      error instanceof InsufficientCreditsError ||
      error instanceof ValidationError
    ) {
      return new Response(
        JSON.stringify({
          error: {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString(),
            metadata:
              error instanceof InsufficientCreditsError
                ? {
                    creditsRequired: error.creditsRequired,
                    creditsAvailable: error.creditsAvailable,
                  }
                : undefined,
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
