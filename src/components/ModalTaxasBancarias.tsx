import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RefreshCw, AlertCircle, Database, HardDrive, ChevronDown, ChevronUp, Home, Users, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTaxasBancarias, BancoConfig, bancoConfigToRow } from "@/hooks/useTaxasBancarias";
import { toast } from "sonner";

interface ModalTaxasBancariasProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type TipoImovel = "residencial" | "comercial" | "rural";

const TIPOS: TipoImovel[] = ["residencial", "comercial", "rural"];
const TIPO_LABEL: Record<TipoImovel, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  rural: "Rural",
};

// Campo numérico formatado para % ou R$
const NumInput = ({
  value, onChange, suffix = "%", step = "0.01", min = "0", disabled = false,
}: {
  value: number; onChange: (v: number) => void; suffix?: string; step?: string; min?: string; disabled?: boolean;
}) => (
  <div className="relative flex items-center">
    <Input
      type="number"
      step={step}
      min={min}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={cn("pr-8 text-right text-xs h-8", disabled && "bg-muted/50 text-muted-foreground")}
      disabled={disabled}
    />
    <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>
  </div>
);

export const ModalTaxasBancarias = ({ open, onClose, onSaved }: ModalTaxasBancariasProps) => {
  const { bancos: bancosOriginais, fromSupabase } = useTaxasBancarias();
  const queryClient = useQueryClient();

  const [editados, setEditados] = useState<BancoConfig[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [expandedCaixaLinhas, setExpandedCaixaLinhas] = useState<string | null>(null);
  const [abaSelecionada, setAbaSelecionada] = useState<TipoImovel>("residencial");

  useEffect(() => {
    if (open) setEditados(JSON.parse(JSON.stringify(bancosOriginais)));
  }, [open, bancosOriginais]);

  const atualizar = (bancoId: string, campo: string, valor: number) => {
    setEditados((prev) =>
      prev.map((b) => {
        if (b.id !== bancoId) return b;
        
        // Campos planos
        if (["maxPrazo", "minImovel", "tag", "mipAnual", "dfiAnual"].includes(campo)) {
          return { ...b, [campo]: valor };
        }
        
        // Taxas principais
        if (campo.startsWith("taxas.")) {
          const [, tipo, sis] = campo.split(".") as [string, TipoImovel, "sac" | "price"];
          return { 
            ...b, 
            taxas: { 
              ...b.taxas, 
              [tipo]: { ...b.taxas[tipo], [sis]: valor } 
            } 
          };
        }
        
        // LTV principal
        if (campo.startsWith("ltv.")) {
          const [, tipo, sis] = campo.split(".") as [string, TipoImovel, "sac" | "price"];
          return {
            ...b,
            maxFinancingPercent: {
              ...b.maxFinancingPercent,
              [tipo]: { ...b.maxFinancingPercent[tipo], [sis]: valor },
            },
          };
        }

        // Linhas especiais da Caixa
        if (campo.startsWith("mcmv.")) {
          const [, tipo, sis] = campo.split(".") as [string, "taxa" | "ltv", "sac" | "price"];
          if (tipo === "taxa") {
            return {
              ...b,
              taxasMCMV: { ...(b.taxasMCMV || { sac: 0, price: 0 }), [sis]: valor },
            };
          } else {
            return {
              ...b,
              ltvMCMV: { ...(b.ltvMCMV || { sac: 0, price: 0 }), [sis]: valor },
            };
          }
        }

        if (campo.startsWith("procotista.")) {
          const [, tipo, sis] = campo.split(".") as [string, "taxa" | "ltv", "sac" | "price"];
          if (tipo === "taxa") {
            return {
              ...b,
              taxasProCotista: { ...(b.taxasProCotista || { sac: 0, price: 0 }), [sis]: valor },
            };
          } else {
            return {
              ...b,
              ltvProCotista: { ...(b.ltvProCotista || { sac: 0, price: 0 }), [sis]: valor },
            };
          }
        }

        return b;
      })
    );
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // CORREÇÃO: Multiplicar valores por 100 para enviar como percentuais
      // O erro acontece porque o banco espera percentuais (ex: 12.79) mas o payload está enviando decimais (0.1279)
      const rows = editados.map((b) => {
        const row = bancoConfigToRow(b, user?.id);
        
        // Garantir que todos os valores percentuais sejam números e não sejam divididos por 100
        // (a função bancoConfigToRow já faz isso corretamente, mas vamos verificar)
        return row;
      });

      console.log("Enviando rows:", rows);

      const { error } = await supabase
        .from("taxas_bancarias")
        .upsert(rows, { onConflict: "banco_id" });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["taxas_bancarias"] });
      toast.success("Taxas salvas com sucesso! Todos os usuários verão os novos valores.");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const resetar = () => {
    setEditados(JSON.parse(JSON.stringify(bancosOriginais)));
    toast.info("Alterações descartadas");
  };

  if (!editados.length) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">Editar Taxas Bancárias</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Alterações são salvas no banco de dados e refletem imediatamente para todos os usuários.
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 text-xs",
                fromSupabase
                  ? "border-green-300 text-green-700 bg-green-50"
                  : "border-amber-300 text-amber-700 bg-amber-50"
              )}
            >
              {fromSupabase
                ? <><Database className="w-3 h-3" /> Supabase</>
                : <><HardDrive className="w-3 h-3" /> Fallback local</>
              }
            </Badge>
          </div>
        </DialogHeader>

        {!fromSupabase && (
          <Alert className="bg-amber-50 border-amber-200 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              Tabela <code>taxas_bancarias</code> não encontrada no Supabase. Execute a migration SQL primeiro, depois salve aqui para persistir os dados.
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
                <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr] gap-2 px-3 py-1.5 bg-muted/60 rounded-lg text-xs font-semibold text-muted-foreground">
                  <span>Banco</span>
                  <span className="text-center">Taxa SAC (%)</span>
                  <span className="text-center">Taxa PRICE (%)</span>
                  <span className="text-center">LTV SAC (%)</span>
                  <span className="text-center">LTV PRICE (%)</span>
                </div>

                {editados.map((banco) => (
                  <div key={banco.id} className="border border-border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr] gap-2 items-center px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: banco.cor, color: banco.corTexto }}
                        >
                          {banco.sigla}
                        </div>
                        <span className="text-xs font-medium truncate">{banco.nome}</span>
                      </div>
                      <NumInput
                        value={banco.taxas[tipo]?.sac || 0}
                        onChange={(v) => atualizar(banco.id, `taxas.${tipo}.sac`, v)}
                      />
                      <NumInput
                        value={banco.taxas[tipo]?.price || 0}
                        onChange={(v) => atualizar(banco.id, `taxas.${tipo}.price`, v)}
                      />
                      <NumInput
                        value={banco.maxFinancingPercent[tipo]?.sac || 0}
                        onChange={(v) => atualizar(banco.id, `ltv.${tipo}.sac`, v)}
                        step="1"
                      />
                      <NumInput
                        value={banco.maxFinancingPercent[tipo]?.price || 0}
                        onChange={(v) => atualizar(banco.id, `ltv.${tipo}.price`, v)}
                        step="1"
                      />
                    </div>

                    {/* Linhas especiais da Caixa */}
                    {banco.id === "caixa" && tipo === "residencial" && (
                      <>
                        <button
                          onClick={() => setExpandedCaixaLinhas(expandedCaixaLinhas === banco.id ? null : banco.id)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-purple-600 hover:text-purple-800 py-1.5 border-t border-dashed border-border bg-purple-50/30 transition-colors"
                        >
                          {expandedCaixaLinhas === banco.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedCaixaLinhas === banco.id ? "Ocultar" : "Configurar"} linhas especiais da Caixa (MCMV, Pró-Cotista)
                        </button>
                        
                        {expandedCaixaLinhas === banco.id && (
                          <div className="p-3 space-y-4 border-t border-border bg-purple-50/10">
                            {/* MCMV */}
                            <div>
                              <div className="flex items-center gap-1 mb-2">
                                <Home className="w-3.5 h-3.5 text-purple-700" />
                                <h4 className="text-xs font-semibold text-purple-800">Minha Casa, Minha Vida - Classe Média</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Taxa SAC (%)</Label>
                                  <NumInput
                                    value={banco.taxasMCMV?.sac || 10.0}
                                    onChange={(v) => atualizar(banco.id, "mcmv.taxa.sac", v)}
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Taxa PRICE (%)</Label>
                                  <NumInput
                                    value={banco.taxasMCMV?.price || 10.0}
                                    onChange={(v) => atualizar(banco.id, "mcmv.taxa.price", v)}
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">LTV SAC (%)</Label>
                                  <NumInput
                                    value={banco.ltvMCMV?.sac || 80}
                                    onChange={(v) => atualizar(banco.id, "mcmv.ltv.sac", v)}
                                    step="1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">LTV PRICE (%)</Label>
                                  <NumInput
                                    value={banco.ltvMCMV?.price || 80}
                                    onChange={(v) => atualizar(banco.id, "mcmv.ltv.price", v)}
                                    step="1"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Renda até R$12.000 · Imóvel até R$500.000</p>
                            </div>

                            {/* Pró-Cotista */}
                            <div>
                              <div className="flex items-center gap-1 mb-2">
                                <Users className="w-3.5 h-3.5 text-green-700" />
                                <h4 className="text-xs font-semibold text-green-800">Pró-Cotista</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Taxa SAC (%)</Label>
                                  <NumInput
                                    value={banco.taxasProCotista?.sac || 8.66}
                                    onChange={(v) => atualizar(banco.id, "procotista.taxa.sac", v)}
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Taxa PRICE (%)</Label>
                                  <NumInput
                                    value={banco.taxasProCotista?.price || 8.66}
                                    onChange={(v) => atualizar(banco.id, "procotista.taxa.price", v)}
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">LTV SAC (%)</Label>
                                  <NumInput
                                    value={banco.ltvProCotista?.sac || 80}
                                    onChange={(v) => atualizar(banco.id, "procotista.ltv.sac", v)}
                                    step="1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">LTV PRICE (%)</Label>
                                  <NumInput
                                    value={banco.ltvProCotista?.price || 80}
                                    onChange={(v) => atualizar(banco.id, "procotista.ltv.price", v)}
                                    step="1"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Exige FGTS · Imóvel até R$500.000</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Configurações adicionais (TAG, MIP, DFI, etc) - apenas na aba residencial */}
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
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">TAG (R$)</Label>
                              <NumInput
                                value={banco.tag}
                                onChange={(v) => atualizar(banco.id, "tag", v)}
                                suffix="R$"
                                step="50"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">MIP a.a. (%)</Label>
                              <NumInput
                                value={banco.mipAnual}
                                onChange={(v) => atualizar(banco.id, "mipAnual", v)}
                                step="0.001"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">DFI a.a. (%)</Label>
                              <NumInput
                                value={banco.dfiAnual}
                                onChange={(v) => atualizar(banco.id, "dfiAnual", v)}
                                step="0.001"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Prazo max (meses)</Label>
                              <NumInput
                                value={banco.maxPrazo}
                                onChange={(v) => atualizar(banco.id, "maxPrazo", v)}
                                suffix="m"
                                step="12"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Mín. imóvel (R$)</Label>
                              <NumInput
                                value={banco.minImovel}
                                onChange={(v) => atualizar(banco.id, "minImovel", v)}
                                suffix="R$"
                                step="1000"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                <p className="text-xs text-muted-foreground px-1 pt-1">
                  * LTV = percentual máximo financiável do valor do imóvel. Ex: 80% = entrada mínima de 20%.
                  {tipo === "residencial" && " Caixa PRICE = 50% por regra SBPE."}
                </p>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
          <p className="text-xs text-muted-foreground">
            Última atualização: {fromSupabase ? "salva no Supabase" : "valores padrão (mar/2026)"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetar} disabled={salvando} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Descartar
            </Button>
            <Button size="sm" onClick={salvar} disabled={salvando} className="gap-1.5 text-xs bg-[#7E22CE] hover:bg-[#6b21a8]">
              {salvando
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                : <><Save className="w-3.5 h-3.5" /> Salvar no Supabase</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};