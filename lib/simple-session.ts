import { useEffect, useState } from 'react';

interface SimpleUser {
  id: string;
  email: string;
  name: string;
}

interface SimpleSession {
  user: SimpleUser;
  success: boolean;
}

export function useSimpleSession() {
  const [session, setSession] = useState<SimpleSession | null>(null);
  const [isPending, setIsPending] = useState(true);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/simple-session');
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setSession(null);
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Listen for storage events (when session changes in other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      checkSession();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Expose a refresh function that can be called after login/logout
  const refreshSession = () => {
    setIsPending(true);
    checkSession();
  };

  return { data: session, isPending, refreshSession };
}

