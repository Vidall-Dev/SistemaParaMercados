import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePendingSales, PendingSale } from "@/hooks/usePendingSales";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onResume: (cart: any[]) => void;
}

export const PendingSalesDialog = ({ open, onOpenChange, onResume }: Props) => {
  const { pendingSales, resumeSale, loading } = usePendingSales();

  const handleResume = async (sale: PendingSale) => {
    const cart = await resumeSale(sale.id);
    if (cart) onResume(cart);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vendas suspensas</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : pendingSales.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">Nenhuma venda pendente.</p>
        ) : (
          <ScrollArea className="h-64 pr-2">
            {pendingSales.map((s) => (
              <div key={s.id} className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>{new Date(s.created_at).toLocaleTimeString("pt-BR")}</span>
                  <span>{s.cart.length} itens</span>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleResume(s)}>
                  Retomar
                </Button>
                <Separator />
              </div>
            ))}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
