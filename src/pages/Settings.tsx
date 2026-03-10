import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ShieldAlert, User, Lock, Mail, Bell, Building2, Users, Camera, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  corretor: "Corretor",
  imobiliaria: "Imobiliaria",
};

const tabs = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "seguranca", label: "Seguranca", icon: Lock },
  { id: "permissoes", label: "Permissoes", icon: ShieldAlert },
  { id: "plano", label: "Plano", icon: Building2 },
];

const Settings = () => {
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const { canCreateProperties, canManageUsers, canViewAllLeads } = usePermissions();

  const [activeTab, setActiveTab] = useState("perfil");

  // Perfil
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const passwordRequirements = [
    { regex: /.{8,}/, label: "Pelo menos 8 caracteres" },
    { regex: /[A-Z]/, label: "Uma letra maiuscula" },
    { regex: /[a-z]/, label: "Uma letra minuscula" },
    { regex: /[0-9]/, label: "Um numero" },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, label: "Um caractere especial" },
  ];
  const passwordStrength = passwordRequirements.filter(r => r.regex.test(newPassword)).length;
  const isPasswordValid = passwordStrength === passwordRequirements.length;

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "").slice(0, 15);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { toast.error("Informe seu nome"); return; }
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", profile!.id);
      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword) { toast.error("Informe a nova senha"); return; }
    if (!isPasswordValid) { toast.error("A senha nao atende aos requisitos"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas nao coincidem"); return; }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      toast.success("Um link de confirmacao foi enviado para o novo e-mail!");
      setNewEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar e-mail");
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold mb-1">Configuracoes</h1>
        <p className="text-muted-foreground mb-6">Gerencie sua conta e preferencias</p>

        <div className="flex gap-6 max-w-4xl">
          {/* Sidebar de abas */}
          <div className="w-48 shrink-0 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                    activeTab === tab.id
                      ? "bg-[#7E22CE] text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Conteudo */}
          <div className="flex-1 space-y-5">

            {/* ABA PERFIL */}
            {activeTab === "perfil" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* Info basica */}
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-[#7E22CE]" /> Informacoes pessoais
                  </h2>

                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-2xl font-bold text-[#7E22CE]">
                      {(profile?.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{profile?.full_name || "-"}</p>
                      <p className="text-sm text-muted-foreground">{profile?.role ? roleLabels[profile.role] : "-"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profile?.company_id ? "Vinculado a uma imobiliaria" : "Corretor independente"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome completo</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ""))} placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-[#7E22CE] hover:bg-purple-700">
                    {savingProfile ? "Salvando..." : "Salvar alteracoes"}
                  </Button>
                </div>

                {/* Alterar e-mail */}
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#7E22CE]" /> Alterar e-mail
                  </h2>
                  <p className="text-sm text-muted-foreground">E-mail atual: <strong>{profile?.email || "-"}</strong></p>
                  <div className="space-y-2">
                    <Label>Novo e-mail</Label>
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@email.com" />
                  </div>
                  <p className="text-xs text-muted-foreground">Um link de confirmacao sera enviado para o novo e-mail.</p>
                  <Button onClick={handleSaveEmail} disabled={savingEmail || !newEmail} className="bg-[#7E22CE] hover:bg-purple-700">
                    {savingEmail ? "Enviando..." : "Alterar e-mail"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ABA SEGURANCA */}
            {activeTab === "seguranca" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#7E22CE]" /> Alterar senha
                  </h2>

                  <div className="space-y-2">
                    <Label>Nova senha</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nova senha"
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-2 mt-2">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all", i <= passwordStrength ? (i <= 2 ? "bg-red-400" : i <= 4 ? "bg-yellow-400" : "bg-green-500") : "bg-slate-100")} />
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
                      <Input
                        type={showCurrent ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500">As senhas nao coincidem</p>}
                    {confirmPassword && newPassword === confirmPassword && <p className="text-xs text-green-600">✓ Senhas coincidem</p>}
                  </div>

                  <Button onClick={handleSavePassword} disabled={savingPassword || !isPasswordValid || newPassword !== confirmPassword} className="bg-[#7E22CE] hover:bg-purple-700">
                    {savingPassword ? "Salvando..." : "Alterar senha"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ABA PERMISSOES */}
            {activeTab === "permissoes" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#7E22CE]" /> Permissoes do seu perfil
                  </h2>
                  <p className="text-sm text-muted-foreground">Essas permissoes sao definidas pelo seu tipo de conta.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <PermRow label="Gerenciar leads" allowed={true} />
                    <PermRow label="Ver todos os leads" allowed={canViewAllLeads} />
                    <PermRow label="Gerenciar imoveis" allowed={canCreateProperties} />
                    <PermRow label="Gerenciar funil" allowed={true} />
                    <PermRow label="Gerenciar equipe" allowed={canManageUsers} />
                    <PermRow label="Ver relatorios gerais" allowed={isImobiliaria} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ABA PLANO */}
            {activeTab === "plano" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#7E22CE]" /> Plano atual
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-purple-100 text-[#7E22CE] uppercase tracking-wide">
                      {profile?.plan || "Free"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {profile?.plan ? `Plano ${profile.plan} ativo` : "Funcionalidades basicas incluidas"}
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-5 space-y-3">
                    <p className="font-semibold text-slate-800">Faca upgrade do seu plano</p>
                    <p className="text-sm text-slate-500">Desbloqueie mais leads, relatorios avancados e convite de corretores.</p>
                    <Button className="bg-[#7E22CE] hover:bg-purple-700 w-full" onClick={() => window.location.href = "/#/assinatura"}>
                      Ver planos disponiveis
                    </Button>
                  </div>

                  {profile?.trial_end && (
                    <p className="text-xs text-muted-foreground">
                      Periodo de teste ate: <strong>{new Date(profile.trial_end).toLocaleDateString("pt-BR")}</strong>
                    </p>
                  )}
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </motion.div>
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