/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PredefinedNiche {
  key: string;
  name: string;
  slogan: string;
  description: string;
  category: string;
  industry: string;
  tags: string[];
  price: number;
  monthlySubscription: number;
  oneTimePurchase: boolean;
  premiumOrFree: 'Premium' | 'Free';
  recommendedTypes: string[];
  themeColor: string;
  typography: string;
  layoutStyle: string;
  bannerUrl: string;
  logoUrl: string;
  businessHours: string;
  location: string;
  homepageBlocks: any[];
  faqs: { q: string; a: string }[];
  policies: {
    privacy: string;
    terms: string;
    delivery: string;
    returns: string;
  };
  sampleProducts: any[];
  sampleReviews: any[];
}

export const PREDEFINED_NICHES: PredefinedNiche[] = [
  {
    key: 'tech',
    name: 'Kampala Elite Tech Hub',
    slogan: 'Next-Gen Electronics & Smart Gadgets, Delivered Daily',
    description: 'Your premier tech center for certified smartphones, high-capacity power banks, ANC earbuds, and wearable gadgets in Kampala.',
    category: 'Electronics',
    industry: 'Consumer Technology & Accessories',
    tags: ['tech', 'smartphones', 'accessories', 'momo-ready', 'uganda'],
    price: 150000,
    monthlySubscription: 35000,
    oneTimePurchase: false,
    premiumOrFree: 'Premium',
    recommendedTypes: ['Retailer', 'Distributor', 'Online Electronics Brand'],
    themeColor: '#06b6d4',
    typography: 'Space Grotesk',
    layoutStyle: 'Bento Tech Grid',
    bannerUrl: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop',
    businessHours: '08:00 AM - 09:00 PM',
    location: 'Ssebaggala Arcade, Block C, Kampala Rd',
    homepageBlocks: [
      { type: 'hero', enabled: true, title: 'Unleash Cyber Uganda', subtitle: 'Kampala’s most trusted smart gadget shelves.', actionText: 'Scan Digital Shelves' },
      { type: 'categories', enabled: true, title: 'Browse Active Channels', list: ['Wearables', 'Audio Pro', 'Energy Banks', 'Cables'] },
      { type: 'products', enabled: true, title: 'Featured Cyber Specimen', layout: 'grid' },
      { type: 'flash_sales', enabled: true, title: 'Today’s Voltage Deal', discount: '15% Off Boda Sonic Earbuds', endsIn: '06 Hours' },
      { type: 'highlights', enabled: true, title: 'Platform Guarantees', items: ['UGX Mobile Money Gateways Active', 'Real-time Boda-Boda Courier Dispatch', '1-Year Kampala Arcade Warranty'] },
      { type: 'testimonials', enabled: true, title: 'Kampala Shopper Consensus', list: [
        { name: 'Kato James (Ntinda)', text: 'The Matooke Power Bank 20K kept my shop running through a 6-hour blackout. Incredible speed!' },
        { name: 'Namubiru Grace (Wandegeya)', text: 'Earbuds are perfectly water-resistant. Commutes through the rain are sound-insulated now!' }
      ]},
      { type: 'faq', enabled: true, title: 'Frequently Asked Spec' },
      { type: 'newsletter', enabled: true, title: 'Subscribe for Hot Batches', text: 'Recieve discount voucher pins direct to your SMS or Email.' },
      { type: 'contact', enabled: true, title: 'Interactive Coordinate Grid' },
      { type: 'footer', enabled: true, text: 'All rights reserved © Kampala Elite Tech. Fully secure.' }
    ],
    faqs: [
      { q: 'Do you offer instant delivery in Kampala?', a: 'Yes! All local orders are dispatched via Boda Boda Express within 30 minutes of payment confirmation.' },
      { q: 'How do I claim my 1-year arcade warranty?', a: 'Keep your mobile money transaction receipt. You can bring the device back to Ssebaggala Arcade Block C for instant swap-outs.' }
    ],
    policies: {
      privacy: 'We store your phone number and address strictly to facilitate Boda delivery. No data is shared.',
      terms: 'Payments must be verified via MTN MoMo or Airtel Money before courier leaves the arcade.',
      delivery: 'Flat rate 4,500 UGX within central Kampala. Outside Kampala is dispatched via taxi/link bus park.',
      returns: '7-day zero-questions replacement policy for any manufacturer malfunction.'
    },
    sampleProducts: [
      {
        title: 'Horizon Elite GPS Smartwatch',
        description: 'Elite smartwatch with dynamic fitness tracking, heart rate sensor, active GPS, and custom Kampala digital clock face. Built with impact-proof aerospace aluminum.',
        price: 240000,
        imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=600&auto=format&fit=crop'
        ],
        stock: 12,
        category: 'Wearables',
        brand: 'Horizon',
        variants: [
          { id: 'v1', type: 'color', name: 'Midnight Cyber Black', value: '#111116', priceModifier: 0, stock: 8, sku: 'TECH-HOR-001-B' },
          { id: 'v2', type: 'color', name: 'Kampala Chrome Silver', value: '#cbd5e1', priceModifier: 15000, stock: 4, sku: 'TECH-HOR-001-S' },
          { id: 'v3', type: 'size', name: '44mm Chassis', value: '44mm', priceModifier: 0, stock: 6, sku: 'TECH-HOR-001-44' },
          { id: 'v4', type: 'size', name: '40mm Compact', value: '40mm', priceModifier: -10000, stock: 6, sku: 'TECH-HOR-001-40' }
        ],
        specifications: [
          { label: 'Battery Life', value: '7 Days active usage' },
          { label: 'Water Protection', value: 'IP68 Certified' },
          { label: 'Weight', value: '42 grams' }
        ],
        warranty: '12 Months Local Arcade Warranty',
        returnPolicy: '7 Days refund for manufacturer fault.',
        shippingInfo: 'Immediate boda boda delivery.'
      },
      {
        title: 'Boda Sonic Active ANC Earbuds',
        description: 'Tailor-made for the bustling Kampala streets. Active Noise Cancellation blocks boda boda exhaust noises and market crowds, delivering studio-grade acoustic performance.',
        price: 125000,
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1588449668365-d15e397f6787?w=600&auto=format&fit=crop'
        ],
        stock: 45,
        category: 'Audio Pro',
        brand: 'Boda Sonic',
        variants: [
          { id: 'v5', type: 'color', name: 'Matte Jet Black', value: '#1a1a24', priceModifier: 0, stock: 30, sku: 'TECH-SON-001' },
          { id: 'v6', type: 'color', name: 'Victoria Foam White', value: '#ffffff', priceModifier: 0, stock: 15, sku: 'TECH-SON-002' }
        ],
        specifications: [
          { label: 'ANC Noise Cancellation', value: 'Up to 38dB' },
          { label: 'Playback Time', value: '32 Hours with Case' },
          { label: 'Bluetooth', value: 'Version 5.3 Fast Link' }
        ],
        warranty: '6 Months Local Swap-Out',
        returnPolicy: 'No return if seal is broken except for hardware bugs.',
        shippingInfo: 'Central Kampala delivery is 4,500 UGX.'
      },
      {
        title: 'Matooke Power Bank 20,000mAh',
        description: 'Heavy-duty power bank with 22.5W superfast charging. Designed specifically to keep your smartphones and tablets active during grid load-sheddings.',
        price: 95000,
        imageUrl: 'https://images.unsplash.com/photo-1609592424085-78ba7dfc2598?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1609592424085-78ba7dfc2598?w=600&auto=format&fit=crop'
        ],
        stock: 25,
        category: 'Energy Banks',
        brand: 'Matooke Charge',
        variants: [
          { id: 'v7', type: 'color', name: 'Carbon Gray', value: '#4b5563', priceModifier: 0, stock: 15, sku: 'TECH-PWR-001' },
          { id: 'v8', type: 'color', name: 'Solar Gold Accent', value: '#eab308', priceModifier: 5000, stock: 10, sku: 'TECH-PWR-002' }
        ],
        specifications: [
          { label: 'Capacity', value: '20,000mAh' },
          { label: 'Max Output', value: '22.5W QuickCharge 3.0' },
          { label: 'Input Ports', value: 'Type-C, Micro-USB' }
        ],
        warranty: '1 Year Exchange Guarantee',
        returnPolicy: '3 Days return window.',
        shippingInfo: 'Delivered in premium safety box.'
      }
    ],
    sampleReviews: [
      {
        userName: 'Ssewankambo Henry',
        rating: 5,
        text: 'The power bank is a lifesaver. Fast charge is genuine, charges my S23 Ultra in under an hour!',
        verifiedPurchase: true,
        helpfulVotes: 9,
        replies: [{ userId: 'merchant', userName: 'Kampala Tech', text: 'Thank you Henry! Keep charging with power!', createdAt: new Date().toISOString() }]
      },
      {
        userName: 'Nalukwago Juliet',
        rating: 4,
        text: 'Very good sound quality on the earbuds, but the touch controls take some getting used to. Excellent boda courier delivery.',
        verifiedPurchase: true,
        helpfulVotes: 3,
        replies: [{ userId: 'merchant', userName: 'Kampala Tech', text: 'Thanks Juliet! You can tweak touch configurations in the manual.', createdAt: new Date().toISOString() }]
      }
    ]
  },
  {
    key: 'fashion',
    name: 'Entebbe Fashion Avenue',
    slogan: 'Premium Modern Kitenge Garments & Bespoke Ankara Print',
    description: 'A luxurious digital boutique featuring custom-tailored African wax jackets, modern dresses, and handcrafted beaded accessories.',
    category: 'Fashion',
    industry: 'High-End Textile & Modern African Apparel',
    tags: ['fashion', 'boutique', 'kitenge', 'handmade', 'bespoke'],
    price: 180000,
    monthlySubscription: 40000,
    oneTimePurchase: true,
    premiumOrFree: 'Premium',
    recommendedTypes: ['Designer Atelier', 'Boutique owner', 'Artisan Tailor'],
    themeColor: '#ec4899',
    typography: 'Playfair Display',
    layoutStyle: 'Elegant Boutique List',
    bannerUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&auto=format&fit=crop',
    businessHours: '09:00 AM - 08:00 PM',
    location: 'Victoria Arcade, Ground Floor, Entebbe',
    homepageBlocks: [
      { type: 'hero', enabled: true, title: 'Wear Your Heritage', subtitle: 'Royal kitenge textures engineered for the modern citizen.', actionText: 'View Collection' },
      { type: 'categories', enabled: true, title: 'Browse Premium Edits', list: ['Blazers', 'Wrap Dresses', 'Handwoven Bags'] },
      { type: 'products', enabled: true, title: 'Artisanal Garment Shelves', layout: 'grid' },
      { type: 'flash_sales', enabled: true, title: 'Weekly Silhouette Drop', discount: '10% on Ankara Wraps', endsIn: '1 Day' },
      { type: 'highlights', enabled: true, title: 'Tailoring Excellence', items: ['Custom Measures Tweakable via WhatsApp', '100% Cotton Authentic Wax Prints', 'Next-Day Central Uganda Delivery'] },
      { type: 'testimonials', enabled: true, title: 'Voices of Elegance', list: [
        { name: 'Nassolo Shadia (Kireka)', text: 'The blazer fits like a dream! I received so many compliments at the wedding last weekend.' },
        { name: 'Ochan David (Mukono)', text: 'Premium stitches. The lining fabric is extremely comfortable and handles Kampala humidity well.' }
      ]},
      { type: 'faq', enabled: true, title: 'Atelier FAQ' },
      { type: 'newsletter', enabled: true, title: 'Join the Secret Society', text: 'Get notifications on new pattern arrivals and custom fitting seasons.' },
      { type: 'contact', enabled: true, title: 'Atelier Map Coordinates' },
      { type: 'footer', enabled: true, text: 'All rights reserved © Entebbe Fashion Avenue.' }
    ],
    faqs: [
      { q: 'Can I send custom body measurements?', a: 'Yes! After order placement, tap our WhatsApp chat and send your bust, waist, and height for a custom tailored fit.' },
      { q: 'What fabrics do you use?', a: 'We source 100% premium double-wax cotton prints directly from accredited weavers in West Africa and local weavers in Jinja.' }
    ],
    policies: {
      privacy: 'We hold measurement logs securely for future order fittings.',
      terms: 'Bespoke custom sizes cannot be refunded once cutting starts, but alterations are 100% free.',
      delivery: 'Doorstep shipping across Entebbe and Kampala within 24 hours. Regional buses for outer towns.',
      returns: 'Free adjustments if fitting does not match your ordered size profile.'
    },
    sampleProducts: [
      {
        title: 'Royal Kitenge Tailored Blazer',
        description: 'Exquisite, modern blazer handcrafted from genuine high-thread-count African wax print cotton. Fully lined with breathable luxury satin. Suitable for executive meetings or cultural celebrations.',
        price: 185000,
        imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&auto=format&fit=crop'
        ],
        stock: 6,
        category: 'Blazers',
        brand: 'Entebbe Avenue',
        variants: [
          { id: 'v10', type: 'size', name: 'Medium size', value: 'M', priceModifier: 0, stock: 3, sku: 'FASH-BLZ-M' },
          { id: 'v11', type: 'size', name: 'Large size', value: 'L', priceModifier: 0, stock: 2, sku: 'FASH-BLZ-L' },
          { id: 'v12', type: 'color', name: 'Imperial Blue-Gold Pattern', value: '#1d4ed8', priceModifier: 0, stock: 3, sku: 'FASH-BLZ-BLU' },
          { id: 'v13', type: 'color', name: 'Ugandan Sunset Orange', value: '#ea580c', priceModifier: 5000, stock: 3, sku: 'FASH-BLZ-ORG' }
        ],
        specifications: [
          { label: 'Fabric Composition', value: '100% Double-Wax Cotton' },
          { label: 'Inner Lining', value: 'Premium Breathable Satin' },
          { label: 'Pockets', value: '2 Front flap pockets, 1 Inner slot' }
        ],
        warranty: 'Lifetime Stitching Guarantee',
        returnPolicy: 'Free modifications within 14 days.',
        shippingInfo: 'Handled in specialized protective garment bags.'
      },
      {
        title: 'Bespoke Ankara wrap Dress',
        description: 'Vibrant, flowing wrap dress featuring traditional geometric prints. Flattering waist tie design ensures a highly adjustable, comfortable, and elegant silhouette.',
        price: 145000,
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop'
        ],
        stock: 10,
        category: 'Wrap Dresses',
        brand: 'Entebbe Avenue',
        variants: [
          { id: 'v14', type: 'size', name: 'Small fit', value: 'S', priceModifier: 0, stock: 3, sku: 'FASH-WRP-S' },
          { id: 'v15', type: 'size', name: 'Medium fit', value: 'M', priceModifier: 0, stock: 4, sku: 'FASH-WRP-M' },
          { id: 'v16', type: 'size', name: 'Large fit', value: 'L', priceModifier: 5000, stock: 3, sku: 'FASH-WRP-L' }
        ],
        specifications: [
          { label: 'Dress Length', value: 'Ankle Length (48 inches)' },
          { label: 'Belt style', value: 'Integrated self-tie sash' },
          { label: 'Care Instructions', value: 'Cold wash only, dry in shade' }
        ],
        warranty: '12 Months seams assurance',
        returnPolicy: 'Can return if pristine condition.',
        shippingInfo: 'Packaged in beautiful recycled gift box.'
      }
    ],
    sampleReviews: [
      {
        userName: 'Aisha Namaganda',
        rating: 5,
        text: 'Absolute perfection. Sent my measurements over WhatsApp and it fits exactly like a second skin. Stitches are masterfully strong!',
        verifiedPurchase: true,
        helpfulVotes: 12,
        replies: [{ userId: 'merchant', userName: 'Entebbe Boutique', text: 'You look radiant Aisha! Thank you for choosing us!', createdAt: new Date().toISOString() }]
      }
    ]
  },
  {
    key: 'groceries',
    name: 'Gulu Organic Harvest',
    slogan: 'Cold-Pressed Shea Butter & Raw Northern Organic Farm Goods',
    description: 'Bringing pure, healthy northern harvests directly to your Kampala pantry. Specialize in raw wild honey, unrefined shea butter, and organic pastes.',
    category: 'Groceries',
    industry: 'Organic Health Food & Natural Agriculture',
    tags: ['organic', 'groceries', 'sheabutter', 'honey', 'gulu'],
    price: 110000,
    monthlySubscription: 25000,
    oneTimePurchase: false,
    premiumOrFree: 'Free',
    recommendedTypes: ['Farm cooperative', 'Natural health product shop', 'Organic bulk store'],
    themeColor: '#10b981',
    typography: 'Outfit',
    layoutStyle: 'Rustic Fresh Farm',
    bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=200&auto=format&fit=crop',
    businessHours: '07:30 AM - 07:00 PM',
    location: 'Gulu High Street Hub, Gulu City Center',
    homepageBlocks: [
      { type: 'hero', enabled: true, title: 'Nurtured by Nature', subtitle: 'Raw nutrients direct from fertile soils of Northern Uganda.', actionText: 'Explore Farm Produce' },
      { type: 'categories', enabled: true, title: 'Our Nutrient Shelves', list: ['Oils & Cosmetics', 'Forest Honey', 'Rich Pastes'] },
      { type: 'products', enabled: true, title: 'Fresh Northern Harvest', layout: 'grid' },
      { type: 'highlights', enabled: true, title: 'Sourcing Values', items: ['Direct-from-Farm Trade supporting Gulu women cooperatives', '100% Organic, Zero Chemical Additives', 'Hygienic, Eco-conscious packaging'] },
      { type: 'testimonials', enabled: true, title: 'Happy Families', list: [
        { name: 'Angom Christine (Gulu)', text: 'The Shea butter has cleared my childs eczema completely in 2 weeks. Pure, raw, clean quality!' },
        { name: 'Mukasa Ronald (Entebbe)', text: 'The wild honey is incredible. Thick, aromatic, and totally unadulterated. Highly recommend.' }
      ]},
      { type: 'faq', enabled: true, title: 'Farm Harvest FAQ' },
      { type: 'newsletter', enabled: true, title: 'Receive Harvest Alerts', text: 'Be the first to order seasonal wild honey batches before they sell out.' },
      { type: 'contact', enabled: true, title: 'Gulu Coop Coordinates' },
      { type: 'footer', enabled: true, text: 'All rights reserved © Gulu Organic Harvest.' }
    ],
    faqs: [
      { q: 'Is the shea butter filtered?', a: 'Yes! We melt and filter our shea butter through medical-grade cotton filters to ensure 100% purity with zero sand or debris, keeping its raw nutrient profile intact.' },
      { q: 'Do you deliver to Kampala?', a: 'Yes, we send daily shipments to Kampala via Link Bus and Boda courier to your door.' }
    ],
    policies: {
      privacy: 'Your health and address records are completely confidential.',
      terms: 'Organic products can be exchanged if seal is completely unbroken.',
      delivery: 'Kampala delivery within 24 hours of bus transit arrival. Gulu orders instant delivery.',
      returns: '100% money-back if honey is proven to contain sugar syrup.'
    },
    sampleProducts: [
      {
        title: 'Pure Unrefined Nile Shea Butter',
        description: '100% natural, unrefined, cold-pressed shea butter sourced from wild Nilotica shea trees. Rich in vitamins A and E, excellent for skin cell regeneration, treating stretch marks, baby care, and deep hair hydration.',
        price: 35000,
        imageUrl: 'https://images.unsplash.com/photo-1590156546746-c2240999f261?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1590156546746-c2240999f261?w=600&auto=format&fit=crop'
        ],
        stock: 120,
        category: 'Oils & Cosmetics',
        brand: 'Nile Shea',
        variants: [
          { id: 'v20', type: 'weight', name: '250g Jar', value: '250g', priceModifier: 0, stock: 50, sku: 'SHEA-NIL-250' },
          { id: 'v21', type: 'weight', name: '500g Eco-Bucket', value: '500g', priceModifier: 20000, stock: 40, sku: 'SHEA-NIL-500' },
          { id: 'v22', type: 'weight', name: '1kg Mega-Pack', value: '1kg', priceModifier: 50000, stock: 30, sku: 'SHEA-NIL-1KG' }
        ],
        specifications: [
          { label: 'Origin', value: 'Wild Nilotica Shea, Gulu' },
          { label: 'Extraction', value: 'Traditional Cold Pressed' },
          { label: 'Grade', value: 'A (Cosmetic & Dietary)' }
        ],
        warranty: '24 Months Shelf Life Assured',
        returnPolicy: 'Refund if color is abnormal.',
        shippingInfo: 'Packed in airtight jars.'
      },
      {
        title: 'Wildwood Amber Honey (Raw)',
        description: 'Completely raw, unpasteurized honey harvested from traditional log hives placed deep in Acholi woodlands. Scented with indigenous wild flowers, thick consistency, and high pollen levels.',
        price: 25000,
        imageUrl: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=600&auto=format&fit=crop'
        ],
        stock: 80,
        category: 'Forest Honey',
        brand: 'Acholiland Honey',
        variants: [
          { id: 'v23', type: 'weight', name: '500ml Bottle', value: '500ml', priceModifier: 0, stock: 50, sku: 'HON-WLD-500' },
          { id: 'v24', type: 'weight', name: '1 Liter Jar', value: '1 Liter', priceModifier: 20000, stock: 30, sku: 'HON-WLD-1L' }
        ],
        specifications: [
          { label: 'Purity', value: '100% Raw Wild Honey' },
          { label: 'Moisture content', value: 'Less than 17.5%' },
          { label: 'Color Scale', value: 'Extra Light Amber' }
        ],
        warranty: 'Indefinite lifespan (Never expires)',
        returnPolicy: 'Zero hassle replacement if crystallized early.',
        shippingInfo: 'Leak-proof double sealed caps.'
      }
    ],
    sampleReviews: [
      {
        userName: 'Brenda Awor',
        rating: 5,
        text: 'The best honey in Uganda. Scent is so rich, tastes like real wilderness flowers. Fast bus transit to Kampala.',
        verifiedPurchase: true,
        helpfulVotes: 14,
        replies: [{ userId: 'merchant', userName: 'Gulu Farms', text: 'Apwoyo mate Brenda! We appreciate the warm support!', createdAt: new Date().toISOString() }]
      }
    ]
  },
  {
    key: 'crafts',
    name: 'Mbarara Leather Artisans',
    slogan: '100% Genuine Cattle Leather & Heritage Ankole Crafts',
    description: 'Bespoke hand-stitched leather sandals, luxury travel duffles, and executive bifold wallets crafted from genuine thick Ankole hides.',
    category: 'Crafts',
    industry: 'Handmade Leather Accessories & Heritage Art',
    tags: ['leather', 'sandals', 'duffle', 'crafts', 'mbarara'],
    price: 200000,
    monthlySubscription: 50000,
    oneTimePurchase: true,
    premiumOrFree: 'Premium',
    recommendedTypes: ['Artisan guild', 'Leather designer', 'Traditional craft outlet'],
    themeColor: '#f97316',
    typography: 'Inter',
    layoutStyle: 'Warm Vintage Gallery',
    bannerUrl: 'https://images.unsplash.com/photo-1524295981997-ec47099113ee?w=1200&auto=format&fit=crop',
    logoUrl: 'https://images.unsplash.com/photo-1590156546746-c2240999f261?w=200&auto=format&fit=crop',
    businessHours: '08:30 AM - 07:30 PM',
    location: 'Ankole Arcade, High Street Mbarara',
    homepageBlocks: [
      { type: 'hero', enabled: true, title: 'Ankole Craft Mastery', subtitle: 'Hides selected from cattle country, engineered to last generations.', actionText: 'Scan Leather Goods' },
      { type: 'categories', enabled: true, title: 'Artisan Departments', list: ['Footwear', 'Travel Bags', 'Bifolds'] },
      { type: 'products', enabled: true, title: 'Artisanal Genuine Shelves', layout: 'grid' },
      { type: 'highlights', enabled: true, title: 'Artisan Virtues', items: ['100% Genuine Full-grain Cattle Leather', 'Saddle-Stitched by Hand with heavy-duty thread', 'Lifetime wear guarantee'] },
      { type: 'testimonials', enabled: true, title: 'Patron Consensus', list: [
        { name: 'Kasingye John (Mbarara)', text: 'The Highlands duffle bag is stunning. Thick leather, great brass zippers. It smells beautiful and handles rough travel easily.' },
        { name: 'Nshemereirwe Emily (Ntinda)', text: 'Best leather sandals. Sturdy soles and comfortable leather straps that do not bite the skin.' }
      ]},
      { type: 'faq', enabled: true, title: 'Artisan Craft FAQ' },
      { type: 'newsletter', enabled: true, title: 'Patron Dispatch', text: 'Receive VIP invites to craft exhibitions and new raw hide lots.' },
      { type: 'contact', enabled: true, title: 'Mbarara Workshop Map' },
      { type: 'footer', enabled: true, text: 'All rights reserved © Mbarara Leather Artisans.' }
    ],
    faqs: [
      { q: 'Is it real cattle leather?', a: 'Yes! We only use premium, vegetable-tanned full-grain cattle hides sourced directly from registered ranches in Mbarara. We never use synthetic or PU leather.' },
      { q: 'Can I request custom engraving?', a: 'Yes! After placing an order, contact our WhatsApp and we can burn your initials into the leather for free.' }
    ],
    policies: {
      privacy: 'Customer detail privacy is treated with ultimate respect.',
      terms: 'Lifetime warranty covers broken stitching or hardware. Accidental leather cuts can be repaired at cost.',
      delivery: 'Bus transport shipping to Kampala within 12 hours of payment. Local delivery in Western Uganda via courier.',
      returns: 'Exchange within 14 days if fitting does not match.'
    },
    sampleProducts: [
      {
        title: 'Ankole Classic Leather Sandals',
        description: 'Ultra-durable leather sandals designed for everyday Kampala gravel walk. Built with thick full-grain cattle leather and industrial rubber soles. Straps soften and form custom fit to your feet with wear.',
        price: 110000,
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop'
        ],
        stock: 18,
        category: 'Footwear',
        brand: 'Ankole Leather',
        variants: [
          { id: 'v30', type: 'size', name: 'Size 42', value: '42', priceModifier: 0, stock: 5, sku: 'LTHR-SND-42' },
          { id: 'v31', type: 'size', name: 'Size 43', value: '43', priceModifier: 0, stock: 5, sku: 'LTHR-SND-43' },
          { id: 'v32', type: 'size', name: 'Size 44', value: '44', priceModifier: 0, stock: 5, sku: 'LTHR-SND-44' },
          { id: 'v33', type: 'color', name: 'Sienna Brown', value: '#7c2d12', priceModifier: 0, stock: 9, sku: 'LTHR-SND-BRN' },
          { id: 'v34', type: 'color', name: 'Coal Black', value: '#0f172a', priceModifier: 0, stock: 9, sku: 'LTHR-SND-BLK' }
        ],
        specifications: [
          { label: 'Leather Type', value: 'Veg-Tanned Full Grain' },
          { label: 'Stitch Style', value: 'Heavy Duty Waxed Thread Hand Stitch' },
          { label: 'Soles', value: 'Anti-slip recycled tire rubber' }
        ],
        warranty: 'Lifetime stitching assurance',
        returnPolicy: 'Free size swaps within 14 days.',
        shippingInfo: 'Eco friendly canvas storage pouch included.'
      },
      {
        title: 'Highlands Premium Leather Duffle Bag',
        description: 'The ultimate weekend travel duffle. Heavyweight, luxurious full-grain leather that develops a magnificent vintage patina over time. Solid brass hardware, reinforced straps, and laptop pocket.',
        price: 360000,
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop',
        images: [
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop'
        ],
        stock: 5,
        category: 'Travel Bags',
        brand: 'Ankole Leather',
        variants: [
          { id: 'v35', type: 'color', name: 'Antique Chestnut', value: '#451a03', priceModifier: 0, stock: 3, sku: 'LTHR-DUF-ANT' },
          { id: 'v36', type: 'color', name: 'Ebony Blackout', value: '#09090b', priceModifier: 0, stock: 2, sku: 'LTHR-DUF-EBO' }
        ],
        specifications: [
          { label: 'Dimensions', value: '22 x 11 x 10 inches (Cabin Size)' },
          { label: 'Hardware', value: 'YKK Brass Zippers & Solid Buckles' },
          { label: 'Internal lining', value: 'Water-resistant military canvas' }
        ],
        warranty: '25 Year Guarantee',
        returnPolicy: 'Prise condition returns only.',
        shippingInfo: 'Insured transit in carton cargo boxes.'
      }
    ],
    sampleReviews: [
      {
        userName: 'Mugisha Albert',
        rating: 5,
        text: 'This duffle is phenomenal. Hides are very thick and stitching is immaculate. Best leather workshop in Western Uganda.',
        verifiedPurchase: true,
        helpfulVotes: 21,
        replies: [{ userId: 'merchant', userName: 'Ankole Crafts', text: 'Thank you Albert! Safe travels across the highlands!', createdAt: new Date().toISOString() }]
      }
    ]
  }
];
