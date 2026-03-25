// src/components/ui/map/MapMarker.tsx

import { useState } from "react";
import { MapProperty } from "@/types/map";
import { MapPin, Home, Building2, TreePine, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapMarkerProps {
  property: MapProperty;
  isSelected?: boolean;
  onClick: (property: MapProperty) => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const getPropertyIcon = (type: string) => {
  switch (type) {
    case "apartamento":
      return <Building2 className="w-4 h-4" />;
    case "casa":
      return <Home className="w-4 h-4" />;
    case "terreno":
      return <TreePine className="w-4 h-4" />;
    case "comercial":
      return <Briefcase className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "disponivel":
      return "bg-green-500";
    case "reservado":
      return "bg-amber-500";
    case "vendido":
      return "bg-purple-500";
    default:
      return "bg-blue-500";
  }
};

export const MapMarker = ({ property, isSelected, onClick }: MapMarkerProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200",
        isSelected ? "scale-110 z-10" : "hover:scale-105",
        isHovered ? "z-20" : "z-0"
      )}
      onClick={() => onClick(property)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full shadow-lg transition-all",
          isSelected ? "w-10 h-10" : "w-8 h-8",
          getStatusColor(property.status)
        )}
      >
        <div className="text-white">{getPropertyIcon(property.type)}</div>
      </div>
      
      {/* Tooltip flutuante */}
      {isHovered && !isSelected && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg p-2 min-w-[150px] z-30">
          <p className="text-xs font-semibold text-slate-800 truncate">{property.title}</p>
          <p className="text-xs text-purple-600 font-bold mt-1">{formatCurrency(property.price)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{property.neighborhood || property.city}</p>
        </div>
      )}
    </div>
  );
};