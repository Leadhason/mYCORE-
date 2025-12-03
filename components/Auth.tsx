import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { Loader2, ArrowRight } from 'lucide-react';

interface AuthProps {
  onSuccess: (email: string, name: string) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let res;
      if (isLogin) {
        res = await AuthService.login(email, password);
      } else {
        res = await AuthService.signup(email, password);
      }
      const name = email.split('@')[0];
      onSuccess(res.email, name);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const res = await AuthService.loginWithGoogle();
      const name = "Demo User";
      onSuccess(res.email, name);
    } catch (err) {
      setError('Google Auth failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-[#F5F5F7] to-[#E5E5EA]" />
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[100px]" />

      <div className="w-full max-w-[400px] glass bg-white/60 rounded-[32px] shadow-apple-hover p-8 md:p-10 z-10 animate-scale-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative group">
               <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               <img 
                src="/logo.png" 
                alt="Growth Nexis Global" 
                className="w-20 h-20 object-contain relative z-10"
                onError={(e) => {
                   e.currentTarget.style.display = 'none';
                   e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-20 h-20 bg-black rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                  <span className="text-white text-2xl font-bold">GN</span>
               </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-ios-text tracking-tight">Welcome to myCORE</h1>
          <p className="text-ios-subtext text-sm mt-2 font-medium">
            {isLogin ? 'Sign in to access your Core' : 'Unlock limitless potential'}
          </p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 text-xs font-medium rounded-2xl text-center border border-red-100">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50/50 hover:bg-white focus:bg-white border border-transparent focus:border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400"
              placeholder="Email address"
            />
          </div>
          <div>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50/50 hover:bg-white focus:bg-white border border-transparent focus:border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400"
              placeholder="Password"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3.5 rounded-2xl font-semibold text-sm shadow-soft hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Or</span>
            <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button 
            onClick={handleGoogle}
            type="button"
            className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl font-medium text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
        </button>

        <p className="text-center mt-8 text-xs text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-black font-semibold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}