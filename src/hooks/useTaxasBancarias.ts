import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RegraDetalhada {
  tipoImovelId: number;
  valorMinimoImovel: number;
  valorMinimoFinanciamento: number;
  prazoMinimo: number;
  prazoMaximo: number;
  ltvMaximo: number;
  maxDespesasPercent: number;
  minDespesasPercent?: number;
}

export interface BancoConfig {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  corTexto: string;
  maxPrazo: number;
  minImovel: number;
  tag: number;
  mipAnual: number;
  dfiAnual: number;
  maxFinancingPercent: {
    residencial: { sac: number; price: number };
    comercial:   { sac: number; price: number };
    rural:       { sac: number; price: number };
  };
  taxas: {
    residencial: { price: number; sac: number };
    comercial:   { price: number; sac: number };
    rural:       { price: number; sac: number };
  };
  // Linhas especiais da Caixa
  taxasMCMV?: { sac: number; price: number };
  ltvMCMV?: { sac: number; price: number };
  taxasProCotista?: { sac: number; price: number };
  ltvProCotista?: { sac: number; price: number };
  
  regrasDetalhadas?: RegraDetalhada[];
  estadosNaoAtendidos?: string[];
  ordemSimulacao?: number;
  selecionada?: boolean;
  desabilitada?: boolean;
}

export const tipoParaId: Record<string, number> = {
  residencial: 0,
  comercial: 1,
  rural: 2,
};

// Fallback com dados da CrediMorar
const BANCOS_FALLBACK: BancoConfig[] = [
  {
    id: "bradesco",
    nome: "Bradesco",
    sigla: "BRA",
    cor: "#660099",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 100000,
    tag: 2114.03,
    mipAnual: 1.2,
    dfiAnual: 0.3,
    maxFinancingPercent: {
      residencial: { sac: 80, price: 80 },
      comercial:   { sac: 60, price: 60 },
      rural:       { sac: 60, price: 60 },
    },
    taxas: {
      residencial: { sac: 12.79, price: 12.79 },
      comercial:   { sac: 13.50, price: 13.50 },
      rural:       { sac: 13.00, price: 13.00 },
    },
    ordemSimulacao: 1,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
  },
  {
    id: "itau",
    nome: "Itaú",
    sigla: "ITA",
    cor: "#EC7000",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 97561,
    tag: 850,
    mipAnual: 1.1,
    dfiAnual: 0.25,
    maxFinancingPercent: {
      residencial: { sac: 80, price: 80 },
      comercial:   { sac: 70, price: 70 },
      rural:       { sac: 70, price: 70 },
    },
    taxas: {
      residencial: { sac: 12.19, price: 12.19 },
      comercial:   { sac: 12.50, price: 12.50 },
      rural:       { sac: 12.20, price: 12.20 },
    },
    ordemSimulacao: 2,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
  },
  {
    id: "santander",
    nome: "Santander",
    sigla: "SAN",
    cor: "#CC3333",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 100000,
    tag: 1950,
    mipAnual: 1.15,
    dfiAnual: 0.28,
    maxFinancingPercent: {
      residencial: { sac: 80, price: 80 },
      comercial:   { sac: 70, price: 70 },
      rural:       { sac: 70, price: 60 },
    },
    taxas: {
      residencial: { sac: 13.19, price: 13.19 },
      comercial:   { sac: 13.50, price: 13.50 },
      rural:       { sac: 13.20, price: 13.20 },
    },
    ordemSimulacao: 3,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
  },
  {
    id: "caixa",
    nome: "Caixa Econômica",
    sigla: "CEF",
    cor: "#0A4B8C",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 80000,
    tag: 1200,
    mipAnual: 1.2,
    dfiAnual: 0.3,
    maxFinancingPercent: {
      residencial: { sac: 80, price: 50 },
      comercial:   { sac: 70, price: 50 },
      rural:       { sac: 70, price: 50 },
    },
    taxas: {
      residencial: { sac: 11.49, price: 11.49 },
      comercial:   { sac: 12.00, price: 12.00 },
      rural:       { sac: 11.50, price: 11.50 },
    },
    // Linhas especiais da Caixa
    taxasMCMV: { sac: 10.0, price: 10.0 },
    ltvMCMV: { sac: 80, price: 80 },
    taxasProCotista: { sac: 8.66, price: 8.66 },
    ltvProCotista: { sac: 80, price: 80 },
    ordemSimulacao: 4,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
  },
  {
    id: "bb",
    nome: "Banco do Brasil",
    sigla: "BB",
    cor: "#003D7C",
    corTexto: "#FFCC00",
    maxPrazo: 420,
    minImovel: 80000,
    tag: 1500,
    mipAnual: 1.2,
    dfiAnual: 0.3,
    maxFinancingPercent: {
      residencial: { sac: 70, price: 70 },
      comercial:   { sac: 60, price: 60 },
      rural:       { sac: 60, price: 60 },
    },
    taxas: {
      residencial: { sac: 12.00, price: 12.00 },
      comercial:   { sac: 12.50, price: 12.50 },
      rural:       { sac: 12.00, price: 12.00 },
    },
    ordemSimulacao: 5,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
  },
  {
    id: "inter",
    nome: "Banco Inter",
    sigla: "INT",
    cor: "#FF7A00",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 200000,
    tag: 5000,
    mipAnual: 1.3,
    dfiAnual: 0.35,
    maxFinancingPercent: {
      residencial: { sac: 75, price: 75 },
      comercial:   { sac: 70, price: 60 },
      rural:       { sac: 70, price: 60 },
    },
    taxas: {
      residencial: { sac: 8.20, price: 8.20 },
      comercial:   { sac: 13.76, price: 13.76 },
      rural:       { sac: 13.00, price: 13.00 },
    },
    ordemSimulacao: 6,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: ["AC", "AM", "AP", "RO", "RR"],
  },
];

function rowToBancoConfig(row: any): BancoConfig {
  return {
    id: row.banco_id,
    nome: row.nome,
    sigla: row.sigla,
    cor: row.cor,
    corTexto: row.cor_texto,
    maxPrazo: row.max_prazo,
    minImovel: Number(row.min_imovel),
    tag: Number(row.tag),
    mipAnual: Number(row.mip_anual),
    dfiAnual: Number(row.dfi_anual),
    maxFinancingPercent: {
      residencial: { sac: Number(row.ltv_residencial_sac), price: Number(row.ltv_residencial_price) },
      comercial:   { sac: Number(row.ltv_comercial_sac),   price: Number(row.ltv_comercial_price)   },
      rural:       { sac: Number(row.ltv_rural_sac),       price: Number(row.ltv_rural_price)       },
    },
    taxas: {
      residencial: { sac: Number(row.taxa_residencial_sac), price: Number(row.taxa_residencial_price) },
      comercial:   { sac: Number(row.taxa_comercial_sac),   price: Number(row.taxa_comercial_price)   },
      rural:       { sac: Number(row.taxa_rural_sac),       price: Number(row.taxa_rural_price)       },
    },
    // Linhas especiais da Caixa
    taxasMCMV: row.taxa_mcmv_sac ? { sac: Number(row.taxa_mcmv_sac), price: Number(row.taxa_mcmv_price) } : undefined,
    ltvMCMV: row.ltv_mcmv_sac ? { sac: Number(row.ltv_mcmv_sac), price: Number(row.ltv_mcmv_price) } : undefined,
    taxasProCotista: row.taxa_procotista_sac ? { sac: Number(row.taxa_procotista_sac), price: Number(row.taxa_procotista_price) } : undefined,
    ltvProCotista: row.ltv_procotista_sac ? { sac: Number(row.ltv_procotista_sac), price: Number(row.ltv_procotista_price) } : undefined,
    
    regrasDetalhadas: row.regras_detalhadas ? JSON.parse(row.regras_detalhadas) : undefined,
    estadosNaoAtendidos: row.estados_nao_atendidos ? row.estados_nao_atendidos.split(',') : undefined,
    ordemSimulacao: row.ordem_simulacao,
    selecionada: row.selecionada,
    desabilitada: row.desabilitada,
  };
}

export const useTaxasBancarias = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["taxas_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxas_bancarias")
        .select("*")
        .order("banco_id");
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.map(rowToBancoConfig);
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const bancos = (data && data.length > 0) ? data : BANCOS_FALLBACK;

  return {
    bancos,
    loading: isLoading,
    fromSupabase: !!(data && data.length > 0),
    error: error ?? null,
  };
};

export function bancoConfigToRow(banco: BancoConfig, userId?: string) {
  const row: any = {
    banco_id: banco.id,
    nome: banco.nome,
    sigla: banco.sigla,
    cor: banco.cor,
    cor_texto: banco.corTexto,
    max_prazo: banco.maxPrazo,
    min_imovel: banco.minImovel,
    tag: banco.tag,
    mip_anual: banco.mipAnual,
    dfi_anual: banco.dfiAnual,
    ltv_residencial_sac:   banco.maxFinancingPercent.residencial.sac,
    ltv_residencial_price: banco.maxFinancingPercent.residencial.price,
    ltv_comercial_sac:     banco.maxFinancingPercent.comercial.sac,
    ltv_comercial_price:   banco.maxFinancingPercent.comercial.price,
    ltv_rural_sac:         banco.maxFinancingPercent.rural.sac,
    ltv_rural_price:       banco.maxFinancingPercent.rural.price,
    taxa_residencial_sac:   banco.taxas.residencial.sac,
    taxa_residencial_price: banco.taxas.residencial.price,
    taxa_comercial_sac:     banco.taxas.comercial.sac,
    taxa_comercial_price:   banco.taxas.comercial.price,
    taxa_rural_sac:         banco.taxas.rural.sac,
    taxa_rural_price:       banco.taxas.rural.price,
  };

  // Linhas especiais da Caixa
  if (banco.id === "caixa") {
    if (banco.taxasMCMV) {
      row.taxa_mcmv_sac = banco.taxasMCMV.sac;
      row.taxa_mcmv_price = banco.taxasMCMV.price;
    }
    if (banco.ltvMCMV) {
      row.ltv_mcmv_sac = banco.ltvMCMV.sac;
      row.ltv_mcmv_price = banco.ltvMCMV.price;
    }
    if (banco.taxasProCotista) {
      row.taxa_procotista_sac = banco.taxasProCotista.sac;
      row.taxa_procotista_price = banco.taxasProCotista.price;
    }
    if (banco.ltvProCotista) {
      row.ltv_procotista_sac = banco.ltvProCotista.sac;
      row.ltv_procotista_price = banco.ltvProCotista.price;
    }
  }

  if (userId) {
    row.updated_by = userId;
  }

  return row;
}