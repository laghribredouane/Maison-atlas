# Guide Complet de Déploiement, d'Administration et d'Utilisation (Compatible Smartphone Android)

Ce guide explique comment administrer, configurer et déployer la marketplace **Maison Atlas** en production, y compris depuis un navigateur mobile Android (Chrome).

---

## 1. Base de Données PostgreSQL & Migrations

La plateforme utilise **PostgreSQL (Cloud SQL / Supabase)** avec **36 tables relationnelles** gérées par **Drizzle ORM** (`src/db/schema.ts`) et sécurisées par **Row Level Security** (`supabase/migrations/0001_initial_marketplace_schema_and_rls.sql`).

### Vérification ou mise à jour du schéma :
- Le schéma est synchronisé automatiquement via Drizzle Kit (`src/db/drizzle.config.ts`).
- Pour exporter vers un projet Supabase externe depuis Android :
  1. Ouvrez `https://supabase.com/dashboard` sur Chrome Android.
  2. Créez un nouveau projet et ouvrez **SQL Editor**.
  3. Copiez le script de `supabase/migrations/0001_initial_marketplace_schema_and_rls.sql` et appuyez sur **Run**.

---

## 2. Configuration des Passerelles de Paiement (CMI, Payzone, Stripe, PayPal, COD)

Toutes les clés sont lues côté serveur via les variables d'environnement (`.env.example`) :

- `PAYMENT_SANDBOX_MODE="true"` : Active le mode test sécurisé avec vérification de signature HMAC-SHA256 et clé d'idempotence (`idem_<gateway>_<order>`).
- `CMI_MERCHANT_ID` & `CMI_STORE_KEY` : Identifiants Centre Monétique Interbancaire Maroc.
- `PAYZONE_MERCHANT_ACCOUNT` & `PAYZONE_SECRET_KEY` : Identifiants Payzone Maroc.
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` : Paiements internationaux par carte.
- `COD` : Paiement à la livraison activé nativement avec récapitulatif et suivi Amana / Aramex.

---

## 3. Guide des Espaces (Boutique, Client, Vendeur, Administrateur)

1. **Boutique Publique & Catalogue** :
   - Recherche instantanée, filtres par catégorie, boutique, prix et tri.
   - Changement de devise en temps réel (**MAD, EUR, USD**) et de langue (**FR, EN, AR avec RTL automatique**).
   - Panier persistant, codes promo (`ATLAS15`, `BIENVENUE200`) et Checkout invité ou connecté.
2. **Espace Client** :
   - Authentification Google Sign-In en un clic (Firebase Auth) + suivi de commandes, adresses, liste de souhaits, points de fidélité et demandes de retour/remboursement.
3. **Espace Vendeur (Multi-Boutiques)** :
   - Isolation par boutique (Atelier Sidi Ghanem, Ourika Botanica, Casa Chronographe).
   - Ajout/suppression de produits avec SKU, variantes et stock, gestion des expéditions (numéro de suivi) et portefeuille vendeur avec demandes de retrait bancaire.
4. **Console Administrateur (Inspiration Shopify Admin)** :
   - KPIs globaux (GMV, commissions nettes de la plateforme, panier moyen).
   - Validation des candidatures vendeurs, ajustement des taux de commission par boutique, création de codes promotionnels et approbation des virements vendeurs.
