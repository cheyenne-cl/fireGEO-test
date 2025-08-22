import { NextRequest, NextResponse } from "next/server";
import { getConfiguredProviders } from "@/lib/provider-config";
import { firecrawl } from "@/lib/firecrawl";

export async function GET(request: NextRequest) {
  try {
    // Check session using simple auth
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: "Authentication required",
          status: "unauthenticated",
        },
        { status: 401 }
      );
    }

    const pool = new (await import("pg")).Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    const sessionResult = await pool.query(
      'SELECT * FROM "session" WHERE "token" = $1 AND "expiresAt" > $2',
      [sessionToken, new Date()]
    );

    if (sessionResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        {
          error: "Invalid or expired session",
          status: "session_expired",
        },
        { status: 401 }
      );
    }

    await pool.end();

    // Check all configurations
    const configuredProviders = getConfiguredProviders();

    const configStatus = {
      status: "ok",
      authentication: "valid",
      database: "connected",
      firecrawl: {
        configured: !!process.env.FIRECRAWL_API_KEY,
        available: !!firecrawl,
      },
      ai_providers: {
        total_configured: configuredProviders.length,
        providers: configuredProviders.map((p) => ({
          name: p.name,
          configured: p.isConfigured(),
          enabled: p.enabled,
        })),
        environment_variables: {
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
          GOOGLE_GENERATIVE_AI_API_KEY:
            !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
        },
      },
      recommendations: [],
    };

    // Generate recommendations based on configuration
    if (!configStatus.firecrawl.configured) {
      configStatus.recommendations.push(
        "Set FIRECRAWL_API_KEY to enable web scraping"
      );
    }

    if (configStatus.ai_providers.total_configured === 0) {
      configStatus.recommendations.push(
        "Set at least one AI provider API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or PERPLEXITY_API_KEY)"
      );
    }

    if (configStatus.recommendations.length > 0) {
      configStatus.status = "configuration_issues";
    }

    return NextResponse.json(configStatus);
  } catch (error) {
    console.error("Test env error:", error);
    return NextResponse.json(
      {
        error: "Configuration test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      },
      { status: 500 }
    );
  }
}
