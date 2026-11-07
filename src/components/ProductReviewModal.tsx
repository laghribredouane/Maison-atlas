import React, { useState } from 'react';
import { X, Star, CheckCircle2 } from 'lucide-react';
import { Product, Store, getLocalizedTitle } from '../types/marketplace';
import { SupportedLanguage } from '../utils/marketplace-rules';

interface ProductReviewModalProps {
  product: Product | null;
  store?: Store;
  language: SupportedLanguage;
  defaultAuthorName?: string;
  onClose: () => void;
  onSubmitReview: (input: {
    productId: number;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
  }) => Promise<void>;
}

const STAR_LABELS: Record<number, string> = {
  1: '1 étoile — Décevant',
  2: '2 étoiles — Moyen',
  3: '3 étoiles — Satisfaisant',
  4: '4 étoiles — Très bien',
  5: '5 étoiles — Exceptionnel',
};

export const ProductReviewModal: React.FC<ProductReviewModalProps> = ({
  product,
  store,
  language,
  defaultAuthorName = '',
  onClose,
  onSubmitReview,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState<string>(defaultAuthorName);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!product) return null;

  const activeStars = hoveredRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!authorName.trim() || !title.trim() || !comment.trim()) {
      setErrorMsg('Veuillez renseigner votre nom, un titre et votre commentaire.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitReview({
        productId: product.id,
        authorName: authorName.trim(),
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible d’enregistrer votre avis pour le moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Laisser un avis sur ${getLocalizedTitle(product, language)}`}
    >
      <div className="w-full max-w-lg rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {store?.name || 'Maison Atlas'} · Avis Client Vérifié
            </p>
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
              Laisser un avis client
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre d'avis"
            className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Summary Banner */}
        <div className="px-6 py-3.5 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center gap-3.5">
          <img
            src={product.imageUrl}
            alt={getLocalizedTitle(product, language)}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-lg object-cover bg-stone-200 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
              {getLocalizedTitle(product, language)}
            </p>
            <p className="text-xs text-stone-500 font-mono">
              SKU {product.sku} · Note actuelle : ★ {product.rating}/5
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {submitted ? (
            <div className="py-6 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 dark:text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  Merci pour votre avis ({rating}/5 étoiles)
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 max-w-sm mx-auto">
                  Votre évaluation sur « {getLocalizedTitle(product, language)} » a été publiée et
                  intégrée à la note de la pièce.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Fermer et retourner à la boutique
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Interactive 5-Star Selector */}
              <div className="space-y-2">
                <label className="block font-medium text-stone-700 dark:text-stone-300">
                  Votre note sur 5 étoiles *
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex items-center gap-1"
                    role="radiogroup"
                    aria-label="Note sur 5 étoiles"
                  >
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const active = starValue <= activeStars;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          role="radio"
                          aria-checked={rating === starValue}
                          aria-label={`${starValue} sur 5 étoiles`}
                          onClick={() => setRating(starValue)}
                          onMouseEnter={() => setHoveredRating(starValue)}
                          onMouseLeave={() => setHoveredRating(null)}
                          className="p-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-stone-900 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              active
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-stone-300 dark:text-stone-700'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="font-mono font-medium text-stone-700 dark:text-stone-300">
                    {STAR_LABELS[activeStars]}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="review-author-input"
                  className="block font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  Votre nom & ville *
                </label>
                <input
                  id="review-author-input"
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Ex: Salma Benjelloun — Casablanca"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label
                  htmlFor="review-title-input"
                  className="block font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  Titre de votre avis *
                </label>
                <input
                  id="review-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Finitions artisanales remarquables"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label
                  htmlFor="review-comment-input"
                  className="block font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  Votre avis détaillé *
                </label>
                <textarea
                  id="review-comment-input"
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre appréciation sur la qualité des matériaux, les finitions et la livraison..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              {errorMsg && (
                <p className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-semibold transition-colors whitespace-nowrap"
                >
                  {submitting ? 'Publication...' : 'Envoyer mon avis'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
