-- Etapa: Fluxo de Caixa avançado
-- 1) bills.paid_method
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS paid_method text CHECK (paid_method IN ('cash','credit','debit','pix'));
CREATE INDEX IF NOT EXISTS idx_bills_paid_method ON public.bills(paid_method);

-- 2) cash_movements (sangria/suprimento)
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('withdrawal','supply')),
  method text NOT NULL CHECK (method IN ('cash','credit','debit','pix')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_store ON public.cash_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_method ON public.cash_movements(method);

-- 3) RLS para cash_movements (por user)
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cash_movements_select_own ON public.cash_movements;
DROP POLICY IF EXISTS cash_movements_insert_own ON public.cash_movements;
DROP POLICY IF EXISTS cash_movements_update_own ON public.cash_movements;
DROP POLICY IF EXISTS cash_movements_delete_own ON public.cash_movements;
CREATE POLICY cash_movements_select_own ON public.cash_movements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY cash_movements_insert_own ON public.cash_movements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY cash_movements_update_own ON public.cash_movements FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY cash_movements_delete_own ON public.cash_movements FOR DELETE USING (user_id = auth.uid());
