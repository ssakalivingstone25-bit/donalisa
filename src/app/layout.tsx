/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import './globals.css';

// Canonical Next.js 15 App Router Type Definitions (Universal Runtime Compatible)
export interface Metadata {
  title?: string | { default: string; template: string };
  description?: string;
  applicationName?: string;
  authors?: { name: string }[];
  generator?: string;
  keywords?: string[];
  icons?: { icon?: string; shortcut?: string; apple?: string };
  manifest?: string;
}

export interface Viewport {
  themeColor?: string;
  colorScheme?: string;
  width?: string;
  initialScale?: number;
  maximumScale?: number;
  userScalable?: boolean;
}

export const metadata: Metadata = {
  title: {
    default: 'DONALISA | PWA Streaming Platform',
    template: '%s | DONALISA',
  },
  description: 'Enterprise progressive web application for streaming movies, trailers, and managing offline downloads with Firebase realtime synchronization.',
  applicationName: 'DONALISA',
  authors: [{ name: 'Senior Full Stack Software Engineer' }],
  generator: 'Next.js 15 App Router',
  keywords: ['movies', 'streaming', 'pwa', 'firebase', 'hls', 'nextjs', 'tailwind', 'shadcn'],
  icons: {
    icon: '/assets/icons/icon-192x192.png',
    shortcut: '/assets/icons/favicon.ico',
    apple: '/assets/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-[#E50914]">
        {children}
      </body>
    </html>
  );
}
