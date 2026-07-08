import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Edit2, Trash2, ShoppingBag, DollarSign, 
  MessageSquare, Settings, Truck, ListCollapse, Users, TrendingUp,
  Tag, CreditCard, Clock, MapPin, CheckCircle2, ChevronRight, Loader2, X
} from 'lucide-react';
import { db } from '@/firebase/config';
import { 
  collection, query, where, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, setDoc 
} from 'firebase/firestore';
import { Shop, Product, Order, ProductVariant } from './MarketplaceTypes';
import ChatCenter from './ChatCenter';

interface MerchantDashboardProps {
  userId: string;
  userName: string;
  shop: Shop;
  onBackToMarketplace?: () => void;
}

export default function MerchantDashboard({
  userId,
  userName,
  shop: initialShop,
  onBackToMarketplace
}: MerchantDashboardProps) {
  const [shop, setShop] = useState<Shop>(initialShop);
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'orders' | 'chats' | 'promotions' | 'settings'>('sales');
  
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Shop edit state
  const [editShopName, setEditShopName] = useState(shop.name);
  const [editShopDesc, setEditShopDesc] = useState(shop.description);
  const [editShopLocation, setEditShopLocation] = useState(shop.location);
  const [editShopHours, setEditShopHours] = useState(shop.businessHours);
  const [editShopMtn, setEditShopMtn] = useState(shop.mtnNumber || '');
  const [editShopAirtel, setEditShopAirtel] = useState(shop.airtelNumber || '');
  const [savingShop, setSavingShop] = useState(false);

  // Product modal / creation state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodImg, setProdImg] = useState('');
  const [prodCategory, setProdCategory] = useState('Electronics');
  
  // Variants build state
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);
  const [varType, setVarType] = useState<'color' | 'size' | 'weight' | 'material'>('color');
  const [varName, setVarName] = useState('');
  const [varValue, setVarValue] = useState('');
  const [varPriceMod, setVarPriceMod] = useState('0');
  const [varStock, setVarStock] = useState('10');

  // Load Real-time Data
  useEffect(() => {
    // 1. Listen to shop document updates
    const unsubscribeShop = onSnapshot(doc(db, 'biz_shops', shop.id), (docSnap) => {
      if (docSnap.exists()) {
        const updatedShop = { id: docSnap.id, ...docSnap.data() } as Shop;
        setShop(updatedShop);
        setEditShopName(updatedShop.name);
        setEditShopDesc(updatedShop.description);
        setEditShopLocation(updatedShop.location);
        setEditShopHours(updatedShop.businessHours);
        setEditShopMtn(updatedShop.mtnNumber || '');
        setEditShopAirtel(updatedShop.airtelNumber || '');
      }
    });

    // 2. Listen to merchant products
    const qProd = query(collection(db, 'biz_products'), where('shopId', '==', shop.id));
    const unsubscribeProds = onSnapshot(qProd, (snapshot) => {
      const fetchedProds: Product[] = [];
      snapshot.forEach((d) => {
        fetchedProds.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(fetchedProds);
      setLoading(false);
    });

    // 3. Listen to shop orders
    const qOrder = query(collection(db, 'biz_orders'), where('shopId', '==', shop.id));
    const unsubscribeOrders = onSnapshot(qOrder, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((d) => {
        fetchedOrders.push({ id: d.id, ...d.data() } as Order);
      });
      // Sort newest orders first
      fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(fetchedOrders);
    });

    return () => {
      unsubscribeShop();
      unsubscribeProds();
      unsubscribeOrders();
    };
  }, [shop.id]);

  // Product variant additions helper
  const addVariantItem = () => {
    if (!varValue.trim()) return;
    const item: ProductVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: varType,
      name: varName.trim() || varType.toUpperCase(),
      value: varValue.trim(),
      priceModifier: Number(varPriceMod) || 0,
      stock: Number(varStock) || 10,
      sku: `SKU-${varType.substring(0,2).toUpperCase()}-${varValue.substring(0,3).toUpperCase()}`
    };
    setProdVariants([...prodVariants, item]);
    setVarValue('');
    setVarName('');
    setVarPriceMod('0');
  };

  const removeVariantItem = (id: string) => {
    setProdVariants(prodVariants.filter(v => v.id !== id));
  };

  // Create or edit product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim() || !prodPrice || !prodImg.trim()) return;

    const priceNum = Number(prodPrice);
    const stockNum = Number(prodStock) || 10;

    const productPayload = {
      shopId: shop.id,
      shopName: shop.name,
      title: prodTitle.trim(),
      description: prodDesc.trim(),
      price: priceNum,
      imageUrl: prodImg.trim(),
      images: [prodImg.trim()],
      stock: stockNum,
      category: prodCategory,
      variants: prodVariants,
      rating: editingProduct ? editingProduct.rating : 5,
      reviewsCount: editingProduct ? editingProduct.reviewsCount : 0,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'biz_products', editingProduct.id), productPayload);
      } else {
        await addDoc(collection(db, 'biz_products'), productPayload);
      }
      setShowProductModal(false);
      resetProductForm();
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setProdTitle(product.title);
    setProdDesc(product.description);
    setProdPrice(product.price.toString());
    setProdStock(product.stock.toString());
    setProdImg(product.imageUrl);
    setProdCategory(product.category);
    setProdVariants(product.variants || []);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm("Are you sure you want to delete this product listing?")) return;
    try {
      await deleteDoc(doc(db, 'biz_products', prodId));
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProdTitle('');
    setProdDesc('');
    setProdPrice('');
    setProdStock('');
    setProdImg('');
    setProdCategory('Electronics');
    setProdVariants([]);
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: Order['orderStatus']) => {
    try {
      await updateDoc(doc(db, 'biz_orders', orderId), { orderStatus: status });
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  // Update payment status
  const handleUpdatePaymentStatus = async (orderId: string, status: Order['paymentStatus']) => {
    try {
      await updateDoc(doc(db, 'biz_orders', orderId), { paymentStatus: status });
    } catch (err) {
      console.error("Error updating payment status:", err);
    }
  };

  // Save general shop configurations
  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      await updateDoc(doc(db, 'biz_shops', shop.id), {
        name: editShopName.trim(),
        description: editShopDesc.trim(),
        location: editShopLocation.trim(),
        businessHours: editShopHours.trim(),
        mtnNumber: editShopMtn.trim(),
        airtelNumber: editShopAirtel.trim()
      });
      alert("Store configurations successfully synchronized on-chain.");
    } catch (err) {
      console.error("Error updating shop configurations:", err);
    } finally {
      setSavingShop(false);
    }
  };

  // Calculations
  const totalSalesVolume = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'pending').length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] text-gray-200">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-64 bg-[#09090d] border border-[#1a1a24] rounded-2xl p-4 shrink-0 flex flex-col gap-1.5 self-start">
        <div className="flex items-center gap-3 px-3 py-3 border-b border-[#13131a] mb-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white truncate font-mono uppercase">{shop.name}</h4>
            <span className="text-[9px] text-yellow-500 font-bold font-mono tracking-widest uppercase">Verified Merchant</span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'sales' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Earnings Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'products' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Stock Inventory ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer relative ${
            activeTab === 'orders' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Customer Orders</span>
          {pendingOrdersCount > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-500 text-[8px] flex items-center justify-center text-white font-mono">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('chats')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'chats' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp Chat Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'settings' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Store Settings</span>
        </button>

        {onBackToMarketplace && (
          <button
            onClick={onBackToMarketplace}
            className="mt-8 flex items-center gap-2 w-full px-3 py-2 text-center text-xs font-mono text-cyan-400 hover:text-white hover:underline cursor-pointer border-t border-[#13131a] pt-4"
          >
            ← Exit Merchant Office
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 bg-[#07070a]/40 border border-[#1a1a24] rounded-2xl p-6 overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-gray-500">Retrieving ledger parameters...</span>
          </div>
        ) : (
          <>
            {/* Sales TAB */}
            {activeTab === 'sales' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Sales Overview</h3>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-mono">LIVE TRACKING</span>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-[#09090d] border border-cyan-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Gross Earnings</span>
                      <DollarSign className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-xl font-black font-mono text-white">{totalSalesVolume.toLocaleString()} UGX</p>
                    <p className="text-[9px] text-gray-600 font-mono">Cleared escrow transactions</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#09090d] border border-cyan-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Total Orders</span>
                      <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-xl font-black font-mono text-white">{orders.length}</p>
                    <p className="text-[9px] text-gray-600 font-mono">Total shopper submissions</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#09090d] border border-cyan-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Follower Count</span>
                      <Users className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-xl font-black font-mono text-white">{shop.followerCount}</p>
                    <p className="text-[9px] text-gray-600 font-mono">Direct marketplace followers</p>
                  </div>
                </div>

                {/* Recent Orders List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-400 font-mono uppercase tracking-wider">Latest Shopper Transactions</h4>
                  {orders.length === 0 ? (
                    <div className="p-8 text-center bg-gray-900/10 rounded-2xl border border-gray-800 text-xs text-gray-500 font-mono">
                      No order ledgers established yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#13131a] bg-[#08080c] rounded-2xl border border-gray-900 overflow-hidden">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white">{order.id.substring(6, 12).toUpperCase()}</span>
                              <span className="text-[9px] text-gray-500 font-mono">by {order.customerName}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">{order.items.length} items • {order.total.toLocaleString()} UGX</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${
                              order.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {order.paymentStatus}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${
                              order.orderStatus === 'delivered' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {order.orderStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Products TAB */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Product Catalog</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Manage virtual shop listings & swatches</p>
                  </div>
                  <button
                    onClick={() => {
                      resetProductForm();
                      setShowProductModal(true);
                    }}
                    className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/15 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD PRODUCT</span>
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="py-16 text-center space-y-3.5 max-w-sm mx-auto">
                    <ShoppingBag className="w-12 h-12 text-gray-800 animate-pulse mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-gray-300">Catalog is Empty</p>
                      <p className="text-[10px] text-gray-500 leading-normal">
                        Add items with multiple variants, custom image references, and stocks to populate your beautiful digital shop.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((prod) => (
                      <div key={prod.id} className="p-4 rounded-2xl bg-[#09090d] border border-gray-900 flex gap-4 text-xs items-center justify-between">
                        <div className="flex gap-3 items-center min-w-0">
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-white truncate">{prod.title}</h4>
                            <p className="text-[10px] font-mono text-cyan-400 font-black mt-1">{prod.price.toLocaleString()} UGX</p>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">Stock: {prod.stock} units</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditProductClick(prod)}
                            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-2 hover:bg-rose-950/40 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
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

            {/* Orders TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Client Order Records</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Approve checkout status and dispatch shipments</p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="p-10 text-center text-xs text-gray-500 font-mono bg-gray-900/10 border border-gray-800 rounded-2xl">
                    No shopper order receipts allocated yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="p-5 rounded-2xl bg-[#09090d] border border-gray-900 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs pb-3 border-b border-[#13131a]">
                          <div>
                            <span className="font-mono font-bold text-cyan-400">ORDER {order.id.substring(6, 15).toUpperCase()}</span>
                            <p className="text-[10px] text-gray-500 mt-0.5 font-mono">Date: {new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            <select
                              value={order.orderStatus}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                              className="bg-[#111116] border border-gray-800 text-white rounded-lg px-2.5 py-1 text-[10px] font-mono focus:outline-none focus:border-cyan-500/50"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>

                            <select
                              value={order.paymentStatus}
                              onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value as any)}
                              className="bg-[#111116] border border-gray-800 text-white rounded-lg px-2.5 py-1 text-[10px] font-mono focus:outline-none focus:border-cyan-500/50"
                            >
                              <option value="pending">Payment Pending</option>
                              <option value="paid">Payment Verified</option>
                              <option value="failed">Payment Failed</option>
                            </select>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.productImage}
                                  alt={item.productTitle}
                                  className="w-8 h-8 rounded-lg object-cover border border-gray-800"
                                />
                                <div>
                                  <span className="font-bold text-white">{item.productTitle}</span>
                                  {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                    <div className="text-[8px] text-gray-500 font-mono mt-0.5">
                                      {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-gray-400 font-mono">{item.quantity} x {item.price.toLocaleString()} UGX</span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery Customer Details */}
                        <div className="bg-[#111116]/40 p-4 rounded-xl border border-gray-900 text-[11px] font-mono space-y-1.5 text-gray-400">
                          <p><span className="text-white">Customer:</span> {order.customerName} ({order.customerEmail})</p>
                          <p><span className="text-white">Phone:</span> {order.customerPhone}</p>
                          <p><span className="text-white">Kampala Delivery Address:</span> {order.customerAddress}</p>
                          <p><span className="text-white">Gateway Selected:</span> {order.paymentMethod.toUpperCase()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp Chat Center TAB */}
            {activeTab === 'chats' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Direct Chat Center</h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">Negotiate directly with buyers on Kampala prices</p>
                </div>
                <ChatCenter
                  currentUserId={userId}
                  currentUserName={userName}
                  isMerchantView={true}
                />
              </div>
            )}

            {/* Settings TAB */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Store Settings</h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">Customize your digital shop template branding & payments</p>
                </div>

                <form onSubmit={handleSaveShopSettings} className="space-y-4 max-w-lg">
                  {/* Shop Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Store Display Name</label>
                    <input
                      type="text"
                      required
                      value={editShopName}
                      onChange={(e) => setEditShopName(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Shop Location */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Physical Location / Arcade ID</label>
                    <input
                      type="text"
                      required
                      value={editShopLocation}
                      onChange={(e) => setEditShopLocation(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>

                  {/* Business Hours */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Business Hours</label>
                    <input
                      type="text"
                      required
                      value={editShopHours}
                      onChange={(e) => setEditShopHours(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>

                  {/* Shop Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Shop Description</label>
                    <textarea
                      required
                      rows={3}
                      value={editShopDesc}
                      onChange={(e) => setEditShopDesc(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                    />
                  </div>

                  {/* Mobile money settings */}
                  <div className="p-4 rounded-2xl bg-cyan-950/5 border border-cyan-500/10 space-y-4">
                    <h4 className="text-[10px] font-mono text-cyan-400 uppercase font-black tracking-wider">Independent Merchant Payment Gateways</h4>
                    <p className="text-[9px] text-gray-500 leading-normal">
                      Connect your Ugandan mobile wallets. Shoppers checking out from your storefront will pay directly to these accounts.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* MTN */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">MTN Mobile Money number</label>
                        <input
                          type="text"
                          placeholder="e.g. +256 770 111 222"
                          value={editShopMtn}
                          onChange={(e) => setEditShopMtn(e.target.value)}
                          className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                        />
                      </div>

                      {/* Airtel */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Airtel Money number</label>
                        <input
                          type="text"
                          placeholder="e.g. +256 700 333 444"
                          value={editShopAirtel}
                          onChange={(e) => setEditShopAirtel(e.target.value)}
                          className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingShop}
                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-cyan-500/15 cursor-pointer disabled:opacity-50"
                  >
                    {savingShop ? 'Saving On-Chain...' : 'Synchronize Store settings'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Create/Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b0b10] border border-[#222] rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl relative flex flex-col my-8">
            <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-[#0e0e14]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-xs font-extrabold text-white tracking-widest uppercase">
                    {editingProduct ? 'Modify Product Listing' : 'Establish Product Listing'}
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono">BIZLINK CATALOG MANAGEMENT</p>
                </div>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tecno Camon 20 Pro, Premium Kitenge"
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Price (UGX)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45000"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Starting Stock</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>
              </div>

              {/* Image URL & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Product Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Crafts">Crafts & Art</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Restaurants">Restaurants</option>
                    <option value="Services">Services</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Product Image URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={prodImg}
                    onChange={(e) => setProdImg(e.target.value)}
                    className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Product Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed specifications, weight, color fastness, etc..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              {/* Dynamic Product Variants Color/Size Setup */}
              <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
                <h4 className="text-[10px] font-mono text-cyan-400 uppercase font-black tracking-wider">Dynamic Visual Variants (Chips & Swatches)</h4>
                
                <div className="flex flex-wrap gap-2.5 items-end text-xs">
                  <div className="space-y-1 shrink-0">
                    <label className="text-[8px] font-mono text-gray-500 block uppercase">Type</label>
                    <select
                      value={varType}
                      onChange={(e) => setVarType(e.target.value as any)}
                      className="bg-[#111116] border border-gray-800 text-white rounded px-2.5 py-1.5 text-[10px] font-mono"
                    >
                      <option value="color">Color Swatch</option>
                      <option value="size">Size Button</option>
                      <option value="weight">Weight Select</option>
                      <option value="material">Material Chip</option>
                    </select>
                  </div>

                  <div className="space-y-1 shrink-0 w-24">
                    <label className="text-[8px] font-mono text-gray-500 block uppercase">Label/Name</label>
                    <input
                      type="text"
                      placeholder="e.g. XL, Red"
                      value={varValue}
                      onChange={(e) => setVarValue(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded px-2.5 py-1.5 text-[10px]"
                    />
                  </div>

                  <div className="space-y-1 shrink-0 w-24">
                    <label className="text-[8px] font-mono text-gray-500 block uppercase">Price Mod (+/-)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={varPriceMod}
                      onChange={(e) => setVarPriceMod(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded px-2.5 py-1.5 text-[10px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addVariantItem}
                    className="px-3.5 py-1.5 bg-cyan-500 text-black text-[10px] font-extrabold uppercase rounded font-mono transition-colors hover:bg-cyan-400 cursor-pointer"
                  >
                    ADD CHIP
                  </button>
                </div>

                {/* Display Current Variants */}
                {prodVariants.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                    {prodVariants.map((v) => (
                      <span key={v.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111116] border border-gray-800 text-[9px] font-mono text-gray-300">
                        <span>{v.type.toUpperCase()}: <strong>{v.value}</strong></span>
                        {v.priceModifier !== 0 && (
                          <span className="text-cyan-400 font-bold">
                            ({v.priceModifier > 0 ? '+' : ''}{v.priceModifier} UGX)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeVariantItem(v.id)}
                          className="hover:text-rose-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all"
              >
                {editingProduct ? 'Save Product Changes' : 'Establish Product Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
