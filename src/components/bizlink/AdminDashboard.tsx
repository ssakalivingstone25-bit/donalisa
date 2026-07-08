import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Building2, Users, FileCheck2, BarChart3, Plus, Edit2, 
  Trash2, Sparkles, Check, X, ShieldX, Wallet2, Loader2, ListCollapse 
} from 'lucide-react';
import { db } from '@/firebase/config';
import { 
  collection, query, onSnapshot, doc, addDoc, 
  updateDoc, deleteDoc, setDoc, getDocs 
} from 'firebase/firestore';
import { ShopTemplate, MerchantApplication, Shop, Order } from './MarketplaceTypes';

interface AdminDashboardProps {
  currentUserId: string;
  onBackToMarketplace?: () => void;
}

export default function AdminDashboard({
  currentUserId,
  onBackToMarketplace
}: AdminDashboardProps) {
  const [templates, setTemplates] = useState<ShopTemplate[]>([]);
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'templates' | 'shops'>('overview');

  // Template creation modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempDesc, setTempDesc] = useState('');
  const [tempBanner, setTempBanner] = useState('');
  const [tempLogo, setTempLogo] = useState('');
  const [tempColor, setTempColor] = useState('#06b6d4');
  const [tempHours, setTempHours] = useState('08:00 AM - 09:00 PM');
  const [tempLoc, setTempLoc] = useState('Kampala Arcade, Block C');
  const [savingTemp, setSavingTemp] = useState(false);

  // Load Real-time Data
  useEffect(() => {
    // 1. Templates
    const unsubscribeTemps = onSnapshot(collection(db, 'shop_templates'), (snapshot) => {
      const fetched: ShopTemplate[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as ShopTemplate);
      });
      setTemplates(fetched);
    });

    // 2. Applications
    const unsubscribeApps = onSnapshot(collection(db, 'merchant_applications'), (snapshot) => {
      const fetched: MerchantApplication[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as MerchantApplication);
      });
      // Sort: pending first, then newest
      fetched.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setApplications(fetched);
    });

    // 3. Occupied / Created Shops
    const unsubscribeShops = onSnapshot(collection(db, 'biz_shops'), (snapshot) => {
      const fetched: Shop[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Shop);
      });
      setShops(fetched);
      setLoading(false);
    });

    // 4. Platform Orders
    const unsubscribeOrders = onSnapshot(collection(db, 'biz_orders'), (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Order);
      });
      setOrders(fetched);
    });

    return () => {
      unsubscribeTemps();
      unsubscribeApps();
      unsubscribeShops();
      unsubscribeOrders();
    };
  }, []);

  // Create new shop template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim() || !tempDesc.trim() || !tempBanner.trim()) return;

    setSavingTemp(true);
    try {
      await addDoc(collection(db, 'shop_templates'), {
        name: tempName.trim(),
        description: tempDesc.trim(),
        bannerUrl: tempBanner.trim(),
        logoUrl: tempLogo.trim() || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6',
        themeColor: tempColor,
        businessHours: tempHours,
        location: tempLoc
      });

      // Reset
      setTempName('');
      setTempDesc('');
      setTempBanner('');
      setTempLogo('');
      setTempColor('#06b6d4');
      setShowTemplateModal(false);
    } catch (err) {
      console.error("Error creating template:", err);
    } finally {
      setSavingTemp(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this reusable Shop template? This will not destroy already assigned stores.")) return;
    try {
      await deleteDoc(doc(db, 'shop_templates', id));
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  // Approve Application
  const handleApproveApplication = async (appId: string) => {
    try {
      await updateDoc(doc(db, 'merchant_applications', appId), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error approving merchant:", err);
    }
  };

  // Reject Application
  const handleRejectApplication = async (appId: string) => {
    try {
      await updateDoc(doc(db, 'merchant_applications', appId), {
        status: 'rejected'
      });
    } catch (err) {
      console.error("Error rejecting application:", err);
    }
  };

  // Transfer template & deploy live Shop to merchant
  const handleAssignTemplate = async (app: MerchantApplication, template: ShopTemplate) => {
    const confirmAssign = window.confirm(`Assign "${template.name}" storefront template to ${app.businessName} owned by ${app.userName}?`);
    if (!confirmAssign) return;

    try {
      const shopId = `shop_${app.userId}`;

      // Create live shop record
      await setDoc(doc(db, 'biz_shops', shopId), {
        id: shopId,
        templateId: template.id,
        status: 'OCCUPIED',
        ownerId: app.userId,
        ownerName: app.userName,
        ownerEmail: app.userEmail,
        name: app.businessName,
        description: app.businessDescription,
        bannerUrl: template.bannerUrl,
        logoUrl: template.logoUrl,
        verified: true,
        rating: 5,
        followerCount: 0,
        followers: [],
        businessHours: template.businessHours,
        location: template.location,
        socialLinks: { whatsapp: app.whatsappNumber },
        yearsOnPlatform: 1,
        responseRate: 100,
        responseTime: 'within 5 minutes',
        totalSales: 0,
        satisfactionRate: 100,
        createdAt: new Date().toISOString()
      });

      // Mark application as linked
      await updateDoc(doc(db, 'merchant_applications', app.id), {
        assignedShopId: shopId
      });

      alert(`Success! Store of ${app.businessName} initialized and allocated.`);
    } catch (err) {
      console.error("Error transferring shop template:", err);
    }
  };

  // Suspend shop
  const handleToggleShopState = async (shop: Shop) => {
    const nextStatus = shop.status === 'OCCUPIED' ? 'SUSPENDED' : 'OCCUPIED';
    try {
      await updateDoc(doc(db, 'biz_shops', shop.id), { status: nextStatus });
    } catch (err) {
      console.error("Error updating shop status:", err);
    }
  };

  // Calculations
  const rentalPaymentsCount = applications.filter(a => a.status === 'paid' || a.assignedShopId).length;
  const grossPlatformEarnings = rentalPaymentsCount * 100000;

  return (
    <div className="space-y-6">
      {/* Top Header Navigation Bar */}
      <div className="flex items-center justify-between bg-[#09090d] border border-[#1a1a24] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-purple-400 animate-pulse" />
          <div>
            <h2 className="text-sm font-black text-white font-mono uppercase tracking-wider">Landlord Administration</h2>
            <p className="text-[10px] text-purple-400 font-bold font-mono tracking-widest uppercase">SUPER ADMIN MASTER DECK</p>
          </div>
        </div>
        {onBackToMarketplace && (
          <button 
            onClick={onBackToMarketplace}
            className="px-4 py-2 bg-[#14141d] hover:bg-gray-800 text-purple-400 border border-gray-800 hover:border-purple-500/30 rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-500/5"
          >
            ← Exit to Marketplace
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] text-gray-200">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-64 bg-[#09090d] border border-[#1a1a24] rounded-2xl p-4 shrink-0 flex flex-col gap-1.5 self-start">
        <div className="flex items-center gap-3 px-3 py-3 border-b border-[#13131a] mb-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white truncate font-mono uppercase">Platform Owner</h4>
            <span className="text-[9px] text-purple-400 font-bold font-mono tracking-widest uppercase">SUPER ADMIN MASTER</span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'overview' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/15' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>General Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer relative ${
            activeTab === 'applications' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/15' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Tenant Applications</span>
          {applications.filter(a => a.status === 'pending').length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-500 text-[8px] flex items-center justify-center text-black font-extrabold font-mono">
              {applications.filter(a => a.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'templates' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/15' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Shop Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'shops' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/15' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Live Merchants ({shops.length})</span>
        </button>

        {onBackToMarketplace && (
          <button
            onClick={onBackToMarketplace}
            className="mt-8 flex items-center gap-2 w-full px-3 py-2 text-center text-xs font-mono text-purple-400 hover:text-white hover:underline cursor-pointer border-t border-[#13131a] pt-4"
          >
            ← Exit Administration Deck
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 bg-[#07070a]/40 border border-[#1a1a24] rounded-2xl p-6 overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="text-xs font-mono text-gray-500">Connecting on-chain ledger registries...</span>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Marketplace Analytics</h3>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full font-mono">OWNER CREDENTIALS ACTIVE</span>
                </div>

                {/* KPI metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#09090d] border border-purple-500/10 space-y-2">
                    <span className="text-[8px] font-mono text-gray-500 uppercase">Gross Platform Fees</span>
                    <p className="text-base font-black font-mono text-white">{grossPlatformEarnings.toLocaleString()} UGX</p>
                    <p className="text-[8px] text-purple-400 font-mono">100,000 UGX per merchant setup</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090d] border border-purple-500/10 space-y-2">
                    <span className="text-[8px] font-mono text-gray-500 uppercase">Active Businesses</span>
                    <p className="text-base font-black font-mono text-white">{shops.length}</p>
                    <p className="text-[8px] text-gray-500 font-mono">Assigned storefronts</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090d] border border-purple-500/10 space-y-2">
                    <span className="text-[8px] font-mono text-gray-500 uppercase">Shopper Purchases</span>
                    <p className="text-base font-black font-mono text-white">{orders.length}</p>
                    <p className="text-[8px] text-gray-500 font-mono">Total merchant orders</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090d] border border-purple-500/10 space-y-2">
                    <span className="text-[8px] font-mono text-gray-500 uppercase">Setup Templates</span>
                    <p className="text-base font-black font-mono text-white">{templates.length}</p>
                    <p className="text-[8px] text-gray-500 font-mono">Ready digital assets</p>
                  </div>
                </div>

                {/* Platform Overview Text */}
                <div className="p-4 bg-gray-900/10 rounded-xl border border-gray-900 text-xs text-gray-400 leading-relaxed font-mono">
                  📊 **Super Admin Guideline**: You are the digital landlord. Approve local traders in Kampala, verify their registration fees, and allocate beautiful ready-to-use storefront layouts to turn the virtual town into a bustling economic hub!
                </div>
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Tenant Applications</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Approve incoming business pitches and allocate templates</p>
                  </div>
                </div>

                {applications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono bg-gray-900/10 rounded-2xl border border-gray-800">
                    No merchant registration requests logged.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="p-5 rounded-2xl bg-[#09090d] border border-gray-900 space-y-3.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 text-[8px] font-mono rounded uppercase font-bold tracking-wider">
                              {app.businessType}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1.5">{app.businessName}</h4>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">by {app.userName} ({app.userEmail})</p>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-black tracking-wider ${
                            app.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                            app.status === 'approved' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' :
                            app.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                          }`}>
                            {app.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 italic">"{app.businessDescription}"</p>

                        <div className="text-[10px] font-mono text-gray-500 flex gap-4">
                          <span>WhatsApp: {app.whatsappNumber}</span>
                          <span>Submitted: {new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Controls */}
                        <div className="pt-3 border-t border-[#13131a] flex gap-3 flex-wrap">
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveApplication(app.id)}
                                className="px-3.5 py-1.5 bg-emerald-500 text-black text-[10px] font-black tracking-wider uppercase font-mono rounded-lg transition-colors hover:bg-emerald-400 cursor-pointer"
                              >
                                Approve Merchant
                              </button>
                              <button
                                onClick={() => handleRejectApplication(app.id)}
                                className="px-3 py-1.5 bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase font-mono rounded-lg transition-colors hover:bg-rose-950/40 cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.status === 'approved' && (
                            <span className="text-[10px] font-mono text-amber-500 font-bold">
                              ⌛ Awaiting 100,000 UGX Mobile Money checkout verification...
                            </span>
                          )}

                          {app.status === 'paid' && !app.assignedShopId && (
                            <div className="w-full space-y-3">
                              <p className="text-[10px] font-mono text-emerald-400 font-black">
                                ✓ Setup Fee paid. Select a premium storefront layout to assign and initialize their shop:
                              </p>
                              {templates.length === 0 ? (
                                <p className="text-[10px] text-gray-500 font-mono">
                                  No templates registered. Go to the "Shop Templates" tab to register templates.
                                </p>
                              ) : (
                                <div className="grid grid-cols-2 gap-3.5">
                                  {templates.map((temp) => (
                                    <button
                                      key={temp.id}
                                      onClick={() => handleAssignTemplate(app, temp)}
                                      className="p-3 text-left bg-[#111116] hover:bg-purple-950/20 border border-gray-800 rounded-xl transition-all flex flex-col gap-1.5 cursor-pointer"
                                    >
                                      <span className="text-xs font-bold text-white font-mono">{temp.name}</span>
                                      <span className="text-[8px] text-gray-500 truncate">{temp.description}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {app.assignedShopId && (
                            <span className="text-[10px] font-mono text-cyan-400 font-bold">
                              ✓ Shop actively established and linked to dashboard! (ID: {app.assignedShopId})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Storefront Templates</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5 font-mono">Manage reusable layouts for approved businesses</p>
                  </div>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black font-mono flex items-center gap-1.5 shadow-lg shadow-purple-500/15 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>CREATE TEMPLATE</span>
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500 font-mono bg-gray-900/10 border border-gray-800 rounded-2xl">
                    No reusable layouts configured. Create templates to assign them to merchants.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((temp) => (
                      <div key={temp.id} className="p-4 rounded-2xl bg-[#09090d] border border-gray-900 flex flex-col justify-between h-40 relative overflow-hidden">
                        {/* Background Banner Blur */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                          <img src={temp.bannerUrl} alt="" className="w-full h-full object-cover filter blur-md" />
                        </div>

                        <div className="relative z-10 space-y-1">
                          <h4 className="text-xs font-black text-white font-mono uppercase">{temp.name}</h4>
                          <p className="text-[10px] text-gray-400 line-clamp-2">{temp.description}</p>
                          <div className="text-[8px] font-mono text-gray-500 mt-2">
                            <span>Loc: {temp.location}</span>
                          </div>
                        </div>

                        <div className="relative z-10 flex justify-between items-center pt-2 border-t border-gray-900">
                          <span className="w-4 h-4 rounded-full border border-gray-800 shrink-0" style={{ backgroundColor: temp.themeColor }} />
                          <button
                            onClick={() => handleDeleteTemplate(temp.id)}
                            className="p-1 text-gray-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shops Tab */}
            {activeTab === 'shops' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Live Merchants</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Suspend, revoke, or monitor digital tenant outlets</p>
                  </div>
                </div>

                {shops.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono bg-gray-900/10 rounded-2xl border border-gray-800">
                    No occupied shops on the platform yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shops.map((shop) => (
                      <div key={shop.id} className="p-4 rounded-2xl bg-[#09090d] border border-gray-900 flex gap-4 text-xs items-center justify-between">
                        <div className="flex gap-3 items-center min-w-0">
                          <img
                            src={shop.logoUrl}
                            alt={shop.name}
                            className="w-10 h-10 rounded-xl object-cover border border-gray-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-white truncate">{shop.name}</h4>
                            <p className="text-[9px] text-gray-500 font-mono">Owner: {shop.ownerName}</p>
                            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-mono mt-1 rounded ${
                              shop.status === 'OCCUPIED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {shop.status}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleShopState(shop)}
                          className={`px-3 py-1 text-[9px] font-mono uppercase font-black tracking-wider rounded-lg transition-all cursor-pointer border ${
                            shop.status === 'OCCUPIED' 
                              ? 'bg-rose-500/5 hover:bg-rose-500/20 text-rose-400 border-rose-500/10' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/10'
                          }`}
                        >
                          {shop.status === 'OCCUPIED' ? 'SUSPEND' : 'ACTIVATE'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reusable Template Creation Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b0b10] border border-[#222] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-[#0e0e14]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                <div>
                  <h3 className="text-xs font-extrabold text-white tracking-widest uppercase">Create Reusable Shop Template</h3>
                  <p className="text-[9px] text-gray-500 font-mono">LANDLORD STORAGE PORTAL</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Hardware Layout, Apparel Boutique Store"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Banner URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Theme Banner Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={tempBanner}
                  onChange={(e) => setTempBanner(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Logo URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Placeholder Logo Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={tempLogo}
                  onChange={(e) => setTempLogo(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Theme Color & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Accent Theme Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="w-10 h-10 bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="flex-1 bg-[#111116] border border-gray-800 rounded-xl px-3 text-white focus:outline-none focus:border-purple-500/50 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Physical Location / Arcade block</label>
                  <input
                    type="text"
                    required
                    value={tempLoc}
                    onChange={(e) => setTempLoc(e.target.value)}
                    className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Template Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the styling vibe of this e-commerce layout..."
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingTemp}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-purple-500/15 cursor-pointer disabled:opacity-50"
              >
                {savingTemp ? 'Creating template assets...' : 'Commit storefront Template'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
