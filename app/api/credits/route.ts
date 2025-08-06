import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AuthenticationError, handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError("Please log in to view your credits");
    }

    // Hardcode credits to 100 for now
    return NextResponse.json({
      allowed: true,
      balance: 100,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
