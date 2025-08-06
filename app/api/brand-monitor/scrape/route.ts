import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scrapeCompanyInfo } from "@/lib/scrape-utils";
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
  InsufficientCreditsError,
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

    // Check if user has enough credits (1 credit for URL scraping)
    // Hardcoded to 100 credits for now
    const userCredits = 100;
    const requiredCredits = 1;

    if (userCredits < requiredCredits) {
      throw new InsufficientCreditsError(
        "Insufficient credits. You need at least 1 credit to analyze a URL.",
        requiredCredits,
        userCredits
      );
    }

    const { url, maxAge } = await request.json();

    if (!url) {
      throw new ValidationError("Invalid request", {
        url: "URL is required",
      });
    }

    // Ensure URL has protocol
    let normalizedUrl = url.trim();
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const company = await scrapeCompanyInfo(normalizedUrl, maxAge);

    return NextResponse.json({ company });
  } catch (error) {
    return handleApiError(error);
  }
}
