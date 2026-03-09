import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePropertyImages = (propertyId: string) => {
  const queryClient = useQueryClient();

  const { data: images, isLoading } = useQuery({
    queryKey: ["property_images", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!propertyId && propertyId !== "temp",
  });

  const addImage = useMutation({
    mutationFn: async (url: string) => {
      if (!propertyId || propertyId === "temp") return null;
      
      // Pega a maior posição atual
      const maxPos = images?.length ? Math.max(...images.map(i => i.position)) : -1;
      
      const { error } = await supabase
        .from("property_images")
        .insert({ property_id: propertyId, url, position: maxPos + 1 });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_images", propertyId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar imagem: " + error.message);
    },
  });

  const removeImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("property_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_images", propertyId] });
    },
    onError: (error: any) => {
      toast.error("Erro ao remover imagem: " + error.message);
    },
  });

  const reorderImages = useMutation({
    mutationFn: async (newOrder: { id: string; position: number }[]) => {
      for (const item of newOrder) {
        await supabase
          .from("property_images")
          .update({ position: item.position })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_images", propertyId] });
    },
  });

  return {
    images,
    isLoading,
    addImage: addImage.mutate,
    removeImage: removeImage.mutate,
    reorderImages: reorderImages.mutate,
  };
};