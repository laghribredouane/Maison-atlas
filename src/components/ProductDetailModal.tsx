import React, { useState } from 'react';
import { X, Star, Heart, Truck, ShieldCheck, Check, Plus, Minus } from 'lucide-react';
import {
  Product,
  ProductVariant,
  Store,
  Category,
  Review,
  getLocalizedTitle,
  getLocalizedDescription,
  getLocalizedCategoryName,
} from '../types/marketplace';
import {
  SupportedCurrency,
  SupportedLanguage,
  ExchangeRateMap,
  formatMoney,
} from '../utils/marketplace-rules';

interface ProductDetailModalProps {
  product: Product | null;
  store?: Store;
  category?: Category;
  variants: ProductVariant[];
  reviews: Review[];
  similarProducts: Product[];
  currency: SupportedCurrency;
  language: SupportedLanguage;
  rates: ExchangeRateMap;
  isWishlisted: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, variantTitle: string, quantity: number) => void;
  onBuyNow: (product: Product, variantTitle: string, quantity: number) => void;
  onToggleWishlist: (productId: number) => void;
  onSelectProduct: (product: Product) => void;
  onSubmitReview: (input: {
    productId: number;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
  }) => Promise<void>;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  store,
  category,
  variants,
  reviews,
  similarProducts,
  currency,
  language,
  rates,
  isWishlisted,
  onClose,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onSelectProduct,
  onSubmitReview,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<string>(
    variants[0]?.title || 'Édition Originale / Standard'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [zoomActive, setZoomActive] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Review form state
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  if (!product) return null;

  const activeVariantObj = variants.find((v) => v.title === selectedVariant) || variants[0];
  const activePriceMad = activeVariantObj ? Number(activeVariantObj.priceMad) : Number(product.priceMad);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !reviewTitle.trim() || !reviewComment.trim()) {
      setReviewFeedback('Veuillez remplir tous les champs de votre avis.');
      return;
    }
    setSubmittingReview(true);
    setReviewFeedback(null);
    try {
      await onSubmitReview({
        productId: product.id,
        authorName: authorName.trim(),
        rating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      setAuthorName('');
      setReviewTitle('');
      setReviewComment('');
      setReviewFeedback('Votre avis vérifié a été publié avec succès.');
    } catch {
      setReviewFeedback('Erreur lors de la publication de votre avis.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={getLocalizedTitle(product, language)}
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-xl my-8 max-h-[90vh] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span>{category ? getLocalizedCategoryName(category, language) : 'Collection'}</span>
            <span aria-hidden="true">·</span>
            <span>{store?.name || 'Maison Atlas'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">SKU {product.sku}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fiche produit"
            className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 lg:p-8 space-y-10">
          {/* Contiguous Purchase Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Gallery */}
            <div className="lg:col-span-6 space-y-3">
              <div
                onClick={() => setZoomActive(!zoomActive)}
                className="relative aspect-4/3 w-full rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-zoom-in border border-stone-200/70 dark:border-stone-800"
              >
                {!imgError ? (
                  <img
                    src={product.imageUrl}
                    alt={getLocalizedTitle(product, language)}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      zoomActive ? 'scale-125' : 'scale-100'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-stone-500">
                    {getLocalizedTitle(product, language)}
                  </div>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Cliquez sur l’image pour activer ou désactiver la loupe haute définition.
              </p>
            </div>

            {/* Right Contiguous Purchase Module */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-2">
                  <span>{store?.name || 'Atelier Partenaire'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{store?.city || 'Marrakech'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {product.rating} ({product.reviewCount + reviews.length})
                  </span>
                </div>

                <h2 className="font-display text-2xl lg:text-3xl font-semibold text-stone-900 dark:text-stone-100">
                  {getLocalizedTitle(product, language)}
                </h2>
              </div>

              {/* Price block */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold font-mono tabular-nums text-stone-900 dark:text-stone-100">
                  {formatMoney(activePriceMad, currency, rates, language)}
                </span>
                {product.compareAtPriceMad && (
                  <span className="text-sm font-mono tabular-nums text-stone-400 line-through">
                    {formatMoney(Number(product.compareAtPriceMad), currency, rates, language)}
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {getLocalizedDescription(product, language)}
              </p>

              {/* Variants */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Variante & Finition
                </label>
                <div className="flex flex-wrap gap-2">
                  {(variants.length > 0
                    ? variants
                    : [
                        {
                          id: 0,
                          productId: product.id,
                          title: 'Édition Originale / Standard',
                          color: 'Naturel',
                          size: 'Standard',
                          sku: product.sku,
                          priceMad: product.priceMad,
                          stockQuantity: 15,
                        },
                      ]
                  ).map((v) => (
                    <button
                      key={v.title}
                      type="button"
                      onClick={() => setSelectedVariant(v.title)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        selectedVariant === v.title
                          ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                          : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {v.title} ({v.stockQuantity} en stock)
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center border border-stone-300 dark:border-stone-700 rounded-lg">
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-stone-600 dark:text-stone-300 hover:text-stone-900"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-mono tabular-nums font-medium">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-2.5 text-stone-600 dark:text-stone-300 hover:text-stone-900"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product, selectedVariant, quantity);
                    onClose();
                  }}
                  className="flex-1 min-w-[160px] py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Ajouter au panier
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onBuyNow(product, selectedVariant, quantity);
                  }}
                  className="py-2.5 px-5 border border-stone-900 dark:border-stone-200 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Acheter maintenant
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label="Ajouter à la liste de souhaits"
                  className={`p-2.5 rounded-lg border transition-colors ${
                    isWishlisted
                      ? 'border-rose-600 text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Delivery & Vendor Trust */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-stone-900 dark:text-stone-200 shrink-0" />
                  <span>
                    Expédition estimée : <strong>{product.deliveryEstimateDays}</strong> via Amana Express ou Aramex
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-stone-900 dark:text-stone-200 shrink-0" />
                  <span>
                    Authenticité garantie par <strong>{store?.name || 'Maison Atlas'}</strong> · Retour sous 14 jours
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Verified Reviews & Submit Form */}
          <div className="pt-8 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Avis Clients Vérifiés ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-stone-500">
                  Soyez le premier client à partager votre avis sur cette création.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-lg border border-stone-200 dark:border-stone-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                        <span className="font-medium text-stone-900 dark:text-stone-100">
                          {rev.authorName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Achat vérifié · {rev.rating}/5
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {rev.title}
                      </p>
                      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <form
                onSubmit={handleReviewSubmit}
                className="p-5 rounded-lg border border-stone-200 dark:border-stone-800 space-y-3"
              >
                <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Rédiger un avis sur cette pièce
                </h4>
                <div>
                  <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                    Votre nom & ville
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Ex: Karim T. — Rabat"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Note sur 5
                    </label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    >
                      <option value={5}>5 / 5 — Exceptionnel</option>
                      <option value={4}>4 / 5 — Très bien</option>
                      <option value={3}>3 / 5 — Satisfaisant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                      Titre de l’avis
                    </label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="Finitions remarquables"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-stone-600 dark:text-stone-400 mb-1">
                    Votre commentaire
                  </label>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Partagez votre expérience avec la matière, la livraison..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                  />
                </div>
                {reviewFeedback && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">{reviewFeedback}</p>
                )}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {submittingReview ? 'Publication...' : 'Publier mon avis'}
                </button>
              </form>
            </div>
          </div>

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <div className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-4">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Pièces Similaires de la Collection
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similarProducts.slice(0, 3).map((sim) => (
                  <button
                    key={sim.id}
                    type="button"
                    onClick={() => onSelectProduct(sim)}
                    className="text-left p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-stone-400 transition-colors flex items-center gap-3"
                  >
                    <img
                      src={sim.imageUrl}
                      alt={getLocalizedTitle(sim, language)}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded object-cover shrink-0 bg-stone-100"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                        {getLocalizedTitle(sim, language)}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-stone-500">
                        {formatMoney(Number(sim.priceMad), currency, rates, language)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
