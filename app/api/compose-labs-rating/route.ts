import { NextRequest } from "next/server";
import { Pool } from "pg";
import { handleApiError, AuthenticationError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  let pool: Pool | null = null;

  try {
    // Check session using simple auth
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      throw new AuthenticationError("Please log in to view ratings");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    const sessionResult = await pool.query(
      'SELECT * FROM "session" WHERE "token" = $1 AND "expiresAt" > $2',
      [sessionToken, new Date()]
    );

    if (sessionResult.rows.length === 0) {
      throw new AuthenticationError("Invalid or expired session");
    }

    const session = sessionResult.rows[0];
    const userId = session.userId;

    // Query the database for the most recent Compose Labs analysis
    // Look for analyses with "compose labs" or "composelabs" in the company name or URL
    const analysisResult = await pool.query(
      `SELECT * FROM "brand_analyses" 
       WHERE ("company_name" ILIKE '%compoze%' OR "company_name" ILIKE '%compose%' OR "company_name" ILIKE '%composelabs%' OR "url" ILIKE '%compoze%' OR "url" ILIKE '%compose%' OR "url" ILIKE '%composelabs%')
       AND "user_id" = $1
       ORDER BY "created_at" DESC 
       LIMIT 1`,
      [userId]
    );

    if (analysisResult.rows.length === 0) {
      // No analysis found, return default data
      const defaultRating = {
        overallScore: 0,
        visibilityScore: 0,
        sentimentScore: 0,
        mentionsCount: 0,
        lastUpdated: new Date().toISOString(),
        trend: "stable" as const,
        companyName: "Compose Labs",
        website: "composelabs.com",
        message:
          "No analysis data available. Run a brand analysis for Compose Labs to see ratings.",
      };

      return Response.json(defaultRating);
    }

    const analysis = analysisResult.rows[0];
    console.log("Found analysis:", analysis.company_name);
    console.log("Analysis data type:", typeof analysis.analysis_data);

    let analysisData = null;

    try {
      // Handle both string and object data types
      if (typeof analysis.analysis_data === "string") {
        analysisData = JSON.parse(analysis.analysis_data);
      } else if (typeof analysis.analysis_data === "object") {
        analysisData = analysis.analysis_data;
      }

      console.log(
        "Parsed analysis data keys:",
        analysisData ? Object.keys(analysisData) : "null"
      );
      if (analysisData && analysisData.scores) {
        console.log("Scores found:", analysisData.scores);
      }
    } catch (error) {
      console.error("Error parsing analysis data:", error);
      analysisData = null;
    }

    // Extract scores from the analysis data
    let overallScore = 0;
    let visibilityScore = 0;
    let sentimentScore = 0;
    let mentionsCount = 0;

    if (analysisData && analysisData.scores) {
      // Use the scores from the analysis data
      visibilityScore = analysisData.scores.visibilityScore || 0;
      // Convert sentiment score from 0-100 scale to 0-10 scale
      sentimentScore = analysisData.scores.sentimentScore
        ? Math.round((analysisData.scores.sentimentScore / 10) * 10) / 10
        : 0;
      mentionsCount = 0; // We'll calculate this from competitors if available

      // Calculate mentions count from competitors data
      if (analysisData.competitors && Array.isArray(analysisData.competitors)) {
        // Find Compoze Labs in the competitors array and get its mentions
        const compozeLabs = analysisData.competitors.find(
          (comp: { name?: string; mentions?: number }) =>
            comp.name &&
            (comp.name.toLowerCase().includes("compoze") ||
              comp.name.toLowerCase().includes("compose"))
        );
        mentionsCount = compozeLabs ? compozeLabs.mentions || 0 : 0;
      }

      // Calculate overall score as average of sentiment and visibility
      overallScore =
        Math.round(((sentimentScore + visibilityScore) / 2) * 10) / 10;
    } else if (analysisData && analysisData.providerResults) {
      // Fallback to the old provider results format
      const providers = Object.keys(analysisData.providerResults);
      let totalSentiment = 0;
      let totalVisibility = 0;
      let totalMentions = 0;
      let providerCount = 0;

      providers.forEach((provider) => {
        const result = analysisData.providerResults[provider];
        if (result && result.sentimentScore !== undefined) {
          totalSentiment += result.sentimentScore;
          providerCount++;
        }
        if (result && result.visibilityScore !== undefined) {
          totalVisibility += result.visibilityScore;
        }
        if (result && result.mentionsCount !== undefined) {
          totalMentions += result.mentionsCount;
        }
      });

      if (providerCount > 0) {
        sentimentScore = Math.round((totalSentiment / providerCount) * 10) / 10;
        visibilityScore =
          Math.round((totalVisibility / providerCount) * 10) / 10;
        mentionsCount = totalMentions;
        overallScore =
          Math.round(((sentimentScore + visibilityScore) / 2) * 10) / 10;
      }
    }

    // Determine trend (for now, we'll use a simple calculation)
    // In a real implementation, you might compare with previous analyses
    const trend =
      overallScore > 7 ? "up" : overallScore < 4 ? "down" : "stable";

    const realRating = {
      overallScore,
      visibilityScore,
      sentimentScore,
      mentionsCount,
      lastUpdated: analysis.updated_at || analysis.created_at,
      trend,
      companyName: analysis.company_name || "Compose Labs",
      website: analysis.url || "composelabs.com",
    };

    return Response.json(realRating);
  } catch (error) {
    return handleApiError(error);
  } finally {
    // Ensure pool is ended even if an error occurs
    if (pool) {
      await pool.end();
    }
  }
}
