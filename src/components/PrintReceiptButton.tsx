import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toast } from "sonner";

interface SalePayment {
  payment_method: string;
  amount: number;
}

interface PrintReceiptButtonProps {
  saleId: string;
  saleNumber: number;
  items: Array<{
    product: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  payments?: SalePayment[];
  storeName?: string;
  storeAddress?: string;
  storeCnpj?: string;
}

const getPaymentMethodLabel = (method: string) => {
  const labels: { [key: string]: string } = {
    cash: "Dinheiro",
    credit: "Crédito",
    debit: "Débito",
    pix: "PIX",
  };
  return labels[method] || method;
};

export const PrintReceiptButton = ({
  saleNumber,
  items,
  totalAmount,
  discount,
  finalAmount,
  paymentMethod,
  payments = [],
  storeName = "Sistema PDV",
  storeAddress,
  storeCnpj,
}: PrintReceiptButtonProps) => {
  const printReceipt = () => {
    const printWindow = window.open("", "", "width=300,height=600");
    if (!printWindow) return;

    // Gerar HTML das formas de pagamento
    let paymentHtml = "";
    if (paymentMethod === "multiple" && payments.length > 0) {
      paymentHtml = `
        <div class="center bold">Formas de Pagamento:</div>
        ${payments
          .map(
            (p) => `
          <div class="item">
            <span>${getPaymentMethodLabel(p.payment_method)}:</span>
            <span>R$ ${p.amount.toFixed(2)}</span>
          </div>
        `
          )
          .join("")}
      `;
    } else {
      paymentHtml = `
        <div class="item">
          <span>Pagamento:</span>
          <span>${getPaymentMethodLabel(paymentMethod)}</span>
        </div>
      `;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cupom #${saleNumber}</title>
        <style>
          @media print {
            @page { margin: 0; }
            body { margin: 0.5cm; }
          }
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            font-size: 12px;
            margin: 0;
            padding: 10px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-size: 14px; margin-top: 10px; }
          .small { font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="center bold">CUPOM NÃO FISCAL</div>
        <div class="center bold">${storeName}</div>
        ${storeAddress ? `<div class="center small">${storeAddress}</div>` : ""}
        ${storeCnpj ? `<div class="center small">CNPJ: ${storeCnpj}</div>` : ""}
        <div class="line"></div>
        <div class="center">Venda #${saleNumber}</div>
        <div class="center">${new Date().toLocaleString("pt-BR")}</div>
        <div class="line"></div>
        ${items
          .map(
            (item) => `
          <div class="item">
            <span>${item.product}</span>
          </div>
          <div class="item">
            <span>${item.quantity} x R$ ${item.price.toFixed(2)}</span>
            <span>R$ ${item.subtotal.toFixed(2)}</span>
          </div>
        `
          )
          .join("")}
        <div class="line"></div>
        <div class="item">
          <span>Subtotal:</span>
          <span>R$ ${totalAmount.toFixed(2)}</span>
        </div>
        ${
          discount > 0
            ? `
        <div class="item">
          <span>Desconto:</span>
          <span>-R$ ${discount.toFixed(2)}</span>
        </div>
        `
            : ""
        }
        <div class="item bold total">
          <span>TOTAL:</span>
          <span>R$ ${finalAmount.toFixed(2)}</span>
        </div>
        <div class="line"></div>
        ${paymentHtml}
        <div class="line"></div>
        <div class="center">Obrigado pela preferência!</div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    toast.success("Cupom enviado para impressão");
  };

  return (
    <Button onClick={printReceipt} variant="outline">
      <Printer className="h-4 w-4 mr-2" />
      Imprimir Cupom
    </Button>
  );
};
