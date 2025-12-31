import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

export type PaymentMethod = "Dinheiro" | "Crédito" | "Débito" | "Pix";
export interface Payment { method: PaymentMethod; amount: number }

interface Props {
  total: number;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onConfirm: (payments: Payment[]) => void;
}

const METHODS: PaymentMethod[] = ["Dinheiro", "Crédito", "Débito", "Pix"];

export const PaymentModal = ({ total, open, onOpenChange, onConfirm }: Props) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("Dinheiro");
  const [value, setValue] = useState(0);

  const remaining = parseFloat((total - payments.reduce((s, p) => s + p.amount, 0)).toFixed(2));
  const canConfirm = remaining === 0 && payments.length > 0;

  const addPayment = () => {
    if (value <= 0) return;
    setPayments((prev) => [...prev, { method, amount: value }]);
    setValue(0);
  };

  const removePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setPayments([]);
    setValue(0);
    setMethod("Dinheiro");
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(payments);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Métodos de pagamento</DialogTitle>
          <DialogDescription>
            Total: <strong>R$ {total.toFixed(2)}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map((m) => (
              <Button key={m} variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>{m}</Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Valor</Label>
            <Input type="number" value={value || ""} step="0.01" min="0" onChange={(e) => setValue(parseFloat(e.target.value))} />
            <Button className="w-full mt-2" onClick={addPayment} disabled={value<=0}>Adicionar</Button>
          </div>
          {payments.length > 0 && (
            <div className="space-y-2">
              <Separator />
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{p.method}</span>
                  <span>R$ {p.amount.toFixed(2)}</span>
                  <Button variant="ghost" size="xs" onClick={() => removePayment(idx)}>x</Button>
                </div>
              ))}
              <Separator />
              <p className="text-right text-sm">Restante: <strong>R$ {remaining.toFixed(2)}</strong></p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="w-full">Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
