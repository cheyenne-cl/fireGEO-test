import React from "react";
import { ResultsTab } from "@/lib/brand-monitor-reducer";
import { Button } from "../ui/button";

interface BrandData {
  visibilityScore: number;
  sentimentScore: number;
  shareOfVoice: number;
  overallScore: number;
  averagePosition: number;
  weeklyChange?: number;
}

interface ResultsNavigationProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  onRestart: () => void;
  onDownloadReport: () => void;
  brandData?: BrandData;
  brandName?: string;
}

export function ResultsNavigation({
  activeTab,
  onTabChange,
  onRestart,
  onDownloadReport,
}: ResultsNavigationProps) {
  const handleTabClick = (tab: ResultsTab) => {
    onTabChange(tab);
  };

  return (
    <nav
      className="w-80 flex-shrink-0 animate-fade-in flex flex-col h-[calc(100vh-8rem)] ml-[-2rem] sticky top-8"
      style={{ animationDelay: "0.3s" }}
    >
      <div className="w-full flex flex-col justify-between flex-1">
        {/* Navigation Tabs - at the top */}
        <div className="space-y-2">
          <Button
            onClick={() => handleTabClick("matrix")}
            variant={activeTab === "matrix" ? "default" : "orange"}
            className="w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200"
          >
            Comparison Matrix
          </Button>
          <Button
            onClick={() => handleTabClick("prompts")}
            variant={activeTab === "prompts" ? "default" : "orange"}
            className="w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200"
          >
            Prompts & Responses
          </Button>
          <Button
            onClick={() => handleTabClick("rankings")}
            variant={activeTab === "rankings" ? "default" : "orange"}
            className="w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200"
          >
            Provider Rankings
          </Button>
          <Button
            onClick={() => handleTabClick("visibility")}
            variant={activeTab === "visibility" ? "default" : "orange"}
            className="w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200"
          >
            Visibility Score
          </Button>
        </div>

        {/* Action buttons - at the bottom */}
        <div className="pt-4 pb-8 border-t border-gray-200 space-y-2">
          <Button
            variant="orange"
            onClick={onDownloadReport}
            className="w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Report
          </Button>

          <Button
            variant="default"
            onClick={onRestart}
            className="w-full text-left px-4 py-3 rounded-[10px] text-sm font-medium text-[#fff] flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Analyze another website
          </Button>
        </div>
      </div>
    </nav>
  );
}
