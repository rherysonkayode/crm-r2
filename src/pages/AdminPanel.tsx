import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bell, Users, Building2, CreditCard, ShieldCheck,
  ToggleLeft, ToggleRight, Search, Send, TrendingUp,
  TrendingDown, DollarSign, UserCheck, Download,
  Activity, Calendar, BarChart3, Pencil, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format, parseISO, subMonths, startOfMonth, endOfMonth,
  isWithinInterval, differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const PLAN_PRICES: Record<string, number> = {
  start: 97, pro: 147, profissional: 197, enterprise: 347,
};
const PLAN_LABELS: Record<string, string> = {
  start: "Start", pro: "Pro", profissional: "Profissional", enterprise: "Enterprise",
};
const planColors: Record<string, string> = {
  trial: "bg-amber-100 text-amber-700", active: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-600",   canceled: "bg-slate-100 text-slate-500",
};
const roleLabels: Record<string, string> = {
  imobiliaria: "Imobiliária", corretor: "Corretor", admin: "Admin", superadmin: "Super Admin",
};
const tabs = [
  { id: "overview",    label: "Visão Geral", icon: BarChart3 },
  { id: "clientes",    label: "Clientes",    icon: Users     },
  { id: "atividade",   label: "Atividade",   icon: Activity  },
  { id: "comunicados", label: "Comunicados", icon: Bell      },
];

// ─── Hooks com Realtime ───────────────────────────────────────────────────
const useAllProfiles = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, full_name, email, role, status, plan, subscription_status,
          trial_end, trial_start, company_id, created_at, phone,
          cpf, creci, updated_at,
          companies:company_id (name)
        `)
        .neq("role", "superadmin")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  useEffect(() => {
    const ch = supabase.channel("admin_profiles_rt")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "profiles" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin_profiles"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return query;
};

const useLeadCounts = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin_lead_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("assigned_to, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    const ch = supabase.channel("admin_leads_rt")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "leads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin_lead_counts"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return query;
};

const useActivityLogs = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin_activity_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs" as any)
        .select("*, profiles(full_name, role)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return data ?? [];
    },
  });
  useEffect(() => {
    const ch = supabase.channel("admin_logs_rt")
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin_activity_logs"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return query;
};

// ─── Componente expandido de linha ────────────────────────────────────────
const ExpandedRow = ({ p, leadCount }: { p: any; leadCount: number }) => (
  <tr className="bg-muted/20">
    <td colSpan={8} className="px-4 py-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground mb-0.5">E-mail</p>
          <p className="font-medium">{p.email || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Telefone</p>
          <p className="font-medium">{p.phone || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">CRECI</p>
          <p className="font-medium">{p.creci || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Empresa</p>
          <p className="font-medium">{p.companies?.name || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Cadastro</p>
          <p className="font-medium">{p.created_at ? format(parseISO(p.created_at), "dd/MM/yyyy HH:mm") : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Última atualização</p>
          <p className="font-medium">{p.updated_at ? format(parseISO(p.updated_at), "dd/MM/yyyy HH:mm") : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Trial até</p>
          <p className="font-medium">{p.trial_end ? format(parseISO(p.trial_end), "dd/MM/yyyy") : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Total de leads</p>
          <p className="font-medium">{leadCount}</p>
        </div>
      </div>
    </td>
  </tr>
);

// ─── AdminPanel ───────────────────────────────────────────────────────────
const AdminPanel = () => {
  const queryClient = useQueryClient();
  const { data: allProfiles, refetch } = useAllProfiles();
  const { data: allLeads }             = useLeadCounts();
  const { data: activityLogs }         = useActivityLogs();

  const [activeTab,    setActiveTab]    = useState("overview");
  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState("all");
  const [filterPlan,   setFilterPlan]   = useState("all");
  const [togglingId,   setTogglingId]   = useState<string | null>(null);
  const [editingPlan,  setEditingPlan]  = useState<any>(null);
  const [expandedRow,  setExpandedRow]  = useState<string | null>(null);
  const [planForm,     setPlanForm]     = useState({ plan: "", subscription_status: "", trial_end: "" });
  const [notifTitle,   setNotifTitle]   = useState("");
  const [notifBody,    setNotifBody]    = useState("");
  const [notifSegment, setNotifSegment] = useState("all");
  const [notifLink,    setNotifLink]    = useState("");
  const [sending,      setSending]      = useState(false);

  // ── Métricas ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!allProfiles) return null;
    const total       = allProfiles.length;
    const ativos      = allProfiles.filter(p => p.subscription_status === "active").length;
    const trial       = allProfiles.filter(p => p.subscription_status === "trial").length;
    const expirados   = allProfiles.filter(p => p.subscription_status === "expired").length;
    const imobs       = allProfiles.filter(p => p.role === "imobiliaria").length;
    const corretores  = allProfiles.filter(p => p.role === "corretor").length;
    const mrr         = allProfiles
      .filter(p => p.subscription_status === "active" && p.plan)
      .reduce((acc, p) => acc + (PLAN_PRICES[p.plan!] ?? 0), 0);
    const churn       = total > 0 ? ((expirados / total) * 100).toFixed(1) : "0";
    const novosEsteMes = allProfiles.filter(p =>
      p.created_at && new Date(p.created_at) >= startOfMonth(new Date())
    ).length;
    return { total, ativos, trial, expirados, imobs, corretores, mrr, churn, novosEsteMes };
  }, [allProfiles]);

  const chartData = useMemo(() => {
    if (!allProfiles) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const count = allProfiles.filter(p =>
        p.created_at && isWithinInterval(new Date(p.created_at), { start: startOfMonth(month), end: endOfMonth(month) })
      ).length;
      return { mes: format(month, "MMM", { locale: ptBR }), cadastros: count };
    });
  }, [allProfiles]);

  const topClientes = useMemo(() => {
    if (!allProfiles || !allLeads) return [];
    const countMap: Record<string, number> = {};
    allLeads.forEach((l: any) => { if (l.assigned_to) countMap[l.assigned_to] = (countMap[l.assigned_to] ?? 0) + 1; });
    return allProfiles
      .map(p => ({ ...p, leadCount: countMap[p.id] ?? 0 }))
      .sort((a, b) => b.leadCount - a.leadCount)
      .slice(0, 10);
  }, [allProfiles, allLeads]);

  const filtered = useMemo(() => (allProfiles ?? []).filter(p => {
    const matchSearch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === "all" || p.role === filterRole;
    const matchPlan   = filterPlan === "all" || p.subscription_status === filterPlan;
    return matchSearch && matchRole && matchPlan;
  }), [allProfiles, search, filterRole, filterPlan]);

  const handleToggleStatus = async (p: any) => {
    setTogglingId(p.id);
    const newStatus = p.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", p.id);
    if (error) toast.error("Erro ao alterar status");
    else toast.success(`Usuário ${newStatus === "ativo" ? "ativado" : "bloqueado"}!`);
    refetch(); setTogglingId(null);
  };

  const openEditPlan = (p: any) => {
    setEditingPlan(p);
    setPlanForm({
      plan: p.plan ?? "",
      subscription_status: p.subscription_status ?? "",
      trial_end: p.trial_end ? format(parseISO(p.trial_end), "yyyy-MM-dd") : "",
    });
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    const { error } = await supabase.from("profiles").update({
      plan: planForm.plan || null,
      subscription_status: planForm.subscription_status || null,
      trial_end: planForm.trial_end ? new Date(planForm.trial_end).toISOString() : null,
    }).eq("id", editingPlan.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Plano atualizado!"); refetch(); setEditingPlan(null);
  };

  const handleExportCSV = () => {
    if (!allProfiles) return;
    const headers = ["Nome", "E-mail", "Telefone", "CRECI", "Role", "Empresa", "Plano", "Assinatura", "Status", "Cadastro", "Atualização"];
    const rows = allProfiles.map(p => [
      p.full_name ?? "", p.email ?? "", p.phone ?? "", p.creci ?? "",
      roleLabels[p.role ?? ""] ?? p.role ?? "",
      p.companies?.name ?? "",
      PLAN_LABELS[p.plan ?? ""] ?? p.plan ?? "",
      p.subscription_status ?? "", p.status ?? "",
      p.created_at ? format(parseISO(p.created_at), "dd/MM/yyyy") : "",
      p.updated_at ? format(parseISO(p.updated_at), "dd/MM/yyyy") : "",
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `clientes_crm_r2_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim()) { toast.error("Informe o título"); return; }
    setSending(true);
    try {
      let targets = allProfiles ?? [];
      if (notifSegment === "imobiliaria") targets = targets.filter(p => p.role === "imobiliaria");
      if (notifSegment === "corretor")    targets = targets.filter(p => p.role === "corretor");
      if (notifSegment === "ativos")      targets = targets.filter(p => p.subscription_status === "active");
      if (notifSegment === "expirados")   targets = targets.filter(p => p.subscription_status === "expired");
      if (targets.length === 0) { toast.error("Nenhum destinatário"); setSending(false); return; }
      const rows = targets.map(p => ({ user_id: p.id, type: "plan", title: notifTitle, body: notifBody || null, link: notifLink || null, read: false }));
      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await supabase.from("notifications" as any).insert(rows.slice(i, i + 50));
        if (error) throw error;
      }
      toast.success(`Enviado para ${targets.length} usuário${targets.length > 1 ? "s" : ""}!`);
      setNotifTitle(""); setNotifBody(""); setNotifLink(""); setNotifSegment("all");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally { setSending(false); }
  };

  const StatCard = ({ label, value, sub, icon: Icon, color, prefix = "" }: any) => (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <p className={cn("text-2xl font-bold", color)}>{prefix}{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painel do Gestor</h1>
              <p className="text-sm text-muted-foreground">CRM R2 — visão completa do sistema</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                  activeTab === tab.id ? "border-amber-500 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* ── VISÃO GERAL ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="MRR Estimado"     value={metrics?.mrr.toLocaleString("pt-BR") ?? "0"} prefix="R$ " icon={DollarSign}  color="text-green-600" sub="planos ativos × preço" />
              <StatCard label="Clientes ativos"  value={metrics?.ativos ?? 0}       icon={UserCheck}   color="text-blue-600"  sub={`${metrics?.trial ?? 0} em trial`} />
              <StatCard label="Churn"            value={`${metrics?.churn ?? 0}%`}  icon={TrendingDown} color="text-red-500"  sub={`${metrics?.expirados ?? 0} expirados`} />
              <StatCard label="Novos este mês"   value={metrics?.novosEsteMes ?? 0} icon={TrendingUp}  color="text-[#7E22CE]" sub="cadastros recentes" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total usuários"  value={metrics?.total ?? 0}        icon={Users}     color="text-slate-600" />
              <StatCard label="Imobiliárias"    value={metrics?.imobs ?? 0}        icon={Building2} color="text-amber-600" />
              <StatCard label="Corretores"      value={metrics?.corretores ?? 0}   icon={Users}     color="text-purple-600" />
              <StatCard label="Em trial"        value={metrics?.trial ?? 0}        icon={Calendar}  color="text-orange-500" />
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" /> Novos cadastros por mês
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cadastros" stroke="#f59e0b" fill="url(#grad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" /> Clientes mais ativos (por leads)
              </h3>
              <div className="space-y-2">
                {topClientes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum dado.</p>}
                {topClientes.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium">{p.full_name || "Sem nome"}</span>
                        <span className="text-xs text-muted-foreground">{p.leadCount} leads</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.min(100, (p.leadCount / (topClientes[0]?.leadCount || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── CLIENTES ─────────────────────────────────────────────────────── */}
        {activeTab === "clientes" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="imobiliaria">Imobiliária</SelectItem>
                  <SelectItem value="corretor">Corretor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">{filtered.length} usuário{filtered.length !== 1 ? "s" : ""} — clique na linha para ver detalhes</p>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Nome", "Tipo", "Plano", "Assinatura", "Trial", "Leads", "Status", "Ações"].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(p => {
                      const isAtivo    = p.status === "ativo";
                      const isToggling = togglingId === p.id;
                      const leadCount  = allLeads?.filter((l: any) => l.assigned_to === p.id).length ?? 0;
                      const trialDays  = p.trial_end ? differenceInDays(parseISO(p.trial_end), new Date()) : null;
                      const isExpanded = expandedRow === p.id;
                      return (
                        <>
                          <tr key={p.id}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                <div>
                                  <p className="font-medium text-sm">{p.full_name || "Sem nome"}</p>
                                  {p.companies?.name && <p className="text-[10px] text-muted-foreground">{p.companies.name}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{roleLabels[p.role ?? ""] ?? p.role}</td>
                            <td className="p-3">
                              <span className="text-xs font-medium">{PLAN_LABELS[p.plan ?? ""] ?? p.plan ?? "—"}</span>
                              {p.plan && <p className="text-[10px] text-muted-foreground">R$ {PLAN_PRICES[p.plan]}/mês</p>}
                            </td>
                            <td className="p-3">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", planColors[p.subscription_status ?? ""] ?? "bg-slate-100 text-slate-600")}>
                                {p.subscription_status ?? "—"}
                              </span>
                            </td>
                            <td className="p-3 text-xs">
                              {trialDays !== null
                                ? trialDays >= 0
                                  ? <span className="text-amber-600 font-medium">{trialDays}d restantes</span>
                                  : <span className="text-red-500">Expirado</span>
                                : "—"}
                            </td>
                            <td className="p-3 text-sm font-semibold text-center">{leadCount}</td>
                            <td className="p-3">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isAtivo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                                {isAtivo ? "Ativo" : "Bloqueado"}
                              </span>
                            </td>
                            <td className="p-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEditPlan(p)} title="Editar plano"
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleToggleStatus(p)} disabled={isToggling} title={isAtivo ? "Bloquear" : "Ativar"}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                  {isToggling
                                    ? <div className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                                    : isAtivo ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && <ExpandedRow p={p} leadCount={leadCount} />}
                        </>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ATIVIDADE ─────────────────────────────────────────────────────── */}
        {activeTab === "atividade" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {activityLogs && activityLogs.length > 0 ? (
              activityLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{log.action ?? "Ação"}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.profiles?.full_name ?? "Usuário"} · {log.created_at ? format(parseISO(log.created_at), "dd/MM/yyyy HH:mm") : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-card border border-dashed border-border rounded-xl text-center">
                <Activity className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="font-medium text-sm">Nenhum log de atividade ainda</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Crie a tabela <code className="bg-muted px-1 rounded">activity_logs</code> no Supabase para habilitar.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── COMUNICADOS ───────────────────────────────────────────────────── */}
        {activeTab === "comunicados" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-card rounded-xl border border-border p-5 space-y-5 max-w-xl">
              <div>
                <h2 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> Enviar comunicado</h2>
                <p className="text-sm text-muted-foreground mt-1">Aparece no sino de notificações em tempo real.</p>
              </div>
              <div className="space-y-2">
                <Label>Destinatários</Label>
                <Select value={notifSegment} onValueChange={setNotifSegment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos ({metrics?.total ?? 0})</SelectItem>
                    <SelectItem value="imobiliaria">Imobiliárias ({metrics?.imobs ?? 0})</SelectItem>
                    <SelectItem value="corretor">Corretores ({metrics?.corretores ?? 0})</SelectItem>
                    <SelectItem value="ativos">Ativos ({metrics?.ativos ?? 0})</SelectItem>
                    <SelectItem value="expirados">Expirados ({metrics?.expirados ?? 0})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input placeholder="Ex: 🚀 Nova funcionalidade!" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea placeholder="Descreva o comunicado..." value={notifBody} onChange={e => setNotifBody(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Link (opcional)</Label>
                <Input placeholder="/#/calculators" value={notifLink} onChange={e => setNotifLink(e.target.value)} />
              </div>
              {notifTitle && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-semibold text-amber-600 uppercase">Preview</p>
                  <p className="text-sm font-semibold">{notifTitle}</p>
                  {notifBody && <p className="text-xs text-slate-600">{notifBody}</p>}
                </div>
              )}
              <Button onClick={handleSendNotification} disabled={sending || !notifTitle.trim()} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                <Send className="w-4 h-4 mr-2" />{sending ? "Enviando..." : "Enviar comunicado"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Modal editar plano */}
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Editar Plano — {editingPlan?.full_name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={planForm.plan} onValueChange={v => setPlanForm({ ...planForm, plan: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Start — R$ 97/mês</SelectItem>
                    <SelectItem value="profissional">Profissional — R$ 197/mês</SelectItem>
                    <SelectItem value="enterprise">Enterprise — R$ 347/mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status da assinatura</Label>
                <Select value={planForm.subscription_status} onValueChange={v => setPlanForm({ ...planForm, subscription_status: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trial até</Label>
                <Input type="date" value={planForm.trial_end} onChange={e => setPlanForm({ ...planForm, trial_end: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingPlan(null)}>Cancelar</Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSavePlan}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </motion.div>
    </AppLayout>
  );
};

export default AdminPanel;