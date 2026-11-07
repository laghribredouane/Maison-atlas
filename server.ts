import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { requireAuth, optionalAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getBootstrapData,
  getDashboardData,
  getOrCreateProfile,
  createMarketplaceOrder,
  createVendorProduct,
  deleteVendorProduct,
  updateOrderStatusAndTracking,
  updateOrderPaymentStatus,
  createVendorPayoutRequest,
  updatePayoutStatus,
  submitVendorApplication,
  reviewVendorApplication,
  createProductReview,
  createCouponCode,
  createReturnRefundRequest,
  updateStoreCommissionAndStatus,
  authenticateWithEmailPassword,
  registerWithEmailPassword,
  updateVendorProduct,
  createCustomerAddress,
  deleteProductReview,
  createCategory,
  createVendorStoreReview,
  createVendorFaqItem,
  replenishProductStock,
} from './src/db/repository.ts';
import { validateCodPaymentMethod } from './src/utils/marketplace-rules.ts';

const CheckoutSchema = z.object({
  customerEmail: z.string().email('Adresse email invalide'),
  customerName: z.string().min(2, 'Nom complet requis'),
  customerPhone: z.string().min(6, 'Numéro de téléphone requis'),
  shippingAddress: z.string().min(5, 'Adresse de livraison requise'),
  shippingCity: z.string().min(2, 'Ville requise'),
  shippingPostalCode: z.string().min(2, 'Code postal requis'),
  shippingCountry: z.string().default('Maroc'),
  shippingMethodId: z.number().int().positive(),
  paymentGateway: z.literal('COD').default('COD'),
  currency: z.enum(['MAD', 'EUR', 'USD']).default('MAD'),
  couponCode: z.string().optional().nullable(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variantTitle: z.string().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'Votre panier est vide'),
});

const CreateProductSchema = z.object({
  storeId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  titleFr: z.string().min(3, 'Le titre du produit est requis'),
  titleEn: z.string().optional(),
  titleAr: z.string().optional(),
  descriptionFr: z.string().min(10, 'Une description détaillée est requise'),
  sku: z.string().min(2, 'Le code SKU est requis'),
  priceMad: z.number().positive('Le prix doit être supérieur à 0'),
  compareAtPriceMad: z.number().positive().optional().nullable(),
  imageUrl: z.string().optional(),
  stockQuantity: z.number().int().nonnegative().default(15),
  status: z.enum(['published', 'draft', 'archived']).default('published'),
});

const VendorApplicationSchema = z.object({
  applicantName: z.string().min(2),
  applicantEmail: z.string().email(),
  storeName: z.string().min(2),
  categoryFocus: z.string().min(2),
  city: z.string().min(2),
  taxId: z.string().min(4),
  description: z.string().min(10),
});

const ReviewSchema = z.object({
  productId: z.number().int().positive(),
  authorName: z.string().min(2),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2),
  comment: z.string().min(5),
});

const VendorReviewSchema = z.object({
  storeId: z.number().int().positive(),
  authorName: z.string().min(2, 'Votre nom est requis'),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2, 'Un titre est requis'),
  comment: z.string().min(5, 'Votre commentaire est requis'),
});

const VendorFaqSchema = z.object({
  storeId: z.number().int().positive().optional().nullable(),
  category: z.string().min(2),
  questionFr: z.string().min(5, 'La question est requise'),
  answerFr: z.string().min(10, 'La réponse détaillée est requise'),
});

const CouponSchema = z.object({
  code: z.string().min(3),
  description: z.string().min(4),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  minOrderMad: z.number().nonnegative(),
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json({ limit: '2mb' }));

  // 1. Public Storefront & Catalog Bootstrap
  app.get('/api/bootstrap', async (_req, res) => {
    try {
      const data = await getBootstrapData();
      res.json(data);
    } catch (error: any) {
      console.error('Failed to fetch bootstrap data:', error);
      res.status(500).json({ error: error.message || 'Failed to load catalog' });
    }
  });

  // 1b. Create New Category (Admin / Vendor)
  app.post('/api/categories', optionalAuth, async (req, res) => {
    try {
      const { nameFr, nameEn, nameAr, description } = req.body;
      if (!nameFr || String(nameFr).trim().length < 2) {
        return res.status(400).json({ error: 'Le nom de la catégorie est requis.' });
      }
      const created = await createCategory({
        nameFr: String(nameFr),
        nameEn: nameEn ? String(nameEn) : undefined,
        nameAr: nameAr ? String(nameAr) : undefined,
        description: description ? String(description) : undefined,
      });
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create category' });
    }
  });

  // 2. Dashboard Data (Vendor, Manager, Admin, Customer Orders)
  app.get('/api/dashboard', optionalAuth, async (_req: AuthRequest, res) => {
    try {
      const data = await getDashboardData();
      res.json(data);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      res.status(500).json({ error: error.message || 'Failed to load dashboard' });
    }
  });

  // 3. Synchronize Firebase User Profile to PostgreSQL
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const synced = await getOrCreateProfile(
        req.user.uid,
        req.user.email || 'client@maison-atlas.ma',
        req.user.name
      );
      res.json(synced);
    } catch (error: any) {
      console.error('Failed to sync profile:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user profile' });
    }
  });

  // 3b. Email & Password Authentication (Client / Vendeur / Admin)
  app.post('/api/auth/email-login', async (req, res) => {
    try {
      const { email, password, workspace } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis.' });
      }
      const userSession = await authenticateWithEmailPassword({
        email: String(email),
        password: String(password),
        workspace,
      });
      res.json(userSession);
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Identifiants invalides.' });
    }
  });

  // 3c. Email & Password Registration (Client / Vendeur)
  app.post('/api/auth/email-register', async (req, res) => {
    try {
      const { email, password, fullName, accountType, storeName, city } = req.body;
      if (!email || !password || String(password).length < 6 || !fullName) {
        return res.status(400).json({
          error: 'Veuillez renseigner votre nom complet, un email valide et un mot de passe (min. 6 caractères).',
        });
      }
      const userSession = await registerWithEmailPassword({
        email: String(email),
        password: String(password),
        fullName: String(fullName),
        accountType: accountType === 'vendor' ? 'vendor' : 'customer',
        storeName: storeName ? String(storeName) : undefined,
        city: city ? String(city) : undefined,
      });
      res.status(201).json(userSession);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Impossible de créer le compte.' });
    }
  });

  // 4. Checkout & Exclusive COD Order Creation (Never trust frontend payment fields)
  app.post('/api/orders', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const requestedMethod = req.body?.paymentGateway ?? req.body?.payment_method ?? 'COD';
      const codCheck = validateCodPaymentMethod(requestedMethod);
      if (!codCheck.valid) {
        return res.status(400).json({
          error:
            codCheck.error ||
            'Mode de paiement non autorisé. Seul le paiement à la livraison (COD) est accepté.',
        });
      }

      const parsed = CheckoutSchema.safeParse({
        ...req.body,
        paymentGateway: 'COD',
      });
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }
      const created = await createMarketplaceOrder({
        ...parsed.data,
        paymentGateway: 'COD',
        userUid: req.user?.uid || null,
      });
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Order creation failed:', error);
      res.status(500).json({ error: error.message || 'Order creation failed' });
    }
  });

  // 5. Create Product (Vendor / Admin)
  app.post('/api/products', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = CreateProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }
      const product = await createVendorProduct(parsed.data);
      res.status(201).json(product);
    } catch (error: any) {
      console.error('Product creation failed:', error);
      res.status(500).json({ error: error.message || 'Product creation failed' });
    }
  });

  // 6. Delete Product
  app.delete('/api/products/:id', optionalAuth, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const result = await deleteVendorProduct(productId);
      res.json(result);
    } catch (error: any) {
      console.error('Product deletion failed:', error);
      res.status(500).json({ error: error.message || 'Product deletion failed' });
    }
  });

  // 6b. Update Product (Vendor / Admin)
  app.patch('/api/products/:id', optionalAuth, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const { titleFr, priceMad, compareAtPriceMad, status, imageUrl } = req.body;
      const updated = await updateVendorProduct({
        productId,
        titleFr,
        priceMad: priceMad !== undefined ? Number(priceMad) : undefined,
        compareAtPriceMad:
          compareAtPriceMad !== undefined
            ? compareAtPriceMad
              ? Number(compareAtPriceMad)
              : null
            : undefined,
        status,
        imageUrl,
      });
      res.json(updated);
    } catch (error: any) {
      console.error('Product update failed:', error);
      res.status(500).json({ error: error.message || 'Product update failed' });
    }
  });

  // 6c. Replenish Product Stock (Vendor / Admin)
  app.post('/api/products/:id/replenish', optionalAuth, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const addedQuantity = Number(req.body.addedQuantity) || 10;
      const result = await replenishProductStock(productId, addedQuantity);
      res.json(result);
    } catch (error: any) {
      console.error('Replenish stock failed:', error);
      res.status(500).json({ error: error.message || 'Failed to replenish stock' });
    }
  });

  // 6c. Add Customer Shipping Address
  app.post('/api/addresses', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { label, recipientName, phone, streetAddress, city, postalCode, country } = req.body;
      if (!label || !recipientName || !streetAddress || !city || !postalCode) {
        return res.status(400).json({ error: 'Tous les champs de l’adresse sont requis.' });
      }
      const created = await createCustomerAddress({
        userUid: req.user?.uid || 'client_atlas_01',
        label: String(label),
        recipientName: String(recipientName),
        phone: String(phone || '+212 6 00 00 00 00'),
        streetAddress: String(streetAddress),
        city: String(city),
        postalCode: String(postalCode),
        country: country ? String(country) : 'Maroc',
      });
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add address' });
    }
  });

  // 6d. Delete Product Review (Admin Moderation)
  app.delete('/api/reviews/:id', optionalAuth, async (req, res) => {
    try {
      const reviewId = Number(req.params.id);
      const resDel = await deleteProductReview(reviewId);
      res.json(resDel);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete review' });
    }
  });

  // 7. Update Order Status & Tracking Number
  app.patch('/api/orders/:id/status', optionalAuth, async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { orderStatus, trackingNumber } = req.body;
      const updated = await updateOrderStatusAndTracking({
        orderId,
        orderStatus,
        trackingNumber,
      });
      res.json(updated);
    } catch (error: any) {
      console.error('Order status update failed:', error);
      res.status(500).json({ error: error.message || 'Order status update failed' });
    }
  });

  // 7b. Admin Confirm / Update COD Payment Status (PENDING / PAID / FAILED)
  app.patch('/api/orders/:id/payment-status', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = Number(req.params.id);
      const rawStatus = String(req.body?.paymentStatus || 'PAID').toUpperCase();
      if (!['PENDING', 'PAID', 'FAILED'].includes(rawStatus)) {
        return res.status(400).json({
          error: 'Statut de paiement COD invalide. Valeurs autorisées : PENDING, PAID, FAILED.',
        });
      }
      const updated = await updateOrderPaymentStatus({
        orderId,
        paymentStatus: rawStatus as 'PENDING' | 'PAID' | 'FAILED',
        actorUid: req.user?.uid || 'admin_atlas_01',
      });
      res.json(updated);
    } catch (error: any) {
      console.error('Payment status update failed:', error);
      res.status(500).json({ error: error.message || 'Payment status update failed' });
    }
  });

  // 8. Request Return / Refund (Customer / Admin)
  app.post('/api/orders/:id/refund', optionalAuth, async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { reason, amountMad } = req.body;
      const refund = await createReturnRefundRequest({
        orderId,
        reason: reason || 'Demande de retour client sous garantie 14 jours',
        amountMad: Number(amountMad) || 0,
      });
      res.status(201).json(refund);
    } catch (error: any) {
      console.error('Refund request failed:', error);
      res.status(500).json({ error: error.message || 'Refund request failed' });
    }
  });

  // 9. Vendor Payout Request
  app.post('/api/payouts', optionalAuth, async (req, res) => {
    try {
      const { storeId, amountMad, bankName, ibanMasked } = req.body;
      if (!storeId || !amountMad || Number(amountMad) <= 0) {
        return res.status(400).json({ error: 'Montant et boutique requis' });
      }
      const payout = await createVendorPayoutRequest({
        storeId: Number(storeId),
        amountMad: Number(amountMad),
        bankName: bankName || 'Attijariwafa Bank',
        ibanMasked: ibanMasked || 'MA64 **** **** **** **** 4921',
      });
      res.status(201).json(payout);
    } catch (error: any) {
      console.error('Payout request failed:', error);
      res.status(500).json({ error: error.message || 'Payout request failed' });
    }
  });

  // 10. Admin Approve / Paid Payout
  app.patch('/api/payouts/:id', optionalAuth, async (req, res) => {
    try {
      const payoutId = Number(req.params.id);
      const { status } = req.body;
      const updated = await updatePayoutStatus(payoutId, status || 'paid');
      res.json(updated);
    } catch (error: any) {
      console.error('Payout update failed:', error);
      res.status(500).json({ error: error.message || 'Payout update failed' });
    }
  });

  // 11. Submit Vendor Store Application
  app.post('/api/vendor-applications', optionalAuth, async (req, res) => {
    try {
      const parsed = VendorApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }
      const created = await submitVendorApplication(parsed.data);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Vendor application failed:', error);
      res.status(500).json({ error: error.message || 'Vendor application failed' });
    }
  });

  // 12. Admin Review Vendor Application
  app.patch('/api/vendor-applications/:id', optionalAuth, async (req, res) => {
    try {
      const appId = Number(req.params.id);
      const { status } = req.body;
      const updated = await reviewVendorApplication(appId, status);
      res.json(updated);
    } catch (error: any) {
      console.error('Vendor application review failed:', error);
      res.status(500).json({ error: error.message || 'Vendor application review failed' });
    }
  });

  // 13. Submit Product Review
  app.post('/api/reviews', optionalAuth, async (req, res) => {
    try {
      const parsed = ReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }
      const review = await createProductReview(parsed.data);
      res.status(201).json(review);
    } catch (error: any) {
      console.error('Review creation failed:', error);
      res.status(500).json({ error: error.message || 'Review creation failed' });
    }
  });

  // 13b. Submit Vendor Store Review (Avis sur les vendeurs)
  app.post('/api/vendor-reviews', optionalAuth, async (req, res) => {
    try {
      const parsed = VendorReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }
      const vendorReview = await createVendorStoreReview(parsed.data);
      res.status(201).json(vendorReview);
    } catch (error: any) {
      console.error('Vendor review creation failed:', error);
      res.status(500).json({ error: error.message || 'Vendor review creation failed' });
    }
  });

  // 13c. Create Vendor FAQ Item (FAQ Vendeur)
  app.post('/api/vendor-faqs', optionalAuth, async (req, res) => {
    try {
      const parsed = VendorFaqSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }
      const faqItem = await createVendorFaqItem(parsed.data);
      res.status(201).json(faqItem);
    } catch (error: any) {
      console.error('Vendor FAQ creation failed:', error);
      res.status(500).json({ error: error.message || 'Vendor FAQ creation failed' });
    }
  });

  // 14. Create Promotional Coupon Code
  app.post('/api/coupons', optionalAuth, async (req, res) => {
    try {
      const parsed = CouponSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }
      const coupon = await createCouponCode(parsed.data);
      res.status(201).json(coupon);
    } catch (error: any) {
      console.error('Coupon creation failed:', error);
      res.status(500).json({ error: error.message || 'Coupon creation failed' });
    }
  });

  // 15. Admin Update Store Commission & Status
  app.patch('/api/stores/:id', optionalAuth, async (req, res) => {
    try {
      const storeId = Number(req.params.id);
      const { commissionRate, status } = req.body;
      const updated = await updateStoreCommissionAndStatus({
        storeId,
        commissionRate: Number(commissionRate),
        status,
      });
      res.json(updated);
    } catch (error: any) {
      console.error('Store update failed:', error);
      res.status(500).json({ error: error.message || 'Store update failed' });
    }
  });

  // SEO Sitemap XML & Robots.txt
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n`);
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const data = await getBootstrapData();
      const baseUrl = process.env.APP_URL || 'https://maison-atlas.example.com';
      const urls = [
        `<url><loc>${baseUrl}/</loc><priority>1.0</priority></url>`,
        `<url><loc>${baseUrl}/catalog</loc><priority>0.9</priority></url>`,
        ...data.products.map(
          (p) => `<url><loc>${baseUrl}/products/${p.slug}</loc><priority>0.8</priority></url>`
        ),
      ].join('');
      res
        .type('application/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
        );
    } catch {
      res.status(500).end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Maison Atlas Marketplace Server running on http://localhost:${PORT}`);
  });
}

startServer();
