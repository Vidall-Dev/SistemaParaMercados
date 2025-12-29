import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/hooks/useStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrintReceiptButton } from "@/components/PrintReceiptButton";

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SalePayment {
  payment_method: string;
  amount: number;
}

interface SaleDetails {
  id: string;
  sale_number: number;
  created_at: string;
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  items: SaleItem[];
  payments: SalePayment[];
}

interface SalesReceiptProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SalesReceipt = ({ saleId, open, onOpenChange }: SalesReceiptProps) => {
  const { store } = useStore();
  const [sale, setSale] = useState<SaleDetails | null>(null);

  useEffect(() => {
    if (saleId && open) {
      loadSaleDetails(saleId);
    }
  }, [saleId, open]);

  const loadSaleDetails = async (id: string) => {
    const { data: saleData } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();

    if (!saleData) return;

    const { data: itemsData } = await supabase
      .from("sale_items")
      .select(`
        quantity,
        unit_price,
        subtotal,
        products (name)
      `)
      .eq("sale_id", id);

    // Buscar pagamentos se for múltiplo
    let payments: SalePayment[] = [];
    if (saleData.payment_method === "multiple") {
      const { data: paymentsData } = await supabase
        .from("sale_payments")
        .select("payment_method, amount")
        .eq("sale_id", id);
      
      if (paymentsData) {
        payments = paymentsData;
      }
    }

    if (itemsData) {
      const items = itemsData.map((item: any) => ({
        product_name: item.products?.name || "Produto",
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      setSale({
        ...saleData,
        items,
        payments,
      });
    }
  };

  if (!sale) return null;

  const storeName = store?.name || "SISTEMA PDV";
  const storeAddress = store ? [store.address, store.city, store.state].filter(Boolean).join(" - ") : null;
  const storeCnpj = store?.cnpj;

  const receiptItems = sale.items.map(item => ({
    product: item.product_name,
    quantity: item.quantity,
    price: item.unit_price,
    subtotal: item.subtotal,
  }));

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: "Dinheiro",
      credit: "Cartão de Crédito",
      debit: "Cartão de Débito",
      pix: "PIX",
      multiple: "Múltiplo",
    };
    return labels[method] || method;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md print:shadow-none">
        <DialogHeader>
          <DialogTitle className="text-center">Comprovante de Venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 print:text-black" id="receipt-content">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{storeName}</h2>
            {storeAddress && (
              <p className="text-xs text-muted-foreground print:text-gray-600">
                {storeAddress}
              </p>
            )}
            {storeCnpj && (
              <p className="text-xs text-muted-foreground print:text-gray-600">
                CNPJ: {storeCnpj}
              </p>
            )}
            <p className="text-sm text-muted-foreground print:text-gray-600">
              Venda #{sale.sale_number}
            </p>
            <p className="text-xs text-muted-foreground print:text-gray-600">
              {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Itens:</h3>
            {sale.items.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.product_name}</span>
                  <span className="font-bold">R$ {item.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground print:text-gray-600">
                  <span>
                    {item.quantity} x R$ {item.unit_price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground print:text-gray-600">Subtotal:</span>
              <span>R$ {sale.total_amount.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground print:text-gray-600">Desconto:</span>
                <span className="text-destructive">-R$ {sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary print:text-black">R$ {sale.final_amount.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          <div className="text-center space-y-1">
            {sale.payment_method === "multiple" && sale.payments.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground print:text-gray-600">Formas de Pagamento:</p>
                {sale.payments.map((payment, index) => (
                  <p key={index} className="text-sm">
                    <span className="font-semibold">{getPaymentMethodLabel(payment.payment_method)}:</span>{" "}
                    <span>R$ {payment.amount.toFixed(2)}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm">
                <span className="text-muted-foreground print:text-gray-600">Forma de Pagamento:</span>{" "}
                <span className="font-semibold">{getPaymentMethodLabel(sale.payment_method)}</span>
              </p>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground print:text-gray-600 pt-4">
            <p>Obrigado pela preferência!</p>
            <p>Volte sempre!</p>
          </div>
        </div>

        <div className="print:hidden">
          <PrintReceiptButton
            saleId={sale.id}
            saleNumber={sale.sale_number}
            items={receiptItems}
            totalAmount={sale.total_amount}
            discount={sale.discount}
            finalAmount={sale.final_amount}
            paymentMethod={sale.payment_method}
            payments={sale.payments}
            storeName={storeName}
            storeAddress={storeAddress || undefined}
            storeCnpj={storeCnpj || undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesReceipt;
