import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Company,
  CompetitorRanking,
  BrandPrompt,
  AIResponse,
} from "@/lib/types";
import { IdentifiedCompetitor } from "@/lib/brand-monitor-reducer";

interface PDFReportData {
  company: Company;
  competitors: CompetitorRanking[];
  brandData: CompetitorRanking;
  prompts: BrandPrompt[];
  responses: AIResponse[];
  identifiedCompetitors: IdentifiedCompetitor[];
  analysisDate: Date;
}

export class BrandAnalysisPDFGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  async generateReport(data: PDFReportData): Promise<jsPDF> {
    // Add title page
    this.addTitlePage(data);

    // Add executive summary
    this.addExecutiveSummary(data);

    // Add visibility score analysis
    this.addVisibilityScoreAnalysis(data);

    // Add provider rankings
    this.addProviderRankings(data);

    // Add prompts and responses
    this.addPromptsAndResponses(data);

    // Add competitor analysis
    this.addCompetitorAnalysis(data);

    // Add recommendations
    this.addRecommendations(data);

    return this.doc;
  }

  private addTitlePage(data: PDFReportData) {
    // Reset position
    this.currentY = 20;

    // Add logo/header
    this.doc.setFontSize(24);
    this.doc.setTextColor(0, 5, 137); // #000589
    this.doc.text("Brand Analysis Report", this.pageWidth / 2, this.currentY, {
      align: "center",
    });

    this.currentY += 20;

    // Company name
    this.doc.setFontSize(18);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(data.company.name, this.pageWidth / 2, this.currentY, {
      align: "center",
    });

    this.currentY += 15;

    // Analysis date
    this.doc.setFontSize(12);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(
      `Analysis Date: ${data.analysisDate.toLocaleDateString()}`,
      this.pageWidth / 2,
      this.currentY,
      { align: "center" }
    );

    this.currentY += 30;

    // Key metrics summary
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text("Key Metrics:", this.margin, this.currentY);

    this.currentY += 10;

    this.doc.setFontSize(12);
    this.doc.text(
      `• Overall Visibility Score: ${data.brandData.visibilityScore}%`,
      this.margin + 5,
      this.currentY
    );
    this.currentY += 7;
    this.doc.text(
      `• Brand Rank: #${data.competitors.findIndex((c) => c.isOwn) + 1}`,
      this.margin + 5,
      this.currentY
    );
    this.currentY += 7;
    this.doc.text(
      `• Competitors Analyzed: ${data.competitors.filter((c) => !c.isOwn).length}`,
      this.margin + 5,
      this.currentY
    );
    this.currentY += 7;
    this.doc.text(
      `• Prompts Evaluated: ${data.prompts.length}`,
      this.margin + 5,
      this.currentY
    );

    this.addNewPage();
  }

  private addExecutiveSummary(data: PDFReportData) {
    this.currentY = 20;

    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Executive Summary", this.margin, this.currentY);

    this.currentY += 15;

    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);

    const summary = `This brand analysis evaluates ${data.company.name}'s visibility and performance across multiple AI providers including OpenAI, Anthropic, Google, and Perplexity. The analysis covers ${data.prompts.length} different queries to assess how well the brand appears in AI-generated responses compared to ${data.competitors.filter((c) => !c.isOwn).length} key competitors.`;

    const lines = this.doc.splitTextToSize(
      summary,
      this.pageWidth - 2 * this.margin
    );
    this.doc.text(lines, this.margin, this.currentY);

    this.currentY += lines.length * 7 + 10;

    // Key findings
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Key Findings:", this.margin, this.currentY);

    this.currentY += 10;

    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);

    const brandRank = data.competitors.findIndex((c) => c.isOwn) + 1;
    const topCompetitor = data.competitors.filter((c) => !c.isOwn)[0];
    const difference = topCompetitor
      ? data.brandData.visibilityScore - topCompetitor.visibilityScore
      : 0;

    this.doc.text(
      `• ${data.company.name} ranks #${brandRank} among analyzed competitors`,
      this.margin + 5,
      this.currentY
    );
    this.currentY += 7;

    if (difference !== 0) {
      const performance = difference > 0 ? "outperforms" : "underperforms";
      this.doc.text(
        `• ${performance} the top competitor by ${Math.abs(difference).toFixed(1)}%`,
        this.margin + 5,
        this.currentY
      );
      this.currentY += 7;
    }

    this.doc.text(
      `• Overall visibility score: ${data.brandData.visibilityScore}%`,
      this.margin + 5,
      this.currentY
    );

    this.addNewPage();
  }

  private addVisibilityScoreAnalysis(data: PDFReportData) {
    this.currentY = 20;

    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Visibility Score Analysis", this.margin, this.currentY);

    this.currentY += 15;

    // Overall score
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(
      `Overall Visibility Score: ${data.brandData.visibilityScore}%`,
      this.margin,
      this.currentY
    );

    this.currentY += 15;

    // Competitor rankings table
    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Competitor Rankings:", this.margin, this.currentY);

    this.currentY += 10;

    // Table header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(
      this.margin,
      this.currentY - 5,
      this.pageWidth - 2 * this.margin,
      8,
      "F"
    );

    this.doc.setTextColor(0, 0, 0);
    this.doc.text("Rank", this.margin + 5, this.currentY);
    this.doc.text("Company", this.margin + 25, this.currentY);
    this.doc.text("Visibility Score", this.margin + 120, this.currentY);

    this.currentY += 10;

    // Table rows
    data.competitors.slice(0, 8).forEach((competitor, index) => {
      const isOwn = competitor.isOwn;
      const rank = index + 1;

      if (isOwn) {
        this.doc.setFillColor(255, 237, 213); // Light orange background
        this.doc.rect(
          this.margin,
          this.currentY - 5,
          this.pageWidth - 2 * this.margin,
          8,
          "F"
        );
      }

      if (isOwn) {
        this.doc.setTextColor(234, 88, 12); // Orange for own brand
      } else {
        this.doc.setTextColor(0, 0, 0); // Black for competitors
      }
      this.doc.setFont(
        isOwn ? "helvetica" : "helvetica",
        isOwn ? "bold" : "normal"
      );

      this.doc.text(`#${rank}`, this.margin + 5, this.currentY);
      this.doc.text(competitor.name, this.margin + 25, this.currentY);
      this.doc.text(
        `${competitor.visibilityScore}%`,
        this.margin + 120,
        this.currentY
      );

      this.currentY += 10;

      // Reset font
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(0, 0, 0);
    });

    this.addNewPage();
  }

  private addProviderRankings(data: PDFReportData) {
    this.currentY = 20;

    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Provider Rankings", this.margin, this.currentY);

    this.currentY += 15;

    // Group responses by provider
    const providerData = ["OpenAI", "Anthropic", "Google", "Perplexity"].map(
      (provider) => {
        const providerResponses = data.responses.filter(
          (r) => r.provider === provider
        );
        const brandMentions = providerResponses.filter(
          (r) => r.brandMentioned
        ).length;
        const totalResponses = providerResponses.length;
        const mentionRate =
          totalResponses > 0 ? (brandMentions / totalResponses) * 100 : 0;

        return {
          provider,
          totalResponses,
          brandMentions,
          mentionRate,
        };
      }
    );

    // Provider performance table
    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Provider Performance:", this.margin, this.currentY);

    this.currentY += 10;

    // Table header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(
      this.margin,
      this.currentY - 5,
      this.pageWidth - 2 * this.margin,
      8,
      "F"
    );

    this.doc.setTextColor(0, 0, 0);
    this.doc.text("Provider", this.margin + 5, this.currentY);
    this.doc.text("Total Responses", this.margin + 60, this.currentY);
    this.doc.text("Brand Mentions", this.margin + 120, this.currentY);
    this.doc.text("Mention Rate", this.margin + 160, this.currentY);

    this.currentY += 10;

    // Table rows
    providerData.forEach((provider) => {
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(provider.provider, this.margin + 5, this.currentY);
      this.doc.text(
        provider.totalResponses.toString(),
        this.margin + 60,
        this.currentY
      );
      this.doc.text(
        provider.brandMentions.toString(),
        this.margin + 120,
        this.currentY
      );
      this.doc.text(
        `${provider.mentionRate.toFixed(1)}%`,
        this.margin + 160,
        this.currentY
      );

      this.currentY += 10;
    });

    this.addNewPage();
  }

  private addPromptsAndResponses(data: PDFReportData) {
    this.currentY = 20;

    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Prompts & Responses Analysis", this.margin, this.currentY);

    this.currentY += 15;

    data.prompts.forEach((prompt, index) => {
      if (this.currentY > this.pageHeight - 50) {
        this.addNewPage();
        this.currentY = 20;
      }

      this.doc.setFontSize(14);
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(`Prompt ${index + 1}:`, this.margin, this.currentY);

      this.currentY += 8;

      this.doc.setFontSize(11);
      this.doc.setTextColor(100, 100, 100);
      const promptLines = this.doc.splitTextToSize(
        prompt.prompt,
        this.pageWidth - 2 * this.margin
      );
      this.doc.text(promptLines, this.margin + 5, this.currentY);

      this.currentY += promptLines.length * 6 + 5;

      // Provider responses summary
      const promptResponses = data.responses.filter(
        (r) => r.prompt === prompt.prompt
      );
      const brandMentioned = promptResponses.some((r) => r.brandMentioned);

      this.doc.setFontSize(10);
      if (brandMentioned) {
        this.doc.setTextColor(34, 197, 94); // Green if mentioned
      } else {
        this.doc.setTextColor(239, 68, 68); // Red if not mentioned
      }
      this.doc.text(
        `Brand Mentioned: ${brandMentioned ? "Yes" : "No"}`,
        this.margin + 5,
        this.currentY
      );

      this.currentY += 8;

      // Provider breakdown
      promptResponses.forEach((response) => {
        this.doc.setTextColor(0, 0, 0);
        this.doc.text(
          `• ${response.provider}: ${response.brandMentioned ? "Mentioned" : "Not mentioned"}`,
          this.margin + 10,
          this.currentY
        );
        this.currentY += 6;
      });

      this.currentY += 10;
    });

    this.addNewPage();
  }

  private addCompetitorAnalysis(data: PDFReportData) {
    this.currentY = 20;

    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Competitor Analysis", this.margin, this.currentY);

    this.currentY += 15;

    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);

    const competitors = data.competitors.filter((c) => !c.isOwn);
    const topCompetitors = competitors.slice(0, 5);

    this.doc.text("Top Competitors:", this.margin, this.currentY);

    this.currentY += 10;

    topCompetitors.forEach((competitor, index) => {
      this.doc.text(
        `${index + 1}. ${competitor.name} - ${competitor.visibilityScore}% visibility`,
        this.margin + 5,
        this.currentY
      );
      this.currentY += 8;
    });

    this.currentY += 10;

    // Competitive positioning
    const brandRank = data.competitors.findIndex((c) => c.isOwn) + 1;
    const totalCompetitors = data.competitors.filter((c) => !c.isOwn).length;

    this.doc.setFontSize(12);
    this.doc.text("Competitive Positioning:", this.margin, this.currentY);

    this.currentY += 10;

    this.doc.setFontSize(11);
    this.doc.text(
      `• ${data.company.name} ranks #${brandRank} out of ${totalCompetitors + 1} competitors`,
      this.margin + 5,
      this.currentY
    );
    this.currentY += 7;

    if (brandRank <= 3) {
      this.doc.text(
        "• Strong competitive position in the top tier",
        this.margin + 5,
        this.currentY
      );
    } else if (brandRank <= Math.ceil(totalCompetitors / 2)) {
      this.doc.text(
        "• Mid-tier competitive position with room for improvement",
        this.margin + 5,
        this.currentY
      );
    } else {
      this.doc.text(
        "• Competitive position needs improvement",
        this.margin + 5,
        this.currentY
      );
    }

    this.addNewPage();
  }

  private addRecommendations(data: PDFReportData) {
    this.currentY = 20;

    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 5, 137);
    this.doc.text("Recommendations", this.margin, this.currentY);

    this.currentY += 15;

    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);

    const brandRank = data.competitors.findIndex((c) => c.isOwn) + 1;
    const visibilityScore = data.brandData.visibilityScore;

    const recommendations = [
      "Optimize website content to include more relevant keywords and phrases that AI models commonly reference",
      "Create high-quality, informative content that addresses common industry questions and pain points",
      "Build backlinks from authoritative websites to improve domain authority and visibility",
      "Ensure consistent brand messaging across all online platforms and content",
      "Monitor and respond to industry discussions and mentions to increase brand awareness",
      "Consider creating thought leadership content that positions the brand as an industry expert",
    ];

    if (visibilityScore < 50) {
      recommendations.unshift(
        "Focus on improving overall brand visibility through comprehensive content strategy"
      );
    }

    if (brandRank > 3) {
      recommendations.unshift(
        "Develop targeted strategies to outperform top competitors in key areas"
      );
    }

    recommendations.forEach((recommendation, index) => {
      if (this.currentY > this.pageHeight - 30) {
        this.addNewPage();
        this.currentY = 20;
      }

      this.doc.text(
        `${index + 1}. ${recommendation}`,
        this.margin,
        this.currentY
      );
      this.currentY += 8;
    });

    this.currentY += 15;

    // Footer
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(
      "Generated by FireGeo Brand Monitor",
      this.pageWidth / 2,
      this.currentY,
      { align: "center" }
    );
  }

  private addNewPage() {
    this.doc.addPage();
    this.currentY = 20;
  }

  // Method to capture charts as images (if needed)
  async captureChartAsImage(elementId: string): Promise<string> {
    const element = document.getElementById(elementId);
    if (!element) return "";

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    return canvas.toDataURL("image/png");
  }
}

// Utility function to generate and download PDF
export async function generateBrandAnalysisPDF(
  data: PDFReportData
): Promise<void> {
  const generator = new BrandAnalysisPDFGenerator();
  const pdf = await generator.generateReport(data);

  // Generate filename
  const filename = `brand-analysis-${data.company.name.toLowerCase().replace(/\s+/g, "-")}-${data.analysisDate.toISOString().split("T")[0]}.pdf`;

  // Download the PDF
  pdf.save(filename);
}
