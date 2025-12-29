-- Criar tabela de lojas/mercados
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cnpj text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Adicionar coluna store_id na tabela profiles
ALTER TABLE public.profiles ADD COLUMN store_id uuid REFERENCES public.stores(id);

-- Adicionar coluna store_id nas outras tabelas
ALTER TABLE public.products ADD COLUMN store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.categories ADD COLUMN store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.sales ADD COLUMN store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.customers ADD COLUMN store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.bills ADD COLUMN store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.stock_movements ADD COLUMN store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.orders ADD COLUMN store_id uuid REFERENCES public.stores(id);

-- Função para obter o store_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Políticas RLS para stores
CREATE POLICY "Usuários podem ver sua loja" ON public.stores
FOR SELECT USING (id = public.get_user_store_id());

CREATE POLICY "Usuários podem atualizar sua loja" ON public.stores
FOR UPDATE USING (id = public.get_user_store_id());

-- Atualizar políticas de products
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON public.products;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar produtos" ON public.products;

CREATE POLICY "Usuários podem ver produtos da sua loja" ON public.products
FOR SELECT USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem criar produtos na sua loja" ON public.products
FOR INSERT WITH CHECK (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem atualizar produtos da sua loja" ON public.products
FOR UPDATE USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem deletar produtos da sua loja" ON public.products
FOR DELETE USING (store_id = public.get_user_store_id());

-- Atualizar políticas de categories
DROP POLICY IF EXISTS "Todos podem ver categorias" ON public.categories;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar categorias" ON public.categories;

CREATE POLICY "Usuários podem ver categorias da sua loja" ON public.categories
FOR SELECT USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem criar categorias na sua loja" ON public.categories
FOR INSERT WITH CHECK (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem atualizar categorias da sua loja" ON public.categories
FOR UPDATE USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem deletar categorias da sua loja" ON public.categories
FOR DELETE USING (store_id = public.get_user_store_id());

-- Atualizar políticas de customers
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON public.customers;

CREATE POLICY "Usuários podem ver clientes da sua loja" ON public.customers
FOR SELECT USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem criar clientes na sua loja" ON public.customers
FOR INSERT WITH CHECK (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem atualizar clientes da sua loja" ON public.customers
FOR UPDATE USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem deletar clientes da sua loja" ON public.customers
FOR DELETE USING (store_id = public.get_user_store_id());

-- Atualizar políticas de sales
DROP POLICY IF EXISTS "Usuários podem criar vendas" ON public.sales;
DROP POLICY IF EXISTS "Usuários podem ver suas vendas" ON public.sales;

CREATE POLICY "Usuários podem ver vendas da sua loja" ON public.sales
FOR SELECT USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem criar vendas na sua loja" ON public.sales
FOR INSERT WITH CHECK (store_id = public.get_user_store_id() AND auth.uid() = user_id);

-- Atualizar políticas de bills
DROP POLICY IF EXISTS "Usuários podem atualizar contas" ON public.bills;
DROP POLICY IF EXISTS "Usuários podem criar contas" ON public.bills;
DROP POLICY IF EXISTS "Usuários podem deletar contas" ON public.bills;
DROP POLICY IF EXISTS "Usuários podem ver suas contas" ON public.bills;

CREATE POLICY "Usuários podem ver contas da sua loja" ON public.bills
FOR SELECT USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem criar contas na sua loja" ON public.bills
FOR INSERT WITH CHECK (store_id = public.get_user_store_id() AND auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar contas da sua loja" ON public.bills
FOR UPDATE USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem deletar contas da sua loja" ON public.bills
FOR DELETE USING (store_id = public.get_user_store_id());

-- Atualizar políticas de stock_movements
DROP POLICY IF EXISTS "Usuários autenticados podem criar movimentações" ON public.stock_movements;
DROP POLICY IF EXISTS "Usuários autenticados podem ver movimentações" ON public.stock_movements;

CREATE POLICY "Usuários podem ver movimentações da sua loja" ON public.stock_movements
FOR SELECT USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem criar movimentações na sua loja" ON public.stock_movements
FOR INSERT WITH CHECK (store_id = public.get_user_store_id() AND auth.uid() = user_id);

-- Atualizar políticas de orders
DROP POLICY IF EXISTS "Usuários podem atualizar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuários podem criar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuários podem ver pedidos" ON public.orders;

CREATE POLICY "Usuários podem ver pedidos da sua loja" ON public.orders
FOR SELECT USING (store_id = public.get_user_store_id());

CREATE POLICY "Usuários podem criar pedidos na sua loja" ON public.orders
FOR INSERT WITH CHECK (store_id = public.get_user_store_id() AND auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar pedidos da sua loja" ON public.orders
FOR UPDATE USING (store_id = public.get_user_store_id());

-- Trigger para atualizar updated_at na tabela stores
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Atualizar função handle_new_user para incluir store_id (será null inicialmente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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