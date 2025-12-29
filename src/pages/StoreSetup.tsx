import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { useStore } from "@/hooks/useStore";

const StoreSetup = () => {
  const navigate = useNavigate();
  const { refetch } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });

  useEffect(() => {
    checkExistingStore();
  }, []);

  const checkExistingStore = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Erro ao buscar perfil:", profileError);
    }

    if (profile?.store_id) {
      navigate("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/auth");
        return;
      }

      // Create store
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert([{
          name: formData.name,
          cnpj: formData.cnpj || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
        }])
        .select()
        .single();

      if (storeError) {
        console.error("Erro ao criar loja:", storeError);
        toast.error("Erro ao criar loja");
        return;
      }

      // Link store to the current user (creates the profile row if it doesn't exist)
      const email = session.user.email ?? "";
      const fullName = (session.user.user_metadata as any)?.full_name ?? null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: session.user.id,
            email,
            full_name: fullName,
            store_id: store.id,
          },
          { onConflict: "id" }
        )
        .select("id, store_id")
        .single();

      if (profileError) {
        console.error("Erro ao vincular loja:", profileError);
        toast.error("Erro ao vincular loja ao usuário");
        return;
      }

      if (!profile?.store_id) {
        toast.error("Não foi possível vincular o mercado ao seu usuário");
        return;
      }

      await refetch();
      toast.success("Mercado configurado com sucesso!");
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error("Erro ao processar requisição.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-[var(--shadow-elegant)]">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Configure seu Mercado</CardTitle>
            <CardDescription>
              Preencha os dados do seu estabelecimento para começar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full space-y-2">
                <Label htmlFor="name">Nome do Mercado*</Label>
                <Input
                  id="name"
                  placeholder="Ex: Mercado São João"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 0000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="col-span-full space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@mercado.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="col-span-full space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Rua, número, bairro"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  placeholder="UF"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  placeholder="00000-000"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Configurando..." : "Configurar Mercado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreSetup;
