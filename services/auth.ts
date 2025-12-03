import { supabase } from './supabaseClient';

const SESSION_KEY = 'mycore_auth_session';

export const AuthService = {
  // Check if user is currently logged in via Supabase session
  getCurrentUser: (): { email: string; uid: string } | null => {
    // We check local storage for a quick sync, but Supabase manages its own session
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // Initialize - Check active session from Supabase
  checkSession: async (): Promise<{ email: string; uid: string } | null> => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const user = { 
        email: data.session.user.email || '', 
        uid: data.session.user.id 
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  login: async (email: string, password: string): Promise<{ email: string; uid: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("No user returned");

    const user = { email: data.user.email || '', uid: data.user.id };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  signup: async (email: string, password: string): Promise<{ email: string; uid: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("No user returned");

    const user = { email: data.user.email || '', uid: data.user.id };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  loginWithGoogle: async (): Promise<{ email: string; uid: string }> => {
    // Supabase Google Auth requires redirect handling usually
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
    
    // This part often involves a redirect, so the return might not be immediate in SPA
    // For MVP structure we assume success flow
    return { email: '', uid: '' }; 
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
  }
};