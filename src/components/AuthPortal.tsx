import React, { useState } from 'react';
import { 
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Loader2, AlertCircle, ShieldAlert, CheckCircle2, Copy, Check, ExternalLink
} from 'lucide-react';
import type { UserProfile } from '@/types';
import logoImg from '@/assets/images/donalisa_logo_1782938170546.jpg';

export default function AuthPortal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Email form state
  const [activeTab, setActiveTab] = useState<'social' | 'email'>('social');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { setUser } = useAuthStore();

  const handleCopyDomain = () => {
    if (unauthorizedDomain) {
      navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials fields.');
      return;
    }
    if (isRegister && !displayName) {
      setError('Please provide a Display Name for your profile.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let fbUser;
      if (isRegister) {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        fbUser = res.user;
        await updateProfile(fbUser, { displayName: displayName.trim() });
      } else {
        const res = await signInWithEmailAndPassword(auth, email.trim(), password);
        fbUser = res.user;
      }

      // INSTANT USER INITIALIZATION FOR ZERO DELAY
      const isUserAdmin = fbUser.email === 'admin@donalisa.com' || fbUser.email === 'ssakalivingstone25@gmail.com';
      const userProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || email.trim(),
        displayName: fbUser.displayName || displayName.trim() || 'Subscriber',
        role: isUserAdmin ? 'admin' : 'viewer',
        createdAt: new Date().toISOString()
      };

      // Set user immediately, triggering responsive visual flow instantly
      setUser(userProfile);
      setSuccess(isRegister ? `Welcome to DONALISA, ${userProfile.displayName}! Your subscription is active.` : `Welcome back, ${userProfile.displayName}!`);

      // Asynchronous Firestore sync (non-blocking)
      (async () => {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          if (isRegister) {
            await setDoc(userDocRef, userProfile);
          } else {
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
              await setDoc(userDocRef, userProfile);
            } else {
              const dbProfile = docSnap.data() as UserProfile;
              if (dbProfile.role !== userProfile.role) {
                setUser({ ...userProfile, role: dbProfile.role });
              }
            }
          }
        } catch (dbError) {
          console.warn('Background Firestore sync warning:', dbError);
        }
      })();

    } catch (err: any) {
      console.error('Email Auth Error:', err);
      let errMsg = 'Authentication failed. Please verify credentials.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'The password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = 'Incorrect email address or password. Please try again.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setUnauthorizedDomain(null);

    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const fbUser = result.user;

      // INSTANT USER INITIALIZATION FOR ZERO DELAY
      const isUserAdmin = fbUser.email === 'admin@donalisa.com' || fbUser.email === 'ssakalivingstone25@gmail.com';
      const userProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || 'Subscriber',
        role: isUserAdmin ? 'admin' : 'viewer',
        createdAt: new Date().toISOString()
      };

      // Set user immediately, triggering responsive visual flow instantly
      setUser(userProfile);
      setSuccess(`Welcome to DONALISA, ${userProfile.displayName}!`);

      // Asynchronous Firestore sync (non-blocking)
      (async () => {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            await setDoc(userDocRef, userProfile);
          } else {
            const dbProfile = docSnap.data() as UserProfile;
            if (dbProfile.role !== userProfile.role) {
              setUser({ ...userProfile, role: dbProfile.role });
            }
          }
        } catch (dbError) {
          console.warn('Background Firestore sync warning during Google Auth:', dbError);
        }
      })();

    } catch (err: any) {
      console.error('Google Auth Error:', err);
      let errMsg = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        setUnauthorizedDomain(currentHost);
        errMsg = `The domain "${currentHost}" is not authorized for Google Sign-In in your Firebase configuration.`;
      } else if (err.code === 'auth/popup-blocked') {
        errMsg = 'The sign-in popup was blocked by your browser. Please use the "Google Sign-In (Redirect Mode)" option below, enable popups, or open this app in a new tab.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'The sign-in popup was closed before completing. Please try again.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthRedirect = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setUnauthorizedDomain(null);

    try {
      await signInWithRedirect(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Google Auth Redirect Error:', err);
      let errMsg = 'An unexpected error occurred during redirect sign-in. Please try again.';
      if (err.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        setUnauthorizedDomain(currentHost);
        errMsg = `The domain "${currentHost}" is not authorized for Google Sign-In in your Firebase configuration.`;
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'viewer' | 'admin') => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const demoEmail = role === 'admin' ? 'admin@donalisa.com' : 'demo@donalisa.com';
    const demoPassword = 'password123';
    const name = role === 'admin' ? 'Demo Admin' : 'Demo Subscriber';

    try {
      let fbUser;
      try {
        // Attempt login
        const res = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
        fbUser = res.user;
      } catch (loginErr) {
        // Register if not found
        const res = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        fbUser = res.user;
        await updateProfile(fbUser, { displayName: name });
      }

      // Sync user profile state in Firestore
      const userProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || demoEmail,
        displayName: name,
        role: role,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', fbUser.uid), userProfile);
      } catch (dbErr) {
        console.warn('Could not register profile in Firestore:', dbErr);
      }

      setUser(userProfile);
      setSuccess(`Signed in successfully as ${name}!`);
    } catch (err: any) {
      console.error('Demo Auth Error:', err);
      setError(err.message || 'Failed to initialize demo subscriber account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-[#111111]/95 border border-[#222222] rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600 animate-pulse" />
      
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-red-600/30 mx-auto transform -rotate-3 hover:rotate-0 transition-transform bg-black border border-[#222]">
          <img 
            src={logoImg} 
            alt="DONALISA" 
            className="w-full h-full object-cover scale-110" 
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mt-4">Welcome to DONALISA</h2>
        <p className="text-xs text-[#888888] font-medium">
          Entertainment Without Limits
        </p>
      </div>

      {/* Tabs Control */}
      <div className="flex bg-black/60 p-1.5 rounded-2xl border border-[#222] mb-6">
        <button
          onClick={() => {
            setActiveTab('social');
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'social' 
              ? 'bg-[#1e1e1e] text-white shadow-sm' 
              : 'text-[#666] hover:text-white'
          }`}
        >
          Social & Sandbox
        </button>
        <button
          onClick={() => {
            setActiveTab('email');
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'email' 
              ? 'bg-[#1e1e1e] text-white shadow-sm' 
              : 'text-[#666] hover:text-white'
          }`}
        >
          Email Access
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-600/10 border border-red-600/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-mono"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-mono"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'social' ? (
          <div className="space-y-4">
            {/* Unauthorized Domain Troubleshooting Card */}
            <AnimatePresence>
              {unauthorizedDomain && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="bg-[#1a0f0f] border border-red-500/20 text-red-200 p-4 rounded-2xl text-xs space-y-3 font-mono leading-relaxed overflow-hidden"
                >
                  <div className="flex items-center gap-2 font-bold text-red-400">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Fix: Add Authorized Domain</span>
                  </div>
                  
                  <p className="text-[10px] text-[#aaa]">
                    To allow Google Sign-In, you must authorize this preview domain in your Firebase project configuration.
                  </p>

                  <div className="bg-black/40 border border-[#222] rounded-xl p-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-cyan-400 truncate select-all">{unauthorizedDomain}</span>
                    <button 
                      onClick={handleCopyDomain}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-[#888] hover:text-white transition-colors shrink-0 cursor-pointer"
                      title="Copy domain name"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-[10px] text-[#888]">
                    <div className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">1.</span>
                      <span>Go to <a href="https://console.firebase.google.com/u/0/project/bizlinkuganda-21a58/authentication/settings" target="_blank" rel="noreferrer" className="text-white hover:underline inline-flex items-center gap-0.5">Firebase Settings <ExternalLink className="w-2.5 h-2.5" /></a></span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">2.</span>
                      <span>Select <strong>Authorized domains</strong></span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">3.</span>
                      <span>Click <strong>Add domain</strong> and paste the copied domain.</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Google Sign-In Action */}
            <div className="space-y-3">
              <button 
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-extrabold text-xs py-3 rounded-xl transition-all shadow-lg shadow-white/5 hover:shadow-white/10 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-2.19-4.53z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Google Sign-In (Popup Mode)</span>
                  </>
                )}
              </button>

              <button 
                onClick={handleGoogleAuthRedirect}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-transparent border border-[#333] hover:border-[#555] hover:bg-white/5 text-white font-bold text-xs py-3 rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-2.19-4.53z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Google Sign-In (Redirect Mode - Safe for iFrame)</span>
                  </>
                )}
              </button>
            </div>

            {/* Sandbox Fast Access */}
            <div className="relative my-5 pt-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#222222]" />
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase">
                <span className="bg-[#111111] px-3.5 text-[#555555]">sandbox fast access</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleDemoLogin('viewer')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#161616] border border-white/5 hover:bg-[#222] text-white transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo User</span>
              </button>
              <button 
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#161616] border border-white/5 hover:bg-[#222] text-white transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Demo Admin</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Display Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Livingstone"
                  className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  id="auth-display-name"
                />
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                id="auth-email-input"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                id="auth-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-[#181818] disabled:text-[#444] border border-transparent rounded-xl text-xs font-bold transition-all text-white cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRegister ? 'Create Subscriber Account' : 'Sign In with Email'}</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-[11px] font-bold text-red-500 hover:text-red-400 transition-colors"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register Now"}
              </button>
            </div>
          </form>
        )}

        <p className="text-[10px] text-center text-[#555] font-mono leading-relaxed mt-2 px-4">
          By signing in, you unlock zero-latency streaming synchronization and fully custom subscriber stats.
        </p>
      </div>
    </div>
  );
}
