// src/components/ui/map/MapControls.tsx

import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Locate, Layers } from "lucide-react";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleLayer?: () => void;
  showClusters?: boolean;
}

export const MapControls = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleLayer,
  showClusters,
}: MapControlsProps) => {
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
      <Button
        size="sm"
        variant="secondary"
        className="bg-white shadow-md hover:bg-slate-100 w-8 h-8 p-0"
        onClick={onZoomIn}
        title="Aproximar"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="bg-white shadow-md hover:bg-slate-100 w-8 h-8 p-0"
        onClick={onZoomOut}
        title="Afastar"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="bg-white shadow-md hover:bg-slate-100 w-8 h-8 p-0"
        onClick={onResetView}
        title="Centralizar"
      >
        <Locate className="w-4 h-4" />
      </Button>
      {onToggleLayer && (
        <Button
          size="sm"
          variant="secondary"
          className="bg-white shadow-md hover:bg-slate-100 w-8 h-8 p-0"
          onClick={onToggleLayer}
          title={showClusters ? "Desativar agrupamento" : "Ativar agrupamento"}
        >
          <Layers className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};