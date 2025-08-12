import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    hasGoogle: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    hasPerplexity: !!process.env.PERPLEXITY_API_KEY,
    hasDatabase: !!process.env.DATABASE_URL,
    hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
    useMockMode: process.env.USE_MOCK_MODE,
    openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || "none",
  });
}
