import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useLeads, useProperties, useProfiles } from "@/hooks/useCompanyData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, CalendarIcon, Clock, Trash2, Pencil, CheckCircle2, Circle,
  Phone, Users, MapPin, MoreHorizontal, X, Bell, ChevronLeft, ChevronRight,
  SlidersHorizontal, AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isToday, isSameMonth, parseISO,
  addWeeks, subWeeks, startOfDay, endOfDay, isWithinInterval,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const eventTypeOptions = [
  { value: "tarefa",  label: "Tarefa",   icon: CheckCircle2,  color: "bg-purple-100 text-purple-700",  dot: "bg-purple-500"  },
  { value: "reuniao", label: "Reunião",  icon: Users,         color: "bg-blue-100 text-blue-700",      dot: "bg-blue-500"    },
  { value: "visita",  label: "Visita",   icon: MapPin,        color: "bg-green-100 text-green-700",    dot: "bg-green-500"   },
  { value: "ligacao", label: "Ligação",  icon: Phone,         color: "bg-amber-100 text-amber-700",    dot: "bg-amber-500"   },
  { value: "outro",   label: "Outro",    icon: MoreHorizontal,color: "bg-slate-100 text-slate-600",    dot: "bg-slate-400"   },
];

const WEEK_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

type View = "month" | "week" | "list";

type EventForm = {
  title: string; description: string; event_type: string;
  start_date: Date | undefined; start_time: string; end_time: string;
  all_day: boolean; lead_id: string; property_id: string; assigned_to: string;
};

const defaultForm: EventForm = {
  title: "", description: "", event_type: "tarefa",
  start_date: new Date(), start_time: "09:00", end_time: "10:00",
  all_day: false, lead_id: "", property_id: "", assigned_to: "",
};

const getTypeConfig = (type: string) =>
  eventTypeOptions.find(t => t.value === type) ?? eventTypeOptions[4];

// ─── Componente principal ──────────────────────────────────────────────────
const CalendarPage = () => {
  const { data: events, isLoading } = useCalendarEvents();
  const { data: leads }      = useLeads();
  const { data: properties } = useProperties();
  const { data: profiles }   = useProfiles();
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const queryClient = useQueryClient();

  const [currentDate,    setCurrentDate]    = useState(new Date());
  const [selectedDate,   setSelectedDate]   = useState<Date>(new Date());
  const [view,           setView]           = useState<View>("month");
  const [filterType,     setFilterType]     = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editing,        setEditing]        = useState<any>(null);
  const [viewing,        setViewing]        = useState<any>(null);
  const [form,           setForm]           = useState<EventForm>({ ...defaultForm });

  // ── Toast de notificação ao abrir ─────────────────────────────────────────
  useEffect(() => {
    if (!events) return;
    const todayEvents = events.filter(
      ev => isToday(parseISO(ev.start_at)) && !ev.completed
    );
    if (todayEvents.length === 0) return;

    // Mostra apenas uma vez por sessão
    const key = `notified_${format(new Date(), "yyyy-MM-dd")}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    toast(
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-[#7E22CE] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Você tem {todayEvents.length} evento{todayEvents.length > 1 ? "s" : ""} hoje</p>
          <ul className="mt-1 space-y-0.5">
            {todayEvents.slice(0, 3).map(ev => (
              <li key={ev.id} className="text-xs text-muted-foreground">
                {!ev.all_day && `${format(parseISO(ev.start_at), "HH:mm")} · `}{ev.title}
              </li>
            ))}
            {todayEvents.length > 3 && <li className="text-xs text-muted-foreground">+{todayEvents.length - 3} mais...</li>}
          </ul>
        </div>
      </div>,
      { duration: 6000 }
    );
  }, [events]);

  // ── Filtragem ─────────────────────────────────────────────────────────────
  const filteredEvents = events?.filter(ev =>
    filterType === "all" || ev.event_type === filterType
  ) ?? [];

  // ── Helpers de datas ──────────────────────────────────────────────────────
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart, { locale: ptBR });
  const calEnd     = endOfWeek(monthEnd, { locale: ptBR });
  const calDays    = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekDays  = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter(ev => isSameDay(parseISO(ev.start_at), day));

  const selectedDayEvents = filteredEvents.filter(ev =>
    isSameDay(parseISO(ev.start_at), selectedDate)
  );

  const todayPendingCount = events?.filter(
    ev => isToday(parseISO(ev.start_at)) && !ev.completed
  ).length ?? 0;

  // ── Navegação ─────────────────────────────────────────────────────────────
  const prev = () => {
    if (view === "month") setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    if (view === "week")  setCurrentDate(subWeeks(currentDate, 1));
    if (view === "list")  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };
  const next = () => {
    if (view === "month") setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    if (view === "week")  setCurrentDate(addWeeks(currentDate, 1));
    if (view === "list")  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };
  const goToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const navLabel = () => {
    if (view === "week") {
      const we = addDays(weekStart, 6);
      return `${format(weekStart, "d MMM", { locale: ptBR })} – ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: ptBR });
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const resetForm = () => { setForm({ ...defaultForm, start_date: selectedDate }); setEditing(null); };

  const handleSave = async () => {
    if (!profile || !form.title.trim() || !form.start_date) {
      toast.error("Preencha o título e a data"); return;
    }
    const startAt = form.all_day
      ? new Date(form.start_date.toDateString()).toISOString()
      : new Date(`${format(form.start_date, "yyyy-MM-dd")}T${form.start_time}:00`).toISOString();
    const endAt = form.all_day ? null
      : form.end_time ? new Date(`${format(form.start_date, "yyyy-MM-dd")}T${form.end_time}:00`).toISOString() : null;

    const payload = {
      title: form.title, description: form.description || null,
      event_type: form.event_type, start_at: startAt, end_at: endAt,
      all_day: form.all_day, lead_id: form.lead_id || null,
      property_id: form.property_id || null,
      assigned_to: isCorretor ? profile.id : (form.assigned_to || profile.id),
      company_id: profile.company_id ?? null, created_by: profile.id,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("calendar_events").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("calendar_events").insert(payload as any));
    }
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(editing ? "Evento atualizado!" : "Evento criado!");
    queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Evento excluído!");
    queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
    setViewDialogOpen(false); setViewing(null);
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await supabase.from("calendar_events").update({ completed: !completed }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
  };

  const openEdit = (ev: any) => {
    const startDate = parseISO(ev.start_at);
    setForm({
      title: ev.title, description: ev.description || "", event_type: ev.event_type,
      start_date: startDate,
      start_time: ev.all_day ? "09:00" : format(startDate, "HH:mm"),
      end_time: ev.end_at ? format(parseISO(ev.end_at), "HH:mm") : "10:00",
      all_day: ev.all_day, lead_id: ev.lead_id || "",
      property_id: ev.property_id || "", assigned_to: ev.assigned_to || "",
    });
    setEditing(ev); setViewDialogOpen(false); setDialogOpen(true);
  };

  const openNewOnDate = (date: Date) => {
    setSelectedDate(date);
    setForm({ ...defaultForm, start_date: date });
    setEditing(null); setDialogOpen(true);
  };

  // ── Sub-componente: EventChip ─────────────────────────────────────────────
  const EventChip = ({ ev, compact = false }: { ev: any; compact?: boolean }) => {
    const cfg = getTypeConfig(ev.event_type);
    return (
      <div
        onClick={(e) => { e.stopPropagation(); setViewing(ev); setViewDialogOpen(true); }}
        className={cn(
          "flex items-center gap-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
          compact ? "px-1 py-0.5" : "px-1.5 py-0.5",
          cfg.color, ev.completed && "line-through opacity-50"
        )}
      >
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
        <span className={cn("truncate font-medium", compact ? "text-[9px]" : "text-[10px]")}>{ev.title}</span>
      </div>
    );
  };

  // ── Sub-componente: EventRow (lista/sidebar) ───────────────────────────────
  const EventRow = ({ ev }: { ev: any }) => {
    const cfg = getTypeConfig(ev.event_type);
    const Icon = cfg.icon;
    return (
      <div
        onClick={() => { setViewing(ev); setViewDialogOpen(true); }}
        className={cn("flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors cursor-pointer", ev.completed && "opacity-50")}
      >
        <button onClick={(e) => { e.stopPropagation(); toggleComplete(ev.id, ev.completed); }} className="mt-0.5 shrink-0">
          {ev.completed
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : <Circle className="w-4 h-4 text-slate-400" />}
        </button>
        <div className={cn("p-1.5 rounded-lg shrink-0", cfg.color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", ev.completed && "line-through")}>{ev.title}</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(ev.start_at), "dd/MM · ")}
            {ev.all_day ? "Dia inteiro" : format(parseISO(ev.start_at), "HH:mm")}
            {ev.end_at && !ev.all_day && ` – ${format(parseISO(ev.end_at), "HH:mm")}`}
            {(ev as any).leads?.name && ` · ${(ev as any).leads.name}`}
          </p>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-6">

        {/* Banner: eventos pendentes hoje */}
        {todayPendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 mb-5 text-sm"
          >
            <Bell className="w-4 h-4 text-[#7E22CE] shrink-0" />
            <span className="text-[#7E22CE] font-medium">
              {todayPendingCount} evento{todayPendingCount > 1 ? "s" : ""} pendente{todayPendingCount > 1 ? "s" : ""} hoje
            </span>
            <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); setView("month"); }}
              className="ml-auto text-xs text-[#7E22CE] underline underline-offset-2 hover:no-underline">
              Ver
            </button>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Calendário
              {todayPendingCount > 0 && (
                <span className="bg-[#7E22CE] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {todayPendingCount}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isCorretor ? "Seus compromissos e tarefas" : "Agenda da equipe"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por tipo */}
            <Popover open={showFilterMenu} onOpenChange={setShowFilterMenu}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2", filterType !== "all" && "border-[#7E22CE] text-[#7E22CE]")}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {filterType === "all" ? "Filtrar" : getTypeConfig(filterType).label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5" align="end">
                <button onClick={() => { setFilterType("all"); setShowFilterMenu(false); }}
                  className={cn("w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors", filterType === "all" && "font-semibold text-[#7E22CE]")}>
                  Todos os tipos
                </button>
                {eventTypeOptions.map(t => (
                  <button key={t.value} onClick={() => { setFilterType(t.value); setShowFilterMenu(false); }}
                    className={cn("w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors flex items-center gap-2", filterType === t.value && "font-semibold text-[#7E22CE]")}>
                    <div className={cn("w-2 h-2 rounded-full", t.dot)} />{t.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Toggle de vista */}
            <div className="flex bg-muted rounded-lg p-0.5">
              {(["month", "week", "list"] as View[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                    view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                  {v === "month" ? "Mês" : v === "week" ? "Semana" : "Lista"}
                </button>
              ))}
            </div>

            {/* Novo evento */}
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]" size="sm">
                  <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Novo Evento</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Visita ao apartamento" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{eventTypeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.start_date ? format(form.start_date, "dd/MM/yyyy") : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={form.start_date} onSelect={(d) => setForm({ ...form, start_date: d })} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="allDay" checked={form.all_day} onCheckedChange={(c) => setForm({ ...form, all_day: !!c })} />
                    <Label htmlFor="allDay" className="cursor-pointer">Dia inteiro</Label>
                  </div>
                  {!form.all_day && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Início</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Fim</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do evento..." rows={2} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Lead (opcional)</Label>
                      <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>{leads?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Imóvel (opcional)</Label>
                      <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>{properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isImobiliaria && (
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
                        <SelectContent>{profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleSave} className="bg-[#7E22CE] hover:bg-[#6b21a8]">{editing ? "Salvar" : "Criar Evento"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Navegação de período */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-card-foreground capitalize text-sm sm:text-base min-w-[180px] text-center">
              {navLabel()}
            </h2>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
        </div>

        {/* ── VISTA MÊS ─────────────────────────────────────────────────────── */}
        {view === "month" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Grade do mês */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
                  <div key={d} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const inMonth   = isSameMonth(day, currentDate);
                  return (
                    <button key={i} onClick={() => setSelectedDate(day)} onDoubleClick={() => openNewOnDate(day)}
                      className={cn(
                        "min-h-[64px] sm:min-h-[88px] p-1 border-b border-r border-border text-left transition-colors relative group",
                        !inMonth && "opacity-30 bg-muted/20",
                        isSelected && "bg-purple-50 dark:bg-purple-950/20",
                        isToday(day) && "ring-1 ring-inset ring-[#7E22CE]",
                      )}
                    >
                      <span className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isToday(day) ? "bg-[#7E22CE] text-white font-bold" : "text-card-foreground",
                      )}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map(ev => <EventChip key={ev.id} ev={ev} compact />)}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 2}</span>
                        )}
                      </div>
                      {/* "+" ao passar o mouse */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-4 h-4 bg-[#7E22CE]/10 rounded flex items-center justify-center">
                          <Plus className="w-2.5 h-2.5 text-[#7E22CE]" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel lateral do dia selecionado */}
            <div className="bg-card rounded-xl border border-border flex flex-col">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">
                    {isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <p className="text-xs text-muted-foreground capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNewOnDate(selectedDate)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[420px]">
                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <CalendarIcon className="w-8 h-8 text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhum evento</p>
                    <button onClick={() => openNewOnDate(selectedDate)} className="text-xs text-[#7E22CE] mt-2 underline underline-offset-2">
                      Adicionar
                    </button>
                  </div>
                ) : (
                  selectedDayEvents.map(ev => <EventRow key={ev.id} ev={ev} />)
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VISTA SEMANA ──────────────────────────────────────────────────── */}
        {view === "week" && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Cabeçalho dos dias */}
            <div className="grid grid-cols-8 border-b border-border bg-muted/30">
              <div className="py-2 px-2 text-[10px] text-muted-foreground" />
              {weekDays.map((day, i) => (
                <div key={i} className={cn("py-2 text-center border-l border-border", isToday(day) && "bg-purple-50")}>
                  <p className="text-[10px] text-muted-foreground uppercase">{format(day, "EEE", { locale: ptBR })}</p>
                  <p className={cn("text-sm font-semibold mt-0.5",
                    isToday(day) ? "text-[#7E22CE]" : "text-card-foreground")}>{format(day, "d")}</p>
                </div>
              ))}
            </div>
            {/* Linhas de hora */}
            <div className="overflow-y-auto max-h-[520px]">
              {WEEK_HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[52px]">
                  <div className="py-1 px-2 text-[10px] text-muted-foreground text-right shrink-0 pt-1">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {weekDays.map((day, di) => {
                    const slotEvents = getEventsForDay(day).filter(ev => {
                      if (ev.all_day) return hour === 8;
                      const h = parseInt(format(parseISO(ev.start_at), "H"));
                      return h === hour;
                    });
                    return (
                      <div key={di}
                        className={cn("border-l border-border p-0.5 space-y-0.5 cursor-pointer hover:bg-muted/30 transition-colors", isToday(day) && "bg-purple-50/30")}
                        onClick={() => { setSelectedDate(day); openNewOnDate(day); }}
                      >
                        {slotEvents.map(ev => <EventChip key={ev.id} ev={ev} compact />)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VISTA LISTA ───────────────────────────────────────────────────── */}
        {view === "list" && (
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border rounded-xl text-center">
                <CalendarIcon className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="font-medium text-slate-600 mb-1">Nenhum evento encontrado</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {filterType !== "all" ? "Tente remover o filtro de tipo" : "Crie seu primeiro evento"}
                </p>
                {filterType !== "all"
                  ? <Button variant="outline" size="sm" onClick={() => setFilterType("all")}>Limpar filtro</Button>
                  : <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]" size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Evento</Button>
                }
              </div>
            ) : (
              filteredEvents
                .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                .map(ev => <EventRow key={ev.id} ev={ev} />)
            )}
          </div>
        )}

        {/* Modal visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Detalhes do Evento</DialogTitle></DialogHeader>
            {viewing && (() => {
              const cfg  = getTypeConfig(viewing.event_type);
              const Icon = cfg.icon;
              return (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-xl shrink-0", cfg.color)}><Icon className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg leading-tight">{viewing.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(parseISO(viewing.start_at), "dd/MM/yyyy")}
                        {viewing.all_day ? " · Dia inteiro" : ` · ${format(parseISO(viewing.start_at), "HH:mm")}`}
                        {viewing.end_at && !viewing.all_day && ` – ${format(parseISO(viewing.end_at), "HH:mm")}`}
                      </p>
                      <span className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1", cfg.color)}>{cfg.label}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleComplete(viewing.id, viewing.completed); }}
                      className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors">
                      {viewing.completed
                        ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                        : <Circle className="w-5 h-5 text-slate-400" />}
                    </button>
                  </div>
                  {viewing.description && (
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                      <p className="text-sm whitespace-pre-wrap">{viewing.description}</p>
                    </div>
                  )}
                  {(viewing.lead_id || viewing.property_id || (isImobiliaria && viewing.assigned_to)) && (
                    <div className="space-y-1.5 text-sm">
                      {(viewing as any).leads?.name && (
                        <p><span className="text-muted-foreground">Lead:</span> <strong>{(viewing as any).leads.name}</strong></p>
                      )}
                      {(viewing as any).properties?.title && (
                        <p><span className="text-muted-foreground">Imóvel:</span> <strong>{(viewing as any).properties.title}</strong></p>
                      )}
                      {isImobiliaria && (viewing as any).profiles?.full_name && (
                        <p><span className="text-muted-foreground">Responsável:</span> <strong>{(viewing as any).profiles.full_name}</strong></p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t">
                    <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                    <Button variant="outline" onClick={() => openEdit(viewing)}><Pencil className="w-4 h-4 mr-2" />Editar</Button>
                    <Button variant="destructive" onClick={() => handleDelete(viewing.id)}><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

      </motion.div>
    </AppLayout>
  );
};

export default CalendarPage;