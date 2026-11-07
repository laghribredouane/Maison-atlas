import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShieldCheck, CheckCircle2, Truck, Banknote } from 'lucide-react';
import {
  CartItemState,
  Coupon,
  ShippingMethod,
  Store,
  getLocalizedTitle,
} from '../types/marketplace';
import {
  SupportedCurrency,
  SupportedLanguage,
  PaymentGatewayCode,
  ExchangeRateMap,
  calculateOrderFinancials,
  formatMoney,
} from '../utils/marketplace-rules';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  cart: CartItemState[];
  stores: Store[];
  coupons: Coupon[];
  shippingMethods: ShippingMethod[];
  currency: SupportedCurrency;
  language: SupportedLanguage;
  rates: ExchangeRateMap;
  userEmail?: string;
  userName?: string;
  onClose: () => void;
  onUpdateQuantity: (productId: number, variantTitle: string, delta: number) => void;
  onRemoveItem: (productId: number, variantTitle: string) => void;
  onClearCart: () => void;
  onSubmitOrder: (payload: {
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
    items: Array<{ productId: number; variantTitle?: string; quantity: number }>;
  }) => Promise<{
    order: {
      orderNumber: string;
      trackingNumber: string;
      paymentGateway: string;
      paymentStatus: string;
      totalMad: string;
    };
    payment: {
      transactionReference: string;
      idempotencyKey: string;
      signatureVerified: boolean;
    };
  }>;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  cart,
  stores,
  coupons,
  shippingMethods,
  currency,
  language,
  rates,
  userEmail,
  userName,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSubmitOrder,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmed'>('cart');
  const [couponInput, setCouponInput] = useState<string>('ATLAS15');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(
    coupons.find((c) => c.code === 'ATLAS15') || null
  );
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const [selectedShippingId, setSelectedShippingId] = useState<number>(
    shippingMethods[0]?.id || 1
  );
  const selectedGateway: PaymentGatewayCode = 'COD';

  const [customerName, setCustomerName] = useState<string>(userName || 'Nadia Chraïbi');
  const [customerEmail, setCustomerEmail] = useState<string>(
    userEmail || 'nadia.chraibi@studio-anfa.ma'
  );
  const [customerPhone, setCustomerPhone] = useState<string>('+212 6 61 88 99 00');
  const [shippingAddress, setShippingAddress] = useState<string>(
    '42 Boulevard d’Anfa, Résidence Les Iris'
  );
  const [shippingCity, setShippingCity] = useState<string>('Casablanca');
  const [shippingPostalCode, setShippingPostalCode] = useState<string>('20050');
  const [shippingCountry, setShippingCountry] = useState<string>('Maroc');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [confirmedReceipt, setConfirmedReceipt] = useState<{
    orderNumber: string;
    trackingNumber: string;
    paymentGateway: string;
    paymentStatus: string;
    totalMad: string;
    transactionReference: string;
    idempotencyKey: string;
    signatureVerified: boolean;
  } | null>(null);

  const activeShipping =
    shippingMethods.find((s) => s.id === selectedShippingId) || shippingMethods[0];

  const financials = calculateOrderFinancials({
    items: cart.map((c) => {
      const st = stores.find((s) => s.id === c.product.storeId);
      return {
        productId: c.product.id,
        storeId: c.product.storeId,
        unitPriceMad: Number(c.product.priceMad),
        quantity: c.quantity,
        commissionRatePercent: st ? Number(st.commissionRate) : 12,
      };
    }),
    coupon: appliedCoupon
      ? {
          code: appliedCoupon.code,
          discountType: appliedCoupon.discountType,
          discountValue: Number(appliedCoupon.discountValue),
          minOrderMad: Number(appliedCoupon.minOrderMad),
          active: appliedCoupon.active,
        }
      : null,
    shipping: {
      baseFeeMad: activeShipping ? Number(activeShipping.baseFeeMad) : 45,
      freeShippingThresholdMad: activeShipping
        ? Number(activeShipping.freeShippingThresholdMad)
        : 1500,
    },
    taxRatePercent: 20,
  });

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      setCouponMessage('Code promotionnel retiré.');
      return;
    }
    const found = coupons.find((c) => c.code.toUpperCase() === code && c.active);
    if (!found) {
      setCouponMessage('Code promotionnel introuvable ou expiré.');
      return;
    }
    setAppliedCoupon(found);
    setCouponMessage(`Code ${found.code} appliqué (${found.description}).`);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      !customerPhone.trim() ||
      !shippingAddress.trim() ||
      !shippingCity.trim() ||
      !shippingPostalCode.trim()
    ) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires de livraison.');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Votre panier est vide.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmitOrder({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        shippingCity: shippingCity.trim(),
        shippingPostalCode: shippingPostalCode.trim(),
        shippingCountry: shippingCountry.trim() || 'Maroc',
        shippingMethodId: activeShipping?.id || 1,
        paymentGateway: selectedGateway,
        currency,
        couponCode: appliedCoupon?.code || null,
        notes: notes.trim(),
        items: cart.map((item) => ({
          productId: item.product.id,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
        })),
      });

      setConfirmedReceipt({
        orderNumber: result.order.orderNumber,
        trackingNumber: result.order.trackingNumber,
        paymentGateway: result.order.paymentGateway,
        paymentStatus: result.order.paymentStatus,
        totalMad: result.order.totalMad,
        transactionReference: result.payment.transactionReference,
        idempotencyKey: result.payment.idempotencyKey,
        signatureVerified: result.payment.signatureVerified,
      });
      onClearCart();
      setStep('confirmed');
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de finaliser la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Panier et commande"
        >
          {/* Animated Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            aria-hidden="true"
          />

          {/* Animated Sliding Drawer */}
          <motion.div
            key="cart-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.85 }}
            className="relative z-10 w-full max-w-xl bg-white dark:bg-stone-900 h-full flex flex-col border-l border-stone-200 dark:border-stone-800 shadow-2xl"
          >
            {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
              {step === 'cart'
                ? 'Votre Panier & Sélection'
                : step === 'checkout'
                  ? 'Finalisation & Paiement Sécurisé'
                  : 'Confirmation de Commande'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Devise active : {currency} · Livraison nationale & internationale
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panier"
            className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'confirmed' && confirmedReceipt ? (
            <div className="p-6 rounded-xl border border-stone-200 dark:border-stone-800 space-y-5">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium">
                    Commande Validée & Enregistrée
                  </p>
                  <h3 className="text-xl font-semibold font-mono text-stone-900 dark:text-stone-100">
                    {confirmedReceipt.orderNumber}
                  </h3>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                Un email récapitulatif a été envoyé à <strong>{customerEmail}</strong>. Les ateliers
                partenaires préparent votre expédition.
              </p>

              <div className="p-4 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Mode de paiement :</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Paiement à la livraison (COD)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Réf. Commande COD :</span>
                  <span className="text-stone-900 dark:text-stone-100">
                    {confirmedReceipt.transactionReference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Statut de paiement :</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {confirmedReceipt.paymentStatus || 'PENDING'} — À régler à la réception
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">N° de suivi logistique :</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {confirmedReceipt.trackingNumber}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-800 text-sm font-semibold">
                  <span>Montant à régler à la livraison :</span>
                  <span>
                    {formatMoney(Number(confirmedReceipt.totalMad), currency, rates, language)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('cart');
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Continuer mes achats sur Maison Atlas
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-base font-medium text-stone-900 dark:text-stone-100">
                Votre panier est actuellement vide.
              </p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Parcourez les créations de nos manufactures partenaires pour ajouter des pièces à votre sélection.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-lg"
              >
                Découvrir le catalogue
              </button>
            </div>
          ) : step === 'cart' ? (
            <>
              {/* Itemized List */}
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.variantTitle}`}
                    className="flex gap-4 p-3.5 rounded-lg border border-stone-200 dark:border-stone-800"
                  >
                    <img
                      src={item.product.imageUrl}
                      alt={getLocalizedTitle(item.product, language)}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded object-cover bg-stone-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {getLocalizedTitle(item.product, language)}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.product.id, item.variantTitle)}
                          aria-label={`Supprimer ${getLocalizedTitle(item.product, language)}`}
                          className="text-stone-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-stone-500">{item.variantTitle}</p>
                      <div className="flex items-center justify-between pt-2">
                        <div className="inline-flex items-center border border-stone-300 dark:border-stone-700 rounded">
                          <button
                            type="button"
                            aria-label="Réduire la quantité"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.variantTitle, -1)
                            }
                            className="p-1.5 text-stone-600 dark:text-stone-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-mono tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Augmenter la quantité"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.variantTitle, 1)
                            }
                            className="p-1.5 text-stone-600 dark:text-stone-300"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-mono tabular-nums font-semibold text-stone-900 dark:text-stone-100">
                          {formatMoney(
                            Number(item.product.priceMad) * item.quantity,
                            currency,
                            rates,
                            language
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="p-4 rounded-lg border border-stone-200 dark:border-stone-800 space-y-2">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Code Promotionnel (ex: ATLAS15 ou BIENVENUE200)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="ATLAS15"
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 text-xs font-medium border border-stone-900 dark:border-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
                  >
                    Appliquer
                  </button>
                </div>
                {couponMessage && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">{couponMessage}</p>
                )}
              </div>

              {/* COD Payment Notice in Cart */}
              <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-start gap-3 text-xs">
                <Banknote className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    Mode de paiement exclusif : Paiement à la livraison (COD)
                  </p>
                  <p className="text-stone-600 dark:text-stone-400">
                    Payez uniquement à la réception de votre colis. Aucune carte bancaire ni paiement en ligne requis.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Checkout Form */
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  1. Coordonnées & Adresse de Livraison (Achat Invité ou Client)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Email de confirmation *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Téléphone (Suivi SMS) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Adresse complète *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Code postal *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingPostalCode}
                      onChange={(e) => setShippingPostalCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Carrier Selection */}
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Truck className="w-4 h-4" /> 2. Mode de Transport & Logistique
                </h3>
                <div className="space-y-2">
                  {shippingMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                        selectedShippingId === method.id
                          ? 'border-stone-900 bg-stone-50 dark:border-stone-100 dark:bg-stone-800/60'
                          : 'border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={selectedShippingId === method.id}
                          onChange={() => setSelectedShippingId(method.id)}
                        />
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100">
                            {method.name} ({method.estimatedDays})
                          </p>
                          <p className="text-stone-500">
                            Gratuit dès{' '}
                            {formatMoney(
                              Number(method.freeShippingThresholdMad),
                              currency,
                              rates,
                              language
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums font-medium">
                        {formatMoney(Number(method.baseFeeMad), currency, rates, language)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Exclusive COD Payment Mode */}
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> 3. Mode de Paiement : Paiement à la livraison
                </h3>
                <div className="p-3.5 rounded-lg border border-stone-900 bg-stone-50 dark:border-stone-100 dark:bg-stone-800/60 text-xs flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentGateway"
                    checked
                    readOnly
                    className="mt-0.5"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        <span>Paiement à la livraison (Cash on Delivery — COD)</span>
                      </p>
                      <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        COD OBLIGATOIRE
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      Vous payez uniquement lorsque vous recevez votre commande en main propre. Le statut de paiement initial sera enregistré en <strong className="font-mono">PENDING</strong> jusqu’à confirmation de réception.
                    </p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <p className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
                  {errorMsg}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Footer Totals & Primary CTA */}
        {cart.length > 0 && step !== 'confirmed' && (
          <div className="p-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Sous-total articles</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(financials.subtotalMad, currency, rates, language)}
                </span>
              </div>
              {financials.discountMad > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Réduction ({appliedCoupon?.code})</span>
                  <span className="font-mono tabular-nums">
                    -{formatMoney(financials.discountMad, currency, rates, language)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Frais de livraison ({activeShipping?.name})</span>
                <span className="font-mono tabular-nums">
                  {financials.shippingMad === 0
                    ? 'OFFERTS'
                    : formatMoney(financials.shippingMad, currency, rates, language)}
                </span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Dont TVA estimée (20% incluse)</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(financials.taxMad, currency, rates, language)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-800 text-sm font-semibold text-stone-900 dark:text-stone-100">
                <span>Total à régler ({currency})</span>
                <span className="font-mono tabular-nums text-base">
                  {formatMoney(financials.totalMad, currency, rates, language)}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs font-semibold rounded-lg transition-colors"
              >
                Procéder au Checkout Sécurisé
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="py-2.5 px-4 border border-stone-300 dark:border-stone-700 text-xs font-medium rounded-lg"
                >
                  Retour au panier
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitting
                    ? 'Traitement sécurisé...'
                    : `Confirmer la commande (${formatMoney(
                        financials.totalMad,
                        currency,
                        rates,
                        language
                      )})`}
                </button>
              </div>
            )}
          </div>
        )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
