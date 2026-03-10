import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  position: number;
  created_at: string;
}

export const useAllPropertyImages = () => {
  return useQuery<PropertyImage[]>({
    queryKey: ["property_images"],
    queryFn: async () => {
      // Usamos 'as any' para contornar a falta da tabela nas tipagens do Supabase
      const { data, error } = await (supabase
        .from("property_images" as any)
        .select("*")
        .order("position", { ascending: true })) as any;

      if (error) {
        throw error;
      }
      return (data || []) as PropertyImage[];
    },
  });
};