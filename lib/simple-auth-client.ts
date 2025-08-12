// Simple auth client that bypasses Better Auth
export const simpleAuthClient = {
  signIn: async (email: string, password: string) => {
    const response = await fetch('/api/auth/simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sign in failed');
    }
    
    return response.json();
  },
  
  signUp: async (email: string, password: string, name: string) => {
    const response = await fetch('/api/auth/simple-register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sign up failed');
    }
    
    return response.json();
  },
  
  signOut: async () => {
    const response = await fetch('/api/auth/simple-signout', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Sign out failed');
    }
    
    return response.json();
  },
};
