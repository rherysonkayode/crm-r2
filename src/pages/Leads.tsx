import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useLeads, useProfiles } from "@/hooks/useCompanyData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, Users, User, LayoutList, Columns, GripVertical, Settings2, X, ArrowRight } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "novo", label: "Novo" },
  { value: "contato", label: "Contato" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta", label: "Proposta" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

const sourceOptions = ["Site", "Indicação", "Portal", "Redes Sociais", "Telefone", "Outro"];

const statusColors: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700",
  contato: "bg-purple-100 text-purple-700",
  qualificado: "bg-amber-100 text-amber-700",
  proposta: "bg-orange-100 text-orange-700",
  convertido: "bg-green-100 text-green-700",
  perdido: "bg-red-100 text-red-700",
};

const columnColors = [
  "#7E22CE", "#2563EB", "#16A34A", "#D97706", "#DC2626",
  "#0891B2", "#9333EA", "#BE185D", "#65A30D", "#EA580C",
];

const useKanbanColumns = (profileId?: string, companyId?: string | null) => {
  return useQuery({
    queryKey: ["kanban_columns", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kanban_columns")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profileId,
  });
};

const formatPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "").slice(0, 15);
};

const formatCPF = (v: string) => {
  v = v.replace(/\D/g, "");
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4").slice(0, 14);
};

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const Leads = () => {
  const { data: leads, isLoading } = useLeads();
  const { data: profiles } = useProfiles();
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const { data: kanbanColumns, refetch: refetchColumns } = useKanbanColumns(profile?.id, profile?.company_id);
  const queryClient = useQueryClient();

  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCorretor, setFilterCorretor] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [movingLead, setMovingLead] = useState<string | null>(null);
  const [moveColumn, setMoveColumn] = useState<string>("");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColColor, setNewColColor] = useState("#7E22CE");

  const [form, setForm] = useState({
    name: "", phone: "", cpf: "", email: "", source: "", notes: "",
    status: "novo" as "novo" | "contato" | "qualificado" | "proposta" | "convertido" | "perdido",
    assigned_to: "",
  });

  const resetForm = () => {
    setForm({ name: "", phone: "", cpf: "", email: "", source: "", status: "novo", assigned_to: "", notes: "" });
    setEditingLead(null);
  };

  const handleSave = async () => {
    if (!profile || !form.name.trim()) { toast.error("Informe o nome do lead"); return; }
    if (form.email && !isValidEmail(form.email)) { toast.error("Por favor, insira um e-mail válido"); return; }
    const payload = {
      ...form,
      company_id: profile.company_id ?? null,
      assigned_to: isCorretor ? profile.id : (form.assigned_to || null),
    };
    let error;
    if (editingLead) {
      ({ error } = await supabase.from("leads").update(payload).eq("id", editingLead.id));
    } else {
      ({ error } = await supabase.from("leads").insert(payload as any));
    }
    if (error) { toast.error("Erro ao salvar lead: " + error.message); return; }
    toast.success(editingLead ? "Lead atualizado!" : "Lead criado!");
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setDialogOpen(false);
    resetForm();
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    const { error } = await supabase.from("leads").delete().eq("id", deleteLeadId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Lead excluído com sucesso!");
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setDeleteLeadId(null);
  };

  const openEdit = (lead: any) => {
    if (isCorretor && lead.assigned_to !== profile?.id) { toast.error("Você só pode editar seus próprios leads."); return; }
    setForm({
      name: lead.name,
      phone: lead.phone || "",
      cpf: lead.cpf || "",
      email: lead.email || "",
      source: lead.source || "",
      status: lead.status,
      assigned_to: lead.assigned_to || "",
      notes: lead.notes || ""
    });
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedLead) return;
    const { error } = await supabase.from("leads").update({ kanban_column_id: columnId } as any).eq("id", draggedLead);
    if (error) { toast.error("Erro ao mover lead"); return; }
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setDraggedLead(null);
  };

  const handleMoveLead = async (leadId: string, newColumnId: string | null) => {
    const { error } = await supabase.from("leads").update({ kanban_column_id: newColumnId } as any).eq("id", leadId);
    if (error) { toast.error("Erro ao mover lead"); return; }
    toast.success("Lead movido!");
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setMovingLead(null);
    setMoveColumn("");
  };

  const handleCreateColumn = async () => {
    if (!newColName.trim() || !profile) return;
    const { error } = await supabase.from("kanban_columns").insert({
      name: newColName, color: newColColor, position: (kanbanColumns?.length ?? 0), company_id: profile.company_id ?? null, created_by: profile.id,
    } as any);
    if (error) { toast.error("Erro ao criar coluna: " + error.message); return; }
    toast.success("Coluna criada!");
    setNewColName("");
    setNewColColor("#7E22CE");
    refetchColumns();
  };

  const handleDeleteColumn = async (colId: string) => {
    await supabase.from("leads").update({ kanban_column_id: null } as any).eq("kanban_column_id", colId);
    const { error } = await supabase.from("kanban_columns").delete().eq("id", colId);
    if (error) { toast.error("Erro ao excluir coluna"); return; }
    toast.success("Coluna removida!");
    refetchColumns();
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const filtered = leads?.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchCorretor = isCorretor ? l.assigned_to === profile?.id : filterCorretor === "all" || l.assigned_to === filterCorretor;
    return matchSearch && matchStatus && matchCorretor;
  });

  const myLeads = leads?.filter((l) => l.assigned_to === profile?.id) ?? [];
  const totalLeads = leads?.length ?? 0;

  const LeadCard = ({ lead }: { lead: any }) => {
    const isMine = lead.assigned_to === profile?.id;
    const responsavel = profiles?.find(p => p.id === lead.assigned_to);
    const isMoving = movingLead === lead.id;

    return (
      <div
        draggable
        onDragStart={(e) => { setDraggedLead(lead.id); e.dataTransfer.setData("text/plain", lead.id); }}
        onDragEnd={() => setDraggedLead(null)}
        className="bg-white rounded-xl border border-slate-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <p className="font-semibold text-sm text-slate-800 truncate">{lead.name}</p>
          </div>
          <div className="flex gap-0.5 shrink-0">
            {!isMoving ? (
              <button
                onClick={() => { setMovingLead(lead.id); setMoveColumn(lead.kanban_column_id || ""); }}
                className="p-1 rounded hover:bg-blue-50 transition-colors"
                title="Mover para outra coluna"
              >
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              </button>
            ) : null}
            <button onClick={() => openEdit(lead)} className="p-1 rounded hover:bg-slate-100 transition-colors">
              <Pencil className="w-3 h-3 text-slate-400" />
            </button>
            {(isImobiliaria || isMine) && (
              <button onClick={() => setDeleteLeadId(lead.id)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            )}
          </div>
        </div>

        {isMoving && (
          <div className="mt-2 flex items-center gap-1">
            <select
              value={moveColumn}
              onChange={(e) => setMoveColumn(e.target.value)}
              className="text-xs border rounded p-1 flex-1"
              autoFocus
            >
              <option value="">Mover para...</option>
              {kanbanColumns?.map(col => (
                <option key={col.id} value={col.id} disabled={col.id === lead.kanban_column_id}>{col.name}</option>
              ))}
              <option value="null" disabled={!lead.kanban_column_id}>Sem coluna</option>
            </select>
            <button onClick={() => handleMoveLead(lead.id, moveColumn === "null" ? null : moveColumn)} className="text-xs bg-green-500 text-white px-2 py-1 rounded">OK</button>
            <button onClick={() => { setMovingLead(null); setMoveColumn(""); }} className="text-xs bg-gray-300 px-2 py-1 rounded">X</button>
          </div>
        )}

        <div className="mt-2 space-y-1">
          {lead.email && <p className="text-xs text-slate-400 truncate">{lead.email}</p>}
          {lead.phone && <p className="text-xs text-slate-400">{lead.phone}</p>}
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusColors[lead.status])}>
            {statusOptions.find(s => s.value === lead.status)?.label}
          </span>
          {isImobiliaria && responsavel && (
            <span className="text-[10px] text-slate-400">{responsavel.full_name}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              {isCorretor ? "Seus contatos e oportunidades" : "Todos os leads da imobiliária"}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setView("list")}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5", view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              >
                <LayoutList className="w-4 h-4" /> Lista
              </button>
              <button
                onClick={() => setView("kanban")}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5", view === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              >
                <Columns className="w-4 h-4" /> Kanban
              </button>
            </div>

            {view === "kanban" && (
              <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon"><Settings2 className="w-4 h-4" /></Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Gerenciar Colunas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      {kanbanColumns?.map(col => (
                        <div key={col.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                          <span className="text-sm font-medium flex-1">{col.name}</span>
                          <button onClick={() => handleDeleteColumn(col.id)} className="p-1 rounded hover:bg-red-50">
                            <X className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      ))}
                      {(!kanbanColumns || kanbanColumns.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma coluna criada ainda.</p>
                      )}
                    </div>
                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="text-sm font-semibold">Nova coluna</p>
                      <div className="flex gap-2">
                        <Input placeholder="Nome da coluna" value={newColName} onChange={(e) => setNewColName(e.target.value)} className="flex-1" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cor</Label>
                        <div className="flex gap-2 flex-wrap">
                          {columnColors.map(c => (
                            <button
                              key={c}
                              onClick={() => setNewColColor(c)}
                              className={cn("w-6 h-6 rounded-full transition-transform hover:scale-110", newColColor === c && "ring-2 ring-offset-2 ring-slate-400 scale-110")}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <Button onClick={handleCreateColumn} className="w-full bg-[#7E22CE]" disabled={!newColName.trim()}>
                        <Plus className="w-4 h-4 mr-2" />Adicionar Coluna
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]"><Plus className="w-4 h-4 mr-2" />Novo Lead</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {sourceOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isImobiliaria && (
                    <div className="space-y-2">
                      <Label>Atribuir a</Label>
                      <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          {profiles?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotações sobre o lead..." />
                  </div>
                  <Button onClick={handleSave} className="bg-[#7E22CE] hover:bg-[#6b21a8]">{editingLead ? "Salvar" : "Criar Lead"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {isCorretor ? (
            <>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Meus Leads</p>
                <p className="text-3xl font-bold">{myLeads.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Convertidos</p>
                <p className="text-3xl font-bold text-green-600">{myLeads.filter(l => l.status === "convertido").length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Em Andamento</p>
                <p className="text-3xl font-bold text-amber-600">{myLeads.filter(l => !["convertido", "perdido"].includes(l.status)).length}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total de Leads</p>
                <p className="text-3xl font-bold">{totalLeads}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Convertidos</p>
                <p className="text-3xl font-bold text-green-600">{leads?.filter(l => l.status === "convertido").length ?? 0}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Corretores Ativos</p>
                <p className="text-3xl font-bold text-purple-600">{profiles?.length ?? 0}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {isImobiliaria && profiles && profiles.length > 0 && (
            <Select value={filterCorretor} onValueChange={setFilterCorretor}>
              <SelectTrigger className="w-44">
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Corretor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os corretores</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {view === "list" && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Nome</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Contato</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Origem</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    {isImobiliaria && <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Corretor</th>}
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered?.map((lead) => {
                    const responsavel = profiles?.find((p) => p.id === lead.assigned_to);
                    const isMine = lead.assigned_to === profile?.id;
                    return (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium text-card-foreground">
                          <div className="flex items-center gap-2">
                            {isCorretor && isMine && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
                            {lead.name}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{lead.email || lead.phone || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground">{lead.source || "-"}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[lead.status] || ""}`}>
                            {statusOptions.find(s => s.value === lead.status)?.label || lead.status}
                          </span>
                        </td>
                        {isImobiliaria && (
                          <td className="p-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {responsavel?.full_name || "Não atribuído"}
                            </div>
                          </td>
                        )}
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            {(isImobiliaria || isMine) && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteLeadId(lead.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(!filtered || filtered.length === 0) && (
                <div className="p-8 text-center text-muted-foreground">
                  {isLoading ? "Carregando..." : "Nenhum lead encontrado."}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "kanban" && (
          <div>
            {(!kanbanColumns || kanbanColumns.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border rounded-xl text-center">
                <Columns className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="font-semibold text-slate-700 mb-1">Nenhuma coluna criada</p>
                <p className="text-sm text-muted-foreground mb-4">Clique no ícone de configurações para criar suas colunas</p>
                <Button variant="outline" onClick={() => setColDialogOpen(true)}>
                  <Settings2 className="w-4 h-4 mr-2" />Criar primeira coluna
                </Button>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanColumns.map((col) => {
                  const colLeads = filtered?.filter((l: any) => l.kanban_column_id === col.id) ?? [];
                  return (
                    <div
                      key={col.id}
                      className="flex-shrink-0 w-72 bg-slate-50 rounded-xl border border-slate-100 flex flex-col"
                      style={{ borderTopWidth: 3, borderTopColor: col.color }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(col.id)}
                    >
                      <div className="px-3 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                          <h3 className="font-semibold text-sm text-slate-800">{col.name}</h3>
                        </div>
                        <span className="text-xs bg-white border border-slate-100 rounded-full px-2 py-0.5 text-muted-foreground font-medium">
                          {colLeads.length}
                        </span>
                      </div>
                      <div className="p-2 space-y-2 flex-1 min-h-[120px]">
                        {colLeads.map((lead: any) => (
                          <LeadCard key={lead.id} lead={lead} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div
                  className="flex-shrink-0 w-72 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async () => {
                    if (!draggedLead) return;
                    await supabase.from("leads").update({ kanban_column_id: null } as any).eq("id", draggedLead);
                    queryClient.invalidateQueries({ queryKey: ["leads"] });
                    setDraggedLead(null);
                  }}
                >
                  <div className="px-3 py-3 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-slate-400">Sem coluna</h3>
                    <span className="text-xs bg-white border border-slate-100 rounded-full px-2 py-0.5 text-muted-foreground font-medium">
                      {filtered?.filter((l: any) => !l.kanban_column_id).length ?? 0}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 flex-1 min-h-[120px]">
                    {filtered?.filter((l: any) => !l.kanban_column_id).map((lead: any) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <AlertDialog open={!!deleteLeadId} onOpenChange={(isOpen) => !isOpen && setDeleteLeadId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lead Permanentemente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este contato? Esta ação não poderá ser desfeita e todo o histórico deste lead será perdido.
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

export default Leads;