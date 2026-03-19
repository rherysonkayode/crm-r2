import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, User, Lock, Mail, Building2, Camera, Check,
  Eye, EyeOff, Moon, Sun, Palette, Users, UserPlus, Trash2,
  ToggleLeft, ToggleRight, Copy, Send, AlertTriangle, Phone,
  TrendingUp, UserCheck, UserX, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  corretor: "Corretor",
  imobiliaria: "Imobiliaria",
};

const baseTabs = [
  { id: "perfil",    label: "Perfil",      icon: User },
  { id: "seguranca", label: "Seguranca",   icon: Lock },
  { id: "permissoes",label: "Permissoes",  icon: ShieldAlert },
  { id: "plano",     label: "Plano",       icon: Building2 },
  { id: "aparencia", label: "Aparencia",   icon: Palette },
];

const teamTab = { id: "equipe", label: "Equipe", icon: Users };

// ─── Hook: corretores da empresa com métricas ──────────────────────────────
const useTeamData = (companyId: string | null | undefined) => {
  return useQuery({
    queryKey: ["team", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Busca corretores + seus leads
      const { data: corretores, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url, status, created_at, role")
        .eq("company_id", companyId)
        .eq("role", "corretor")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Busca contagem de leads por corretor
      const { data: leads } = await supabase
        .from("leads")
        .select("assigned_to, status")
        .eq("company_id", companyId);

      return (corretores ?? []).map((c) => {
        const myLeads      = leads?.filter((l) => l.assigned_to === c.id) ?? [];
        const converted    = myLeads.filter((l) => l.status === "convertido").length;
        const active       = myLeads.filter((l) => !["convertido", "perdido"].includes(l.status)).length;
        const convRate     = myLeads.length > 0 ? Math.round((converted / myLeads.length) * 100) : 0;
        return { ...c, totalLeads: myLeads.length, converted, active, convRate };
      });
    },
    enabled: !!companyId,
  });
};

// ─── Componente principal ──────────────────────────────────────────────────
const Settings = () => {
  const { profile, isCorretor, isImobiliaria, isCorretorVinculado, companyProfile } = useAuth();
  const { canCreateProperties, canManageUsers, canViewAllLeads } = usePermissions();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Start e Pro são planos individuais — sem gestão de equipe
  const hasTeamPlan = ["profissional", "enterprise"].includes(profile?.plan ?? "");
  const canManageTeam = (isImobiliaria || canManageUsers) && hasTeamPlan;
  const tabs = canManageTeam ? [...baseTabs, teamTab] : baseTabs;

  const [activeTab, setActiveTab]         = useState("perfil");
  const [selectedTheme, setSelectedTheme] = useState(theme);

  // Perfil
  const [fullName, setFullName]           = useState(profile?.full_name || "");
  const [phone, setPhone]                 = useState(profile?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl]               = useState(profile?.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar]   = useState(false);

  // Senha
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]                 = useState(false);
  const [showCurrent, setShowCurrent]         = useState(false);
  const [savingPassword, setSavingPassword]   = useState(false);

  // Email
  const [newEmail, setNewEmail]       = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Equipe
  const { data: teamData, isLoading: loadingTeam } = useTeamData(profile?.company_id);
  const [inviteEmail, setInviteEmail]   = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<any>(null);
  const [togglingId, setTogglingId]     = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // ── Handlers Perfil ──────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande. Maximo 2MB."); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${profile!.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const url = data.publicUrl + "?t=" + Date.now();
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile!.id);
      if (updateError) throw updateError;
      setAvatarUrl(url);
      toast.success("Foto atualizada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!avatarUrl) return;
    setUploadingAvatar(true);
    try {
      const ext = avatarUrl.split(".").pop()?.split("?")[0];
      await supabase.storage.from("avatars").remove([`${profile!.id}.${ext}`]);
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile!.id);
      setAvatarUrl("");
      toast.success("Foto removida!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "").slice(0, 15);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { toast.error("Informe seu nome"); return; }
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", profile!.id);
      if (error) throw error;
      toast.success("Perfil atualizado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordRequirements = [
    { regex: /.{8,}/,                    label: "Pelo menos 8 caracteres" },
    { regex: /[A-Z]/,                    label: "Uma letra maiuscula" },
    { regex: /[a-z]/,                    label: "Uma letra minuscula" },
    { regex: /[0-9]/,                    label: "Um numero" },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, label: "Um caractere especial" },
  ];
  const passwordStrength = passwordRequirements.filter(r => r.regex.test(newPassword)).length;
  const isPasswordValid  = passwordStrength === passwordRequirements.length;

  const handleSavePassword = async () => {
    if (!isPasswordValid) { toast.error("A senha nao atende aos requisitos"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas nao coincidem"); return; }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada!");
      setNewPassword(""); setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error("Informe um e-mail valido"); return; }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Link de confirmacao enviado!");
      setNewEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar e-mail");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSaveTheme = () => { setTheme(selectedTheme); toast.success("Tema atualizado!"); };

  // ── Handlers Equipe ──────────────────────────────────────────────────────
  const handleSendInvite = async () => {
    if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Informe um e-mail valido"); return;
    }
    if (!profile?.company_id) {
      toast.error("Sua conta nao esta vinculada a uma empresa. Contate o suporte."); return;
    }
    setSendingInvite(true);
    try {
      // Verifica se o e-mail já tem conta no sistema
      const { data: alreadyExists } = await supabase.rpc("email_already_exists" as any, { check_email: inviteEmail });
      if (alreadyExists) {
        toast.error("Este e-mail já possui uma conta no CRM R2. O convite só pode ser enviado para novos usuários.");
        setSendingInvite(false);
        return;
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const { error } = await supabase.from("team_invites").insert({
        company_id: profile.company_id,
        created_by: profile.id,
        email:      inviteEmail,
        token,
        status:     "pendente",
        tipo:       "manual",
        expires_at: expiresAt.toISOString(),
      } as any);
      if (error) throw error;
      const inviteLink = `${window.location.origin}/#/convite/${token}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Convite criado! Link copiado — envie ao corretor.", { duration: 6000 });
      setInviteEmail("");
    } catch (e: any) {
      toast.error("Erro ao gerar convite: " + e.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!profile?.company_id) {
      toast.error("Sua conta nao esta vinculada a uma empresa."); return;
    }
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const { error } = await supabase.from("team_invites").insert({
        company_id: profile.company_id,
        created_by: profile.id,
        email:      null,
        token,
        status:     "pendente",
        tipo:       "link",
        expires_at: expiresAt.toISOString(),
      } as any);
      if (error) throw error;
      const link = `${window.location.origin}/#/convite/${token}`;
      setGeneratedLink(link);
      toast.success("Link gerado! Copie abaixo.", { duration: 4000 });
    } catch (e: any) {
      toast.error("Erro ao gerar link: " + e.message);
    }
  };

  const handleToggleStatus = async (corretor: any) => {
    setTogglingId(corretor.id);
    const newStatus = corretor.status === "ativo" ? "inativo" : "ativo";
    try {
      const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", corretor.id);
      if (error) throw error;
      toast.success(`Corretor ${newStatus === "ativo" ? "ativado" : "desativado"}!`);
      queryClient.invalidateQueries({ queryKey: ["team", profile?.company_id] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleRemoveCorretor = async () => {
    if (!removeTarget) return;
    try {
      // Desvincula leads do corretor
      await supabase.from("leads").update({ assigned_to: null }).eq("assigned_to", removeTarget.id);
      // Remove company_id do perfil (desvincular, não excluir a conta)
      const { error } = await supabase.from("profiles").update({ company_id: null, status: "inativo" }).eq("id", removeTarget.id);
      if (error) throw error;
      toast.success(`${removeTarget.full_name} foi removido da equipe.`);
      queryClient.invalidateQueries({ queryKey: ["team", profile?.company_id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover corretor");
    } finally {
      setRemoveTarget(null);
    }
  };

  // ── Métricas da equipe ────────────────────────────────────────────────────
  const totalAtivos    = teamData?.filter(c => c.status === "ativo").length  ?? 0;
  const totalInativos  = teamData?.filter(c => c.status !== "ativo").length  ?? 0;
  const totalLeadsTeam = teamData?.reduce((s, c) => s + c.totalLeads, 0)     ?? 0;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold mb-1">Configuracoes</h1>
        <p className="text-muted-foreground mb-6">Gerencie sua conta e preferencias</p>

        {/* Mobile: scroll horizontal */}
        <div className="flex sm:hidden gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all",
                  activeTab === tab.id ? "bg-[#7E22CE] text-white shadow-sm" : "bg-muted text-muted-foreground"
                )}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Desktop: sidebar + conteudo */}
        <div className="flex gap-6 max-w-4xl">
          <div className="hidden sm:flex w-44 shrink-0 flex-col space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                    activeTab === tab.id ? "bg-[#7E22CE] text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                  <Icon className="w-4 h-4 shrink-0" />{tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 space-y-5">

            {/* ── ABA PERFIL ── */}
            {activeTab === "perfil" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-[#7E22CE]" /> Informacoes pessoais</h2>
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="relative group shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-purple-100" />
                      ) : (
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-2xl font-bold text-[#7E22CE]">
                          {(profile?.full_name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploadingAvatar ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                      </label>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{profile?.full_name || "-"}</p>
                      <p className="text-sm text-muted-foreground">{profile?.role ? roleLabels[profile.role] : "-"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{profile?.company_id ? "Vinculado a uma imobiliaria" : "Corretor independente"}</p>
                      {avatarUrl && <button onClick={handleDeleteAvatar} disabled={uploadingAvatar} className="text-xs text-red-400 hover:text-red-600 mt-1">Remover foto</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ""))} /></div>
                    <div className="space-y-2"><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-[#7E22CE] hover:bg-purple-700 w-full sm:w-auto">
                    {savingProfile ? "Salvando..." : "Salvar alteracoes"}
                  </Button>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-[#7E22CE]" /> Alterar e-mail</h2>
                  <p className="text-sm text-muted-foreground">E-mail atual: <strong>{profile?.email || "-"}</strong></p>
                  <div className="space-y-2"><Label>Novo e-mail</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@email.com" /></div>
                  <Button onClick={handleSaveEmail} disabled={savingEmail || !newEmail} className="bg-[#7E22CE] hover:bg-purple-700 w-full sm:w-auto">
                    {savingEmail ? "Enviando..." : "Alterar e-mail"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── ABA SEGURANCA ── */}
            {activeTab === "seguranca" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-[#7E22CE]" /> Alterar senha</h2>
                  <div className="space-y-2">
                    <Label>Nova senha</Label>
                    <div className="relative">
                      <Input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-2 mt-2">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all",
                              i <= passwordStrength ? (i <= 2 ? "bg-red-400" : i <= 4 ? "bg-yellow-400" : "bg-green-500") : "bg-slate-100")} />
                          ))}
                        </div>
                        <ul className="space-y-1">
                          {passwordRequirements.map(req => (
                            <li key={req.label} className={cn("text-xs flex items-center gap-1.5", req.regex.test(newPassword) ? "text-green-600" : "text-slate-400")}>
                              <span>{req.regex.test(newPassword) ? "✓" : "○"}</span> {req.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar nova senha</Label>
                    <div className="relative">
                      <Input type={showCurrent ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-10" />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500">As senhas nao coincidem</p>}
                    {confirmPassword && newPassword === confirmPassword && <p className="text-xs text-green-600">✓ Senhas coincidem</p>}
                  </div>
                  <Button onClick={handleSavePassword} disabled={savingPassword || !isPasswordValid || newPassword !== confirmPassword} className="bg-[#7E22CE] hover:bg-purple-700 w-full sm:w-auto">
                    {savingPassword ? "Salvando..." : "Alterar senha"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── ABA PERMISSOES ── */}
            {activeTab === "permissoes" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-[#7E22CE]" /> Permissoes do seu perfil</h2>
                  <p className="text-sm text-muted-foreground">Essas permissoes sao definidas pelo seu tipo de conta.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PermRow label="Gerenciar leads"       allowed={true} />
                    <PermRow label="Ver todos os leads"    allowed={canViewAllLeads} />
                    <PermRow label="Gerenciar imoveis"     allowed={canCreateProperties} />
                    <PermRow label="Gerenciar funil"       allowed={true} />
                    <PermRow label="Gerenciar equipe"      allowed={canManageUsers} />
                    <PermRow label="Ver relatorios gerais" allowed={isImobiliaria} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ABA PLANO ── */}
            {activeTab === "plano" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-[#7E22CE]" /> Plano atual</h2>

                  {isCorretorVinculado ? (
                    /* Corretor vinculado — mostrar info da imobiliária */
                    <div className="space-y-4">
                      <div className="flex flex-col items-center text-center py-6 space-y-3 bg-muted/30 rounded-xl">
                        <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-7 h-7 text-[#7E22CE]" />
                        </div>
                        <div>
                          <p className="font-bold">Acesso gerenciado pela imobiliária</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Seu acesso está incluído no plano da imobiliária. Você não precisa de assinatura separada.
                          </p>
                        </div>
                      </div>
                      {companyProfile && (
                        <div className="p-4 bg-muted/40 rounded-xl space-y-2">
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Imobiliária</p>
                          <p className="font-bold">{companyProfile.full_name}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Plano:</span>
                            <span className="font-bold text-[#7E22CE] uppercase">{companyProfile.plan || "—"}</span>
                          </div>
                          {companyProfile.trial_end && companyProfile.subscription_status === "trial" && (
                            <p className="text-xs text-muted-foreground">
                              Trial válido até: <strong>{new Date(companyProfile.trial_end).toLocaleDateString("pt-BR")}</strong>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Imobiliária / corretor independente — mostrar plano e upgrade */
                    <>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-purple-100 text-[#7E22CE] uppercase tracking-wide">{profile?.plan || "Free"}</span>
                        <span className="text-sm text-muted-foreground">{profile?.plan ? `Plano ${profile.plan} ativo` : "Funcionalidades basicas incluidas"}</span>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-4 sm:p-5 space-y-3">
                        <p className="font-semibold text-slate-800">Faca upgrade do seu plano</p>
                        <p className="text-sm text-slate-500">Desbloqueie mais leads, relatorios avancados e convite de corretores.</p>
                        <Button className="bg-[#7E22CE] hover:bg-purple-700 w-full" onClick={() => window.location.href = "/#/subscription"}>
                          Ver planos disponiveis
                        </Button>
                      </div>
                      {profile?.trial_end && (
                        <p className="text-xs text-muted-foreground">Periodo de teste ate: <strong>{new Date(profile.trial_end).toLocaleDateString("pt-BR")}</strong></p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── ABA APARENCIA ── */}
            {activeTab === "aparencia" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-[#7E22CE]" /> Aparencia do sistema</h2>
                  <RadioGroup value={selectedTheme} onValueChange={(v: any) => setSelectedTheme(v)} className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light",  label: "Claro",   icon: <Sun className="h-5 w-5" /> },
                      { value: "dark",   label: "Escuro",  icon: <Moon className="h-5 w-5" /> },
                      { value: "system", label: "Sistema", icon: <div className="flex gap-0.5"><Sun className="h-4 w-4" /><Moon className="h-4 w-4" /></div> },
                    ].map(opt => (
                      <div key={opt.value}>
                        <RadioGroupItem value={opt.value} id={opt.value} className="peer sr-only" />
                        <Label htmlFor={opt.value}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-muted bg-popover p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#7E22CE] cursor-pointer transition-all">
                          {opt.icon}
                          <span className="text-xs sm:text-sm font-medium">{opt.label}</span>
                          {selectedTheme === opt.value && <Check className="h-3.5 w-3.5 text-[#7E22CE]" />}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button onClick={handleSaveTheme} className="bg-[#7E22CE] hover:bg-purple-700 w-full sm:w-auto mt-2">
                    Salvar preferencia de tema
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── ABA EQUIPE ── */}
            {activeTab === "equipe" && canManageTeam && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* Mini-stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-[#7E22CE]">{teamData?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{totalAtivos}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ativos</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-slate-400">{totalLeadsTeam}</p>
                    <p className="text-xs text-muted-foreground mt-1">Leads</p>
                  </div>
                </div>

                {/* Convidar corretor */}
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#7E22CE]" /> Convidar corretor</h2>
                  <p className="text-sm text-muted-foreground">
                    Informe o e-mail do corretor e copie o link de convite para compartilhar.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@corretor.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSendInvite} disabled={sendingInvite || !inviteEmail} className="bg-[#7E22CE] hover:bg-purple-700 shrink-0">
                      <Send className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">{sendingInvite ? "Gerando..." : "Copiar convite"}</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">ou</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <Button variant="outline" onClick={handleCopyInviteLink} className="w-full gap-2">
                    <Copy className="w-4 h-4" />
                    Copiar link geral de cadastro
                  </Button>
                  {generatedLink && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Link gerado — copie e envie ao corretor:</Label>
                      <div className="flex gap-2">
                        <Input value={generatedLink} readOnly className="text-xs font-mono bg-slate-50" onClick={e => (e.target as HTMLInputElement).select()} />
                        <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("Copiado!"); }}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <button onClick={() => setGeneratedLink(null)} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    O corretor acessa o link, cria sua conta e fica automaticamente vinculado à sua imobiliaria.
                  </p>
                </div>

                {/* Lista de corretores */}
                <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#7E22CE]" /> Corretores da equipe</h2>

                  {loadingTeam ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : !teamData || teamData.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/20 mb-3" />
                      <p className="font-medium text-slate-600 mb-1">Nenhum corretor na equipe</p>
                      <p className="text-sm text-muted-foreground">Use o convite acima para adicionar corretores.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {teamData.map((corretor) => {
                          const isAtivo = corretor.status === "ativo";
                          const isToggling = togglingId === corretor.id;
                          return (
                            <motion.div
                              key={corretor.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                isAtivo ? "border-border bg-card" : "border-dashed border-slate-200 bg-slate-50/50 opacity-70"
                              )}
                            >
                              {/* Avatar */}
                              <div className="shrink-0">
                                {corretor.avatar_url ? (
                                  <img src={corretor.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-[#7E22CE]">
                                    {(corretor.full_name || "?")[0].toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm truncate">{corretor.full_name || "Sem nome"}</p>
                                  <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    isAtivo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                                  )}>
                                    {isAtivo ? "Ativo" : "Inativo"}
                                  </span>
                                </div>
                                {corretor.phone && <p className="text-xs text-muted-foreground truncate">{corretor.phone}</p>}
                                {/* Métricas rápidas */}
                                <div className="flex gap-3 mt-1.5">
                                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <TrendingUp className="w-3 h-3" />{corretor.totalLeads} leads
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-green-600">
                                    <UserCheck className="w-3 h-3" />{corretor.converted} conv.
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-purple-600">
                                    {corretor.convRate}% tx
                                  </span>
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Toggle ativo/inativo */}
                                <button
                                  onClick={() => handleToggleStatus(corretor)}
                                  disabled={isToggling}
                                  title={isAtivo ? "Desativar" : "Ativar"}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                >
                                  {isToggling
                                    ? <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                                    : isAtivo
                                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                                      : <ToggleLeft className="w-5 h-5 text-slate-400" />
                                  }
                                </button>

                                {/* Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                      <MoreVertical className="w-4 h-4 text-slate-400" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    {corretor.phone && (
                                      <DropdownMenuItem onClick={() => window.open(`https://wa.me/55${corretor.phone.replace(/\D/g, "")}`)}>
                                        <Phone className="w-3.5 h-3.5 mr-2" />WhatsApp
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem
                                      className="text-red-500 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => setRemoveTarget(corretor)}
                                    >
                                      <UserX className="w-3.5 h-3.5 mr-2" />Remover da equipe
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

          </div>
        </div>
      </motion.div>

      {/* AlertDialog remover corretor */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Remover corretor da equipe?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{removeTarget?.full_name}</strong> sera desvinculado da sua imobiliaria.
              </span>
              {removeTarget?.totalLeads > 0 && (
                <span className="block text-amber-600 font-medium">
                  ⚠ Este corretor possui {removeTarget.totalLeads} lead(s). Eles ficarao sem responsavel atribuido.
                </span>
              )}
              <span className="block text-muted-foreground text-xs">
                A conta do corretor nao sera excluida — apenas o vinculo com a sua imobiliaria sera removido.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCorretor} className="bg-red-600 hover:bg-red-700">
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
};

const PermRow = ({ label, allowed }: { label: string; allowed: boolean }) => (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
    <div className={cn("w-2 h-2 rounded-full shrink-0", allowed ? "bg-green-500" : "bg-slate-200")} />
    <span className={cn("text-sm", allowed ? "text-card-foreground font-medium" : "text-muted-foreground")}>{label}</span>
    {allowed && <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />}
  </div>
);

export default Settings;