import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertFromMad,
  calculateItemCommission,
  calculateOrderFinancials,
  generateIdempotencyKey,
  computeWebhookSignature,
  verifyWebhookSignature,
  processPaymentWithAdapter,
  validateCodPaymentMethod,
  validateEmailPasswordInput,
  canAccessWorkspace,
  filterAndSortProducts,
  calculateVendorSalesStats,
  calculateUpdatedStoreRating,
  DEFAULT_EXCHANGE_RATES,
} from './marketplace-rules';

test('convertFromMad converts MAD to EUR and USD with accurate 2-decimal rounding', () => {
  assert.equal(convertFromMad(1000, 'MAD', DEFAULT_EXCHANGE_RATES), 1000);
  assert.equal(convertFromMad(1000, 'EUR', DEFAULT_EXCHANGE_RATES), 92);
  assert.equal(convertFromMad(1000, 'USD', DEFAULT_EXCHANGE_RATES), 99);
});

test('calculateItemCommission splits platform fee and vendor net accurately', () => {
  const split = calculateItemCommission(1200, 2, 12);
  assert.equal(split.subtotalMad, 2400);
  assert.equal(split.commissionMad, 288);
  assert.equal(split.vendorNetMad, 2112);
});

test('calculateOrderFinancials applies percentage coupon and free shipping threshold', () => {
  const summary = calculateOrderFinancials({
    items: [
      { productId: 1, storeId: 1, unitPriceMad: 950, quantity: 2, commissionRatePercent: 10 },
      { productId: 2, storeId: 2, unitPriceMad: 600, quantity: 1, commissionRatePercent: 15 },
    ],
    coupon: {
      code: 'ATLAS10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderMad: 1000,
      active: true,
    },
    shipping: {
      baseFeeMad: 45,
      freeShippingThresholdMad: 1500,
    },
    taxRatePercent: 20,
  });

  // Subtotal = 1900 + 600 = 2500 MAD
  assert.equal(summary.subtotalMad, 2500);
  // 10% discount = 250 MAD
  assert.equal(summary.discountMad, 250);
  // Discounted subtotal = 2250 >= 1500 free shipping threshold -> shipping = 0
  assert.equal(summary.shippingMad, 0);
  assert.equal(summary.totalMad, 2250);
  // Commissions: 190 + 90 = 280
  assert.equal(summary.platformCommissionMad, 280);
  assert.equal(summary.vendorNetTotalMad, 2220);
});

test('calculateOrderFinancials charges base shipping when below free threshold', () => {
  const summary = calculateOrderFinancials({
    items: [{ productId: 1, storeId: 1, unitPriceMad: 400, quantity: 1, commissionRatePercent: 12 }],
    coupon: null,
    shipping: {
      baseFeeMad: 45,
      freeShippingThresholdMad: 1500,
    },
  });

  assert.equal(summary.subtotalMad, 400);
  assert.equal(summary.shippingMad, 45);
  assert.equal(summary.totalMad, 445);
});

test('COD-only payment adapter initializes PENDING status and rejects any online payment method', () => {
  const payload = JSON.stringify({ order: 'ORD-1001', amount: 1450, paymentMethod: 'COD' });
  const secret = 'cod_integrity_secret';
  const signature = computeWebhookSignature(payload, secret);

  assert.equal(verifyWebhookSignature(payload, signature, secret), true);
  assert.equal(verifyWebhookSignature(payload, 'invalid_sig', secret), false);

  assert.equal(validateCodPaymentMethod('COD').valid, true);
  assert.equal(validateCodPaymentMethod(undefined).valid, true);
  assert.equal(validateCodPaymentMethod('ONLINE_CARD').valid, false);

  const codPayment = processPaymentWithAdapter({
    gateway: 'COD',
    orderNumber: 'ORD-2026-902',
    amountMad: 680,
    currency: 'MAD',
  });

  assert.equal(codPayment.status, 'PENDING');
  assert.equal(codPayment.signatureVerified, true);
  assert.equal(codPayment.idempotencyKey, generateIdempotencyKey('ORD-2026-902', 'COD'));

  assert.throws(() => {
    processPaymentWithAdapter({
      gateway: 'ONLINE_GATEWAY',
      orderNumber: 'ORD-2026-903',
      amountMad: 500,
      currency: 'MAD',
    });
  }, /Seul le paiement à la livraison \(COD\) est autorisé/);
});

test('validateEmailPasswordInput and canAccessWorkspace enforce role-based email/password rules', () => {
  assert.equal(validateEmailPasswordInput('', '123456').valid, false);
  assert.equal(validateEmailPasswordInput('invalid-email', '123456').valid, false);
  assert.equal(validateEmailPasswordInput('client@maison-atlas.ma', '123').valid, false);
  assert.equal(validateEmailPasswordInput('client@maison-atlas.ma', 'Client2026!').valid, true);

  assert.equal(canAccessWorkspace(['customer'], 'customer'), true);
  assert.equal(canAccessWorkspace(['customer'], 'vendor'), false);
  assert.equal(canAccessWorkspace(['customer'], 'admin'), false);
  assert.equal(canAccessWorkspace(['vendor'], 'vendor'), true);
  assert.equal(canAccessWorkspace(['vendor'], 'admin'), false);
  assert.equal(canAccessWorkspace(['admin'], 'customer'), true);
  assert.equal(canAccessWorkspace(['admin'], 'vendor'), true);
  assert.equal(canAccessWorkspace(['admin'], 'admin'), true);
});

test('filterAndSortProducts filters by search query, category, price range, promo, and sorts accurately', () => {
  const sampleProducts = [
    {
      id: 1,
      storeId: 1,
      categoryId: 5,
      titleFr: 'Masseur Intelligent des Méridiens Chauffant USB',
      titleEn: 'Intelligence Meridians Massager',
      titleAr: 'جهاز تدليك المسارات الذكي',
      descriptionFr: 'Appareil de massage profond chauffant.',
      sku: 'BEM-MER-028',
      priceMad: '299.00',
      compareAtPriceMad: '450.00',
      status: 'published',
      rating: '4.96',
    },
    {
      id: 2,
      storeId: 2,
      categoryId: 6,
      titleFr: 'Machine à Expresso Portable Sans Fil USB-C',
      titleEn: 'Cordless Portable USB-C Espresso Maker',
      titleAr: 'آلة إسبريسو محمولة',
      descriptionFr: 'Cafetière expresso nomade camping.',
      sku: 'ELC-EXP-023',
      priceMad: '480.00',
      compareAtPriceMad: null,
      status: 'published',
      rating: '4.91',
    },
    {
      id: 3,
      storeId: 1,
      categoryId: 7,
      titleFr: 'Voiture Tamponneuse Électrique Enfant LED 360°',
      titleEn: 'Happy Kids Bumper Car',
      titleAr: 'سيارة كهربائية للأطفال',
      descriptionFr: 'Porteur électrique rotatif.',
      sku: 'JEU-CAR-021',
      priceMad: '1290.00',
      compareAtPriceMad: '1590.00',
      status: 'published',
      rating: '4.95',
    },
  ];

  // Search query
  const searchRes = filterAndSortProducts(sampleProducts, { searchQuery: 'expresso' });
  assert.equal(searchRes.length, 1);
  assert.equal(searchRes[0].sku, 'ELC-EXP-023');

  // Category filter
  const catRes = filterAndSortProducts(sampleProducts, { categoryId: 5 });
  assert.equal(catRes.length, 1);
  assert.equal(catRes[0].id, 1);

  // Price range filter (< 300 MAD)
  const under300 = filterAndSortProducts(sampleProducts, { priceRange: 'under_300' });
  assert.equal(under300.length, 1);
  assert.equal(under300[0].id, 1);

  // Promo filter
  const promoOnly = filterAndSortProducts(sampleProducts, { onlyPromo: true });
  assert.equal(promoOnly.length, 2);

  // Sort by price_desc
  const sortedDesc = filterAndSortProducts(sampleProducts, { sortBy: 'price_desc' });
  assert.equal(sortedDesc[0].id, 3);
  assert.equal(sortedDesc[2].id, 1);
});

test('order-pdf utility generates valid PDF 1.4 document with order details, items, and COD summary', async () => {
  const { buildOrderSummaryPdfBytes, generateOrderSummaryPdfBlob, downloadOrderSummaryPdf } =
    await import('./order-pdf');

  const sampleOrder = {
    id: 42,
    orderNumber: 'ORD-2026-1042',
    userUid: 'client_atlas_01',
    customerEmail: 'nadia.chraibi@studio-anfa.ma',
    customerName: 'Nadia Chraïbi',
    customerPhone: '+212 6 61 88 99 00',
    shippingAddress: '42 Boulevard d Anfa',
    shippingCity: 'Casablanca',
    shippingPostalCode: '20050',
    shippingCountry: 'Maroc',
    shippingMethodName: 'Amana Express National',
    paymentGateway: 'COD' as const,
    paymentStatus: 'PENDING',
    orderStatus: 'confirmed',
    currency: 'MAD' as const,
    subtotalMad: '1650.00',
    discountMad: '247.50',
    shippingMad: '45.00',
    taxMad: '233.75',
    totalMad: '1447.50',
    couponCode: 'ATLAS15',
    trackingNumber: 'TRK-84920144-MA',
    createdAt: '2026-11-06T12:00:00.000Z',
  };

  const sampleItems = [
    {
      id: 1,
      orderId: 42,
      productId: 1,
      storeId: 1,
      productTitle: 'Trio de Vases Sculpturaux en Grès & Terracotta',
      variantTitle: 'Édition Originale / Standard',
      sku: 'ASG-VAS-001',
      quantity: 1,
      unitPriceMad: '1650.00',
      subtotalMad: '1650.00',
      commissionMad: '198.00',
      vendorNetMad: '1452.00',
      fulfillmentStatus: 'accepted',
      trackingNumber: 'TRK-84920144-MA',
    },
  ];

  const pdfBytes = buildOrderSummaryPdfBytes(sampleOrder, sampleItems, {
    currency: 'MAD',
    rates: DEFAULT_EXCHANGE_RATES,
    language: 'fr',
  });

  const pdfText = Buffer.from(pdfBytes).toString('latin1');
  assert.equal(pdfText.startsWith('%PDF-1.4\n'), true);
  assert.equal(pdfText.includes('ORD-2026-1042'), true);
  assert.equal(pdfText.includes('ASG-VAS-001'), true);
  assert.equal(pdfText.includes('COD - Paiement a la livraison'), true);
  assert.equal(pdfText.includes('xref'), true);
  assert.equal(pdfText.trimEnd().endsWith('%%EOF'), true);

  const blob = generateOrderSummaryPdfBlob(sampleOrder, sampleItems);
  assert.equal(blob.type, 'application/pdf');
  assert.equal(blob.size > 500, true);

  const fileName = downloadOrderSummaryPdf(sampleOrder, sampleItems);
  assert.equal(fileName, 'Recapitulatif-Commande-ORD-2026-1042.pdf');
});

test('calculateVendorSalesStats and calculateUpdatedStoreRating compute vendor analytics and store rating accurately', () => {
  const stats = calculateVendorSalesStats({
    storeId: 1,
    orders: [
      {
        id: 101,
        paymentStatus: 'PAID',
        orderStatus: 'delivered',
        createdAt: '2026-11-05T10:00:00.000Z',
      },
      {
        id: 102,
        paymentStatus: 'PENDING',
        orderStatus: 'shipped',
        createdAt: '2026-11-06T12:00:00.000Z',
      },
    ],
    orderItems: [
      {
        orderId: 101,
        productId: 1,
        storeId: 1,
        productTitle: 'Trio de Vases Sculpturaux en Grès & Terracotta',
        sku: 'ASG-VAS-001',
        quantity: 2,
        subtotalMad: '3300.00',
        commissionMad: '396.00',
        vendorNetMad: '2904.00',
        fulfillmentStatus: 'delivered',
      },
      {
        orderId: 102,
        productId: 2,
        storeId: 1,
        productTitle: 'Sac Weekender Aethel en Cuir Pleine Fleur Cognac',
        sku: 'AET-BAG-002',
        quantity: 1,
        subtotalMad: '3400.00',
        commissionMad: '408.00',
        vendorNetMad: '2992.00',
        fulfillmentStatus: 'shipped',
      },
    ],
  });

  assert.equal(stats.grossSalesMad, 6700);
  assert.equal(stats.totalCommissionMad, 804);
  assert.equal(stats.netRevenueMad, 5896);
  assert.equal(stats.totalOrdersCount, 2);
  assert.equal(stats.totalUnitsSold, 3);
  assert.equal(stats.averageOrderValueMad, 3350);
  assert.equal(stats.codPaidAmountMad, 2904);
  assert.equal(stats.codPendingAmountMad, 2992);
  assert.equal(stats.topProducts.length, 2);
  assert.equal(stats.topProducts[0].sku, 'AET-BAG-002');
  assert.equal(stats.monthlySalesTrend.length, 6);
  assert.equal(stats.dailySalesTrend.length, 7);
  assert.equal(stats.dailySalesTrend[6].grossSalesMad > 0, true);

  const ratingRes = calculateUpdatedStoreRating('4.90', 9, 5);
  assert.equal(ratingRes.reviewCount, 10);
  assert.equal(ratingRes.rating, '4.91');
});

test('getOrderTrackingDetails calculates milestones, carrier details, and COD instructions accurately', async () => {
  const { getOrderTrackingDetails } = await import('./order-tracking');

  const shippedOrder: any = {
    id: 10,
    orderNumber: 'ORD-2026-999',
    shippingMethodName: 'Amana Express',
    shippingCity: 'Rabat',
    shippingAddress: '15 Avenue Mohammed V',
    orderStatus: 'shipped',
    totalMad: '2400.00',
    trackingNumber: 'TRK-AMN-999-MA',
    createdAt: '2026-11-06T10:00:00.000Z',
  };

  const tracking = getOrderTrackingDetails(shippedOrder);

  assert.equal(tracking.trackingNumber, 'TRK-AMN-999-MA');
  assert.equal(tracking.orderNumber, 'ORD-2026-999');
  assert.equal(tracking.destinationCity, 'Rabat');
  assert.equal(tracking.totalCodAmountMad, 2400);
  assert.equal(tracking.isDelivered, false);
  assert.equal(tracking.carrierName.includes('Amana'), true);
  assert.equal(tracking.milestones.length, 5);

  // Status is 'shipped', corresponding to step 4 active
  const completedSteps = tracking.milestones.filter((m) => m.status === 'completed');
  assert.equal(completedSteps.length, 3); // Steps 1, 2, 3
  const currentStep = tracking.milestones.find((m) => m.status === 'current');
  assert.equal(currentStep?.id, 'step-4');

  // Test delivered status
  const deliveredOrder: any = {
    ...shippedOrder,
    orderStatus: 'delivered',
  };
  const deliveredTracking = getOrderTrackingDetails(deliveredOrder);
  assert.equal(deliveredTracking.isDelivered, true);
  assert.equal(deliveredTracking.milestones.filter((m) => m.status === 'completed').length, 4);
  assert.equal(deliveredTracking.milestones.find((m) => m.status === 'current')?.id, 'step-5');
});




