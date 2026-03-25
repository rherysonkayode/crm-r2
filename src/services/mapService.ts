// src/services/mapService.ts

import { supabase } from "@/integrations/supabase/client";
import { MapProperty } from "@/types/map";

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

class MapService {
  private cache: Map<string, GeocodeResult> = new Map();

  // Geocodificar um endereço usando Nominatim (OpenStreetMap)
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address) return null;
    
    const cacheKey = address.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address + ", Brasil"
        )}&limit=1&addressdetails=1`
      );
      
      const data = await response.json();
      
      if (data && data[0]) {
        const result: GeocodeResult = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name,
          neighborhood: data[0].address?.suburb,
          city: data[0].address?.city || data[0].address?.town,
          state: data[0].address?.state,
        };
        
        this.cache.set(cacheKey, result);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error("Erro ao geocodificar:", error);
      return null;
    }
  }

  // Buscar imóveis com coordenadas
  async getPropertiesWithCoordinates(userId: string): Promise<MapProperty[]> {
    if (!userId) return [];
    
    console.log("🔍 Buscando imóveis para o usuário:", userId);
    
    const { data: properties, error } = await supabase
      .from("properties")
      .select("*")
      .eq("created_by", userId)
      .neq("status", "vendido");

    if (error || !properties) {
      console.error("Erro ao buscar imóveis:", error);
      return [];
    }

    console.log(`📦 Encontrados ${properties.length} imóveis no total`);
    
    // Log dos imóveis com possíveis coordenadas
    properties.forEach((prop: any) => {
      console.log(`   - ${prop.title}: lat=${prop.latitude}, lng=${prop.longitude}`);
    });

    const propertiesWithCoordinates: MapProperty[] = [];

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i] as any;
      console.log(`📍 Processando imóvel ${i + 1}: ${prop.title}`);
      console.log(`   - Latitude salva: ${prop.latitude}, Longitude salva: ${prop.longitude}`);
      
      // PRIORIDADE 1: Usar coordenadas já salvas no banco
      if (prop.latitude && prop.longitude) {
        console.log(`✅ Usando coordenadas SALVAS para ${prop.title}`);
        propertiesWithCoordinates.push({
          id: prop.id,
          title: prop.title || "Imóvel sem título",
          price: prop.price || 0,
          type: prop.type || "residencial",
          status: prop.status || "disponivel",
          address: prop.full_address || `${prop.neighborhood || ""}, ${prop.city || ""}`.trim(),
          neighborhood: prop.neighborhood || "",
          city: prop.city || "",
          coordinates: {
            lat: prop.latitude,
            lng: prop.longitude,
          },
          images: [],
          area: prop.area,
          bedrooms: prop.bedrooms,
          created_at: prop.created_at,
        });
      } 
      // PRIORIDADE 2: Se não tem coordenadas, tenta geocodificar (fallback)
      else {
        console.log(`⚠️ Sem coordenadas para ${prop.title}, tentando geocodificar...`);
        
        const addressParts = [];
        if (prop.neighborhood) addressParts.push(prop.neighborhood);
        if (prop.city) addressParts.push(prop.city);
        
        const fullAddress = addressParts.join(", ");
        console.log(`   - Endereço para geocodificação: "${fullAddress}"`);
        
        if (fullAddress) {
          const coordinates = await this.geocodeAddress(fullAddress);
          
          if (coordinates) {
            console.log(`✅ Geocodificado com sucesso: ${coordinates.lat}, ${coordinates.lng}`);
            propertiesWithCoordinates.push({
              id: prop.id,
              title: prop.title || "Imóvel sem título",
              price: prop.price || 0,
              type: prop.type || "residencial",
              status: prop.status || "disponivel",
              address: fullAddress,
              neighborhood: prop.neighborhood || "",
              city: prop.city || "",
              coordinates: {
                lat: coordinates.lat,
                lng: coordinates.lng,
              },
              images: [],
              area: prop.area,
              bedrooms: prop.bedrooms,
              created_at: prop.created_at,
            });
            
            // Salvar coordenadas para uso futuro - usando as any para evitar erro de tipo
            console.log(`💾 Salvando coordenadas no banco para ${prop.title}`);
            await supabase
              .from("properties")
              .update({
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                full_address: fullAddress
              } as any)
              .eq("id", prop.id);
          } else {
            console.log(`❌ Falha ao geocodificar: ${fullAddress}`);
          }
        } else {
          console.log(`❌ Endereço vazio para ${prop.title}`);
        }
      }
      
      // Pequeno delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎯 TOTAL de imóveis com coordenadas: ${propertiesWithCoordinates.length}`);
    return propertiesWithCoordinates;
  }

  // Buscar imagens dos imóveis
  async getPropertyImages(propertyIds: string[]): Promise<Record<string, string>> {
    if (propertyIds.length === 0) return {};
    
    const { data: images, error } = await supabase
      .from("property_images")
      .select("property_id, url")
      .in("property_id", propertyIds)
      .order("position", { ascending: true });

    if (error || !images) {
      console.error("Erro ao buscar imagens:", error);
      return {};
    }

    const imageMap: Record<string, string> = {};
    images.forEach((img: any) => {
      if (!imageMap[img.property_id]) {
        imageMap[img.property_id] = img.url;
      }
    });

    return imageMap;
  }
}

export const mapService = new MapService();