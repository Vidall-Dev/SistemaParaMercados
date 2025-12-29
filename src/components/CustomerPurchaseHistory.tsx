import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Sale {
  id: string;
  created_at: string;
  final_amount: number;
  payment_method: string;
  sale_number: number;
}

interface CustomerPurchaseHistoryProps {
  customerId: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
}

const CustomerPurchaseHistory = ({ customerId, customerName, isOpen, onClose }: CustomerPurchaseHistoryProps) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (isOpen && customerId) {
      loadPurchaseHistory();
    }
  }, [isOpen, customerId]);

  const loadPurchaseHistory = async () => {
    const { data } = await supabase
      .from("sales")
      .select("id, created_at, final_amount, payment_method, sale_number")
      .eq("customer_id", customerId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (data) {
      setSales(data);
      const total = data.reduce((sum, sale) => sum + Number(sale.final_amount), 0);
      setTotalSpent(total);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: "Dinheiro",
      credit: "Crédito",
      debit: "Débito",
      pix: "PIX",
    };
    return labels[method] || method;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Compras - {customerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                R$ {totalSpent.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {sales.length} {sales.length === 1 ? "compra" : "compras"}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {sales.length > 0 ? (
              sales.map((sale) => (
                <Card key={sale.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Venda #{sale.sale_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(sale.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getPaymentMethodLabel(sale.payment_method)}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-success">
                          R$ {Number(sale.final_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma compra realizada ainda</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerPurchaseHistory;
