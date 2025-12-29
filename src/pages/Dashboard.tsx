import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock: number;
  unit: string;
}

interface RecentSale {
  id: string;
  created_at: string;
  final_amount: number;
  sale_number: number;
}

interface SalesChartData {
  date: string;
  revenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    todayRevenue: 0,
    totalCustomers: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [productsRes, lowStockRes, salesRes, customersRes, lowStockProductsRes, recentSalesRes, weekSalesRes] = await Promise.all([
      supabase.from("products").select("id", { count: "exact" }),
      supabase.from("products").select("id", { count: "exact" }).lte("stock_quantity", "min_stock"),
      supabase
        .from("sales")
        .select("id, final_amount")
        .eq("status", "completed")
        .gte("created_at", today.toISOString()),
      supabase.from("customers").select("id", { count: "exact" }),
      supabase
        .from("products")
        .select("id, name, stock_quantity, min_stock, unit")
        .lte("stock_quantity", "min_stock")
        .order("stock_quantity", { ascending: true })
        .limit(5),
      supabase
        .from("sales")
        .select("id, created_at, final_amount, sale_number")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("sales")
        .select("created_at, final_amount")
        .eq("status", "completed")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true }),
    ]);

    const todayRevenue = salesRes.data?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    setStats({
      totalProducts: productsRes.count || 0,
      lowStockProducts: lowStockRes.count || 0,
      todaySales: salesRes.data?.length || 0,
      todayRevenue,
      totalCustomers: customersRes.count || 0,
    });

    setLowStockProducts(lowStockProductsRes.data || []);
    setRecentSales(recentSalesRes.data || []);

    // Processar dados para o gráfico
    if (weekSalesRes.data) {
      const chartData: { [key: string]: number } = {};
      
      weekSalesRes.data.forEach((sale) => {
        const date = new Date(sale.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
        if (!chartData[date]) {
          chartData[date] = 0;
        }
        chartData[date] += Number(sale.final_amount);
      });

      const formattedChartData = Object.entries(chartData).map(([date, revenue]) => ({
        date,
        revenue,
      }));

      setSalesChartData(formattedChartData);
    }
  };

  const statCards = [
    {
      title: "Total de Produtos",
      value: stats.totalProducts,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Produtos com Estoque Baixo",
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: "text-warning",
    },
    {
      title: "Vendas Hoje",
      value: stats.todaySales,
      icon: ShoppingCart,
      color: "text-accent",
    },
    {
      title: "Faturamento Hoje",
      value: `R$ ${stats.todayRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-success",
    },
    {
      title: "Total de Clientes",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu mercado</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-[var(--shadow-elegant)]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Gráfico de Vendas */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
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
                    name="Faturamento"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda nos últimos 7 dias</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos com Estoque Baixo */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Estoque Crítico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Mínimo: {product.min_stock} {product.unit}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {product.stock_quantity} {product.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Todos os produtos com estoque adequado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas Vendas */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Últimas Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSales.length > 0 ? (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium">Venda #{sale.sale_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.created_at).toLocaleString("pt-BR", {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">
                          R$ {Number(sale.final_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma venda realizada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
