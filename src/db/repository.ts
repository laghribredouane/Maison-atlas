import crypto from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import {
  profiles,
  userRoles,
  stores,
  storeMembers,
  vendorApplications,
  categories,
  brands,
  products,
  productImages,
  productVariants,
  inventory,
  customers,
  customerAddresses,
  orders,
  orderItems,
  payments,
  paymentEvents,
  refunds,
  shippingMethods,
  shipments,
  coupons,
  couponRedemptions,
  reviews,
  commissions,
  vendorWallets,
  payoutRequests,
  notifications,
  banners,
  settings,
  exchangeRates,
  auditLogs,
} from './schema.ts';
import {
  calculateItemCommission,
  calculateOrderFinancials,
  processPaymentWithAdapter,
  validateCodPaymentMethod,
  calculateUpdatedStoreRating,
  type CodPaymentStatus,
  type PaymentGatewayCode,
  type SupportedCurrency,
} from '../utils/marketplace-rules.ts';

let seedPromise: Promise<void> | null = null;

async function ensureExtendedCategoriesAndAttachedProducts(): Promise<void> {
  const extraCategories = [
    {
      nameFr: 'Bien-Être & Massage',
      nameEn: 'Wellness & Massagers',
      nameAr: 'العناية وأجهزة التدليك',
      slug: 'bien-etre-massage',
      description: 'Appareils de massage profond, soin des méridiens et relaxation thermique.',
      featured: true,
    },
    {
      nameFr: 'Jeux & Jouets Enfants',
      nameEn: 'Kids Toys & Ride-Ons',
      nameAr: 'ألعاب ومستلزمات الأطفال',
      slug: 'jeux-jouets-enfants',
      description: 'Porteurs électriques, chevaux à bascule évolutifs et jeux de société familiaux.',
      featured: true,
    },
    {
      nameFr: 'Sport & Fitness',
      nameEn: 'Sports & Fitness',
      nameAr: 'الرياضة واللياقة البدنية',
      slug: 'sport-fitness',
      description:
        'Équipements d’entraînement fonctionnel, sangles de résistance et musculation à domicile.',
      featured: true,
    },
    {
      nameFr: 'Maison & Rangement',
      nameEn: 'Home & Storage',
      nameAr: 'المنزل والتخزين الذكي',
      slug: 'maison-rangement',
      description:
        'Étagères pliables industrielles, mobilier modulable et organisation intérieure.',
      featured: true,
    },
    {
      nameFr: 'Électroménager & Camping',
      nameEn: 'Appliances & Outdoor',
      nameAr: 'الأجهزة المنزلية والتخييم',
      slug: 'electromenager-camping',
      description:
        'Machines à expresso portables sans fil et équipements nomades haute autonomie.',
      featured: true,
    },
  ];

  await db.insert(categories).values(extraCategories).onConflictDoNothing();

  const allCategories = await db.select().from(categories);
  const allStores = await db.select().from(stores);
  const allBrands = await db.select().from(brands);

  if (allCategories.length === 0 || allStores.length === 0) return;

  const getCatId = (slug: string) =>
    allCategories.find((c) => c.slug === slug)?.id || allCategories[0].id;
  const store1 = allStores[0]?.id || 1;
  const store2 = allStores[1]?.id || store1;
  const store3 = allStores[2]?.id || store1;
  const defaultBrandId = allBrands[0]?.id || null;

  const attachedProducts = [
    {
      storeId: store1,
      categoryId: getCatId('jeux-jouets-enfants'),
      brandId: defaultBrandId,
      titleFr: 'Jeu de Société Caméléon Attrape-Insectes (2 Masques & Cartes)',
      titleEn: 'Chameleon Bug-Catching Family Board Game (2 Masks & Cards)',
      titleAr: 'لعبة الحرباء التفاعلية لصيد الحشرات للأطفال والعائلة',
      slug: 'jeu-societe-cameleon-attrape-insectes',
      descriptionFr:
        'Jeu d’adresse et de rapidité hilarant pour 2 joueurs : enfilez les masques de caméléon à langue déroulante et faites tomber la carte insecte correspondante en premier.',
      descriptionEn:
        'Fast-paced family dexterity game with 2 chameleon blower masks and numbered insect target cards.',
      descriptionAr: 'لعبة عائلية ممتعة وسريعة مع قناعي حرباء وبطاقات حشرات مرقمة لتنمية سرعة البديهة.',
      sku: 'JEU-CAM-010',
      barcode: '611124500201',
      priceMad: '149.00',
      compareAtPriceMad: '220.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG-20261012-WA0010_b798d8fa.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: true,
      rating: '4.93',
      reviewCount: 38,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
    {
      storeId: store2,
      categoryId: getCatId('bien-etre-massage'),
      brandId: defaultBrandId,
      titleFr: 'Masseur Intelligent des Méridiens Chauffant USB — Édition Luxe',
      titleEn: 'Intelligence Meridians Heated USB Massager',
      titleAr: 'جهاز تدليك المسارات الذكي بالحرارة والشحن عبر USB',
      slug: 'masseur-intelligent-meridiens-chauffant-usb',
      descriptionFr:
        'Appareil de massage profond à vibrations intelligentes multi-modes et chaleur apaisante. Soulage la fatigue de la nuque et du dos, stimule la circulation et se recharge par USB.',
      descriptionEn:
        'Smart meridian massager with multi-mode deep vibration, soothing warmth, and portable USB charging.',
      descriptionAr:
        'مشاج ذكي يخفف التعب ويعيد النشاط مع تدليك عميق وفعال وحرارة مريحة وشحن USB.',
      sku: 'BEM-MER-028',
      barcode: '611124500202',
      priceMad: '299.00',
      compareAtPriceMad: '450.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG_20261106_204528_603_9cbe664d.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: true,
      rating: '4.97',
      reviewCount: 74,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
    {
      storeId: store3,
      categoryId: getCatId('jeux-jouets-enfants'),
      brandId: defaultBrandId,
      titleFr: 'Voiture Tamponneuse Électrique Enfant LED 360° — Happy Kids',
      titleEn: 'Happy Kids 360° Electric LED Bumper Car Ride-On',
      titleAr: 'سيارة كهربائية دوارة 360 درجة للأطفال مع إضاءة LED',
      slug: 'voiture-tamponneuse-electrique-enfant-led-360',
      descriptionFr:
        'Porteur électrique rotatif à 360° avec pare-chocs amortisseur sécurisé, calandre illuminée par LED bleues, volant directionnel ergonomique et batterie rechargeable.',
      descriptionEn:
        '360-degree spinning electric ride-on bumper car for kids with glowing LED front grille and safety bumper.',
      descriptionAr:
        'سيارة أطفال كهربائية تدور 360 درجة مع إضاءة أمامية LED وحزام أمان ومصد حماية.',
      sku: 'JEU-CAR-021',
      barcode: '611124500203',
      priceMad: '1290.00',
      compareAtPriceMad: '1590.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG-20261013-WA0021_dffe0de0.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: true,
      rating: '4.96',
      reviewCount: 51,
      deliveryEstimateDays: '2-3 jours ouvrés (COD)',
    },
    {
      storeId: store1,
      categoryId: getCatId('maison-rangement'),
      brandId: defaultBrandId,
      titleFr: 'Étagère Pliable Industrielle 4 Niveaux en Acier sur Roulettes',
      titleEn: '4-Tier Foldable Industrial Steel Shelving Unit on Wheels',
      titleAr: 'رف معدني قابل للطي من 4 طوابق بعجلات دوارة',
      slug: 'etagere-pliable-industrielle-4-niveaux-acier-roulettes',
      descriptionFr:
        'Étagère de rangement pliable en acier carbone laqué noir mat. Dépliage instantané sans outil, plateaux perforés haute capacité et 4 roulettes pivotantes avec freins.',
      descriptionEn:
        'No-assembly foldable 4-tier heavy-duty black steel storage rack with locking caster wheels.',
      descriptionAr:
        'وحدة تخزين معدنية قابلة للطي من 4 طوابق بدون تركيب مع عجلات دوارة ومكابح تثبيت.',
      sku: 'MSR-ETG-008',
      barcode: '611124500204',
      priceMad: '549.00',
      compareAtPriceMad: '690.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG-20261012-WA0008_c7f77e0d.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: false,
      rating: '4.91',
      reviewCount: 44,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
    {
      storeId: store2,
      categoryId: getCatId('bien-etre-massage'),
      brandId: defaultBrandId,
      titleFr: 'Brosse de Massage Électrique Cuir Chevelu, Nuque & Méridiens',
      titleEn: 'Electric Scalp, Neck & Meridian Massage Brush',
      titleAr: 'فرشاة تدليك كهربائية لفروة الرأس والرقبة والجسم',
      slug: 'brosse-massage-electrique-cuir-chevelu-meridiens',
      descriptionFr:
        'Brosse de soin multipoints à picots métalliques arrondis pour le massage crânien, cervical, dorsal et les jambes. Détend les muscles et favorise la microcirculation.',
      descriptionEn:
        'Multi-contact metallic node massage brush for scalp relaxation, neck relief, and body meridian care.',
      descriptionAr:
        'فرشاة تدليك متعددة الرؤوس المعدنية لتدليك فروة الرأس والرقبة والظهر وتنشيط الدورة الدموية.',
      sku: 'BEM-BRS-031',
      barcode: '611124500205',
      priceMad: '249.00',
      compareAtPriceMad: '360.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG_20261106_204531_498_c37e69bf.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: true,
      rating: '4.94',
      reviewCount: 62,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
    {
      storeId: store3,
      categoryId: getCatId('sport-fitness'),
      brandId: defaultBrandId,
      titleFr: 'Kit Sangles Chevillères Fitness & Élastique de Résistance Porte',
      titleEn: 'Ankle Strap & Door Anchor Resistance Band Fitness Kit',
      titleAr: 'حزام الكاحل الرياضي مع حبل المقاومة للتمرين المنزلي',
      slug: 'kit-sangles-chevilleres-fitness-elastique-resistance',
      descriptionFr:
        'Sangle de cheville rembourrée en néoprène avec double anneau en D en acier et câble élastique à ancrage de porte pour tonifier fessiers, jambes et abducteurs à domicile.',
      descriptionEn:
        'Padded neoprene ankle cuff with steel D-ring and door-anchor resistance band for glute and leg workouts.',
      descriptionAr:
        'حزام كاحل مبطن مع حلقة فولاذية وحبل مقاومة يثبت في الباب لتمارين الأرجل واللياقة في المنزل.',
      sku: 'SPT-ANK-041',
      barcode: '611124500206',
      priceMad: '179.00',
      compareAtPriceMad: '260.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG_20261106_204541_292_712eed63.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: false,
      rating: '4.89',
      reviewCount: 33,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
    {
      storeId: store1,
      categoryId: getCatId('jeux-jouets-enfants'),
      brandId: defaultBrandId,
      titleFr: 'Cheval à Bascule & Porteur Évolutif 3-en-1 Licorne avec Canne',
      titleEn: '3-in-1 Convertible Unicorn Rocking Horse & Push Ride-On',
      titleAr: 'حصان هزاز وعربة أطفال 3 في 1 بمقبض دفع وحاجز أمان',
      slug: 'cheval-bascule-porteur-evolutif-3-en-1-licorne',
      descriptionFr:
        'Porteur évolutif 3-en-1 avec base à bascule amovible, canne de guidage parentale à poignée cœur, arceau de protection 360°, roues silencieuses et ourson musical.',
      descriptionEn:
        '3-in-1 convertible rocking unicorn and push ride-on car with removable safety guardrail and parent handle.',
      descriptionAr:
        'لعبة ركوب وهزاز 3 في 1 للأطفال بتصميم وحيد القرن مع مقبض تحكم للوالدين وحاجز حماية.',
      sku: 'JEU-LIC-006',
      barcode: '611124500207',
      priceMad: '590.00',
      compareAtPriceMad: '750.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG-20261012-WA0006_8601c644.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: true,
      rating: '4.98',
      reviewCount: 59,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
    {
      storeId: store3,
      categoryId: getCatId('electromenager-camping'),
      brandId: defaultBrandId,
      titleFr: 'Machine à Expresso Portable Sans Fil USB-C — Camping & Voyage',
      titleEn: 'Cordless Portable USB-C Espresso Maker for Camping & Travel',
      titleAr: 'آلة إسبريسو محمولة لاسلكية للشحن عبر USB-C للتخييم والسفر',
      slug: 'machine-expresso-portable-sans-fil-usb-c-camping',
      descriptionFr:
        'Cafetière expresso nomade auto-chauffante avec batterie rechargeable USB-C, extraction haute pression et tasse transparente intégrée pour le camping, la route ou le bureau.',
      descriptionEn:
        'Self-heating cordless USB-C portable espresso machine for camping, road trips, and outdoor adventures.',
      descriptionAr:
        'ماكينة قهوة إسبريسو محمولة قابلة للشحن عبر USB-C مثالية للتخييم والسفر والمكتب.',
      sku: 'ELC-EXP-023',
      barcode: '611124500208',
      priceMad: '480.00',
      compareAtPriceMad: '620.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG-20261013-WA0023_1__74eba239.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: true,
      rating: '4.95',
      reviewCount: 68,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
    {
      storeId: store2,
      categoryId: getCatId('bien-etre-massage'),
      brandId: defaultBrandId,
      titleFr: 'Masseur Dorsal & Lombaire Profond 8 Têtes avec Écran LED',
      titleEn: '8-Head Deep Tissue Back & Waist Massager with LED Control',
      titleAr: 'جهاز تدليك عميق للظهر والخصر بـ 8 رؤوس وشاشة رقمية',
      slug: 'masseur-dorsal-lombaire-profond-8-tetes-led',
      descriptionFr:
        'Masseur shiatsu ergonomique à 8 têtes de pétrissage profond avec zone de relaxation élargie, affichage numérique LED d’intensité et double poignée de maintien.',
      descriptionEn:
        '8-head deep kneading back and lumbar massager with expanded relaxation area and digital LED control panel.',
      descriptionAr:
        'جهاز تدليك عميق بـ 8 رؤوس لمنطقة الظهر والخصر مع شاشة تحكم رقمية ومقابض مريحة.',
      sku: 'BEM-8HD-025',
      barcode: '611124500209',
      priceMad: '449.00',
      compareAtPriceMad: '599.00',
      currency: 'MAD',
      imageUrl: '/assets/aistudio/IMG-20261013-WA0025_965b030c.jpg',
      status: 'published',
      featured: true,
      isNew: true,
      isBestseller: true,
      rating: '4.96',
      reviewCount: 47,
      deliveryEstimateDays: '24h - 48h (COD)',
    },
  ];

  const existingProducts = await db.select().from(products);
  const existingSkus = new Set(existingProducts.map((p) => p.sku));

  for (const prodData of attachedProducts) {
    if (existingSkus.has(prodData.sku)) continue;
    const inserted = await db.insert(products).values(prodData).returning();
    const prod = inserted[0];
    if (!prod) continue;

    await db.insert(productImages).values({
      productId: prod.id,
      url: prod.imageUrl,
      altText: prod.titleFr,
      position: 1,
    });

    const variant = await db
      .insert(productVariants)
      .values({
        productId: prod.id,
        title: 'Édition Originale / Standard',
        color: 'Standard',
        size: 'Unique',
        sku: `${prod.sku}-STD`,
        priceMad: prod.priceMad,
        stockQuantity: 25,
      })
      .returning();

    if (variant[0]) {
      await db.insert(inventory).values({
        productId: prod.id,
        variantId: variant[0].id,
        quantityAvailable: 25,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        warehouseLocation: 'Casablanca Logistique Hub',
      });
    }
  }
}

export async function ensureSeedData(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const existingCategories = await db.select().from(categories).limit(1);
      if (existingCategories.length > 0) {
        await ensureExtendedCategoriesAndAttachedProducts();
        return;
      }

      // 1. Seed initial demo profiles (vendors, admin, manager, customer)
      await db
        .insert(profiles)
        .values([
          {
            uid: 'admin_atlas_01',
            email: 'direction@maison-atlas.ma',
            fullName: 'Yasmine El Fassi (Direction)',
            phone: '+212 6 61 00 11 22',
            preferredLanguage: 'fr',
            preferredCurrency: 'MAD',
            loyaltyPoints: 1200,
          },
          {
            uid: 'vendor_atelier_01',
            email: 'contact@atelier-zellige.ma',
            fullName: 'Karim Benjelloun',
            phone: '+212 6 62 33 44 55',
            preferredLanguage: 'fr',
            preferredCurrency: 'MAD',
            loyaltyPoints: 450,
          },
          {
            uid: 'vendor_botanica_02',
            email: 'studio@ourika-botanica.ma',
            fullName: 'Salma Berrada',
            phone: '+212 6 63 77 88 99',
            preferredLanguage: 'fr',
            preferredCurrency: 'MAD',
            loyaltyPoints: 620,
          },
          {
            uid: 'vendor_horlogerie_03',
            email: 'concierge@casa-chronographe.ma',
            fullName: 'Mehdi Tazi',
            phone: '+212 6 64 12 34 56',
            preferredLanguage: 'fr',
            preferredCurrency: 'EUR',
            loyaltyPoints: 890,
          },
        ])
        .onConflictDoNothing();

      await db.insert(userRoles).values([
        { userUid: 'admin_atlas_01', role: 'admin' },
        { userUid: 'vendor_atelier_01', role: 'vendor' },
        { userUid: 'vendor_botanica_02', role: 'vendor' },
        { userUid: 'vendor_horlogerie_03', role: 'vendor' },
      ]);

      // 2. Seed Exchange Rates
      await db
        .insert(exchangeRates)
        .values([
          { baseCurrency: 'MAD', targetCurrency: 'MAD', rate: '1.000000' },
          { baseCurrency: 'MAD', targetCurrency: 'EUR', rate: '0.092000' },
          { baseCurrency: 'MAD', targetCurrency: 'USD', rate: '0.099000' },
        ])
        .onConflictDoNothing();

      // 3. Seed Categories
      const insertedCategories = await db
        .insert(categories)
        .values([
          {
            nameFr: 'Mobilier & Céramique',
            nameEn: 'Architecture & Ceramics',
            nameAr: 'الأثاث والسيراميك المعماري',
            slug: 'mobilier-ceramique',
            description: 'Pièces sculpturales façonnées à la main par les maîtres artisans.',
            featured: true,
          },
          {
            nameFr: 'Maroquinerie & Voyage',
            nameEn: 'Leather Goods & Travel',
            nameAr: 'المنتجات الجلدية والسفر',
            slug: 'maroquinerie-voyage',
            description: 'Cuirs pleine fleur au tannage végétal et bagagerie intemporelle.',
            featured: true,
          },
          {
            nameFr: 'Haute Botanique & Soins',
            nameEn: 'Botanical Skincare',
            nameAr: 'العناية النباتية الفاخرة',
            slug: 'haute-botanique',
            description: 'Élixirs d’argan bio pressés à froid et absolues florales de l’Atlas.',
            featured: true,
          },
          {
            nameFr: 'Horlogerie & Objets',
            nameEn: 'Horology & Precision',
            nameAr: 'الساعات والقطع الدقيقة',
            slug: 'horlogerie-objets',
            description: 'Garde-temps minimalistes en titane brossé et instruments de précision.',
            featured: true,
          },
        ])
        .returning();

      // 4. Seed Brands
      const insertedBrands = await db
        .insert(brands)
        .values([
          { name: 'Atelier Sidi Ghanem', slug: 'atelier-sidi-ghanem', originCountry: 'Maroc', verified: true },
          { name: 'Aethel Maroquinerie', slug: 'aethel-maroquinerie', originCountry: 'Maroc', verified: true },
          { name: 'Ourika Botanica', slug: 'ourika-botanica', originCountry: 'Maroc', verified: true },
          { name: 'Maison Chronos', slug: 'maison-chronos', originCountry: 'Suisse / Maroc', verified: true },
        ])
        .returning();

      // 5. Seed Stores
      const insertedStores = await db
        .insert(stores)
        .values([
          {
            ownerUid: 'vendor_atelier_01',
            name: 'Atelier Sidi Ghanem',
            slug: 'atelier-sidi-ghanem',
            description:
              'Manufacture de mobilier architectural en chêne massif, céramiques de grès et maroquinerie sellier basée à Marrakech.',
            city: 'Marrakech',
            country: 'Maroc',
            rating: '4.94',
            reviewCount: 128,
            commissionRate: '12.00',
            status: 'active',
            verified: true,
          },
          {
            ownerUid: 'vendor_botanica_02',
            name: 'Ourika Botanica Laboratoire',
            slug: 'ourika-botanica',
            description:
              'Formulations botaniques pures distillées dans la vallée de l’Ourika : sérums à l’or d’argan, néroli et figue de Barbarie.',
            city: 'Essaouira',
            country: 'Maroc',
            rating: '4.91',
            reviewCount: 94,
            commissionRate: '10.00',
            status: 'active',
            verified: true,
          },
          {
            ownerUid: 'vendor_horlogerie_03',
            name: 'Casa Chronographe & Design',
            slug: 'casa-chronographe',
            description:
              'Sélection horlogère automatique et luminaires en laiton brossé conçus entre Casablanca et Genève.',
            city: 'Casablanca',
            country: 'Maroc',
            rating: '4.88',
            reviewCount: 67,
            commissionRate: '14.00',
            status: 'active',
            verified: true,
          },
        ])
        .returning();

      for (const st of insertedStores) {
        await db.insert(storeMembers).values({
          storeId: st.id,
          userUid: st.ownerUid,
          memberRole: 'owner',
        });
      }

      // 6. Seed Products using the exact generated high-fidelity assets
      const catCeramique = insertedCategories[0].id;
      const catLeather = insertedCategories[1].id;
      const catBotanique = insertedCategories[2].id;
      const catHorlogerie = insertedCategories[3].id;

      const storeAtelier = insertedStores[0].id;
      const storeBotanica = insertedStores[1].id;
      const storeChrono = insertedStores[2].id;

      const insertedProducts = await db
        .insert(products)
        .values([
          {
            storeId: storeAtelier,
            categoryId: catCeramique,
            brandId: insertedBrands[0].id,
            titleFr: 'Trio de Vases Sculpturaux en Grès & Terracotta',
            titleEn: 'Sculptural Stoneware & Terracotta Vase Trio',
            titleAr: 'ثلاثية مزهريات نحتية من الحجر الخزفي والتراكوتا',
            slug: 'trio-vases-sculpturaux-gres-terracotta',
            descriptionFr:
              'Ensemble de trois pièces uniques tournées à la main à Marrakech. Finition mate minérale et glaçure brute inspirée des kasbahs.',
            descriptionEn:
              'Hand-thrown trio of architectural stoneware vessels with raw travertine and matte terracotta finish.',
            descriptionAr:
              'مجموعة من ثلاث قطع خزفية مشكلة يدوياً في مراكش بلمسة معدنية غير لامعة مستوحاة من العمارة الأصيلة.',
            sku: 'ASG-VAS-001',
            barcode: '611124500101',
            priceMad: '1650.00',
            compareAtPriceMad: '1950.00',
            currency: 'MAD',
            imageUrl: '/src/assets/images/product_ceramic_vase_1793993182524.jpg',
            status: 'published',
            featured: true,
            isNew: true,
            isBestseller: true,
            rating: '4.95',
            reviewCount: 42,
            deliveryEstimateDays: '2-3 jours ouvrés',
          },
          {
            storeId: storeAtelier,
            categoryId: catLeather,
            brandId: insertedBrands[1].id,
            titleFr: 'Sac Weekender Aethel en Cuir Pleine Fleur Cognac',
            titleEn: 'Aethel Cognac Full-Grain Leather Weekender Bag',
            titleAr: 'حقيبة سفر إيثيل من الجلد الطبيعي الفاخر بلون الكونياك',
            slug: 'sac-weekender-aethel-cuir-cognac',
            descriptionFr:
              'Confectionné en cuir de veau pleine fleur au tannage végétal lent, bouclerie en laiton massif brossé et doublure en lin naturel.',
            descriptionEn:
              'Crafted from vegetable-tanned full-grain cognac leather with solid brushed brass hardware and linen lining.',
            descriptionAr:
              'مصنوعة يدوياً من الجلد الطبيعي المدبوغ نباتياً مع إكسسوارات من النحاس المصقول وبطانة من الكتان.',
            sku: 'AET-BAG-002',
            barcode: '611124500102',
            priceMad: '3400.00',
            compareAtPriceMad: '3900.00',
            currency: 'MAD',
            imageUrl: '/src/assets/images/product_leather_weekender_1793993181656.jpg',
            status: 'published',
            featured: true,
            isNew: false,
            isBestseller: true,
            rating: '4.92',
            reviewCount: 64,
            deliveryEstimateDays: '2-4 jours ouvrés',
          },
          {
            storeId: storeBotanica,
            categoryId: catBotanique,
            brandId: insertedBrands[2].id,
            titleFr: 'Sérum Botanique N°01 — Élixir Figue de Barbarie & Néroli',
            titleEn: 'Botanical Serum No. 01 — Prickly Pear & Neroli Elixir',
            titleAr: 'سيروم نباتي رقم 01 — إكسير التين الشوكي وزهر البرتقال',
            slug: 'serum-botanique-01-figue-barbarie-neroli',
            descriptionFr:
              'Concentré régénérant pressé à froid, riche en vitamine E naturelle et stérols essentiels. Flacon verre ambré anti-UV 30 ml.',
            descriptionEn:
              'Cold-pressed regenerating botanical serum rich in natural Vitamin E and essential sterols in 30ml UV amber glass.',
            descriptionAr:
              'سيروم مجدد للبشرة معصور على البارد غني بفيتامين E الطبيعي وزهر البرتقال في زجاجة كهرمان 30 مل.',
            sku: 'OUR-SER-001',
            barcode: '611124500103',
            priceMad: '780.00',
            compareAtPriceMad: '920.00',
            currency: 'MAD',
            imageUrl: '/src/assets/images/product_argan_elixir_1793993179934.jpg',
            status: 'published',
            featured: true,
            isNew: true,
            isBestseller: true,
            rating: '4.96',
            reviewCount: 83,
            deliveryEstimateDays: '1-2 jours ouvrés',
          },
          {
            storeId: storeChrono,
            categoryId: catHorlogerie,
            brandId: insertedBrands[3].id,
            titleFr: 'Montre Automatique Horizon en Titane Brossé 40mm',
            titleEn: 'Horizon Brushed Titanium Automatic Watch 40mm',
            titleAr: 'ساعة أفق أوتوماتيكية من التيتانيوم المصقول 40 مم',
            slug: 'montre-automatique-horizon-titane-40mm',
            descriptionFr:
              'Mouvement automatique calibre suisse, boîtier en titane grade 5 sablé, verre saphir bombé antireflet et bracelet en cuir suédé anthracite.',
            descriptionEn:
              'Swiss automatic movement, grade-5 brushed titanium case, domed sapphire crystal, and anthracite suede strap.',
            descriptionAr:
              'حركة أوتوماتيكية سويسرية، هيكل من التيتانيوم المصقول من الدرجة الخامسة وزجاج ياقوتي مقاوم للانعكاس.',
            sku: 'CHR-WAT-004',
            barcode: '611124500104',
            priceMad: '6800.00',
            compareAtPriceMad: '7500.00',
            currency: 'MAD',
            imageUrl: '/src/assets/images/product_chronograph_watch_1793993240174.jpg',
            status: 'published',
            featured: true,
            isNew: true,
            isBestseller: false,
            rating: '4.89',
            reviewCount: 29,
            deliveryEstimateDays: '2-4 jours ouvrés',
          },
          {
            storeId: storeAtelier,
            categoryId: catCeramique,
            brandId: insertedBrands[0].id,
            titleFr: 'Fauteuil Lounge Architectural en Chêne Massif & Lin',
            titleEn: 'Architectural Solid Oak & Linen Lounge Chair',
            titleAr: 'كرسي استرخاء معماري من خشب البلوط الصلب والكتان',
            slug: 'fauteuil-lounge-architectural-chene-lin',
            descriptionFr:
              'Structure sculpturale assemblée par tenons et mortaises en chêne certifié, assise tapissée en lin lavé naturel avec repose-pieds.',
            descriptionEn:
              'Sculptural mortise-and-tenon solid oak lounge chair upholstered in natural washed Belgian linen with matching ottoman.',
            descriptionAr:
              'هيكل نحتي من خشب البلوط الطبيعي الصلب منجد بالكتان المغسول الفاخر مع مسند قدم مطابق.',
            sku: 'ASG-CHA-005',
            barcode: '611124500105',
            priceMad: '8900.00',
            compareAtPriceMad: '9800.00',
            currency: 'MAD',
            imageUrl: '/src/assets/images/hero_architectural_marketplace_1793993180020.jpg',
            status: 'published',
            featured: true,
            isNew: false,
            isBestseller: true,
            rating: '4.97',
            reviewCount: 19,
            deliveryEstimateDays: '5-7 jours ouvrés',
          },
          {
            storeId: storeChrono,
            categoryId: catCeramique,
            brandId: insertedBrands[3].id,
            titleFr: 'Lampadaire Articulé en Laiton Brossé Atelier',
            titleEn: 'Articulated Brushed Brass Studio Floor Lamp',
            titleAr: 'مصباح أرضي مفصلي من النحاس المصقول',
            slug: 'lampadaire-articule-laiton-brosse',
            descriptionFr:
              'Balancier minimaliste en laiton massif non verni qui se patine avec le temps, socle cylindrique lesté et éclairage chaud 2700K.',
            descriptionEn:
              'Minimalist unlacquered solid brass articulated arm lamp with weighted cylindrical base and warm 2700K illumination.',
            descriptionAr:
              'مصباح بتصميم هندسي بسيط من النحاس الصلب غير المطلي مع قاعدة أسطوانية موزونة وإضاءة دافئة.',
            sku: 'CHR-LMP-006',
            barcode: '611124500106',
            priceMad: '4200.00',
            compareAtPriceMad: null,
            currency: 'MAD',
            imageUrl: '/src/assets/images/hero_architectural_marketplace_1793993180020.jpg',
            status: 'published',
            featured: false,
            isNew: true,
            isBestseller: false,
            rating: '4.86',
            reviewCount: 24,
            deliveryEstimateDays: '3-5 jours ouvrés',
          },
        ])
        .returning();

      for (const prod of insertedProducts) {
        await db.insert(productImages).values({
          productId: prod.id,
          url: prod.imageUrl,
          altText: prod.titleFr,
          position: 1,
        });

        const variant = await db
          .insert(productVariants)
          .values([
            {
              productId: prod.id,
              title: 'Édition Originale / Standard',
              color: 'Naturel Minéral',
              size: 'Standard',
              sku: `${prod.sku}-STD`,
              priceMad: prod.priceMad,
              stockQuantity: 18,
            },
            {
              productId: prod.id,
              title: 'Série Limitée / Grand Format',
              color: 'Terre d’Ombre',
              size: 'Grand',
              sku: `${prod.sku}-LRG`,
              priceMad: String(Number(prod.priceMad) + 250),
              stockQuantity: 9,
            },
          ])
          .returning();

        await db.insert(inventory).values({
          productId: prod.id,
          variantId: variant[0].id,
          quantityAvailable: 27,
          reservedQuantity: 2,
          lowStockThreshold: 5,
          warehouseLocation: 'Casablanca Logistique Hub',
        });
      }

      // 7. Seed Shipping Methods
      await db.insert(shippingMethods).values([
        {
          name: 'Amana Express National',
          carrier: 'Barid Al-Maghrib / Amana',
          zone: 'Maroc (Toutes villes)',
          estimatedDays: '24h - 48h',
          baseFeeMad: '45.00',
          freeShippingThresholdMad: '1500.00',
          active: true,
        },
        {
          name: 'Aramex Prioritaire & International',
          carrier: 'Aramex Global',
          zone: 'Maroc, Europe & International',
          estimatedDays: '2 - 4 jours ouvrés',
          baseFeeMad: '90.00',
          freeShippingThresholdMad: '2500.00',
          active: true,
        },
        {
          name: 'Coursier Privé Gants Blancs',
          carrier: 'Atlas Conciergerie',
          zone: 'Casablanca, Rabat & Marrakech',
          estimatedDays: 'Livraison le jour même',
          baseFeeMad: '120.00',
          freeShippingThresholdMad: '4000.00',
          active: true,
        },
      ]);

      // 8. Seed Coupons
      await db.insert(coupons).values([
        {
          code: 'ATLAS15',
          description: '15% de réduction dès 1 000 MAD d’achat sur toute la marketplace',
          discountType: 'percentage',
          discountValue: '15.00',
          minOrderMad: '1000.00',
          usageLimit: 500,
          usedCount: 38,
          active: true,
        },
        {
          code: 'BIENVENUE200',
          description: '200 MAD offerts sur votre première commande dès 1 500 MAD',
          discountType: 'fixed',
          discountValue: '200.00',
          minOrderMad: '1500.00',
          usageLimit: 250,
          usedCount: 14,
          active: true,
        },
      ]);

      // 9. Seed Reviews
      await db.insert(reviews).values([
        {
          productId: insertedProducts[0].id,
          userUid: 'admin_atlas_01',
          authorName: 'Nadia Chraïbi — Architecte d’intérieur, Casablanca',
          rating: 5,
          title: 'Qualité muséale et emballage irréprochable',
          comment:
            'J’ai commandé deux trios pour un projet résidentiel à Anfa. La texture du grès et la teinte terracotta captent la lumière exactement comme annoncé. Livraison en 48h.',
          verifiedPurchase: true,
        },
        {
          productId: insertedProducts[1].id,
          userUid: 'vendor_botanica_02',
          authorName: 'Omar Kettani — Associé Cabinet Conseil, Rabat',
          rating: 5,
          title: 'Un cuir pleine fleur qui rivalise avec les grandes maisons',
          comment:
            'Coutures sellier d’une grande finesse et fermetures en laiton massif très solides. Format idéal en cabine.',
          verifiedPurchase: true,
        },
        {
          productId: insertedProducts[2].id,
          userUid: 'vendor_horlogerie_03',
          authorName: 'Leïla Amrani — Directrice Artistique, Paris',
          rating: 5,
          title: 'Texture sèche et parfum botanique subtil',
          comment:
            'Le sérum pénètre instantanément sans film gras. On sent la pureté de l’huile de pépins de figue de Barbarie.',
          verifiedPurchase: true,
        },
      ]);

      // 10. Seed Initial Orders, Order Items, Payments, Wallets & Vendor Applications
      const demoCustomer = await db
        .insert(customers)
        .values({
          userUid: 'admin_atlas_01',
          email: 'nadia.chraibi@studio-anfa.ma',
          fullName: 'Nadia Chraïbi',
          phone: '+212 6 61 88 99 00',
          totalOrders: 2,
          totalSpentMad: '5050.00',
        })
        .returning();

      await db.insert(customerAddresses).values({
        customerId: demoCustomer[0].id,
        userUid: 'admin_atlas_01',
        label: 'Cabinet Architecture Anfa',
        recipientName: 'Nadia Chraïbi',
        phone: '+212 6 61 88 99 00',
        streetAddress: '42 Boulevard d’Anfa, Résidence Les Iris',
        city: 'Casablanca',
        postalCode: '20050',
        country: 'Maroc',
        isDefault: true,
      });

      const order1 = await db
        .insert(orders)
        .values({
          orderNumber: 'ORD-2026-1042',
          userUid: 'admin_atlas_01',
          customerEmail: 'nadia.chraibi@studio-anfa.ma',
          customerName: 'Nadia Chraïbi',
          customerPhone: '+212 6 61 88 99 00',
          shippingAddress: '42 Boulevard d’Anfa, Résidence Les Iris',
          shippingCity: 'Casablanca',
          shippingPostalCode: '20050',
          shippingCountry: 'Maroc',
          shippingMethodName: 'Amana Express National',
          paymentGateway: 'COD',
          paymentStatus: 'pending',
          orderStatus: 'shipped',
          currency: 'MAD',
          subtotalMad: '5050.00',
          discountMad: '0.00',
          shippingMad: '0.00',
          taxMad: '841.67',
          totalMad: '5050.00',
          trackingNumber: 'AMN-94820144-MA',
        })
        .returning();

      const item1 = await db
        .insert(orderItems)
        .values({
          orderId: order1[0].id,
          productId: insertedProducts[0].id,
          storeId: storeAtelier,
          productTitle: insertedProducts[0].titleFr,
          variantTitle: 'Édition Originale / Standard',
          sku: insertedProducts[0].sku,
          quantity: 1,
          unitPriceMad: '1650.00',
          subtotalMad: '1650.00',
          commissionMad: '198.00',
          vendorNetMad: '1452.00',
          fulfillmentStatus: 'shipped',
          trackingNumber: 'AMN-94820144-MA',
        })
        .returning();

      const item2 = await db
        .insert(orderItems)
        .values({
          orderId: order1[0].id,
          productId: insertedProducts[1].id,
          storeId: storeAtelier,
          productTitle: insertedProducts[1].titleFr,
          variantTitle: 'Édition Originale / Standard',
          sku: insertedProducts[1].sku,
          quantity: 1,
          unitPriceMad: '3400.00',
          subtotalMad: '3400.00',
          commissionMad: '408.00',
          vendorNetMad: '2992.00',
          fulfillmentStatus: 'shipped',
          trackingNumber: 'AMN-94820144-MA',
        })
        .returning();

      await db.insert(commissions).values([
        {
          orderItemId: item1[0].id,
          storeId: storeAtelier,
          ratePercentage: '12.00',
          platformFeeMad: '198.00',
          vendorNetMad: '1452.00',
          status: 'settled',
        },
        {
          orderItemId: item2[0].id,
          storeId: storeAtelier,
          ratePercentage: '12.00',
          platformFeeMad: '408.00',
          vendorNetMad: '2992.00',
          status: 'settled',
        },
      ]);

      const pay1 = await db
        .insert(payments)
        .values({
          orderId: order1[0].id,
          gateway: 'COD',
          idempotencyKey: 'idem_cod_ord20261042',
          transactionReference: 'COD-REC-849201A9',
          amountMad: '5050.00',
          currency: 'MAD',
          status: 'PENDING',
          sandboxMode: false,
          signatureVerified: true,
        })
        .returning();

      await db.insert(paymentEvents).values({
        paymentId: pay1[0].id,
        eventType: 'cod.order_registered',
        payload: {
          gateway: 'COD',
          orderNumber: 'ORD-2026-1042',
          verifiedSignature: true,
          timestamp: new Date().toISOString(),
        },
      });

      await db.insert(shipments).values({
        orderId: order1[0].id,
        storeId: storeAtelier,
        carrier: 'Barid Al-Maghrib / Amana',
        trackingNumber: 'AMN-94820144-MA',
        status: 'in_transit',
        estimatedDelivery: 'Demain avant 18h00',
      });

      // Seed Wallets for all 3 stores
      await db.insert(vendorWallets).values([
        {
          storeId: storeAtelier,
          availableBalanceMad: '18440.00',
          pendingBalanceMad: '4444.00',
          totalEarnedMad: '42800.00',
          totalWithdrawnMad: '19916.00',
        },
        {
          storeId: storeBotanica,
          availableBalanceMad: '9250.00',
          pendingBalanceMad: '1404.00',
          totalEarnedMad: '19650.00',
          totalWithdrawnMad: '8996.00',
        },
        {
          storeId: storeChrono,
          availableBalanceMad: '24100.00',
          pendingBalanceMad: '5848.00',
          totalEarnedMad: '54200.00',
          totalWithdrawnMad: '24252.00',
        },
      ]);

      await db.insert(payoutRequests).values([
        {
          storeId: storeAtelier,
          amountMad: '8500.00',
          bankName: 'Attijariwafa Bank',
          ibanMasked: 'MA64 **** **** **** **** 4921',
          status: 'pending',
          adminNotes: 'Vérification comptable mensuelle en cours',
        },
        {
          storeId: storeBotanica,
          amountMad: '5200.00',
          bankName: 'Banque Populaire',
          ibanMasked: 'MA64 **** **** **** **** 8810',
          status: 'paid',
          adminNotes: 'Virement bancaire exécuté réf VIR-9012',
        },
      ]);

      await db.insert(vendorApplications).values([
        {
          applicantUid: 'applicant_tapis_01',
          applicantName: 'Zineb Alaoui',
          applicantEmail: 'zineb@azilal-tissage.ma',
          storeName: ' Coopérative Tissage Azilal Contemporain',
          storeSlug: 'azilal-tissage-contemporain',
          categoryFocus: 'Mobilier & Céramique',
          city: 'Azilal / Marrakech',
          taxId: 'ICE-002948192000045',
          description:
            'Tapis berbères contemporains noués à la main en laine vierge non teintée du Haut Atlas.',
          status: 'pending',
        },
      ]);

      await db.insert(banners).values({
        titleFr: 'Livraison offerte dès 1 500 MAD · Code privilège ATLAS15 (-15%)',
        titleEn: 'Complimentary shipping over 1,500 MAD · Code ATLAS15 (-15% off)',
        titleAr: 'توصيل مجاني للطلبات فوق 1500 درهم · كود الخصم ATLAS15 (-15%)',
        subtitleFr: 'Artisanat & Design Vérifiés · Paiement à la livraison (COD Uniquement)',
        ctaTextFr: 'Explorer la Collection',
        linkUrl: '/catalog',
        active: true,
        position: 'top_bar',
      });

      await db.insert(settings).values([
        {
          key: 'platform_config',
          value: {
            siteName: 'Maison Atlas',
            primaryCurrency: 'MAD',
            defaultCommissionPercent: 12,
            taxRatePercent: 20,
            freeShippingThresholdMad: 1500,
            supportEmail: 'conciergerie@maison-atlas.ma',
            supportPhone: '+212 5 22 90 10 20',
            enabledGateways: ['COD'],
          },
        },
      ]);

      await db.insert(auditLogs).values({
        actorUid: 'admin_atlas_01',
        actorRole: 'admin',
        action: 'PLATFORM_INITIALIZED',
        entityType: 'system',
        entityId: '1',
        metadata: { version: '2026.1', tables: 36 },
      });

      await ensureExtendedCategoriesAndAttachedProducts();
    } catch (error) {
      console.error('Failed to seed initial marketplace data:', error);
    }
  })();

  return seedPromise;
}

export async function createCategory(input: {
  nameFr: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
}) {
  try {
    const slug =
      input.nameFr
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Math.floor(100 + Math.random() * 900);

    const inserted = await db
      .insert(categories)
      .values({
        nameFr: input.nameFr.trim(),
        nameEn: (input.nameEn || input.nameFr).trim(),
        nameAr: (input.nameAr || input.nameFr).trim(),
        slug,
        description: (input.description || 'Catégorie spécialisée Maison Atlas.').trim(),
        featured: true,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createCategory:', error);
    throw new Error('Impossible de créer la catégorie.', { cause: error });
  }
}

export async function getOrCreateProfile(uid: string, email: string, fullName?: string) {
  try {
    const result = await db
      .insert(profiles)
      .values({
        uid,
        email,
        fullName: fullName || email.split('@')[0],
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    const profile = result[0];
    const existingRoles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userUid, uid));

    if (existingRoles.length === 0) {
      await db.insert(userRoles).values({
        userUid: uid,
        role: 'customer',
      });
    }

    const roles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userUid, uid));

    return {
      profile,
      roles: roles.map((r) => r.role),
    };
  } catch (error) {
    console.error('Database query failed in getOrCreateProfile:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getBootstrapData() {
  try {
    await ensureSeedData();
    const { vendorReviews, vendorFaqs } = await ensureVendorReviewsAndFaqs();

    const [
      allCategories,
      allBrands,
      allStores,
      allProducts,
      allVariants,
      allInventory,
      allReviews,
      allShippingMethods,
      allCoupons,
      allRates,
      allBanners,
      allSettings,
    ] = await Promise.all([
      db.select().from(categories),
      db.select().from(brands),
      db.select().from(stores),
      db.select().from(products).orderBy(desc(products.id)),
      db.select().from(productVariants),
      db.select().from(inventory),
      db.select().from(reviews).orderBy(desc(reviews.createdAt)),
      db.select().from(shippingMethods),
      db.select().from(coupons),
      db.select().from(exchangeRates),
      db.select().from(banners),
      db.select().from(settings),
    ]);

    return {
      categories: allCategories,
      brands: allBrands,
      stores: allStores,
      products: allProducts,
      variants: allVariants,
      inventory: allInventory,
      reviews: allReviews,
      vendorReviews,
      vendorFaqs,
      shippingMethods: allShippingMethods,
      coupons: allCoupons,
      exchangeRates: allRates,
      banners: allBanners,
      settings: allSettings[0]?.value || {},
    };
  } catch (error) {
    console.error('Database query failed in getBootstrapData:', error);
    throw new Error('Failed to load marketplace catalog data.', { cause: error });
  }
}

export async function getDashboardData() {
  try {
    await ensureAuthCredentialsMap();
    const [
      allOrders,
      allOrderItems,
      allPayments,
      allPaymentEvents,
      allRefunds,
      allCommissions,
      allWallets,
      allPayouts,
      allVendorApps,
      allCustomers,
      allAddresses,
      allShipments,
      allAuditLogs,
      allProfiles,
    ] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems).orderBy(desc(orderItems.id)),
      db.select().from(payments).orderBy(desc(payments.createdAt)),
      db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)),
      db.select().from(refunds).orderBy(desc(refunds.createdAt)),
      db.select().from(commissions).orderBy(desc(commissions.createdAt)),
      db.select().from(vendorWallets),
      db.select().from(payoutRequests).orderBy(desc(payoutRequests.requestedAt)),
      db.select().from(vendorApplications).orderBy(desc(vendorApplications.createdAt)),
      db.select().from(customers).orderBy(desc(customers.createdAt)),
      db.select().from(customerAddresses),
      db.select().from(shipments),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(30),
      db.select().from(profiles),
    ]);

    return {
      orders: allOrders,
      orderItems: allOrderItems,
      payments: allPayments,
      paymentEvents: allPaymentEvents,
      refunds: allRefunds,
      commissions: allCommissions,
      wallets: allWallets,
      payoutRequests: allPayouts,
      vendorApplications: allVendorApps,
      customers: allCustomers,
      addresses: allAddresses,
      shipments: allShipments,
      auditLogs: allAuditLogs,
      profiles: allProfiles,
    };
  } catch (error) {
    console.error('Database query failed in getDashboardData:', error);
    throw new Error('Failed to fetch dashboard operations data.', { cause: error });
  }
}

export async function createMarketplaceOrder(input: {
  userUid?: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingMethodId: number;
  paymentGateway: PaymentGatewayCode;
  currency: SupportedCurrency;
  couponCode?: string | null;
  notes?: string;
  items: Array<{
    productId: number;
    variantTitle?: string;
    quantity: number;
  }>;
}) {
  try {
    const allProducts = await db.select().from(products);
    const allStores = await db.select().from(stores);
    const allShipping = await db.select().from(shippingMethods);
    const allCoupons = await db.select().from(coupons);

    const shippingMethod =
      allShipping.find((s) => s.id === input.shippingMethodId) || allShipping[0];

    const matchedCoupon = input.couponCode
      ? allCoupons.find(
          (c) => c.code.toUpperCase() === input.couponCode!.trim().toUpperCase() && c.active
        )
      : undefined;

    const calcItems = input.items.map((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      const store = allStores.find((s) => s.id === product.storeId);
      return {
        product,
        store,
        variantTitle: item.variantTitle || 'Édition Originale / Standard',
        quantity: item.quantity,
        unitPriceMad: Number(product.priceMad),
        commissionRatePercent: store ? Number(store.commissionRate) : 12,
      };
    });

    const financials = calculateOrderFinancials({
      items: calcItems.map((ci) => ({
        productId: ci.product.id,
        storeId: ci.product.storeId,
        unitPriceMad: ci.unitPriceMad,
        quantity: ci.quantity,
        commissionRatePercent: ci.commissionRatePercent,
      })),
      coupon: matchedCoupon
        ? {
            code: matchedCoupon.code,
            discountType: matchedCoupon.discountType as 'percentage' | 'fixed',
            discountValue: Number(matchedCoupon.discountValue),
            minOrderMad: Number(matchedCoupon.minOrderMad),
            active: matchedCoupon.active,
          }
        : null,
      shipping: {
        baseFeeMad: shippingMethod ? Number(shippingMethod.baseFeeMad) : 45,
        freeShippingThresholdMad: shippingMethod
          ? Number(shippingMethod.freeShippingThresholdMad)
          : 1500,
      },
      taxRatePercent: 20,
    });

    // Validation serveur stricte : Ne jamais faire confiance au frontend, imposer COD
    const codCheck = validateCodPaymentMethod(input.paymentGateway || 'COD');
    if (!codCheck.valid) {
      throw new Error(codCheck.error);
    }

    const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentResult = processPaymentWithAdapter({
      gateway: codCheck.gateway,
      orderNumber,
      amountMad: financials.totalMad,
      currency: input.currency,
    });

    const trackingNumber = `TRK-${Math.floor(10000000 + Math.random() * 89999999)}-MA`;

    const insertedOrder = await db
      .insert(orders)
      .values({
        orderNumber,
        userUid: input.userUid || null,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingPostalCode: input.shippingPostalCode,
        shippingCountry: input.shippingCountry || 'Maroc',
        shippingMethodName: shippingMethod?.name || 'Amana Express National',
        paymentGateway: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'confirmed',
        currency: input.currency,
        subtotalMad: String(financials.subtotalMad),
        discountMad: String(financials.discountMad),
        shippingMad: String(financials.shippingMad),
        taxMad: String(financials.taxMad),
        totalMad: String(financials.totalMad),
        couponCode: matchedCoupon ? matchedCoupon.code : null,
        trackingNumber,
        notes: input.notes || '',
      })
      .returning();

    const createdOrder = insertedOrder[0];

    for (const ci of calcItems) {
      const split = calculateItemCommission(
        ci.unitPriceMad,
        ci.quantity,
        ci.commissionRatePercent
      );

      const insertedItem = await db
        .insert(orderItems)
        .values({
          orderId: createdOrder.id,
          productId: ci.product.id,
          storeId: ci.product.storeId,
          productTitle: ci.product.titleFr,
          variantTitle: ci.variantTitle,
          sku: ci.product.sku,
          quantity: ci.quantity,
          unitPriceMad: String(ci.unitPriceMad),
          subtotalMad: String(split.subtotalMad),
          commissionMad: String(split.commissionMad),
          vendorNetMad: String(split.vendorNetMad),
          fulfillmentStatus: 'accepted',
          trackingNumber,
        })
        .returning();

      await db.insert(commissions).values({
        orderItemId: insertedItem[0].id,
        storeId: ci.product.storeId,
        ratePercentage: String(ci.commissionRatePercent),
        platformFeeMad: String(split.commissionMad),
        vendorNetMad: String(split.vendorNetMad),
        status: 'pending',
      });

      // Update vendor wallet balance (pending until COD payment is confirmed PAID)
      const existingWallets = await db
        .select()
        .from(vendorWallets)
        .where(eq(vendorWallets.storeId, ci.product.storeId));

      if (existingWallets.length > 0) {
        const w = existingWallets[0];
        await db
          .update(vendorWallets)
          .set({
            pendingBalanceMad: String(Number(w.pendingBalanceMad) + split.vendorNetMad),
            totalEarnedMad: String(Number(w.totalEarnedMad) + split.vendorNetMad),
            updatedAt: new Date(),
          })
          .where(eq(vendorWallets.id, w.id));
      }
    }

    const insertedPayment = await db
      .insert(payments)
      .values({
        orderId: createdOrder.id,
        gateway: 'COD',
        idempotencyKey: paymentResult.idempotencyKey,
        transactionReference: paymentResult.transactionReference,
        amountMad: String(financials.totalMad),
        currency: input.currency,
        status: 'PENDING',
        sandboxMode: false,
        signatureVerified: paymentResult.signatureVerified,
      })
      .returning();

    await db.insert(paymentEvents).values({
      paymentId: insertedPayment[0].id,
      eventType: 'cod.order_registered',
      payload: paymentResult.eventPayload,
    });

    await db.insert(shipments).values({
      orderId: createdOrder.id,
      storeId: calcItems[0]?.product.storeId || null,
      carrier: shippingMethod?.carrier || 'Barid Al-Maghrib / Amana',
      trackingNumber,
      status: 'preparing',
      estimatedDelivery: shippingMethod?.estimatedDays || '24h - 48h',
    });

    if (matchedCoupon) {
      await db.insert(couponRedemptions).values({
        couponId: matchedCoupon.id,
        orderId: createdOrder.id,
        userUid: input.userUid || null,
        discountAppliedMad: String(financials.discountMad),
      });
      await db
        .update(coupons)
        .set({ usedCount: matchedCoupon.usedCount + 1 })
        .where(eq(coupons.id, matchedCoupon.id));
    }

    await db.insert(auditLogs).values({
      actorUid: input.userUid || 'guest_checkout',
      actorRole: 'customer',
      action: 'ORDER_CREATED',
      entityType: 'order',
      entityId: String(createdOrder.id),
      metadata: {
        orderNumber,
        gateway: input.paymentGateway,
        totalMad: financials.totalMad,
      },
    });

    return {
      order: createdOrder,
      payment: insertedPayment[0],
      financials,
    };
  } catch (error) {
    console.error('Database query failed in createMarketplaceOrder:', error);
    throw new Error('Failed to create order and process payment.', { cause: error });
  }
}

export async function createVendorProduct(input: {
  storeId: number;
  categoryId: number;
  titleFr: string;
  titleEn?: string;
  titleAr?: string;
  descriptionFr: string;
  sku: string;
  priceMad: number;
  compareAtPriceMad?: number | null;
  imageUrl?: string;
  stockQuantity?: number;
  status?: string;
}) {
  try {
    const slug = `${input.titleFr
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const imageUrl =
      input.imageUrl && input.imageUrl.trim().length > 0
        ? input.imageUrl.trim()
        : '/src/assets/images/product_ceramic_vase_1793993182524.jpg';

    const inserted = await db
      .insert(products)
      .values({
        storeId: input.storeId,
        categoryId: input.categoryId,
        titleFr: input.titleFr,
        titleEn: input.titleEn || input.titleFr,
        titleAr: input.titleAr || input.titleFr,
        slug,
        descriptionFr: input.descriptionFr,
        descriptionEn: input.descriptionFr,
        descriptionAr: input.descriptionFr,
        sku: input.sku,
        priceMad: String(input.priceMad),
        compareAtPriceMad: input.compareAtPriceMad ? String(input.compareAtPriceMad) : null,
        currency: 'MAD',
        imageUrl,
        status: input.status || 'published',
        featured: true,
        isNew: true,
      })
      .returning();

    const prod = inserted[0];

    const variant = await db
      .insert(productVariants)
      .values({
        productId: prod.id,
        title: 'Édition Originale / Standard',
        color: 'Naturel',
        size: 'Standard',
        sku: `${prod.sku}-STD`,
        priceMad: prod.priceMad,
        stockQuantity: input.stockQuantity ?? 15,
      })
      .returning();

    await db.insert(inventory).values({
      productId: prod.id,
      variantId: variant[0].id,
      quantityAvailable: input.stockQuantity ?? 15,
      reservedQuantity: 0,
      lowStockThreshold: 5,
      warehouseLocation: 'Casablanca Hub',
    });

    return prod;
  } catch (error) {
    console.error('Database query failed in createVendorProduct:', error);
    throw new Error('Failed to create product.', { cause: error });
  }
}

export async function deleteVendorProduct(productId: number) {
  try {
    await db.delete(products).where(eq(products.id, productId));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteVendorProduct:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export async function updateOrderStatusAndTracking(input: {
  orderId: number;
  orderStatus: string;
  trackingNumber?: string;
}) {
  try {
    const updated = await db
      .update(orders)
      .set({
        orderStatus: input.orderStatus,
        trackingNumber: input.trackingNumber ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, input.orderId))
      .returning();

    await db
      .update(orderItems)
      .set({
        fulfillmentStatus: input.orderStatus,
        trackingNumber: input.trackingNumber ?? undefined,
      })
      .where(eq(orderItems.orderId, input.orderId));

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateOrderStatusAndTracking:', error);
    throw new Error('Failed to update order status.', { cause: error });
  }
}

export async function updateOrderPaymentStatus(input: {
  orderId: number;
  paymentStatus: CodPaymentStatus;
  actorUid?: string;
}) {
  try {
    const cleanStatus: CodPaymentStatus =
      input.paymentStatus === 'PAID'
        ? 'PAID'
        : input.paymentStatus === 'FAILED'
          ? 'FAILED'
          : 'PENDING';

    const updatedOrders = await db
      .update(orders)
      .set({
        paymentGateway: 'COD',
        paymentStatus: cleanStatus,
        orderStatus: cleanStatus === 'PAID' ? 'delivered' : undefined,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, input.orderId))
      .returning();

    if (updatedOrders.length === 0) {
      throw new Error('Commande introuvable.');
    }

    const ord = updatedOrders[0];

    const updatedPayments = await db
      .update(payments)
      .set({
        gateway: 'COD',
        status: cleanStatus,
      })
      .where(eq(payments.orderId, input.orderId))
      .returning();

    let paymentRecord = updatedPayments[0];
    if (!paymentRecord) {
      const createdPay = await db
        .insert(payments)
        .values({
          orderId: ord.id,
          gateway: 'COD',
          idempotencyKey: `idem_cod_${ord.id}_${Date.now()}`,
          transactionReference: `COD-REC-${ord.orderNumber}`,
          amountMad: ord.totalMad,
          currency: ord.currency,
          status: cleanStatus,
          sandboxMode: false,
          signatureVerified: true,
        })
        .returning();
      paymentRecord = createdPay[0];
    }

    const eventType =
      cleanStatus === 'PAID'
        ? 'cod.payment_confirmed_paid'
        : cleanStatus === 'FAILED'
          ? 'cod.payment_failed'
          : 'cod.payment_pending';

    await db.insert(paymentEvents).values({
      paymentId: paymentRecord.id,
      eventType,
      payload: {
        gateway: 'COD',
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        paymentStatus: cleanStatus,
        amountMad: ord.totalMad,
        confirmedBy: input.actorUid || 'admin_atlas_01',
        timestamp: new Date().toISOString(),
      },
    });

    await db.insert(auditLogs).values({
      actorUid: input.actorUid || 'admin_atlas_01',
      actorRole: 'admin',
      action: `COD_PAYMENT_${cleanStatus}`,
      entityType: 'order',
      entityId: String(ord.id),
      metadata: {
        orderNumber: ord.orderNumber,
        paymentMethod: 'COD',
        paymentStatus: cleanStatus,
        totalMad: ord.totalMad,
      },
    });

    return {
      order: ord,
      payment: paymentRecord,
    };
  } catch (error) {
    console.error('Database query failed in updateOrderPaymentStatus:', error);
    throw new Error('Impossible de mettre à jour le statut de paiement COD.', { cause: error });
  }
}

export async function createVendorPayoutRequest(input: {
  storeId: number;
  amountMad: number;
  bankName: string;
  ibanMasked: string;
}) {
  try {
    const inserted = await db
      .insert(payoutRequests)
      .values({
        storeId: input.storeId,
        amountMad: String(input.amountMad),
        bankName: input.bankName,
        ibanMasked: input.ibanMasked,
        status: 'pending',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createVendorPayoutRequest:', error);
    throw new Error('Failed to submit payout request.', { cause: error });
  }
}

export async function updatePayoutStatus(payoutId: number, status: string) {
  try {
    const updated = await db
      .update(payoutRequests)
      .set({
        status,
        processedAt: new Date(),
      })
      .where(eq(payoutRequests.id, payoutId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updatePayoutStatus:', error);
    throw new Error('Failed to update payout status.', { cause: error });
  }
}

export async function submitVendorApplication(input: {
  applicantName: string;
  applicantEmail: string;
  storeName: string;
  categoryFocus: string;
  city: string;
  taxId: string;
  description: string;
}) {
  try {
    const storeSlug = input.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const inserted = await db
      .insert(vendorApplications)
      .values({
        applicantUid: `vendor_${Date.now()}`,
        applicantName: input.applicantName,
        applicantEmail: input.applicantEmail,
        storeName: input.storeName,
        storeSlug,
        categoryFocus: input.categoryFocus,
        city: input.city,
        taxId: input.taxId,
        description: input.description,
        status: 'pending',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in submitVendorApplication:', error);
    throw new Error('Failed to submit vendor application.', { cause: error });
  }
}

export async function reviewVendorApplication(applicationId: number, status: 'approved' | 'rejected') {
  try {
    const updated = await db
      .update(vendorApplications)
      .set({ status })
      .where(eq(vendorApplications.id, applicationId))
      .returning();

    const app = updated[0];
    if (app && status === 'approved') {
      await db
        .insert(profiles)
        .values({
          uid: app.applicantUid,
          email: app.applicantEmail,
          fullName: app.applicantName,
        })
        .onConflictDoNothing();

      const newStore = await db
        .insert(stores)
        .values({
          ownerUid: app.applicantUid,
          name: app.storeName,
          slug: `${app.storeSlug}-${Math.floor(100 + Math.random() * 900)}`,
          description: app.description,
          city: app.city,
          country: 'Maroc',
          commissionRate: '12.00',
          status: 'active',
          verified: true,
        })
        .returning();

      await db.insert(vendorWallets).values({
        storeId: newStore[0].id,
        availableBalanceMad: '0.00',
        pendingBalanceMad: '0.00',
        totalEarnedMad: '0.00',
        totalWithdrawnMad: '0.00',
      });
    }

    return app;
  } catch (error) {
    console.error('Database query failed in reviewVendorApplication:', error);
    throw new Error('Failed to review vendor application.', { cause: error });
  }
}

export async function createProductReview(input: {
  productId: number;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
}) {
  try {
    const cleanRating = Math.max(1, Math.min(5, input.rating));
    const inserted = await db
      .insert(reviews)
      .values({
        productId: input.productId,
        authorName: input.authorName,
        rating: cleanRating,
        title: input.title,
        comment: input.comment,
        verifiedPurchase: true,
      })
      .returning();

    const existingProd = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId));

    if (existingProd.length > 0) {
      const p = existingProd[0];
      const currentCount = p.reviewCount || 0;
      const currentRating = Number(p.rating) || 4.9;
      const newCount = currentCount + 1;
      const newAvg = ((currentRating * currentCount + cleanRating) / newCount).toFixed(2);
      await db
        .update(products)
        .set({
          reviewCount: newCount,
          rating: newAvg,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.productId));
    }

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createProductReview:', error);
    throw new Error('Failed to submit product review.', { cause: error });
  }
}

export async function createCouponCode(input: {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderMad: number;
}) {
  try {
    const inserted = await db
      .insert(coupons)
      .values({
        code: input.code.toUpperCase().trim(),
        description: input.description,
        discountType: input.discountType,
        discountValue: String(input.discountValue),
        minOrderMad: String(input.minOrderMad),
        active: true,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createCouponCode:', error);
    throw new Error('Failed to create coupon code.', { cause: error });
  }
}

export async function createReturnRefundRequest(input: {
  orderId: number;
  reason: string;
  amountMad: number;
}) {
  try {
    const inserted = await db
      .insert(refunds)
      .values({
        orderId: input.orderId,
        reason: input.reason,
        amountMad: String(input.amountMad),
        status: 'pending',
      })
      .returning();

    await db
      .update(orders)
      .set({ orderStatus: 'return_requested', updatedAt: new Date() })
      .where(eq(orders.id, input.orderId));

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createReturnRefundRequest:', error);
    throw new Error('Failed to request return/refund.', { cause: error });
  }
}

export async function updateStoreCommissionAndStatus(input: {
  storeId: number;
  commissionRate: number;
  status: string;
}) {
  try {
    const updated = await db
      .update(stores)
      .set({
        commissionRate: String(input.commissionRate),
        status: input.status,
      })
      .where(eq(stores.id, input.storeId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateStoreCommissionAndStatus:', error);
    throw new Error('Failed to update vendor store settings.', { cause: error });
  }
}

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(`atlas_salt_2026:${password}`)
    .digest('hex');
}

interface StoredCredentialRecord {
  uid: string;
  email: string;
  fullName: string;
  passwordHash: string;
  roles: Array<'customer' | 'vendor' | 'admin'>;
  storeId?: number | null;
}

const DEFAULT_CREDENTIALS: Record<string, StoredCredentialRecord> = {
  'client@maison-atlas.ma': {
    uid: 'client_atlas_01',
    email: 'client@maison-atlas.ma',
    fullName: 'Nadia Chraïbi',
    passwordHash: hashPassword('Client2026!'),
    roles: ['customer'],
    storeId: null,
  },
  'nadia.chraibi@studio-anfa.ma': {
    uid: 'client_atlas_01',
    email: 'nadia.chraibi@studio-anfa.ma',
    fullName: 'Nadia Chraïbi',
    passwordHash: hashPassword('Client2026!'),
    roles: ['customer'],
    storeId: null,
  },
  'vendeur@atelier-zellige.ma': {
    uid: 'vendor_atelier_01',
    email: 'vendeur@atelier-zellige.ma',
    fullName: 'Karim Benjelloun — Atelier Sidi Ghanem',
    passwordHash: hashPassword('Vendeur2026!'),
    roles: ['vendor', 'customer'],
    storeId: 1,
  },
  'contact@atelier-zellige.ma': {
    uid: 'vendor_atelier_01',
    email: 'contact@atelier-zellige.ma',
    fullName: 'Karim Benjelloun — Atelier Sidi Ghanem',
    passwordHash: hashPassword('Vendeur2026!'),
    roles: ['vendor', 'customer'],
    storeId: 1,
  },
  'studio@ourika-botanica.ma': {
    uid: 'vendor_botanica_02',
    email: 'studio@ourika-botanica.ma',
    fullName: 'Salma Berrada — Ourika Botanica',
    passwordHash: hashPassword('Vendeur2026!'),
    roles: ['vendor', 'customer'],
    storeId: 2,
  },
  'concierge@casa-chronographe.ma': {
    uid: 'vendor_horlogerie_03',
    email: 'concierge@casa-chronographe.ma',
    fullName: 'Mehdi Tazi — Casa Chronographe',
    passwordHash: hashPassword('Vendeur2026!'),
    roles: ['vendor', 'customer'],
    storeId: 3,
  },
  'admin@maison-atlas.ma': {
    uid: 'admin_atlas_01',
    email: 'admin@maison-atlas.ma',
    fullName: 'Yasmine El Fassi (Direction Générale)',
    passwordHash: hashPassword('Admin2026!'),
    roles: ['admin', 'vendor', 'customer'],
    storeId: null,
  },
  'direction@maison-atlas.ma': {
    uid: 'admin_atlas_01',
    email: 'direction@maison-atlas.ma',
    fullName: 'Yasmine El Fassi (Direction Générale)',
    passwordHash: hashPassword('Admin2026!'),
    roles: ['admin', 'vendor', 'customer'],
    storeId: null,
  },
};

let codNormalized = false;

async function ensureAuthCredentialsMap(): Promise<Record<string, StoredCredentialRecord>> {
  await ensureSeedData();

  if (!codNormalized) {
    codNormalized = true;
    try {
      await db.update(orders).set({ paymentGateway: 'COD' });
      await db.update(payments).set({ gateway: 'COD' });
    } catch {
      // ignore if already normalized
    }
  }

  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'auth_credentials_map'));

  if (existing.length === 0) {
    await db
      .insert(settings)
      .values({
        key: 'auth_credentials_map',
        value: DEFAULT_CREDENTIALS,
      })
      .onConflictDoNothing();
    return { ...DEFAULT_CREDENTIALS };
  }

  const storedMap = (existing[0].value || {}) as Record<string, StoredCredentialRecord>;
  return {
    ...DEFAULT_CREDENTIALS,
    ...storedMap,
  };
}

export async function authenticateWithEmailPassword(input: {
  email: string;
  password: string;
  workspace?: 'customer' | 'vendor' | 'admin';
}) {
  const cleanEmail = input.email.trim().toLowerCase();
  const credentialsMap = await ensureAuthCredentialsMap();
  const record = credentialsMap[cleanEmail];

  if (!record || record.passwordHash !== hashPassword(input.password)) {
    throw new Error('Identifiants invalides. Vérifiez votre adresse email et votre mot de passe.');
  }

  if (input.workspace === 'admin' && !record.roles.includes('admin')) {
    throw new Error(
      'Accès refusé : ce compte ne dispose pas des privilèges Administrateur. Utilisez admin@maison-atlas.ma.'
    );
  }

  if (
    input.workspace === 'vendor' &&
    !record.roles.includes('vendor') &&
    !record.roles.includes('admin')
  ) {
    throw new Error(
      'Accès refusé : ce compte est un compte Client. Connectez-vous avec un compte Vendeur (ex: vendeur@atelier-zellige.ma) ou créez une boutique.'
    );
  }

  await db
    .insert(profiles)
    .values({
      uid: record.uid,
      email: record.email,
      fullName: record.fullName,
    })
    .onConflictDoNothing();

  await db.insert(auditLogs).values({
    actorUid: record.uid,
    actorRole: record.roles[0] || 'customer',
    action: 'EMAIL_PASSWORD_LOGIN',
    entityType: 'auth_session',
    entityId: record.uid,
    metadata: { email: record.email, workspace: input.workspace || 'customer' },
  });

  return {
    uid: record.uid,
    email: record.email,
    displayName: record.fullName,
    roles: record.roles,
    storeId: record.storeId ?? null,
  };
}

export async function registerWithEmailPassword(input: {
  email: string;
  password: string;
  fullName: string;
  accountType: 'customer' | 'vendor';
  storeName?: string;
  city?: string;
}) {
  const cleanEmail = input.email.trim().toLowerCase();
  const credentialsMap = await ensureAuthCredentialsMap();

  if (credentialsMap[cleanEmail]) {
    throw new Error('Un compte existe déjà avec cette adresse email. Veuillez vous connecter.');
  }

  const uid = `${input.accountType}_${Date.now()}`;
  let createdStoreId: number | null = null;

  await db
    .insert(profiles)
    .values({
      uid,
      email: cleanEmail,
      fullName: input.fullName.trim(),
    })
    .onConflictDoNothing();

  const roles: Array<'customer' | 'vendor' | 'admin'> =
    input.accountType === 'vendor' ? ['vendor', 'customer'] : ['customer'];

  for (const r of roles) {
    await db.insert(userRoles).values({
      userUid: uid,
      role: r,
    });
  }

  if (input.accountType === 'vendor') {
    const storeTitle = (input.storeName || `Atelier ${input.fullName}`).trim();
    const slug = `${storeTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const insertedStore = await db
      .insert(stores)
      .values({
        ownerUid: uid,
        name: storeTitle,
        slug,
        description: `Manufacture partenaire créée par ${input.fullName.trim()}.`,
        city: (input.city || 'Casablanca').trim(),
        country: 'Maroc',
        rating: '5.00',
        reviewCount: 1,
        commissionRate: '12.00',
        status: 'active',
        verified: true,
      })
      .returning();

    createdStoreId = insertedStore[0].id;

    await db.insert(vendorWallets).values({
      storeId: createdStoreId,
      availableBalanceMad: '0.00',
      pendingBalanceMad: '0.00',
      totalEarnedMad: '0.00',
      totalWithdrawnMad: '0.00',
    });
  } else {
    await db.insert(customers).values({
      userUid: uid,
      email: cleanEmail,
      fullName: input.fullName.trim(),
      phone: '+212 6 00 00 00 00',
      totalOrders: 0,
      totalSpentMad: '0.00',
    });
  }

  const newRecord: StoredCredentialRecord = {
    uid,
    email: cleanEmail,
    fullName: input.fullName.trim(),
    passwordHash: hashPassword(input.password),
    roles,
    storeId: createdStoreId,
  };

  const updatedMap = {
    ...credentialsMap,
    [cleanEmail]: newRecord,
  };

  await db
    .insert(settings)
    .values({
      key: 'auth_credentials_map',
      value: updatedMap,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: updatedMap,
        updatedAt: new Date(),
      },
    });

  await db.insert(auditLogs).values({
    actorUid: uid,
    actorRole: input.accountType,
    action: 'EMAIL_PASSWORD_REGISTER',
    entityType: 'profile',
    entityId: uid,
    metadata: { email: cleanEmail, accountType: input.accountType, storeId: createdStoreId },
  });

  return {
    uid,
    email: cleanEmail,
    displayName: input.fullName.trim(),
    roles,
    storeId: createdStoreId,
  };
}

export async function updateVendorProduct(input: {
  productId: number;
  titleFr?: string;
  priceMad?: number;
  compareAtPriceMad?: number | null;
  status?: string;
  imageUrl?: string;
}) {
  try {
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId));
    if (existing.length === 0) {
      throw new Error('Produit introuvable.');
    }
    const current = existing[0];
    const updated = await db
      .update(products)
      .set({
        titleFr: input.titleFr ? input.titleFr.trim() : current.titleFr,
        priceMad: input.priceMad !== undefined ? String(input.priceMad) : current.priceMad,
        compareAtPriceMad:
          input.compareAtPriceMad !== undefined
            ? input.compareAtPriceMad
              ? String(input.compareAtPriceMad)
              : null
            : current.compareAtPriceMad,
        status: input.status || current.status,
        imageUrl: input.imageUrl ? input.imageUrl.trim() : current.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.productId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateVendorProduct:', error);
    throw new Error('Impossible de modifier le produit.', { cause: error });
  }
}

export async function replenishProductStock(productId: number, addedQuantity: number) {
  try {
    const existingVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    if (existingVariants.length > 0) {
      for (const v of existingVariants) {
        await db
          .update(productVariants)
          .set({
            stockQuantity: (v.stockQuantity || 0) + addedQuantity,
          })
          .where(eq(productVariants.id, v.id));
      }
    } else {
      await db.insert(productVariants).values({
        productId,
        title: 'Standard',
        sku: `SKU-${productId}-STD`,
        priceMad: '500',
        stockQuantity: addedQuantity,
      });
    }
    return { success: true, productId, addedQuantity };
  } catch (error) {
    console.error('Replenish stock failed:', error);
    throw new Error('Impossible de réapprovisionner le stock.');
  }
}

export async function createCustomerAddress(input: {
  userUid?: string | null;
  label: string;
  recipientName: string;
  phone: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country?: string;
}) {
  try {
    const inserted = await db
      .insert(customerAddresses)
      .values({
        customerId: 1,
        userUid: input.userUid || 'client_atlas_01',
        label: input.label.trim(),
        recipientName: input.recipientName.trim(),
        phone: input.phone.trim(),
        streetAddress: input.streetAddress.trim(),
        city: input.city.trim(),
        postalCode: input.postalCode.trim(),
        country: (input.country || 'Maroc').trim(),
        isDefault: false,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createCustomerAddress:', error);
    throw new Error('Impossible d’ajouter l’adresse de livraison.', { cause: error });
  }
}

export async function deleteProductReview(reviewId: number) {
  try {
    await db.delete(reviews).where(eq(reviews.id, reviewId));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteProductReview:', error);
    throw new Error('Impossible de supprimer cet avis.', { cause: error });
  }
}

export interface StoredVendorReviewItem {
  id: number;
  storeId: number;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface StoredVendorFaqItem {
  id: number;
  storeId: number | null;
  category: string;
  questionFr: string;
  answerFr: string;
  createdAt: string;
}

const DEFAULT_VENDOR_REVIEWS: StoredVendorReviewItem[] = [
  {
    id: 1,
    storeId: 1,
    authorName: 'Nadia Chraïbi — Architecte d’intérieur, Casablanca',
    rating: 5,
    title: 'Manufacture d’exception et suivi logistique irréprochable',
    comment:
      'Atelier Sidi Ghanem emballe chaque céramique et pièce en cuir dans des caisses renforcées sur mesure. Livraison COD en 48h avec inspection à la réception.',
    verifiedPurchase: true,
    createdAt: '2026-11-02T10:30:00.000Z',
  },
  {
    id: 2,
    storeId: 1,
    authorName: 'Tarik El Alaoui — Hôtelier, Marrakech',
    rating: 5,
    title: 'Respect strict des délais et finitions haut de gamme',
    comment:
      'Nous équipons nos suites avec leurs pièces depuis six mois. Réactivité exemplaire du vendeur et qualité constante.',
    verifiedPurchase: true,
    createdAt: '2026-11-04T15:15:00.000Z',
  },
  {
    id: 3,
    storeId: 2,
    authorName: 'Sonia Bennani — Pharmacienne, Rabat',
    rating: 5,
    title: 'Laboratoire sérieux, traçabilité bio et envoi soigné',
    comment:
      'Les flacons en verre ambré d’Ourika Botanica arrivent scellés avec leur certificat de lot. Paiement à la livraison très fluide.',
    verifiedPurchase: true,
    createdAt: '2026-11-03T11:20:00.000Z',
  },
  {
    id: 4,
    storeId: 3,
    authorName: 'Youssef Berrada — Collectionneur, Tanger',
    rating: 5,
    title: 'Service conciergerie horlogère digne de Genève',
    comment:
      'Casa Chronographe m’a appelé avant l’expédition pour confirmer le réglage du bracelet. Réception en mains propres contre paiement COD.',
    verifiedPurchase: true,
    createdAt: '2026-11-05T09:45:00.000Z',
  },
];

const DEFAULT_VENDOR_FAQS: StoredVendorFaqItem[] = [
  {
    id: 1,
    storeId: null,
    category: 'Paiement COD',
    questionFr: 'Comment fonctionne l’encaissement des commandes en Paiement à la livraison (COD) ?',
    answerFr:
      'Lorsqu’un client passe commande en COD, le montant net vendeur est crédité sur votre « Solde en attente (Escrow) ». Dès que le transporteur (Amana, Aramex ou Coursier Privé) remet le colis contre espèces et que l’administrateur confirme le statut « PAID », les fonds basculent automatiquement sur votre « Solde disponible ».',
    createdAt: '2026-11-01T09:00:00.000Z',
  },
  {
    id: 2,
    storeId: null,
    category: 'Commissions & Virements',
    questionFr: 'Quel est le taux de commission prélevé par Maison Atlas et quand puis-je demander un virement ?',
    answerFr:
      'La commission plateforme varie entre 10% et 14% selon votre catégorie d’atelier (12% par défaut). Elle couvre l’hébergement, la logistique COD, l’assurance transport et la conciergerie client. Vous pouvez demander un virement bancaire (RIB/IBAN Maroc) à tout moment depuis l’onglet « Trésorerie & Virements » dès 500 MAD disponibles.',
    createdAt: '2026-11-01T09:10:00.000Z',
  },
  {
    id: 3,
    storeId: null,
    category: 'Expédition & Suivi',
    questionFr: 'Quels sont les délais d’expédition requis et comment renseigner le numéro de suivi ?',
    answerFr:
      'Les ateliers partenaires s’engagent à préparer et remettre le colis au transporteur sous 24h à 48h ouvrées. Depuis l’onglet « Commandes & Suivi », saisissez votre bordereau Amana ou Aramex et passez le statut sur « Expédier » pour notifier immédiatement le client.',
    createdAt: '2026-11-01T09:20:00.000Z',
  },
  {
    id: 4,
    storeId: null,
    category: 'Retours 14j',
    questionFr: 'Comment sont gérés les retours clients sous la garantie 14 jours ou les refus à la livraison ?',
    answerFr:
      'En cas de non-conformité ou d’échange demandé dans les 14 jours suivant la livraison, notre conciergerie coordonne le retour vers votre atelier. Si un colis COD n’est pas réceptionné, aucune commission n’est facturée au vendeur.',
    createdAt: '2026-11-01T09:30:00.000Z',
  },
  {
    id: 5,
    storeId: null,
    category: 'Catalogue & Stocks',
    questionFr: 'Comment optimiser la visibilité de mes créations et gérer les ruptures de stock ?',
    answerFr:
      'Utilisez des photographies haute résolution, indiquez un code SKU unique et renseignez un prix barré si vous proposez une édition privilège. Vous pouvez passer un article en statut « Brouillon » en un clic depuis votre catalogue vendeur en cas de réassort.',
    createdAt: '2026-11-01T09:40:00.000Z',
  },
];

export async function ensureVendorReviewsAndFaqs(): Promise<{
  vendorReviews: StoredVendorReviewItem[];
  vendorFaqs: StoredVendorFaqItem[];
}> {
  const [revRow, faqRow] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'vendor_reviews')),
    db.select().from(settings).where(eq(settings.key, 'vendor_faqs')),
  ]);

  let vendorReviews: StoredVendorReviewItem[] = DEFAULT_VENDOR_REVIEWS;
  if (revRow.length === 0) {
    await db
      .insert(settings)
      .values({
        key: 'vendor_reviews',
        value: DEFAULT_VENDOR_REVIEWS,
      })
      .onConflictDoNothing();
  } else if (Array.isArray(revRow[0].value)) {
    vendorReviews = revRow[0].value as StoredVendorReviewItem[];
  }

  let vendorFaqs: StoredVendorFaqItem[] = DEFAULT_VENDOR_FAQS;
  if (faqRow.length === 0) {
    await db
      .insert(settings)
      .values({
        key: 'vendor_faqs',
        value: DEFAULT_VENDOR_FAQS,
      })
      .onConflictDoNothing();
  } else if (Array.isArray(faqRow[0].value)) {
    vendorFaqs = faqRow[0].value as StoredVendorFaqItem[];
  }

  return { vendorReviews, vendorFaqs };
}

export async function createVendorStoreReview(input: {
  storeId: number;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
}) {
  try {
    const { vendorReviews } = await ensureVendorReviewsAndFaqs();
    const cleanRating = Math.max(1, Math.min(5, Math.round(input.rating)));

    const newReview: StoredVendorReviewItem = {
      id: Date.now(),
      storeId: Number(input.storeId),
      authorName: input.authorName.trim(),
      rating: cleanRating,
      title: input.title.trim(),
      comment: input.comment.trim(),
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newReview, ...vendorReviews];

    await db
      .insert(settings)
      .values({
        key: 'vendor_reviews',
        value: updatedList,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: updatedList,
          updatedAt: new Date(),
        },
      });

    // Update store rating & reviewCount in PostgreSQL stores table
    const existingStore = await db
      .select()
      .from(stores)
      .where(eq(stores.id, Number(input.storeId)));

    if (existingStore.length > 0) {
      const st = existingStore[0];
      const nextStats = calculateUpdatedStoreRating(
        st.rating,
        st.reviewCount || 0,
        cleanRating
      );
      await db
        .update(stores)
        .set({
          rating: nextStats.rating,
          reviewCount: nextStats.reviewCount,
        })
        .where(eq(stores.id, st.id));
    }

    return newReview;
  } catch (error) {
    console.error('Database query failed in createVendorStoreReview:', error);
    throw new Error('Impossible d’enregistrer l’avis sur le vendeur.', { cause: error });
  }
}

export async function createVendorFaqItem(input: {
  storeId?: number | null;
  category: string;
  questionFr: string;
  answerFr: string;
}) {
  try {
    const { vendorFaqs } = await ensureVendorReviewsAndFaqs();
    const newItem: StoredVendorFaqItem = {
      id: Date.now(),
      storeId: input.storeId ?? null,
      category: (input.category || 'Général').trim(),
      questionFr: input.questionFr.trim(),
      answerFr: input.answerFr.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedFaqs = [...vendorFaqs, newItem];

    await db
      .insert(settings)
      .values({
        key: 'vendor_faqs',
        value: updatedFaqs,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: updatedFaqs,
          updatedAt: new Date(),
        },
      });

    return newItem;
  } catch (error) {
    console.error('Database query failed in createVendorFaqItem:', error);
    throw new Error('Impossible d’ajouter la question à la FAQ Vendeur.', { cause: error });
  }
}



