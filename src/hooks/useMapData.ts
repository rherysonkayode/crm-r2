// src/hooks/useMapData.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapPropertyItem } from "@/components/ui/map/MapComponent";

export interface MapViewState {
  center: { lat: number; lng: number };
  zoom: number;
}

interface MapFilter {
  propertyType?: string[];
  status?: string[];
  priceRange?: [number, number];
}

export const useMapData = (userId: string, companyId?: string) => {
  const [properties,         setProperties]         = useState<MapPropertyItem[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<MapPropertyItem[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [filters,            setFilters]            = useState<MapFilter>({});
  const [selectedProperty,   setSelectedProperty]   = useState<MapPropertyItem | null>(null);
  const [viewState, setViewState] = useState<MapViewState>({
    center: { lat: -15.7801, lng: -47.9292 },
    zoom: 4,
  });

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Buscar imóveis que tenham latitude E longitude preenchidos
        let query = (supabase as any)
          .from("properties")
          .select("id, title, price, type, status, latitude, longitude, city, neighborhood, created_by, company_id")
          .not("latitude",  "is", null)
          .not("longitude", "is", null);

        // Imobiliária: filtra pela empresa. Corretor: filtra pelo created_by
        if (companyId) {
          query = query.eq("company_id", companyId);
        } else {
          query = query.eq("created_by", userId);
        }

        const { data: props, error: qErr } = await query;

        if (qErr) throw qErr;

        if (!props || props.length === 0) {
          console.log("[useMapData] Nenhum imóvel com coordenadas");
          setProperties([]);
          setFilteredProperties([]);
          setLoading(false);
          return;
        }

        console.log(`[useMapData] ${props.length} imóvel(is) com coordenadas`);

        // Buscar primeira imagem de cada imóvel
        const ids = props.map((p: any) => p.id);
        const { data: imgs } = await (supabase as any)
          .from("property_images")
          .select("property_id, url, position")
          .in("property_id", ids)
          .order("position");

        const imgMap: Record<string, string> = {};
        (imgs ?? []).forEach((img: any) => {
          if (!imgMap[img.property_id]) imgMap[img.property_id] = img.url;
        });

        // Mapear para o formato MapPropertyItem
        const mapped: MapPropertyItem[] = props.map((p: any) => ({
          id:           p.id,
          title:        p.title || "Imóvel sem título",
          price:        p.price ? Number(p.price) : null,
          type:         p.type  || "residencial",
          status:       p.status || "disponivel",
          coordinates:  { lat: Number(p.latitude), lng: Number(p.longitude) },
          city:         p.city         ?? undefined,
          neighborhood: p.neighborhood ?? undefined,
          images:       imgMap[p.id] ? [imgMap[p.id]] : [],
        }));

        setProperties(mapped);
        setFilteredProperties(mapped);

        // Centralizar no primeiro imóvel
        setViewState({
          center: mapped[0].coordinates,
          zoom:   mapped.length === 1 ? 15 : 12,
        });

      } catch (err: any) {
        console.error("[useMapData] Erro:", err);
        setError("Erro ao carregar imóveis no mapa");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, companyId]);

  // Aplicar filtros reativamente
  useEffect(() => {
    let filtered = [...properties];
    if (filters.propertyType?.length) {
      filtered = filtered.filter(p => filters.propertyType!.includes(p.type));
    }
    if (filters.status?.length) {
      filtered = filtered.filter(p => filters.status!.includes(p.status));
    }
    if (filters.priceRange) {
      filtered = filtered.filter(p =>
        (p.price ?? 0) >= filters.priceRange![0] &&
        (p.price ?? 0) <= filters.priceRange![1]
      );
    }
    setFilteredProperties(filtered);
  }, [properties, filters]);

  const calculateBounds = useCallback(() => {
    if (!filteredProperties.length) return null;
    let n = -90, s = 90, e = -180, w = 180;
    filteredProperties.forEach(p => {
      n = Math.max(n, p.coordinates.lat); s = Math.min(s, p.coordinates.lat);
      e = Math.max(e, p.coordinates.lng); w = Math.min(w, p.coordinates.lng);
    });
    return { north: n, south: s, east: e, west: w };
  }, [filteredProperties]);

  return {
    properties: filteredProperties,
    allProperties: properties,
    loading,
    error,
    viewState,
    setViewState,
    filters,
    setFilters,
    selectedProperty,
    setSelectedProperty,
    calculateBounds,
  };
};