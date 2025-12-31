import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/hooks/useStore";

export interface CartItem {
  product_id: string;
  name?: string; // opcional para exibição
  quantity: number;
  price: number;
}

export interface PendingSale {
  id: string;
  cart: CartItem[];
  created_at: string;
}

const QUERY_KEY = ["pendingSales"];

export const usePendingSales = () => {
  const { storeId } = useStore();
  const qc = useQueryClient();

  // ---- LISTAR ----
  const { data, isLoading, refetch } = useQuery<PendingSale[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("pending_sales")
        .select("id, cart, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PendingSale[];
    },
  });

  // ---- SUSPENDER ----
  const suspendMutation = useMutation({
    mutationFn: async (cart: CartItem[]) => {
      if (!storeId) throw new Error("Sem loja");
      const { error } = await supabase.from("pending_sales").insert({
        cart,
        store_id: storeId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ---- RETOMAR ----
  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("pending_sales")
        .delete({ count: "exact" })
        .eq("id", id)
        .select("cart")
        .single();
      if (error) throw error;
      return data?.cart as CartItem[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    pendingSales: data ?? [],
    loading: isLoading,
    refetch,
    suspendSale: suspendMutation.mutateAsync,
    resumeSale: resumeMutation.mutateAsync,
  };
};
