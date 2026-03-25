// src/types/map.ts

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapProperty {
  id: string;
  title: string;
  price: number;
  type: string;
  status: string;
  address: string;
  neighborhood: string;
  city: string;
  coordinates: MapCoordinates;
  images: string[];
  area?: number;
  bedrooms?: number;
  created_at: string;
}

export interface MapViewState {
  center: MapCoordinates;
  zoom: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface MapFilter {
  priceRange?: [number, number];
  propertyType?: string[];
  status?: string[];
  bedrooms?: number;
  areaRange?: [number, number];
}