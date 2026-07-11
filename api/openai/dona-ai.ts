import type { IncomingMessage, ServerResponse } from 'http';
import { OpenAI } from 'openai';
import { validateOpenAIKey } from '../../src/lib/aiUtils';

// Support parsing of request body manually for serverless environments
async function parseBody(req: any): Promise<any> {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

export default async function handler(req: any, res: any) {
  if (typeof res.status !== 'function') {
    res.status = (statusCode: number) => {
      res.statusCode = statusCode;
      return res;
    };
  }
  if (typeof res.json !== 'function') {
    res.json = (body: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
      return res;
    };
  }

  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid parameter: messages' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const validation = validateOpenAIKey(apiKey);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
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

    const openai = new OpenAI({ apiKey: apiKey!.trim() });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages
      ],
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || '';
    return res.status(200).json({ success: true, text: reply });
  } catch (err: any) {
    console.warn("OpenAI DONA AI serverless call failed, activating Kampala sandbox:", err.message || err);
    
    let lastMsg = '';
    try {
      const body = await parseBody(req);
      const msgs = body.messages || [];
      lastMsg = (msgs[msgs.length - 1]?.content || '').toLowerCase();
    } catch (e) {}

    let replyText = '';
    if (lastMsg.includes('offline') || lastMsg.includes('download') || lastMsg.includes('stream') || lastMsg.includes('data')) {
      replyText = "Hello! I am DONA AI, responding from our Kampala operational sandbox. 🎬\n\nOur offline playback works via specialized local database streams! Any movie or song you download is saved directly to your browser's IndexedDB ledger. This lets you turn off your Wi-Fi or mobile data completely and play your items with **zero buffering and 100% zero data charges**! Try downloading a clip and heading offline to test it!";
    } else if (lastMsg.includes('bizlink') || lastMsg.includes('merchant') || lastMsg.includes('map') || lastMsg.includes('shop')) {
      replyText = "Hello! I am DONA AI. 🛍️\n\n**BizLink Uganda** is our dedicated commerce module. It lets local Ugandan business owners apply for storefronts, choose visual niches (Electronics, Groceries, Restaurants, etc.), and list their products. Plus, we've integrated a real-time **Shop Map View** so visitors can see where merchants are physically located in Kampala. If you're a business owner, open BizLink and tap 'Register Store'!";
    } else {
      replyText = `Welcome to DONALISA! I am DONA AI, your resident assistant.

Since we are currently running in Sandbox Mode, here is some key information about us:
- **Cinematic Streams**: High-fidelity media, completely downloadable for offline playback using local storage.
- **BizLink Uganda**: A powerful local trade gateway featuring visual merchant templates, stock control dashboards, and real-time interactive mapping coordinates.

*(Tip: To enable live GPT-4o intelligence, make sure to configure the OPENAI_API_KEY environment variable in your Vercel Dashboard.)*`;
    }

    return res.status(200).json({ success: true, text: replyText });
  }
}
