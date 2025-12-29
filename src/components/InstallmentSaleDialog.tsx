import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InstallmentSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  totalAmount: number;
  onComplete: () => void;
}

export const InstallmentSaleDialog = ({
  open,
  onOpenChange,
  saleId,
  totalAmount,
  onComplete,
}: InstallmentSaleDialogProps) => {
  const [installmentCount, setInstallmentCount] = useState("2");
  const [firstDueDate, setFirstDueDate] = useState("");

  const createInstallments = async () => {
    if (!firstDueDate) {
      toast.error("Selecione a data do primeiro vencimento");
      return;
    }

    const count = parseInt(installmentCount);
    const installmentAmount = totalAmount / count;
    const installments = [];

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      installments.push({
        sale_id: saleId,
        installment_number: i + 1,
        amount: installmentAmount,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
      });
    }

    const { error } = await supabase.from("installments").insert(installments);

    if (error) {
      toast.error("Erro ao criar parcelas");
      return;
    }

    // Atualizar tipo da venda
    await supabase
      .from("sales")
      .update({ sale_type: "installment" })
      .eq("id", saleId);

    toast.success(`${count} parcelas criadas com sucesso!`);
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Parcelamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor Total</Label>
            <Input value={`R$ ${totalAmount.toFixed(2)}`} disabled />
          </div>
          <div className="space-y-2">
            <Label>Número de Parcelas</Label>
            <Select value={installmentCount} onValueChange={setInstallmentCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 10, 12].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}x de R$ {(totalAmount / n).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data do Primeiro Vencimento</Label>
            <Input
              type="date"
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
            />
          </div>
          <Button onClick={createInstallments} className="w-full">
            Criar Parcelas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
