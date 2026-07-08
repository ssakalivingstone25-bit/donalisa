import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

// Singleton BroadcastEngine Service
class BroadcastEngineService {
  private activeTranscodes = new Map<string, any>(); // movieId -> child_process
  private hasFfmpeg = false;

  constructor() {
    this.detectFfmpeg();
  }

  private detectFfmpeg() {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      this.hasFfmpeg = true;
      console.log('[BroadcastEngine] FFmpeg CLI detected successfully. Real-time HLS streaming enabled.');
    } catch (e) {
      this.hasFfmpeg = false;
      console.warn('[BroadcastEngine] FFmpeg CLI not detected in system PATH. Activating Virtual Timeline Synchronization fallback.');
    }
  }

  public isFfmpegAvailable(): boolean {
    return this.hasFfmpeg;
  }

  public startTranscoding(movieId: string, videoUrl: string) {
    if (!videoUrl) return;

    // Skip transcoding if FFmpeg is not available or if the URL is not a valid stream source
    if (!this.hasFfmpeg) {
      this.generateVirtualHls(movieId, videoUrl);
      return;
    }

    if (this.activeTranscodes.has(movieId)) {
      console.log(`[BroadcastEngine] Transcoding already in progress for movie: ${movieId}`);
      return;
    }

    const outputDir = path.join(process.cwd(), 'public', 'streams', movieId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, 'stream.m3u8');
    
    // If stream playlist already exists, don't re-transcode
    if (fs.existsSync(playlistPath)) {
      console.log(`[BroadcastEngine] Stream files already exist for movie: ${movieId}. Serving cached HLS.`);
      return;
    }

    console.log(`[BroadcastEngine] Launching FFmpeg HLS Transcoding for movie: ${movieId}...`);

    // Standard high-compatibility HLS encoding parameters
    const ffmpegArgs = [
      '-i', videoUrl,
      '-codec:v', 'libx264',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-s', '854x480', // 480p fallback for standard performance
      '-codec:a', 'aac',
      '-ac', '2',
      '-ar', '44100',
      '-start_number', '0',
      '-hls_time', '6',
      '-hls_list_size', '0',
      '-f', 'hls',
      '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
      playlistPath
    ];

    try {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      this.activeTranscodes.set(movieId, ffmpegProcess);

      ffmpegProcess.stderr.on('data', (data) => {
        // FFmpeg writes standard logging to stderr
        // console.log(`[FFmpeg-Log]: ${data}`);
      });

      ffmpegProcess.on('close', (code) => {
        console.log(`[BroadcastEngine] FFmpeg process for ${movieId} closed with exit code ${code}`);
        this.activeTranscodes.delete(movieId);
      });

      ffmpegProcess.on('error', (err) => {
        console.error(`[BroadcastEngine] FFmpeg process for ${movieId} error:`, err);
        this.activeTranscodes.delete(movieId);
      });
    } catch (err) {
      console.error('[BroadcastEngine] Failed to initiate FFmpeg stream:', err);
    }
  }

  // Fallback HLS manifest writer when FFmpeg is not installed
  private generateVirtualHls(movieId: string, videoUrl: string) {
    console.log(`[BroadcastEngine] Generating virtual HLS manifest for movie: ${movieId}`);
    const outputDir = path.join(process.cwd(), 'public', 'streams', movieId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, 'stream.m3u8');
    
    // Standard virtual direct-media HLS manifest
    const manifestContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:3600
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:3600.0,
${videoUrl}
#EXT-X-ENDLIST`;

    try {
      fs.writeFileSync(playlistPath, manifestContent, 'utf8');
      console.log(`[BroadcastEngine] Virtual manifest written successfully to: ${playlistPath}`);
    } catch (err) {
      console.error('[BroadcastEngine] Failed writing virtual HLS manifest:', err);
    }
  }

  public stopAll() {
    console.log('[BroadcastEngine] Stopping all active FFmpeg transcoding jobs...');
    for (const [movieId, proc] of this.activeTranscodes.entries()) {
      try {
        proc.kill('SIGKILL');
      } catch (e) {}
    }
    this.activeTranscodes.clear();
  }
}

const broadcastEngine = new BroadcastEngineService();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Set up public streams directories
  const streamsDir = path.join(process.cwd(), 'public', 'streams');
  if (!fs.existsSync(streamsDir)) {
    fs.mkdirSync(streamsDir, { recursive: true });
  }

  // 1. Static Streams File Server
  app.use('/streams', express.static(streamsDir));

  // 2. REST API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      ffmpeg: broadcastEngine.isFfmpegAvailable(),
      timestamp: Date.now() 
    });
  });

  // API to trigger stream transcoding of a movie/song file
  app.post('/api/broadcast/transcode', (req, res) => {
    const { movieId, videoUrl } = req.body;
    if (!movieId || !videoUrl) {
      return res.status(400).json({ error: 'Missing required fields: movieId and videoUrl' });
    }

    try {
      broadcastEngine.startTranscoding(movieId, videoUrl);
      
      const isFfmpeg = broadcastEngine.isFfmpegAvailable();
      const streamUrl = `/streams/${movieId}/stream.m3u8`;

      res.json({ 
        success: true, 
        message: isFfmpeg ? 'HLS transcoding started successfully' : 'Virtual HLS streaming initialized',
        streamUrl,
        ffmpeg: isFfmpeg
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed initiating broadcast' });
    }
  });



  // Serve static UI in production or mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    broadcastEngine.stopAll();
    process.exit(0);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] DONALISA Full-Stack running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
