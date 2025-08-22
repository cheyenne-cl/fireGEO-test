import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { generatePromptsForCompany } from "@/lib/ai-utils";
import { Company } from "@/lib/types";
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

    await pool.end();

    const { company, competitors } = await request.json();

    if (!company) {
      throw new ValidationError("Invalid request", {
        company: "Company data is required",
      });
    }

    if (!competitors || !Array.isArray(competitors)) {
      throw new ValidationError("Invalid request", {
        competitors: "Competitors array is required",
      });
    }

    // Generate prompts using the same function as the analysis
    const prompts = await generatePromptsForCompany(company as Company, competitors);

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Generate prompts API error:", error);
    return handleApiError(error);
  }
}
