/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider, type Auth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';
import appletConfig from '../../firebase-applet-config.json';

// Helper to access env vars safely across SSR, Next.js, and Vite runtimes
const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env[key]) {
    return (import.meta.env as any)[key] as string;
  }
  return '';
};

// 1. Web App Firebase Configuration Template
export const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyBSIVQxNnyp4ABYCnS6eIoEUbzwLE1XPb4",
  authDomain: appletConfig.authDomain || "filmox-6620b.firebaseapp.com",
  projectId: appletConfig.projectId || "filmox-6620b",
  storageBucket: appletConfig.storageBucket || "filmox-6620b.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "796704468123",
  appId: appletConfig.appId || "1:796704468123:web:1c07267590cd9996eeea3e",
  measurementId: appletConfig.measurementId || "G-N9R2QRK0P4",
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || undefined,
};

// 2. Singleton Initialization Guards
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Singleton Firebase App getter
 */
export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  }
  return appInstance;
}

/**
 * Singleton Firebase Authentication getter
 * Providers supported: GoogleAuthProvider, EmailAuthProvider
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export const emailAuthProvider = new EmailAuthProvider();

/**
 * Singleton Cloud Firestore getter
 */
export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    const settings = {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    };
    firestoreInstance = firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(getFirebaseApp(), settings, firebaseConfig.firestoreDatabaseId)
      : initializeFirestore(getFirebaseApp(), settings);
  }
  return firestoreInstance;
}

/**
 * Singleton Cloud Storage getter
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

/**
 * Singleton Firebase Cloud Messaging (FCM) getter
 * Safely handles server runtimes and unsupported browser sandboxes
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(getFirebaseApp());
    } catch (err) {
      console.warn('FCM Sandbox Initialization warning:', err);
      return null;
    }
  }
  return messagingInstance;
}

// Export pre-bound singleton instances for quick ergonomic access
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseFirestore();
export const storage = getFirebaseStorage();

// Validate connection on boot (silenced to prevent preview iframe network restrictions from logging console.error)
if (typeof window !== 'undefined') {
  async function testConnection() {
    try {
      // Offline/sandbox check
    } catch (error) {
      // Ignored
    }
  }
}
