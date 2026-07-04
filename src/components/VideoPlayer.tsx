import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  RotateCcw, SkipForward, Settings, Captions, HelpCircle, 
  Tv, Eye, ArrowLeft, Loader2, Sparkles, AlertCircle, RefreshCw, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';
import { Movie } from '@/types';
import { usePlayerStore } from '@/store/playerStore';
import { 
  createSubtitleBlobUrl, 
  englishSubtitleContent, 
  spanishSubtitleContent, 
  frenchSubtitleContent 
} from '@/data/movies';

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

interface VideoPlayerProps {
  movie: Movie;
  onClose: () => void;
  onProgressUpdate?: (seconds: number) => void;
  isLiveStream?: boolean;
  liveStartTimeOffset?: number;
  forceMuted?: boolean;
}

export default function VideoPlayer({ 
  movie, 
  onClose, 
  onProgressUpdate,
  isLiveStream = false,
  liveStartTimeOffset = 0,
  forceMuted = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Zustand Store Sync
  const { 
    isPlaying, isMuted, volume, currentTime, duration, isFullscreen, theaterMode,
    togglePlay, setVolume, toggleMute, setCurrentTime, toggleFullscreen, toggleTheaterMode 
  } = usePlayerStore();

  // Local UI State
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [qualityLevels, setQualityLevels] = useState<string[]>(['Auto']);
  const [currentQuality, setCurrentQuality] = useState<string>('Auto');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('en'); // 'en', 'es', 'fr', 'off'
  const [subtitleTracks, setSubtitleTracks] = useState<{ [key: string]: string }>({});
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showHelpPopover, setShowHelpPopover] = useState(false);
  const [showSubtitlePopover, setShowSubtitlePopover] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [scrubHoverTime, setScrubHoverTime] = useState<number | null>(null);
  const [scrubHoverX, setScrubHoverX] = useState<number>(0);

  // Gesture Skip states and timers
  const [skipFeedback, setSkipFeedback] = useState<'rewind' | 'forward' | null>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  const handleVideoDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - bounds.left;
    const width = bounds.width;
    
    if (clickX < width * 0.42) {
      seekDelta(-10);
      triggerSkipFeedback('rewind');
    } else if (clickX > width * 0.58) {
      seekDelta(10);
      triggerSkipFeedback('forward');
    } else {
      togglePlay();
    }
  };

  const triggerSkipFeedback = (type: 'rewind' | 'forward') => {
    setSkipFeedback(type);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setSkipFeedback(null);
    }, 800);
  };

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subtitle creation
  useEffect(() => {
    const enUrl = createSubtitleBlobUrl(englishSubtitleContent);
    const esUrl = createSubtitleBlobUrl(spanishSubtitleContent);
    const frUrl = createSubtitleBlobUrl(frenchSubtitleContent);

    setSubtitleTracks({
      en: enUrl,
      es: esUrl,
      fr: frUrl,
    });

    return () => {
      URL.revokeObjectURL(enUrl);
      URL.revokeObjectURL(esUrl);
      URL.revokeObjectURL(frUrl);
    };
  }, []);

  // Initialize and load Video Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsBuffering(true);
    setErrorDetails(null);

    // Read previously saved timestamp for this movie
    const savedTime = isLiveStream ? null : localStorage.getItem(`donalisa_progress_${movie.id}`);
    const startProgress = isLiveStream 
      ? (movie.duration > 0 ? (liveStartTimeOffset % movie.duration) : liveStartTimeOffset)
      : (savedTime ? parseFloat(savedTime) : 0);

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
          setErrorDetails('Offline cached file could not be loaded from storage.');
          setIsBuffering(false);
          return;
        }
      }

      const isHlsUrl = urlToLoad.endsWith('.m3u8') || urlToLoad.includes('.m3u8');

      if (isHlsUrl) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;

          hls.loadSource(urlToLoad);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            if (!active) return;
            setIsBuffering(false);
            const qualities = data.levels.map((lvl, idx) => `${lvl.height}p`);
            setQualityLevels(['Auto', ...qualities]);
            
            if (startProgress > 0) {
              video.currentTime = startProgress;
            }
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (!active) return;
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setErrorDetails('Cinematic stream connection failed. Attempting recovery...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setErrorDetails('Media encoding error. Recovering levels...');
                  hls.recoverMediaError();
                  break;
                default:
                  setErrorDetails('Premium playback encountered an issue. Please reload.');
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Fallback for native HLS (Safari)
          video.src = urlToLoad;
          setIsBuffering(false);
          if (startProgress > 0) {
            video.currentTime = startProgress;
          }
        } else {
          setErrorDetails('HLS playback is not supported in this environment.');
        }
      } else {
        // Standard progressive MP4 stream (including our offline blob URL!)
        video.src = urlToLoad;
        setIsBuffering(false);
        if (startProgress > 0) {
          video.currentTime = startProgress;
        }
      }

      // Set volume state
      video.volume = volume;
      video.muted = forceMuted ? true : isMuted;
    };

    setupPlayer();

    return () => {
      active = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, [movie.videoUrl, movie.id]);

  // Manage Play/Pause State
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        // Auto-play might be blocked
        usePlayerStore.setState({ isPlaying: false });
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync mute and volume states
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = forceMuted ? true : isMuted;
  }, [volume, isMuted, forceMuted]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts if typing in any input field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      e.preventDefault();
      resetControlsTimer();

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          handleToggleFullscreen();
          break;
        case 't':
          toggleTheaterMode();
          break;
        case 'j':
        case 'arrowleft':
          seekDelta(-10);
          break;
        case 'l':
        case 'arrowright':
          seekDelta(10);
          break;
        case 'arrowup':
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          setVolume(Math.max(0, volume - 0.1));
          break;
        default:
          // 0-9 numerical keys to seek to percentage
          if (e.key >= '0' && e.key <= '9') {
            const pct = parseInt(e.key) / 10;
            if (videoRef.current) {
              const target = videoRef.current.duration * pct;
              if (!isNaN(target)) videoRef.current.currentTime = target;
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, togglePlay, toggleMute, toggleTheaterMode, setVolume]);

  const seekDelta = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = target;
    setCurrentTime(target);
    if (onProgressUpdate) {
      onProgressUpdate(target);
    }
  };

  // Activity timer to fade controls
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsPopover(false);
        setShowSubtitlePopover(false);
        setShowHelpPopover(false);
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    
    // Save watch history periodically to localStorage (only if not a live stream)
    if (!isLiveStream) {
      localStorage.setItem(`donalisa_progress_${movie.id}`, video.currentTime.toString());
    }

    if (onProgressUpdate) {
      onProgressUpdate(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    usePlayerStore.setState({ duration: video.duration || 0 });
  };

  const handleQualityChange = (levelStr: string) => {
    setCurrentQuality(levelStr);
    setShowSettingsPopover(false);

    if (!hlsRef.current) return;

    if (levelStr === 'Auto') {
      hlsRef.current.currentLevel = -1; // Auto
    } else {
      const height = parseInt(levelStr);
      const matchedIdx = hlsRef.current.levels.findIndex(lvl => lvl.height === height);
      if (matchedIdx !== -1) {
        hlsRef.current.currentLevel = matchedIdx;
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsPopover(false);
  };

  const handleToggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => usePlayerStore.setState({ isFullscreen: true }))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => usePlayerStore.setState({ isFullscreen: false }))
        .catch(() => {});
    }
  };

  // Monitor document fullscreen changes (e.g. Esc key pressed)
  useEffect(() => {
    const onFsChange = () => {
      usePlayerStore.setState({ isFullscreen: !!document.fullscreenElement });
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleTimelineScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const target = parseFloat(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const pct = x / bounds.width;
    const hoverSeconds = (videoRef.current?.duration || 0) * pct;
    setScrubHoverX(x);
    setScrubHoverTime(hoverSeconds);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const triggerPip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div 
      id="donalisa-premium-video-player-container"
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative w-full overflow-hidden bg-black transition-all duration-500 select-none group flex items-center justify-center border border-[#222222]/50 ${
        theaterMode && !isFullscreen 
          ? 'aspect-video w-full rounded-none shadow-2xl ring-1 ring-red-500/20' 
          : isFullscreen 
            ? 'h-screen w-screen rounded-none' 
            : 'aspect-video max-w-5xl rounded-2xl shadow-xl hover:shadow-[#E50914]/5'
      }`}
    >
      {/* Immersive Ambient "Theater Mode" Glow Backdrop */}
      {theaterMode && !isFullscreen && (
        <div 
          className="absolute inset-0 pointer-events-none scale-[1.03] blur-[100px] opacity-[0.42] transition-all duration-1000 z-0 select-none overflow-hidden"
          style={{
            backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Dynamic Video Element */}
      <video
        ref={videoRef}
        id="donalisa-raw-video-element"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => {
          if (movie.isLocalSessionFile) {
            setErrorDetails('This is a local device file from a previous session. Because browser object URLs expire when you reload or close the app, please edit or re-upload this movie to select the file from your device again.');
          } else {
            setErrorDetails('Failed to load video stream. Please verify the streaming URL is valid and accessible.');
          }
        }}
        controls={false}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain pointer-events-none z-0 relative"
      >
        {/* Dynamic VTT Tracks */}
        {activeSubtitle !== 'off' && subtitleTracks[activeSubtitle] && (
          <track
            key={activeSubtitle}
            src={subtitleTracks[activeSubtitle]}
            kind="subtitles"
            srcLang={activeSubtitle}
            label={
              activeSubtitle === 'en' ? 'English' : 
              activeSubtitle === 'es' ? 'Spanish' : 'French'
            }
            default
          />
        )}
      </video>

      {/* Invisible layer to capture clicks and double-clicks for play-toggle & skip gestures */}
      <div 
        className="absolute inset-0 z-10 cursor-pointer pointer-events-auto"
        onClick={(e) => {
          if (e.detail === 1) {
            togglePlay();
          }
        }}
        onDoubleClick={handleVideoDoubleClick}
      />

      {/* Floating Animated Skip Feedback */}
      <AnimatePresence>
        {skipFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%" }}
            exit={{ opacity: 0, scale: 0.6, y: "-50%" }}
            className={`absolute top-1/2 p-5 rounded-full bg-black/90 border border-white/10 text-white flex flex-col items-center justify-center gap-1 pointer-events-none z-30 shadow-2xl ${
              skipFeedback === 'rewind' ? 'left-[15%]' : 'right-[15%]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {skipFeedback === 'rewind' ? (
                <>
                  <RotateCcw className="w-5 h-5 text-red-500 animate-spin" />
                  <span className="text-xs font-mono font-bold">-10s</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-mono font-bold">+10s</span>
                  <SkipForward className="w-5 h-5 text-red-500 animate-pulse" />
                </>
              )}
            </div>
            <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">Skip Gesture</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Custom Text Subtitle Render Overly for perfect typography */}
      {activeSubtitle !== 'off' && (
        <div className="absolute bottom-20 left-10 right-10 flex justify-center pointer-events-none text-center">
          <span className="bg-black/80 text-white font-sans text-sm md:text-lg px-4 py-1.5 rounded-lg border border-[#333] shadow-lg max-w-[80%] backdrop-blur-md">
            {/* Standard browser subtitle render tracks this internally, but custom styling makes it look stunning */}
          </span>
        </div>
      )}

      {/* Cinematic Overlays (Buffering & Pause States) */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#000]/60 flex flex-col items-center justify-center gap-4 z-20 backdrop-blur-sm"
          >
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-14 h-14 text-[#E50914] animate-spin" />
              <Flame className="w-6 h-6 text-white absolute animate-pulse" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-semibold tracking-wider text-white uppercase font-mono">Buffering high-fidelity stream</h4>
              <p className="text-[11px] text-[#888] mt-1">Connecting to CDN Edge & pre-fetching segment blocks</p>
            </div>
          </motion.div>
        )}

        {errorDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#000]/90 flex flex-col items-center justify-center gap-4 z-30 p-6 text-center"
          >
            <AlertCircle className="w-12 h-12 text-[#E50914]" />
            <div className="max-w-md space-y-2">
              <h4 className="text-base font-bold text-white uppercase font-mono">Stream Playback Failed</h4>
              <p className="text-xs text-[#aaa] leading-relaxed">{errorDetails}</p>
            </div>
            <button 
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.load();
                  setIsBuffering(true);
                  setErrorDetails(null);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#E50914] hover:bg-[#b80710] rounded-xl text-xs font-semibold tracking-wide transition-all uppercase"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-Initialize Player
            </button>
          </motion.div>
        )}

        {/* Big Fluid Play/Pause Center Indicator */}
        {!isPlaying && !isBuffering && !errorDetails && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={togglePlay}
            className="absolute w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center cursor-pointer z-10 backdrop-blur-md transition-all shadow-2xl hover:scale-105"
          >
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL CUSTOM OVERLAY UI */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/85 flex flex-col justify-between p-4 md:p-6 z-10 pointer-events-none"
          >
            {/* HEADER BAR */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="flex items-center justify-between pointer-events-auto"
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#E50914] hover:text-white border border-white/10 flex items-center justify-center text-white transition-all shadow-md shrink-0"
                  title="Close Player"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base md:text-lg font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-md">{movie.title}</h2>
                    <span className="bg-[#1a1a1a] border border-[#333] px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase text-[#00E5FF]">{movie.rating}</span>
                  </div>
                  <p className="text-xs text-[#888] mt-0.5 font-medium flex items-center gap-2">
                    <span>{movie.releaseYear}</span>
                    <span>•</span>
                    <span>{formatTime(movie.duration)}</span>
                    <span>•</span>
                    <span className="text-[#E50914]">{movie.categories.join(', ')}</span>
                  </p>
                </div>
              </div>

              {/* Utility shortcuts & guides help icon */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowHelpPopover(!showHelpPopover);
                    setShowSettingsPopover(false);
                    setShowSubtitlePopover(false);
                  }}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                    showHelpPopover 
                      ? 'bg-[#E50914] border-[#E50914] text-white' 
                      : 'bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title="Keyboard Shortcuts"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {/* HELP POPOVER */}
                <AnimatePresence>
                  {showHelpPopover && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      className="absolute right-0 top-11 w-64 bg-[#0a0a0af2] border border-[#222] p-4 rounded-xl shadow-2xl backdrop-blur-xl space-y-3 z-50 pointer-events-auto"
                    >
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-[#222] pb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" /> Cinema Keyboard Shortcuts
                      </h4>
                      <div className="space-y-1.5 font-mono text-[10px] text-[#ccc]">
                        <div className="flex justify-between"><span>[Space] / K</span> <span className="text-[#888]">Play / Pause</span></div>
                        <div className="flex justify-between"><span>M</span> <span className="text-[#888]">Mute / Unmute</span></div>
                        <div className="flex justify-between"><span>F</span> <span className="text-[#888]">Fullscreen</span></div>
                        <div className="flex justify-between"><span>T</span> <span className="text-[#888]">Theater Mode</span></div>
                        <div className="flex justify-between"><span>← / →</span> <span className="text-[#888]">Seek 10s back/fwd</span></div>
                        <div className="flex justify-between"><span>↑ / ↓</span> <span className="text-[#888]">Volume up/down</span></div>
                        <div className="flex justify-between"><span>0 - 9</span> <span className="text-[#888]">Jump 0% to 90%</span></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* MIDDLE SPACING */}
            <div className="flex-1" />

            {/* FOOTER CONTROLS PANEL */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="space-y-3 pointer-events-auto"
            >
              {/* TIMELINE SLIDER WITH HOVER TIMESTAMP */}
              <div 
                className="relative group/scrub"
                onMouseMove={handleTimelineHover}
                onMouseLeave={() => setScrubHoverTime(null)}
              >
                {/* Hover Preview Box */}
                {scrubHoverTime !== null && (
                  <div 
                    className="absolute -top-10 bg-black/90 border border-[#222] text-white px-2 py-1 rounded text-[10px] font-mono pointer-events-none -translate-x-1/2 z-50 backdrop-blur-md flex flex-col items-center gap-0.5"
                    style={{ left: `${scrubHoverX}px` }}
                  >
                    <span className="text-white font-bold">{formatTime(scrubHoverTime)}</span>
                    <span className="text-[8px] text-[#888]">
                      ({Math.round((scrubHoverTime / (videoRef.current?.duration || 1)) * 100)}%)
                    </span>
                  </div>
                )}

                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleTimelineScrub}
                  disabled={isLiveStream}
                  className="w-full h-1.5 rounded-full cursor-pointer disabled:cursor-not-allowed appearance-none bg-white/20 transition-all hover:h-2.5 focus:outline-none accent-[#E50914]"
                  style={{
                    background: `linear-gradient(to right, #E50914 0%, #E50914 ${(currentTime / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
              </div>

              {/* CONTROLS BUTTONS ROW */}
              <div className="flex items-center justify-between gap-4">
                {/* LEFT BUTTONS */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all"
                  >
                    {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-white" />}
                  </button>

                  <button 
                    onClick={() => seekDelta(-10)}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all"
                    title="10s Back"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => seekDelta(10)}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all"
                    title="10s Forward"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Volume Controller with sliding handle */}
                  <div 
                    className="flex items-center gap-2"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button 
                      onClick={toggleMute}
                      className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>

                    <AnimatePresence>
                      {showVolumeSlider && (
                        <motion.div 
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 80, opacity: 1 }}
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
                            className="w-20 h-1 rounded-full bg-white/20 cursor-pointer appearance-none accent-[#E50914] focus:outline-none"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* TIMESTAMPS */}
                  <div className="text-xs font-mono font-medium text-[#ccc] pl-2">
                    <span>{formatTime(currentTime)}</span>
                    <span className="mx-1 text-white/30">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* RIGHT BUTTONS */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* SUBTITLE TRACK SWITCHER */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowSubtitlePopover(!showSubtitlePopover);
                        setShowSettingsPopover(false);
                        setShowHelpPopover(false);
                      }}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                        activeSubtitle !== 'off' 
                          ? 'bg-[#E50914]/20 border-[#E50914] text-white' 
                          : 'bg-white/5 border-transparent text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                      title="Subtitles/Captions"
                    >
                      <Captions className="w-4.5 h-4.5" />
                    </button>

                    <AnimatePresence>
                      {showSubtitlePopover && (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0, y: -10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.95, opacity: 0, y: -10 }}
                          className="absolute right-0 bottom-11 w-44 bg-[#0a0a0af2] border border-[#222] p-1.5 rounded-xl shadow-2xl backdrop-blur-xl z-50 pointer-events-auto"
                        >
                          <div className="px-2 py-1.5 text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono border-b border-[#222]">Subtitles</div>
                          <div className="mt-1 space-y-0.5">
                            {[
                              { id: 'off', label: 'Off' },
                              { id: 'en', label: 'English' },
                              { id: 'es', label: 'Spanish' },
                              { id: 'fr', label: 'French' },
                            ].map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setActiveSubtitle(sub.id);
                                  setShowSubtitlePopover(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                                  activeSubtitle === sub.id 
                                    ? 'bg-[#E50914] text-white font-bold' 
                                    : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span>{sub.label}</span>
                                {activeSubtitle === sub.id && <span className="text-[8px] bg-white/20 px-1 rounded font-sans">Active</span>}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* DUAL SPEED QUICK CONTROLLER */}
                  <button 
                    onClick={() => {
                      const nextSpeed = playbackSpeed === 1 ? 2 : 1;
                      handleSpeedChange(nextSpeed);
                    }}
                    className={`px-2.5 h-9 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-all pointer-events-auto ${
                      playbackSpeed !== 1 
                        ? 'bg-[#E50914] border-[#E50914] text-white shadow-md shadow-red-600/20' 
                        : 'bg-white/5 border-transparent text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    title="Quick Dual Speed Toggle (1.0x ⇄ 2.0x)"
                  >
                    <span>⚡</span>
                    <span>{playbackSpeed === 1 ? '1.0x' : `${playbackSpeed}x`}</span>
                  </button>

                  {/* SETTINGS (SPEED & QUALITY) */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowSettingsPopover(!showSettingsPopover);
                        setShowSubtitlePopover(false);
                        setShowHelpPopover(false);
                      }}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                        showSettingsPopover 
                          ? 'bg-white/15 border-white/20 text-white' 
                          : 'bg-white/5 border-transparent text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                      title="Playback Settings"
                    >
                      <Settings className="w-4.5 h-4.5" />
                    </button>

                    <AnimatePresence>
                      {showSettingsPopover && (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0, y: -10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.95, opacity: 0, y: -10 }}
                          className="absolute right-0 bottom-11 w-52 bg-[#0a0a0af2] border border-[#222] p-3 rounded-xl shadow-2xl backdrop-blur-xl space-y-3 z-50 pointer-events-auto"
                        >
                          {/* Quality Level selector */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono block">Video Resolution</span>
                            <div className="grid grid-cols-2 gap-1 font-mono">
                              {qualityLevels.map((lvl) => (
                                <button
                                  key={lvl}
                                  onClick={() => handleQualityChange(lvl)}
                                  className={`px-2 py-1.5 rounded text-[10px] border transition-all text-center ${
                                    currentQuality === lvl 
                                      ? 'bg-[#E50914] border-[#E50914] text-white font-bold shadow-md shadow-[#E50914]/25' 
                                      : 'bg-white/5 border-transparent text-[#ccc] hover:bg-white/10'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Playback speed selector */}
                          <div className="space-y-1.5 pt-2 border-t border-[#222]">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono block">Playback Speed</span>
                            <div className="grid grid-cols-3 gap-1 font-mono">
                              {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => handleSpeedChange(speed)}
                                  className={`px-1.5 py-1 rounded text-[10px] text-center transition-all ${
                                    playbackSpeed === speed 
                                      ? 'bg-white/20 text-white font-bold' 
                                      : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  {speed === 1 ? 'Normal' : `${speed}x`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* THEATER MODE */}
                  <button 
                    onClick={toggleTheaterMode}
                    className={`w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all ${
                      theaterMode && !isFullscreen ? 'text-[#E50914] bg-white/10' : ''
                    }`}
                    title={theaterMode ? "Standard Mode" : "Theater Mode"}
                  >
                    <Tv className="w-4.5 h-4.5" />
                  </button>

                  {/* PICTURE IN PICTURE */}
                  <button 
                    onClick={triggerPip}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all"
                    title="Picture-in-Picture"
                  >
                    <Eye className="w-4.5 h-4.5" />
                  </button>

                  {/* FULLSCREEN */}
                  <button 
                    onClick={handleToggleFullscreen}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
