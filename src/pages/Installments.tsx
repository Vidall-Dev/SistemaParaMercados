import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Installment {
  id: string;
  sale_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  sales: {
    sale_number: number;
    customers: {
      name: string;
    } | null;
  };
}

const Installments = () => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");

  useEffect(() => {
    loadInstallments();
  }, [filter]);

  const loadInstallments = async () => {
    let query = supabase
      .from("installments")
      .select(`
        *,
        sales(
          sale_number,
          customers(name)
        )
      `)
      .order("due_date", { ascending: true });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setInstallments(data || []);
  };

  const markAsPaid = async (installmentId: string) => {
    const { error } = await supabase
      .from("installments")
      .update({
        status: "paid",
        paid_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", installmentId);

    if (error) {
      toast.error("Erro ao marcar como pago");
      return;
    }

    toast.success("Parcela marcada como paga!");
    loadInstallments();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case "overdue":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Vencido</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const totalPending = installments
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalOverdue = installments
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas a Receber</h1>
          <p className="text-muted-foreground">Gestão de parcelas e pagamentos</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total a Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">R$ {totalPending.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">R$ {totalOverdue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total de Parcelas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{installments.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            Todas
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            Pendentes
          </Button>
          <Button variant={filter === "paid" ? "default" : "outline"} onClick={() => setFilter("paid")}>
            Pagas
          </Button>
          <Button variant={filter === "overdue" ? "default" : "outline"} onClick={() => setFilter("overdue")}>
            Vencidas
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>#{installment.sales.sale_number}</TableCell>
                    <TableCell>{installment.sales.customers?.name || "Cliente não informado"}</TableCell>
                    <TableCell>{installment.installment_number}</TableCell>
                    <TableCell className="font-medium">R$ {Number(installment.amount).toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(installment.due_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(installment.status)}</TableCell>
                    <TableCell>
                      {installment.status !== "paid" && (
                        <Button size="sm" onClick={() => markAsPaid(installment.id)}>
                          Marcar como Pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Installments;
