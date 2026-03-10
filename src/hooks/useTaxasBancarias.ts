import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BancoConfig {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  corTexto: string;
  maxPrazo: number;
  // Percentual máximo financiável para imóvel novo e usado (para cada tipo)
  maxFinancingPercent: {
    residencial: { novo: number; usado: number };
    comercial: { novo: number; usado: number };
    rural: { novo: number; usado: number };
  };
  // Taxas por tipo de imóvel e sistema
  taxas: {
    residencial: { price: number; sac: number };
    comercial: { price: number; sac: number };
    rural: { price: number; sac: number };
  };
}

export const useTaxasBancarias = () => {
  // Simulação – substitua pela consulta real ao Supabase
  const bancos: BancoConfig[] = [
    {
      id: "caixa",
      nome: "Caixa Econômica",
      sigla: "CEF",
      cor: "#0A4B8C",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      maxFinancingPercent: {
        residencial: { novo: 90, usado: 80 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        residencial: { price: 11.19, sac: 11.19 },
        comercial: { price: 12.0, sac: 12.0 },
        rural: { price: 11.5, sac: 11.5 },
      },
    },
    {
      id: "bb",
      nome: "Banco do Brasil",
      sigla: "BB",
      cor: "#003D7C",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      maxFinancingPercent: {
        residencial: { novo: 80, usado: 80 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        residencial: { price: 11.8, sac: 11.8 },
        comercial: { price: 12.5, sac: 12.5 },
        rural: { price: 12.0, sac: 12.0 },
      },
    },
    {
      id: "itau",
      nome: "Itaú",
      sigla: "ITA",
      cor: "#EC7000",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      maxFinancingPercent: {
        residencial: { novo: 80, usado: 80 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        residencial: { price: 11.7, sac: 11.7 },
        comercial: { price: 12.2, sac: 12.2 },
        rural: { price: 11.9, sac: 11.9 },
      },
    },
    {
      id: "santander",
      nome: "Santander",
      sigla: "SAN",
      cor: "#CC3333",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      maxFinancingPercent: {
        residencial: { novo: 80, usado: 80 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        residencial: { price: 11.99, sac: 11.99 },
        comercial: { price: 12.5, sac: 12.5 },
        rural: { price: 12.2, sac: 12.2 },
      },
    },
    {
      id: "bradesco",
      nome: "Bradesco",
      sigla: "BRA",
      cor: "#660099",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      maxFinancingPercent: {
        residencial: { novo: 70, usado: 70 },
        comercial: { novo: 60, usado: 60 },
        rural: { novo: 60, usado: 60 },
      },
      taxas: {
        residencial: { price: 13.2, sac: 13.2 },
        comercial: { price: 13.5, sac: 13.5 },
        rural: { price: 13.0, sac: 13.0 },
      },
    },
    {
      id: "inter",
      nome: "Banco Inter",
      sigla: "INT",
      cor: "#FF7A00",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      maxFinancingPercent: {
        residencial: { novo: 75, usado: 75 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        residencial: { price: 11.5, sac: 11.3 },
        comercial: { price: 12.0, sac: 12.0 },
        rural: { price: 11.8, sac: 11.8 },
      },
    },
  ];

  return { bancos, loading: false };
};