import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
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
  const { storeId, store } = useStore();
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    saleId: string;
    saleNumber?: number | null;
    items: Array<{ id: string; name: string; quantity: number; price: number }>;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
    createdAt: string;
  } | null>(null);

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
      const saleSnapshot = items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));
      setReceiptData({
        saleId: saleData.id,
        saleNumber: (saleData as any)?.sale_number ?? null,
        items: saleSnapshot,
        total,
        paymentMethod,
        amountPaid,
        change,
        createdAt: new Date().toLocaleString('pt-BR'),
      });
      setIsReceiptModalOpen(true);
      // Limpar tudo após o sucesso
      setItems([]);
      setAmountPaid(0);
      setIsPaymentModalOpen(false);
      setPaymentMethod('Dinheiro');
    }

    setLoading(false);
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    if (typeof window === 'undefined') return;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Recibo de Venda</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1, h2 { text-align: center; margin: 0; }
            .info { margin-top: 12px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border-bottom: 1px solid #ddd; padding: 6px; text-align: left; font-size: 14px; }
            .total { font-size: 16px; font-weight: bold; margin-top: 12px; display: flex; justify-content: space-between; }
            .footer { text-align: center; margin-top: 18px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${store?.name ?? 'Sistema Mercado'}</h1>
          <h2>Recibo de Venda</h2>
          <div class="info">
            <div>ID da venda: ${receiptData.saleNumber ?? receiptData.saleId}</div>
            <div>Data: ${receiptData.createdAt}</div>
            <div>Método de Pagamento: ${receiptData.paymentMethod}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${receiptData.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>R$ ${item.price.toFixed(2)}</td>
                  <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <span>Total</span>
            <span>R$ ${receiptData.total.toFixed(2)}</span>
          </div>
          <div class="info">
            <div>Valor Recebido: R$ ${receiptData.amountPaid.toFixed(2)}</div>
            <div>Troco: R$ ${receiptData.change.toFixed(2)}</div>
          </div>
          <div class="footer">Obrigado pela preferência!</div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <>
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

    <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recibo gerado</DialogTitle>
          <DialogDescription>
            A venda foi registrada com sucesso. Você pode imprimir a notinha abaixo.
          </DialogDescription>
        </DialogHeader>
        {receiptData && (
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <p><strong>Venda:</strong> {receiptData.saleNumber ?? receiptData.saleId}</p>
              <p><strong>Data:</strong> {receiptData.createdAt}</p>
              <p><strong>Método:</strong> {receiptData.paymentMethod}</p>
            </div>
            <Separator />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {receiptData.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">{item.quantity} x R$ {item.price.toFixed(2)}</p>
                  </div>
                  <p className="font-semibold">R$ {(item.quantity * item.price).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1 text-sm">
              <p className="flex justify-between"><span>Total:</span><span className="font-semibold">R$ {receiptData.total.toFixed(2)}</span></p>
              <p className="flex justify-between"><span>Recebido:</span><span>R$ {receiptData.amountPaid.toFixed(2)}</span></p>
              <p className="flex justify-between"><span>Troco:</span><span>R$ {receiptData.change.toFixed(2)}</span></p>
            </div>
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
          <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)} className="w-full sm:w-auto">
            Fechar
          </Button>
          <Button onClick={handlePrintReceipt} className="w-full sm:w-auto">
            Imprimir notinha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default PDV;
