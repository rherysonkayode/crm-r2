import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BancoConfig {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  corTexto: string;
  maxPrazo: number;
  minImovel: number;        // valor minimo do imovel aceito pelo banco
  tag: number;              // tarifa de avaliacao do bem (cobrada na contratacao)
  mipAnual: number;         // seguro MIP (% ao ano sobre saldo devedor)
  dfiAnual: number;         // seguro DFI (% ao ano sobre valor do imovel)
  maxFinancingPercent: {
    residencial: { novo: number; usado: number };
    comercial: { novo: number; usado: number };
    rural: { novo: number; usado: number };
  };
  taxas: {
    residencial: { price: number; sac: number };
    comercial: { price: number; sac: number };
    rural: { price: number; sac: number };
  };
}

export const useTaxasBancarias = () => {
  // Taxas atualizadas com base em CrediMorar + simuladores oficiais (marco/2025)
  // tag, mip, dfi: fontes CrediMorar e site Bradesco
  // Para atualizar via API futura: substituir este array por query ao Supabase
  const bancos: BancoConfig[] = [
    {
      id: "caixa",
      nome: "Caixa Economica",
      sigla: "CEF",
      cor: "#0A4B8C",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      minImovel: 80000,
      tag: 1200.00,      // estimativa CEF (varia por regiao)
      mipAnual: 0.037,   // % ao ano sobre saldo devedor
      dfiAnual: 0.00825, // % ao ano sobre valor do imovel
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
      corTexto: "#FFCC00",
      maxPrazo: 420,
      minImovel: 80000,
      tag: 1500.00,
      mipAnual: 0.038,
      dfiAnual: 0.00825,
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
      nome: "Itau",
      sigla: "ITA",
      cor: "#EC7000",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      minImovel: 97561,   // fonte: CrediMorar
      tag: 1950.00,       // fonte: CrediMorar response
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        residencial: { novo: 90, usado: 90 }, // Itau financia ate 90% - fonte CrediMorar
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        // fonte: CrediMorar (TaxaEfetivaResidencial = 11.99%)
        residencial: { price: 11.99, sac: 11.39 },
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
      minImovel: 100000,  // fonte: CrediMorar
      tag: 1950.00,       // fonte: CrediMorar response
      mipAnual: 0.036,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        residencial: { novo: 80, usado: 80 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        // fonte: CrediMorar (TaxaEfetivaResidencial = 11.79%)
        residencial: { price: 11.79, sac: 11.20 },
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
      minImovel: 100000,  // fonte: CrediMorar
      tag: 2114.03,       // fonte: CrediMorar response + site Bradesco
      mipAnual: 0.037,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        residencial: { novo: 80, usado: 80 }, // corrigido: CrediMorar mostra 80%
        comercial: { novo: 60, usado: 60 },
        rural: { novo: 60, usado: 60 },
      },
      taxas: {
        // fonte: CrediMorar (TaxaEfetivaResidencial = 12.29%)
        // site Bradesco PRICE: 13.49% efetiva / 12.72% nominal
        residencial: { price: 12.72, sac: 11.66 },
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
      minImovel: 200000,  // fonte: CrediMorar
      tag: 5000.00,       // fonte: CrediMorar response
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        residencial: { novo: 75, usado: 75 }, // fonte: CrediMorar (maxLtv = 0.75)
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        // fonte: CrediMorar (TaxaEfetivaResidencial = 9.5%, TaxaJurosUtilizada = 9.11%)
        residencial: { price: 9.50, sac: 9.11 },
        comercial: { price: 12.0, sac: 12.0 },
        rural: { price: 11.8, sac: 11.8 },
      },
    },
  ];

  return { bancos, loading: false };
};