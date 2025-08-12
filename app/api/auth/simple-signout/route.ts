import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (sessionToken) {
      // Clear the session cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set('session-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      return response;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Simple sign-out error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
