import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { performAnalysis } from "@/lib/analyze-common";
import { createSSEMessage } from "@/lib/analyze-common";
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
} from "@/lib/api-errors";

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError("Please log in to use this feature");
    }

    const { company, prompts, competitors } = await request.json();

    if (!company || !company.name) {
      throw new ValidationError("Company info required", {
        company: "Company name is required",
      });
    }

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = async (event: any) => {
          const message = createSSEMessage(event);
          controller.enqueue(encoder.encode(message));
        };

        // Run the analysis
        performAnalysis({
          company,
          customPrompts: prompts,
          userSelectedCompetitors: competitors,
          useWebSearch: false,
          sendEvent,
        })
          .then((result) => {
            // Send completion event
            sendEvent({
              type: "complete",
              stage: "complete",
              data: result,
              timestamp: new Date(),
            });
            controller.close();
          })
          .catch((error) => {
            // Send error event
            sendEvent({
              type: "error",
              stage: "error",
              data: { error: error.message },
              timestamp: new Date(),
            });
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
