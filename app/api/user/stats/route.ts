import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandAnalyses, conversations, messages } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { handleApiError, AuthenticationError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError("Please log in to view your stats");
    }

    const userId = sessionResponse.user.id;

    // Get analyses count
    const analysesCount = await db
      .select({ count: brandAnalyses.id })
      .from(brandAnalyses)
      .where(eq(brandAnalyses.userId, userId));

    // Get total competitors tracked (sum of all competitors from analyses)
    const analysesWithCompetitors = await db
      .select({ competitors: brandAnalyses.competitors })
      .from(brandAnalyses)
      .where(eq(brandAnalyses.userId, userId));

    let totalCompetitors = 0;
    analysesWithCompetitors.forEach((analysis) => {
      if (analysis.competitors && Array.isArray(analysis.competitors)) {
        totalCompetitors += analysis.competitors.length;
      }
    });

    // Get insights generated (messages count from last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMessages = await db
      .select({ count: messages.id })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.userId, userId),
          gte(messages.createdAt, thirtyDaysAgo)
        )
      );

    const insightsGenerated = recentMessages.length;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAnalyses = await db
      .select({ count: brandAnalyses.id })
      .from(brandAnalyses)
      .where(
        and(
          eq(brandAnalyses.userId, userId),
          gte(brandAnalyses.createdAt, sevenDaysAgo)
        )
      );

    const recentActivity = recentAnalyses.length;

    return NextResponse.json({
      analysesRun: analysesCount.length,
      competitorsTracked: totalCompetitors,
      insightsGenerated: insightsGenerated,
      recentActivity: recentActivity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
