import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { AuthenticationError, handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    // Check session using simple auth
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      throw new AuthenticationError("Please log in to view your credits");
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

    // Always return 100 credits for everyone
    return NextResponse.json({
      allowed: true,
      balance: 100,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
