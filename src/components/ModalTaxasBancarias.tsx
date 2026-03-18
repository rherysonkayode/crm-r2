import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RefreshCw, AlertCircle, Database, HardDrive, ChevronDown, ChevronUp, Home, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTaxasBancarias, BancoConfig, bancoConfigToRow } from "@/hooks/useTaxasBancarias";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ModalTaxasBancariasProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type TipoImovel = "residencial" | "comercial" | "rural";
const TIPOS: TipoImovel[] = ["residencial", "comercial", "rural"];
const TIPO_LABEL: Record<TipoImovel, string> = { residencial: "Residencial", comercial: "Comercial", rural: "Rural" };

const NumInput = ({
  value, onChange, suffix = "%", step = "0.01", min = "0", disabled = false,
}: {
  value: number; onChange: (v: number) => void; suffix?: string; step?: string; min?: string; disabled?: boolean;
}) => (
  <div className="relative flex items-center">
    <Input
      type="number" step={step} min={min} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={cn("pr-8 text-right text-xs h-8", disabled && "bg-muted/50 text-muted-foreground")}
      disabled={disabled}
    />
    <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>
  </div>
);

export default function ModalTaxasBancarias({ open, onClose, onSaved }: ModalTaxasBancariasProps) {
  const { bancos: bancosOriginais, fromSupabase, loading } = useTaxasBancarias();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editados, setEditados] = useState<BancoConfig[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [expandedCaixaLinhas, setExpandedCaixaLinhas] = useState<string | null>(null);
  const [abaSelecionada, setAbaSelecionada] = useState<TipoImovel>("residencial");

  useEffect(() => {
    if (open && bancosOriginais.length > 0) {
      setEditados(JSON.parse(JSON.stringify(bancosOriginais)));
    }
  }, [open, bancosOriginais]);

  const atualizar = (bancoId: string, campo: string, valor: number) => {
    setEditados((prev) =>
      prev.map((b) => {
        if (b.id !== bancoId) return b;
        if (["maxPrazo", "minImovel", "tag", "mipAnual", "dfiAnual"].includes(campo)) {
          return { ...b, [campo]: valor };
        }
        if (campo.startsWith("taxas.")) {
          const [, tipo, sis] = campo.split(".") as [string, TipoImovel, "sac" | "price"];
          return { ...b, taxas: { ...b.taxas, [tipo]: { ...b.taxas[tipo], [sis]: valor } } };
        }
        if (campo.startsWith("ltv.")) {
          const [, tipo, sis] = campo.split(".") as [string, TipoImovel, "sac" | "price"];
          return { ...b, maxFinancingPercent: { ...b.maxFinancingPercent, [tipo]: { ...b.maxFinancingPercent[tipo], [sis]: valor } } };
        }
        if (campo.startsWith("mcmv.")) {
          const [, tipo, sis] = campo.split(".") as [string, "taxa" | "ltv", "sac" | "price"];
          if (tipo === "taxa") return { ...b, taxasMCMV: { ...(b.taxasMCMV || { sac: 0, price: 0 }), [sis]: valor } };
          return { ...b, ltvMCMV: { ...(b.ltvMCMV || { sac: 0, price: 0 }), [sis]: valor } };
        }
        if (campo.startsWith("procotista.")) {
          const [, tipo, sis] = campo.split(".") as [string, "taxa" | "ltv", "sac" | "price"];
          if (tipo === "taxa") return { ...b, taxasProCotista: { ...(b.taxasProCotista || { sac: 0, price: 0 }), [sis]: valor } };
          return { ...b, ltvProCotista: { ...(b.ltvProCotista || { sac: 0, price: 0 }), [sis]: valor } };
        }
        return b;
      })
    );
  };

  const salvar = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar");
      return;
    }
    setSalvando(true);
    try {
      const rows = editados.map((b) => bancoConfigToRow(b, user.id));

      const { error } = await supabase
        .from("taxas_bancarias")
        .upsert(rows, { onConflict: "banco_id, user_id" });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["taxas_bancarias", user.id] });
      toast.success("Suas taxas foram salvas com sucesso!");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const resetar = () => {
    setEditados(JSON.parse(JSON.stringify(bancosOriginais)));
    toast.info("Alterações descartadas");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <div className="flex justify-center items-center p-8">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2">Carregando...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!editados.length) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold">Editar Taxas Bancárias</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {fromSupabase
                  ? "Suas taxas personalizadas. Alterações afetam apenas seu perfil."
                  : "Você ainda não personalizou suas taxas. Os valores abaixo são os padrões do mercado."}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 text-xs shrink-0",
                fromSupabase
                  ? "border-green-300 text-green-700 bg-green-50"
                  : "border-amber-300 text-amber-700 bg-amber-50"
              )}
            >
              {fromSupabase ? (
                <><Database className="w-3 h-3" /> Suas taxas</>
              ) : (
                <><HardDrive className="w-3 h-3" /> Padrão</>
              )}
            </Badge>
          </div>
        </DialogHeader>

        {!fromSupabase && (
          <Alert className="bg-amber-50 border-amber-200 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              Você está usando taxas padrão. Para personalizar, faça alterações e clique em "Salvar minhas taxas".
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={abaSelecionada} onValueChange={(v) => setAbaSelecionada(v as TipoImovel)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-fit">
            {TIPOS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">{TIPO_LABEL[t]}</TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2">
            {TIPOS.map((tipo) => (
              <TabsContent key={tipo} value={tipo} className="mt-0 space-y-2">
                {/* Header — scroll horizontal no mobile */}
                <div className="overflow-x-auto">
                  <div className="min-w-[500px] grid grid-cols-[140px_1fr_1fr_1fr_1fr] gap-2 px-3 py-1.5 bg-muted/60 rounded-lg text-xs font-semibold text-muted-foreground">
                    <span>Banco</span>
                    <span className="text-center">Taxa SAC (%)</span>
                    <span className="text-center">Taxa PRICE (%)</span>
                    <span className="text-center">LTV SAC (%)</span>
                    <span className="text-center">LTV PRICE (%)</span>
                  </div>
                </div>

                {editados.map((banco) => (
                  <div key={banco.id} className="border border-border rounded-xl overflow-hidden">
                    {/* Linha principal — scroll horizontal no mobile */}
                    <div className="overflow-x-auto">
                      <div className="min-w-[500px] grid grid-cols-[140px_1fr_1fr_1fr_1fr] gap-2 items-center px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: banco.cor, color: banco.corTexto }}
                          >
                            {banco.sigla}
                          </div>
                          <span className="text-xs font-medium truncate">{banco.nome}</span>
                        </div>
                        <NumInput value={banco.taxas[tipo]?.sac || 0} onChange={(v) => atualizar(banco.id, `taxas.${tipo}.sac`, v)} />
                        <NumInput value={banco.taxas[tipo]?.price || 0} onChange={(v) => atualizar(banco.id, `taxas.${tipo}.price`, v)} />
                        <NumInput value={banco.maxFinancingPercent[tipo]?.sac || 0} onChange={(v) => atualizar(banco.id, `ltv.${tipo}.sac`, v)} step="1" />
                        <NumInput value={banco.maxFinancingPercent[tipo]?.price || 0} onChange={(v) => atualizar(banco.id, `ltv.${tipo}.price`, v)} step="1" />
                      </div>
                    </div>

                    {/* Linhas especiais da Caixa */}
                    {banco.id === "caixa" && tipo === "residencial" && (
                      <>
                        <button
                          onClick={() => setExpandedCaixaLinhas(expandedCaixaLinhas === banco.id ? null : banco.id)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-purple-600 hover:text-purple-800 py-1.5 border-t border-dashed border-border bg-purple-50/30 transition-colors"
                        >
                          {expandedCaixaLinhas === banco.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedCaixaLinhas === banco.id ? "Ocultar" : "Configurar"} linhas especiais (MCMV, Pró-Cotista)
                        </button>
                        {expandedCaixaLinhas === banco.id && (
                          <div className="p-3 space-y-4 border-t border-border bg-purple-50/10">
                            {/* MCMV */}
                            <div>
                              <div className="flex items-center gap-1 mb-2">
                                <Home className="w-3.5 h-3.5 text-purple-700" />
                                <h4 className="text-xs font-semibold text-purple-800">Minha Casa, Minha Vida - Classe Média</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { label: "Taxa SAC (%)", campo: "mcmv.taxa.sac", val: banco.taxasMCMV?.sac || 10.0 },
                                  { label: "Taxa PRICE (%)", campo: "mcmv.taxa.price", val: banco.taxasMCMV?.price || 10.0 },
                                  { label: "LTV SAC (%)", campo: "mcmv.ltv.sac", val: banco.ltvMCMV?.sac || 80, step: "1" },
                                  { label: "LTV PRICE (%)", campo: "mcmv.ltv.price", val: banco.ltvMCMV?.price || 80, step: "1" },
                                ].map(f => (
                                  <div key={f.campo}>
                                    <Label className="text-xs text-muted-foreground mb-1 block">{f.label}</Label>
                                    <NumInput value={f.val} onChange={(v) => atualizar(banco.id, f.campo, v)} step={f.step || "0.01"} />
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Renda até R$12.000 · Imóvel até R$500.000</p>
                            </div>
                            {/* Pró-Cotista */}
                            <div>
                              <div className="flex items-center gap-1 mb-2">
                                <Users className="w-3.5 h-3.5 text-green-700" />
                                <h4 className="text-xs font-semibold text-green-800">Pró-Cotista</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { label: "Taxa SAC (%)", campo: "procotista.taxa.sac", val: banco.taxasProCotista?.sac || 8.66 },
                                  { label: "Taxa PRICE (%)", campo: "procotista.taxa.price", val: banco.taxasProCotista?.price || 8.66 },
                                  { label: "LTV SAC (%)", campo: "procotista.ltv.sac", val: banco.ltvProCotista?.sac || 80, step: "1" },
                                  { label: "LTV PRICE (%)", campo: "procotista.ltv.price", val: banco.ltvProCotista?.price || 80, step: "1" },
                                ].map(f => (
                                  <div key={f.campo}>
                                    <Label className="text-xs text-muted-foreground mb-1 block">{f.label}</Label>
                                    <NumInput value={f.val} onChange={(v) => atualizar(banco.id, f.campo, v)} step={f.step || "0.01"} />
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Exige FGTS · Imóvel até R$500.000</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Configurações adicionais */}
                    {tipo === "residencial" && banco.id !== "caixa" && (
                      <>
                        <button
                          onClick={() => setExpandido(expandido === banco.id ? null : banco.id)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-slate-700 py-1.5 border-t border-dashed border-border bg-muted/20 transition-colors"
                        >
                          {expandido === banco.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandido === banco.id ? "Ocultar" : "Mais"} configurações (TAG, seguros, prazo)
                        </button>
                        {expandido === banco.id && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3 border-t border-border bg-muted/10">
                            {[
                              { label: "TAG (R$)", campo: "tag", val: banco.tag, suffix: "R$", step: "50" },
                              { label: "MIP a.a. (%)", campo: "mipAnual", val: banco.mipAnual, step: "0.001" },
                              { label: "DFI a.a. (%)", campo: "dfiAnual", val: banco.dfiAnual, step: "0.001" },
                              { label: "Prazo max (m)", campo: "maxPrazo", val: banco.maxPrazo, suffix: "m", step: "12" },
                              { label: "Mín. imóvel", campo: "minImovel", val: banco.minImovel, suffix: "R$", step: "1000" },
                            ].map(f => (
                              <div key={f.campo} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                                <NumInput value={f.val} onChange={(v) => atualizar(banco.id, f.campo, v)}
                                  suffix={f.suffix || "%"} step={f.step || "0.01"} />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                <p className="text-xs text-muted-foreground px-1 pt-1">
                  * LTV = percentual máximo financiável. Ex: 80% = entrada mínima de 20%.
                  {tipo === "residencial" && " Caixa PRICE = 50% por regra SBPE."}
                </p>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {fromSupabase ? "Suas taxas personalizadas" : "Valores padrão do mercado"}
          </p>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={resetar} disabled={salvando} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Descartar
            </Button>
            <Button size="sm" onClick={salvar} disabled={salvando || !user} className="gap-1.5 text-xs bg-[#7E22CE] hover:bg-[#6b21a8]">
              {salvando
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                : <><Save className="w-3.5 h-3.5" /> Salvar minhas taxas</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}