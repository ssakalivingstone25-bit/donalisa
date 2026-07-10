import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Camera, Mail, Calendar, Shield, UploadCloud, 
  Check, Loader2, Star, Bookmark, Clock, Trash2, Play, Store 
} from 'lucide-react';
import { auth, db, storage } from '@/firebase/config';
import { updateProfile } from 'firebase/auth';
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  setDoc 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuthStore } from '@/store/authStore';
import type { Movie, UserProfile as UserProfileType } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfileProps {
  movies: Movie[];
  watchlist: string[];
  watchProgress: { [id: string]: number };
  onPlayMovie: (movie: Movie) => void;
  onClose?: () => void;
}

interface UserRating {
  id: string;
  movieId: string;
  rating: number;
  ratedAt: string;
}

export default function UserProfile({ 
  movies, 
  watchlist, 
  watchProgress, 
  onPlayMovie,
  onClose 
}: UserProfileProps) {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [updatingName, setUpdatingName] = useState(false);
  const [updatingMerchant, setUpdatingMerchant] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Avatar upload states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ratings stats states
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  // Fetch and sync user ratings in real-time
  useEffect(() => {
    if (!user) return;

    const ratingsRef = collection(db, 'ratings');
    const q = query(ratingsRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: UserRating[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.movieId && data.rating !== undefined) {
          fetched.push({
            id: doc.id,
            movieId: data.movieId,
            rating: data.rating,
            ratedAt: data.ratedAt || new Date().toISOString()
          });
        }
      });
      // Sort newest rated first
      fetched.sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime());
      setUserRatings(fetched);
      setLoadingRatings(false);
    }, (error) => {
      console.error('Error fetching user ratings stats:', error);
      setLoadingRatings(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle Display Name save
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setUpdatingName(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // 1. Update Firebase Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim()
        });
      }

      // 2. Update Firestore User document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: displayName.trim(),
        updatedAt: new Date().toISOString()
      });

      // 3. Update local store state
      const updatedUser: UserProfileType = {
        ...user,
        displayName: displayName.trim()
      };
      setUser(updatedUser);

      setSuccessMsg('Display name updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error updating name:', err);
      setErrorMsg(err.message || 'Failed to update display name.');
    } finally {
      setUpdatingName(false);
    }
  };

  // Securely toggle admin role for testing & dev administration
  const handleToggleAdminRole = async () => {
    if (!user) return;
    const newRole = user.role === 'admin' ? 'viewer' : 'admin';
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setUser({
        ...user,
        role: newRole
      });
      setSuccessMsg(`Access level updated to ${newRole.toUpperCase()}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error toggling admin role:', err);
      setErrorMsg('Failed to update role in Cloud Firestore.');
    }
  };

  // Updates role to merchant and adds a 'pending' verification flag
  const handleBecomeMerchant = async () => {
    if (!user) return;
    setUpdatingMerchant(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        role: 'merchant',
        verificationStatus: 'pending',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setUser({
        ...user,
        role: 'merchant',
        verificationStatus: 'pending'
      });

      setSuccessMsg('Successfully applied! Your profile has been updated to Merchant with pending verification.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Error applying to be merchant:', err);
      setErrorMsg(err.message || 'Failed to update role in Firestore.');
    } finally {
      setUpdatingMerchant(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarFile = async (file: File) => {
    if (!user) return;
    
    // Validation
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Invalid file: Please upload an image file (PNG/JPG/WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 5MB.');
      return;
    }

    setUploadingAvatar(true);
    setUploadProgress(0);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Create storage reference /avatars/{userId}/avatar.jpg
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `avatars/${user.uid}/avatar-${Date.now()}.${fileExtension}`);
      
      // 2. Start upload task
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Storage upload error:', error);
          setErrorMsg(`Upload failed: ${error.message}`);
          setUploadingAvatar(false);
          setUploadProgress(null);
        },
        async () => {
          // 3. Success callback: retrieve download URL
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // 4. Update Firebase Auth
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
              photoURL: downloadUrl
            });
          }

          // 5. Update Firestore User Document
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            photoURL: downloadUrl,
            updatedAt: new Date().toISOString()
          });

          // 6. Update local store state
          const updatedUser: UserProfileType = {
            ...user,
            photoURL: downloadUrl
          };
          setUser(updatedUser);

          setSuccessMsg('Profile photo updated successfully!');
          setUploadingAvatar(false);
          setUploadProgress(null);
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      );
    } catch (err: any) {
      console.error('Avatar upload initialization failed:', err);
      setErrorMsg(err.message || 'Failed to start image upload.');
      setUploadingAvatar(false);
      setUploadProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAvatarFile(e.dataTransfer.files[0]);
    }
  };

  // Delete Rating
  const handleDeleteRating = async (ratingId: string) => {
    try {
      await deleteDoc(doc(db, 'ratings', ratingId));
      setSuccessMsg('Rating cleared successfully.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to delete rating:', err);
      setErrorMsg('Failed to clear rating.');
    }
  };

  // Rating Distribution breakdown (1-5 stars)
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = userRatings.filter((r) => r.rating === stars).length;
    const pct = userRatings.length > 0 ? Math.round((count / userRatings.length) * 100) : 0;
    return { stars, count, pct };
  });

  const averageRating = userRatings.length > 0
    ? (userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length).toFixed(1)
    : '0.0';

  // Join date formatting
  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Subscribed';

  // Watchlist count
  const watchlistCount = watchlist.length;

  // In-progress videos count
  const inProgressCount = Object.keys(watchProgress).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Toast Feedback */}
      <AnimatePresence>
        {(successMsg || errorMsg) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] max-w-sm w-full p-4 rounded-xl shadow-2xl border text-center text-xs font-mono backdrop-blur-md bg-[#0e0e0e]/95"
            style={{
              borderColor: successMsg ? '#10B981' : '#EF4444'
            }}
          >
            <p className={successMsg ? 'text-emerald-400 font-bold' : 'text-red-500 font-bold'}>
              {successMsg || errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Profile Details Panel (Left Column) */}
        <div className="lg:col-span-1 bg-[#111111]/90 border border-[#222222] rounded-3xl p-6 space-y-6 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-600" />
          
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar upload & drag zone */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative w-28 h-28 rounded-full border-2 border-dashed border-[#333] hover:border-red-500 bg-[#080808] flex items-center justify-center cursor-pointer group transition-all overflow-hidden"
              title="Click or drag image here to update avatar"
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Avatar'} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-all"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-10 h-10 text-zinc-600 group-hover:text-red-500 transition-colors" />
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-[#ccc] font-mono transition-opacity gap-1 select-none">
                <Camera className="w-4 h-4 text-white" />
                <span>Upload Photo</span>
              </div>

              {/* Upload state spinner / progress */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-1.5 z-20">
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                  <span className="text-[10px] font-mono text-[#aaa]">{uploadProgress}%</span>
                  <div className="w-16 h-1 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
              accept="image/*" 
              className="hidden" 
            />

            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{user?.displayName || 'Subscriber'}</h2>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-red-600/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                  <Shield className="w-3 h-3" /> {user?.role} Access
                </span>
                {user?.verificationStatus && (
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    user.verificationStatus === 'verified'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : user.verificationStatus === 'rejected'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {user.verificationStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#222] pt-5 space-y-4 text-xs font-mono text-[#aaa]">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#555] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[#555] uppercase font-bold">Email Address</div>
                <div className="text-white truncate mt-0.5">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#555] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[#555] uppercase font-bold">Date Registered</div>
                <div className="text-white mt-0.5">{formattedJoinDate}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#222]/50">
              <button
                type="button"
                onClick={handleToggleAdminRole}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-red-600/30 hover:border-red-600/60 bg-red-600/5 hover:bg-red-600/10 rounded-xl text-[10px] text-red-500 font-extrabold transition-all cursor-pointer uppercase font-mono"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Toggle Admin Role ({user?.role === 'admin' ? 'Set Viewer' : 'Set Admin'})</span>
              </button>
            </div>

            {user?.role === 'viewer' && (
              <div className="pt-3 border-t border-[#222]/50 space-y-2">
                <div className="text-[10px] text-[#555] font-mono uppercase font-bold">Merchant Program</div>
                <button
                  type="button"
                  onClick={handleBecomeMerchant}
                  disabled={updatingMerchant}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider font-mono shadow-md"
                >
                  {updatingMerchant ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Application...</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-3.5 h-3.5" />
                      <span>Become a Merchant</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {user?.role === 'merchant' && (
              <div className="pt-3 border-t border-[#222]/50 p-3 bg-amber-950/10 border border-amber-500/20 rounded-xl space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold font-mono">
                  <Store className="w-3.5 h-3.5" />
                  <span>Merchant Portal</span>
                </div>
                <p className="text-[10px] text-[#888] font-mono leading-relaxed">
                  Status: <span className="text-amber-400 font-bold uppercase">{user?.verificationStatus || 'pending'}</span>
                </p>
                <p className="text-[9px] text-[#555] font-mono leading-normal">
                  Your registration is logged. Our administration desk is verifying your digital physical storefront ledger details.
                </p>
              </div>
            )}
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveName} className="border-t border-[#222] pt-5 space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Change Display Name</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter new display name..."
                className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
                id="profile-displayName-input"
              />
            </div>

            <button
              type="submit"
              disabled={updatingName || !displayName.trim() || displayName.trim() === user?.displayName}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-[#181818] disabled:text-[#444] disabled:border-[#222] border border-transparent rounded-xl text-xs font-bold transition-all text-white cursor-pointer"
            >
              {updatingName ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Profile Name</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* stats panel (Right Column) */}
        <div className="lg:col-span-2 space-y-8 text-left">
          {/* Quick stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-950/40 text-cyan-400 rounded-xl flex items-center justify-center border border-cyan-500/10">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#555] uppercase font-bold">Watchlist Queue</div>
                <div className="text-xl font-extrabold text-white font-mono mt-0.5">{watchlistCount}</div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-950/40 text-red-500 rounded-xl flex items-center justify-center border border-red-500/10">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#555] uppercase font-bold">Movies Rated</div>
                <div className="text-xl font-extrabold text-white font-mono mt-0.5">{userRatings.length}</div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-950/40 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/10">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#555] uppercase font-bold">Continue Streaming</div>
                <div className="text-xl font-extrabold text-white font-mono mt-0.5">{inProgressCount}</div>
              </div>
            </div>
          </div>

          {/* Ratings Distribution Dashboard */}
          <div className="bg-[#111] border border-[#222] rounded-3xl p-6 space-y-6">
            <div className="border-b border-[#222] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Star className="w-4 h-4 text-red-500 fill-current" /> Ratings Breakdown
                </h3>
                <p className="text-[11px] text-[#666] font-mono mt-0.5">Summary of how you score catalog titles</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-white font-mono leading-none">{averageRating} ★</div>
                <div className="text-[10px] text-[#555] uppercase font-mono font-bold mt-1">Average Star</div>
              </div>
            </div>

            {loadingRatings ? (
              <div className="py-6 text-center space-y-2">
                <Loader2 className="w-5 h-5 text-red-500 animate-spin mx-auto" />
                <span className="text-[11px] font-mono text-[#555]">Querying rating stats...</span>
              </div>
            ) : userRatings.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs font-mono space-y-1">
                <div>No ratings compiled yet.</div>
                <div className="text-[10px] text-[#444]">Open movie details and click the stars to rate titles.</div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {distribution.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-12 text-right text-[#888] font-semibold">{item.stars} Stars</span>
                    <div className="flex-1 h-3 bg-[#0a0a0a] border border-[#222]/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 rounded-full transition-all duration-500"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="w-14 text-left text-white/90 font-bold">{item.count} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Lists (Rated Movies + Watchlist Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        {/* Rated Movies Log */}
        <div className="bg-[#111] border border-[#222] rounded-3xl p-6 space-y-4 flex flex-col h-[450px]">
          <div className="border-b border-[#222] pb-3 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Star className="w-4 h-4 text-red-500 fill-current" /> Rated Movies Log
            </h3>
            <p className="text-[11px] text-[#666] font-mono mt-0.5">Titles you rated (click to play or click trash to clear rating)</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {loadingRatings ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 text-red-500 animate-spin mx-auto" />
              </div>
            ) : userRatings.length === 0 ? (
              <div className="py-20 text-center text-zinc-600 text-xs font-mono">
                No rated movies in your catalog log.
              </div>
            ) : (
              userRatings.map((ratingItem) => {
                const movie = movies.find((m) => m.id === ratingItem.movieId);
                if (!movie) return null;

                return (
                  <div 
                    key={ratingItem.id} 
                    className="bg-[#0c0c0c] border border-[#1c1c1c] hover:border-[#222] p-2.5 rounded-xl flex items-center gap-3.5 relative group"
                  >
                    <div 
                      onClick={() => onPlayMovie(movie)}
                      className="w-11 h-14 bg-zinc-900 rounded overflow-hidden shrink-0 relative cursor-pointer"
                    >
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 
                        onClick={() => onPlayMovie(movie)}
                        className="text-xs font-bold text-white truncate cursor-pointer hover:text-red-500 transition-colors"
                      >
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-3 h-3 ${star <= ratingItem.rating ? 'text-red-500 fill-current' : 'text-[#222]'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-[9px] text-[#555] font-mono">Rated {new Date(ratingItem.ratedAt).toLocaleDateString()}</p>
                    </div>

                    <button 
                      onClick={() => handleDeleteRating(ratingItem.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Clear rating"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Watchlist Queue Breakdown */}
        <div className="bg-[#111] border border-[#222] rounded-3xl p-6 space-y-4 flex flex-col h-[450px]">
          <div className="border-b border-[#222] pb-3 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Bookmark className="w-4 h-4 text-cyan-400" /> Watchlist Queue
            </h3>
            <p className="text-[11px] text-[#666] font-mono mt-0.5">Quick launcher for items saved to watch later</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {watchlist.length === 0 ? (
              <div className="py-20 text-center text-zinc-600 text-xs font-mono">
                Your watchlist queue is currently empty.
              </div>
            ) : (
              movies.filter((m) => watchlist.includes(m.id)).map((movie) => (
                <div 
                  key={`watchlist-panel-${movie.id}`} 
                  className="bg-[#0c0c0c] border border-[#1c1c1c] p-2.5 rounded-xl flex items-center gap-3.5 relative group hover:border-[#222]"
                >
                  <div 
                    onClick={() => onPlayMovie(movie)}
                    className="w-11 h-14 bg-zinc-900 rounded overflow-hidden shrink-0 relative cursor-pointer"
                  >
                    <img 
                      src={movie.posterUrl} 
                      alt={movie.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 
                      onClick={() => onPlayMovie(movie)}
                      className="text-xs font-bold text-white truncate cursor-pointer hover:text-cyan-400 transition-colors"
                    >
                      {movie.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono">{movie.categories.join(', ')} • {movie.releaseYear}</p>
                    {watchProgress[movie.id] !== undefined ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden shrink-0">
                          <div 
                            className="h-full bg-red-600" 
                            style={{ width: `${Math.min(100, Math.round((watchProgress[movie.id] / movie.duration) * 100))}%` }} 
                          />
                        </div>
                        <span className="text-[9px] text-[#555] font-mono">In Progress</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-cyan-400 font-mono">{movie.type === 'song' ? 'Not Listened' : 'Unwatched'}</span>
                    )}
                  </div>

                  <button 
                    onClick={() => onPlayMovie(movie)}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] border border-[#222] hover:bg-red-600 hover:text-white hover:border-transparent text-xs font-semibold text-[#888] rounded-lg transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
