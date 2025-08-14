import { NextRequest } from "next/server";
import { Pool } from "pg";
import { performAnalysis } from "@/lib/analyze-common";
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
} from "@/lib/api-errors";
import { createSSEMessage } from "@/lib/analyze-common";
import { SSEEvent } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // Check session using simple auth
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      throw new AuthenticationError("Please log in to use this feature");
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    const sessionResult = await pool.query(
      'SELECT * FROM "session" WHERE "token" = $1 AND "expiresAt" > $2',
      [sessionToken, new Date()]
    );

    if (sessionResult.rows.length === 0) {
      await pool.end();
      throw new AuthenticationError("Invalid or expired session");
    }

    const session = sessionResult.rows[0];
    const userId = session.userId;
    await pool.end();

    const body = await request.json();

    const { analysisId, company, prompts, competitors } = body;

    if (!analysisId || !company) {
      console.log("[DEBUG] Validation failed - missing analysisId or company");
      throw new ValidationError("Invalid request", {
        analysisId: "Analysis ID is required",
        company: "Company info is required",
      });
    }

    // Transform competitors to match expected format
    interface Competitor {
      name: string;
    }

    const userSelectedCompetitors: Competitor[] = Array.isArray(competitors)
      ? competitors.map((comp: { name: string }) => ({ name: comp.name }))
      : [];
    console.log("[DEBUG] Transformed competitors:", userSelectedCompetitors);

    console.log("[DEBUG] Creating SSE stream");
    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = async (event: SSEEvent<unknown>) => {
          const message = createSSEMessage(event);
          controller.enqueue(encoder.encode(message));
        };

        // Start the analysis in a separate async function
        (async () => {
          try {
            console.log("[DEBUG] Starting analysis");
            // Send initial event
            await sendEvent({
              type: "start",
              stage: "initializing",
              data: {
                message: `Starting analysis for ${company.name}`,
              },
              timestamp: new Date(),
            });

            console.log("[DEBUG] Calling performAnalysis");
            // Log provider configuration before analysis
            const { getAvailableProviders } = await import(
              "@/lib/analyze-common"
            );
            const availableProviders = getAvailableProviders();
            console.log(
              "[DEBUG] Available providers:",
              availableProviders.map((p) => p.name)
            );
            console.log("[DEBUG] Environment variables check:", {
              OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
              ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
              GOOGLE_GENERATIVE_AI_API_KEY:
                !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
              PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
              USE_MOCK_MODE: process.env.USE_MOCK_MODE,
            });

            // Perform the analysis using common logic
            const analysisResult = await performAnalysis({
              company,
              customPrompts: prompts || [],
              userSelectedCompetitors,
              useWebSearch: false,
              sendEvent,
            });

            console.log("[DEBUG] Analysis completed successfully");
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
            console.error("[DEBUG] Analysis error:", error);
            console.error(
              "[DEBUG] Error stack:",
              error instanceof Error ? error.stack : "No stack trace"
            );
            await sendEvent({
              type: "error",
              stage: "finalizing",
              data: {
                message:
                  error instanceof Error ? error.message : "Analysis failed",
              },
              timestamp: new Date(),
            });
          } finally {
            controller.close();
          }
        })();
      },
    });

    console.log("[DEBUG] Returning SSE response");
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[DEBUG] Route error:", error);
    return handleApiError(error);
  }
}
