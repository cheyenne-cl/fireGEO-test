import FirecrawlApp from "@mendable/firecrawl-js";

// Only initialize Firecrawl if API key is available
export const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    })
  : null;

// Export the FirecrawlApp class as well for potential direct usage
export { FirecrawlApp };
