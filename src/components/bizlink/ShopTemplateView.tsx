import React, { useState, useEffect } from 'react';
import { 
  Building2, MessageSquare, Heart, Share2, MapPin, Clock, 
  ChevronRight, ShoppingCart, ShieldCheck, BadgeCheck, Star, 
  Truck, ArrowRight, X, Sparkles, AlertTriangle, MessageCircle, ArrowLeft, Loader2
} from 'lucide-react';
import { Shop, Product, Order, ProductVariant, Review } from './MarketplaceTypes';
import { db } from '@/firebase/config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';

interface ShopTemplateViewProps {
  shop: Shop;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  onBack: () => void;
  onOpenChat: (merchantId: string, shopId: string, shopName: string) => void;
}

export default function ShopTemplateView({
  shop,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onBack,
  onOpenChat,
}: ShopTemplateViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart State (stored locally for instant client experience)
  const [cart, setCart] = useState<{ product: Product; quantity: number; selectedVariants: { [key: string]: string } }[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // Checkout Fields
  const [custAddress, setCustAddress] = useState('Kampala Central, Kampala, Uganda');
  const [custPhone, setCustPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel'>('mtn');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Product detail selected parameters
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [chosenVariants, setChosenVariants] = useState<{ [key: string]: string }>({});
  const [priceModifierSum, setPriceModifierSum] = useState(0);

  // Follow State
  const [isFollowing, setIsFollowing] = useState(shop.followers?.includes(currentUserId) || false);

  // Delivery Calculator fields
  const [selectedCourier, setSelectedCourier] = useState('Boda Boda Express');
  const [calcFee, CalcFee] = useState(4500);
  const [calcTime, CalcTime] = useState('30-45 minutes');

  // Load Shop Products and reviews
  useEffect(() => {
    const qProd = query(collection(db, 'biz_products'), where('shopId', '==', shop.id));
    const unsubscribeProds = onSnapshot(qProd, (snapshot) => {
      const fetched: Product[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(fetched);
      setLoading(false);
    }, (err) => {
      console.warn("Error subscribing to biz_products for shop:", err);
      setLoading(false);
    });

    const qReviews = query(collection(db, 'biz_reviews'), where('shopId', '==', shop.id));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      const fetched: Review[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Review);
      });
      setReviews(fetched);
    }, (err) => {
      console.warn("Error subscribing to biz_reviews for shop:", err);
    });

    return () => {
      unsubscribeProds();
      unsubscribeReviews();
    };
  }, [shop.id]);

  // Handle follow toggle
  const handleFollowToggle = async () => {
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    
    const shopRef = doc(db, 'biz_shops', shop.id);
    const updatedFollowers = nextFollowing 
      ? [...(shop.followers || []), currentUserId]
      : (shop.followers || []).filter(id => id !== currentUserId);

    try {
      await updateDoc(shopRef, {
        followers: updatedFollowers,
        followerCount: updatedFollowers.length
      });
    } catch (err) {
      console.warn("Follow error:", err);
    }
  };

  // Open product details
  const handleProductClick = (prod: Product) => {
    setSelectedProduct(prod);
    setActiveImgIndex(0);
    // Auto-select first options of variants
    const initialVariants: { [key: string]: string } = {};
    let initialModifier = 0;
    if (prod.variants) {
      // Group variants by type and select the first one
      const types = Array.from(new Set(prod.variants.map(v => v.type)));
      types.forEach(t => {
        const matching = prod.variants!.find(v => v.type === t);
        if (matching) {
          initialVariants[t] = matching.value;
          initialModifier += matching.priceModifier;
        }
      });
    }
    setChosenVariants(initialVariants);
    setPriceModifierSum(initialModifier);
  };

  const handleVariantSelect = (type: string, value: string, modifier: number) => {
    const nextVariants = { ...chosenVariants, [type]: value };
    setChosenVariants(nextVariants);

    // Re-calculate modifier sum
    let sum = 0;
    if (selectedProduct?.variants) {
      Object.entries(nextVariants).forEach(([t, val]) => {
        const found = selectedProduct.variants!.find(v => v.type === t && v.value === val);
        if (found) {
          sum += found.priceModifier;
        }
      });
    }
    setPriceModifierSum(sum);
  };

  // Add to Cart
  const handleAddToCart = (prod: Product, buyNow = false) => {
    const existingIndex = cart.findIndex(
      item => item.product.id === prod.id && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(chosenVariants)
    );

    const priceAdjustedProduct = { ...prod, price: prod.price + priceModifierSum };

    if (existingIndex > -1) {
      const nextCart = [...cart];
      nextCart[existingIndex].quantity += 1;
      setCart(nextCart);
    } else {
      setCart([...cart, { product: priceAdjustedProduct, quantity: 1, selectedVariants: chosenVariants }]);
    }

    if (buyNow) {
      setSelectedProduct(null);
      setShowCartDrawer(true);
    } else {
      alert("Added to cart! Instant quantity updated.");
    }
  };

  const handleRemoveFromCart = (index: number) => {
    const nextCart = [...cart];
    nextCart.splice(index, 1);
    setCart(nextCart);
  };

  const handleQtyChange = (index: number, delta: number) => {
    const nextCart = [...cart];
    nextCart[index].quantity += delta;
    if (nextCart[index].quantity <= 0) {
      nextCart.splice(index, 1);
    }
    setCart(nextCart);
  };

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !custPhone.trim()) return;

    setPlacingOrder(true);
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const total = subtotal + calcFee;

    try {
      const orderPayload = {
        customerId: currentUserId,
        customerName: currentUserName,
        customerEmail: currentUserEmail,
        customerAddress: custAddress.trim(),
        customerPhone: custPhone.trim(),
        shopId: shop.id,
        shopName: shop.name,
        merchantId: shop.ownerId || '',
        items: cart.map(item => ({
          productId: item.product.id,
          productTitle: item.product.title,
          productImage: item.product.imageUrl,
          quantity: item.quantity,
          price: item.product.price,
          selectedVariants: item.selectedVariants
        })),
        subtotal,
        deliveryFee: calcFee,
        total,
        paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'biz_orders'), orderPayload);
      
      // Clear cart
      setCart([]);
      setShowCheckoutModal(false);
      setShowCartDrawer(false);
      alert("Order placed successfully. Merchant has been notified!");
    } catch (err) {
      console.error("Order submission error:", err);
    } finally {
      setPlacingOrder(false);
    }
  };

  // Subtotal calculation
  const subtotalSum = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Real-time stock message alert helpers
  const getStockAlert = (stock: number) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-rose-400 bg-rose-500/10' };
    if (stock <= 3) return { text: `Only ${stock} items left! Selling Fast`, color: 'text-yellow-400 bg-yellow-500/10' };
    return { text: 'In Stock - Ready to Deliver', color: 'text-emerald-400 bg-emerald-500/10 animate-pulse' };
  };

  return (
    <div className="space-y-6 relative pb-20 text-gray-200">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Town Marketplace</span>
      </button>

      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden h-44 sm:h-56 border border-gray-900 group">
        <img 
          src={shop.bannerUrl} 
          alt={shop.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Banner Details Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex gap-4 items-center">
            <img 
              src={shop.logoUrl} 
              alt={shop.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-cyan-500/30 bg-black shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-white font-mono uppercase tracking-wider">{shop.name}</h2>
                {shop.verified && (
                  <BadgeCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-gray-300 line-clamp-1 mt-1 font-mono">{shop.description}</p>
              
              <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400 font-mono">
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-current" /> {shop.rating}
                </span>
                <span>{shop.followerCount} Followers</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button 
              onClick={handleFollowToggle}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer ${
                isFollowing ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-500 text-black hover:bg-cyan-400'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow Shop'}
            </button>

            <button 
              onClick={() => onOpenChat(shop.ownerId!, shop.id, shop.name)}
              className="px-4 py-2 bg-[#14141d]/85 hover:bg-gray-800 text-white rounded-xl text-xs font-mono font-black tracking-wider uppercase border border-gray-800 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Message</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Main Products Catalogs + Sidebar Trust & Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Products section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1a1a24] pb-3">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-widest">E-Commerce Shelves</h3>
            <span className="text-[10px] font-mono text-gray-500">{products.length} Items stocked</span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="text-xs font-mono text-gray-500">Scanning shelves...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 font-mono bg-[#09090d]/30 border border-gray-900 rounded-2xl">
              Merchant has no items listed yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((prod) => {
                const alertInfo = getStockAlert(prod.stock);
                return (
                  <div 
                    key={prod.id} 
                    onClick={() => handleProductClick(prod)}
                    className="p-4 rounded-2xl bg-[#09090d]/60 border border-gray-900 hover:border-cyan-500/30 transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="space-y-3">
                      <div className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-gray-800 relative">
                        <img 
                          src={prod.imageUrl} 
                          alt={prod.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[8px] font-mono uppercase font-black tracking-wider ${alertInfo.color}`}>
                          {alertInfo.text}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{prod.category}</span>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{prod.title}</h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-900 mt-4">
                      <span className="text-xs font-black font-mono text-cyan-400">{prod.price.toLocaleString()} UGX</span>
                      <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Trust Details & Cart summary */}
        <div className="space-y-6">
          {/* Cart Mini Drawer widget if items added */}
          {cart.length > 0 && (
            <div className="p-5 rounded-2xl bg-cyan-950/10 border border-cyan-500/20 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase font-black tracking-wider">Basket contents</span>
                </div>
                <span className="text-xs font-mono font-bold text-white bg-cyan-500/10 px-2 py-0.5 rounded">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>

              <div className="space-y-3 divide-y divide-cyan-500/5">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs pt-2">
                    <span className="text-gray-300 truncate max-w-[130px]">{item.product.title}</span>
                    <span className="font-mono text-white text-[11px]">
                      {item.quantity}x ({(item.product.price * item.quantity).toLocaleString()} UGX)
                    </span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowCartDrawer(true)}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black font-mono uppercase rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>OPEN BASKET CHANNELS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Trust Panel */}
          <div className="p-5 rounded-2xl bg-[#09090d]/60 border border-gray-900 space-y-4 text-xs">
            <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black">Merchant Trust Index</h4>
            
            <div className="flex items-center gap-3">
              <img 
                src={shop.logoUrl} 
                alt={shop.name} 
                className="w-10 h-10 rounded-xl object-cover border border-gray-800"
              />
              <div>
                <span className="flex items-center gap-1 text-cyan-400 text-[11px] font-bold">
                  Verified Trader <ShieldCheck className="w-3.5 h-3.5 fill-current" />
                </span>
                <p className="text-[9px] text-gray-500 font-mono mt-0.5">Years on platform: {shop.yearsOnPlatform || 1}</p>
              </div>
            </div>

            <div className="h-px bg-gray-900"></div>

            <div className="grid grid-cols-2 gap-3 font-mono text-[10px] text-gray-400">
              <div className="space-y-0.5">
                <span className="text-gray-500 text-[8px] uppercase">Chat Response</span>
                <p className="text-white font-bold">{shop.responseRate}%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-gray-500 text-[8px] uppercase">Avg Speed</span>
                <p className="text-white font-bold">{shop.responseTime}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-gray-500 text-[8px] uppercase">Total trades</span>
                <p className="text-white font-bold">{shop.totalSales || 0}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-gray-500 text-[8px] uppercase">Satisfaction</span>
                <p className="text-white font-bold">{shop.satisfactionRate}%</p>
              </div>
            </div>
          </div>

          {/* Location & Logistics */}
          <div className="p-5 rounded-2xl bg-[#09090d]/60 border border-gray-900 space-y-4 text-xs">
            <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black">Logistics & Location</h4>
            
            <div className="space-y-2.5 font-mono text-[11px]">
              <div className="flex items-start gap-2 text-gray-400">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Physical: {shop.location}</span>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Hours: {shop.businessHours}</span>
              </div>
            </div>

            <div className="h-px bg-gray-900"></div>

            {/* Delivery calculator */}
            <div className="space-y-3 font-mono text-[10px]">
              <div className="flex justify-between items-center text-gray-500">
                <span>Fast Kampala Courier</span>
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <select
                value={selectedCourier}
                onChange={(e) => {
                  setSelectedCourier(e.target.value);
                  if (e.target.value.includes('Boda')) {
                    CalcFee(4500);
                    CalcTime('30-45 minutes');
                  } else {
                    CalcFee(12000);
                    CalcTime('1-2 hours');
                  }
                }}
                className="w-full bg-[#111116] border border-gray-800 rounded-lg p-1.5 text-white text-[10px]"
              >
                <option value="Boda Boda Express">Boda Boda Express (4,500 UGX)</option>
                <option value="SafeBoda Delivery">SafeBoda Delivery (12,000 UGX)</option>
              </select>

              <div className="flex justify-between text-[10px] text-gray-400 bg-black/40 p-2.5 rounded-lg border border-gray-900">
                <span>ESTIMATED DURATION:</span>
                <span className="text-white font-black">{calcTime}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Sticky Buy Bar (at bottom, hidden if no cart) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-t border-[#1a1a24] p-4 flex justify-between items-center animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-4">
            <div>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Subtotal Ledger</p>
              <p className="text-sm font-black font-mono text-cyan-400">{subtotalSum.toLocaleString()} UGX</p>
            </div>
            <button 
              onClick={() => setShowCartDrawer(true)}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black font-mono uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Checkout Basket ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            </button>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b0b10] border border-[#222] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col my-8">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Gallery */}
              <div className="p-6 bg-black/20 flex flex-col justify-between border-r border-gray-900">
                <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-gray-800">
                  <img 
                    src={selectedProduct.images?.[activeImgIndex] || selectedProduct.imageUrl} 
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex gap-2.5 mt-3.5 overflow-x-auto">
                    {selectedProduct.images.map((img, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveImgIndex(idx)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border shrink-0 ${
                          activeImgIndex === idx ? 'border-cyan-500' : 'border-gray-800'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Params selection */}
              <div className="p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-2.5">
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded uppercase font-bold tracking-widest block w-max">
                    {selectedProduct.category}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white font-mono uppercase">{selectedProduct.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{selectedProduct.description}</p>
                </div>

                {/* Variant Color/Size Buttons */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="space-y-4 border-t border-gray-900 pt-3">
                    {(Array.from(new Set(selectedProduct.variants.map(v => v.type))) as string[]).map((type) => (
                      <div key={type} className="space-y-1.5">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{type} selectors</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.variants!.filter(v => v.type === type).map((variant) => {
                            const isChosen = chosenVariants[type] === variant.value;
                            return (
                              <button
                                key={variant.id}
                                onClick={() => handleVariantSelect(type, variant.value, variant.priceModifier)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border transition-all cursor-pointer ${
                                  isChosen 
                                    ? 'bg-cyan-500 text-black border-cyan-500' 
                                    : 'bg-[#111116] text-gray-400 border-gray-800 hover:text-white'
                                }`}
                              >
                                {variant.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer price & dynamic add */}
                <div className="border-t border-gray-900 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Interactive Price</span>
                    <p className="text-sm font-black font-mono text-cyan-400">
                      {(selectedProduct.price + priceModifierSum).toLocaleString()} UGX
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAddToCart(selectedProduct, false)}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white border border-gray-800 rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer"
                    >
                      BASKET
                    </button>
                    <button 
                      onClick={() => handleAddToCart(selectedProduct, true)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer"
                    >
                      BUY NOW
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b0b10] border border-[#222] rounded-2xl max-w-md w-full h-full overflow-hidden shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-[#0e0e14]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-xs font-extrabold text-white tracking-widest uppercase">E-Commerce Basket</h3>
                  <p className="text-[9px] text-gray-500 font-mono">BIZLINK UGANDA RENTAL CHECKOUT</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCartDrawer(false)}
                className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
                  <ShoppingCart className="w-10 h-10 text-gray-800" />
                  <p className="text-xs font-bold text-gray-400">Basket is empty</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-3 bg-[#0d0d14] rounded-xl border border-gray-900 text-xs">
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.title} 
                      className="w-12 h-12 rounded-lg object-cover border border-gray-800"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white truncate">{item.product.title}</h4>
                          <button 
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-gray-500 hover:text-rose-400"
                          >
                            ×
                          </button>
                        </div>
                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                          <p className="text-[8px] text-cyan-500 font-mono mt-0.5">
                            {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-end pt-2 border-t border-gray-950 mt-2">
                        <div className="flex items-center gap-2 bg-black/40 border border-gray-800 rounded-lg px-2 py-0.5 text-[10px]">
                          <button onClick={() => handleQtyChange(idx, -1)} className="text-gray-400 hover:text-white px-1 font-mono font-black">-</button>
                          <span className="text-white font-mono">{item.quantity}</span>
                          <button onClick={() => handleQtyChange(idx, 1)} className="text-gray-400 hover:text-white px-1 font-mono font-black">+</button>
                        </div>
                        <span className="font-mono text-cyan-400 font-black">
                          {(item.product.price * item.quantity).toLocaleString()} UGX
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cart.length > 0 && (
              <div className="p-5 bg-[#08080c] border-t border-gray-900 space-y-4">
                <div className="space-y-1.5 font-mono text-[11px] text-gray-400">
                  <div className="flex justify-between">
                    <span>Products Subtotal:</span>
                    <span className="text-white">{subtotalSum.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics Courier:</span>
                    <span className="text-white">{calcFee.toLocaleString()} UGX</span>
                  </div>
                  <div className="h-px bg-gray-900 my-2"></div>
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-white">TOTAL BILL:</span>
                    <span className="text-cyan-400 font-mono">{(subtotalSum + calcFee).toLocaleString()} UGX</span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowCheckoutModal(true)}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black font-mono uppercase rounded-xl transition-all cursor-pointer"
                >
                  PROCEED TO SECURE CHECKOUT
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b0b10] border border-[#222] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-[#0e0e14]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-xs font-extrabold text-white tracking-widest uppercase">Secure Escrow Checkout</h3>
                  <p className="text-[9px] text-gray-500 font-mono">BIZLINK MOBILE MONEY UGANDA</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="p-6 space-y-5">
              <div className="p-3.5 bg-cyan-950/5 border border-cyan-500/10 rounded-xl text-[10px] text-cyan-400/80 leading-normal font-mono">
                💡 **Payment Security**: Your mobile money payment is completed securely. Funds remain safely in local escrow ledger until logistics courier confirms delivery.
              </div>

              {/* Courier phone */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Recipient Mobile Money Phone</label>
                <input 
                  type="tel"
                  required
                  placeholder="e.g. +256 772 123 456"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              {/* Delivery Address */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Kampala Delivery Address / Office / Plot</label>
                <input 
                  type="text"
                  required
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Network select */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Mobile Wallet Provider</label>
                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mtn')}
                    className={`p-3 rounded-xl border font-mono font-black transition-all cursor-pointer ${
                      paymentMethod === 'mtn' 
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' 
                        : 'bg-[#111116] text-gray-500 border-gray-800'
                    }`}
                  >
                    MTN Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('airtel')}
                    className={`p-3 rounded-xl border font-mono font-black transition-all cursor-pointer ${
                      paymentMethod === 'airtel' 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                        : 'bg-[#111116] text-gray-500 border-gray-800'
                    }`}
                  >
                    Airtel Money
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-900 pt-4 flex justify-between items-center text-xs font-mono">
                <span className="text-gray-500">Gross Payable bill:</span>
                <span className="text-cyan-400 font-black">{(subtotalSum + calcFee).toLocaleString()} UGX</span>
              </div>

              <button
                type="submit"
                disabled={placingOrder}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black font-mono uppercase rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {placingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initiating payment push...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Pay with Mobile Money</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
