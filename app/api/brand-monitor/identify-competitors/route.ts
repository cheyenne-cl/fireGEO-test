import { NextRequest, NextResponse } from "next/server";
import { identifyCompetitors } from "@/lib/ai-utils";
import { Company } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company,
      targetSize,
      geographicRegion,
      marketSegment,
    }: {
      company: Company;
      targetSize?: "startup" | "small" | "medium" | "large" | "enterprise";
      geographicRegion?: string;
      marketSegment?: "local" | "regional" | "national" | "global";
    } = body;

    if (!company) {
      return NextResponse.json(
        { error: "Company data is required" },
        { status: 400 }
      );
    }



    // Use AI to identify competitors with targeting options
    const competitors = await identifyCompetitors(
      company,
      (progress) => {
        // Progress callback - could be used for real-time updates
      },
      {
        targetSize,
        geographicRegion,
        marketSegment,
      }
    );



    return NextResponse.json({ competitors });
  } catch (error) {
    console.error("Error identifying competitors:", error);
    return NextResponse.json(
      { error: "Failed to identify competitors" },
      { status: 500 }
    );
  }
}
