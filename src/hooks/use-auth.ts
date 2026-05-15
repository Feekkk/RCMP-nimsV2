import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  user: { id: string; email: string } | null;
  session: { user: { id: string; email: string } } | null;
  isLoading: boolean;
  isAdmin: boolean;
  profile: { name: string | null; email: string | null; avatar_url: string | null } | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: false,
    isAdmin: false,
    profile: null,
  });

  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  const signOut = useCallback(async () => {
    setState({
      user: null,
      session: null,
      isLoading: false,
      isAdmin: false,
      profile: null,
    });
  }, []);

  return { ...state, signOut };
}
