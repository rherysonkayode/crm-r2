import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company_id: string | null;
  role: 'admin' | 'corretor' | 'imobiliaria' | null;
  created_at: string;
  email?: string;
  phone?: string;
  cpf?: string;
  creci?: string;
  equipe?: string;
  status?: string;
  invited_by?: string;
  invited_at?: string;
  activated_at?: string;
  observations?: string;
  plan?: 'start' | 'pro' | 'profissional' | 'enterprise' | null;
  trial_start?: string | null;
  trial_end?: string | null;
  subscription_status?: 'trial' | 'active' | 'expired' | 'canceled' | null;
  subscription_id?: string | null;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;   // <-- novo: true enquanto a query do perfil está rodando
  isCorretor: boolean;
  isImobiliaria: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const { data: profile, isFetching: profileLoading, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      // Se erro (ex: RLS bloqueou), retorna null em vez de lançar exceção
      // Isso evita que a query fique em estado de erro silencioso infinito
      if (error) {
        console.warn('[AuthContext] Erro ao carregar perfil:', error.message);
        return null;
      }
      return data as Profile;
    },
    enabled: !!user?.id,
    retry: 1,          // tenta só 1x em caso de erro (não fica em loop)
    staleTime: 30000,  // 30s de cache
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  };

  const refreshProfile = async () => {
    await refetch();
  };

  const isCorretor = profile?.role === 'corretor';
  const isImobiliaria = profile?.role === 'imobiliaria';
  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      profile: profile || null,
      loading,
      profileLoading,
      isCorretor,
      isImobiliaria,
      isAdmin,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};