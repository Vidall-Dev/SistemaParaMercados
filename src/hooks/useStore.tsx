import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Store {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
}

interface StoreContextType {
  store: Store | null;
  storeId: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  store: null,
  storeId: null,
  loading: true,
  refetch: async () => {},
});

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStore = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Get user's store_id from profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("Error fetching profile:", profileError);
      }

      if (profile?.store_id) {
        setStoreId(profile.store_id);

        // Get store details
        const { data: storeData } = await supabase
          .from("stores")
          .select("*")
          .eq("id", profile.store_id)
          .single();

        if (storeData) {
          setStore(storeData);
        }
      }
    } catch (error) {
      console.error("Error fetching store:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchStore();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <StoreContext.Provider value={{ store, storeId, loading, refetch: fetchStore }}>
      {children}
    </StoreContext.Provider>
  );
};
