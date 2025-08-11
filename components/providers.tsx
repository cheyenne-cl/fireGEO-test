'use client';

import { QueryProvider } from '@/lib/providers/query-provider';
import { authClient } from '@/lib/auth-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <authClient.Provider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </authClient.Provider>
  );
}