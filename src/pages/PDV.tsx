import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, ShoppingCart, Banknote, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SalesReceipt from "@/components/SalesReceipt";
import { InstallmentSaleDialog } from "@/components/InstallmentSaleDialog";
import { MultiplePaymentsDialog } from "@/components/MultiplePaymentsDialog";
import { PrintReceiptButton } from "@/components/PrintReceiptButton";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  unit: string;
  barcode: string | null;
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}

const PDV = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [discount, setDiscount] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [currentSaleAmount, setCurrentSaleAmount] = useState<number>(0);
  const [currentChange, setCurrentChange] = useState<number>(0);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);
  const [multiplePaymentsOpen, setMultiplePaymentsOpen] = useState(false);
  const [saleType, setSaleType] = useState<"cash" | "installment">("cash");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, stock_quantity, unit, barcode")
      .eq("active", true)
      .order("name");
    setProducts(data || []);
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error("Quantidade excede o estoque disponível");
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        )
      );
    } else {
      if (product.stock_quantity < 1) {
        toast.error("Produto sem estoque");
        return;
      }
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          subtotal: product.price,
        },
      ]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQuantity > product.stock_quantity) {
      toast.error("Quantidade excede o estoque disponível");
      return;
    }

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
            }
          : item
      )
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountValue = parseFloat(discount) || 0;
  const finalAmount = totalAmount - discountValue;
  const receivedValue = parseFloat(amountReceived) || 0;
  const changeValue = receivedValue > 0 ? receivedValue - finalAmount : 0;

  const completeSale = async (payments?: Array<{ method: string; amount: string }>) => {
    if (cart.length === 0) {
      toast.error("Adicione produtos ao carrinho");
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    // Verificar se o profile existe e obter store_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, store_id")
      .eq("id", session.user.id)
      .single();

    if (!profile) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ id: session.user.id, email: session.user.email! }]);
      
      if (profileError) {
        console.error("Erro ao criar perfil:", profileError);
        toast.error("Erro ao criar perfil do usuário");
        return;
      }
    }

    if (!profile?.store_id) {
      toast.error("Você precisa configurar uma loja primeiro.");
      return;
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          user_id: session.user.id,
          store_id: profile.store_id,
          total_amount: totalAmount,
          discount: discountValue,
          final_amount: finalAmount,
          payment_method: payments ? "multiple" : paymentMethod,
          sale_type: saleType,
        },
      ])
      .select()
      .single();

    if (saleError) {
      console.error("Erro ao registrar venda:", saleError);
      toast.error(`Erro ao registrar venda: ${saleError.message}`);
      return;
    }

    const saleItems = cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);

    if (itemsError) {
      console.error("Erro ao registrar itens:", itemsError);
      toast.error(`Erro ao registrar itens: ${itemsError.message}`);
      return;
    }

    // Registrar múltiplos pagamentos se aplicável
    if (payments && payments.length > 0) {
      const salePayments = payments.map((p) => ({
        sale_id: sale.id,
        payment_method: p.method,
        amount: parseFloat(p.amount),
      }));
      await supabase.from("sale_payments").insert(salePayments);
    }

    toast.success("Venda finalizada com sucesso!");
    setCurrentSaleId(sale.id);
    setCurrentSaleAmount(finalAmount);
    setCurrentChange(changeValue > 0 ? changeValue : 0);

    if (saleType === "installment") {
      setInstallmentDialogOpen(true);
    } else {
      setReceiptOpen(true);
    }

    setCart([]);
    setDiscount("");
    setAmountReceived("");
    setPaymentMethod("cash");
    setSaleType("cash");
    loadProducts();
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">PDV - Ponto de Venda</h1>
          <p className="text-muted-foreground">Realize vendas rapidamente</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Produtos */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle>Produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Buscar por nome ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="flex justify-between items-center p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Estoque: {product.stock_quantity} {product.unit}
                      </p>
                    </div>
                    <Badge variant="secondary">R$ {product.price.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Carrinho */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrinho ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {item.price.toFixed(2)} x {item.quantity} = R${" "}
                        {item.subtotal.toFixed(2)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                      className="w-20"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="space-y-3 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="discount">Desconto (R$)</Label>
                      <Input
                        id="discount"
                        type="number"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleType">Tipo de Venda</Label>
                      <Select value={saleType} onValueChange={(value: any) => setSaleType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">À Vista</SelectItem>
                          <SelectItem value="installment">Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment">Forma de Pagamento</Label>
                      <Select value={paymentMethod} onValueChange={(value) => {
                        setPaymentMethod(value);
                        if (value !== "cash") {
                          setAmountReceived("");
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="credit">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit">Cartão de Débito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentMethod === "cash" && (
                      <div className="space-y-2">
                        <Label htmlFor="amountReceived">Valor Recebido (R$)</Label>
                        <Input
                          id="amountReceived"
                          type="number"
                          step="0.01"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>R$ {totalAmount.toFixed(2)}</span>
                    </div>
                    {discountValue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Desconto:</span>
                        <span className="text-destructive">-R$ {discountValue.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">R$ {finalAmount.toFixed(2)}</span>
                    </div>
                    {paymentMethod === "cash" && receivedValue > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor Recebido:</span>
                          <span>R$ {receivedValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                          <span>Troco:</span>
                          <span className={changeValue >= 0 ? "text-green-600" : "text-destructive"}>
                            R$ {changeValue.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button onClick={() => completeSale()} className="w-full" size="lg">
                      <Banknote className="h-5 w-5 mr-2" />
                      Finalizar Venda
                    </Button>
                    <Button
                      onClick={() => setMultiplePaymentsOpen(true)}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Múltiplas Formas
                    </Button>
                  </div>
                </>
              )}

              {cart.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Carrinho vazio</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SalesReceipt
        saleId={currentSaleId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />

      {currentSaleId && (
        <InstallmentSaleDialog
          open={installmentDialogOpen}
          onOpenChange={setInstallmentDialogOpen}
          saleId={currentSaleId}
          totalAmount={currentSaleAmount}
          onComplete={() => setReceiptOpen(true)}
        />
      )}

      <MultiplePaymentsDialog
        open={multiplePaymentsOpen}
        onOpenChange={setMultiplePaymentsOpen}
        totalAmount={finalAmount}
        onConfirm={(payments) => {
          setMultiplePaymentsOpen(false);
          completeSale(payments);
        }}
      />
    </Layout>
  );
};

export default PDV;
