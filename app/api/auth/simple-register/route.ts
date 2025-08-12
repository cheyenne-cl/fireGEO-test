import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name required" },
        { status: 400 }
      );
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM "user" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await pool.end();
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Create user
    const userId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO "user" ("id", "email", "name", "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6)',
      [
        userId,
        email,
        name,
        true, // Assume email is verified for simplicity
        new Date(),
        new Date(),
      ]
    );

    // Create account
    await pool.query(
      'INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        crypto.randomUUID(),
        email,
        "email",
        userId,
        password, // Store as plain text for now
        new Date(),
        new Date(),
      ]
    );

    await pool.end();

    return NextResponse.json({
      success: true,
      user: { id: userId, email, name },
    });
  } catch (error) {
    console.error("Simple register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
