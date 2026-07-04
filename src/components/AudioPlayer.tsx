import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, RotateCcw, SkipForward, 
  Loader2, AlertCircle, RefreshCw, Disc, Music, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '@/types';
import { usePlayerStore } from '@/store/playerStore';

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

interface AudioPlayerProps {
  movie: Movie;
  onClose: () => void;
  onProgressUpdate?: (seconds: number) => void;
  forceMuted?: boolean;
}

export default function AudioPlayer({ 
  movie, 
  onClose, 
  onProgressUpdate,
  forceMuted = false
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Zustand Store Sync (We can reuse standard playerStore state)
  const { 
    isPlaying, isMuted, volume, currentTime, duration,
    togglePlay, setVolume, toggleMute, setCurrentTime
  } = usePlayerStore();

  // Local UI State
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isRepeat, setIsRepeat] = useState(false);

  // Initialize and load Audio Player
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsBuffering(true);
    setErrorDetails(null);

    // Read previously saved timestamp for this song
    const savedTime = localStorage.getItem(`donalisa_progress_${movie.id}`);
    const startProgress = savedTime ? parseFloat(savedTime) : 0;

    let active = true;
    let localBlobUrl = '';

    const setupPlayer = async () => {
      let urlToLoad = movie.videoUrl;

      if (movie.videoUrl.startsWith('indexeddb://')) {
        const dbId = movie.videoUrl.replace('indexeddb://', '');
        const blobUrl = await getFileFromLocalDB(dbId);
        if (!active) return;
        if (blobUrl) {
          localBlobUrl = blobUrl;
          urlToLoad = blobUrl;
        } else {
          setErrorDetails('Offline cached audio could not be loaded.');
          setIsBuffering(false);
          return;
        }
      }

      audio.src = urlToLoad;
      setIsBuffering(false);
      
      if (startProgress > 0) {
        audio.currentTime = startProgress;
      }

      // Set volume state
      audio.volume = volume;
      audio.muted = forceMuted ? true : isMuted;
    };

    setupPlayer();

    return () => {
      active = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [movie.videoUrl, movie.id]);

  // Manage Play/Pause State
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {
        usePlayerStore.setState({ isPlaying: false });
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Sync mute and volume states
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = forceMuted ? true : isMuted;
  }, [volume, isMuted, forceMuted]);

  const seekDelta = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
    audio.currentTime = target;
    setCurrentTime(target);
    if (onProgressUpdate) {
      onProgressUpdate(target);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
    
    // Save progress
    localStorage.setItem(`donalisa_progress_${movie.id}`, audio.currentTime.toString());

    if (onProgressUpdate) {
      onProgressUpdate(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    usePlayerStore.setState({ duration: audio.duration || 0 });
  };

  const handleSpeedChange = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleTimelineScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = parseFloat(e.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else {
      usePlayerStore.setState({ isPlaying: false });
    }
  };

  return (
    <div 
      id="donalisa-premium-audio-player-container"
      className="relative w-full max-w-4xl mx-auto overflow-hidden bg-gradient-to-b from-[#0a0f1d] to-[#04060b] border border-cyan-500/20 rounded-3xl p-6 md:p-8 shadow-2xl text-left select-none flex flex-col md:flex-row items-center gap-8 backdrop-blur-md"
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={handleEnded}
        onError={() => {
          if (movie.isLocalSessionFile) {
            setErrorDetails('This is a local cached audio track from a previous session. Because object URLs expire on reload, please re-upload or select the file again.');
          } else {
            setErrorDetails('Failed to load audio stream. Please check that the URL is valid.');
          }
        }}
      />

      {/* Album Disk Spinner (Left) */}
      <div className="relative w-48 h-48 md:w-56 md:h-56 shrink-0 flex items-center justify-center">
        {/* Glow behind disk */}
        <div className="absolute inset-0 bg-cyan-500/15 rounded-full blur-3xl" />
        
        {/* Spinning Vinyl Disk */}
        <div 
          className={`relative w-full h-full rounded-full bg-[#111] border-4 border-[#222] shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-1000 ${
            isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''
          }`}
        >
          {/* Vinyl Grooves */}
          <div className="absolute inset-2 border border-black/40 rounded-full" />
          <div className="absolute inset-6 border border-black/30 rounded-full" />
          <div className="absolute inset-10 border border-black/20 rounded-full" />
          <div className="absolute inset-14 border border-[#222]/30 rounded-full" />
          
          {/* Album Cover Art (Center of disk) */}
          <div className="absolute inset-[30%] rounded-full bg-[#1a1a1a] border-4 border-[#090a0f] overflow-hidden flex items-center justify-center shadow-inner z-10">
            {movie.posterUrl ? (
              <img 
                src={movie.posterUrl} 
                alt={movie.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Music className="w-8 h-8 text-cyan-400" />
            )}
            
            {/* Center spindle hole */}
            <div className="absolute w-3 h-3 bg-[#04060b] border-2 border-zinc-600 rounded-full" />
          </div>
        </div>

        {/* Floating animated musical notes or equalizer overlay when playing */}
        {isPlaying && !isBuffering && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <div className="flex gap-1 items-end h-12">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-gradient-to-t from-cyan-400 to-indigo-500 rounded-full"
                  animate={{
                    height: [12, Math.random() * 32 + 10, 12]
                  }}
                  transition={{
                    duration: 0.6 + i * 0.1,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Buffering Overlay */}
        {isBuffering && (
          <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Main Controls Panel (Right) */}
      <div className="flex-1 w-full flex flex-col justify-between space-y-5">
        {/* Header Metadata */}
        <div className="border-b border-[#222] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-2 py-0.5 border border-cyan-400/20 rounded">
              High-Fidelity Audio
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-500">{movie.categories.join(', ')}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white mt-1.5 tracking-tight leading-tight">
            {movie.title}
          </h2>
          <p className="text-xs md:text-sm font-semibold text-cyan-400/90 font-mono mt-1">
            by {movie.artist || 'Unknown Artist'}
          </p>
        </div>

        {errorDetails ? (
          <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase font-mono">Audio Stream Failed</h4>
              <p className="text-[10px] text-zinc-400">{errorDetails}</p>
            </div>
            <button 
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.load();
                  setIsBuffering(true);
                  setErrorDetails(null);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-[10px] font-bold uppercase text-white transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Retry Stream
            </button>
          </div>
        ) : (
          <>
            {/* Timeline slider and timestamps */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleTimelineScrub}
                className="w-full h-1 bg-[#1a2333] rounded-full appearance-none cursor-pointer focus:outline-none accent-cyan-400"
                style={{
                  background: `linear-gradient(to right, #00E5FF 0%, #00E5FF ${(currentTime / (duration || 1)) * 100}%, #1a2333 ${(currentTime / (duration || 1)) * 100}%, #1a2333 100%)`
                }}
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-500 font-bold">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Left group of controls */}
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-cyan-400 hover:bg-cyan-300 text-[#04060b] flex items-center justify-center transition-all shadow-lg shadow-cyan-400/20 active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {/* Rewind */}
                <button
                  onClick={() => seekDelta(-10)}
                  className="w-9 h-9 rounded-xl bg-[#131a2e] hover:bg-[#1a2340] border border-cyan-500/10 text-cyan-400 flex items-center justify-center transition-all cursor-pointer"
                  title="10 seconds back"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Forward */}
                <button
                  onClick={() => seekDelta(10)}
                  className="w-9 h-9 rounded-xl bg-[#131a2e] hover:bg-[#1a2340] border border-cyan-500/10 text-cyan-400 flex items-center justify-center transition-all cursor-pointer"
                  title="10 seconds forward"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Right group of controls */}
              <div className="flex items-center gap-3 font-mono">
                {/* Speed Controller */}
                <button
                  onClick={handleSpeedChange}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    playbackSpeed !== 1 
                      ? 'bg-cyan-500 border-cyan-500 text-[#04060b]' 
                      : 'bg-[#131a2e]/60 border-cyan-500/10 text-cyan-400 hover:bg-[#131a2e]'
                  }`}
                  title="Playback Speed"
                >
                  ⚡ {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                </button>

                {/* Repeat Toggle */}
                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    isRepeat 
                      ? 'bg-cyan-500 border-cyan-500 text-[#04060b]' 
                      : 'bg-[#131a2e]/60 border-cyan-500/10 text-zinc-500 hover:text-cyan-400'
                  }`}
                  title="Repeat Track"
                >
                  🔁 {isRepeat ? 'Repeat On' : 'Repeat Off'}
                </button>

                {/* Mute/Volume controls */}
                <div 
                  className="relative flex items-center gap-2"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button 
                    onClick={toggleMute}
                    className="w-9 h-9 rounded-xl bg-[#131a2e] hover:bg-[#1a2340] border border-cyan-500/10 text-cyan-400 flex items-center justify-center transition-all cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5 text-zinc-500" /> : <Volume2 className="w-4.5 h-4.5" />}
                  </button>

                  <AnimatePresence>
                    {showVolumeSlider && (
                      <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 70, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-16 h-1 rounded-full cursor-pointer appearance-none bg-zinc-800 accent-cyan-400"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
