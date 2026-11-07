import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  MapPin,
  Heart,
  RotateCcw,
  LogOut,
  Award,
  Truck,
  Search,
  FileText,
  Printer,
  Download,
  X,
  Plus,
  Navigation,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Banknote,
  ShieldCheck,
  Phone,
  HelpCircle,
} from 'lucide-react';
import {
  OrderRecord,
  OrderItemRecord,
  Product,
  DashboardResponse,
  getLocalizedTitle,
} from '../types/marketplace';
import {
  SupportedCurrency,
  SupportedLanguage,
  ExchangeRateMap,
  formatMoney,
} from '../utils/marketplace-rules';
import { downloadOrderSummaryPdf } from '../utils/order-pdf';
import { getOrderTrackingDetails, TrackingDetails } from '../utils/order-tracking';

interface CustomerAccountViewProps {
  user: { uid: string; email: string | null; displayName: string | null } | null;
  orders: OrderRecord[];
  orderItems: OrderItemRecord[];
  addresses: DashboardResponse['addresses'];
  refunds: DashboardResponse['refunds'];
  wishlistIds: number[];
  products: Product[];
  currency: SupportedCurrency;
  language: SupportedLanguage;
  rates: ExchangeRateMap;
  onSignOut: () => void;
  onRequestRefund: (orderId: number, reason: string, amountMad: number) => Promise<void>;
  onCreateAddress?: (input: {
    label: string;
    recipientName: string;
    phone: string;
    streetAddress: string;
    city: string;
    postalCode: string;
  }) => Promise<void>;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, variantTitle: string, quantity: number) => void;
}

export const CustomerAccountView: React.FC<CustomerAccountViewProps> = ({
  user,
  orders,
  orderItems,
  addresses,
  refunds,
  wishlistIds,
  products,
  currency,
  language,
  rates,
  onSignOut,
  onRequestRefund,
  onCreateAddress,
  onSelectProduct,
  onAddToCart,
}) => {
  const [activeSection, setActiveSection] = useState<'orders' | 'wishlist' | 'addresses' | 'returns'>('orders');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [receiptOrder, setReceiptOrder] = useState<OrderRecord | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<OrderRecord | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const trackingDetails = useMemo<TrackingDetails | null>(() => {
    if (!trackingOrder) return null;
    return getOrderTrackingDetails(trackingOrder);
  }, [trackingOrder]);

  // New Address Form State
  const [addrLabel, setAddrLabel] = useState('');
  const [addrRecipient, setAddrRecipient] = useState(user?.displayName || '');
  const [addrPhone, setAddrPhone] = useState('+212 6 61 00 00 00');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('Casablanca');
  const [addrPostal, setAddrPostal] = useState('20000');

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  const filteredOrders = orders.filter((ord) => {
    if (orderStatusFilter !== 'all' && ord.orderStatus !== orderStatusFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.shippingCity.toLowerCase().includes(q) ||
        (ord.trackingNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRefundSubmit = async (e: React.FormEvent, order: OrderRecord) => {
    e.preventDefault();
    if (!refundReason.trim()) return;
    await onRequestRefund(order.id, refundReason.trim(), Number(order.totalMad));
    setRefundOrderId(null);
    setRefundReason('');
    setFeedback(`Demande de retour enregistrée pour la commande ${order.orderNumber}.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header & Auth Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Espace Client Connecté ({user?.email}) · Paiement COD à la livraison
          </p>
          <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-stone-100">
            {user ? `Bienvenue, ${user.displayName || user.email}` : 'Mon Compte & Historique de Commandes'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-800 text-xs flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Solde Fidélité : <strong className="font-mono">1 200 pts</strong></span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Se déconnecter
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
          {feedback}
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-4">
        <button
          type="button"
          onClick={() => setActiveSection('orders')}
          className={`px-4 py-2 text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors ${
            activeSection === 'orders'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Historique & Suivi Commandes ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('wishlist')}
          className={`px-4 py-2 text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors ${
            activeSection === 'wishlist'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Heart className="w-3.5 h-3.5" /> Liste de Souhaits ({wishlistedProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('addresses')}
          className={`px-4 py-2 text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors ${
            activeSection === 'addresses'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Carnet d’Adresses ({addresses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('returns')}
          className={`px-4 py-2 text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors ${
            activeSection === 'returns'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retours & Remboursements ({refunds.length})
        </button>
      </div>

      {/* Section Content */}
      {activeSection === 'orders' && (
        <div className="space-y-4">
          {/* Filter & Search Bar for Order History */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Rechercher N° commande, suivi ou ville..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'all', label: 'Toutes les commandes' },
                  { id: 'confirmed', label: 'Confirmées' },
                  { id: 'preparing', label: 'En préparation' },
                  { id: 'shipped', label: 'Expédiées' },
                  { id: 'delivered', label: 'Livrées' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    orderStatusFilter === st.id
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center text-xs text-stone-500">
              Aucune commande trouvée pour ce filtre.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const itemsForOrder = orderItems.filter((oi) => oi.orderId === order.id);
              return (
                <div
                  key={order.id}
                  className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-500">
                      <span className="font-mono font-semibold text-sm text-stone-900 dark:text-stone-100">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Mode de règlement : <strong className="text-stone-900 dark:text-stone-100">COD (Paiement à la livraison)</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Statut expédition :{' '}
                        <strong className="text-stone-900 dark:text-stone-100 uppercase">
                          {order.orderStatus}
                        </strong>
                      </span>
                    </div>
                    <div className="text-sm font-mono tabular-nums font-semibold text-stone-900 dark:text-stone-100">
                      Total COD : {formatMoney(Number(order.totalMad), currency, rates, language)}
                    </div>
                  </div>

                  {/* 4-Step Visual COD Delivery Progress Tracker */}
                  <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
                    {(
                      [
                        { key: 'confirmed', label: '1. Confirmée' },
                        { key: 'preparing', label: '2. Préparation Atelier' },
                        { key: 'shipped', label: '3. En transit' },
                        { key: 'delivered', label: '4. Livrée & Réglée COD' },
                      ] as const
                    ).map((stepObj, idx) => {
                      const statusOrder = ['confirmed', 'preparing', 'shipped', 'delivered'];
                      const currentIdx = Math.max(0, statusOrder.indexOf(order.orderStatus));
                      const active = idx <= currentIdx;
                      return (
                        <div key={stepObj.key} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              active
                                ? 'bg-stone-900 dark:bg-stone-100'
                                : 'bg-stone-200 dark:bg-stone-800'
                            }`}
                          />
                          <p
                            className={`text-[11px] truncate ${
                              active
                                ? 'font-medium text-stone-900 dark:text-stone-100'
                                : 'text-stone-400'
                            }`}
                          >
                            {stepObj.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Itemized Products in this Order */}
                  {itemsForOrder.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800 space-y-2">
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Pièces commandées ({itemsForOrder.length}) :
                      </p>
                      <div className="divide-y divide-stone-200/70 dark:divide-stone-800 text-xs">
                        {itemsForOrder.map((item) => (
                          <div
                            key={item.id}
                            className="py-1.5 flex items-center justify-between gap-4"
                          >
                            <div>
                              <span className="font-medium text-stone-900 dark:text-stone-100">
                                {item.quantity}x {item.productTitle}
                              </span>
                              <span className="text-stone-500 ml-2">
                                ({item.variantTitle} · SKU {item.sku})
                              </span>
                            </div>
                            <span className="font-mono tabular-nums font-medium">
                              {formatMoney(Number(item.subtotalMad), currency, rates, language)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-stone-800 dark:text-stone-200 shrink-0" />
                      <span>
                        {order.shippingMethodName} — Livraison à : {order.customerName}, {order.shippingAddress}, {order.shippingCity} ({order.shippingPostalCode})
                      </span>
                      {order.trackingNumber && (
                        <span className="font-mono text-stone-900 dark:text-stone-100">
                          · Suivi {order.trackingNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTrackingOrder(order);
                          setCopiedTracking(false);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-amber-600/40 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 inline-flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Suivre mon colis
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const fileName = downloadOrderSummaryPdf(order, itemsForOrder, {
                            currency,
                            rates,
                            language,
                          });
                          setFeedback(`Récapitulatif PDF téléchargé : ${fileName}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 inline-flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Télécharger PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => setReceiptOrder(order)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-1.5 font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" /> Bon de Livraison COD
                      </button>

                      {order.orderStatus !== 'return_requested' && (
                        <button
                          type="button"
                          onClick={() =>
                            setRefundOrderId(refundOrderId === order.id ? null : order.id)
                          }
                          className="text-xs font-medium text-stone-700 dark:text-stone-300 underline hover:text-stone-900"
                        >
                          Demander un retour / échange
                        </button>
                      )}
                    </div>
                  </div>

                  {refundOrderId === order.id && (
                    <form
                      onSubmit={(e) => handleRefundSubmit(e, order)}
                      className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        required
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Motif du retour (ex: Changement de dimension souhaité)"
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-lg whitespace-nowrap"
                      >
                        Envoyer la demande
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeSection === 'wishlist' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistedProducts.length === 0 ? (
            <p className="text-sm text-stone-500 col-span-full">
              Vous n’avez pas encore ajouté de pièces à votre liste de souhaits.
            </p>
          ) : (
            wishlistedProducts.map((product) => (
              <div
                key={product.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
              >
                <img
                  src={product.imageUrl}
                  alt={getLocalizedTitle(product, language)}
                  referrerPolicy="no-referrer"
                  className="w-full aspect-4/3 object-cover rounded-lg bg-stone-100"
                />
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {getLocalizedTitle(product, language)}
                </h3>
                <p className="text-sm font-mono tabular-nums font-medium">
                  {formatMoney(Number(product.priceMad), currency, rates, language)}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onAddToCart(product, 'Édition Originale / Standard', 1)}
                    className="flex-1 py-2 px-3 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-lg"
                  >
                    Ajouter au panier
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="py-2 px-3 border border-stone-300 dark:border-stone-700 text-xs font-medium rounded-lg"
                  >
                    Détails
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {onCreateAddress && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!addrLabel.trim() || !addrRecipient.trim() || !addrStreet.trim()) return;
                await onCreateAddress({
                  label: addrLabel.trim(),
                  recipientName: addrRecipient.trim(),
                  phone: addrPhone.trim(),
                  streetAddress: addrStreet.trim(),
                  city: addrCity.trim(),
                  postalCode: addrPostal.trim(),
                });
                setAddrLabel('');
                setAddrStreet('');
                setFeedback('Nouvelle adresse de livraison enregistrée dans votre carnet.');
              }}
              className="lg:col-span-5 p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 text-xs"
            >
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Ajouter une Adresse de Livraison COD
              </h2>
              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">
                  Intitulé de l’adresse *
                </label>
                <input
                  type="text"
                  required
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  placeholder="Ex: Résidence Principale / Bureau"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">
                    Destinataire *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrRecipient}
                    onChange={(e) => setAddrRecipient(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">
                  Rue, numéro et quartier *
                </label>
                <input
                  type="text"
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="Ex: 18 Rue Tensift, Agdal"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">
                    Code Postal *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrPostal}
                    onChange={(e) => setAddrPostal(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold rounded-lg"
              >
                Enregistrer cette adresse
              </button>
            </form>
          )}

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1.5 text-xs"
              >
                <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                  {addr.label} — {addr.recipientName}
                </p>
                <p className="text-stone-600 dark:text-stone-300">{addr.streetAddress}</p>
                <p className="text-stone-600 dark:text-stone-300">
                  {addr.postalCode} {addr.city}, {addr.country}
                </p>
                <p className="font-mono text-stone-500">{addr.phone}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'returns' && (
        <div className="space-y-3">
          {refunds.length === 0 ? (
            <p className="text-sm text-stone-500">Aucune demande de retour ou remboursement en cours.</p>
          ) : (
            refunds.map((ref) => (
              <div
                key={ref.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    Commande #{ref.orderId} · Motif : {ref.reason}
                  </p>
                  <p className="text-stone-500">Statut : {ref.status.toUpperCase()}</p>
                </div>
                <span className="font-mono tabular-nums font-semibold">
                  {formatMoney(Number(ref.amountMad), currency, rates, language)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Printable COD Delivery Note / Receipt Modal */}
      {receiptOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={`Bon de livraison COD ${receiptOrder.orderNumber}`}
        >
          <div className="w-full max-w-lg rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <p className="text-xs font-mono uppercase text-stone-500">
                  Maison Atlas Marketplace · Bordereau Officiel COD
                </p>
                <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
                  Bon de Livraison {receiptOrder.orderNumber}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fermer le bon de livraison"
                onClick={() => setReceiptOrder(null)}
                className="p-1.5 text-stone-500 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                <div>
                  <p className="text-stone-500">Destinataire</p>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    {receiptOrder.customerName}
                  </p>
                  <p className="text-stone-600 dark:text-stone-400">
                    {receiptOrder.shippingAddress}, {receiptOrder.shippingCity} ({receiptOrder.shippingPostalCode})
                  </p>
                  <p className="font-mono text-stone-500">{receiptOrder.customerPhone}</p>
                </div>
                <div>
                  <p className="text-stone-500">Expédition & Règlement</p>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    COD — Paiement à la livraison
                  </p>
                  <p className="text-stone-600 dark:text-stone-400">
                    {receiptOrder.shippingMethodName}
                  </p>
                  <p className="font-mono text-stone-900 dark:text-stone-100">
                    Suivi : {receiptOrder.trackingNumber}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800 border-y border-stone-200 dark:border-stone-800 py-2">
                {orderItems
                  .filter((oi) => oi.orderId === receiptOrder.id)
                  .map((item) => (
                    <div key={item.id} className="py-2 flex justify-between">
                      <span>
                        {item.quantity}x {item.productTitle} ({item.sku})
                      </span>
                      <span className="font-mono tabular-nums font-semibold">
                        {formatMoney(Number(item.subtotalMad), currency, rates, language)}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="flex justify-between items-center pt-1 text-sm font-semibold">
                <span>Montant net à remettre au livreur (COD) :</span>
                <span className="font-mono tabular-nums text-base">
                  {formatMoney(Number(receiptOrder.totalMad), currency, rates, language)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  const itemsForReceipt = orderItems.filter(
                    (oi) => oi.orderId === receiptOrder.id
                  );
                  const fileName = downloadOrderSummaryPdf(receiptOrder, itemsForReceipt, {
                    currency,
                    rates,
                    language,
                  });
                  setFeedback(`Récapitulatif PDF téléchargé : ${fileName}`);
                }}
                className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Télécharger le PDF (.pdf)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 border border-stone-300 dark:border-stone-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimer
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="px-4 py-2 border border-stone-300 dark:border-stone-700 text-xs font-medium rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Order Tracking Modal */}
      <AnimatePresence>
        {trackingOrder && trackingDetails && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={`Suivi en temps réel de la commande ${trackingOrder.orderNumber}`}
          >
            {/* Backdrop */}
            <motion.div
              key="tracking-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setTrackingOrder(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              aria-hidden="true"
            />

            {/* Modal Card */}
            <motion.div
              key="tracking-card"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
                      Suivi Logistique en Direct
                    </span>
                    <span className="text-xs text-stone-500">
                      {trackingDetails.carrierName}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
                    Acheminement · {trackingDetails.orderNumber}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Fermer la fenêtre de suivi"
                  onClick={() => setTrackingOrder(null)}
                  className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
                {/* Tracking Number & Copy Bar */}
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-stone-500 uppercase tracking-wider font-medium">
                        Numéro de suivi officiel
                      </p>
                      <p className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100 select-all">
                        {trackingDetails.trackingNumber}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(trackingDetails.trackingNumber);
                      }
                      setCopiedTracking(true);
                      setTimeout(() => setCopiedTracking(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 inline-flex items-center gap-1.5 font-medium transition-colors"
                  >
                    {copiedTracking ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 dark:text-emerald-400">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le numéro</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Real-time Status Card */}
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            trackingDetails.isDelivered ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        <span
                          className={`relative inline-flex rounded-full h-3 w-3 ${
                            trackingDetails.isDelivered ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                      </span>
                      <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                        {trackingDetails.currentStatusLabel}
                      </span>
                    </div>

                    <span className="font-mono text-[11px] text-stone-500">
                      Scan récent : {trackingDetails.currentLocation}
                    </span>
                  </div>

                  <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                    {trackingDetails.currentStatusDescription}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px]">
                    <div>
                      <span className="text-stone-500">Destination finale :</span>
                      <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                        {trackingDetails.destinationAddress}, {trackingDetails.destinationCity}
                      </p>
                    </div>
                    <div>
                      <span className="text-stone-500">Livraison estimée :</span>
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {trackingDetails.estimatedDeliveryDate}
                      </p>
                    </div>
                  </div>
                </div>

                {/* COD Payment Reminder Alert */}
                <div className="p-3.5 rounded-xl border border-emerald-300/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      Règlement à la livraison (Cash on Delivery)
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      Merci de prévoir la somme exacte de{' '}
                      <strong className="font-mono text-emerald-800 dark:text-emerald-300">
                        {formatMoney(
                          trackingDetails.totalCodAmountMad,
                          currency,
                          rates,
                          language
                        )}
                      </strong>{' '}
                      en espèces à remettre directement au livreur lors de la réception de votre colis.
                    </p>
                  </div>
                </div>

                {/* Vertical Timeline */}
                <div className="space-y-2 pt-2">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-xs flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-stone-500" />
                    Étapes du parcours d’acheminement
                  </h3>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
                    {trackingDetails.milestones.map((ms) => {
                      const isCompleted = ms.status === 'completed';
                      const isCurrent = ms.status === 'current';

                      return (
                        <div key={ms.id} className="relative space-y-1">
                          {/* Dot / Icon */}
                          <div
                            className={`absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : isCurrent
                                  ? 'bg-amber-500 border-amber-500 text-white animate-pulse'
                                  : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-400'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : isCurrent ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4
                              className={`text-xs font-semibold ${
                                isCurrent
                                  ? 'text-amber-800 dark:text-amber-300'
                                  : isCompleted
                                    ? 'text-stone-900 dark:text-stone-100'
                                    : 'text-stone-400 dark:text-stone-500'
                              }`}
                            >
                              {ms.title}
                            </h4>
                            <span className="font-mono text-[11px] text-stone-400">
                              {ms.timestamp}
                            </span>
                          </div>

                          <p className="text-[11px] text-stone-500 font-medium">
                            {ms.location}
                          </p>

                          <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                            {ms.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Carrier Support Notice */}
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                    <Phone className="w-3.5 h-3.5 text-stone-500" />
                    <span>Assistance transporteur :</span>
                    <strong className="text-stone-900 dark:text-stone-100 font-mono">
                      {trackingDetails.carrierContact}
                    </strong>
                  </div>
                  <span className="text-stone-400 font-mono">24/7 COD Support</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap justify-end gap-2.5 px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50">
                <button
                  type="button"
                  onClick={() => {
                    const itemsForOrder = orderItems.filter(
                      (oi) => oi.orderId === trackingOrder.id
                    );
                    const fileName = downloadOrderSummaryPdf(trackingOrder, itemsForOrder, {
                      currency,
                      rates,
                      language,
                    });
                    setFeedback(`Récapitulatif PDF téléchargé : ${fileName}`);
                  }}
                  className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger PDF
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 text-xs font-medium rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
