import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useLeads = () => {
  const { profile, isCorretor } = useAuth();
  return useQuery({
    queryKey: ["leads", profile?.id, profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (isCorretor && !profile?.company_id) {
        query = query.eq("assigned_to", profile!.id);
      } else if (isCorretor && profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      } else if (profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
};

export const useProperties = () => {
  const { profile, isCorretor } = useAuth();
  return useQuery({
    queryKey: ["properties", profile?.id, profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (profile?.company_id) {
        // Usuário vinculado a uma empresa: vê imóveis da empresa
        query = query.eq("company_id", profile.company_id);
      } else {
        // Usuário independente (sem empresa): vê APENAS seus próprios imóveis
        query = query.eq("created_by", profile!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
};

export const useDeals = () => {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["deals", profile?.id, profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*, leads(name), properties(title)")
        .order("created_at", { ascending: false });

      if (profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      } else {
        query = query.eq("created_by", profile!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
};

export const useProfiles = () => {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["profiles", profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
};