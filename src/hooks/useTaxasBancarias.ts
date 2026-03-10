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
    // LTV diferenciado por sistema de amortizacao SAC vs PRICE
    // Ex: Caixa SBPE SAC=80%, PRICE=50% | demais bancos SAC=PRICE=80%
    residencial: { sac: number; price: number };
    comercial: { sac: number; price: number };
    rural: { sac: number; price: number };
  };
  taxas: {
    residencial: { price: number; sac: number };
    comercial: { price: number; sac: number };
    rural: { price: number; sac: number };
  };
}

// ─── REGRAS SFH / MCMV / FGTS (2026) ──────────────────────────────────────────
// SFH 2026:
//   Teto imovel: R$ 2.250.000 (acima = SFI, sem FGTS)
//   Juros max: 12% a.a. + TR (acima = opera no SFI)
//   FGTS: entrada | amortizacao/quitacao a cada 2 anos | ate 80% parcelas por 12 meses
//
// FGTS — elegibilidade do comprador:
//   Min 3 anos FGTS acumulado (consecutivos ou nao, mesma ou diferentes empresas)
//   Sem outro financiamento ativo no SFH em qualquer estado
//   Sem imovel residencial na mesma cidade/regiao metropolitana de moradia ou trabalho
//   TODOS os bancos aceitam FGTS — e lei federal, nao beneficio comercial
//
// MCMV 2026 — 4 faixas (exclusivo Caixa):
//   Faixa 1: renda ate R$ 2.850 | teto R$ 255-270k | subsidio ate R$ 55k
//   Faixa 2: renda ate R$ 4.700 | teto R$ 255-270k | subsidio ate R$ 35k
//   Faixa 3: renda ate R$ 8.600 | teto R$ 350k     | juros reduzidos
//   Faixa 4: renda ate R$12.000 | teto R$ 500k     | sem subsidio, juros ~10.47%
//
// Novo vs Usado no SBPE: NAO altera taxa de juros
//   O que altera a taxa e o SEGMENTO DE RELACIONAMENTO com o banco
// ───────────────────────────────────────────────────────────────────────────────

export const useTaxasBancarias = () => {
  // Taxas: balcao (sem relacionamento) como padrao conservador — mar/2026
  // Fontes: simuladores oficiais + pesquisa publica dos bancos

  const bancos: BancoConfig[] = [
    {
      id: "caixa",
      nome: "Caixa Economica",
      sigla: "CEF",
      cor: "#0A4B8C",
      corTexto: "#FFFFFF",
      maxPrazo: 420,
      minImovel: 80000,
      tag: 1200.00,       // estimativa (varia por regiao)
      mipAnual: 0.037,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // SBPE: SAC = 80% | PRICE = 50% (flexibilizacoes recentes ate 70% em alguns perfis)
        residencial: { sac: 80, price: 50 },
        comercial:   { sac: 70, price: 50 },
        rural:       { sac: 70, price: 50 },
      },
      taxas: {
        // Balcao: 11.19-11.49% a.a.+TR | Com relacionamento: a partir de 10.26%
        // Pro-Cotista FGTS: 8.00-9.01% | MCMV Faixa4 (renda ate R$12k): ~10.47%
        residencial: { price: 11.49, sac: 11.49 },
        comercial:   { price: 12.00, sac: 12.00 },
        rural:       { price: 11.50, sac: 11.50 },
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
      tag: 1500.00,       // a confirmar
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // LTV conservador 70% (pode exigir ate 50% entrada em alguns perfis)
        residencial: { sac: 70, price: 70 },
        comercial:   { sac: 60, price: 60 },
        rural:       { sac: 60, price: 60 },
      },
      taxas: {
        // Balcao: 12.00% a.a.+TR | Pro-Cotista FGTS: a partir de 9.00%
        // BB cobra tarifa de administracao mensal adicional
        residencial: { price: 12.00, sac: 12.00 },
        comercial:   { price: 12.50, sac: 12.50 },
        rural:       { price: 12.00, sac: 12.00 },
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
      tag: 850.00,        // avaliacao do imovel — site Itau (fev/2026)
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // ate 80% residencial (82% com cartorio em casos especificos — padrao: 80%)
        // comercial: prazo limitado a 240 meses na logica do Calculators.tsx
        residencial: { sac: 80, price: 80 },
        comercial:   { sac: 70, price: 70 },
        rural:       { sac: 70, price: 70 },
      },
      taxas: {
        // Balcao (sem relacionamento): 12.19% a.a.+TR
        // Com relacionamento (Varejo/Uniclass/Personnalite): a partir de 11.60%
        // Poupanca: a partir de 8.32% a.a.+rendimento poupanca
        residencial: { price: 12.19, sac: 12.19 },
        comercial:   { price: 12.50, sac: 12.50 },
        rural:       { price: 12.20, sac: 12.20 },
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
      tag: 1950.00,       // fonte: CrediMorar
      mipAnual: 0.036,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // residencial: 80% | comercial: 70% em ate 30 anos (prazo limitado no Calculators)
        // Permite incorporar ITBI + despesas cartorias ao financiamento
        residencial: { sac: 80, price: 80 },
        comercial:   { sac: 70, price: 70 },
        rural:       { sac: 70, price: 60 },
      },
      taxas: {
        // Balcao (sem relacionamento): 13.19% a.a.+TR
        // Com relacionamento (VanGogh/Select): 11.69-11.79% a.a.+TR
        residencial: { price: 13.19, sac: 13.19 },
        comercial:   { price: 13.50, sac: 13.50 },
        rural:       { price: 13.20, sac: 13.20 },
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
      tag: 2114.03,       // fonte: CrediMorar + site Bradesco
      mipAnual: 0.037,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // ate 80% residencial
        // Nota: PRICE limita comprometimento de renda a 15% (SAC: ate 30%)
        residencial: { sac: 80, price: 80 },
        comercial:   { sac: 60, price: 60 },
        rural:       { sac: 60, price: 60 },
      },
      taxas: {
        // Balcao (sem relacionamento): 12.79% a.a.+TR
        // Com relacionamento (Exclusive/Prime): a partir de 11.99%
        // Poupanca: a partir de 5.83% a.a.+rendimento poupanca
        residencial: { price: 12.79, sac: 12.79 },
        comercial:   { price: 13.50, sac: 13.50 },
        rural:       { price: 13.00, sac: 13.00 },
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
      tag: 5000.00,       // fonte: CrediMorar
      mipAnual: 0.038,
      dfiAnual: 0.00825,
      maxFinancingPercent: {
        // ate 80% residencial
        residencial: { sac: 80, price: 80 },
        comercial:   { sac: 70, price: 60 },
        rural:       { sac: 70, price: 60 },
      },
      taxas: {
        // ATENCAO: Inter usa taxa+IPCA (pos-fixado), NAO +TR como os demais
        // IPCA residencial: 8.20-9.50% a.a.+IPCA | CET: 10.63% | CESH: 3.46%
        // Linha TR alternativa: ~13.76% a.a.+TR
        // Parcela pode oscilar mensalmente conforme IPCA
        residencial: { price: 8.20, sac: 8.20 },
        comercial:   { price: 13.76, sac: 13.76 },
        rural:       { price: 13.00, sac: 13.00 },
      },
    },
  ];

  return { bancos, loading: false };
};