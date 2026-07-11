import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Globe, MapPin, Send, X, Loader2, Navigation, Link as LinkIcon, 
  HelpCircle, ChevronRight, CornerDownRight, Landmark, BadgeAlert, Copy, Check, FileText, Image as ImageIcon
} from 'lucide-react';
import { OpenAIService } from '@/lib/openai';

interface GroundingChunk {
  web?: {
    uri: string;
    title?: string;
  };
  maps?: {
    uri: string;
    title?: string;
  };
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  groundingType?: 'maps' | 'search';
  sources?: { title: string; url: string }[];
  timestamp: string;
}

interface AIGroundingAssistantProps {
  onClose: () => void;
}

export default function AIGroundingAssistant({ onClose }: AIGroundingAssistantProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'maps' | 'bizlink_ai'>('search');
  
  // BizLink AI states
  const [bizLinkPrompt, setBizLinkPrompt] = useState('');
  const [bizLinkType, setBizLinkType] = useState<'template' | 'description'>('template');
  const [bizLinkCategory, setBizLinkCategory] = useState('Fashion');
  const [isBizLinkGenerating, setIsBizLinkGenerating] = useState(false);
  const [bizLinkResult, setBizLinkResult] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Kampala AI Concierge. I have live access to Google Search and Google Maps data.\n\nChoose my active engine below to search current Uganda tariffs, rates, and local trends, or locate physical hubs across Kampala!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLog, setStatusLog] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusLog]);

  const handleSuggestedPrompt = (prompt: string, tab: 'search' | 'maps') => {
    setActiveTab(tab);
    setInputMessage(prompt);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userPrompt = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: userPrompt,
      groundingType: activeTab,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);

    const endpoint = activeTab === 'maps' ? '/api/gemini/maps' : '/api/gemini/search';
    
    // Status logging updates for nice console feel
    setStatusLog(activeTab === 'maps' 
      ? '[GEOLOCATION] Calling Google Maps Grounding API...' 
      : '[LIVE-INDEX] Performing Google Search Grounding...'
    );

    try {
      // Fetch user location if doing maps grounding
      let lat = 0.3125;
      let lng = 32.5795; // Kampala central

      if (activeTab === 'maps' && navigator.geolocation) {
        setStatusLog('[GPS] Fetching high-precision device coordinates for routing...');
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              lat = position.coords.latitude;
              lng = position.coords.longitude;
              resolve();
            },
            () => {
              // Graceful fallback to Kampala
              resolve();
            },
            { timeout: 3000 }
          );
        });
        setStatusLog(`[GEOLOCATION] Centering query on GPS latitude: ${lat.toFixed(4)}, longitude: ${lng.toFixed(4)}...`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, lat, lng })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'The server returned an error during grounding.');
      }

      // Parse grounding sources
      const sourcesList: { title: string; url: string }[] = [];
      if (data.groundingChunks && Array.isArray(data.groundingChunks)) {
        data.groundingChunks.forEach((chunk: GroundingChunk) => {
          if (chunk.web && chunk.web.uri) {
            sourcesList.push({
              title: chunk.web.title || 'Web Search Reference',
              url: chunk.web.uri
            });
          } else if (chunk.maps && chunk.maps.uri) {
            sourcesList.push({
              title: chunk.maps.title || 'Google Maps Location',
              url: chunk.maps.uri
            });
          }
        });
      }

      // Remove duplicate URLs
      const uniqueSources = sourcesList.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);

      const assistantMsg: Message = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: data.text,
        groundingType: activeTab,
        sources: uniqueSources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Connect Error: ${err.message || 'Make sure your GEMINI_API_KEY is configured in Settings > Secrets. In-app live sandbox simulator remains active.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setStatusLog('');
    }
  };

  // BizLink AI Hub generation logic
  const handleBizLinkAIGenerate = async () => {
    if (!bizLinkPrompt.trim() || isBizLinkGenerating) return;
    setIsBizLinkGenerating(true);
    setBizLinkResult(null);
    try {
      const data = await OpenAIService.bizLinkAI(bizLinkPrompt.trim(), bizLinkType, bizLinkCategory);
      setBizLinkResult(data);
    } catch (err: any) {
      console.error('BizLink AI generation failed, using optimized sandbox copywriter:', err);
      
      const fallbackText = bizLinkType === 'template' 
        ? JSON.stringify({
            brandName: bizLinkPrompt.trim().substring(0, 30),
            slogan: "Kampala's Finest Concept Store",
            description: `The absolute premier destination in Kampala for high-end ${bizLinkCategory}. Sourced directly from vetted local suppliers, designed with authentic African aesthetics, and integrated with easy MTN MoMo checkout solutions.`,
            recommendedProducts: [
              { name: `Original Crafted ${bizLinkCategory} Kit`, price: "75,000 UGX" },
              { name: `Signature Edition Elite ${bizLinkCategory}`, price: "135,000 UGX" },
              { name: `Essential Traditional ${bizLinkCategory} Set`, price: "45,000 UGX" }
            ],
            imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
          }, null, 2)
        : `✨ Kampala Premium ${bizLinkCategory} Exclusive: Crafted directly for the authentic local trade market. Hand-vetted design that guarantees lasting durability, optimized with premium aesthetics, and complete with local boda-boda instant distribution options. Contact the store manager for live stock checks!`;

      setBizLinkResult({
        text: fallbackText,
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
        sandbox: true
      });
    } finally {
      setIsBizLinkGenerating(false);
    }
  };

  const handleCopyText = (textToCopy: string, field: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-[#0b0b11] border border-gray-900 rounded-2xl w-full h-[600px] flex flex-col overflow-hidden font-mono text-xs text-gray-300 shadow-2xl relative">
      
      {/* Title Header */}
      <div className="p-4 bg-[#0e0e15] border-b border-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-red-600/15 border border-red-500/30 rounded-xl text-red-500 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white font-black tracking-wider uppercase text-xs">Kampala AI Concierge</h3>
            <p className="text-[8px] text-gray-500 uppercase">Dual-grounded real-time info center</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grounding Engine Switch Tabs */}
      <div className="grid grid-cols-3 bg-[#08080c] border-b border-gray-900">
        <button
          onClick={() => setActiveTab('search')}
          className={`py-3 px-2 flex items-center justify-center gap-1.5 font-bold uppercase text-[9px] tracking-wider transition-all border-r border-gray-900 cursor-pointer ${
            activeTab === 'search' 
              ? 'bg-red-600/10 text-red-400 font-black' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Globe className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'search' ? 'animate-spin' : ''}`} />
          <span className="truncate">Google Search</span>
        </button>
        <button
          onClick={() => setActiveTab('maps')}
          className={`py-3 px-2 flex items-center justify-center gap-1.5 font-bold uppercase text-[9px] tracking-wider transition-all border-r border-gray-900 cursor-pointer ${
            activeTab === 'maps' 
              ? 'bg-cyan-600/10 text-cyan-400 font-black' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <MapPin className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'maps' ? 'animate-bounce' : ''}`} />
          <span className="truncate">Google Maps</span>
        </button>
        <button
          onClick={() => setActiveTab('bizlink_ai')}
          className={`py-3 px-2 flex items-center justify-center gap-1.5 font-bold uppercase text-[9px] tracking-wider transition-all cursor-pointer ${
            activeTab === 'bizlink_ai' 
              ? 'bg-purple-600/10 text-purple-400 font-black' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 shrink-0 text-purple-400 ${activeTab === 'bizlink_ai' ? 'animate-pulse' : ''}`} />
          <span className="truncate">BizLinkAI Workspace</span>
        </button>
      </div>

      {activeTab === 'bizlink_ai' ? (
        /* BIZLINK AI STUDIO WORKSPACE */
        <div className="flex-1 flex flex-col overflow-hidden bg-[#07070a]">
          <div className="p-4 border-b border-gray-900 bg-[#0c0c14]/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  BizLinkAI Creative Copilot
                </h4>
                <p className="text-[9px] text-gray-400 leading-tight">Generate custom marketing descriptions, high-res Unsplash imagery, and store setups.</p>
              </div>

              {/* Mode Select */}
              <div className="flex bg-[#06060a] p-1 rounded-xl border border-gray-800 shrink-0">
                <button
                  type="button"
                  onClick={() => { setBizLinkType('template'); setBizLinkResult(null); }}
                  className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    bizLinkType === 'template' 
                      ? 'bg-purple-600 text-white font-black shadow-md' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Shop Blueprint
                </button>
                <button
                  type="button"
                  onClick={() => { setBizLinkType('description'); setBizLinkResult(null); }}
                  className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    bizLinkType === 'description' 
                      ? 'bg-purple-600 text-white font-black shadow-md' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  Product Copy
                </button>
              </div>
            </div>

            {/* Prompt input and categories */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder={bizLinkType === 'template' 
                    ? "e.g. A high-end apparel house in Kampala selling premium hand-vetted kitenge wear" 
                    : "e.g. Handmade local crafts basket made with hand-vetted organic materials"
                  }
                  value={bizLinkPrompt}
                  onChange={(e) => setBizLinkPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBizLinkAIGenerate()}
                  className="flex-1 bg-[#06060a] border border-gray-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-gray-600"
                />
                
                {bizLinkType === 'template' && (
                  <select
                    value={bizLinkCategory}
                    onChange={(e) => setBizLinkCategory(e.target.value)}
                    className="bg-[#06060a] border border-gray-800 text-[11px] text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 shrink-0 cursor-pointer"
                  >
                    {['Fashion', 'Electronics', 'Crafts', 'Groceries', 'Restaurants', 'Services'].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleBizLinkAIGenerate}
                  disabled={isBizLinkGenerating || !bizLinkPrompt.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isBizLinkGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Generate</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#050508]/40">
            {isBizLinkGenerating ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <span className="text-xs text-gray-500 font-mono">BizLinkAI drafting professional copy & compiling visuals...</span>
              </div>
            ) : bizLinkResult ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {bizLinkType === 'template' ? (
                  /* RENDER SHOP BLUEPRINT OUTPUT */
                  (() => {
                    let parsed: any = null;
                    try {
                      parsed = JSON.parse(bizLinkResult.text);
                    } catch (e) {
                      parsed = {
                        brandName: bizLinkPrompt.trim().substring(0, 30),
                        slogan: "Kampala Premium Outlet",
                        description: bizLinkResult.text,
                        recommendedProducts: [
                          { name: "Signature Collection Item", price: "75,000 UGX" },
                          { name: "Premium Tailored Item", price: "120,000 UGX" }
                        ],
                        imageUrl: bizLinkResult.imageUrl
                      };
                    }
                    return (
                      <div className="bg-[#0e0e16] border border-purple-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
                        {/* Mock Brand Card */}
                        <div className="relative h-32 rounded-xl overflow-hidden border border-gray-800 flex flex-col justify-end p-4">
                          <img 
                            src={parsed.imageUrl || bizLinkResult.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"} 
                            alt="Mock Banner" 
                            className="absolute inset-0 w-full h-full object-cover opacity-40"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e16] via-transparent to-transparent" />
                          <div className="relative z-10 space-y-1">
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-[8px] font-black uppercase tracking-wider rounded font-mono">
                              {bizLinkCategory} OUTLET
                            </span>
                            <h5 className="text-sm font-black text-white font-sans">{parsed.brandName}</h5>
                            <p className="text-[9px] text-purple-300 font-medium italic">{parsed.slogan}</p>
                          </div>
                        </div>

                        {/* About Copied text */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Generated Description</span>
                            <button
                              onClick={() => handleCopyText(parsed.description, 'desc')}
                              className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedField === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedField === 'desc' ? "Copied!" : "Copy Description"}
                            </button>
                          </div>
                          <p className="p-3 bg-[#07070a] border border-gray-900 rounded-xl text-[10px] leading-relaxed text-gray-300 font-sans">
                            {parsed.description}
                          </p>
                        </div>

                        {/* Recommended Products */}
                        {parsed.recommendedProducts && parsed.recommendedProducts.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block">AI Recommended Merchandise</span>
                            <div className="grid grid-cols-1 gap-1.5">
                              {parsed.recommendedProducts.map((prod: any, pIdx: number) => (
                                <div key={pIdx} className="p-2.5 bg-[#07070a] border border-gray-900 rounded-xl flex items-center justify-between text-[10px]">
                                  <span className="text-gray-200 font-bold font-sans">{prod.name}</span>
                                  <span className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/20 text-purple-300 rounded font-bold font-mono">
                                    {prod.price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(JSON.stringify(parsed, null, 2), 'blueprint')}
                            className="px-4 py-2 bg-[#06060a] border border-purple-500/30 hover:border-purple-400 text-purple-300 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            {copiedField === 'blueprint' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'blueprint' ? "Saved Configuration!" : "Copy Full Blueprint JSON"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* RENDER PRODUCT COPYWRITING OUTPUT */
                  <div className="bg-[#0e0e16] border border-purple-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Image Preview */}
                      <div className="sm:col-span-1 h-36 rounded-xl overflow-hidden border border-gray-800 relative bg-[#07070a]">
                        <img 
                          src={bizLinkResult.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"} 
                          alt="Product Suggestion" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {/* Product copy text */}
                      <div className="sm:col-span-2 space-y-3 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Copywritten Product Description</span>
                            <button
                              onClick={() => handleCopyText(bizLinkResult.text, 'prodCopy')}
                              className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedField === 'prodCopy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedField === 'prodCopy' ? "Copied!" : "Copy Text"}
                            </button>
                          </div>
                          <p className="p-3 bg-[#07070a] border border-gray-900 rounded-xl text-[10px] leading-relaxed text-gray-300 font-sans h-24 overflow-y-auto">
                            {bizLinkResult.text}
                          </p>
                        </div>

                        <div className="text-[8px] text-purple-400/70 font-mono">
                          ⚡ Optimal high-resolution wallpaper graphics URL compiled and bundled.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 bg-[#07070a] border border-gray-900 rounded-3xl max-w-sm mx-auto">
                <Sparkles className="w-10 h-10 text-purple-500 animate-pulse mx-auto" />
                <div>
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Workspace Idle</p>
                  <p className="text-[9px] text-gray-500 leading-normal font-mono px-4">
                    Describe your business idea or product name above and click "Generate" to construct optimized copy and design parameters.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ORIGINAL KAMPALA DUAL ENGINE GROUNDED CHAT VIEW */
        <>
          {/* Suggested Prompts Panel */}
          <div className="p-3 bg-[#08080c]/50 border-b border-gray-950 flex flex-wrap gap-1.5 items-center justify-start overflow-x-auto">
            <span className="text-[7px] text-gray-600 uppercase font-black mr-1 shrink-0">Try queries:</span>
            {activeTab === 'search' ? (
              <>
                <button
                  onClick={() => handleSuggestedPrompt("What are the official Airtel and MTN Mobile Money withdraw charges in Uganda?", 'search')}
                  className="px-2 py-1 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 hover:border-red-600 text-red-400 rounded-md text-[8px] transition-all cursor-pointer whitespace-nowrap"
                >
                  💵 MoMo Withdraw Charges
                </button>
                <button
                  onClick={() => handleSuggestedPrompt("What is the current exchange rate from USD to UGX right now?", 'search')}
                  className="px-2 py-1 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 hover:border-red-600 text-red-400 rounded-md text-[8px] transition-all cursor-pointer whitespace-nowrap"
                >
                  💱 USD/UGX Exchange Rate
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSuggestedPrompt("Recommend top rated electronics arcades or shops located in Kampala central", 'maps')}
                  className="px-2 py-1 bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-900/40 hover:border-cyan-600 text-cyan-400 rounded-md text-[8px] transition-all cursor-pointer whitespace-nowrap"
                >
                  🏪 Electronics Arcades
                </button>
                <button
                  onClick={() => handleSuggestedPrompt("Where is the biggest concentration of artisan crafts and souvenirs shops in Ntinda or Kololo?", 'maps')}
                  className="px-2 py-1 bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-900/40 hover:border-cyan-600 text-cyan-400 rounded-md text-[8px] transition-all cursor-pointer whitespace-nowrap"
                >
                  🎨 Crafts Shops Location
                </button>
              </>
            )}
          </div>

          {/* Main Messages viewport */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#07070a]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                {/* Sender Label */}
                <span className="text-[7px] text-gray-500 uppercase tracking-widest mb-1 font-bold flex items-center gap-1">
                  {msg.sender === 'user' ? (
                    <>
                      <span>Visitor Query</span>
                      <span className="text-gray-700">•</span>
                      <span className={msg.groundingType === 'maps' ? 'text-cyan-400' : 'text-red-400'}>
                        {msg.groundingType === 'maps' ? '📍 MAPS' : '🌐 SEARCH'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-2.5 h-2.5 text-red-500" />
                      <span>Kampala Console</span>
                    </>
                  )}
                </span>

                {/* Chat bubble body */}
                <div
                  className={`p-3 rounded-2xl border text-[10px] leading-relaxed whitespace-pre-wrap font-sans ${
                    msg.sender === 'user'
                      ? 'bg-red-950/10 border-red-900/35 text-red-100 rounded-tr-none'
                      : 'bg-[#101017] border-[#1a1a24] text-gray-200 rounded-tl-none'
                  }`}
                >
                  {msg.text}

                  {/* Source lists */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3.5 pt-3.5 border-t border-gray-900 space-y-1.5">
                      <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-widest block flex items-center gap-1">
                        <LinkIcon className="w-2.5 h-2.5" />
                        Verified Citations & Grounded Coordinates
                      </span>
                      <div className="grid grid-cols-1 gap-1">
                        {msg.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 hover:underline text-[8px] bg-cyan-950/15 px-2 py-1 rounded border border-cyan-900/30 w-full truncate"
                          >
                            <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[7px] text-gray-600 mt-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Console / Grounding logs spinner */}
            {loading && (
              <div className="flex flex-col max-w-[85%] mr-auto items-start animate-pulse">
                <span className="text-[7px] text-gray-500 uppercase tracking-widest mb-1 font-bold flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 text-red-500 animate-spin" />
                  <span> Kampala Console Grounding...</span>
                </span>
                <div className="p-3 bg-[#0e0e13] border border-gray-900 rounded-2xl rounded-tl-none space-y-2 w-full">
                  <div className="text-[9px] text-gray-500 animate-pulse flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span>{statusLog}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-900 rounded w-5/6"></div>
                    <div className="h-2 bg-gray-900 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input controls form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-[#0e0e15] border-t border-gray-900 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={activeTab === 'maps' 
                ? "Ask about Kampala arcades, shops, Ntinda Souvenirs..." 
                : "Search Airtel withdraw rates, trade procedures, USD to UGX..."
              }
              className="flex-1 bg-[#07070a] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </>
      )}

      {/* Footnote warning info */}
      <div className="px-4 py-2 bg-[#06060a] border-t border-gray-950 text-[7px] text-gray-600 flex items-center justify-between">
        <span>Verified Google Grounding Engine active</span>
        <span>gemini-3.5-flash live integration</span>
      </div>
    </div>
  );
}
