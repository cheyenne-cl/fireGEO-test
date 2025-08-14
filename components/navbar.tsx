"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useSimpleSession } from "@/lib/simple-session";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function Navbar() {
  const { data: session, isPending, refreshSession } = useSimpleSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Listen for login/logout events
  useEffect(() => {
    const handleAuthChange = () => {
      refreshSession();
    };

    // Listen for custom auth events
    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, [refreshSession]);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/simple-signout", {
        method: "POST",
      });

      if (response.ok) {
        // Dispatch auth-change event to update navbar
        window.dispatchEvent(new CustomEvent("auth-change"));

        // Small delay to ensure the session is cleared
        setTimeout(() => {
          router.refresh();
          setIsLoggingOut(false);
        }, 100);
      } else {
        console.error("Logout failed");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#000589] shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/compoze-logo.webp"
                alt="Compoze Labs"
                width={105}
                height={22}
                priority
                style={{ width: "auto", height: "auto" }}
              />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Show session-dependent content only after mount */}
            {mounted && session && (
              <>
                <Link
                  href="/brand-monitor"
                  className="px-4 py-2 text-sm font-medium text-white hover:text-[#EE952F]"
                >
                  Brand Monitor
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-medium text-white hover:text-[#EE952F]"
                >
                  Dashboard
                </Link>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="orange"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isLoggingOut ? "Signing out..." : "Sign out"}
                  </Button>
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
                  className="px-4 py-2 text-sm font-medium text-white hover:text-[#EE952F]"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium btn-firecrawl-orange rounded-md"
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
