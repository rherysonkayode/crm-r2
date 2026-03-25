// src/components/FinancingSimulator.tsx

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, TrendingUp, RefreshCw, Check,
  AlertCircle, Users, DollarSign, Calendar,
  ChevronDown, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaxasBancarias, BancoConfig } from "@/hooks/useTaxasBancarias";
import { toast } from "sonner";

type Sistema    = "price" | "sac" | "ambos";
type TipoImovel = "residencial" | "comercial" | "rural";
type SimuladoPor = "financiamento" | "parcela" | "renda";

const fmtBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

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

function simParcelas(fin: number, taxa: number, prazo: number, taxas: number, sis: "price" | "sac") {
  const ps: Parcela[] = [];
  let totalJ = 0;
  if (sis === "price") {
    const base = fin * (taxa * Math.pow(1 + taxa, prazo)) / (Math.pow(1 + taxa, prazo) - 1);
    let saldo = fin;
    for (let i = 1; i <= prazo; i++) {
      const j = saldo * taxa, am = base - j;
      saldo = Math.max(0, saldo - am); totalJ += j;
      ps.push({ numero: i, parcelaTotal: round2(base + taxas), amortizacao: round2(am), juros: round2(j), taxas: round2(taxas), saldo: round2(saldo) });
    }
    return { ps, totalJ: round2(totalJ), primeira: round2(base + taxas), ultima: round2(base + taxas) };
  } else {
    const am = fin / prazo; let saldo = fin;
    for (let i = 1; i <= prazo; i++) {
      const j = saldo * taxa, tot = am + j + taxas;
      saldo = Math.max(0, saldo - am); totalJ += j;
      ps.push({ numero: i, parcelaTotal: round2(tot), amortizacao: round2(am), juros: round2(j), taxas: round2(taxas), saldo: round2(saldo) });
    }
    return { ps, totalJ: round2(totalJ), primeira: round2(ps[0]?.parcelaTotal ?? 0), ultima: round2(ps[ps.length - 1]?.parcelaTotal ?? 0) };
  }
}

// ── Tabela de parcelas ──────────────────────────────────────────────────────
const TabelaParcelas = ({ parcelas, titulo }: { parcelas: Parcela[]; titulo: string }) => {
  const baixar = () => {
    const rows = parcelas.map(p =>
      `<tr><td>${p.numero}</td><td>${fmtBRL(p.parcelaTotal)}</td><td>${fmtBRL(p.amortizacao)}</td><td>${fmtBRL(p.juros)}</td><td>${fmtBRL(p.taxas)}</td><td>${fmtBRL(p.saldo)}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title><style>body{font-family:Arial;padding:32px;}h1{color:#7E22CE;}table{width:100%;border-collapse:collapse;}th{background:#7E22CE;color:#fff;padding:8px;}td{padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;}td:first-child{text-align:center;}</style></head><body><h1>${titulo}</h1><p>Gerado em ${new Date().toLocaleDateString("pt-BR")}</p><table><thead><tr><th>N°</th><th>Parcela</th><th>Amortização</th><th>Juros</th><th>MIP+DFI</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `simulacao.html` });
    a.click(); URL.revokeObjectURL(url);
    toast.success("Tabela baixada!");
  };
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{titulo} · {parcelas.length} meses</p>
        <Button onClick={baixar} variant="outline" size="sm" className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 text-xs">
          <Download className="w-3 h-3" /> Baixar
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-xs min-w-[480px]">
            <thead className="sticky top-0 bg-[#7E22CE] text-white">
              <tr>
                {["N°", "Parcela", "Amortização", "Juros", "MIP+DFI", "Saldo"].map(h => (
                  <th key={h} className={`py-2 px-3 font-semibold ${h === "N°" ? "text-center" : "text-right"}`}>{h}</th>
                ))}
              </tr>
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
            <p className="text-xs text-center text-slate-400 py-2">+ {parcelas.length - 60} parcelas · use "Baixar" para ver todas</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Card de resultado por banco ─────────────────────────────────────────────
type Sim = {
  bancoId: string; bancoNome: string; cor: string; corTexto: string; sigla: string;
  taxaAnual: number; sistema: "price" | "sac"; primeiraParcela: number; ultimaParcela: number;
  totalJuros: number; totalPago: number; rendaExigida: number; parcelas: Parcela[];
  prazoUsado: number; valorFinanciado: number; tag: number; segurosMensais: number; linhaNome?: string;
};
type BancoGrp = { bancoId: string; bancoNome: string; cor: string; corTexto: string; sigla: string; sims: Sim[] };

const BancoCard = ({ banco, melhorId }: { banco: BancoGrp; melhorId: string | null }) => {
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
        <Badge variant="outline" className="text-xs">{banco.sims.length} opção(ões)</Badge>
      </div>
      <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {banco.sims.map(sim => {
          const key = `${sim.sistema}-${sim.linhaNome || ""}`;
          const melhor = melhorId === `${sim.bancoId}-${sim.sistema}-${sim.linhaNome || ""}`;
          return (
            <div key={key}
              className={cn("relative rounded-lg border p-3 sm:p-4 transition-all",
                sim.sistema === "sac" ? "border-blue-200" : "border-green-200",
                melhor && "ring-2 ring-[#7E22CE] ring-offset-2")}>
              {melhor && <Badge className="absolute -top-2 -right-2 bg-[#7E22CE] text-white text-[10px]">Melhor opção</Badge>}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  sim.sistema === "sac" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                  {sim.sistema.toUpperCase()}
                </span>
                {sim.linhaNome && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{sim.linhaNome}</span>}
                <span className="text-[10px] text-slate-500">{sim.taxaAnual.toFixed(2)}% a.a.</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-500">Valor Financiado</p>
                  <p className="font-bold text-purple-700 text-sm">{fmtBRL(sim.valorFinanciado)}</p>
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
                  <p className="font-bold text-base text-[#7E22CE]">{fmtBRL(sim.totalPago)}</p>
                </div>
              </div>
              <button
                onClick={() => setExpanded(expanded === key ? null : key)}
                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium mt-3">
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded === key && "rotate-180")} />
                {expanded === key ? "Ocultar" : "Ver"} tabela de parcelas
              </button>
              <AnimatePresence>
                {expanded === key && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <TabelaParcelas parcelas={sim.parcelas} titulo={`${banco.bancoNome} — ${sim.sistema.toUpperCase()} ${sim.linhaNome || ""}`} />
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

  const [tipoImovel,    setTipoImovel]    = useState<TipoImovel>("residencial");
  const [simuladoPor,   setSimuladoPor]   = useState<SimuladoPor>("financiamento");
  const [sistema,       setSistema]       = useState<Sistema>("ambos");
  const [incluirDesp,   setIncluirDesp]   = useState(false);
  const [dataNasc,      setDataNasc]      = useState("");
  const [bancosAtivos,  setBancosAtivos]  = useState<string[]>(bancos.map(b => b.id));
  const [temFgts,       setTemFgts]       = useState<boolean | null>(null);

  // Valores em centavos (string) para inputs monetários
  const initValor = propertyValue ? String(Math.round(propertyValue * 100)) : "";
  const [form, setForm] = useState({
    valorImovel:     initValor,
    entrada:         "",
    prazo:           "420",
    taxasMensais:    "0",
    parcelaDesejada: "",
    rendaMensal:     "",
  });

  const [seg2, setSeg2] = useState({ ativo: false, renda: "", dataNasc: "" });
  const [results,     setResults]     = useState<BancoGrp[]>([]);
  const [financiado,  setFinanciado]  = useState(0);
  const [entrada,     setEntrada]     = useState(0);
  const [entPct,      setEntPct]      = useState(0);
  const [avisoIdade,  setAvisoIdade]  = useState("");
  const [msgVazia,    setMsgVazia]    = useState<string | null>(null);

  // Helpers de moeda — armazena em centavos, exibe formatado
  const parseMoney  = (s: string) => (parseInt(s.replace(/\D/g, "") || "0") / 100);
  const storeMoney  = (field: string, raw: string) =>
    setForm(f => ({ ...f, [field]: raw.replace(/\D/g, "") }));
  const displayMoney = (cents: string) => {
    const n = parseInt(cents.replace(/\D/g, "") || "0");
    if (!n) return "";
    return (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  const calcular = () => {
    const valor    = parseMoney(form.valorImovel);
    const entVal   = parseMoney(form.entrada);
    const parcDes  = parseMoney(form.parcelaDesejada);
    const renda    = rendaTotal();
    const txAdic   = parseMoney(form.taxasMensais);
    const custoDoc = valor * 0.05;
    const pmaxUser = prazoMaxGlobal();
    const prazoSol = parseInt(form.prazo) || 420;
    const idadeP   = calcIdade(dataNasc);
    const idadeSeg = seg2.ativo ? calcIdade(seg2.dataNasc) : 0;
    const idadMin  = seg2.ativo && idadeSeg < idadeP ? idadeSeg : idadeP;

    if (valor <= 0)  { toast.error("Informe o valor do imóvel"); return; }
    if (renda <= 0)  { toast.error("Informe a renda mensal bruta"); return; }
    if (simuladoPor === "parcela" && parcDes <= 0) { toast.error("Informe a parcela desejada"); return; }

    setAvisoIdade(dataNasc && pmaxUser < prazoSol
      ? `Prazo ajustado pela idade do proponente (${idadeP} anos).` : "");

    const bancoMap = new Map<string, BancoGrp>();
    let algum = false;

    for (const banco of bancos) {
      if (!bancosAtivos.includes(banco.id)) continue;
      if (valor < banco.minImovel) continue;
      const idMax = idadeMaxPorBanco[banco.id] || idadeMaxPorBanco.padrao;
      if (idadMin > idMax) continue;

      const idMaxMeses = idMax * 12;
      const prazoMaxId = Math.min(idMaxMeses - idadMin * 12, 420);
      const prazoEf    = Math.min(prazoSol, banco.maxPrazo, pmaxUser, prazoMaxId);
      if (prazoEf <= 0) continue;

      const sisList: Array<"price" | "sac"> = sistema === "ambos" ? ["price", "sac"] : [sistema as "price" | "sac"];

      for (const sis of sisList) {
        const taxaAnual = banco.taxas[tipoImovel][sis];
        if (!taxaAnual) continue;
        const taxaM = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;

        const ltv = banco.maxFinancingPercent[tipoImovel] as any;
        const pctMax: number = typeof ltv[sis] === "number" ? ltv[sis] : 80;

        let finCalc: number, entEf = entVal;

        if (simuladoPor === "financiamento") {
          finCalc = Math.min(valor - entVal, valor * pctMax / 100);
          entEf   = valor - finCalc;
          if (incluirDesp) finCalc += custoDoc;
        } else if (simuladoPor === "parcela") {
          const segEst = seguros(banco, valor * 0.8, valor);
          const base   = parcDes - txAdic - segEst;
          if (base <= 0) continue;
          finCalc = sis === "price"
            ? base * (Math.pow(1 + taxaM, prazoEf) - 1) / (taxaM * Math.pow(1 + taxaM, prazoEf))
            : base / (1 / prazoEf + taxaM);
          finCalc = Math.min(finCalc, valor);
          entEf   = valor - finCalc;
        } else {
          const segEst = seguros(banco, valor * 0.8, valor);
          const pMax   = renda * 0.3 - txAdic - segEst;
          finCalc = sis === "price"
            ? pMax * (Math.pow(1 + taxaM, prazoEf) - 1) / (taxaM * Math.pow(1 + taxaM, prazoEf))
            : pMax / (1 / prazoEf + taxaM);
          finCalc = Math.min(finCalc, valor);
          entEf   = valor - finCalc;
        }

        if (finCalc <= 0) continue;
        if (entEf < valor * (1 - pctMax / 100) - 0.01) continue;

        const seg  = seguros(banco, finCalc, valor);
        const txTot = txAdic + seg;
        const { ps, totalJ, primeira, ultima } = simParcelas(finCalc, taxaM, prazoEf, txTot, sis);
        const rendaEx = primeira / 0.3;
        if (primeira > renda * 0.3) continue;

        const sim: Sim = {
          bancoId: banco.id, bancoNome: banco.nome, cor: banco.cor, corTexto: banco.corTexto,
          sigla: banco.sigla, taxaAnual, sistema: sis, prazoUsado: prazoEf,
          primeiraParcela: primeira, ultimaParcela: ultima, totalJuros: totalJ,
          totalPago: finCalc + totalJ + txTot * prazoEf,
          rendaExigida: rendaEx, parcelas: ps, valorFinanciado: finCalc,
          tag: banco.tag, segurosMensais: seg,
        };

        if (!bancoMap.has(banco.id)) {
          bancoMap.set(banco.id, { bancoId: banco.id, bancoNome: banco.nome, cor: banco.cor, corTexto: banco.corTexto, sigla: banco.sigla, sims: [] });
        }
        bancoMap.get(banco.id)!.sims.push(sim);
        algum = true;
      }
    }

    if (!algum) {
      setMsgVazia("Nenhuma simulação encontrada. Tente aumentar a entrada ou a renda.");
      setResults([]); return;
    }

    const agrupados = Array.from(bancoMap.values()).map(b => ({
      ...b, sims: b.sims.sort((a, x) => a.totalPago - x.totalPago),
    }));
    const first = agrupados[0].sims[0];
    setFinanciado(first.valorFinanciado);
    setEntrada(valor - first.valorFinanciado);
    setEntPct(((valor - first.valorFinanciado) / valor) * 100);
    setMsgVazia(null);
    setResults(agrupados);
  };

  const reset = () => {
    setForm({ valorImovel: initValor, entrada: "", prazo: "420", taxasMensais: "0", parcelaDesejada: "", rendaMensal: "" });
    setResults([]); setAvisoIdade(""); setDataNasc(""); setMsgVazia(null);
    setSeg2({ ativo: false, renda: "", dataNasc: "" });
  };

  const melhorId = useMemo(() => {
    let m: { id: string; tot: number } | null = null;
    results.forEach(b => b.sims.forEach(s => {
      if (!m || s.totalPago < m.tot) m = { id: `${s.bancoId}-${s.sistema}-${s.linhaNome || ""}`, tot: s.totalPago };
    }));
    return m?.id || null;
  }, [results]);

  return (
    <div className="space-y-5" style={{ colorScheme: "light" }}>

      {/* Tipo de imóvel */}
      <div className="space-y-2">
        <Label>Tipo de Imóvel</Label>
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

      {/* Simular por */}
      <div className="space-y-2">
        <Label>Simular por</Label>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-none">
          {[
            { v: "financiamento", l: "Valor do Imóvel" },
            { v: "parcela",       l: "Parcela Desejada" },
            { v: "renda",         l: "Renda Mensal" },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setSimuladoPor(v as SimuladoPor)}
              className={cn("flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all",
                simuladoPor === v ? "bg-white text-[#7E22CE] shadow-sm" : "text-slate-500")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Sistema */}
      <div className="space-y-2">
        <Label>Sistema de Amortização</Label>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(["price", "sac", "ambos"] as Sistema[]).map(s => (
            <button key={s} onClick={() => { setSistema(s); setResults([]); }}
              className={cn("flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all",
                sistema === s ? "bg-white text-[#7E22CE] shadow-sm" : "text-slate-500")}>
              {s === "ambos" ? "Comparar" : s.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400">
          {sistema === "price" ? "Parcelas fixas, juros maiores no início"
           : sistema === "sac"  ? "Amortização fixa, parcelas decrescentes"
           : "Compara PRICE e SAC lado a lado"}
        </p>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Valor do Imóvel *</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.valorImovel)} onChange={e => storeMoney("valorImovel", e.target.value)} />
        </div>

        {simuladoPor === "financiamento" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Valor da Entrada</Label>
            <Input placeholder="R$ 0,00" value={displayMoney(form.entrada)} onChange={e => storeMoney("entrada", e.target.value)} />
            <p className="text-[10px] text-slate-500">Mínimo 20% do valor do imóvel</p>
          </div>
        )}

        {simuladoPor === "parcela" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Parcela Desejada (R$/mês)</Label>
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
          <p className="text-[10px] text-slate-500">{Math.round(parseInt(form.prazo || "0") / 12)} anos · máx 420 meses</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Data de Nascimento</Label>
          <Input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} />
          <p className="text-[10px] text-slate-500">18 a 80 anos</p>
        </div>
      </div>

      {/* Segundo proponente */}
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

      {/* FGTS */}
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
      </div>

      {/* Despesas */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-700">Despesas</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <p className="text-sm text-slate-600">Incluir ITBI + Cartório no financiamento?</p>
          <div className="flex gap-2">
            {[true, false].map(val => (
              <button key={String(val)} onClick={() => setIncluirDesp(val)}
                className={cn("flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-lg border transition-all",
                  incluirDesp === val ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-200 text-slate-500")}>
                <div className={cn("w-3 h-3 rounded-full border-2 flex items-center justify-center",
                  incluirDesp === val ? "border-[#7E22CE]" : "border-slate-300")}>
                  {incluirDesp === val && <div className="w-1.5 h-1.5 rounded-full bg-[#7E22CE]" />}
                </div>
                {val ? "Sim" : "Não"}
              </button>
            ))}
          </div>
        </div>
        {incluirDesp && form.valorImovel && (
          <p className="text-xs text-amber-600">≈ {fmtBRL(parseMoney(form.valorImovel) * 0.05)} embutido no financiamento</p>
        )}
      </div>

      {avisoIdade && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">{avisoIdade}</AlertDescription>
        </Alert>
      )}

      {/* Botões */}
      <div className="flex gap-3">
        <Button onClick={calcular} disabled={loading} className="flex-1 bg-[#7E22CE] hover:bg-purple-700 h-11">
          <Calculator className="w-4 h-4 mr-2" />
          {loading ? "Carregando..." : `Simular ${bancosAtivos.length} banco(s)`}
        </Button>
        <Button variant="outline" onClick={reset} className="h-11 w-11 p-0 shrink-0">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Valor Financiado", val: fmtBRL(financiado), cls: "bg-slate-50 border-slate-200 text-slate-800" },
              { label: "ITBI + Cartório (est.)", val: fmtBRL(parseMoney(form.valorImovel) * 0.05), cls: "bg-amber-50 border-amber-100 text-amber-800" },
              { label: `Entrada (${entPct.toFixed(1)}%)`, val: fmtBRL(entrada), cls: "bg-blue-50 border-blue-100 text-blue-800" },
            ].map(({ label, val, cls }) => (
              <div key={label} className={`rounded-xl border p-3 ${cls}`}>
                <p className="text-[10px] text-current opacity-60">{label}</p>
                <p className="font-bold text-base">{val}</p>
              </div>
            ))}
          </div>

          {temFgts === true && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs font-bold text-green-800">FGTS disponível</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-green-700">
                <div>📥 Entrada</div>
                <div>📉 Amortização do saldo</div>
                <div>🔄 Pagamento de parcelas</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {results.map(b => <BancoCard key={b.bancoId} banco={b} melhorId={melhorId} />)}
          </div>
        </motion.div>
      )}

      {msgVazia && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">{msgVazia}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};