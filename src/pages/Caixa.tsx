import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/hooks/useStore";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, DollarSign, CreditCard, Smartphone, Calendar, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DailySummary {
  totalSales: number;
  salesCount: number;
  cashTotal: number;
  creditTotal: number;
  debitTotal: number;
  pixTotal: number;
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
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const { storeId } = useStore();
  const [sangriaOpen, setSangriaOpen] = useState(false);
  const [sangriaAmount, setSangriaAmount] = useState(0);
  const [sangriaNotes, setSangriaNotes] = useState("");
  const [sangriaMethod, setSangriaMethod] = useState<'cash'|'credit'|'debit'|'pix'>('cash');
  const [suprimentoOpen, setSuprimentoOpen] = useState(false);
  const [suprimentoAmount, setSuprimentoAmount] = useState(0);
  const [suprimentoNotes, setSuprimentoNotes] = useState("");
  const [suprimentoMethod, setSuprimentoMethod] = useState<'cash'|'credit'|'debit'|'pix'>('cash');

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
    // Buscar todos os pagamentos das vendas do dia numa única query
    const saleIds = salesList.map((s:any) => s.id);
    let paymentsBySale = new Map<string, SalePayment[]>();
    if (saleIds.length > 0) {
      const { data: allPayments } = await supabase
        .from('sale_payments')
        .select('sale_id, payment_method, amount')
        .in('sale_id', saleIds);
      (allPayments || []).forEach((p:any) => {
        const arr = paymentsBySale.get(p.sale_id) || [];
        arr.push({ payment_method: p.payment_method, amount: p.amount });
        paymentsBySale.set(p.sale_id, arr);
      });
    }
    const salesWithPayments = salesList.map((sale:any) => ({
      ...sale,
      payments: paymentsBySale.get(sale.id) || []
    }));

    setSales(salesWithPayments);

    const summary: DailySummary = {
      totalSales: 0,
      salesCount: salesList.length,
      cashTotal: 0,
      creditTotal: 0,
      debitTotal: 0,
      pixTotal: 0,
    };

    // Calcular totais sempre considerando payments quando existirem
    salesWithPayments.forEach((sale:any) => {
      summary.totalSales += Number(sale.final_amount);
      if (sale.payments && sale.payments.length > 0) {
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
    };
    // Também cobre casos antigos em PT-BR
    if (labels[method]) return labels[method];
    const low = (method || '').toLowerCase();
    if (low.includes('dinheiro')) return 'Dinheiro';
    if (low.includes('crédit') || low.includes('credit')) return 'Crédito';
    if (low.includes('déb') || low.includes('debit')) return 'Débito';
    if (low.includes('pix')) return 'PIX';
    return labels[method] || method;
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  const toCode = (m: string) => {
    const t = m.toLowerCase();
    if (t.startsWith('dinheiro') || t === 'cash') return 'cash';
    if (t.startsWith('crédito') || t === 'credito' || t === 'credit') return 'credit';
    if (t.startsWith('débito') || t === 'debito' || t === 'debit') return 'debit';
    if (t === 'pix') return 'pix';
    return 'cash';
  };

  const handleCreateSangria = async () => {
    if (!storeId) { toast.error('Nenhuma loja selecionada'); return; }
    if (sangriaAmount <= 0) { toast.error('Informe um valor válido'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Usuário não autenticado'); return; }
    const { error } = await supabase
      .from('cash_movements')
      .insert({
        store_id: storeId,
        user_id: user.id,
        type: 'withdrawal',
        method: sangriaMethod,
        amount: sangriaAmount,
        notes: sangriaNotes || null,
      });
    if (error) { toast.error('Erro ao registrar sangria'); return; }
    toast.success('Sangria registrada');
    setSangriaOpen(false);
    setSangriaAmount(0);
    setSangriaNotes("");
    setSangriaMethod('cash');
  };

  const handleCreateSuprimento = async () => {
    if (!storeId) { toast.error('Nenhuma loja selecionada'); return; }
    if (suprimentoAmount <= 0) { toast.error('Informe um valor válido'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Usuário não autenticado'); return; }
    const { error } = await supabase
      .from('cash_movements')
      .insert({
        store_id: storeId,
        user_id: user.id,
        type: 'supply',
        method: suprimentoMethod,
        amount: suprimentoAmount,
        notes: suprimentoNotes || null,
      });
    if (error) { toast.error('Erro ao registrar suprimento'); return; }
    toast.success('Suprimento registrado');
    setSuprimentoOpen(false);
    setSuprimentoAmount(0);
    setSuprimentoNotes("");
    setSuprimentoMethod('cash');
  };

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

            <Button onClick={() => setSangriaOpen(true)} variant="destructive">
              Registrar Sangria
            </Button>

            <Button onClick={() => setSuprimentoOpen(true)} variant="secondary">
              Registrar Suprimento
            </Button>

            <Button onClick={() => window.location.assign(`/fluxo?date=${selectedDate}`)} variant="outline">
              Abrir Fluxo de Caixa
            </Button>

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

          {/* Card de Múltiplo removido: valores de múltiplos agora somam nas categorias correspondentes */}
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

        {/* Dialog de Sangria */}
        <Dialog open={sangriaOpen} onOpenChange={setSangriaOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Sangria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Método</Label>
                <Select value={sangriaMethod} onValueChange={(v)=> setSangriaMethod(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debit">Débito</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sangriaAmount">Valor</Label>
                <Input id="sangriaAmount" type="number" min="0" step="0.01"
                  value={sangriaAmount || ''}
                  onChange={(e)=> setSangriaAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label htmlFor="sangriaNotes">Observação (opcional)</Label>
                <Input id="sangriaNotes" value={sangriaNotes} onChange={(e)=> setSangriaNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSangria} variant="destructive">Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Suprimento */}
        <Dialog open={suprimentoOpen} onOpenChange={setSuprimentoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Suprimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Método</Label>
                <Select value={suprimentoMethod} onValueChange={(v)=> setSuprimentoMethod(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debit">Débito</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="suprimentoAmount">Valor</Label>
                <Input id="suprimentoAmount" type="number" min="0" step="0.01"
                  value={suprimentoAmount || ''}
                  onChange={(e)=> setSuprimentoAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label htmlFor="suprimentoNotes">Observação (opcional)</Label>
                <Input id="suprimentoNotes" value={suprimentoNotes} onChange={(e)=> setSuprimentoNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSuprimento} variant="secondary">Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default CashRegister;
