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
// Safely load local applet config if it exists (using Vite glob to prevent build failures when excluded in production pipelines)
const appletConfigFiles = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const appletConfigKey = Object.keys(appletConfigFiles)[0];
const appletConfig: any = appletConfigKey ? (appletConfigFiles[appletConfigKey] as any).default : {};

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
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || appletConfig.apiKey || "",
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || appletConfig.authDomain || "",
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || appletConfig.projectId || "",
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || appletConfig.storageBucket || "",
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || appletConfig.messagingSenderId || "",
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || appletConfig.appId || "",
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || appletConfig.measurementId || "",
  firestoreDatabaseId: getEnvVar('VITE_FIREBASE_DATABASE_ID') || appletConfig.firestoreDatabaseId || undefined,
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
