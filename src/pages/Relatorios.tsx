import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, Package, DollarSign, CreditCard, Receipt } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SalesReceipt from "@/components/SalesReceipt";

interface SaleReport {
  date: string;
  total_sales: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  total_quantity: number;
  total_revenue: number;
}

interface CategorySales {
  category: string;
  total: number;
  count: number;
}

interface PaymentMethodStats {
  method: string;
  total: number;
  count: number;
}

interface Sale {
  id: string;
  sale_number: number;
  created_at: string;
  final_amount: number;
  payment_method: string;
}

const Reports = () => {
  const [period, setPeriod] = useState("30");
  const [dailyReports, setDailyReports] = useState<SaleReport[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Vendas totais e faturamento
    const { data: sales } = await supabase
      .from("sales")
      .select("id, sale_number, created_at, final_amount, payment_method")
      .eq("status", "completed")
      .gte("created_at", daysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (!sales) return;

    const revenue = sales.reduce((sum, sale) => sum + Number(sale.final_amount), 0);
    setTotalRevenue(revenue);
    setTotalSales(sales.length);

    // Vendas diárias para gráfico
    const dailyData: { [key: string]: { count: number; revenue: number } } = {};
    sales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, revenue: 0 };
      }
      dailyData[date].count++;
      dailyData[date].revenue += Number(sale.final_amount);
    });

    const reports: SaleReport[] = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        total_sales: data.count,
        revenue: data.revenue,
      }))
      .reverse()
      .slice(-15);

    setDailyReports(reports);

    // Produtos mais vendidos
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select(`
        quantity,
        subtotal,
        product_id,
        products (name, cost_price)
      `)
      .gte("created_at", daysAgo.toISOString());

    if (saleItems) {
      const productMap: { [key: string]: { name: string; quantity: number; revenue: number; cost: number } } = {};
      let totalCost = 0;

      saleItems.forEach((item: any) => {
        const productName = item.products?.name || "Produto Desconhecido";
        if (!productMap[productName]) {
          productMap[productName] = { name: productName, quantity: 0, revenue: 0, cost: 0 };
        }
        productMap[productName].quantity += item.quantity;
        productMap[productName].revenue += Number(item.subtotal);
        
        const costPrice = item.products?.cost_price || 0;
        const itemCost = costPrice * item.quantity;
        productMap[productName].cost += itemCost;
        totalCost += itemCost;
      });

      const topProductsList = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map(p => ({ name: p.name, total_quantity: p.quantity, total_revenue: p.revenue }));

      setTopProducts(topProductsList);
      setTotalProfit(revenue - totalCost);
    }

    // Vendas por categoria
    const { data: categoryData } = await supabase
      .from("sale_items")
      .select(`
        subtotal,
        products (
          category_id,
          categories (name)
        )
      `)
      .gte("created_at", daysAgo.toISOString());

    if (categoryData) {
      const categoryMap: { [key: string]: { total: number; count: number } } = {};
      
      categoryData.forEach((item: any) => {
        const categoryName = item.products?.categories?.name || "Sem Categoria";
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = { total: 0, count: 0 };
        }
        categoryMap[categoryName].total += Number(item.subtotal);
        categoryMap[categoryName].count++;
      });

      const categorySalesList = Object.entries(categoryMap)
        .map(([category, data]) => ({
          category,
          total: data.total,
          count: data.count,
        }))
        .sort((a, b) => b.total - a.total);

      setCategorySales(categorySalesList);
    }

    // Vendas por forma de pagamento
    const paymentMap: { [key: string]: { total: number; count: number } } = {};
    sales.forEach((sale) => {
      const method = sale.payment_method;
      const methodLabel = 
        method === 'cash' ? 'Dinheiro' :
        method === 'credit' ? 'Crédito' :
        method === 'debit' ? 'Débito' :
        method === 'pix' ? 'PIX' : method;

      if (!paymentMap[methodLabel]) {
        paymentMap[methodLabel] = { total: 0, count: 0 };
      }
      paymentMap[methodLabel].total += Number(sale.final_amount);
      paymentMap[methodLabel].count++;
    });

    const paymentMethodsList = Object.entries(paymentMap)
      .map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
      }));

    setPaymentMethods(paymentMethodsList);

    // Vendas recentes para reimpressão
    setRecentSales(sales.slice(0, 20));
  };

  const handlePrintReceipt = (saleId: string) => {
    setSelectedSaleId(saleId);
    setReceiptOpen(true);
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

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--chart-5))'];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Análise completa de vendas e desempenho</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento Total
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalSales} {totalSales === 1 ? "venda realizada" : "vendas realizadas"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lucro Estimado
              </CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                R$ {totalProfit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado no preço de custo
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
              <BarChart3 className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                R$ {totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor médio por venda
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Vendas Diárias */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Evolução de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyReports.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyReports}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Faturamento (R$)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda no período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Produtos */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos Mais Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.total_quantity} unidades
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">
                          R$ {product.total_revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto vendido no período</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendas por Categoria */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Vendas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categorySales.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categorySales}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.category}`}
                      >
                        {categorySales.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {categorySales.map((cat, index) => (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{cat.category}</span>
                        </div>
                        <span className="font-medium">R$ {cat.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma categoria com vendas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vendas por Forma de Pagamento */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Formas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="method" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda registrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendas Recentes - Reimpressão */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Vendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-2">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">Venda #{sale.sale_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · {getPaymentMethodLabel(sale.payment_method)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-success">
                        R$ {sale.final_amount.toFixed(2)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintReceipt(sale.id)}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Reimprimir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SalesReceipt
        saleId={selectedSaleId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </Layout>
  );
};

export default Reports;
