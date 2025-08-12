import { createAuthClient } from "better-auth/react";

// Function to get the base URL dynamically
function getBaseURL() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
