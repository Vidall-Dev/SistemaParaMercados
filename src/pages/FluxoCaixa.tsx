import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/hooks/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Sale { id: string; created_at: string; final_amount: number; payment_method: string; }
interface SalePayment { sale_id: string; payment_method: string; amount: number; }
interface Bill { id: string; description: string; amount: number; paid_date: string | null; status: string; }

const labelFor = (m: string) => {
  const t = (m || "").toLowerCase();
  if (t.includes("cash") || t.includes("dinheiro")) return "Dinheiro";
  if (t.includes("credit") || t.includes("crédit")) return "Crédito";
  if (t.includes("debit") || t.includes("déb")) return "Débito";
  if (t.includes("pix")) return "PIX";
  if (t.includes("multiple")) return "Múltiplos";
  return m;
};

const FluxoCaixa = () => {
  const { storeId } = useStore();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentsBySale, setPaymentsBySale] = useState<Map<string, SalePayment[]>>(new Map());
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (!storeId) return;
    const start = `${selectedDate}T00:00:00`;
    const end = `${selectedDate}T23:59:59`;

    (async () => {
      // 1) Vendas do dia
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, created_at, final_amount, payment_method, store_id")
        .eq("store_id", storeId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });
      const list = (salesData || []) as any[];
      setSales(list.map(s => ({ id: s.id, created_at: s.created_at, final_amount: s.final_amount, payment_method: s.payment_method })));

      // 2) Pagamentos das vendas
      const saleIds = list.map(s => s.id);
      if (saleIds.length > 0) {
        const { data: pays } = await supabase
          .from("sale_payments")
          .select("sale_id, payment_method, amount")
          .in("sale_id", saleIds);
        const map = new Map<string, SalePayment[]>();
        (pays || []).forEach((p: any) => {
          const arr = map.get(p.sale_id) || [];
          arr.push({ sale_id: p.sale_id, payment_method: p.payment_method, amount: Number(p.amount) });
          map.set(p.sale_id, arr);
        });
        setPaymentsBySale(map);
      } else {
        setPaymentsBySale(new Map());
      }

      // 3) Contas pagas do dia
      const { data: billsData } = await supabase
        .from("bills")
        .select("id, description, amount, paid_date, status, store_id")
        .eq("store_id", storeId)
        .eq("status", "paid")
        .gte("paid_date", selectedDate)
        .lte("paid_date", selectedDate)
        .order("paid_date", { ascending: false });
      setBills((billsData || []) as any);
    })();
  }, [storeId, selectedDate]);

  const inflowByMethod = useMemo(() => {
    const totals = new Map<string, number>();
    sales.forEach((sale) => {
      const pays = paymentsBySale.get(sale.id);
      if (pays && pays.length > 0) {
        pays.forEach((p) => {
          totals.set(p.payment_method, (totals.get(p.payment_method) || 0) + Number(p.amount));
        });
      } else {
        // sem registros em sale_payments: considerar payment_method da venda
        totals.set(sale.payment_method, (totals.get(sale.payment_method) || 0) + Number(sale.final_amount));
      }
    });
    return totals;
  }, [sales, paymentsBySale]);

  const totalInflow = useMemo(() => {
    let sum = 0;
    inflowByMethod.forEach((v) => (sum += v));
    return sum;
  }, [inflowByMethod]);

  const totalOutflow = useMemo(() => {
    return bills.reduce((s, b) => s + Number(b.amount || 0), 0);
  }, [bills]);

  const balance = totalInflow - totalOutflow;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
          <Input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="w-auto" />
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle>Entradas</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">R$ {totalInflow.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Saídas</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">R$ {totalOutflow.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Saldo do Dia</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold {balance>=0 ? 'text-primary' : 'text-red-600'}">R$ {balance.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Entradas por Método</CardTitle></CardHeader>
            <CardContent>
              {[...inflowByMethod.entries()].length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem entradas neste dia</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...inflowByMethod.entries()].map(([method, amt]) => (
                      <TableRow key={method}>
                        <TableCell>{labelFor(method)}</TableCell>
                        <TableCell className="text-right">R$ {amt.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contas Pagas (Saídas)</CardTitle></CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem saídas neste dia</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.paid_date ? format(new Date(b.paid_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "-"}</TableCell>
                        <TableCell>{b.description}</TableCell>
                        <TableCell className="text-right">R$ {Number(b.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />
        <div className="text-sm text-muted-foreground">
          Dica: Podemos evoluir este relatório para mostrar: troco (saída), sangria/suprimento e método de pagamento das contas. Basta registrarmos essas informações no banco. Posso implementar na próxima etapa.
        </div>
      </div>
    </Layout>
  );
};

export default FluxoCaixa;
