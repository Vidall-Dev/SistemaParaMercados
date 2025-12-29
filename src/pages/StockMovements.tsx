import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Plus, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: string;
  reason: string | null;
  created_at: string;
  products: {
    name: string;
  };
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock: number;
}

const StockMovements = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    type: "entry" as "entry" | "exit" | "adjustment",
    reason: "",
  });

  useEffect(() => {
    loadMovements();
    loadProducts();
    checkLowStock();
  }, []);

  const loadMovements = async () => {
    const { data } = await supabase
      .from("stock_movements")
      .select("*, products(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    setMovements(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, stock_quantity, min_stock")
      .eq("active", true);
    setProducts(data || []);
  };

  const checkLowStock = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, stock_quantity, min_stock")
      .eq("active", true);
    
    const lowStock = (data || []).filter(
      (p) => p.stock_quantity <= (p.min_stock || 0)
    );
    setLowStockProducts(lowStock);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const quantity = parseInt(formData.quantity);
    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert([{
        product_id: formData.product_id,
        quantity: formData.type === "exit" ? -quantity : quantity,
        type: formData.type,
        reason: formData.reason,
        user_id: session.user.id,
      }]);

    if (movementError) {
      console.error("Erro ao registrar movimentação:", movementError);
      toast.error(`Erro ao registrar movimentação: ${movementError.message}`);
      return;
    }

    // Atualizar estoque do produto
    const product = products.find(p => p.id === formData.product_id);
    if (product) {
      const newQuantity = formData.type === "exit" 
        ? product.stock_quantity - quantity 
        : product.stock_quantity + quantity;

      await supabase
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", formData.product_id);
    }

    toast.success("Movimentação registrada!");
    setDialogOpen(false);
    setFormData({ product_id: "", quantity: "", type: "entry", reason: "" });
    loadMovements();
    loadProducts();
    checkLowStock();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Movimentações de Estoque</h1>
            <p className="text-muted-foreground">Controle completo de entradas e saídas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Estoque: {product.stock_quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entrada</SelectItem>
                      <SelectItem value="exit">Saída</SelectItem>
                      <SelectItem value="adjustment">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Ex: Compra de fornecedor, perda, etc."
                  />
                </div>
                <Button type="button" className="w-full" onClick={() => setShowConfirmDialog(true)}>
                  Registrar
                </Button>
              </form>

              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Movimentação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja registrar esta movimentação de estoque?
                      <br /><br />
                      <strong>Tipo:</strong> {formData.type === "entry" ? "Entrada" : formData.type === "exit" ? "Saída" : "Ajuste"}
                      <br />
                      <strong>Quantidade:</strong> {formData.quantity}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => {
                      setShowConfirmDialog(false);
                      handleSubmit(e as any);
                    }}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogContent>
          </Dialog>
        </div>

        {lowStockProducts.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="destructive">
                      Estoque: {product.stock_quantity} / Mínimo: {product.min_stock}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{format(new Date(movement.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>{movement.products.name}</TableCell>
                    <TableCell>
                      <Badge variant={movement.type === "entry" ? "default" : movement.type === "exit" ? "destructive" : "secondary"}>
                        {movement.type === "entry" ? (
                          <><TrendingUp className="h-3 w-3 mr-1" />Entrada</>
                        ) : movement.type === "exit" ? (
                          <><TrendingDown className="h-3 w-3 mr-1" />Saída</>
                        ) : "Ajuste"}
                      </Badge>
                    </TableCell>
                    <TableCell>{Math.abs(movement.quantity)}</TableCell>
                    <TableCell>{movement.reason || "-"}</TableCell>
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

export default StockMovements;
