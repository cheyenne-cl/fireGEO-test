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

  useEffect(() => {
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

    checkSession();
  }, []);

  return { data: session, isPending };
}
