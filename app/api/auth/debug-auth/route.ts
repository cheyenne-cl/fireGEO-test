import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Test the auth configuration
    const body = await request.json();
    
    return NextResponse.json({
      message: "Auth debug endpoint",
      body: body,
      authConfig: {
        hasDatabase: !!auth.database,
        hasSecret: !!auth.secret,
        hasBaseURL: !!auth.baseURL,
        emailAndPasswordEnabled: auth.emailAndPassword?.enabled,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
