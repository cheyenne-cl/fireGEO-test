import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getEnabledProviders } from "@/lib/provider-config";
import { handleApiError, AuthenticationError } from "@/lib/api-errors";

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

    const providers = getEnabledProviders();
    
    return NextResponse.json({
      providers: providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        enabled: provider.enabled
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}