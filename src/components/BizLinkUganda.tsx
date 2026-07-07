import React, { useState, useEffect } from 'react';
import { 
  Building2, Store, ShoppingBag, Plus, Coins, TrendingUp, ShieldCheck, 
  Trash2, X, Maximize2, Minimize2, Search, Info, Briefcase, Receipt, 
  MapPin, Check, RefreshCw, AlertCircle, Sparkles, ShoppingCart, UserCheck, Eye
} from 'lucide-react';
import { db, auth } from '@/firebase/config';
import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, where, serverTimestamp, runTransaction
} from 'firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'motion/react';

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
    name: 'Kikuubo Lane Arcade',
    vibe: 'Wholesale & General Goods',
    description: 'The commercial artery of Kampala. Packed with wholesale sugar, soap, household utilities, and general merchandise.',
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    stats: '120+ Wholesale Outlets'
  },
  {
    id: 'mutaasakafeero',
    name: 'Mutaasa Kafeero Plaza',
    vibe: 'Electronics & Phones Hub',
    description: 'Kampala\'s premiere marketplace for mobile devices, laptops, spare accessories, chargers, and professional hardware repair.',
    color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5',
    tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    stats: '250+ Tech Shops'
  },
  {
    id: 'mukwano',
    name: 'Mukwano Arcade',
    vibe: 'Textiles & Kitenge Fabrics',
    description: 'Famous for high-quality fabrics, local custom tailors, imported textiles, and vibrant West-African Kitenge patterns.',
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/5',
    tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    stats: '85+ Fabric Stores'
  },
  {
    id: 'gazaland',
    name: 'Gazaland Plaza',
    vibe: 'Cosmetics & Beauty Outlets',
    description: 'The energetic center for beauty supplies, professional hair extensions, styling products, cosmetics, and fashion footwear.',
    color: 'border-rose-500/30 text-rose-400 bg-rose-500/5',
    tagColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    stats: '140+ Salon Booths'
  },
  {
    id: 'grandcorner',
    name: 'Grand Corner House',
    vibe: 'Footwear & Imported Apparel',
    description: 'A towering hub specializing in imported designer shoes, boutique leather bags, wholesale clothing, and direct cargo arrivals.',
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    stats: '95+ Shoe Boutiques'
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed_shop_4',
    ownerId: 'system_admin',
    ownerName: 'Kato Charles',
    shopName: 'Grand Corner Kickz',
    arcadeId: 'grandcorner',
    shopNumber: 'Shop G-4, Next to Exit',
    description: 'Bustling boutique specialized in imported leather boots, designer trainers, leather handbags, and wholesale backpacks.',
    verified: false,
    createdAt: new Date().toISOString()
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
  const { user } = useAuthStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'shops' | 'ledger' | 'admin'>('map');
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
      const newShop: BizShop = {
        id: shopId,
        ownerId: user.uid,
        ownerName: user.displayName || user.email.split('@')[0],
        shopName: shopNameField,
        arcadeId: shopArcadeField,
        shopNumber: shopNoField,
        description: shopDescField,
        verified: false,
        createdAt: new Date().toISOString()
      };

      if (useLocalFallback) {
        const localShops = [...LocalDB.getShops(), newShop];
        LocalDB.saveShops(localShops);
        setShops(localShops);
      } else {
        await setDoc(doc(db, 'biz_shops', shopId), newShop);
      }
      triggerToast(`"${shopNameField}" shop created successfully in ${KAMPALA_ARCADES.find(a => a.id === shopArcadeField)?.name}! 🏪`, "success");
      
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
    <div className={`fixed z-50 bg-[#0a0a0d]/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left font-sans text-gray-200 transition-all duration-300 ${
      isMaximized 
        ? 'inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] md:inset-8 md:w-[calc(100%-64px)] md:h-[calc(100%-64px)]' 
        : 'bottom-20 right-4 w-[calc(100%-32px)] h-[620px] max-h-[85vh] sm:w-[480px] md:w-[820px] lg:w-[940px]'
    }`}>
      
      {/* WINDOW TITLE BAR */}
      <div className="bg-[#111115] border-b border-cyan-500/25 px-4 py-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/40" />
          <Building2 className="w-4 h-4 text-cyan-400" />
          <h1 className="text-xs sm:text-sm font-black text-white tracking-widest font-mono flex items-center gap-1.5 uppercase">
            <span>BizLink Uganda</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">Kampala City Simulator</span>
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
            <span>Kampala Arcades Map</span>
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
            This simulator allows you to explore downtown Kampala's central arcades, buy items from active merchants, and create your own virtual retail store!
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 min-h-0">
          
          {/* TAB 1: KAMPALA ARCADES MAP */}
          {activeTab === 'map' && !selectedArcade && (
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>DOWNTOWN KAMPALA DISTRICT</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full">Explore Arcades</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">Select a landmark commercial arcade below to step inside and explore its active virtual shopping levels.</p>
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
                    {loading ? "Seeding Marketplace..." : "Seed Kampala Arcade Data"}
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
                &larr; Return to City Map
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
                          <span>Open My Shop Here</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* LIST OF SHOPS IN THIS ARCADE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Merchants & Retailers inside Arcade</h3>
                
                {shops.filter(s => s.arcadeId === selectedArcade).length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#0c0c11] border border-[#1a1a24] text-center text-xs text-gray-500">
                    No shops set up in this arcade yet. Be the first to start a business here!
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
                &larr; Back to Arcade Shops
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
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Set Up Retail Outlet</h3>
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
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Target Kampala Arcade</label>
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
                    <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Shop Number</label>
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
                  <label className="block text-gray-400 font-bold mb-1 font-mono uppercase text-[9px] tracking-wider">Description of Goods / Store</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe what wholesale or retail products you sell..."
                    value={shopDescField}
                    onChange={(e) => setShopDescField(e.target.value)}
                    className="w-full bg-[#111] border border-[#2c2c34] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  {loading ? "Starting Business..." : "Establish Shop Registry"}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
