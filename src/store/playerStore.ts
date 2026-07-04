import { create } from 'zustand';
import type { Movie } from '@/types';

interface PlayerState {
  currentMovie: Movie | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0 to 1
  currentTime: number;
  duration: number;
  isFullscreen: boolean;
  theaterMode: boolean;
  playMovie: (movie: Movie) => void;
  closePlayer: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setCurrentTime: (time: number) => void;
  toggleFullscreen: () => void;
  toggleTheaterMode: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentMovie: null,
  isPlaying: false,
  isMuted: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  isFullscreen: false,
  theaterMode: false,
  playMovie: (movie) => set({ currentMovie: movie, isPlaying: true, currentTime: 0 }),
  closePlayer: () => set({ currentMovie: null, isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setCurrentTime: (currentTime) => set({ currentTime }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  toggleTheaterMode: () => set((state) => ({ theaterMode: !state.theaterMode })),
}));
