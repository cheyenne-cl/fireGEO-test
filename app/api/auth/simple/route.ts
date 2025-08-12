import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM "user" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Check password (assuming it's stored as plain text for now)
    const accountResult = await pool.query(
      'SELECT * FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
      [user.id, "email"]
    );

    if (accountResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const account = accountResult.rows[0];

    // For now, let's assume password is stored as plain text
    // In production, you'd want to hash passwords
    if (account.password !== password) {
      await pool.end();
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create a simple session
    const sessionId = crypto.randomBytes(32).toString("hex");
    const sessionToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      'INSERT INTO "session" ("id", "token", "userId", "expiresAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6)',
      [
        sessionId,
        sessionToken,
        user.id,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        new Date(),
        new Date(),
      ]
    );

    await pool.end();

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    // Set session cookie
    response.cookies.set("session-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
      domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
    });

    return response;
  } catch (error) {
    console.error("Simple auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
