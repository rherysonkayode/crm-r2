// components/PropertyImagesManager.tsx
import { usePropertyImages } from "@/hooks/usePropertyImages";
import { ImageUploadMultiple } from "./ImageUploadMultiple";

export const PropertyImagesManager = ({ propertyId }: { propertyId: string }) => {
  const { images, addImage, removeImage, reorderImages } = usePropertyImages(propertyId);

  return (
    <div className="space-y-2">
      <Label>Fotos do Imóvel</Label>
      <ImageUploadMultiple
        propertyId={propertyId}
        images={images || []}
        onUploadSuccess={addImage}
        onRemove={removeImage}
        onReorder={reorderImages}
      />
    </div>
  );
};