import { supabase } from './supabase';

export const AuthService = {
  getSession: async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  login: async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signup: async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: email.split('@')[0], // Default name
        },
      },
    });
    if (error) throw error;
    return data;
  },

  loginWithGoogle: async () => {
     if (!supabase) throw new Error("Supabase not configured");
     const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
     });
     if (error) throw error;
     return data;
  },

  logout: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }
};