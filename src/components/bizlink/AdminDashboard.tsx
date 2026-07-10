import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Building2, Users, FileCheck2, BarChart3, Plus, Edit2, 
  Trash2, Sparkles, Check, X, ShieldX, Wallet2, Loader2, ListCollapse,
  Wand2, Settings, Globe, Palette, Type, DollarSign, CheckCircle2, 
  ChevronDown, ShoppingBag, Eye, Lock, FileText, CheckSquare, Layers
} from 'lucide-react';
import { db } from '@/firebase/config';
import { 
  collection, query, onSnapshot, doc, addDoc, 
  updateDoc, deleteDoc, setDoc, getDocs, where
} from 'firebase/firestore';
import { ShopTemplate, MerchantApplication, Shop, Order } from './MarketplaceTypes';
import { PREDEFINED_NICHES, PredefinedNiche } from './nicheData';
import { BizLinkTemplateEngine } from '@/services/BizLinkTemplateEngine';

interface AdminDashboardProps {
  currentUserId: string;
  onBackToMarketplace?: () => void;
}

export default function AdminDashboard({
  currentUserId,
  onBackToMarketplace
}: AdminDashboardProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'templates' | 'shops'>('overview');

  // NEW AI GENERATOR STATES
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [selectedNicheKey, setSelectedNicheKey] = useState('tech');
  
  // NEW SETUP PANEL STATES
  const [showSetupPanel, setShowSetupPanel] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Setup panel form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formMonthlySub, setFormMonthlySub] = useState(0);
  const [formOneTimePurchase, setFormOneTimePurchase] = useState(false);
  const [formPremiumFree, setFormPremiumFree] = useState<'Premium' | 'Free'>('Premium');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formAvailability, setFormAvailability] = useState<'Available' | 'Unavailable'>('Available');
  const [formRecommendedTypes, setFormRecommendedTypes] = useState('');
  const [formThemeColor, setFormThemeColor] = useState('#06b6d4');
  const [formTypography, setFormTypography] = useState('Inter');
  const [formLayoutStyle, setFormLayoutStyle] = useState('Modern Grid');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formBlocks, setFormBlocks] = useState<any[]>([]);
  const [formFaqs, setFormFaqs] = useState<any[]>([]);
  const [formPolicies, setFormPolicies] = useState<any>({});
  const [savingSetup, setSavingSetup] = useState(false);
  const [savingBlueprint, setSavingBlueprint] = useState(false);

  // Legacy template creation modal (will be kept as fallback/basic builder)
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateBuilderTab, setTemplateBuilderTab] = useState<'preset' | 'manual'>('manual');
  const [tempName, setTempName] = useState('');
  const [tempDesc, setTempDesc] = useState('');
  const [tempBanner, setTempBanner] = useState('');
  const [tempLogo, setTempLogo] = useState('');
  const [tempColor, setTempColor] = useState('#06b6d4');
  const [tempHours, setTempHours] = useState('08:00 AM - 09:00 PM');
  const [tempLoc, setTempLoc] = useState('Kampala Arcade, Block C');
  const [tempCategory, setTempCategory] = useState('Retail');
  const [tempIndustry, setTempIndustry] = useState('General Commerce');
  const [tempPrice, setTempPrice] = useState(100000);
  const [tempMonthlySub, setTempMonthlySub] = useState(25000);
  const [tempStyle, setTempStyle] = useState('Modern Grid');
  const [tempTypography, setTempTypography] = useState('Inter');
  const [savingTemp, setSavingTemp] = useState(false);

  // Load Real-time Data
  useEffect(() => {
    let rawTemplates: ShopTemplate[] = [];
    let rawBlueprints: any[] = [];

    const updateCombinedTemplates = () => {
      const mappedBlueprints = rawBlueprints.map(b => ({
        ...b,
        isBlueprint: true,
        status: b.status || 'published'
      }));
      const combined = [...rawTemplates, ...mappedBlueprints];
      setTemplates(combined);
    };

    // Safety timeout to ensure loading spinner is ALWAYS dismissed even if Firestore listeners get blocked/error
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      updateCombinedTemplates();
    }, 1500);

    // 1. Templates
    const unsubscribeTemps = onSnapshot(collection(db, 'shop_templates'), (snapshot) => {
      const fetched: ShopTemplate[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as ShopTemplate);
      });
      rawTemplates = fetched;
      updateCombinedTemplates();
    }, (err) => {
      console.warn("Error loading shop_templates:", err);
      // Fallback on error
      updateCombinedTemplates();
    });

    // 1b. Blueprints
    const unsubscribeBlueprints = onSnapshot(collection(db, 'template_blueprints'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() });
      });
      rawBlueprints = fetched;
      updateCombinedTemplates();
    }, (err) => {
      console.warn("Error loading template_blueprints:", err);
      updateCombinedTemplates();
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
    }, (err) => {
      console.warn("Error loading merchant_applications:", err);
    });

    // 3. Occupied / Created Shops
    const unsubscribeShops = onSnapshot(collection(db, 'biz_shops'), (snapshot) => {
      const fetched: Shop[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Shop);
      });
      setShops(fetched);
      setLoading(false);
    }, (err) => {
      console.warn("Error loading biz_shops:", err);
      setLoading(false);
    });

    // 4. Platform Orders
    const unsubscribeOrders = onSnapshot(collection(db, 'biz_orders'), (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Order);
      });
      setOrders(fetched);
    }, (err) => {
      console.warn("Error loading biz_orders:", err);
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribeTemps();
      unsubscribeBlueprints();
      unsubscribeApps();
      unsubscribeShops();
      unsubscribeOrders();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Create new shop template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim() || !tempDesc.trim() || !tempBanner.trim()) {
      alert("Please fill in at least Name, Description, and Banner URL.");
      return;
    }

    setSavingTemp(true);
    try {
      const tempId = 'temp_' + Math.random().toString(36).substring(2, 9);
      const newTempData = {
        name: tempName.trim(),
        description: tempDesc.trim(),
        bannerUrl: tempBanner.trim(),
        logoUrl: tempLogo.trim() || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6',
        themeColor: tempColor,
        businessHours: tempHours,
        location: tempLoc,
        style: tempStyle,
        layoutStyle: tempStyle,
        basePrice: tempPrice,
        price: tempPrice,
        category: tempCategory,
        industry: tempIndustry,
        monthlySubscription: tempMonthlySub,
        typography: tempTypography,
        status: 'published',
        createdAt: new Date().toISOString(),
        // Setup default placeholder blocks so it is a functional storefront:
        homepageBlocks: [
          { type: 'hero', enabled: true, title: `Welcome to ${tempName.trim()}`, subtitle: tempDesc.trim(), actionText: 'Shop Now' },
          { type: 'categories', enabled: true, title: 'Browse Categories', list: ['Featured', 'New Arrivals', 'Clearance'] },
          { type: 'products', enabled: true, title: 'Our Products', layout: 'grid' },
          { type: 'highlights', enabled: true, title: 'Our Guarantees', items: ['MTN MoMo Integrated', 'Airtel Money Ready', 'Fast Delivery'] },
          { type: 'footer', enabled: true, text: `© ${tempName.trim()} Store. Fully secured by BizLink.` }
        ],
        faqs: [
          { q: 'How can I pay for my order?', a: 'We support local Mobile Money (MTN MoMo & Airtel Money) as well as Card payments.' },
          { q: 'What is the delivery timeline?', a: 'Orders within Kampala are dispatched and delivered via Boda Boda within a few hours.' }
        ],
        policies: {
          privacy: 'We take data protection seriously. Your customer information is secure.',
          terms: 'All purchases are subject to mobile money verification before delivery.',
          delivery: 'Reliable Boda Boda dispatch across metropolitan Kampala.',
          returns: 'Items can be returned within 3 days if they possess manufacturer defects.'
        }
      };

      await setDoc(doc(db, 'shop_templates', tempId), newTempData);

      // Seed a few demo products so the template is fully premium and functional:
      const sampleProducts = [
        {
          title: 'Premium Specimen Product A',
          description: 'A gorgeous high-quality item featured in this professional storefront layout.',
          price: Math.floor(tempPrice * 0.4) || 25000,
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop',
          images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop'],
          stock: 20,
          category: 'Featured',
          brand: 'Elite Brand',
          rating: 4.8,
          reviewsCount: 3,
          createdAt: new Date().toISOString()
        },
        {
          title: 'Premium Specimen Product B',
          description: 'Designed for durability and style. Perfect choice for modern Ugandan lifestyles.',
          price: Math.floor(tempPrice * 0.7) || 45000,
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop',
          images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop'],
          stock: 15,
          category: 'New Arrivals',
          brand: 'Elite Brand',
          rating: 5.0,
          reviewsCount: 1,
          createdAt: new Date().toISOString()
        }
      ];

      for (const prod of sampleProducts) {
        const prodId = 'prod_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'biz_products', prodId), {
          ...prod,
          id: prodId,
          shopId: tempId,
          shopName: tempName.trim(),
          createdAt: new Date().toISOString()
        });
      }

      // Seed sample reviews
      const sampleReviews = [
        {
          productId: 'all',
          rating: 5,
          text: 'Superb quality and exceptionally fast local delivery in Kampala!',
          userName: 'Nsubuga Henry',
          verifiedPurchase: true,
          helpfulVotes: 2
        }
      ];

      for (const rev of sampleReviews) {
        const revId = 'rev_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'biz_reviews', revId), {
          ...rev,
          id: revId,
          shopId: tempId,
          createdAt: new Date().toISOString()
        });
      }

      // Reset Form fields
      setTempName('');
      setTempDesc('');
      setTempBanner('');
      setTempLogo('');
      setTempColor('#06b6d4');
      setTempHours('08:00 AM - 09:00 PM');
      setTempLoc('Kampala Arcade, Block C');
      setTempCategory('Retail');
      setTempIndustry('General Commerce');
      setTempPrice(100000);
      setTempMonthlySub(25000);
      setTempStyle('Modern Grid');
      setTempTypography('Inter');
      setShowTemplateModal(false);
      alert(`Success! Created custom storefront template "${newTempData.name}" with default sections, policies, and seeded products!`);
    } catch (err: any) {
      console.error("Error creating manual template:", err);
      alert(`Error creating template: ${err.message || err}`);
    } finally {
      setSavingTemp(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const templateItem = templates.find(t => t.id === id);
    const isBlueprint = templateItem?.isBlueprint;
    if (!window.confirm(`Delete this reusable ${isBlueprint ? 'Blueprint' : 'Shop'} template? This will not destroy already assigned stores.`)) return;
    try {
      if (isBlueprint) {
        await deleteDoc(doc(db, 'template_blueprints', id));
      } else {
        await deleteDoc(doc(db, 'shop_templates', id));
      }
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  const handleToggleTemplatePublish = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      await updateDoc(doc(db, 'shop_templates', id), {
        status: newStatus
      });
    } catch (err: any) {
      console.error("Error toggling template publish:", err);
      alert(`Error toggling template publish: ${err.message || err}`);
    }
  };

  // AI STOREFRONT AUTO GENERATOR
  const handleAutoGenerate = async (nicheKey: string) => {
    setIsGenerating(true);
    setGenerationStep(1);
    setGenerationLogs(['[SYSTEM] Initializing Kampala Niche Configuration Blueprint...']);
    
    const niche = PREDEFINED_NICHES.find(n => n.key === nicheKey);
    if (!niche) {
      setIsGenerating(false);
      return;
    }

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      await delay(450);
      setGenerationStep(2);
      setGenerationLogs(prev => [...prev, `[BRANDING] Formulating digital identity for "${niche.name}"...`, `[BRANDING] Selected color palette: ${niche.themeColor} with font pairing "${niche.typography}".`]);
      
      await delay(450);
      setGenerationStep(3);
      setGenerationLogs(prev => [...prev, `[LAYOUT] Building 10 modular, reorderable storefront blocks...`, `[LAYOUT] Assembling: Hero Banner, Best Sellers Shelf, Flash Deals, FAQ Accordion, Local Maps Coordinates.`]);
      
      await delay(450);
      setGenerationStep(4);
      setGenerationLogs(prev => [...prev, `[PRODUCTS] Injecting ${niche.sampleProducts.length} premium demo items into stock ledger...`, ...niche.sampleProducts.map(p => `[PRODUCTS] Stocked: "${p.title}" (${p.price.toLocaleString()} UGX)`)]);
      
      await delay(450);
      setGenerationStep(5);
      setGenerationLogs(prev => [...prev, `[POLICIES] Calibrating statutory Kampala Boda Boda shipping & regional bus delivery rules...`]);
      
      await delay(450);
      setGenerationStep(6);
      setGenerationLogs(prev => [...prev, `[TRUST] Seeding authentic verified buyer reviews & merchant dialogue cards...`, `[SYSTEM] Writing blueprints on-chain to cloud firestore...`]);
      
      await delay(400);

      const tempId = 'temp_' + Math.random().toString(36).substring(2, 9);
      
      const newTemplateData = {
        name: niche.name,
        description: niche.description,
        style: niche.layoutStyle, // required
        basePrice: niche.price,   // required
        
        // Extended attributes
        category: niche.category,
        industry: niche.industry,
        tags: niche.tags,
        monthlySubscription: niche.monthlySubscription,
        oneTimePurchase: niche.oneTimePurchase,
        premiumOrFree: niche.premiumOrFree,
        recommendedTypes: niche.recommendedTypes,
        themeColor: niche.themeColor,
        typography: niche.typography,
        logoUrl: niche.logoUrl,
        bannerUrl: niche.bannerUrl,
        businessHours: niche.businessHours,
        location: niche.location,
        homepageBlocks: niche.homepageBlocks,
        faqs: niche.faqs,
        policies: niche.policies,
        status: 'published',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'shop_templates', tempId), newTemplateData);

      // Seed products
      for (const prod of niche.sampleProducts) {
        const prodId = 'prod_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'biz_products', prodId), {
          ...prod,
          id: prodId,
          shopId: tempId,
          shopName: niche.name,
          createdAt: new Date().toISOString()
        });
      }

      // Seed reviews
      for (const rev of niche.sampleReviews) {
        const revId = 'rev_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'biz_reviews', revId), {
          ...rev,
          id: revId,
          shopId: tempId,
          createdAt: new Date().toISOString()
        });
      }

      setGenerationLogs(prev => [...prev, `[SUCCESS] Secure deployment finalized! Store is active in catalog.`]);
      await delay(400);

      // Set Setup Form values
      setEditingTemplate({ id: tempId, ...newTemplateData });
      setFormName(niche.name);
      setFormCategory(niche.category);
      setFormIndustry(niche.industry);
      setFormDescription(niche.description);
      setFormTags(niche.tags.join(', '));
      setFormPrice(niche.price);
      setFormMonthlySub(niche.monthlySubscription);
      setFormOneTimePurchase(niche.oneTimePurchase);
      setFormPremiumFree(niche.premiumOrFree);
      setFormFeatured(true);
      setFormAvailability('Available');
      setFormRecommendedTypes(niche.recommendedTypes.join(', '));
      setFormThemeColor(niche.themeColor);
      setFormTypography(niche.typography);
      setFormLayoutStyle(niche.layoutStyle);
      setFormStatus('published');
      setFormLogoUrl(niche.logoUrl);
      setFormBannerUrl(niche.bannerUrl);
      setFormBlocks(niche.homepageBlocks);
      setFormFaqs(niche.faqs);
      setFormPolicies(niche.policies);

      setIsGenerating(false);
      setShowSetupPanel(true);
    } catch (err) {
      console.error("AI Generation failed:", err);
      setGenerationLogs(prev => [...prev, `[ERROR] Secure deployment aborted: ${err instanceof Error ? err.message : String(err)}`]);
      setIsGenerating(false);
    }
  };

  // Open setups edit form for existing template
  const handleOpenEditSetup = (temp: any) => {
    setEditingTemplate(temp);
    setFormName(temp.name || '');
    setFormCategory(temp.category || 'Electronics');
    setFormIndustry(temp.industry || '');
    setFormDescription(temp.description || '');
    setFormTags(temp.tags ? temp.tags.join(', ') : '');
    setFormPrice(temp.basePrice || temp.price || 0);
    setFormMonthlySub(temp.monthlySubscription || 0);
    setFormOneTimePurchase(!!temp.oneTimePurchase);
    setFormPremiumFree(temp.premiumOrFree || 'Premium');
    setFormFeatured(!!temp.featured);
    setFormAvailability(temp.availability || 'Available');
    setFormRecommendedTypes(temp.recommendedTypes ? temp.recommendedTypes.join(', ') : '');
    setFormThemeColor(temp.themeColor || '#06b6d4');
    setFormTypography(temp.typography || 'Inter');
    setFormLayoutStyle(temp.style || 'Modern Grid');
    setFormStatus(temp.status || 'published');
    setFormLogoUrl(temp.logoUrl || '');
    setFormBannerUrl(temp.bannerUrl || '');
    setFormBlocks(temp.homepageBlocks || []);
    setFormFaqs(temp.faqs || []);
    setFormPolicies(temp.policies || {});
    setShowSetupPanel(true);
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDescription.trim()) return;
    setSavingSetup(true);

    try {
      const updatedData = {
        name: formName.trim(),
        description: formDescription.trim(),
        style: formLayoutStyle, // required layout style
        basePrice: Number(formPrice), // required base price
        category: formCategory,
        industry: formIndustry.trim(),
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        price: Number(formPrice),
        monthlySubscription: Number(formMonthlySub),
        oneTimePurchase: formOneTimePurchase,
        premiumOrFree: formPremiumFree,
        featured: formFeatured,
        availability: formAvailability,
        recommendedTypes: formRecommendedTypes.split(',').map(t => t.trim()).filter(Boolean),
        themeColor: formThemeColor,
        typography: formTypography,
        logoUrl: formLogoUrl.trim(),
        bannerUrl: formBannerUrl.trim(),
        status: formStatus,
        homepageBlocks: formBlocks,
        faqs: formFaqs,
        policies: formPolicies,
      };

      if (editingTemplate.isBlueprint) {
        await updateDoc(doc(db, 'template_blueprints', editingTemplate.id), updatedData);
      } else {
        await updateDoc(doc(db, 'shop_templates', editingTemplate.id), updatedData);
      }
      
      // Reset
      setShowSetupPanel(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error("Error saving template setup:", err);
    } finally {
      setSavingSetup(false);
    }
  };

  const handleSaveAsBlueprint = async () => {
    if (!formName.trim() || !formDescription.trim()) {
      alert("Name and description are required.");
      return;
    }
    setSavingBlueprint(true);
    try {
      const blueprintData = {
        name: formName.trim(),
        description: formDescription.trim(),
        style: formLayoutStyle,
        layoutStyle: formLayoutStyle,
        basePrice: Number(formPrice),
        price: Number(formPrice),
        monthlySubscription: Number(formMonthlySub),
        oneTimePurchase: formOneTimePurchase,
        premiumOrFree: formPremiumFree,
        featured: formFeatured,
        availability: formAvailability,
        recommendedTypes: formRecommendedTypes.split(',').map(t => t.trim()).filter(Boolean),
        themeColor: formThemeColor,
        typography: formTypography,
        logoUrl: formLogoUrl.trim(),
        bannerUrl: formBannerUrl.trim(),
        status: formStatus,
        homepageBlocks: formBlocks,
        faqs: formFaqs,
        policies: formPolicies,
      };

      const id = await BizLinkTemplateEngine.saveTemplateBlueprint(blueprintData);
      alert(`Success! Configuration saved to the custom 'template_blueprints' collection as blueprint "${formName}" with ID: ${id}`);
      
      setShowSetupPanel(false);
      setEditingTemplate(null);
    } catch (err: any) {
      console.error("Error saving template blueprint:", err);
      alert(`Error saving to template_blueprints: ${err.message || err}`);
    } finally {
      setSavingBlueprint(false);
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

  // Transfer template & deploy live Shop to merchant using the BizLinkTemplateEngine
  const handleAssignTemplate = async (app: MerchantApplication, template: any) => {
    const confirmAssign = window.confirm(`Assign "${template.name}" storefront template to ${app.businessName} owned by ${app.userName}?`);
    if (!confirmAssign) return;

    try {
      const result = await BizLinkTemplateEngine.generateStoreFromTemplate(template.id, app.userId, {
        businessName: app.businessName,
        businessDescription: app.businessDescription,
        userName: app.userName,
        userEmail: app.userEmail,
        whatsappNumber: app.whatsappNumber,
        applicationId: app.id
      });

      alert(`Success! Store of "${result.shopName}" actively initialized under ID "${result.shopId}" with ${result.clonedProductsCount} cloned products and ${result.clonedReviewsCount} cloned reviews!`);
    } catch (err: any) {
      console.error("Error transferring shop template:", err);
      alert(`Error initializing storefront: ${err.message || err}`);
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

        <div className="mt-3 px-3 py-1.5 text-[9px] font-mono font-black text-purple-400 uppercase tracking-widest border-t border-[#13131a] pt-4.5">
          Shop Management
        </div>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'templates' ? 'bg-purple-600/90 text-white shadow-lg shadow-purple-500/15' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Shop Templates</span>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-gray-900 rounded-md text-gray-400">
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
            activeTab === 'shops' ? 'bg-purple-600/90 text-white shadow-lg shadow-purple-500/15' : 'hover:bg-[#111116] text-gray-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-400" />
          <span>Live Merchants</span>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-gray-900 rounded-md text-gray-400">
            {shops.length}
          </span>
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
            {activeTab === 'templates' && (() => {
              const totalTemplates = templates.length;
              const publishedTemplates = templates.filter(t => t.status === 'published').length;
              const draftTemplates = templates.filter(t => t.status === 'draft' || !t.status).length;
              const assignedTemplateIds = shops.map(s => s.templateId).filter(Boolean);
              const assignedTemplates = templates.filter(t => assignedTemplateIds.includes(t.id)).length;
              const availableTemplates = templates.filter(t => !assignedTemplateIds.includes(t.id)).length;

              return (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-extrabold tracking-wider font-mono text-white uppercase">Storefront Template Manager</h3>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">Generate, configure, and assign production-ready layouts</p>
                    </div>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold font-mono rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4 text-black" />
                      <span>➕ Add Template</span>
                    </button>
                  </div>

                  {/* Dynamic Stats Widget */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3 bg-[#09090d] border border-gray-900 rounded-xl space-y-1">
                      <span className="text-[8px] font-mono text-gray-500 uppercase block">Total Templates</span>
                      <p className="text-sm font-black font-mono text-white">{totalTemplates}</p>
                    </div>
                    <div className="p-3 bg-[#09090d] border border-gray-900 rounded-xl space-y-1">
                      <span className="text-[8px] font-mono text-gray-500 uppercase block text-emerald-400">Published</span>
                      <p className="text-sm font-black font-mono text-white">{publishedTemplates}</p>
                    </div>
                    <div className="p-3 bg-[#09090d] border border-gray-900 rounded-xl space-y-1">
                      <span className="text-[8px] font-mono text-gray-500 uppercase block text-cyan-400">Available</span>
                      <p className="text-sm font-black font-mono text-white">{availableTemplates}</p>
                    </div>
                    <div className="p-3 bg-[#09090d] border border-gray-900 rounded-xl space-y-1">
                      <span className="text-[8px] font-mono text-gray-500 uppercase block text-purple-400">Assigned</span>
                      <p className="text-sm font-black font-mono text-white">{assignedTemplates}</p>
                    </div>
                    <div className="p-3 bg-[#09090d] border border-gray-900 rounded-xl space-y-1 col-span-2 md:col-span-1">
                      <span className="text-[8px] font-mono text-gray-500 uppercase block text-amber-500">Drafts</span>
                      <p className="text-sm font-black font-mono text-white">{draftTemplates}</p>
                    </div>
                  </div>

                  {templates.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-500 font-mono bg-gray-900/10 border border-gray-800 rounded-2xl">
                      No storefront templates found. Click "Add Template" above to instantly generate a premium storefront.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((temp) => {
                        const isAssigned = assignedTemplateIds.includes(temp.id);
                        return (
                          <div key={temp.id} className="p-4 rounded-2xl bg-[#09090d] border border-gray-900 flex flex-col justify-between h-56 relative overflow-hidden group">
                            {/* Background Cover Image with Overlay */}
                            <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none">
                              <img src={temp.bannerUrl || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1'} alt="" className="w-full h-full object-cover filter blur-xs" />
                            </div>

                            <div className="relative z-10 space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold font-mono tracking-wider bg-purple-950/80 text-purple-300 border border-purple-900/40 px-2 py-0.5 rounded uppercase">
                                      {temp.category || 'General'}
                                    </span>
                                    {isAssigned && (
                                      <span className="text-[8px] font-bold font-mono tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-900/40 px-1.5 py-0.5 rounded uppercase">
                                        Assigned
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-black text-white font-mono uppercase tracking-tight mt-1.5 line-clamp-1">{temp.name}</h4>
                                  <p className="text-[10px] text-gray-400 leading-snug line-clamp-2 mt-0.5">{temp.description}</p>
                                </div>
                                <span className={`px-2 py-0.5 text-[8px] font-mono rounded uppercase font-bold border shrink-0 ${
                                  temp.status === 'published' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                                }`}>
                                  {temp.status || 'draft'}
                                </span>
                              </div>

                              {/* Layout indicators */}
                              <div className="grid grid-cols-3 gap-2 py-1.5 border-t border-b border-gray-900 text-[9px] font-mono text-gray-500">
                                <div>
                                  <span className="text-[7px] text-gray-600 block uppercase">Theme color</span>
                                  <span className="flex items-center gap-1 mt-0.5 text-white">
                                    <span className="w-2.5 h-2.5 rounded-full border border-gray-800 inline-block" style={{ backgroundColor: temp.themeColor }} />
                                    {temp.themeColor || '#06b6d4'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[7px] text-gray-600 block uppercase">Typography</span>
                                  <span className="text-white mt-0.5 block truncate">{temp.typography || 'Inter'}</span>
                                </div>
                                <div>
                                  <span className="text-[7px] text-gray-600 block uppercase">Layout Style</span>
                                  <span className="text-white mt-0.5 block truncate">{temp.style || 'Modern Grid'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="relative z-10 flex justify-between items-center pt-2 text-[10px] font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-cyan-400 font-bold">{(temp.basePrice || temp.price || 0).toLocaleString()} UGX</span>
                                <span className="text-gray-500">{(temp.monthlySubscription || 0).toLocaleString()}/mo</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleTemplatePublish(temp.id, temp.status)}
                                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer text-[9px] border font-black uppercase ${
                                    temp.status === 'published'
                                      ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400 hover:bg-emerald-900/20'
                                      : 'bg-amber-950/20 border-amber-900 text-amber-400 hover:bg-amber-900/20'
                                  }`}
                                  title="Toggle visibility on user dashboard"
                                >
                                  <span>{temp.status === 'published' ? '🟢 Published' : '🟡 Draft (Publish)'}</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditSetup(temp)}
                                  className="px-2.5 py-1.5 bg-[#12121a] border border-gray-800 hover:border-purple-500/30 text-purple-400 hover:text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer text-[9px]"
                                >
                                  <Settings className="w-3 h-3 text-purple-400" />
                                  <span>Configure Setup</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(temp.id)}
                                  className="p-1.5 bg-rose-500/5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

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

      {/* Reusable Template Creation / AI Shop Generator Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b0b10] border border-[#1a1a24] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-[#0e0e14]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <div>
                  <h3 className="text-xs font-extrabold text-white tracking-widest uppercase font-mono">BizLink Storefront Template Engine</h3>
                  <p className="text-[9px] text-gray-500 font-mono">AUTOMATED INSTANT BLUEPRINT HYDRATOR</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setIsGenerating(false);
                }}
                className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isGenerating ? (
              /* SYSTEM GENERATION FEEDBACK ENGINE */
              <div className="p-6 bg-[#030305] text-cyan-400 font-mono space-y-4">
                <div className="flex items-center justify-between border-b border-cyan-950/40 pb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span className="font-bold uppercase tracking-wider">Compiling Storefront Blueprint...</span>
                  </div>
                  <span className="text-[10px] text-cyan-600 bg-cyan-950/20 border border-cyan-950/40 px-2 py-0.5 rounded">
                    Step {generationStep} of 6
                  </span>
                </div>

                {/* Console Outputs */}
                <div className="h-64 bg-black/80 rounded-xl border border-cyan-950/30 p-4 overflow-y-auto space-y-1.5 text-[10px] scrollbar-thin scrollbar-thumb-cyan-950">
                  {generationLogs.map((log, idx) => (
                    <div key={idx} className={`leading-relaxed ${
                      log.startsWith('[SUCCESS]') ? 'text-emerald-400 font-extrabold' :
                      log.startsWith('[ERROR]') ? 'text-rose-400 font-extrabold animate-bounce' :
                      log.startsWith('[SYSTEM]') ? 'text-cyan-400 font-black' : 'text-gray-400'
                    }`}>
                      {log}
                    </div>
                  ))}
                  <div className="text-cyan-600 animate-pulse">_</div>
                </div>

                <div className="text-[9px] text-gray-500 leading-relaxed text-center">
                  ⚙️ Please wait. Instantiating modular sections: Hero Banner, Products Catalog, Interactive Review ledger, Cart drawers, and local MTN/Airtel payment nodes...
                </div>
              </div>
            ) : (
              /* MANUAL TEMPLATE ARCHITECT BOARD */
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="space-y-1.5 border-b border-[#1a1a24] pb-3">
                  <h4 className="text-xs font-black text-white uppercase font-mono tracking-wider">✍️ Manual Template Architect</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Design and build custom reusable storefront templates, populate with initial structures, and choose whether to publish directly to merchant dashboards.</p>
                </div>

                {/* MANUAL CUSTOM DESIGN BOARD FORM */}
                <form onSubmit={handleCreateTemplate} className="space-y-4 font-mono text-xs text-gray-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Template Blueprint Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kampala Artisan Crafts"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Store Category</label>
                        <select
                          value={tempCategory}
                          onChange={(e) => setTempCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white"
                        >
                          <option value="Electronics">Electronics</option>
                          <option value="Apparel">Apparel & Fashion</option>
                          <option value="Grocery">Grocery & Fast Moving Goods</option>
                          <option value="Pharmacy">Pharmacy & Cosmetics</option>
                          <option value="Hardware">Hardware & Tools</option>
                          <option value="Retail">General Retail</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Target Industry</label>
                        <input
                          type="text"
                          placeholder="e.g. Handmade Handbags & Crafts"
                          value={tempIndustry}
                          onChange={(e) => setTempIndustry(e.target.value)}
                          className="w-full px-3 py-2 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Typography System</label>
                        <select
                          value={tempTypography}
                          onChange={(e) => setTempTypography(e.target.value)}
                          className="w-full px-3 py-2 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white"
                        >
                          <option value="Inter">Inter (Swiss Minimal)</option>
                          <option value="Space Grotesk">Space Grotesk (Neo-Brutalist Tech)</option>
                          <option value="Outfit">Outfit (Clean High-Contrast)</option>
                          <option value="JetBrains Mono">JetBrains Mono (Console Geek)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 block uppercase font-bold">Blueprint Description & Pitch</label>
                      <textarea
                        required
                        placeholder="Detailed description of the storefront layout and target niche..."
                        rows={2}
                        value={tempDesc}
                        onChange={(e) => setTempDesc(e.target.value)}
                        className="w-full px-3 py-2 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">One-time Buy Cost (UGX)</label>
                        <input
                          type="number"
                          required
                          value={tempPrice}
                          onChange={(e) => setTempPrice(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Monthly Rental Sub (UGX)</label>
                        <input
                          type="number"
                          required
                          value={tempMonthlySub}
                          onChange={(e) => setTempMonthlySub(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white"
                        />
                      </div>
                    </div>

                     <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Banner Wallpaper (Image/Video File)</label>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => handleFileChange(e, setTempBanner)}
                          className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-mono file:font-black file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer bg-[#12121a] border border-gray-800 p-1 rounded-xl"
                        />
                        {tempBanner && (
                          <div className="mt-1.5 border border-gray-800 p-1 rounded-lg bg-black/40">
                            {tempBanner.startsWith('data:video') || tempBanner.endsWith('.mp4') || tempBanner.endsWith('.webm') ? (
                              <video src={tempBanner} className="max-h-16 w-full object-cover rounded" controls muted />
                            ) : (
                              <img src={tempBanner} alt="Banner Preview" className="max-h-16 w-full object-cover rounded" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Brand Logo (Image File)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, setTempLogo)}
                          className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-mono file:font-black file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer bg-[#12121a] border border-gray-800 p-1 rounded-xl"
                        />
                        {tempLogo && (
                          <div className="mt-1.5 border border-gray-800 p-1 rounded-lg bg-black/40 flex justify-center">
                            <img src={tempLogo} alt="Logo Preview" className="h-12 w-12 object-cover rounded-xl" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Layout Style</label>
                        <select
                          value={tempStyle}
                          onChange={(e) => setTempStyle(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#12121a] border border-gray-800 focus:border-purple-500 focus:outline-none rounded-xl text-white"
                        >
                          <option value="Modern Grid">Modern Grid Showcase</option>
                          <option value="Bento Tech Grid">Bento Tech Grid</option>
                          <option value="Elegant Editorial">Elegant Editorial</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">Accent Theme</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={tempColor}
                            onChange={(e) => setTempColor(e.target.value)}
                            className="w-7 h-7 bg-transparent border-0 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-gray-400">{tempColor}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setTempColor('#ef4444')}
                          className="w-4 h-4 rounded-full bg-red-500 border border-gray-900 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setTempColor('#3b82f6')}
                          className="w-4 h-4 rounded-full bg-blue-500 border border-gray-900 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setTempColor('#10b981')}
                          className="w-4 h-4 rounded-full bg-emerald-500 border border-gray-900 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setTempColor('#eab308')}
                          className="w-4 h-4 rounded-full bg-yellow-500 border border-gray-900 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1a1a24] flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTemplateModal(false);
                          setTempName('');
                          setTempDesc('');
                          setTempBanner('');
                          setTempLogo('');
                        }}
                        className="flex-1 py-3 bg-[#13131c] hover:bg-[#1a1a26] text-gray-400 font-mono text-xs uppercase font-black rounded-xl border border-gray-800 transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingTemp}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-mono text-xs uppercase font-black rounded-xl transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-2"
                      >
                        {savingTemp ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Building Blueprint...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-white" />
                            <span>Build Storefront Blueprint</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPREHENSIVE LANDLORD SETUP PANEL MODAL */}
      {showSetupPanel && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b0b10] border border-[#1a1a24] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-[#0e0e14]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-xs font-black text-white tracking-widest uppercase font-mono">Storefront Setup panel</h3>
                  <p className="text-[9px] text-gray-500 font-mono">OVERRIDE DYNAMIC CONFIGURATIONS FOR "{formName}"</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSetupPanel(false);
                  setEditingTemplate(null);
                }}
                className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSetup} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* COLUMN 1: GENERAL CONFIGS */}
                <div className="space-y-4">
                  <div className="px-3 py-1.5 bg-[#12121a] border-l-2 border-purple-500 text-[10px] font-mono font-black uppercase text-purple-400 tracking-wider">
                    General Information
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Template Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
                      >
                        <option value="Electronics">Electronics</option>
                        <option value="Apparel & Fashion">Apparel & Fashion</option>
                        <option value="Groceries & Farm">Groceries & Farm</option>
                        <option value="Crafts & Art">Crafts & Art</option>
                        <option value="General Retail">General Retail</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Target Industry</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Technology Sales"
                        value={formIndustry}
                        onChange={(e) => setFormIndustry(e.target.value)}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Description</label>
                    <textarea
                      rows={3}
                      required
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 resize-none font-mono text-[11px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Recommended Business Types</label>
                    <input
                      type="text"
                      placeholder="e.g. Phone shop, repair center"
                      value={formRecommendedTypes}
                      onChange={(e) => setFormRecommendedTypes(e.target.value)}
                      className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Availability State</label>
                      <select
                        value={formAvailability}
                        onChange={(e) => setFormAvailability(e.target.value as any)}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      >
                        <option value="Available">Available</option>
                        <option value="Unavailable">Unavailable</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Blueprint Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: BRANDING & FINANCIAL MODELS */}
                <div className="space-y-4">
                  <div className="px-3 py-1.5 bg-[#12121a] border-l-2 border-cyan-500 text-[10px] font-mono font-black uppercase text-cyan-400 tracking-wider">
                    Brand Aesthetics & Assets
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Theme Color</label>
                      <div className="flex gap-1.5">
                        <input
                          type="color"
                          value={formThemeColor}
                          onChange={(e) => setFormThemeColor(e.target.value)}
                          className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formThemeColor}
                          onChange={(e) => setFormThemeColor(e.target.value)}
                          className="w-full bg-[#111116] border border-gray-800 rounded-lg text-[10px] text-white focus:outline-none font-mono px-1 text-center"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Typography</label>
                      <select
                        value={formTypography}
                        onChange={(e) => setFormTypography(e.target.value)}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none font-mono"
                      >
                        <option value="Inter">Inter (Sans)</option>
                        <option value="Space Grotesk">Space Grotesk</option>
                        <option value="Outfit">Outfit (Tech)</option>
                        <option value="Playfair Display">Playfair Display</option>
                      </select>
                    </div>

                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Layout Style</label>
                      <select
                        value={formLayoutStyle}
                        onChange={(e) => setFormLayoutStyle(e.target.value)}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none font-mono"
                      >
                        <option value="Bento Tech Grid">Bento Tech Grid</option>
                        <option value="Elegant Boutique List">Elegant Boutique List</option>
                        <option value="Rustic Fresh Farm">Rustic Fresh Farm</option>
                        <option value="Warm Vintage Gallery">Warm Vintage Gallery</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Logo Image File</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setFormLogoUrl)}
                        className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-mono file:font-black file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer bg-[#111116] border border-gray-800 p-1 rounded-xl"
                      />
                      {formLogoUrl && (
                        <div className="mt-1 flex justify-center">
                          <img src={formLogoUrl} alt="Logo Preview" className="h-10 w-10 object-cover rounded-xl border border-gray-800" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Banner Cover (Image/Video)</label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleFileChange(e, setFormBannerUrl)}
                        className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-mono file:font-black file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer bg-[#111116] border border-gray-800 p-1 rounded-xl"
                      />
                      {formBannerUrl && (
                        <div className="mt-1 border border-gray-800 p-1 rounded-lg bg-black/40">
                          {formBannerUrl.startsWith('data:video') || formBannerUrl.includes('.mp4') || formBannerUrl.includes('.webm') ? (
                            <video src={formBannerUrl} className="max-h-12 w-full object-cover rounded" controls muted />
                          ) : (
                            <img src={formBannerUrl} alt="Banner Preview" className="max-h-12 w-full object-cover rounded" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-1.5 bg-[#12121a] border-l-2 border-emerald-500 text-[10px] font-mono font-black uppercase text-emerald-400 tracking-wider">
                    Financial Model & Subscription
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Seeding setup Price (UGX)</label>
                      <input
                        type="number"
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-gray-500 uppercase">Monthly Subscription (UGX)</label>
                      <input
                        type="number"
                        value={formMonthlySub}
                        onChange={(e) => setFormMonthlySub(Number(e.target.value))}
                        className="w-full bg-[#111116] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-1.5 text-xs font-mono text-gray-300">
                    <label className="flex items-center gap-2 bg-[#111116] border border-gray-800 p-2 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formOneTimePurchase}
                        onChange={(e) => setFormOneTimePurchase(e.target.checked)}
                        className="rounded border-gray-800 text-purple-600 focus:ring-0"
                      />
                      <span className="text-[9px] uppercase">One-Time Buy</span>
                    </label>

                    <label className="flex items-center gap-2 bg-[#111116] border border-gray-800 p-2 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formFeatured}
                        onChange={(e) => setFormFeatured(e.target.checked)}
                        className="rounded border-gray-800 text-purple-600 focus:ring-0"
                      />
                      <span className="text-[9px] uppercase">Featured</span>
                    </label>

                    <div className="flex items-center gap-2 bg-[#111116] border border-gray-800 p-2 rounded-xl">
                      <span className="text-[9px] text-gray-500 uppercase">Tier:</span>
                      <select
                        value={formPremiumFree}
                        onChange={(e) => setFormPremiumFree(e.target.value as any)}
                        className="bg-transparent border-0 focus:ring-0 text-[10px] font-black text-cyan-400 p-0 font-mono"
                      >
                        <option value="Premium" className="bg-[#111116]">Premium</option>
                        <option value="Free" className="bg-[#111116]">Free</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: HOME LAYOUT SECTIONS - REUSABLE BLOCKS */}
              <div className="p-4 bg-[#09090d] border border-gray-900 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#181822] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-[10px] font-mono font-black uppercase text-white tracking-wider">
                      Dynamic Homepage Blocks Assembly
                    </span>
                  </div>
                  <span className="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-900 px-2.5 py-0.5 rounded-full uppercase font-mono font-bold">
                    Section-Based Architecture Active
                  </span>
                </div>

                <p className="text-[10px] text-gray-500 font-mono">
                  Every homepage is assembled from these reusable components. Merchants can later customize or reorder them, but they initialize fully hydrated out-of-the-box. Check to enable or disable sections:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {formBlocks.map((block: any, idx: number) => (
                    <label key={block.id || idx} className="flex items-center justify-between p-2.5 bg-[#12121a] hover:bg-purple-950/15 border border-gray-800 rounded-xl cursor-pointer group transition-colors">
                      <span className="text-[10px] font-bold text-gray-300 group-hover:text-white transition-colors">
                        {block.title || block.id}
                      </span>
                      <input
                        type="checkbox"
                        checked={block.enabled !== false}
                        onChange={(e) => {
                          const nextBlocks = [...formBlocks];
                          nextBlocks[idx] = { ...block, enabled: e.target.checked };
                          setFormBlocks(nextBlocks);
                        }}
                        className="rounded border-gray-800 text-purple-600 focus:ring-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* SAVE ACTION */}
              <div className="pt-4 border-t border-[#1a1a24] flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setShowSetupPanel(false);
                    setEditingTemplate(null);
                  }}
                  className="flex-1 py-3 bg-[#13131c] hover:bg-[#1a1a26] text-gray-400 font-mono text-xs uppercase font-black rounded-xl border border-gray-800 transition-all cursor-pointer min-w-[120px]"
                >
                  Discard Overrides
                </button>
                <button
                  type="submit"
                  disabled={savingSetup || savingBlueprint}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs uppercase font-black rounded-xl transition-all shadow-xl shadow-purple-500/15 cursor-pointer disabled:opacity-50 min-w-[120px]"
                >
                  {savingSetup ? 'Committing Blueprint...' : '💾 Save Template Blueprint'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsBlueprint}
                  disabled={savingSetup || savingBlueprint}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs uppercase font-black rounded-xl transition-all shadow-xl shadow-cyan-500/15 cursor-pointer disabled:opacity-50 min-w-[120px]"
                >
                  {savingBlueprint ? 'Saving Custom Blueprint...' : '💎 Save to template_blueprints'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
