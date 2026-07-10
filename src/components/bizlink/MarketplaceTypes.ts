/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShopTemplate {
  id: string;
  name: string;
  description: string;
  bannerUrl: string;
  logoUrl: string;
  themeColor: string;
  businessHours: string;
  location: string;
  category?: string;
}

export interface Shop {
  id: string;
  templateId: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'SUSPENDED';
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  name: string;
  description: string;
  bannerUrl: string;
  logoUrl: string;
  category?: string;
  verified: boolean;
  rating: number;
  followerCount: number;
  followers: string[]; // List of user UIDs
  businessHours: string;
  location: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    whatsapp?: string;
  };
  yearsOnPlatform: number;
  responseRate: number; // Percentage e.g. 98
  responseTime: string; // e.g., "within 10 minutes"
  totalSales: number;
  satisfactionRate: number; // e.g. 95
  mtnNumber?: string;
  airtelNumber?: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  type: 'color' | 'size' | 'weight' | 'material';
  name: string;
  value: string; // e.g., '#FF0000' for color, 'XL' for size, '1kg' for weight, 'Leather' for material
  priceModifier: number; // Added to base product price
  stock: number;
  sku: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  shopId: string;
  shopName?: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  images: string[];
  videoUrl?: string;
  stock: number;
  category: string;
  brand?: string;
  variants?: ProductVariant[];
  specifications?: { label: string; value: string }[];
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  careInstructions?: string;
  rating: number;
  reviewsCount: number;
  createdAt: string;
}

export interface MerchantApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessName: string;
  businessDescription: string;
  businessType: string;
  whatsappNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  assignedShopId?: string;
}

export interface OrderItem {
  productId: string;
  productTitle: string;
  productImage: string;
  quantity: number;
  price: number;
  selectedVariants?: { [key: string]: string }; // e.g. { color: 'Blue', size: 'L' }
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerPhone: string;
  shopId: string;
  shopName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'mtn' | 'airtel' | 'card';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  deliveryTimeEstimated?: string;
}

export interface Review {
  id: string;
  productId: string;
  shopId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  verifiedPurchase: boolean;
  helpfulVotes: number;
  replies?: {
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface ChatThread {
  id: string; // e.g. customerId_merchantId
  customerId: string;
  customerName: string;
  customerPhoto?: string;
  merchantId: string;
  merchantName: string;
  shopId: string;
  shopName: string;
  lastMessageText: string;
  lastMessageAt: string;
  unreadCountCustomer: number;
  unreadCountMerchant: number;
}
