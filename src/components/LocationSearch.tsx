// src/components/LocationSearch.tsx

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationSearchProps {
  value: string;
  onChange: (location: { address: string; lat: number; lng: number; neighborhood?: string; city?: string }) => void;
  placeholder?: string;
  className?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
  };
}

export function LocationSearch({ value, onChange, placeholder = "Digite um endereço, bairro ou cidade...", className }: LocationSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const searchLocation = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ", Brasil"
        )}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error("Erro ao buscar localização:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setSearchTerm(result.display_name);
    onChange({
      address: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      neighborhood: result.address?.suburb,
      city: result.address?.city || result.address?.town,
    });
    setShowResults(false);
    setResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    if (newValue.length >= 3) {
      searchLocation(newValue);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn("pl-9 pr-8", className)}
          onFocus={() => searchTerm.length >= 3 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{result.display_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {result.address?.suburb && `${result.address.suburb}, `}
                    {result.address?.city || result.address?.town}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}