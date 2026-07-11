import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Eye,
  Copy,
  Check,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
  Layers,
  Sparkles,
  Undo,
  Redo,
  Palette,
  Settings,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  ShoppingCart,
  Search,
  Heart,
  ShoppingBag,
  MapPin,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  CheckCircle2,
  MessageCircle,
  Globe
} from 'lucide-react';
import { db } from '@/firebase/config';
import { collection, doc, setDoc } from 'firebase/firestore';
import { OpenAIService } from '@/lib/openai';
import { ShopTemplate } from './MarketplaceTypes';

interface NavigationItem {
  label: string;
  href: string;
  visible: boolean;
}

interface TemplateSection {
  key: string;
  label: string;
  enabled: boolean;
}

interface BuilderTemplateState {
  id?: string;
  name: string;
  category: string;
  businessDescription: string;
  businessTagline: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  hours: string;
  latitude: string;
  longitude: string;
  verificationBadge: boolean;
  storeStatus: 'draft' | 'published' | 'pending';
  featured: boolean;
  trending: boolean;
  premium: boolean;
  visibility: 'Visible to All' | 'Approved Merchants Only' | 'Hidden';
  openingDate: string;
  logoUrl: string;
  coverUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  buttonStyle: string;
  borderRadius: number;
  headingFont: string;
  bodyFont: string;
  fontSize: number;
  spacing: string;
  animationStyle: string;
  cardStyle: string;
  themeStyle: 'Light' | 'Dark' | 'Glass' | 'Minimal' | 'Luxury' | 'Modern';
  navigation: {
    logoText: string;
    menuItems: NavigationItem[];
    search: boolean;
    wishlist: boolean;
    cart: boolean;
    messages: boolean;
    notifications: boolean;
    categories: boolean;
    megaMenu: boolean;
    stickyHeader: boolean;
    breadcrumbs: boolean;
    languageSelector: boolean;
    currencySelector: boolean;
  };
  homepageSections: TemplateSection[];
  productPageSettings: {
    gallery: boolean;
    zoom: boolean;
    videoGallery: boolean;
    viewer360: boolean;
    variants: boolean;
    colorSwatches: boolean;
    sizeSelector: boolean;
    weightSelector: boolean;
    quantitySelector: boolean;
    discountBadge: boolean;
    stockCounter: boolean;
    onlyLeftBadge: boolean;
    sku: boolean;
    brand: boolean;
    specifications: boolean;
    warranty: boolean;
    returnPolicy: boolean;
    shippingInfo: boolean;
    accordionTabs: boolean;
    stickyBuy: boolean;
    stickyCart: boolean;
    chat: boolean;
    share: boolean;
    wishlist: boolean;
    compare: boolean;
    recentlyViewed: boolean;
    relatedProducts: boolean;
    frequentlyBoughtTogether: boolean;
    recommendedProducts: boolean;
  };
  trustFeatures: {
    verifiedBadge: boolean;
    responseTime: boolean;
    yearsOnPlatform: boolean;
    completedOrders: boolean;
    followers: boolean;
    rating: boolean;
    storeStory: boolean;
    certificates: boolean;
    socialMedia: boolean;
    contactInformation: boolean;
    businessHours: boolean;
  };
  customerFeatures: {
    wishlist: boolean;
    reviews: boolean;
    photoReviews: boolean;
    videoReviews: boolean;
    starRatings: boolean;
    followShop: boolean;
    liveChat: boolean;
    reportProduct: boolean;
    reportShop: boolean;
    askSeller: boolean;
    shareProduct: boolean;
    saveProduct: boolean;
    notifications: boolean;
  };
  checkout: {
    cart: boolean;
    guestCheckout: boolean;
    customerCheckout: boolean;
    deliveryCalculator: boolean;
    couponCodes: boolean;
    giftCards: boolean;
    orderNotes: boolean;
    paymentMethods: boolean;
    invoice: boolean;
    estimatedDelivery: boolean;
  };
  paymentIntegration: {
    mtn: boolean;
    airtel: boolean;
    visa: boolean;
    mastercard: boolean;
    flutterwave: boolean;
    pesapal: boolean;
    paypal: boolean;
    bankTransfer: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
    canonicalUrl: string;
    openGraphImage: string;
    twitterCard: string;
    structuredData: string;
    searchPreview: string;
  };
  performance: {
    lazyLoading: boolean;
    imageCompression: boolean;
    responsiveImages: boolean;
    caching: boolean;
    accessibility: boolean;
    performanceScore: boolean;
    seoScore: boolean;
  };
  previewImages: string[];
  status: 'draft' | 'published' | 'pending';
  createdAt: string;
}

const DEFAULT_TEMPLATE: BuilderTemplateState = {
  id: undefined,
  name: 'Kampala Premium Shop',
  category: 'Electronics',
  businessDescription: 'A high-end Kampala storefront built to convert customers and move stock fast.',
  businessTagline: 'Smart Tech, Better Life',
  ownerName: 'Admin Builder',
  email: 'contact@bizlink.co.ug',
  phone: '+256 700 000 000',
  address: 'Plot 42, Kampala Road',
  location: 'Kampala, Uganda',
  hours: '8:00 AM - 9:00 PM',
  latitude: '0.3476',
  longitude: '32.5825',
  verificationBadge: true,
  storeStatus: 'draft',
  featured: true,
  trending: true,
  premium: false,
  visibility: 'Visible to All',
  openingDate: new Date().toISOString().slice(0, 10),
  logoUrl: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=240&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  bannerUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
  primaryColor: '#4f46e5',
  secondaryColor: '#ec4899',
  accentColor: '#fbbf24',
  backgroundColor: '#0b0b14',
  buttonStyle: 'Rounded',
  borderRadius: 16,
  headingFont: 'Poppins',
  bodyFont: 'Inter',
  fontSize: 16,
  spacing: 'Medium',
  animationStyle: 'Subtle',
  cardStyle: 'Modern',
  themeStyle: 'Modern',
  navigation: {
    logoText: 'TECHHUB ELECTRONICS',
    menuItems: [
      { label: 'Home', href: '#home', visible: true },
      { label: 'Shop', href: '#shop', visible: true },
      { label: 'Flash Sale', href: '#flash', visible: true },
      { label: 'Best Sellers', href: '#best', visible: true },
      { label: 'Contact', href: '#contact', visible: true }
    ],
    search: true,
    wishlist: true,
    cart: true,
    messages: true,
    notifications: false,
    categories: true,
    megaMenu: true,
    stickyHeader: true,
    breadcrumbs: true,
    languageSelector: true,
    currencySelector: true
  },
  homepageSections: [
    { key: 'hero', label: 'Hero Banner', enabled: true },
    { key: 'featuredCategories', label: 'Featured Categories', enabled: true },
    { key: 'flashSale', label: 'Flash Sale', enabled: true },
    { key: 'featuredProducts', label: 'Featured Products', enabled: true },
    { key: 'trending', label: 'Trending Products', enabled: true },
    { key: 'bestSellers', label: 'Best Sellers', enabled: true },
    { key: 'testimonials', label: 'Customer Reviews', enabled: true },
    { key: 'merchantProfile', label: 'Merchant Profile', enabled: true },
    { key: 'newsletter', label: 'Newsletter', enabled: true },
    { key: 'footer', label: 'Footer', enabled: true }
  ],
  productPageSettings: {
    gallery: true,
    zoom: true,
    videoGallery: true,
    viewer360: false,
    variants: true,
    colorSwatches: true,
    sizeSelector: true,
    weightSelector: true,
    quantitySelector: true,
    discountBadge: true,
    stockCounter: true,
    onlyLeftBadge: true,
    sku: true,
    brand: true,
    specifications: true,
    warranty: true,
    returnPolicy: true,
    shippingInfo: true,
    accordionTabs: true,
    stickyBuy: true,
    stickyCart: true,
    chat: true,
    share: true,
    wishlist: true,
    compare: true,
    recentlyViewed: true,
    relatedProducts: true,
    frequentlyBoughtTogether: true,
    recommendedProducts: true
  },
  trustFeatures: {
    verifiedBadge: true,
    responseTime: true,
    yearsOnPlatform: true,
    completedOrders: true,
    followers: true,
    rating: true,
    storeStory: true,
    certificates: true,
    socialMedia: true,
    contactInformation: true,
    businessHours: true
  },
  customerFeatures: {
    wishlist: true,
    reviews: true,
    photoReviews: true,
    videoReviews: false,
    starRatings: true,
    followShop: true,
    liveChat: true,
    reportProduct: true,
    reportShop: true,
    askSeller: true,
    shareProduct: true,
    saveProduct: true,
    notifications: true
  },
  checkout: {
    cart: true,
    guestCheckout: true,
    customerCheckout: true,
    deliveryCalculator: true,
    couponCodes: true,
    giftCards: false,
    orderNotes: true,
    paymentMethods: true,
    invoice: true,
    estimatedDelivery: true
  },
  paymentIntegration: {
    mtn: true,
    airtel: true,
    visa: false,
    mastercard: false,
    flutterwave: false,
    pesapal: false,
    paypal: false,
    bankTransfer: true
  },
  seo: {
    title: 'TechHub Electronics — Kampala Digital Storefront',
    description: 'Premium electronics storefront template for local Ugandan merchants with fast mobile money checkout, live support, and high-conversion product pages.',
    keywords: 'Kampala electronics, online shop template, MTN MoMo, Airtel Money, BizLink Uganda',
    canonicalUrl: 'https://bizlinkuganda.com/techhub-electronics',
    openGraphImage: 'https://images.unsplash.com/photo-1510557880182-3ad56b6ae1d7?auto=format&fit=crop&w=1200&q=80',
    twitterCard: 'summary_large_image',
    structuredData: '{ "@type": "WebPage", "name": "TechHub Electronics" }',
    searchPreview: 'TechHub Electronics - Premium Ugandan electronics shop template.'
  },
  performance: {
    lazyLoading: true,
    imageCompression: true,
    responsiveImages: true,
    caching: true,
    accessibility: true,
    performanceScore: true,
    seoScore: true
  },
  previewImages: [
    'https://images.unsplash.com/photo-1510557880182-3ad56b6ae1d7?auto=format&fit=crop&w=900&q=80'
  ],
  status: 'draft',
  createdAt: new Date().toISOString()
};

const sampleCategories = [
  { name: 'Smartphones', icon: '📱' },
  { name: 'Laptops', icon: '💻' },
  { name: 'Headphones', icon: '🎧' },
  { name: 'Smartwatches', icon: '⌚' },
  { name: 'Accessories', icon: '🔌' },
  { name: 'Cameras', icon: '📸' }
];

const sampleProducts = [
  {
    title: 'AirPods Pro 2nd Gen',
    price: 350000,
    imageUrl: 'https://images.unsplash.com/photo-1512499617640-c2f99912d12a?auto=format&fit=crop&w=600&q=80',
    badge: '23% OFF',
    rating: 4.9,
    category: 'Featured'
  },
  {
    title: 'Samsung Galaxy S24',
    price: 1200000,
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
    badge: '18% OFF',
    rating: 4.7,
    category: 'Best Seller'
  },
  {
    title: 'Apple Watch Series 9',
    price: 750000,
    imageUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=600&q=80',
    badge: '15% OFF',
    rating: 4.8,
    category: 'Trending'
  },
  {
    title: 'MacBook Air M2',
    price: 3250000,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    badge: '20% OFF',
    rating: 4.6,
    category: 'Best Seller'
  }
];

const sampleTestimonials = [
  { name: 'Amina N.', comment: 'Fast delivery and the product quality is outstanding. Love the shop layout!', rating: 5 },
  { name: 'Brian K.', comment: 'The product pages are clean and easy to navigate. Customers love the checkout experience.', rating: 5 },
  { name: 'Susan T.', comment: 'Great design and local payment flows make this template feel professional.', rating: 4.8 }
];

const sampleStats = [
  { label: 'Genuine Products', value: '100% authentic' },
  { label: 'Fast Delivery', value: 'Across Uganda' },
  { label: 'Secure Payments', value: 'MTN, Airtel & more' },
  { label: 'Easy Returns', value: '7 days policy' }
];

const TemplateBuilder = ({
  initialTemplate,
  onClose,
  onSave
}: {
  initialTemplate?: Partial<BuilderTemplateState>;
  onClose: () => void;
  onSave?: (template: BuilderTemplateState) => void;
}) => {
  const [template, setTemplate] = useState<BuilderTemplateState>({
    ...DEFAULT_TEMPLATE,
    ...initialTemplate,
    status: initialTemplate?.status || DEFAULT_TEMPLATE.status,
    createdAt: initialTemplate?.createdAt || DEFAULT_TEMPLATE.createdAt
  });
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Draft saved locally.');
  const [aiPrompt, setAiPrompt] = useState('Generate a premium storefront for a Kampala electronics merchant with MTN and Airtel pay support.');
  const [isAiRunning, setIsAiRunning] = useState(false);

  useEffect(() => {
    if (initialTemplate?.id) {
      setTemplate(prev => ({ ...prev, ...initialTemplate } as BuilderTemplateState));
    }
  }, [initialTemplate]);

  const previewWidthClass = useMemo(() => {
    switch (previewMode) {
      case 'tablet': return 'max-w-[900px]';
      case 'mobile': return 'max-w-[420px]';
      default: return 'max-w-full';
    }
  }, [previewMode]);

  const updateTemplate = (changes: Partial<BuilderTemplateState>) => {
    setTemplate(prev => ({ ...prev, ...changes }));
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateTemplate({ [field]: reader.result as string } as Partial<BuilderTemplateState>);
    };
    reader.readAsDataURL(file);
  };

  const toggleSection = (sectionKey: string) => {
    updateTemplate({
      homepageSections: template.homepageSections.map(section =>
        section.key === sectionKey ? { ...section, enabled: !section.enabled } : section
      )
    });
  };

  const moveSection = (sectionKey: string, direction: 'up' | 'down') => {
    const sections = [...template.homepageSections];
    const index = sections.findIndex(section => section.key === sectionKey);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;
    [sections[index], sections[swapIndex]] = [sections[swapIndex], sections[index]];
    updateTemplate({ homepageSections: sections });
  };

  const handleSaveTemplate = async (publish: boolean) => {
    setIsSaving(true);
    try {
      const templateId = template.id || doc(collection(db, 'shop_templates')).id;
      const savedTemplate = {
        ...template,
        id: templateId,
        status: publish ? 'published' : 'draft',
        updatedAt: new Date().toISOString(),
        previewImages: template.previewImages.length
          ? template.previewImages
          : [template.bannerUrl]
      };
      await setDoc(doc(db, 'shop_templates', templateId), savedTemplate, { merge: true });
      setTemplate(savedTemplate);
      setSaveMessage(publish ? 'Template published successfully.' : 'Draft saved successfully.');
      if (onSave) onSave(savedTemplate);
    } catch (error) {
      console.error('Template save failed:', error);
      setSaveMessage('Unable to save template right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = () => {
    const duplicated = {
      ...template,
      id: undefined,
      name: `${template.name} Copy`,
      status: 'draft'
    };
    setTemplate(duplicated);
    setSaveMessage('Duplicated locally; save as a new template.');
  };

  const handleDelete = () => {
    setTemplate(DEFAULT_TEMPLATE);
    setSaveMessage('Template cleared. Start again from scratch.');
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiRunning(true);
    try {
      const result = await OpenAIService.bizLinkAI(aiPrompt.trim(), 'template', template.category);
      let parsed: any = null;
      try {
        parsed = JSON.parse(result.text);
      } catch (err) {
        parsed = null;
      }
      const generatedName = parsed?.brandName || template.name;
      const generatedDescription = parsed?.description || result.text;
      updateTemplate({
        name: generatedName,
        businessDescription: generatedDescription,
        businessTagline: parsed?.slogan || template.businessTagline,
        bannerUrl: parsed?.imageUrl || template.bannerUrl
      });
      setSaveMessage('AI generated a fresh storefront concept. Review and publish.');
    } catch (error) {
      console.error('AI generation failed:', error);
      setSaveMessage('BizLink AI could not generate content right now.');
    } finally {
      setIsAiRunning(false);
    }
  };

  const activeSections = template.homepageSections.filter(section => section.enabled);

  const previewNavItems = template.navigation.menuItems.filter(item => item.visible);

  const sectionContent = (key: string) => {
    switch (key) {
      case 'hero':
        return (
          <section className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#09090d]">
            <div className="relative overflow-hidden">
              <img src={template.bannerUrl} alt="Hero Banner" className="w-full h-72 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050509]/95 via-transparent to-transparent" />
              <div className="absolute left-6 bottom-6 text-white max-w-lg space-y-4">
                <span className="inline-flex items-center gap-2 bg-purple-600/15 text-purple-200 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.2em]">Mega Sale</span>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{template.businessTagline}</h1>
                <p className="text-sm text-gray-300 max-w-xl">{template.businessDescription}</p>
                <div className="inline-flex gap-3 flex-wrap">
                  <button className="px-5 py-3 rounded-full bg-purple-600 text-white text-sm font-semibold">Shop Now</button>
                  <button className="px-5 py-3 rounded-full bg-white/10 border border-white/10 text-white text-sm font-semibold">Watch Video</button>
                </div>
              </div>
            </div>
          </section>
        );
      case 'featuredCategories':
        return (
          <section className="rounded-3xl bg-[#06060d] border border-white/10 p-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Shop by Category</p>
                <h2 className="text-xl font-black text-white mt-2">Browse categories</h2>
              </div>
              <button className="text-[11px] uppercase tracking-[0.25em] text-white/70 hover:text-white">View All</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {sampleCategories.map(cat => (
                <div key={cat.name} className="rounded-3xl border border-white/10 p-4 bg-[#08080f] hover:border-purple-500/30 transition-all cursor-pointer">
                  <div className="text-2xl mb-3">{cat.icon}</div>
                  <p className="text-sm font-bold text-white">{cat.name}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case 'flashSale':
        return (
          <section className="rounded-3xl overflow-hidden border border-white/10 bg-[#09090d]">
            <div className="bg-purple-950/90 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Flash Sale</p>
                <h3 className="text-lg font-black text-white mt-1">Ends in:</h3>
              </div>
              <div className="inline-flex gap-2 text-xs uppercase tracking-[0.2em] text-white">
                <span className="px-3 py-2 bg-white/10 rounded-xl">02</span>
                <span className="px-3 py-2 bg-white/10 rounded-xl">15</span>
                <span className="px-3 py-2 bg-white/10 rounded-xl">45</span>
                <span className="px-3 py-2 bg-white/10 rounded-xl">30</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5">
              {sampleProducts.map(prod => (
                <div key={prod.title} className="rounded-3xl overflow-hidden bg-[#0b0b11] border border-white/10">
                  <img src={prod.imageUrl} alt={prod.title} className="w-full h-32 object-cover" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/70">
                      <span>{prod.badge}</span>
                      <Heart className="w-4 h-4 text-pink-400" />
                    </div>
                    <h4 className="font-bold text-white text-sm">{prod.title}</h4>
                    <p className="text-sm text-white/80">UGX {prod.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'featuredProducts':
        return (
          <section className="rounded-3xl border border-white/10 bg-[#07070f] p-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Featured Products</p>
                <h2 className="text-2xl font-black text-white mt-2">Hot picks</h2>
              </div>
              <button className="text-[11px] uppercase tracking-[0.25em] text-white/70 hover:text-white">View Catalog</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sampleProducts.map(prod => (
                <div key={`fp-${prod.title}`} className="rounded-3xl border border-white/10 overflow-hidden bg-[#0b0b13] flex gap-4">
                  <img src={prod.imageUrl} alt={prod.title} className="w-32 h-32 object-cover" />
                  <div className="py-4 pr-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">{prod.title}</h3>
                      <p className="text-[11px] text-gray-400 mt-1">Fast delivery across Kampala with seamless MTN and Airtel checkout.</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-white">UGX {prod.price.toLocaleString()}</span>
                      <button className="px-3 py-2 rounded-2xl bg-purple-600 text-white text-[11px] font-semibold">Add to Cart</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'trending':
        return (
          <section className="rounded-3xl border border-white/10 bg-[#09090d] p-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Trending Products</p>
                <h3 className="text-xl font-black text-white mt-2">What shoppers love</h3>
              </div>
              <span className="text-[11px] text-white/70">See All</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sampleProducts.slice(0, 3).map(prod => (
                <div key={`tr-${prod.title}`} className="rounded-3xl overflow-hidden bg-[#0a0a10] border border-white/10">
                  <img src={prod.imageUrl} alt={prod.title} className="w-full h-40 object-cover" />
                  <div className="p-4">
                    <h4 className="font-bold text-white text-sm">{prod.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-2">UGX {prod.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'bestSellers':
        return (
          <section className="rounded-3xl border border-white/10 bg-[#06060d] p-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Best Sellers</p>
                <h3 className="text-xl font-black text-white mt-2">Top rated picks</h3>
              </div>
              <button className="text-[11px] uppercase tracking-[0.25em] text-white/70 hover:text-white">Browse more</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sampleProducts.map(prod => (
                <div key={`bs-${prod.title}`} className="rounded-3xl bg-[#0b0b13] p-4 border border-white/10">
                  <h4 className="font-bold text-white text-sm">{prod.title}</h4>
                  <p className="text-[11px] text-gray-400 mt-2">UGX {prod.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case 'testimonials':
        return (
          <section className="rounded-3xl border border-white/10 bg-[#09090d] p-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Customer Reviews</p>
                <h3 className="text-xl font-black text-white mt-2">Trusted by locals</h3>
              </div>
              <div className="text-[11px] text-white/70">Verified delivery and service across Kampala.</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sampleTestimonials.map(testimonial => (
                <div key={testimonial.name} className="rounded-3xl border border-white/10 bg-[#0b0b12] p-4">
                  <p className="text-sm text-gray-200 leading-relaxed">“{testimonial.comment}”</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs uppercase text-gray-500">{testimonial.name}</span>
                    <span className="text-xs text-emerald-400">{testimonial.rating}★</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'merchantProfile':
        return (
          <section className="rounded-3xl border border-white/10 bg-[#06060d] p-5">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr] gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 bg-[#0d0d14] px-4 py-3 rounded-3xl border border-white/10">
                  <div className="w-14 h-14 rounded-3xl bg-white/10 flex items-center justify-center text-purple-200 uppercase font-black">TH</div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Merchant Profile</p>
                    <h3 className="text-lg font-black text-white">{template.ownerName}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                  <div className="rounded-3xl bg-[#0c0c12] p-4 border border-white/10">
                    <p className="text-gray-400 uppercase tracking-[0.25em] mb-2 text-[10px]">Followers</p>
                    <p className="font-black text-white text-lg">4.8k</p>
                  </div>
                  <div className="rounded-3xl bg-[#0c0c12] p-4 border border-white/10">
                    <p className="text-gray-400 uppercase tracking-[0.25em] mb-2 text-[10px]">Response</p>
                    <p className="font-black text-white text-lg"><span className="text-emerald-300">99%</span></p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-[#0c0c12] p-5 border border-white/10">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-gray-400 mb-3"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Seller</div>
                <p className="text-sm leading-relaxed text-gray-300">{template.businessDescription}</p>
                <div className="mt-5 space-y-2 text-[11px] text-gray-400">
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {template.location}</div>
                  <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {template.hours}</div>
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {template.email}</div>
                </div>
              </div>
            </div>
          </section>
        );
      case 'newsletter':
        return (
          <section className="rounded-3xl border border-white/10 bg-[#09090d] p-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-400">Newsletter</p>
            <h3 className="mt-4 text-2xl font-black text-white">Stay ahead of new arrivals and offers</h3>
            <p className="text-sm text-gray-400 max-w-xl mx-auto mt-3">A premium store experience includes trust-building email capture for returning customers and exclusive deals.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <input type="email" placeholder="Enter your email" className="w-full sm:w-auto min-w-[260px] px-4 py-3 rounded-2xl bg-[#0c0c12] border border-white/10 text-white" />
              <button className="px-5 py-3 rounded-2xl bg-purple-600 text-white font-semibold">Subscribe</button>
            </div>
          </section>
        );
      case 'footer':
        return (
          <section className="rounded-3xl border border-white/10 bg-[#07070d] p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <h3 className="text-white font-black">{template.navigation.logoText}</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-xs">{template.businessTagline}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-3">Quick Links</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  {previewNavItems.map(item => (
                    <li key={item.label}><a href={item.href}>{item.label}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-3">Support</h4>
                <p className="text-sm text-gray-400">WhatsApp: {template.phone}</p>
                <p className="text-sm text-gray-400 mt-2">Email: {template.email}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-3">Follow</h4>
                <div className="flex gap-3 text-white text-lg">🌐 👍 💬</div>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/90 p-4 text-gray-100">
      <div className="mx-auto max-w-[1700px] rounded-[32px] border border-white/10 bg-[#05050a]/95 shadow-2xl overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/10 bg-[#080810] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-2xl border border-white/10 bg-[#090911] p-3 text-gray-300 hover:bg-[#14141f] transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Store Builder</h2>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-300">{template.status}</span>
              </div>
              <p className="text-[11px] text-gray-400">Design premium shop templates, save drafts, publish storefronts, and push templates to approved merchants.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleSaveTemplate(false)} className="inline-flex items-center gap-2 rounded-2xl bg-[#11131b] px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:bg-[#1b1f31]">
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button onClick={() => handleSaveTemplate(true)} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:bg-purple-700 disabled:opacity-60">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Publish Template
            </button>
            <button onClick={handleDuplicate} className="inline-flex items-center gap-2 rounded-2xl bg-[#11131b] px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:bg-[#1b1f31]">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button onClick={handleDelete} className="inline-flex items-center gap-2 rounded-2xl bg-[#11131b] px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:bg-[#721b2c]">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.35fr_0.65fr] gap-4 p-5">
          <div className="space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07070e] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Top Toolbar</h3>
                <p className="text-[10px] text-gray-400">Everything you need to manage template status, preview device sizes, and publish.</p>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Auto saved: {new Date().toLocaleTimeString()}</div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#0f1018] p-3 border border-white/10">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Template Name</p>
                  <p className="mt-2 text-sm font-black text-white">{template.name}</p>
                </div>
                <div className="rounded-2xl bg-[#0f1018] p-3 border border-white/10">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Business Category</p>
                  <p className="mt-2 text-sm font-black text-white">{template.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPreviewMode('desktop')} className={`rounded-2xl px-3 py-3 text-xs uppercase tracking-[0.3em] ${previewMode === 'desktop' ? 'bg-purple-600 text-white' : 'bg-[#11131d] text-gray-300'}`}><Monitor className="w-4 h-4 inline-block mr-2" /> Desktop</button>
                <button onClick={() => setPreviewMode('tablet')} className={`rounded-2xl px-3 py-3 text-xs uppercase tracking-[0.3em] ${previewMode === 'tablet' ? 'bg-purple-600 text-white' : 'bg-[#11131d] text-gray-300'}`}><Tablet className="w-4 h-4 inline-block mr-2" /> Tablet</button>
                <button onClick={() => setPreviewMode('mobile')} className={`rounded-2xl px-3 py-3 text-xs uppercase tracking-[0.3em] ${previewMode === 'mobile' ? 'bg-purple-600 text-white' : 'bg-[#11131d] text-gray-300'}`}><Smartphone className="w-4 h-4 inline-block mr-2" /> Mobile</button>
              </div>
            </div>
          </div>

          <div className="space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07070e] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Shop Information</h3>
                <p className="text-[10px] text-gray-400">Primary brand, contact, and verification details.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#11131d] px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-gray-300">Status: {template.storeStatus}</div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Shop Name
                  <input type="text" value={template.name} onChange={e => updateTemplate({ name: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Category
                  <select value={template.category} onChange={e => updateTemplate({ category: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Electronics</option>
                    <option>Apparel</option>
                    <option>Grocery</option>
                    <option>Pharmacy</option>
                    <option>Hardware</option>
                    <option>Beauty</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Description
                  <textarea value={template.businessDescription} onChange={e => updateTemplate({ businessDescription: e.target.value })} rows={3} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Tagline
                  <input type="text" value={template.businessTagline} onChange={e => updateTemplate({ businessTagline: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Store Owner Name
                  <input type="text" value={template.ownerName} onChange={e => updateTemplate({ ownerName: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Email
                  <input type="email" value={template.email} onChange={e => updateTemplate({ email: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Phone
                  <input type="text" value={template.phone} onChange={e => updateTemplate({ phone: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Address
                  <input type="text" value={template.address} onChange={e => updateTemplate({ address: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Location
                  <input type="text" value={template.location} onChange={e => updateTemplate({ location: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Business Hours
                  <input type="text" value={template.hours} onChange={e => updateTemplate({ hours: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Latitude
                  <input type="text" value={template.latitude} onChange={e => updateTemplate({ latitude: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Longitude
                  <input type="text" value={template.longitude} onChange={e => updateTemplate({ longitude: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300 flex items-center gap-2">
                  <input type="checkbox" checked={template.verificationBadge} onChange={() => updateTemplate({ verificationBadge: !template.verificationBadge })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                  Business Verification Badge
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Store Status
                  <select value={template.storeStatus} onChange={e => updateTemplate({ storeStatus: e.target.value as BuilderTemplateState['storeStatus'] })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Marketplace Visibility
                  <select value={template.visibility} onChange={e => updateTemplate({ visibility: e.target.value as BuilderTemplateState['visibility'] })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Visible to All</option>
                    <option>Approved Merchants Only</option>
                    <option>Hidden</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Featured Shop
                  <input type="checkbox" checked={template.featured} onChange={() => updateTemplate({ featured: !template.featured })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Trending Shop
                  <input type="checkbox" checked={template.trending} onChange={() => updateTemplate({ trending: !template.trending })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Premium Shop
                  <input type="checkbox" checked={template.premium} onChange={() => updateTemplate({ premium: !template.premium })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Store Opening Date
                  <input type="date" value={template.openingDate} onChange={e => updateTemplate({ openingDate: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Owner Email for Support
                  <input type="email" value={template.email} onChange={e => updateTemplate({ email: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Logo Upload / URL
                  <div className="grid grid-cols-1 gap-2">
                    <input type="text" value={template.logoUrl} onChange={e => updateTemplate({ logoUrl: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" placeholder="Paste an image URL" />
                    <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'logoUrl')} className="w-full text-xs text-white/80" />
                  </div>
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Store Cover Upload / URL
                  <div className="grid grid-cols-1 gap-2">
                    <input type="text" value={template.coverUrl} onChange={e => updateTemplate({ coverUrl: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" placeholder="Paste an image URL" />
                    <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'coverUrl')} className="w-full text-xs text-white/80" />
                  </div>
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Homepage Banner Upload / URL
                  <div className="grid grid-cols-1 gap-2">
                    <input type="text" value={template.bannerUrl} onChange={e => updateTemplate({ bannerUrl: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" placeholder="Paste an image URL" />
                    <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'bannerUrl')} className="w-full text-xs text-white/80" />
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07070e] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Theme Customization</h3>
                <p className="text-[10px] text-gray-400">Brand palette, typography, spacing and theme mood.</p>
              </div>
              <button onClick={handleAiGenerate} disabled={isAiRunning} className="inline-flex items-center gap-2 rounded-2xl bg-[#11131d] px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:bg-[#1b1f31] disabled:opacity-60">
                {isAiRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Generate
              </button>
            </div>
            <div className="space-y-3">
              <label className="space-y-2 text-[11px] text-gray-300">
                Primary Color
                <div className="flex items-center gap-3">
                  <input type="color" value={template.primaryColor} onChange={e => updateTemplate({ primaryColor: e.target.value })} className="h-12 w-12 rounded-2xl border border-white/10 p-0" />
                  <input type="text" value={template.primaryColor} onChange={e => updateTemplate({ primaryColor: e.target.value })} className="flex-1 rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Secondary Color
                  <input type="color" value={template.secondaryColor} onChange={e => updateTemplate({ secondaryColor: e.target.value })} className="h-12 w-12 rounded-2xl border border-white/10 p-0" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Accent Color
                  <input type="color" value={template.accentColor} onChange={e => updateTemplate({ accentColor: e.target.value })} className="h-12 w-12 rounded-2xl border border-white/10 p-0" />
                </label>
              </div>
              <label className="space-y-2 text-[11px] text-gray-300">
                Background Color
                <input type="color" value={template.backgroundColor} onChange={e => updateTemplate({ backgroundColor: e.target.value })} className="h-12 w-12 rounded-2xl border border-white/10 p-0" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Button Style
                  <select value={template.buttonStyle} onChange={e => updateTemplate({ buttonStyle: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Rounded</option>
                    <option>Sharp</option>
                    <option>Outline</option>
                    <option>Flat</option>
                  </select>
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Border Radius
                  <input type="range" min={4} max={40} value={template.borderRadius} onChange={e => updateTemplate({ borderRadius: Number(e.target.value) })} className="w-full" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Heading Font
                  <select value={template.headingFont} onChange={e => updateTemplate({ headingFont: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Poppins</option>
                    <option>Inter</option>
                    <option>Space Grotesk</option>
                    <option>Outfit</option>
                  </select>
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Body Font
                  <select value={template.bodyFont} onChange={e => updateTemplate({ bodyFont: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Inter</option>
                    <option>Inter</option>
                    <option>Outfit</option>
                    <option>JetBrains Mono</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Font Size
                  <input type="number" min={12} max={24} value={template.fontSize} onChange={e => updateTemplate({ fontSize: Number(e.target.value) })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Spacing
                  <select value={template.spacing} onChange={e => updateTemplate({ spacing: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Compact</option>
                    <option>Medium</option>
                    <option>Spacious</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Animation Style
                  <select value={template.animationStyle} onChange={e => updateTemplate({ animationStyle: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Subtle</option>
                    <option>Flow</option>
                    <option>Pulse</option>
                    <option>Slide</option>
                  </select>
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Card Style
                  <select value={template.cardStyle} onChange={e => updateTemplate({ cardStyle: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                    <option>Modern</option>
                    <option>Glass</option>
                    <option>Minimal</option>
                    <option>Luxury</option>
                  </select>
                </label>
              </div>
              <label className="space-y-2 text-[11px] text-gray-300">
                Theme Style
                <select value={template.themeStyle} onChange={e => updateTemplate({ themeStyle: e.target.value as BuilderTemplateState['themeStyle'] })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none">
                  <option>Light</option>
                  <option>Dark</option>
                  <option>Glass</option>
                  <option>Minimal</option>
                  <option>Luxury</option>
                  <option>Modern</option>
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07070e] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Homepage Builder</h3>
                <p className="text-[10px] text-gray-400">Enable sections, reorder them, and customize what customers will see.</p>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">{activeSections.length}/{template.homepageSections.length} active</div>
            </div>
            <div className="space-y-3">
              {template.homepageSections.map(section => (
                <div key={section.key} className="rounded-3xl border border-white/10 bg-[#0b0c14] p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{section.label}</p>
                    <p className="text-[10px] text-gray-400">Can be toggled and reordered for instant live preview.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => moveSection(section.key, 'up')} className="rounded-2xl bg-[#11131d] px-3 py-2 text-[10px] text-gray-300">Up</button>
                    <button onClick={() => moveSection(section.key, 'down')} className="rounded-2xl bg-[#11131d] px-3 py-2 text-[10px] text-gray-300">Down</button>
                    <button onClick={() => toggleSection(section.key)} className={`rounded-2xl px-3 py-2 text-[10px] ${section.enabled ? 'bg-emerald-500 text-black' : 'bg-[#11131d] text-gray-300'}`}>{section.enabled ? 'Enabled' : 'Disabled'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07070e] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Navigation Builder</h3>
                <p className="text-[10px] text-gray-400">Configure header elements and menu visibility.</p>
              </div>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="space-y-3">
              <label className="space-y-2 text-[11px] text-gray-300">
                Logo Text
                <input type="text" value={template.navigation.logoText} onChange={e => updateTemplate({ navigation: { ...template.navigation, logoText: e.target.value } })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['search', 'wishlist', 'cart', 'messages', 'notifications', 'categories', 'megaMenu', 'stickyHeader', 'breadcrumbs', 'languageSelector', 'currencySelector'].map(key => (
                  <label key={key} className="space-y-2 text-[11px] text-gray-300 flex items-center gap-2">
                    <input type="checkbox" checked={template.navigation[key as keyof typeof template.navigation] as boolean} onChange={() => updateTemplate({ navigation: { ...template.navigation, [key]: !template.navigation[key as keyof typeof template.navigation] } })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07070e] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">SEO & Performance</h3>
                <p className="text-[10px] text-gray-400">Add search metadata and modern performance tooling.</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-3">
              <label className="space-y-2 text-[11px] text-gray-300">
                SEO Title
                <input type="text" value={template.seo.title} onChange={e => updateTemplate({ seo: { ...template.seo, title: e.target.value } })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
              </label>
              <label className="space-y-2 text-[11px] text-gray-300">
                Meta Description
                <textarea value={template.seo.description} onChange={e => updateTemplate({ seo: { ...template.seo, description: e.target.value } })} rows={3} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300">
                  Keywords
                  <input type="text" value={template.seo.keywords} onChange={e => updateTemplate({ seo: { ...template.seo, keywords: e.target.value } })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="space-y-2 text-[11px] text-gray-300">
                  Canonical URL
                  <input type="text" value={template.seo.canonicalUrl} onChange={e => updateTemplate({ seo: { ...template.seo, canonicalUrl: e.target.value } })} className="w-full rounded-2xl border border-white/10 bg-[#0b0c14] px-3 py-3 text-sm text-white outline-none" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-[11px] text-gray-300 flex items-center gap-2">
                  <input type="checkbox" checked={template.performance.lazyLoading} onChange={() => updateTemplate({ performance: { ...template.performance, lazyLoading: !template.performance.lazyLoading } })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                  Lazy Loading
                </label>
                <label className="space-y-2 text-[11px] text-gray-300 flex items-center gap-2">
                  <input type="checkbox" checked={template.performance.responsiveImages} onChange={() => updateTemplate({ performance: { ...template.performance, responsiveImages: !template.performance.responsiveImages } })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                  Responsive Images
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07070e] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Advanced Payment</h3>
                <p className="text-[10px] text-gray-400">Enable payment channels and connect merchant-friendly options.</p>
              </div>
              <CreditCard className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(template.paymentIntegration).map(([key, enabled]) => (
                <label key={key} className="space-y-2 text-[11px] text-gray-300 flex items-center gap-2">
                  <input type="checkbox" checked={enabled} onChange={() => updateTemplate({ paymentIntegration: { ...template.paymentIntegration, [key]: !enabled } })} className="h-4 w-4 rounded border-white/10 bg-[#0b0c14] text-purple-500" />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#06060d] p-5 border-t border-white/10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">Live Preview</p>
              <h3 className="text-xl font-black text-white">Customer-facing shop page</h3>
            </div>
            <div className="text-sm text-gray-400">{saveMessage}</div>
          </div>
          <div className={`mx-auto overflow-hidden rounded-[36px] border border-white/10 bg-white/5 ${previewWidthClass}`}>
            <div className="bg-[#06060d] p-4 text-[11px] uppercase tracking-[0.3em] text-gray-400 flex items-center justify-between">
              <span>Preview Mode: {previewMode}</span>
              <span>{template.category}</span>
            </div>
            <div className="bg-white/5 p-4" style={{ backgroundColor: template.backgroundColor }}>
              <div className="rounded-[28px] overflow-hidden bg-[#05050a] shadow-2xl">
                <div className="border-b border-white/10 bg-[#07070e] px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <img src={template.logoUrl} alt="Logo" className="w-12 h-12 rounded-3xl object-cover border border-white/10" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-purple-400">{template.navigation.logoText}</p>
                      <p className="text-sm font-black text-white">{template.businessTagline}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    {previewNavItems.map(item => (
                      <a key={item.label} href={item.href} className="text-[11px] text-white/70 hover:text-white">{item.label}</a>
                    ))}
                    <div className="inline-flex items-center gap-2 text-[11px] text-white/70">
                      {template.navigation.search && <Search className="w-4 h-4" />}
                      {template.navigation.wishlist && <Heart className="w-4 h-4" />}
                      {template.navigation.cart && <ShoppingCart className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
                <div className="space-y-8 p-6">
                  {activeSections.map(section => sectionContent(section.key))}
                  <section className="rounded-3xl border border-white/10 bg-[#09090f] p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {sampleStats.map(stat => (
                        <div key={stat.label} className="rounded-3xl bg-[#0b0b12] p-4">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">{stat.label}</p>
                          <p className="mt-3 text-white font-black">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilder;
