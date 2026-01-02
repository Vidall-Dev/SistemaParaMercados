-- Adiciona timestamp de pagamento em contas
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Índice opcional para relatórios por período
CREATE INDEX IF NOT EXISTS idx_bills_paid_at ON public.bills(paid_at);

-- Backfill: para contas já pagas sem paid_at, usa paid_date ao meio-dia
UPDATE public.bills
   SET paid_at = (paid_date::timestamptz + INTERVAL '12 hours')
 WHERE status = 'paid' AND paid_at IS NULL AND paid_date IS NOT NULL;
