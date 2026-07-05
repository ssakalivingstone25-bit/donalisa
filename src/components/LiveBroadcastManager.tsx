import React, { useState, useEffect } from 'react';
import { 
  Tv, Radio, ShieldCheck, Play, Save, ToggleLeft, 
  ToggleRight, RefreshCw, Eye, MessageSquare, AlertCircle, Clock, Volume2, Star, Maximize, Upload,
  Megaphone, Sparkles, Phone, ExternalLink, X
} from 'lucide-react';
import { db, storage } from '@/firebase/config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Movie } from '@/types';
import VideoPlayer from './VideoPlayer';
import { motion, AnimatePresence } from 'motion/react';

interface BroadcastConfig {
  activeMovieId: string;
  status: 'live' | 'repeat' | 'off';
  tickerUpdates: string;
  startedAt: string;
  channelName?: string;
  showTitle?: string;
  showTime?: string;
  scheduleJson?: string;
  // Advertisement Squeeze-Back options
  adEnabled?: boolean;
  adSponsorName?: string;
  adSponsorPhone?: string;
  adSponsorLink?: string;
  adHeadline?: string;
  adTickerMessage?: string;
  adBannerImageUrl?: string;
  adVideoUrl?: string;
  adScheduleTimestamps?: string;
  adScheduleDuration?: number;
}

interface AdminLiveBroadcastViewProps {
  movies: Movie[];
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export function AdminLiveBroadcastView({ movies, showToast }: AdminLiveBroadcastViewProps) {
  return <LiveBroadcaster movies={movies} showToast={showToast} />;
}

export function LiveBroadcaster({ movies, showToast }: AdminLiveBroadcastViewProps) {
  const [activeMovieId, setActiveMovieId] = useState('');
  const [status, setStatus] = useState<'live' | 'repeat' | 'off'>('off');
  const [tickerUpdates, setTickerUpdates] = useState('');
  const [channelName, setChannelName] = useState('SKD ONE');
  const [showTitle, setShowTitle] = useState('MORNING SHOW');
  const [showTime, setShowTime] = useState('08:00 AM - 10:00 AM');
  const [scheduleItems, setScheduleItems] = useState<{ title: string; time: string }[]>([
    { title: 'MUSIC MIX', time: '10:00 AM' },
    { title: 'NEWS BULLETIN', time: '12:00 PM' },
    { title: 'SPORTS LIVE', time: '02:00 PM' },
    { title: 'MOVIE TIME', time: '04:00 PM' },
    { title: 'EVENING SHOW', time: '06:00 PM' }
  ]);
  const [saving, setSaving] = useState(false);
  const [currentBroadcast, setCurrentBroadcast] = useState<BroadcastConfig | null>(null);

  // Local file upload & broadcast states
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completed' | 'failed'>('idle');

  // Squeeze-Back Advertisement states
  const [adEnabled, setAdEnabled] = useState(false);
  const [adSponsorName, setAdSponsorName] = useState('DonaLisa Snacks');
  const [adSponsorPhone, setAdSponsorPhone] = useState('+256 701 123456');
  const [adSponsorLink, setAdSponsorLink] = useState('https://donalisa.live');
  const [adHeadline, setAdHeadline] = useState('🍿 GET 50% OFF ALL DRINKS & POPCORN NOW!');
  const [adTickerMessage, setAdTickerMessage] = useState('Call sponsor +256701123456 to claim free fast delivery on hot snacks during live movies!');
  const [adBannerImageUrl, setAdBannerImageUrl] = useState('https://images.unsplash.com/photo-1534080391025-a77d018f45e3?q=80&w=600&auto=format&fit=crop');

  // Ad Banner Upload State
  const [adBannerFile, setAdBannerFile] = useState<File | null>(null);
  const [adBannerUploadProgress, setAdBannerUploadProgress] = useState<number | null>(null);
  const [adBannerUploadState, setAdBannerUploadState] = useState<'idle' | 'uploading' | 'completed' | 'failed'>('idle');

  // Ad Video Upload State
  const [adVideoUrl, setAdVideoUrl] = useState('');
  const [adVideoFile, setAdVideoFile] = useState<File | null>(null);
  const [adVideoUploadProgress, setAdVideoUploadProgress] = useState<number | null>(null);
  const [adVideoUploadState, setAdVideoUploadState] = useState<'idle' | 'uploading' | 'completed' | 'failed'>('idle');

  // Ad Scheduling states
  const [adScheduleTimestamps, setAdScheduleTimestamps] = useState('30, 120, 240');
  const [adScheduleDuration, setAdScheduleDuration] = useState(15);

  const handleAdBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAdBannerFile(file);
      setAdBannerUploadState('uploading');
      setAdBannerUploadProgress(0);

      const filePath = `ads/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setAdBannerUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Ad banner upload failed:', error);
          setAdBannerUploadState('failed');
          showToast('Failed to upload ad banner.', 'error');
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setAdBannerImageUrl(downloadUrl);
            setAdBannerUploadState('completed');
            showToast('Sponsor banner uploaded successfully!', 'success');
          } catch (err) {
            console.error('Failed to get download URL:', err);
            setAdBannerUploadState('failed');
          }
        }
      );
    }
  };

  const handleAdVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAdVideoFile(file);
      setAdVideoUploadState('uploading');
      setAdVideoUploadProgress(0);

      const filePath = `ads/videos/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setAdVideoUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Ad video upload failed:', error);
          setAdVideoUploadState('failed');
          showToast('Failed to upload ad video.', 'error');
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setAdVideoUrl(downloadUrl);
            setAdVideoUploadState('completed');
            showToast('Sponsor ad video uploaded successfully! Muted playback is ready.', 'success');
          } catch (err) {
            console.error('Failed to get download URL:', err);
            setAdVideoUploadState('failed');
          }
        }
      );
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLocalFile(e.target.files[0]);
      setUploadState('idle');
      setUploadProgress(null);
    }
  };

  const handleUploadAndBroadcast = async () => {
    if (!localFile) {
      showToast('Please select a local media file first.', 'error');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);

    const isVideo = localFile.type.startsWith('video') || localFile.name.endsWith('.mp4') || localFile.name.endsWith('.mkv') || localFile.name.endsWith('.mov') || localFile.name.endsWith('.webm');
    const movieID = `movie-broadcast-${Date.now()}`;
    const cleanTitle = localFile.name.replace(/\.[^/.]+$/, "").toUpperCase();
    
    // Generate an instant local Object URL for instant feedback and high performance preview
    let localBlobUrl = '';
    try {
      localBlobUrl = URL.createObjectURL(localFile);
    } catch (e) {
      console.warn('Failed to create Object URL:', e);
    }

    const instantMovie: Movie = {
      id: movieID,
      title: `[LIVE BROADCAST] ${cleanTitle}`,
      description: `Live cloud broadcast of local file "${localFile.name}" selected by Admin.`,
      posterUrl: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=600&auto=format&fit=crop',
      backdropUrl: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=600&auto=format&fit=crop',
      videoUrl: localBlobUrl || '',
      duration: 600, // Default duration, will load dynamically in player metadata
      releaseYear: new Date().getFullYear(),
      rating: 'LIVE',
      categories: ['LIVE STREAM', isVideo ? 'VIDEO' : 'AUDIO'],
      viewCount: 1,
      type: isVideo ? 'movie' : 'song',
      uploadedBy: 'admin',
      createdAt: new Date().toISOString(),
    };

    // Store this movie locally so the TV Preview and active monitor can display it instantly!
    localStorage.setItem('donalisa_active_broadcast_movie', JSON.stringify(instantMovie));

    const savedCustom = localStorage.getItem('donalisa_custom_movies');
    const localCustoms: Movie[] = savedCustom ? JSON.parse(savedCustom) : [];
    localStorage.setItem('donalisa_custom_movies', JSON.stringify([instantMovie, ...localCustoms]));

    // Update active state immediately for real-time responsiveness on the screen
    setActiveMovieId(movieID);
    setStatus('live');
    setShowTitle(`LIVE BROADCAST: ${cleanTitle}`);

    const instantConfig = {
      activeMovieId: movieID,
      status: 'live' as const,
      tickerUpdates: `🔴 NOW ON AIR: Admin is broadcasting "${localFile.name}" from device storage. Join the stream now!`,
      startedAt: new Date().toISOString(),
      channelName: channelName.trim() || 'SKD ONE',
      showTitle: `LIVE BROADCAST: ${cleanTitle}`,
      showTime: showTime.trim() || 'JUST STARTED',
      scheduleJson: JSON.stringify(scheduleItems),
      adEnabled,
      adSponsorName,
      adSponsorPhone,
      adSponsorLink,
      adHeadline,
      adTickerMessage,
      adBannerImageUrl,
      adVideoUrl,
      adScheduleTimestamps,
      adScheduleDuration,
      broadcastMovie: instantMovie,
    };

    localStorage.setItem('donalisa_broadcast_config', JSON.stringify(instantConfig));
    setCurrentBroadcast(instantConfig as any);

    // Also trigger a local broadcast sync so any listeners in the same session get it
    try {
      await setDoc(doc(db, 'broadcast', 'current'), instantConfig);
    } catch (e) {
      console.warn('Initial fast sync of broadcast config to Firestore failed (local session is active):', e);
    }

    const fileExtension = localFile.name.split('.').pop() || 'mp4';
    const filePath = isVideo 
      ? `movies/${movieID}_${Date.now()}.${fileExtension}`
      : `music/${movieID}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, localFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      (error) => {
        console.error('File upload failed (running in local fallback mode):', error);
        setUploadState('failed');
        showToast('Storage upload failed, but live broadcasting continues locally! 🔒', 'info');
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadState('completed');

          // Generate final cloud-backed Movie document
          const finalMovie: Movie = {
            ...instantMovie,
            videoUrl: downloadUrl,
          };

          // 1. Add movie document to Firestore catalog
          try {
            await setDoc(doc(db, 'movies', movieID), finalMovie);
          } catch (catalogErr) {
            console.warn('Could not save uploaded movie to Firestore catalog (local fallback used):', catalogErr);
          }

          // Update local caches with cloud movie
          localStorage.setItem('donalisa_active_broadcast_movie', JSON.stringify(finalMovie));
          const updatedCustom = localStorage.getItem('donalisa_custom_movies');
          const customs: Movie[] = updatedCustom ? JSON.parse(updatedCustom) : [];
          const filtered = customs.map(m => m.id === movieID ? finalMovie : m);
          localStorage.setItem('donalisa_custom_movies', JSON.stringify(filtered));

          // 3. Update the global broadcast configuration with the finalized movie Url
          const finalConfigData = {
            ...instantConfig,
            broadcastMovie: finalMovie,
          };

          localStorage.setItem('donalisa_broadcast_config', JSON.stringify(finalConfigData));
          setCurrentBroadcast(finalConfigData as any);

          try {
            await setDoc(doc(db, 'broadcast', 'current'), finalConfigData);
            showToast(`Successfully uploaded "${localFile.name}" and broadcasted live! 🚀`, 'success');
          } catch (cloudErr) {
            console.warn('Could not sync broadcast state to Firestore (local fallback active):', cloudErr);
            showToast(`Successfully uploaded "${localFile.name}" & broadcasted to local engine! 🔒`, 'info');
          }

          setLocalFile(null);
          setUploadState('idle');
          setUploadProgress(null);
        } catch (err) {
          console.error('Failed to update catalog/broadcast config after upload:', err);
          setUploadState('failed');
          showToast('Failed to finalize live broadcast cloud URL.', 'error');
        }
      }
    );
  };

  // Sync current broadcast settings in real-time
  useEffect(() => {
    // Load local fallback first
    const savedLocal = localStorage.getItem('donalisa_broadcast_config');
    if (savedLocal) {
      try {
        const localData = JSON.parse(savedLocal) as BroadcastConfig;
        setCurrentBroadcast(localData);
        setActiveMovieId(localData.activeMovieId || '');
        setStatus(localData.status || 'off');
        setTickerUpdates(localData.tickerUpdates || '');
        if (localData.channelName) setChannelName(localData.channelName);
        if (localData.showTitle) setShowTitle(localData.showTitle);
        if (localData.showTime) setShowTime(localData.showTime);
        if (localData.scheduleJson) {
          try {
            setScheduleItems(JSON.parse(localData.scheduleJson));
          } catch (e) {
            console.warn("Error parsing scheduleJson:", e);
          }
        }
        setAdEnabled(!!localData.adEnabled);
        if (localData.adSponsorName) setAdSponsorName(localData.adSponsorName);
        if (localData.adSponsorPhone) setAdSponsorPhone(localData.adSponsorPhone);
        if (localData.adSponsorLink) setAdSponsorLink(localData.adSponsorLink);
        if (localData.adHeadline) setAdHeadline(localData.adHeadline);
        if (localData.adTickerMessage) setAdTickerMessage(localData.adTickerMessage);
        if (localData.adBannerImageUrl) setAdBannerImageUrl(localData.adBannerImageUrl);
        setAdVideoUrl(localData.adVideoUrl || '');
        setAdScheduleTimestamps(localData.adScheduleTimestamps || '30, 120, 240');
        setAdScheduleDuration(localData.adScheduleDuration !== undefined ? localData.adScheduleDuration : 15);
      } catch (err) {
        console.warn('Error parsing local broadcast config:', err);
      }
    }

    const unsub = onSnapshot(doc(db, 'broadcast', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as BroadcastConfig;
        setCurrentBroadcast(data);
        localStorage.setItem('donalisa_broadcast_config', JSON.stringify(data));
        setActiveMovieId(data.activeMovieId || '');
        setStatus(data.status || 'off');
        setTickerUpdates(data.tickerUpdates || '');
        if (data.channelName) setChannelName(data.channelName);
        if (data.showTitle) setShowTitle(data.showTitle);
        if (data.showTime) setShowTime(data.showTime);
        if (data.scheduleJson) {
          try {
            setScheduleItems(JSON.parse(data.scheduleJson));
          } catch (e) {
            console.warn("Error parsing scheduleJson:", e);
          }
        }
        // Sync Advertisement states
        setAdEnabled(!!data.adEnabled);
        if (data.adSponsorName) setAdSponsorName(data.adSponsorName);
        if (data.adSponsorPhone) setAdSponsorPhone(data.adSponsorPhone);
        if (data.adSponsorLink) setAdSponsorLink(data.adSponsorLink);
        if (data.adHeadline) setAdHeadline(data.adHeadline);
        if (data.adTickerMessage) setAdTickerMessage(data.adTickerMessage);
        if (data.adBannerImageUrl) setAdBannerImageUrl(data.adBannerImageUrl);
        setAdVideoUrl(data.adVideoUrl || '');
        setAdScheduleTimestamps(data.adScheduleTimestamps || '30, 120, 240');
        setAdScheduleDuration(data.adScheduleDuration !== undefined ? data.adScheduleDuration : 15);
      }
    }, (error) => {
      console.warn('LiveBroadcaster broadcast sync error:', error);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMovieId && status !== 'off') {
      showToast('Please select a movie/song to broadcast, or set status to Offline.', 'error');
      return;
    }

    setSaving(true);

    // Try to resolve the current broadcast movie
    const savedMovie = localStorage.getItem('donalisa_active_broadcast_movie');
    let broadcastMovieObj = (currentBroadcast as any)?.broadcastMovie || null;
    if (savedMovie) {
      try {
        const m = JSON.parse(savedMovie);
        if (m && m.id === activeMovieId) {
          broadcastMovieObj = m;
        }
      } catch (e) {}
    }

    const configData = {
      activeMovieId,
      status,
      tickerUpdates: tickerUpdates.trim(),
      startedAt: (status !== 'off' && currentBroadcast?.status !== 'off')
        ? (currentBroadcast?.startedAt || new Date().toISOString())
        : new Date().toISOString(),
      channelName: channelName.trim(),
      showTitle: showTitle.trim(),
      showTime: showTime.trim(),
      scheduleJson: JSON.stringify(scheduleItems),
      adEnabled,
      adSponsorName: adSponsorName.trim(),
      adSponsorPhone: adSponsorPhone.trim(),
      adSponsorLink: adSponsorLink.trim(),
      adHeadline: adHeadline.trim(),
      adTickerMessage: adTickerMessage.trim(),
      adBannerImageUrl: adBannerImageUrl.trim(),
      adVideoUrl: adVideoUrl.trim(),
      adScheduleTimestamps: adScheduleTimestamps.trim(),
      adScheduleDuration: Number(adScheduleDuration) || 15,
      broadcastMovie: broadcastMovieObj,
    };

    // Store locally first for immediate responsiveness
    localStorage.setItem('donalisa_broadcast_config', JSON.stringify(configData));
    setCurrentBroadcast(configData as any);

    try {
      await setDoc(doc(db, 'broadcast', 'current'), configData);
      showToast('Live TV broadcast configuration updated successfully! 🚀', 'success');
    } catch (err: any) {
      console.warn('Failed to update cloud broadcast config (local fallback active):', err);
      showToast('🔒 Saved to local broadcast engine successfully!', 'info');
    } finally {
      setSaving(false);
    }
  };

  const handleEndBroadcast = async () => {
    setSaving(true);
    const configData = {
      activeMovieId: '',
      status: 'off' as const,
      tickerUpdates: '🔴 Live broadcast has been ended by the administrator. Broadcast is currently offline.',
      startedAt: new Date().toISOString(),
      channelName: channelName.trim(),
      showTitle: 'OFFLINE',
      showTime: 'OFF AIR',
      scheduleJson: JSON.stringify(scheduleItems),
      adEnabled: false,
      adSponsorName: adSponsorName.trim(),
      adSponsorPhone: adSponsorPhone.trim(),
      adSponsorLink: adSponsorLink.trim(),
      adHeadline: adHeadline.trim(),
      adTickerMessage: adTickerMessage.trim(),
      adBannerImageUrl: adBannerImageUrl.trim(),
      adVideoUrl: adVideoUrl.trim(),
      adScheduleTimestamps: adScheduleTimestamps.trim(),
      adScheduleDuration: Number(adScheduleDuration) || 15,
      broadcastMovie: null,
    };

    localStorage.setItem('donalisa_broadcast_config', JSON.stringify(configData));
    setCurrentBroadcast(configData as any);
    setStatus('off');
    setActiveMovieId('');

    try {
      await setDoc(doc(db, 'broadcast', 'current'), configData);
      showToast('Live TV broadcast stopped & ended successfully! 📴', 'info');
    } catch (err) {
      console.warn('Could not end broadcast in cloud (local ended):', err);
      showToast('Broadcast stopped locally. Cloud sync failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedMovieObj = movies.find(m => m.id === activeMovieId) || 
    (currentBroadcast as any)?.broadcastMovie || 
    (() => {
      const saved = localStorage.getItem('donalisa_active_broadcast_movie');
      if (saved) {
        try {
          const m = JSON.parse(saved);
          if (m && m.id === activeMovieId) return m;
        } catch(e){}
      }
      return null;
    })();

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      <div className="border-b border-[#222] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            <span>DONALISA Live TV Broadcast Center</span>
          </h2>
          <p className="text-xs text-[#888] mt-1">
            Cast movies and songs to users in real-time. Emits live streams that consume minimal data by synchronizing client playtimes.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#00E5FF]/10 border border-[#00E5FF]/20 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold text-[#00E5FF]">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
          BROADCAST ENGINE: ONLINE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Broadcast Settings */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6 bg-[#111] border border-[#222] p-6 rounded-3xl">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">Select Broadcaster Content</label>
            <p className="text-[10px] text-white/40 pb-1.5 font-sans">Choose any premium movie or song from the streaming catalog to play live on air.</p>
            <select
              value={activeMovieId}
              onChange={(e) => setActiveMovieId(e.target.value)}
              className="w-full bg-[#0c0c0c] border border-[#222] focus:border-red-600 focus:outline-none rounded-xl px-4 py-3 text-xs font-mono text-white"
            >
              <option value="">-- Choose catalog item --</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.type === 'song' ? '🎵 SONG' : '🎬 MOVIE'}] {m.title} ({Math.floor(m.duration / 60)}m)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">Channel Airing Status</label>
            <p className="text-[10px] text-white/40 font-sans">Configure current airing status. Live will show blinking badges; repeat represents reruns.</p>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { id: 'live', label: '🔴 LIVE TV ON AIR', desc: 'Active synchronized live broadcast' },
                { id: 'repeat', label: '🔄 REPEAT / REPLAY', desc: 'Scheduled non-stop rerun stream' },
                { id: 'off', label: '📴 OFFLINE STATUS', desc: 'Display TV offline test pattern' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id as any)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all gap-1 cursor-pointer ${
                    status === item.id 
                      ? 'bg-red-600/10 border-red-500/70 text-red-500 shadow-lg shadow-red-600/5' 
                      : 'bg-[#0c0c0c] border-[#222] text-white/50 hover:text-white hover:border-white/15'
                  }`}
                >
                  <div className="text-xs font-bold font-mono">{item.label}</div>
                  <div className="text-[9px] opacity-70 leading-normal">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Local Device Storage Media Broadcaster Widget */}
          <div className="space-y-1.5 pt-4 border-t border-white/5">
            <label className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>OR Broadcast Local File from Device Storage</span>
              <span className="bg-red-600/25 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-black animate-pulse">Storage Stream</span>
            </label>
            <p className="text-[10px] text-white/40 pb-1.5 font-sans leading-relaxed">
              Choose any audio or video file from your computer or phone. It will be securely uploaded to high-speed cloud storage and automatically set live for all synchronized viewers.
            </p>
            
            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="file"
                  id="admin-local-broadcast-file"
                  accept="video/*,audio/*"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="admin-local-broadcast-file"
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#2b2b2b] hover:border-red-500/40 bg-[#0c0c0c] hover:bg-black/30 p-6 rounded-xl cursor-pointer transition-all group/upload"
                >
                  <Upload className="w-8 h-8 text-white/30 group-hover/upload:text-red-500 transition-colors mb-2 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-white/80 group-hover/upload:text-white transition-colors">
                    {localFile ? localFile.name : 'Select video/audio file from storage'}
                  </span>
                  <span className="text-[9px] text-white/40 mt-1 uppercase font-mono tracking-wider">
                    {localFile ? `${(localFile.size / (1024 * 1024)).toFixed(1)} MB` : 'MP4, MKV, MP3, WAV, etc.'}
                  </span>
                </label>
              </div>

              {uploadState !== 'idle' && (
                <div className="space-y-2 bg-black/40 border border-[#222] p-3 rounded-xl animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/60 flex items-center gap-1.5">
                      {uploadState === 'uploading' && <div className="w-3.5 h-3.5 border-2 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />}
                      {uploadState === 'completed' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />}
                      {uploadState === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                      <span>
                        {uploadState === 'uploading' ? `Uploading high-speed stream block (${uploadProgress}%)` : 
                         uploadState === 'completed' ? 'Stream ready for telecast!' : 'Upload failed. Try again.'}
                      </span>
                    </span>
                    <span className="text-white font-black">{uploadProgress || 0}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${uploadState === 'completed' ? 'bg-emerald-500' : 'bg-red-600'}`}
                      style={{ width: `${uploadProgress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {localFile && uploadState !== 'uploading' && (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalFile(null);
                      setUploadState('idle');
                      setUploadProgress(null);
                    }}
                    className="px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    Clear File
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadAndBroadcast}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Start Live Cloud Broadcast
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TV Squeeze-Back Advertisement Hub */}
          <div className="bg-[#181818] border border-white/5 p-5 rounded-2xl space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-yellow-500 animate-pulse animate-duration-[3000ms]" />
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">TV Sponsor Squeeze-Back Ad HUD</h4>
                  <p className="text-[9px] text-white/40 font-sans">Squeeze current program to top-left and show customized corner ads to get advertisers customers.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdEnabled(!adEnabled)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  adEnabled
                    ? 'bg-yellow-500 text-black font-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                    : 'bg-zinc-800 text-white/50 border border-zinc-700/50 hover:text-white'
                }`}
              >
                {adEnabled ? '🔴 SQUEEZE ACTIVE' : '⚪ AD INACTIVE'}
              </button>
            </div>

            {adEnabled && (
              <div className="space-y-4 animate-fadeIn">
                {/* 1-Click Ad Sponsor Campaign Presets */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider font-mono block">Load Campaign Sponsor Presets</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      {
                        name: '🍿 Popcorn Combo',
                        sponsor: 'DonaLisa Movie Snacks',
                        phone: '+256 701 555001',
                        link: 'https://donalisa.live/snacks',
                        headline: '🍿 ENJOY HOT BUTTER POPCORN & ICE COLD SODA combo! 50% discount with free home/theater delivery.',
                        ticker: '🔥 LIVE MOVIE SPECIAL OFFER: Call +256701555001 to get Popcorn Combo for only 5,000 UGX! Freshly roasted and delivered straight to your door. order now!',
                        image: 'https://images.unsplash.com/photo-1578496479914-7ef3b0193be3?q=80&w=600&auto=format&fit=crop',
                        video: ''
                      },
                      {
                        name: '🥤 Soda Combo (Video)',
                        sponsor: 'Pepsi Co. East Africa',
                        phone: '+256 701 999888',
                        link: 'https://pepsi.co.ug',
                        headline: '🥤 FEEL THE REFRESHING TASTE! Grab an ice-cold bubbly Pepsi now with free home delivery during live TV.',
                        ticker: '🥤 OFFICIAL VIDEO SPONSOR: Pepsi East Africa brings you looping premium video ads! Call +256701999888 or order Pepsi at your favorite local store now!',
                        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop',
                        video: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-soda-into-a-glass-with-ice-43228-large.mp4'
                      },
                      {
                        name: '⚡ SKD Fiber WiFi',
                        sponsor: 'SKD Telecom Gigabit Fiber',
                        phone: '+256 702 444333',
                        link: 'https://skdtelecom.com',
                        headline: '⚡ EXPERIENCING BUFFERING? Upgrade to high-speed 100Mbps unlimited fiber home Internet! Free installation.',
                        ticker: '⚡ SKD GIGABIT FIBER SPONSOR: Call +256702444333 or visit skdtelecom.com. Connect today and stream premium 4K movies buffer-free for only 80,000 UGX/month!',
                        image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=600&auto=format&fit=crop',
                        video: ''
                      },
                      {
                        name: '🛍️ Branded Merch',
                        sponsor: 'Official Donalisa Fan Club Store',
                        phone: '+256 703 111222',
                        link: 'https://donalisa.live/store',
                        headline: '🛍️ WEAR YOUR PASSION! Buy official custom branded t-shirts, warm hoodies, ceramic mugs and badges.',
                        ticker: '🛍️ OFFICIAL MERCHANDISE DISCOUNTS: Get 30% off limited edition Donalisa t-shirts! Call +256703111222 or visit donalisa.live/store and use promo code LIVECOMMUNITY at checkout.',
                        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop',
                        video: ''
                      }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setAdSponsorName(preset.sponsor);
                          setAdSponsorPhone(preset.phone);
                          setAdSponsorLink(preset.link);
                          setAdHeadline(preset.headline);
                          setAdTickerMessage(preset.ticker);
                          setAdBannerImageUrl(preset.image);
                          setAdVideoUrl(preset.video);
                          showToast(`Loaded ${preset.name} campaign!`, 'info');
                        }}
                        className="bg-black/40 hover:bg-black border border-[#222] hover:border-yellow-500/30 p-2 rounded-xl text-[10px] text-white/70 hover:text-white font-mono font-bold transition-all text-center cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main fields input grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono">Sponsor/Brand Name</label>
                    <input
                      type="text"
                      value={adSponsorName}
                      onChange={(e) => setAdSponsorName(e.target.value)}
                      placeholder="e.g. MTN UGANDA"
                      className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono">Customer Hotline Phone</label>
                    <input
                      type="text"
                      value={adSponsorPhone}
                      onChange={(e) => setAdSponsorPhone(e.target.value)}
                      placeholder="e.g. +256 701 123456"
                      className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono">Sponsor Campaign Page Link</label>
                    <input
                      type="url"
                      value={adSponsorLink}
                      onChange={(e) => setAdSponsorLink(e.target.value)}
                      placeholder="e.g. https://sponsor.com/promo"
                      className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono">Banner Image URL (Static fallback)</label>
                    <input
                      type="text"
                      value={adBannerImageUrl}
                      onChange={(e) => setAdBannerImageUrl(e.target.value)}
                      placeholder="Image URL"
                      className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono">Sponsor Muted Video URL (Looping ad)</label>
                    <input
                      type="text"
                      value={adVideoUrl}
                      onChange={(e) => setAdVideoUrl(e.target.value)}
                      placeholder="e.g. https://domain.com/ad.mp4"
                      className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                {/* Direct image/video uploads for custom sponsor banner/videos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-white/5 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono block">Upload Custom Sponsor Banner Image</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="admin-ad-banner-file"
                        accept="image/*"
                        onChange={handleAdBannerFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="admin-ad-banner-file"
                        className="flex-1 flex items-center justify-center border border-dashed border-[#222] hover:border-yellow-500/30 bg-[#0c0c0c] p-3 rounded-xl cursor-pointer text-[11px] font-mono text-white/60 hover:text-white transition-all text-center"
                      >
                        {adBannerUploadState === 'uploading' ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin text-yellow-500" />
                            Uploading Custom Banner ({adBannerUploadProgress}%)
                          </span>
                        ) : (
                          <span>📂 Choose Sponsor Banner Image</span>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono block">Upload Custom Looping Video Ad (Muted)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="admin-ad-video-file"
                        accept="video/*"
                        onChange={handleAdVideoFileChange}
                        className="hidden"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <label
                          htmlFor="admin-ad-video-file"
                          className="flex-1 flex items-center justify-center border border-dashed border-[#222] hover:border-cyan-500/30 bg-[#0c0c0c] p-3 rounded-xl cursor-pointer text-[11px] font-mono text-white/60 hover:text-white transition-all text-center"
                        >
                          {adVideoUploadState === 'uploading' ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                              Uploading Custom Ad Video ({adVideoUploadProgress}%)
                            </span>
                          ) : adVideoUrl ? (
                            <span className="text-cyan-400 font-bold flex items-center gap-1.5 justify-center">
                              <span>✅ Video Uploaded</span>
                            </span>
                          ) : (
                            <span>📂 Choose Sponsor Video File (.mp4, etc.)</span>
                          )}
                        </label>
                        {adVideoUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAdVideoUrl('');
                              setAdVideoFile(null);
                              setAdVideoUploadState('idle');
                              showToast('Sponsor video ad removed.', 'info');
                            }}
                            className="p-3 bg-red-950/50 hover:bg-red-900 border border-red-800 text-red-400 hover:text-white rounded-xl transition-colors cursor-pointer text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono">Main Advertisement Offer Headline</label>
                  <input
                    type="text"
                    value={adHeadline}
                    onChange={(e) => setAdHeadline(e.target.value)}
                    placeholder="e.g. BUY 1 GET 1 FREE EXCLUSIVE FOR DONALISA CUSTOMERS!"
                    className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-sans text-white font-bold"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-bold text-white/60 uppercase tracking-wider font-mono">Scrolling Ad Sponsor Marquee Ticker Message</label>
                  <textarea
                    value={adTickerMessage}
                    onChange={(e) => setAdTickerMessage(e.target.value)}
                    placeholder="Sponsor ticker messages..."
                    className="w-full h-16 bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white resize-none"
                  />
                </div>

                {/* Auto Timestamp Scheduled Ad Triggers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-yellow-500 uppercase tracking-wider font-mono">Auto Trigger Timestamps (seconds)</label>
                    <input
                      type="text"
                      value={adScheduleTimestamps}
                      onChange={(e) => setAdScheduleTimestamps(e.target.value)}
                      placeholder="e.g. 30, 90, 180"
                      className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white font-bold"
                    />
                    <p className="text-[8px] text-white/40 leading-normal font-sans">
                      Enter seconds separated by commas (e.g. 15, 60, 150) relative to movie start when this ad Squeeze-Back overlay should automatically pop up.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-yellow-500 uppercase tracking-wider font-mono">Auto Trigger Display Duration (seconds)</label>
                    <input
                      type="number"
                      value={adScheduleDuration}
                      onChange={(e) => setAdScheduleDuration(Number(e.target.value) || 15)}
                      placeholder="e.g. 15"
                      className="w-full bg-[#0c0c0c] border border-[#222] focus:border-yellow-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-white font-bold"
                    />
                    <p className="text-[8px] text-white/40 leading-normal font-sans">
                      Number of seconds the ad should stay visible before automatically hiding and restoring unmuted video.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">Scrolling Updates & Hashtag Ticker</label>
            <p className="text-[10px] text-white/40 pb-1.5 font-sans">Customized horizontal updates that scroll at the bottom of the screen. Include trending hashtags!</p>
            <textarea
              value={tickerUpdates}
              onChange={(e) => setTickerUpdates(e.target.value)}
              placeholder="e.g. #DONALISA #TrendingNow #BlockbusterMovie playing. Welcome all viewers! Leave reviews and comments in real-time."
              className="w-full h-20 bg-[#0c0c0c] border border-[#222] focus:border-red-600 focus:outline-none rounded-xl px-4 py-3 text-xs font-sans text-white resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Cast Live Broadcast 🚀</span>
            </button>
          </div>
        </form>

        {/* Right Panel: Current Live Telecast Preview */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-[#222] p-6 rounded-3xl space-y-4 text-left">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#222] pb-3">Active Telecast Monitor</h3>
            
            {currentBroadcast && currentBroadcast.status !== 'off' && selectedMovieObj ? (
              <div className="space-y-3.5 font-mono text-xs">
                {/* Immersive HUD Overlay Live Preview with Squeeze-back preview support */}
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-[#222] bg-[#050505] relative group select-none">
                  
                  {/* Squeezed Main Screen Preview */}
                  <div 
                    className={`transition-all duration-500 ease-in-out relative ${
                      adEnabled 
                        ? 'absolute top-2 left-2 w-[72%] h-[72%] rounded-xl border border-[#00E5FF]/30 overflow-hidden bg-black z-20' 
                        : 'w-full h-full'
                    }`}
                  >
                    <img src={selectedMovieObj.posterUrl} alt="" className="w-full h-full object-cover opacity-30 blur-[1px]" referrerPolicy="no-referrer" />
                    
                    {/* Cyber Neon HUD Overlay HUD Live Preview */}
                    <div className="absolute inset-0 p-2 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        {/* Top-Left: Custom Show Details */}
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                            <span className="font-mono italic font-black uppercase text-[8px] md:text-[9px] text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-400">
                              {channelName || 'SKD ONE'}
                            </span>
                            <span className="text-white/20 text-[9px]">|</span>
                            <div>
                              <span className="font-sans font-extrabold uppercase text-white text-[7px] block leading-none">
                                {showTitle || 'MORNING SHOW'}
                              </span>
                              <span className="text-rose-400 font-mono text-[6px] font-bold block mt-0.5 leading-none">
                                {showTime || '08:00 AM - 10:00 AM'}
                              </span>
                            </div>
                          </div>
                          <div className="h-[1.5px] w-16 bg-gradient-to-r from-rose-500 via-pink-500 to-transparent mt-1" />
                        </div>

                        {/* Top-Right: LIVE pulse tag */}
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-rose-500/50">
                          <span className="relative flex h-1 w-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1 w-1 bg-rose-500"></span>
                          </span>
                          <span className="text-[6px] font-mono font-black text-rose-500 uppercase">
                            {status === 'live' ? 'LIVE' : 'RERUN'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom-Row: Schedule list (hidden when squeezed in small card to save space) */}
                      {scheduleItems && scheduleItems.length > 0 && !adEnabled && (
                        <div className="bg-black/60 backdrop-blur-sm border border-white/5 rounded-xl p-1 flex items-center gap-1.5">
                          <div className="bg-gradient-to-r from-rose-600 to-pink-500 px-2 py-1 rounded-lg transform -skew-x-6 text-[7px] font-black text-white uppercase shrink-0">
                            NEXT »
                          </div>
                          <div className="flex-1 flex overflow-hidden divide-x divide-white/10 items-center justify-start">
                            {scheduleItems.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="px-2 text-[7px] text-left shrink-0">
                                <p className="font-bold text-white truncate max-w-[50px] leading-tight">{item.title}</p>
                                <p className="text-rose-400 font-mono leading-none">{item.time}</p>
                              </div>
                            ))}
                            {scheduleItems.length > 3 && (
                              <span className="text-[8px] text-white/40 pl-1 font-bold">+{scheduleItems.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SQUEEZE-BACK PREVIEW HOVER L-BAR ADS (Simulated in Admin Preview) */}
                  {adEnabled && (
                    <>
                      {/* Admin preview right vertical bar */}
                      <div className="absolute top-2 right-2 bottom-2 w-[24%] bg-[#0f0f11] border border-white/5 rounded-xl p-1.5 flex flex-col justify-between text-left overflow-hidden z-10 animate-fadeIn">
                        <div className="flex items-center gap-0.5 bg-yellow-400/10 px-1 py-0.5 rounded text-[5px] font-black text-yellow-500 w-max shrink-0">
                          <Sparkles className="w-1.5 h-1.5 text-yellow-500 animate-pulse" />
                          <span>SPONSOR</span>
                        </div>
                        {adVideoUrl ? (
                          <div className="w-full aspect-[4/3] rounded overflow-hidden bg-black relative shrink-0 my-0.5 border border-white/5">
                            <video 
                              src={adVideoUrl} 
                              className="w-full h-full object-cover" 
                              autoPlay 
                              muted 
                              loop 
                              playsInline
                            />
                          </div>
                        ) : adBannerImageUrl ? (
                          <img src={adBannerImageUrl} alt="" className="w-full aspect-[4/3] object-cover rounded bg-black/40 border border-white/5 shrink-0 my-0.5" referrerPolicy="no-referrer" />
                        ) : null}
                        <span className="text-[6px] text-white font-extrabold uppercase tracking-wide truncate block">{adSponsorName || 'Sponsor Name'}</span>
                        <span className="text-[5px] text-gray-400 leading-tight block line-clamp-2">{adHeadline || 'Sponsor ad headline goes here...'}</span>
                        <div className="h-2.5 bg-yellow-500 text-black text-[5px] font-bold rounded flex items-center justify-center tracking-wide uppercase mt-1">CALL AGENT</div>
                      </div>

                      {/* Admin preview bottom horizontal bar */}
                      <div className="absolute bottom-2 left-2 w-[72%] h-[22%] bg-[#0f0f11] border border-white/5 rounded-xl p-1 flex items-center gap-1.5 text-left overflow-hidden z-10 animate-fadeIn">
                        <Megaphone className="w-2.5 h-2.5 text-yellow-500 shrink-0" />
                        <div className="flex-1 bg-black/40 border border-[#222] rounded h-full flex items-center px-1.5 overflow-hidden">
                          <span className="text-[5px] text-yellow-400 font-bold truncate block w-full">{adTickerMessage || 'Sponsor ticker promo deal...'}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-[#222] text-[11px]">
                  <div className="flex justify-between text-white/50">
                    <span>Active Telecast:</span>
                    <span className="text-white font-bold">{selectedMovieObj.title}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Protocol Type:</span>
                    <span className="text-cyan-400 font-bold">Synchronized Multi-client</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Broadcast Started:</span>
                    <span className="text-white">{new Date(currentBroadcast.startedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Ticker:</span>
                    <span className="text-red-400 truncate max-w-[150px]">{currentBroadcast.tickerUpdates || 'None'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#222]">
                  <button
                    type="button"
                    onClick={handleEndBroadcast}
                    disabled={saving}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Stop & End Live TV Broadcast 🛑</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                  <Tv className="w-5 h-5 text-white/30" />
                </div>
                <p className="text-[11px] text-[#555] font-mono leading-relaxed max-w-xs mx-auto">
                  Broadcast engine is offline. Update the configuration to begin airing catalog streams.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface UserLiveTvViewProps {
  movies: Movie[];
  user: any;
}

export function UserLiveTvView({ movies, user }: UserLiveTvViewProps) {
  const [broadcast, setBroadcast] = useState<BroadcastConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [scheduleItems, setScheduleItems] = useState<{ title: string; time: string }[]>([]);
  const [isWatching, setIsWatching] = useState(false);

  // Real-time listener for current broadcast settings
  useEffect(() => {
    setLoading(true);
    
    // Check local fallback first
    const savedLocal = localStorage.getItem('donalisa_broadcast_config');
    if (savedLocal) {
      try {
        const localData = JSON.parse(savedLocal) as BroadcastConfig;
        setBroadcast(localData);
        if (localData.scheduleJson) {
          try {
            setScheduleItems(JSON.parse(localData.scheduleJson));
          } catch (e) {
            console.warn('Error parsing scheduleJson in UserLiveTvView fallback:', e);
          }
        }
      } catch (err) {
        console.warn('Error loading local broadcast config:', err);
      }
    }

    const unsub = onSnapshot(doc(db, 'broadcast', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as BroadcastConfig;
        setBroadcast(data);
        localStorage.setItem('donalisa_broadcast_config', JSON.stringify(data));
        if (data.scheduleJson) {
          try {
            setScheduleItems(JSON.parse(data.scheduleJson));
          } catch (e) {
            console.warn('Error parsing scheduleJson in UserLiveTvView:', e);
          }
        } else {
          setScheduleItems([
            { title: 'MUSIC MIX', time: '10:00 AM' },
            { title: 'NEWS BULLETIN', time: '12:00 PM' },
            { title: 'SPORTS LIVE', time: '02:00 PM' },
            { title: 'MOVIE TIME', time: '04:00 PM' },
            { title: 'EVENING SHOW', time: '06:00 PM' }
          ]);
        }
      } else {
        if (!localStorage.getItem('donalisa_broadcast_config')) {
          setBroadcast(null);
        }
      }
      setLoading(false);
    }, (error) => {
      console.warn('UserLiveTvView sync error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Update clock ticker for precise synchronization calculation
  useEffect(() => {
    if (!broadcast || broadcast.status === 'off') return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [broadcast]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto" />
        <p className="text-xs text-[#888] font-mono uppercase tracking-wider">Syncing with television broadcast feed...</p>
      </div>
    );
  }

  const movie = broadcast && broadcast.status !== 'off' 
    ? (movies.find(m => m.id === broadcast.activeMovieId) || 
       (broadcast as any).broadcastMovie || 
       (() => {
         const saved = localStorage.getItem('donalisa_active_broadcast_movie');
         if (saved) {
           try {
             const m = JSON.parse(saved);
             if (m && m.id === broadcast.activeMovieId) return m;
           } catch(e){}
         }
         return null;
       })())
    : null;

  const isBroadcastActive = broadcast && broadcast.status !== 'off' && movie;

  // Reset watching state when broadcast is ended/offline
  useEffect(() => {
    if (!isBroadcastActive) {
      setIsWatching(false);
    }
  }, [isBroadcastActive]);

  // Calculate live offset
  let liveStartTimeOffset = 0;
  if (isBroadcastActive && broadcast) {
    const elapsedMs = now - new Date(broadcast.startedAt).getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    liveStartTimeOffset = elapsedSeconds > 0 ? elapsedSeconds : 0;
  }

  // Calculate if a scheduled ad is active based on current playback position
  let isScheduledAdActive = false;
  let remainingTimeForScheduledAd = 0;
  
  if (isBroadcastActive && movie && broadcast) {
    const movieDuration = movie.duration || 1;
    const currentMoviePosition = movieDuration > 0 ? (liveStartTimeOffset % movieDuration) : liveStartTimeOffset;
    const durationOfAd = broadcast.adScheduleDuration || 15;
    
    if (broadcast.adScheduleTimestamps) {
      const triggerTimes = broadcast.adScheduleTimestamps
        .split(',')
        .map(t => parseInt(t.trim(), 10))
        .filter(t => !isNaN(t));
        
      isScheduledAdActive = triggerTimes.some(triggerSec => {
        const isActive = currentMoviePosition >= triggerSec && currentMoviePosition < (triggerSec + durationOfAd);
        if (isActive) {
          remainingTimeForScheduledAd = Math.max(0, (triggerSec + durationOfAd) - currentMoviePosition);
        }
        return isActive;
      });
    }
  }

  const isAdOverlayVisible = !!(broadcast?.adEnabled || isScheduledAdActive);

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {isBroadcastActive && movie && broadcast ? (
        !isWatching ? (
          <div 
            className="relative rounded-3xl overflow-hidden aspect-video w-full border border-[#222] shadow-2xl flex flex-col justify-between p-6 md:p-10 bg-cover bg-center animate-fadeIn select-none"
            style={{ 
              backgroundImage: `linear-gradient(to top, rgba(5,5,5,0.98) 20%, rgba(5,5,5,0.85) 60%, rgba(5,5,5,0.7) 100%), url(${movie.backdropUrl || movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'})` 
            }}
          >
            {/* Top Row: Channel Badge */}
            <div className="flex justify-between items-start">
              <span className="flex items-center gap-2 bg-[#E50914] text-white text-[10px] md:text-xs font-black font-mono tracking-widest px-3.5 py-1.5 rounded-full uppercase shadow-lg shadow-red-600/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>{broadcast.status === 'live' ? 'LIVE ON AIR' : 'RERUN BROADCAST'}</span>
              </span>

              <div className="flex items-center gap-2 bg-black/60 border border-white/10 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2.5 rounded-2xl">
                <span className="font-mono italic font-black uppercase text-xs text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-rose-300">
                  {broadcast.channelName || 'SKD ONE'}
                </span>
              </div>
            </div>

            {/* Central Info Column */}
            <div className="max-w-2xl space-y-4 text-left">
              <div className="space-y-2">
                <p className="text-[#00E5FF] font-mono text-[10px] md:text-xs font-black tracking-widest uppercase flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#00E5FF] animate-pulse" />
                  <span>NOW STREAMING LIVE</span>
                </p>
                <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight leading-none uppercase drop-shadow">
                  {broadcast.showTitle || movie.title}
                </h1>
                <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-sans line-clamp-2 max-w-xl">
                  {movie.description}
                </p>
              </div>

              {/* Action area: CLICK TO WATCH */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  onClick={() => setIsWatching(true)}
                  className="px-8 py-4 bg-[#E50914] hover:bg-[#ff0c18] text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-2xl shadow-red-600/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white animate-pulse" />
                  <span>WATCH TV NOW</span>
                </button>
                
                <div className="text-xs font-mono text-gray-400 border border-white/5 bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl">
                  <span className="text-[#888]">SHOWTIME: </span>
                  <span className="text-white font-extrabold">{broadcast.showTime || 'ONGOING'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Info */}
            <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-400">
              <div className="flex items-center gap-2">
                <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] text-[#00E5FF] font-bold uppercase">{movie.rating}</span>
                <span>•</span>
                <span>{movie.categories?.join(', ')}</span>
              </div>
              <p className="text-[10px] text-[#00E5FF] font-bold uppercase tracking-wider animate-pulse">
                ★ Click Watch TV to tune in to the live stream
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black text-white ${
                  broadcast.status === 'live' 
                    ? 'bg-red-600 animate-pulse' 
                    : 'bg-purple-600'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {broadcast.status === 'live' ? 'LIVE ON AIR' : 'RERUN BROADCAST'}
                </span>

                <button 
                  onClick={() => setIsWatching(false)}
                  className="text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 transition-all uppercase cursor-pointer flex items-center gap-1"
                >
                  ◀ Close TV
                </button>
              </div>
            </div>

          {/* Interactive Player with TV HUD Overlays */}
          <div id="donalisa-premium-video-player-container" className="bg-[#000] border border-[#222] rounded-3xl overflow-hidden shadow-2xl relative group aspect-video w-full">
            <style>{`
              @keyframes sponsorMarquee {
                0% { transform: translateX(0%); }
                100% { transform: translateX(-50%); }
              }
              .animate-sponsorMarquee {
                display: inline-block;
                animation: sponsorMarquee 25s linear infinite;
              }
            `}</style>

            {/* TV Broadcaster HUD style Overlay & Video Player combined in absolute transition container */}
            <motion.div 
              layout
              initial={false}
              animate={{
                borderRadius: isAdOverlayVisible ? "16px" : "0px",
                borderWidth: isAdOverlayVisible ? "2px" : "0px",
                borderColor: isAdOverlayVisible ? "rgba(0, 229, 255, 0.4)" : "rgba(0, 0, 0, 0)",
                boxShadow: isAdOverlayVisible ? "0 0 20px rgba(0, 229, 255, 0.3)" : "none",
              }}
              transition={{
                type: "spring",
                stiffness: 110,
                damping: 18,
                mass: 1.1
              }}
              className={`relative bg-black overflow-hidden ${
                isAdOverlayVisible 
                  ? 'absolute top-3 left-3 w-[72%] h-[72%] z-20' 
                  : 'w-full h-full'
              }`}
            >
              <VideoPlayer 
                movie={movie}
                onClose={() => setIsWatching(false)}
                isLiveStream={true}
                liveStartTimeOffset={liveStartTimeOffset}
                forceMuted={isAdOverlayVisible}
              />

              {/* HUD HUD Overlay layer (Responsive to Squeeze size) */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-5 z-10 select-none">
                {/* TOP ROW: BRANDING & LIVE STATUS */}
                <div className="flex justify-between items-start">
                  {/* Top-Left: Channel Name & Show Details */}
                  <div className="flex flex-col animate-slideDown">
                    <div className="flex items-center gap-1.5 md:gap-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1.5 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl border border-white/10 shadow-2xl">
                      <span className="font-mono italic font-black uppercase tracking-wider text-[10px] md:text-sm text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-rose-400">
                        {broadcast.channelName || 'SKD ONE'}
                      </span>
                      <span className="text-white/20 font-light text-[10px] md:text-xs">|</span>
                      <div className="text-left">
                        <span className="font-sans font-extrabold uppercase text-white tracking-wider text-[7px] md:text-[10px] block">
                          {broadcast.showTitle || 'MORNING SHOW'}
                        </span>
                        <span className="text-rose-400 font-mono text-[6px] md:text-[8px] font-bold tracking-tight block mt-0.5">
                          {broadcast.showTime || '08:00 AM - 10:00 AM'}
                        </span>
                      </div>
                    </div>
                    {/* Glowing slanted underline */}
                    <div className="h-0.5 w-20 md:w-36 bg-gradient-to-r from-rose-500 via-pink-500 to-transparent relative mt-1 ml-1 shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                      <div className="absolute right-0 top-0 h-full w-1.5 bg-white/80 transform skew-x-12" />
                    </div>
                  </div>

                  {/* Top-Right: Pulse Live Tag */}
                  <div className="animate-slideDown">
                    <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                      </span>
                      <span className="text-[7px] md:text-[9px] font-mono font-black tracking-wider text-rose-500 uppercase">
                        {broadcast.status === 'live' ? 'LIVE' : 'RERUN'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* MIDDLE ROW: REAL-TIME HH:MM:SS DIGITAL BROADCAST CLOCK AT BOTTOM-LEFT & PIP / FULLSCREEN AT BOTTOM-RIGHT */}
                <div className="flex justify-between items-end mt-auto mb-2.5 animate-slideUp">
                  {/* Clock on the left */}
                  <div className="bg-black/85 border border-white/10 backdrop-blur-md px-2 py-1 md:px-3.5 md:py-1.5 rounded-lg md:rounded-xl flex items-center gap-1.5 md:gap-2.5 shadow-[0_0_12px_rgba(0,229,255,0.2)] pointer-events-auto">
                    <span className="relative flex h-1 w-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF]/70"></span>
                      <span className="relative inline-flex rounded-full h-1 w-1 bg-[#00E5FF]"></span>
                    </span>
                    <span className="text-white/45 font-mono text-[7px] md:text-[8px] font-bold tracking-widest uppercase">CLOCK</span>
                    <span className="text-white/20 font-light text-[8px] md:text-[10px]">|</span>
                    <span className="text-[#00E5FF] font-mono text-[9px] md:text-xs font-black tracking-widest tabular-nums [text-shadow:0_0_6px_rgba(0,229,255,0.4)]">
                      {(() => {
                        const d = new Date(now);
                        const hrs = String(d.getHours()).padStart(2, '0');
                        const mins = String(d.getMinutes()).padStart(2, '0');
                        const secs = String(d.getSeconds()).padStart(2, '0');
                        return `${hrs}:${mins}:${secs}`;
                      })()}
                    </span>
                  </div>

                  {/* Picture in Picture & Fullscreen Controls on the right */}
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const video = document.getElementById('donalisa-raw-video-element') as HTMLVideoElement;
                        if (!video) return;
                        try {
                          if (document.pictureInPictureElement) {
                            await document.exitPictureInPicture();
                          } else {
                            await video.requestPictureInPicture();
                          }
                        } catch (err) {
                          console.error('Picture-in-picture error:', err);
                        }
                      }}
                      className="bg-black/85 hover:bg-white/15 border border-white/15 text-white/90 hover:text-white px-2 py-1 rounded-lg md:rounded-xl flex items-center gap-1 text-[8px] md:text-[10px] font-mono font-bold tracking-wider uppercase transition-all shadow-xl cursor-pointer"
                      title="Picture-in-Picture"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span className="hidden md:inline">PiP</span>
                    </button>

                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const container = document.getElementById('donalisa-premium-video-player-container');
                        if (!container) return;
                        try {
                          if (!document.fullscreenElement) {
                            await container.requestFullscreen();
                          } else {
                            await document.exitFullscreen();
                          }
                        } catch (err) {
                          console.error('Fullscreen error:', err);
                        }
                      }}
                      className="bg-black/85 hover:bg-rose-600 border border-white/15 hover:border-rose-500/30 text-white/90 hover:text-white px-2 py-1 rounded-lg md:rounded-xl flex items-center gap-1 text-[8px] md:text-[10px] font-mono font-bold tracking-wider uppercase transition-all shadow-xl cursor-pointer"
                      title="Toggle Fullscreen"
                    >
                      <Maximize className="w-3 h-3 text-rose-500" />
                      <span className="hidden md:inline">Fullscreen</span>
                    </button>
                  </div>
                </div>

                {/* BOTTOM ROW: GLOWING SCHEDULING TIMELINE (Hidden in high squeeze to make room) */}
                {scheduleItems && scheduleItems.length > 0 && !isAdOverlayVisible && (
                  <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl p-1 md:p-1.5 flex flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-2 shadow-2xl animate-slideUp">
                    {/* COMING UP NEXT Tag */}
                    <div className="bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600 px-2.5 py-1 rounded-lg md:rounded-xl text-center md:text-left flex items-center justify-center gap-1 shadow-lg shadow-rose-500/20 shrink-0 transform -skew-x-6">
                      <span className="text-[7px] md:text-[9px] font-black tracking-wider text-white uppercase font-sans">
                        COMING UP NEXT
                      </span>
                      <span className="text-white text-xs animate-pulse">»</span>
                    </div>

                    {/* Horizontal list of schedule events */}
                    <div className="flex-1 flex overflow-x-auto no-scrollbar py-0.5 md:py-0 divide-x divide-white/10 select-none items-center scroll-smooth">
                      {scheduleItems.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="px-2.5 md:px-3.5 shrink-0 flex items-center gap-1.5">
                          <span className="text-[7px] md:text-[8px] text-white/30 font-mono font-bold">0{idx + 1}</span>
                          <div className="text-left">
                            <p className="text-[8px] md:text-[10px] font-extrabold text-white uppercase tracking-wide font-sans leading-tight">
                              {item.title}
                            </p>
                            <p className="text-[7px] md:text-[8px] font-mono text-rose-400 font-bold leading-none mt-0.5">
                              {item.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* SQUEEZE-BACK L-BAR SPONSOR AD OVERLAYS */}
            <AnimatePresence>
              {isAdOverlayVisible && (
                <>
                  {/* Right vertical sidebar: Squeeze Brand Showcase */}
                  <motion.div 
                    initial={{ opacity: 0, x: 40, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    className="absolute top-3 right-3 bottom-3 w-[24%] bg-gradient-to-b from-[#101012] via-[#08080a] to-[#020204] border border-white/5 rounded-2xl p-2.5 md:p-3.5 flex flex-col justify-between text-left overflow-hidden z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  >
                  <div className="space-y-2 flex-1 flex flex-col min-h-0">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {/* Sparkles Brand Header */}
                      <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-500/20 px-2 py-1 rounded-lg text-[7px] md:text-[9px] font-mono font-black text-yellow-500 uppercase tracking-widest leading-none shrink-0 w-max">
                        <Sparkles className="w-2.5 h-2.5 text-yellow-500 animate-pulse shrink-0" />
                        <span>OFFICIAL SPONSOR</span>
                      </div>

                      {/* Scheduled ad remaining countdown timer */}
                      {isScheduledAdActive && (
                        <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/35 px-1.5 py-1 rounded-lg text-[6px] md:text-[8px] font-mono font-black text-red-500 uppercase tracking-wider shrink-0 w-max">
                          <Clock className="w-2 h-2 text-red-500 animate-spin" />
                          <span>Break: {remainingTimeForScheduledAd}s</span>
                        </div>
                      )}
                    </div>

                    {/* Sponsor banner thumbnail */}
                    {broadcast.adVideoUrl ? (
                      <div className="relative aspect-[4/3] w-full bg-black rounded-lg md:rounded-xl overflow-hidden border border-white/5 shrink-0 shadow-md">
                        <video 
                          src={broadcast.adVideoUrl} 
                          className="w-full h-full object-cover" 
                          autoPlay 
                          muted 
                          loop 
                          playsInline 
                        />
                      </div>
                    ) : broadcast.adBannerImageUrl ? (
                      <div className="relative aspect-[4/3] w-full bg-black/50 rounded-lg md:rounded-xl overflow-hidden border border-white/5 shrink-0 shadow-md">
                        <img src={broadcast.adBannerImageUrl} alt={broadcast.adSponsorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      </div>
                    ) : null}

                    {/* Sponsor copy info */}
                    <div className="space-y-1 overflow-y-auto no-scrollbar flex-1 min-h-0 text-left">
                      <h4 className="font-sans font-extrabold uppercase text-white tracking-wider text-[8px] md:text-xs line-clamp-1">
                        {broadcast.adSponsorName || 'DonaLisa Movie Snacks'}
                      </h4>
                      <p className="text-[7px] md:text-[10px] text-gray-400 leading-tight font-sans line-clamp-4">
                        {broadcast.adHeadline || '🍿 Fresh hot caramel popcorn & cold soda combos delivered straight to your doorstep during live streams.'}
                      </p>
                    </div>
                  </div>

                  {/* Customer action hotlines and buttons */}
                  <div className="space-y-1 md:space-y-1.5 pt-2 border-t border-white/5 shrink-0">
                    {broadcast.adSponsorPhone && (
                      <a 
                        href={`tel:${broadcast.adSponsorPhone}`}
                        className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg md:rounded-xl font-black text-[7px] md:text-[9px] tracking-wider uppercase flex items-center justify-center gap-1 transition-all shadow-md pointer-events-auto"
                      >
                        <Phone className="w-2.5 h-2.5 shrink-0" /> Call {broadcast.adSponsorPhone}
                      </a>
                    )}
                    {broadcast.adSponsorLink && (
                      <a 
                        href={broadcast.adSponsorLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg md:rounded-xl font-black text-[7px] md:text-[9px] tracking-wider uppercase flex items-center justify-center gap-1 transition-all shadow-md pointer-events-auto"
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" /> Visit Web Page
                      </a>
                    )}
                  </div>
                </motion.div>

                {/* Bottom horizontal bar: Sponsor Live Scrolling deals */}
                <motion.div 
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 40, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  className="absolute bottom-3 left-3 w-[72%] h-[22%] bg-gradient-to-r from-[#101012] via-[#08080a] to-[#020204] border border-white/5 rounded-2xl p-2 md:p-3 flex items-center justify-between gap-2.5 md:gap-4 text-left overflow-hidden z-10"
                >
                  {/* Left Sponsor Badge Callout */}
                  <div className="flex items-center gap-1 md:gap-2 bg-yellow-400/10 border border-yellow-500/25 px-2 py-1 md:px-3 md:py-1.5 rounded-xl shrink-0">
                    <Megaphone className="w-3 md:w-4 md:h-4 text-yellow-500 shrink-0" />
                    <div className="text-left leading-none">
                      <span className="block text-[5px] md:text-[7px] font-mono text-white/40 font-bold uppercase tracking-widest">PROMOTIONAL</span>
                      <span className="block text-[6px] md:text-[8px] font-mono text-yellow-500 font-extrabold uppercase tracking-wider mt-0.5">SPONSOR OFFER</span>
                    </div>
                  </div>

                  {/* Scrolling Seamless Marquee */}
                  <div className="flex-1 overflow-hidden relative w-full h-6 md:h-8 flex items-center bg-black/40 border border-[#222] rounded-lg md:rounded-xl px-2.5 md:px-4 select-none">
                    <div className="relative w-full overflow-hidden whitespace-nowrap flex items-center h-full">
                      <div className="animate-sponsorMarquee inline-block whitespace-nowrap text-[8px] md:text-[10px] font-mono text-yellow-400 font-extrabold uppercase tracking-widest leading-none">
                        {broadcast.adTickerMessage || '🍿 GET 50% DISCOUNT ON POPCORN COMBO WITH FREE HOME DELIVERY TODAY! '} &nbsp;&nbsp;&nbsp;&nbsp; ★ &nbsp;&nbsp;&nbsp;&nbsp; {broadcast.adTickerMessage || '🍿 GET 50% DISCOUNT ON POPCORN COMBO WITH FREE HOME DELIVERY TODAY! '} &nbsp;&nbsp;&nbsp;&nbsp; ★ &nbsp;&nbsp;&nbsp;&nbsp;
                      </div>
                      <div className="animate-sponsorMarquee inline-block whitespace-nowrap text-[8px] md:text-[10px] font-mono text-yellow-400 font-extrabold uppercase tracking-widest leading-none">
                        {broadcast.adTickerMessage || '🍿 GET 50% DISCOUNT ON POPCORN COMBO WITH FREE HOME DELIVERY TODAY! '} &nbsp;&nbsp;&nbsp;&nbsp; ★ &nbsp;&nbsp;&nbsp;&nbsp; {broadcast.adTickerMessage || '🍿 GET 50% DISCOUNT ON POPCORN COMBO WITH FREE HOME DELIVERY TODAY! '} &nbsp;&nbsp;&nbsp;&nbsp; ★ &nbsp;&nbsp;&nbsp;&nbsp;
                      </div>
                    </div>
                  </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Elegant Horizontal Scrolling Hashtag/Updates Ticker (CNN / BBC style) with Live Clock */}
          <div id="live-tv-broadcast-clock-container" className="space-y-1.5">
            {/* Real-time Clock bar above the ticker */}
            <div className="flex justify-between items-end px-1 animate-fadeIn">
              <div id="live-tv-clock-badge" className="flex items-center gap-2 bg-[#1a1a1a] border border-white/5 shadow-2xl rounded-t-xl px-4 py-1.5 text-[10px] font-mono font-bold tracking-wider text-rose-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                </span>
                <span id="live-tv-clock-date" className="text-[#888]">
                  {new Date(now).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                </span>
                <span className="text-white/20">|</span>
                <span id="live-tv-clock-time" className="text-white text-[11px] font-black tracking-widest tabular-nums font-mono animate-pulse">
                  {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}
                </span>
                <span className="text-white/20">|</span>
                <span id="live-tv-clock-label" className="text-rose-400 font-extrabold uppercase text-[8px] tracking-widest">
                  LIVE TELEVISION CLOCK
                </span>
              </div>
              <div id="live-tv-clock-sync-info" className="text-[8px] font-mono text-white/30 uppercase tracking-widest pb-1 hidden sm:block">
                SYS_SYNC_ACTIVE: {(liveStartTimeOffset / 60).toFixed(0)}m ELAPSED
              </div>
            </div>

            {/* Scrolling Ticker (CNN style) */}
            <div id="live-tv-ticker-container" className="bg-[#E50914] text-white overflow-hidden relative rounded-2xl rounded-tl-none flex items-center shadow-lg border border-red-500/10">
              <div id="live-tv-ticker-label" className="bg-[#a0060e] px-4 py-2 text-[10px] font-mono font-black uppercase tracking-wider shrink-0 z-10 border-r border-red-700/50 flex items-center gap-1.5 shadow-md">
                <Tv className="w-3.5 h-3.5 animate-pulse" />
                <span>UPDATES</span>
              </div>
              <div className="w-full overflow-hidden whitespace-nowrap flex items-center relative py-2">
                <div id="live-tv-ticker-track" className="animate-marquee whitespace-nowrap flex gap-12 text-xs font-mono font-bold tracking-wider uppercase">
                  {(() => {
                    const text = (broadcast.tickerUpdates && broadcast.tickerUpdates.trim()) 
                      ? broadcast.tickerUpdates 
                      : `WELCOME TO THE ${broadcast.channelName || 'SKD ONE'} STREAMING NETWORK • MULTI-CLIENT CLOUD TELECAST IN PROGRESS • STAY TUNED FOR UPCOMING BLOCKBUSTERS & RE-RUN SHOWS`;
                    return (
                      <>
                        <span>{text}</span>
                        <span>•</span>
                        <span>{text}</span>
                        <span>•</span>
                        <span>{text}</span>
                        <span>•</span>
                        <span>{text}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Movie Details card below the stream */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col md:flex-row items-start justify-between gap-6"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-extrabold text-white">{movie.title}</h3>
                <span className="bg-[#1f1f1f] border border-[#333] px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider text-[#00E5FF]">{movie.rating}</span>
                {movie.categories?.map((cat) => (
                  <span key={cat} className="text-xs text-[#E50914] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-semibold">{cat}</span>
                ))}
              </div>
              <p className="text-xs text-[#aaa] leading-relaxed max-w-4xl">{movie.description}</p>
            </div>
            
            <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded-xl space-y-2 shrink-0 w-full md:w-64 text-xs font-mono">
              <div className="text-white/40 uppercase font-bold border-b border-[#222] pb-1.5">Broadcast Info</div>
              <div className="flex justify-between">
                <span className="text-[#888]">Type</span>
                <span className="text-red-500 font-bold">{movie.type === 'song' ? '🎵 Audio Track' : '🎬 Movie'}</span>
              </div>
              {movie.artist && (
                <div className="flex justify-between">
                  <span className="text-[#888]">Artist</span>
                  <span className="text-white font-bold">{movie.artist}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#888]">Status</span>
                <span className="text-white capitalize">{broadcast.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888]">Synced Offset</span>
                <span>{Math.floor(liveStartTimeOffset / 60)}m {liveStartTimeOffset % 60}s</span>
              </div>
            </div>
          </motion.div>
        </div>
        )
      ) : (
        /* Cinematic TV Offline screen with CSS color bars */
        <div className="bg-[#111] border border-[#222] rounded-3xl overflow-hidden p-8 md:p-16 text-center max-w-4xl mx-auto space-y-8 shadow-2xl relative">
          {/* SMTPE Color Bars test pattern simulation */}
          <div className="w-full h-32 md:h-44 rounded-2xl overflow-hidden flex shadow-inner border border-[#222] relative group">
            <div className="w-[14.28%] h-full bg-[#f1f1f1]" />
            <div className="w-[14.28%] h-full bg-[#e1e11e]" />
            <div className="w-[14.28%] h-full bg-[#1ee1e1]" />
            <div className="w-[14.28%] h-full bg-[#1ee11e]" />
            <div className="w-[14.28%] h-full bg-[#e11ee1]" />
            <div className="w-[14.28%] h-full bg-[#e11e1e]" />
            <div className="w-[14.28%] h-full bg-[#1e1ee1]" />
            
            {/* Overlay retro grid static lines */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#000]/10 to-[#000]/20 pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[0.5px]">
              <div className="bg-black/80 px-4 py-2 rounded-xl border border-white/10 font-mono text-xs text-white uppercase tracking-widest font-black animate-pulse">
                NO TELECAST SIGNALS DETECTED
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            <h2 className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
              <Tv className="w-5 h-5 text-red-500 animate-pulse" />
              <span>Live TV Channel Offline</span>
            </h2>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              The administrator has suspended the real-time broadcast feed for scheduled catalog updates. Please browse our offline streaming catalog in the meantime!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Loader component
function Loader2({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${className}`}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
