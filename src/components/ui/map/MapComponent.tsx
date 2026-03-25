// src/components/ui/map/MapComponent.tsx
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export interface MapPropertyItem {
  id: string;
  title: string;
  price: number | null;
  type: string;
  status: string;
  coordinates: { lat: number; lng: number };
  city?: string;
  neighborhood?: string;
  images?: string[];
}

interface MapComponentProps {
  properties: MapPropertyItem[];
  viewState: { center: { lat: number; lng: number }; zoom: number };
  onViewStateChange: (v: { center: { lat: number; lng: number }; zoom: number }) => void;
  onPropertySelect: (p: MapPropertyItem | null) => void;
  selectedProperty: MapPropertyItem | null;
  loading?: boolean;
}

const statusColor: Record<string, string> = {
  disponivel: "#22C55E",
  reservado:  "#F59E0B",
  vendido:    "#A855F7",
  alugado:    "#3B82F6",
};

const fmt = (val: number | null) =>
  val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "Consulte";

export const MapComponent = ({
  properties,
  viewState,
  onViewStateChange,
  onPropertySelect,
  selectedProperty,
  loading,
}: MapComponentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 1. Inicializar mapa ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // Flag de cancelamento: se o efeito for limpo (StrictMode desmonta)
    // antes do await resolver, cancelamos a criação do mapa
    let cancelled = false;

    const init = async () => {
      // Injetar CSS uma única vez
      if (!document.getElementById("leaflet-css")) {
        await new Promise<void>((resolve) => {
          const link    = document.createElement("link");
          link.id       = "leaflet-css";
          link.rel      = "stylesheet";
          link.href     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          link.onload   = () => resolve();
          link.onerror  = () => resolve();
          document.head.appendChild(link);
        });
      }

      // ← após qualquer await, verificar se já fomos desmontados
      if (cancelled) return;

      try {
        const L = (await import("leaflet")).default;

        // ← verificar novamente após o import dinâmico
        if (cancelled) return;

        // Fix ícones quebrados no Vite
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        // Limpar qualquer resíduo do container (segurança extra)
        const el = containerRef.current as any;
        if (!el) return;
        if (el._leaflet_id) delete el._leaflet_id;
        if (mapRef.current) {
          try { mapRef.current.remove(); } catch (_) {}
          mapRef.current = null;
          markersRef.current.clear();
        }

        // Criar mapa
        const map = L.map(el, {
          center:      [viewState.center.lat, viewState.center.lng],
          zoom:        viewState.zoom,
          zoomControl: false,
        });

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
          }
        ).addTo(map);

        map.on("moveend", () => {
          if (cancelled) return;
          const c = map.getCenter();
          onViewStateChange({ center: { lat: c.lat, lng: c.lng }, zoom: map.getZoom() });
        });

        // Guardar instância só se ainda estivermos montados
        if (cancelled) {
          map.remove();
          return;
        }

        mapRef.current = map;
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          console.error("[MapComponent] Erro ao inicializar:", e);
          setError("Não foi possível carregar o mapa.");
        }
      }
    };

    init();

    // Cleanup: marcar como cancelado E destruir qualquer instância criada
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
        markersRef.current.clear();
      }
      if (containerRef.current) {
        delete (containerRef.current as any)._leaflet_id;
      }
      setReady(false);
      setError(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Sincronizar viewState → mapa ────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const c   = map.getCenter();
    const dx  = Math.abs(c.lat - viewState.center.lat);
    const dy  = Math.abs(c.lng - viewState.center.lng);
    const dz  = Math.abs(map.getZoom() - viewState.zoom);
    if (dx > 0.0001 || dy > 0.0001 || dz >= 1) {
      map.setView([viewState.center.lat, viewState.center.lng], viewState.zoom, { animate: true });
    }
  }, [viewState, ready]);

  // ── 3. Renderizar marcadores ────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const render = async () => {
      const L   = (await import("leaflet")).default;
      const map = mapRef.current;
      if (!map) return;

      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();

      const valid = properties.filter(p => p.coordinates?.lat && p.coordinates?.lng);

      valid.forEach((prop) => {
        const color = statusColor[prop.status] || "#7E22CE";
        const img   = prop.images?.[0];

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:34px;height:40px;cursor:pointer;">
              <svg viewBox="0 0 34 40" xmlns="http://www.w3.org/2000/svg"
                style="width:34px;height:40px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))">
                <path d="M17 0C8.163 0 1 7.163 1 16c0 13 16 24 16 24S33 29 33 16C33 7.163 25.837 0 17 0z"
                  fill="${color}" stroke="white" stroke-width="1.5"/>
                <circle cx="17" cy="16" r="8" fill="white" opacity=".9"/>
              </svg>
              ${img
                ? `<img src="${img}" style="position:absolute;top:5px;left:50%;transform:translateX(-50%);width:16px;height:16px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'"/>`
                : `<span style="position:absolute;top:7px;left:50%;transform:translateX(-50%);font-size:11px;line-height:1;">🏠</span>`
              }
            </div>`,
          iconSize:    [34, 40],
          iconAnchor:  [17, 40],
          popupAnchor: [0, -44],
        });

        const marker = L.marker([prop.coordinates.lat, prop.coordinates.lng], { icon });

        marker.bindPopup(
          L.popup({ maxWidth: 260, closeButton: true }).setContent(`
            <div style="font-family:sans-serif;min-width:200px;">
              ${img ? `<img src="${img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px 8px 0 0;" onerror="this.style.display='none'"/>` : ""}
              <div style="padding:10px 10px 6px;">
                <p style="margin:0 0 2px;font-size:10px;color:#94a3b8;text-transform:capitalize;">${prop.type}</p>
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0f172a;line-height:1.3;">${prop.title}</p>
                ${prop.neighborhood || prop.city
                  ? `<p style="margin:0 0 6px;font-size:11px;color:#64748b;">📍 ${[prop.neighborhood, prop.city].filter(Boolean).join(", ")}</p>`
                  : ""}
                <p style="margin:0 0 8px;font-size:15px;font-weight:900;color:#7E22CE;">${fmt(prop.price)}</p>
                <a href="/#/imovel/${prop.id}"
                  style="display:block;background:#7E22CE;color:#fff;text-align:center;padding:7px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">
                  Ver detalhes →
                </a>
              </div>
            </div>
          `)
        );

        marker.on("click", () => onPropertySelect(prop));
        marker.addTo(map);
        markersRef.current.set(prop.id, marker);
      });

      if (valid.length > 1) {
        const bounds = L.latLngBounds(valid.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else if (valid.length === 1) {
        map.setView([valid[0].coordinates.lat, valid[0].coordinates.lng], 15, { animate: true });
      }
    };

    render();
  }, [ready, properties]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Abrir popup do imóvel selecionado ───────────────────────────
  useEffect(() => {
    if (!ready || !selectedProperty || !mapRef.current) return;
    const marker = markersRef.current.get(selectedProperty.id);
    if (marker) {
      mapRef.current.setView(
        [selectedProperty.coordinates.lat, selectedProperty.coordinates.lng],
        15, { animate: true }
      );
      setTimeout(() => marker.openPopup(), 300);
    }
  }, [selectedProperty, ready]);

  if (loading) return (
    <div className="w-full flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200" style={{ minHeight: 500 }}>
      <Loader2 className="w-8 h-8 animate-spin text-[#7E22CE]" />
    </div>
  );

  if (error) return (
    <div className="w-full flex items-center justify-center bg-red-50 rounded-xl border border-red-200" style={{ minHeight: 500 }}>
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200" style={{ minHeight: 500 }}>
      <div ref={containerRef} style={{ width: "100%", height: "500px" }} />

      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 text-xs z-[400]">
        {[
          { color: "#22C55E", label: "Disponível" },
          { color: "#F59E0B", label: "Reservado"  },
          { color: "#A855F7", label: "Vendido"    },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
            <span style={{ color: "#334155" }}>{label}</span>
          </div>
        ))}
      </div>

      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; overflow: hidden; }
        .leaflet-popup-content { margin: 0; }
      `}</style>
    </div>
  );
};