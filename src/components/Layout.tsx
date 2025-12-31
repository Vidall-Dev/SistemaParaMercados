import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useStore } from "@/hooks/useStore";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  BarChart3,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Receipt,
  Wallet,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { store, storeId, loading } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Redirect to store setup if no store is configured
  useEffect(() => {
    if (!loading && session && !storeId && location.pathname !== "/configurar-loja") {
      navigate("/configurar-loja");
    }
  }, [loading, session, storeId, navigate, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Package, label: "Produtos", path: "/produtos" },
    { icon: FolderOpen, label: "Categorias", path: "/categorias" },
    { icon: ShoppingCart, label: "PDV - Vendas", path: "/pdv" },
    { icon: Wallet, label: "Caixa", path: "/caixa" },
    { icon: TrendingUp, label: "Estoque", path: "/estoque" },
    { icon: Receipt, label: "Contas a Pagar", path: "/contas" },
    { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
    { icon: BarChart3, label: "Financeiro", path: "/financeiro" },
    { icon: Settings, label: "Configurações", path: "/configuracoes" },
  ];

  if (!session || loading) {
    return null;
  }

  const storeName = store?.name || "Sistema Mercado";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-sidebar-foreground truncate" title={storeName}>
              {storeName}
            </h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-sidebar-border">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
