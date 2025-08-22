"use client";

import { BrandMonitor } from "@/components/brand-monitor/brand-monitor";

export default function BrandMonitorPage() {
  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Brand Monitor
            </h1>
            <p className="text-lg text-gray-600">
              Analyze your brand&apos;s visibility and identify competitors with
              AI-powered insights
            </p>
          </div>

          <BrandMonitor />
        </div>
      </div>
    </div>
  );
}
