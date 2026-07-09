/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '@/firebase/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { PREDEFINED_NICHES } from '@/components/bizlink/nicheData';

export interface TemplateBlueprint {
  id: string;
  name: string;
  description: string;
  category?: string;
  industry?: string;
  tags?: string[];
  basePrice?: number;
  price?: number;
  monthlySubscription?: number;
  oneTimePurchase?: boolean;
  premiumOrFree?: 'Premium' | 'Free';
  recommendedTypes?: string[];
  themeColor: string;
  typography?: string;
  style?: string;
  layoutStyle?: string;
  logoUrl: string;
  bannerUrl: string;
  businessHours: string;
  location: string;
  homepageBlocks?: any[];
  faqs?: { q: string; a: string }[];
  policies?: {
    privacy: string;
    terms: string;
    delivery: string;
    returns: string;
  };
  status?: string;
}

/**
 * Service module for storing, managing, and hydrating merchant storefronts from templates.
 */
export const BizLinkTemplateEngine = {
  /**
   * Fetches all published template blueprints from Firestore.
   */
  async fetchTemplates(): Promise<TemplateBlueprint[]> {
    console.log('[TEMPLATE ENGINE] Fetching template blueprints ledger...');
    const templatesCol = collection(db, 'shop_templates');
    const snapshot = await getDocs(templatesCol);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as TemplateBlueprint[];
  },

  /**
   * Fetches a specific template blueprint by ID from Firestore.
   */
  async fetchTemplateById(templateId: string): Promise<TemplateBlueprint | null> {
    console.log(`[TEMPLATE ENGINE] Fetching template blueprint: ${templateId}`);
    const templateRef = doc(db, 'shop_templates', templateId);
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists()) {
      return null;
    }
    return {
      id: templateSnap.id,
      ...templateSnap.data()
    } as TemplateBlueprint;
  },

  /**
   * Saves a new shop configuration structure as a blueprint document in 'template_blueprints' collection.
   * This allows the Admin to store custom shop layouts/configurations as reusable templates.
   * 
   * @param blueprint The blueprint document structure containing config settings
   */
  async saveTemplateBlueprint(blueprint: Partial<TemplateBlueprint> & { name: string }): Promise<string> {
    console.log(`[TEMPLATE ENGINE] Saving template blueprint to 'template_blueprints' collection:`, blueprint.name);
    
    const id = blueprint.id || 'blueprint_' + Math.random().toString(36).substring(2, 9);
    const blueprintDocRef = doc(db, 'template_blueprints', id);
    
    const finalBlueprint: TemplateBlueprint = {
      id,
      name: blueprint.name,
      description: blueprint.description || 'Custom shop configuration blueprint',
      category: blueprint.category || 'General',
      industry: blueprint.industry || 'General',
      tags: blueprint.tags || [],
      basePrice: blueprint.basePrice ?? 0,
      price: blueprint.price ?? 0,
      monthlySubscription: blueprint.monthlySubscription ?? 0,
      oneTimePurchase: blueprint.oneTimePurchase ?? true,
      premiumOrFree: blueprint.premiumOrFree || 'Free',
      recommendedTypes: blueprint.recommendedTypes || [],
      themeColor: blueprint.themeColor || '#06b6d4',
      typography: blueprint.typography || 'Inter',
      style: blueprint.style || 'Modern Grid',
      layoutStyle: blueprint.layoutStyle || 'Modern Grid',
      logoUrl: blueprint.logoUrl || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6',
      bannerUrl: blueprint.bannerUrl || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1',
      businessHours: blueprint.businessHours || '08:00 AM - 09:00 PM',
      location: blueprint.location || 'Kampala Arcade, Block C',
      homepageBlocks: blueprint.homepageBlocks || [],
      faqs: blueprint.faqs || [],
      policies: blueprint.policies || {
        privacy: 'Your phone and transaction details are kept confidential.',
        terms: 'All sales are final once Boda Boda dispatch confirms handover.',
        delivery: 'Ugandan local deliveries dispatch daily from central arcades.',
        returns: '7 days return period for manufacturer faults.'
      },
      status: blueprint.status || 'active'
    };

    await setDoc(blueprintDocRef, finalBlueprint);
    console.log(`[TEMPLATE ENGINE] Saved template blueprint successfully with ID: ${id}`);
    return id;
  },

  /**
   * Fetches all custom saved blueprints from the 'template_blueprints' collection.
   */
  async fetchBlueprints(): Promise<TemplateBlueprint[]> {
    console.log('[TEMPLATE ENGINE] Fetching all template blueprints from template_blueprints...');
    const blueprintsCol = collection(db, 'template_blueprints');
    const snapshot = await getDocs(blueprintsCol);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as TemplateBlueprint[];
  },

  /**
   * Fetches a specific template blueprint from the 'template_blueprints' collection by ID.
   */
  async fetchBlueprintById(blueprintId: string): Promise<TemplateBlueprint | null> {
    console.log(`[TEMPLATE ENGINE] Fetching template blueprint from template_blueprints: ${blueprintId}`);
    const blueprintRef = doc(db, 'template_blueprints', blueprintId);
    const blueprintSnap = await getDoc(blueprintRef);
    if (!blueprintSnap.exists()) {
      return null;
    }
    return {
      id: blueprintSnap.id,
      ...blueprintSnap.data()
    } as TemplateBlueprint;
  },

  /**
   * Generates a fully populated, merchant-specific store document by cloning a template configuration.
   * Copies style configuration, homepage blocks, FAQs, policies, and seeds all sample products/reviews.
   * 
   * @param templateId The ID of the template blueprint in either 'shop_templates' or 'template_blueprints' collection
   * @param merchantId The User UID of the merchant
   * @param applicationData Optional merchant application metadata to customize branding details
   */
  async generateStoreFromTemplate(
    templateId: string, 
    merchantId: string, 
    applicationData?: {
      businessName: string;
      businessDescription: string;
      userName: string;
      userEmail: string;
      whatsappNumber?: string;
      applicationId?: string;
    }
  ) {
    console.log(`[TEMPLATE ENGINE] Starting hydration for merchant: ${merchantId} using template: ${templateId}`);
    
    // 1. Fetch template blueprint (try shop_templates first, then template_blueprints)
    let template = await this.fetchTemplateById(templateId);
    if (!template) {
      template = await this.fetchBlueprintById(templateId);
    }
    
    // Resolve from PREDEFINED_NICHES if Firestore gets returned nothing (useful for empty dbs or permission-denied fallbacks)
    if (!template) {
      const key = templateId.startsWith('template_') ? templateId.replace('template_', '') : templateId;
      const localNiche = PREDEFINED_NICHES.find(n => n.key === key);
      if (localNiche) {
        template = {
          id: templateId,
          name: localNiche.name,
          description: localNiche.description,
          category: localNiche.category,
          industry: localNiche.industry,
          tags: localNiche.tags,
          themeColor: localNiche.themeColor,
          typography: localNiche.typography,
          layoutStyle: localNiche.layoutStyle,
          bannerUrl: localNiche.bannerUrl,
          logoUrl: localNiche.logoUrl,
          businessHours: localNiche.businessHours,
          location: localNiche.location,
          homepageBlocks: localNiche.homepageBlocks,
          faqs: localNiche.faqs,
          policies: localNiche.policies,
          status: 'published'
        };
      }
    }
    
    if (!template) {
      throw new Error(`Storefront template with ID "${templateId}" does not exist in our ledger.`);
    }
    
    const shopId = `shop_${merchantId}`;
    
    // Use application overrides or fall back to template defaults
    const finalShopName = applicationData?.businessName || template.name;
    const finalDescription = applicationData?.businessDescription || template.description;
    const finalOwnerName = applicationData?.userName || 'Registered Merchant';
    const finalOwnerEmail = applicationData?.userEmail || '';
    const finalWhatsapp = applicationData?.whatsappNumber || '';

    // 2. Build live shop document representation
    const newShopData = {
      id: shopId,
      templateId: templateId,
      status: 'OCCUPIED',
      ownerId: merchantId,
      ownerName: finalOwnerName,
      ownerEmail: finalOwnerEmail,
      name: finalShopName,
      description: finalDescription,
      bannerUrl: template.bannerUrl || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1',
      logoUrl: template.logoUrl || 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6',
      verified: true,
      rating: 5.0,
      followerCount: 0,
      followers: [],
      businessHours: template.businessHours || '08:00 AM - 09:00 PM',
      location: template.location || 'Kampala Arcade, Block C',
      socialLinks: { 
        whatsapp: finalWhatsapp,
        facebook: '',
        twitter: '',
        instagram: ''
      },
      yearsOnPlatform: 1,
      responseRate: 100,
      responseTime: 'within 5 minutes',
      totalSales: 0,
      satisfactionRate: 100,
      createdAt: new Date().toISOString(),
      
      // Theme & styling configurations cloned from template blueprint
      themeColor: template.themeColor || '#06b6d4',
      typography: template.typography || 'Inter',
      layoutStyle: template.layoutStyle || template.style || 'Modern Grid',
      homepageBlocks: template.homepageBlocks || [],
      policies: template.policies || {
        privacy: 'Your phone and transaction details are kept confidential.',
        terms: 'All sales are final once Boda Boda dispatch confirms handover.',
        delivery: 'Ugandan local deliveries dispatch daily from central arcades.',
        returns: '7 days return period for manufacturer faults.'
      },
      faqs: template.faqs || []
    };

    // Save live shop record to Firestore
    await setDoc(doc(db, 'biz_shops', shopId), newShopData);
    console.log(`[TEMPLATE ENGINE] Created live store "${finalShopName}" at path biz_shops/${shopId}`);

    // 3. Query and clone associated products
    const prodsQuery = query(collection(db, 'biz_products'), where('shopId', '==', templateId));
    let prodsSnapshot: any;
    try {
      prodsSnapshot = await getDocs(prodsQuery);
    } catch (e) {
      console.warn("Failed to fetch template products, falling back to local seed:", e);
      prodsSnapshot = { empty: true, docs: [] };
    }
    
    let clonedProductsCount = 0;
    if (prodsSnapshot && !prodsSnapshot.empty) {
      for (const productDoc of prodsSnapshot.docs) {
        const productData = productDoc.data();
        const newProdId = 'prod_' + Math.random().toString(36).substring(2, 9);
        
        await setDoc(doc(db, 'biz_products', newProdId), {
          ...productData,
          id: newProdId,
          shopId: shopId,
          shopName: finalShopName,
          createdAt: new Date().toISOString()
        });
        clonedProductsCount++;
      }
    } else {
      // Fallback: Seed from predefined niche local products
      const key = templateId.startsWith('template_') ? templateId.replace('template_', '') : templateId;
      const localNiche = PREDEFINED_NICHES.find(n => n.key === key);
      if (localNiche && localNiche.sampleProducts) {
        for (const prod of localNiche.sampleProducts) {
          const newProdId = 'prod_' + Math.random().toString(36).substring(2, 9);
          await setDoc(doc(db, 'biz_products', newProdId), {
            ...prod,
            id: newProdId,
            shopId: shopId,
            shopName: finalShopName,
            createdAt: new Date().toISOString()
          });
          clonedProductsCount++;
        }
      }
    }
    console.log(`[TEMPLATE ENGINE] Hydrated product ledger: successfully cloned ${clonedProductsCount} items.`);

    // 4. Query and clone associated reviews
    const reviewsQuery = query(collection(db, 'biz_reviews'), where('shopId', '==', templateId));
    let reviewsSnapshot: any;
    try {
      reviewsSnapshot = await getDocs(reviewsQuery);
    } catch (e) {
      console.warn("Failed to fetch template reviews, falling back to local seed:", e);
      reviewsSnapshot = { empty: true, docs: [] };
    }
    
    let clonedReviewsCount = 0;
    if (reviewsSnapshot && !reviewsSnapshot.empty) {
      for (const reviewDoc of reviewsSnapshot.docs) {
        const reviewData = reviewDoc.data();
        const newReviewId = 'rev_' + Math.random().toString(36).substring(2, 9);
        
        await setDoc(doc(db, 'biz_reviews', newReviewId), {
          ...reviewData,
          id: newReviewId,
          shopId: shopId,
          createdAt: new Date().toISOString()
        });
        clonedReviewsCount++;
      }
    } else {
      // Fallback: Seed from predefined niche local reviews
      const key = templateId.startsWith('template_') ? templateId.replace('template_', '') : templateId;
      const localNiche = PREDEFINED_NICHES.find(n => n.key === key);
      if (localNiche && localNiche.sampleReviews) {
        for (const rev of localNiche.sampleReviews) {
          const newReviewId = 'rev_' + Math.random().toString(36).substring(2, 9);
          await setDoc(doc(db, 'biz_reviews', newReviewId), {
            ...rev,
            id: newReviewId,
            shopId: shopId,
            createdAt: new Date().toISOString()
          });
          clonedReviewsCount++;
        }
      }
    }
    console.log(`[TEMPLATE ENGINE] Hydrated customer review bank: successfully cloned ${clonedReviewsCount} verified reviews.`);

    // 5. Update parent application references if applicable
    if (applicationData?.applicationId) {
      const appRef = doc(db, 'merchant_applications', applicationData.applicationId);
      await updateDoc(appRef, {
        assignedShopId: shopId,
        status: 'paid', // Update status to paid/active
        paidAt: new Date().toISOString()
      });
      console.log(`[TEMPLATE ENGINE] Updated applicant ledger record for ID: ${applicationData.applicationId}`);
    }

    return {
      shopId,
      shopName: finalShopName,
      clonedProductsCount,
      clonedReviewsCount
    };
  }
};
