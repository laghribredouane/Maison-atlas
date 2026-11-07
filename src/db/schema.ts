import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

// 1. profiles (linked to Firebase Auth uid)
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull().default(''),
  phone: text('phone').default(''),
  avatarUrl: text('avatar_url').default(''),
  preferredLanguage: text('preferred_language').notNull().default('fr'),
  preferredCurrency: text('preferred_currency').notNull().default('MAD'),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  status: text('status').notNull().default('active'), // active, suspended
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. user_roles (customer, vendor, manager, admin)
export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => profiles.uid, { onDelete: 'cascade' }),
  role: text('role').notNull().default('customer'), // customer, vendor, manager, admin
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. stores
export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => profiles.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  logoUrl: text('logo_url').default(''),
  bannerUrl: text('banner_url').default(''),
  city: text('city').notNull().default('Casablanca'),
  country: text('country').notNull().default('Maroc'),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('4.90'),
  reviewCount: integer('review_count').notNull().default(0),
  commissionRate: numeric('commission_rate', { precision: 5, scale: 2 }).notNull().default('12.00'),
  status: text('status').notNull().default('active'), // pending, active, suspended
  verified: boolean('verified').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. store_members
export const storeMembers = pgTable('store_members', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  userUid: text('user_uid')
    .notNull()
    .references(() => profiles.uid, { onDelete: 'cascade' }),
  memberRole: text('member_role').notNull().default('owner'), // owner, manager, staff
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. vendor_applications
export const vendorApplications = pgTable('vendor_applications', {
  id: serial('id').primaryKey(),
  applicantUid: text('applicant_uid').notNull(),
  applicantName: text('applicant_name').notNull(),
  applicantEmail: text('applicant_email').notNull(),
  storeName: text('store_name').notNull(),
  storeSlug: text('store_slug').notNull(),
  categoryFocus: text('category_focus').notNull(),
  city: text('city').notNull(),
  taxId: text('tax_id').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'), // pending, approved, rejected
  reviewedByUid: text('reviewed_by_uid'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  nameFr: text('name_fr').notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  featured: boolean('featured').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. brands
export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  originCountry: text('origin_country').notNull().default('Maroc'),
  verified: boolean('verified').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  titleFr: text('title_fr').notNull(),
  titleEn: text('title_en').notNull(),
  titleAr: text('title_ar').notNull(),
  slug: text('slug').notNull().unique(),
  descriptionFr: text('description_fr').notNull(),
  descriptionEn: text('description_en').notNull(),
  descriptionAr: text('description_ar').notNull(),
  sku: text('sku').notNull(),
  barcode: text('barcode').default(''),
  priceMad: numeric('price_mad', { precision: 12, scale: 2 }).notNull(),
  compareAtPriceMad: numeric('compare_at_price_mad', { precision: 12, scale: 2 }),
  currency: text('currency').notNull().default('MAD'),
  imageUrl: text('image_url').notNull(),
  videoUrl: text('video_url').default(''),
  status: text('status').notNull().default('published'), // draft, published, archived
  featured: boolean('featured').notNull().default(false),
  isNew: boolean('is_new').notNull().default(false),
  isBestseller: boolean('is_bestseller').notNull().default(false),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('4.85'),
  reviewCount: integer('review_count').notNull().default(0),
  deliveryEstimateDays: text('delivery_estimate_days').notNull().default('2-4 jours'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. product_images
export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  altText: text('alt_text').notNull().default(''),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. product_variants
export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Sable / Moyen"
  color: text('color').notNull().default('Naturel'),
  size: text('size').notNull().default('Standard'),
  sku: text('sku').notNull(),
  priceMad: numeric('price_mad', { precision: 12, scale: 2 }).notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(15),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. inventory
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  quantityAvailable: integer('quantity_available').notNull().default(20),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  warehouseLocation: text('warehouse_location').notNull().default('Casablanca Hub'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. customers
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull().default(''),
  totalOrders: integer('total_orders').notNull().default(0),
  totalSpentMad: numeric('total_spent_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. customer_addresses
export const customerAddresses = pgTable('customer_addresses', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  userUid: text('user_uid'),
  label: text('label').notNull().default('Domicile'),
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  streetAddress: text('street_address').notNull(),
  city: text('city').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull().default('Maroc'),
  isDefault: boolean('is_default').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. carts
export const carts = pgTable('carts', {
  id: serial('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userUid: text('user_uid'),
  currency: text('currency').notNull().default('MAD'),
  couponCode: text('coupon_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 15. cart_items
export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cartId: integer('cart_id')
    .notNull()
    .references(() => carts.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull().default(1),
  unitPriceMad: numeric('unit_price_mad', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userUid: text('user_uid'),
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  shippingCity: text('shipping_city').notNull(),
  shippingPostalCode: text('shipping_postal_code').notNull(),
  shippingCountry: text('shipping_country').notNull().default('Maroc'),
  shippingMethodName: text('shipping_method_name').notNull().default('Amana Express'),
  paymentGateway: text('payment_gateway').notNull().default('COD'), // Exclusivement COD (Cash on Delivery)
  paymentStatus: text('payment_status').notNull().default('PENDING'), // PENDING, PAID, FAILED
  orderStatus: text('order_status').notNull().default('confirmed'), // confirmed, preparing, shipped, delivered, cancelled, return_requested
  currency: text('currency').notNull().default('MAD'),
  subtotalMad: numeric('subtotal_mad', { precision: 12, scale: 2 }).notNull(),
  discountMad: numeric('discount_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  shippingMad: numeric('shipping_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  taxMad: numeric('tax_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalMad: numeric('total_mad', { precision: 12, scale: 2 }).notNull(),
  couponCode: text('coupon_code'),
  trackingNumber: text('tracking_number').default(''),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. order_items
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'restrict' }),
  productTitle: text('product_title').notNull(),
  variantTitle: text('variant_title').default('Standard'),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceMad: numeric('unit_price_mad', { precision: 12, scale: 2 }).notNull(),
  subtotalMad: numeric('subtotal_mad', { precision: 12, scale: 2 }).notNull(),
  commissionMad: numeric('commission_mad', { precision: 12, scale: 2 }).notNull(),
  vendorNetMad: numeric('vendor_net_mad', { precision: 12, scale: 2 }).notNull(),
  fulfillmentStatus: text('fulfillment_status').notNull().default('pending'), // pending, accepted, preparing, shipped, delivered, rejected
  trackingNumber: text('tracking_number').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 18. payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  gateway: text('gateway').notNull().default('COD'), // Exclusivement COD
  idempotencyKey: text('idempotency_key').notNull().unique(),
  transactionReference: text('transaction_reference').notNull(),
  amountMad: numeric('amount_mad', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('MAD'),
  status: text('status').notNull().default('PENDING'), // PENDING, PAID, FAILED
  sandboxMode: boolean('sandbox_mode').notNull().default(false),
  signatureVerified: boolean('signature_verified').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 19. payment_events
export const paymentEvents = pgTable('payment_events', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // webhook.received, payment.verified, payment.captured, payment.failed
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 20. refunds
export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  requestedByUid: text('requested_by_uid'),
  reason: text('reason').notNull(),
  amountMad: numeric('amount_mad', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'), // pending, approved, processed, rejected
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 21. shipping_methods
export const shippingMethods = pgTable('shipping_methods', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  carrier: text('carrier').notNull(),
  zone: text('zone').notNull().default('National (Maroc) & International'),
  estimatedDays: text('estimated_days').notNull(),
  baseFeeMad: numeric('base_fee_mad', { precision: 10, scale: 2 }).notNull(),
  freeShippingThresholdMad: numeric('free_shipping_threshold_mad', { precision: 10, scale: 2 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 22. shipments
export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'set null' }),
  carrier: text('carrier').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  status: text('status').notNull().default('preparing'), // preparing, in_transit, out_for_delivery, delivered, returned
  estimatedDelivery: text('estimated_delivery').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 23. coupons
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  discountType: text('discount_type').notNull().default('percentage'), // percentage, fixed
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  minOrderMad: numeric('min_order_mad', { precision: 10, scale: 2 }).notNull().default('0.00'),
  usageLimit: integer('usage_limit').notNull().default(500),
  usedCount: integer('used_count').notNull().default(0),
  active: boolean('active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 24. coupon_redemptions
export const couponRedemptions = pgTable('coupon_redemptions', {
  id: serial('id').primaryKey(),
  couponId: integer('coupon_id')
    .notNull()
    .references(() => coupons.id, { onDelete: 'cascade' }),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  userUid: text('user_uid'),
  discountAppliedMad: numeric('discount_applied_mad', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 25. reviews
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  userUid: text('user_uid'),
  authorName: text('author_name').notNull(),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  comment: text('comment').notNull(),
  verifiedPurchase: boolean('verified_purchase').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 26. wishlists
export const wishlists = pgTable('wishlists', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 27. wishlist_items
export const wishlistItems = pgTable('wishlist_items', {
  id: serial('id').primaryKey(),
  wishlistId: integer('wishlist_id')
    .notNull()
    .references(() => wishlists.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 28. commissions
export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  orderItemId: integer('order_item_id')
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  ratePercentage: numeric('rate_percentage', { precision: 5, scale: 2 }).notNull(),
  platformFeeMad: numeric('platform_fee_mad', { precision: 12, scale: 2 }).notNull(),
  vendorNetMad: numeric('vendor_net_mad', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('settled'), // pending, settled, refunded
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 29. vendor_wallets
export const vendorWallets = pgTable('vendor_wallets', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id')
    .notNull()
    .unique()
    .references(() => stores.id, { onDelete: 'cascade' }),
  availableBalanceMad: numeric('available_balance_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  pendingBalanceMad: numeric('pending_balance_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalEarnedMad: numeric('total_earned_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalWithdrawnMad: numeric('total_withdrawn_mad', { precision: 12, scale: 2 }).notNull().default('0.00'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 30. payout_requests
export const payoutRequests = pgTable('payout_requests', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  amountMad: numeric('amount_mad', { precision: 12, scale: 2 }).notNull(),
  bankName: text('bank_name').notNull(),
  ibanMasked: text('iban_masked').notNull(),
  status: text('status').notNull().default('pending'), // pending, approved, paid, rejected
  adminNotes: text('admin_notes').default(''),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

// 31. notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('order'), // order, system, payout, promo
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 32. banners
export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  titleFr: text('title_fr').notNull(),
  titleEn: text('title_en').notNull(),
  titleAr: text('title_ar').notNull(),
  subtitleFr: text('subtitle_fr').notNull(),
  ctaTextFr: text('cta_text_fr').notNull(),
  linkUrl: text('link_url').notNull().default('/catalog'),
  active: boolean('active').notNull().default(true),
  position: text('position').notNull().default('top_bar'), // top_bar, hero
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 33. pages
export const pages = pgTable('pages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titleFr: text('title_fr').notNull(),
  contentFr: text('content_fr').notNull(),
  seoTitle: text('seo_title').notNull(),
  seoDescription: text('seo_description').notNull(),
  published: boolean('published').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 34. settings
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 35. exchange_rates
export const exchangeRates = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  baseCurrency: text('base_currency').notNull().default('MAD'),
  targetCurrency: text('target_currency').notNull().unique(), // MAD, EUR, USD
  rate: numeric('rate', { precision: 10, scale: 6 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 36. audit_logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
