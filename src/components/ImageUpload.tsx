import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

export const ImageUpload = ({ imovelId, onUploadSuccess }: { imovelId: string, onUploadSuccess: (url: string) => void }) => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${imovelId || 'temp'}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Faz o Upload
      const { error: uploadError } = await supabase.storage
        .from('imoveis_fotos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pega a URL
      const { data } = supabase.storage.from('imoveis_fotos').getPublicUrl(filePath);
      
      onUploadSuccess(data.publicUrl);
      toast.success("Foto enviada com sucesso!");

    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar: verifique se o bucket 'imoveis_fotos' existe no Supabase.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <input
        type="file"
        id="file-upload"
        accept="image/*"
        onChange={uploadImage}
        disabled={uploading}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        <Upload className="w-8 h-8 text-slate-300" />
        <p className="text-xs text-slate-500 mb-2">JPG, PNG ou WebP</p>
        <Button 
          variant="outline" 
          type="button"
          disabled={uploading}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
          ) : (
            "Selecionar Foto"
          )}
        </Button>
      </div>
    </div>
  );
};