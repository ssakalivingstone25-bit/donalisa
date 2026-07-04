/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'viewer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  preferences?: {
    theme: 'dark' | 'light' | 'system';
    notificationsEnabled: boolean;
    autoplayNext: boolean;
    defaultQuality: 'auto' | '1080p' | '720p';
  };
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  videoUrl: string;
  trailerUrl?: string;
  duration: number; // in seconds
  releaseYear: number;
  rating: string; // e.g., 'PG-13', 'TV-MA', 'R'
  categories: string[];
  trending?: boolean;
  featured?: boolean;
  viewCount: number;
  viewerIds?: string[];
  uploadedBy: string; // admin uid
  createdAt: string;
  updatedAt?: string;
  isLocalSessionFile?: boolean;
  type?: 'movie' | 'song';
  artist?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  progressSeconds: number;
  totalDurationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  rating: string;
  addedAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  movieId: string;
  addedAt: string;
}

export interface NotificationMessage {
  id: string;
  userId?: string; // if null, global broadcast
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  movieId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

export interface CommentLike {
  id: string; // userId_commentId
  userId: string;
  commentId: string;
  likedAt: string;
}

