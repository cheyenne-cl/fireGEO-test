'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, MapPin, Users, Building2 } from 'lucide-react';

interface TargetingOptionsProps {
  onOptionsChange: (options: {
    targetSize?: "startup" | "small" | "medium" | "large" | "enterprise";
    geographicRegion?: string;
    marketSegment?: "local" | "regional" | "national" | "global";
  }) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const COMPANY_SIZES = [
  { value: "startup", label: "Startup", description: "Early-stage companies (<50 employees)", icon: "🚀" },
  { value: "small", label: "Small Business", description: "10-100 employees", icon: "🏢" },
  { value: "medium", label: "Medium Company", description: "100-1000 employees", icon: "🏭" },
  { value: "large", label: "Large Company", description: "1000-10000 employees", icon: "🏢" },
  { value: "enterprise", label: "Enterprise", description: "10000+ employees", icon: "🏛️" },
];

const GEOGRAPHIC_REGIONS = [
  { value: "Minneapolis/St. Paul area", label: "Minneapolis/St. Paul", icon: "🏙️" },
  { value: "San Francisco Bay Area", label: "San Francisco Bay Area", icon: "🌉" },
  { value: "New York City area", label: "New York City", icon: "🗽" },
  { value: "Austin/Texas area", label: "Austin/Texas", icon: "🤠" },
  { value: "Seattle/Pacific Northwest", label: "Seattle/Pacific Northwest", icon: "🌲" },
  { value: "Boston/New England", label: "Boston/New England", icon: "🏛️" },
  { value: "Local/Regional market", label: "Local/Regional", icon: "📍" },
  { value: "National (USA)", label: "National (USA)", icon: "🇺🇸" },
  { value: "Global market", label: "Global", icon: "🌍" },
];

const MARKET_SEGMENTS = [
  { value: "local", label: "Local", description: "City or metro area", icon: "📍" },
  { value: "regional", label: "Regional", description: "State or multi-state region", icon: "🗺️" },
  { value: "national", label: "National", description: "Country-wide", icon: "🇺🇸" },
  { value: "global", label: "Global", description: "International markets", icon: "🌍" },
];

export function TargetingOptions({ 
  onOptionsChange, 
}: TargetingOptionsProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<string>("");

  React.useEffect(() => {
    const options = {
      targetSize: selectedSize ? selectedSize as "startup" | "small" | "medium" | "large" | "enterprise" : undefined,
      geographicRegion: selectedRegion || undefined,
      marketSegment: selectedSegment ? selectedSegment as "local" | "regional" | "national" | "global" : undefined,
    };
    onOptionsChange(options);
  }, [selectedSize, selectedRegion, selectedSegment, onOptionsChange]);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Targeting Options
        </CardTitle>
        <CardDescription>
          Configure competitor identification to focus on companies similar in size, location, and market focus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Size */}
        {/* Selected Options Summary */}
        {(selectedSize || selectedRegion || selectedSegment) && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Selected Targeting:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedSize && (
                <Badge variant="custom">
                  Size: {COMPANY_SIZES.find(s => s.value === selectedSize)?.label}
                </Badge>
              )}
              {selectedRegion && (
                <Badge variant="custom">
                  Region: {GEOGRAPHIC_REGIONS.find(r => r.value === selectedRegion)?.label}
                </Badge>
              )}
              {selectedSegment && (
                <Badge variant="custom">
                  Market: {MARKET_SEGMENTS.find(m => m.value === selectedSegment)?.label}
                </Badge>
              )}
            </div>
          </div>
        )}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Target Company Size
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {COMPANY_SIZES.map((size) => (
              <Button
                key={size.value}
                variant={selectedSize === size.value ? "default" : "outline"}
                size="sm"
                className="justify-start h-auto px-8 py-4"
                onClick={() => setSelectedSize(selectedSize === size.value ? "" : size.value)}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    {/* <span>{size.icon}</span> */}
                    <span className="font-medium">{size.label}</span>
                  </div>
                  <div className={`text-xs mt-1 ${selectedSize === size.value ? 'text-white' : 'text-muted-foreground'}`}>
                    {size.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Geographic Region */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Geographic Focus
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {GEOGRAPHIC_REGIONS.map((region) => (
              <Button
                key={region.value}
                variant={selectedRegion === region.value ? "default" : "outline"}
                size="sm"
                className="justify-start h-auto px-8 py-4"
                onClick={() => setSelectedRegion(selectedRegion === region.value ? "" : region.value)}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    {/* <span>{region.icon}</span> */}
                    <span className="font-medium active:text-white">{region.label}</span>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Market Segment */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Market Segment
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {MARKET_SEGMENTS.map((segment) => (
              <Button
                key={segment.value}
                variant={selectedSegment === segment.value ? "default" : "outline"}
                size="sm"
                className="justify-start h-auto px-8 py-4"
                onClick={() => setSelectedSegment(selectedSegment === segment.value ? "" : segment.value)}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    {/* <span>{segment.icon}</span> */}
                    <span className="font-medium ">{segment.label}</span>
                  </div>
                  <div className={`text-xs mt-1 ${selectedSegment === segment.value ? 'text-white' : 'text-muted-foreground'}`}>
                    {segment.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
} 