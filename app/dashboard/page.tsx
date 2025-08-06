'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Mail, BarChart3, Target, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserStats {
  analysesRun: number;
  competitorsTracked: number;
  insightsGenerated: number;
  recentActivity: number;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchUserStats();
    }
  }, [session]);

  const fetchUserStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch user stats');
        // Set default stats if API fails
        setStats({
          analysesRun: 0,
          competitorsTracked: 0,
          insightsGenerated: 0,
          recentActivity: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Set default stats if API fails
      setStats({
        analysesRun: 0,
        competitorsTracked: 0,
        insightsGenerated: 0,
        recentActivity: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Welcome back!</h2>
              <p className="text-gray-600">Here's what's happening with your brand monitoring</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline-block h-4 w-4 mr-1" />
                Email
              </label>
              <p className="text-gray-900">{session.user?.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline-block h-4 w-4 mr-1" />
                Account Status
              </label>
              <p className="text-gray-900">Active</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              onClick={() => router.push('/brand-monitor')}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Target className="h-6 w-6" />
              <span className="font-medium">Brand Monitor</span>
              <span className="text-xs opacity-90">Analyze your brand</span>
            </Button>
            
            <Button 
              onClick={() => router.push('/chat')}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              <Activity className="h-6 w-6" />
              <span className="font-medium">AI Chat</span>
              <span className="text-xs opacity-90">Get insights</span>
            </Button>
            
            <Button 
              onClick={() => router.push('/plans')}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              <TrendingUp className="h-6 w-6" />
              <span className="font-medium">Upgrade Plan</span>
              <span className="text-xs opacity-90">Get more features</span>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Activity</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <BarChart3 className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              {loadingStats ? (
                <Loader2 className="h-6 w-6 text-orange-600 mx-auto mb-2 animate-spin" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats?.analysesRun || 0}</p>
              )}
              <p className="text-sm text-gray-600">Analyses Run</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              {loadingStats ? (
                <Loader2 className="h-6 w-6 text-blue-600 mx-auto mb-2 animate-spin" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats?.competitorsTracked || 0}</p>
              )}
              <p className="text-sm text-gray-600">Competitors Tracked</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              {loadingStats ? (
                <Loader2 className="h-6 w-6 text-green-600 mx-auto mb-2 animate-spin" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats?.insightsGenerated || 0}</p>
              )}
              <p className="text-sm text-gray-600">Insights Generated</p>
            </div>
          </div>
          
          {/* Recent Activity Indicator */}
          {stats && stats.recentActivity > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                🎉 You've completed {stats.recentActivity} analysis{stats.recentActivity !== 1 ? 'es' : ''} in the last 7 days!
              </p>
            </div>
          )}
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold text-orange-600">1</span>
              </div>
              <div>
                <h3 className="font-medium">Start Your First Analysis</h3>
                <p className="text-sm text-gray-600">Use Brand Monitor to analyze your brand's visibility and compare it with competitors.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold text-blue-600">2</span>
              </div>
              <div>
                <h3 className="font-medium">Get AI Insights</h3>
                <p className="text-sm text-gray-600">Chat with our AI to get personalized recommendations and insights about your brand.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold text-green-600">3</span>
              </div>
              <div>
                <h3 className="font-medium">Track Your Progress</h3>
                <p className="text-sm text-gray-600">Monitor your brand's performance over time and see how you stack up against competitors.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}