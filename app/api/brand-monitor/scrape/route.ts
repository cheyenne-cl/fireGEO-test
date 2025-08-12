import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { scrapeCompanyInfo } from "@/lib/scrape-utils";
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
} from "@/lib/api-errors";

export async function POST(request: NextRequest) {
  try {
    // Check session using simple auth
    const sessionToken = request.cookies.get('session-token')?.value;
    
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
