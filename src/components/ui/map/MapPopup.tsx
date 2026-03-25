// src/components/ui/map/MapPopup.tsx

import { MapProperty } from "@/types/map";
import { Button } from "@/components/ui/button";
import { X, BedDouble, Maximize, MapPin, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

interface MapPopupProps {
  property: MapProperty;
  onClose: () => void;
}

export const MapPopup = ({ property, onClose }: MapPopupProps) => {
  return (
    <div className="bg-white rounded-xl shadow-xl w-72 overflow-hidden">
      {/* Cabeçalho */}
      <div className="relative h-32 bg-slate-200">
        {property.images && property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <Building2 className="w-8 h-8 text-slate-300" />
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 transition-colors"
        >
          <X className="w-3 h-3 text-slate-600" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-white text-xs font-semibold truncate">{property.neighborhood || property.city}</p>
        </div>
      </div>
      
      {/* Conteúdo */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-slate-800 line-clamp-2">{property.title}</h3>
        <p className="text-lg font-black text-[#7E22CE] mt-1">{formatCurrency(property.price)}</p>
        
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" /> {property.bedrooms} qto
            </span>
          )}
          {property.area && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3 h-3" /> {property.area} m²
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{property.address || property.neighborhood}</span>
        </div>
        
        <Link
          to={`/imovel/${property.id}`}
          className="block mt-3 text-center text-xs font-semibold bg-[#7E22CE] text-white py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Ver detalhes
        </Link>
      </div>
    </div>
  );
};