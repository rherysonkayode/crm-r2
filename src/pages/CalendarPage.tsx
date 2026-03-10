import { useState } from "react";
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
import { toast } from "sonner";
import { Plus, CalendarIcon, Clock, Trash2, Pencil, CheckCircle2, Circle, Phone, Users, MapPin, MoreHorizontal, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isToday, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const eventTypeOptions = [
  { value: "tarefa", label: "Tarefa", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
  { value: "reuniao", label: "Reunião", icon: Users, color: "bg-accent/10 text-accent" },
  { value: "visita", label: "Visita", icon: MapPin, color: "bg-success/10 text-success" },
  { value: "ligacao", label: "Ligação", icon: Phone, color: "bg-info/10 text-info" },
  { value: "outro", label: "Outro", icon: MoreHorizontal, color: "bg-muted text-muted-foreground" },
];

type EventForm = {
  title: string;
  description: string;
  event_type: string;
  start_date: Date | undefined;
  start_time: string;
  end_time: string;
  all_day: boolean;
  lead_id: string;
  property_id: string;
  assigned_to: string;
};

const defaultForm: EventForm = {
  title: "", description: "", event_type: "tarefa",
  start_date: new Date(), start_time: "09:00", end_time: "10:00",
  all_day: false, lead_id: "", property_id: "", assigned_to: "",
};

const CalendarPage = () => {
  const { data: events, isLoading } = useCalendarEvents();
  const { data: leads } = useLeads();
  const { data: properties } = useProperties();
  const { data: profiles } = useProfiles();
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState<EventForm>({ ...defaultForm });
  const [view, setView] = useState<"month" | "list">("month");

  const resetForm = () => { setForm({ ...defaultForm, start_date: selectedDate }); setEditing(null); };

  const handleSave = async () => {
    if (!profile || !form.title.trim() || !form.start_date) {
      toast.error("Preencha o título e a data");
      return;
    }

    const startAt = form.all_day
      ? new Date(form.start_date.toDateString()).toISOString()
      : new Date(`${format(form.start_date, "yyyy-MM-dd")}T${form.start_time}:00`).toISOString();

    const endAt = form.all_day ? null
      : form.end_time ? new Date(`${format(form.start_date, "yyyy-MM-dd")}T${form.end_time}:00`).toISOString() : null;

    const payload = {
      title: form.title,
      description: form.description || null,
      event_type: form.event_type,
      start_at: startAt,
      end_at: endAt,
      all_day: form.all_day,
      lead_id: form.lead_id || null,
      property_id: form.property_id || null,
      assigned_to: isCorretor ? profile.id : (form.assigned_to || profile.id),
      company_id: profile.company_id ?? null,
      created_by: profile.id,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("calendar_events").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("calendar_events").insert(payload as any));
    }
    if (error) { toast.error("Erro ao salvar evento: " + error.message); return; }
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
    setViewDialogOpen(false);
    setViewing(null);
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await supabase.from("calendar_events").update({ completed: !completed }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
  };

  const openEdit = (ev: any) => {
    const startDate = parseISO(ev.start_at);
    setForm({
      title: ev.title,
      description: ev.description || "",
      event_type: ev.event_type,
      start_date: startDate,
      start_time: ev.all_day ? "09:00" : format(startDate, "HH:mm"),
      end_time: ev.end_at ? format(parseISO(ev.end_at), "HH:mm") : "10:00",
      all_day: ev.all_day,
      lead_id: ev.lead_id || "",
      property_id: ev.property_id || "",
      assigned_to: ev.assigned_to || "",
    });
    setEditing(ev);
    setViewDialogOpen(false);
    setDialogOpen(true);
  };

  const openView = (ev: any) => {
    setViewing(ev);
    setViewDialogOpen(true);
  };

  const openNewOnDate = (date: Date) => {
    setSelectedDate(date);
    setForm({ ...defaultForm, start_date: date });
    setEditing(null);
    setDialogOpen(true);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day: Date) =>
    events?.filter(ev => isSameDay(parseISO(ev.start_at), day)) ?? [];

  const selectedDayEvents = events?.filter(ev => isSameDay(parseISO(ev.start_at), selectedDate)) ?? [];
  const getTypeConfig = (type: string) => eventTypeOptions.find(t => t.value === type) ?? eventTypeOptions[4];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Calendário</h1>
            <p className="text-muted-foreground">
              {isCorretor ? "Seus compromissos e tarefas" : "Agenda da equipe"}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              <button onClick={() => setView("month")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", view === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Mês</button>
              <button onClick={() => setView("list")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Lista</button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Novo Evento</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                  {/* mesmo formulário de antes, sem mudanças */}
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Visita ao apartamento" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {eventTypeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
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
                      <div className="space-y-2">
                        <Label>Início</Label>
                        <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fim</Label>
                        <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do evento..." rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Lead (opcional)</Label>
                      <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          {leads?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Imóvel (opcional)</Label>
                      <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          {properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isImobiliaria && (
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
                        <SelectContent>
                          {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleSave}>{editing ? "Salvar" : "Criar Evento"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {view === "month" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Calendar Grid - igual, sem mudanças */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="font-semibold text-card-foreground capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-7 border-b border-border">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                  <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const inMonth = isSameMonth(day, currentMonth);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => openNewOnDate(day)}
                      className={cn(
                        "min-h-[80px] p-1.5 border-b border-r border-border text-left transition-colors relative",
                        !inMonth && "opacity-30",
                        isSelected && "bg-primary/5",
                        isToday(day) && "ring-1 ring-inset ring-primary",
                      )}
                    >
                      <span className={cn("text-xs font-medium", isToday(day) ? "text-primary font-bold" : "text-card-foreground")}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => {
                          const cfg = getTypeConfig(ev.event_type);
                          return (
                            <div key={ev.id} className={cn("text-[10px] px-1 py-0.5 rounded truncate font-medium", cfg.color, ev.completed && "line-through opacity-60")}>
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day sidebar */}
            <div className="bg-card rounded-xl border border-border shadow-card">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-card-foreground">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
              </div>
              <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-3">Nenhum evento neste dia</p>
                    <Button variant="outline" size="sm" onClick={() => openNewOnDate(selectedDate)}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
                    </Button>
                  </div>
                ) : (
                  selectedDayEvents.map(ev => {
                    const cfg = getTypeConfig(ev.event_type);
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => openView(ev)}
                        className={cn("rounded-lg border border-border p-3 transition-colors cursor-pointer hover:bg-muted/50", ev.completed && "opacity-60")}
                      >
                        <div className="flex items-start gap-2">
                          <button onClick={(e) => { e.stopPropagation(); toggleComplete(ev.id, ev.completed); }} className="mt-0.5 shrink-0">
                            {ev.completed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium text-card-foreground", ev.completed && "line-through")}>{ev.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cfg.color)}>{cfg.label}</span>
                              {!ev.all_day && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{format(parseISO(ev.start_at), "HH:mm")}
                                  {ev.end_at && ` - ${format(parseISO(ev.end_at), "HH:mm")}`}
                                </span>
                              )}
                            </div>
                            {/* Prévia da descrição */}
                            {ev.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                            )}
                            {isImobiliaria && (ev as any).profiles?.full_name && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Responsável: {(ev as any).profiles.full_name}
                              </p>
                            )}
                            {(ev as any).leads?.name && (
                              <p className="text-[10px] text-muted-foreground mt-1">Lead: {(ev as any).leads.name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="divide-y divide-border">
              {events?.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Nenhum evento cadastrado.</div>
              )}
              {events?.map(ev => {
                const cfg = getTypeConfig(ev.event_type);
                const Icon = cfg.icon;
                return (
                  <div
                    key={ev.id}
                    onClick={() => openView(ev)}
                    className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <button onClick={(e) => { e.stopPropagation(); toggleComplete(ev.id, ev.completed); }} className="shrink-0">
                      {ev.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    <div className={cn("p-2 rounded-lg shrink-0", cfg.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-card-foreground", ev.completed && "line-through opacity-60")}>{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(ev.start_at), "dd/MM/yyyy")}
                        {!ev.all_day && ` às ${format(parseISO(ev.start_at), "HH:mm")}`}
                        {(ev as any).leads?.name && ` · ${(ev as any).leads.name}`}
                        {isImobiliaria && (ev as any).profiles?.full_name && ` · ${(ev as any).profiles.full_name}`}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ev.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal de visualização de evento */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes do Evento</DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", getTypeConfig(viewing.event_type).color)}>
                    {(() => {
                      const Icon = getTypeConfig(viewing.event_type).icon;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{viewing.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(viewing.start_at), "dd/MM/yyyy")}
                      {!viewing.all_day && ` · ${format(parseISO(viewing.start_at), "HH:mm")}`}
                      {viewing.end_at && ` - ${format(parseISO(viewing.end_at), "HH:mm")}`}
                      {viewing.all_day && " · Dia inteiro"}
                    </p>
                  </div>
                </div>

                {viewing.description && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-1">Descrição</h4>
                    <p className="text-sm whitespace-pre-wrap">{viewing.description}</p>
                  </div>
                )}

                {(viewing.lead_id || viewing.property_id || (isImobiliaria && viewing.assigned_to)) && (
                  <div className="border-t pt-3 space-y-1">
                    {viewing.lead_id && (viewing as any).leads?.name && (
                      <p className="text-sm"><span className="font-medium">Lead:</span> {(viewing as any).leads.name}</p>
                    )}
                    {viewing.property_id && (viewing as any).properties?.title && (
                      <p className="text-sm"><span className="font-medium">Imóvel:</span> {(viewing as any).properties.title}</p>
                    )}
                    {isImobiliaria && viewing.assigned_to && (viewing as any).profiles?.full_name && (
                      <p className="text-sm"><span className="font-medium">Responsável:</span> {(viewing as any).profiles.full_name}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                  <Button variant="default" onClick={() => openEdit(viewing)}>
                    <Pencil className="w-4 h-4 mr-2" />Editar
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(viewing.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />Excluir
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
};

export default CalendarPage;