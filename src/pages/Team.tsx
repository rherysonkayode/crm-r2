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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  UserPlus,
  Mail,
  Link as LinkIcon,
  Copy,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  User,
  Pencil,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileWithFields {
  id: string;
  full_name: string;
  email?: string;
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
  start:        1,
  pro:          1,
  profissional: 5,
  enterprise:   20,
};

const Team = () => {
  const { profile, isImobiliaria } = useAuth();
  const queryClient = useQueryClient();
  const { data: profiles, isLoading: loadingProfiles, refetch: refetchProfiles } = useProfiles();
  const {
    invites,
    isLoading: loadingInvites,
    generateInviteLink,
    sendEmailInvite,
    cancelInvite,
    resendInvite,
  } = useInvites();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    cpf: "",
    creci: "",
    equipe: "",
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

  const checkPlanLimit = () => {
    const limit = PLAN_LIMITS[profile?.plan ?? "start"] ?? 1;
    const total = profilesList.length;
    if (total >= limit) {
      toast.error(`Limite do plano atingido (${total}/${limit} corretores). Faça upgrade para adicionar mais.`);
      return false;
    }
    return true;
  };

  const handleGenerateLink = async () => {
    if (!checkPlanLimit()) return;
    const result = await generateInviteLink.mutateAsync();
    const link = `${window.location.origin}/#/convite/${result.token}`;
    setGeneratedLink(link);
    toast.success("Link gerado! Copie abaixo.");
  };

  const handleSendInvites = async () => {
    if (!checkPlanLimit()) return;
    const emailList = emails
      .split(/[;,\n]/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));
    if (emailList.length === 0) {
      toast.error("Informe pelo menos um e-mail válido");
      return;
    }
    await sendEmailInvite.mutateAsync(emailList);
    setEmails("");
    toast.success(`${emailList.length} convite(s) enviado(s)!`);
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/#/convite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleCopyGeneratedLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copiado!");
  };

  const handleManualSubmit = async () => {
    if (!manualForm.full_name || !manualForm.email) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    if (!profile?.company_id) {
      toast.error("Sua conta não está vinculada a uma empresa.");
      return;
    }

    if (!checkPlanLimit()) return;

    try {
      // Verifica se e-mail já existe
      const { data: emailExists } = await supabase.rpc("email_already_exists" as any, { check_email: manualForm.email });
      if (emailExists) {
        toast.error("Este e-mail já possui uma conta no CRM R2.");
        return;
      }

      // Verifica telefone e CPF duplicados
      if (manualForm.phone || manualForm.cpf) {
        const { data: dupData } = await supabase.rpc("check_duplicate_fields" as any, {
          check_phone: manualForm.phone || null,
          check_cpf:   manualForm.cpf   || null,
        });
        if (dupData?.phone_exists) {
          toast.error("Este telefone já está cadastrado no sistema.");
          return;
        }
        if (dupData?.cpf_exists) {
          toast.error("Este CPF já está cadastrado no sistema.");
          return;
        }
      }

      // Cria convite com dados pré-preenchidos
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("team_invites" as any).insert({
        company_id: profile.company_id,
        created_by: profile.id,
        email: manualForm.email,
        token,
        status: "pendente",
        tipo: "manual",
        expires_at: expiresAt.toISOString(),
        // Dados extras pré-preenchidos
        full_name: manualForm.full_name,
        phone: manualForm.phone,
        cpf: manualForm.cpf,
        creci: manualForm.creci,
        equipe: manualForm.equipe,
      } as any);

      if (error) throw error;

      // Gera link e exibe
      const inviteLink = `${window.location.origin}/#/convite/${token}`;
      setGeneratedLink(inviteLink);
      setManualDialogOpen(false);
      setInviteDialogOpen(true);
      setManualForm({ full_name: "", email: "", phone: "", cpf: "", creci: "", equipe: "" });
      toast.success("Convite criado! Envie o link para o corretor.", { duration: 6000 });
    } catch (error: any) {
      toast.error("Erro ao criar convite: " + error.message);
    }
  };

  const handleAtivar = async (p: ProfileWithFields) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "ativo" })
        .eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.full_name} ativado!`);
      refetchProfiles();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar");
    } finally {
      setTogglingId(null);
    }
  };

  const handleRecusar = async (p: ProfileWithFields) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: null, status: "inativo" })
        .eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.full_name} removido da equipe.`);
      refetchProfiles();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao recusar");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDesativar = async (p: ProfileWithFields) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "inativo" })
        .eq("id", p.id);
      if (error) throw error;
      toast.success(`${p.full_name} desativado.`);
      refetchProfiles();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao desativar");
    } finally {
      setTogglingId(null);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const getStatusBadge = (status: string, expiresAt?: string) => {
    if (status === 'aceito') return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Aceito</Badge>;
    if (status === 'cancelado') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
    if (status === 'pendente' && expiresAt && isExpired(expiresAt)) return <Badge variant="outline" className="text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Expirado</Badge>;
    if (status === 'pendente') return <Badge variant="outline" className="text-blue-600 border-blue-200"><Mail className="w-3 h-3 mr-1" /> Pendente</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const profilesList = (profiles?.filter(p => p.company_id === profile?.company_id && p.role === 'corretor') || []) as ProfileWithFields[];
  const ativos = profilesList.filter(p => p.status === 'ativo').length;
  const inativos = profilesList.filter(p => p.status === 'inativo').length;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Equipe</h1>
            <p className="text-muted-foreground">Gerencie os corretores e convites</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Cadastrar manualmente */}
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar manualmente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar corretor manualmente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome completo *</Label>
                    <Input value={manualForm.full_name} onChange={(e) => setManualForm({ ...manualForm, full_name: e.target.value })} placeholder="João da Silva" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input type="email" value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} placeholder="corretor@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} placeholder="(21) 99999-9999" />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input value={manualForm.cpf} onChange={(e) => setManualForm({ ...manualForm, cpf: e.target.value })} placeholder="123.456.789-00" />
                  </div>
                  <div className="space-y-2">
                    <Label>CRECI</Label>
                    <Input value={manualForm.creci} onChange={(e) => setManualForm({ ...manualForm, creci: e.target.value })} placeholder="CRECI 12345" />
                  </div>
                  <div className="space-y-2">
                    <Label>Equipe</Label>
                    <Input value={manualForm.equipe} onChange={(e) => setManualForm({ ...manualForm, equipe: e.target.value })} placeholder="Ex: Equipe Premium" />
                  </div>
                  <Button onClick={handleManualSubmit} className="w-full bg-[#7E22CE] hover:bg-[#6b21a8]">
                    Cadastrar corretor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Convidar */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Convidar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Convidar para a equipe</DialogTitle>
                </DialogHeader>
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
                          <Button variant="outline" size="icon" onClick={handleCopyGeneratedLink}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Selecione o link acima e copie manualmente, ou clique no botão de copiar.</p>
                        <Button variant="ghost" className="w-full" onClick={handleGenerateLink}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Gerar novo link
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Gere um link de convite para compartilhar com o corretor por WhatsApp ou outro canal.</p>
                        <Button onClick={handleGenerateLink} className="w-full bg-[#7E22CE] hover:bg-[#6b21a8]" disabled={generateInviteLink.isPending}>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          {generateInviteLink.isPending ? "Gerando..." : "Gerar link de convite"}
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>E-mails (separados por ponto e vírgula)</Label>
                      <textarea
                        value={emails}
                        onChange={(e) => setEmails(e.target.value)}
                        placeholder="corretor@email.com; outro@email.com"
                        rows={4}
                        className="w-full p-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7E22CE]"
                      />
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total de corretores</p>
            <p className="text-3xl font-bold">{profilesList.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Ativos</p>
            <p className="text-3xl font-bold text-green-600">{ativos}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Pendentes</p>
            <p className="text-3xl font-bold text-amber-600">{inativos}</p>
          </div>
        </div>

        <Tabs defaultValue="membros" className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="membros">Membros ativos</TabsTrigger>
            <TabsTrigger value="pendentes">Pendentes {inativos > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{inativos}</span>}</TabsTrigger>
            <TabsTrigger value="convites">Convites enviados</TabsTrigger>
          </TabsList>

          {/* Membros ativos */}
          <TabsContent value="membros">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="min-w-[120px]">Telefone</TableHead>
                    <TableHead className="min-w-[120px]">CRECI</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profilesList.filter(p => p.status === 'ativo').map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link to={`/team/${p.id}`} className="text-[#7E22CE] hover:underline">
                          {p.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{p.phone || '-'}</TableCell>
                      <TableCell>{p.creci || '-'}</TableCell>
                      <TableCell><Badge variant="default" className="bg-green-100 text-green-700">Ativo</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/team/${p.id}`}><Pencil className="w-3 h-3" /></Link>
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs text-red-600"
                            disabled={togglingId === p.id}
                            onClick={() => handleDesativar(p)}>
                            <XCircle className="w-3 h-3 mr-1" />
                            Desativar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ativos === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum corretor ativo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Pendentes */}
          <TabsContent value="pendentes">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="min-w-[120px]">Telefone</TableHead>
                    <TableHead className="min-w-[120px]">CRECI</TableHead>
                    <TableHead className="min-w-[120px]">Cadastro</TableHead>
                    <TableHead className="min-w-[150px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profilesList.filter(p => p.status === 'inativo').map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link to={`/team/${p.id}`} className="text-[#7E22CE] hover:underline">
                          {p.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{p.phone || '-'}</TableCell>
                      <TableCell>{p.creci || '-'}</TableCell>
                      <TableCell>
                        {p.invited_at ? format(new Date(p.invited_at), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" className="text-xs bg-green-600 hover:bg-green-700"
                            disabled={togglingId === p.id}
                            onClick={() => handleAtivar(p)}>
                            {togglingId === p.id ? "..." : "Ativar"}
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs"
                            disabled={togglingId === p.id}
                            onClick={() => handleRecusar(p)}>
                            Recusar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inativos === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum corretor pendente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Convites */}
          <TabsContent value="convites">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Tipo</TableHead>
                    <TableHead className="min-w-[200px]">Destino</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Enviado em</TableHead>
                    <TableHead className="min-w-[120px]">Expira em</TableHead>
                    <TableHead className="min-w-[150px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites?.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.tipo === 'manual' ? 'E-mail' : 'Link'}</TableCell>
                      <TableCell>
                        {invite.email ? invite.email : (
                          <button onClick={() => handleCopyLink(invite.token)}
                            className="flex items-center gap-1 text-purple-600 hover:underline text-sm">
                            <LinkIcon className="w-3 h-3" />
                            Copiar link
                          </button>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(invite.status, invite.expires_at)}</TableCell>
                      <TableCell>{format(new Date(invite.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        {invite.expires_at ? formatDistanceToNow(new Date(invite.expires_at), { locale: ptBR, addSuffix: true }) : '-'}
                      </TableCell>
                      <TableCell>
                        {invite.status === 'pendente' && !isExpired(invite.expires_at) && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => resendInvite.mutate(invite)}>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Reenviar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs text-red-600" onClick={() => cancelInvite.mutate(invite.id)}>
                              <XCircle className="w-3 h-3 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invites || invites.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum convite enviado.
                      </TableCell>
                    </TableRow>
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