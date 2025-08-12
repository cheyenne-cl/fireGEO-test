'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSimpleSession } from '@/lib/simple-session';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCredits } from '@/hooks/useMessages';

function UserCredits() {
  const { data: credits, isLoading } = useCredits();
  const remainingCredits = credits?.balance || 0;
  
  if (isLoading) {
    return (
      <div className="flex items-center text-sm font-medium text-gray-700">
        <span>Loading...</span>
      </div>
    );
  }
    
  return (
    <div className="flex items-center text-sm font-medium text-gray-700">
      <span>{remainingCredits}</span>
      <span className="ml-1">credits</span>
    </div>
  );
}

export function Navbar() {
  const { data: session, isPending } = useSimpleSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug: log session state
  useEffect(() => {
    console.log('Navbar session state:', { session, isPending });
  }, [session, isPending]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/simple-signout', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Small delay to ensure the session is cleared
        setTimeout(() => {
          router.refresh();
          setIsLoggingOut(false);
        }, 100);
      } else {
        console.error('Logout failed');
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/firecrawl-logo-with-fire.webp"
                alt="Firecrawl"
                width={120}
                height={25}
                priority
                style={{ width: 'auto', height: 'auto' }}
              />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Always show Plans link */}
            <Link
              href="/plans"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Plans
            </Link>
            
            {/* Show session-dependent content only after mount */}
            {mounted && session && (
              <>
                <Link
                  href="/chat"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Basic Chat
                </Link>
                <Link
                  href="/brand-monitor"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Brand Monitor
                </Link>
                <UserCredits />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                  >
                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </>
            )}
            
            {/* Show loading state while checking session */}
            {mounted && isPending && (
              <div className="text-sm text-gray-400">Loading...</div>
            )}
            
            {/* Show login/register when not logged in */}
            {mounted && !session && !isPending && (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}