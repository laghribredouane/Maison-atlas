import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, User, Store, ShieldCheck } from 'lucide-react';
import { validateEmailPasswordInput } from '../utils/marketplace-rules';

export interface AuthenticatedWorkspaceUser {
  uid: string;
  email: string;
  displayName: string;
  roles: Array<'customer' | 'vendor' | 'admin'>;
  storeId: number | null;
}

interface WorkspaceAuthGateProps {
  workspace: 'customer' | 'vendor' | 'admin';
  currentUser: AuthenticatedWorkspaceUser | null;
  onAuthenticated: (user: AuthenticatedWorkspaceUser) => void;
}

const WORKSPACE_META = {
  customer: {
    badge: '1 · Espace Client Sécurisé',
    title: 'Connexion à l’Espace Client',
    subtitle:
      'Connectez-vous avec votre adresse email et votre mot de passe pour consulter votre historique de commandes, suivre vos colis COD et gérer vos retours.',
    placeholderEmail: 'votre@email.ma',
    roleLabel: 'Client Privilège',
  },
  vendor: {
    badge: '2 · Portail & Dashboard Vendeur',
    title: 'Connexion à l’Espace Vendeur',
    subtitle:
      'Identifiez-vous par email et mot de passe pour accéder à votre Dashboard Vendeur, ajouter de nouveaux produits au catalogue et piloter vos expéditions.',
    placeholderEmail: 'atelier@votre-boutique.ma',
    roleLabel: 'Manufacture / Vendeur Partenaire',
  },
  admin: {
    badge: '3 · Console Admin — Contrôle Total',
    title: 'Connexion Console d’Administration',
    subtitle:
      'Accès sécurisé par email et mot de passe réservé à l’administration centrale pour superviser les boutiques, produits, commandes COD, commissions et virements.',
    placeholderEmail: 'admin@maison-atlas.ma',
    roleLabel: 'Administrateur Général',
  },
} as const;

export const WorkspaceAuthGate: React.FC<WorkspaceAuthGateProps> = ({
  workspace,
  currentUser,
  onAuthenticated,
}) => {
  const meta = WORKSPACE_META[workspace];
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [city, setCity] = useState<string>('Marrakech');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode('login');
    setErrorMsg(null);
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = validateEmailPasswordInput(email, password);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Veuillez vérifier vos identifiants.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet.');
      return;
    }

    if (mode === 'register' && workspace === 'vendor' && !storeName.trim()) {
      setErrorMsg('Veuillez indiquer le nom de votre boutique vendeur.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/email-login' : '/api/auth/email-register';
      const bodyPayload =
        mode === 'login'
          ? { email: email.trim(), password, workspace }
          : {
              email: email.trim(),
              password,
              fullName: fullName.trim(),
              accountType: workspace === 'vendor' ? 'vendor' : 'customer',
              storeName: storeName.trim() || undefined,
              city: city.trim() || 'Marrakech',
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec de l’authentification.');
      }

      onAuthenticated(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de se connecter.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-lg overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {meta.badge}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Authentification Email & Mot de Passe
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100">
            {meta.title}
          </h1>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            {meta.subtitle}
          </p>
          {currentUser && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300">
              Vous êtes actuellement connecté en tant que <strong>{currentUser.email}</strong>. Veuillez vous identifier avec un compte autorisé pour accéder à cet espace ({meta.roleLabel}).
            </div>
          )}
        </div>

        {/* Mode Switcher (Login / Register for Client & Vendor) */}
        {workspace !== 'admin' && (
          <div className="grid grid-cols-2 border-b border-stone-200 dark:border-stone-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-3 text-center transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100 font-semibold'
                  : 'bg-stone-50 dark:bg-stone-950 text-stone-500 hover:text-stone-800'
              }`}
            >
              Se connecter avec Email & Mot de passe
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`py-3 text-center transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100 font-semibold'
                  : 'bg-stone-50 dark:bg-stone-950 text-stone-500 hover:text-stone-800'
              }`}
            >
              {workspace === 'vendor' ? 'Créer un Compte Vendeur' : 'Créer un Compte Client'}
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-fullname"
                className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
              >
                Nom complet *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Salma Benjelloun"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>
          )}

          {mode === 'register' && workspace === 'vendor' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="auth-storename"
                  className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  Nom de votre Boutique *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-storename"
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Atelier Dar Zellige"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="auth-city"
                  className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                >
                  Ville de l’atelier *
                </label>
                <input
                  id="auth-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Marrakech"
                  className="w-full px-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Adresse Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={meta.placeholderEmail}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Mot de passe *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs"
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs font-semibold rounded-lg transition-colors"
          >
            {submitting
              ? 'Vérification des identifiants...'
              : mode === 'login'
                ? `Se connecter à ${
                    workspace === 'customer'
                      ? 'l’Espace Client'
                      : workspace === 'vendor'
                        ? 'l’Espace Vendeur'
                        : 'la Console Admin'
                  }`
                : 'Créer mon compte et accéder à mon espace'}
          </button>
        </form>
      </div>
    </div>
  );
};
