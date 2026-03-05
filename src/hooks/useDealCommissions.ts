import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Commission = {
  id: string;
  deal_id: string;
  corretor_id: string;
  percentual: number;
  valor_comissao: number;
  created_at: string;
  corretor?: {
    full_name: string;
  };
};

export const useDealCommissions = (dealId?: string) => {
  const queryClient = useQueryClient();

  const { data: commissions, isLoading } = useQuery({
    queryKey: ["deal_commissions", dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await (supabase
        .from("deal_commissions" as any)
        .select("*, corretor:profiles!deal_commissions_corretor_id_fkey(full_name)")
        .eq("deal_id", dealId) as any);
      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!dealId,
  });

  const addCommissions = useMutation({
    mutationFn: async (commissions: { corretor_id: string; percentual: number }[]) => {
      if (!dealId) throw new Error("dealId não informado");

      // Buscar token de autenticação
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        "https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/hyper-api/commissions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ deal_id: dealId, commissions }),
        }
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_commissions", dealId] });
      toast.success("Comissões registradas!");
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar comissões: " + error.message);
    },
  });

  return { commissions, isLoading, addCommissions };
};