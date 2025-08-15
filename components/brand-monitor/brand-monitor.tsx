"use client";

import React, {
  useReducer,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { Company } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientApiError } from "@/lib/client-errors";
import {
  brandMonitorReducer,
  initialBrandMonitorState,
  IdentifiedCompetitor,
  Analysis,
} from "@/lib/brand-monitor-reducer";
import {
  validateUrl,
  validateCompetitorUrl,
  normalizeCompetitorName,
  assignUrlToCompetitor,
  detectServiceType,
  getIndustryCompetitors,
} from "@/lib/brand-monitor-utils";
import { useSaveBrandAnalysis } from "@/hooks/useBrandAnalyses";

// Components
import { UrlInputSection } from "./url-input-section";
import { CompanyCard } from "./company-card";
import { AnalysisProgressSection } from "./analysis-progress-section";
import { ResultsNavigation } from "./results-navigation";
import { PromptsResponsesTab } from "./prompts-responses-tab";
import { VisibilityScoreTab } from "./visibility-score-tab";
import { ErrorMessage } from "./error-message";
import { SuccessMessage } from "@/components/ui/success-message";
import { AddPromptModal } from "./modals/add-prompt-modal";
import { AddCompetitorModal } from "./modals/add-competitor-modal";
import { ProviderComparisonMatrix } from "./provider-comparison-matrix";
import { ProviderRankingsTabs } from "./provider-rankings-tabs";
import { TargetingOptions } from "./targeting-options";
import { generateBrandAnalysisPDF } from "@/lib/pdf-generator";

// Hooks
import { useSSEHandler } from "./hooks/use-sse-handler";

interface BrandMonitorProps {
  selectedAnalysis?: {
    analysisData: Record<string, unknown>;
    companyName?: string;
    url?: string;
    industry?: string;
  } | null;
  onSaveAnalysis?: (analysis: unknown) => void;
}

export function BrandMonitor({
  selectedAnalysis,
  onSaveAnalysis,
}: BrandMonitorProps = {}) {
  const [state, dispatch] = useReducer(
    brandMonitorReducer,
    initialBrandMonitorState
  );
  const saveAnalysis = useSaveBrandAnalysis();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const hasSavedRef = useRef(false);
  const [targetingOptions, setTargetingOptions] = useState<{
    targetSize?: "startup" | "small" | "medium" | "large" | "enterprise";
    geographicRegion?: string;
    marketSegment?: "local" | "regional" | "national" | "global";
  }>({});
  const [isTargetingExpanded, setIsTargetingExpanded] = useState(false);

  const { startSSEConnection } = useSSEHandler({
    state,
    dispatch,
    onAnalysisComplete: (completedAnalysis) => {
      // Only save if this is a new analysis (not loaded from existing)
      if (!selectedAnalysis && !hasSavedRef.current) {
        hasSavedRef.current = true;

        if (!completedAnalysis) {
          console.error("No completed analysis data to save");
          return;
        }

        const analysisData = {
          url: company?.url || url,
          companyName: company?.name,
          industry: company?.industry,
          analysisData: completedAnalysis,
          competitors: identifiedCompetitors,
          prompts: analyzingPrompts,
          creditsUsed: 10,
        };

        saveAnalysis.mutate(analysisData, {
          onSuccess: (savedAnalysis) => {
            console.log("Analysis saved successfully:", savedAnalysis);
            setSuccessMessage("Analysis completed and saved successfully!");
            if (onSaveAnalysis) {
              onSaveAnalysis(savedAnalysis);
            }
          },
          onError: (error) => {
            console.error("Failed to save analysis:", error);
            hasSavedRef.current = false;
          },
        });
      }
    },
  });

  // Extract state for easier access
  const {
    url,
    urlValid,
    error,
    loading,
    analyzing,
    preparingAnalysis,
    company,
    showInput,
    showCompanyCard,
    showPromptsList,
    showCompetitors,
    customPrompts,
    removedDefaultPrompts,
    identifiedCompetitors,
    analysisProgress,
    promptCompletionStatus,
    analyzingPrompts,
    analysis,
    activeResultsTab,
    expandedPromptIndex,
    showAddPromptModal,
    showAddCompetitorModal,
    newPromptText,
    newCompetitorName,
    newCompetitorUrl,
    scrapingCompetitors,
  } = state;

  // Remove the auto-save effect entirely - we'll save manually when analysis completes

  // Load selected analysis if provided or reset when null
  useEffect(() => {
    if (selectedAnalysis && selectedAnalysis.analysisData) {
      // Restore the analysis state from saved data
      dispatch({
        type: "SET_ANALYSIS",
        payload: selectedAnalysis.analysisData as unknown as Analysis,
      });
      if (selectedAnalysis.companyName) {
        dispatch({
          type: "SCRAPE_SUCCESS",
          payload: {
            name: selectedAnalysis.companyName,
            url: selectedAnalysis.url,
            industry: selectedAnalysis.industry,
          } as Company,
        });
      }
    } else if (selectedAnalysis === null) {
      // Reset state when explicitly set to null (New Analysis clicked)
      dispatch({ type: "RESET_STATE" });
      hasSavedRef.current = false;
    }
  }, [selectedAnalysis]);

  // Handlers
  const handleUrlChange = useCallback(
    (newUrl: string) => {
      dispatch({ type: "SET_URL", payload: newUrl });

      // Clear any existing error when user starts typing
      if (error) {
        dispatch({ type: "SET_ERROR", payload: null });
      }

      // Validate URL on change
      if (newUrl.length > 0) {
        const isValid = validateUrl(newUrl);
        dispatch({ type: "SET_URL_VALID", payload: isValid });
      } else {
        dispatch({ type: "SET_URL_VALID", payload: null });
      }
    },
    [error]
  );

  const handleScrape = useCallback(async () => {
    if (!url) {
      dispatch({ type: "SET_ERROR", payload: "Please enter a URL" });
      return;
    }

    // Validate URL
    if (!validateUrl(url)) {
      dispatch({
        type: "SET_ERROR",
        payload:
          "Please enter a valid URL (e.g., example.com or https://example.com)",
      });
      dispatch({ type: "SET_URL_VALID", payload: false });
      return;
    }

    console.log("Starting scrape for URL:", url);
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_URL_VALID", payload: true });

    try {
      const response = await fetch("/api/brand-monitor/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
        }),
      });

      console.log("Scrape response status:", response.status);

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error("Scrape API error:", errorData);
          if (errorData.error?.message) {
            throw new ClientApiError(errorData);
          }
          throw new Error(errorData.error || "Failed to scrape");
        } catch (e) {
          if (e instanceof ClientApiError) throw e;
          throw new Error("Failed to scrape");
        }
      }

      const data = await response.json();
      console.log("Scrape data received:", data);

      if (!data.company) {
        throw new Error("No company data received");
      }

      // Start fade out transition
      dispatch({ type: "SET_SHOW_INPUT", payload: false });

      // After fade out completes, set company and show card with fade in
      setTimeout(() => {
        dispatch({ type: "SCRAPE_SUCCESS", payload: data.company });
        // Small delay to ensure DOM updates before fade in
        setTimeout(() => {
          dispatch({ type: "SET_SHOW_COMPANY_CARD", payload: true });
          console.log("Showing company card");
        }, 50);
      }, 500);
    } catch (error) {
      let errorMessage = "Failed to extract company information";
      if (error instanceof ClientApiError) {
        errorMessage = error.getUserMessage();
      } else if (error instanceof Error && error.message) {
        errorMessage = `Failed to extract company information: ${error.message}`;
      }
      // Remove duplicate errorMessage assignment and ensure error is typed
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      console.error("HandleScrape error:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [url]);

  const handlePrepareAnalysis = useCallback(async () => {
    if (!company) return;

    dispatch({ type: "SET_PREPARING_ANALYSIS", payload: true });

    // Check which providers are available (optional - for full analysis)
    try {
      const response = await fetch("/api/brand-monitor/check-providers", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.providers && data.providers.length > 0) {
          dispatch({
            type: "SET_AVAILABLE_PROVIDERS",
            payload: data.providers,
          });
        } else {
          // No providers configured - continue with industry defaults only
          console.warn(
            "No AI providers configured, will use industry defaults for competitors"
          );
          dispatch({ type: "SET_AVAILABLE_PROVIDERS", payload: [] });
        }
      } else {
        // If provider check fails, continue with industry defaults
        console.warn(
          "Provider check failed, continuing with industry defaults"
        );
        dispatch({ type: "SET_AVAILABLE_PROVIDERS", payload: [] });
      }
    } catch (e) {
      console.error("Error checking providers:", e);
      // Continue with industry defaults even if provider check fails
      dispatch({ type: "SET_AVAILABLE_PROVIDERS", payload: [] });
    }

    // Use AI to identify real competitors via API call
    try {
      console.log("Identifying competitors using AI...");

      const response = await fetch("/api/brand-monitor/identify-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          ...targetingOptions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to identify competitors");
      }

      const { competitors: aiCompetitors } = await response.json();
      console.log("AI-identified competitors:", aiCompetitors);

      // Convert AI competitors to IdentifiedCompetitor format with URLs
      const competitors = (aiCompetitors as string[])
        .map((name: string) => {
          const url = assignUrlToCompetitor(name);
          console.log(`Assigned URL for "${name}": ${url}`);
          return { name, url };
        })
        .slice(0, 9); // Limit to 9 competitors max

      console.log("Final competitors with URLs:", competitors);
      console.log(
        "Competitor names for prompts:",
        competitors.map((c) => c.name)
      );
      dispatch({ type: "SET_IDENTIFIED_COMPETITORS", payload: competitors });
    } catch (error) {
      console.error("AI competitor identification failed:", error);

      // Fallback to industry defaults if AI fails
      const extractedCompetitors = company.scrapedData?.competitors || [];
      const industryCompetitors = getIndustryCompetitors(
        company.industry || ""
      );

      // Merge extracted competitors with industry defaults, keeping URLs where available
      const competitorMap = new Map<string, IdentifiedCompetitor>();

      // Add industry competitors first (they have URLs)
      industryCompetitors.forEach((comp) => {
        const normalizedName = normalizeCompetitorName(comp.name);
        competitorMap.set(normalizedName, comp as IdentifiedCompetitor);
      });

      // Add extracted competitors and try to match them with known URLs
      extractedCompetitors.forEach((name) => {
        const normalizedName = normalizeCompetitorName(name);

        // Check if we already have this competitor
        const existing = competitorMap.get(normalizedName);
        if (existing) {
          // If existing has URL but current doesn't, keep existing
          if (!existing.url) {
            const url = assignUrlToCompetitor(name);
            competitorMap.set(normalizedName, { name, url });
          }
          return;
        }

        // New competitor - try to find a URL for it
        const url = assignUrlToCompetitor(name);
        competitorMap.set(normalizedName, { name, url });
      });

      const competitors = Array.from(competitorMap.values())
        .filter(
          (comp) =>
            comp.name !== "Competitor 1" &&
            comp.name !== "Competitor 2" &&
            comp.name !== "Competitor 3" &&
            comp.name !== "Competitor 4" &&
            comp.name !== "Competitor 5"
        )
        .slice(0, 6);

      dispatch({ type: "SET_IDENTIFIED_COMPETITORS", payload: competitors });
    }

    // Show competitors on the same page with animation
    dispatch({ type: "SET_SHOW_COMPETITORS", payload: true });
    dispatch({ type: "SET_PREPARING_ANALYSIS", payload: false });
  }, [company]);

  const handleProceedToPrompts = useCallback(() => {
    // Add a fade-out class to the current view
    const currentView = document.querySelector(".animate-panel-in");
    if (currentView) {
      currentView.classList.add("opacity-0");
    }

    setTimeout(() => {
      dispatch({ type: "SET_SHOW_COMPETITORS", payload: false });
      dispatch({ type: "SET_SHOW_PROMPTS_LIST", payload: true });
    }, 300);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!company) return;

    // Reset saved flag for new analysis
    hasSavedRef.current = false;

    // Collect all prompts (default + custom)
    const serviceType = detectServiceType(company);
    // Create dynamic prompts based on identified competitors
    const competitorNames = identifiedCompetitors.map((c) => c.name);
    const topCompetitors = competitorNames.slice(0, 4); // Use top 4 competitors
    const comparisonCompetitors = competitorNames.slice(0, 3); // Use top 3 for comparisons

    const defaultPrompts = [
      `Compare ${topCompetitors.join(", ")} for ${serviceType} capabilities`,
      `Rank ${topCompetitors.join(", ")} by their ${serviceType} features`,
      `Which is better for ${serviceType}: ${comparisonCompetitors.join(" vs ")}?`,
      `${serviceType} comparison: ${topCompetitors.join(" vs ")}`,
    ].filter((_, index) => !removedDefaultPrompts.includes(index));

    const allPrompts = [...defaultPrompts, ...customPrompts];

    // Store the prompts for UI display - make sure they're normalized
    const normalizedPrompts = allPrompts.map((p) => p.trim());
    dispatch({ type: "SET_ANALYZING_PROMPTS", payload: normalizedPrompts });

    dispatch({ type: "SET_ANALYZING", payload: true });
    dispatch({
      type: "SET_ANALYSIS_PROGRESS",
      payload: {
        stage: "initializing",
        progress: 0,
        message: "Starting analysis...",
        competitors: [],
        prompts: [],
        partialResults: [],
      },
    });
    dispatch({ type: "SET_ANALYSIS_TILES", payload: [] });

    // Check providers server-side before starting analysis
    try {
      const providerResponse = await fetch(
        "/api/brand-monitor/check-providers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!providerResponse.ok) {
        throw new Error("Failed to check providers");
      }

      const providerData = await providerResponse.json();
      const availableProviders = providerData.providers || [];

      if (availableProviders.length === 0) {
        console.warn("No AI providers configured for analysis");
        dispatch({
          type: "SET_ERROR",
          payload:
            "No AI providers configured. Please set up at least one API key (OpenAI, Anthropic, or Perplexity) to run a full analysis.",
        });
        dispatch({ type: "SET_ANALYZING", payload: false });
        return;
      }

      console.log(
        "Starting analysis with providers:",
        availableProviders.map((p: { name: string }) => p.name)
      );

      // Initialize prompt completion status
      const initialStatus: Record<
        string,
        Record<string, "pending" | "completed" | "failed">
      > = {};
      const expectedProviders: string[] = availableProviders.map(
        (p: { name: string }) => p.name
      );

      normalizedPrompts.forEach((prompt: string) => {
        initialStatus[prompt] = {};
        expectedProviders.forEach((provider: string) => {
          initialStatus[prompt][provider] = "pending";
        });
      });
      dispatch({
        type: "SET_PROMPT_COMPLETION_STATUS",
        payload: initialStatus,
      });

      try {
        // Generate a unique analysis ID
        const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await startSSEConnection("/api/brand-monitor/run-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysisId,
            company,
            prompts: normalizedPrompts,
            competitors: identifiedCompetitors,
          }),
        });
      } finally {
        dispatch({ type: "SET_ANALYZING", payload: false });
      }
    } catch (error) {
      console.error("Error checking providers:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          "Unable to check AI providers. Please ensure you have at least one API key configured.",
      });
      dispatch({ type: "SET_ANALYZING", payload: false });
      return;
    }
  }, [
    company,
    removedDefaultPrompts,
    customPrompts,
    identifiedCompetitors,
    startSSEConnection,
  ]);

  const handleRestart = useCallback(() => {
    dispatch({ type: "RESET_STATE" });
    hasSavedRef.current = false;
  }, []);

  const handleDownloadReport = useCallback(async () => {
    if (!analysis || !company) return;

    try {
      const reportData = {
        company,
        competitors: analysis.competitors || [],
        brandData:
          analysis.competitors?.find((c) => c.isOwn) || analysis.competitors[0],
        prompts: analysis.prompts || [],
        responses: analysis.responses || [],
        identifiedCompetitors,
        analysisDate: new Date(),
      };

      await generateBrandAnalysisPDF(reportData);
    } catch (error) {
      console.error("Error generating PDF:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to generate PDF report" });
    }
  }, [analysis, company, identifiedCompetitors, dispatch]);

  const batchScrapeAndValidateCompetitors = useCallback(
    async (competitors: IdentifiedCompetitor[]) => {
      const validatedCompetitors = competitors
        .map((comp) => ({
          ...comp,
          url: comp.url ? validateCompetitorUrl(comp.url) : undefined,
        }))
        .filter((comp) => comp.url);

      if (validatedCompetitors.length === 0) return;

      // Implementation for batch scraping - you can move the full implementation here
      // For now, just a placeholder
    },
    []
  );

  // Find brand data
  const brandData = analysis?.competitors?.find((c) => c.isOwn);

  return (
    <div className="flex flex-col">
      {/* URL Input Section */}
      {showInput && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <UrlInputSection
              url={url}
              urlValid={urlValid}
              loading={loading}
              analyzing={analyzing}
              onUrlChange={handleUrlChange}
              onSubmit={handleScrape}
            />

            {/* Targeting Options */}
            <TargetingOptions
              onOptionsChange={setTargetingOptions}
              isExpanded={isTargetingExpanded}
              onToggleExpanded={() =>
                setIsTargetingExpanded(!isTargetingExpanded)
              }
            />
          </div>
        </div>
      )}

      {/* Company Card Section with Competitors */}
      {!showInput && company && !showPromptsList && !analyzing && !analysis && (
        <div className="flex items-center justify-center animate-panel-in">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="w-full space-y-6">
              <div
                className={`transition-all duration-500 ${showCompanyCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              >
                <CompanyCard
                  company={company}
                  onAnalyze={handlePrepareAnalysis}
                  analyzing={preparingAnalysis}
                  showCompetitors={showCompetitors}
                  identifiedCompetitors={identifiedCompetitors}
                  onRemoveCompetitor={(idx) =>
                    dispatch({ type: "REMOVE_COMPETITOR", payload: idx })
                  }
                  onAddCompetitor={() => {
                    dispatch({
                      type: "TOGGLE_MODAL",
                      payload: { modal: "addCompetitor", show: true },
                    });
                    dispatch({
                      type: "SET_NEW_COMPETITOR",
                      payload: { name: "", url: "" },
                    });
                  }}
                  onContinueToAnalysis={handleProceedToPrompts}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompts List Section */}
      {showPromptsList && company && !analysis && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <AnalysisProgressSection
            company={company}
            analyzing={analyzing}
            identifiedCompetitors={identifiedCompetitors}
            scrapingCompetitors={scrapingCompetitors}
            analysisProgress={analysisProgress}
            prompts={analyzingPrompts}
            customPrompts={customPrompts}
            removedDefaultPrompts={removedDefaultPrompts}
            promptCompletionStatus={promptCompletionStatus}
            onRemoveDefaultPrompt={(index) =>
              dispatch({ type: "REMOVE_DEFAULT_PROMPT", payload: index })
            }
            onRemoveCustomPrompt={(prompt) => {
              dispatch({
                type: "SET_CUSTOM_PROMPTS",
                payload: customPrompts.filter((p) => p !== prompt),
              });
            }}
            onAddPromptClick={() => {
              dispatch({
                type: "TOGGLE_MODAL",
                payload: { modal: "addPrompt", show: true },
              });
              dispatch({ type: "SET_NEW_PROMPT_TEXT", payload: "" });
            }}
            onStartAnalysis={handleAnalyze}
            detectServiceType={detectServiceType}
          />
        </div>
      )}

      {/* Analysis Results */}
      {analysis && brandData && (
        <div className="flex-1 flex justify-center animate-panel-in pt-8">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="flex gap-6 relative">
              {/* Sidebar Navigation */}
              <ResultsNavigation
                activeTab={activeResultsTab}
                onTabChange={(tab) => {
                  dispatch({ type: "SET_ACTIVE_RESULTS_TAB", payload: tab });
                }}
                onRestart={handleRestart}
                onDownloadReport={handleDownloadReport}
              />

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col w-full overflow-hidden">
                <div className="w-full flex-1 flex flex-col">
                  {/* Tab Content */}
                  {activeResultsTab === "visibility" && (
                    <VisibilityScoreTab
                      competitors={analysis.competitors}
                      brandData={brandData}
                      identifiedCompetitors={identifiedCompetitors}
                    />
                  )}

                  {activeResultsTab === "matrix" && (
                    <Card className="p-2 bg-card text-card-foreground gap-6 rounded-xl border py-6 shadow-sm border-gray-200 h-full flex flex-col">
                      <CardHeader className="border-b">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-xl font-semibold">
                              Comparison Matrix
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 mt-1">
                              Compare visibility scores across different AI
                              providers
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-orange-600">
                              {brandData.visibilityScore}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Average Score
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 flex-1 overflow-auto">
                        {analysis.providerComparison ? (
                          <ProviderComparisonMatrix
                            data={analysis.providerComparison}
                            brandName={company?.name || ""}
                            competitors={identifiedCompetitors}
                          />
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>No comparison data available</p>
                            <p className="text-sm mt-2">
                              Please ensure AI providers are configured and the
                              analysis has completed.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeResultsTab === "rankings" &&
                    analysis.providerRankings && (
                      <div id="provider-rankings" className="h-full">
                        <ProviderRankingsTabs
                          providerRankings={analysis.providerRankings}
                          brandName={company?.name || "Your Brand"}
                          shareOfVoice={brandData.shareOfVoice}
                          averagePosition={Math.round(
                            brandData.averagePosition
                          )}
                          sentimentScore={brandData.sentimentScore}
                          weeklyChange={brandData.weeklyChange}
                        />
                      </div>
                    )}

                  {activeResultsTab === "prompts" && analysis.prompts && (
                    <Card className="p-2 bg-card text-card-foreground gap-6 rounded-xl border py-6 shadow-sm border-gray-200 h-full flex flex-col w-full overflow-hidden">
                      <CardHeader className="border-b">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-xl font-semibold">
                              Prompts & Responses
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 mt-1">
                              AI responses to your brand queries
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-orange-600">
                              {analysis.prompts.length}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Total Prompts
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 flex-1 overflow-auto w-full">
                        <PromptsResponsesTab
                          prompts={analysis.prompts}
                          responses={analysis.responses}
                          expandedPromptIndex={expandedPromptIndex}
                          onToggleExpand={(index) =>
                            dispatch({
                              type: "SET_EXPANDED_PROMPT_INDEX",
                              payload: index,
                            })
                          }
                          brandName={analysis.company?.name || ""}
                          competitors={
                            analysis.competitors?.map((c) => c.name) || []
                          }
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <ErrorMessage
          error={error}
          onDismiss={() => dispatch({ type: "SET_ERROR", payload: null })}
          onRetry={() => {
            dispatch({ type: "SET_ERROR", payload: null });
            if (url) {
              handleScrape();
            }
          }}
        />
      )}

      {successMessage && (
        <SuccessMessage
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* Modals */}
      <AddPromptModal
        isOpen={showAddPromptModal}
        promptText={newPromptText}
        onPromptTextChange={(text) =>
          dispatch({ type: "SET_NEW_PROMPT_TEXT", payload: text })
        }
        onAdd={() => {
          if (newPromptText.trim()) {
            dispatch({
              type: "ADD_CUSTOM_PROMPT",
              payload: newPromptText.trim(),
            });
            dispatch({
              type: "TOGGLE_MODAL",
              payload: { modal: "addPrompt", show: false },
            });
            dispatch({ type: "SET_NEW_PROMPT_TEXT", payload: "" });
          }
        }}
        onClose={() => {
          dispatch({
            type: "TOGGLE_MODAL",
            payload: { modal: "addPrompt", show: false },
          });
          dispatch({ type: "SET_NEW_PROMPT_TEXT", payload: "" });
        }}
      />

      <AddCompetitorModal
        isOpen={showAddCompetitorModal}
        competitorName={newCompetitorName}
        competitorUrl={newCompetitorUrl}
        onNameChange={(name) =>
          dispatch({ type: "SET_NEW_COMPETITOR", payload: { name } })
        }
        onUrlChange={(url) =>
          dispatch({ type: "SET_NEW_COMPETITOR", payload: { url } })
        }
        onAdd={async () => {
          if (newCompetitorName.trim()) {
            const rawUrl = newCompetitorUrl.trim();
            const validatedUrl = rawUrl
              ? validateCompetitorUrl(rawUrl)
              : undefined;

            const newCompetitor: IdentifiedCompetitor = {
              name: newCompetitorName.trim(),
              url: validatedUrl,
            };

            dispatch({ type: "ADD_COMPETITOR", payload: newCompetitor });
            dispatch({
              type: "TOGGLE_MODAL",
              payload: { modal: "addCompetitor", show: false },
            });
            dispatch({
              type: "SET_NEW_COMPETITOR",
              payload: { name: "", url: "" },
            });

            // Batch scrape and validate the new competitor if it has a URL
            if (newCompetitor.url) {
              await batchScrapeAndValidateCompetitors([newCompetitor]);
            }
          }
        }}
        onClose={() => {
          dispatch({
            type: "TOGGLE_MODAL",
            payload: { modal: "addCompetitor", show: false },
          });
          dispatch({
            type: "SET_NEW_COMPETITOR",
            payload: { name: "", url: "" },
          });
        }}
      />
    </div>
  );
}
