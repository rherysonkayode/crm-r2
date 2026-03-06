import { useState } from "react";
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
import { Plus, GripVertical, Trash2, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
  { value: "novo", label: "Novo", color: "border-blue-400" },
  { value: "contato", label: "Contato", color: "border-purple-400" },
  { value: "proposta", label: "Proposta", color: "border-amber-400" },
  { value: "fechado", label: "Fechado", color: "border-green-400" },
  { value: "perdido", label: "Perdido", color: "border-red-400" },
];

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
<<<<<<< HEAD
  
  // Estado para o modal de exclusão bonito
  const [deleteDealId, setDeleteDealId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", lead_id: "", property_id: "", value: "", stage: "novo",
=======

  const [form, setForm] = useState({
    title: "",
    lead_id: "",
    property_id: "",
    value: "",
    stage: "novo",
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
  });

  const resetForm = () => setForm({ title: "", lead_id: "", property_id: "", value: "", stage: "novo" });

  const handleCreate = async () => {
    if (!profile) return;
    if (!form.title.trim() && !form.lead_id) {
      toast.error("Informe um título ou selecione um lead");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

<<<<<<< HEAD
   const response = await fetch(
      "https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/hyper-api/deals",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          // A MÁGICA AQUI: Se for "none" (Nenhum) ou vazio, manda null para o banco aceitar
          lead_id: form.lead_id === "none" || form.lead_id === "" ? null : form.lead_id,
          property_id: form.property_id === "none" || form.property_id === "" ? null : form.property_id,
=======
    const response = await fetch(
      "https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/hyper-api/deals",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          lead_id: form.lead_id,
          property_id: form.property_id,
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
          value: parseFloat(form.value) || 0,
          stage: form.stage,
          company_id: profile.company_id,
          created_by: profile.id,
<<<<<<< HEAD
          assigned_to: profile.id, 
=======
          assigned_to: profile.id,
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
        }),
      }
    );

    const result = await response.json();
<<<<<<< HEAD
    if (!result.success) { toast.error("Erro ao criar negócio: " + result.error); return; }
    toast.success("Negócio criado com sucesso!");
=======
    if (!result.success) {
      toast.error("Erro ao criar negócio: " + result.error);
      return;
    }

    toast.success("Negócio criado!");
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setDialogOpen(false);
    resetForm();
  };

<<<<<<< HEAD
  const confirmDelete = async () => {
    if (!deleteDealId) return;
    const { error } = await supabase.from("deals").delete().eq("id", deleteDealId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Negócio excluído!");
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setDeleteDealId(null);
=======
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este negócio?")) return;
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Negócio excluído!");
    queryClient.invalidateQueries({ queryKey: ["deals"] });
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
  };

  const handleDrop = async (newStage: string) => {
    if (!draggedDeal) return;
<<<<<<< HEAD
=======

    // Se for para a coluna "fechado", pedir confirmação
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
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
<<<<<<< HEAD
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
=======
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
        body: JSON.stringify({ stage: newStage }),
      }
    );

    const result = await response.json();
<<<<<<< HEAD
    if (!result.success) { toast.error("Erro ao mover negócio: " + result.error); return; }
=======
    if (!result.success) {
      toast.error("Erro ao mover negócio: " + result.error);
      return;
    }

>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setDraggedDeal(null);
    setPendingDrop(null);
  };

  const handleMoveDeal = async (dealId: string, newStage: string) => {
    if (!newStage) return;
<<<<<<< HEAD
=======

    // Se for para "fechado", pedir confirmação
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
    if (newStage === "fechado") {
      setPendingDrop({ dealId, newStage });
      setConfirmDialogOpen(true);
    } else {
      await performMove(dealId, newStage);
      setMovingDeal(null);
      setMoveStage("");
    }
  };

  const formatCurrency = (val: number | null) =>
    val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "-";

  const totalPipeline = deals?.filter(d => d.stage !== "perdido").reduce((sum, d) => sum + (Number(d.value) || 0), 0) ?? 0;
  const totalFechado = deals?.filter(d => d.stage === "fechado").reduce((sum, d) => sum + (Number(d.value) || 0), 0) ?? 0;
  const totalNegocios = deals?.length ?? 0;

  const getDealLabel = (deal: any) => deal.title || deal.leads?.name || "Negócio";
  const getDealSub = (deal: any) => deal.properties?.title || null;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground">
              {isCorretor ? "Seus negócios em andamento" : "Pipeline de negócios da equipe"}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
<<<<<<< HEAD
              <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]"><Plus className="w-4 h-4 mr-2" />Novo Negócio</Button>
=======
              <Button><Plus className="w-4 h-4 mr-2" />Novo Negócio</Button>
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Negócio</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
<<<<<<< HEAD
=======

>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
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
                    <Label>Título do negócio *</Label>
<<<<<<< HEAD
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Venda Apto Centro" />
=======
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Ex: Venda Apto Centro"
                    />
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                    <p className="text-xs text-muted-foreground">Obrigatório quando não há lead selecionado</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Imóvel <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um imóvel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
<<<<<<< HEAD
                    <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="R$ 0,00" />
=======
                    <Input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      placeholder="R$ 0,00"
                    />
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
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

<<<<<<< HEAD
                <Button onClick={handleCreate} className="bg-[#7E22CE] hover:bg-[#6b21a8]">Criar Negócio</Button>
=======
                <Button onClick={handleCreate} className="bg-[#7E22CE] hover:bg-[#6b21a8]">
                  Criar Negócio
                </Button>
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
              </div>
            </DialogContent>
          </Dialog>
        </div>

<<<<<<< HEAD
=======
        {/* Cards de resumo */}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total de Negócios</p>
            <p className="text-3xl font-bold">{totalNegocios}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Pipeline Ativo</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPipeline)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Fechados</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalFechado)}</p>
          </div>
        </div>

<<<<<<< HEAD
=======
        {/* Kanban */}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = deals?.filter((d) => d.stage === stage.value) || [];
            const total = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

            return (
              <div
                key={stage.value}
                className={`flex-shrink-0 w-64 bg-muted/50 rounded-xl border-t-2 ${stage.color}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.value)}
              >
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
<<<<<<< HEAD
                    <span className="text-xs bg-background rounded-full px-2 py-0.5 text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  {total > 0 && <p className="text-xs text-muted-foreground mt-1">{formatCurrency(total)}</p>}
=======
                    <span className="text-xs bg-background rounded-full px-2 py-0.5 text-muted-foreground">
                      {stageDeals.length}
                    </span>
                  </div>
                  {total > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(total)}</p>
                  )}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {stageDeals.map((deal) => {
                    const sub = getDealSub(deal);
                    const isMoving = movingDeal === deal.id;
                    return (
                      <div
                        key={deal.id}
                        draggable
<<<<<<< HEAD
                        onDragStart={(e) => { setDraggedDeal(deal.id); e.dataTransfer.setData("text/plain", deal.id); }}
                        onDragEnd={() => setDraggedDeal(null)}
=======
                        onDragStart={(e) => {
                          setDraggedDeal(deal.id);
                          e.dataTransfer.setData("text/plain", deal.id);
                        }}
                        onDragEnd={() => {
                          setDraggedDeal(null);
                        }}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                        className="bg-card rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
<<<<<<< HEAD
                            <p className="font-medium text-sm text-card-foreground truncate">{getDealLabel(deal)}</p>
                            {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
                            {deal.value && <p className="text-sm font-bold text-[#7E22CE] mt-1">{formatCurrency(Number(deal.value))}</p>}
=======
                            <p className="font-medium text-sm text-card-foreground truncate">
                              {getDealLabel(deal)}
                            </p>
                            {sub && (
                              <p className="text-xs text-muted-foreground truncate">{sub}</p>
                            )}
                            {deal.value && (
                              <p className="text-sm font-bold text-[#7E22CE] mt-1">
                                {formatCurrency(Number(deal.value))}
                              </p>
                            )}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                          </div>

                          {!isMoving ? (
                            <button
<<<<<<< HEAD
                              onClick={() => { setMovingDeal(deal.id); setMoveStage(deal.stage); }}
=======
                              onClick={() => {
                                setMovingDeal(deal.id);
                                setMoveStage(deal.stage);
                              }}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-blue-50 shrink-0"
                              title="Mover para outra etapa"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
<<<<<<< HEAD
                              <select value={moveStage} onChange={(e) => setMoveStage(e.target.value)} className="text-xs border rounded p-0.5" autoFocus>
                                <option value="">Mover para...</option>
                                {stages.map(s => (
                                  <option key={s.value} value={s.value} disabled={s.value === deal.stage}>{s.label}</option>
                                ))}
                              </select>
                              <button onClick={() => handleMoveDeal(deal.id, moveStage)} className="text-xs bg-green-500 text-white px-1 py-0.5 rounded">OK</button>
                              <button onClick={() => { setMovingDeal(null); setMoveStage(""); }} className="text-xs bg-gray-300 px-1 py-0.5 rounded">X</button>
=======
                              <select
                                value={moveStage}
                                onChange={(e) => setMoveStage(e.target.value)}
                                className="text-xs border rounded p-0.5"
                                autoFocus
                              >
                                <option value="">Mover para...</option>
                                {stages.map(s => (
                                  <option key={s.value} value={s.value} disabled={s.value === deal.stage}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleMoveDeal(deal.id, moveStage)}
                                className="text-xs bg-green-500 text-white px-1 py-0.5 rounded"
                              >
                                OK
                              </button>
                              <button
                                onClick={() => {
                                  setMovingDeal(null);
                                  setMoveStage("");
                                }}
                                className="text-xs bg-gray-300 px-1 py-0.5 rounded"
                              >
                                X
                              </button>
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                            </div>
                          )}

                          <button
<<<<<<< HEAD
                            onClick={() => setDeleteDealId(deal.id)}
=======
                            onClick={() => handleDelete(deal.id)}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
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

<<<<<<< HEAD
        {/* Modal de Fechamento de Venda */}
=======
        {/* Diálogo de confirmação para venda */}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar venda</AlertDialogTitle>
              <AlertDialogDescription>
                Ao mover este negócio para "Fechado", o imóvel associado será marcado como "Vendido". Esta ação não poderá ser desfeita automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDrop(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
<<<<<<< HEAD
                onClick={() => { if (pendingDrop) performMove(pendingDrop.dealId, pendingDrop.newStage); }}
=======
                onClick={() => {
                  if (pendingDrop) {
                    performMove(pendingDrop.dealId, pendingDrop.newStage);
                  }
                }}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmar venda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
<<<<<<< HEAD

        {/* Modal de Exclusão de Negócio (Novo) */}
        <AlertDialog open={!!deleteDealId} onOpenChange={(isOpen) => !isOpen && setDeleteDealId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Negócio Permanentemente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este negócio do funil? Esta ação não poderá ser desfeita. (Nota: O Lead e o Imóvel associados NÃO serão apagados).
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

=======
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
      </motion.div>
    </AppLayout>
  );
};

export default Funnel;