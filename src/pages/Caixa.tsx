import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, DollarSign, CreditCard, Smartphone, Calendar, Check } from "lucide-react";

interface DailySummary {
  totalSales: number;
  salesCount: number;
  cashTotal: number;
  creditTotal: number;
  debitTotal: number;
  pixTotal: number;
  multipleTotal: number;
}

interface SalePayment {
  payment_method: string;
  amount: number;
}

interface Sale {
  id: string;
  sale_number: number;
  created_at: string;
  final_amount: number;
  payment_method: string;
  payments?: SalePayment[];
}

const CashRegister = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [summary, setSummary] = useState<DailySummary>({
    totalSales: 0,
    salesCount: 0,
    cashTotal: 0,
    creditTotal: 0,
    debitTotal: 0,
    pixTotal: 0,
    multipleTotal: 0,
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    loadDailySummary();
  }, [selectedDate]);

  const loadDailySummary = async () => {
    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;

    const { data: salesData, error } = await supabase
      .from("sales")
      .select("*")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar dados do caixa");
      return;
    }

    const salesList = salesData || [];
    
    // Buscar pagamentos para vendas com método múltiplo
    const salesWithPayments = await Promise.all(
      salesList.map(async (sale) => {
        if (sale.payment_method === "multiple") {
          const { data: payments } = await supabase
            .from("sale_payments")
            .select("payment_method, amount")
            .eq("sale_id", sale.id);
          return { ...sale, payments: payments || [] };
        }
        return { ...sale, payments: [] };
      })
    );

    setSales(salesWithPayments);

    const summary: DailySummary = {
      totalSales: 0,
      salesCount: salesList.length,
      cashTotal: 0,
      creditTotal: 0,
      debitTotal: 0,
      pixTotal: 0,
      multipleTotal: 0,
    };

    // Calcular totais considerando pagamentos múltiplos
    salesWithPayments.forEach((sale) => {
      summary.totalSales += Number(sale.final_amount);
      
      if (sale.payment_method === "multiple" && sale.payments && sale.payments.length > 0) {
        sale.payments.forEach((p: SalePayment) => {
          switch (p.payment_method) {
            case "cash":
              summary.cashTotal += Number(p.amount);
              break;
            case "credit":
              summary.creditTotal += Number(p.amount);
              break;
            case "debit":
              summary.debitTotal += Number(p.amount);
              break;
            case "pix":
              summary.pixTotal += Number(p.amount);
              break;
          }
        });
      } else {
        switch (sale.payment_method) {
          case "cash":
            summary.cashTotal += Number(sale.final_amount);
            break;
          case "credit":
            summary.creditTotal += Number(sale.final_amount);
            break;
          case "debit":
            summary.debitTotal += Number(sale.final_amount);
            break;
          case "pix":
            summary.pixTotal += Number(sale.final_amount);
            break;
          case "multiple":
            summary.multipleTotal += Number(sale.final_amount);
            break;
        }
      }
    });

    setSummary(summary);
  };

  const handleCloseCash = () => {
    setIsClosed(true);
    setShowCloseDialog(false);
    toast.success(`Caixa do dia ${format(new Date(selectedDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} fechado com sucesso!`);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: "Dinheiro",
      credit: "Crédito",
      debit: "Débito",
      pix: "PIX",
      multiple: "Múltiplo",
    };
    return labels[method] || method;
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Caixa</h1>
            <p className="text-muted-foreground">Resumo de vendas e fechamento de caixa</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setIsClosed(false);
                }}
                className="w-auto"
              />
            </div>

            {isToday && !isClosed && (
              <Button onClick={() => setShowCloseDialog(true)} variant="default">
                <Check className="h-4 w-4 mr-2" />
                Fechar Caixa
              </Button>
            )}

            {isClosed && (
              <span className="text-green-600 font-semibold flex items-center gap-2">
                <Check className="h-4 w-4" />
                Caixa Fechado
              </span>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Total do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {summary.totalSales.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{summary.salesCount} vendas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Dinheiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                R$ {summary.cashTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Crédito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600">
                R$ {summary.creditTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                Débito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-purple-600">
                R$ {summary.debitTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-teal-600" />
                PIX
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-teal-600">
                R$ {summary.pixTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Múltiplo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-orange-600">
                R$ {summary.multipleTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de vendas do dia */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas do Dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venda #</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhuma venda neste dia
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">#{sale.sale_number}</TableCell>
                      <TableCell>
                        {format(new Date(sale.created_at), "HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {sale.payment_method === "multiple" && sale.payments && sale.payments.length > 0 ? (
                          <div className="space-y-1">
                            {sale.payments.map((p, idx) => (
                              <div key={idx} className="text-sm">
                                {getPaymentMethodLabel(p.payment_method)}: R$ {Number(p.amount).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          getPaymentMethodLabel(sale.payment_method)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {Number(sale.final_amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de confirmação */}
        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fechar Caixa</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja fechar o caixa do dia{" "}
                {format(new Date(selectedDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}?
                <br /><br />
                <strong>Resumo:</strong>
                <br />
                Total de vendas: R$ {summary.totalSales.toFixed(2)}
                <br />
                Quantidade de vendas: {summary.salesCount}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseCash}>
                Confirmar Fechamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default CashRegister;
