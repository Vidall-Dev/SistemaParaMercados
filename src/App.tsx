import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "@/hooks/useStore";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import PDV from "./pages/PDV";
import Reports from "./pages/Reports";
import StockMovements from "./pages/StockMovements";
import FinancialReports from "./pages/FinancialReports";
import Bills from "./pages/Bills";
import CashRegister from "./pages/CashRegister";
import StoreSetup from "./pages/StoreSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StoreProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-background">
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/configurar-loja" element={<StoreSetup />} />
                <Route path="/produtos" element={<Products />} />
                <Route path="/categorias" element={<Categories />} />
                <Route path="/pdv" element={<PDV />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="/estoque" element={<StockMovements />} />
                <Route path="/financeiro" element={<FinancialReports />} />
                <Route path="/contas" element={<Bills />} />
                <Route path="/caixa" element={<CashRegister />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <footer className="text-center p-4 text-sm text-muted-foreground">
              Feito por: Vidall-Dev
            </footer>
          </div>
        </BrowserRouter>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
