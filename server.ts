import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { OpenAI } from 'openai';
import { validateOpenAIKey } from './src/lib/aiUtils';

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

  // Lazy OpenAI Initializer with key validation
  let openaiInstance: OpenAI | null = null;
  const getOpenAI = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const validation = validateOpenAIKey(apiKey);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    if (!openaiInstance) {
      openaiInstance = new OpenAI({ apiKey: apiKey!.trim() });
    }
    return openaiInstance;
  };

  // DONA AI Chat Assistant Route
  app.post('/api/openai/dona-ai', async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid parameter: messages' });
    }

    const systemInstruction = `You are DONA AI, the virtual assistant for the DONALISA platform.
Your ONLY role is to assist users with features that exist directly inside this specific application. You MUST NOT talk about features, products, shops, services, or information outside this app. You are strictly forbidden from recommending outside products, external search terms, or other external services. If the user asks for outside products, shops, information, or external search items, politely explain that you can only provide information about the direct in-app features.

The DONALISA app consists ONLY of the following two in-app features:
1) Cinematic portal: High-definition streaming movies, series, and local/global songs, which can be fully downloaded inside the web browser's offline storage (indexedDB) for 100% offline playback with zero data charges.
2) BizLink Uganda: A digital marketplace designed to bridge local merchants and storefronts in Kampala. It allows users to view active in-app shops, register as merchants to customize their storefronts with pre-loaded niches, manage stock products, and view other active shop vendors on the interactive Shop Map View.

Guidance Rules:
- Answer questions ONLY regarding the platform's actual in-app features: offline cinematic streaming, and BizLink merchant directories/shops.
- Never mention or recommend outside merchants, products, coordinates, or search results that are not part of the active app.
- Always maintain hospitality, polite Ugandan vibes, and conciseness.`;

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemInstruction
          },
          ...messages
        ],
        temperature: 0.7,
      });

      const reply = response.choices[0]?.message?.content || '';
      res.json({ success: true, text: reply });
    } catch (err: any) {
      console.warn("OpenAI DONA AI call failed, activating Kampala concierge sandbox:", err.message || err);
      
      // Determine query context
      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      let replyText = '';

      if (lastMsg.includes('offline') || lastMsg.includes('download') || lastMsg.includes('stream') || lastMsg.includes('data')) {
        replyText = "Hello! I am DONA AI, responding from our Kampala operational sandbox. 🎬\n\nOur offline playback works via specialized local database streams! Any movie or song you download is saved directly to your browser's IndexedDB ledger. This lets you turn off your Wi-Fi or mobile data completely and play your items with **zero buffering and 100% zero data charges**! Try downloading a clip and heading offline to test it!";
      } else if (lastMsg.includes('bizlink') || lastMsg.includes('merchant') || lastMsg.includes('map') || lastMsg.includes('shop')) {
        replyText = "Hello! I am DONA AI. 🛍️\n\n**BizLink Uganda** is our dedicated commerce module. It lets local Ugandan business owners apply for storefronts, choose visual niches (Electronics, Groceries, Restaurants, etc.), and list their products. Plus, we've integrated a real-time **Shop Map View** so visitors can see where merchants are physically located in Kampala. If you're a business owner, open BizLink and tap 'Register Store'!";
      } else {
        replyText = `Welcome to DONALISA! I am DONA AI, your resident assistant.

Since we are currently running in Sandbox Mode (API Key is not fully active), here is some key information about us:
- **Cinematic Streams**: High-fidelity media, completely downloadable for offline playback using local storage.
- **BizLink Uganda**: A powerful local trade gateway featuring visual merchant templates, stock control dashboards, and real-time interactive mapping coordinates.

*(Tip: To enable live GPT-4o intelligence, ask the administrator to configure the OPENAI_API_KEY in the Settings > Secrets tab. OpenAI keys start with 'sk-'. If your configured key begins with 'vck_', it is incorrect and must be replaced.)*`;
      }

      res.json({ success: true, text: replyText });
    }
  });

  // BIZLINK AI Assistant Route (Template Content, Niche suggestions, and Images)
  app.post('/api/openai/bizlink-ai', async (req, res) => {
    const { prompt, type, category } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing parameter: prompt' });
    }

    let systemPrompt = '';
    if (type === 'template') {
      systemPrompt = "You are BIZLINK AI, an expert retail consultant specializing in Ugandan trade. Generate complete, compelling shop niche outlines, brand names, slogans, and lists of high-demand local products. Respond in clean JSON formatting with keys: 'brandName', 'slogan', 'description', 'recommendedProducts' (an array of objects with 'name', 'price', 'description' in UGX). Keep prices realistic for Kampala markets.";
    } else if (type === 'description') {
      systemPrompt = "You are BIZLINK AI. Write an attractive, persuasive, professional product description for a local Ugandan shop vendor. Focus on quality, local convenience, and reliability. Limit to 3 short sentences.";
    } else {
      systemPrompt = "You are BIZLINK AI. Help a Ugandan merchant with copywriting, visual ideas, marketing campaigns, or stock organization. Be supportive, informative, and business-focused.";
    }

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      });

      const reply = response.choices[0]?.message?.content || '';
      res.json({ success: true, text: reply });
    } catch (err: any) {
      console.warn("OpenAI BIZLINK AI call failed, activating Kampala retail sandbox:", err.message || err);

      // Recommended Unsplash photos based on niche keywords
      let imageSuggestion = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80';
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('fashion') || lowerPrompt.includes('clothes') || lowerPrompt.includes('wear')) {
        imageSuggestion = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80';
      } else if (lowerPrompt.includes('food') || lowerPrompt.includes('restaurant') || lowerPrompt.includes('grocer') || lowerPrompt.includes('fruit')) {
        imageSuggestion = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
      } else if (lowerPrompt.includes('craft') || lowerPrompt.includes('artisan') || lowerPrompt.includes('wood')) {
        imageSuggestion = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80';
      } else if (lowerPrompt.includes('service') || lowerPrompt.includes('repair') || lowerPrompt.includes('technician')) {
        imageSuggestion = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80';
      }

      let responseObj: any = {};
      if (type === 'template') {
        responseObj = {
          brandName: "Uganda Express " + (category || "Retail"),
          slogan: "Quality, trust, and speed directly to your doorstep.",
          description: `Welcome to our professional storefront! Created using BIZLINK AI. We are proud to serve the Kampala community with top-tier goods, competitive pricing, and fast local courier dispatch.`,
          recommendedProducts: [
            { name: "Premium Option A", price: "45,000 UGX", description: "High quality item, carefully vetted for Ugandan users." },
            { name: "Value Pack B", price: "15,000 UGX", description: "Affordable option offering maximum durability and convenience." }
          ],
          imageUrl: imageSuggestion
        };
      } else if (type === 'description') {
        responseObj = {
          text: `Expertly crafted and sourced specifically for our clients in Kampala. Offering unmatched performance, local warranty protection, and absolute value for money. Available now for instant order with mobile money.`,
          imageUrl: imageSuggestion
        };
      } else {
        responseObj = {
          text: `Greetings from BIZLINK AI Sandbox! We suggest focusing on digital mobile money payments and reliable local boda boda courier delivery to build immediate client trust in Kampala. Make sure to list clear prices in UGX.`,
          imageUrl: imageSuggestion
        };
      }

      res.json({
        success: true,
        sandbox: true,
        text: type === 'template' || type === 'description' ? JSON.stringify(responseObj) : responseObj.text,
        imageUrl: imageSuggestion
      });
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
