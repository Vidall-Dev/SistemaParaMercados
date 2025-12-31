import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Package, Bike, Utensils } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: number;
  type: string;
  table_number: string | null;
  delivery_address: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  customers: {
    name: string;
  } | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "table">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, customers(name)")
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price")
      .eq("active", true);
    setProducts(data || []);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unit_price = product.price;
        newItems[index].subtotal = product.price * newItems[index].quantity;
      }
    } else if (field === "quantity") {
      newItems[index].subtotal = newItems[index].unit_price * value;
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const createOrder = async () => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([{
        type: orderType,
        table_number: orderType === "table" ? tableNumber : null,
        delivery_address: orderType === "delivery" ? deliveryAddress : null,
        status: "pending",
        total_amount: totalAmount,
        notes: orderNotes,
        user_id: user.id,
      }])
      .select()
      .single();

    if (orderError || !order) {
      toast.error("Erro ao criar pedido");
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      toast.error("Erro ao adicionar itens");
      return;
    }

    toast.success("Pedido criado com sucesso!");
    setDialogOpen(false);
    setItems([]);
    setTableNumber("");
    setDeliveryAddress("");
    setOrderNotes("");
    loadOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success("Status atualizado!");
    loadOrders();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      preparing: "default",
      ready: "default",
      delivered: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pedidos / Comandas</h1>
            <p className="text-muted-foreground">Gestão de delivery e mesas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Pedido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Pedido</Label>
                  <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">
                        <span className="flex items-center gap-2">
                          <Utensils className="h-4 w-4" />Mesa
                        </span>
                      </SelectItem>
                      <SelectItem value="delivery">
                        <span className="flex items-center gap-2">
                          <Bike className="h-4 w-4" />Delivery
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {orderType === "table" && (
                  <div className="space-y-2">
                    <Label>Número da Mesa</Label>
                    <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
                  </div>
                )}

                {orderType === "delivery" && (
                  <div className="space-y-2">
                    <Label>Endereço de Entrega</Label>
                    <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Itens do Pedido</Label>
                    <Button type="button" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" />Item
                    </Button>
                  </div>
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select value={item.product_id} onValueChange={(value) => updateItem(index, "product_id", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - R$ {product.price.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value))}
                      />
                      <span className="w-24 text-sm">R$ {item.subtotal.toFixed(2)}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(index)}>
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold">
                    Total: R$ {items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
                  </p>
                </div>

                <Button onClick={createOrder} className="w-full">Criar Pedido</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {order.type === "delivery" ? <Bike className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                      Pedido #{order.order_number}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {order.type === "delivery" ? order.delivery_address : `Mesa ${order.table_number}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">R$ {Number(order.total_amount).toFixed(2)}</p>
                  <div className="flex gap-2">
                    {order.status === "pending" && (
                      <Button size="sm" onClick={() => updateOrderStatus(order.id, "preparing")}>
                        Preparar
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button size="sm" onClick={() => updateOrderStatus(order.id, "ready")}>
                        Pronto
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}>
                        Entregar
                      </Button>
                    )}
                    {order.status !== "delivered" && order.status !== "cancelled" && (
                      <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, "cancelled")}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Orders;
