import { useQuery } from "@tanstack/react-query";

interface CreditsResponse {
  allowed: boolean;
  balance: number;
}

export function useCredits() {
  return useQuery<CreditsResponse>({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/credits");
      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
