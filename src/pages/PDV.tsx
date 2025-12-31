import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Trash2 } from 'lucide-react';
import QuantityButton from '@/components/cart/QuantityButton';
import { PendingSalesDialog } from '@/components/cart/PendingSalesDialog';
import { PaymentModal, Payment } from '@/components/payment/PaymentModal';
import { useBarcodeInput } from '@/hooks/useBarcodeInput';
import { toast } from 'sonner';
import { usePendingSales } from '@/hooks/usePendingSales';
import { useAutoScroll } from '@/hooks/useAutoScroll';
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const cartRef = useRef<HTMLDivElement>(null);
  // pending sales
  const { pendingSales, suspendSale, resumeSale } = usePendingSales();
  const [pendingOpen, setPendingOpen] = useState(false);
  useAutoScroll(cartRef, [items]);

  // leitor de código de barras
  // função para suspender venda atual
  const suspendCurrentSale = async () => {
    if (items.length === 0) return;
    const cartPayload = items.map((it) => ({
      product_id: it.id,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
    }));
    await suspendSale(cartPayload);
    toast.success('Venda suspensa');
    setItems([]);
    setAmountPaid(0);
  };

  useBarcodeInput(async (code) => {
    // procura produto por código de barras exact match
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', code)
      .limit(1)
      .single();

    if (error || !data) {
      toast.error(`Produto não encontrado para código ${code}`);
      return;
    }
    addItemToCart(data);
  });
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
      if (e.key === 'F8') {
      e.preventDefault();
      setPendingOpen(true);
    }
    if (e.key === 'F9') {
      e.preventDefault();
      suspendCurrentSale();
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

  const incrementItem = (productId: string) => {
    setItems(prev => prev.map(it => it.id === productId ? { ...it, quantity: it.quantity + 1 } : it));
  };

  const decrementItem = (productId: string) => {
    setItems(prev => prev.flatMap(it => {
      if (it.id !== productId) return it;
      if (it.quantity === 1) return []; // remove
      return { ...it, quantity: it.quantity - 1 };
    }));
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
    if (typeof window === "undefined") return;

    // ----- Utilidades de formatação -----
    const WIDTH = 32; // 32 caracteres (~58 mm)
    const padCenter = (text: string) => {
      if (text.length >= WIDTH) return text.slice(0, WIDTH);
      const left = Math.floor((WIDTH - text.length) / 2);
      const right = WIDTH - text.length - left;
      return " ".repeat(left) + text + " ".repeat(right);
    };
    const padRight = (text: string, size: number) => (
      text.length >= size ? text.slice(0, size) : text + " ".repeat(size - text.length)
    );
    const padLeft = (text: string, size: number) => (
      text.length >= size ? text.slice(0, size) : " ".repeat(size - text.length) + text
    );

    // ----- Montagem do texto -----
    const lines: string[] = [];

    // Cabeçalho
    lines.push(padCenter(store?.name ?? "MEU MERCADO"));
    if (store?.address) lines.push(padCenter(store.address));
    lines.push("-".repeat(WIDTH));
    lines.push(`VENDA: ${receiptData.saleNumber ?? receiptData.saleId.substring(0, 6)}`);
    lines.push(`DATA : ${receiptData.createdAt}`);
    lines.push("-".repeat(WIDTH));

    // Tabela de produtos
    lines.push(padRight("ITEM", 20) + padLeft("QTD", 4) + padLeft("VL", 8));
    lines.push("-".repeat(WIDTH));
    receiptData.items.forEach((item) => {
      const totalItem = (item.quantity * item.price).toFixed(2);
      const name = padRight(item.name, 20);
      const qty = padLeft(item.quantity.toString(), 4);
      const vl = padLeft(totalItem, 8);
      lines.push(name + qty + vl);
    });
    lines.push("-".repeat(WIDTH));

    // Totais
    const totalStr = padLeft("R$ " + receiptData.total.toFixed(2), WIDTH);
    lines.push(totalStr);
    const recebidoStr = padLeft("Recebido: R$ " + receiptData.amountPaid.toFixed(2), WIDTH);
    lines.push(recebidoStr);
    const trocoStr = padLeft("Troco: R$ " + receiptData.change.toFixed(2), WIDTH);
    lines.push(trocoStr);
    lines.push("-".repeat(WIDTH));
    lines.push(padCenter("OBRIGADO E VOLTE SEMPRE!"));

    const receiptText = lines.join("\n");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Recibo</title><style>
      @media print { body { margin: 0; } }
      body { font-family: 'Courier New', monospace; white-space: pre; font-size: 12px; }
    </style></head><body>${receiptText}</body></html>`;

    const printWindow = window.open("", "", "width=300,height=600");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    
  }


  return (
    <>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={() => setPendingOpen(true)}>
          Vendas suspensas ({pendingSales.length})
        </Button>
      </div>
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
                    <QuantityButton type="minus" onClick={() => decrementItem(item.id)} disabled={item.quantity===1} />
                    <span className="w-6 text-center select-none">{item.quantity}</span>
                    <QuantityButton type="plus" onClick={() => incrementItem(item.id)} />
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
            <Button variant="outline" className="w-full mb-2" disabled={items.length===0} onClick={suspendCurrentSale}>
              Suspender venda (F9)
            </Button>
            <PaymentModal
                total={total}
                open={isPaymentModalOpen}
                onOpenChange={setIsPaymentModalOpen}
                onConfirm={(pay) => {
                  setPayments(pay);
                  // usa o primeiro método apenas para preencher campo obrigatório
                  setPaymentMethod(pay[0].method);
                  setAmountPaid(total);
                  handleFinalizeSale();
                }}
              />
              <Button size="lg" className="w-full text-lg" disabled={items.length===0} onClick={()=>setIsPaymentModalOpen(true)}>
               Finalizar (F12)
             </Button>
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
                    <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <QuantityButton type="minus" onClick={() => decrementItem(item.id)} disabled={item.quantity===1} />
                    <span className="w-6 text-center select-none">{item.quantity}</span>
                    <QuantityButton type="plus" onClick={() => incrementItem(item.id)} />
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
         
      
    
    <PendingSalesDialog
      open={pendingOpen}
      onOpenChange={setPendingOpen}
      onResume={(cart)=>{
        setItems(cart as any);
        setPendingOpen(false);
      }}
    />
    </>
  );
};

export default PDV;
