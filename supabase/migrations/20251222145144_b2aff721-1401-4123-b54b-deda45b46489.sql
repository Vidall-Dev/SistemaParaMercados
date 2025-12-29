-- Adicionar política de INSERT para stores
CREATE POLICY "Usuários autenticados podem criar lojas" ON public.stores
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir que usuários vejam a loja para a qual foram convidados (para novos usuários)
DROP POLICY IF EXISTS "Usuários podem ver sua loja" ON public.stores;
CREATE POLICY "Usuários podem ver sua loja" ON public.stores
FOR SELECT USING (
  id = public.get_user_store_id() 
  OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND store_id IS NOT NULL)
);