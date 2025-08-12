import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session-token')?.value;
    
    // Debug: log all cookies
    console.log('All cookies:', request.cookies.getAll());
    console.log('Session token:', sessionToken);
    
    if (!sessionToken) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    // Updated query to match the actual database schema
    const sessionResult = await pool.query(
      'SELECT * FROM "session" WHERE "token" = $1 AND "expiresAt" > $2',
      [sessionToken, new Date()]
    );

    console.log('Session query result:', sessionResult.rows.length);

    if (sessionResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const session = sessionResult.rows[0];

    const userResult = await pool.query(
      'SELECT * FROM "user" WHERE "id" = $1',
      [session.userId]
    );

    if (userResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const user = userResult.rows[0];
    await pool.end();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });

  } catch (error) {
    console.error('Simple session check error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
