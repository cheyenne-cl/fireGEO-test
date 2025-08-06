import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/better-auth.config";

export async function POST(request: NextRequest) {
  try {
    const result = await auth.api.signOut({ headers: request.headers });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sign-out error:", error);
    return NextResponse.json({ error: "Sign-out failed" }, { status: 500 });
  }
}
