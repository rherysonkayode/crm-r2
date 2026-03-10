import { useState, useRef, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, Percent, Home, TrendingUp, RefreshCw, Download,
  ChevronUp, Building2, User, ChevronDown, Check, Settings,
  AlertCircle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaxasBancarias, BancoConfig } from "@/hooks/useTaxasBancarias";
import { ModalTaxasBancarias } from "@/components/ModalTaxasBancarias";
import { toast } from "sonner";

type Tab = "financiamento" | "comissao" | "rentabilidade";
type Sistema = "price" | "sac" | "ambos";
type TipoImovel = "residencial" | "comercial" | "rural";
type TipoUso = "novo" | "usado";
type SimuladoPor = "financiamento" | "parcela" | "renda";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const roundMoney = (val: number) => Math.round(val * 100) / 100;

type Parcela = { numero: number; parcelaTotal: number; amortizacao: number; juros: number; taxas: number; saldo: number; };

// ─── HELPER: MIP + DFI mensais por banco ─────────────────────────────────────
// MIP: % ao ano sobre saldo devedor (usamos valor inicial como base, igual simuladores)
// DFI: % ao ano sobre valor do imovel (fixo)
function calcularSegurosMensais(banco: BancoConfig, valorFinanciado: number, valorImovel: number): number {
  const mipMensal = (valorFinanciado * (banco.mipAnual / 100)) / 12;
  const dfiMensal = (valorImovel * (banco.dfiAnual / 100)) / 12;
  return roundMoney(mipMensal + dfiMensal);
}

// ─── CALCULO DE PARCELAS ──────────────────────────────────────────────────────
// Logica identica ao original — taxasMensais agora recebe MIP+DFI real calculado externamente
function calcularParcelas(
  financiado: number,
  taxaMensal: number,
  prazo: number,
  taxasMensais: number,
  sistema: "price" | "sac"
) {
  const parcelas: Parcela[] = [];
  let totalJuros = 0;
  if (sistema === "price") {
    const parcelaBase = financiado * (taxaMensal * Math.pow(1 + taxaMensal, prazo)) / (Math.pow(1 + taxaMensal, prazo) - 1);
    let saldo = financiado;
    for (let i = 1; i <= prazo; i++) {
      const juros = saldo * taxaMensal;
      const amortizacao = parcelaBase - juros;
      saldo = Math.max(0, saldo - amortizacao);
      totalJuros += juros;
      parcelas.push({
        numero: i,
        parcelaTotal: roundMoney(parcelaBase + taxasMensais),
        amortizacao: roundMoney(amortizacao),
        juros: roundMoney(juros),
        taxas: roundMoney(taxasMensais),
        saldo: roundMoney(saldo),
      });
    }
    return {
      parcelas,
      totalJuros: roundMoney(totalJuros),
      primeiraParcela: roundMoney(parcelaBase + taxasMensais),
      ultimaParcela: roundMoney(parcelaBase + taxasMensais),
    };
  } else {
    const amortizacao = financiado / prazo;
    let saldo = financiado;
    for (let i = 1; i <= prazo; i++) {
      const juros = saldo * taxaMensal;
      const parcelaTotal = amortizacao + juros + taxasMensais;
      saldo = Math.max(0, saldo - amortizacao);
      totalJuros += juros;
      parcelas.push({
        numero: i,
        parcelaTotal: roundMoney(parcelaTotal),
        amortizacao: roundMoney(amortizacao),
        juros: roundMoney(juros),
        taxas: roundMoney(taxasMensais),
        saldo: roundMoney(saldo),
      });
    }
    return {
      parcelas,
      totalJuros: roundMoney(totalJuros),
      primeiraParcela: roundMoney(parcelas[0]?.parcelaTotal ?? 0),
      ultimaParcela: roundMoney(parcelas[parcelas.length - 1]?.parcelaTotal ?? 0),
    };
  }
}

const TabelaParcelas = ({ parcelas, titulo }: { parcelas: Parcela[]; titulo: string }) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const handleDownloadPDF = () => {
    const rows = parcelas.map(p =>
      `<tr><td style="padding:6px 10px;text-align:center">${p.numero}</td><td style="padding:6px 10px;text-align:right">${formatCurrency(p.parcelaTotal)}</td><td style="padding:6px 10px;text-align:right">${formatCurrency(p.amortizacao)}</td><td style="padding:6px 10px;text-align:right">${formatCurrency(p.juros)}</td><td style="padding:6px 10px;text-align:right">${formatCurrency(p.taxas)}</td><td style="padding:6px 10px;text-align:right">${formatCurrency(p.saldo)}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>${titulo}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{font-size:20px;margin-bottom:4px}p{color:#64748b;font-size:13px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:13px}thead{background:#7E22CE;color:white}th{padding:8px 10px;text-align:right}th:first-child{text-align:center}tr:nth-child(even){background:#f8fafc}</style></head><body><h1>${titulo}</h1><p>Gerado pelo CRM R2 Tech · ${new Date().toLocaleDateString("pt-BR")}</p><table><thead><tr><th style="text-align:center">N°</th><th>Parcela Total</th><th>Amortizacao</th><th>Juros</th><th>MIP+DFI</th><th>Saldo Devedor</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) { win.onload = () => { win.print(); URL.revokeObjectURL(url); }; }
  };
  return (
    <div ref={tableRef} className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{titulo} · {parcelas.length} meses</p>
        <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[360px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#7E22CE] text-white z-10">
              <tr>
                <th className="py-2.5 px-3 text-center font-semibold">N°</th>
                <th className="py-2.5 px-3 text-right font-semibold">Parcela</th>
                <th className="py-2.5 px-3 text-right font-semibold">Amortizacao</th>
                <th className="py-2.5 px-3 text-right font-semibold">Juros</th>
                <th className="py-2.5 px-3 text-right font-semibold">MIP+DFI</th>
                <th className="py-2.5 px-3 text-right font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parcelas.map((p) => (
                <tr key={p.numero} className={cn("hover:bg-purple-50/40", p.numero % 2 === 0 && "bg-slate-50/50")}>
                  <td className="py-1.5 px-3 text-center text-slate-400">{p.numero}</td>
                  <td className="py-1.5 px-3 text-right font-bold text-purple-700">{formatCurrency(p.parcelaTotal)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-600">{formatCurrency(p.amortizacao)}</td>
                  <td className="py-1.5 px-3 text-right text-red-500">{formatCurrency(p.juros)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">{formatCurrency(p.taxas)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-600">{formatCurrency(p.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button onClick={() => tableRef.current?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700">
        <ChevronUp className="w-3.5 h-3.5" /> Voltar ao topo
      </button>
    </div>
  );
};

type Simulacao = {
  bancoId: string;
  bancoNome: string;
  cor: string;
  corTexto: string;
  sigla: string;
  taxaAnual: number;
  sistema: "price" | "sac";
  primeiraParcela: number;
  ultimaParcela: number;
  totalJuros: number;
  totalPago: number;
  rendaExigida: number;
  parcelas: Parcela[];
  prazoUsado: number;
  valorFinanciado: number;
  rendaSuficiente: boolean;
  tag: number;           // novo: tarifa de avaliacao do bem
  segurosMensais: number; // novo: MIP + DFI mensais calculados
};

type BancoAgrupado = {
  bancoId: string;
  bancoNome: string;
  cor: string;
  corTexto: string;
  sigla: string;
  simulacoes: Simulacao[];
};

const BancoResultCard = ({ banco, melhorSimulacaoId }: { banco: BancoAgrupado; melhorSimulacaoId: string | null }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: banco.cor, color: banco.corTexto }}>
            {banco.sigla}
          </div>
          <p className="text-sm font-semibold text-card-foreground">{banco.bancoNome}</p>
        </div>
        <Badge variant="outline">{banco.simulacoes.length} opcao(oes)</Badge>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {banco.simulacoes.map((sim) => {
          const isMelhor = melhorSimulacaoId === `${sim.bancoId}-${sim.sistema}`;
          return (
            <div
              key={sim.sistema}
              className={cn(
                "relative rounded-lg border p-4 transition-all hover:shadow-md",
                sim.sistema === "sac" ? "border-blue-200" : "border-green-200",
                isMelhor && "ring-2 ring-[#7E22CE] ring-offset-2"
              )}
            >
              {isMelhor && (
                <Badge className="absolute -top-2 -right-2 bg-[#7E22CE] text-white">
                  Melhor opcao
                </Badge>
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", sim.sistema === "sac" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                  {sim.sistema.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">{sim.taxaAnual.toFixed(2)}% a.a.</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Valor Financiado</p>
                  <p className="font-bold text-purple-700">{formatCurrency(sim.valorFinanciado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{sim.sistema === "price" ? "Parcela Fixa" : "1a Parcela"}</p>
                  <p className="font-bold text-purple-700">{formatCurrency(sim.primeiraParcela)}</p>
                </div>
                {sim.sistema === "sac" && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ultima Parcela</p>
                    <p className="font-bold text-green-600">{formatCurrency(sim.ultimaParcela)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Renda Min.</p>
                  <p className="font-bold text-blue-700">{formatCurrency(sim.rendaExigida)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Juros</p>
                  <p className="font-bold text-red-500">{formatCurrency(sim.totalJuros)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Total Pago</p>
                  <p className="font-bold text-lg text-[#7E22CE]">{formatCurrency(sim.totalPago)}</p>
                </div>

                {/* TAG — pago na contratacao, fora das parcelas */}
                <div className="col-span-2 flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 mt-1">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">TAG (vistoria do imovel)</p>
                    <p className="text-xs text-amber-600">Cobrado na contratacao, fora das parcelas</p>
                  </div>
                  <p className="font-bold text-amber-800">{formatCurrency(sim.tag)}</p>
                </div>

                {/* MIP+DFI mensal */}
                <div className="col-span-2 flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">MIP + DFI (seguros)</p>
                    <p className="text-xs text-slate-400">Embutidos em cada parcela</p>
                  </div>
                  <p className="font-semibold text-slate-700">{formatCurrency(sim.segurosMensais)}/mes</p>
                </div>
              </div>

              {/* Aviso Inter: taxa pos-fixada pelo IPCA */}
              {banco.bancoId === "inter" && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 p-2 rounded-lg">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span><strong>Taxa pos-fixada:</strong> Inter cobra 9,5% a.a. + <strong>IPCA</strong>. A parcela pode variar mensalmente conforme a inflacao. Os demais bancos usam TR.</span>
                </div>
              )}

              {/* Aviso Caixa: SBPE vs MCMV */}
              {banco.bancoId === "caixa" && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 p-2 rounded-lg">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span><strong>Simulacao SBPE (11,49% a.a.).</strong> MCMV Classe Media: 10,47% a.a. para imovel novo (LTV 80%) ou 60% para usado. Confirme a modalidade na agencia.</span>
                </div>
              )}

              {/* Aviso BB: tarifa mensal + Procotista */}
              {banco.bancoId === "bb" && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-lg">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span><strong>BB cobra tarifa de administracao mensal</strong> alem das parcelas. Pró-Cotista FGTS: taxas a partir de 9% a.a. Taxa base exibida: 12% a.a. + TR.</span>
                </div>
              )}

              {!sim.rendaSuficiente && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 p-1 rounded">
                  <AlertCircle className="w-3 h-3" />
                  <span>Renda insuficiente (parcela excede 30%)</span>
                </div>
              )}

              <button
                onClick={() => setExpanded(expanded === sim.sistema ? null : sim.sistema)}
                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium mt-3"
              >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded === sim.sistema && "rotate-180")} />
                {expanded === sim.sistema ? "Ocultar" : "Ver"} tabela de parcelas
              </button>
              <AnimatePresence>
                {expanded === sim.sistema && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <TabelaParcelas parcelas={sim.parcelas} titulo={`${banco.bancoNome} — ${sim.sistema.toUpperCase()}`} />
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

const FinanciamentoCalc = () => {
  const { bancos, loading } = useTaxasBancarias();
  const [modalTaxasAberto, setModalTaxasAberto] = useState(false);

  const [tipoImovel, setTipoImovel] = useState<TipoImovel>("residencial");
  const [tipoUso, setTipoUso] = useState<TipoUso>("usado");
  const [simuladoPor, setSimuladoPor] = useState<SimuladoPor>("financiamento");
  const [sistema, setSistema] = useState<Sistema>("ambos");
  const [incluirDespesas, setIncluirDespesas] = useState(false);
  const [dataNascimento, setDataNascimento] = useState("");
  const [bancosAtivos, setBancosAtivos] = useState<string[]>(bancos.map(b => b.id));
  const [form, setForm] = useState({
    valorImovel: "",
    entrada: "",
    prazo: "420",
    taxasMensais: "0",
    parcelaDesejada: "",
    rendaMensal: "",
  });
  const [results, setResults] = useState<BancoAgrupado[]>([]);
  const [erroEntrada, setErroEntrada] = useState<string | null>(null);
  const [custoDocumentacao, setCustoDocumentacao] = useState(0);
  const [financiado, setFinanciado] = useState(0);
  const [entrada, setEntrada] = useState(0);
  const [entradaPercent, setEntradaPercent] = useState(0);
  const [prazoMaximoAviso, setPrazoMaximoAviso] = useState("");
  const [entradaMinimaInfo, setEntradaMinimaInfo] = useState<string>("");
  const [rendaMinimaInfo, setRendaMinimaInfo] = useState<string>("");
  const [nenhumaSimulacaoMsg, setNenhumaSimulacaoMsg] = useState<string | null>(null);

  const toggleBanco = (id: string) => setBancosAtivos((prev) =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter((b) => b !== id) : prev) : [...prev, id]);

  const handleMoney = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val.replace(/\D/g, "") }));
  const displayMoney = (val: string) => !val ? "" : (parseInt(val) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const calcularPrazoMaximoGlobal = () => {
    if (!dataNascimento) return 480;
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    if (isNaN(nasc.getTime())) return 480;
    const idadeMeses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
    return 80 * 12 + 6 - idadeMeses;
  };

  useEffect(() => {
    const valor = parseFloat(form.valorImovel.replace(/\D/g, "")) / 100 || 0;
    const entradaVal = parseFloat(form.entrada.replace(/\D/g, "")) / 100 || 0;
    if (valor > 0 && bancosAtivos.length > 0) {
      let entradaMin = 0;
      bancos.filter(b => bancosAtivos.includes(b.id)).forEach(banco => {
        const percentMax = banco.maxFinancingPercent[tipoImovel][tipoUso];
        const min = valor * (1 - percentMax / 100);
        if (min > entradaMin) entradaMin = min;
      });
      setEntradaMinimaInfo(`Entrada minima necessaria: ${formatCurrency(entradaMin)} (${((entradaMin/valor)*100).toFixed(1)}%)`);

      const menoresTaxas = bancos
        .filter(b => bancosAtivos.includes(b.id))
        .map(b => b.taxas[tipoImovel].sac || b.taxas[tipoImovel].price)
        .filter(t => t);
      if (menoresTaxas.length > 0) {
        const taxaMedia = Math.min(...menoresTaxas);
        const taxaMensal = Math.pow(1 + taxaMedia / 100, 1 / 12) - 1;
        const prazo = parseInt(form.prazo) || 420;
        const financiadoSim = Math.max(0, valor - entradaVal);
        if (financiadoSim > 0) {
          const parcelaExemplo = financiadoSim * (taxaMensal * Math.pow(1 + taxaMensal, prazo)) / (Math.pow(1 + taxaMensal, prazo) - 1);
          const rendaMin = parcelaExemplo / 0.3;
          setRendaMinimaInfo(`Renda minima aproximada: ${formatCurrency(rendaMin)} (30% da parcela)`);
        } else {
          setRendaMinimaInfo("");
        }
      } else {
        setRendaMinimaInfo("");
      }
    } else {
      setEntradaMinimaInfo("");
      setRendaMinimaInfo("");
    }
  }, [form, tipoImovel, tipoUso, bancosAtivos, bancos]);

  const calcular = () => {
    const valor = parseFloat(form.valorImovel.replace(/\D/g, "")) / 100 || 0;
    const entradaVal = parseFloat(form.entrada.replace(/\D/g, "")) / 100 || 0;
    const parcelaDesejada = parseFloat(form.parcelaDesejada.replace(/\D/g, "")) / 100 || 0;
    const rendaMensal = parseFloat(form.rendaMensal.replace(/\D/g, "")) / 100 || 0;
    // taxasMensais do form agora e adicional ao MIP+DFI automatico por banco
    const taxasAdicionais = parseFloat(form.taxasMensais.replace(/\D/g, "")) / 100 || 0;
    const custoDoc = valor * 0.05;
    const prazoMaxUser = calcularPrazoMaximoGlobal();
    const prazoSolicitado = parseInt(form.prazo) || 420;

    if (valor <= 0) {
      toast.error("Informe o valor do imovel");
      return;
    }
    if (simuladoPor === "parcela" && parcelaDesejada <= 0) {
      toast.error("Informe a parcela desejada");
      return;
    }
    if (simuladoPor === "renda" && rendaMensal <= 0) {
      toast.error("Informe a renda mensal");
      return;
    }

    let entradaMinimaNecessaria = 0;
    for (const banco of bancos.filter(b => bancosAtivos.includes(b.id))) {
      const percentMax = banco.maxFinancingPercent[tipoImovel][tipoUso];
      const entradaMin = valor * (1 - percentMax / 100);
      if (entradaMin > entradaMinimaNecessaria) entradaMinimaNecessaria = entradaMin;
    }

    if (simuladoPor === "financiamento") {
      if (entradaVal < entradaMinimaNecessaria - 0.01) {
        setErroEntrada(`Entrada insuficiente. Para os bancos selecionados, a entrada minima necessaria e ${formatCurrency(entradaMinimaNecessaria)} (${((entradaMinimaNecessaria/valor)*100).toFixed(1)}%).`);
        setResults([]);
        return;
      } else {
        setErroEntrada(null);
      }
    } else {
      setErroEntrada(null);
    }

    if (dataNascimento && prazoMaxUser < prazoSolicitado) {
      const nasc = new Date(dataNascimento);
      const idade = new Date().getFullYear() - nasc.getFullYear();
      setPrazoMaximoAviso(`O prazo foi ajustado individualmente em alguns bancos devido a idade do proponente (${idade} anos).`);
    } else {
      setPrazoMaximoAviso("");
    }

    const bancoMap = new Map<string, BancoAgrupado>();
    let algumaSimulacaoGerada = false;

    for (const banco of bancos) {
      if (!bancosAtivos.includes(banco.id)) continue;
      // Validacao: valor minimo do imovel aceito por este banco
      if (valor < banco.minImovel) continue;

      // Prazo maximo por banco/tipo: Itau comercial = 240m | Santander comercial = 360m
      const maxPrazoBancoTipo =
        banco.id === "itau" && tipoImovel === "comercial" ? 240 :
        banco.id === "santander" && tipoImovel === "comercial" ? 360 :
        banco.maxPrazo;
      const prazoEfetivo = Math.min(prazoSolicitado, maxPrazoBancoTipo, prazoMaxUser);
      if (prazoEfetivo <= 0) continue;

      const sistemas: Array<"price" | "sac"> = sistema === "ambos" ? ["price", "sac"] : [sistema as "price" | "sac"];

      for (const sis of sistemas) {
        const taxaAnual = banco.taxas[tipoImovel][sis];
        if (!taxaAnual) continue;

        const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
        let financiadoCalc: number;
        let entradaEfetiva = entradaVal;

        if (simuladoPor === "financiamento") {
          financiadoCalc = valor - entradaVal;
          if (incluirDespesas) financiadoCalc += custoDoc;
        } else if (simuladoPor === "parcela") {
          // Desconta MIP+DFI estimado antes de calcular o principal
          const seguroEstimado = calcularSegurosMensais(banco, valor * 0.80, valor);
          const parcelaBase = parcelaDesejada - taxasAdicionais - seguroEstimado;
          if (parcelaBase <= 0) continue;
          if (sis === "price") {
            financiadoCalc = parcelaBase * (Math.pow(1 + taxaMensal, prazoEfetivo) - 1) / (taxaMensal * Math.pow(1 + taxaMensal, prazoEfetivo));
          } else {
            financiadoCalc = parcelaBase / (1 / prazoEfetivo + taxaMensal);
          }
          financiadoCalc = Math.min(financiadoCalc, valor);
          entradaEfetiva = valor - financiadoCalc;
        } else { // renda
          const seguroEstimado = calcularSegurosMensais(banco, valor * 0.80, valor);
          const parcelaMax = rendaMensal * 0.3 - taxasAdicionais - seguroEstimado;
          if (sis === "price") {
            financiadoCalc = parcelaMax * (Math.pow(1 + taxaMensal, prazoEfetivo) - 1) / (taxaMensal * Math.pow(1 + taxaMensal, prazoEfetivo));
          } else {
            financiadoCalc = parcelaMax / (1 / prazoEfetivo + taxaMensal);
          }
          financiadoCalc = Math.min(financiadoCalc, valor);
          entradaEfetiva = valor - financiadoCalc;
        }

        if (financiadoCalc <= 0) continue;

        const percentMax = banco.maxFinancingPercent[tipoImovel][tipoUso];
        const entradaMinBanco = valor * (1 - percentMax / 100);
        if (entradaEfetiva < entradaMinBanco - 0.01) continue;

        // MIP + DFI reais calculados com base no financiado e valor do imovel deste banco
        const segurosMensais = calcularSegurosMensais(banco, financiadoCalc, valor);
        const taxasMensaisTotal = taxasAdicionais + segurosMensais;

        const { parcelas, totalJuros, primeiraParcela, ultimaParcela } = calcularParcelas(
          financiadoCalc,
          taxaMensal,
          prazoEfetivo,
          taxasMensaisTotal,
          sis
        );

        const rendaSuficiente = simuladoPor !== "renda" || (primeiraParcela <= rendaMensal * 0.3);

        const simulacao: Simulacao = {
          bancoId: banco.id,
          bancoNome: banco.nome,
          cor: banco.cor,
          corTexto: banco.corTexto,
          sigla: banco.sigla,
          taxaAnual,
          sistema: sis,
          prazoUsado: prazoEfetivo,
          primeiraParcela,
          ultimaParcela,
          totalJuros,
          totalPago: financiadoCalc + totalJuros + taxasMensaisTotal * prazoEfetivo,
          rendaExigida: primeiraParcela / 0.3,
          parcelas,
          valorFinanciado: financiadoCalc,
          rendaSuficiente,
          tag: banco.tag,
          segurosMensais,
        };

        if (!bancoMap.has(banco.id)) {
          bancoMap.set(banco.id, {
            bancoId: banco.id,
            bancoNome: banco.nome,
            cor: banco.cor,
            corTexto: banco.corTexto,
            sigla: banco.sigla,
            simulacoes: [],
          });
        }
        bancoMap.get(banco.id)!.simulacoes.push(simulacao);
        algumaSimulacaoGerada = true;
      }
    }

    if (!algumaSimulacaoGerada) {
      if (simuladoPor === "renda") {
        setNenhumaSimulacaoMsg("Nenhum banco atende a sua renda com a entrada minima exigida. Tente aumentar a renda ou reduzir o valor do imovel.");
      } else if (simuladoPor === "parcela") {
        setNenhumaSimulacaoMsg("Nenhum banco atende a parcela desejada com a entrada minima exigida. Tente aumentar a parcela ou reduzir o valor do imovel.");
      } else {
        setNenhumaSimulacaoMsg("Nenhuma simulacao encontrada com os criterios informados.");
      }
      setResults([]);
      return;
    }

    const agrupados = Array.from(bancoMap.values()).map(b => ({
      ...b,
      simulacoes: b.simulacoes.sort((a, b) => a.totalPago - b.totalPago),
    }));

    const primeiraSim = agrupados[0].simulacoes[0];
    setFinanciado(primeiraSim.valorFinanciado);
    setEntrada(valor - primeiraSim.valorFinanciado);
    setEntradaPercent(((valor - primeiraSim.valorFinanciado) / valor) * 100);
    setCustoDocumentacao(custoDoc);
    setNenhumaSimulacaoMsg(null);
    setResults(agrupados);
  };

  const reset = () => {
    setForm({ valorImovel: "", entrada: "", prazo: "420", taxasMensais: "0", parcelaDesejada: "", rendaMensal: "" });
    setResults([]); setCustoDocumentacao(0); setPrazoMaximoAviso(""); setDataNascimento(""); setErroEntrada(null); setNenhumaSimulacaoMsg(null);
  };

  const melhorSimulacaoId = useMemo(() => {
    if (!results.length) return null;
    let melhor: { id: string; total: number } | null = null;
    results.forEach(banco => {
      banco.simulacoes.forEach(sim => {
        if (!melhor || sim.totalPago < melhor.total) {
          melhor = { id: `${sim.bancoId}-${sim.sistema}`, total: sim.totalPago };
        }
      });
    });
    return melhor?.id || null;
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Bancos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-purple-600" /> Bancos consultados</Label>
          <Button variant="ghost" size="sm" onClick={() => setModalTaxasAberto(true)} className="h-7 text-xs text-purple-600 hover:bg-purple-50">
            <Settings className="w-3.5 h-3.5 mr-1" /> Editar Taxas
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {bancos.map((banco) => (
            <button key={banco.id} onClick={() => toggleBanco(banco.id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                bancosAtivos.includes(banco.id) ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-200 text-slate-400 hover:border-slate-300")}>
              <div className="w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold" style={{ backgroundColor: banco.cor, color: banco.corTexto }}>
                {banco.sigla}
              </div>
              {banco.nome}
              {bancosAtivos.includes(banco.id) && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo imovel + novo/usado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Imovel</Label>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(["residencial", "comercial", "rural"] as TipoImovel[]).map((t) => (
              <button key={t} onClick={() => { setTipoImovel(t); setResults([]); }}
                className={cn("flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-all",
                  tipoImovel === t ? "bg-white text-[#7E22CE] shadow-sm" : "text-muted-foreground")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Novo ou Usado?</Label>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(["novo", "usado"] as TipoUso[]).map((u) => (
              <button key={u} onClick={() => { setTipoUso(u); setResults([]); }}
                className={cn("flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-all",
                  tipoUso === u ? "bg-white text-[#7E22CE] shadow-sm" : "text-muted-foreground")}>
                {u === "novo" ? "Novo" : "Usado"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simular por */}
      <div className="space-y-2">
        <Label>Simular por</Label>
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          <button onClick={() => setSimuladoPor("financiamento")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              simuladoPor === "financiamento" ? "bg-white text-[#7E22CE] shadow-sm" : "text-muted-foreground")}>
            Valor do Imovel
          </button>
          <button onClick={() => setSimuladoPor("parcela")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              simuladoPor === "parcela" ? "bg-white text-[#7E22CE] shadow-sm" : "text-muted-foreground")}>
            Parcela Desejada
          </button>
          <button onClick={() => setSimuladoPor("renda")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              simuladoPor === "renda" ? "bg-white text-[#7E22CE] shadow-sm" : "text-muted-foreground")}>
            Renda Mensal
          </button>
        </div>
      </div>

      {/* Sistema amortizacao */}
      <div className="space-y-2">
        <Label>Sistema de Amortizacao</Label>
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {(["price", "sac", "ambos"] as Sistema[]).map((s) => (
            <button key={s} onClick={() => { setSistema(s); setResults([]); }}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                sistema === s ? "bg-white text-[#7E22CE] shadow-sm" : "text-muted-foreground")}>
              {s === "ambos" ? "Comparar os dois" : `Tabela ${s.toUpperCase()}`}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {sistema === "price" && "PRICE: parcelas fixas, juros maiores no inicio"}
          {sistema === "sac" && "SAC: amortizacao fixa, parcelas decrescentes, menos juros no total"}
          {sistema === "ambos" && "Compare PRICE e SAC para cada banco selecionado"}
        </p>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Valor do Imovel</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.valorImovel)} onChange={(e) => handleMoney("valorImovel", e.target.value)} />
        </div>
        {simuladoPor === "financiamento" && (
          <div className="space-y-2">
            <Label>Valor da Entrada</Label>
            <Input placeholder="R$ 0,00" value={displayMoney(form.entrada)} onChange={(e) => handleMoney("entrada", e.target.value)} />
          </div>
        )}
        {simuladoPor === "parcela" && (
          <div className="space-y-2">
            <Label>Parcela Desejada (R$/mes)</Label>
            <Input placeholder="R$ 0,00" value={displayMoney(form.parcelaDesejada)} onChange={(e) => handleMoney("parcelaDesejada", e.target.value)} />
            <p className="text-xs text-muted-foreground">Calcula o valor maximo financiavel</p>
          </div>
        )}
        {simuladoPor === "renda" && (
          <div className="space-y-2">
            <Label>Renda Mensal Bruta</Label>
            <Input placeholder="R$ 0,00" value={displayMoney(form.rendaMensal)} onChange={(e) => handleMoney("rendaMensal", e.target.value)} />
            <p className="text-xs text-muted-foreground">Parcela limitada a 30% da renda</p>
          </div>
        )}
        <div className="space-y-2">
          <Label>Taxas Adicionais (R$/mes)</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.taxasMensais)} onChange={(e) => handleMoney("taxasMensais", e.target.value)} />
          <p className="text-xs text-muted-foreground">MIP e DFI sao calculados automaticamente por banco</p>
        </div>
        <div className="space-y-2">
          <Label>Prazo Solicitado (meses)</Label>
          <Input
            type="number"
            min="1"
            max="420"
            value={form.prazo}
            onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
            placeholder="420"
          />
          <p className="text-xs text-muted-foreground">{Math.round(parseInt(form.prazo || "0") / 12)} anos (max 420 meses)</p>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Data de Nasc. (Opcional)</Label>
          <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} max={new Date().toISOString().split("T")[0]} />
          <p className="text-xs text-muted-foreground">Valida o limite de idade de 80 anos e 6m</p>
        </div>
      </div>

      {entradaMinimaInfo && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-sm">{entradaMinimaInfo}</AlertDescription>
        </Alert>
      )}
      {rendaMinimaInfo && (
        <Alert className="bg-green-50 border-green-200">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 text-sm">{rendaMinimaInfo}</AlertDescription>
        </Alert>
      )}

      {/* Despesas */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-700">Despesas</p>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted-foreground">Incluir ITBI + Cartorio no financiamento?</p>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button key={String(val)} onClick={() => setIncluirDespesas(val)}
                className={cn("flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-lg border transition-all",
                  incluirDespesas === val ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-200 text-slate-500")}>
                <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center", incluirDespesas === val ? "border-[#7E22CE]" : "border-slate-300")}>
                  {incluirDespesas === val && <div className="w-1.5 h-1.5 rounded-full bg-[#7E22CE]" />}
                </div>
                {val ? "Sim" : "Nao"}
              </button>
            ))}
          </div>
        </div>
        {incluirDespesas && form.valorImovel && (
          <p className="text-xs text-amber-600">≈ {formatCurrency((parseFloat(form.valorImovel.replace(/\D/g, "")) / 100 || 0) * 0.05)} embutido no valor financiado</p>
        )}
      </div>

      {erroEntrada && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erroEntrada}</AlertDescription>
        </Alert>
      )}
      {prazoMaximoAviso && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">{prazoMaximoAviso}</AlertDescription>
        </Alert>
      )}

      {/* Botoes */}
      <div className="flex gap-3">
        <Button onClick={calcular} disabled={loading} className="flex-1 bg-[#7E22CE] hover:bg-[#6b21a8]">
          <Calculator className="w-4 h-4 mr-2" />
          {loading ? "Carregando..." : `Simular ${bancosAtivos.length} banco${bancosAtivos.length !== 1 ? "s" : ""}${sistema === "ambos" ? " x 2 sistemas" : ""}`}
        </Button>
        <Button variant="outline" onClick={reset}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Valor Financiado (aprox.)</p>
              <p className="text-base font-bold text-slate-800">{formatCurrency(financiado)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">ITBI + Cartorio (Est.)</p>
              <p className="text-base font-bold text-amber-800">{formatCurrency(custoDocumentacao)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="text-base font-bold text-blue-800">{formatCurrency(entrada)} <span className="text-xs font-normal">({entradaPercent.toFixed(1)}%)</span></p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {results.reduce((acc, b) => acc + b.simulacoes.length, 0)} simulacoes · ordenadas por banco
          </p>
          <div className="space-y-3">
            {results.map((banco) => (
              <BancoResultCard key={banco.bancoId} banco={banco} melhorSimulacaoId={melhorSimulacaoId} />
            ))}
          </div>
        </motion.div>
      )}

      {nenhumaSimulacaoMsg && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">{nenhumaSimulacaoMsg}</AlertDescription>
        </Alert>
      )}

      <ModalTaxasBancarias
        open={modalTaxasAberto}
        onClose={() => setModalTaxasAberto(false)}
        onSaved={() => { if (results.length > 0) calcular(); }}
      />
    </div>
  );
};

// ─── ABA COMISSAO (identica ao original) ─────────────────────────────────────
const ComissaoCalc = () => {
  const [form, setForm] = useState({ valorVenda: "", comissao: "6", repasse: "50", impostos: "6" });
  const [result, setResult] = useState<any>(null);

  const calcular = () => {
    const valor = parseFloat(form.valorVenda.replace(/\D/g, "")) / 100 || 0;
    const comissao = parseFloat(form.comissao) || 0;
    const repasse = parseFloat(form.repasse) || 100;
    const impostos = parseFloat(form.impostos) || 0;
    if (valor <= 0) return;
    const comissaoTotal = valor * (comissao / 100);
    const parteImobiliaria = comissaoTotal * ((100 - repasse) / 100);
    const suaParteBruta = comissaoTotal * (repasse / 100);
    const valorImpostos = suaParteBruta * (impostos / 100);
    const liquido = suaParteBruta - valorImpostos;
    setResult({ comissaoTotal, parteImobiliaria, suaParteBruta, valorImpostos, liquido, comissao, repasse, impostos });
  };

  const reset = () => { setForm({ valorVenda: "", comissao: "6", repasse: "50", impostos: "6" }); setResult(null); };
  const handleMoney = (val: string) => setForm(f => ({ ...f, valorVenda: val.replace(/\D/g, "") }));
  const displayMoney = (val: string) => !val ? "" : (parseInt(val) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <Label>Valor da Venda</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.valorVenda)} onChange={(e) => handleMoney(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Comissao Total (%)</Label>
          <Input type="number" step="0.5" value={form.comissao} onChange={(e) => setForm(f => ({ ...f, comissao: e.target.value }))} placeholder="6" />
          <p className="text-xs text-muted-foreground">Ex: 6% a 8%</p>
        </div>
        <div className="space-y-2">
          <Label>Repasse / Sua Parte (%)</Label>
          <Input type="number" step="1" value={form.repasse} onChange={(e) => setForm(f => ({ ...f, repasse: e.target.value }))} placeholder="50" />
          <p className="text-xs text-muted-foreground">Ex: 50/50 com a agencia</p>
        </div>
        <div className="space-y-2">
          <Label>Impostos (%)</Label>
          <Input type="number" step="0.5" value={form.impostos} onChange={(e) => setForm(f => ({ ...f, impostos: e.target.value }))} placeholder="6" />
          <p className="text-xs text-muted-foreground">Ex: Simples Nacional (6%)</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={calcular} className="flex-1 bg-[#7E22CE] hover:bg-[#6b21a8]">
          <Percent className="w-4 h-4 mr-2" />Calcular Comissao
        </Button>
        <Button variant="outline" onClick={reset}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 lg:col-span-2">
              <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Liquido no seu Bolso</p>
              <p className="text-3xl font-bold text-purple-900">{formatCurrency(result.liquido)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Comissao Total</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(result.comissaoTotal)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-semibold uppercase mb-1">Parte Imobiliaria/Parceiro</p>
              <p className="text-xl font-bold text-amber-900">{formatCurrency(result.parteImobiliaria)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 lg:col-span-2">
              <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Sua Parte Bruta</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(result.suaParteBruta)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 lg:col-span-2">
              <p className="text-xs text-red-600 font-semibold uppercase mb-1">Desconto de Impostos</p>
              <p className="text-xl font-bold text-red-900">-{formatCurrency(result.valorImpostos)}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── ABA RENTABILIDADE (identica ao original) ─────────────────────────────────
const RentabilidadeCalc = () => {
  const [form, setForm] = useState({ valorImovel: "", aluguelMensal: "", despesas: "", impostoRenda: "15", valorizacao: "5" });
  const [result, setResult] = useState<any>(null);

  const calcular = () => {
    const valor = parseFloat(form.valorImovel.replace(/\D/g, "")) / 100 || 0;
    const aluguel = parseFloat(form.aluguelMensal.replace(/\D/g, "")) / 100 || 0;
    const despesas = parseFloat(form.despesas.replace(/\D/g, "")) / 100 || 0;
    const impostoRenda = parseFloat(form.impostoRenda) || 0;
    const valorizacao = parseFloat(form.valorizacao) || 0;
    if (valor <= 0) return;
    const aluguelSemDespesas = aluguel - despesas;
    const descontoIR = aluguelSemDespesas * (impostoRenda / 100);
    const aluguelLiquidoReal = aluguelSemDespesas - descontoIR;
    const capRateAnual = ((aluguelLiquidoReal * 12) / valor) * 100;
    const rentabilidadeTotal = capRateAnual + valorizacao;
    const rendimentoImovelMoeda = (aluguelLiquidoReal * 12) + (valor * (valorizacao / 100));
    const taxaRendaFixa = 7;
    const rendimentoPoupancaMoeda = valor * (taxaRendaFixa / 100);
    setResult({ aluguelLiquidoReal, descontoIR, capRateAnual, rentabilidadeTotal, rendimentoImovelMoeda, rendimentoPoupancaMoeda, taxaRendaFixa });
  };

  const reset = () => { setForm({ valorImovel: "", aluguelMensal: "", despesas: "", impostoRenda: "15", valorizacao: "5" }); setResult(null); };
  const handleMoney = (field: string, val: string) => setForm(f => ({ ...f, [field]: val.replace(/\D/g, "") }));
  const displayMoney = (val: string) => !val ? "" : (parseInt(val) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2 lg:col-span-3">
          <Label>Valor do Imovel</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.valorImovel)} onChange={(e) => handleMoney("valorImovel", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Aluguel Mensal</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.aluguelMensal)} onChange={(e) => handleMoney("aluguelMensal", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Despesas (IPTU/Cond.)</Label>
          <Input placeholder="R$ 0,00" value={displayMoney(form.despesas)} onChange={(e) => handleMoney("despesas", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>IR sobre Aluguel (%)</Label>
          <Input type="number" step="0.5" value={form.impostoRenda} onChange={(e) => setForm(f => ({ ...f, impostoRenda: e.target.value }))} placeholder="15" />
        </div>
        <div className="space-y-2 lg:col-span-3">
          <Label>Valorizacao Anual Estimada do Imovel (%)</Label>
          <Input type="number" step="0.5" value={form.valorizacao} onChange={(e) => setForm(f => ({ ...f, valorizacao: e.target.value }))} placeholder="5" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={calcular} className="flex-1 bg-[#7E22CE] hover:bg-[#6b21a8]">
          <TrendingUp className="w-4 h-4 mr-2" />Calcular Rentabilidade
        </Button>
        <Button variant="outline" onClick={reset}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 md:col-span-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Cap Rate Liquido (Aluguel a.a.)</p>
                  <p className="text-3xl font-bold text-purple-900">{result.capRateAnual.toFixed(2)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Rentabilidade Total (c/ Valorizacao)</p>
                  <p className="text-3xl font-bold text-purple-900">{result.rentabilidadeTotal.toFixed(2)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Aluguel Real (Mensal)</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(result.aluguelLiquidoReal)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ja com descontos e IR</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs text-red-600 font-semibold uppercase mb-1">IR Retido (Mensal)</p>
              <p className="text-xl font-bold text-red-900">-{formatCurrency(result.descontoIR)}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs text-green-600 font-semibold uppercase mb-1">Rendimento em Dinheiro (a.a.)</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(result.rendimentoImovelMoeda)}</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">Comparativo de Mercado (Estimativa em 1 ano):</p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-700">Seu Imovel (Aluguel + Valorizacao):</span>
              <span className="font-bold text-blue-900">{formatCurrency(result.rendimentoImovelMoeda)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-blue-700">Renda Fixa / Poupanca (~{result.taxaRendaFixa}% a.a.):</span>
              <span className="font-bold text-blue-900">{formatCurrency(result.rendimentoPoupancaMoeda)}</span>
            </div>
            {result.rendimentoImovelMoeda > result.rendimentoPoupancaMoeda && (
              <p className="text-xs text-green-700 font-bold mt-3">O imovel supera a renda fixa conservadora neste cenario.</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── PAGINA PRINCIPAL (identica ao original) ──────────────────────────────────
const Calculators = () => {
  const [tab, setTab] = useState<Tab>("financiamento");
  const tabs = [
    { id: "financiamento" as Tab, label: "Financiamento", icon: Home },
    { id: "comissao" as Tab, label: "Comissao", icon: Percent },
    { id: "rentabilidade" as Tab, label: "Rentabilidade", icon: TrendingUp },
  ];
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Calculadoras</h1>
          <p className="text-muted-foreground">Ferramentas financeiras para o mercado imobiliario</p>
        </div>
        <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl w-fit">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === t.id ? "bg-white text-[#7E22CE] shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>
        <div className="bg-card border border-border rounded-xl p-6 max-w-4xl">
          {tab === "financiamento" && <FinanciamentoCalc />}
          {tab === "comissao" && <ComissaoCalc />}
          {tab === "rentabilidade" && <RentabilidadeCalc />}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Calculators;