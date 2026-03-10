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
  // Taxas atualizadas com base em CrediMorar + simuladores oficiais (mar/2026)
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
      tag: 1200.00,      // estimativa CEF (varia por regiao - confirmar)
      mipAnual: 0.037,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // SBPE: 80% SAC / 70% PRICE | MCMV Classe Media: 80% novo / 60% usado
        // fonte: simulador oficial Caixa (mar/2026)
        residencial: { novo: 80, usado: 80 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        // SBPE: 11.49% a.a. | MCMV Classe Media: 10.47% a.a.
        // usando SBPE como padrao (linha mais comum); MCMV tratado como modalidade separada futuramente
        // fonte: simulador oficial Caixa (mar/2026)
        residencial: { price: 11.49, sac: 11.49 },
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
      tag: 1500.00,      // a confirmar - BB cobra tarifa de administracao mensal tb
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // BB: entrada minima historicamente maior (ate 50% em alguns casos)
        // usando 70% como conservador ate confirmar
        // fonte: informacoes publicas BB (jan/fev 2026)
        residencial: { novo: 70, usado: 70 },
        comercial: { novo: 60, usado: 60 },
        rural: { novo: 60, usado: 60 },
      },
      taxas: {
        // taxa base: 12.00% a.a. + TR | Procotista: a partir de 9.00% a.a.
        // usando taxa base balcao como padrao
        // fonte: informacoes publicas BB (jan/fev 2026)
        residencial: { price: 12.00, sac: 12.00 },
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
      minImovel: 97561,
      // TAG corrigida: R$850 (avaliacao do imovel) - fonte: site oficial Itau (fev/2026)
      // anterior era R$1950 (incorreto - era valor de outro banco)
      tag: 850.00,
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // Itau financia ate 90% residencial - fonte: site oficial + CrediMorar
        residencial: { novo: 90, usado: 90 },
        // comercial: ate 20 anos (240 meses) - fonte: site oficial Itau
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        // taxa minima: 11.60% a.a. + TR (clientes Private/Personnalite)
        // taxa Uniclass/Agencia: 12.05% a 13.45% a.a. + TR
        // usando minima como referencia (fev/2026)
        // fonte: site oficial Itau (fev/2026)
        residencial: { price: 11.99, sac: 11.60 },
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
      minImovel: 100000,
      tag: 1950.00,      // fonte: CrediMorar response
      mipAnual: 0.036,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // residencial: ate 80% em 35 anos | comercial: ate 70% em 30 anos
        // fonte: site oficial Santander
        residencial: { novo: 80, usado: 80 },
        comercial: { novo: 70, usado: 70 },
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
      minImovel: 100000,
      tag: 2114.03,      // fonte: CrediMorar response + site Bradesco
      mipAnual: 0.037,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        residencial: { novo: 80, usado: 80 },
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
      minImovel: 200000,
      tag: 5000.00,      // fonte: CrediMorar response
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        residencial: { novo: 75, usado: 75 },
        comercial: { novo: 70, usado: 60 },
        rural: { novo: 70, usado: 60 },
      },
      taxas: {
        // ATENCAO: Inter usa taxa + IPCA (pos-fixado), nao + TR como os demais
        // Taxa: 9.50% a.a. + IPCA | CET: 10.63% a.a. | CESH: 3.46%
        // fonte: simulador oficial Inter (mar/2026)
        // A parcela pode oscilar conforme IPCA mensal
        residencial: { price: 9.50, sac: 9.50 },
        comercial: { price: 12.0, sac: 12.0 },
        rural: { price: 11.8, sac: 11.8 },
      },
    },
  ];

  return { bancos, loading: false };
};