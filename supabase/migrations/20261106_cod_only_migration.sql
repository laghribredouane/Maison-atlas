-- =============================================================================
-- MIGRATION SQL COMPLÈTE : SUPPRESSION DES PASSERELLES EN LIGNE & ACTIVATION COD UNIQUEMENT
-- Conservation intégrale des comptes utilisateurs, commandes historiques et historique des paiements
-- =============================================================================

BEGIN;

-- 1. Normalisation non destructive des anciennes commandes et paiements vers COD
UPDATE public.orders
SET
  payment_gateway = 'COD',
  payment_status = CASE
    WHEN UPPER(payment_status) IN ('PAID', 'CAPTURED') THEN 'PAID'
    WHEN UPPER(payment_status) = 'FAILED' THEN 'FAILED'
    ELSE 'PENDING'
  END;

UPDATE public.payments
SET
  gateway = 'COD',
  status = CASE
    WHEN UPPER(status) IN ('PAID', 'CAPTURED') THEN 'PAID'
    WHEN UPPER(status) = 'FAILED' THEN 'FAILED'
    ELSE 'PENDING'
  END,
  sandbox_mode = FALSE;

-- 2. Valeurs par défaut obligatoires sur public.orders et public.payments
ALTER TABLE public.orders
  ALTER COLUMN payment_gateway SET DEFAULT 'COD',
  ALTER COLUMN payment_status SET DEFAULT 'PENDING';

ALTER TABLE public.payments
  ALTER COLUMN gateway SET DEFAULT 'COD',
  ALTER COLUMN status SET DEFAULT 'PENDING',
  ALTER COLUMN sandbox_mode SET DEFAULT FALSE;

-- 3. Contraintes SQL strictes : empêcher tout autre mode de paiement que COD
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_gateway_cod_only_chk,
  ADD CONSTRAINT orders_payment_gateway_cod_only_chk
    CHECK (payment_gateway = 'COD');

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_cod_chk,
  ADD CONSTRAINT orders_payment_status_cod_chk
    CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED'));

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_gateway_cod_only_chk,
  ADD CONSTRAINT payments_gateway_cod_only_chk
    CHECK (gateway = 'COD');

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_cod_chk,
  ADD CONSTRAINT payments_status_cod_chk
    CHECK (status IN ('PENDING', 'PAID', 'FAILED'));

-- 4. Trigger SQL : Forcer payment_gateway = 'COD' et payment_status = 'PENDING' à l'insertion
CREATE OR REPLACE FUNCTION public.enforce_cod_on_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ne jamais faire confiance aux valeurs de paiement envoyées par le frontend
  IF NEW.payment_gateway IS NOT NULL AND UPPER(NEW.payment_gateway) <> 'COD' THEN
    RAISE EXCEPTION 'Mode de paiement non autorisé (%). Seul le paiement à la livraison (COD) est accepté.', NEW.payment_gateway;
  END IF;

  NEW.payment_gateway := 'COD';
  NEW.payment_status := 'PENDING';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cod_on_order_insert ON public.orders;
CREATE TRIGGER trg_enforce_cod_on_order_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_cod_on_order_insert();

-- 5. Trigger SQL : Mise à jour automatique de l'historique (payment_events) lors de la confirmation par l'admin
CREATE OR REPLACE FUNCTION public.log_cod_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id INTEGER;
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    UPDATE public.payments
    SET status = NEW.payment_status,
        gateway = 'COD'
    WHERE order_id = NEW.id
    RETURNING id INTO v_payment_id;

    IF v_payment_id IS NOT NULL THEN
      INSERT INTO public.payment_events (payment_id, event_type, payload)
      VALUES (
        v_payment_id,
        CASE
          WHEN NEW.payment_status = 'PAID' THEN 'cod.payment_confirmed_paid'
          WHEN NEW.payment_status = 'FAILED' THEN 'cod.payment_failed'
          ELSE 'cod.payment_pending'
        END,
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'payment_method', 'COD',
          'previous_status', OLD.payment_status,
          'new_status', NEW.payment_status,
          'updated_at', NOW()
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_cod_payment_status_change ON public.orders;
CREATE TRIGGER trg_log_cod_payment_status_change
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_cod_payment_status_change();

-- 6. Protection Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Lecture : Le client lit ses propres commandes ; l'admin lit toutes les commandes
DROP POLICY IF EXISTS "Clients view own orders or admin views all" ON public.orders;
CREATE POLICY "Clients view own orders or admin views all"
  ON public.orders
  FOR SELECT
  USING (
    auth.uid()::text = user_uid
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_uid = auth.uid()::text AND ur.role = 'admin'
    )
  );

-- Insertion : Autoriser la création uniquement si payment_gateway = 'COD' et payment_status = 'PENDING'
DROP POLICY IF EXISTS "Insert COD orders only with PENDING status" ON public.orders;
CREATE POLICY "Insert COD orders only with PENDING status"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    payment_gateway = 'COD'
    AND payment_status = 'PENDING'
  );

-- Mise à jour : Seul un administrateur peut modifier payment_status (PENDING -> PAID / FAILED)
DROP POLICY IF EXISTS "Only admins can update order payment status" ON public.orders;
CREATE POLICY "Only admins can update order payment status"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_uid = auth.uid()::text AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    payment_gateway = 'COD'
    AND payment_status IN ('PENDING', 'PAID', 'FAILED')
  );

-- Lecture & Mise à jour des paiements réservées aux propriétaires de la commande (lecture) et admins (écriture)
DROP POLICY IF EXISTS "Read payments for own order or admin" ON public.payments;
CREATE POLICY "Read payments for own order or admin"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND (
          o.user_uid = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_uid = auth.uid()::text AND ur.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Only admins can update payments status" ON public.payments;
CREATE POLICY "Only admins can update payments status"
  ON public.payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_uid = auth.uid()::text AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    gateway = 'COD'
    AND status IN ('PENDING', 'PAID', 'FAILED')
  );

COMMIT;
