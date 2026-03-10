import { useState, useCallback } from "react";
import { Building2, TrendingDown, Info, ChevronDown, ChevronUp, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

// ─── TAXAS DOS BANCOS (atualizaveis manualmente ou via API futura) ───────────
// Fonte: CrediMorar + simuladores oficiais dos bancos (marco/2025)
const BANCOS = [
  {
    id: 1,
    nome: "Bradesco",
    cor: "#CC092F",
    taxaAnual: 12.29,          // taxa efetiva a.a. (CrediMorar)
    taxaNominal: 11.6566188,   // taxa nominal a.a. usada no calculo SAC
    taxaPrice: 12.72,          // taxa nominal PRICE (site Bradesco)
    cesh: 2.75,                // custo efetivo de seguro habitacional
    tag: 2114.03,              // tarifa de avaliacao do bem
    mip: 0.0370,               // seguro MIP mensal base (% saldo devedor)
    dfi: 0.00825,              // seguro DFI mensal base (% valor imovel)
    maxLtv: 0.80,              // loan to value maximo
    maxPrazoMeses: 420,
    minImovel: 100000,
  },
  {
    id: 3,
    nome: "Itau",
    cor: "#003087",
    taxaAnual: 11.99,
    taxaNominal: 11.3865514,
    taxaPrice: 11.99,
    cesh: 3.03,
    tag: 1950.00,
    mip: 0.0380,
    dfi: 0.00825,
    maxLtv: 0.90,
    maxPrazoMeses: 420,
    minImovel: 97561,
  },
  {
    id: 2,
    nome: "Santander",
    cor: "#EC0000",
    taxaAnual: 11.79,
    taxaNominal: 11.1971094,
    taxaPrice: 11.79,
    cesh: 2.28,
    tag: 1950.00,
    mip: 0.0360,
    dfi: 0.00825,
    maxLtv: 0.80,
    maxPrazoMeses: 420,
    minImovel: 100000,
  },
  {
    id: 6,
    nome: "Inter",
    cor: "#FF6B00",
    taxaAnual: 9.50,
    taxaNominal: 9.11,
    taxaPrice: 9.50,
    cesh: 3.615,
    tag: 5000.00,
    mip: 0.0380,
    dfi: 0.00825,
    maxLtv: 0.75,
    maxPrazoMeses: 420,
    minImovel: 200000,
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function parseBRL(v: string): number {
  const n = parseFloat(v.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number): string {
  return v.toFixed(2).replace(".", ",") + "% a.a.";
}

// Calcula taxa mensal a partir da taxa anual nominal
function taxaMensal(taxaAnualNominal: number): number {
  return taxaAnualNominal / 100 / 12;
}

// ─── CALCULO SAC ──────────────────────────────────────────────────────────────
// Amortizacao constante: parcela decresce ao longo do tempo
// Primeira parcela = amortizacao + juros do 1o mes
// Amortizacao = valorFinanciado / prazoMeses
function calcSAC(valorFinanciado: number, taxaAnualNominal: number, prazoMeses: number, mipPct: number, dfiPct: number, valorImovel: number) {
  const tm = taxaMensal(taxaAnualNominal);
  const amortizacao = valorFinanciado / prazoMeses;
  let saldo = valorFinanciado;

  const parcelas: number[] = [];
  for (let i = 0; i < prazoMeses; i++) {
    const juros = saldo * tm;
    const mip = (saldo * (mipPct / 100)) / 12;
    const dfi = (valorImovel * (dfiPct / 100)) / 12;
    const total = amortizacao + juros + mip + dfi;
    parcelas.push(total);
    saldo -= amortizacao;
  }

  return {
    primeira: parcelas[0],
    ultima: parcelas[prazoMeses - 1],
    total: parcelas.reduce((a, b) => a + b, 0),
    amortizacao,
  };
}

// ─── CALCULO PRICE ────────────────────────────────────────────────────────────
// Parcelas fixas de juros + principal
// PMT = PV * [i*(1+i)^n] / [(1+i)^n - 1]
function calcPRICE(valorFinanciado: number, taxaAnualNominal: number, prazoMeses: number, mipPct: number, dfiPct: number, valorImovel: number) {
  const tm = taxaMensal(taxaAnualNominal);
  const fator = Math.pow(1 + tm, prazoMeses);
  const pmt = valorFinanciado * (tm * fator) / (fator - 1);

  // MIP e DFI variam pois incidem sobre saldo devedor / valor imovel
  // Para simplificar, usamos media (aproximacao comum nos simuladores)
  const mipMedio = (valorFinanciado / 2 * (mipPct / 100)) / 12;
  const dfiMes = (valorImovel * (dfiPct / 100)) / 12;

  const primeiraTotal = pmt + (valorFinanciado * (mipPct / 100)) / 12 + dfiMes;
  const ultimaTotal = pmt + mipMedio + dfiMes;

  return {
    primeira: primeiraTotal,
    ultima: ultimaTotal,
    total: (pmt + mipMedio + dfiMes) * prazoMeses,
    pmt,
  };
}

// Renda minima necessaria (parcela <= 30% da renda)
function rendaMinima(primeiraParcela: number): number {
  return primeiraParcela / 0.30;
}

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface SimResult {
  bancoId: number;
  nome: string;
  cor: string;
  primeiraParcela: number;
  ultimaParcela: number;
  totalPago: number;
  rendaMinima: number;
  taxaEfetiva: number;
  taxaNominal: number;
  cesh: number;
  tag: number;
  sistema: string;
  valorFinanciado: number;
  valorEntrada: number;
  prazoMeses: number;
  erro?: string;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Calculator() {
  const [valorImovelStr, setValorImovelStr] = useState("450.000");
  const [entradaPct, setEntradaPct] = useState(20);
  const [prazoAnos, setPrazoAnos] = useState(35);
  const [sistema, setSistema] = useState<"SAC" | "PRICE">("SAC");
  const [dataNasc, setDataNasc] = useState("22/10/1996");
  const [resultados, setResultados] = useState<SimResult[] | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [calculando, setCalculando] = useState(false);

  const valorImovel = parseBRL(valorImovelStr.replace(/\./g, "").replace(",", "."));
  const valorEntrada = valorImovel * (entradaPct / 100);
  const valorFinanciado = valorImovel - valorEntrada;
  const prazoMeses = prazoAnos * 12;

  const simular = useCallback(() => {
    if (valorImovel < 50000) {
      toast.error("Informe um valor de imovel valido");
      return;
    }
    setCalculando(true);
    setTimeout(() => {
      const res: SimResult[] = BANCOS.map((banco) => {
        if (valorImovel < banco.minImovel) {
          return {
            bancoId: banco.id,
            nome: banco.nome,
            cor: banco.cor,
            primeiraParcela: 0,
            ultimaParcela: 0,
            totalPago: 0,
            rendaMinima: 0,
            taxaEfetiva: banco.taxaAnual,
            taxaNominal: banco.taxaNominal,
            cesh: banco.cesh,
            tag: banco.tag,
            sistema,
            valorFinanciado,
            valorEntrada,
            prazoMeses,
            erro: `Valor minimo do imovel: ${fmtBRL(banco.minImovel)}`,
          };
        }

        const ltv = valorFinanciado / valorImovel;
        if (ltv > banco.maxLtv) {
          return {
            bancoId: banco.id,
            nome: banco.nome,
            cor: banco.cor,
            primeiraParcela: 0,
            ultimaParcela: 0,
            totalPago: 0,
            rendaMinima: 0,
            taxaEfetiva: banco.taxaAnual,
            taxaNominal: banco.taxaNominal,
            cesh: banco.cesh,
            tag: banco.tag,
            sistema,
            valorFinanciado,
            valorEntrada,
            prazoMeses,
            erro: `Entrada minima: ${(banco.maxLtv * 100).toFixed(0)}% do valor do imovel (${fmtBRL(valorImovel * (1 - banco.maxLtv))})`,
          };
        }

        const calc = sistema === "SAC"
          ? calcSAC(valorFinanciado, banco.taxaNominal, prazoMeses, banco.mip, banco.dfi, valorImovel)
          : calcPRICE(valorFinanciado, banco.taxaNominal, prazoMeses, banco.mip, banco.dfi, valorImovel);

        return {
          bancoId: banco.id,
          nome: banco.nome,
          cor: banco.cor,
          primeiraParcela: calc.primeira,
          ultimaParcela: calc.ultima,
          totalPago: calc.total,
          rendaMinima: rendaMinima(calc.primeira),
          taxaEfetiva: banco.taxaAnual,
          taxaNominal: banco.taxaNominal,
          cesh: banco.cesh,
          tag: banco.tag,
          sistema,
          valorFinanciado,
          valorEntrada,
          prazoMeses,
        };
      });

      // Ordena: sem erro primeiro, depois por menor primeira parcela
      res.sort((a, b) => {
        if (a.erro && !b.erro) return 1;
        if (!a.erro && b.erro) return -1;
        return a.primeiraParcela - b.primeiraParcela;
      });

      setResultados(res);
      setCalculando(false);
    }, 600);
  }, [valorImovel, entradaPct, prazoAnos, sistema, valorFinanciado, valorEntrada, prazoMeses]);

  function formatInput(val: string): string {
    const nums = val.replace(/\D/g, "");
    if (!nums) return "";
    return parseInt(nums, 10).toLocaleString("pt-BR");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Simulador de Financiamento</h1>
            <p className="text-sm text-gray-500">Compare as melhores opcoes dos principais bancos</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-5 uppercase tracking-wide">Dados da Simulacao</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Valor do imovel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Valor do Imovel
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                <input
                  type="text"
                  value={valorImovelStr}
                  onChange={(e) => setValorImovelStr(formatInput(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="450.000"
                />
              </div>
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data de Nascimento
              </label>
              <input
                type="text"
                value={dataNasc}
                onChange={(e) => setDataNasc(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Entrada */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Entrada</label>
                <span className="text-sm font-semibold text-blue-600">{entradaPct}% — {fmtBRL(valorEntrada)}</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={entradaPct}
                onChange={(e) => setEntradaPct(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>10%</span>
                <span className="text-gray-600 font-medium">Financiado: {fmtBRL(valorFinanciado)}</span>
                <span>90%</span>
              </div>
            </div>

            {/* Prazo */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Prazo</label>
                <span className="text-sm font-semibold text-blue-600">{prazoAnos} anos ({prazoMeses} meses)</span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                step={5}
                value={prazoAnos}
                onChange={(e) => setPrazoAnos(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>5 anos</span>
                <span>35 anos</span>
              </div>
            </div>

            {/* Sistema de amortizacao */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sistema de Amortizacao</label>
              <div className="flex gap-3">
                {(["SAC", "PRICE"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSistema(s)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      sistema === s
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {s === "SAC" ? "SAC — Amortizacao Constante" : "PRICE — Parcelas Fixas"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {sistema === "SAC"
                  ? "Primeira parcela maior, ultima menor. Total pago menor no longo prazo."
                  : "Parcelas iguais do inicio ao fim. Mais facil de planejar."}
              </p>
            </div>
          </div>

          <button
            onClick={simular}
            disabled={calculando}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {calculando ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Calculando...</>
            ) : (
              <><TrendingDown className="w-4 h-4" />Simular Financiamento</>
            )}
          </button>
        </div>

        {/* Resultados */}
        {resultados && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Resultados</h2>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Taxas de marco/2025 — TR nao incluida
              </span>
            </div>

            {resultados.map((r, idx) => (
              <div
                key={r.bancoId}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  r.erro ? "opacity-60" : "hover:shadow-md"
                } ${idx === 0 && !r.erro ? "border-blue-200 ring-1 ring-blue-100" : "border-gray-200"}`}
              >
                {/* Badge melhor opcao */}
                {idx === 0 && !r.erro && (
                  <div className="bg-blue-600 text-white text-xs font-semibold text-center py-1.5 tracking-wide">
                    ★ MELHOR OPCAO
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Banco + taxa */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: r.cor }}
                      >
                        {r.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{r.nome}</p>
                        <p className="text-xs text-gray-500">{fmtPct(r.taxaEfetiva)} efetiva · {r.sistema}</p>
                      </div>
                    </div>

                    {/* Parcela principal */}
                    {!r.erro ? (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{fmtBRL(r.primeiraParcela)}</p>
                        <p className="text-xs text-gray-500">1ª parcela</p>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-red-500 max-w-48">{r.erro}</div>
                    )}
                  </div>

                  {/* Metricas resumidas */}
                  {!r.erro && (
                    <>
                      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Ultima Parcela</p>
                          <p className="text-sm font-semibold text-gray-700">{fmtBRL(r.ultimaParcela)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Renda Minima</p>
                          <p className="text-sm font-semibold text-gray-700">{fmtBRL(r.rendaMinima)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Total Pago</p>
                          <p className="text-sm font-semibold text-gray-700">{fmtBRL(r.totalPago)}</p>
                        </div>
                      </div>

                      {/* Expandir detalhes */}
                      <button
                        onClick={() => setExpandido(expandido === r.bancoId ? null : r.bancoId)}
                        className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandido === r.bancoId ? (
                          <><ChevronUp className="w-3 h-3" />Ocultar detalhes</>
                        ) : (
                          <><ChevronDown className="w-3 h-3" />Ver detalhes</>
                        )}
                      </button>

                      {expandido === r.bancoId && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-gray-400">Taxa Nominal</p>
                            <p className="text-sm font-medium text-gray-700">{fmtPct(r.taxaNominal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">CESH (Seguro)</p>
                            <p className="text-sm font-medium text-gray-700">{fmtPct(r.cesh)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">TAG (Vistoria)</p>
                            <p className="text-sm font-medium text-gray-700">{fmtBRL(r.tag)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Valor Financiado</p>
                            <p className="text-sm font-medium text-gray-700">{fmtBRL(r.valorFinanciado)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Valor Entrada</p>
                            <p className="text-sm font-medium text-gray-700">{fmtBRL(r.valorEntrada)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Prazo</p>
                            <p className="text-sm font-medium text-gray-700">{r.prazoMeses} meses ({r.prazoMeses / 12} anos)</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">LTV</p>
                            <p className="text-sm font-medium text-gray-700">{((r.valorFinanciado / valorImovel) * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Custo Extra (TAG)</p>
                            <p className="text-sm font-medium text-gray-700">{fmtBRL(r.tag)}</p>
                          </div>
                        </div>
                      )}

                      {/* Botao enviar para analise */}
                      <button
                        onClick={() => toast.success(`Simulacao ${r.nome} enviada! Em breve um consultor entrara em contato.`)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Enviar para Analise — {r.nome}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
              <strong>Aviso:</strong> Esta simulacao e meramente indicativa. Taxas sujeitas a alteracao conforme perfil de credito, segmento profissional e politica de cada banco. Valores nao incluem a variacao da TR (Taxa Referencial). Para uma analise completa, consulte um especialista.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}