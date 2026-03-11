import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TIPOS
// ============================================================================

// Regra detalhada para cada tipo de imóvel (baseado no JSON da CrediMorar)
export interface RegraDetalhada {
  tipoImovelId: number;          // 0 = residencial, 1 = comercial, 2 = rural (e eventualmente 3)
  valorMinimoImovel: number;
  valorMinimoFinanciamento: number;
  prazoMinimo: number;
  prazoMaximo: number;
  ltvMaximo: number;              // % máximo de financiamento sobre o valor do imóvel
  maxDespesasPercent: number;     // % máximo de despesas que podem ser financiadas
  minDespesasPercent?: number;    // % mínimo de despesas obrigatórias à vista (se houver)
}

// Configuração completa de um banco (mantendo tudo que já existia + novas propriedades)
export interface BancoConfig {
  // Existente
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

  // NOVAS propriedades (opcionais)
  regrasDetalhadas?: RegraDetalhada[];
  estadosNaoAtendidos?: string[];        // UFs onde o banco não atua
  ordemSimulacao?: number;                // ordem de exibição
  selecionada?: boolean;                  // se deve vir marcado por padrão
  desabilitada?: boolean;                 // se o banco está desabilitado (não aparece)
}

// ============================================================================
// FALLBACK HARDCODED (mar/2026) – enriquecido com base no JSON da CrediMorar
// ============================================================================

const BANCOS_FALLBACK: BancoConfig[] = [
  // --------------------------------------------------------------------------
  // Bradesco
  // --------------------------------------------------------------------------
  {
    id: "bradesco",
    nome: "Bradesco",
    sigla: "BRA",
    cor: "#660099",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 100000,
    tag: 2114.03,
    mipAnual: 0.037,
    dfiAnual: 0.00825,
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
    // Novas informações
    ordemSimulacao: 1,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
    regrasDetalhadas: [
      {
        tipoImovelId: 0, // residencial padrão
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 0.01,
        prazoMinimo: 121,
        prazoMaximo: 420,
        ltvMaximo: 80,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 3, // residencial especial (ex: MCMV)
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 0.01,
        prazoMinimo: 121,
        prazoMaximo: 420,
        ltvMaximo: 80,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 1, // comercial
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 0.01,
        prazoMinimo: 121,
        prazoMaximo: 240,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 2, // rural
        valorMinimoImovel: 1072000,
        valorMinimoFinanciamento: 750000,
        prazoMinimo: 121,
        prazoMaximo: 240,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Itaú
  // --------------------------------------------------------------------------
  {
    id: "itau",
    nome: "Itaú",
    sigla: "ITA",
    cor: "#EC7000",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 97561,
    tag: 850,
    mipAnual: 0.038,
    dfiAnual: 0.00825,
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
    regrasDetalhadas: [
      {
        tipoImovelId: 0,
        valorMinimoImovel: 97561,
        valorMinimoFinanciamento: 30000,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 90,
        maxDespesasPercent: 5,
        minDespesasPercent: 2,
      },
      {
        tipoImovelId: 3,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 30000,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 90,
        maxDespesasPercent: 5,
        minDespesasPercent: 2,
      },
      {
        tipoImovelId: 1,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 30000,
        prazoMinimo: 12,
        prazoMaximo: 240,
        ltvMaximo: 90,
        maxDespesasPercent: 5,
        minDespesasPercent: 2,
      },
      // Rural (tipo 2) não tem regras definidas no JSON, então omitimos
    ],
  },

  // --------------------------------------------------------------------------
  // Santander
  // --------------------------------------------------------------------------
  {
    id: "santander",
    nome: "Santander",
    sigla: "SAN",
    cor: "#CC3333",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 100000,
    tag: 1950,
    mipAnual: 0.036,
    dfiAnual: 0.00825,
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
    regrasDetalhadas: [
      {
        tipoImovelId: 0,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 60000,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 80,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 3,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 60000,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 80,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 1,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 60000,
        prazoMinimo: 12,
        prazoMaximo: 360,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Inter
  // --------------------------------------------------------------------------
  {
    id: "inter",
    nome: "Banco Inter",
    sigla: "INT",
    cor: "#FF7A00",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 200000,
    tag: 5000,
    mipAnual: 0.038,
    dfiAnual: 0.00825,
    maxFinancingPercent: {
      residencial: { sac: 80, price: 80 },
      comercial:   { sac: 70, price: 60 },
      rural:       { sac: 70, price: 60 },
    },
    taxas: {
      residencial: { sac: 8.20, price: 8.20 },
      comercial:   { sac: 13.76, price: 13.76 },
      rural:       { sac: 13.00, price: 13.00 },
    },
    ordemSimulacao: 4,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: ["AC", "AM", "AP", "RO", "RR"],
    regrasDetalhadas: [
      {
        tipoImovelId: 0,
        valorMinimoImovel: 200000,
        valorMinimoFinanciamento: 100000,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 75,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 3,
        valorMinimoImovel: 200000,
        valorMinimoFinanciamento: 100000,
        prazoMinimo: 12,
        prazoMaximo: 360,
        ltvMaximo: 75,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 1,
        valorMinimoImovel: 200000,
        valorMinimoFinanciamento: 100000,
        prazoMinimo: 12,
        prazoMaximo: 240,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Caixa (mantido, mas sem regrasDetalhadas por enquanto)
  // --------------------------------------------------------------------------
  {
    id: "caixa",
    nome: "Caixa Economica",
    sigla: "CEF",
    cor: "#0A4B8C",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 80000,
    tag: 1200,
    mipAnual: 0.037,
    dfiAnual: 0.00825,
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
    ordemSimulacao: 5,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
  },

  // --------------------------------------------------------------------------
  // Banco do Brasil (mantido, sem regrasDetalhadas)
  // --------------------------------------------------------------------------
  {
    id: "bb",
    nome: "Banco do Brasil",
    sigla: "BB",
    cor: "#003D7C",
    corTexto: "#FFCC00",
    maxPrazo: 420,
    minImovel: 80000,
    tag: 1500,
    mipAnual: 0.038,
    dfiAnual: 0.00825,
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
    ordemSimulacao: 6,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
  },
];

// ============================================================================
// MAPPER: row do Supabase → BancoConfig (adaptado para incluir novas colunas)
// ============================================================================
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
    // Novas propriedades (se existirem no banco)
    regrasDetalhadas: row.regras_detalhadas ? JSON.parse(row.regras_detalhadas) : undefined,
    estadosNaoAtendidos: row.estados_nao_atendidos ? row.estados_nao_atendidos.split(',') : undefined,
    ordemSimulacao: row.ordem_simulacao,
    selecionada: row.selecionada,
    desabilitada: row.desabilitada,
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================
export const useTaxasBancarias = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["taxas_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxas_bancarias")
        .select("*")
        .order("ordem_simulacao", { ascending: true }); // já ordena pela nova coluna
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.map(rowToBancoConfig);
    },
    staleTime: 1000 * 60 * 10, // revalida a cada 10 minutos
    retry: 1,
  });

  // Se Supabase retornou dados válidos, usa; senão fallback hardcoded
  const bancos = (data && data.length > 0) ? data : BANCOS_FALLBACK;

  return {
    bancos,
    loading: isLoading,
    fromSupabase: !!(data && data.length > 0),
    error: error ?? null,
  };
};

// ============================================================================
// HELPER: converte BancoConfig de volta para row (para salvar no Supabase)
// ============================================================================
export function bancoConfigToRow(banco: BancoConfig, userId?: string) {
  return {
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
    // Novas colunas (opcionais)
    regras_detalhadas: banco.regrasDetalhadas ? JSON.stringify(banco.regrasDetalhadas) : null,
    estados_nao_atendidos: banco.estadosNaoAtendidos ? banco.estadosNaoAtendidos.join(',') : null,
    ordem_simulacao: banco.ordemSimulacao,
    selecionada: banco.selecionada,
    desabilitada: banco.desabilitada,
    ...(userId ? { updated_by: userId } : {}),
  };
}