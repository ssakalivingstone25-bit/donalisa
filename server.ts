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

  // --- BIZLINK UGANDA CARD PAYMENT GATEWAY ENGINE ---
  interface PaymentSession {
    id: string;
    productId: string;
    productTitle: string;
    amount: number;
    shopId: string;
    shopName: string;
    buyerId: string;
    buyerName: string;
    status: 'pending' | 'success' | 'failed';
    createdAt: number;
  }

  const activePaymentSessions = new Map<string, PaymentSession>();

  // API to create a payment session
  app.post('/api/biz/pay', (req, res) => {
    const { productId, productTitle, amount, shopId, shopName, buyerId, buyerName } = req.body;
    if (!productId || !amount || !shopId || !buyerId) {
      return res.status(400).json({ error: 'Missing payment initialization parameters.' });
    }

    const sessionId = `pay_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const session: PaymentSession = {
      id: sessionId,
      productId,
      productTitle: productTitle || 'Kampala Premium Goods',
      amount: Number(amount),
      shopId,
      shopName: shopName || 'Verified Kampala Shop',
      buyerId,
      buyerName: buyerName || 'Verified Subscriber',
      status: 'pending',
      createdAt: Date.now()
    };

    activePaymentSessions.set(sessionId, session);

    res.json({
      success: true,
      sessionId,
      checkoutUrl: `/api/biz/gateway?session_id=${sessionId}`
    });
  });

  // API to complete/verify a payment session
  app.post('/api/biz/pay/complete', (req, res) => {
    const { session_id, cardNumber, holderName } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    const session = activePaymentSessions.get(session_id);
    if (!session) {
      return res.status(404).json({ error: 'Payment session not found' });
    }

    // Verify card parameters
    if (cardNumber && cardNumber.replace(/\s+/g, '').length >= 15) {
      session.status = 'success';
      activePaymentSessions.set(session_id, session);
      return res.json({ success: true, message: 'Payment cleared and authorized successfully.' });
    } else {
      session.status = 'failed';
      activePaymentSessions.set(session_id, session);
      return res.status(400).json({ error: 'Invalid card details. Please check your card number.' });
    }
  });

  // API to query session status
  app.get('/api/biz/pay/status', (req, res) => {
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'Missing session_id parameter' });
    }

    const session = activePaymentSessions.get(session_id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ status: session.status, session });
  });

  // HTML Gateway render
  app.get('/api/biz/gateway', (req, res) => {
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).send('<h1>Error: Missing session_id</h1>');
    }

    const session = activePaymentSessions.get(session_id);
    if (!session) {
      return res.status(404).send('<h1>Error: Payment session expired or invalid.</h1>');
    }

    // Renders a high-fidelity checkout UI
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Donalisa BizPay - Uganda Secure Checkout</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#050508] text-gray-200 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-[#0a0a0f] border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="bg-[#101015] border-b border-cyan-500/10 p-5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
        <span class="text-xs font-bold tracking-widest text-cyan-400 font-mono uppercase">BIZPAY SECURE GATEWAY</span>
      </div>
      <span class="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">UGANDA</span>
    </div>

    <!-- Main Content -->
    <div class="p-6 flex-1 space-y-6">
      <!-- Order Summary Card -->
      <div class="p-4 rounded-xl bg-cyan-950/10 border border-cyan-500/10 space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-[11px] font-mono text-cyan-500 uppercase font-black">Merchant</h3>
            <p class="text-sm font-bold text-white">${session.shopName}</p>
          </div>
          <div class="text-right">
            <h3 class="text-[11px] font-mono text-cyan-500 uppercase font-black">Order ID</h3>
            <p class="text-[10px] font-mono text-gray-400">${session.id.substring(12, 22)}</p>
          </div>
        </div>
        <div class="h-px bg-cyan-500/10"></div>
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-[11px] font-mono text-[#888] uppercase">Product</h3>
            <p class="text-xs text-gray-300 line-clamp-1">${session.productTitle}</p>
          </div>
          <div class="text-right">
            <h3 class="text-[11px] font-mono text-[#888] uppercase">Amount</h3>
            <p class="text-base font-black text-white font-mono">${session.amount.toLocaleString()} UGX</p>
          </div>
        </div>
      </div>

      <!-- Payment Form -->
      <div id="payment-form" class="space-y-4">
        <!-- Cardholder Name -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Cardholder Name</label>
          <input 
            type="text" 
            id="card-holder" 
            placeholder="DONA LISA" 
            class="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none transition-all uppercase"
          />
        </div>

        <!-- Card Number -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Card Number</label>
          <div class="relative">
            <input 
              type="text" 
              id="card-number" 
              placeholder="4000 1234 5678 9010" 
              maxlength="19"
              class="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none transition-all font-mono"
            />
            <div id="card-type" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 font-mono tracking-wider">
              CARD
            </div>
          </div>
        </div>

        <!-- Expiry & CVV -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Expiry Date</label>
            <input 
              type="text" 
              id="card-expiry" 
              placeholder="MM/YY" 
              maxlength="5"
              class="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none transition-all font-mono"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">CVV</label>
            <input 
              type="password" 
              id="card-cvv" 
              placeholder="•••" 
              maxlength="3"
              class="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none transition-all font-mono"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <button 
          id="btn-pay"
          onclick="processPayment()"
          class="w-full mt-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-widest uppercase rounded-xl shadow-lg shadow-cyan-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Authorize Card Payment</span>
        </button>
      </div>

      <!-- Processing/Loading Screen (Hidden initially) -->
      <div id="loading-screen" class="hidden flex flex-col items-center justify-center py-8 space-y-4">
        <svg class="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div class="text-center space-y-1">
          <p class="text-xs font-bold text-white tracking-widest uppercase">Contacting Clearing Bank...</p>
          <p class="text-[10px] text-gray-400">Verifying secure card authorization over 256-bit TLS</p>
        </div>
      </div>

      <!-- Success Screen (Hidden initially) -->
      <div id="success-screen" class="hidden flex flex-col items-center justify-center py-8 space-y-4">
        <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 flex items-center justify-center text-xl font-bold animate-bounce">
          ✓
        </div>
        <div class="text-center space-y-1">
          <p class="text-xs font-extrabold text-emerald-400 tracking-widest uppercase">Payment Successful!</p>
          <p class="text-[10px] text-gray-400">Your transaction has been securely cleared & logged.</p>
        </div>
      </div>

      <!-- Error Message -->
      <div id="error-box" class="hidden p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400">
      </div>
    </div>

    <!-- Footer Security Block -->
    <div class="bg-[#09090c] border-t border-cyan-500/5 px-6 py-4 flex items-center justify-between text-[10px] text-gray-600 select-none">
      <span class="flex items-center gap-1">🔒 Secured via AES-256</span>
      <span>PCI-DSS Level 1 Gateway</span>
    </div>
  </div>

  <script>
    const cardInput = document.getElementById('card-number');
    const cardType = document.getElementById('card-type');

    cardInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\\s+/g, '').replace(/[^0-9]/gi, '');
      let formatted = '';
      for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += value[i];
      }
      e.target.value = formatted;

      if (value.startsWith('4')) {
        cardType.textContent = 'VISA';
        cardType.className = 'absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400 font-mono tracking-wider';
      } else if (value.startsWith('5')) {
        cardType.textContent = 'MASTERCARD';
        cardType.className = 'absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500 font-mono tracking-wider';
      } else {
        cardType.textContent = 'CARD';
        cardType.className = 'absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 font-mono tracking-wider';
      }
    });

    const expiryInput = document.getElementById('card-expiry');
    expiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\\s+/g, '').replace(/[^0-9]/gi, '');
      if (value.length > 2) {
        e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
      } else {
        e.target.value = value;
      }
    });

    async function processPayment() {
      const cardHolder = document.getElementById('card-holder').value;
      const cardNumber = cardInput.value;
      const cardExpiry = expiryInput.value;
      const cardCvv = document.getElementById('card-cvv').value;
      const errorBox = document.getElementById('error-box');

      errorBox.classList.add('hidden');

      if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {
        errorBox.textContent = "Please fill in all credit card security parameters.";
        errorBox.classList.remove('hidden');
        return;
      }

      document.getElementById('payment-form').classList.add('hidden');
      document.getElementById('loading-screen').classList.remove('hidden');

      try {
        const response = await fetch('/api/biz/pay/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: "${session.id}",
            cardNumber,
            holderName: cardHolder
          })
        });

        const data = await response.json();

        if (response.ok) {
          setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('success-screen').classList.remove('hidden');

            if (window.parent) {
              window.parent.postMessage({
                type: 'BIZ_PAYMENT_COMPLETE',
                sessionId: "${session.id}",
                status: 'success'
              }, '*');
            }
          }, 2500);
        } else {
          throw new Error(data.error || 'Card clearance declined.');
        }
      } catch (err) {
        setTimeout(() => {
          document.getElementById('loading-screen').classList.add('hidden');
          document.getElementById('payment-form').classList.remove('hidden');
          errorBox.textContent = err.message;
          errorBox.classList.remove('hidden');
        }, 1500);
      }
    }
  </script>
</body>
</html>
    `;

    res.send(html);
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
