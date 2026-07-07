import React, { useState, useRef } from 'react';
import { Upload, ShieldCheck, AlertCircle, X, Film, Music, RefreshCw } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/config';
import { motion, AnimatePresence } from 'motion/react';

interface MediaUploaderProps {
  onUploadStart?: (file: File, localUrl: string) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (downloadUrl: string, file: File, localUrl: string) => void;
  onUploadFailed?: (error: Error) => void;
  onClear?: () => void;
  className?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadFailed,
  onClear,
  className = '',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completed' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<any>(null);

  const validateAndSetFile = (selectedFile: File) => {
    const isVideo = selectedFile.type.startsWith('video/') || 
                    selectedFile.name.endsWith('.mp4') || 
                    selectedFile.name.endsWith('.mkv') || 
                    selectedFile.name.endsWith('.mov') ||
                    selectedFile.name.endsWith('.webm');
                    
    const isAudio = selectedFile.type.startsWith('audio/') || 
                    selectedFile.name.endsWith('.mp3') || 
                    selectedFile.name.endsWith('.wav') ||
                    selectedFile.name.endsWith('.aac') ||
                    selectedFile.name.endsWith('.m4a');

    if (!isVideo && !isAudio) {
      setErrorMessage('Unsupported format. Please select a video or audio file (MP4, MKV, MOV, MP3, WAV, etc.)');
      setFile(null);
      setUploadState('failed');
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    setUploadState('idle');
    setProgress(null);
    
    // Revoke old URL if exists
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
    }
    
    const objUrl = URL.createObjectURL(selectedFile);
    setLocalUrl(objUrl);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const cancelUpload = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
    }
    clearFile();
  };

  const clearFile = () => {
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
    }
    setFile(null);
    setLocalUrl(null);
    setProgress(null);
    setUploadState('idle');
    setErrorMessage(null);
    uploadTaskRef.current = null;
    if (onClear) onClear();
  };

  const startUpload = () => {
    if (!file || !localUrl) return;

    setUploadState('uploading');
    setProgress(0);
    if (onUploadStart) {
      onUploadStart(file, localUrl);
    }

    const isVideo = file.type.startsWith('video') || 
                    file.name.endsWith('.mp4') || 
                    file.name.endsWith('.mkv') || 
                    file.name.endsWith('.mov');
    
    const fileId = `broadcast_${Date.now()}`;
    const extension = file.name.split('.').pop() || 'mp4';
    const storagePath = isVideo 
      ? `movies/${fileId}.${extension}` 
      : `music/${fileId}.${extension}`;

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTaskRef.current = uploadTask;

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(percent);
        if (onUploadProgress) {
          onUploadProgress(percent);
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        setUploadState('failed');
        setErrorMessage(error.message || 'Storage upload failed. Ensure internet connection & credentials are valid.');
        if (onUploadFailed) {
          onUploadFailed(error);
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadState('completed');
          setProgress(100);
          if (onUploadComplete) {
            onUploadComplete(downloadUrl, file, localUrl);
          }
        } catch (err: any) {
          console.error('Error retrieving download URL:', err);
          setUploadState('failed');
          setErrorMessage(err.message || 'Failed to retrieve cloud link.');
          if (onUploadFailed) {
            onUploadFailed(err);
          }
        }
      }
    );
  };

  const isVideoFile = file?.type.startsWith('video/') || 
                      file?.name.endsWith('.mp4') || 
                      file?.name.endsWith('.mkv') || 
                      file?.name.endsWith('.mov') ||
                      file?.name.endsWith('.webm');

  return (
    <div className={`space-y-4 ${className}`} id="media-uploader-container">
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragActive 
            ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.15)] scale-[1.01]' 
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="video/*,audio/*"
          className="hidden" 
          id="media-uploader-input"
        />

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div 
              key="dropzone-empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center space-y-3 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-rose-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-200">
                  Drag and drop your media file here
                </p>
                <p className="text-xs text-zinc-500">
                  or click to browse your computer
                </p>
              </div>
              <p className="text-[10px] font-mono tracking-wide text-zinc-600 uppercase">
                MP4, MKV, MOV, MP3, WAV, AAC (Max 500MB recommended)
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="dropzone-file"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4 text-left"
            >
              <div className="flex items-center gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                <div className={`p-3 rounded-xl ${isVideoFile ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500'}`}>
                  {isVideoFile ? <Film className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-zinc-100 truncate font-mono uppercase tracking-wide">
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-bold">
                      {isVideoFile ? 'VIDEO' : 'AUDIO'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                {uploadState !== 'uploading' && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {uploadState === 'uploading' && (
                <div className="space-y-2 bg-zinc-950/80 border border-zinc-900 p-4 rounded-xl">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-t-rose-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                      <span>Uploading to high-speed cloud storage...</span>
                    </span>
                    <span className="text-zinc-200 font-black">{progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/30">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${progress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={cancelUpload}
                      className="text-[9px] font-mono text-rose-400 hover:text-rose-300 uppercase tracking-widest font-black"
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              )}

              {uploadState === 'completed' && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-400 text-xs font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Securely synchronized! Stream is ready for live telecast.</span>
                </div>
              )}

              {uploadState === 'failed' && (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="truncate">{errorMessage || 'Upload failed. Please try again.'}</span>
                </div>
              )}

              {uploadState === 'idle' && (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={clearFile}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={startUpload}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 hover:shadow-rose-900/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                    Start Live Cloud Broadcast
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {errorMessage && !file && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-400 text-xs font-mono animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
