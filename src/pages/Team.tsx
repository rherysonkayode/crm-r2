import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useCompanyData";
import { useInvites } from "@/hooks/useInvites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Mail, Link as LinkIcon, Copy, RefreshCw, XCircle,
  CheckCircle, Clock, User, Pencil, TrendingUp, DollarSign,
  Trophy, Target, Users,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ProfileWithFields {
  id: string;
  full_name: string;
  phone?: string;
  cpf?: string;
  creci?: string;
  equipe?: string;
  status?: string;
  role?: string;
  company_id?: string;
  invited_at?: string;
  activated_at?: string;
  avatar_url?: string;
}

const PLAN_LIMITS: Record<string, number> = {
  start: 1, pro: 1, profissional: 5, enterprise: 20,
};

// ─── Hook: métricas por corretor ─────────────────────────────────────────
const useTeamMetrics = (companyId: string | null | undefined) => {
  return useQuery({
    queryKey: ["team_metrics", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data: corretores } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url, status, creci, equipe")
        .eq("company_id", companyId)
        .eq("role", "corretor")
        .eq("status", "ativo")
        .order("full_name");

      if (!corretores?.length) return [];

      const { data: leads } = await supabase
        .from("leads")
        .select("id, assigned_to, status")
        .eq("company_id", companyId);

      const { data: dealsRaw } = await supabase
        .from("deals")
        .select("id, assigned_to, value, stage, commission_rate")
        .eq("company_id", companyId)
        .eq("stage", "fechado") as any;
      const deals = (dealsRaw ?? []) as any[];

      return corretores.map(c => {
        const myLeads   = leads?.filter(l => l.assigned_to === c.id) ?? [];
        const myDeals   = deals?.filter(d => d.assigned_to === c.id) ?? [];
        const converted = myLeads.filter(l => l.status === "convertido").length;
        const totalVol  = myDeals.reduce((acc, d) => acc + (d.value ?? 0), 0);
        const totalCom  = myDeals.reduce((acc, d) => acc + (d.value ?? 0) * ((d.commission_rate ?? 6) / 100), 0);
        const convRate  = myLeads.length > 0 ? Math.round((converted / myLeads.length) * 100) : 0;
        return {
          ...c,
          totalLeads:  myLeads.length,
          totalVendas: myDeals.length,
          converted,
          convRate,
          totalVol,
          totalCom,
        };
      }).sort((a, b) => b.totalVendas - a.totalVendas);
    },
    enabled: !!companyId,
  });
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(val);

const Team = () => {
  const { profile, isImobiliaria } = useAuth();
  const queryClient = useQueryClient();
  const { data: profiles, isLoading: loadingProfiles, refetch: refetchProfiles } = useProfiles();
  const { data: teamMetrics, isLoading: loadingMetrics } = useTeamMetrics(profile?.company_id);
  const {
    invites, isLoading: loadingInvites,
    generateInviteLink, sendEmailInvite, cancelInvite, resendInvite,
  } = useInvites();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [emails,           setEmails]           = useState("");
  const [generatedLink,    setGeneratedLink]    = useState<string | null>(null);
  const [togglingId,       setTogglingId]       = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    full_name: "", email: "", phone: "", cpf: "", creci: "", equipe: "",
  });

  if (!isImobiliaria) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Acesso restrito</p>
          <p className="text-sm">Apenas imobiliárias podem gerenciar a equipe.</p>
        </div>
      </AppLayout>
    );
  }

  const profilesList = (profiles?.filter(p => p.company_id === profile?.company_id && p.role === "corretor") || []) as ProfileWithFields[];
  const ativos   = profilesList.filter(p => p.status === "ativo").length;
  const inativos = profilesList.filter(p => p.status === "inativo").length;

  const checkPlanLimit = () => {
    const limit = PLAN_LIMITS[profile?.plan ?? "start"] ?? 1;
    if (profilesList.length >= limit) {
      toast.error(`Limite do plano atingido (${profilesList.length}/${limit} corretores). Faça upgrade para adicionar mais.`);
      return false;
    }
    return true;
  };

  const handleGenerateLink = async () => {
    if (!checkPlanLimit()) return;
    const result = await generateInviteLink.mutateAsync();
    setGeneratedLink(`${window.location.origin}/#/convite/${result.token}`);
    toast.success("Link gerado! Copie abaixo.");
  };

  const handleSendInvites = async () => {
    if (!checkPlanLimit()) return;
    const emailList = emails.split(/[;,\n]/).map(e => e.trim()).filter(e => e.includes("@"));
    if (!emailList.length) { toast.error("Informe pelo menos um e-mail válido"); return; }
    await sendEmailInvite.mutateAsync(emailList);
    setEmails("");
    toast.success(`${emailList.length} convite(s) enviado(s)!`);
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#/convite/${token}`);
    toast.success("Link copiado!");
  };

  const handleManualSubmit = async () => {
    if (!manualForm.full_name || !manualForm.email) { toast.error("Nome e e-mail são obrigatórios"); return; }
    if (!profile?.company_id) { toast.error("Sua conta não está vinculada a uma empresa."); return; }
    if (!checkPlanLimit()) return;

    try {
      const { data: emailExists } = await supabase.rpc("email_already_exists" as any, { check_email: manualForm.email });
      if (emailExists) { toast.error("Este e-mail já possui uma conta no CRM R2."); return; }

      if (manualForm.phone || manualForm.cpf) {
        const { data: dupData } = await supabase.rpc("check_duplicate_fields" as any, {
          check_phone: manualForm.phone || null, check_cpf: manualForm.cpf || null,
        });
        if (dupData?.phone_exists) { toast.error("Este telefone já está cadastrado."); return; }
        if (dupData?.cpf_exists)   { toast.error("Este CPF já está cadastrado.");     return; }
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7);
      const { error } = await supabase.from("team_invites" as any).insert({
        company_id: profile.company_id, created_by: profile.id,
        email: manualForm.email, token, status: "pendente", tipo: "manual",
        expires_at: expiresAt.toISOString(),
        full_name: manualForm.full_name, phone: manualForm.phone,
        cpf: manualForm.cpf, creci: manualForm.creci, equipe: manualForm.equipe,
      } as any);
      if (error) throw error;

      setGeneratedLink(`${window.location.origin}/#/convite/${token}`);
      setManualDialogOpen(false);
      setInviteDialogOpen(true);
      setManualForm({ full_name: "", email: "", phone: "", cpf: "", creci: "", equipe: "" });
      toast.success("Convite criado! Envie o link para o corretor.", { duration: 6000 });
    } catch (e: any) { toast.error("Erro ao criar convite: " + e.message); }
  };

  const handleAtivar = async (p: ProfileWithFields) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase.from("profiles").update({ status: "ativo" }).eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.full_name} ativado!`);
      refetchProfiles();
    } catch (e: any) { toast.error(e.message); } finally { setTogglingId(null); }
  };

  const handleRecusar = async (p: ProfileWithFields) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase.from("profiles").update({ company_id: null, status: "inativo" }).eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.full_name} removido da equipe.`);
      refetchProfiles();
    } catch (e: any) { toast.error(e.message); } finally { setTogglingId(null); }
  };

  const handleDesativar = async (p: ProfileWithFields) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase.from("profiles").update({ status: "inativo" }).eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.full_name} desativado.`);
      refetchProfiles();
    } catch (e: any) { toast.error(e.message); } finally { setTogglingId(null); }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const getStatusBadge = (status: string, expiresAt?: string) => {
    if (status === "aceito")    return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Aceito</Badge>;
    if (status === "cancelado") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
    if (status === "pendente" && expiresAt && isExpired(expiresAt)) return <Badge variant="outline" className="text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" />Expirado</Badge>;
    if (status === "pendente")  return <Badge variant="outline" className="text-blue-600 border-blue-200"><Mail className="w-3 h-3 mr-1" />Pendente</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  // Totais para o ranking
  const totalVolEquipe = teamMetrics?.reduce((acc, c) => acc + c.totalVol, 0) ?? 0;
  const totalComEquipe = teamMetrics?.reduce((acc, c) => acc + c.totalCom, 0) ?? 0;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Equipe</h1>
            <p className="text-muted-foreground">Gerencie os corretores e acompanhe a performance</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><UserPlus className="w-4 h-4 mr-2" />Cadastrar manualmente</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Cadastrar corretor manualmente</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  {[
                    { label: "Nome completo *", key: "full_name", placeholder: "João da Silva" },
                    { label: "E-mail *",        key: "email",     placeholder: "corretor@email.com", type: "email" },
                    { label: "Telefone",        key: "phone",     placeholder: "(21) 99999-9999" },
                    { label: "CPF",             key: "cpf",       placeholder: "123.456.789-00" },
                    { label: "CRECI",           key: "creci",     placeholder: "CRECI 12345" },
                    { label: "Equipe",          key: "equipe",    placeholder: "Ex: Equipe Premium" },
                  ].map(f => (
                    <div key={f.key} className="space-y-2">
                      <Label>{f.label}</Label>
                      <Input type={f.type || "text"} value={(manualForm as any)[f.key]}
                        onChange={e => setManualForm({ ...manualForm, [f.key]: e.target.value })}
                        placeholder={f.placeholder} />
                    </div>
                  ))}
                  <Button onClick={handleManualSubmit} className="w-full bg-[#7E22CE] hover:bg-[#6b21a8]">Cadastrar corretor</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]"><UserPlus className="w-4 h-4 mr-2" />Convidar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Convidar para a equipe</DialogTitle></DialogHeader>
                <Tabs defaultValue="link" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="link">Link de convite</TabsTrigger>
                    <TabsTrigger value="email">Por e-mail</TabsTrigger>
                  </TabsList>
                  <TabsContent value="link" className="space-y-4 py-4">
                    {generatedLink ? (
                      <div className="space-y-3">
                        <Label>Link gerado — válido por 7 dias</Label>
                        <div className="flex gap-2">
                          <Input readOnly value={generatedLink} className="flex-1 text-xs font-mono" onClick={e => (e.target as HTMLInputElement).select()} />
                          <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("Copiado!"); }}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" className="w-full" onClick={handleGenerateLink}>
                          <RefreshCw className="w-4 h-4 mr-2" />Gerar novo link
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Gere um link para compartilhar com o corretor.</p>
                        <Button onClick={handleGenerateLink} className="w-full bg-[#7E22CE] hover:bg-[#6b21a8]" disabled={generateInviteLink.isPending}>
                          <LinkIcon className="w-4 h-4 mr-2" />{generateInviteLink.isPending ? "Gerando..." : "Gerar link de convite"}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="email" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>E-mails (separados por ponto e vírgula)</Label>
                      <textarea value={emails} onChange={e => setEmails(e.target.value)}
                        placeholder="corretor@email.com; outro@email.com" rows={4}
                        className="w-full p-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7E22CE]" />
                    </div>
                    <Button onClick={handleSendInvites} disabled={sendEmailInvite.isPending} className="w-full bg-[#7E22CE] hover:bg-[#6b21a8]">
                      {sendEmailInvite.isPending ? "Enviando..." : "Enviar convites"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total corretores</p>
            <p className="text-2xl font-bold">{profilesList.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Ativos</p>
            <p className="text-2xl font-bold text-green-600">{ativos}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Volume da equipe</p>
            <p className="text-2xl font-bold text-[#7E22CE]">{formatCurrency(totalVolEquipe)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Comissões geradas</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalComEquipe)}</p>
          </div>
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="performance" className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />Performance
            </TabsTrigger>
            <TabsTrigger value="membros">Membros ativos</TabsTrigger>
            <TabsTrigger value="pendentes">
              Pendentes {inativos > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{inativos}</span>}
            </TabsTrigger>
            <TabsTrigger value="convites">Convites enviados</TabsTrigger>
          </TabsList>

          {/* ── PERFORMANCE ─────────────────────────────────────────────────── */}
          <TabsContent value="performance">
            {loadingMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : !teamMetrics || teamMetrics.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center border border-dashed border-border rounded-xl bg-card">
                <Users className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="font-medium text-slate-600">Nenhum corretor ativo ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Adicione corretores para ver a performance da equipe.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ranking cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMetrics.map((c, idx) => {
                    const maxVol = teamMetrics[0]?.totalVol || 1;
                    const barPct = Math.max(5, Math.round((c.totalVol / maxVol) * 100));
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-card border border-border rounded-xl p-4 space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {c.avatar_url ? (
                              <img src={c.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-[#7E22CE]">
                                {(c.full_name || "?")[0].toUpperCase()}
                              </div>
                            )}
                            {idx === 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                                <Trophy className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{c.full_name}</p>
                            {c.equipe && <p className="text-xs text-muted-foreground truncate">{c.equipe}</p>}
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                        </div>

                        {/* Métricas */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Vendas</p>
                            <p className="text-lg font-bold text-[#7E22CE]">{c.totalVendas}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Leads</p>
                            <p className="text-lg font-bold">{c.totalLeads}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Conversão</p>
                            <p className="text-lg font-bold text-green-600">{c.convRate}%</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Comissão</p>
                            <p className="text-sm font-bold text-amber-600">{formatCurrency(c.totalCom)}</p>
                          </div>
                        </div>

                        {/* Barra de volume */}
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Volume</span>
                            <span>{formatCurrency(c.totalVol)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-[#7E22CE] rounded-full transition-all" style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Tabela resumo */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#7E22CE]" /> Ranking completo
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Corretor</TableHead>
                          <TableHead className="text-center">Leads</TableHead>
                          <TableHead className="text-center">Vendas</TableHead>
                          <TableHead className="text-center">Conversão</TableHead>
                          <TableHead className="text-right">Volume</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMetrics.map((c, idx) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {c.avatar_url ? (
                                  <img src={c.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-[#7E22CE]">
                                    {(c.full_name || "?")[0].toUpperCase()}
                                  </div>
                                )}
                                <Link to={`/team/${c.id}`} className="text-sm font-medium text-[#7E22CE] hover:underline">
                                  {c.full_name}
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{c.totalLeads}</TableCell>
                            <TableCell className="text-center font-semibold">{c.totalVendas}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                                c.convRate >= 50 ? "bg-green-100 text-green-700" :
                                c.convRate >= 20 ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-600"
                              )}>
                                {c.convRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-[#7E22CE]">{formatCurrency(c.totalVol)}</TableCell>
                            <TableCell className="text-right font-semibold text-amber-600">{formatCurrency(c.totalCom)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── MEMBROS ATIVOS ──────────────────────────────────────────────── */}
          <TabsContent value="membros">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CRECI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profilesList.filter(p => p.status === "ativo").map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link to={`/team/${p.id}`} className="text-[#7E22CE] hover:underline">{p.full_name}</Link>
                      </TableCell>
                      <TableCell>{p.phone || "-"}</TableCell>
                      <TableCell>{p.creci || "-"}</TableCell>
                      <TableCell><Badge className="bg-green-100 text-green-700">Ativo</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/team/${p.id}`}><Pencil className="w-3 h-3" /></Link>
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs text-red-600"
                            disabled={togglingId === p.id} onClick={() => handleDesativar(p)}>
                            <XCircle className="w-3 h-3 mr-1" />Desativar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ativos === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum corretor ativo.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── PENDENTES ───────────────────────────────────────────────────── */}
          <TabsContent value="pendentes">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CRECI</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profilesList.filter(p => p.status === "inativo").map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link to={`/team/${p.id}`} className="text-[#7E22CE] hover:underline">{p.full_name}</Link>
                      </TableCell>
                      <TableCell>{p.phone || "-"}</TableCell>
                      <TableCell>{p.creci || "-"}</TableCell>
                      <TableCell>{p.invited_at ? format(new Date(p.invited_at), "dd/MM/yyyy") : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700"
                            disabled={togglingId === p.id} onClick={() => handleAtivar(p)}>
                            {togglingId === p.id ? "..." : "Ativar"}
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs"
                            disabled={togglingId === p.id} onClick={() => handleRecusar(p)}>
                            Recusar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inativos === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum corretor pendente.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── CONVITES ────────────────────────────────────────────────────── */}
          <TabsContent value="convites">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites?.map(invite => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.tipo === "manual" ? "E-mail" : "Link"}</TableCell>
                      <TableCell>
                        {invite.email ? invite.email : (
                          <button onClick={() => handleCopyLink(invite.token)}
                            className="flex items-center gap-1 text-purple-600 hover:underline text-sm">
                            <LinkIcon className="w-3 h-3" />Copiar link
                          </button>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(invite.status, invite.expires_at)}</TableCell>
                      <TableCell>{format(new Date(invite.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{invite.expires_at ? formatDistanceToNow(new Date(invite.expires_at), { locale: ptBR, addSuffix: true }) : "-"}</TableCell>
                      <TableCell>
                        {invite.status === "pendente" && !isExpired(invite.expires_at) && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => resendInvite.mutate(invite)}>
                              <RefreshCw className="w-3 h-3 mr-1" />Reenviar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs text-red-600" onClick={() => cancelInvite.mutate(invite.id)}>
                              <XCircle className="w-3 h-3 mr-1" />Cancelar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invites || invites.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum convite enviado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AppLayout>
  );
};

export default Team;