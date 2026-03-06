import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface LocalImage {
  id: string;
  file: File;
  preview: string;
}

interface LocalImageUploadProps {
  onImagesChange: (images: LocalImage[]) => void;
}

export const LocalImageUpload = ({ onImagesChange }: LocalImageUploadProps) => {
  const [images, setImages] = useState<LocalImage[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: `local-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file)
    }));
    const updated = [...images, ...newImages];
    setImages(updated);
    onImagesChange(updated);
  };

  const removeImage = (id: string) => {
    const updated = images.filter(img => img.id !== id);
    setImages(updated);
    onImagesChange(updated);
  };

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group aspect-square rounded-lg border border-border overflow-hidden">
              <img src={img.preview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => removeImage(img.id)}
                  className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <input
          type="file"
          id="local-file-upload"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-slate-300" />
          <p className="text-xs text-slate-500 mb-2">JPG, PNG ou WebP</p>
          <Button
            variant="outline"
            type="button"
            onClick={() => document.getElementById('local-file-upload')?.click()}
          >
            Selecionar Fotos
          </Button>
        </div>
      </div>
    </div>
  );
};