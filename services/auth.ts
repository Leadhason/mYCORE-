// Mock Authentication Service
// Simulates a backend auth provider using LocalStorage

export const AuthService = {
  getSession: async () => {
    const json = localStorage.getItem('mycore_session');
    if (!json) return null;
    return JSON.parse(json);
  },

  login: async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Create session
    const session = {
      user: {
        id: 'user_123',
        email,
        user_metadata: {
          name: email.split('@')[0]
        }
      },
      access_token: 'mock_token_' + Date.now()
    };

    localStorage.setItem('mycore_session', JSON.stringify(session));
    return session;
  },

  signup: async (email: string, password: string) => {
    return AuthService.login(email, password);
  },

  loginWithGoogle: async () => {
    // Simulate Google Login
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const session = {
      user: {
        id: 'user_google_123',
        email: 'demo@gmail.com',
        user_metadata: {
          name: 'Demo User'
        }
      },
      access_token: 'mock_google_token_' + Date.now()
    };
    
    localStorage.setItem('mycore_session', JSON.stringify(session));
    return session.user;
  },

  logout: async () => {
    localStorage.removeItem('mycore_session');
    // Optional: Clear data on logout? 
    // localStorage.removeItem('mycore_user');
  }
};