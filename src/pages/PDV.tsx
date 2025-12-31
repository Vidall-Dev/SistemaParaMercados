import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/hooks/useStore';

// Componente para a nova tela de PDV
const PDV = () => {
  // Estado de exemplo para os itens da venda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [amountPaid, setAmountPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { storeId } = useStore();

    useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,barcode.eq.${searchQuery}`)
        .limit(10);

      if (error) {
        console.error('Erro na busca:', error);
      } else {
        setSearchResults(data);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F12') {
        e.preventDefault();
        if (items.length > 0) {
          setIsPaymentModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items]);

  const addItemToCart = (product: any) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeItemFromCart = (productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const change = amountPaid > total ? amountPaid - total : 0;

  const handleFinalizeSale = async () => {
    if (!storeId) {
      console.error('Nenhuma loja selecionada');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Usuário não autenticado');
      setLoading(false);
      return;
    }

    // 1. Inserir na tabela 'sales'
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: user.id,
        total_amount: total,
        final_amount: total,
        payment_method: paymentMethod,
        store_id: storeId,
      })
      .select()
      .single();

    if (saleError || !saleData) {
      console.error('Erro ao criar venda:', saleError);
      setLoading(false);
      return;
    }

    // 2. Inserir na tabela 'sale_items'
    const saleItems = items.map(item => ({
      sale_id: saleData.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.quantity * item.price,
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);

    // 3. Atualizar o estoque
    if (!itemsError) {
      const stockUpdates = items.map(item => 
        supabase.rpc('decrement_stock', { 
          p_product_id: item.id, 
          p_quantity: item.quantity 
        })
      );
      
      await Promise.all(stockUpdates);
    }

    if (itemsError) {
      console.error('Erro ao inserir itens da venda:', itemsError);
      // Aqui você pode querer deletar a venda que foi criada para manter a consistência
    } else {
      // Limpar tudo após o sucesso
      setItems([]);
      setAmountPaid(0);
      setIsPaymentModalOpen(false);
    }

    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 p-4 h-[calc(100vh-80px)] bg-muted/40">
      
      {/* Coluna Esquerda: Busca de Produtos */}
      <div className="lg:col-span-3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Buscar Produtos</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
              ref={searchInputRef}
              placeholder="Buscar (F1)..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>
            <div className="flex-grow border rounded-lg p-2 bg-background">
              {
              searchResults.length > 0 ? (
                <ul className="space-y-2">
                  {searchResults.map(product => (
                    <li key={product.id}>
                      <Button 
                        variant="outline"
                        className="w-full justify-between h-auto"
                        onClick={() => addItemToCart(product)}
                      >
                        <div className="text-left">
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-muted-foreground">R$ {product.price.toFixed(2)}</p>
                        </div>
                        <span>Adicionar</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Digite para buscar produtos...</p>
              )
            }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coluna Central: Itens da Venda */}
      <div className="lg:col-span-4">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Itens da Venda</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto">
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">R$ {(item.quantity * item.price).toFixed(2)}</p>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => removeItemFromCart(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center text-xl font-bold border-t pt-4">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </CardFooter>
        </Card>
      </div>

      {/* Coluna Direita: Finalização */}
      <div className="lg:col-span-3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Finalizar Venda</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col gap-4">

            <div>
              <h3 className="text-lg font-semibold mb-2">Pagamento</h3>
              <div className="grid grid-cols-2 gap-2">
                 {['Dinheiro', 'Crédito', 'Débito', 'Pix'].map(method => (
                  <Button 
                    key={method} 
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full text-lg" disabled={items.length === 0}>
                  Finalizar (F12)
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Finalizar Venda</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-between text-2xl font-bold">
                    <span>Total a Pagar:</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                  <div>
                    <Label htmlFor="amountPaid">Valor Recebido</Label>
                    <Input 
                      id="amountPaid"
                      type="number"
                      value={amountPaid || ''}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="text-xl h-12"
                    />
                  </div>
                  <div className="flex justify-between text-2xl font-bold text-green-600">
                    <span>Troco:</span>
                    <span>R$ {change.toFixed(2)}</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleFinalizeSale} disabled={loading} className="w-full">
                    {loading ? 'Finalizando...' : 'Confirmar Pagamento'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>

    </div>
  );
};

export default PDV;
