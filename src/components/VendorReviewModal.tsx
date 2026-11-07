import React, { useState } from 'react';
import { Star, X, CheckCircle2, Store as StoreIcon, MessageSquarePlus } from 'lucide-react';
import { Store, VendorReview } from '../types/marketplace';
import { SupportedLanguage } from '../utils/marketplace-rules';

interface VendorReviewModalProps {
  store: Store;
  reviews: VendorReview[];
  language: SupportedLanguage;
  defaultAuthorName?: string;
  onClose: () => void;
  onSubmitVendorReview: (input: {
    storeId: number;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
  }) => Promise<void>;
}

export const VendorReviewModal: React.FC<VendorReviewModalProps> = ({
  store,
  reviews,
  defaultAuthorName = '',
  onClose,
  onSubmitVendorReview,
}) => {
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const activeRating = hoverRating ?? rating;

  const ratingLabels: Record<number, string> = {
    1: '1/5 — Décevant',
    2: '2/5 — Moyen',
    3: '3/5 — Correct',
    4: '4/5 — Très bon atelier',
    5: '5/5 — Excellence & Savoir-faire remarquable',
  };

  const storeReviews = reviews.filter((r) => r.storeId === store.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !title.trim() || !comment.trim()) {
      setError('Veuillez renseigner votre nom, un titre et votre commentaire sur le vendeur.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitVendorReview({
        storeId: store.id,
        authorName: authorName.trim(),
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      setSubmitted(true);
      setTitle('');
      setComment('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l’envoi de votre avis vendeur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Avis sur la boutique ${store.name}`}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#FAF8F5] dark:bg-stone-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <StoreIcon className="w-4 h-4 text-stone-900 dark:text-stone-100" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
                Avis Clients sur le Vendeur Certifié
              </p>
              <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100">
                {store.name} ({store.city})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre d'avis vendeur"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Store Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                  {store.name}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Manufacture Vérifiée COD
                </span>
              </div>
              <p className="text-xs text-stone-500 max-w-md">{store.description}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 text-amber-500 font-mono text-lg font-bold">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-stone-900 dark:text-stone-100">{store.rating} / 5</span>
              </div>
              <p className="text-xs text-stone-500 font-mono">{store.reviewCount} avis vérifiés</p>
            </div>
          </div>

          {/* Existing Vendor Reviews List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Derniers avis sur {store.name} ({storeReviews.length})
            </h3>
            {storeReviews.length === 0 ? (
              <p className="text-xs text-stone-500 italic p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
                Soyez le premier client à évaluer ce vendeur partenaire.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {storeReviews.slice(0, 4).map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-stone-300 dark:text-stone-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Client Vérifié COD
                      </span>
                    </div>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{rev.title}</p>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      {rev.comment}
                    </p>
                    <p className="text-[11px] text-stone-500 pt-1">
                      — {rev.authorName} · {new Date(rev.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Submit New Vendor Review */}
          {submitted ? (
            <div className="p-5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                  Merci pour votre évaluation vendeur !
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Votre note de {rating}/5 étoiles a été publiée et intégrée à la réputation de{' '}
                  <strong>{store.name}</strong>.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 text-xs font-medium rounded-lg"
                >
                  Ajouter un autre avis
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium rounded-lg"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 space-y-4 text-xs"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
                <MessageSquarePlus className="w-4 h-4 text-stone-900 dark:text-stone-100" />
                <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                  Évaluer le vendeur {store.name}
                </h3>
              </div>

              {/* Interactive 5-Star Selector */}
              <div className="space-y-1.5">
                <label className="block font-medium text-stone-700 dark:text-stone-300">
                  Votre note globale sur 5 étoiles *
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-1" role="radiogroup" aria-label="Note vendeur sur 5 étoiles">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const filled = star <= activeRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                          aria-checked={rating === star}
                          role="radio"
                          className="p-1 rounded-md focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              filled
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-stone-300 dark:text-stone-700'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="ml-2 text-xs font-mono font-medium text-stone-700 dark:text-stone-300">
                    {ratingLabels[activeRating]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">
                    Votre nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Ex: Karim Tazi, Rabat"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">
                    Titre de l’avis vendeur *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Expédition COD rapide et emballage soigné"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">
                  Votre retour sur le service, l’emballage et le respect des délais *
                </label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre expérience avec cette boutique partenaire (qualité du suivi, emballage, conformité à la livraison COD)..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
                />
              </div>

              {error && (
                <p className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Publication...' : 'Publier mon avis vendeur'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
