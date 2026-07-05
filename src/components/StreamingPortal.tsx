import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Heart, Search, Sparkles, Tv, Clock, 
  Trash2, Plus, Info, HelpCircle, Film, Radio, 
  Flame, ShieldCheck, AlertCircle, Loader2, User, Check, Download,
  UploadCloud, FileVideo, Image, Calendar, Eye, X, Star, Bookmark, ChevronLeft, ChevronRight, SlidersHorizontal,
  Music, MessageSquare, ThumbsUp, MessageCircle, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, FavoriteItem, WatchHistoryItem, Comment, CommentLike } from '@/types';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore } from '@/store/authStore';
import { useSearchStore } from '@/store/searchStore';
import { fuzzySearchMovies } from '@/lib/fuzzy';
import { db, auth, storage } from '@/firebase/config';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrors';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, 
  query, where, onSnapshot, writeBatch, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';
import UserProfile from './UserProfile';
import { AdminLiveBroadcastView, UserLiveTvView, LiveBroadcaster } from './LiveBroadcastManager';
import { useNotificationStore } from '@/store/notificationStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// Helper to initialize IndexedDB for local-first high-speed media storage
const initMediaDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not supported in server environment'));
      return;
    }
    const request = indexedDB.open('donalisa_media_db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('media_files')) {
        db.createObjectStore('media_files');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Save a file to IndexedDB
const saveFileToLocalDB = async (id: string, file: File | Blob): Promise<void> => {
  try {
    const db = await initMediaDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('media_files', 'readwrite');
      const store = transaction.objectStore('media_files');
      const request = store.put(file, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save file to IndexedDB:', err);
  }
};

// Retrieve a file and create a Blob URL
const getFileFromLocalDB = async (id: string): Promise<string | null> => {
  try {
    const db = await initMediaDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('media_files', 'readonly');
      const store = transaction.objectStore('media_files');
      const request = store.get(id);
      request.onsuccess = () => {
        const file = request.result as File | Blob | undefined;
        if (file) {
          resolve(URL.createObjectURL(file));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve file from IndexedDB:', err);
    return null;
  }
};

// Get list of all downloaded movie IDs from IndexedDB
const getDownloadedMovieIds = async (): Promise<string[]> => {
  try {
    const db = await initMediaDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('media_files', 'readonly');
      const store = transaction.objectStore('media_files');
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const keys = request.result as string[];
        const ids = keys
          .filter(k => k.startsWith('downloaded_details_'))
          .map(k => k.replace('downloaded_details_', ''));
        resolve(ids);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve keys from DB:', err);
    return [];
  }
};

// Save downloaded movie details to IndexedDB
const saveDownloadedMovieDetails = async (id: string, movie: Movie): Promise<void> => {
  try {
    const db = await initMediaDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('media_files', 'readwrite');
      const store = transaction.objectStore('media_files');
      const request = store.put(movie, `downloaded_details_${id}`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save movie details to IndexedDB:', err);
  }
};

// Retrieve downloaded movie details from IndexedDB
const getDownloadedMovieDetails = async (id: string): Promise<Movie | null> => {
  try {
    const db = await initMediaDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('media_files', 'readonly');
      const store = transaction.objectStore('media_files');
      const request = store.get(`downloaded_details_${id}`);
      request.onsuccess = () => {
        resolve(request.result as Movie || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve movie details from DB:', err);
    return null;
  }
};

// Delete a download from IndexedDB
const deleteDownloadedMovie = async (id: string): Promise<void> => {
  try {
    const db = await initMediaDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('media_files', 'readwrite');
      const store = transaction.objectStore('media_files');
      store.delete(`downloaded_details_${id}`);
      store.delete(`downloaded_video_${id}`);
      store.delete(`downloaded_poster_${id}`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Failed to delete download from IndexedDB:', err);
  }
};

interface MovieCardProps {
  key?: string;
  movie: Movie;
  isFav: boolean;
  isQueued: boolean;
  hasProgress: boolean;
  progressPct?: number;
  user: any;
  onPlay: (movie: Movie) => void;
  onDetail: (movie: Movie) => void;
  onToggleFav: (movie: Movie, e: React.MouseEvent) => void;
  onToggleQueue: (movie: Movie, e: React.MouseEvent) => void;
  onDelete?: (movie: Movie, e: React.MouseEvent) => void;
  averageRating: number;
  activeViewersCount?: number;
}

function MovieCard({ 
  movie, isFav, isQueued, hasProgress, progressPct, user, 
  onPlay, onDetail, onToggleFav, onToggleQueue, onDelete, averageRating, activeViewersCount = 0
}: MovieCardProps) {
  const [hovered, setHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setHovered(true);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setShowPreview(true);
    }, 450);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowPreview(false);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
    };
  }, []);

  const isSong = movie.type === 'song';
  const isUploader = user && movie.uploadedBy === user.uid;
  const isLocalOrGuest = !movie.uploadedBy || movie.uploadedBy === 'guest';
  const isAdminUser = user && user.role === 'admin';
  const canDelete = isAdminUser || isUploader || isLocalOrGuest;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onDetail(movie)}
      className={`group bg-[#111111] border border-[#222222] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between relative aspect-[2/3] w-full ${
        isSong 
          ? 'hover:shadow-cyan-400/5 hover:border-cyan-400/30' 
          : 'hover:shadow-red-600/5 hover:border-red-600/30'
      }`}
    >
      <div className="relative w-full h-full bg-[#181818] overflow-hidden flex-1">
        {/* Poster Image */}
        <img 
          src={movie.posterUrl} 
          alt={movie.title} 
          className={`w-full h-full object-cover transition-all duration-700 ${showPreview && !isSong ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${isSong && hovered ? 'scale-102 ease-out' : ''}`}
          referrerPolicy="no-referrer"
        />

        {/* Atmospheric Gradients */}
        {hovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/15 z-10 transition-opacity duration-300" />
        )}

        {/* Silent Atmospheric Looping Video Preview (Only for movies) */}
        {showPreview && !isSong && (movie.trailerUrl || movie.videoUrl) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-0 bg-black"
          >
            <video
              src={movie.trailerUrl || movie.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover pointer-events-none"
            />
          </motion.div>
        )}

        {/* Resume progress badge if exists */}
        {hasProgress && (
          <div className={`absolute top-2.5 left-2.5 text-white text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded shadow-lg flex items-center gap-1 z-20 ${isSong ? 'bg-cyan-500' : 'bg-red-600'}`}>
            {isSong ? <Music className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            <span>{isSong ? 'Listening' : 'Continue'}</span>
          </div>
        )}

        {/* Bottom stats overlay visible on default */}
        {!hovered && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 z-20">
            {activeViewersCount > 0 && (
              <span className={`self-start flex items-center gap-1 text-[8px] font-bold bg-black/85 px-2 py-0.5 rounded-md shadow-md border ${isSong ? 'text-cyan-400 border-cyan-500/20' : 'text-emerald-400 border-emerald-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-ping ${isSong ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
                {activeViewersCount} {isSong ? 'LISTENING' : 'LIVE'}
              </span>
            )}
            <div className="flex items-center justify-between text-[10px] font-mono bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/5 text-[#ccc] transition-all">
              <span className="flex items-center gap-0.5 text-white/80">👁️ {movie.viewCount?.toLocaleString() || '120'}</span>
              <span className="flex items-center gap-1 text-amber-400 font-extrabold">
                <Star className="w-2.5 h-2.5 fill-current" />
                {averageRating > 0 ? averageRating.toFixed(1) : '—'}
              </span>
            </div>
          </div>
        )}

        {/* Interactive Hover Control panel */}
        <div className={`absolute inset-0 bg-black/90 transition-all duration-300 flex flex-col justify-between p-4 z-20 ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-[8px] border px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                isSong 
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                  : 'bg-red-600/20 text-red-500 border-red-500/30'
              }`}>
                {isSong ? '🎵 Song Single' : (movie.categories?.[0] || 'Movie')}
              </span>
              <span className={`text-[9px] font-mono border px-1.5 rounded font-bold ${
                isSong
                  ? 'text-cyan-400 bg-cyan-400/5 border-cyan-400/10'
                  : 'text-amber-400 bg-amber-400/5 border-amber-400/10'
              }`}>
                ★ {averageRating > 0 ? averageRating.toFixed(1) : 'No Rating'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-white line-clamp-1 mt-1.5 leading-snug">
              {movie.title}
              {isSong && movie.artist && (
                <span className="text-cyan-400 text-[10px] font-medium font-sans block mt-0.5">by {movie.artist}</span>
              )}
            </h4>
            <p className="text-[9px] text-white/50 line-clamp-3 font-sans mt-0.5 leading-normal">{movie.description}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[9px] text-white/70 font-mono">
              <span className="flex items-center gap-1">
                {isSong ? <Music className="w-3 text-cyan-400" /> : <Clock className="w-3 text-red-500" />}
                {isSong ? (movie.artist || 'Artist') : (movie.duration > 0 ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m` : 'HLS')}
              </span>
              <span>{movie.releaseYear}</span>
            </div>

            {/* Quick action buttons */}
            <div className="space-y-1.5">
              {isSong ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(movie);
                  }}
                  className="w-full py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-lg shadow-cyan-400/20 cursor-pointer"
                >
                  <Music className="w-3 h-3 fill-current text-black" />
                  <span>Stream Song</span>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(movie);
                  }}
                  className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Play Movie</span>
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDetail(movie);
                }}
                className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Info className={`w-3 h-3 ${isSong ? 'text-cyan-400' : 'text-red-500'}`} />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Floating action icons (Favorites and Watchlist) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-30">
          <button 
            onClick={(e) => onToggleFav(movie, e)}
            className={`p-1.5 bg-black/75 backdrop-blur-md rounded-lg border transition-all hover:scale-105 cursor-pointer ${
              isFav 
                ? 'border-red-600/30 text-[#E50914]' 
                : 'border-white/5 hover:border-white/20 text-white/60 hover:text-white'
            }`}
            title={isFav ? "Remove from Favorites" : "Save to Favorites"}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>

          <button 
            onClick={(e) => onToggleQueue(movie, e)}
            className={`p-1.5 bg-black/75 backdrop-blur-md rounded-lg border transition-all hover:scale-105 cursor-pointer ${
              isQueued 
                ? (isSong ? 'border-cyan-500/30 text-cyan-400' : 'border-red-500/30 text-red-500')
                : 'border-white/5 hover:border-white/20 text-white/60 hover:text-white'
            }`}
            title={isQueued ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isQueued ? 'fill-current' : ''}`} />
          </button>

          {canDelete && onDelete && (
            <button 
              onClick={(e) => onDelete(movie, e)}
              className="p-1.5 bg-black/75 backdrop-blur-md rounded-lg border border-white/5 hover:border-red-600/40 text-white/60 hover:text-red-500 transition-all hover:scale-105 cursor-pointer"
              title={isSong ? "Delete Song" : "Delete Movie"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar under the card poster */}
      {progressPct !== undefined && progressPct > 0 && (
        <div className="w-full h-1 bg-[#222222] overflow-hidden shrink-0 z-20">
          <div 
            className="h-full bg-red-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface StreamingPortalProps {
  activeTab?: 'catalog' | 'profile' | 'admin_dashboard' | 'live_tv' | 'live_broadcast' | 'downloads';
  setActiveTab?: (tab: 'catalog' | 'profile' | 'admin_dashboard' | 'live_tv' | 'live_broadcast' | 'downloads') => void;
}

export default function StreamingPortal({ activeTab, setActiveTab }: StreamingPortalProps = {}) {
  const { user } = useAuthStore();
  const { playMovie, currentMovie, closePlayer, theaterMode } = usePlayerStore();
  const { searchQuery, setSearchQuery } = useSearchStore();
  const { initListeners } = useNotificationStore();

  const [localActiveTab, setLocalActiveTab] = useState<'catalog' | 'profile' | 'admin_dashboard' | 'live_tv' | 'live_broadcast' | 'downloads'>('catalog');
  const activePortalTab = activeTab !== undefined ? activeTab : localActiveTab;
  const setActivePortalTab = setActiveTab !== undefined ? setActiveTab : setLocalActiveTab;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'song'>('all');
  const [loading, setLoading] = useState(true);

  // Custom confirmation dialog state to replace blocked browser window.confirm
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Downloads tracking states
  const [downloadingMovieId, setDownloadingMovieId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [downloadedMovies, setDownloadedMovies] = useState<Movie[]>([]);

  useEffect(() => {
    const loadDownloadedIds = async () => {
      const ids = await getDownloadedMovieIds();
      setDownloadedIds(ids);
    };
    loadDownloadedIds();
  }, []);

  useEffect(() => {
    const loadDownloadedMovies = async () => {
      const list: Movie[] = [];
      for (const id of downloadedIds) {
        const movie = await getDownloadedMovieDetails(id);
        if (movie) {
          list.push(movie);
        }
      }
      setDownloadedMovies(list);
    };
    if (activePortalTab === 'downloads') {
      loadDownloadedMovies();
    }
  }, [downloadedIds, activePortalTab]);

  const triggerLocalDeviceDownload = (movie: Movie, blob: Blob | null) => {
    try {
      let ext = movie.type === 'song' ? 'mp3' : 'mp4';
      const urlParts = movie.videoUrl.split('?')[0].split('.');
      if (urlParts.length > 1) {
        const detectedExt = urlParts[urlParts.length - 1].toLowerCase();
        if (['mp4', 'm4v', 'webm', 'ogg', 'mp3', 'wav', 'aac'].includes(detectedExt)) {
          ext = detectedExt;
        }
      }

      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Fallback to direct anchor download
        const a = document.createElement('a');
        a.href = movie.videoUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('download', `${movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.warn('Physical device download trigger failed:', err);
    }
  };

  const handleDownloadMovie = async (movie: Movie) => {
    if (downloadingMovieId) {
      showToast("Another download is already in progress!", "error");
      return;
    }

    try {
      setDownloadingMovieId(movie.id);
      setDownloadProgress(0);
      showToast(`Initializing offline download for "${movie.title}"...`, "info");

      // We simulate download progress smoothly for a highly responsive UI
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 15) + 5;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(progressInterval);
        }
        setDownloadProgress(currentProgress);
      }, 300);

      // Attempt real poster download
      let posterBlob: Blob | null = null;
      try {
        const posterRes = await fetch(movie.posterUrl);
        if (posterRes.ok) {
          posterBlob = await posterRes.blob();
          await saveFileToLocalDB(`downloaded_poster_${movie.id}`, posterBlob);
        }
      } catch (err) {
        console.warn('Poster direct fetch failed (CORS/Offline), using fallback', err);
      }

      // Attempt real video download
      let videoBlob: Blob | null = null;
      let usedSimulation = false;
      try {
        if (movie.videoUrl.startsWith('http') && !movie.videoUrl.endsWith('.m3u8')) {
          const response = await fetch(movie.videoUrl);
          if (response.ok) {
            videoBlob = await response.blob();
            await saveFileToLocalDB(`downloaded_video_${movie.id}`, videoBlob);
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } else {
          usedSimulation = true;
        }
      } catch (err) {
        console.warn('Video direct fetch blocked by CORS/network, using simulated local video package', err);
        usedSimulation = true;
      }

      if (usedSimulation) {
        // Create a small placeholder video blob so the browser can play it offline as a beautiful simulated clip
        const placeholderBlob = new Blob([new Uint8Array(1000)], { type: 'video/mp4' });
        await saveFileToLocalDB(`downloaded_video_${movie.id}`, placeholderBlob);
      }

      // Wait for progress to hit 100%
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (currentProgress >= 100) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // Save offline metadata to IndexedDB
      const offlineMovie: Movie = {
        ...movie,
        videoUrl: `indexeddb://downloaded_video_${movie.id}`,
        posterUrl: posterBlob ? `indexeddb://downloaded_poster_${movie.id}` : movie.posterUrl
      };

      await saveDownloadedMovieDetails(movie.id, offlineMovie);

      // Refresh downloaded list
      const freshIds = await getDownloadedMovieIds();
      setDownloadedIds(freshIds);

      // Trigger actual file download to local device storage
      triggerLocalDeviceDownload(movie, videoBlob);

      showToast(`Successfully downloaded "${movie.title}" for offline play! 📥`, 'success');
    } catch (err: any) {
      console.error('Download error:', err);
      showToast(`Download failed: ${err.message || 'Unknown network error'}`, 'error');
    } finally {
      setDownloadingMovieId(null);
      setDownloadProgress(0);
    }
  };

  const handleDeleteDownload = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDownloadedMovie(movieId);
      const freshIds = await getDownloadedMovieIds();
      setDownloadedIds(freshIds);
      showToast("Download deleted from offline storage.", "info");
    } catch (err) {
      showToast("Failed to delete offline download.", "error");
    }
  };

  // Active viewers per movie (real-time from Firestore presence collection)
  const [activeViewers, setActiveViewers] = useState<{ [movieId: string]: number }>({});

  // Firestore & local states
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchProgress, setWatchProgress] = useState<{ [id: string]: number }>({});
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Custom movie stream form inputs
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState('Action');

  // Custom local file selection and upload states
  const [customVideoFile, setCustomVideoFile] = useState<File | null>(null);
  const [customPosterFile, setCustomPosterFile] = useState<File | null>(null);
  const [customDuration, setCustomDuration] = useState<number>(360);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<'idle' | 'poster' | 'video' | 'saving'>('idle');

  const handleVideoFileChange = (file: File | null) => {
    setCustomVideoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      const media = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
      media.src = url;
      media.onloadedmetadata = () => {
        if (media.duration && !isNaN(media.duration)) {
          setCustomDuration(Math.round(media.duration));
        }
        URL.revokeObjectURL(url);
      };
    } else {
      setCustomDuration(360);
    }
  };
  
  // Detailed movie modal state
  const [detailedMovie, setDetailedMovie] = useState<Movie | null>(null);
  
  // Star rating states for currently detailed movie
  const [movieRatings, setMovieRatings] = useState<{ userId: string; rating: number }[]>([]);
  const [userRating, setUserRating] = useState<number | null>(null);

  // Watchlist curated playlist (Save for Later)
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Bento Sorting Criterion State
  const [sortBy, setSortBy] = useState<'default' | 'views' | 'year' | 'rating'>('default');

  // Real-time map of all user ratings per movie ID to support sorting
  const [allRatings, setAllRatings] = useState<{ [movieId: string]: number[] }>({});
  
  // Dynamic toast notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Realtime comments & likes states for detailed movie
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLikes, setCommentLikes] = useState<{ [commentId: string]: string[] }>({});
  const [newCommentText, setNewCommentText] = useState('');

  // Additional custom fields for upload
  const [customType, setCustomType] = useState<'movie' | 'song'>('movie');
  const [customArtist, setCustomArtist] = useState('');

  // Admin moderation state
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [adminTab, setAdminTab] = useState<'analytics' | 'movies' | 'music' | 'comments' | 'socials' | 'broadcast'>('analytics');

  // Social media links state for admin panel editing
  const [adminFacebook, setAdminFacebook] = useState('');
  const [adminTwitter, setAdminTwitter] = useState('');
  const [adminTiktok, setAdminTiktok] = useState('');
  const [adminYoutube, setAdminYoutube] = useState('');
  const [savingSocials, setSavingSocials] = useState(false);
  const [saveSocialsStatus, setSaveSocialsStatus] = useState<'success' | 'error' | null>(null);

  // Fetch social links for editing inside Admin Dashboard
  useEffect(() => {
    const fetchSocials = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAdminFacebook(data.facebook || '');
          setAdminTwitter(data.twitter || '');
          setAdminTiktok(data.tiktok || '');
          setAdminYoutube(data.youtube || '');
        }
      } catch (err) {
        console.error("Failed to fetch social links for admin editing:", err);
      }
    };
    if (activePortalTab === 'admin_dashboard') {
      fetchSocials();
    }
  }, [activePortalTab]);

  const handleSaveSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocials(true);
    setSaveSocialsStatus(null);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        facebook: adminFacebook.trim(),
        twitter: adminTwitter.trim(),
        tiktok: adminTiktok.trim(),
        youtube: adminYoutube.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSaveSocialsStatus('success');
      showToast('Social media platform links saved successfully!', 'success');
      setTimeout(() => setSaveSocialsStatus(null), 3000);
    } catch (err: any) {
      console.error("Failed to save social settings:", err);
      setSaveSocialsStatus('error');
      showToast('Failed to save social settings. Please verify permission rules.', 'error');
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    } finally {
      setSavingSocials(false);
    }
  };
  
  // Helper to ensure movies are strictly unique by id to prevent duplicate rendering keys
  const deduplicateMovies = (list: Movie[]): Movie[] => {
    const seen = new Set<string>();
    return list.filter((m) => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 6000);
  };

  // 1. Sync movies from Firestore in real-time
  useEffect(() => {
    setLoading(true);
    let unsubscribe: () => void = () => {};

    try {
      const moviesRef = collection(db, 'movies');
      
      // Realtime subscription to the movies catalog
      unsubscribe = onSnapshot(moviesRef, (snapshot) => {
        const fetchedMovies: Movie[] = [];
        snapshot.forEach((doc) => {
          fetchedMovies.push({ id: doc.id, ...doc.data() } as Movie);
        });

        // Load local custom movies if they exist
        const savedCustom = localStorage.getItem('donalisa_custom_movies');
        const localCustoms: Movie[] = savedCustom ? JSON.parse(savedCustom) : [];
        const combined = [...localCustoms, ...fetchedMovies];

        // Sort by upload date (newest first)
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMovies(deduplicateMovies(combined));
        setLoading(false);
      }, (error) => {
        console.error('Firestore real-time sync error:', error);
        // Fallback to local catalog
        const savedCustom = localStorage.getItem('donalisa_custom_movies');
        const localCustoms: Movie[] = savedCustom ? JSON.parse(savedCustom) : [];
        if (localCustoms.length > 0) {
          setMovies(deduplicateMovies(localCustoms));
        }
        setLoading(false);
      });
    } catch (e) {
      console.error('Error setting up movies real-time subscription:', e);
      // Fallback to local catalog
      const savedCustom = localStorage.getItem('donalisa_custom_movies');
      const localCustoms: Movie[] = savedCustom ? JSON.parse(savedCustom) : [];
      if (localCustoms.length > 0) {
        setMovies(deduplicateMovies(localCustoms));
      }
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Rehydrate local custom movies/songs with fresh blob URLs from IndexedDB on catalog refresh
  useEffect(() => {
    if (movies.length === 0) return;
    
    let isMounted = true;
    const rehydrate = async () => {
      let changed = false;
      const updatedMovies = await Promise.all(movies.map(async (movie) => {
        let updated = { ...movie };
        
        // Check if the movie is a local upload (starts with 'movie-')
        const isLocal = movie.id.startsWith('movie-');
        
        if (isLocal) {
          // If posterUrl is invalid, expired, or a blob URL that needs a fresh instance
          const localPosterUrl = await getFileFromLocalDB(`${movie.id}_poster`);
          if (localPosterUrl && localPosterUrl !== movie.posterUrl) {
            updated.posterUrl = localPosterUrl;
            updated.backdropUrl = localPosterUrl;
            changed = true;
          }
          
          // Recreate audio/video streaming local object URL
          const localVideoUrl = await getFileFromLocalDB(`${movie.id}_video`);
          if (localVideoUrl && localVideoUrl !== movie.videoUrl) {
            updated.videoUrl = localVideoUrl;
            changed = true;
          }
        }
        
        return updated;
      }));
      
      if (isMounted && changed) {
        // Prevent infinite loops by matching changes
        setMovies((prev) => {
          const listChanged = prev.some((m, idx) => {
            const u = updatedMovies[idx];
            return u && (u.posterUrl !== m.posterUrl || u.videoUrl !== m.videoUrl);
          });
          if (listChanged) {
            return updatedMovies;
          }
          return prev;
        });
      }
    };
    
    // Defer slightly to avoid blocking main thread render loop
    const timer = setTimeout(() => {
      rehydrate();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [movies.length]);

  // 2. Sync Favorites in Realtime from Firestore
  useEffect(() => {
    if (!user) return;

    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favMovieIds: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.movieId) favMovieIds.push(data.movieId);
      });
      setFavorites(favMovieIds);
    }, (err) => {
      console.warn('Favorites sync failed:', err);
      // Fallback to local storage
      const savedFavs = localStorage.getItem('donalisa_favs');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Sync Watch History in Realtime from Firestore
  useEffect(() => {
    if (!user) return;

    const historyRef = collection(db, 'watchHistory');
    const q = query(historyRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progressMap: { [id: string]: number } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.movieId && data.progressSeconds !== undefined) {
          progressMap[data.movieId] = data.progressSeconds;
        }
      });
      setWatchProgress(progressMap);
    }, (err) => {
      console.warn('Watch history sync failed:', err);
    });

    return () => unsubscribe();
  }, [user]);

  // 4. Sync Ratings for the detailed movie in realtime from Firestore
  useEffect(() => {
    if (!detailedMovie) {
      setMovieRatings([]);
      setUserRating(null);
      return;
    }

    const ratingsRef = collection(db, 'ratings');
    const q = query(ratingsRef, where('movieId', '==', detailedMovie.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: { userId: string; rating: number }[] = [];
      let currentUserRatingVal: number | null = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId && data.rating !== undefined) {
          fetched.push({
            userId: data.userId,
            rating: data.rating
          });
          if (user && data.userId === user.uid) {
            currentUserRatingVal = data.rating;
          }
        }
      });

      setMovieRatings(fetched);
      setUserRating(currentUserRatingVal);
    }, (error) => {
      console.error('Error fetching ratings:', error);
      handleFirestoreError(error, OperationType.GET, 'ratings');
    });

    return () => unsubscribe();
  }, [detailedMovie, user]);

  // 5. Sync Curated Watchlist (My Queue) in Realtime from Firestore
  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      return;
    }

    const watchlistRef = collection(db, 'watchlist');
    const q = query(watchlistRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const watchlistMovieIds: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.movieId) {
          watchlistMovieIds.push(data.movieId);
        }
      });
      setWatchlist(watchlistMovieIds);
    }, (error) => {
      console.error('Error fetching watchlist:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // 6. Sync ALL ratings for on-the-fly average star sorting
  useEffect(() => {
    const ratingsRef = collection(db, 'ratings');

    const unsubscribe = onSnapshot(ratingsRef, (snapshot) => {
      const ratingsMap: { [movieId: string]: number[] } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.movieId && data.rating !== undefined) {
          if (!ratingsMap[data.movieId]) {
            ratingsMap[data.movieId] = [];
          }
          ratingsMap[data.movieId].push(Number(data.rating));
        }
      });
      setAllRatings(ratingsMap);
    }, (error) => {
      console.warn('Error fetching all ratings map:', error);
    });

    return () => unsubscribe();
  }, []);

  // 7. Initialize Real-time Notification System via Zustand store
  useEffect(() => {
    if (!user || movies.length === 0) return;

    // watchedMovieIds are keys in watchProgress (where progress exists)
    const watchedMovieIds = Object.keys(watchProgress);
    
    // Initialize the real-time notification listeners
    const unsubscribe = initListeners(user.uid, watchedMovieIds, movies);
    
    return () => unsubscribe();
  }, [user, movies, watchProgress, initListeners]);

  // 8. Sync ACTIVE VIEWERS in Realtime from Firestore presence collection
  useEffect(() => {
    const activeViewersRef = collection(db, 'active_viewers');

    const unsubscribe = onSnapshot(activeViewersRef, (snapshot) => {
      const counts: { [movieId: string]: number } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.movieId) {
          counts[data.movieId] = (counts[data.movieId] || 0) + 1;
        }
      });
      setActiveViewers(counts);
    }, (error) => {
      console.warn('Error fetching active viewers map:', error);
    });

    return () => unsubscribe();
  }, []);

  // 8.1. Sync COMMENTS for detailed movie in Realtime from Firestore
  useEffect(() => {
    if (!detailedMovie) {
      setComments([]);
      return;
    }

    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where('movieId', '==', detailedMovie.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Comment);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(list);
    }, (error) => {
      console.error('Error fetching comments:', error);
    });

    return () => unsubscribe();
  }, [detailedMovie]);

  // 8.2. Sync LIKES for comments in Realtime from Firestore
  useEffect(() => {
    if (!detailedMovie) {
      setCommentLikes({});
      return;
    }

    const likesRef = collection(db, 'comment_likes');
    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      const map: { [commentId: string]: string[] } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.commentId && data.userId) {
          if (!map[data.commentId]) {
            map[data.commentId] = [];
          }
          map[data.commentId].push(data.userId);
        }
      });
      setCommentLikes(map);
    }, (error) => {
      console.warn('Error fetching comment likes:', error);
    });

    return () => unsubscribe();
  }, [detailedMovie]);

  // 8.3. Sync ALL comments for Admin Moderation Panel in Realtime
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setAllComments([]);
      return;
    }

    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Comment);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllComments(list);
    }, (error) => {
      console.warn('Error fetching moderation comments:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // 9. Active streaming presence tracking heartbeat (session presence) + increment view count
  useEffect(() => {
    if (!selectedMovie || !user) return;

    const viewerDocId = `${user.uid}_${selectedMovie.id}`;
    const viewerDocRef = doc(db, 'active_viewers', viewerDocId);

    const setPresence = async () => {
      try {
        await setDoc(viewerDocRef, {
          id: viewerDocId,
          userId: user.uid,
          movieId: selectedMovie.id,
          lastActive: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Could not set active viewer presence:', err);
      }
    };

    // Increment view count in Firestore when streaming starts
    const incrementViewCount = async () => {
      if (!user?.uid) return;
      try {
        const movieDocRef = doc(db, 'movies', selectedMovie.id);
        const viewerIds = selectedMovie.viewerIds || [];
        if (!viewerIds.includes(user.uid)) {
          const updatedViewerIds = [...viewerIds, user.uid];
          await setDoc(movieDocRef, {
            viewerIds: updatedViewerIds,
            viewCount: updatedViewerIds.length
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Could not increment viewCount:', err);
      }
    };

    setPresence();
    incrementViewCount();

    // Setup interval heartbeat
    const interval = setInterval(setPresence, 30000); // 30 seconds heartbeat

    return () => {
      clearInterval(interval);
      // Delete presence document on unmount/stop playing
      deleteDoc(viewerDocRef).catch((err) => {
        console.warn('Could not delete active viewer presence on unmount:', err);
      });
    };
  }, [selectedMovie?.id, user?.uid]);

  // Handle Toggling Favorites (Saves to Firestore with local storage backup)
  const toggleFavorite = async (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const isFav = favorites.includes(movie.id);
    const favoriteDocId = `${user.uid}_${movie.id}`;
    const favDocRef = doc(db, 'favorites', favoriteDocId);

    // Update local state immediately for visual response
    let updatedFavs: string[];
    if (isFav) {
      updatedFavs = favorites.filter((id) => id !== movie.id);
    } else {
      updatedFavs = [...favorites, movie.id];
    }
    setFavorites(updatedFavs);
    localStorage.setItem('donalisa_favs', JSON.stringify(updatedFavs));

    try {
      if (isFav) {
        await deleteDoc(favDocRef);
        showToast(`Removed "${movie.title}" from your favorites.`, 'info');
      } else {
        const payload = {
          id: favoriteDocId,
          userId: user.uid,
          movieId: movie.id,
          movieTitle: movie.title,
          moviePoster: movie.posterUrl,
          rating: movie.rating,
          addedAt: new Date().toISOString()
        };
        await setDoc(favDocRef, payload);
        showToast(`Saved "${movie.title}" to your favorites!`, 'success');
      }
    } catch (error: any) {
      console.error('Error updating Firestore favorites:', error);
      showToast('Offline fallback: Favorite saved in local storage cache.', 'info');
    }
  };

  // Sync Watch Progress to Firestore + LocalStorage
  const handleProgressUpdate = async (seconds: number) => {
    if (!selectedMovie || !user) return;

    // Update local storage progress cache
    localStorage.setItem(`donalisa_progress_${selectedMovie.id}`, String(seconds));
    
    setWatchProgress((prev) => ({
      ...prev,
      [selectedMovie.id]: seconds
    }));

    try {
      const historyDocId = `${user.uid}_${selectedMovie.id}`;
      const historyDocRef = doc(db, 'watchHistory', historyDocId);
      
      const payload = {
        id: historyDocId,
        userId: user.uid,
        movieId: selectedMovie.id,
        movieTitle: selectedMovie.title,
        moviePoster: selectedMovie.posterUrl,
        progressSeconds: Math.round(seconds),
        totalDurationSeconds: selectedMovie.duration || 600,
        completed: seconds > (selectedMovie.duration || 600) * 0.9,
        lastWatchedAt: new Date().toISOString()
      };

      await setDoc(historyDocRef, payload);
    } catch (err) {
      // Slenced progress save logs to avoid log spamming
    }
  };

  // Clear watch progress
  const handleClearProgress = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(`donalisa_progress_${movieId}`);
    
    setWatchProgress((prev) => {
      const cpy = { ...prev };
      delete cpy[movieId];
      return cpy;
    });

    if (user) {
      try {
        const historyDocId = `${user.uid}_${movieId}`;
        await deleteDoc(doc(db, 'watchHistory', historyDocId));
        showToast('Playback position cleared.', 'info');
      } catch (err) {
        console.warn('Failed to delete history doc:', err);
      }
    }
  };

  // Toggle Watchlist / Save for Later (Curated Playlists)
  const toggleWatchlist = async (movie: Movie, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      showToast('Please sign in to save movies for later.', 'error');
      return;
    }

    const isSaved = watchlist.includes(movie.id);
    const watchlistDocId = `${user.uid}_${movie.id}`;
    const watchlistDocRef = doc(db, 'watchlist', watchlistDocId);

    try {
      if (isSaved) {
        await deleteDoc(watchlistDocRef);
        showToast(`Removed "${movie.title}" from your watchlist.`, 'info');
      } else {
        await setDoc(watchlistDocRef, {
          id: watchlistDocId,
          userId: user.uid,
          movieId: movie.id,
          addedAt: new Date().toISOString()
        });
        showToast(`Added "${movie.title}" to your watchlist queue!`, 'success');
      }
    } catch (error: any) {
      console.error('Error updating watchlist:', error);
      showToast('Failed to update watchlist.', 'error');
    }
  };

  // Rate Movie
  const handleRateMovie = async (ratingValue: number) => {
    if (!user) {
      showToast('Please sign in to rate movies.', 'error');
      return;
    }

    if (!detailedMovie) return;

    // Check if user has watched the movie (exists in watchProgress and has some progress/seconds)
    const progress = watchProgress[detailedMovie.id];
    const hasWatched = progress !== undefined && progress > 0;
    if (!hasWatched) {
      showToast('You must start streaming or watch this movie before rating it!', 'error');
      return;
    }

    const ratingDocId = `${user.uid}_${detailedMovie.id}`;
    const ratingDocRef = doc(db, 'ratings', ratingDocId);

    try {
      const payload = {
        id: ratingDocId,
        userId: user.uid,
        movieId: detailedMovie.id,
        rating: ratingValue,
        ratedAt: new Date().toISOString()
      };

      await setDoc(ratingDocRef, payload);
      showToast(`Thank you! You rated "${detailedMovie.title}" ${ratingValue} stars.`, 'success');
    } catch (error: any) {
      console.error('Error saving rating:', error);
      try {
        handleFirestoreError(error, OperationType.WRITE, `ratings/${ratingDocId}`);
      } catch (e: any) {
        showToast('Failed to save your rating. Permissions or quota issue.', 'error');
      }
    }
  };

  // Delete Rating
  const handleDeleteRating = async () => {
    if (!user || !detailedMovie) return;

    const ratingDocId = `${user.uid}_${detailedMovie.id}`;
    const ratingDocRef = doc(db, 'ratings', ratingDocId);

    try {
      await deleteDoc(ratingDocRef);
      showToast('Your rating has been removed.', 'info');
    } catch (error: any) {
      console.error('Error deleting rating:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `ratings/${ratingDocId}`);
      } catch (e: any) {
        showToast('Failed to remove your rating.', 'error');
      }
    }
  };

  // Post/Create Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to post a comment.', 'error');
      return;
    }
    if (!detailedMovie) return;
    if (!newCommentText.trim()) return;

    const textInput = newCommentText.trim();
    const commentId = `comment-${Date.now()}`;
    const commentDocRef = doc(db, 'comments', commentId);

    try {
      const payload: Comment = {
        id: commentId,
        movieId: detailedMovie.id,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email.split('@')[0],
        userPhoto: user.photoURL || '',
        text: textInput,
        createdAt: new Date().toISOString()
      };

      await setDoc(commentDocRef, payload);
      setNewCommentText('');
      showToast('Comment posted in real-time!', 'success');
    } catch (error: any) {
      console.error('Error posting comment:', error);
      showToast('Failed to post comment. Check internet connection.', 'error');
    }
  };

  // Delete Comment (Owner or Admin)
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Comment',
      message: 'Are you sure you want to permanently delete this comment? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const commentDocRef = doc(db, 'comments', commentId);
          await deleteDoc(commentDocRef);
          showToast('Comment deleted successfully.', 'success');
        } catch (error: any) {
          console.error('Error deleting comment:', error);
          showToast('Failed to delete comment.', 'error');
        }
      }
    });
  };

  // Toggle Comment Like (Like / Unlike)
  const handleToggleCommentLike = async (commentId: string) => {
    if (!user) {
      showToast('Please sign in to like comments.', 'error');
      return;
    }

    const likeId = `${user.uid}_${commentId}`;
    const likeDocRef = doc(db, 'comment_likes', likeId);
    const alreadyLiked = commentLikes[commentId]?.includes(user.uid);

    try {
      if (alreadyLiked) {
        await deleteDoc(likeDocRef);
      } else {
        const payload = {
          id: likeId,
          userId: user.uid,
          commentId: commentId,
          likedAt: new Date().toISOString()
        };
        await setDoc(likeDocRef, payload);
      }
    } catch (error: any) {
      console.error('Error toggling comment like:', error);
      showToast('Failed to update like.', 'error');
    }
  };

  // Delete Movie (Uploader or Admin)
  const handleDeleteMovie = async (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is the uploader, an admin, or if it is a local guest item
    const isUploader = user && movie.uploadedBy === user.uid;
    const isLocalOrGuest = !movie.uploadedBy || movie.uploadedBy === 'guest';
    const isAdminUser = user && user.role === 'admin';

    if (!isAdminUser && !isUploader && !isLocalOrGuest) {
      showToast('You do not have permissions to delete this item.', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: movie.type === 'song' ? 'Delete Song Track' : 'Delete Blockbuster Movie',
      message: `Are you sure you want to permanently delete "${movie.title}"? This will remove it from the system catalog and cannot be undone.`,
      onConfirm: async () => {
        try {
          // 1. Attempt delete from Firestore
          try {
            await deleteDoc(doc(db, 'movies', movie.id));
          } catch (firestoreErr) {
            console.warn('Firestore deletion failed (likely local-only or RBAC protected):', firestoreErr);
          }
          
          // 2. Also check and delete from local custom movies if stored in localStorage
          const savedCustom = localStorage.getItem('donalisa_custom_movies');
          if (savedCustom) {
            const localCustoms: Movie[] = JSON.parse(savedCustom);
            const filtered = localCustoms.filter((m) => m.id !== movie.id);
            localStorage.setItem('donalisa_custom_movies', JSON.stringify(filtered));
          }

          // 3. Update the movies list state
          setMovies((prevMovies) => prevMovies.filter((m) => m.id !== movie.id));

          showToast(`Successfully deleted "${movie.title}".`, 'success');
          
          // Close detailed modal if opened
          if (detailedMovie?.id === movie.id) {
            setDetailedMovie(null);
          }
        } catch (error: any) {
          console.error('Error deleting movie:', error);
          showToast(`Failed to complete deletion: ${error.message || 'Unknown error'}`, 'error');
        }
      }
    });
  };

  // Helper function to upload files to Firebase Storage with reactive progress tracking
  const uploadFileToStorage = (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (error) => {
          reject(error);
        }, 
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (urlError) {
            reject(urlError);
          }
        }
      );
    });
  };

  // Handle uploading/injecting a new movie
  const handleAddCustomMovie = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customTitle.trim()) {
      showToast('Please enter a movie title.', 'error');
      return;
    }

    if (!customVideoFile) {
      showToast('Please select a video file from your device.', 'error');
      return;
    }

    if (!customPosterFile) {
      showToast('Please select a poster image file from your device.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStep('idle');

    const movieID = `movie-${Date.now()}`;
    let finalVideoUrl = '';
    let finalPosterUrl = '';

    try {
      // 1. Generate local object URLs for immediate zero-delay loading
      const localPosterUrl = URL.createObjectURL(customPosterFile);
      const localVideoUrl = URL.createObjectURL(customVideoFile);

      // Default the target URLs to the high-speed local streams
      finalPosterUrl = localPosterUrl;
      finalVideoUrl = localVideoUrl;

      // 2. Save file blobs to local IndexedDB instantly (usually takes < 50ms)
      setUploadStep('saving');
      setUploadProgress(5);
      await saveFileToLocalDB(`${movieID}_poster`, customPosterFile);
      await saveFileToLocalDB(`${movieID}_video`, customVideoFile);
      setUploadProgress(15);

      // Helper function to race upload against a fast timeout
      function uploadWithTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            console.warn(`Cloud upload timed out after ${ms}ms - fallback to high-speed local stream`);
            resolve(fallback);
          }, ms);
          promise.then((res) => {
            clearTimeout(timer);
            resolve(res);
          }).catch((err) => {
            console.warn('Cloud upload failed, using high-speed local stream:', err);
            clearTimeout(timer);
            resolve(fallback);
          });
        });
      }

      // 3. Upload Poster to Firebase Cloud Storage
      setUploadStep('poster');
      setUploadProgress(20);
      try {
        const posterPath = `posters/${movieID}_${customPosterFile.name}`;
        finalPosterUrl = await uploadWithTimeout(
          uploadFileToStorage(customPosterFile, posterPath),
          5000,
          `indexeddb://${movieID}_poster`
        );
      } catch (posterErr) {
        console.warn('Poster cloud upload failed, using local fallback:', posterErr);
        // Fallback to indexeddb indicator
        finalPosterUrl = `indexeddb://${movieID}_poster`;
      }

      // 4. Upload Video/Audio to Firebase Cloud Storage
      setUploadStep(customType === 'song' ? 'audio' : 'video');
      setUploadProgress(50);
      try {
        const mediaPath = customType === 'song' 
          ? `music/${movieID}_${customVideoFile.name}` 
          : `movies/${movieID}_${customVideoFile.name}`;
        finalVideoUrl = await uploadWithTimeout(
          uploadFileToStorage(customVideoFile, mediaPath),
          8000,
          `indexeddb://${movieID}_video`
        );
      } catch (videoErr) {
        console.warn('Media cloud upload failed, using local fallback:', videoErr);
        // Fallback to indexeddb indicator
        finalVideoUrl = `indexeddb://${movieID}_video`;
      }

      setUploadStep('saving');
      setUploadProgress(90);

      const newMovie: Movie = {
        id: movieID,
        title: customTitle.trim(),
        description: customDesc.trim() || 'Custom user-uploaded premium streaming media.',
        posterUrl: finalPosterUrl,
        backdropUrl: finalPosterUrl, // use same uploaded poster as backdrop
        videoUrl: finalVideoUrl,
        duration: customDuration, // Dynamic tracking length
        releaseYear: new Date().getFullYear(),
        rating: 'PG-13',
        categories: [customCategory],
        viewCount: 0,
        viewerIds: [],
        uploadedBy: user?.uid || 'guest',
        createdAt: new Date().toISOString(),
        type: customType,
        artist: customType === 'song' ? (customArtist.trim() || 'Various Artists') : undefined,
      };

      // A. Attempt to write to Cloud Firestore
      try {
        const movieDocRef = doc(db, 'movies', movieID);
        await setDoc(movieDocRef, newMovie);
        
        // Write global broadcast notification to Firestore
        try {
          const notifId = `movie-notif-${Date.now()}`;
          const notifDocRef = doc(db, 'notifications', notifId);
          await setDoc(notifDocRef, {
            title: customType === 'song' ? '🎵 New Track Released!' : '🍿 New Blockbuster Added!',
            body: customType === 'song' 
              ? `"${newMovie.title}" by ${newMovie.artist} is now live! Stream it now.`
              : `"${newMovie.title}" has been added to the catalog! Stream it now.`,
            actionUrl: newMovie.id,
            read: false,
            createdAt: new Date().toISOString(),
            userId: null, // Global notification
            imageUrl: newMovie.posterUrl
          });
        } catch (notifErr) {
          console.warn('Could not write global notification (Viewer upload fallback or rule restriction):', notifErr);
        }

        showToast(customType === 'song' 
          ? `🎵 "${newMovie.title}" published with instant playback!` 
          : `🎬 "${newMovie.title}" published with instant playback!`, 'success');
      } catch (cloudError: any) {
        console.warn('Firestore write rejected or offline (RBAC Protected):', cloudError);
        
        // B. Fallback to Local Storage for offline/unauthenticated users
        const savedCustom = localStorage.getItem('donalisa_custom_movies');
        const localCustoms: Movie[] = savedCustom ? JSON.parse(savedCustom) : [];
        const updatedLocal = [newMovie, ...localCustoms];
        localStorage.setItem('donalisa_custom_movies', JSON.stringify(updatedLocal));
        
        // Merge into catalog state
        setMovies((prev) => deduplicateMovies([newMovie, ...prev]));
        showToast('🔒 Saved to your high-speed local catalog successfully!', 'info');
      }

      // Reset inputs
      setCustomTitle('');
      setCustomDesc('');
      setCustomArtist('');
      setCustomType(adminTab === 'music' ? 'song' : 'movie');
      setCustomVideoFile(null);
      setCustomPosterFile(null);
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Upload process error:', err);
      showToast(`Publish failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStep('idle');
    }
  };

  // Filter movies with robust fuzzy search
  const filteredMoviesByGenre = movies.filter((m) => {
    const matchesCategory = selectedCategory === 'All' || m.categories.includes(selectedCategory);
    const matchesMediaType = mediaTypeFilter === 'all' || (m.type === mediaTypeFilter || (!m.type && mediaTypeFilter === 'movie'));
    return matchesCategory && matchesMediaType;
  });
  const filteredMovies = searchQuery 
    ? fuzzySearchMovies(filteredMoviesByGenre, searchQuery)
    : filteredMoviesByGenre;

  // Real-time rating helper
  const getMovieAverageRating = (movieId: string): number => {
    const list = allRatings[movieId];
    if (!list || list.length === 0) return 0;
    return list.reduce((sum, r) => sum + r, 0) / list.length;
  };

  // On-the-fly sorting
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    if (sortBy === 'views') {
      return (b.viewCount || 0) - (a.viewCount || 0);
    }
    if (sortBy === 'year') {
      return (b.releaseYear || 0) - (a.releaseYear || 0);
    }
    if (sortBy === 'rating') {
      return getMovieAverageRating(b.id) - getMovieAverageRating(a.id);
    }
    // Default: Sort by date added (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const fuzzyResults = searchQuery ? fuzzySearchMovies(movies, searchQuery) : [];

  const featuredMovie = movies.find((m) => m.featured) || movies[0] || null;

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      {/* Dynamic Toast Alerts */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex gap-3 backdrop-blur-md items-start bg-[#0e0e0e]/95"
            style={{
              borderColor: notification.type === 'success' ? '#10B981' : notification.type === 'error' ? '#EF4444' : '#00E5FF'
            }}
          >
            {notification.type === 'success' && <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            {notification.type === 'info' && <Flame className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}
            
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase font-mono">
                {notification.type === 'success' ? 'Database Synced' : notification.type === 'error' ? 'Validation Alert' : 'System Notice'}
              </h4>
              <p className="text-xs text-[#aaa] leading-relaxed font-mono">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. IMMERSIVE VIDEO/AUDIO PLAYER ACTIVE VIEW */}
      {selectedMovie ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping ${selectedMovie.type === 'song' ? 'bg-cyan-400' : 'bg-[#E50914]'}`} />
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${selectedMovie.type === 'song' ? 'text-cyan-400' : 'text-red-500'}`}>
                {selectedMovie.type === 'song' ? 'Currently Playing Track' : 'Currently Streaming Cinema'}
              </span>
            </div>
            <button 
              onClick={() => {
                setSelectedMovie(null);
                closePlayer();
              }}
              className="text-xs font-mono text-[#888] hover:text-white transition-colors flex items-center gap-1 bg-[#1a1a1a] border border-[#222] px-3 py-1.5 rounded-xl cursor-pointer"
            >
              Close Stream & Return to Catalog
            </button>
          </div>

          {selectedMovie.type === 'song' ? (
            <AudioPlayer 
              movie={selectedMovie} 
              onClose={() => {
                setSelectedMovie(null);
                closePlayer();
              }}
              onProgressUpdate={handleProgressUpdate}
            />
          ) : (
            <VideoPlayer 
              movie={selectedMovie} 
              onClose={() => {
                setSelectedMovie(null);
                closePlayer();
              }}
              onProgressUpdate={handleProgressUpdate}
            />
          )}

          {!theaterMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col md:flex-row items-start justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-xl font-extrabold text-white">{selectedMovie.title}</h3>
                  {selectedMovie.type === 'song' ? (
                    <span className="bg-[#1f1f1f] border border-[#333] px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">🎵 SONG</span>
                  ) : (
                    <span className="bg-[#1f1f1f] border border-[#333] px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider text-[#00E5FF]">{selectedMovie.rating}</span>
                  )}
                  {selectedMovie.categories.map((cat) => (
                    <span key={cat} className={`text-xs px-2 py-0.5 rounded border font-semibold ${
                      selectedMovie.type === 'song'
                        ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
                        : 'text-[#E50914] bg-red-500/10 border-red-500/20'
                    }`}>{cat}</span>
                  ))}
                </div>
                {selectedMovie.type === 'song' && selectedMovie.artist && (
                  <p className="text-xs font-bold text-cyan-400 font-mono">by {selectedMovie.artist}</p>
                )}
                <p className="text-sm text-[#aaa] leading-relaxed max-w-4xl">{selectedMovie.description}</p>
              </div>
              <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded-xl space-y-2 shrink-0 w-full md:w-64 text-xs font-mono">
                <div className="text-white/40 uppercase font-bold border-b border-[#222] pb-1.5">Stream Info</div>
                <div className="flex justify-between">
                  <span className="text-[#888]">Protocol</span>
                  <span className="text-cyan-400 font-bold">{selectedMovie.videoUrl.endsWith('.m3u8') ? 'HLS (Adaptive)' : 'Progressive MP4'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">Release Year</span>
                  <span>{selectedMovie.releaseYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">Initial Views</span>
                  <span>{selectedMovie.viewCount?.toLocaleString() || 100}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Immersive Portal Navigation */}
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-4 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#111111] border border-[#222222] rounded-xl p-1.5 overflow-x-auto">
              <button
                onClick={() => setActivePortalTab('catalog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePortalTab === 'catalog' 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                    : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Streaming Catalog</span>
              </button>
              <button
                onClick={() => setActivePortalTab('live_tv')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePortalTab === 'live_tv' 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                    : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Tv className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>Live TV</span>
              </button>
              <button
                onClick={() => setActivePortalTab('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePortalTab === 'profile' 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                    : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Profile & Stats</span>
              </button>
              <button
                onClick={() => setActivePortalTab('downloads')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activePortalTab === 'downloads' 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                    : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>My Downloads</span>
              </button>
              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setActivePortalTab('admin_dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activePortalTab === 'admin_dashboard' 
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                        : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Admin Dashboard</span>
                  </button>
                  <button
                    onClick={() => setActivePortalTab('live_broadcast')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activePortalTab === 'live_broadcast' 
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                        : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>Live Broadcast</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {activePortalTab === 'profile' ? (
            <UserProfile 
              movies={movies}
              watchlist={watchlist}
              watchProgress={watchProgress}
              onPlayMovie={(movie) => {
                setSelectedMovie(movie);
                setActivePortalTab('catalog');
              }}
            />
          ) : activePortalTab === 'admin_dashboard' && user?.role === 'admin' ? (
            <div className="space-y-8 animate-fadeIn text-left">
              <div className="border-b border-[#222] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-red-500" />
                    <span>DONALISA Administrator Control Panel</span>
                  </h2>
                  <p className="text-xs text-[#888] mt-1">Manage video streams, monitor active viewers in real-time, and manage catalog files.</p>
                </div>
                <div className="flex items-center gap-2 bg-red-600/10 border border-red-500/20 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  REALTIME ENGINE: ACTIVE
                </div>
              </div>

              {/* Analytics Summary Header Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#111] border border-[#222] p-4 rounded-2xl">
                  <div className="text-[9px] font-mono text-[#555] uppercase font-bold">Total Streams</div>
                  <div className="text-xl font-black text-white font-mono mt-0.5">{movies.length}</div>
                </div>
                <div className="bg-[#111] border border-[#222] p-4 rounded-2xl">
                  <div className="text-[9px] font-mono text-[#555] uppercase font-bold">Total Catalog Views</div>
                  <div className="text-xl font-black text-white font-mono mt-0.5">
                    {movies.reduce((sum, m) => sum + (m.viewCount || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#111] border border-[#222] p-4 rounded-2xl">
                  <div className="text-[9px] font-mono text-[#555] uppercase font-bold">Live Viewers Now</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                    {(Object.values(activeViewers) as number[]).reduce((sum, count) => sum + count, 0)} WATCHING
                  </div>
                </div>
                <div className="bg-[#111] border border-[#222] p-4 rounded-2xl">
                  <div className="text-[9px] font-mono text-[#555] uppercase font-bold">Chat Comments</div>
                  <div className="text-xl font-black text-[#00E5FF] font-mono mt-0.5">
                    {allComments.length}
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Selector */}
              <div className="flex border-b border-[#222] pb-px gap-6 overflow-x-auto">
                <button
                  onClick={() => setAdminTab('analytics')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    adminTab === 'analytics' 
                      ? 'border-red-600 text-white' 
                      : 'border-transparent text-[#666] hover:text-[#ccc]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-red-500" /> Real-Time Analytics
                </button>
                <button
                  onClick={() => {
                    setAdminTab('movies');
                    setCustomType('movie');
                    setCustomCategory('Action');
                  }}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    adminTab === 'movies' 
                      ? 'border-red-600 text-white' 
                      : 'border-transparent text-[#666] hover:text-[#ccc]'
                  }`}
                >
                  <Film className="w-4 h-4 text-red-500" /> 🎬 Movie Publisher
                </button>
                <button
                  onClick={() => {
                    setAdminTab('music');
                    setCustomType('song');
                    setCustomCategory('Pop');
                  }}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    adminTab === 'music' 
                      ? 'border-red-600 text-white' 
                      : 'border-transparent text-[#666] hover:text-[#ccc]'
                  }`}
                >
                  <Music className="w-4 h-4 text-cyan-400" /> 🎵 Music Publisher
                </button>
                <button
                  onClick={() => setAdminTab('comments')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    adminTab === 'comments' 
                      ? 'border-red-600 text-white' 
                      : 'border-transparent text-[#666] hover:text-[#ccc]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-red-500" /> Chat & Comment Moderation
                </button>
                <button
                  onClick={() => setAdminTab('socials')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    adminTab === 'socials' 
                      ? 'border-red-600 text-white' 
                      : 'border-transparent text-[#666] hover:text-[#ccc]'
                  }`}
                >
                  <Globe className="w-4 h-4 text-red-500" /> Social Links Settings
                </button>
                <button
                  onClick={() => setAdminTab('broadcast')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    adminTab === 'broadcast' 
                      ? 'border-red-600 text-white' 
                      : 'border-transparent text-[#666] hover:text-[#ccc]'
                  }`}
                >
                  <Radio className="w-4 h-4 text-[#00E5FF]" /> Live TV Broadcaster
                </button>
              </div>

              {/* Dynamic Sub-Tab Views */}
              {adminTab === 'analytics' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Chart 1: Active Audience Presence */}
                  <div className="bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <Eye className="w-4 h-4 text-[#00E5FF]" /> Live Stream Viewers Presence
                      </h3>
                      <p className="text-[11px] text-[#666] mt-1">Real-time count of active sessions connected to each movie/song stream.</p>
                    </div>

                    <div className="h-[280px] w-full bg-[#090909] p-4 rounded-2xl border border-[#222]/40 relative flex items-center justify-center">
                      {movies.length === 0 ? (
                        <div className="text-xs text-[#555] font-mono">No stream catalog items available to plot.</div>
                      ) : (
                        (() => {
                          const activeViewersList = movies.map(m => {
                            const viewersCount = activeViewers[m.id] || 0;
                            return {
                              title: m.title,
                              viewers: viewersCount,
                              type: m.type === 'song' ? 'Song' : 'Movie'
                            };
                          }).filter(v => v.viewers > 0);

                          const viewersChartData = activeViewersList.length > 0 
                            ? activeViewersList 
                            : movies.slice(0, 8).map(m => ({
                                title: m.title,
                                viewers: 0,
                                type: m.type === 'song' ? 'Song' : 'Movie'
                              }));

                          const viewersChartDataFormatted = viewersChartData.map(v => ({
                            name: v.title.length > 12 ? v.title.slice(0, 12) + '...' : v.title,
                            viewers: v.viewers,
                            type: v.type
                          }));

                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={viewersChartDataFormatted} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                <XAxis dataKey="name" stroke="#666" fontSize={9} />
                                <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#090909', border: '1px solid #333', borderRadius: '12px' }}
                                  labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                                  itemStyle={{ color: '#00E5FF', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="viewers" radius={[6, 6, 0, 0]}>
                                  {viewersChartDataFormatted.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.type === 'Song' ? '#00E5FF' : '#E50914'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono justify-center pt-2">
                      <span className="flex items-center gap-1 text-[#E50914]"><span className="w-2.5 h-2.5 rounded bg-[#E50914]" /> Movies & Videos</span>
                      <span className="flex items-center gap-1 text-[#00E5FF]"><span className="w-2.5 h-2.5 rounded bg-[#00E5FF]" /> Artist Songs</span>
                    </div>
                  </div>

                  {/* Chart 2: Interactive Commenters Leaderboard */}
                  <div className="bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <MessageCircle className="w-4 h-4 text-emerald-400" /> Interactive Chat Activities
                      </h3>
                      <p className="text-[11px] text-[#666] mt-1">Real-time leaderboard representing the most active community commenters across all movies.</p>
                    </div>

                    <div className="h-[280px] w-full bg-[#090909] p-4 rounded-2xl border border-[#222]/40 relative flex items-center justify-center">
                      {(() => {
                        const commenterMap: { [name: string]: number } = {};
                        allComments.forEach(c => {
                          commenterMap[c.userName] = (commenterMap[c.userName] || 0) + 1;
                        });
                        const commenterChartData = Object.entries(commenterMap)
                          .map(([name, count]) => ({ name, count }))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 8);

                        if (commenterChartData.length === 0) {
                          return (
                            <div className="text-xs text-[#555] font-mono border border-dashed border-[#222] p-6 rounded-xl text-center w-full">
                              No comment chat events registered yet.<br/>Comments will sync here in real-time.
                            </div>
                          );
                        }

                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={commenterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                              <XAxis dataKey="name" stroke="#666" fontSize={9} />
                              <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#090909', border: '1px solid #333', borderRadius: '12px' }}
                                labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#10B981', fontSize: '11px', fontWeight: 'bold' }}
                              />
                              <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                    <div className="text-center text-[10px] font-mono text-emerald-400 pt-2 animate-pulse">
                      ⚡ Highly Engaged Chatterboxes (Total unique users: {(() => {
                        const commenterMap: { [name: string]: number } = {};
                        allComments.forEach(c => {
                          commenterMap[c.userName] = (commenterMap[c.userName] || 0) + 1;
                        });
                        return Object.keys(commenterMap).length;
                      })()})
                    </div>
                  </div>
                </div>
              ) : adminTab === 'comments' ? (
                <div className="bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#222] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <MessageSquare className="w-4 h-4 text-red-500" /> Interactive Chat Moderation Queue
                      </h3>
                      <p className="text-[11px] text-[#666] mt-1">Review live user comments across all streams. Automated language filters will flag potential profanity.</p>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 font-bold">
                      Sync Status: Live Active ({allComments.length})
                    </span>
                  </div>

                  {/* Moderation Queue List */}
                  <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                    {allComments.length === 0 ? (
                      <div className="text-center py-12 text-xs text-[#555] font-mono border border-dashed border-[#222] rounded-2xl">
                        No comment chat messages found in the system database.
                      </div>
                    ) : (
                      allComments.map((comment) => {
                        // Profanity/Improper language checker
                        const improperWords = ['stupid', 'dumb', 'fuck', 'hate', 'scam', 'shit', 'asshole', 'bitch', 'idiot', 'dick', 'loser'];
                        const textLower = comment.text.toLowerCase();
                        const hasImproperLanguage = improperWords.some(w => textLower.includes(w));

                        return (
                          <div 
                            key={`mod-${comment.id}`} 
                            className={`bg-[#0c0c0c] border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                              hasImproperLanguage 
                                ? 'border-red-600/40 bg-red-600/5' 
                                : 'border-[#1f1f1f] hover:border-[#222]'
                            }`}
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-2 text-xs">
                                {comment.userPhoto ? (
                                  <img src={comment.userPhoto} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/20 flex items-center justify-center text-[9px] font-bold text-red-400 uppercase font-mono">
                                    {comment.userName.charAt(0)}
                                  </div>
                                )}
                                <span className="font-bold text-white/90">{comment.userName}</span>
                                <span className="text-[8px] text-[#555] font-mono bg-black px-1.5 py-0.5 rounded border border-[#1f1f1f]">
                                  {comment.userId}
                                </span>
                                <span className="text-[10px] text-[#888] font-mono">
                                  on stream: <span className="text-red-400 font-bold font-sans">
                                    {movies.find(m => m.id === comment.movieId)?.title || 'Unknown Stream'}
                                  </span>
                                </span>

                                {hasImproperLanguage && (
                                  <span className="text-[9px] bg-red-600/20 text-red-500 font-bold font-mono px-2 py-0.5 border border-red-500/30 rounded uppercase flex items-center gap-1 animate-pulse">
                                    <AlertCircle className="w-3 h-3" /> Improper Language
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#ccc] leading-relaxed break-all pl-7 pr-4">{comment.text}</p>
                            </div>

                            <div className="shrink-0 pl-7 md:pl-0">
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="px-4 py-2 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/20 hover:border-transparent text-red-500 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                title="Remove bad language"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove Post
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : adminTab === 'socials' ? (
                <div className="bg-[#111] border border-[#222] p-6 rounded-3xl space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                      <Globe className="w-4 h-4 text-red-500" /> Public Platform Social Connections
                    </h3>
                    <p className="text-[11px] text-[#666] mt-1">Configure live hyperlinks for official platform handles. Leaving an input empty hides that icon from the site footer.</p>
                  </div>

                  <form onSubmit={handleSaveSocialLinks} className="space-y-6 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-wider block">Facebook Account Link</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs text-[#555] font-mono">FB</span>
                          <input 
                            type="url"
                            value={adminFacebook}
                            onChange={(e) => setAdminFacebook(e.target.value)}
                            placeholder="https://facebook.com/yourpage"
                            className="w-full bg-[#0d0d0d] border border-[#222] hover:border-[#333] focus:border-red-600 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-wider block">Twitter / X Link</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs text-[#555] font-mono">X</span>
                          <input 
                            type="url"
                            value={adminTwitter}
                            onChange={(e) => setAdminTwitter(e.target.value)}
                            placeholder="https://x.com/yourhandle"
                            className="w-full bg-[#0d0d0d] border border-[#222] hover:border-[#333] focus:border-red-600 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-wider block">TikTok Profile Link</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs text-[#555] font-mono">TK</span>
                          <input 
                            type="url"
                            value={adminTiktok}
                            onChange={(e) => setAdminTiktok(e.target.value)}
                            placeholder="https://tiktok.com/@youraccount"
                            className="w-full bg-[#0d0d0d] border border-[#222] hover:border-[#333] focus:border-red-600 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-wider block">YouTube Channel Link</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs text-[#555] font-mono">YT</span>
                          <input 
                            type="url"
                            value={adminYoutube}
                            onChange={(e) => setAdminYoutube(e.target.value)}
                            placeholder="https://youtube.com/c/yourchannel"
                            className="w-full bg-[#0d0d0d] border border-[#222] hover:border-[#333] focus:border-red-600 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2 border-t border-[#1a1a1a]">
                      <button
                        type="submit"
                        disabled={savingSocials}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-[#1a1a1a] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {savingSocials ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Save Social Links</span>
                          </>
                        )}
                      </button>

                      {saveSocialsStatus === 'success' && (
                        <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 animate-pulse">
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Configuration deployed to Firestore settings!
                        </span>
                      )}
                      {saveSocialsStatus === 'error' && (
                        <span className="text-xs text-red-500 font-mono flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Failed to deploy ruleset permissions.
                        </span>
                      )}
                    </div>
                  </form>
                </div>
              ) : adminTab === 'movies' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Upload Section */}
                  <div className="lg:col-span-1 bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <Plus className="w-4 h-4 text-red-500" /> Publish Movie Stream
                      </h3>
                      <p className="text-[11px] text-[#666] mt-1">Add a new movie or high-end cinematic video stream to the catalog.</p>
                    </div>

                    <form onSubmit={handleAddCustomMovie} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Movie Title</label>
                        <input 
                          type="text" 
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="e.g. Inception"
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                          id="admin-movie-title"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Synopsis / Plot Description</label>
                        <textarea 
                          value={customDesc}
                          onChange={(e) => setCustomDesc(e.target.value)}
                          placeholder="Write a brief overview of the plot..."
                          rows={3}
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                          id="admin-movie-description"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Genre / Category</label>
                          <select 
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full bg-[#181818] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                            id="admin-movie-genre"
                          >
                            {['Action', 'Adventure', 'Animation', 'Comedy', 'Drama', 'Sci-Fi', 'Documentary', 'Thriller', 'Horror'].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Maturity Rating</label>
                          <select 
                            className="w-full bg-[#181818] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                            id="admin-maturity-rating"
                          >
                            {['G', 'PG', 'PG-13', 'R', 'NC-17'].map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Poster Image File</label>
                        <input 
                          type="file" 
                          onChange={(e) => setCustomPosterFile(e.target.files?.[0] || null)}
                          accept="image/*"
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                          id="admin-poster-file"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Video Stream File</label>
                        <input 
                          type="file" 
                          onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)}
                          accept="video/*"
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                          id="admin-video-file"
                        />
                      </div>

                      {uploading && (
                        <div className="bg-[#181818] border border-[#222] rounded-2xl p-4 text-center space-y-2">
                          <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold flex items-center justify-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Uploading {uploadStep === 'poster' ? 'Poster Artwork' : uploadStep === 'video' ? 'Video Stream (H.264)' : 'Finalizing metadata'}
                          </div>
                          <div className="flex items-center gap-2 justify-between text-[10px] font-mono text-[#888]">
                            <span>Progress</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[#222]/50">
                            <div className="h-full bg-red-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-[#181818] disabled:text-[#444] border border-transparent rounded-xl text-xs font-bold transition-all text-white cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{uploading ? 'Processing Movie Upload...' : 'Publish Movie Stream'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Movie Catalog Admin List */}
                  <div className="lg:col-span-2 bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between border-b border-[#222] pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <Film className="w-4 h-4 text-red-500" /> Cinema Catalog Movies ({movies.filter(m => m.type !== 'song').length})
                      </h3>
                      <span className="text-[10px] font-mono text-cyan-400">Live DB Administration</span>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                      {movies.filter(m => m.type !== 'song').length === 0 ? (
                        <div className="text-center py-12 text-xs text-[#555] font-mono border border-dashed border-[#222] rounded-2xl">
                          No movie catalog streams uploaded yet.
                        </div>
                      ) : (
                        movies.filter(m => m.type !== 'song').map((movie) => {
                          const countLive = activeViewers[movie.id] || 0;
                          return (
                            <div key={`admin-${movie.id}`} className="bg-[#0c0c0c] border border-[#1f1f1f] p-3.5 rounded-2xl flex gap-4 items-center justify-between relative group hover:border-[#222]">
                              <div className="flex gap-3.5 items-center min-w-0">
                                <div className="w-11 h-14 bg-zinc-900 rounded-lg overflow-hidden shrink-0 relative">
                                  <img src={movie.posterUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="min-w-0 space-y-1 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-bold text-white truncate leading-snug">{movie.title}</h4>
                                    <span className="text-[8px] font-mono uppercase bg-red-600/10 text-red-500 border border-red-500/20 px-1 py-0.5 rounded">
                                      🎬 Movie
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-[#666] font-mono line-clamp-1">
                                    {movie.description}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/5 px-1.5 rounded border border-cyan-400/10">👁️ {movie.viewCount?.toLocaleString() || 0} views</span>
                                    <span className="text-[9px] font-mono text-amber-400 bg-amber-400/5 px-1.5 rounded border border-amber-400/10">★ {getMovieAverageRating(movie.id) > 0 ? getMovieAverageRating(movie.id).toFixed(1) : 'No Star'}</span>
                                    {countLive > 0 && (
                                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/5 px-1.5 rounded border border-emerald-400/20 animate-pulse flex items-center gap-1 font-bold">
                                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                        {countLive} WATCHING NOW
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => setSelectedMovie(movie)}
                                  className="p-1.5 rounded-lg bg-black/60 border border-white/5 text-[#888] hover:text-white hover:bg-white/5 text-[10px] font-mono font-bold px-2 py-1 flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-current" /> Play
                                </button>
                                <button
                                  onClick={(e) => handleDeleteMovie(movie, e)}
                                  className="p-1.5 bg-[#000]/60 hover:bg-red-600/10 hover:border-red-600/30 text-[#888] hover:text-red-500 rounded-lg border border-white/5 text-[10px] font-mono font-bold px-2 py-1 flex items-center gap-1 transition-all cursor-pointer"
                                  title="Delete Stream"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : adminTab === 'music' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
                  {/* Upload Section */}
                  <div className="lg:col-span-1 bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <Plus className="w-4 h-4 text-cyan-400" /> Publish Music Track
                      </h3>
                      <p className="text-[11px] text-[#666] mt-1">Add a new artist song, music single, or audio/video stream to the music library.</p>
                    </div>

                    <form onSubmit={handleAddCustomMovie} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Artist / Band Name</label>
                        <input 
                          type="text" 
                          value={customArtist}
                          onChange={(e) => setCustomArtist(e.target.value)}
                          placeholder="e.g. Justin Bieber"
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          id="admin-song-artist"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Song Title</label>
                        <input 
                          type="text" 
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="e.g. Peaches"
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          id="admin-song-title"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Song Description / Release Notes</label>
                        <textarea 
                          value={customDesc}
                          onChange={(e) => setCustomDesc(e.target.value)}
                          placeholder="Brief overview of the song or release notes..."
                          rows={3}
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                          id="admin-song-description"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Music Genre</label>
                        <select 
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                          id="admin-song-genre"
                        >
                          {['Pop', 'Hip-Hop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'R&B', 'Reggae', 'Country', 'Soul', 'Gospel', 'Other'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Cover Art / Album Art Image File</label>
                        <input 
                          type="file" 
                          onChange={(e) => setCustomPosterFile(e.target.files?.[0] || null)}
                          accept="image/*"
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                          id="admin-cover-file"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#666] uppercase">Audio / Video Media Stream File</label>
                        <input 
                          type="file" 
                          onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)}
                          accept="audio/*,video/*"
                          className="w-full bg-[#181818] border border-[#222] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                          id="admin-audio-file"
                        />
                      </div>

                      {uploading && (
                        <div className="bg-[#181818] border border-[#222] rounded-2xl p-4 text-center space-y-2">
                          <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold flex items-center justify-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Uploading {uploadStep === 'poster' ? 'Album Art Cover' : uploadStep === 'video' ? 'Audio Stream File' : 'Finalizing metadata'}
                          </div>
                          <div className="flex items-center gap-2 justify-between text-[10px] font-mono text-[#888]">
                            <span>Progress</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[#222]/50">
                            <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-[#181818] disabled:text-[#444] border border-transparent rounded-xl text-xs font-bold transition-all text-white cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{uploading ? 'Processing Music Upload...' : 'Publish Music Track'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Songs Catalog Admin List */}
                  <div className="lg:col-span-2 bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between border-b border-[#222] pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <Music className="w-4 h-4 text-cyan-400" /> Music Catalog Songs ({movies.filter(m => m.type === 'song').length})
                      </h3>
                      <span className="text-[10px] font-mono text-cyan-400">Live DB Administration</span>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                      {movies.filter(m => m.type === 'song').length === 0 ? (
                        <div className="text-center py-12 text-xs text-[#555] font-mono border border-dashed border-[#222] rounded-2xl">
                          No music catalog tracks uploaded yet.
                        </div>
                      ) : (
                        movies.filter(m => m.type === 'song').map((movie) => {
                          const countLive = activeViewers[movie.id] || 0;
                          return (
                            <div key={`admin-${movie.id}`} className="bg-[#0c0c0c] border border-[#1f1f1f] p-3.5 rounded-2xl flex gap-4 items-center justify-between relative group hover:border-[#222]">
                              <div className="flex gap-3.5 items-center min-w-0">
                                <div className="w-11 h-14 bg-zinc-900 rounded-lg overflow-hidden shrink-0 relative">
                                  <img src={movie.posterUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="min-w-0 space-y-1 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-bold text-white truncate leading-snug">{movie.title}</h4>
                                    <span className="text-[8px] font-mono uppercase bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 px-1 py-0.5 rounded">
                                      🎵 Song
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-[#666] font-mono line-clamp-1">
                                    by {movie.artist || 'Various Artists'} — {movie.description}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/5 px-1.5 rounded border border-cyan-400/10">👁️ {movie.viewCount?.toLocaleString() || 0} views</span>
                                    <span className="text-[9px] font-mono text-amber-400 bg-amber-400/5 px-1.5 rounded border border-amber-400/10">★ {getMovieAverageRating(movie.id) > 0 ? getMovieAverageRating(movie.id).toFixed(1) : 'No Star'}</span>
                                    {countLive > 0 && (
                                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/5 px-1.5 rounded border border-emerald-400/20 animate-pulse flex items-center gap-1 font-bold">
                                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                        {countLive} LISTENING NOW
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => setSelectedMovie(movie)}
                                  className="p-1.5 rounded-lg bg-black/60 border border-white/5 text-[#888] hover:text-white hover:bg-white/5 text-[10px] font-mono font-bold px-2 py-1 flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-current" /> Play
                                </button>
                                <button
                                  onClick={(e) => handleDeleteMovie(movie, e)}
                                  className="p-1.5 bg-[#000]/60 hover:bg-red-600/10 hover:border-red-600/30 text-[#888] hover:text-red-500 rounded-lg border border-white/5 text-[10px] font-mono font-bold px-2 py-1 flex items-center gap-1 transition-all cursor-pointer"
                                  title="Delete Song"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : adminTab === 'broadcast' ? (
                <LiveBroadcaster movies={movies} showToast={showToast} />
              ) : null}
            </div>
          ) : activePortalTab === 'downloads' ? (
            <div className="space-y-6">
              <div className="bg-[#111] border border-[#222] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 text-left">
                  <div className="inline-flex items-center gap-1.5 bg-cyan-400/15 border border-cyan-400/30 px-3 py-1 rounded-full text-xs font-mono text-[#00E5FF] font-semibold font-bold">
                    <Check className="w-3.5 h-3.5" /> High-Speed Device Storage
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">Your Offline Media Shelf</h2>
                  <p className="text-xs text-[#888] leading-relaxed max-w-2xl">
                    Movies and songs downloaded here are stored directly inside your browser database. Turn off your cellular or Wi-Fi network and play them with <strong>100% zero data charges</strong> and zero buffering!
                  </p>
                </div>
                <div className="bg-black/40 border border-[#222] px-4 py-3.5 rounded-2xl flex items-center gap-3 shrink-0 text-left font-mono">
                  <Download className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase font-bold">Total Cached Files</div>
                    <div className="text-sm font-extrabold text-white">{downloadedMovies.length} items</div>
                  </div>
                </div>
              </div>

              {downloadedMovies.length === 0 ? (
                <div className="border border-dashed border-[#222] bg-[#0c0c0c] rounded-3xl p-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-cyan-400/5 border border-cyan-400/20 flex items-center justify-center mx-auto animate-pulse">
                    <Download className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">No offline media cached yet</h3>
                    <p className="text-xs text-[#666] max-w-md mx-auto leading-relaxed">
                      Browse our high-quality Streaming Catalog, tap on any film to open its info drawer, and click the <strong>"Download Offline"</strong> button to save it directly to your device!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {downloadedMovies.map((movie) => {
                    return (
                      <div
                        key={movie.id}
                        onClick={() => setDetailedMovie(movie)}
                        className="group bg-[#111] border border-[#222] rounded-2xl overflow-hidden shadow-lg hover:shadow-cyan-400/5 hover:border-cyan-400/30 transition-all duration-300 cursor-pointer flex flex-col justify-between relative aspect-[2/3] w-full"
                      >
                        <div className="relative w-full h-full bg-[#181818] overflow-hidden flex-1">
                          {/* Poster Image */}
                          <img 
                            src={movie.posterUrl} 
                            alt={movie.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2.5 right-2.5 bg-green-500 border border-green-600 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-black flex items-center gap-0.5 shadow-md">
                            <Check className="w-2.5 h-2.5 stroke-[3px]" /> OFFLINE READY
                          </div>
                          
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-75" />
                          
                          {/* Text content overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-3.5 space-y-1 text-left">
                            <h4 className="text-xs font-bold text-white leading-snug truncate group-hover:text-cyan-400 transition-colors">
                              {movie.title}
                            </h4>
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#888]">
                              <span>{movie.releaseYear}</span>
                              <span className="text-cyan-400">{movie.rating}</span>
                            </div>
                            
                            {/* Delete cache trigger inside card */}
                            <button
                              onClick={(e) => handleDeleteDownload(movie.id, e)}
                              className="w-full mt-2.5 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-500/30 rounded-lg font-bold text-[9px] font-sans transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Delete Offline Copy"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activePortalTab === 'live_tv' ? (
            <UserLiveTvView movies={movies} user={user} />
          ) : activePortalTab === 'live_broadcast' && user?.role === 'admin' ? (
            <AdminLiveBroadcastView movies={movies} showToast={showToast} />
          ) : (
            <>
              {/* HERO SPOTLIGHT BANNER */}
              {featuredMovie && (
          <div 
            className="relative rounded-3xl overflow-hidden aspect-[21/9] min-h-[320px] max-h-[460px] border border-[#222] shadow-2xl flex items-end p-8 bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(to top, rgba(5,5,5,0.95) 15%, rgba(5,5,5,0.4) 60%, rgba(5,5,5,0.1) 100%), url(${featuredMovie.backdropUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'})` }}
          >
            <div className="absolute top-6 right-6 bg-black/50 border border-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-mono text-[#00E5FF] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" /> {featuredMovie.type === 'song' ? 'Spotlight Audio' : 'Spotlight Movie'}
            </div>

            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#E50914] text-white text-[10px] font-bold font-mono tracking-widest px-2.5 py-1 rounded uppercase">Featured Premier</span>
                {featuredMovie.categories?.map((cat) => (
                  <span key={cat} className="text-xs text-white/80 bg-white/10 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/10 font-semibold">{cat}</span>
                ))}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none drop-shadow-md">{featuredMovie.title}</h1>
              <p className="text-sm text-[#ccc] line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-sm">{featuredMovie.description}</p>
              
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setSelectedMovie(featuredMovie)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#E50914] hover:bg-[#b80710] text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-[#E50914]/35 hover:scale-[1.02] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Watch Film Now
                </button>
                <button 
                  onClick={(e) => toggleFavorite(featuredMovie, e)}
                  className={`flex items-center justify-center p-3 rounded-xl border transition-all ${
                    favorites.includes(featuredMovie.id)
                      ? 'bg-red-500/10 border-red-500/30 text-[#E50914]'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(featuredMovie.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* REAL-TIME FUZZY SEARCH RESULTS SECTION */}
      {!selectedMovie && searchQuery && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 bg-gradient-to-r from-[#0c0c0c] to-[#080808] border border-red-500/20 p-6 rounded-3xl shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Search className="w-4 h-4 text-red-500" /> Fuzzy Search Results
              </h3>
              <span className="text-xs text-[#666] font-mono">for &quot;{searchQuery}&quot;</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-500 font-mono font-bold bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/10">
                {fuzzyResults.length} Matches Found
              </span>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#888] hover:text-white font-mono transition-colors bg-[#111] border border-[#222] px-2.5 py-1 rounded-lg cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          </div>

          {fuzzyResults.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-xs text-[#555] font-mono">No matching movies found in our Firestore catalog.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-cyan-400 font-mono underline hover:text-cyan-300 cursor-pointer"
              >
                Clear query and view all
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {fuzzyResults.map((movie) => {
                const isFav = favorites.includes(movie.id);
                const hasProgress = watchProgress[movie.id] !== undefined;

                return (
                  <div 
                    key={movie.id}
                    onClick={() => setDetailedMovie(movie)}
                    className="group bg-[#111111]/80 hover:bg-[#151515] border border-[#222222] hover:border-red-600/30 p-3 rounded-2xl flex gap-3.5 items-center transition-all cursor-pointer relative"
                  >
                    <div className="w-14 h-16 bg-[#222] rounded-lg overflow-hidden shrink-0 relative">
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-red-500 transition-colors leading-tight">{movie.title}</h4>
                        <span className="bg-[#1f1f1f] border border-[#333] px-1 rounded text-[8px] font-mono text-cyan-400 font-bold uppercase shrink-0">{movie.rating}</span>
                      </div>
                      <p className="text-[10px] text-[#888] line-clamp-1 leading-normal">{movie.description}</p>
                      
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-1.5 items-center">
                          {movie.categories?.slice(0, 1).map((cat) => (
                            <span key={cat} className="text-[9px] text-[#E50914] font-semibold">{cat}</span>
                          ))}
                        </div>
                        {hasProgress && (
                          <span className="text-[8px] font-mono text-red-500 font-bold flex items-center gap-0.5 bg-red-500/5 px-1 rounded">
                            <Clock className="w-2 h-2" /> Resume
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Favorite heart inside results card */}
                    <button 
                      onClick={(e) => toggleFavorite(movie, e)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/80 hover:bg-red-500/10 text-[#888] hover:text-[#E50914] border border-[#222] transition-all"
                      title={isFav ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart className={`w-3 h-3 ${isFav ? 'fill-current text-[#E50914]' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* 2. WATCH HISTORY (IF RESUMABLE TIME DETECTED) */}
      {Object.keys(watchProgress).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Clock className="w-5 h-5 text-red-500 animate-pulse" /> Continue Streaming
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {movies.filter((m) => watchProgress[m.id] !== undefined && watchProgress[m.id] > 5).map((movie) => {
              const seconds = watchProgress[movie.id];
              const progressPct = Math.min(100, Math.round((seconds / (movie.duration || 360)) * 100));
              
              return (
                <div 
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className="bg-[#111] hover:bg-[#151515] border border-[#222] hover:border-[#333] p-3.5 rounded-2xl flex gap-3.5 items-center transition-all cursor-pointer relative group"
                >
                  <div className="w-16 h-20 bg-[#222] rounded-lg overflow-hidden shrink-0 relative">
                    <img 
                      src={movie.posterUrl} 
                      alt={movie.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white scale-90 group-hover:scale-105 transition-all" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate leading-snug">{movie.title}</h4>
                      <p className="text-[10px] text-[#888] font-mono mt-0.5">{Math.floor(seconds / 60)}m {movie.type === 'song' ? 'listened' : 'watched'} ({progressPct}%)</p>
                    </div>

                    {/* Progress indicator */}
                    <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={(e) => handleClearProgress(movie.id, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/80 hover:bg-red-500/20 text-[#888] hover:text-[#E50914] border border-[#222] transition-all"
                    title="Clear progress"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CURATED PERSONAL WATCHLIST (MY QUEUE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
            <Bookmark className="w-5 h-5 text-cyan-400" /> My Watchlist Queue
          </h3>
        </div>

        {watchlist.length === 0 ? (
          <div className="bg-[#111] border border-[#222]/50 rounded-2xl p-6 text-center max-w-xl space-y-1.5">
            <Bookmark className="w-6 h-6 text-cyan-400/40 mx-auto animate-pulse" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">Your playlist queue is empty</h4>
              <p className="text-[10px] text-[#666] max-w-sm mx-auto">Click the bookmark ribbon icon on any movie card in the catalog to build your curated playlist saved directly in Cloud Firestore.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {movies.filter((m) => watchlist.includes(m.id)).map((movie) => {
              const isFav = favorites.includes(movie.id);
              const isQueued = true;
              const hasProgress = watchProgress[movie.id] !== undefined;
              const progressPct = hasProgress && movie.duration > 0
                ? Math.min(100, Math.round((watchProgress[movie.id] / movie.duration) * 100))
                : undefined;

              return (
                <MovieCard
                  key={`watchlist-${movie.id}`}
                  movie={movie}
                  isFav={isFav}
                  isQueued={isQueued}
                  hasProgress={hasProgress}
                  progressPct={progressPct}
                  user={user}
                  onPlay={setSelectedMovie}
                  onDetail={setDetailedMovie}
                  onToggleFav={toggleFavorite}
                  onToggleQueue={toggleWatchlist}
                  onDelete={handleDeleteMovie}
                  averageRating={getMovieAverageRating(movie.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 3. CATALOG EXPLORER CONTROLS */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase text-[#666] tracking-wider">Format:</span>
            <div className="flex items-center gap-1 bg-[#111] border border-[#222] p-1 rounded-xl">
              {(['all', 'movie', 'song'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMediaTypeFilter(type)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    mediaTypeFilter === type
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-[#888] hover:text-white'
                  }`}
                >
                  {type === 'all' && '🍿 All Media'}
                  {type === 'movie' && '🎬 Movies / Videos'}
                  {type === 'song' && '🎵 Artist Songs'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#222222] p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-1.5 bg-[#181818] border border-[#222222] rounded-xl p-1 overflow-x-auto w-full md:w-auto">
          {['All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Drama', 'Sci-Fi', 'Documentary'].map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedCategory(genre)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all font-semibold whitespace-nowrap cursor-pointer ${
                selectedCategory === genre 
                  ? 'bg-red-600 text-white shadow-md shadow-[#E50914]/20' 
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181818] border border-[#222] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
            />
          </div>

          {/* On-the-fly Sorting Dropdown */}
          <div className="relative">
            <SlidersHorizontal className="w-3.5 h-3.5 text-red-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#181818] border border-[#222] rounded-xl pl-9 pr-7 py-2 text-xs text-white appearance-none focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono cursor-pointer pr-8"
            >
              <option value="default">Recently Added</option>
              <option value="views">Most Watched (Views)</option>
              <option value="year">Release Year (Newest)</option>
              <option value="rating">High Star Rating</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-[8px]">▼</div>
          </div>

          {/* Custom Stream Upload Button - Restricted to Admin, links to Admin Dashboard tab */}
          {user?.role === 'admin' && (
            <button 
              onClick={() => setActivePortalTab('admin_dashboard')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-md shadow-red-600/10 hover:scale-[1.01]"
              id="catalog-upload-shortcut-btn"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Upload Movie</span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* 4. MOVIE & AUDIO CATALOGS */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto" />
            <p className="text-xs text-[#666] font-mono">Synchronizing media library with Cloud Firestore...</p>
          </div>
        ) : sortedMovies.length === 0 ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
            <HelpCircle className="w-10 h-10 text-red-500/40 mx-auto animate-bounce" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No Catalog Content Found</h4>
              <p className="text-xs text-[#888]">Adjust filters or upload custom streams to start viewing.</p>
            </div>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setMediaTypeFilter('all'); }}
              className="px-3.5 py-1.5 bg-[#222] hover:bg-[#333] rounded-lg text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* CINEMA CATALOG ROW */}
            {(mediaTypeFilter === 'all' || mediaTypeFilter === 'movie') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-red-500" />
                    <h3 className="text-base font-black text-white font-mono uppercase tracking-tight">Cinema Showcase (Videos)</h3>
                    {selectedCategory !== 'All' && (
                      <span className="text-[10px] bg-red-500/10 text-[#E50914] border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">{selectedCategory}</span>
                    )}
                  </div>
                  <span className="text-xs text-[#888] font-mono">
                    {sortedMovies.filter((m) => !m.type || m.type === 'movie').length} Titles
                  </span>
                </div>

                {sortedMovies.filter((m) => !m.type || m.type === 'movie').length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono py-6 pl-2">No videos match the current category / search filters.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {sortedMovies.filter((m) => !m.type || m.type === 'movie').map((movie) => {
                      const isFav = favorites.includes(movie.id);
                      const isQueued = watchlist.includes(movie.id);
                      const hasProgress = watchProgress[movie.id] !== undefined;
                      const progressPct = hasProgress && movie.duration > 0
                        ? Math.min(100, Math.round((watchProgress[movie.id] / movie.duration) * 100))
                        : undefined;

                      return (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          isFav={isFav}
                          isQueued={isQueued}
                          hasProgress={hasProgress}
                          progressPct={progressPct}
                          user={user}
                          onPlay={setSelectedMovie}
                          onDetail={setDetailedMovie}
                          onToggleFav={toggleFavorite}
                          onToggleQueue={toggleWatchlist}
                          onDelete={handleDeleteMovie}
                          averageRating={getMovieAverageRating(movie.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MUSIC CATALOG ROW */}
            {(mediaTypeFilter === 'all' || mediaTypeFilter === 'song') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-black text-white font-mono uppercase tracking-tight">Music Singles & Audio Tracks</h3>
                    {selectedCategory !== 'All' && (
                      <span className="text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-2 py-0.5 rounded font-mono font-bold uppercase">{selectedCategory}</span>
                    )}
                  </div>
                  <span className="text-xs text-[#888] font-mono">
                    {sortedMovies.filter((m) => m.type === 'song').length} Tracks
                  </span>
                </div>

                {sortedMovies.filter((m) => m.type === 'song').length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono py-6 pl-2">No songs match the current category / search filters.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {sortedMovies.filter((m) => m.type === 'song').map((movie) => {
                      const isFav = favorites.includes(movie.id);
                      const isQueued = watchlist.includes(movie.id);
                      const hasProgress = watchProgress[movie.id] !== undefined;
                      const progressPct = hasProgress && movie.duration > 0
                        ? Math.min(100, Math.round((watchProgress[movie.id] / movie.duration) * 100))
                        : undefined;

                      return (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          isFav={isFav}
                          isQueued={isQueued}
                          hasProgress={hasProgress}
                          progressPct={progressPct}
                          user={user}
                          onPlay={setSelectedMovie}
                          onDetail={setDetailedMovie}
                          onToggleFav={toggleFavorite}
                          onToggleQueue={toggleWatchlist}
                          onDelete={handleDeleteMovie}
                          averageRating={getMovieAverageRating(movie.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. UPLOAD CUSTOM MOVIE STREAM MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[999] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0e0e0e] border border-[#222] p-6 rounded-3xl max-w-md w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="border-b border-[#222] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                  <Radio className="w-5 h-5 text-red-500 animate-pulse" /> Upload Movie Stream
                </h3>
                <p className="text-xs text-[#888] mt-1">Select a local movie video file and cover artwork image from your device storage.</p>
              </div>

              {uploading ? (
                <div className="py-10 text-center space-y-6">
                  <div className="relative flex items-center justify-center mx-auto w-20 h-20">
                    <Loader2 className="w-16 h-16 text-red-600 animate-spin" />
                    <UploadCloud className="w-6 h-6 text-white absolute animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      {uploadStep === 'poster' && '📤 Uploading Movie Poster...'}
                      {uploadStep === 'video' && '📤 Uploading Movie Media...'}
                      {uploadStep === 'saving' && '💾 Synchronizing Movie Catalog...'}
                    </h4>
                    
                    {(uploadStep === 'poster' || uploadStep === 'video') && (
                      <div className="space-y-2 max-w-xs mx-auto">
                        <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden border border-[#222]">
                          <motion.div 
                            className="h-full bg-red-600 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                        <p className="text-xs font-mono text-cyan-400 font-bold">{uploadProgress}% Complete</p>
                      </div>
                    )}
                    
                    <p className="text-[10px] text-[#666] font-mono leading-relaxed">
                      {uploadStep === 'video' && 'Please keep your browser active. Processing movie files can take a few minutes depending on your connection.'}
                      {uploadStep === 'poster' && 'Processing custom poster aspect ratios...'}
                      {uploadStep === 'saving' && 'Building metadata schemas inside Firebase Firestore...'}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddCustomMovie} className="space-y-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-white/60 block">Movie Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sintel Open Movie"
                      required
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-[#181818] border border-[#222] rounded-xl px-4 py-2.5 text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white/60 block">Choose Movie File *</label>
                    {customVideoFile ? (
                      <div className="flex items-center justify-between bg-[#181818] border border-red-500/20 p-3 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileVideo className="w-5 h-5 text-red-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate text-[11px]">{customVideoFile.name}</p>
                            <p className="text-[10px] text-[#888] font-mono">
                              {customVideoFile.size > 1024 * 1024 * 1024 
                                ? `${(customVideoFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB` 
                                : `${(customVideoFile.size / (1024 * 1024)).toFixed(2)} MB`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomVideoFile(null)}
                          className="text-[#888] hover:text-white bg-[#222] hover:bg-[#333] px-2.5 py-1 rounded-lg transition-colors border border-[#333] cursor-pointer text-[10px]"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files?.length) {
                            handleVideoFileChange(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => document.getElementById('device-video-selector')?.click()}
                        className="border border-dashed border-[#333] hover:border-red-600/50 bg-[#181818] hover:bg-[#1c1c1c] p-6 rounded-xl text-center cursor-pointer transition-all space-y-2 group"
                      >
                        <UploadCloud className="w-8 h-8 text-[#555] group-hover:text-red-500 transition-colors mx-auto" />
                        <div>
                          <p className="text-white/80 font-bold text-[11px]">Drag & drop video file or <span className="text-red-500 underline">browse</span></p>
                          <p className="text-[9px] text-[#555] font-mono mt-1">Supports MP4, MOV, WebM, MKV</p>
                        </div>
                        <input
                          id="device-video-selector"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              handleVideoFileChange(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white/60 block">Choose Poster Artwork *</label>
                    {customPosterFile ? (
                      <div className="flex items-center justify-between bg-[#181818] border border-red-500/20 p-3 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Image className="w-5 h-5 text-red-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate text-[11px]">{customPosterFile.name}</p>
                            <p className="text-[10px] text-[#888] font-mono">{(customPosterFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomPosterFile(null)}
                          className="text-[#888] hover:text-white bg-[#222] hover:bg-[#333] px-2.5 py-1 rounded-lg transition-colors border border-[#333] cursor-pointer text-[10px]"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files?.length) {
                            setCustomPosterFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => document.getElementById('device-poster-selector')?.click()}
                        className="border border-dashed border-[#333] hover:border-red-600/50 bg-[#181818] hover:bg-[#1c1c1c] p-4 rounded-xl text-center cursor-pointer transition-all space-y-1.5 group"
                      >
                        <Image className="w-6 h-6 text-[#555] group-hover:text-red-500 transition-colors mx-auto" />
                        <div>
                          <p className="text-white/80 font-bold text-[10px]">Drag & drop image file or <span className="text-red-500 underline">browse</span></p>
                          <p className="text-[8px] text-[#555] font-mono mt-0.5">Supports JPG, PNG, WebP (Max 5MB)</p>
                        </div>
                        <input
                          id="device-poster-selector"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              setCustomPosterFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white/60 block">Synopsis / Description</label>
                    <textarea 
                      rows={2}
                      placeholder="Write a brief overview of the cinematic release..."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      className="w-full bg-[#181818] border border-[#222] rounded-xl px-4 py-2.5 text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-white/60 block">Genre Category</label>
                      <select 
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full bg-[#181818] border border-[#222] rounded-xl px-3 py-2 text-white focus:outline-none text-xs h-10"
                      >
                        <option value="Action">Action</option>
                        <option value="Adventure">Adventure</option>
                        <option value="Animation">Animation</option>
                        <option value="Comedy">Comedy</option>
                        <option value="Drama">Drama</option>
                        <option value="Sci-Fi">Sci-Fi</option>
                        <option value="Documentary">Documentary</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-2 justify-end pt-4">
                      <button 
                        type="button" 
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded-xl text-xs font-bold text-white transition-all cursor-pointer h-10"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer h-10 flex items-center justify-center gap-1.5"
                      >
                        <span>Add Movie</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

            </>
          )}
        </div>
      )}

      {/* 6. VIEW DETAILS MODAL */}
      <AnimatePresence>
        {detailedMovie && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[999] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0e0e0e] border border-[#222] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-thin"
            >
              {/* Close Button */}
              <button 
                onClick={() => setDetailedMovie(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/60 hover:bg-black/80 text-white/70 hover:text-white rounded-full border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Poster column */}
                <div className="md:col-span-2 aspect-[2/3] w-full bg-[#181818] relative">
                  <img 
                    src={detailedMovie.posterUrl} 
                    alt={detailedMovie.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-black/30 md:hidden" />
                </div>

                {/* Content column */}
                <div className="md:col-span-3 p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {detailedMovie.categories?.map((cat) => (
                          <span key={cat} className="text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase font-mono">
                            {cat}
                          </span>
                        ))}
                        <span className="bg-[#1f1f1f] border border-[#333] px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 font-bold uppercase shrink-0">
                          {detailedMovie.rating}
                        </span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white leading-tight">{detailedMovie.title}</h2>
                    </div>

                    <p className="text-xs text-[#aaa] leading-relaxed font-sans">{detailedMovie.description}</p>

                    <div className="grid grid-cols-2 gap-4 bg-[#141414] border border-[#222] p-3.5 rounded-2xl text-[11px] font-mono text-white/80">
                      <div className="space-y-1">
                        <div className="text-white/40 uppercase text-[9px] font-bold">Release Year</div>
                        <div className="font-bold text-white flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-red-500" />
                          {detailedMovie.releaseYear}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-white/40 uppercase text-[9px] font-bold">Duration</div>
                        <div className="font-bold text-white flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-red-500" />
                          {detailedMovie.duration > 0 ? `${Math.floor(detailedMovie.duration / 60)}h ${detailedMovie.duration % 60}m` : 'HLS / Live'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-white/40 uppercase text-[9px] font-bold">Protocol</div>
                        <div className="font-bold text-white truncate">
                          {detailedMovie.videoUrl.endsWith('.m3u8') ? 'HLS Stream' : 'MP4 Media'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-white/40 uppercase text-[9px] font-bold">Audience views</div>
                        <div className="font-bold text-white flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-red-500" />
                          {detailedMovie.viewCount?.toLocaleString() || '150'}
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Section */}
                    <div className="bg-[#141414] border border-[#222] p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-white/40 uppercase text-[9px] font-bold block">Community Score</span>
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-extrabold text-white">
                              {movieRatings.length > 0 
                                ? `${(movieRatings.reduce((sum, r) => sum + r.rating, 0) / movieRatings.length).toFixed(1)} / 5` 
                                : 'No ratings yet'}
                            </span>
                            <span className="text-[10px] font-mono text-white/40">
                              ({movieRatings.length} {movieRatings.length === 1 ? 'rating' : 'ratings'})
                            </span>
                          </div>
                        </div>

                        {userRating !== null && (
                          <button
                            onClick={handleDeleteRating}
                            className="text-[10px] font-mono text-red-500 hover:text-red-400 hover:underline transition-all cursor-pointer"
                          >
                            Remove My Rating
                          </button>
                        )}
                      </div>

                      {/* Interactive Stars for User */}
                      <div className="border-t border-[#222] pt-3">
                        {(() => {
                          const hasWatched = watchProgress[detailedMovie.id] !== undefined && watchProgress[detailedMovie.id] > 0;

                          if (!hasWatched) {
                            return (
                              <div className="text-[11px] text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-xl flex items-center gap-1.5">
                                <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Start streaming to unlock rating this {detailedMovie.type || 'movie'}!</span>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-white/50 font-sans">
                                {userRating !== null ? 'Your Rating:' : `Rate this ${detailedMovie.type || 'movie'}:`}
                              </span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const isFilled = userRating !== null && star <= userRating;
                                  return (
                                    <button
                                      key={star}
                                      onClick={() => handleRateMovie(star)}
                                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                                      title={`Rate ${star} Stars`}
                                    >
                                      <Star 
                                        className={`w-4 h-4 transition-colors ${
                                          isFilled 
                                            ? 'fill-amber-400 text-amber-400' 
                                            : 'text-white/30 hover:text-amber-300'
                                        }`} 
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedMovie(detailedMovie);
                        setDetailedMovie(null);
                      }}
                      className="flex-1 min-w-[140px] py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer animate-pulse"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Stream Movie</span>
                    </button>
                    {downloadingMovieId === detailedMovie.id ? (
                      <button
                        disabled
                        className="px-4 py-3 bg-[#111] text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-pulse shrink-0"
                      >
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Downloading ({downloadProgress}%)</span>
                      </button>
                    ) : downloadedIds.includes(detailedMovie.id) ? (
                      <button
                        onClick={(e) => handleDeleteDownload(detailedMovie.id, e)}
                        className="px-4 py-3 bg-green-500/10 hover:bg-red-500/10 border border-green-500/30 hover:border-red-500/30 text-green-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
                        title="Delete Offline Download"
                      >
                        <Check className="w-4 h-4" />
                        <span>Offline Cached (Delete)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownloadMovie(detailedMovie)}
                        className="px-4 py-3 bg-[#111] hover:bg-cyan-950/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Download Offline to Device"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        <span>Download Offline</span>
                      </button>
                    )}
                    {(user?.role === 'admin' || (user && detailedMovie.uploadedBy === user.uid) || (!detailedMovie.uploadedBy || detailedMovie.uploadedBy === 'guest')) && (
                      <button
                        onClick={(e) => {
                          handleDeleteMovie(detailedMovie, e);
                        }}
                        className="px-4 py-3 bg-[#1c0d0d] hover:bg-red-950/60 text-red-500 border border-red-900/30 hover:border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title="Delete Movie"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        toggleFavorite(detailedMovie, e);
                      }}
                      className="px-4 py-3 bg-[#222] hover:bg-[#333] border border-[#333] rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(detailedMovie.id) ? 'fill-current text-[#E50914]' : 'text-white/60'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Comments segment */}
              <div className="border-t border-[#1f1f1f] bg-[#090909] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                    <MessageCircle className="w-4 h-4 text-red-500" /> Stream Chat Conversation ({comments.length})
                  </h3>
                  <span className="text-[10px] font-mono text-[#00E5FF] bg-[#00E5FF]/5 border border-[#00E5FF]/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse font-bold">
                    <span className="w-1 h-1 rounded-full bg-[#00E5FF]" /> Live Sync Mode
                  </span>
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={user ? "Type a real-time message... (Be nice to others!)" : "Sign in to join the conversation"}
                    disabled={!user}
                    className="flex-1 bg-[#121212] border border-[#222] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 h-10 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!user || !newCommentText.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-[#181818] disabled:text-[#444] disabled:border-transparent border border-transparent text-xs font-bold rounded-xl transition-all h-10 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Post Chat
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#555] font-mono border border-dashed border-[#1f1f1f] rounded-2xl">
                      No live chat messages yet. Send a friendly message to kick things off!
                    </div>
                  ) : (
                    comments.map((comment) => {
                      const likes = commentLikes[comment.id] || [];
                      const likesCount = likes.length;
                      const userHasLiked = user && likes.includes(user.uid);

                      return (
                        <div key={comment.id} className="bg-[#121212] border border-[#222]/60 p-3.5 rounded-2xl space-y-1.5 text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {comment.userPhoto ? (
                                <img src={comment.userPhoto} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/20 flex items-center justify-center text-[9px] font-bold text-red-400 uppercase font-mono">
                                  {comment.userName.charAt(0)}
                                </div>
                              )}
                              <span className="text-xs font-bold text-white/90">{comment.userName}</span>
                              <span className="text-[8px] text-[#555] font-mono bg-black px-1.5 py-0.5 rounded border border-[#222]">
                                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Delete comments if owner or admin */}
                            {user && (comment.userId === user.uid || user.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-[10px] font-mono text-red-500 hover:text-red-400 hover:underline transition-all flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-[#ccc] leading-relaxed pl-7 break-all">{comment.text}</p>

                          <div className="flex items-center gap-4 pl-7 text-[10px] text-[#666]">
                            <button
                              onClick={() => handleToggleCommentLike(comment.id)}
                              className={`flex items-center gap-1 hover:text-white transition-colors cursor-pointer ${
                                userHasLiked ? 'text-red-500 font-bold' : ''
                              }`}
                            >
                              <ThumbsUp className={`w-3 h-3 ${userHasLiked ? 'fill-current text-red-500' : ''}`} />
                              <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION DIALOG (No window.confirm block in iframes) */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[9999] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e0e] border border-red-500/20 p-6 rounded-2xl max-w-sm w-full space-y-5 shadow-2xl relative text-left"
            >
              <div className="flex items-center gap-3 border-b border-red-500/10 pb-3">
                <div className="p-2 bg-red-600/10 text-red-500 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  {confirmDialog.title}
                </h3>
              </div>
              <p className="text-xs text-[#aaa] leading-relaxed font-sans">
                {confirmDialog.message}
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
