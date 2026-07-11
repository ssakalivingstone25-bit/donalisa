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
    const { prompt, type, category } = body;
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

    const apiKey = process.env.OPENAI_API_KEY;
    const validation = validateOpenAIKey(apiKey);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const openai = new OpenAI({ apiKey: apiKey!.trim() });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || '';
    return res.status(200).json({ success: true, text: reply });
  } catch (err: any) {
    console.warn("OpenAI BIZLINK AI serverless call failed, activating Kampala sandbox:", err.message || err);

    let body: any = {};
    try {
      body = await parseBody(req);
    } catch (e) {}
    const { prompt = '', type = 'custom', category = 'Retail' } = body;

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

    return res.status(200).json({
      success: true,
      sandbox: true,
      text: type === 'template' || type === 'description' ? JSON.stringify(responseObj) : responseObj.text,
      imageUrl: imageSuggestion
    });
  }
}
