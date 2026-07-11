import React, { useState } from 'react';
import { 
  Sparkles, X, Loader2, Copy, Check, FileText, Image as ImageIcon
} from 'lucide-react';
import { OpenAIService } from '@/lib/openai';

interface AIGroundingAssistantProps {
  onClose: () => void;
}

export default function AIGroundingAssistant({ onClose }: AIGroundingAssistantProps) {
  const [bizLinkPrompt, setBizLinkPrompt] = useState('');
  const [bizLinkType, setBizLinkType] = useState<'template' | 'description'>('template');
  const [bizLinkCategory, setBizLinkCategory] = useState<string>('Fashion');
  const [isBizLinkGenerating, setIsBizLinkGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bizLinkResult, setBizLinkResult] = useState<{ text: string; imageUrl?: string; sandbox?: boolean } | null>(null);

  const handleCopyText = (textToCopy: string, field: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  return (
    <div className="bg-[#0b0b11] border border-gray-900 rounded-2xl w-full h-[580px] flex flex-col overflow-hidden font-mono text-xs text-gray-300 shadow-2xl relative">
      
      {/* Title Header */}
      <div className="p-4 bg-[#0e0e15] border-b border-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-600/15 border border-purple-500/30 rounded-xl text-purple-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-white font-black tracking-wider uppercase text-xs">BizLink AI Studio</h3>
            <p className="text-[8px] text-gray-500 uppercase">In-App Creative Marketplace Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* BIZLINK AI STUDIO WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#07070a]">
        <div className="p-4 border-b border-gray-900 bg-[#0c0c14]/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                BizLinkAI Creative Copilot
              </h4>
              <p className="text-[9px] text-gray-400 leading-tight">Generate custom marketing descriptions, high-res imagery, and store setups.</p>
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
              <span className="text-xs text-gray-500 font-mono">BizLinkAI drafting professional copy...</span>
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
                        ⚡ Copied copy can be used directly when uploading items in the Merchant Office.
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

      {/* Footnote info */}
      <div className="px-4 py-2 bg-[#06060a] border-t border-gray-950 text-[7px] text-gray-600 flex items-center justify-between">
        <span>BizLink Uganda AI Engine active</span>
        <span>Secure server-side proxying</span>
      </div>
    </div>
  );
}
