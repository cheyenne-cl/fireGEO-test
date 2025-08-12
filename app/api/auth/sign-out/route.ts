import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const response = await auth.api.signOut(request);
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}
