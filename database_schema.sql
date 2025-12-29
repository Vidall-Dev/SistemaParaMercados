-- ============================================
-- SCRIPT COMPLETO DO BANCO DE DADOS - PDV
-- Sistema Multi-Tenant com Lojas
-- ============================================

-- ============================================
-- 1. TABELA DE LOJAS (STORES)
-- ============================================
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. TABELA DE PROFILES (Usuários)
-- ============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'cashier'::text,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. FUNÇÃO PARA OBTER STORE_ID DO USUÁRIO
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================
-- 4. POLÍTICAS RLS PARA STORES
-- ============================================
CREATE POLICY "Usuários podem ver sua loja" 
  ON public.stores FOR SELECT 
  USING (
    (id = get_user_store_id()) OR 
    (NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.store_id IS NOT NULL))
  );

CREATE POLICY "Usuários autenticados podem criar lojas" 
  ON public.stores FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar sua loja" 
  ON public.stores FOR UPDATE 
  USING (id = get_user_store_id());

-- ============================================
-- 5. POLÍTICAS RLS PARA PROFILES
-- ============================================
CREATE POLICY "Usuários podem ver seu próprio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem criar seu próprio perfil" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 6. TABELA DE CATEGORIAS
-- ============================================
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver categorias da sua loja" 
  ON public.categories FOR SELECT 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem criar categorias na sua loja" 
  ON public.categories FOR INSERT 
  WITH CHECK (store_id = get_user_store_id());

CREATE POLICY "Usuários podem atualizar categorias da sua loja" 
  ON public.categories FOR UPDATE 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem deletar categorias da sua loja" 
  ON public.categories FOR DELETE 
  USING (store_id = get_user_store_id());

-- ============================================
-- 7. TABELA DE PRODUTOS
-- ============================================
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  barcode TEXT,
  price NUMERIC NOT NULL,
  cost_price NUMERIC,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  unit TEXT DEFAULT 'un'::text,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  category_id UUID REFERENCES public.categories(id),
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver produtos da sua loja" 
  ON public.products FOR SELECT 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem criar produtos na sua loja" 
  ON public.products FOR INSERT 
  WITH CHECK (store_id = get_user_store_id());

CREATE POLICY "Usuários podem atualizar produtos da sua loja" 
  ON public.products FOR UPDATE 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem deletar produtos da sua loja" 
  ON public.products FOR DELETE 
  USING (store_id = get_user_store_id());

-- ============================================
-- 8. TABELA DE CLIENTES
-- ============================================
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver clientes da sua loja" 
  ON public.customers FOR SELECT 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem criar clientes na sua loja" 
  ON public.customers FOR INSERT 
  WITH CHECK (store_id = get_user_store_id());

CREATE POLICY "Usuários podem atualizar clientes da sua loja" 
  ON public.customers FOR UPDATE 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem deletar clientes da sua loja" 
  ON public.customers FOR DELETE 
  USING (store_id = get_user_store_id());

-- ============================================
-- 9. TABELA DE VENDAS
-- ============================================
CREATE SEQUENCE IF NOT EXISTS sales_sale_number_seq;

CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_number INTEGER NOT NULL DEFAULT nextval('sales_sale_number_seq'::regclass),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  customer_id UUID REFERENCES public.customers(id),
  total_amount NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  sale_type TEXT DEFAULT 'cash'::text,
  status TEXT DEFAULT 'completed'::text,
  notes TEXT,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver vendas da sua loja" 
  ON public.sales FOR SELECT 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem criar vendas na sua loja" 
  ON public.sales FOR INSERT 
  WITH CHECK ((store_id = get_user_store_id()) AND (auth.uid() = user_id));

-- ============================================
-- 10. TABELA DE ITENS DE VENDA
-- ============================================
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de suas vendas" 
  ON public.sale_items FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Usuários podem criar itens de venda" 
  ON public.sale_items FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()
  ));

-- ============================================
-- 11. TABELA DE PAGAMENTOS MÚLTIPLOS
-- ============================================
CREATE TABLE public.sale_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id),
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver pagamentos" 
  ON public.sale_payments FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem criar pagamentos" 
  ON public.sale_payments FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_payments.sale_id AND sales.user_id = auth.uid()
  ));

-- ============================================
-- 12. TABELA DE PARCELAS
-- ============================================
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id),
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver parcelas" 
  ON public.installments FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem criar parcelas" 
  ON public.installments FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = installments.sale_id AND sales.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar parcelas" 
  ON public.installments FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 13. TABELA DE MOVIMENTAÇÕES DE ESTOQUE
-- ============================================
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver movimentações da sua loja" 
  ON public.stock_movements FOR SELECT 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem criar movimentações na sua loja" 
  ON public.stock_movements FOR INSERT 
  WITH CHECK ((store_id = get_user_store_id()) AND (auth.uid() = user_id));

-- ============================================
-- 14. TABELA DE CONTAS A PAGAR
-- ============================================
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  paid_date DATE,
  category TEXT,
  notes TEXT,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver contas da sua loja" 
  ON public.bills FOR SELECT 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem criar contas na sua loja" 
  ON public.bills FOR INSERT 
  WITH CHECK ((store_id = get_user_store_id()) AND (auth.uid() = user_id));

CREATE POLICY "Usuários podem atualizar contas da sua loja" 
  ON public.bills FOR UPDATE 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem deletar contas da sua loja" 
  ON public.bills FOR DELETE 
  USING (store_id = get_user_store_id());

-- ============================================
-- 15. TABELA DE PEDIDOS (Orders)
-- ============================================
CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq;

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number INTEGER NOT NULL DEFAULT nextval('orders_order_number_seq'::regclass),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  customer_id UUID REFERENCES public.customers(id),
  type TEXT NOT NULL,
  table_number TEXT,
  delivery_address TEXT,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  notes TEXT,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver pedidos da sua loja" 
  ON public.orders FOR SELECT 
  USING (store_id = get_user_store_id());

CREATE POLICY "Usuários podem criar pedidos na sua loja" 
  ON public.orders FOR INSERT 
  WITH CHECK ((store_id = get_user_store_id()) AND (auth.uid() = user_id));

CREATE POLICY "Usuários podem atualizar pedidos da sua loja" 
  ON public.orders FOR UPDATE 
  USING (store_id = get_user_store_id());

-- ============================================
-- 16. TABELA DE ITENS DE PEDIDO
-- ============================================
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de pedidos" 
  ON public.order_items FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem criar itens de pedidos" 
  ON public.order_items FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

-- ============================================
-- FUNÇÕES
-- ============================================

-- Função para criar profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, store_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NULL);
  RETURN NEW;
END;
$$;

-- Trigger para criar profile ao criar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar estoque após venda
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

-- Trigger para atualizar estoque após venda
CREATE TRIGGER update_stock_on_sale
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_after_sale();

-- Função para registrar movimentação de estoque
CREATE OR REPLACE FUNCTION public.register_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.stock_movements (product_id, quantity, type, reason, user_id, store_id)
  SELECT 
    NEW.product_id,
    -NEW.quantity,
    'exit',
    'Venda #' || (SELECT sale_number FROM sales WHERE id = NEW.sale_id),
    (SELECT user_id FROM sales WHERE id = NEW.sale_id),
    (SELECT store_id FROM sales WHERE id = NEW.sale_id);
  RETURN NEW;
END;
$$;

-- Trigger para registrar movimentação após venda
CREATE TRIGGER register_movement_on_sale
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.register_stock_movement();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_installments_updated_at
  BEFORE UPDATE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Função para atualizar parcelas vencidas
CREATE OR REPLACE FUNCTION public.update_overdue_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.installments
  SET status = 'overdue'
  WHERE due_date < CURRENT_DATE
  AND status = 'pending';
  RETURN NULL;
END;
$$;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
