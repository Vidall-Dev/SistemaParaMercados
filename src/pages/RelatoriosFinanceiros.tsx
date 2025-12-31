import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const FinancialReports = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cashFlow, setCashFlow] = useState({ revenue: 0, profit: 0 });
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const generateReports = async () => {
    if (!startDate || !endDate) return;

    // Fluxo de caixa
    const { data: sales } = await supabase
      .from("sales")
      .select("final_amount")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const revenue = sales?.reduce((sum, s) => sum + Number(s.final_amount), 0) || 0;
    setCashFlow({ revenue, profit: revenue * 0.3 }); // Estimativa

    // Produtos mais vendidos
    const { data: items } = await supabase
      .from("sale_items")
      .select(`
        product_id,
        quantity,
        subtotal,
        products(name, cost_price, price)
      `);

    const productStats = items?.reduce((acc: any, item: any) => {
      const id = item.product_id;
      if (!acc[id]) {
        acc[id] = {
          name: item.products?.name,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }
      acc[id].quantity += item.quantity;
      acc[id].revenue += Number(item.subtotal);
      acc[id].profit += (item.products?.price - (item.products?.cost_price || 0)) * item.quantity;
      return acc;
    }, {});

    const sorted = Object.values(productStats || {})
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    setTopProducts(sorted);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Relatórios Financeiros</h1>

        <Card>
          <CardHeader>
            <CardTitle>Período de Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={generateReports}>Gerar Relatórios</Button>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">R$ {cashFlow.revenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lucro Estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">R$ {cashFlow.profit.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProducts.map((product: any, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="font-medium">{product.name}</span>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{product.quantity} vendidos</p>
                    <p className="font-bold">R$ {product.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FinancialReports;
