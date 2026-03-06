import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2, X, Images } from "lucide-react";

const MAX_IMAGES = 5;

interface ImageUploadMultipleProps {
  propertyId: string;
  images: { id: string; url: string; position: number }[];
  onUploadSuccess: (url: string) => void;
  onRemove: (imageId: string) => void;
}

export const ImageUploadMultiple = ({
  propertyId,
  images,
  onUploadSuccess,
  onRemove,
}: ImageUploadMultipleProps) => {
  const [uploading, setUploading] = useState(false);

  const canAddMore = images.length < MAX_IMAGES;

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;

      // Verifica o limite antes de fazer upload
      if (images.length >= MAX_IMAGES) {
        toast.error(`Limite de ${MAX_IMAGES} fotos atingido. Remova uma foto antes de adicionar outra.`);
        event.target.value = "";
        return;
      }

      setUploading(true);

      const file = event.target.files[0];

      // Valida tamanho (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB.");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${propertyId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("imoveis_fotos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("imoveis_fotos").getPublicUrl(fileName);

      onUploadSuccess(data.publicUrl);
      toast.success("Foto enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setUploading(false);
      // Limpa o input para permitir reenvio do mesmo arquivo
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Contador */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Images className="w-3.5 h-3.5" />
          {images.length}/{MAX_IMAGES} fotos
        </span>
        {images.length >= MAX_IMAGES && (
          <span className="text-xs text-amber-600 font-medium">
            Limite atingido — remova uma foto para adicionar outra
          </span>
        )}
      </div>

      {/* Grid de imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-lg border border-border overflow-hidden"
            >
              <img src={img.url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
              {/* Badge de posição */}
              <span className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                {index + 1}
              </span>
              {/* Botão remover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Área de upload — só aparece se ainda pode adicionar */}
      {canAddMore && (
        <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <input
            type="file"
            id="file-upload-multiple"
            accept="image/jpeg,image/png,image/webp"
            onChange={uploadImage}
            disabled={uploading}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-300" />
            <p className="text-xs text-slate-500">
              JPG, PNG ou WebP • Máx. 5MB por foto
            </p>
            <Button
              variant="outline"
              type="button"
              disabled={uploading}
              onClick={() => document.getElementById("file-upload-multiple")?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                `Adicionar Foto ${images.length > 0 ? `(${images.length}/${MAX_IMAGES})` : ""}`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {images.length === 0 && !canAddMore === false && (
        <p className="text-xs text-center text-muted-foreground">
          Nenhuma foto adicionada ainda
        </p>
      )}
    </div>
  );
};