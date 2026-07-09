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
   * Generates a fully populated, merchant-specific store document by cloning a template configuration.
   * Copies style configuration, homepage blocks, FAQs, policies, and seeds all sample products/reviews.
   * 
   * @param templateId The ID of the template blueprint in the `shop_templates` collection
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
    
    // 1. Fetch template blueprint
    const templateRef = doc(db, 'shop_templates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      throw new Error(`Storefront template with ID "${templateId}" does not exist in our ledger.`);
    }
    
    const template = templateSnap.data() as TemplateBlueprint;
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
    const prodsSnapshot = await getDocs(prodsQuery);
    
    let clonedProductsCount = 0;
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
    console.log(`[TEMPLATE ENGINE] Hydrated product ledger: successfully cloned ${clonedProductsCount} items.`);

    // 4. Query and clone associated reviews
    const reviewsQuery = query(collection(db, 'biz_reviews'), where('shopId', '==', templateId));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    
    let clonedReviewsCount = 0;
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
