import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Check, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  paid_date: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
}

const Bills = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    due_date: "",
    category: "",
    notes: "",
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTitle, setConfirmTitle] = useState("");

  const confirmAction = (action: () => void, title: string, message: string) => {
    setPendingAction(() => action);
    setConfirmTitle(title);
    setConfirmMessage(message);
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = () => {
    if (pendingAction) {
      pendingAction();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar contas");
      return;
    }

    setBills(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("bills").insert({
      user_id: user.id,
      description: formData.description,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date,
      category: formData.category || null,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error("Erro ao criar conta");
      return;
    }

    toast.success("Conta adicionada com sucesso!");
    setIsDialogOpen(false);
    setFormData({ description: "", amount: "", due_date: "", category: "", notes: "" });
    loadBills();
  };

  const handleMarkAsPaid = async (id: string) => {
    const { error } = await supabase
      .from("bills")
      .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao marcar como pago");
      return;
    }

    toast.success("Conta marcada como paga!");
    loadBills();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bills").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir conta");
      return;
    }

    toast.success("Conta excluída com sucesso!");
    loadBills();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return differenceInDays(due, today);
  };

  const getDueDateBadge = (dueDate: string, status: string) => {
    if (status === "paid") {
      return <Badge className="bg-green-500">Pago</Badge>;
    }

    const days = getDaysUntilDue(dueDate);
    const due = new Date(dueDate + "T00:00:00");

    if (isPast(due) && !isToday(due)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Vencido há {Math.abs(days)} dias
        </Badge>
      );
    }

    if (isToday(due)) {
      return (
        <Badge className="bg-orange-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vence hoje!
        </Badge>
      );
    }

    if (days <= 3) {
      return (
        <Badge className="bg-yellow-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {days} dias restantes
        </Badge>
      );
    }

    if (days <= 7) {
      return (
        <Badge className="bg-blue-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {days} dias restantes
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {days} dias restantes
      </Badge>
    );
  };

  const filteredBills = bills.filter((bill) => {
    if (filter === "all") return true;
    if (filter === "pending") return bill.status === "pending";
    if (filter === "paid") return bill.status === "paid";
    if (filter === "overdue") {
      const days = getDaysUntilDue(bill.due_date);
      return days < 0 && bill.status !== "paid";
    }
    return true;
  });

  const totalPending = bills
    .filter((b) => b.status !== "paid")
    .reduce((acc, b) => acc + Number(b.amount), 0);

  const overdueCount = bills.filter((b) => {
    const days = getDaysUntilDue(b.due_date);
    return days < 0 && b.status !== "paid";
  }).length;

  const dueSoonCount = bills.filter((b) => {
    const days = getDaysUntilDue(b.due_date);
    return days >= 0 && days <= 3 && b.status !== "paid";
  }).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas e boletos</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Conta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Conta de luz, Boleto fornecedor..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Data de Vencimento *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Fornecedor, Energia, Água..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>

                <Button type="submit" className="w-full">
                  Adicionar Conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                R$ {totalPending.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className={overdueCount > 0 ? "border-destructive" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Contas Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
            </CardContent>
          </Card>

          <Card className={dueSoonCount > 0 ? "border-yellow-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Vencem em 3 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{dueSoonCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela de contas */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma conta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{bill.description}</span>
                          {bill.notes && (
                            <p className="text-xs text-muted-foreground">{bill.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{bill.category || "-"}</TableCell>
                      <TableCell className="font-medium">
                        R$ {Number(bill.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(bill.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getDueDateBadge(bill.due_date, bill.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {bill.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmAction(
                                () => handleMarkAsPaid(bill.id),
                                "Marcar como Pago",
                                `Tem certeza que deseja marcar "${bill.description}" como paga?`
                              )}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAction(
                              () => handleDelete(bill.id),
                              "Excluir Conta",
                              `Tem certeza que deseja excluir "${bill.description}"? Esta ação não pode ser desfeita.`
                            )}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de confirmação */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={executeConfirmedAction}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Bills;
