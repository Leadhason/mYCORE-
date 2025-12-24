import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

// Authentication Service using Supabase Auth
export const AuthService = {
  /**
   * Get current session
   */
  getSession: async (): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  /**
   * Login with email and password
   */
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (!data.session) {
      throw new Error('No session returned');
    }
    
    return data.session;
  },

  /**
   * Sign up with email and password
   */
  signup: async (email: string, password: string) => {
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: email.split('@')[0],
        },
        // Skip email confirmation - must be disabled in Supabase dashboard
        emailRedirectTo: undefined,
      },
    });
    
    if (error) {
      // Check if it's the email confirmation error
      if (error.message.includes('confirmation email') || error.code === 'unexpected_failure') {
        throw new Error('Email confirmation must be disabled in Supabase. Go to Authentication → Providers → Email and disable "Confirm email"');
      }
      throw new Error(error.message);
    }

    // With email confirmation disabled, session should be available immediately
    if (data.session) {
      return data.session;
    }
    
    // If no session but no error, user was created but needs confirmation
    if (data.user && !data.session) {
      throw new Error('Account created but email confirmation is required. Please disable email confirmation in Supabase settings (Authentication → Providers → Email)');
    }
    
    throw new Error('Signup failed. Please try again.');
  },

  /**
   * Login with Google OAuth
   */
  loginWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  },

  /**
   * Logout current user
   */
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange: (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      callback(session);
    });
    
    return subscription;
  },
};