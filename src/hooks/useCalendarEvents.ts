import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCalendarEvents = () => {
  const { profile, isCorretor } = useAuth();

  return useQuery({
    queryKey: ["calendar_events", profile?.id, profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from("calendar_events")
        .select("*, leads(name), properties(title), profiles!calendar_events_assigned_to_fkey(full_name)")
        .order("start_at", { ascending: true });

      // Corretor independente: só vê eventos onde é criador ou responsável
      if (isCorretor && !profile?.company_id) {
        query = query.or(`created_by.eq.${profile!.id},assigned_to.eq.${profile!.id}`);
      }
      // Corretor vinculado: só vê seus eventos dentro da empresa
      else if (isCorretor && profile?.company_id) {
        query = query
          .eq("company_id", profile.company_id)
          .or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`);
      }
      // Imobiliária: vê todos os eventos da empresa
      else if (profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile,    
  });
};