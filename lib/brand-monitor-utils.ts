import { Company } from "./types";

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);

    // Basic domain validation - must have at least one dot and valid TLD
    const hostname = urlObj.hostname;
    const parts = hostname.split(".");

    // Must have at least domain.tld format
    if (parts.length < 2) return false;

    // Last part (TLD) must be at least 2 characters and contain only letters
    const tld = parts[parts.length - 1];
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;

    // Domain parts should contain valid characters (allow numbers and hyphens)
    for (const part of parts) {
      if (
        !/^[a-zA-Z0-9-]+$/.test(part) ||
        part.startsWith("-") ||
        part.endsWith("-")
      ) {
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error("URL validation error:", e);
    return false;
  }
}

export function validateCompetitorUrl(url: string): string | undefined {
  if (!url) return undefined;

  // Remove trailing slashes
  let cleanUrl = url.trim().replace(/\/$/, "");

  // Ensure the URL has a protocol
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }

  try {
    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname;

    // Return clean URL without protocol for display
    return hostname + (urlObj.pathname !== "/" ? urlObj.pathname : "");
  } catch {
    return undefined;
  }
}

export function normalizeCompetitorName(name: string): string {
  const normalized = name.toLowerCase().trim();

  // Normalize common variations to canonical names
  const nameNormalizations: { [key: string]: string } = {
    "amazon web services": "aws",
    "amazon web services (aws)": "aws",
    "amazon aws": "aws",
    "microsoft azure": "azure",
    "google cloud platform": "google cloud",
    "google cloud platform (gcp)": "google cloud",
    gcp: "google cloud",
    "digital ocean": "digitalocean",
    "beautiful soup": "beautifulsoup",
    "bright data": "brightdata",
  };

  return nameNormalizations[normalized] || normalized;
}

export function assignUrlToCompetitor(
  competitorName: string
): string | undefined {
  if (!competitorName || competitorName.trim().length === 0) {
    return undefined;
  }

  // Clean the company name for URL generation
  const cleanName = competitorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "") // Remove spaces
    .replace(/^(the|a|an)\s+/i, ""); // Remove articles

  if (cleanName.length < 3) {
    return undefined;
  }

  // Generate a URL based on the cleaned company name
  return `${cleanName}.com`;
}

export function detectServiceType(company: Company): string {
  const desc = (company.description || "").toLowerCase();
  const content = (company.scrapedData?.mainContent || "").toLowerCase();
  const companyName = (company.name || "").toLowerCase();

  console.log("Service type detection:", {
    companyName,
    description: desc.substring(0, 200) + "...",
    content: content.substring(0, 200) + "...",
  });

  // Check for sales training first (before other conditions)
  if (
    desc.includes("sales") ||
    desc.includes("coaching") ||
    desc.includes("training") ||
    content.includes("sales") ||
    content.includes("coaching") ||
    content.includes("training") ||
    companyName.includes("sales") ||
    companyName.includes("coaching")
  ) {
    console.log("Detected as sales training");
    return "sales training";
  }

  // Check for other industries
  if (
    desc.includes("beverage") ||
    desc.includes("drink") ||
    desc.includes("cola") ||
    desc.includes("soda") ||
    content.includes("beverage") ||
    content.includes("refreshment") ||
    companyName.includes("coca") ||
    companyName.includes("pepsi")
  ) {
    return "beverage brand";
  }

  if (
    desc.includes("restaurant") ||
    desc.includes("food") ||
    desc.includes("dining") ||
    content.includes("menu") ||
    content.includes("restaurant")
  ) {
    return "restaurant";
  }

  if (
    desc.includes("retail") ||
    desc.includes("store") ||
    desc.includes("shopping") ||
    content.includes("retail") ||
    content.includes("shopping")
  ) {
    return "retailer";
  }

  if (
    desc.includes("bank") ||
    desc.includes("financial") ||
    desc.includes("finance") ||
    content.includes("banking") ||
    content.includes("financial services")
  ) {
    return "financial service";
  }

  if (
    desc.includes("scraping") ||
    desc.includes("crawl") ||
    desc.includes("extract") ||
    content.includes("web scraping") ||
    content.includes("data extraction")
  ) {
    return "web scraper";
  }

  if (
    desc.includes("ai") ||
    desc.includes("artificial intelligence") ||
    desc.includes("llm") ||
    content.includes("machine learning") ||
    content.includes("ai-powered")
  ) {
    return "AI tool";
  }

  if (
    desc.includes("hosting") ||
    desc.includes("deploy") ||
    desc.includes("cloud") ||
    content.includes("deployment") ||
    content.includes("infrastructure")
  ) {
    return "hosting platform";
  }

  if (
    desc.includes("e-commerce") ||
    desc.includes("online store") ||
    desc.includes("marketplace")
  ) {
    return "e-commerce platform";
  }

  if (
    desc.includes("software") ||
    desc.includes("saas") ||
    desc.includes("platform")
  ) {
    return "software";
  }

  // Default
  console.log("No specific industry detected, using default 'brand'");
  return "brand";
}

export function getIndustryCompetitors(
  industry: string
): { name: string; url?: string }[] {
  // Default competitors based on industry with URLs
  const industryDefaults: { [key: string]: { name: string; url?: string }[] } =
    {
      "web scraping": [
        { name: "Apify", url: "apify.com" },
        { name: "Scrapy", url: "scrapy.org" },
        { name: "Octoparse", url: "octoparse.com" },
        { name: "ParseHub", url: "parsehub.com" },
        { name: "Diffbot", url: "diffbot.com" },
        { name: "Import.io", url: "import.io" },
        { name: "Bright Data", url: "brightdata.com" },
        { name: "Zyte", url: "zyte.com" },
      ],
      AI: [
        { name: "OpenAI", url: "openai.com" },
        { name: "Anthropic", url: "anthropic.com" },
        { name: "Google AI", url: "ai.google" },
        { name: "Microsoft Azure", url: "azure.microsoft.com" },
        { name: "IBM Watson", url: "ibm.com/watson" },
        { name: "Amazon AWS", url: "aws.amazon.com" },
      ],
      SaaS: [
        { name: "Salesforce", url: "salesforce.com" },
        { name: "HubSpot", url: "hubspot.com" },
        { name: "Zendesk", url: "zendesk.com" },
        { name: "Slack", url: "slack.com" },
        { name: "Monday.com", url: "monday.com" },
        { name: "Asana", url: "asana.com" },
      ],
      "E-commerce": [
        { name: "Shopify", url: "shopify.com" },
        { name: "WooCommerce", url: "woocommerce.com" },
        { name: "BigCommerce", url: "bigcommerce.com" },
        { name: "Magento", url: "magento.com" },
        { name: "Squarespace", url: "squarespace.com" },
        { name: "Wix", url: "wix.com" },
      ],
      Cloud: [
        { name: "AWS", url: "aws.amazon.com" },
        { name: "Google Cloud", url: "cloud.google.com" },
        { name: "Microsoft Azure", url: "azure.microsoft.com" },
        { name: "DigitalOcean", url: "digitalocean.com" },
        { name: "Linode", url: "linode.com" },
        { name: "Vultr", url: "vultr.com" },
      ],
      "sales training": [
        { name: "Sandler Training", url: "sandler.com" },
        { name: "SPIN Selling", url: "spinselling.com" },
        { name: "Miller Heiman", url: "millerheiman.com" },
        { name: "RAIN Group", url: "raingroup.com" },
        { name: "Sales Performance International", url: "spisales.com" },
        { name: "The Brooks Group", url: "thebrooksgroup.com" },
      ],
    };

  const lowerIndustry = industry.toLowerCase();

  // Check for partial matches
  for (const [key, competitors] of Object.entries(industryDefaults)) {
    if (
      lowerIndustry.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(lowerIndustry)
    ) {
      return competitors;
    }
  }

  // Generic default competitors
  return [
    { name: "Competitor 1" },
    { name: "Competitor 2" },
    { name: "Competitor 3" },
    { name: "Competitor 4" },
    { name: "Competitor 5" },
  ];
}
