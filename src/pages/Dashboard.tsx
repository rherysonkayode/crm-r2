import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useLeads, useProperties, useDeals, useProfiles } from "@/hooks/useCompanyData";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Building2, Handshake, DollarSign, TrendingUp, Trophy, Calendar, Plus, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format, isToday, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

interface ProfileWithStatus {
  id: string;
  full_name: string;
  role?: string;
  company_id?: string;
  status?: string;
}

const Dashboard = () => {
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const { data: leads, isLoading: loadingLeads } = useLeads();
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const { data: deals, isLoading: loadingDeals } = useDeals();
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: events, isLoading: loadingEvents } = useCalendarEvents();

  const isLoading = loadingLeads || loadingProperties || loadingDeals || loadingEvents || loadingProfiles;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const meusLeads = leads?.filter(l => l.assigned_to === profile?.id) ?? [];
  const meusLeadsAtivos = meusLeads.filter(l => !["convertido", "perdido"].includes(l.status)).length;
  const meusLeadsConvertidos = meusLeads.filter(l => l.status === "convertido").length;
  const meusNegocios = deals?.filter(d => {
    const lead = leads?.find(l => l.id === d.lead_id);
    return lead?.assigned_to === profile?.id;
  }) ?? [];
  const minhaReceita = meusNegocios
    .filter(d => d.stage === "fechado")
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const totalLeads = leads?.length ?? 0;
  const totalProperties = properties?.length ?? 0;
  const closedDeals = deals?.filter(d => d.stage === "fechado").length ?? 0;
  const totalRevenue = deals
    ?.filter(d => d.stage === "fechado")
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0) ?? 0;

  const funnelStages = [
    { name: "Novo",     value: deals?.filter(d => d.stage === "novo").length ?? 0,     color: "#D8B4E2" },
    { name: "Contato",  value: deals?.filter(d => d.stage === "contato").length ?? 0,  color: "#C084FC" },
    { name: "Proposta", value: deals?.filter(d => d.stage === "proposta").length ?? 0, color: "#9333EA" },
    { name: "Fechado",  value: deals?.filter(d => d.stage === "fechado").length ?? 0,  color: "#7E22CE" },
    { name: "Perdido",  value: deals?.filter(d => d.stage === "perdido").length ?? 0,  color: "#F87171" },
  ];

  const profilesList = (profiles || []) as ProfileWithStatus[];
  const corretorRanking = profilesList
    .filter(p => p.role === "corretor" && p.company_id === profile?.company_id)
    .map(p => {
      const corretorDeals = deals?.filter(d => {
        const lead = leads?.find(l => l.id === d.lead_id);
        return lead?.assigned_to === p.id && d.stage === "fechado";
      }) ?? [];
      const revenue = corretorDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      return { name: p.full_name || "Sem nome", deals: corretorDeals.length, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const todayEvents = events?.filter(ev => isToday(parseISO(ev.start_at))) ?? [];

  const corretoresAtivos = profilesList.filter(
    p => p.role === "corretor" && p.company_id === profile?.company_id && p.status === "ativo"
  ).length ?? 0;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* Aviso de trial — aparece UMA vez */}
        {profile?.subscription_status === "trial" && profile.trial_end && (
          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              ⏳ Seu período de teste termina em{" "}
              {Math.max(0, differenceInDays(new Date(profile.trial_end), new Date()))} dia(s).
              Aproveite para explorar todas as funcionalidades!
            </AlertDescription>
          </Alert>
        )}

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              {isCorretor
                ? `Olá, ${profile?.full_name?.split(" ")[0] || "Corretor"}! Aqui estão suas métricas.`
                : "Visão geral da sua imobiliária"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/leads"><Plus className="w-4 h-4 mr-2" />Novo Lead</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#7E22CE] hover:bg-[#6b21a8]">
              <Link to="/funnel"><TrendingUp className="w-4 h-4 mr-2" />Ver Funil</Link>
            </Button>
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 sm:h-32 rounded-2xl" />)
          ) : isCorretor ? (
            <>
              <StatCard title="Meus Leads"    value={meusLeads.length}            icon={Users}     accentColor="primary"  />
              <StatCard title="Leads Ativos"  value={meusLeadsAtivos}             icon={TrendingUp} accentColor="info"    />
              <StatCard title="Convertidos"   value={meusLeadsConvertidos}        icon={Handshake}  accentColor="success" />
              <StatCard title="Minha Receita" value={formatCurrency(minhaReceita)} icon={DollarSign} accentColor="warning" />
            </>
          ) : (
            <>
              <StatCard title="Total de Leads"      value={totalLeads}                  icon={Users}     accentColor="primary"  />
              <StatCard title="Imóveis"             value={totalProperties}             icon={Building2} accentColor="info"     />
              <StatCard title="Negócios Fechados"   value={closedDeals}                 icon={Handshake} accentColor="success"  />
              <StatCard title="Receita Total"       value={formatCurrency(totalRevenue)} icon={DollarSign} accentColor="warning" />
            </>
          )}
        </div>

        {/* Funil + Ranking/Eventos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Funil de Vendas</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/funnel">Ver detalhes <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[240px] w-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={funnelStages} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category" dataKey="name"
                      tick={{ fontSize: 13, fill: "#64748B", fontWeight: 500 }}
                      width={70} axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#F8FAFC" }}
                      contentStyle={{ background: "#0B1120", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }}
                      formatter={(value: number) => [`${value} negócios`, ""]}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                      {funnelStages.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {isImobiliaria
                  ? <><Trophy className="w-5 h-5 text-amber-500" />Ranking de Corretores</>
                  : <><Calendar className="w-5 h-5 text-primary" />Compromissos Hoje</>
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : isImobiliaria ? (
                corretorRanking.length > 0 ? (
                  <div className="space-y-3">
                    {corretorRanking.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm",
                          i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white" :
                          i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                          i === 2 ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white" :
                          "bg-white text-slate-400 border border-slate-200"
                        )}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.deals} negócio(s) fechado(s)</p>
                        </div>
                        <span className="font-bold text-sm text-[#7E22CE]">{formatCurrency(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado de ranking ainda.</p>
                )
              ) : todayEvents.length > 0 ? (
                <div className="space-y-3">
                  {todayEvents.slice(0, 5).map(ev => (
                    <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg border border-slate-100">
                      <div className={cn("w-2 h-2 mt-1.5 rounded-full", ev.completed ? "bg-green-500" : "bg-primary")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-slate-500">
                          {ev.all_day ? "Dia inteiro" : format(parseISO(ev.start_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {todayEvents.length > 5 && (
                    <Button variant="link" size="sm" asChild className="px-0">
                      <Link to="/calendar">Ver todos</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum compromisso para hoje.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leads Recentes + Equipe */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Meus Leads Recentes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/leads">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (isCorretor ? meusLeads : leads)?.length > 0 ? (
                <div className="divide-y divide-border">
                  {(isCorretor ? meusLeads : leads)?.slice(0, 5).map(lead => (
                    <div key={lead.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email || lead.phone || "Sem contato"}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-1 rounded-full",
                        lead.status === "novo"        ? "bg-blue-100 text-blue-700" :
                        lead.status === "contato"     ? "bg-purple-100 text-purple-700" :
                        lead.status === "qualificado" ? "bg-amber-100 text-amber-700" :
                        lead.status === "proposta"    ? "bg-orange-100 text-orange-700" :
                        lead.status === "convertido"  ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {lead.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead encontrado.</p>
              )}
            </CardContent>
          </Card>

          {isImobiliaria && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <span className="text-5xl font-bold text-purple-700">{corretoresAtivos}</span>
                    <p className="text-sm text-muted-foreground mt-2">corretores ativos</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link to="/team">Gerenciar equipe</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;