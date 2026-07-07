import React, { useState, useEffect } from 'react';
import { 
  Building2, Store, ShoppingBag, Plus, Coins, TrendingUp, ShieldCheck, 
  Trash2, X, Maximize2, Minimize2, Search, Info, Briefcase, Receipt, 
  MapPin, Check, RefreshCw, AlertCircle, Sparkles, ShoppingCart, UserCheck, Eye, Smartphone, Shirt
} from 'lucide-react';
import { db, auth } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, where, serverTimestamp, runTransaction
} from 'firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import bizlinkLogo from '@/assets/images/bizlink_logo_1783424653254.jpg';

export interface AssignedBusinessman {
  name: string;
  role: string;
  avatarUrl: string;
  phone: string;
  experience: string;
  status: string;
}

// Interfaces
export interface BizShop {
  id: string;
  ownerId: string;
  ownerName: string;
  shopName: string;
  arcadeId: string;
  shopNumber: string;
  description: string;
  verified: boolean;
  createdAt: any;
  assignedBusinessman?: AssignedBusinessman;
  paymentUrl?: string;
  bankAccountNumber?: string;
}

export interface BizProduct {
  id: string;
  shopId: string;
  ownerId: string;
  arcadeId: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  category: string;
  createdAt: any;
  status?: 'active' | 'sold';
}

export interface BizTransaction {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  status: 'completed';
  createdAt: any;
}

export interface BizWallet {
  userId: string;
  userName: string;
  balanceUGX: number;
  updatedAt: any;
}

interface BizLinkUgandaProps {
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
}

// Famous Kampala Arcades definition
export const KAMPALA_ARCADES = [
  {
    id: 'kikuubo',
    name: 'Wholesale & Groceries Sector',
    vibe: 'General Trade & Bulk Sourcing',
    description: 'Bulk distribution of high-quality household consumables, refined sugar sacks, laundry soaps, and primary foodstuffs.',
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    stats: 'Wholesale Domain'
  },
  {
    id: 'mutaasakafeero',
    name: 'Electronics & Smart Devices Sector',
    vibe: 'Tech & Hardware Sourcing',
    description: 'Premier marketplace for mobile devices, smart accessories, chargers, powerbanks, and computer spare accessories.',
    color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5',
    tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    stats: 'Technology Domain'
  },
  {
    id: 'mukwano',
    name: 'Textiles & Kitenge Fabrics Sector',
    vibe: 'African Wax Block Print',
    description: 'Famous for premium Ankara textiles, custom bridal embroidery, local kitenge wrappers, and tailoring expertise.',
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/5',
    tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    stats: 'Fabrics Domain'
  },
  {
    id: 'grandcorner',
    name: 'Footwear & Apparel Sector',
    vibe: 'Boutique Luggage & Clothing',
    description: 'A bustling sector specialized in handcrafted leather boots, designer trainers, leather handbags, and wholesale backpacks.',
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    stats: 'Apparel Domain'
  }
];

export const UGANDAN_BUSINESSMEN = [
  {
    name: "Mukasa Emmanuel",
    role: "Wholesale & Foodstuffs Manager",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    phone: "+256 772 890412",
    experience: "12 years managing general trade wholesale channels in Kampala.",
    status: "Available for Hire"
  },
  {
    name: "Nalubega Prossy",
    role: "Textiles & Apparel Sourcing Expert",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    phone: "+256 701 445582",
    experience: "8 years sourcing and importing quality kitenge fabrics and bags.",
    status: "Available for Hire"
  },
  {
    name: "Ssekyewa Joseph",
    role: "Electronics & Smart Tech Specialist",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    phone: "+256 752 309812",
    experience: "10 years in tech sourcing, mobile repairs, and parts distribution.",
    status: "Available for Hire"
  },
  {
    name: "Aisha Birungi",
    role: "Cosmetics & Beauty Supply Coordinator",
    avatarUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
    phone: "+256 774 912048",
    experience: "7 years managing premium cosmetics and styling distributions.",
    status: "Available for Hire"
  },
  {
    name: "Kato Francis",
    role: "Footwear & Designer Apparel Importer",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    phone: "+256 782 554312",
    experience: "15 years importing and distributing premium footwear from Mombasa.",
    status: "Available for Hire"
  }
];

const SEED_SHOPS = [
  {
    id: 'seed_shop_1',
    ownerId: 'system_admin',
    ownerName: 'Semakula Henry (Wholesale)',
    shopName: 'Semakula & Sons Ltd',
    arcadeId: 'kikuubo',
    shopNumber: 'G-12, Ground Floor',
    description: 'Direct importers of quality laundry soaps, refined sugar sacks, Kakira cane sugar, and bulk sunflower cooking oil.',
    verified: true,
    createdAt: new Date().toISOString(),
    assignedBusinessman: UGANDAN_BUSINESSMEN[0]
  },
  {
    id: 'seed_shop_2',
    ownerId: 'system_admin',
    ownerName: 'Babirye Florence',
    shopName: 'Kampala Gadgets Outlets',
    arcadeId: 'mutaasakafeero',
    shopNumber: 'Shop F-305, Floor 3',
    description: 'Authorized retailer for smartphone accessories, screen guards, powerbanks, fast chargers, and high-fidelity earbuds.',
    verified: true,
    createdAt: new Date().toISOString(),
    assignedBusinessman: UGANDAN_BUSINESSMEN[2]
  },
  {
    id: 'seed_shop_3',
    ownerId: 'system_admin',
    ownerName: 'Mirembe Diana',
    shopName: 'Mirembe Bridal & Textiles',
    arcadeId: 'mukwano',
    shopNumber: 'Level 1, Shop B-44',
    description: 'Stunning West African fabrics, Ankara wrappers, premium local Kitenge designs, and custom bridal embroidery services.',
    verified: true,
    createdAt: new Date().toISOString(),
    assignedBusinessman: UGANDAN_BUSINESSMEN[1]
  },
  {
    id: 'seed_shop_4',
    ownerId: 'system_admin',
    ownerName: 'Kato Charles',
    shopName: 'Grand Corner Kickz',
    arcadeId: 'grandcorner',
    shopNumber: 'Shop G-4, Next to Exit',
    description: 'Bustling boutique specialized in imported leather boots, designer trainers, leather handbags, and wholesale backpacks.',
    verified: true,
    createdAt: new Date().toISOString(),
    assignedBusinessman: UGANDAN_BUSINESSMEN[4]
  }
];

const SEED_PRODUCTS = [
  {
    id: 'seed_prod_1',
    shopId: 'seed_shop_1',
    ownerId: 'system_admin',
    arcadeId: 'kikuubo',
    title: 'Refined Kakira Sugar (10KG Sack)',
    description: 'Authentic refined sugarcane crystals from Kakira Sugar Factory. Triple-bagged for safety and fresh sealing.',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1581781868770-bdc8ec519eb3?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    stock: 45,
    category: 'Groceries',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed_prod_2',
    shopId: 'seed_shop_1',
    ownerId: 'system_admin',
    arcadeId: 'kikuubo',
    title: 'Chapa Nyota Soap Case (10 Bars)',
    description: 'Top-tier laundry and multipurpose cleaning soap. Excellent lathering capability, durable bar formulation.',
    price: 24000,
    imageUrl: 'https://images.unsplash.com/photo-1607006342411-b0135b0d9faf?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    stock: 30,
    category: 'Groceries',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed_prod_3',
    shopId: 'seed_shop_2',
    ownerId: 'system_admin',
    arcadeId: 'mutaasakafeero',
    title: 'BassMaster Wireless Earbuds',
    description: 'Deep bass response, noise isolating seal, 24-hour battery life with charging capsule. Sweat-proof casing.',
    price: 95000,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    stock: 15,
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed_prod_4',
    shopId: 'seed_shop_2',
    ownerId: 'system_admin',
    arcadeId: 'mutaasakafeero',
    title: 'UltraCharge Powerbank (20,000mAh)',
    description: 'Dual fast-charging ports, durable rugged aluminum body, ideal for Kampala power interruptions.',
    price: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1609592424085-f5b225517112?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    stock: 12,
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed_prod_5',
    shopId: 'seed_shop_3',
    ownerId: 'system_admin',
    arcadeId: 'mukwano',
    title: 'Imperial Ankara Wax Print (6 Yards)',
    description: 'Genuine super wax block print. Exquisite geometric colorways, ideal for custom tailoring or dresses.',
    price: 75000,
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    stock: 8,
    category: 'Textiles',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed_prod_6',
    shopId: 'seed_shop_4',
    ownerId: 'system_admin',
    arcadeId: 'grandcorner',
    title: 'Vintage Leather Chelsea Boots',
    description: 'Handcrafted premium leather boots with dual elastic panel inserts, durable rubber lug outsole.',
    price: 180000,
    imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    stock: 5,
    category: 'Footwear',
    createdAt: new Date().toISOString()
  }
];

const LocalDB = {
  getShops: (): BizShop[] => {
    try {
      const data = localStorage.getItem('local_biz_shops');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },
  saveShops: (shops: BizShop[]) => {
    localStorage.setItem('local_biz_shops', JSON.stringify(shops));
  },
  getProducts: (): BizProduct[] => {
    try {
      const data = localStorage.getItem('local_biz_products');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },
  saveProducts: (products: BizProduct[]) => {
    localStorage.setItem('local_biz_products', JSON.stringify(products));
  },
  getTransactions: (): BizTransaction[] => {
    try {
      const data = localStorage.getItem('local_biz_transactions');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },
  saveTransactions: (transactions: BizTransaction[]) => {
    localStorage.setItem('local_biz_transactions', JSON.stringify(transactions));
  },
  getWallet: (userId: string): BizWallet | null => {
    try {
      const data = localStorage.getItem(`local_biz_wallet_${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  saveWallet: (userId: string, wallet: BizWallet) => {
    localStorage.setItem(`local_biz_wallet_${userId}`, JSON.stringify(wallet));
  },
  getAllWallets: (): BizWallet[] => {
    const wallets: BizWallet[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('local_biz_wallet_')) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            wallets.push(JSON.parse(val));
          } catch(e) {}
        }
      }
    }
    return wallets;
  }
};

export default function BizLinkUganda({ onClose, onMinimize, isMinimized }: BizLinkUgandaProps) {
  const { user: storeUser } = useAuthStore();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isSessionSynced, setIsSessionSynced] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const user = sessionUser || storeUser;

  // Shared session listener for seamless auto-authentication from Donalisa
  useEffect(() => {
    setSessionLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setSessionUser(docSnap.data());
          } else {
            const isUserAdmin = fbUser.email === 'admin@donalisa.com' || fbUser.email === 'ssakalivingstone25@gmail.com';
            setSessionUser({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Subscriber',
              role: isUserAdmin ? 'admin' : 'viewer',
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('BizLink Session Sync fallback:', e);
          const isUserAdmin = fbUser.email === 'admin@donalisa.com' || fbUser.email === 'ssakalivingstone25@gmail.com';
          setSessionUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Subscriber',
            role: isUserAdmin ? 'admin' : 'viewer',
            createdAt: new Date().toISOString()
          });
        }
        setIsSessionSynced(true);
      } else {
        setSessionUser(null);
        setIsSessionSynced(false);
      }
      setSessionLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'shops' | 'ledger' | 'admin' | 'businessman'>('map');
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  
  // Dynamic collections state
  const [shops, setShops] = useState<BizShop[]>([]);
  const [products, setProducts] = useState<BizProduct[]>([]);
  const [transactions, setTransactions] = useState<BizTransaction[]>([]);
  const [wallet, setWallet] = useState<BizWallet | null>(null);
  const [allWallets, setAllWallets] = useState<BizWallet[]>([]); // For admin stats
  
  // Selection states
  const [selectedArcade, setSelectedArcade] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<BizShop | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<BizProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  
  // Custom BizLink Uganda States
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [selectedBusinessmanIdx, setSelectedBusinessmanIdx] = useState(0);
  
  // Payment Gateway states
  const [showCardGateway, setShowCardGateway] = useState(false);
  const [gatewaySessionId, setGatewaySessionId] = useState<string | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null);
  const [editingPaymentUrl, setEditingPaymentUrl] = useState('');
  const [editingBankAccountNumber, setEditingBankAccountNumber] = useState('');
  
  // Modal & form states
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<BizProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [shopNameField, setShopNameField] = useState('');
  const [shopArcadeField, setShopArcadeField] = useState('kikuubo');
  const [shopNoField, setShopNoField] = useState('');
  const [shopDescField, setShopDescField] = useState('');

  const [prodTitleField, setProdTitleField] = useState('');
  const [prodDescField, setProdDescField] = useState('');
  const [prodPriceField, setProdPriceField] = useState('');
  const [prodStockField, setProdStockField] = useState('5');
  const [prodCategoryField, setProdCategoryField] = useState('General');
  const [prodImageField, setProdImageField] = useState('');

  // Toast Helper
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Real-time listeners & Local Fallback
  useEffect(() => {
    if (!user) return;
    
    // If fallback is already active, do not bind listeners
    if (useLocalFallback) return;

    // 1. Listen to Shops
    const unsubShops = onSnapshot(collection(db, 'biz_shops'), (snap) => {
      const shopList: BizShop[] = [];
      snap.forEach((doc) => {
        shopList.push({ id: doc.id, ...doc.data() } as BizShop);
      });
      setShops(shopList);
    }, (err) => {
      console.warn("Shops listen error - falling back to localStorage:", err);
      setUseLocalFallback(true);
    });

    // 2. Listen to Products
    const unsubProds = onSnapshot(collection(db, 'biz_products'), (snap) => {
      const prodList: BizProduct[] = [];
      snap.forEach((doc) => {
        prodList.push({ id: doc.id, ...doc.data() } as BizProduct);
      });
      setProducts(prodList);
    }, (err) => {
      console.warn("Products listen error - falling back to localStorage:", err);
      setUseLocalFallback(true);
    });

    // 3. Listen to Transactions
    const unsubTrans = onSnapshot(collection(db, 'biz_transactions'), (snap) => {
      const transList: BizTransaction[] = [];
      snap.forEach((doc) => {
        transList.push({ id: doc.id, ...doc.data() } as BizTransaction);
      });
      // Sort newest first
      transList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setTransactions(transList);
    }, (err) => {
      console.warn("Transactions listen error - falling back to localStorage:", err);
      setUseLocalFallback(true);
    });

    // 4. Listen to Current User Wallet
    const unsubWallet = onSnapshot(doc(db, 'biz_wallets', user.uid), async (snap) => {
      if (snap.exists()) {
        setWallet(snap.data() as BizWallet);
      } else {
        // Create initial wallet document
        const initialWallet: BizWallet = {
          userId: user.uid,
          userName: user.displayName || user.email.split('@')[0],
          balanceUGX: 1500000, // Starts with 1.5M UGX
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'biz_wallets', user.uid), initialWallet);
          setWallet(initialWallet);
        } catch (err) {
          console.warn("Failed to set initial wallet on firestore, using local:", err);
          setUseLocalFallback(true);
        }
      }
    }, (err) => {
      console.warn("Wallet listen error - falling back to localStorage:", err);
      setUseLocalFallback(true);
    });

    // 5. Listen to All Wallets (Admins only)
    let unsubAllWallets = () => {};
    if (user.role === 'admin') {
      unsubAllWallets = onSnapshot(collection(db, 'biz_wallets'), (snap) => {
        const walletsList: BizWallet[] = [];
        snap.forEach((doc) => {
          walletsList.push(doc.data() as BizWallet);
        });
        setAllWallets(walletsList);
      }, (err) => {
        console.warn("All wallets listen error - falling back to localStorage:", err);
        setUseLocalFallback(true);
      });
    }

    return () => {
      unsubShops();
      unsubProds();
      unsubTrans();
      unsubWallet();
      unsubAllWallets();
    };
  }, [user, useLocalFallback]);

  // Load from local fallback if enabled
  useEffect(() => {
    if (!useLocalFallback || !user) return;
    
    // Set up local data
    const localShops = LocalDB.getShops();
    const localProducts = LocalDB.getProducts();
    const localTransactions = LocalDB.getTransactions();
    let localWallet = LocalDB.getWallet(user.uid);
    
    if (localShops.length === 0) {
      LocalDB.saveShops(SEED_SHOPS);
      setShops(SEED_SHOPS);
    } else {
      setShops(localShops);
    }
    
    if (localProducts.length === 0) {
      LocalDB.saveProducts(SEED_PRODUCTS);
      setProducts(SEED_PRODUCTS);
    } else {
      setProducts(localProducts);
    }

    setTransactions(localTransactions);

    if (!localWallet) {
      localWallet = {
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        balanceUGX: 1500000,
        updatedAt: new Date().toISOString()
      };
      LocalDB.saveWallet(user.uid, localWallet);
    }
    setWallet(localWallet);
    setAllWallets(LocalDB.getAllWallets());
  }, [useLocalFallback, user]);

  // Load settings when activeTab is 'businessman'
  useEffect(() => {
    if (activeTab === 'businessman' && user) {
      const myShop = shops.find(s => s.ownerId === user.uid);
      if (myShop) {
        setEditingPaymentUrl(myShop.paymentUrl || '');
        setEditingBankAccountNumber(myShop.bankAccountNumber || '');
      }
    }
  }, [activeTab, shops, user]);

  // Listen for BIZ_PAYMENT_COMPLETE message from card payment gateway iframe
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data && e.data.type === 'BIZ_PAYMENT_COMPLETE' && e.data.status === 'success') {
        const sessId = e.data.sessionId;
        await handleGatewaySuccess(sessId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkoutProduct, shops, user, useLocalFallback]);

  const handleGatewaySuccess = async (sessId: string) => {
    if (!checkoutProduct || !user) return;
    setLoading(true);
    try {
      // 1. Double check session with our backend
      const res = await fetch(`/api/biz/pay/status?session_id=${sessId}`);
      if (!res.ok) throw new Error("Could not verify card payment session status.");
      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error("Card payment session not authorized by clearing bank.");
      }

      // 2. Mark product as sold and stock = 0
      const prodId = checkoutProduct.id;
      if (useLocalFallback) {
        const localProducts = LocalDB.getProducts();
        const pIdx = localProducts.findIndex(p => p.id === prodId);
        if (pIdx !== -1) {
          localProducts[pIdx].status = 'sold';
          localProducts[pIdx].stock = 0;
          LocalDB.saveProducts(localProducts);
          setProducts(localProducts);
        }

        // Increment seller wallet
        const sellerId = checkoutProduct.ownerId;
        const sellerWallet = LocalDB.getWallet(sellerId) || {
          userId: sellerId,
          userName: "Kampala Seller",
          balanceUGX: 1500000,
          updatedAt: new Date().toISOString()
        };
        sellerWallet.balanceUGX += checkoutProduct.price;
        sellerWallet.updatedAt = new Date().toISOString();
        LocalDB.saveWallet(sellerId, sellerWallet);

        // Record txn
        const txnId = `txn_${Date.now()}`;
        const newTxn: BizTransaction = {
          id: txnId,
          productId: prodId,
          productTitle: checkoutProduct.title,
          price: checkoutProduct.price,
          sellerId: sellerId,
          sellerName: shops.find(s => s.id === checkoutProduct.shopId)?.shopName || 'Kampala Shop',
          buyerId: user.uid,
          buyerName: user.displayName || user.email.split('@')[0],
          status: 'completed',
          createdAt: new Date().toISOString() as any
        };
        const localTransactions = [newTxn, ...LocalDB.getTransactions()];
        LocalDB.saveTransactions(localTransactions);
        setTransactions(localTransactions);
        setAllWallets(LocalDB.getAllWallets());
      } else {
        const productRef = doc(db, 'biz_products', prodId);
        const sellerWalletRef = doc(db, 'biz_wallets', checkoutProduct.ownerId);
        const transCollectionRef = collection(db, 'biz_transactions');

        await runTransaction(db, async (txn) => {
          // Mark product as sold
          txn.update(productRef, { status: 'sold', stock: 0 });

          // Increment seller wallet
          const sellerSnap = await txn.get(sellerWalletRef);
          if (sellerSnap.exists()) {
            const curWallet = sellerSnap.data() as BizWallet;
            txn.update(sellerWalletRef, {
              balanceUGX: curWallet.balanceUGX + checkoutProduct.price,
              updatedAt: new Date().toISOString()
            });
          } else {
            txn.set(sellerWalletRef, {
              userId: checkoutProduct.ownerId,
              userName: "Kampala Seller",
              balanceUGX: 1500000 + checkoutProduct.price,
              updatedAt: new Date().toISOString()
            });
          }

          // Record txn
          const txnId = `txn_${Date.now()}`;
          const newTxn: BizTransaction = {
            id: txnId,
            productId: prodId,
            productTitle: checkoutProduct.title,
            price: checkoutProduct.price,
            sellerId: checkoutProduct.ownerId,
            sellerName: shops.find(s => s.id === checkoutProduct.shopId)?.shopName || 'Kampala Shop',
            buyerId: user.uid,
            buyerName: user.displayName || user.email.split('@')[0],
            status: 'completed',
            createdAt: new Date().toISOString() as any
          };
          txn.set(doc(transCollectionRef, txnId), newTxn);
        });
      }

      triggerToast(`Card Payment Cleared! "${checkoutProduct.title}" marked as SOLD. 🇺🇬💳🎉`, "success");
      setCheckoutProduct(null);
      setShowCardGateway(false);
      setGatewaySessionId(null);
      setGatewayUrl(null);
    } catch (err: any) {
      console.error("Gateway success processor failed:", err);
      triggerToast(err.message || "Failed to process card transaction.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithCard = async () => {
    if (!checkoutProduct || !user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/biz/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: checkoutProduct.id,
          productTitle: checkoutProduct.title,
          amount: checkoutProduct.price,
          shopId: checkoutProduct.shopId,
          shopName: shops.find(s => s.id === checkoutProduct.shopId)?.shopName || 'Verified Kampala Shop',
          buyerId: user.uid,
          buyerName: user.displayName || user.email.split('@')[0]
        })
      });

      if (!res.ok) throw new Error("Could not initialize card payment session.");
      const data = await res.json();
      
      if (data.success && data.checkoutUrl) {
        setGatewaySessionId(data.sessionId);
        setGatewayUrl(data.checkoutUrl);
        setShowCardGateway(true);
      } else {
        throw new Error("Invalid response from secure gateway.");
      }
    } catch (err: any) {
      console.error("Initiate card pay error:", err);
      triggerToast(err.message || "Failed to initialize card pay.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettlement = async (shopId: string) => {
    setLoading(true);
    try {
      if (useLocalFallback) {
        const localShops = LocalDB.getShops();
        const sIdx = localShops.findIndex(s => s.id === shopId);
        if (sIdx !== -1) {
          localShops[sIdx].paymentUrl = editingPaymentUrl;
          localShops[sIdx].bankAccountNumber = editingBankAccountNumber;
          LocalDB.saveShops(localShops);
          setShops(localShops);
        }
      } else {
        const shopRef = doc(db, 'biz_shops', shopId);
        await updateDoc(shopRef, {
          paymentUrl: editingPaymentUrl,
          bankAccountNumber: editingBankAccountNumber
        });
      }
      triggerToast("Bank settlement and payment details saved successfully! 🏦💳", "success");
    } catch (err: any) {
      console.error("Save settlement settings failed:", err);
      triggerToast("Failed to save bank settlement settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceProduct = async (prodId: string) => {
    setLoading(true);
    try {
      if (useLocalFallback) {
        const localProducts = LocalDB.getProducts();
        const pIdx = localProducts.findIndex(p => p.id === prodId);
        if (pIdx !== -1) {
          localProducts[pIdx].status = 'active';
          localProducts[pIdx].stock = 5;
          LocalDB.saveProducts(localProducts);
          setProducts(localProducts);
        }
      } else {
        const productRef = doc(db, 'biz_products', prodId);
        await updateDoc(productRef, {
          status: 'active',
          stock: 5
        });
      }
      triggerToast("Product replaced and put back active on Kampala City marketplace! 🛍️✨", "success");
    } catch (err: any) {
      console.error("Failed to replace product:", err);
      triggerToast("Failed to replace product on market.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Seed default marketplace data if completely empty
  const triggerSeeding = async () => {
    setLoading(true);
    try {
      if (useLocalFallback) {
        LocalDB.saveShops(SEED_SHOPS);
        setShops(SEED_SHOPS);
        LocalDB.saveProducts(SEED_PRODUCTS);
        setProducts(SEED_PRODUCTS);
        triggerToast("Seeded Kampala Virtual City with default Arcades and Products locally! 🇺🇬✨", "success");
        return;
      }

      const shopsSnap = await getDocs(collection(db, 'biz_shops'));
      if (shopsSnap.empty) {
        for (const shop of SEED_SHOPS) {
          await setDoc(doc(db, 'biz_shops', shop.id), shop);
        }
        for (const prod of SEED_PRODUCTS) {
          await setDoc(doc(db, 'biz_products', prod.id), prod);
        }
        triggerToast("Seeded Kampala Virtual City with default Arcades and Products! 🇺🇬✨", "success");
      }
    } catch (err) {
      console.error("Seeding error:", err);
      // Fallback to local
      setUseLocalFallback(true);
      LocalDB.saveShops(SEED_SHOPS);
      setShops(SEED_SHOPS);
      LocalDB.saveProducts(SEED_PRODUCTS);
      setProducts(SEED_PRODUCTS);
      triggerToast("Seeded Kampala Virtual City with default Arcades and Products locally! 🇺🇬✨", "success");
    } finally {
      setLoading(false);
    }
  };

  // Create Shop Handler
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!shopNameField || !shopNoField) {
      triggerToast("Please fill in shop name and number.", "error");
      return;
    }

    setLoading(true);
    try {
      const shopId = `shop_${user.uid}_${Date.now()}`;
      const recruitedBusinessman = UGANDAN_BUSINESSMEN[selectedBusinessmanIdx];
      const newShop: BizShop = {
        id: shopId,
        ownerId: user.uid,
        ownerName: user.displayName || user.email.split('@')[0],
        shopName: shopNameField,
        arcadeId: shopArcadeField,
        shopNumber: shopNoField,
        description: shopDescField,
        verified: true, // Auto-verified for premium experience!
        createdAt: new Date().toISOString(),
        assignedBusinessman: recruitedBusinessman
      };

      if (useLocalFallback) {
        const localShops = [...LocalDB.getShops(), newShop];
        LocalDB.saveShops(localShops);
        setShops(localShops);
      } else {
        await setDoc(doc(db, 'biz_shops', shopId), newShop);
      }
      triggerToast(`"${shopNameField}" shop launched successfully! Managed by ${recruitedBusinessman.name} 🏪`, "success");
      
      // Reset fields
      setShopNameField('');
      setShopNoField('');
      setShopDescField('');
      setShowCreateShopModal(false);
    } catch (err) {
      console.error("Create shop error:", err);
      triggerToast("Failed to set up shop.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add Product Handler
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedShop) return;
    if (!prodTitleField || !prodPriceField || !prodStockField) {
      triggerToast("Please fill in product title, price, and stock.", "error");
      return;
    }

    const price = parseInt(prodPriceField);
    const stock = parseInt(prodStockField);

    if (isNaN(price) || price <= 0) {
      triggerToast("Please enter a valid price in UGX.", "error");
      return;
    }

    setLoading(true);
    try {
      const prodId = `prod_${Date.now()}`;
      const defaultImages: { [key: string]: string } = {
        'Groceries': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60',
        'Electronics': 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&auto=format&fit=crop&q=60',
        'Textiles': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=60',
        'Footwear': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=60',
        'Cosmetics': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&auto=format&fit=crop&q=60',
        'General': 'https://images.unsplash.com/photo-1472851294608-062f824d296e?w=300&auto=format&fit=crop&q=60'
      };

      const finalImage = prodImageField || defaultImages[prodCategoryField] || defaultImages['General'];

      const newProd: BizProduct = {
        id: prodId,
        shopId: selectedShop.id,
        ownerId: user.uid,
        arcadeId: selectedShop.arcadeId,
        title: prodTitleField,
        description: prodDescField,
        price,
        imageUrl: finalImage,
        stock,
        category: prodCategoryField,
        createdAt: new Date().toISOString()
      };

      if (useLocalFallback) {
        const localProducts = [...LocalDB.getProducts(), newProd];
        LocalDB.saveProducts(localProducts);
        setProducts(localProducts);
      } else {
        await setDoc(doc(db, 'biz_products', prodId), newProd);
      }
      triggerToast(`"${prodTitleField}" listed successfully! 🛍️`, "success");
      
      // Reset
      setProdTitleField('');
      setProdDescField('');
      setProdPriceField('');
      setProdStockField('5');
      setProdImageField('');
      setShowAddProductModal(false);
    } catch (err) {
      console.error("Add product error:", err);
      triggerToast("Failed to list item.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Buy Product (Firestore Multi-Document Transaction)
  const handlePurchase = async () => {
    if (!user || !checkoutProduct || !wallet) return;

    if (wallet.balanceUGX < checkoutProduct.price) {
      triggerToast("Insufficient funds! Watch more streams or ask admin for funding.", "error");
      return;
    }

    setLoading(true);

    if (useLocalFallback) {
      try {
        const localProducts = LocalDB.getProducts();
        const prodIndex = localProducts.findIndex(p => p.id === checkoutProduct.id);
        if (prodIndex === -1) throw new Error("Product no longer exists.");
        const currentProd = localProducts[prodIndex];
        if (currentProd.stock <= 0) throw new Error("This item is out of stock.");

        const currentBuyerWallet = LocalDB.getWallet(user.uid);
        if (!currentBuyerWallet || currentBuyerWallet.balanceUGX < currentProd.price) {
          throw new Error("Insufficient balance.");
        }

        // Decrement stock
        currentProd.stock -= 1;
        LocalDB.saveProducts(localProducts);
        setProducts(localProducts);

        // Deduct buyer wallet
        currentBuyerWallet.balanceUGX -= currentProd.price;
        currentBuyerWallet.updatedAt = new Date().toISOString();
        LocalDB.saveWallet(user.uid, currentBuyerWallet);
        setWallet(currentBuyerWallet);

        // Increment seller wallet
        if (currentProd.ownerId !== user.uid && currentProd.ownerId !== 'system_admin') {
          const sellerWallet = LocalDB.getWallet(currentProd.ownerId) || {
            userId: currentProd.ownerId,
            userName: "Kampala Seller",
            balanceUGX: 1500000,
            updatedAt: new Date().toISOString()
          };
          sellerWallet.balanceUGX += currentProd.price;
          sellerWallet.updatedAt = new Date().toISOString();
          LocalDB.saveWallet(currentProd.ownerId, sellerWallet);
        }

        // Record transaction
        const transId = `txn_${Date.now()}`;
        const newTrans: BizTransaction = {
          id: transId,
          productId: currentProd.id,
          productTitle: currentProd.title,
          price: currentProd.price,
          sellerId: currentProd.ownerId,
          sellerName: shops.find(s => s.id === currentProd.shopId)?.shopName || 'Kampala Shop',
          buyerId: user.uid,
          buyerName: user.displayName || user.email.split('@')[0],
          status: 'completed',
          createdAt: new Date().toISOString() as any
        };
        const localTransactions = [newTrans, ...LocalDB.getTransactions()];
        LocalDB.saveTransactions(localTransactions);
        setTransactions(localTransactions);

        setAllWallets(LocalDB.getAllWallets());
        triggerToast(`Successfully purchased "${checkoutProduct.title}"! 🛍️🎉`, "success");
        setCheckoutProduct(null);
      } catch (err: any) {
        console.error("Local purchase transaction failed:", err);
        triggerToast(err.message || "Purchase failed.", "error");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const productRef = doc(db, 'biz_products', checkoutProduct.id);
      const buyerWalletRef = doc(db, 'biz_wallets', user.uid);
      const sellerWalletRef = doc(db, 'biz_wallets', checkoutProduct.ownerId);
      const transCollectionRef = collection(db, 'biz_transactions');

      // Execute atomic transaction
      await runTransaction(db, async (txn) => {
        // 1. Get latest product info
        const prodSnap = await txn.get(productRef);
        if (!prodSnap.exists()) {
          throw new Error("Product no longer exists.");
        }
        const currentProd = prodSnap.data() as BizProduct;
        if (currentProd.stock <= 0) {
          throw new Error("This item is out of stock.");
        }

        // 2. Get buyer latest wallet
        const buyerWalletSnap = await txn.get(buyerWalletRef);
        if (!buyerWalletSnap.exists()) {
          throw new Error("Your wallet does not exist.");
        }
        const currentBuyerWallet = buyerWalletSnap.data() as BizWallet;
        if (currentBuyerWallet.balanceUGX < currentProd.price) {
          throw new Error("Insufficient balance.");
        }

        // 3. Decrement Stock
        txn.update(productRef, { stock: currentProd.stock - 1 });

        // 4. Deduct Buyer Wallet
        txn.update(buyerWalletRef, { 
          balanceUGX: currentBuyerWallet.balanceUGX - currentProd.price,
          updatedAt: new Date().toISOString()
        });

        // 5. Increment Seller Wallet (If not the system admin or same person)
        if (currentProd.ownerId !== user.uid && currentProd.ownerId !== 'system_admin') {
          const sellerWalletSnap = await txn.get(sellerWalletRef);
          if (sellerWalletSnap.exists()) {
            const currentSellerWallet = sellerWalletSnap.data() as BizWallet;
            txn.update(sellerWalletRef, {
              balanceUGX: currentSellerWallet.balanceUGX + currentProd.price,
              updatedAt: new Date().toISOString()
            });
          } else {
            // Create seller wallet if missing
            txn.set(sellerWalletRef, {
              userId: currentProd.ownerId,
              userName: "Kampala Seller",
              balanceUGX: 1500000 + currentProd.price,
              updatedAt: new Date().toISOString()
            });
          }
        }

        // 6. Record transaction
        const transId = `txn_${Date.now()}`;
        const newTrans: BizTransaction = {
          id: transId,
          productId: currentProd.id,
          productTitle: currentProd.title,
          price: currentProd.price,
          sellerId: currentProd.ownerId,
          sellerName: shops.find(s => s.id === currentProd.shopId)?.shopName || 'Kampala Shop',
          buyerId: user.uid,
          buyerName: user.displayName || user.email.split('@')[0],
          status: 'completed',
          createdAt: new Date().toISOString() as any
        };
        
        // Write the transaction doc
        txn.set(doc(transCollectionRef, transId), newTrans);
      });

      triggerToast(`Successfully purchased "${checkoutProduct.title}"! 🛍️🎉`, "success");
      setCheckoutProduct(null);
    } catch (err: any) {
      console.error("Purchase transaction failed:", err);
      triggerToast(err.message || "Purchase failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fund Wallet (Admin & Dev shortcut)
  const fundWallet = async (amount: number) => {
    if (!user || !wallet) return;
    try {
      if (useLocalFallback) {
        const currentWallet = LocalDB.getWallet(user.uid);
        if (currentWallet) {
          currentWallet.balanceUGX += amount;
          currentWallet.updatedAt = new Date().toISOString();
          LocalDB.saveWallet(user.uid, currentWallet);
          setWallet(currentWallet);
          setAllWallets(LocalDB.getAllWallets());
        }
      } else {
        const walletRef = doc(db, 'biz_wallets', user.uid);
        await updateDoc(walletRef, {
          balanceUGX: wallet.balanceUGX + amount,
          updatedAt: new Date().toISOString()
        });
      }
      triggerToast(`Account credited with +${amount.toLocaleString()} UGX! 🪙`, "success");
    } catch (err) {
      console.error("Wallet credit error:", err);
      triggerToast("Failed to credit account.", "error");
    }
  };

  // Delete Shop Handler (Owner or Admin)
  const handleDeleteShop = async (shopId: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete "${name}"? All associated products will remain orphaned.`)) return;
    try {
      if (useLocalFallback) {
        const localShops = LocalDB.getShops().filter(s => s.id !== shopId);
        LocalDB.saveShops(localShops);
        setShops(localShops);
      } else {
        await deleteDoc(doc(db, 'biz_shops', shopId));
      }
      triggerToast(`Shop "${name}" deleted.`, "info");
      if (selectedShop?.id === shopId) setSelectedShop(null);
    } catch (err) {
      console.error("Delete shop error:", err);
      triggerToast("Failed to delete shop.", "error");
    }
  };

  // Toggle Merchant Verification (Admin only)
  const toggleVerifyShop = async (shopId: string, currentStatus: boolean) => {
    try {
      if (useLocalFallback) {
        const localShops = LocalDB.getShops();
        const shop = localShops.find(s => s.id === shopId);
        if (shop) {
          shop.verified = !currentStatus;
          LocalDB.saveShops(localShops);
          setShops(localShops);
        }
      } else {
        await updateDoc(doc(db, 'biz_shops', shopId), { verified: !currentStatus });
      }
      triggerToast(`Merchant verification status updated!`, "success");
    } catch (err) {
      console.error("Verify merchant error:", err);
    }
  };

  // Delete Product Listing (Owner or Admin)
  const handleDeleteProduct = async (prodId: string, title: string) => {
    if (!window.confirm(`Delete product listing "${title}"?`)) return;
    try {
      if (useLocalFallback) {
        const localProducts = LocalDB.getProducts().filter(p => p.id !== prodId);
        LocalDB.saveProducts(localProducts);
        setProducts(localProducts);
      } else {
        await deleteDoc(doc(db, 'biz_products', prodId));
      }
      triggerToast(`"${title}" has been deleted.`, "info");
      if (selectedProduct?.id === prodId) setSelectedProduct(null);
    } catch (err) {
      console.error("Delete product error:", err);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = productCategoryFilter === 'All' || p.category === productCategoryFilter;
    const matchesArcade = !selectedArcade || p.arcadeId === selectedArcade;
    return matchesSearch && matchesCategory && matchesArcade;
  });

  const categories = ['All', 'Groceries', 'Electronics', 'Textiles', 'Footwear', 'Cosmetics', 'General'];

  // User's own shop (limit 1 for simplicity)
  const userShop = shops.find(s => s.ownerId === user?.uid);

  // Stats calculation
  const totalTradeVolume = transactions.reduce((acc, curr) => acc + curr.price, 0);

  if (isMinimized) return null;

  return (
    <>
      {/* Background Dim Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-[4px] z-[45] transition-opacity duration-300"
        onClick={onMinimize}
      />

      <div className={`fixed z-[50] bg-[#0a0a0d]/98 backdrop-blur-md border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left font-sans text-gray-200 transition-all duration-300 ${
        isMaximized 
          ? 'inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] md:inset-4 md:w-[calc(100%-32px)] md:h-[calc(100%-32px)]' 
          : 'fixed inset-2 md:inset-x-4 md:inset-y-4 lg:inset-x-6 lg:inset-y-6 max-w-[1550px] mx-auto w-full h-[calc(100vh-16px)] md:h-[calc(100vh-32px)] lg:h-[calc(100vh-48px)]'
      }`}>

        {/* SPLASH SCREEN ENTRY PORTAL */}
        <AnimatePresence>
          {showSplashScreen && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#07070a]/98 z-[70] flex flex-col items-center justify-center p-6 text-center overflow-y-auto py-16"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.45 }}
                className="max-w-md w-full space-y-6 pt-12"
              >
                {/* BRAND LOGO - PROFESSIONALLY PLACED AND EXTENDED DOWN TO PREVENT ANY TOP CUTOFF */}
                <div className="relative mx-auto w-72 h-36 flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30 p-4 bg-white mt-4">
                  <img 
                    src={bizlinkLogo} 
                    alt="BizLink Uganda" 
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* DESCRIPTION & WELCOME TEXT */}
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider font-mono">
                    BizLink Uganda
                  </h2>
                  <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase">
                    Connecting Businesses • Building Futures
                  </p>
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent w-full my-4" />
                  <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                    Welcome to the ultimate B2B & B2C interactive commerce gateway. Explore local trade, buy items, launch a customized storefront, and hire professional business managers to handle operations.
                  </p>
                </div>

                {/* QUICK SEGMENT INFO */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/10 space-y-1">
                    <span className="text-[10px] font-mono font-black text-cyan-400 uppercase">For Customers</span>
                    <p className="text-[11px] text-gray-400 leading-tight">Explore verified shops, purchase products, and view transaction records for free.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 space-y-1">
                    <span className="text-[10px] font-mono font-black text-yellow-400 uppercase">For Businessmen</span>
                    <p className="text-[11px] text-gray-400 leading-tight">Buy custom shops, list products, and hire managers to coordinate retail operations.</p>
                  </div>
                </div>

                {/* ENTER BUTTON */}
                <button
                  onClick={() => setShowSplashScreen(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black text-xs font-black rounded-xl shadow-lg shadow-cyan-500/10 tracking-widest uppercase transition-all duration-300 hover:translate-y-[-1px] active:translate-y-[0px] cursor-pointer"
                >
                  Enter BizLink Uganda
                </button>
                
                <div className="text-[9px] font-mono text-gray-600 flex items-center justify-center gap-1.5">
                  {isSessionSynced && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  <span>Logged in as <span className="text-gray-400 font-bold">{user?.displayName || user?.email}</span></span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* WINDOW TITLE BAR */}
        <div className="bg-[#111115] border-b border-cyan-500/25 px-4 py-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/40" />
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h1 className="text-xs sm:text-sm font-black text-white tracking-widest font-mono flex items-center gap-1.5 uppercase">
              <span>BizLink Uganda</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">Kampala City Simulator</span>
              {isSessionSynced && (
                <span className="hidden md:inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/25 font-mono uppercase tracking-normal">
                  <UserCheck className="w-2.5 h-2.5" /> Shared Session Connected
                </span>
              )}
              {useLocalFallback && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 font-mono tracking-normal animate-pulse">RESILIENT SANDBOX ACTIVE</span>
              )}
            </h1>
          </div>
          
          {/* WINDOW CONTROLS */}
          <div className="flex items-center gap-1.5">
            {/* Quick Wallet Balance in Titlebar */}
            {wallet && (
              <div className="hidden md:flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg text-[10px] font-mono font-black text-cyan-400 mr-4">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span>{wallet.balanceUGX.toLocaleString()} UGX</span>
              </div>
            )}

            <button 
              onClick={onMinimize} 
              title="Minimize Window"
              className="p-1 rounded-md text-[#888] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setIsMaximized(!isMaximized)} 
              title={isMaximized ? "Restore Size" : "Maximize Window"}
            className="p-1 rounded-md text-[#888] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose} 
            title="Close Window"
            className="p-1 rounded-md text-red-500 hover:text-white hover:bg-red-600/20 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATION CONTAINER */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 max-w-sm text-xs font-semibold ${
              toast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' 
                : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-300'
                  : 'bg-cyan-950/90 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INNER VIEWPORT WRAPPER */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-[#08080b]">
        
        {/* SIDE BAR NAVIGATION */}
        <div className="w-full md:w-56 bg-[#0c0c11] border-b md:border-b-0 md:border-r border-[#1c1c24] p-3 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible shrink-0 select-none">
          <button
            onClick={() => { setActiveTab('map'); setSelectedArcade(null); setSelectedShop(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer w-full text-left ${
              activeTab === 'map' 
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
                : 'text-[#88888a] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Explore Trade Sectors</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('shops'); setSelectedShop(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer w-full text-left ${
              activeTab === 'shops' 
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
                : 'text-[#88888a] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Store className="w-4 h-4 text-cyan-400" />
            <span>Browse All Shops</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer w-full text-left ${
              activeTab === 'ledger' 
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
                : 'text-[#88888a] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Receipt className="w-4 h-4 text-cyan-400" />
            <span>My Ledger & Wallet</span>
          </button>

          <button
            onClick={() => setActiveTab('businessman')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer w-full text-left ${
              activeTab === 'businessman' 
                ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/40 shadow-lg shadow-yellow-500/5' 
                : 'text-[#88888a] hover:text-yellow-400 hover:bg-yellow-500/5 border border-transparent'
            }`}
          >
            <Briefcase className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span>Businessman Dashboard</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer w-full text-left ${
                activeTab === 'admin' 
                  ? 'bg-red-600/10 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/5' 
                  : 'text-[#88888a] hover:text-red-400 hover:bg-red-500/5 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Admin Control Tower</span>
            </button>
          )}

          {/* Quick Info Block */}
          <div className="hidden md:block mt-auto p-3.5 rounded-xl bg-cyan-950/10 border border-cyan-500/10 text-[10px] text-cyan-500/80 leading-relaxed font-mono">
            <p className="font-bold text-cyan-400 flex items-center gap-1 uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Ugandan Market</span>
            </p>
            This interactive commerce gateway allows you to explore active trade sectors, buy items from verified merchants, and recruit professional businessmen to manage your virtual shops!
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 min-h-0">
          
          {/* TAB 1: KAMPALA ARCADES MAP */}
          {activeTab === 'map' && !selectedArcade && (
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>BIZLINK UGANDA TRADE HUB</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">Explore Sectors</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">Select an active commerce sector below to explore retail storefronts and source wholesale products from assigned businessmen.</p>
              </div>

              {/* EMPTY STATE TRIGGER FOR SEED DATA */}
              {shops.length === 0 && (
                <div className="p-6 rounded-2xl bg-[#0e0e15] border border-cyan-500/10 text-center space-y-3.5">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto text-cyan-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">City Market is Empty!</h4>
                    <p className="text-xs text-gray-400 mt-1">Would you like to auto-populate Kampala city with the initial wholesale merchants and electronic stores?</p>
                  </div>
                  <button 
                    onClick={triggerSeeding}
                    disabled={loading}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {loading ? "Seeding Marketplace..." : "Seed Kampala Sector Data"}
                  </button>
                </div>
              )}

              {/* GRID OF FAMOUS ARCADES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {KAMPALA_ARCADES.map(arcade => {
                  const arcadeShops = shops.filter(s => s.arcadeId === arcade.id);
                  return (
                    <div 
                      key={arcade.id}
                      onClick={() => setSelectedArcade(arcade.id)}
                      className={`p-4 rounded-xl border hover:border-cyan-500/40 transition-all cursor-pointer hover:translate-y-[-2px] group text-left ${arcade.color}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border" style={{ borderColor: 'inherit' }}>
                          {arcade.vibe}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 font-bold">{arcade.stats}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white mt-3 group-hover:text-cyan-400 transition-colors">{arcade.name}</h3>
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{arcade.description}</p>
                      
                      <div className="mt-4 pt-3.5 border-t border-[#1c1c24] flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 flex items-center gap-1 font-mono">
                          <Store className="w-3.5 h-3.5 text-cyan-400" />
                          <strong>{arcadeShops.length}</strong> Active Shops
                        </span>
                        <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-all inline-flex items-center gap-0.5">
                          Step Inside &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ARCADE DETAIL SCREEN */}
          {activeTab === 'map' && selectedArcade && !selectedShop && (
            <div className="space-y-6">
              {/* Back navigation */}
              <button 
                onClick={() => setSelectedArcade(null)}
                className="text-xs text-cyan-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                &larr; Return to Domain Sectors
              </button>

              {/* Header card */}
              {(() => {
                const arcadeInfo = KAMPALA_ARCADES.find(a => a.id === selectedArcade)!;
                const arcadeShops = shops.filter(s => s.arcadeId === selectedArcade);
                return (
                  <div className="p-5 rounded-2xl bg-[#0c0c12] border border-cyan-500/10 text-left">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-base font-black text-white">{arcadeInfo.name}</h2>
                    </div>
                    <p className="text-xs text-[#888] mt-1">{arcadeInfo.vibe} &bull; {arcadeInfo.description}</p>
                    
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="text-xs font-mono bg-[#111] border border-[#222] px-3 py-1.5 rounded-xl text-gray-400 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-cyan-400" />
                        <strong>{arcadeShops.length}</strong> Shops Established
                      </span>

                      {!userShop && (
                        <button
                          onClick={() => {
                            setShopArcadeField(selectedArcade);
                            setShowCreateShopModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buy My Shop Here</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* LIST OF SHOPS IN THIS ARCADE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Merchants & Retailers inside Sector</h3>
                
                {shops.filter(s => s.arcadeId === selectedArcade).length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#0c0c11] border border-[#1a1a24] text-center text-xs text-gray-500">
                    No shops set up in this sector yet. Be the first to start a business here!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {shops.filter(s => s.arcadeId === selectedArcade).map(shop => {
                      const shopProducts = products.filter(p => p.shopId === shop.id);
                      return (
                        <div 
                          key={shop.id}
                          className="p-4 rounded-xl bg-[#0e0e14] border border-[#1c1c24] hover:border-cyan-500/25 transition-all text-left flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-black text-white truncate max-w-[70%]">{shop.shopName}</h4>
                              <div className="flex items-center gap-1.5">
                                {shop.verified && (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Verified</span>
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/35 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                                  {shop.shopNumber}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">{shop.description}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#1a1a24] flex items-center justify-between">
                            <span className="text-[10px] font-mono text-gray-500">
                              {shopProducts.length} items listed
                            </span>
                            <div className="flex items-center gap-1.5">
                              {shop.ownerId === user?.uid && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteShop(shop.id, shop.shopName); }}
                                  className="p-1.5 rounded bg-red-600/10 hover:bg-red-600/20 text-red-500 transition-colors cursor-pointer"
                                  title="Close Business"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedShop(shop)}
                                className="px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black text-[11px] font-extrabold rounded-lg transition-all cursor-pointer"
                              >
                                View Shop Shelf
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BROWSE ALL SHOPS */}
          {activeTab === 'shops' && !selectedShop && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                    <Store className="w-5 h-5 text-cyan-400" />
                    <span>MARKETPLACE DIRECTORY</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Browse and buy from all active arcade merchants across the virtual city.</p>
                </div>
                
                {/* Search and Category Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input 
                      type="text"
                      placeholder="Search listings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[#0e0e14] border border-[#222] pl-8 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-44"
                    />
                  </div>
                  
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="bg-[#0e0e14] border border-[#222] px-2.5 py-1.5 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LISTINGS GRID */}
              {filteredProducts.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#0c0c11] border border-[#1a1a24] text-center text-xs text-gray-500">
                  No products or items match your search. Be the first to sell something!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map(prod => {
                    const parentShop = shops.find(s => s.id === prod.shopId);
                    return (
                      <div 
                        key={prod.id}
                        className="p-3 rounded-xl bg-[#0e0e14] border border-[#1c1c24] flex flex-col justify-between hover:border-cyan-500/20 transition-all text-left"
                      >
                        <div>
                          {/* Image */}
                          <div className="w-full h-32 rounded-lg overflow-hidden bg-black/40 border border-[#222] relative">
                            <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 text-[9px] font-bold font-mono px-2 py-0.5 bg-black/70 text-cyan-400 border border-cyan-500/20 rounded-md">
                              {prod.category}
                            </span>
                            {prod.stock <= 2 && prod.stock > 0 && (
                              <span className="absolute top-2 left-2 text-[8px] font-bold font-mono px-1.5 py-0.5 bg-red-600 text-white rounded">
                                LOW STOCK ({prod.stock})
                              </span>
                            )}
                            {prod.stock === 0 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-black text-red-500 font-mono tracking-widest bg-opacity-70">
                                OUT OF STOCK
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <span className="text-[9px] font-mono font-bold text-gray-500 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-cyan-500" />
                              {parentShop?.shopName || 'Kampala Shop'} ({parentShop?.shopNumber || 'G-12'})
                            </span>
                            <h4 className="text-xs font-black text-white mt-1 line-clamp-1">{prod.title}</h4>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-2.5 border-t border-[#1a1a24] flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-yellow-400">
                            {prod.price.toLocaleString()} UGX
                          </span>

                          <div className="flex items-center gap-1">
                            {prod.ownerId === user?.uid && (
                              <button
                                onClick={() => handleDeleteProduct(prod.id, prod.title)}
                                className="p-1.5 rounded bg-red-600/10 hover:bg-red-600/20 text-red-500 transition-all cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              disabled={prod.stock === 0}
                              onClick={() => setCheckoutProduct(prod)}
                              className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                prod.stock === 0
                                  ? 'bg-gray-800 text-gray-500'
                                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/5'
                              }`}
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Buy Now</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ARCADE/SHOP ACTIVE VIEW */}
          {selectedShop && (
            <div className="space-y-6">
              {/* Navigation Back */}
              <button 
                onClick={() => setSelectedShop(null)}
                className="text-xs text-cyan-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                &larr; Back to Sector Shops
              </button>

              {/* Shop Board Display */}
              <div className="p-5 rounded-2xl bg-[#0c0c12] border border-cyan-500/20 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-lg font-extrabold text-white">{selectedShop.shopName}</h2>
                      {selectedShop.verified && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Merchant</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#888] font-mono mt-1">
                      {selectedShop.shopNumber} &bull; {KAMPALA_ARCADES.find(a => a.id === selectedShop.arcadeId)?.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 max-w-xl leading-relaxed">{selectedShop.description}</p>
                    
                    {/* Assigned Businessman Profile */}
                    {selectedShop.assignedBusinessman && (
                      <div className="mt-5 p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 max-w-2xl">
                        <img 
                          src={selectedShop.assignedBusinessman.avatarUrl} 
                          alt={selectedShop.assignedBusinessman.name}
                          className="w-12 h-12 rounded-xl object-cover border border-cyan-500/30"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-black text-white">{selectedShop.assignedBusinessman.name}</h4>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20 uppercase tracking-wide">
                              {selectedShop.assignedBusinessman.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                            {selectedShop.assignedBusinessman.experience}
                          </p>
                          <div className="text-[10px] text-cyan-500/80 font-mono mt-1 flex items-center gap-2">
                            <span>📞 Contact: {selectedShop.assignedBusinessman.phone}</span>
                            <span>•</span>
                            <span className="text-emerald-400">● {selectedShop.assignedBusinessman.status}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {selectedShop.ownerId === user?.uid && (
                      <button
                        onClick={() => setShowAddProductModal(true)}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>List New Product</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SHELF PRODUCTS OF THIS SHOP */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Store Front Goods Shelf</h3>
                
                {products.filter(p => p.shopId === selectedShop.id).length === 0 ? (
                  <div className="p-12 rounded-xl bg-[#0e0e14] border border-[#1c1c24] text-center text-xs text-gray-500">
                    No items listed in this shop yet. 
                    {selectedShop.ownerId === user?.uid && " List your first product now!"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {products.filter(p => p.shopId === selectedShop.id).map(prod => (
                      <div 
                        key={prod.id}
                        className="p-3 rounded-xl bg-[#0e0e14] border border-[#1c1c24] flex flex-col justify-between hover:border-cyan-500/20 transition-all text-left font-sans"
                      >
                        <div>
                          <div className="w-full h-32 rounded-lg overflow-hidden bg-black/40 border border-[#222] relative">
                            <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 text-[9px] font-bold font-mono px-2 py-0.5 bg-black/75 text-cyan-400 rounded-md border border-cyan-500/20">
                              {prod.category}
                            </span>
                            {prod.stock <= 2 && prod.stock > 0 && (
                              <span className="absolute top-2 left-2 text-[8px] font-bold font-mono px-1.5 py-0.5 bg-red-600 text-white rounded">
                                ONLY {prod.stock} LEFT
                              </span>
                            )}
                            {prod.stock === 0 && (
                              <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-[10px] font-black text-red-500 font-mono tracking-widest">
                                OUT OF STOCK
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <h4 className="text-xs font-black text-white">{prod.title}</h4>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-2.5 border-t border-[#1a1a24] flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-yellow-400">
                            {prod.price.toLocaleString()} UGX
                          </span>

                          <div className="flex items-center gap-1">
                            {prod.ownerId === user?.uid && (
                              <button
                                onClick={() => handleDeleteProduct(prod.id, prod.title)}
                                className="p-1.5 rounded bg-red-600/10 hover:bg-red-600/20 text-red-500 transition-all cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              disabled={prod.stock === 0}
                              onClick={() => setCheckoutProduct(prod)}
                              className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                prod.stock === 0
                                  ? 'bg-gray-800 text-gray-500'
                                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/5'
                              }`}
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Buy Now</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LEDGER & WALLET */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* WALLET BOARD */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c0c16] to-[#08080f] border border-cyan-500/20 text-left flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl" />
                  <div>
                    <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Kampala Coin Wallet</span>
                    </span>
                    <h3 className="text-xl font-mono font-black text-white mt-2.5">
                      {wallet ? wallet.balanceUGX.toLocaleString() : '0'} <span className="text-xs text-cyan-400 font-sans">UGX</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1 font-mono">Holder: {wallet?.userName}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1a1a24] flex items-center gap-2">
                    <button
                      onClick={() => fundWallet(500000)}
                      className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-white text-[10px] font-mono font-bold rounded-lg transition-all border border-cyan-500/10 cursor-pointer flex-1 text-center"
                    >
                      +500K UGX Credit
                    </button>
                    <button
                      onClick={() => fundWallet(1000000)}
                      className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-white text-[10px] font-mono font-bold rounded-lg transition-all border border-yellow-500/10 cursor-pointer flex-1 text-center"
                    >
                      +1M UGX Credit
                    </button>
                  </div>
                </div>

                {/* MY SHOP STATS */}
                <div className="p-5 rounded-2xl bg-[#0c0c12] border border-[#1c1c24] text-left flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-cyan-400" />
                      <span>My Business Status</span>
                    </span>
                    
                    {userShop ? (
                      <div className="mt-2.5">
                        <h4 className="text-xs font-black text-white truncate">{userShop.shopName}</h4>
                        <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{userShop.shopNumber} &bull; {KAMPALA_ARCADES.find(a => a.id === userShop.arcadeId)?.name}</p>
                        <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
                          {userShop.verified ? "Verified Merchant Badge Active 🛡️" : "Verification Pending Admin..."}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-[11px] text-gray-500">You do not have a retail outlet yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1a1a24]">
                    {userShop ? (
                      <button
                        onClick={() => setSelectedShop(userShop)}
                        className="w-full text-center py-1 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-[10px] font-extrabold text-cyan-400 rounded-lg transition-all cursor-pointer"
                      >
                        Manage My Shelf Listings
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShopArcadeField('kikuubo');
                          setShowCreateShopModal(true);
                        }}
                        className="w-full text-center py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-black rounded-lg transition-all cursor-pointer"
                      >
                        Open My Shop Now
                      </button>
                    )}
                  </div>
                </div>

                {/* ECONOMIC CLIMATE */}
                <div className="p-5 rounded-2xl bg-[#0c0c12] border border-[#1c1c24] text-left flex flex-col justify-between font-mono text-[10px]">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-400 font-sans" />
                      <span> Kampala Economy</span>
                    </span>
                    <div className="mt-3.5 space-y-1.5 text-gray-400">
                      <div className="flex justify-between">
                        <span>Total Outlets:</span>
                        <span className="text-white font-bold">{shops.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Listings:</span>
                        <span className="text-white font-bold">{products.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Global Trade:</span>
                        <span className="text-yellow-400 font-bold">{totalTradeVolume.toLocaleString()} UGX</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1a1a24] text-center text-gray-500 text-[9px]">
                    Trade updates synced instantly.
                  </div>
                </div>
              </div>

              {/* MY TRANSACTION HISTORIES */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono text-left flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                  <span>My Transaction History Ledger</span>
                </h3>

                {transactions.filter(t => t.buyerId === user?.uid || t.sellerId === user?.uid).length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#0c0c11] border border-[#1a1a24] text-center text-xs text-gray-500">
                    No transactions recorded on this account yet. Go buy some wholesale products in Kikuubo!
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#1c1c24] bg-[#0c0c12]">
                    <table className="w-full text-[11px] text-left font-mono text-gray-400 border-collapse">
                      <thead>
                        <tr className="bg-[#111118] border-b border-[#1c1c24] text-gray-200">
                          <th className="p-2.5">Tx ID</th>
                          <th className="p-2.5">Product</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Counterparty</th>
                          <th className="p-2.5 text-right">Price (UGX)</th>
                          <th className="p-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#181820]">
                        {transactions.filter(t => t.buyerId === user?.uid || t.sellerId === user?.uid).map(t => {
                          const isBuyer = t.buyerId === user?.uid;
                          return (
                            <tr key={t.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-2.5 truncate max-w-[80px] text-gray-500">{t.id}</td>
                              <td className="p-2.5 font-sans font-bold text-white">{t.productTitle}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-sans ${
                                  isBuyer ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {isBuyer ? 'DEBIT (BUY)' : 'CREDIT (SELL)'}
                                </span>
                              </td>
                              <td className="p-2.5 text-white truncate max-w-[120px]">
                                {isBuyer ? `Seller: ${t.sellerName}` : `Buyer: ${t.buyerName}`}
                              </td>
                              <td className={`p-2.5 text-right font-black ${isBuyer ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isBuyer ? '-' : '+'}{t.price.toLocaleString()} UGX
                              </td>
                              <td className="p-2.5 text-right">
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/25 px-1.5 py-0.5 rounded-full">
                                  COMPLETED
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BUSINESSMAN DASHBOARD */}
          {activeTab === 'businessman' && (
            <div className="space-y-6">
              {(() => {
                const myShop = shops.find(s => s.ownerId === user?.uid);
                if (!myShop) {
                  return (
                    <div className="p-8 md:p-12 rounded-2xl bg-gradient-to-br from-[#0c0c16] to-[#08080f] border border-cyan-500/15 text-left max-w-2xl mx-auto space-y-6">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                        <Store className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-white font-mono uppercase tracking-wide">Acquire Your Kampala Virtual Shop</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          BizLink Uganda allows you to set up retail businesses inside Kampala's busiest commercial centers like Nabukeera, Kikuubo, or Arua Park. Once you buy a shop, you unlock this professional Businessman Dashboard.
                        </p>
                      </div>

                      <div className="p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10 text-[11px] text-yellow-400/90 leading-relaxed font-mono">
                        💡 <strong>How to start your business:</strong> Go to the "Explore Trade Sectors" map tab, select any Kampala Arcade, scroll to the bottom, and click "Purchase Retail Shop Slot". You will then be able to configure settlement pathways and list your goods!
                      </div>

                      <button
                        onClick={() => setActiveTab('map')}
                        className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all cursor-pointer font-sans"
                      >
                        Explore Kampala Sectors Map
                      </button>
                    </div>
                  );
                }

                const myProducts = products.filter(p => p.shopId === myShop.id);
                const mySales = transactions.filter(t => t.sellerId === myShop.id);

                return (
                  <div className="space-y-6 text-left animate-fadeIn">
                    {/* Header Summary Banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0d0e1a] to-[#07070d] border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-400 px-2.5 py-0.5 rounded-full border border-yellow-500/20 uppercase">
                            Kampala Licensed Merchant
                          </span>
                          {myShop.verified && (
                            <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
                              ✓ VERIFIED
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-black text-white mt-2 uppercase tracking-wide font-mono">{myShop.shopName}</h2>
                        <p className="text-xs text-gray-400 mt-1">
                          Located at <strong className="text-cyan-400">{myShop.arcadeId.toUpperCase()} Arcade</strong>, Slot {myShop.shopNumber || 'N/A'}. 
                          {myShop.assignedBusinessman ? (
                            <span> Assigned Manager: <strong className="text-yellow-400">{myShop.assignedBusinessman.name}</strong></span>
                          ) : (
                            <span className="text-gray-500"> No local manager hired.</span>
                          )}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedShop(myShop);
                            setShowAddProductModal(true);
                          }}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>List New Product</span>
                        </button>
                      </div>
                    </div>

                    {/* TWO COLUMN GRID: Settlement Settings vs Performance */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Settlement settings form */}
                      <div className="lg:col-span-1 p-5 rounded-2xl bg-[#09090f] border border-cyan-500/10 space-y-4">
                        <div className="border-b border-[#1c1c24] pb-3">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-cyan-400" />
                            <span>Settlement & Payouts</span>
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-0.5">Specify where customer card purchases will clear and settle.</p>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-black block">Settlement Bank Account</label>
                            <input 
                              type="text"
                              value={editingBankAccountNumber}
                              onChange={(e) => setEditingBankAccountNumber(e.target.value)}
                              placeholder="Centenary Bank, Acc: 0123456789"
                              className="w-full bg-[#111118] border border-[#222] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/30 focus:outline-none transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-black block">Custom Gateway Webhook URL</label>
                            <input 
                              type="text"
                              value={editingPaymentUrl}
                              onChange={(e) => setEditingPaymentUrl(e.target.value)}
                              placeholder="https://mygateway.co.ug/api/payout"
                              className="w-full bg-[#111118] border border-[#222] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500/30 focus:outline-none transition-colors"
                            />
                          </div>

                          <button
                            onClick={() => handleSaveSettlement(myShop.id)}
                            disabled={loading}
                            className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-800 text-black text-xs font-extrabold tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save Settlement Details</span>
                          </button>
                        </div>
                      </div>

                      {/* Right: Performance cards */}
                      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#0e0e14] border border-[#1c1c24] flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block">Cash Register Total Sales</span>
                            <h4 className="text-2xl font-mono font-black text-white mt-1.5">
                              {mySales.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()} UGX
                            </h4>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-4 border-t border-[#1a1a24] pt-2">
                            From {mySales.length} cleared card/wallet transactions.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0e0e14] border border-[#1c1c24] flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block">Hired Manager Productivity</span>
                            <h4 className="text-2xl font-mono font-black text-cyan-400 mt-1.5">
                              {myShop.assignedBusinessman ? `${myShop.assignedBusinessman.multiplier}x Multiplier` : "Manual Operations"}
                            </h4>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-4 border-t border-[#1a1a24] pt-2">
                            {myShop.assignedBusinessman ? `Hired: ${myShop.assignedBusinessman.name}` : "Hiring a manager boosts shop trade visibility!"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* LIVE PRODUCTS list on the Market */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#1c1c24] pb-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">My Marketplace Listings ({myProducts.length})</h3>
                        <p className="text-[10px] text-gray-500">Items sold out can be instantly restocked and put back online.</p>
                      </div>

                      {myProducts.length === 0 ? (
                        <div className="p-12 rounded-2xl bg-[#0a0a0f] border border-[#1c1c24] text-center space-y-3">
                          <p className="text-xs text-gray-500">No goods on your store's shelf yet.</p>
                          <button
                            onClick={() => {
                              setSelectedShop(myShop);
                              setShowAddProductModal(true);
                            }}
                            className="px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg transition-all border border-cyan-500/20 cursor-pointer inline-block"
                          >
                            + List First Item
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {myProducts.map(prod => {
                            const isSold = prod.status === 'sold' || prod.stock === 0;
                            return (
                              <div key={prod.id} className="p-4 rounded-xl bg-[#0a0a0f] border border-[#1c1c24] flex flex-col justify-between space-y-3.5 hover:border-cyan-500/20 transition-all">
                                <div className="flex gap-3">
                                  <img src={prod.imageUrl} alt={prod.title} className="w-16 h-16 rounded-lg object-cover bg-black border border-[#222]" />
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-widest">{prod.category}</span>
                                    <h4 className="text-xs font-bold text-white line-clamp-1">{prod.title}</h4>
                                    <p className="text-xs font-mono text-yellow-400 font-bold">{prod.price.toLocaleString()} UGX</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[#1a1a24]">
                                  <div>
                                    <span className="text-[9px] font-mono text-gray-500 block uppercase">Status</span>
                                    {isSold ? (
                                      <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                        <span>SOLD OUT</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>LIVE ON SHELF ({prod.stock} left)</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex gap-2">
                                    {isSold ? (
                                      <button
                                        onClick={() => handleReplaceProduct(prod.id)}
                                        className="px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black text-[10px] font-black rounded-lg transition-all cursor-pointer font-sans"
                                      >
                                        Restock / Replace
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleDeleteProduct(prod.id, prod.title)}
                                        className="px-2.5 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer border border-red-500/10 font-sans"
                                      >
                                        Delist Item
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* REAL SALES REVENUE LOGS */}
                    <div className="space-y-4">
                      <div className="border-b border-[#1c1c24] pb-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">My Settlement Cashflows</h3>
                      </div>

                      {mySales.length === 0 ? (
                        <div className="p-8 bg-[#0a0a0f] border border-[#1c1c24] rounded-2xl text-center text-xs text-gray-500 font-mono">
                          Waiting for your first client card clearance payout. Settle details will trigger automatically.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-[#1c1c24] rounded-xl bg-[#0a0a0f]">
                          <table className="w-full text-xs text-left font-mono">
                            <thead>
                              <tr className="bg-[#101015] border-b border-[#1c1c24] text-gray-400 uppercase tracking-wider text-[9px]">
                                <th className="p-3">Receipt ID</th>
                                <th className="p-3">Item Purchased</th>
                                <th className="p-3">Buyer Name</th>
                                <th className="p-3 text-right">Cash Cleared</th>
                                <th className="p-3 text-right">Settlement Route</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mySales.map(t => (
                                <tr key={t.id} className="border-b border-[#1a1a24] hover:bg-white/5 transition-colors text-gray-300">
                                  <td className="p-3 font-bold text-gray-500">{t.id}</td>
                                  <td className="p-3 text-white font-bold">{t.productTitle}</td>
                                  <td className="p-3">{t.buyerName}</td>
                                  <td className="p-3 text-right font-black text-emerald-400">+{t.price.toLocaleString()} UGX</td>
                                  <td className="p-3 text-right">
                                    <span className="text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-bold">
                                      {myShop.bankAccountNumber ? "BANK TRANSFER" : "ESCROW WALLET"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: ADMIN CONTROL PANEL (ADMIN ONLY) */}
          {activeTab === 'admin' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-red-600/5 border border-red-500/20 text-left">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldCheck className="w-5 h-5 text-red-500 animate-pulse" />
                  <span>Kampala Central Admin Control Tower</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">Monitor the virtual business economy, verify/audit shops, delete fraudulent listings, and review cash supplies.</p>
              </div>

              {/* GLOBALS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left font-mono">
                <div className="p-3.5 bg-[#0e0e14] border border-[#1c1c24] rounded-xl">
                  <span className="text-gray-500 text-[10px]">Total Trade Transactions</span>
                  <p className="text-lg font-black text-white mt-1">{transactions.length}</p>
                </div>
                <div className="p-3.5 bg-[#0e0e14] border border-[#1c1c24] rounded-xl">
                  <span className="text-gray-500 text-[10px]">Active Registered Shops</span>
                  <p className="text-lg font-black text-white mt-1">{shops.length}</p>
                </div>
                <div className="p-3.5 bg-[#0e0e14] border border-[#1c1c24] rounded-xl">
                  <span className="text-gray-500 text-[10px]">Verified Merchants</span>
                  <p className="text-lg font-black text-emerald-400 mt-1">
                    {shops.filter(s => s.verified).length}
                  </p>
                </div>
                <div className="p-3.5 bg-[#0e0e14] border border-[#1c1c24] rounded-xl">
                  <span className="text-gray-500 text-[10px]">Global Trade Volume</span>
                  <p className="text-lg font-black text-yellow-400 mt-1">{totalTradeVolume.toLocaleString()} UGX</p>
                </div>
              </div>

              {/* LIST OF REGISTERED SHOPS & VERIFY ACTIONS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono text-left">Master Retail Shops Directory</h4>
                
                {shops.length === 0 ? (
                  <p className="text-xs text-gray-500">No shops established yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#1c1c24] bg-[#0c0c12]">
                    <table className="w-full text-[11px] text-left font-mono text-gray-400 border-collapse">
                      <thead>
                        <tr className="bg-[#111118] border-b border-[#1c1c24] text-gray-200">
                          <th className="p-2.5">Shop Name</th>
                          <th className="p-2.5">Owner</th>
                          <th className="p-2.5">Location</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#181820]">
                        {shops.map(shop => (
                          <tr key={shop.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-2.5 text-white font-sans font-bold">{shop.shopName}</td>
                            <td className="p-2.5 text-gray-300">{shop.ownerName}</td>
                            <td className="p-2.5 text-cyan-400 font-semibold">{KAMPALA_ARCADES.find(a => a.id === shop.arcadeId)?.name} ({shop.shopNumber})</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                shop.verified ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/25' : 'bg-amber-950/40 text-amber-400 border border-amber-500/25'
                              }`}>
                                {shop.verified ? 'VERIFIED MERCHANT' : 'UNVERIFIED'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => toggleVerifyShop(shop.id, shop.verified)}
                                className={`px-2 py-1 rounded text-[10px] font-sans font-bold transition-all cursor-pointer ${
                                  shop.verified 
                                    ? 'bg-amber-600/10 text-amber-500 hover:bg-amber-600/20' 
                                    : 'bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20'
                                }`}
                              >
                                {shop.verified ? 'Revoke Verify' : 'Verify Shop'}
                              </button>
                              <button
                                onClick={() => handleDeleteShop(shop.id, shop.shopName)}
                                className="p-1.5 rounded bg-red-600/10 hover:bg-red-600/20 text-red-500 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER TASKBAR SUMMARY */}
      <div className="bg-[#0b0b0e] border-t border-cyan-500/15 p-2 px-4 flex items-center justify-between text-[10px] font-mono text-gray-500 shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Kampala Sub-Server: Online</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Outlets: {shops.length}</span>
          <span>Trade Vol: {totalTradeVolume.toLocaleString()} UGX</span>
        </div>
      </div>

      {/* CREATE SHOP MODAL */}
      <AnimatePresence>
        {showCreateShopModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e14] border border-cyan-500/30 rounded-2xl p-5 w-full max-w-md shadow-2xl text-left font-sans text-gray-200"
            >
              <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Buy Shop & Recruit Businessman</h3>
                </div>
                <button 
                  onClick={() => setShowCreateShopModal(false)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateShop} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Business / Shop Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., Kampala Premium Groceries Ltd"
                    value={shopNameField}
                    onChange={(e) => setShopNameField(e.target.value)}
                    className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Target Business Sector</label>
                    <select
                      value={shopArcadeField}
                      onChange={(e) => setShopArcadeField(e.target.value)}
                      className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {KAMPALA_ARCADES.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Shop Location Number</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g., Shop B-304, Level 3"
                      value={shopNoField}
                      onChange={(e) => setShopNoField(e.target.value)}
                      className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Description of Goods & Store</label>
                  <textarea 
                    rows={2}
                    placeholder="Describe what wholesale or retail products you sell..."
                    value={shopDescField}
                    onChange={(e) => setShopDescField(e.target.value)}
                    className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                {/* Businessman Recruitment Section */}
                <div>
                  <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Recruit Business Manager</label>
                  <p className="text-[10px] text-gray-500 mb-2">Hire an expert to run daily storefront operations on your behalf.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                    {UGANDAN_BUSINESSMEN.map((bm, idx) => (
                      <button
                        key={bm.name}
                        type="button"
                        onClick={() => setSelectedBusinessmanIdx(idx)}
                        className={`p-2 rounded-xl text-left border transition-all flex items-start gap-2 relative cursor-pointer ${
                          selectedBusinessmanIdx === idx
                            ? 'bg-cyan-500/10 border-cyan-400 shadow-md'
                            : 'bg-[#111] border-[#2c2c34] hover:border-gray-700'
                        }`}
                      >
                        <img 
                          src={bm.avatarUrl} 
                          alt={bm.name} 
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#333]" 
                        />
                        <div className="min-w-0">
                          <h4 className="text-[10px] font-bold text-white truncate">{bm.name}</h4>
                          <p className="text-[8px] text-cyan-400 truncate">{bm.role}</p>
                          <p className="text-[7px] text-gray-500 truncate mt-0.5">{bm.experience}</p>
                        </div>
                        {selectedBusinessmanIdx === idx && (
                          <div className="absolute top-1 right-1 bg-cyan-400 text-black rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[4]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cost Panel */}
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/15 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-black">Virtual Setup Fee</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">0 UGX <span className="text-[9px] font-mono text-emerald-500/80">(FREE OFFER)</span></span>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  {loading ? "Establishing Business..." : "Buy Shop & Hire Manager"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD PRODUCT MODAL */}
      <AnimatePresence>
        {showAddProductModal && selectedShop && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e14] border border-cyan-500/30 rounded-2xl p-5 w-full max-w-md shadow-2xl text-left font-sans text-gray-200"
            >
              <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">List Item for Sale</h3>
                </div>
                <button 
                  onClick={() => setShowAddProductModal(false)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Product Name / Title</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., Heavy Duty Extension Cord (5M)"
                    value={prodTitleField}
                    onChange={(e) => setProdTitleField(e.target.value)}
                    className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Price (UGX)</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g., 45000"
                      value={prodPriceField}
                      onChange={(e) => setProdPriceField(e.target.value)}
                      className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Initial Stock</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      value={prodStockField}
                      onChange={(e) => setProdStockField(e.target.value)}
                      className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Goods Category</label>
                    <select
                      value={prodCategoryField}
                      onChange={(e) => setProdCategoryField(e.target.value)}
                      className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Item Image URL (Optional)</label>
                    <input 
                      type="url"
                      placeholder="https://..."
                      value={prodImageField}
                      onChange={(e) => setProdImageField(e.target.value)}
                      className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Product Specifications</label>
                  <textarea 
                    rows={2}
                    placeholder="Specify sizing, materials, or warranty details..."
                    value={prodDescField}
                    onChange={(e) => setProdDescField(e.target.value)}
                    className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  {loading ? "Listing Product..." : "Deploy Listing to Shelf"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {checkoutProduct && wallet && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e14] border border-cyan-500/40 rounded-2xl p-5 w-full max-w-sm shadow-2xl text-left font-sans text-gray-200 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl" />
              
              <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Kampala Safe Pay</h3>
                </div>
                <button 
                  onClick={() => setCheckoutProduct(null)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Details */}
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 p-2 bg-[#111] rounded-xl border border-[#222]">
                  <img src={checkoutProduct.imageUrl} alt={checkoutProduct.title} className="w-14 h-14 rounded-lg object-cover bg-black/30 border border-[#222] shrink-0" />
                  <div>
                    <span className="text-[8px] font-mono font-bold uppercase text-cyan-400">{checkoutProduct.category}</span>
                    <h4 className="text-xs font-black text-white leading-tight mt-0.5">{checkoutProduct.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{shops.find(s => s.id === checkoutProduct.shopId)?.shopName || 'Kampala Shop'}</p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-b border-[#222] py-3.5 font-mono text-[11px] text-gray-400">
                  <div className="flex justify-between">
                    <span>Your Coin Wallet:</span>
                    <span className="text-white font-bold">{wallet.balanceUGX.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Purchase Price:</span>
                    <span className="text-yellow-400 font-black">-{checkoutProduct.price.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between border-t border-[#1c1c24] pt-2 text-[12px]">
                    <span>Remaining Wallet:</span>
                    <span className={`font-black ${wallet.balanceUGX - checkoutProduct.price >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      {(wallet.balanceUGX - checkoutProduct.price).toLocaleString()} UGX
                    </span>
                  </div>
                </div>

                {wallet.balanceUGX < checkoutProduct.price ? (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-[10px] leading-relaxed flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>Insufficient funds to complete this transaction. Please fund your Kampala Coin wallet in the Ledgers tab.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-cyan-400 text-[10px] leading-relaxed flex items-start gap-1.5 font-mono">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5 animate-pulse" />
                    <span>Funds are held in downtown escrow until merchant updates item stock. Transacted instantly.</span>
                  </div>
                )}

                <button 
                  onClick={handlePurchase}
                  disabled={loading || wallet.balanceUGX < checkoutProduct.price}
                  className={`w-full py-2.5 text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5 ${
                    wallet.balanceUGX < checkoutProduct.price
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-500/5'
                  }`}
                >
                  {loading ? "Authorizing Trade Escrow..." : "Confirm & Send UGX Cash"}
                </button>

                <div className="flex items-center gap-2 my-1 text-gray-600">
                  <div className="h-px bg-[#1c1c24] flex-1"></div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#555]">OR</span>
                  <div className="h-px bg-[#1c1c24] flex-1"></div>
                </div>

                <button 
                  onClick={handlePayWithCard}
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Secure Card Payment Checkout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CARD PAYMENT SECURE GATEWAY PORTAL OVERLAY */}
      <AnimatePresence>
        {showCardGateway && gatewayUrl && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#050508] border border-cyan-500/30 rounded-2xl w-full max-w-lg h-[85%] flex flex-col shadow-2xl overflow-hidden relative"
            >
              {/* Top status bar */}
              <div className="bg-[#0a0a0f] border-b border-cyan-500/10 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-[10px] font-bold font-mono tracking-wider text-cyan-400 uppercase">Donalisa Secure Gateway Connection</span>
                </div>
                <button
                  onClick={() => {
                    setShowCardGateway(false);
                    setGatewaySessionId(null);
                    setGatewayUrl(null);
                  }}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Secure frame */}
              <div className="flex-1 bg-black relative">
                <iframe
                  src={gatewayUrl}
                  className="w-full h-full border-none"
                  title="BizPay Card Checkout Gateway"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Bottom protection notice */}
              <div className="bg-[#030305] px-6 py-3 border-t border-cyan-500/5 flex items-center justify-between text-[10px] text-gray-500">
                <span>🔒 Secure card session is authorized and cleared over 256-bit SSL</span>
                <span>PCI-DSS Level 1 Gateway</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
    </>
  );
}
