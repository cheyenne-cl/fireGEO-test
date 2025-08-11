import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { db } from "@/lib/db";
import { brandAnalyses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
} from "@/lib/api-errors";

// GET /api/brand-monitor/analyses - Get user's brand analyses
export async function GET(request: NextRequest) {
  try {
    // Check session using simple auth
    const sessionToken = request.cookies.get("session-token")?.value;
    
    if (!sessionToken) {
      throw new AuthenticationError("Please log in to view your analyses");
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

    const analyses = await db.query.brandAnalyses.findMany({
      where: eq(brandAnalyses.userId, userId),
      orderBy: desc(brandAnalyses.createdAt),
    });

    return NextResponse.json(analyses);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/brand-monitor/analyses - Save a new brand analysis
export async function POST(request: NextRequest) {
  try {
    // Check session using simple auth
    const sessionToken = request.cookies.get("session-token")?.value;
    
    if (!sessionToken) {
      throw new AuthenticationError("Please log in to save analyses");
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

    if (!body.url || !body.analysisData) {
      throw new ValidationError("Invalid request", {
        url: body.url ? undefined : "URL is required",
        analysisData: body.analysisData
          ? undefined
          : "Analysis data is required",
      });
    }

    const [analysis] = await db
      .insert(brandAnalyses)
      .values({
        userId: userId,
        url: body.url,
        companyName: body.companyName || "",
        industry: body.industry || "",
        analysisData: body.analysisData,
        competitors: body.competitors,
        prompts: body.prompts,
        creditsUsed: body.creditsUsed || 10,
      })
      .returning();

    return NextResponse.json(analysis);
  } catch (error) {
    return handleApiError(error);
  }
}
