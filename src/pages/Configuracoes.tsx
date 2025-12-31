import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from '@/components/ui/sonner';

const Configuracoes = () => {
  const { store, setStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        cnpj: store.cnpj || '',
        phone: store.phone || '',
        email: store.email || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        zip_code: store.zip_code || '',
      });
      setLoading(false);
    }
  }, [store]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) {
      toast.error('Nenhuma loja selecionada.');
      return;
    }

    setLoading(true);
    const { error, data } = await supabase
      .from('stores')
      .update(formData)
      .eq('id', store.id)
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error('Erro ao atualizar as informações da loja.');
      console.error(error);
    } else {
      toast.success('Informações da loja atualizadas com sucesso!');
      if(data) {
        setStore(data);
      }
    }
  };

  if (loading && !store) {
    return <div>Carregando informações da loja...</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <Toaster />
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Loja</CardTitle>
          <CardDescription>Atualize as informações do seu estabelecimento.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Estabelecimento</Label>
              <Input id="name" value={formData.name} onChange={handleChange} placeholder="Nome da sua loja" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="contato@sualoja.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={formData.address} onChange={handleChange} placeholder="Rua, Número, Bairro" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={formData.city} onChange={handleChange} placeholder="Sua cidade" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input id="state" value={formData.state} onChange={handleChange} placeholder="Seu estado" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input id="zip_code" value={formData.zip_code} onChange={handleChange} placeholder="00000-000" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
