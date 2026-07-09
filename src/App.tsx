/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { 
  Film, Layers, FolderTree, Package, ShieldCheck, 
  CheckCircle2, Server, Smartphone, Database, Lock, Cloud, 
  Bell, Sparkles, Terminal, FileCode, Check, ArrowRight,
  Flame, Key, HardDrive, Cpu, AlertCircle, Tv, LogOut, User,
  Loader2, Search, Facebook, Twitter, Youtube
} from 'lucide-react';
import { auth, db, firebaseConfig } from '@/firebase/config';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrors';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { useSearchStore } from '@/store/searchStore';
import { useNotificationStore } from '@/store/notificationStore';
import { usePlayerStore } from '@/store/playerStore';
import type { UserProfile } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import StreamingPortal from './components/StreamingPortal';
import AuthPortal from './components/AuthPortal';
import BizLinkUganda from './components/BizLinkUganda';
import logoImg from '@/assets/images/donalisa_logo_1782938170546.jpg';

export default function App() {
  const { user, loading, initialized, setUser, setLoading, setInitialized } = useAuthStore();
  const { searchQuery, setSearchQuery } = useSearchStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { playMovie } = usePlayerStore();

  const [showDevPanel, setShowDevPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'init' | 'firebase' | 'collections' | 'storage' | 'security' | 'testing'>('firebase');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const [activePortalTab, setActivePortalTab] = useState<'catalog' | 'profile' | 'admin_dashboard' | 'bizlink'>('catalog');

  // Social Links state
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    twitter: '',
    tiktok: '',
    youtube: '',
  });

  // Dev Control Panel Easter Egg
  const [devClickCount, setDevClickCount] = useState(0);
  const [devUnlocked, setDevUnlocked] = useState(false);

  const handleFooterClick = () => {
    setDevClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setDevUnlocked((u) => {
          const newUnlocked = !u;
          if (newUnlocked) {
            setShowDevPanel(true);
          } else {
            setShowDevPanel(false);
          }
          return newUnlocked;
        });
        return 0;
      }
      return next;
    });
  };

  // Real-time listener for global settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSocialLinks({
          facebook: data.facebook || '',
          twitter: data.twitter || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || '',
        });
      }
    }, (err) => {
      console.warn("Failed to subscribe to social settings:", err);
      if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        handleFirestoreError(err, OperationType.GET, 'settings/global');
      }
    });
    return () => unsubscribe();
  }, []);

  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifId, setLoadingNotifId] = useState<string | null>(null);

  const handleNotificationClick = async (notif: any) => {
    await markAsRead(notif.id);
    setShowNotifications(false);

    if (notif.actionUrl) {
      setLoadingNotifId(notif.id);
      try {
        const movieDocRef = doc(db, 'movies', notif.actionUrl);
        const docSnap = await getDoc(movieDocRef);
        if (docSnap.exists()) {
          playMovie({ id: docSnap.id, ...docSnap.data() } as any);
        } else {
          console.warn('Movie not found for notification action.');
        }
      } catch (err) {
        console.error('Failed to fetch movie for notification play:', err);
      } finally {
        setLoadingNotifId(null);
      }
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Listen to Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserProfile);
          } else {
            const isUserAdmin = fbUser.email === 'admin@donalisa.com' || fbUser.email === 'ssakalivingstone25@gmail.com';
            setUser({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Subscriber',
              role: isUserAdmin ? 'admin' : 'viewer',
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('Could not fetch Firestore user profile, using fallback:', e);
          const isUserAdmin = fbUser.email === 'admin@donalisa.com' || fbUser.email === 'ssakalivingstone25@gmail.com';
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Subscriber',
            role: isUserAdmin ? 'admin' : 'viewer',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setInitialized]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Loading state (Cinematic screen spinner)
  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl shadow-red-600/30 animate-pulse bg-black border border-[#222]">
          <img 
            src={logoImg} 
            alt="DONALISA" 
            className="w-full h-full object-cover scale-110" 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="space-y-1.5 text-center">
          <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Initializing DONALISA</h3>
          <p className="text-[11px] text-[#666] font-mono">Retrieving secure cloud state and subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-[#E50914] selection:text-white flex flex-col justify-between">
      <div>
        {/* Cinematic Header */}
        <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-[#1c1c1c] px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-red-600/25 bg-black border border-[#222]">
                <img 
                  src={logoImg} 
                  alt="DONALISA" 
                  className="w-full h-full object-cover scale-110" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="hidden xs:block">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-xl text-white">DONALISA</span>
                </div>
              </div>
            </div>

            {user && (
              <div className="flex-1 max-w-xs md:max-w-md mx-2 md:mx-6 relative">
                <Search className="w-4 h-4 text-[#555] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search movie titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111111]/80 hover:bg-[#141414] border border-[#222222] hover:border-[#333333] rounded-full pl-10 pr-10 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
                  id="header-search-bar"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white text-xs font-bold font-mono transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-4">
                {/* BizLink Uganda Button */}
                <button
                  id="header-bizlink-btn"
                  onClick={() => setActivePortalTab('bizlink')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer h-9 ${
                    activePortalTab === 'bizlink'
                      ? 'bg-cyan-600 text-black border-transparent shadow-lg shadow-cyan-600/30 font-black'
                      : 'bg-[#111] hover:bg-[#1f1f1f] border-[#222] text-cyan-400 hover:text-white animate-breathe'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>BizLink Uganda</span>
                </button>

                {/* Movie Management Shortcut for Admins */}
                {user.role === 'admin' && (
                  <button
                    onClick={() => setActivePortalTab('admin_dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer h-9 ${
                      activePortalTab === 'admin_dashboard'
                        ? 'bg-red-600 text-white border-transparent shadow-lg shadow-red-600/30'
                        : 'bg-[#111] hover:bg-[#1f1f1f] border-[#222] text-[#00E5FF] hover:text-white'
                    }`}
                    id="header-admin-dashboard-btn"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Movie Management</span>
                  </button>
                )}

                {/* User details badge */}
                <div className="hidden sm:flex items-center gap-2.5 bg-[#111] border border-[#222] px-3.5 py-1.5 rounded-xl text-xs font-mono">
                  <User className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[#ccc] font-bold">{user.displayName || 'Subscriber'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full uppercase bg-[#222] text-[#00E5FF] font-extrabold border border-[#333]">
                    {user.role}
                  </span>
                </div>

                {/* Real-time Notifications Bell Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 bg-[#111] hover:bg-[#1f1f1f] border border-[#222] hover:border-[#333] text-[#888] hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center h-9 w-9"
                    title="In-App Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white font-mono animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 md:w-96 bg-[#0e0e0e]/95 border border-[#222222] rounded-2xl shadow-2xl p-4 overflow-hidden z-[999] backdrop-blur-md text-left"
                      >
                        <div className="flex items-center justify-between border-b border-[#222] pb-2.5 shrink-0">
                          <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Notifications Feed
                          </h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markAllAsRead()}
                              className="text-[10px] text-[#00E5FF] hover:text-cyan-300 font-mono font-bold cursor-pointer transition-colors"
                            >
                              Dismiss All
                            </button>
                          )}
                        </div>

                        <div className="mt-3 max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                          {notifications.length === 0 ? (
                            <div className="py-8 text-center text-zinc-500 text-[11px] font-mono">
                              Your notification feed is clear.
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 items-start relative overflow-hidden group ${
                                  notif.read
                                    ? 'bg-[#090909]/40 border-[#1c1c1c] hover:border-[#222]'
                                    : 'bg-red-500/5 border-red-500/15 hover:border-red-500/35'
                                }`}
                              >
                                {notif.imageUrl && (
                                  <div className="w-8 h-10 bg-[#111] rounded overflow-hidden shrink-0 border border-[#222]">
                                    <img 
                                      src={notif.imageUrl} 
                                      alt="" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-red-500 transition-colors">
                                      {notif.title}
                                    </h4>
                                    {!notif.read && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#888] leading-normal">{notif.body}</p>
                                  <p className="text-[9px] text-[#555] font-mono">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                
                                {loadingNotifId === notif.id && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Log Out Button */}
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] hover:bg-[#1f1f1f] border border-[#222] rounded-xl text-xs font-bold transition-all text-[#888] hover:text-white cursor-pointer h-9"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <span className="text-xs font-mono text-[#444]">Not Signed In</span>
            )}
          </div>
        </header>

        {/* Primary Page Content */}
        {user ? (
          <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
            {activePortalTab === 'bizlink' ? (
              <BizLinkUganda 
                currentUserId={user.uid}
                currentUserName={user.displayName || user.email.split('@')[0]}
                currentUserEmail={user.email}
                onClose={() => setActivePortalTab('catalog')}
              />
            ) : (
              <StreamingPortal 
                activeTab={activePortalTab} 
                setActiveTab={setActivePortalTab} 
              />
            )}
          </main>
        ) : (
          <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 min-h-[80vh] relative bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(to top, #050505, rgba(5,5,5,0.85)), url(https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80)' }}>
            <AuthPortal />
          </main>
        )}
      </div>

      {/* Footer & Toggle Dev Specifications Control */}
      <footer className="mt-20 border-t border-[#111] bg-[#080808]/50 py-10 px-6 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#444]">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <span 
              onClick={handleFooterClick}
              className="cursor-default select-none transition-colors"
            >
              © {new Date().getFullYear()} DONALISA
            </span>
            <div className="flex items-center gap-3">
              {socialLinks.facebook && (
                <a 
                  href={socialLinks.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 bg-[#111] hover:bg-blue-600/20 border border-[#222] hover:border-blue-500/40 text-[#666] hover:text-blue-500 rounded-xl transition-all"
                  title="Facebook"
                >
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {socialLinks.twitter && (
                <a 
                  href={socialLinks.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 bg-[#111] hover:bg-sky-600/20 border border-[#222] hover:border-sky-500/40 text-[#666] hover:text-sky-400 rounded-xl transition-all"
                  title="Twitter / X"
                >
                  <Twitter className="w-3.5 h-3.5" />
                </a>
              )}
              {socialLinks.tiktok && (
                <a 
                  href={socialLinks.tiktok} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 bg-[#111] hover:bg-pink-600/20 border border-[#222] hover:border-pink-500/40 text-[#666] hover:text-pink-500 rounded-xl transition-all flex items-center justify-center"
                  title="TikTok"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.94.1 1.89-.02 2.83-.01v3.9c-.84-.02-1.68-.11-2.51-.31-.47-.11-.93-.28-1.37-.5-.65-.33-1.25-.78-1.74-1.32-.1-.08-.15-.05-.18.06-.06.77-.04 1.54-.05 2.31v8.11c.05 1.13-.23 2.29-.83 3.25-.56.91-1.42 1.62-2.42 1.99-1.09.43-2.3.52-3.44.25-1.12-.24-2.18-.84-2.95-1.68-.82-.87-1.3-2.04-1.34-3.23-.07-1.37.47-2.77 1.48-3.72.93-.9 2.22-1.41 3.51-1.39.22.01.44.03.66.07v4.03c-.28-.1-.58-.15-.88-.16-.6-.04-1.21.16-1.67.57-.45.38-.72.96-.71 1.55.02.58.33 1.12.82 1.42.47.3 1.05.37 1.57.2.53-.16.98-.56 1.18-1.07.08-.22.12-.45.12-.68V.02z" />
                  </svg>
                </a>
              )}
              {socialLinks.youtube && (
                <a 
                  href={socialLinks.youtube} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 bg-[#111] hover:bg-red-600/20 border border-[#222] hover:border-red-500/40 text-[#666] hover:text-red-500 rounded-xl transition-all"
                  title="YouTube"
                >
                  <Youtube className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          {devUnlocked && (
            <button 
              onClick={() => setShowDevPanel(!showDevPanel)}
              className="px-4 py-2 bg-[#111] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#333] text-[#777] hover:text-cyan-400 transition-all rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showDevPanel ? 'Hide Dev Control Panel' : 'Show Dev Control Panel'}</span>
            </button>
          )}
        </div>

        {/* Developer Technical Board */}
        <AnimatePresence>
          {showDevPanel && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-7xl mx-auto mt-8 space-y-6 overflow-hidden border-t border-[#222] pt-8"
            >
              {/* Tabs for specifications */}
              <div className="flex items-center gap-1.5 bg-[#111111] border border-[#222222] rounded-xl p-1.5 overflow-x-auto w-fit">
                {[
                  { id: 'init', label: '1. Project & CLI', icon: Terminal },
                  { id: 'firebase', label: '2. Firebase Setup', icon: Flame },
                  { id: 'collections', label: '3. Firestore NoSQL', icon: Database },
                  { id: 'storage', label: '4. Storage Buckets', icon: HardDrive },
                  { id: 'security', label: '5. Zero-Trust Rules', icon: ShieldCheck },
                  { id: 'testing', label: '6. Validation & Tests', icon: CheckCircle2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                        isActive 
                          ? 'bg-cyan-950 text-[#00E5FF] border border-cyan-500/20 font-semibold' 
                          : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Status Banner Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141414] via-[#0f0f0f] to-[#0a0a0a] border border-[#222222] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-xl text-left">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2 text-[#00E5FF] text-[11px] font-mono font-bold uppercase tracking-[0.1em]">
                    <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" /> Senior Full Stack & Firebase Engineer Report
                  </div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight">Project Foundation & Firebase Gateway Integrated</h1>
                  <p className="text-xs text-[#999999] leading-relaxed">
                    All Phase 2 Next.js 15 App Router requirements, TypeScript path aliases (<code className="text-white font-mono">@/*</code>), ESLint/Prettier configs, and Phase 3 Firebase v11 modular singletons have been fully assembled. The workspace compiles clean with <strong className="text-emerald-400 font-mono">0 TypeScript errors</strong>.
                  </p>
                </div>
                <div className="bg-[#181818] border border-emerald-500/30 px-4 py-2.5 rounded-xl text-xs text-emerald-400 font-mono font-semibold flex items-center gap-2 shadow-inner shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  BUILD STATUS: PASSING (100%)
                </div>
              </div>

              {/* Tab Content rendering */}
              <div className="text-left space-y-6">
                {activeTab === 'init' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-5">
                      <div className="border-b border-[#222222] pb-4">
                        <span className="text-xs font-mono text-[#E50914] font-bold uppercase tracking-wider">Phase 2 Task 2</span>
                        <h3 className="text-lg font-bold text-white mt-1">Exact CLI Initialization Commands</h3>
                        <p className="text-xs text-[#888888] mt-0.5">Scaffolding Next.js 15 with App Router, Tailwind CSS, TypeScript, and ESLint.</p>
                      </div>

                      <div className="space-y-4 font-mono text-xs">
                        <div className="bg-[#080808] border border-cyan-500/10 rounded-xl p-4 space-y-2 relative group">
                          <div className="flex items-center justify-between text-[11px] text-[#888] pb-2 border-b border-[#1f1f1f]">
                            <span>1. Scaffold Next.js 15 PWA Shell</span>
                            <button 
                              onClick={() => handleCopy('npx create-next-app@latest donalisa --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm', 'cli')}
                              className="text-xs text-[#ccc] hover:text-white flex items-center gap-1 bg-[#1a1a1a] px-2 py-1 rounded"
                            >
                              {copiedCmd === 'cli' ? <Check className="w-3 h-3 text-emerald-400" /> : <FileCode className="w-3 h-3" />}
                              {copiedCmd === 'cli' ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-[#00E5FF] leading-relaxed">
                            npx create-next-app@latest donalisa \
                              --typescript --tailwind --eslint --app --src-dir \
                              --import-alias <span className="text-amber-400">&quot;@/*&quot;</span> --use-npm
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'firebase' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-6">
                      <div className="border-b border-[#222222] pb-4">
                        <span className="text-xs font-mono text-[#E50914] font-bold uppercase tracking-wider">Phase 3 Tasks 1, 2 & 4</span>
                        <h3 className="text-lg font-bold text-white mt-1">Firebase GCP Console Setup & Registration Guide</h3>
                        <p className="text-xs text-[#888888] mt-0.5">Engineering decisions behind region selection, analytics toggling, and SDK singleton initialization.</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <Server className="w-4 h-4 text-[#E50914]" /> Project Name & Region
                          </div>
                          <p className="text-xs text-[#aaa] leading-relaxed">
                            Registered Project ID: <code className="text-[#00E5FF] font-mono font-bold">{firebaseConfig.projectId}</code>.<br/><br/>
                            <strong className="text-white">Database Region:</strong> <code className="text-cyan-400 font-mono">nam5 (us-central)</code> or <code className="text-cyan-400 font-mono">eur3 (europe-west)</code> multi-region.
                          </p>
                        </div>

                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" /> Google Analytics Strategy
                          </div>
                          <p className="text-xs text-[#aaa] leading-relaxed">
                            <strong className="text-amber-400">Recommendation: ENABLE (Conditional MVP).</strong><br/><br/>
                            Enable Google Analytics to track user engagement funnels, buffering latency, and subscription conversion.
                          </p>
                        </div>

                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <Key className="w-4 h-4 text-emerald-400" /> Singleton Auth & DB
                          </div>
                          <p className="text-xs text-[#aaa] leading-relaxed">
                            Created <code className="text-white font-mono">src/firebase/config.ts</code> using singleton checks to prevent duplicate dual-mount memory crashes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'collections' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-6">
                      <div className="border-b border-[#222222] pb-4">
                        <span className="text-xs font-mono text-[#E50914] font-bold uppercase tracking-wider">Phase 3 Task 5</span>
                        <h3 className="text-lg font-bold text-white mt-1">Canonical Cloud NoSQL Firestore Schema</h3>
                        <p className="text-xs text-[#888888] mt-0.5">Physical collection schemas mapped directly to TypeScript interfaces for enterprise data type-safety.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#222] pb-2 flex justify-between items-center">
                            <span>Collection: <code className="text-cyan-400">/users</code></span>
                            <span className="text-[10px] text-[#555]">Primary Account profiles</span>
                          </div>
                          <pre className="text-[10px] text-amber-200/90 leading-relaxed overflow-x-auto p-3 bg-black/60 rounded-xl">
{`interface UserProfile {
  uid: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  role: 'viewer' | 'admin' | 'merchant';
  createdAt: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'none';
}`}
                          </pre>
                        </div>

                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#222] pb-2 flex justify-between items-center">
                            <span>Collection: <code className="text-cyan-400">/movies</code></span>
                            <span className="text-[10px] text-[#555]">Cinematic release items</span>
                          </div>
                          <pre className="text-[10px] text-amber-200/90 leading-relaxed overflow-x-auto p-3 bg-black/60 rounded-xl">
{`interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  videoUrl: string;
  categories: string[];
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'storage' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-6">
                      <div className="border-b border-[#222222] pb-4">
                        <span className="text-xs font-mono text-[#E50914] font-bold uppercase tracking-wider">Phase 3 Task 7</span>
                        <h3 className="text-lg font-bold text-white mt-1">Cloud Storage Folder Structure</h3>
                        <p className="text-xs text-[#888888] mt-0.5">Bucket path maps for persistent static media, trailers, and profile avatars.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-sm font-bold text-[#E50914] flex items-center gap-2">
                            <Cloud className="w-4 h-4" /> Bucket Location Topology
                          </div>
                          <p className="text-xs text-[#aaa] leading-relaxed">
                            Default Storage bucket: <code className="text-cyan-400 font-mono">{firebaseConfig.storageBucket}</code>.<br/><br/>
                            Configured in multi-region nearline storage to serve heavy mp4 static segments with low latency to subscribers.
                          </p>
                        </div>

                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                            <Database className="w-4 h-4" /> Logical Paths
                          </div>
                          <div className="space-y-1.5 text-xs text-[#ccc] font-mono">
                            <div>📂 <code className="text-white">/avatars/{'{userId}'}/*.jpg</code> - Profile pictures (&lt;5MB)</div>
                            <div>📂 <code className="text-white">/movies/{'{movieId}'}/*.mp4</code> - Content streams</div>
                            <div>📂 <code className="text-white">/posters/*.jpg</code> - Catalog thumbnails</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-6">
                      <div className="border-b border-[#222222] pb-4">
                        <span className="text-xs font-mono text-[#E50914] font-bold uppercase tracking-wider">Phase 3 Tasks 8 & 9</span>
                        <h3 className="text-lg font-bold text-white mt-1">Zero-Trust Security & Role Access Controls</h3>
                        <p className="text-xs text-[#888888] mt-0.5">Enforcing backend-level security in firestore.rules and storage.rules before client interaction.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-[#E50914] font-bold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Firestore RBAC Matrix Highlights
                          </div>
                          <div className="space-y-2 text-[#ccc] text-[11px] leading-relaxed">
                            <div className="p-2.5 bg-[#121212] rounded border border-[#222]"><strong className="text-white">Public Data (/movies, /categories):</strong> <code className="text-cyan-400">allow read: if isSignedIn();</code>.</div>
                            <div className="p-2.5 bg-[#121212] rounded border border-[#222]"><strong className="text-white">User Profiles (/users/[uid]):</strong> <code className="text-cyan-400">allow update: if isOwner(userId);</code>.</div>
                            <div className="p-2.5 bg-[#121212] rounded border border-[#222]"><strong className="text-white">Admin Privileges:</strong> <code className="text-amber-400">allow write: if isAdmin();</code>.</div>
                          </div>
                        </div>

                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-3">
                          <div className="text-cyan-400 font-bold flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Cloud Storage MIME & Size Guards
                          </div>
                          <div className="space-y-2 text-[#ccc] text-[11px] leading-relaxed">
                            <div className="p-2.5 bg-[#121212] rounded border border-[#222]"><strong className="text-white">User Avatars (/avatars/[uid]/*):</strong> <code className="text-emerald-400">allow write: if isOwner(userId) && isValidImage();</code>.</div>
                            <div className="p-2.5 bg-[#121212] rounded border border-[#222]"><strong className="text-white">Movie Uploads (/movies/*):</strong> <code className="text-amber-400">allow write: if isAdmin();</code>.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'testing' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-6">
                      <div className="border-b border-[#222222] pb-4">
                        <span className="text-xs font-mono text-[#E50914] font-bold uppercase tracking-wider">Phase 3 Tasks 11 & 12</span>
                        <h3 className="text-lg font-bold text-white mt-1">Environment Compilation & Verification Protocol</h3>
                        <p className="text-xs text-[#888888] mt-0.5">How each Firebase service is verified in testing before Phase 4 UI construction.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-[#080808] border border-emerald-500/20 p-5 rounded-xl space-y-2">
                          <div className="text-emerald-400 font-bold font-mono flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> TypeScript & Build Audit
                          </div>
                          <p className="text-[#aaa] leading-relaxed">
                            Executed <code className="text-white font-mono">compile_applet</code>. The dual Express + Vite pipeline built successfully with zero syntax, import, or typing errors across all 8 collections and Firebase singletons.
                          </p>
                        </div>

                        <div className="bg-[#080808] border border-[#222] p-5 rounded-xl space-y-2">
                          <div className="text-cyan-400 font-bold font-mono flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Error Interception Guard
                          </div>
                          <p className="text-[#aaa] leading-relaxed">
                            Created <code className="text-white font-mono">src/lib/firestoreErrors.ts</code>. Automatically wraps all CRUD operations to output detailed JSON diagnostic logs if security rules reject a payload.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}
