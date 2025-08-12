'use client';

import { useSimpleSession } from '@/lib/simple-session';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Mail, BarChart3, Target, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComposeLabsRating } from '@/components/compose-labs-rating';

interface UserStats {
  analysesRun: number;
  competitorsTracked: number;
  insightsGenerated: number;
  recentActivity: number;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSimpleSession();
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
                Name
              </label>
              <p className="text-gray-900">{session.user?.name}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Analyses Run</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.analysesRun || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Competitors Tracked</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.competitorsTracked || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Insights Generated</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.insightsGenerated || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.recentActivity || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compose Labs Rating */}
        <div className="mb-8">
          <ComposeLabsRating />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <Button 
              onClick={() => router.push('/brand-monitor')}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Target className="h-4 w-4 mr-2" />
              Start Brand Analysis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}