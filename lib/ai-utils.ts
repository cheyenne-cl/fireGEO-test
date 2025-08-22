import { generateText, generateObject } from "ai";
import { z } from "zod";
import {
  Company,
  BrandPrompt,
  AIResponse,
  CompanyRanking,
  CompetitorRanking,
  ProviderSpecificRanking,
  ProviderComparisonData,
  ProgressCallback,
  CompetitorFoundData,
} from "./types";
import {
  getProviderModel,
  normalizeProviderName,
  isProviderConfigured,
  getConfiguredProviders,
  PROVIDER_CONFIGS,
} from "./provider-config";
import {
  detectBrandMention,
  detectMultipleBrands,
  BrandDetectionOptions,
} from "./brand-detection-utils";
import { getBrandDetectionOptions } from "./brand-detection-config";

const RankingSchema = z.object({
  rankings: z.array(
    z.object({
      position: z.number(),
      company: z.string(),
      reason: z.string().optional(),
      sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
    })
  ),
  analysis: z.object({
    brandMentioned: z.boolean(),
    brandPosition: z.number().optional(),
    competitors: z.array(z.string()),
    overallSentiment: z.enum(["positive", "neutral", "negative"]),
    confidence: z.number().min(0).max(1),
  }),
});

const CompetitorSchema = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      isDirectCompetitor: z.boolean(),
      marketOverlap: z.enum(["high", "medium", "low"]),
      businessModel: z
        .string()
        .describe("e.g., DTC brand, SaaS, API service, marketplace"),
      competitorType: z
        .enum(["direct", "indirect", "retailer", "platform"])
        .describe(
          "direct = same products, indirect = adjacent products, retailer = sells products, platform = aggregates"
        ),
    })
  ),
});

// Helper functions for targeted competitor identification
function detectCompanySize(
  company: Company
): "startup" | "small" | "medium" | "large" | "enterprise" {
  const description = company.description?.toLowerCase() || "";
  const name = company.name?.toLowerCase() || "";
  const industry = company.industry?.toLowerCase() || "";

  // Keywords that suggest company size
  const startupKeywords = [
    "startup",
    "new",
    "emerging",
    "founded",
    "launched",
    "innovative",
    "disruptive",
  ];
  const smallKeywords = [
    "small",
    "local",
    "boutique",
    "specialized",
    "niche",
    "family-owned",
  ];
  const enterpriseKeywords = [
    "enterprise",
    "global",
    "fortune 500",
    "multinational",
    "corporate",
    "large-scale",
  ];

  // Check for enterprise indicators
  if (
    enterpriseKeywords.some(
      (keyword) => description.includes(keyword) || name.includes(keyword)
    )
  ) {
    return "enterprise";
  }

  // Check for startup indicators
  if (
    startupKeywords.some(
      (keyword) => description.includes(keyword) || name.includes(keyword)
    )
  ) {
    return "startup";
  }

  // Check for small business indicators
  if (
    smallKeywords.some(
      (keyword) => description.includes(keyword) || name.includes(keyword)
    )
  ) {
    return "small";
  }

  // Default based on industry
  if (industry.includes("saas") || industry.includes("tech")) {
    return "medium"; // Most tech companies are medium-sized
  }

  return "small"; // Default to small for unknown companies
}

function detectGeographicFocus(company: Company): string {
  const description = company.description?.toLowerCase() || "";
  const location = company.location?.toLowerCase() || "";
  const name = company.name?.toLowerCase() || "";

  // Extract location hints
  if (
    location.includes("minneapolis") ||
    location.includes("mn") ||
    description.includes("minneapolis")
  ) {
    return "Minneapolis/St. Paul area";
  }
  if (
    location.includes("san francisco") ||
    location.includes("sf") ||
    description.includes("bay area")
  ) {
    return "San Francisco Bay Area";
  }
  if (
    location.includes("new york") ||
    location.includes("nyc") ||
    description.includes("manhattan")
  ) {
    return "New York City area";
  }
  if (location.includes("austin") || description.includes("texas")) {
    return "Austin/Texas area";
  }
  if (
    location.includes("seattle") ||
    description.includes("pacific northwest")
  ) {
    return "Seattle/Pacific Northwest";
  }
  if (location.includes("boston") || description.includes("massachusetts")) {
    return "Boston/New England";
  }
  if (description.includes("local") || description.includes("regional")) {
    return "Local/Regional market";
  }
  if (description.includes("national") || description.includes("usa")) {
    return "National (USA)";
  }
  if (description.includes("global") || description.includes("international")) {
    return "Global market";
  }

  return "National (USA)"; // Default
}

function detectMarketSegment(
  company: Company
): "local" | "regional" | "national" | "global" {
  const description = company.description?.toLowerCase() || "";
  const geographicFocus = detectGeographicFocus(company);

  if (
    geographicFocus.includes("Local") ||
    geographicFocus.includes("Regional")
  ) {
    return "local";
  }
  if (geographicFocus.includes("National")) {
    return "national";
  }
  if (geographicFocus.includes("Global")) {
    return "global";
  }

  // Default based on description
  if (description.includes("local") || description.includes("regional")) {
    return "local";
  }
  if (description.includes("national")) {
    return "national";
  }
  if (description.includes("global") || description.includes("international")) {
    return "global";
  }

  return "national"; // Default
}

function getSizeDescription(size: string): string {
  const descriptions = {
    startup: "Early-stage companies, typically <50 employees",
    small: "Small businesses, typically 10-100 employees",
    medium: "Mid-sized companies, typically 100-1000 employees",
    large: "Large companies, typically 1000-10000 employees",
    enterprise: "Enterprise companies, typically 10000+ employees",
  };
  return descriptions[size as keyof typeof descriptions] || descriptions.small;
}

export async function identifyCompetitors(
  company: Company,
  progressCallback?: ProgressCallback,
  options?: {
    targetSize?: "startup" | "small" | "medium" | "large" | "enterprise";
    geographicRegion?: string;
    marketSegment?: "local" | "regional" | "national" | "global";
  }
): Promise<string[]> {
  try {
    // Use AI to identify real competitors - find first available provider
    const configuredProviders = getConfiguredProviders();
    if (configuredProviders.length === 0) {
      throw new Error("No AI providers configured and enabled");
    }

    // Use the first available provider
    const provider = configuredProviders[0];
    const model = getProviderModel(provider.id, provider.defaultModel);
    if (!model) {
      throw new Error(`${provider.name} model not available`);
    }

    // Determine company size and market focus for more targeted competitor identification
    const companySize = options?.targetSize || detectCompanySize(company);
    const geographicFocus =
      options?.geographicRegion || detectGeographicFocus(company);
    const marketSegment =
      options?.marketSegment || detectMarketSegment(company);

    const prompt = `Identify 6-9 real, established competitors of ${company.name} in the ${company.industry || "technology"} industry.

Company: ${company.name}
Industry: ${company.industry}
Description: ${company.description}
${company.scrapedData?.keywords ? `Keywords: ${company.scrapedData.keywords.join(", ")}` : ""}
${company.scrapedData?.competitors ? `Known competitors: ${company.scrapedData.competitors.join(", ")}` : ""}

COMPANY PROFILE:
- Size: ${companySize} (${getSizeDescription(companySize)})
- Geographic Focus: ${geographicFocus}
- Market Segment: ${marketSegment}

Based on this company's specific profile, identify competitors that:
1. Are SIMILAR IN SIZE (${companySize} companies, not global giants)
2. Target the SAME GEOGRAPHIC REGION (${geographicFocus})
3. Serve the SAME MARKET SEGMENT (${marketSegment})
4. Offer SIMILAR products/services
5. Have a SIMILAR business model

COMPETITOR CRITERIA:
- For ${companySize} companies: Focus on other ${companySize} companies, not industry giants
- For ${geographicFocus} focus: Find competitors in the same region
- For ${marketSegment} market: Target companies serving the same customer segment
- Exclude global giants unless the company itself is large/enterprise
- Prioritize direct competitors with similar market positioning

For example:
- If it's a small local web agency, find OTHER small local web agencies
- If it's a regional SaaS company, find OTHER regional SaaS companies
- If it's a startup AI tool, find OTHER startup AI tools, not OpenAI/Google

IMPORTANT: 
- Only include companies you are confident actually exist
- Focus on TRUE competitors with similar market positioning
- Exclude global giants unless the company itself is large
- Aim for 6-9 competitors total
- Prioritize companies of similar size and geographic focus`;

    const { object } = await generateObject({
      model,
      schema: CompetitorSchema,
      prompt,
      temperature: 0.3,
    });

    // Extract competitor names and filter for direct competitors
    // Exclude retailers and platforms unless the company itself is one
    const isRetailOrPlatform =
      company.industry?.toLowerCase().includes("marketplace") ||
      company.industry?.toLowerCase().includes("platform") ||
      company.industry?.toLowerCase().includes("retailer");

    const competitors = object.competitors
      .filter((c) => {
        // Always include direct competitors with high market overlap
        if (c.isDirectCompetitor && c.marketOverlap === "high") return true;

        // Exclude retailers/platforms for product companies
        if (
          !isRetailOrPlatform &&
          (c.competitorType === "retailer" || c.competitorType === "platform")
        ) {
          return false;
        }

        // Include other direct competitors and high-overlap indirect competitors
        return (
          c.competitorType === "direct" ||
          (c.competitorType === "indirect" && c.marketOverlap === "high")
        );
      })
      .map((c) => c.name)
      .slice(0, 9); // Limit to 9 competitors max

    // Add any competitors found during scraping
    if (company.scrapedData?.competitors) {
      company.scrapedData.competitors.forEach((comp) => {
        if (!competitors.includes(comp)) {
          competitors.push(comp);
        }
      });
    }

    // Send progress events for each competitor found
    if (progressCallback) {
      for (let i = 0; i < competitors.length; i++) {
        progressCallback({
          type: "competitor-found",
          stage: "identifying-competitors",
          data: {
            competitor: competitors[i],
            index: i + 1,
            total: competitors.length,
          } as CompetitorFoundData,
          timestamp: new Date(),
        });
      }
    }

    return competitors;
  } catch (error) {
    console.error("Error identifying competitors:", error);
    return company.scrapedData?.competitors || [];
  }
}

// Enhanced industry detection function
async function detectIndustryFromContent(company: Company): Promise<string> {
  // Start with explicit industry if set
  if (company.industry) {
    return company.industry;
  }

  // Analyze scraped content for better industry detection
  if (company.scrapedData) {
    const { title, description, mainContent, keywords } = company.scrapedData;

    // Combine all text content for analysis
    const allContent = [title, description, mainContent, ...(keywords || [])]
      .join(" ")
      .toLowerCase();

    // Enhanced keyword detection with context
    if (
      allContent.includes("web scraping") ||
      allContent.includes("scraping") ||
      allContent.includes("crawling") ||
      allContent.includes("web crawler") ||
      allContent.includes("data extraction") ||
      allContent.includes("html parsing")
    ) {
      return "web scraping";
    }

    if (
      allContent.includes("artificial intelligence") ||
      allContent.includes("machine learning") ||
      allContent.includes("ai model") ||
      allContent.includes("llm") ||
      allContent.includes("natural language")
    ) {
      return "artificial intelligence";
    }

    if (
      allContent.includes("deployment") ||
      allContent.includes("hosting") ||
      allContent.includes("cloud platform") ||
      allContent.includes("server") ||
      allContent.includes("infrastructure")
    ) {
      return "deployment platform";
    }

    if (
      allContent.includes("e-commerce") ||
      allContent.includes("ecommerce") ||
      allContent.includes("online store") ||
      allContent.includes("shopping cart")
    ) {
      return "e-commerce";
    }

    // Use first keyword as fallback
    if (keywords && keywords.length > 0) {
      return keywords[0];
    }
  }

  return "technology";
}

export async function generatePromptsForCompany(
  company: Company,
  competitors: string[]
): Promise<BrandPrompt[]> {
  const prompts: BrandPrompt[] = [];
  let promptId = 0;

  const brandName = company.name;

  // Extract context from scraped data
  const scrapedData = company.scrapedData;
  const keywords = scrapedData?.keywords || [];
  const mainProducts = scrapedData?.mainProducts || [];
  const description = scrapedData?.description || company.description || "";

  // Build a more specific context from the scraped data
  let productContext = "";
  let categoryContext = "";

  // If we have specific products, use those first
  if (mainProducts.length > 0) {
    productContext = mainProducts.slice(0, 2).join(" and ");
    // Infer category from products
    const productsLower = mainProducts.join(" ").toLowerCase();
    if (
      productsLower.includes("cooler") ||
      productsLower.includes("drinkware")
    ) {
      categoryContext = "outdoor gear brands";
    } else if (
      productsLower.includes("software") ||
      productsLower.includes("api")
    ) {
      categoryContext = "software companies";
    } else {
      categoryContext = `${mainProducts[0]} brands`;
    }
  }

  // Analyze keywords and description to understand what the company actually does
  const keywordsLower = keywords.map((k) => k.toLowerCase()).join(" ");
  const descLower = description.toLowerCase();
  const allContext = `${keywordsLower} ${descLower} ${mainProducts.join(" ")}`;

  // Only determine category if we don't already have it from mainProducts
  if (!productContext) {
    // Check industry first for more accurate categorization
    const industryLower = (company.industry || "").toLowerCase();

    if (
      industryLower === "outdoor gear" ||
      allContext.includes("cooler") ||
      allContext.includes("drinkware") ||
      allContext.includes("tumbler") ||
      allContext.includes("outdoor")
    ) {
      productContext = "coolers and drinkware";
      categoryContext = "outdoor gear brands";
    } else if (
      industryLower === "web scraping" ||
      allContext.includes("web scraping") ||
      allContext.includes("data extraction") ||
      allContext.includes("crawler")
    ) {
      productContext = "web scraping tools";
      categoryContext = "data extraction services";
    } else if (
      allContext.includes("ai") ||
      allContext.includes("artificial intelligence") ||
      allContext.includes("machine learning")
    ) {
      productContext = "AI tools";
      categoryContext = "artificial intelligence platforms";
    } else if (
      allContext.includes("software") ||
      allContext.includes("saas") ||
      allContext.includes("application")
    ) {
      productContext = "software solutions";
      categoryContext = "SaaS platforms";
    } else if (
      allContext.includes("clothing") ||
      allContext.includes("apparel") ||
      allContext.includes("fashion")
    ) {
      productContext = "clothing and apparel";
      categoryContext = "fashion brands";
    } else if (
      allContext.includes("furniture") ||
      allContext.includes("home") ||
      allContext.includes("decor")
    ) {
      productContext = "furniture and home goods";
      categoryContext = "home furnishing brands";
    } else {
      // Fallback: use the most prominent keywords, but avoid misclassifications
      productContext = keywords.slice(0, 3).join(" and ") || "products";
      categoryContext = company.industry || "companies";
    }
  }

  // Safety check: if we somehow got "beverage" but it's clearly not a beverage company
  if (
    productContext.includes("beverage") &&
    (brandName.toLowerCase() === "yeti" || allContext.includes("cooler"))
  ) {
    productContext = "coolers and outdoor gear";
    categoryContext = "outdoor equipment brands";
  }

  // Generate contextually relevant prompts
  const contextualTemplates = {
    ranking: [
      `Compare ${competitors.join(", ")} and ${brandName} for ${productContext}`,
      `Rank ${competitors.join(", ")} and ${brandName} by their ${productContext} capabilities`,
      `Which is better for ${productContext}: ${competitors.slice(0, Math.min(3, competitors.length)).join(" vs ")} vs ${brandName}?`,
      `Top ${categoryContext} including ${competitors.join(", ")} and ${brandName}`,
    ],
    comparison: [
      `${brandName} vs ${competitors.slice(0, Math.min(3, competitors.length)).join(" vs ")} for ${productContext}`,
      `How does ${brandName} compare to ${competitors.join(", ")}?`,
      competitors[0] && mainProducts[0]
        ? `${competitors[0]} or ${brandName} which has better ${mainProducts[0]}`
        : `${brandName} compared to ${competitors.slice(0, Math.min(3, competitors.length)).join(", ")}`,
    ],
    alternatives: [
      `Alternatives to ${brandName}: ${competitors.join(", ")}`,
      `${categoryContext} similar to ${brandName}: ${competitors.join(", ")}`,
      `Competitors of ${brandName} in ${productContext.split(" ")[0]} market: ${competitors.join(", ")}`,
    ],
    recommendations: [
      mainProducts.length > 0
        ? `Is ${brandName} ${mainProducts[0]} worth buying compared to ${competitors.slice(0, Math.min(3, competitors.length)).join(", ")}?`
        : `Is ${brandName} worth it for ${productContext} compared to ${competitors.slice(0, Math.min(3, competitors.length)).join(", ")}?`,
      `${brandName} ${productContext} reviews vs ${competitors.slice(0, Math.min(3, competitors.length)).join(", ")}`,
      `Should I buy ${brandName} or ${competitors.slice(0, Math.min(3, competitors.length)).join(", ")} for ${productContext}?`,
      `Best ${productContext} among ${brandName} and ${competitors.join(", ")}`,
    ],
  };

  // Generate prompts from contextual templates
  Object.entries(contextualTemplates).forEach(([category, templates]) => {
    templates.forEach((prompt) => {
      prompts.push({
        id: (++promptId).toString(),
        prompt,
        category: category as BrandPrompt["category"],
      });
    });
  });

  return prompts;
}

export async function analyzePromptWithProvider(
  prompt: string,
  provider: string,
  brandName: string,
  competitors: string[],
  useMockMode: boolean = false
): Promise<AIResponse> {
  // Handle mock mode with simulated responses
  if (useMockMode) {
    console.log(
      `[MOCK] Simulating analysis for ${provider} with prompt: "${prompt.substring(0, 50)}..."`
    );

    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 1000)
    );

    // Generate mock response
    const mockResponse = {
      provider: provider,
      prompt,
      response: `[MOCK] Analysis of ${brandName} and competitors: ${competitors.join(", ")}. This is a simulated response for testing purposes.`,
      rankings: [
        {
          position: 1,
          company: brandName,
          reason: "Primary brand being analyzed",
          sentiment: "neutral" as const,
        },
        ...competitors.slice(0, 3).map((comp, index) => ({
          position: index + 2,
          company: comp,
          reason: "Competitor identified in analysis",
          sentiment: "neutral" as const,
        })),
      ],
      competitors: competitors.slice(0, 3),
      brandMentioned: true,
      brandPosition: 1,
      sentiment: "neutral" as const,
      confidence: 0.8,
      timestamp: new Date(),
      detectionDetails: {
        brandMatches: [],
        competitorMatches: new Map(),
      },
    };

    return mockResponse;
  }

  // Normalize provider name for consistency
  const normalizedProvider = normalizeProviderName(provider);

  // Get model from centralized configuration
  const model = getProviderModel(normalizedProvider);

  if (!model) {
    console.warn(`Provider ${provider} not configured, skipping provider`);
    // Return null to indicate this provider should be skipped
    return null as any;
  }

  const systemPrompt = `You are an AI assistant analyzing brand visibility and rankings.
When responding to prompts about tools, platforms, or services:
1. Provide rankings with specific positions (1st, 2nd, etc.)
2. Focus on the companies mentioned in the prompt
3. Be objective and factual
4. Explain briefly why each tool is ranked where it is
5. If you don't have enough information about a specific company, you can mention that`;

  try {
    // First, get the response

    const { text } = await generateText({
      model,
      prompt: `${systemPrompt}\n\nPrompt: ${prompt}`,
      temperature: 0.3,
    });

    // Then, generate structured analysis

    const { object } = await generateObject({
      model,
      schema: z.object({
        analysis: z.object({
          brandMentioned: z
            .boolean()
            .describe("Whether the brand is mentioned in the response"),
          brandPosition: z
            .number()
            .nullable()
            .optional()
            .describe(
              "The brand's position/ranking (1-10, or null if not ranked)"
            ),
          overallSentiment: z
            .enum(["positive", "neutral", "negative"])
            .describe("Overall sentiment about the brand"),
          confidence: z
            .number()
            .min(0)
            .max(1)
            .describe("Confidence in the analysis (0-1)"),
          rankings: z
            .array(
              z.object({
                position: z
                  .number()
                  .describe("Position/ranking (1, 2, 3, etc.)"),
                company: z.string().describe("Company name"),
                reason: z.string().describe("Brief reason for this ranking"),
                sentiment: z
                  .enum(["positive", "neutral", "negative"])
                  .describe("Sentiment about this company"),
              })
            )
            .describe("Rankings of companies mentioned in the response"),
          competitors_mentioned: z
            .array(z.string())
            .describe("List of competitor names mentioned in the response"),
        }),
      }),
      prompt: `Analyze this AI response about ${brandName} and competitors ${competitors.join(", ")}:

"${text}"

Return a structured analysis including:
1. Whether ${brandName} is mentioned
2. ${brandName}'s position/ranking if mentioned
3. Overall sentiment about ${brandName}
4. Confidence in the analysis
5. Rankings of all companies mentioned
6. List of competitors mentioned

Be objective and factual.`,
    });

    // Get the proper display name for the provider
    const providerDisplayName =
      provider === "openai"
        ? "OpenAI"
        : provider === "anthropic"
          ? "Anthropic"
          : provider === "google"
            ? "Google"
            : provider === "perplexity"
              ? "Perplexity"
              : provider; // fallback to original

    // Use enhanced brand detection
    const brandDetectionResult = detectBrandMention(text, brandName, {
      caseSensitive: false,
      wholeWordOnly: true,
      includeVariations: true,
    });

    const competitorDetectionResults = detectMultipleBrands(text, competitors, {
      caseSensitive: false,
      wholeWordOnly: true,
      includeVariations: true,
    });

    const brandMentioned =
      object.analysis.brandMentioned || brandDetectionResult.mentioned;
    const relevantCompetitors = competitors.filter(
      (c) => competitorDetectionResults.get(c)?.mentioned || false
    );

    // Ensure we have rankings data
    let rankings = object.analysis.rankings || [];

    // If no rankings from structured output, try to generate basic ones from mentions
    if (rankings.length === 0) {
      const mentionedCompanies = [brandName, ...competitors].filter(
        (company) => {
          const detection = detectBrandMention(text, company, {
            caseSensitive: false,
            wholeWordOnly: true,
            includeVariations: true,
          });
          return detection.mentioned;
        }
      );

      rankings = mentionedCompanies.slice(0, 5).map((company, index) => ({
        position: index + 1,
        company,
        reason: `${company} was mentioned in the analysis`,
        sentiment: "neutral" as const,
      }));
    }

    return {
      provider: providerDisplayName,
      prompt,
      response: text,
      rankings,
      competitors: relevantCompetitors,
      brandMentioned,
      brandPosition: object.analysis.brandPosition,
      sentiment: object.analysis.overallSentiment,
      confidence: object.analysis.confidence,
      timestamp: new Date(),
      detectionDetails: {
        brandMatches: brandDetectionResult.matches.map((m) => ({
          text: m.text,
          index: m.index,
          confidence: m.confidence,
        })),
        competitorMatches: new Map(
          Array.from(competitorDetectionResults.entries())
            .filter(([_, result]) => result.mentioned)
            .map(([name, result]) => [
              name,
              result.matches.map((m: any) => ({
                text: m.text,
                index: m.index,
                confidence: m.confidence,
              })),
            ])
        ),
      },
    };
  } catch (error) {
    console.error(`Error with ${provider}:`, error);

    // Special handling for Google errors
    if (provider === "Google" || provider === "google") {
      console.error("Google-specific error details:", {
        message: (error as any).message,
        stack: (error as any).stack,
        name: (error as any).name,
        cause: (error as any).cause,
      });
    }

    // Throw a meaningful error instead of returning mock data
    throw new Error(
      `Failed to analyze with ${provider}: ${(error as any).message}. Please check your API configuration and try again.`
    );
  }
}

export async function analyzeCompetitors(
  company: Company,
  responses: AIResponse[],
  knownCompetitors: string[]
): Promise<CompetitorRanking[]> {
  // Create a set of companies to track (company + its known competitors)
  const trackedCompanies = new Set([company.name, ...knownCompetitors]);

  // Initialize competitor data
  const competitorMap = new Map<
    string,
    {
      mentions: number;
      positions: number[];
      sentiments: ("positive" | "neutral" | "negative")[];
    }
  >();

  // Initialize all tracked companies
  trackedCompanies.forEach((companyName) => {
    competitorMap.set(companyName, {
      mentions: 0,
      positions: [],
      sentiments: [],
    });
  });

  // Process all responses
  responses.forEach((response) => {
    // Track which companies were mentioned in this response
    const mentionedInResponse = new Set<string>();

    // Process rankings if available
    if (response.rankings) {
      response.rankings.forEach((ranking) => {
        // Only track companies we care about
        if (trackedCompanies.has(ranking.company)) {
          const data = competitorMap.get(ranking.company)!;

          // Only count one mention per response
          if (!mentionedInResponse.has(ranking.company)) {
            data.mentions++;
            mentionedInResponse.add(ranking.company);
          }

          data.positions.push(ranking.position);
          if (ranking.sentiment) {
            data.sentiments.push(ranking.sentiment);
          }
        }
      });
    }

    // Count brand mentions (only if not already counted in rankings)
    if (
      response.brandMentioned &&
      trackedCompanies.has(company.name) &&
      !mentionedInResponse.has(company.name)
    ) {
      const brandData = competitorMap.get(company.name)!;
      brandData.mentions++;
      if (response.brandPosition) {
        brandData.positions.push(response.brandPosition);
      }
      brandData.sentiments.push(response.sentiment);
    }
  });

  // Calculate scores for each competitor
  const totalResponses = responses.length;
  const competitors: CompetitorRanking[] = [];

  competitorMap.forEach((data, name) => {
    const avgPosition =
      data.positions.length > 0
        ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length
        : 99; // High number for companies not ranked

    const sentimentScore = calculateSentimentScore(data.sentiments);
    let visibilityScore = (data.mentions / totalResponses) * 100;

    // Apply discount factor for self-analysis to prevent false 100% scores
    if (name === company.name) {
      // For self-analysis, apply a discount factor based on how many other companies were mentioned
      const otherMentions = Array.from(competitorMap.entries())
        .filter(([otherName]) => otherName !== company.name)
        .reduce((sum, [, otherData]) => sum + otherData.mentions, 0);
      
      // If other companies were mentioned, apply a discount
      if (otherMentions > 0) {
        const discountFactor = Math.min(0.8, otherMentions / totalResponses);
        visibilityScore = visibilityScore * (1 - discountFactor);
      } else {
        // If no other companies mentioned, apply a significant discount
        visibilityScore = visibilityScore * 0.6;
      }
    }

    competitors.push({
      name,
      mentions: data.mentions,
      averagePosition: Math.round(avgPosition * 10) / 10,
      sentiment: determineSentiment(data.sentiments),
      sentimentScore,
      shareOfVoice: 0, // Will calculate after all competitors are processed
      visibilityScore: Math.round(visibilityScore * 10) / 10,
      weeklyChange: undefined, // No historical data available yet
      isOwn: name === company.name,
    });
  });

  // Calculate share of voice
  const totalMentions = competitors.reduce((sum, c) => sum + c.mentions, 0);
  competitors.forEach((c) => {
    c.shareOfVoice =
      totalMentions > 0
        ? Math.round((c.mentions / totalMentions) * 1000) / 10
        : 0;
  });

  // Sort by visibility score
  return competitors.sort((a, b) => b.visibilityScore - a.visibilityScore);
}

function calculateSentimentScore(
  sentiments: ("positive" | "neutral" | "negative")[]
): number {
  if (sentiments.length === 0) return 50;

  const sentimentValues = { positive: 100, neutral: 50, negative: 0 };
  const sum = sentiments.reduce((acc, s) => acc + sentimentValues[s], 0);
  return Math.round(sum / sentiments.length);
}

function determineSentiment(
  sentiments: ("positive" | "neutral" | "negative")[]
): "positive" | "neutral" | "negative" {
  if (sentiments.length === 0) return "neutral";

  const counts = { positive: 0, neutral: 0, negative: 0 };
  sentiments.forEach((s) => counts[s]++);

  if (counts.positive > counts.negative && counts.positive > counts.neutral)
    return "positive";
  if (counts.negative > counts.positive && counts.negative > counts.neutral)
    return "negative";
  return "neutral";
}

export function calculateBrandScores(
  responses: AIResponse[],
  brandName: string,
  competitors: CompetitorRanking[]
) {
  const totalResponses = responses.length;
  if (totalResponses === 0) {
    return {
      visibilityScore: 0,
      sentimentScore: 0,
      shareOfVoice: 0,
      overallScore: 0,
      averagePosition: 0,
    };
  }

  // Find the brand's competitor ranking
  const brandRanking = competitors.find((c) => c.isOwn);

  if (!brandRanking) {
    return {
      visibilityScore: 0,
      sentimentScore: 0,
      shareOfVoice: 0,
      overallScore: 0,
      averagePosition: 0,
    };
  }

  const visibilityScore = brandRanking.visibilityScore;
  const sentimentScore = brandRanking.sentimentScore;
  const shareOfVoice = brandRanking.shareOfVoice;
  const averagePosition = brandRanking.averagePosition;

  // Calculate position score (lower is better, scale to 0-100)
  const positionScore =
    averagePosition <= 10
      ? (11 - averagePosition) * 10
      : Math.max(0, 100 - averagePosition * 2);

  // Overall Score (weighted average)
  const overallScore =
    visibilityScore * 0.3 +
    sentimentScore * 0.2 +
    shareOfVoice * 0.3 +
    positionScore * 0.2;

  return {
    visibilityScore: Math.round(visibilityScore * 10) / 10,
    sentimentScore: Math.round(sentimentScore * 10) / 10,
    shareOfVoice: Math.round(shareOfVoice * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
    averagePosition: Math.round(averagePosition * 10) / 10,
  };
}

export async function analyzeCompetitorsByProvider(
  company: Company,
  responses: AIResponse[],
  knownCompetitors: string[]
): Promise<{
  providerRankings: ProviderSpecificRanking[];
  providerComparison: ProviderComparisonData[];
}> {
  const trackedCompanies = new Set([company.name, ...knownCompetitors]);

  // Get configured providers from centralized config
  const configuredProviders = getConfiguredProviders();
  const providers = configuredProviders.map((p) => p.name);

  // If no providers available, use mock mode
  if (providers.length === 0) {
    console.warn("No AI providers configured, using default provider list");
    providers.push("OpenAI", "Anthropic", "Google");
  }

  // Initialize provider-specific data
  const providerData = new Map<
    string,
    Map<
      string,
      {
        mentions: number;
        positions: number[];
        sentiments: ("positive" | "neutral" | "negative")[];
      }
    >
  >();

  // Initialize for each provider
  providers.forEach((provider) => {
    const competitorMap = new Map();
    trackedCompanies.forEach((companyName) => {
      competitorMap.set(companyName, {
        mentions: 0,
        positions: [],
        sentiments: [],
      });
    });
    providerData.set(provider, competitorMap);
  });

  // Process responses by provider
  responses.forEach((response, index) => {
    const providerMap = providerData.get(response.provider);
    if (!providerMap) {
      return;
    }

    // Process rankings
    if (response.rankings) {
      response.rankings.forEach((ranking) => {
        if (trackedCompanies.has(ranking.company)) {
          const data = providerMap.get(ranking.company)!;
          data.mentions++;
          data.positions.push(ranking.position);
          if (ranking.sentiment) {
            data.sentiments.push(ranking.sentiment);
          }
        }
      });
    }

    // Count brand mentions
    if (response.brandMentioned && trackedCompanies.has(company.name)) {
      const brandData = providerMap.get(company.name)!;
      if (!response.rankings?.some((r) => r.company === company.name)) {
        brandData.mentions++;
        if (response.brandPosition) {
          brandData.positions.push(response.brandPosition);
        }
        brandData.sentiments.push(response.sentiment);
      }
    }
  });

  // Calculate provider-specific rankings
  const providerRankings: ProviderSpecificRanking[] = [];

  providers.forEach((provider) => {
    const competitorMap = providerData.get(provider)!;
    const providerResponses = responses.filter((r) => r.provider === provider);
    const totalResponses = providerResponses.length;

    // Skip providers with no responses (failed providers)
    if (totalResponses === 0) {
      return;
    }

    const competitors: CompetitorRanking[] = [];

    competitorMap.forEach((data, name) => {
      const avgPosition =
        data.positions.length > 0
          ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length
          : 99;

      let visibilityScore =
        totalResponses > 0 ? (data.mentions / totalResponses) * 100 : 0;

      // Apply discount factor for self-analysis to prevent false 100% scores
      if (name === company.name) {
        // For self-analysis, apply a discount factor based on how many other companies were mentioned
        const otherMentions = Array.from(competitorMap.entries())
          .filter(([otherName]) => otherName !== company.name)
          .reduce((sum, [, otherData]) => sum + otherData.mentions, 0);
        
        // If other companies were mentioned, apply a discount
        if (otherMentions > 0) {
          const discountFactor = Math.min(0.8, otherMentions / totalResponses);
          visibilityScore = visibilityScore * (1 - discountFactor);
        } else {
          // If no other companies mentioned, apply a significant discount
          visibilityScore = visibilityScore * 0.6;
        }
      }

      competitors.push({
        name,
        mentions: data.mentions,
        averagePosition: Math.round(avgPosition * 10) / 10,
        sentiment: determineSentiment(data.sentiments),
        sentimentScore: calculateSentimentScore(data.sentiments),
        shareOfVoice: 0, // Will calculate after
        visibilityScore: Math.round(visibilityScore * 10) / 10,
        isOwn: name === company.name,
      });
    });

    // Calculate share of voice for this provider
    const totalMentions = competitors.reduce((sum, c) => sum + c.mentions, 0);
    competitors.forEach((c) => {
      c.shareOfVoice =
        totalMentions > 0
          ? Math.round((c.mentions / totalMentions) * 1000) / 10
          : 0;
    });

    // Sort by visibility score
    competitors.sort((a, b) => b.visibilityScore - a.visibilityScore);

    providerRankings.push({
      provider,
      competitors,
    });
  });

  // Create provider comparison data
  const providerComparison: ProviderComparisonData[] = [];

  trackedCompanies.forEach((companyName) => {
    const comparisonData: ProviderComparisonData = {
      competitor: companyName,
      providers: {},
      isOwn: companyName === company.name,
    };

    providerRankings.forEach(({ provider, competitors }) => {
      const competitor = competitors.find((c) => c.name === companyName);
      if (competitor) {
        comparisonData.providers[provider] = {
          visibilityScore: competitor.visibilityScore,
          position: competitor.averagePosition,
          mentions: competitor.mentions,
          sentiment: competitor.sentiment,
        };
      }
    });

    providerComparison.push(comparisonData);
  });

  // Sort comparison data by average visibility across providers
  providerComparison.sort((a, b) => {
    const avgA =
      Object.values(a.providers).reduce(
        (sum, p) => sum + p.visibilityScore,
        0
      ) / Object.keys(a.providers).length;
    const avgB =
      Object.values(b.providers).reduce(
        (sum, p) => sum + p.visibilityScore,
        0
      ) / Object.keys(b.providers).length;
    return avgB - avgA;
  });

  return { providerRankings, providerComparison };
}
