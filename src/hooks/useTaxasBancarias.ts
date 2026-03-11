import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RegraDetalhada {
  tipoImovelId: number;          // 0=residencial padrão, 1=comercial, 2=rural, 3=residencial especial
  valorMinimoImovel: number;
  valorMinimoFinanciamento: number;
  prazoMinimo: number;
  prazoMaximo: number;
  ltvMaximo: number;              // percentual máximo de financiamento (ex: 80)
  maxDespesasPercent: number;     // percentual máximo do valor do imóvel que pode ser financiado como despesas
  minDespesasPercent?: number;    // percentual mínimo de despesas obrigatório à vista
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
  mipAnual: number;   // agora em percentual anual (ex: 0.8 = 0,8% a.a.)
  dfiAnual: number;   // percentual anual (ex: 0.3 = 0,3% a.a.)
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
  // NOVAS PROPRIEDADES
  regrasDetalhadas?: RegraDetalhada[];
  estadosNaoAtendidos?: string[];
  ordemSimulacao?: number;
  selecionada?: boolean;
  desabilitada?: boolean;
}

// Mapeamento dos tipos de imóvel para IDs (usado nas regras detalhadas)
export const tipoParaId: Record<string, number> = {
  residencial: 0,
  comercial: 1,
  rural: 2,
};

// Fallback enriquecido com base no JSON e ajustes de MIP/DFI/LTV
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
    mipAnual: 0.8,      // 0,8% a.a.
    dfiAnual: 0.3,      // 0,3% a.a.
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
    regrasDetalhadas: [
      {
        tipoImovelId: 0,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 0.01,
        prazoMinimo: 121,
        prazoMaximo: 420,
        ltvMaximo: 80,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 3,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 0.01,
        prazoMinimo: 121,
        prazoMaximo: 420,
        ltvMaximo: 80,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 1,
        valorMinimoImovel: 100000,
        valorMinimoFinanciamento: 0.01,
        prazoMinimo: 121,
        prazoMaximo: 240,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 2,
        valorMinimoImovel: 1072000,
        valorMinimoFinanciamento: 750000,
        prazoMinimo: 121,
        prazoMaximo: 240,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
    ],
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
    mipAnual: 0.8,
    dfiAnual: 0.3,
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
        minDespesasPercent: 2,   // 2% obrigatório à vista
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
  {
    id: "santander",
    nome: "Santander",
    sigla: "SAN",
    cor: "#CC3333",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 100000,
    tag: 1950,
    mipAnual: 0.8,
    dfiAnual: 0.3,
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
  {
    id: "inter",
    nome: "Banco Inter",
    sigla: "INT",
    cor: "#FF7A00",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 200000,
    tag: 5000,
    mipAnual: 0.8,
    dfiAnual: 0.3,
    maxFinancingPercent: {
      residencial: { sac: 75, price: 75 },   // corrigido para 75%
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
  {
    id: "caixa",
    nome: "Caixa Economica",
    sigla: "CEF",
    cor: "#0A4B8C",
    corTexto: "#FFFFFF",
    maxPrazo: 420,
    minImovel: 80000,
    tag: 1200,
    mipAnual: 0.8,
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
    ordemSimulacao: 5,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
    // Regras detalhadas baseadas no JSON? Não há, então usaremos valores padrão
    // Mas podemos inferir do maxFinancingPercent e minImovel
    regrasDetalhadas: [
      {
        tipoImovelId: 0,
        valorMinimoImovel: 80000,
        valorMinimoFinanciamento: 0,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 80, // para SAC; price será tratado separadamente pelo maxFinancingPercent
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 1,
        valorMinimoImovel: 80000,
        valorMinimoFinanciamento: 0,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 2,
        valorMinimoImovel: 80000,
        valorMinimoFinanciamento: 0,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
    ],
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
    mipAnual: 0.8,
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
    ordemSimulacao: 6,
    selecionada: true,
    desabilitada: false,
    estadosNaoAtendidos: [],
    regrasDetalhadas: [
      {
        tipoImovelId: 0,
        valorMinimoImovel: 80000,
        valorMinimoFinanciamento: 0,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 70,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 1,
        valorMinimoImovel: 80000,
        valorMinimoFinanciamento: 0,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 60,
        maxDespesasPercent: 5,
      },
      {
        tipoImovelId: 2,
        valorMinimoImovel: 80000,
        valorMinimoFinanciamento: 0,
        prazoMinimo: 12,
        prazoMaximo: 420,
        ltvMaximo: 60,
        maxDespesasPercent: 5,
      },
    ],
  },
];

// Função rowToBancoConfig adaptada para incluir novas propriedades
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
    // Se houver colunas para as novas propriedades no Supabase, preencha aqui
    regrasDetalhadas: row.regras_detalhadas ? JSON.parse(row.regras_detalhadas) : undefined,
    estadosNaoAtendidos: row.estados_nao_atendidos ? row.estados_nao_atendidos.split(',') : undefined,
    ordemSimulacao: row.ordem_simulacao,
    selecionada: row.selecionada,
    desabilitada: row.desabilitada,
  };
}

// HOOK PRINCIPAL
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

// HELPER: converte BancoConfig de volta para row (para salvar no Supabase)
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
    ...(userId ? { updated_by: userId } : {}),
  };
}