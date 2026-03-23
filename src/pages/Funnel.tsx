import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDeals, useLeads, useProperties } from "@/hooks/useCompanyData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, GripVertical, Trash2, ArrowRight, X, User, Home, DollarSign, Tag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const stages = [
  { value: "novo",        label: "Novo",        color: "border-blue-400" },
  { value: "contato",     label: "Contato",     color: "border-purple-400" },
  { value: "qualificado", label: "Qualificado", color: "border-yellow-400" },
  { value: "proposta",    label: "Proposta",    color: "border-amber-400" },
  { value: "convertido",  label: "Convertido",  color: "border-emerald-400" },
  { value: "fechado",     label: "Fechado",     color: "border-green-400" },
  { value: "perdido",     label: "Perdido",     color: "border-red-400" },
];

const stageBadge: Record<string, string> = {
  novo:        "bg-blue-100 text-blue-700",
  contato:     "bg-purple-100 text-purple-700",
  qualificado: "bg-yellow-100 text-yellow-700",
  proposta:    "bg-amber-100 text-amber-700",
  convertido:  "bg-emerald-100 text-emerald-700",
  fechado:     "bg-green-100 text-green-700",
  perdido:     "bg-red-100 text-red-700",
};

const Funnel = () => {
  const { data: deals } = useDeals();
  const { data: leads } = useLeads();
  const { data: properties } = useProperties();
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);
  const [movingDeal, setMovingDeal] = useState<string | null>(null);
  const [moveStage, setMoveStage] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ dealId: string; newStage: string } | null>(null);
  const [deleteDealId, setDeleteDealId] = useState<string | null>(null);
  const [viewingDeal, setViewingDeal] = useState<any | null>(null);
  
  // NOVOS ESTADOS PARA DRAG & DROP NO MOBILE
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isTouchDragging = useRef(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", lead_id: "", property_id: "", value: "", stage: "novo",
  });

  const resetForm = () => setForm({ title: "", lead_id: "", property_id: "", value: "", stage: "novo" });

  const handleCreate = async () => {
    if (!profile) return;
    if (!form.title.trim() && !form.lead_id) {
      toast.error("Informe um titulo ou selecione um lead");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch(
      "https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/hyper-api/deals",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          lead_id: form.lead_id === "none" || form.lead_id === "" ? null : form.lead_id,
          property_id: form.property_id === "none" || form.property_id === "" ? null : form.property_id,
          value: parseFloat(form.value) || 0,
          stage: form.stage,
          company_id: profile.company_id,
          created_by: profile.id,
          assigned_to: profile.id,
        }),
      }
    );

    const result = await response.json();
    if (!result.success) { toast.error("Erro ao criar negocio: " + result.error); return; }
    toast.success("Negocio criado com sucesso!");
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setDialogOpen(false);
    resetForm();
  };

  const confirmDelete = async () => {
    if (!deleteDealId) return;
    const { error } = await supabase.from("deals").delete().eq("id", deleteDealId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Negocio excluido!");
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setDeleteDealId(null);
  };

  const handleDrop = async (newStage: string) => {
    if (!draggedDeal) return;
    if (newStage === "fechado") {
      setPendingDrop({ dealId: draggedDeal, newStage });
      setConfirmDialogOpen(true);
    } else {
      await performMove(draggedDeal, newStage);
    }
  };

  const performMove = async (dealId: string, newStage: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch(
      `https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/hyper-api/deals?id=${dealId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stage: newStage }),
      }
    );

    const result = await response.json();
    if (!result.success) { toast.error("Erro ao mover negocio: " + result.error); return; }

    const deal = deals?.find(d => d.id === dealId);
    if (deal?.lead_id) {
      if (newStage === "fechado") {
        await supabase.from("leads").update({ status: "convertido" }).eq("id", deal.lead_id);
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      } else if (newStage === "perdido") {
        await supabase.from("leads").update({ status: "perdido" }).eq("id", deal.lead_id);
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setDraggedDeal(null);
    setPendingDrop(null);
    setMovingDeal(null);
    setMoveStage("");
    setDragOverStage(null);
  };

  const handleMoveDeal = async (dealId: string, newStage: string) => {
    if (!newStage) return;
    if (newStage === "fechado") {
      setPendingDrop({ dealId, newStage });
      setConfirmDialogOpen(true);
    } else {
      await performMove(dealId, newStage);
    }
  };

  // ── Drag & Drop: Touch (mobile) para Funnel ───────────────────────────────
  const handleTouchStart = (dealId: string, e: React.TouchEvent) => {
    setDraggedDeal(dealId);
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isTouchDragging.current = false;
  };

  const getStageFromPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const stageEl = el?.closest("[data-stage]") as HTMLElement | null;
    return stageEl?.dataset.stage ?? null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 8 || dy > 8) {
      isTouchDragging.current = true;
      const stageId = getStageFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      setDragOverStage(stageId);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (isTouchDragging.current && draggedDeal) {
      const t = e.changedTouches[0];
      const stageId = getStageFromPoint(t.clientX, t.clientY);
      if (stageId !== null) {
        await handleDrop(stageId);
      }
    }
    setDraggedDeal(null);
    touchStartPos.current = null;
    isTouchDragging.current = false;
    setDragOverStage(null);
  };

  const formatCurrency = (val: number | null) =>
    val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "-";

  const totalPipeline = deals?.filter(d => d.stage !== "perdido").reduce((sum, d) => sum + (Number(d.value) || 0), 0) ?? 0;
  const totalFechado = deals?.filter(d => d.stage === "fechado").reduce((sum, d) => sum + (Number(d.value) || 0), 0) ?? 0;
  const totalNegocios = deals?.length ?? 0;

  const getDealLabel = (deal: any) => deal.title || deal.leads?.name || "Negocio";
  const getDealSub = (deal: any) => deal.properties?.title || null;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground">
              {isCorretor ? "Seus negocios em andamento" : "Pipeline de negocios da equipe"}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]"><Plus className="w-4 h-4 mr-2" />Novo Negocio</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Negocio</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Lead <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {leads?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {!form.lead_id && (
                  <div className="space-y-2">
                    <Label>Titulo do negocio *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Venda Apto Centro" />
                    <p className="text-xs text-muted-foreground">Obrigatorio quando nao ha lead selecionado</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Imovel <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um imovel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="R$ 0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Etapa inicial</Label>
                    <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stages.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleCreate} className="bg-[#7E22CE] hover:bg-[#6b21a8]">Criar Negocio</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total de Negocios</p>
            <p className="text-3xl font-bold">{totalNegocios}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Pipeline Ativo</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-600 break-all">{formatCurrency(totalPipeline)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Fechados</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalFechado)}</p>
          </div>
        </div>

        {/* Colunas do Kanban - CORRIGIDO PARA SUPORTAR TOUCH */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = deals?.filter((d) => d.stage === stage.value) || [];
            const total = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
            const isOver = dragOverStage === stage.value;

            return (
              <div
                key={stage.value}
                data-stage={stage.value}
                className={`flex-shrink-0 w-64 bg-muted/50 rounded-xl border-t-2 ${stage.color} transition-colors ${isOver ? "bg-purple-100 border-purple-400" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.value)}
              >
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
                    <span className="text-xs bg-background rounded-full px-2 py-0.5 text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  {total > 0 && <p className="text-xs text-muted-foreground mt-1">{formatCurrency(total)}</p>}
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {stageDeals.map((deal) => {
                    const sub = getDealSub(deal);
                    const isMoving = movingDeal === deal.id;
                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => { setDraggedDeal(deal.id); e.dataTransfer.setData("text/plain", deal.id); }}
                        onDragEnd={() => setDraggedDeal(null)}
                        onTouchStart={(e) => handleTouchStart(deal.id, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="bg-card rounded-lg border border-border p-3 cursor-pointer hover:shadow-md transition-shadow group touch-none select-none"
                        onClick={() => !isMoving && setViewingDeal(deal)}
                        style={{ WebkitUserSelect: "none", userSelect: "none" }}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-card-foreground truncate">{getDealLabel(deal)}</p>
                            {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
                            {deal.value && <p className="text-sm font-bold text-[#7E22CE] mt-1">{formatCurrency(Number(deal.value))}</p>}
                          </div>

                          {!isMoving ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setMovingDeal(deal.id); setMoveStage(deal.stage); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-blue-50 shrink-0"
                              title="Mover para outra etapa"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <select value={moveStage} onChange={(e) => setMoveStage(e.target.value)} className="text-xs border rounded p-0.5" autoFocus>
                                <option value="">Mover para...</option>
                                {stages.map(s => (
                                  <option key={s.value} value={s.value} disabled={s.value === deal.stage}>{s.label}</option>
                                ))}
                              </select>
                              <button onClick={() => handleMoveDeal(deal.id, moveStage)} className="text-xs bg-green-500 text-white px-1 py-0.5 rounded">OK</button>
                              <button onClick={() => { setMovingDeal(null); setMoveStage(""); }} className="text-xs bg-gray-300 px-1 py-0.5 rounded">X</button>
                            </div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteDealId(deal.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de detalhes do negocio */}
        {viewingDeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewingDeal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{getDealLabel(viewingDeal)}</h2>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block", stageBadge[viewingDeal.stage] || "bg-slate-100 text-slate-600")}>
                    {stages.find(s => s.value === viewingDeal.stage)?.label || viewingDeal.stage}
                  </span>
                </div>
                <button onClick={() => setViewingDeal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {viewingDeal.leads?.name && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <User className="w-4 h-4 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Lead vinculado</p>
                      <p className="font-medium text-slate-700">{viewingDeal.leads.name}</p>
                    </div>
                  </div>
                )}

                {viewingDeal.properties?.title && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Home className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Imovel</p>
                      <p className="font-medium text-slate-700">{viewingDeal.properties.title}</p>
                    </div>
                  </div>
                )}

                {viewingDeal.value && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Valor</p>
                      <p className="font-bold text-[#7E22CE]">{formatCurrency(Number(viewingDeal.value))}</p>
                    </div>
                  </div>
                )}

                {viewingDeal.created_at && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                    <span>Criado em:</span>
                    <span className="font-medium text-slate-500">
                      {new Date(viewingDeal.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setDeleteDealId(viewingDeal.id); setViewingDeal(null); }}
                >
                  <Trash2 className="w-4 h-4 mr-2 text-red-400" /> Excluir
                </Button>
                <Button
                  className="flex-1 bg-[#7E22CE] hover:bg-purple-700"
                  onClick={() => { setMovingDeal(viewingDeal.id); setMoveStage(viewingDeal.stage); setViewingDeal(null); }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" /> Mover etapa
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Confirmacao de Fechamento */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar venda</AlertDialogTitle>
              <AlertDialogDescription>
                Ao mover este negocio para "Fechado", o lead associado sera marcado como "Convertido". Esta acao nao podera ser desfeita automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDrop(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (pendingDrop) performMove(pendingDrop.dealId, pendingDrop.newStage); }}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmar venda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Exclusao */}
        <AlertDialog open={!!deleteDealId} onOpenChange={(isOpen) => !isOpen && setDeleteDealId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Negocio</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este negocio do funil? O Lead e o Imovel associados NAO serao apagados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Sim, excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AppLayout>
  );
};

export default Funnel;