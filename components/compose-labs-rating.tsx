'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComposeLabsRating {
  overallScore: number;
  visibilityScore: number;
  sentimentScore: number;
  mentionsCount: number;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
  companyName?: string;
  website?: string;
  message?: string;
}

export function ComposeLabsRating() {
  const [rating, setRating] = useState<ComposeLabsRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComposeLabsRating();
  }, []);

  const fetchComposeLabsRating = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/compose-labs-rating');
      if (!response.ok) {
        throw new Error('Failed to fetch rating data');
      }
      
      const data = await response.json();
      setRating(data);
    } catch (err) {
      setError('Failed to load Compose Labs rating');
      console.error('Error fetching Compose Labs rating:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-orange-500" />
            Compose Labs Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchComposeLabsRating}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!rating) return null;

  // Show message if no analysis data is available
  if (rating.message) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-orange-500" />
            Compose Labs Rating
          </CardTitle>
          <CardDescription>
            No analysis data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">{rating.message}</p>
            <Button 
              onClick={() => window.location.href = '/brand-monitor'}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Run Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
              <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-6 w-6 text-orange-500" />
                Compose Labs Rating
                {getTrendIcon(rating.trend)}
              </CardTitle>
              <CardDescription>
                Last updated: {new Date(rating.lastUpdated).toLocaleDateString()}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchComposeLabsRating}
              disabled={loading}
              className="ml-4"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Score</span>
          <div className="flex items-center gap-2">
            <Badge className={getScoreBadgeColor(rating.overallScore)}>
              {rating.overallScore}/10
            </Badge>
            <span className={`text-lg font-bold ${getScoreColor(rating.overallScore)}`}>
              {rating.overallScore}
            </span>
          </div>
        </div>

        {/* Visibility Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Visibility</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getScoreBadgeColor(rating.visibilityScore)}>
              {rating.visibilityScore}/10
            </Badge>
          </div>
        </div>

        {/* Sentiment Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Sentiment</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getScoreBadgeColor(rating.sentimentScore)}>
              {rating.sentimentScore}/10
            </Badge>
          </div>
        </div>

        {/* Mentions Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Mentions</span>
          <Badge variant="secondary">
            {rating.mentionsCount} mentions
          </Badge>
        </div>

        {/* Trend Indicator */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Trend:</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(rating.trend)}
              <span className="text-sm font-medium capitalize">
                {rating.trend}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
