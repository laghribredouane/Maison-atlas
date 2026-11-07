import React, { useState, useEffect, useMemo } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import {
  Search,
  ShoppingBag,
  Star,
  Heart,
  LayoutGrid,
  List,
  Sun,
  Moon,
  ArrowRight,
  Store as StoreIcon,
  X,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  BootstrapResponse,
  DashboardResponse,
  Product,
  Store,
  CartItemState,
  I18N,
  getLocalizedTitle,
  getLocalizedDescription,
  getLocalizedCategoryName,
} from './types/marketplace';
import {
  SupportedCurrency,
  SupportedLanguage,
  ExchangeRateMap,
  DEFAULT_EXCHANGE_RATES,
  formatMoney,
  canAccessWorkspace,
  filterAndSortProducts,
  PriceRangeFilter,
  ProductSortOption,
} from './utils/marketplace-rules';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProductReviewModal } from './components/ProductReviewModal';
import { VendorReviewModal } from './components/VendorReviewModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { CustomerAccountView } from './components/CustomerAccountView';
import { VendorDashboardView } from './components/VendorDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import {
  WorkspaceAuthGate,
  AuthenticatedWorkspaceUser,
} from './components/WorkspaceAuthGate';

type ActiveWorkspaceView = 'storefront' | 'catalog' | 'customer' | 'vendor' | 'admin';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveWorkspaceView>('storefront');
  const [currency, setCurrency] = useState<SupportedCurrency>('MAD');
  const [language, setLanguage] = useState<SupportedLanguage>('fr');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showPromoBanner, setShowPromoBanner] = useState<boolean>(true);

  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auth state (token kept strictly in memory + Email/Password workspace session)
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [workspaceSession, setWorkspaceSession] =
    useState<AuthenticatedWorkspaceUser | null>(null);

  // Catalog & Storefront Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [onlyPromo, setOnlyPromo] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<ProductSortOption>('newest');
  const [catalogLayout, setCatalogLayout] = useState<'grid' | 'list'>('grid');

  // Cart, Wishlist, and Selected Product Modal
  const [cart, setCart] = useState<CartItemState[]>([
    {
      product: {
        id: 1,
        storeId: 1,
        categoryId: 1,
        brandId: 1,
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
        videoUrl: '',
        status: 'published',
        featured: true,
        isNew: true,
        isBestseller: true,
        rating: '4.95',
        reviewCount: 42,
        deliveryEstimateDays: '2-3 jours ouvrés',
      },
      variantTitle: 'Édition Originale / Standard',
      quantity: 1,
    },
  ]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [wishlistIds, setWishlistIds] = useState<number[]>([1, 3]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reviewModalProduct, setReviewModalProduct] = useState<Product | null>(null);
  const [reviewModalStore, setReviewModalStore] = useState<Store | null>(null);

  // Vendor Application Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState<boolean>(false);
  const [vendorAppName, setVendorAppName] = useState('');
  const [vendorAppEmail, setVendorAppEmail] = useState('');
  const [vendorStoreName, setVendorStoreName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Mobilier & Céramique');
  const [vendorCity, setVendorCity] = useState('Marrakech');
  const [vendorTaxId, setVendorTaxId] = useState('');
  const [vendorDesc, setVendorDesc] = useState('');
  const [vendorFeedback, setVendorFeedback] = useState<string | null>(null);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const t = I18N[language];

  // Sync dark mode with <html class="dark">
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync language direction
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Reset scroll position when switching workspaces
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeView]);

  const fetchAllData = async (token?: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const [bootRes, dashRes] = await Promise.all([
        fetch('/api/bootstrap'),
        fetch('/api/dashboard', { headers }),
      ]);

      if (!bootRes.ok) throw new Error('Erreur lors du chargement du catalogue.');
      const bootData: BootstrapResponse = await bootRes.json();
      setBootstrap(bootData);

      if (dashRes.ok) {
        const dashData: DashboardResponse = await dashRes.json();
        setDashboard(dashData);
      }
      setLoadError(null);
    } catch (err: any) {
      console.error('Data load error:', err);
      setLoadError(err.message || 'Impossible de charger les données de la marketplace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        const token = await user.getIdToken();
        setIdToken(token);
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchAllData(token);
      } else {
        setCurrentUser(null);
        setIdToken(null);
      }
    });
    return () => unsub();
  }, []);

  const exchangeRateMap: ExchangeRateMap = useMemo(() => {
    if (!bootstrap?.exchangeRates?.length) return DEFAULT_EXCHANGE_RATES;
    const map = { ...DEFAULT_EXCHANGE_RATES };
    for (const r of bootstrap.exchangeRates) {
      map[r.targetCurrency] = Number(r.rate);
    }
    return map;
  }, [bootstrap]);

  const products = bootstrap?.products || [];
  const categories = bootstrap?.categories || [];
  const stores = bootstrap?.stores || [];

  const publishedProducts = useMemo(
    () => products.filter((p) => p.status === 'published'),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return filterAndSortProducts(products, {
      searchQuery,
      categoryId: selectedCategoryId,
      storeId: selectedStoreId,
      priceRange,
      onlyPromo,
      sortBy,
    });
  }, [products, selectedCategoryId, selectedStoreId, priceRange, onlyPromo, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategoryId !== 'all' ||
    selectedStoreId !== 'all' ||
    priceRange !== 'all' ||
    onlyPromo;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setSelectedStoreId('all');
    setPriceRange('all');
    setOnlyPromo(false);
    setSortBy('newest');
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (product: Product, variantTitle: string, quantity: number) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.product.id === product.id && item.variantTitle === variantTitle
      );
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        return updated;
      }
      return [...prev, { product, variantTitle, quantity }];
    });
  };

  const handleBuyNow = (product: Product, variantTitle: string, quantity: number) => {
    handleAddToCart(product, variantTitle, quantity);
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: number, variantTitle: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId && item.variantTitle === variantTitle
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: number, variantTitle: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.variantTitle === variantTitle)
      )
    );
  };

  const handleToggleWishlist = (productId: number) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const handleSignOut = async () => {
    setWorkspaceSession(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore if not signed into firebase
    }
  };

  const handleVendorApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorAppName.trim() || !vendorAppEmail.trim() || !vendorStoreName.trim() || !vendorTaxId.trim()) {
      return;
    }
    const res = await fetch('/api/vendor-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicantName: vendorAppName.trim(),
        applicantEmail: vendorAppEmail.trim(),
        storeName: vendorStoreName.trim(),
        categoryFocus: vendorCategory,
        city: vendorCity,
        taxId: vendorTaxId.trim(),
        description: vendorDesc.trim() || 'Manufacture artisanale candidate à Maison Atlas.',
      }),
    });
    if (res.ok) {
      setVendorFeedback(
        'Votre dossier de candidature vendeur a été transmis. Vous pouvez le valider immédiatement dans la Console Admin.'
      );
      setVendorAppName('');
      setVendorAppEmail('');
      setVendorStoreName('');
      setVendorTaxId('');
      setVendorDesc('');
      await fetchAllData(idToken);
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col bg-[#FAF8F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors"
    >
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs border-b border-stone-200 dark:border-stone-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#storefront"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('storefront');
          }}
          className="font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0"
        >
          Maison Atlas
        </a>

        {/* Zone 2: 5 clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-300">
          <a
            href="#storefront"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('storefront');
            }}
            className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'storefront'
                ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8'
                : ''
            }`}
          >
            {t.navStorefront}
          </a>
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('catalog');
            }}
            className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'catalog'
                ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8'
                : ''
            }`}
          >
            {t.navCatalog}
          </a>
          <a
            href="#customer"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('customer');
            }}
            className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'customer'
                ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8'
                : ''
            }`}
          >
            {t.navCustomer}
          </a>
          <a
            href="#vendor"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('vendor');
            }}
            className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'vendor'
                ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8'
                : ''
            }`}
          >
            {t.navVendor}
          </a>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('admin');
            }}
            className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'admin'
                ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8'
                : ''
            }`}
          >
            {t.navAdmin}
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              {t.cartButton} ({totalCartItems})
            </span>
          </button>
        </div>
      </header>

      {/* Secondary Utility & Localization Toolbar (Below Top Bar) */}
      <div className="bg-stone-100/80 dark:bg-stone-900/70 border-b border-stone-200 dark:border-stone-800 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Mobile Workspace Switcher + Promo Announcement */}
          <div className="flex items-center gap-3">
            <div className="flex md:hidden items-center gap-1">
              {(
                [
                  { id: 'storefront', label: t.navStorefront },
                  { id: 'catalog', label: t.navCatalog },
                  { id: 'customer', label: t.navCustomer },
                  { id: 'vendor', label: t.navVendor },
                  { id: 'admin', label: t.navAdmin },
                ] as const
              ).map((nav) => (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveView(nav.id)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                    activeView === nav.id
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {nav.label}
                </button>
              ))}
            </div>
            {showPromoBanner && (
              <div className="hidden lg:flex items-center gap-2 text-stone-600 dark:text-stone-300">
                <span>
                  Livraison offerte dès 1 500 MAD · Code privilège <strong className="font-mono">ATLAS15</strong> (-15%)
                </span>
                <button
                  type="button"
                  aria-label="Masquer la bannière promotionnelle"
                  onClick={() => setShowPromoBanner(false)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Currency, Language (FR / EN / AR RTL) & Theme Switchers */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Currency Selector */}
            <div className="inline-flex items-center gap-1 p-0.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md">
              {(['MAD', 'EUR', 'USD'] as SupportedCurrency[]).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    currency === curr
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            {/* Language Selector */}
            <div className="inline-flex items-center gap-1 p-0.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md">
              {(
                [
                  { code: 'fr', label: 'FR' },
                  { code: 'en', label: 'EN' },
                  { code: 'ar', label: 'العربية' },
                ] as const
              ).map((langObj) => (
                <button
                  key={langObj.code}
                  type="button"
                  onClick={() => setLanguage(langObj.code)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    language === langObj.code
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {langObj.label}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="p-1.5 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 transition-colors"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs">
            {loadError}
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE ROUTER */}
      <div className="flex-1">
        {activeView === 'storefront' && (
          <main className="space-y-16 pb-16">
            {/* Section 1: Storefront Split Hero */}
            <section className="max-w-7xl mx-auto px-6 pt-8 lg:pt-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                  <p className="text-xs tracking-wide text-stone-500 dark:text-stone-400">
                    {t.heroKicker}
                  </p>
                  <h1
                    className="font-display text-4xl sm:text-5xl font-semibold leading-[1.12] text-stone-900 dark:text-stone-100"
                    style={{ textWrap: 'balance' }}
                  >
                    {t.heroTitle}
                  </h1>
                  <p className="text-base leading-relaxed text-stone-600 dark:text-stone-300 max-w-xl">
                    {t.heroSubtitle}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveView('catalog')}
                      className="px-6 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <span>{t.exploreCatalog}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVendorModalOpen(true)}
                      className="px-5 py-3 border border-stone-300 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-300 text-stone-900 dark:text-stone-100 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {t.becomeVendor}
                    </button>
                  </div>

                  {/* Quantitative Proof Strip */}
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-stone-200 dark:border-stone-800 text-xs">
                    <div>
                      <p className="font-mono tabular-nums text-lg font-semibold text-stone-900 dark:text-stone-100">
                        100%
                      </p>
                      <p className="text-stone-500">Ateliers Vérifiés</p>
                    </div>
                    <div>
                      <p className="font-mono tabular-nums text-lg font-semibold text-stone-900 dark:text-stone-100">
                        24h–48h
                      </p>
                      <p className="text-stone-500">Expédition Amana & Aramex</p>
                    </div>
                    <div>
                      <p className="font-mono tabular-nums text-lg font-semibold text-stone-900 dark:text-stone-100">
                        100% COD
                      </p>
                      <p className="text-stone-500">Paiement à la livraison</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="relative h-full min-h-[340px] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-200 dark:bg-stone-800">
                    <img
                      src="/src/assets/images/hero_architectural_marketplace_1793993180020.jpg"
                      alt="Salon architectural Maison Atlas avec mobilier en chêne massif, céramique et laiton brossé"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-6">
                      <div className="text-white space-y-1">
                        <p className="text-xs text-stone-200">
                          Collection Permanente · Marrakech, Casablanca & Genève
                        </p>
                        <p className="font-display text-xl font-medium">
                          Atelier Sidi Ghanem · Ourika Botanica · Casa Chronographe
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Featured Collection & Complete Multi-Category Catalog with Search & Filters */}
            <section className="max-w-7xl mx-auto px-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Sélection Multi-Catégories ({filteredProducts.length} / {publishedProducts.length} produits) · Prix en {currency} · Paiement COD
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-stone-100">
                    {t.featuredCollection} & Catalogue par Catégories
                  </h2>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-3.5 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 hover:bg-stone-100 inline-flex items-center gap-1.5 self-start md:self-auto"
                  >
                    <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
                  </button>
                )}
              </div>

              {/* Search & Multi-Criteria Filter Bar on Storefront */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                  {/* Search Input */}
                  <div className="sm:col-span-2 lg:col-span-4 relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      aria-label="Rechercher un produit"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un produit (ex: Masseur, Licorne, Expresso, Étagère...)"
                      className="w-full pl-10 pr-8 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:border-stone-900"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Effacer la recherche"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Dropdown Filter */}
                  <div className="lg:col-span-2">
                    <select
                      aria-label="Filtrer par catégorie sur l'accueil"
                      value={selectedCategoryId}
                      onChange={(e) =>
                        setSelectedCategoryId(
                          e.target.value === 'all' ? 'all' : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    >
                      <option value="all">Toutes les catégories ({publishedProducts.length})</option>
                      {categories.map((cat) => {
                        const count = publishedProducts.filter((p) => p.categoryId === cat.id).length;
                        return (
                          <option key={cat.id} value={cat.id}>
                            {getLocalizedCategoryName(cat, language)} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Price Range Filter */}
                  <div className="lg:col-span-2">
                    <select
                      aria-label="Filtrer par budget en MAD"
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value as PriceRangeFilter)}
                      className="w-full px-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    >
                      <option value="all">Budget : Tous les prix</option>
                      <option value="under_300">Moins de 300 MAD</option>
                      <option value="300_800">300 MAD – 800 MAD</option>
                      <option value="800_2000">800 MAD – 2 000 MAD</option>
                      <option value="over_2000">Plus de 2 000 MAD</option>
                    </select>
                  </div>

                  {/* Store Filter */}
                  <div className="lg:col-span-2">
                    <select
                      aria-label="Filtrer par boutique partenaire"
                      value={selectedStoreId}
                      onChange={(e) =>
                        setSelectedStoreId(
                          e.target.value === 'all' ? 'all' : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    >
                      <option value="all">{t.allStores}</option>
                      {stores.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="lg:col-span-2">
                    <select
                      aria-label="Trier les produits sur l'accueil"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as ProductSortOption)}
                      className="w-full px-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    >
                      <option value="newest">Tri : Nouveautés</option>
                      <option value="popular">Tri : Popularité & Note</option>
                      <option value="price_asc">Prix : Croissant</option>
                      <option value="price_desc">Prix : Décroissant</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Category Filter Buttons (All 9 Categories + Promo Toggle) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      selectedCategoryId === 'all'
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {t.allCategories} ({publishedProducts.length})
                  </button>
                  {categories.map((cat) => {
                    const count = publishedProducts.filter((p) => p.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                          selectedCategoryId === cat.id
                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {getLocalizedCategoryName(cat, language)} ({count})
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setOnlyPromo(!onlyPromo)}
                    className={`ml-auto px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      onlyPromo
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    Offres en Promotion uniquement
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-96 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center space-y-3">
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    Aucun produit ne correspond à votre recherche ou à vos filtres actuels.
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-lg"
                  >
                    Afficher tous les produits ({publishedProducts.length})
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((product) => {
                    const store = stores.find((s) => s.id === product.storeId);
                    const category = categories.find((c) => c.id === product.categoryId);
                    const wishlisted = wishlistIds.includes(product.id);
                    return (
                      <article
                        key={product.id}
                        className="group rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <div
                          onClick={() => setSelectedProduct(product)}
                          className="relative aspect-4/3 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden cursor-pointer"
                        >
                          <img
                            src={product.imageUrl}
                            alt={getLocalizedTitle(product, language)}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            {/* Clean unboxed metadata */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                              <span className="truncate max-w-[160px]">{store?.name || 'Maison Atlas'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate font-medium text-stone-700 dark:text-stone-300">
                                {category
                                  ? getLocalizedCategoryName(category, language)
                                  : 'Collection'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono whitespace-nowrap">★ {product.rating}</span>
                            </div>

                            <h3
                              onClick={() => setSelectedProduct(product)}
                              className="text-base font-semibold text-stone-900 dark:text-stone-100 cursor-pointer hover:underline"
                            >
                              {getLocalizedTitle(product, language)}
                            </h3>

                            <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                              {getLocalizedDescription(product, language)}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-mono tabular-nums font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                                  {formatMoney(
                                    Number(product.priceMad),
                                    currency,
                                    exchangeRateMap,
                                    language
                                  )}
                                </span>
                                {product.compareAtPriceMad && (
                                  <span className="text-xs font-mono tabular-nums text-stone-400 line-through whitespace-nowrap">
                                    {formatMoney(
                                      Number(product.compareAtPriceMad),
                                      currency,
                                      exchangeRateMap,
                                      language
                                    )}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleWishlist(product.id)}
                                aria-label={`Favori ${getLocalizedTitle(product, language)}`}
                                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                                  wishlisted
                                    ? 'border-rose-600 text-rose-600'
                                    : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-900'
                                }`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setReviewModalProduct(product)}
                                className="px-3 py-2 border border-stone-300 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-300 text-stone-800 dark:text-stone-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                <span>Laisser un avis</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddToCart(
                                    product,
                                    'Édition Originale / Standard',
                                    1
                                  )
                                }
                                className="px-3 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                {t.addToCart}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Verified Partner Boutiques & Attributable Customer Proof */}
            <section className="max-w-7xl mx-auto px-6 space-y-8">
              <div className="pb-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-500">Architecture Multi-Vendeurs</p>
                  <h2 className="font-display text-3xl font-semibold text-stone-900 dark:text-stone-100">
                    {t.verifiedStores}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('vendor')}
                  className="text-xs font-medium text-stone-700 dark:text-stone-300 underline hover:text-stone-900"
                >
                  Accéder au Portail Vendeur →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stores.map((st) => {
                  const latestStoreRev = (bootstrap?.vendorReviews || []).find(
                    (vr) => vr.storeId === st.id
                  );
                  return (
                    <div
                      key={st.id}
                      className="p-6 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <StoreIcon className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
                          <span>
                            {st.city}, {st.country}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                            ★ {st.rating} ({st.reviewCount} avis)
                          </span>
                        </div>
                        <h3 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
                          {st.name}
                        </h3>
                        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                          {st.description}
                        </p>
                        {latestStoreRev && (
                          <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800 text-xs space-y-1">
                            <p className="font-medium text-stone-900 dark:text-stone-100">
                              « {latestStoreRev.title} »
                            </p>
                            <p className="text-stone-500 line-clamp-2">{latestStoreRev.comment}</p>
                            <p className="text-[11px] text-stone-400">— {latestStoreRev.authorName}</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setReviewModalStore(st)}
                          className="py-2 px-3 border border-stone-300 dark:border-stone-700 hover:border-stone-900 text-xs font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          <span>Avis vendeur</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStoreId(st.id);
                            setActiveView('catalog');
                          }}
                          className="py-2 px-3 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-lg transition-colors"
                        >
                          Voir ses créations
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Attributable Testimonials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {(bootstrap?.reviews || []).slice(0, 3).map((rev) => (
                  <blockquote
                    key={rev.id}
                    className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-mono font-semibold">{rev.rating}.0 / 5.0</span>
                      <span className="text-stone-500">· Achat Vérifié</span>
                    </div>
                    <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                      « {rev.title} »
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      {rev.comment}
                    </p>
                    <footer className="pt-1 font-medium text-stone-900 dark:text-stone-200">
                      — {rev.authorName}
                    </footer>
                  </blockquote>
                ))}
              </div>

              {/* Section FAQ Vendeurs & Partenaires */}
              <div className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <p className="text-xs text-stone-500">Transparence & Engagements</p>
                    <h3 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
                      FAQ Vendeurs & Partenaires Maison Atlas
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('vendor')}
                    className="text-xs font-medium text-stone-700 dark:text-stone-300 underline"
                  >
                    Consulter toute la FAQ dans l’Espace Vendeur →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(bootstrap?.vendorFaqs || []).slice(0, 4).map((faq) => (
                    <div
                      key={faq.id}
                      className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1.5 text-xs"
                    >
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {faq.category}
                      </span>
                      <p className="font-semibold text-stone-900 dark:text-stone-100">
                        {faq.questionFr}
                      </p>
                      <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                        {faq.answerFr}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        )}

        {activeView === 'catalog' && (
          <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
              <div>
                <p className="text-xs text-stone-500">
                  Catalogue Multi-Boutiques · {filteredProducts.length} / {publishedProducts.length} références disponibles
                </p>
                <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-stone-100">
                  Catalogue Général, Filtres & Recherche Instantanée
                </h1>
              </div>

              {/* Search & Layout Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>

                <select
                  aria-label="Filtrer par catégorie"
                  value={selectedCategoryId}
                  onChange={(e) =>
                    setSelectedCategoryId(
                      e.target.value === 'all' ? 'all' : Number(e.target.value)
                    )
                  }
                  className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="all">{t.allCategories} ({publishedProducts.length})</option>
                  {categories.map((c) => {
                    const count = publishedProducts.filter((p) => p.categoryId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {getLocalizedCategoryName(c, language)} ({count})
                      </option>
                    );
                  })}
                </select>

                <select
                  aria-label="Filtrer par tranche de prix"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value as PriceRangeFilter)}
                  className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="all">Tous les prix</option>
                  <option value="under_300">Moins de 300 MAD</option>
                  <option value="300_800">300 – 800 MAD</option>
                  <option value="800_2000">800 – 2 000 MAD</option>
                  <option value="over_2000">Plus de 2 000 MAD</option>
                </select>

                <select
                  aria-label="Filtrer par boutique vendeur"
                  value={selectedStoreId}
                  onChange={(e) =>
                    setSelectedStoreId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="all">{t.allStores}</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Trier les produits"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as ProductSortOption)}
                  className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="newest">Tri : Nouveautés</option>
                  <option value="popular">Tri : Popularité & Note</option>
                  <option value="price_asc">Prix : Croissant</option>
                  <option value="price_desc">Prix : Décroissant</option>
                </select>

                <div className="inline-flex border border-stone-300 dark:border-stone-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    aria-label="Affichage en grille"
                    onClick={() => setCatalogLayout('grid')}
                    className={`p-2 ${
                      catalogLayout === 'grid'
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'bg-white dark:bg-stone-900 text-stone-600'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Affichage en liste"
                    onClick={() => setCatalogLayout('list')}
                    className={`p-2 ${
                      catalogLayout === 'list'
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'bg-white dark:bg-stone-900 text-stone-600'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Quick Filter Bar in Catalog */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategoryId === 'all'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                {t.allCategories} ({publishedProducts.length})
              </button>
              {categories.map((cat) => {
                const count = publishedProducts.filter((p) => p.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      selectedCategoryId === cat.id
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {getLocalizedCategoryName(cat, language)} ({count})
                  </button>
                );
              })}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3 border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900">
                <p className="text-base font-medium">Aucun produit ne correspond à vos filtres.</p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg"
                >
                  Réinitialiser tous les filtres
                </button>
              </div>
            ) : catalogLayout === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => {
                  const store = stores.find((s) => s.id === product.storeId);
                  return (
                    <article
                      key={product.id}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden flex flex-col"
                    >
                      <div
                        onClick={() => setSelectedProduct(product)}
                        className="aspect-4/3 bg-stone-100 cursor-pointer overflow-hidden"
                      >
                        <img
                          src={product.imageUrl}
                          alt={getLocalizedTitle(product, language)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover hover:scale-103 transition-transform"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <p className="text-xs text-stone-500">
                            {store?.name} · SKU {product.sku}
                          </p>
                          <h2
                            onClick={() => setSelectedProduct(product)}
                            className="text-base font-semibold text-stone-900 dark:text-stone-100 mt-1 cursor-pointer hover:underline"
                          >
                            {getLocalizedTitle(product, language)}
                          </h2>
                          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                            {getLocalizedDescription(product, language)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                          <span className="text-sm font-mono tabular-nums font-semibold">
                            {formatMoney(
                              Number(product.priceMad),
                              currency,
                              exchangeRateMap,
                              language
                            )}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(product)}
                              className="px-3 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded-lg"
                            >
                              {t.viewDetails}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleAddToCart(product, 'Édition Originale / Standard', 1)
                              }
                              className="px-3.5 py-1.5 text-xs bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium rounded-lg"
                            >
                              {t.addToCart}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const store = stores.find((s) => s.id === product.storeId);
                  return (
                    <div
                      key={product.id}
                      className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row items-center gap-6"
                    >
                      <img
                        src={product.imageUrl}
                        alt={getLocalizedTitle(product, language)}
                        referrerPolicy="no-referrer"
                        className="w-full sm:w-44 aspect-4/3 object-cover rounded-lg bg-stone-100 shrink-0"
                      />
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-stone-500">
                          {store?.name} · SKU {product.sku} · Livraison {product.deliveryEstimateDays}
                        </p>
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                          {getLocalizedTitle(product, language)}
                        </h2>
                        <p className="text-xs text-stone-600 dark:text-stone-300">
                          {getLocalizedDescription(product, language)}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-end justify-between gap-3 shrink-0">
                        <span className="text-base font-mono tabular-nums font-semibold">
                          {formatMoney(
                            Number(product.priceMad),
                            currency,
                            exchangeRateMap,
                            language
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleAddToCart(product, 'Édition Originale / Standard', 1)
                          }
                          className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-lg whitespace-nowrap"
                        >
                          {t.addToCart}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {activeView === 'customer' &&
          (canAccessWorkspace(workspaceSession?.roles || [], 'customer') ? (
            <CustomerAccountView
              user={
                workspaceSession
                  ? {
                      uid: workspaceSession.uid,
                      email: workspaceSession.email,
                      displayName: workspaceSession.displayName,
                    }
                  : currentUser
              }
              orders={dashboard?.orders || []}
              orderItems={dashboard?.orderItems || []}
              addresses={dashboard?.addresses || []}
              refunds={dashboard?.refunds || []}
              wishlistIds={wishlistIds}
              products={products}
              currency={currency}
              language={language}
              rates={exchangeRateMap}
              onSignOut={handleSignOut}
              onRequestRefund={async (orderId, reason, amountMad) => {
                await fetch(`/api/orders/${orderId}/refund`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason, amountMad }),
                });
                await fetchAllData(idToken);
              }}
              onCreateAddress={async (input) => {
                await fetch('/api/addresses', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                });
                await fetchAllData(idToken);
              }}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onAddToCart={handleAddToCart}
            />
          ) : (
            <WorkspaceAuthGate
              workspace="customer"
              currentUser={workspaceSession}
              onAuthenticated={async (session) => {
                setWorkspaceSession(session);
                await fetchAllData(idToken);
              }}
            />
          ))}

        {activeView === 'vendor' &&
          (canAccessWorkspace(workspaceSession?.roles || [], 'vendor') ? (
            <VendorDashboardView
              stores={stores}
              products={products}
              categories={categories}
              orders={dashboard?.orders || []}
              orderItems={dashboard?.orderItems || []}
              wallets={dashboard?.wallets || []}
              payoutRequests={dashboard?.payoutRequests || []}
              vendorReviews={bootstrap?.vendorReviews || []}
              vendorFaqs={bootstrap?.vendorFaqs || []}
              currency={currency}
              language={language}
              rates={exchangeRateMap}
              userEmail={workspaceSession?.email}
              defaultStoreId={workspaceSession?.storeId}
              onSignOut={handleSignOut}
              onCreateProduct={async (input) => {
                const res = await fetch('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                });
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || 'Failed to create product');
                }
                await fetchAllData(idToken);
              }}
              onUpdateProduct={async (productId, updates) => {
                await fetch(`/api/products/${productId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updates),
                });
                await fetchAllData(idToken);
              }}
              onDeleteProduct={async (productId) => {
                await fetch(`/api/products/${productId}`, { method: 'DELETE' });
                await fetchAllData(idToken);
              }}
              onUpdateOrderStatus={async (orderId, orderStatus, trackingNumber) => {
                await fetch(`/api/orders/${orderId}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderStatus, trackingNumber }),
                });
                await fetchAllData(idToken);
              }}
              onRequestPayout={async (input) => {
                await fetch('/api/payouts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                });
                await fetchAllData(idToken);
              }}
              onSubmitVendorReview={async (input) => {
                const res = await fetch('/api/vendor-reviews', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                });
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || 'Failed to submit vendor review');
                }
                await fetchAllData(idToken);
              }}
              onCreateVendorFaq={async (input) => {
                const res = await fetch('/api/vendor-faqs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                });
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || 'Failed to create vendor FAQ');
                }
                await fetchAllData(idToken);
              }}
              variants={bootstrap?.variants || []}
              onReplenishStock={async (productId, addedQuantity) => {
                await fetch(`/api/products/${productId}/replenish`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ addedQuantity }),
                });
                await fetchAllData(idToken);
              }}
            />
          ) : (
            <WorkspaceAuthGate
              workspace="vendor"
              currentUser={workspaceSession}
              onAuthenticated={async (session) => {
                setWorkspaceSession(session);
                await fetchAllData(idToken);
              }}
            />
          ))}

        {activeView === 'admin' &&
          dashboard &&
          (canAccessWorkspace(workspaceSession?.roles || [], 'admin') ? (
            <AdminDashboardView
              stores={stores}
              products={products}
              categories={categories}
              orders={dashboard.orders}
              coupons={bootstrap?.coupons || []}
              reviews={bootstrap?.reviews || []}
              dashboard={dashboard}
              currency={currency}
              language={language}
              rates={exchangeRateMap}
              userEmail={workspaceSession?.email}
              onSignOut={handleSignOut}
              onReviewVendorApp={async (appId, status) => {
                await fetch(`/api/vendor-applications/${appId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status }),
                });
                await fetchAllData(idToken);
              }}
              onUpdateStoreConfig={async (storeId, commissionRate, status) => {
                await fetch(`/api/stores/${storeId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ commissionRate, status }),
                });
                await fetchAllData(idToken);
              }}
              onApprovePayout={async (payoutId, status) => {
                await fetch(`/api/payouts/${payoutId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status }),
                });
                await fetchAllData(idToken);
              }}
              onCreateCoupon={async (input) => {
                await fetch('/api/coupons', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                });
                await fetchAllData(idToken);
              }}
              onCreateProduct={async (input) => {
                const res = await fetch('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                });
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || 'Failed to create product');
                }
                await fetchAllData(idToken);
              }}
              onDeleteProduct={async (productId) => {
                await fetch(`/api/products/${productId}`, { method: 'DELETE' });
                await fetchAllData(idToken);
              }}
              onDeleteReview={async (reviewId) => {
                await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
                await fetchAllData(idToken);
              }}
              onUpdateOrderStatus={async (orderId, orderStatus, trackingNumber) => {
                await fetch(`/api/orders/${orderId}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderStatus, trackingNumber }),
                });
                await fetchAllData(idToken);
              }}
              onUpdatePaymentStatus={async (orderId, paymentStatus) => {
                await fetch(`/api/orders/${orderId}/payment-status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentStatus }),
                });
                await fetchAllData(idToken);
              }}
            />
          ) : (
            <WorkspaceAuthGate
              workspace="admin"
              currentUser={workspaceSession}
              onAuthenticated={async (session) => {
                setWorkspaceSession(session);
                await fetchAllData(idToken);
              }}
            />
          ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-3">
            <p className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
              Maison Atlas
            </p>
            <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
              Plateforme marketplace e-commerce multi-vendeurs dédiée au mobilier architectural, à la
              haute botanique et aux manufactures vérifiées.
            </p>
            <p className="text-xs text-stone-400">
              © 2026 Maison Atlas Marketplace. Tous droits réservés.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2 text-xs">
            <p className="font-semibold text-stone-900 dark:text-stone-100">Navigation Rapide</p>
            <ul className="space-y-1.5 text-stone-500">
              <li>
                <button type="button" onClick={() => setActiveView('catalog')} className="hover:underline">
                  Catalogue Multi-Boutiques
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setIsVendorModalOpen(true)} className="hover:underline">
                  Devenir Vendeur Partenaire
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveView('vendor')} className="hover:underline">
                  Portail Vendeur
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveView('admin')} className="hover:underline">
                  Console d’Administration
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Lettre d’Information Privée
            </p>
            <p className="text-xs text-stone-500">
              Recevez les nouvelles éditions limitées et invitations d’ateliers.
            </p>
            {newsletterSubscribed ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Merci pour votre inscription à la lettre privée Maison Atlas.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail.trim()) setNewsletterSubscribed(true);
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="votre@email.ma"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-lg whitespace-nowrap"
                >
                  S’inscrire
                </button>
              </form>
            )}
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          store={stores.find((s) => s.id === selectedProduct.storeId)}
          category={categories.find((c) => c.id === selectedProduct.categoryId)}
          variants={
            (bootstrap?.variants || []).filter((v) => v.productId === selectedProduct.id)
          }
          reviews={(bootstrap?.reviews || []).filter((r) => r.productId === selectedProduct.id)}
          similarProducts={products.filter(
            (p) => p.categoryId === selectedProduct.categoryId && p.id !== selectedProduct.id
          )}
          currency={currency}
          language={language}
          rates={exchangeRateMap}
          isWishlisted={wishlistIds.includes(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onToggleWishlist={handleToggleWishlist}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onSubmitReview={async (input) => {
            await fetch('/api/reviews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(input),
            });
            await fetchAllData(idToken);
          }}
        />
      )}

      {/* Direct Product Review Modal (From Homepage Cards) */}
      {reviewModalProduct && (
        <ProductReviewModal
          product={reviewModalProduct}
          store={stores.find((s) => s.id === reviewModalProduct.storeId)}
          language={language}
          defaultAuthorName={currentUser?.displayName || ''}
          onClose={() => setReviewModalProduct(null)}
          onSubmitReview={async (input) => {
            const res = await fetch('/api/reviews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(input),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to submit review');
            }
            await fetchAllData(idToken);
          }}
        />
      )}

      {/* Vendor Store Review Modal (Avis sur les vendeurs) */}
      {reviewModalStore && (
        <VendorReviewModal
          store={
            stores.find((s) => s.id === reviewModalStore.id) || reviewModalStore
          }
          reviews={bootstrap?.vendorReviews || []}
          language={language}
          defaultAuthorName={currentUser?.displayName || workspaceSession?.displayName || ''}
          onClose={() => setReviewModalStore(null)}
          onSubmitVendorReview={async (input) => {
            const res = await fetch('/api/vendor-reviews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(input),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Impossible d’envoyer votre avis vendeur');
            }
            await fetchAllData(idToken);
          }}
        />
      )}

      {/* Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={isCartOpen}
        cart={cart}
        stores={stores}
        coupons={bootstrap?.coupons || []}
        shippingMethods={bootstrap?.shippingMethods || []}
        currency={currency}
        language={language}
        rates={exchangeRateMap}
        userEmail={currentUser?.email || undefined}
        userName={currentUser?.displayName || undefined}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onSubmitOrder={async (payload) => {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (idToken) headers.Authorization = `Bearer ${idToken}`;
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Order submission failed');
          }
          const data = await res.json();
          await fetchAllData(idToken);
          return data;
        }}
      />

      {/* Vendor Application Modal */}
      {isVendorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Candidature Boutique Vendeur"
        >
          <div className="w-full max-w-lg rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h2 className="font-display text-2xl font-semibold">
                Ouvrir une Boutique sur Maison Atlas
              </h2>
              <button
                type="button"
                aria-label="Fermer la fenêtre de candidature vendeur"
                onClick={() => {
                  setIsVendorModalOpen(false);
                  setVendorFeedback(null);
                }}
                className="p-1.5 text-stone-500 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {vendorFeedback ? (
              <div className="space-y-4">
                <p className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs">
                  {vendorFeedback}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsVendorModalOpen(false);
                    setVendorFeedback(null);
                    setActiveView('admin');
                  }}
                  className="w-full py-2.5 bg-stone-900 text-white text-xs font-medium rounded-lg"
                >
                  Aller à la Console Admin pour approuver la boutique
                </button>
              </div>
            ) : (
              <form onSubmit={handleVendorApplicationSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 mb-1">
                      Votre nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={vendorAppName}
                      onChange={(e) => setVendorAppName(e.target.value)}
                      placeholder="Ex: Amine Berrada"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 mb-1">
                      Email professionnel *
                    </label>
                    <input
                      type="email"
                      required
                      value={vendorAppEmail}
                      onChange={(e) => setVendorAppEmail(e.target.value)}
                      placeholder="contact@atelier.ma"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 mb-1">
                      Nom de la Boutique *
                    </label>
                    <input
                      type="text"
                      required
                      value={vendorStoreName}
                      onChange={(e) => setVendorStoreName(e.target.value)}
                      placeholder="Maison Tazi Maroquinerie"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 mb-1">
                      Identifiant Fiscal / ICE *
                    </label>
                    <input
                      type="text"
                      required
                      value={vendorTaxId}
                      onChange={(e) => setVendorTaxId(e.target.value)}
                      placeholder="ICE-00319284000021"
                      className="w-full px-3 py-2 font-mono rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 mb-1">
                      Spécialité
                    </label>
                    <input
                      type="text"
                      value={vendorCategory}
                      onChange={(e) => setVendorCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 mb-1">
                      Ville de l’atelier
                    </label>
                    <input
                      type="text"
                      value={vendorCity}
                      onChange={(e) => setVendorCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">
                    Présentation du savoir-faire *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={vendorDesc}
                    onChange={(e) => setVendorDesc(e.target.value)}
                    placeholder="Décrivez vos créations, matériaux et délais de fabrication..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold rounded-lg"
                >
                  Soumettre ma candidature vendeur
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
