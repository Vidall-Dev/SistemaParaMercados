import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "@/hooks/useStore";
import Painel from "./pages/Painel";
import Autenticacao from "./pages/Autenticacao";
import Produtos from "./pages/Produtos";
import Categorias from "./pages/Categorias";
import PDV from "./pages/PDV";
import Relatorios from "./pages/Relatorios";
import MovimentacoesEstoque from "./pages/MovimentacoesEstoque";
import RelatoriosFinanceiros from "./pages/RelatoriosFinanceiros";
import Contas from "./pages/Contas";
import Caixa from "./pages/Caixa";
import ConfiguracaoLoja from "./pages/ConfiguracaoLoja";
import NaoEncontrado from "./pages/NaoEncontrado";

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
                <Route path="/" element={<Painel />} />
                <Route path="/auth" element={<Autenticacao />} />
                <Route path="/configurar-loja" element={<ConfiguracaoLoja />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/categorias" element={<Categorias />} />
                <Route path="/pdv" element={<PDV />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/estoque" element={<MovimentacoesEstoque />} />
                <Route path="/financeiro" element={<RelatoriosFinanceiros />} />
                <Route path="/contas" element={<Contas />} />
                <Route path="/caixa" element={<Caixa />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NaoEncontrado />} />
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
