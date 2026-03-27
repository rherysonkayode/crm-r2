// src/components/FinancingSimulator.tsx
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, RefreshCw, Check, AlertCircle, Users,
  DollarSign, Calendar, ChevronDown, Download, Info,
  TrendingDown, Building2, Trophy, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaxasBancarias, BancoConfig } from "@/hooks/useTaxasBancarias";
import { toast } from "sonner";

type Sistema     = "price" | "sac" | "ambos";
type TipoImovel  = "residencial" | "comercial" | "rural";
type SimuladoPor = "financiamento" | "parcela" | "renda";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const round2 = (v: number) => Math.round(v * 100) / 100;

type Parcela = {
  numero: number; parcelaTotal: number; amortizacao: number;
  juros: number; taxas: number; saldo: number;
};

const idadeMaxPorBanco: Record<string, number> = { santander: 79, padrao: 80.5 };

const calcIdade = (d: string) => {
  if (!d) return 0;
  const hoje = new Date(), nasc = new Date(d);
  if (isNaN(nasc.getTime())) return 0;
  let a = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) a--;
  return a;
};

function seguros(banco: BancoConfig, fin: number, val: number) {
  return round2((fin * banco.mipAnual / 100) / 12 + (val * banco.dfiAnual / 100) / 12);
}

function simParcelas(fin: number, taxa: number, prazo: number, txAdic: number, sis: "price" | "sac") {
  const ps: Parcela[] = [];
  let totalJ = 0;
  if (sis === "price") {
    const base = fin * (taxa * Math.pow(1 + taxa, prazo)) / (Math.pow(1 + taxa, prazo) - 1);
    let saldo = fin;
    for (let i = 1; i <= prazo; i++) {
      const j = saldo * taxa, am = base - j;
      saldo = Math.max(0, saldo - am); totalJ += j;
      ps.push({ numero: i, parcelaTotal: round2(base + txAdic), amortizacao: round2(am), juros: round2(j), taxas: round2(txAdic), saldo: round2(saldo) });
    }
    return { ps, totalJ: round2(totalJ), primeira: round2(base + txAdic), ultima: round2(base + txAdic) };
  } else {
    const am = fin / prazo; let saldo = fin;
    for (let i = 1; i <= prazo; i++) {
      const j = saldo * taxa, tot = am + j + txAdic;
      saldo = Math.max(0, saldo - am); totalJ += j;
      ps.push({ numero: i, parcelaTotal: round2(tot), amortizacao: round2(am), juros: round2(j), taxas: round2(txAdic), saldo: round2(saldo) });
    }
    return { ps, totalJ: round2(totalJ), primeira: round2(ps[0]?.parcelaTotal ?? 0), ultima: round2(ps[ps.length - 1]?.parcelaTotal ?? 0) };
  }
}

// ── Tabela de parcelas ──────────────────────────────────────────────────────
const TabelaParcelas = ({ parcelas, titulo }: { parcelas: Parcela[]; titulo: string }) => {
  const baixar = () => {
    const rows = parcelas.map(p =>
      `<tr><td style="padding:6px 10px;text-align:center">${p.numero}</td><td style="padding:6px 10px;text-align:right">${fmtBRL(p.parcelaTotal)}</td><td style="padding:6px 10px;text-align:right">${fmtBRL(p.amortizacao)}</td><td style="padding:6px 10px;text-align:right">${fmtBRL(p.juros)}</td><td style="padding:6px 10px;text-align:right">${fmtBRL(p.taxas)}</td><td style="padding:6px 10px;text-align:right">${fmtBRL(p.saldo)}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title><style>body{font-family:Arial;padding:32px;}h1{color:#7E22CE;}table{width:100%;border-collapse:collapse;}th{background:#7E22CE;color:#fff;padding:8px;}td{padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;}td:first-child{text-align:center;}</style></head><body><h1>${titulo}</h1><p>${new Date().toLocaleDateString("pt-BR")}</p><table><thead><tr><th>N°</th><th>Parcela</th><th>Amortização</th><th>Juros</th><th>MIP+DFI</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "simulacao.html" });
    a.click(); URL.revokeObjectURL(url);
    toast.success("Tabela baixada!");
  };
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">{titulo} · {parcelas.length} meses</p>
        <Button onClick={baixar} variant="outline" size="sm" className="gap-1 border-purple-200 text-purple-700 text-xs h-7">
          <Download className="w-3 h-3" /> Baixar
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-xs min-w-[480px]">
            <thead className="sticky top-0 bg-[#7E22CE] text-white">
              <tr>{["N°","Parcela","Amortização","Juros","MIP+DFI","Saldo"].map(h => (
                <th key={h} className={`py-2 px-3 font-semibold ${h==="N°"?"text-center":"text-right"}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parcelas.slice(0, 60).map(p => (
                <tr key={p.numero} className={p.numero % 2 === 0 ? "bg-slate-50/50" : ""}>
                  <td className="py-1.5 px-3 text-center text-slate-400">{p.numero}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-purple-700">{fmtBRL(p.parcelaTotal)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-600">{fmtBRL(p.amortizacao)}</td>
                  <td className="py-1.5 px-3 text-right text-red-500">{fmtBRL(p.juros)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">{fmtBRL(p.taxas)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-600">{fmtBRL(p.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parcelas.length > 60 && (
            <p className="text-xs text-center text-slate-400 py-2">+{parcelas.length - 60} parcelas restantes · use "Baixar" para ver todas</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Tipos de simulação ──────────────────────────────────────────────────────
type Sim = {
  bancoId: string; bancoNome: string; cor: string; corTexto: string; sigla: string;
  taxaAnual: number; sistema: "price" | "sac"; primeiraParcela: number; ultimaParcela: number;
  totalJuros: number; totalPago: number; rendaExigida: number; parcelas: Parcela[];
  prazoUsado: number; valorFinanciado: number; tag: number; segurosMensais: number;
  linhaNome?: string; rank: number; economiaSobre?: number;
};
type BancoGrp = {
  bancoId: string; bancoNome: string; cor: string; corTexto: string; sigla: string; sims: Sim[];
};

// ── Card de banco ───────────────────────────────────────────────────────────
const BancoCard = ({ banco, melhorTotal }: { banco: BancoGrp; melhorTotal: number }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: banco.cor, color: banco.corTexto }}>{banco.sigla}</div>
          <p className="text-sm font-semibold text-slate-800">{banco.bancoNome}</p>
        </div>
        <Badge variant="outline" className="text-xs">{banco.sims.length} opção{banco.sims.length > 1 ? "ões" : ""}</Badge>
      </div>
      <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {banco.sims.map(sim => {
          const key      = `${sim.sistema}-${sim.linhaNome || ""}`;
          const isMelhor = sim.rank === 1;
          const economia = sim.totalPago > melhorTotal ? sim.totalPago - melhorTotal : 0;
          return (
            <div key={key}
              className={cn(
                "relative rounded-xl border p-3 sm:p-4 transition-all",
                isMelhor
                  ? "border-[#7E22CE] bg-purple-50/40 ring-2 ring-[#7E22CE] ring-offset-1"
                  : sim.sistema === "sac" ? "border-blue-100" : "border-green-100"
              )}>

              {isMelhor && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#7E22CE] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                  <Trophy className="w-3 h-3" /> Melhor opção
                </div>
              )}
              {sim.rank === 2 && (
                <div className="absolute -top-2.5 right-2 bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  2º lugar
                </div>
              )}
              {sim.rank === 3 && (
                <div className="absolute -top-2.5 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  3º lugar
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mb-3 mt-1">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  sim.sistema === "sac" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                  {sim.sistema.toUpperCase()}
                </span>
                {sim.linhaNome && (
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                    sim.linhaNome === "Pró-Cotista" ? "bg-green-100 text-green-700" :
                    sim.linhaNome === "MCMV" ? "bg-blue-100 text-blue-700" :
                    sim.linhaNome.includes("SBPE") ? "bg-purple-100 text-purple-700" :
                    "bg-slate-100 text-slate-600")}>
                    {sim.linhaNome}
                  </span>
                )}
                <span className="text-[10px] text-slate-500">{sim.taxaAnual.toFixed(2)}% a.a.</span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-500">Valor Financiado</p>
                  <p className="font-bold text-purple-700">{fmtBRL(sim.valorFinanciado)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">{sim.sistema === "price" ? "Parcela Fixa" : "1ª Parcela"}</p>
                  <p className="font-bold text-purple-700">{fmtBRL(sim.primeiraParcela)}</p>
                </div>
                {sim.sistema === "sac" && (
                  <div>
                    <p className="text-[10px] text-slate-500">Última Parcela</p>
                    <p className="font-bold text-green-600">{fmtBRL(sim.ultimaParcela)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-slate-500">Renda Mínima</p>
                  <p className="font-bold text-blue-700">{fmtBRL(sim.rendaExigida)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Total Juros</p>
                  <p className="font-bold text-red-500">{fmtBRL(sim.totalJuros)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-500">Total Pago</p>
                  <p className={cn("font-black text-base", isMelhor ? "text-[#7E22CE]" : "text-slate-700")}>
                    {fmtBRL(sim.totalPago)}
                  </p>
                </div>
              </div>

              {economia > 0 && (
                <div className="mt-2 flex items-center gap-1.5 bg-red-50 rounded-lg px-3 py-1.5 border border-red-100">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-600">
                    <span className="font-bold">{fmtBRL(economia)}</span> a mais que a melhor opção
                  </p>
                </div>
              )}
              {isMelhor && (
                <div className="mt-2 flex items-center gap-1.5 bg-green-50 rounded-lg px-3 py-1.5 border border-green-100">
                  <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <p className="text-[11px] text-green-700 font-semibold">Menor custo total entre todas as opções</p>
                </div>
              )}

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-100">
                  <p className="text-[9px] text-amber-700 font-medium">TAG (vistoria)</p>
                  <p className="text-xs font-bold text-amber-800">{fmtBRL(sim.tag)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                  <p className="text-[9px] text-slate-500 font-medium">MIP+DFI/mês</p>
                  <p className="text-xs font-bold text-slate-700">{fmtBRL(sim.segurosMensais)}</p>
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === key ? null : key)}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium mt-3">
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded === key && "rotate-180")} />
                {expanded === key ? "Ocultar" : "Ver"} tabela de parcelas
              </button>
              <AnimatePresence>
                {expanded === key && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <TabelaParcelas parcelas={sim.parcelas}
                      titulo={`${banco.bancoNome} — ${sim.sistema.toUpperCase()}${sim.linhaNome ? " " + sim.linhaNome : ""}`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Componente principal ────────────────────────────────────────────────────
interface Props { propertyValue?: number; onClose?: () => void; }

export const FinancingSimulator = ({ propertyValue }: Props) => {
  const { bancos, loading } = useTaxasBancarias();

  const [tipoImovel,   setTipoImovel]   = useState<TipoImovel>("residencial");
  const [simuladoPor,  setSimuladoPor]  = useState<SimuladoPor>("financiamento");
  const [sistema,      setSistema]      = useState<Sistema>("ambos");
  const [incluirDesp,  setIncluirDesp]  = useState(false);
  const [dataNasc,     setDataNasc]     = useState("");
  const [bancosAtivos, setBancosAtivos] = useState<string[]>([]);
  const [temFgts,      setTemFgts]      = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ campo: string; mensagem: string }[]>([]);

  useEffect(() => {
    if (bancos.length > 0) {
      setBancosAtivos(prev => {
        if (prev.length === 0) return bancos.map(b => b.id);
        return prev;
      });
    }
  }, [bancos]);

  const initValor = propertyValue ? String(Math.round(propertyValue * 100)) : "";
  const [form, setForm] = useState({
    valorImovel: initValor, entrada: "", prazo: "420",
    taxasMensais: "0", parcelaDesejada: "", rendaMensal: "",
  });

  useEffect(() => {
    if (propertyValue && !form.valorImovel) {
      setForm(f => ({ ...f, valorImovel: String(Math.round(propertyValue * 100)) }));
    }
  }, [propertyValue]);
  const [seg2, setSeg2] = useState({ ativo: false, renda: "", dataNasc: "" });

  const [results,    setResults]    = useState<BancoGrp[]>([]);
  const [financiado, setFinanciado] = useState(0);
  const [entrada,    setEntrada]    = useState(0);
  const [entPct,     setEntPct]     = useState(0);
  const [avisoIdade, setAvisoIdade] = useState("");
  const [msgVazia,   setMsgVazia]   = useState<string | null>(null);
  const [ultimoValor, setUltimoValor] = useState(0);
  const [ultimaRenda, setUltimaRenda] = useState(0);
  const [diagnostico, setDiagnostico] = useState<{
    rendaFaltando: number;
    entradaNecessaria: number;
    entradaAtual: number;
    melhorTaxa: number;
    financiado: number;
    prazo: number;
  } | null>(null);
  const [bancosReprovados, setBancosReprovados] = useState<{
    bancoNome: string;
    motivo: string;
    valorExigido: number;
  }[]>([]);

  // Alertas em tempo real
  const [entradaMinimaInfo, setEntradaMinimaInfo] = useState("");
  const [rendaMinimaInfo,   setRendaMinimaInfo]   = useState("");

  const parseMoney   = (s: string) => parseInt(s.replace(/\D/g, "") || "0") / 100;
  const storeMoney   = (field: string, raw: string) => setForm(f => ({ ...f, [field]: raw.replace(/\D/g, "") }));
  const displayMoney = (cents: string) => {
    const n = parseInt(cents.replace(/\D/g, "") || "0");
    return n ? (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
  };

  const prazoMaxGlobal = () => {
    if (!dataNasc) return 480;
    const nasc = new Date(dataNasc);
    if (isNaN(nasc.getTime())) return 480;
    const meses = (new Date().getFullYear() - nasc.getFullYear()) * 12 + (new Date().getMonth() - nasc.getMonth());
    return 80 * 12 + 6 - meses;
  };

  const rendaTotal = () => {
    let r = parseMoney(form.rendaMensal);
    if (seg2.ativo && seg2.renda) r += parseMoney(seg2.renda);
    return r;
  };

  // Função auxiliar para obter o maior LTV entre bancos ativos
  const getMelhorLTV = () => {
    let melhorLTV = 0;
    for (const banco of bancos) {
      if (!bancosAtivos.includes(banco.id)) continue;
      const ltv = banco.maxFinancingPercent[tipoImovel] as any;
      const ltvSac = typeof ltv["sac"] === "number" ? ltv["sac"] : 80;
      const ltvPrice = typeof ltv["price"] === "number" ? ltv["price"] : 80;
      melhorLTV = Math.max(melhorLTV, ltvSac, ltvPrice);
      if (banco.id === "caixa") {
        if (temFgts && parseMoney(form.valorImovel) <= 500000) melhorLTV = Math.max(melhorLTV, 80);
        if (rendaTotal() <= 12000 && parseMoney(form.valorImovel) <= 500000) melhorLTV = Math.max(melhorLTV, 80);
        melhorLTV = Math.max(melhorLTV, 80);
      }
    }
    return Math.min(melhorLTV, 95);
  };

  // ── Validação de campos obrigatórios ──────────────────────────────────────
  const validarCamposObrigatorios = (): boolean => {
    const novosErrors: { campo: string; mensagem: string }[] = [];
    
    const valor = parseMoney(form.valorImovel);
    if (valor <= 0) {
      novosErrors.push({ campo: "valorImovel", mensagem: "Informe o valor do imóvel" });
    }
    
    const renda = rendaTotal();
    if (renda <= 0) {
      novosErrors.push({ campo: "rendaMensal", mensagem: "Informe a renda mensal bruta (campo obrigatório)" });
    }
    
    if (simuladoPor === "financiamento") {
      const entradaVal = parseMoney(form.entrada);
      if (entradaVal <= 0) {
        novosErrors.push({ campo: "entrada", mensagem: "Informe o valor da entrada (campo obrigatório)" });
      }
    }
    
    if (simuladoPor === "parcela") {
      const parcelaVal = parseMoney(form.parcelaDesejada);
      if (parcelaVal <= 0) {
        novosErrors.push({ campo: "parcelaDesejada", mensagem: "Informe a parcela desejada" });
      }
    }
    
    if (!dataNasc) {
      novosErrors.push({ campo: "dataNascimento", mensagem: "Data de nascimento é obrigatória" });
    } else {
      const idade = calcIdade(dataNasc);
      if (idade < 18) {
        novosErrors.push({ campo: "dataNascimento", mensagem: "Idade mínima para financiamento é 18 anos" });
      }
      if (idade > 80) {
        novosErrors.push({ campo: "dataNascimento", mensagem: "Idade máxima para financiamento é 80 anos" });
      }
    }
    
    setErrors(novosErrors);
    return novosErrors.length === 0;
  };

  // ── Alertas em tempo real ────────────────────────────────────────────────
  useEffect(() => {
    const valor    = parseMoney(form.valorImovel);
    const entVal   = parseMoney(form.entrada);
    const renda    = rendaTotal();
    const prazo    = parseInt(form.prazo) || 420;

    if (valor > 0 && bancosAtivos.length > 0 && bancos.length > 0) {
      const melhorLTV = getMelhorLTV();
      const entradaMinGlobal = valor * (1 - melhorLTV / 100);
      const pctEntMin = ((entradaMinGlobal / valor) * 100).toFixed(0);
      
      let piorLTV = 100;
      for (const banco of bancos) {
        if (!bancosAtivos.includes(banco.id)) continue;
        const ltv = banco.maxFinancingPercent[tipoImovel] as any;
        const ltvSac = typeof ltv["sac"] === "number" ? ltv["sac"] : 80;
        const ltvPrice = typeof ltv["price"] === "number" ? ltv["price"] : 80;
        piorLTV = Math.min(piorLTV, ltvSac, ltvPrice);
      }
      const entradaMaxExigida = valor * (1 - piorLTV / 100);
      
      if (entradaMinGlobal === entradaMaxExigida) {
        setEntradaMinimaInfo(`Entrada mínima: ${fmtBRL(entradaMinGlobal)} (${pctEntMin}% do valor) — varia por banco`);
      } else {
        setEntradaMinimaInfo(`Entrada: ${fmtBRL(entradaMinGlobal)} (${pctEntMin}%) a ${fmtBRL(entradaMaxExigida)} — depende do banco`);
      }

      if (valor > 0 && entVal >= entradaMinGlobal) {
        let melhorTaxaAnual = 99;
        for (const banco of bancos) {
          if (!bancosAtivos.includes(banco.id)) continue;
          const taxaSac = banco.taxas[tipoImovel]?.sac;
          const taxaPrice = banco.taxas[tipoImovel]?.price;
          if (taxaSac && taxaSac < melhorTaxaAnual) melhorTaxaAnual = taxaSac;
          if (taxaPrice && taxaPrice < melhorTaxaAnual) melhorTaxaAnual = taxaPrice;
          if (banco.id === "caixa") {
            if (temFgts && valor <= 500000 && banco.taxasProCotista?.sac) {
              if (banco.taxasProCotista.sac < melhorTaxaAnual) melhorTaxaAnual = banco.taxasProCotista.sac;
            }
            if (rendaTotal() <= 12000 && valor <= 500000 && banco.taxasMCMV?.sac) {
              if (banco.taxasMCMV.sac < melhorTaxaAnual) melhorTaxaAnual = banco.taxasMCMV.sac;
            }
          }
        }
        
        if (melhorTaxaAnual < 99) {
          const taxaM = Math.pow(1 + melhorTaxaAnual / 100, 1 / 12) - 1;
          const fin = Math.max(0, valor - entVal);
          if (fin > 0) {
            const amort = fin / prazo;
            const juros = fin * taxaM;
            const parcEst = amort + juros;
            const rendaMin = parcEst / 0.3;
            const cor = renda > 0 && renda < rendaMin ? "⚠️" : "✓";
            setRendaMinimaInfo(`${cor} Renda mínima estimada: ${fmtBRL(rendaMin)} (com a menor taxa disponível)`);
          } else {
            setRendaMinimaInfo("");
          }
        }
      } else {
        setRendaMinimaInfo("");
      }
    } else {
      setEntradaMinimaInfo("");
      setRendaMinimaInfo("");
    }
  }, [form, tipoImovel, bancosAtivos, bancos, seg2, temFgts, rendaTotal]);

  const toggleBanco = (id: string) =>
    setBancosAtivos(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(b => b !== id) : prev) : [...prev, id]
    );

  // ── Cálculo principal ────────────────────────────────────────────────────
  const calcular = () => {
    // Validação de campos obrigatórios
    if (!validarCamposObrigatorios()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const valor   = parseMoney(form.valorImovel);
    const entVal  = parseMoney(form.entrada);
    const parcDes = parseMoney(form.parcelaDesejada);
    const renda   = rendaTotal();
    const txAdic  = parseMoney(form.taxasMensais);
    const custoDoc = valor * 0.05;
    const pmaxUser = prazoMaxGlobal();
    const prazoSol = parseInt(form.prazo) || 420;
    const idadeP   = calcIdade(dataNasc);
    const idadeSeg = seg2.ativo ? calcIdade(seg2.dataNasc) : 0;
    const idadMin  = seg2.ativo && idadeSeg < idadeP && idadeSeg > 0 ? idadeSeg : idadeP;

    if (valor <= 0) { toast.error("Informe o valor do imóvel"); return; }
    if (renda <= 0) { toast.error("Informe a renda mensal bruta"); return; }
    if (simuladoPor === "parcela" && parcDes <= 0) { toast.error("Informe a parcela desejada"); return; }

    setAvisoIdade(dataNasc && pmaxUser < prazoSol
      ? `Prazo ajustado pela idade do proponente (${idadeP} anos).` : "");

    const allSims: Sim[] = [];
    const bancoMap = new Map<string, BancoGrp>();
    const bancosReprovadosTemp: { bancoNome: string; motivo: string; valorExigido: number }[] = [];

    const processar = (
      banco: BancoConfig,
      sis: "price" | "sac",
      taxaAnual: number,
      pctMax: number,
      prazoEf: number,
      linhaNome?: string
    ) => {
      const taxaM = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
      let finCalc: number, entEf = entVal;

      if (simuladoPor === "financiamento") {
        const financiadoDesejado = valor - entVal;
        const financiadoMaximo   = valor * pctMax / 100;
        finCalc = Math.max(0, Math.min(financiadoDesejado, financiadoMaximo));
        entEf   = valor - Math.min(financiadoDesejado, financiadoMaximo);
        if (incluirDesp) finCalc += custoDoc;
      } else if (simuladoPor === "parcela") {
        const segEst = seguros(banco, valor * 0.8, valor);
        const base   = parcDes - txAdic - segEst;
        if (base <= 0) return;
        finCalc = sis === "price"
          ? base * (Math.pow(1 + taxaM, prazoEf) - 1) / (taxaM * Math.pow(1 + taxaM, prazoEf))
          : base / (1 / prazoEf + taxaM);
        finCalc = Math.min(finCalc, valor); entEf = valor - finCalc;
      } else {
        const segEst = seguros(banco, valor * 0.8, valor);
        const pMax   = renda * 0.3 - txAdic - segEst;
        if (pMax <= 0) return;
        finCalc = sis === "price"
          ? pMax * (Math.pow(1 + taxaM, prazoEf) - 1) / (taxaM * Math.pow(1 + taxaM, prazoEf))
          : pMax / (1 / prazoEf + taxaM);
        finCalc = Math.min(finCalc, valor); entEf = valor - finCalc;
      }

      if (finCalc <= 0) return;
      const entradaMinBanco = valor * (1 - pctMax / 100);
      if (entEf < entradaMinBanco - 1.0) {
        bancosReprovadosTemp.push({
          bancoNome: `${banco.nome}${linhaNome ? ` (${linhaNome})` : ""}`,
          motivo: "entrada",
          valorExigido: entradaMinBanco,
        });
        return;
      }

      const seg  = seguros(banco, finCalc, valor);
      const txTot = txAdic + seg;
      const { ps, totalJ, primeira, ultima } = simParcelas(finCalc, taxaM, prazoEf, txTot, sis);
      const rendaEx = primeira / 0.3;
      if (primeira > renda * 0.3) {
        bancosReprovadosTemp.push({
          bancoNome: `${banco.nome}${linhaNome ? ` (${linhaNome})` : ""}`,
          motivo: "renda",
          valorExigido: rendaEx,
        });
        return;
      }

      const sim: Sim = {
        bancoId: banco.id, bancoNome: banco.nome, cor: banco.cor, corTexto: banco.corTexto,
        sigla: banco.sigla, taxaAnual, sistema: sis, prazoUsado: prazoEf,
        primeiraParcela: primeira, ultimaParcela: ultima, totalJuros: totalJ,
        totalPago: finCalc + totalJ + txTot * prazoEf,
        rendaExigida: rendaEx, parcelas: ps, valorFinanciado: finCalc,
        tag: banco.tag, segurosMensais: seg, linhaNome, rank: 0,
      };

      allSims.push(sim);
      if (!bancoMap.has(banco.id)) {
        bancoMap.set(banco.id, { bancoId: banco.id, bancoNome: banco.nome, cor: banco.cor, corTexto: banco.corTexto, sigla: banco.sigla, sims: [] });
      }
      bancoMap.get(banco.id)!.sims.push(sim);
    };

    for (const banco of bancos) {
      if (!bancosAtivos.includes(banco.id)) continue;
      if (valor < banco.minImovel) {
        bancosReprovadosTemp.push({
          bancoNome: banco.nome,
          motivo: "valor_minimo",
          valorExigido: banco.minImovel,
        });
        continue;
      }
      const idMax    = idadeMaxPorBanco[banco.id] || idadeMaxPorBanco.padrao;
      if (idadMin > idMax) {
        bancosReprovadosTemp.push({
          bancoNome: banco.nome,
          motivo: "idade",
          valorExigido: idMax,
        });
        continue;
      }
      const prazoMaxId = Math.min(idMax * 12 - idadMin * 12, 420);
      const prazoEf    = Math.min(prazoSol, banco.maxPrazo, pmaxUser, prazoMaxId);
      if (prazoEf <= 0) {
        bancosReprovadosTemp.push({
          bancoNome: banco.nome,
          motivo: "prazo",
          valorExigido: prazoSol,
        });
        continue;
      }
      const sisList: Array<"price" | "sac"> = sistema === "ambos" ? ["price", "sac"] : [sistema as "price" | "sac"];

      if (banco.id === "caixa") {
        if (temFgts && valor <= 500000) {
          for (const sis of sisList)
            processar(banco, sis, banco.taxasProCotista?.sac || 8.66, 80, prazoEf, "Pró-Cotista");
        }
        if (rendaTotal() <= 12000 && valor <= 500000) {
          for (const sis of sisList)
            processar(banco, sis, banco.taxasMCMV?.sac || 10.0, 80, prazoEf, "MCMV");
        }
        if (valor <= 2250000) {
          for (const sis of sisList) {
            const ltvSbpe = sis === "sac" ? 80 : 50;
            processar(banco, sis, 10.26, ltvSbpe, prazoEf, "SBPE (Relacionamento)");
            processar(banco, sis, banco.taxas[tipoImovel]?.sac || 11.49, ltvSbpe, prazoEf, "SBPE (Balcão)");
          }
        }
      } else {
        for (const sis of sisList) {
          const taxaAnual = banco.taxas[tipoImovel][sis];
          if (!taxaAnual) continue;
          const ltv    = banco.maxFinancingPercent[tipoImovel] as any;
          const pctMax = typeof ltv[sis] === "number" ? ltv[sis]
                        : typeof ltv["sac"] === "number" ? ltv["sac"]
                        : 80;
          processar(banco, sis, taxaAnual, pctMax, prazoEf);
        }
      }
    }

    // Remover duplicatas dos bancos reprovados
    const bancosReprovadosUnicos = bancosReprovadosTemp.filter((item, index, self) =>
      index === self.findIndex(i => i.bancoNome === item.bancoNome && i.motivo === item.motivo)
    );
    setBancosReprovados(bancosReprovadosUnicos);

    if (allSims.length === 0) {
      const bancosValidos = bancos.filter(b => bancosAtivos.includes(b.id) && valor >= b.minImovel);
      let melhorTaxaAnual = 99;
      bancosValidos.forEach(b => {
        const t = b.taxas[tipoImovel]?.sac || b.taxas[tipoImovel]?.price;
        if (t && t < melhorTaxaAnual) melhorTaxaAnual = t;
        if (b.id === "caixa" && temFgts && valor <= 500000 && b.taxasProCotista?.sac) {
          if (b.taxasProCotista.sac < melhorTaxaAnual) melhorTaxaAnual = b.taxasProCotista.sac;
        }
      });
      if (melhorTaxaAnual === 99) melhorTaxaAnual = 10;

      const taxaM = Math.pow(1 + melhorTaxaAnual / 100, 1 / 12) - 1;
      const finAtual = valor - entVal;
      const amort1 = finAtual / prazoSol;
      const juros1 = finAtual * taxaM;
      const parcela1 = amort1 + juros1;
      const rendaMinNecessaria = parcela1 / 0.3;
      const rendaFaltando = Math.max(0, rendaMinNecessaria - renda);
      const parcelaMax = renda * 0.3;
      const finMax = parcelaMax / (1 / prazoSol + taxaM);
      const entradaNecessaria = Math.max(0, valor - finMax);

      setUltimoValor(valor);
      setUltimaRenda(renda);
      setDiagnostico({
        rendaFaltando,
        entradaNecessaria,
        entradaAtual: entVal,
        melhorTaxa: melhorTaxaAnual,
        financiado: finAtual,
        prazo: prazoSol,
      });
      setMsgVazia("sem_resultados");
      setResults([]);
      return;
    }
    setDiagnostico(null);
    setBancosReprovados([]);

    const sorted = [...allSims].sort((a, b) => a.totalPago - b.totalPago);
    sorted.forEach((s, i) => { s.rank = i + 1; });

    const agrupados = Array.from(bancoMap.values()).map(b => ({
      ...b, sims: b.sims.sort((a, x) => a.totalPago - x.totalPago),
    }));
    agrupados.sort((a, b) => Math.min(...a.sims.map(s => s.rank)) - Math.min(...b.sims.map(s => s.rank)));

    const first = sorted[0];
    setFinanciado(first.valorFinanciado);
    setEntrada(valor - first.valorFinanciado);
    setEntPct(((valor - first.valorFinanciado) / valor) * 100);
    setUltimoValor(valor);
    setUltimaRenda(renda);
    setMsgVazia(null);
    setResults(agrupados);
  };

  const reset = () => {
    setForm({ valorImovel: initValor, entrada: "", prazo: "420", taxasMensais: "0", parcelaDesejada: "", rendaMensal: "" });
    setResults([]); setAvisoIdade(""); setDataNasc(""); setMsgVazia(null); setDiagnostico(null);
    setSeg2({ ativo: false, renda: "", dataNasc: "" });
    setBancosAtivos(bancos.map(b => b.id));
    setErrors([]);
    setBancosReprovados([]);
  };

  const melhorTotal = useMemo(() => {
    let min = Infinity;
    results.forEach(b => b.sims.forEach(s => { if (s.totalPago < min) min = s.totalPago; }));
    return min === Infinity ? 0 : min;
  }, [results]);

  return (
    <div className="space-y-5" style={{ colorScheme: "light" }}>

      {/* ── Seleção de bancos ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm">
          <Building2 className="w-4 h-4 text-purple-600" /> Bancos
        </Label>
        <div className="flex flex-wrap gap-2">
          {bancos.map(banco => (
            <button key={banco.id} onClick={() => toggleBanco(banco.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                bancosAtivos.includes(banco.id)
                  ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]"
                  : "border-slate-200 text-slate-400 hover:border-slate-300 bg-white"
              )}>
              <div className="w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold shrink-0"
                style={{ backgroundColor: banco.cor, color: banco.corTexto }}>{banco.sigla}</div>
              {banco.nome}
              {bancosAtivos.includes(banco.id) && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exibição de erros de campos obrigatórios ───────────────────── */}
      {errors.length > 0 && (
        <Alert className="bg-red-50 border-red-200 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
          <AlertDescription className="text-red-700 text-xs space-y-1">
            {errors.map((err, idx) => (
              <p key={idx}>• {err.mensagem}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Tipo imóvel ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm">Tipo de Imóvel</Label>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(["residencial", "comercial", "rural"] as TipoImovel[]).map(t => (
            <button key={t} onClick={() => { setTipoImovel(t); setResults([]); }}
              className={cn("flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium capitalize transition-all",
                tipoImovel === t ? "bg-white text-[#7E22CE] shadow-sm" : "text-slate-500")}>
              {t === "residencial" ? "Residencial" : t === "comercial" ? "Comercial" : "Rural"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Simular por ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm">Simular por</Label>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-none">
          {[{ v: "financiamento", l: "Valor do Imóvel" }, { v: "parcela", l: "Parcela" }, { v: "renda", l: "Renda" }].map(({ v, l }) => (
            <button key={v} onClick={() => setSimuladoPor(v as SimuladoPor)}
              className={cn("flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all",
                simuladoPor === v ? "bg-white text-[#7E22CE] shadow-sm" : "text-slate-500")}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Sistema ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm">Sistema de Amortização</Label>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(["price", "sac", "ambos"] as Sistema[]).map(s => (
            <button key={s} onClick={() => { setSistema(s); setResults([]); }}
              className={cn("flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all",
                sistema === s ? "bg-white text-[#7E22CE] shadow-sm" : "text-slate-500")}>
              {s === "ambos" ? "Comparar" : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Campos ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Valor do Imóvel *</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.valorImovel)} onChange={e => storeMoney("valorImovel", e.target.value)} />
        </div>

        {simuladoPor === "financiamento" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Valor da Entrada *</Label>
            <Input placeholder="R$ 0,00" value={displayMoney(form.entrada)} onChange={e => storeMoney("entrada", e.target.value)} />
            <p className="text-[10px] text-slate-500">Mínimo 20% (LTV 80%) — varia por banco e modalidade</p>
          </div>
        )}
        {simuladoPor === "parcela" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Parcela Desejada (R$/mês) *</Label>
            <Input placeholder="R$ 0,00" value={displayMoney(form.parcelaDesejada)} onChange={e => storeMoney("parcelaDesejada", e.target.value)} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Renda Mensal Bruta *</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.rendaMensal)} onChange={e => storeMoney("rendaMensal", e.target.value)} />
          <p className="text-[10px] text-slate-500">Parcela ≤ 30% da renda</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Prazo (meses)</Label>
          <Input type="number" min="1" max="420" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
          <p className="text-[10px] text-slate-500">{Math.round(parseInt(form.prazo || "0") / 12)} anos</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Data de Nascimento *</Label>
          <Input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} />
          <p className="text-[10px] text-slate-500">Campo obrigatório · 18 a 80 anos</p>
        </div>
      </div>

      {/* ── Alertas em tempo real ─────────────────────────────────────── */}
      {entradaMinimaInfo && (
        <Alert className="bg-blue-50 border-blue-200 py-2">
          <Info className="h-3.5 w-3.5 text-blue-600" />
          <AlertDescription className="text-blue-700 text-xs">{entradaMinimaInfo}</AlertDescription>
        </Alert>
      )}
      {rendaMinimaInfo && (
        <Alert className={cn("py-2", rendaMinimaInfo.startsWith("⚠️")
          ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200")}>
          <AlertCircle className={cn("h-3.5 w-3.5", rendaMinimaInfo.startsWith("⚠️") ? "text-amber-600" : "text-green-600")} />
          <AlertDescription className={cn("text-xs", rendaMinimaInfo.startsWith("⚠️") ? "text-amber-700" : "text-green-700")}>
            {rendaMinimaInfo}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Segundo proponente ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-sm"><Users className="w-3.5 h-3.5" /> Segundo Proponente</Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
            onClick={() => setSeg2(s => ({ ...s, ativo: !s.ativo }))}>
            {seg2.ativo ? "Remover" : "Adicionar"}
          </Button>
        </div>
        {seg2.ativo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-lg bg-slate-50">
            <div className="space-y-1">
              <Label className="text-xs">Renda mensal</Label>
              <Input placeholder="R$ 0,00" value={displayMoney(seg2.renda)}
                onChange={e => setSeg2(s => ({ ...s, renda: e.target.value.replace(/\D/g, "") }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data de nascimento</Label>
              <Input type="date" value={seg2.dataNasc}
                onChange={e => setSeg2(s => ({ ...s, dataNasc: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* ── FGTS ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm">Possui 3+ anos de FGTS?</Label>
        <div className="flex gap-2">
          {([{ v: true, l: "Sim" }, { v: false, l: "Não" }] as const).map(({ v, l }) => (
            <button key={l} type="button" onClick={() => setTemFgts(v)}
              className={cn("flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                temFgts === v ? "border-purple-600 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500")}>
              {l}
            </button>
          ))}
        </div>
        {temFgts === true && (
          <p className="text-xs text-green-600 font-medium">✓ Habilitará Pró-Cotista da Caixa se imóvel ≤ R$ 500k</p>
        )}
      </div>

{/* ── Despesas ──────────────────────────────────────────────────── */}
<div className="bg-slate-50 rounded-xl p-3 space-y-2">
  <p className="text-sm font-semibold text-slate-700">Despesas (ITBI + Cartório)</p>
  <div className="flex flex-col sm:flex-row gap-2">
    {[true, false].map(val => (
      <button 
        key={String(val)} 
        onClick={() => setIncluirDesp(val)}
        className={cn(
          "flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg border transition-all",
          incluirDesp === val 
            ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" 
            : "border-slate-200 text-slate-500 bg-white"
        )}
      >
        <div className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
          incluirDesp === val ? "border-[#7E22CE]" : "border-slate-300"
        )}>
          {incluirDesp === val && <div className="w-2 h-2 rounded-full bg-[#7E22CE]" />}
        </div>
        <span>{val ? "Incluir no financiamento" : "Pagar separado"}</span>
      </button>
    ))}
  </div>
  {incluirDesp && form.valorImovel && (
    <p className="text-xs text-amber-600">≈ {fmtBRL(parseMoney(form.valorImovel) * 0.05)} embutido</p>
  )}
</div>

      {avisoIdade && (
        <Alert className="bg-amber-50 border-amber-200 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">{avisoIdade}</AlertDescription>
        </Alert>
      )}

      {/* ── Botões ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button onClick={calcular} disabled={loading} className="flex-1 bg-[#7E22CE] hover:bg-purple-700 h-11">
          <Calculator className="w-4 h-4 mr-2" />
          {loading ? "Carregando..." : `Simular ${bancosAtivos.length} banco${bancosAtivos.length !== 1 ? "s" : ""}${sistema === "ambos" ? " × 2 sistemas" : ""}`}
        </Button>
        <Button variant="outline" onClick={reset} className="h-11 w-11 p-0 shrink-0" title="Limpar">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Bancos reprovados (mensagens específicas) ────────────────────── */}
      {bancosReprovados.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <XCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 text-xs space-y-1">
            <p className="font-semibold">Alguns bancos não aprovaram sua simulação:</p>
            {bancosReprovados.map((b, idx) => (
              <p key={idx} className="ml-2">
                • <strong>{b.bancoNome}</strong>: {b.motivo === "entrada" && `entrada mínima exigida ${fmtBRL(b.valorExigido)}`}
                {b.motivo === "renda" && `renda mínima exigida ${fmtBRL(b.valorExigido)}`}
                {b.motivo === "valor_minimo" && `valor mínimo do imóvel ${fmtBRL(b.valorExigido)}`}
                {b.motivo === "idade" && `idade máxima permitida ${Math.floor(b.valorExigido)} anos`}
                {b.motivo === "prazo" && `prazo máximo de ${Math.floor(b.valorExigido / 12)} anos`}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Resultados ────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Valor Financiado",     val: fmtBRL(financiado), cls: "bg-slate-50 border-slate-200 text-slate-800" },
              { label: "ITBI + Cartório (est.)", val: fmtBRL(parseMoney(form.valorImovel) * 0.05), cls: "bg-amber-50 border-amber-100 text-amber-800" },
              { label: `Entrada (${entPct.toFixed(1)}%)`, val: fmtBRL(entrada), cls: "bg-blue-50 border-blue-100 text-blue-800" },
            ].map(({ label, val, cls }) => (
              <div key={label} className={`rounded-xl border p-3 ${cls}`}>
                <p className="text-[10px] opacity-60">{label}</p>
                <p className="font-bold text-sm">{val}</p>
              </div>
            ))}
          </div>

          {temFgts === true && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs font-bold text-green-800">FGTS disponível — 3 formas de uso</p>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-green-700">
                <span>📥 Entrada</span>
                <span>📉 Amortização</span>
                <span>🔄 Parcelas</span>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            {results.reduce((a, b) => a + b.sims.length, 0)} simulações · ordenadas do menor ao maior custo total
          </p>

          <div className="space-y-4">
            {results.map(b => <BancoCard key={b.bancoId} banco={b} melhorTotal={melhorTotal} />)}
          </div>
        </motion.div>
      )}

      {msgVazia === "sem_resultados" && diagnostico && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">Renda insuficiente para este financiamento</p>
              <p className="text-xs text-red-600 mt-0.5">
                Com a menor taxa disponível ({diagnostico.melhorTaxa.toFixed(2)}% a.a.), sua renda atual não cobre 30% da parcela.
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Como resolver — escolha uma opção:</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs font-bold text-slate-700">Aumentar a renda</p>
              <p className="text-xs text-slate-500">Adicione um segundo proponente com pelo menos:</p>
              <p className="text-lg font-black text-purple-700">{fmtBRL(diagnostico.rendaFaltando)}</p>
              <p className="text-[10px] text-slate-400">de renda complementar para atingir o mínimo exigido</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-700">Aumentar a entrada</p>
              <p className="text-xs text-slate-500">Com sua renda, a entrada mínima necessária é:</p>
              <p className="text-lg font-black text-blue-700">{fmtBRL(diagnostico.entradaNecessaria)}</p>
              <p className="text-[10px] text-slate-400">
                +{fmtBRL(diagnostico.entradaNecessaria - diagnostico.entradaAtual)} a mais · reduz o financiado para {fmtBRL(ultimoValor - diagnostico.entradaNecessaria)}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs font-bold text-slate-700">Buscar imóvel menor</p>
              <p className="text-xs text-slate-500">Com sua renda atual, o valor máximo financiável é:</p>
              <p className="text-lg font-black text-green-700">
                {fmtBRL(Math.max(0, (ultimaRenda * 0.3) / (1 / diagnostico.prazo + Math.pow(1 + diagnostico.melhorTaxa / 100, 1/12) - 1)))}
              </p>
              <p className="text-[10px] text-slate-400">valor máximo de financiamento · imóvel até ~{fmtBRL(Math.max(0, (ultimaRenda * 0.3) / (1 / diagnostico.prazo + Math.pow(1 + diagnostico.melhorTaxa / 100, 1/12) - 1)) / 0.7)}</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Cálculos baseados na menor taxa disponível ({diagnostico.melhorTaxa.toFixed(2)}% a.a.) · Sistema SAC
          </p>
        </motion.div>
      )}
    </div>
  );
};