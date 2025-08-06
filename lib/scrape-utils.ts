import { firecrawl } from "@/lib/firecrawl";
import { Company } from "@/lib/types";
import {
  getConfiguredProviders,
  getProviderModel,
} from "@/lib/provider-config";
import { generateObject } from "ai";
import { z } from "zod";

// Company extraction schema
const CompanySchema = z.object({
  name: z
    .string()
    .describe(
      "The exact company name as it appears on the website - do not modify or correct the spelling"
    ),
  industry: z.string().describe("The primary industry or business category"),
  description: z
    .string()
    .describe("A brief description of what the company does"),
  services: z.array(z.string()).describe("List of main products or services"),
  competitors: z
    .array(z.string())
    .describe("List of direct competitors in the same industry"),
  website: z.string().describe("The company's website URL"),
  founded: z
    .string()
    .optional()
    .describe("When the company was founded (if known)"),
  employees: z.string().optional().describe("Number of employees (if known)"),
  location: z.string().optional().describe("Company location (if known)"),
});

export async function scrapeCompanyInfo(
  url: string,
  maxAge?: number
): Promise<Company> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const cacheAge = maxAge || 7 * 24 * 60 * 60; // 1 week in seconds

  let html = "";
  let metadata: any = {};

  // Use Firecrawl if available
  if (firecrawl) {
    try {
      const response = await firecrawl.scrapeUrl(normalizedUrl, {
        formats: ["markdown"],
        maxAge: cacheAge,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      html = response.markdown;
      metadata = response.metadata;
    } catch (error: any) {
      // If Firecrawl fails, throw a meaningful error
      throw new Error(
        `Failed to scrape website: ${error.message}. Please check the URL and try again.`
      );
    }
  } else {
    // If Firecrawl is not configured, throw a clear error
    throw new Error(
      "Web scraping is not configured. Please set up your FIRECRAWL_API_KEY to analyze websites."
    );
  }

  // Use AI to extract structured information - use first available provider
  const configuredProviders = getConfiguredProviders();
  if (configuredProviders.length === 0) {
    throw new Error(
      "No AI providers configured. Please set up at least one AI API key (OpenAI, Anthropic, Google, or Perplexity) to analyze website content."
    );
  }

  // Try each configured provider until one works
  let extractedData = null;
  let lastError = null;

  for (const provider of configuredProviders) {
    try {
      const model = getProviderModel(provider.id);
      if (!model) {
        console.warn(
          `Provider ${provider.name} not properly configured, skipping`
        );
        continue;
      }

      const result = await generateObject({
        model,
        schema: CompanySchema,
        prompt: `Extract company information from this website content. Focus on the company name, industry, description, services, and competitors.

Website: ${normalizedUrl}
Content: ${html.substring(0, 4000)} // Limit content length

IMPORTANT: Preserve the EXACT company name as it appears on the website. Do not correct, change, or modify the spelling of company names. Company names may have unusual spellings - preserve them exactly as written.

Extract the following information:
- Company name (exact spelling as shown on website)
- Industry/business category
- Description of what they do
- Main products/services
- Direct competitors in the same industry
- Other relevant details

Be accurate and factual. If information is not available, use reasonable defaults based on the content.`,
      });

      extractedData = result.object;
      break; // Success, exit the loop
    } catch (error: any) {
      console.warn(`Provider ${provider.name} failed:`, error.message);
      lastError = error;
      continue; // Try next provider
    }
  }

  if (!extractedData) {
    // All providers failed
    throw new Error(
      `Failed to analyze website content: ${lastError?.message || "All AI providers failed"}. Please try again or check your API keys.`
    );
  }

  // Extract competitors from the AI response
  const competitors = extractedData.competitors || [];

  // Generate favicon URL
  const urlObj = new URL(normalizedUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const faviconUrl =
    metadata?.favicon ||
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  // Create the company object
  // Fallback: extract company name from URL if AI got it wrong
  let companyName = extractedData.name || "Unknown Company";

  // Check if the AI might have "corrected" the company name
  const domainParts = domain.split(".");
  const domainName = domainParts[0];

  // If the domain name is significantly different from the AI's company name,
  // and the domain name looks like a company name, use the domain name
  if (domainName && domainName.length > 2) {
    const domainWords = domainName
      .split(/[-_]/)
      .filter((word) => word.length > 0);
    const aiWords = companyName
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    // Check if domain name contains words that are not in the AI's company name
    const domainHasUniqueWords = domainWords.some(
      (word) =>
        !aiWords.some(
          (aiWord) =>
            aiWord.includes(word.toLowerCase()) ||
            word.toLowerCase().includes(aiWord)
        )
    );

    // If domain has unique words and looks like a company name, use it
    if (domainHasUniqueWords && domainName.length > 3) {
      // Convert domain name to proper company name format
      const properName = domainWords
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
      companyName = properName;
    }
  }

  const company: Company = {
    id: crypto.randomUUID(),
    name: companyName,
    url: normalizedUrl,
    industry: extractedData.industry || "Unknown",
    description: extractedData.description || "No description available",
    logo: metadata?.ogImage || faviconUrl,
    favicon: faviconUrl,
    scraped: true,
    services: extractedData.services || [],
    competitors: competitors,
    website: extractedData.website || normalizedUrl,
    founded: extractedData.founded,
    employees: extractedData.employees,
    location: extractedData.location,
    scrapedData: {
      title: extractedData.name || "Unknown Company",
      description: extractedData.description || "No description available",
      keywords: [],
      mainContent: html,
      mainProducts: extractedData.services || [],
      competitors: competitors,
      ogImage: metadata?.ogImage,
      favicon: faviconUrl,
    },
  };

  return company;
}
