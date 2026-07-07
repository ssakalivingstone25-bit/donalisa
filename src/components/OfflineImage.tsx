import React, { useState, useEffect } from 'react';

// Helper to open the db locally without duplicate setup
const getFileFromLocalDB = async (id: string): Promise<string | null> => {
  try {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open('donalisa_media_db', 1);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('media_files')) {
          resolve(null);
          return;
        }
        const transaction = db.transaction('media_files', 'readonly');
        const store = transaction.objectStore('media_files');
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const file = getReq.result as File | Blob | undefined;
          if (file) {
            resolve(URL.createObjectURL(file));
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
};

interface OfflineImageProps {
  src?: string;
  fallbackSrc?: string;
  className?: string;
  alt?: string;
  [key: string]: any;
}

export default function OfflineImage({ src, fallbackSrc, className, alt, ...props }: OfflineImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    let localBlobUrl = '';

    const resolveUrl = async () => {
      if (!src) {
        if (isMounted) setResolvedSrc(fallbackSrc || '');
        return;
      }

      if (src.startsWith('indexeddb://')) {
        const dbId = src.replace('indexeddb://', '');
        const blobUrl = await getFileFromLocalDB(dbId);
        if (isMounted) {
          if (blobUrl) {
            localBlobUrl = blobUrl;
            setResolvedSrc(blobUrl);
          } else {
            setResolvedSrc(fallbackSrc || '');
          }
        }
      } else {
        if (isMounted) setResolvedSrc(src);
      }
    };

    resolveUrl();

    return () => {
      isMounted = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [src, fallbackSrc]);

  return (
    <img
      src={resolvedSrc || fallbackSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
