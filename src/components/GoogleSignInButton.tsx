import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../lib/auth';
import { LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

interface GoogleSignInButtonProps {
  user: User | null;
  onAuthChange?: (user: User | null) => void;
  compact?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ user, onAuthChange, compact = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res && onAuthChange) {
        onAuthChange(res.user);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setError(err.message || 'Failed to authenticate with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      if (onAuthChange) {
        onAuthChange(null);
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  if (user) {
    if (compact) {
      return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#1E293B] border border-[#CBD5E1]/30 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full shrink-0 border border-emerald-400" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {user.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="truncate text-xs">
              <p className="font-semibold text-white truncate">{user.displayName || user.email}</p>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <ShieldCheck className="w-3 h-3" /> Sheets Connected
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-white/10 rounded transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full border border-[#CBD5E1]" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold">
            <UserIcon className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1E293B] truncate">{user.displayName || 'Authorized User'}</p>
          <p className="text-xs text-[#334155] truncate font-semibold">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-[#334155] hover:text-red-600 font-semibold px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="gsi-material-button w-full flex items-center justify-center gap-2.5 px-3 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-lg border border-[#CBD5E1]/40 shadow-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
      >
        <div className="gsi-material-button-icon shrink-0">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </div>
        <span className="truncate">{isLoading ? 'Connecting...' : 'Sign in with Google'}</span>
      </button>
      {error && (
        <p className="mt-1 text-[11px] text-red-500 leading-tight">
          {error}
        </p>
      )}
    </div>
  );
};
