import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, Save, RotateCcw, Info, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BancoConfig, useTaxasBancarias } from "@/hooks/useTaxasBancarias";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (bancos: BancoConfig[]) => void;
};

const TIPOS = [
  { id: "residencial" as const, label: "Residencial" },
  { id: "comercial" as const, label: "Comercial" },
  { id: "rural" as const, label: "Rural" },
];

export const ModalTaxasBancarias = ({ open, onClose, onSaved }: Props) => {
  const { bancos, salvando, salvar, restaurarPadrao } = useTaxasBancarias();
  const [draft, setDraft] = useState<BancoConfig[]>([]);
  const [expandido, setExpandido] = useState<string | null>("caixa");
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  useEffect(() => {
    if (open) {
      // Cria uma cópia profunda para não editar o estado global antes de clicar em salvar
      setDraft(JSON.parse(JSON.stringify(bancos)));
      setConfirmandoReset(false);
    }
  }, [open, bancos]);

  const atualizarTaxa = (
    bancoId: string,
    tipo: "residencial" | "comercial" | "rural",
    sistema: "price" | "sac",
    valor: string
  ) => {
    const num = parseFloat(valor.replace(",", "."));
    setDraft((prev) =>
      prev.map((b) =>
        b.id === bancoId
          ? { ...b, taxas: { ...b.taxas, [tipo]: { ...b.taxas[tipo], [sistema]: isNaN(num) ? 0 : num } } }
          : b
      )
    );
  };

  const atualizarCampo = (bancoId: string, campo: "maxPrazo" | "minEntradaPercent", valor: string) => {
    const num = parseInt(valor);
    setDraft((prev) =>
      prev.map((b) => (b.id === bancoId ? { ...b, [campo]: isNaN(num) ? 0 : num } : b))
    );
  };

  const handleSalvar = async () => {
    const sucesso = await salvar(draft);
    if (sucesso) {
      toast.success("Taxas salvas com sucesso!");
      onSaved(draft);
      onClose();
    } else {
      toast.warning("Salvo localmente — erro ao sincronizar com o servidor.");
      onSaved(draft);
      onClose();
    }
  };

  const handleRestaurar = async () => {
    if (!confirmandoReset) {
      setConfirmandoReset(true);
      return;
    }
    const sucesso = await restaurarPadrao();
    if (sucesso) {
      toast.success("Taxas restauradas para os valores padrão.");
      onSaved(bancos);
      onClose();
    }
    setConfirmandoReset(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-[#7E22CE]">🏦</span> Taxas dos Bancos
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2 text-sm">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            Estas taxas são estimativas personalizadas. Os valores ficam salvos na sua conta e são usados nas simulações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {draft.map((banco) => {
            const aberto = expandido === banco.id;
            return (
              <div key={banco.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandido(aberto ? null : banco.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  style={{ borderLeft: `4px solid ${banco.cor}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: banco.cor, color: banco.corTexto }}
                    >
                      {banco.sigla}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm text-slate-800">{banco.nome}</p>
                      <p className="text-xs text-slate-500">
                        Padrão: {banco.taxas.residencial.price}% (PRICE) · {banco.taxas.residencial.sac}% (SAC)
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", aberto && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {aberto && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 space-y-4 bg-slate-50/50">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Taxas anuais (%)
                          </p>
                          <div className="space-y-3">
                            {TIPOS.map(({ id, label }) => (
                              <div key={id} className="grid grid-cols-3 gap-3 items-center">
                                <Label className="text-sm text-slate-600">{label}</Label>
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400 font-medium">PRICE</p>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="30"
                                    value={draft.find((b) => b.id === banco.id)?.taxas[id].price ?? ""}
                                    onChange={(e) => atualizarTaxa(banco.id, id, "price", e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400 font-medium">SAC</p>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="30"
                                    value={draft.find((b) => b.id === banco.id)?.taxas[id].sac ?? ""}
                                    onChange={(e) => atualizarTaxa(banco.id, id, "sac", e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Configurações do Banco
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-sm text-slate-600">Prazo máximo (meses)</Label>
                              <Input
                                type="number"
                                min="60"
                                max="480"
                                value={draft.find((b) => b.id === banco.id)?.maxPrazo ?? ""}
                                onChange={(e) => atualizarCampo(banco.id, "maxPrazo", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm text-slate-600">Entrada mínima (%)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={draft.find((b) => b.id === banco.id)?.minEntradaPercent ?? ""}
                                onChange={(e) => atualizarCampo(banco.id, "minEntradaPercent", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestaurar}
            disabled={salvando}
            className={cn(
              "gap-2 text-slate-500 hover:text-slate-700",
              confirmandoReset && "text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {confirmandoReset ? "Confirmar reset?" : "Restaurar padrão"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-[#7E22CE] hover:bg-[#6b21a8] gap-2"
            >
              {salvando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Salvar taxas
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};