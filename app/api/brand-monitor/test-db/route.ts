import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET(request: NextRequest) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    const result = await pool.query("SELECT NOW() as current_time");
    await pool.end();

    return NextResponse.json({
      success: true,
      currentTime: result.rows[0].current_time,
      databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET",
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
