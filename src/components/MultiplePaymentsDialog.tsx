import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface Payment {
  method: string;
  amount: string;
}

interface MultiplePaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (payments: Payment[]) => void;
}

export const MultiplePaymentsDialog = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
}: MultiplePaymentsDialogProps) => {
  const [payments, setPayments] = useState<Payment[]>([
    { method: "cash", amount: "" },
  ]);

  const addPayment = () => {
    setPayments([...payments, { method: "cash", amount: "" }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: keyof Payment, value: string) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setPayments(newPayments);
  };

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = totalAmount - totalPaid;

  const handleConfirm = () => {
    if (Math.abs(remaining) > 0.01) {
      return;
    }
    onConfirm(payments);
    setPayments([{ method: "cash", amount: "" }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Múltiplas Formas de Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Total da Venda</Label>
            <Input value={`R$ ${totalAmount.toFixed(2)}`} disabled />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Formas de Pagamento</Label>
              <Button size="sm" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {payments.map((payment, index) => (
              <div key={index} className="flex gap-2">
                <Select
                  value={payment.method}
                  onValueChange={(value) => updatePayment(index, "method", value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, "amount", e.target.value)}
                  className="flex-1"
                />
                {payments.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePayment(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Total Pago:</span>
              <span className="font-medium">R$ {totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Restante:</span>
              <Badge variant={remaining > 0 ? "destructive" : "default"}>
                R$ {remaining.toFixed(2)}
              </Badge>
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            className="w-full"
            disabled={Math.abs(remaining) > 0.01}
          >
            Confirmar Pagamentos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
