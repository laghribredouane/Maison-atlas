import { SupportedCurrency, SupportedLanguage, PaymentGatewayCode } from '../utils/marketplace-rules';

export interface Category {
  id: number;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  description: string;
  featured: boolean;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  originCountry: string;
  verified: boolean;
}

export interface Store {
  id: number;
  ownerUid: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  country: string;
  rating: string;
  reviewCount: number;
  commissionRate: string;
  status: string;
  verified: boolean;
}

export interface Product {
  id: number;
  storeId: number;
  categoryId: number;
  brandId: number | null;
  titleFr: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionAr: string;
  sku: string;
  barcode: string;
  priceMad: string;
  compareAtPriceMad: string | null;
  currency: string;
  imageUrl: string;
  videoUrl: string;
  status: string;
  featured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  rating: string;
  reviewCount: number;
  deliveryEstimateDays: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  title: string;
  color: string;
  size: string;
  sku: string;
  priceMad: string;
  stockQuantity: number;
}

export interface Review {
  id: number;
  productId: number;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface VendorReview {
  id: number;
  storeId: number;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface VendorFaqItem {
  id: number;
  storeId: number | null;
  category: string;
  questionFr: string;
  answerFr: string;
  createdAt: string;
}

export interface ShippingMethod {
  id: number;
  name: string;
  carrier: string;
  zone: string;
  estimatedDays: string;
  baseFeeMad: string;
  freeShippingThresholdMad: string;
  active: boolean;
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minOrderMad: string;
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

export interface CartItemState {
  product: Product;
  variantTitle: string;
  quantity: number;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  userUid: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingMethodName: string;
  paymentGateway: PaymentGatewayCode;
  paymentStatus: string;
  orderStatus: string;
  currency: SupportedCurrency;
  subtotalMad: string;
  discountMad: string;
  shippingMad: string;
  taxMad: string;
  totalMad: string;
  couponCode: string | null;
  trackingNumber: string;
  createdAt: string;
}

export interface OrderItemRecord {
  id: number;
  orderId: number;
  productId: number;
  storeId: number;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  unitPriceMad: string;
  subtotalMad: string;
  commissionMad: string;
  vendorNetMad: string;
  fulfillmentStatus: string;
  trackingNumber: string;
}

export interface VendorWalletRecord {
  id: number;
  storeId: number;
  availableBalanceMad: string;
  pendingBalanceMad: string;
  totalEarnedMad: string;
  totalWithdrawnMad: string;
}

export interface PayoutRequestRecord {
  id: number;
  storeId: number;
  amountMad: string;
  bankName: string;
  ibanMasked: string;
  status: string;
  adminNotes: string;
  requestedAt: string;
}

export interface VendorApplicationRecord {
  id: number;
  applicantUid: string;
  applicantName: string;
  applicantEmail: string;
  storeName: string;
  storeSlug: string;
  categoryFocus: string;
  city: string;
  taxId: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface BootstrapResponse {
  categories: Category[];
  brands: Brand[];
  stores: Store[];
  products: Product[];
  variants: ProductVariant[];
  reviews: Review[];
  vendorReviews?: VendorReview[];
  vendorFaqs?: VendorFaqItem[];
  shippingMethods: ShippingMethod[];
  coupons: Coupon[];
  exchangeRates: Array<{ targetCurrency: SupportedCurrency; rate: string }>;
  banners: Array<{
    id: number;
    titleFr: string;
    titleEn: string;
    titleAr: string;
    subtitleFr: string;
  }>;
  settings: Record<string, any>;
}

export interface DashboardResponse {
  orders: OrderRecord[];
  orderItems: OrderItemRecord[];
  payments: Array<{
    id: number;
    orderId: number;
    gateway: string;
    idempotencyKey: string;
    transactionReference: string;
    amountMad: string;
    currency: string;
    status: string;
    signatureVerified: boolean;
    createdAt: string;
  }>;
  paymentEvents?: Array<{
    id: number;
    paymentId: number;
    eventType: string;
    payload: Record<string, any>;
    createdAt: string;
  }>;
  refunds: Array<{
    id: number;
    orderId: number;
    reason: string;
    amountMad: string;
    status: string;
    createdAt: string;
  }>;
  commissions: Array<{
    id: number;
    orderItemId: number;
    storeId: number;
    ratePercentage: string;
    platformFeeMad: string;
    vendorNetMad: string;
    status: string;
  }>;
  wallets: VendorWalletRecord[];
  payoutRequests: PayoutRequestRecord[];
  vendorApplications: VendorApplicationRecord[];
  customers: Array<{
    id: number;
    email: string;
    fullName: string;
    phone: string;
    totalOrders: number;
    totalSpentMad: string;
  }>;
  addresses: Array<{
    id: number;
    label: string;
    recipientName: string;
    phone: string;
    streetAddress: string;
    city: string;
    postalCode: string;
    country: string;
  }>;
  auditLogs: Array<{
    id: number;
    actorUid: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
}

export const I18N = {
  fr: {
    navStorefront: 'Boutique',
    navCatalog: 'Catalogue',
    navCustomer: 'Espace Client',
    navVendor: 'Espace Vendeur',
    navAdmin: 'Console Admin',
    cartButton: 'Panier',
    heroKicker: 'Marketplace Multi-Vendeurs Certifiée · Maroc & International',
    heroTitle: 'L’excellence des manufactures et maisons de création réunies.',
    heroSubtitle:
      'Commandez directement auprès d’ateliers vérifiés à Marrakech, Casablanca et Essaouira. Paiement exclusivement à la livraison (COD — Cash on Delivery).',
    exploreCatalog: 'Explorer le Catalogue',
    becomeVendor: 'Ouvrir une Boutique Vendeur',
    featuredCollection: 'Pièces Maîtresses & Nouveautés',
    verifiedStores: 'Maisons & Boutiques Vérifiées',
    searchPlaceholder: 'Rechercher un produit, une manufacture, un SKU...',
    allCategories: 'Toutes les catégories',
    allStores: 'Toutes les boutiques',
    addToCart: 'Ajouter au panier',
    viewDetails: 'Voir la pièce',
  },
  en: {
    navStorefront: 'Storefront',
    navCatalog: 'Catalog',
    navCustomer: 'My Account',
    navVendor: 'Vendor Hub',
    navAdmin: 'Admin Console',
    cartButton: 'Bag',
    heroKicker: 'Verified Multi-Vendor Marketplace · Morocco & Worldwide',
    heroTitle: 'Curated architectural craft and independent maisons in one place.',
    heroSubtitle:
      'Acquire directly from verified studios across Marrakech, Casablanca, and Essaouira. Exclusive Cash on Delivery (COD) checkout upon inspection.',
    exploreCatalog: 'Explore Catalog',
    becomeVendor: 'Apply as a Vendor',
    featuredCollection: 'Signature Objects & New Arrivals',
    verifiedStores: 'Verified Partner Boutiques',
    searchPlaceholder: 'Search products, studios, SKU...',
    allCategories: 'All categories',
    allStores: 'All boutiques',
    addToCart: 'Add to bag',
    viewDetails: 'Inspect item',
  },
  ar: {
    navStorefront: 'المتجر',
    navCatalog: 'الكتالوج',
    navCustomer: 'حسابي',
    navVendor: 'فضاء البائع',
    navAdmin: 'لوحة الإدارة',
    cartButton: 'السلة',
    heroKicker: 'سوق إلكتروني متعدد البائعين معتمد · المغرب والعالم',
    heroTitle: 'أرقى دور التصميم والحرف المعمارية الأصيلة في منصة واحدة.',
    heroSubtitle:
      'اطلب مباشرة من ورش معتمدة في مراكش والدار البيضاء والصويرة مع الدفع حصرياً عند الاستلام (COD).',
    exploreCatalog: 'تصفح الكتالوج',
    becomeVendor: 'افتح متجرك كبائع',
    featuredCollection: 'القطع المميزة والإصدارات الجديدة',
    verifiedStores: 'المتاجر والدور المعتمدة',
    searchPlaceholder: 'ابحث عن منتج، متجر، أو رمز SKU...',
    allCategories: 'جميع الفئات',
    allStores: 'جميع المتاجر',
    addToCart: 'أضف إلى السلة',
    viewDetails: 'عرض التفاصيل',
  },
} as const;

export function getLocalizedTitle(product: Product, lang: SupportedLanguage): string {
  if (lang === 'ar') return product.titleAr || product.titleFr;
  if (lang === 'en') return product.titleEn || product.titleFr;
  return product.titleFr;
}

export function getLocalizedDescription(product: Product, lang: SupportedLanguage): string {
  if (lang === 'ar') return product.descriptionAr || product.descriptionFr;
  if (lang === 'en') return product.descriptionEn || product.descriptionFr;
  return product.descriptionFr;
}

export function getLocalizedCategoryName(category: Category, lang: SupportedLanguage): string {
  if (lang === 'ar') return category.nameAr || category.nameFr;
  if (lang === 'en') return category.nameEn || category.nameFr;
  return category.nameFr;
}
