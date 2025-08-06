'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from '@/lib/auth-client';
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
  const { data: session, isPending } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Small delay to ensure the session is cleared
      setTimeout(() => {
        router.refresh();
        setIsLoggingOut(false);
      }, 100);
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
              </>
            )}
            
            {mounted && isPending ? (
              <div className="text-sm text-gray-400">Loading...</div>
            ) : mounted && session ? (
              <>
                <Link
                  href="/dashboard"
                  className="btn-firecrawl-orange inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-8 px-3"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="btn-firecrawl-default inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 h-8 px-3"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : mounted ? (
              <>
                <Link 
                  href="/login"
                  className="bg-black text-white hover:bg-gray-800 inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-8 px-3 shadow-sm hover:shadow-md"
                >
                  Login
                </Link>
                <Link 
                  href="/register"
                  className="btn-firecrawl-orange inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-8 px-3"
                >
                  Register
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}