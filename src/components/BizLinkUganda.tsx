import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Filter, ShieldAlert, FileCheck2, Briefcase, 
  ArrowRight, Sparkles, MessageCircle, Heart, Star, BadgeCheck, MapPin, 
  User, RefreshCw, Layers, Loader2, X 
} from 'lucide-react';
import { db, auth } from '@/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Shop } from './bizlink/MarketplaceTypes';
import ShopTemplateView from './bizlink/ShopTemplateView';
import MerchantDashboard from './bizlink/MerchantDashboard';
import AdminDashboard from './bizlink/AdminDashboard';
import MerchantApplicationModal from './bizlink/MerchantApplicationModal';
import ChatCenter from './bizlink/ChatCenter';

interface BizLinkUgandaProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  onClose?: () => void;
}

export default function BizLinkUganda({
  currentUserId = 'anonymous',
  currentUserName = 'Visitor',
  currentUserEmail = '',
  onClose
}: BizLinkUgandaProps) {
  // Navigation & View states
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<'none' | 'merchant' | 'admin'>('none');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showDirectChatOverlay, setShowDirectChatOverlay] = useState(false);

  // Chat direct target info
  const [chatTarget, setChatTarget] = useState<{ merchantId: string; shopId: string; shopName: string } | null>(null);

  // Database list of shops
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // User's own merchant shop if they have one
  const [myShop, setMyShop] = useState<Shop | null>(null);

  // Identify if user is Super Admin
  const isSuperAdmin = currentUserEmail === 'ssakalivingstone25@gmail.com';

  // 1. Fetch live shops and user's owned shop
  useEffect(() => {
    const q = query(collection(db, 'biz_shops'), where('status', '==', 'OCCUPIED'));
    const unsubscribeAll = onSnapshot(q, (snapshot) => {
      const fetched: Shop[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Shop);
      });
      setAllShops(fetched);
      setLoading(false);

      // Check if current logged-in user owns one of these shops
      if (currentUserId && currentUserId !== 'anonymous') {
        const owned = fetched.find(s => s.ownerId === currentUserId);
        if (owned) {
          setMyShop(owned);
        } else {
          setMyShop(null);
        }
      }
    });

    return () => unsubscribeAll();
  }, [currentUserId]);

  // Open direct chat helper
  const handleOpenDirectChat = (merchantId: string, shopId: string, shopName: string) => {
    setChatTarget({ merchantId, shopId, shopName });
    setShowDirectChatOverlay(true);
  };

  // Filter logic
  const filteredShops = allShops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          shop.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if category is match (we can match description or template style)
    const matchesCategory = selectedCategory === 'all' || 
                            shop.description.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                            shop.name.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full bg-[#050508] border border-gray-900 rounded-3xl p-6 shadow-2xl relative animate-in fade-in duration-300">
      
      {/* 1. VIEW CONDITIONAL SWITCHES */}
      {selectedShop ? (
        <ShopTemplateView
          shop={selectedShop}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          onBack={() => setSelectedShop(null)}
          onOpenChat={handleOpenDirectChat}
        />
      ) : activeDashboard === 'admin' && isSuperAdmin ? (
        <AdminDashboard 
          currentUserId={currentUserId}
          onBackToMarketplace={() => setActiveDashboard('none')}
        />
      ) : activeDashboard === 'merchant' && myShop ? (
        <MerchantDashboard
          userId={currentUserId}
          userName={currentUserName}
          shop={myShop}
          onBackToMarketplace={() => setActiveDashboard('none')}
        />
      ) : (
        /* TOWN GENERAL CATALOG */
        <div className="space-y-6">
          {/* Header Town Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#14141d] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-cyan-400" />
                <h1 className="text-sm font-black font-mono uppercase tracking-widest text-white sm:text-base">
                  Kampala Digital Arcade
                </h1>
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[8px] font-mono rounded-full font-black tracking-widest uppercase">
                  BizLink Uganda
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                A structured commercial town renting digital spaces to approved businessman tenants.
              </p>
            </div>

            {/* Dashboard and application links */}
            <div className="flex flex-wrap gap-2.5 items-center">
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveDashboard('admin')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs font-mono tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-500/15"
                >
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                  <span>Landlord Admin</span>
                </button>
              )}

              {myShop ? (
                <button
                  onClick={() => setActiveDashboard('merchant')}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs font-mono tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-500/15"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Merchant Office</span>
                </button>
              ) : (
                currentUserId && currentUserId !== 'anonymous' && (
                  <button
                    onClick={() => setShowApplicationModal(true)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs font-mono tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-yellow-500/15 animate-pulse"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Become a Merchant</span>
                  </button>
                )
              )}

              {currentUserId && currentUserId !== 'anonymous' && (
                <button
                  onClick={() => {
                    setChatTarget(null);
                    setShowDirectChatOverlay(true);
                  }}
                  className="px-4 py-2 bg-[#12121a] hover:bg-gray-800 text-cyan-400 border border-gray-800 rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Inbox</span>
                </button>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-400 border border-rose-500/20 rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/5"
                  title="Return to Main Portal"
                >
                  <X className="w-4 h-4" />
                  <span>Exit Arcade</span>
                </button>
              )}
            </div>
          </div>

          {/* Search bar & Category select */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Kampala stores or product categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-gray-900 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1">
              {['all', 'Electronics', 'Fashion', 'Crafts', 'Groceries', 'Restaurants', 'Services'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                    selectedCategory === cat 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
                      : 'bg-transparent text-gray-500 border-gray-950 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* List of Shops */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Active Storefronts</span>
              <span className="text-[10px] font-mono text-cyan-400">{filteredShops.length} verified outlets</span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono text-gray-500">Connecting marketplace gateway...</span>
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#09090d]/30 border border-gray-900 rounded-3xl max-w-sm mx-auto">
                <Building2 className="w-12 h-12 text-gray-800 animate-pulse mx-auto" />
                <div>
                  <p className="text-xs font-bold text-gray-300">No Shops Found</p>
                  <p className="text-[10px] text-gray-500 leading-normal font-mono">
                    Search query returned empty. Switch filters or register your own storefront to start trading.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredShops.map((shop) => (
                  <div 
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
                    className="p-5 rounded-3xl bg-[#08080c]/80 hover:bg-[#0c0c12]/80 border border-gray-950 hover:border-cyan-500/20 transition-all flex justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex gap-4 items-start min-w-0">
                      <img 
                        src={shop.logoUrl} 
                        alt={shop.name} 
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-gray-900 shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                            {shop.name}
                          </h3>
                          {shop.verified && (
                            <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{shop.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[9px] text-gray-600 font-mono">
                          <span className="flex items-center gap-0.5 text-yellow-400">
                            <Star className="w-3 h-3 fill-current" /> {shop.rating}
                          </span>
                          <span>• {shop.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end shrink-0">
                      <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-mono font-bold tracking-wide">
                        ENTER
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. REGISTRATION APPLICATION MODAL */}
      {showApplicationModal && currentUserId && (
        <MerchantApplicationModal
          userId={currentUserId}
          userName={currentUserName}
          userEmail={currentUserEmail}
          onClose={() => setShowApplicationModal(false)}
          onApplicationSuccess={() => {
            setShowApplicationModal(false);
            setActiveDashboard('none');
          }}
        />
      )}

      {/* 3. DIRECT CHAT OVERLAY BOX */}
      {showDirectChatOverlay && currentUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-4xl w-full">
            <ChatCenter
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              isMerchantView={activeDashboard === 'merchant'}
              onClose={() => setShowDirectChatOverlay(false)}
              targetShopId={chatTarget?.shopId}
              targetMerchantId={chatTarget?.merchantId}
              targetShopName={chatTarget?.shopName}
            />
          </div>
        </div>
      )}

    </div>
  );
}
