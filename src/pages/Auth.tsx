import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, User, ArrowLeft, Mail, Lock, CheckCircle2, Phone, CreditCard, Eye, EyeOff, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";

type AccountType = "corretor" | "imobiliaria" | null;
type AreaAtuacao = "residencial" | "comercial" | "rural" | "todos";
type PlanType = "start" | "pro" | "profissional" | "enterprise" | null;

const plans = {
  corretor: [
    { id: "start",  name: "Start", description: "Para corretores autônomos começando", price: 97,  users: 1, leads: 200, imoveis: 50,  popular: false },
    { id: "pro",    name: "Pro",   description: "Para corretores com alta demanda",    price: 147, users: 1, leads: 500, imoveis: 150, popular: false },
  ],
  imobiliaria: [
    { id: "profissional", name: "Profissional", description: "Para imobiliárias pequenas", price: 197, users: 5,  leads: 1000, imoveis: 300,  popular: true  },
    { id: "enterprise",   name: "Enterprise",   description: "Para imobiliárias médias",   price: 347, users: 20, leads: 5000, imoveis: 1000, popular: false },
  ],
};

// ── Formatadores ──────────────────────────────────────────────────────────
const formatPhone = (v: string) => {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};
const formatCPF  = (v: string) => v.replace(/\D/g, "").slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
const formatCNPJ = (v: string) => v.replace(/\D/g, "").slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");

// ── Validadores ───────────────────────────────────────────────────────────
const isValidCPF = (cpf: string) => {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
  let r = 11 - (s % 11); if (r >= 10) r = 0;
  if (r !== parseInt(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
  r = 11 - (s % 11); if (r >= 10) r = 0;
  return r === parseInt(c[10]);
};

const isValidCNPJ = (cnpj: string) => {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  let s = 0, p = c.length - 2, n = c.substring(0, p), d = c.substring(p), pos = p - 7;
  for (let i = p; i >= 1; i--) { s += parseInt(n.charAt(p - i)) * pos--; if (pos < 2) pos = 9; }
  let r = s % 11 < 2 ? 0 : 11 - (s % 11);
  if (r !== parseInt(d.charAt(0))) return false;
  p++; n = c.substring(0, p); s = 0; pos = p - 7;
  for (let i = p; i >= 1; i--) { s += parseInt(n.charAt(p - i)) * pos--; if (pos < 2) pos = 9; }
  r = s % 11 < 2 ? 0 : 11 - (s % 11);
  return r === parseInt(d.charAt(1));
};

const hasMinTwoWords = (name: string) => name.trim().split(/\s+/).filter(Boolean).length >= 2;

const SUPABASE_URL = "https://ecmahLxwttfeatvpxwng.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const Auth = () => {
  const [isLogin, setIsLogin]               = useState(true);
  const [loading, setLoading]               = useState(false);
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingEmail, setCheckingEmail]   = useState(false);
  const [emailExists, setEmailExists]       = useState(false);

  const [fullName, setFullName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [cpf, setCpf]                 = useState("");
  const [creci, setCreci]             = useState("");
  const [companyName, setCompanyName] = useState("");
  const docType = "cnpj"; // Imobiliária só aceita CNPJ
  const [docValue, setDocValue]       = useState("");

  const [accountType, setAccountType]   = useState<AccountType>(null);
  const [areaAtuacao, setAreaAtuacao]   = useState<AreaAtuacao>("residencial");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null);
  const [step, setStep]                 = useState(1);
  const [acceptTerms, setAcceptTerms]   = useState(false);
  const navigate = useNavigate();

  // Erros por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const setFieldError = (field: string, msg: string) =>
    setFieldErrors(prev => ({ ...prev, [field]: msg }));
  const clearFieldError = (field: string) =>
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const passwordRequirements = [
    { regex: /.{8,}/,                    label: "Pelo menos 8 caracteres" },
    { regex: /[A-Z]/,                    label: "Uma letra maiúscula" },
    { regex: /[a-z]/,                    label: "Uma letra minúscula" },
    { regex: /[0-9]/,                    label: "Um número" },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, label: "Um caractere especial" },
  ];
  const passwordStrength = passwordRequirements.filter(r => r.regex.test(password)).length;
  const isPasswordValid  = passwordStrength === passwordRequirements.length;
  const totalSteps = 3;

  const resetAllStates = () => {
    setIsLogin(!isLogin); setStep(1); setAcceptTerms(false); setEmailExists(false);
    setAccountType(null); setSelectedPlan(null); setConfirmPassword("");
    setCpf(""); setDocValue(""); setPhone(""); setCreci(""); setFieldErrors({});
    setShowPassword(false); setShowConfirmPassword(false);
  };

  const checkEmailExists = async (emailToCheck: string) => {
    setCheckingEmail(true);
    try {
      const { data } = await (supabase.rpc as any)("check_email_exists", { email_to_check: emailToCheck });
      return !!data;
    } catch { return false; }
    finally { setCheckingEmail(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── STEP 1: e-mail + senha ───────────────────────────────────────────
    if (!isLogin && step === 1) {
      if (!isPasswordValid) { toast.error("A senha não atende aos requisitos mínimos"); return; }
      if (password !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
      const exists = await checkEmailExists(email);
      if (exists) { setEmailExists(true); toast.error("Este e-mail já está cadastrado."); return; }
      setStep(2);
      return;
    }

    // ── STEP 2: dados pessoais ───────────────────────────────────────────
    if (!isLogin && step === 2) {
      const errors: Record<string, string> = {};

      if (!accountType)  { toast.error("Selecione seu tipo de perfil"); return; }
      if (!selectedPlan) { toast.error("Selecione um plano para começar"); return; }

      if (!fullName.trim()) {
        errors.fullName = "Nome completo é obrigatório";
      } else if (!hasMinTwoWords(fullName)) {
        errors.fullName = "Informe nome e sobrenome";
      }

      if (!phone || phone.replace(/\D/g, "").length < 11) {
        errors.phone = "Celular com DDD obrigatório (11 dígitos)";
      }

      if (accountType === "corretor") {
        if (!cpf) {
          errors.cpf = "CPF é obrigatório";
        } else if (!isValidCPF(cpf)) {
          errors.cpf = "CPF inválido";
        }
        if (!creci.trim()) {
          errors.creci = "CRECI é obrigatório";
        }
      }

      if (accountType === "imobiliaria") {
        if (!companyName.trim()) errors.companyName = "Nome da imobiliária é obrigatório";
        if (!docValue) {
          errors.docValue = "CNPJ é obrigatório";
        } else if (!isValidCNPJ(docValue)) {
          errors.docValue = "CNPJ inválido";
        }
      }

      if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
      setFieldErrors({});

      setLoading(true);
      try {
        // Verificar unicidade telefone
        const phoneClean = phone.replace(/\D/g, "");
        const { data: phoneProfile } = await supabase.from("profiles").select("id").eq("phone", phoneClean).maybeSingle();
        if (phoneProfile) { setFieldError("phone", "Este telefone já está cadastrado"); setLoading(false); return; }

        // Verificar unicidade CPF/CNPJ
        const docClean = (accountType === "corretor" ? cpf : docValue).replace(/\D/g, "");
        if (docClean) {
          const { data: docProfile } = await supabase.from("profiles").select("id").eq("cpf", docClean).maybeSingle();
          if (docProfile) {
            const field = accountType === "corretor" ? "cpf" : "docValue";
            setFieldError(field, `Este ${accountType === "corretor" ? "CPF" : "CNPJ"} já está cadastrado`);
            setLoading(false); return;
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      setStep(3);
      return;
    }

    // ── STEP 3: finalizar ────────────────────────────────────────────────
    if (!isLogin && step === 3) {
      if (!acceptTerms) { toast.error("Aceite os Termos de Uso"); return; }
      setLoading(true);
      try {
        const phoneClean = phone.replace(/\D/g, "");
        const cpfClean   = (accountType === "corretor" ? cpf : "").replace(/\D/g, "") || null;
        const cnpjClean  = (accountType === "imobiliaria" ? docValue : "").replace(/\D/g, "") || null;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://crm-r2.vercel.app/confirm-email",
            data: {
              full_name:    fullName,
              phone:        phoneClean,
              company_name: accountType === "imobiliaria" ? companyName : fullName,
              role:         accountType,
              area_atuacao: areaAtuacao,
              plan:         selectedPlan,
              cpf:          cpfClean,
              cnpj:         cnpjClean,
              creci:        accountType === "corretor" ? creci : null,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          const { data: sessionData } = await supabase.auth.getSession();
          const authToken = sessionData.session?.access_token ?? ANON_KEY;
          await fetch(`${SUPABASE_URL}/functions/v1/create-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}`, "apikey": ANON_KEY },
            body: JSON.stringify({ user: data.user }),
          });
        }

        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar sua conta.");
        resetAllStates();
        setIsLogin(true);
      } catch (error: any) {
        if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
          toast.error("CPF, CNPJ ou telefone já cadastrado. Verifique os dados.");
        } else {
          toast.error(error.message);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── LOGIN ────────────────────────────────────────────────────────────
    if (isLogin) {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? <p className="text-xs text-red-500 mt-1">{fieldErrors[field]}</p> : null;

  return (
    <div className="auth-light min-h-screen flex flex-col bg-white font-sans">
      <div className="flex-1 flex">
        <div className="hidden lg:flex lg:w-1/2 bg-[#7E22CE] items-center justify-center p-12 relative overflow-hidden">
          <div className="relative z-10 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-10">
              <img src="/logo-r2.svg" alt="R2 Tech" className="w-48 h-auto mx-auto rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all" />
            </motion.div>
            <h1 className="text-5xl font-black text-white mb-6 tracking-tighter uppercase">CRM R2</h1>
            <p className="text-purple-100 text-xl opacity-90 max-w-sm mx-auto leading-relaxed">
              A solução definitiva da <span className="font-extrabold text-white underline decoration-white/40 underline-offset-8">R2 TECH</span> para corretores e imobiliárias de alta performance.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold rounded-full transition-all hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Voltar ao site
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          {/* Botão voltar ao home — mobile */}
          <Link to="/" className="fixed top-4 left-4 lg:hidden flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#7E22CE] bg-white border border-slate-200 px-3 py-2 rounded-full shadow-sm transition-all hover:border-[#7E22CE] z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Voltar ao início
          </Link>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100" style={{ colorScheme: "light" }}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900">{isLogin ? "Entrar" : "Criar Conta"}</h2>
              {!isLogin && <p className="text-slate-500 mt-2">Etapa {step} de {totalSteps}</p>}
            </div>

            {!isLogin && <Progress value={(step / totalSteps) * 100} className="h-2 mb-8 bg-slate-100 [&>div]:bg-[#7E22CE]" />}

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 py-6 rounded-2xl bg-slate-50" placeholder="seu@email.com" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Senha</Label>
                        <Link to="/forgot-password" className="text-xs text-[#7E22CE] hover:underline font-medium">Esqueceu sua senha?</Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 py-6 rounded-2xl bg-slate-50" placeholder="••••••••" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full py-6 bg-[#7E22CE] text-white rounded-2xl font-bold text-lg" disabled={loading}>
                      {loading ? "Processando..." : "Entrar"}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key={step} initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }} className="space-y-5">

                    {/* ── STEP 1 ── */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailExists(false); }}
                              className={cn("pl-10 py-6 rounded-2xl bg-white text-slate-900", emailExists && "border-red-500")} placeholder="seu@email.com" required />
                          </div>
                          {emailExists && <p className="text-xs text-red-500">Este e-mail já está cadastrado.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 py-6 rounded-2xl bg-white text-slate-900" placeholder="Crie uma senha" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {password && (
                            <div className="space-y-1 mt-2">
                              <div className="flex gap-1 h-1">
                                {[1,2,3,4,5].map(i => (
                                  <div key={i} className={cn("h-full flex-1 rounded-full transition-all",
                                    i <= passwordStrength ? i <= 2 ? "bg-red-400" : i <= 4 ? "bg-yellow-400" : "bg-green-400" : "bg-gray-200")} />
                                ))}
                              </div>
                              <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                                {passwordRequirements.map((req, idx) => (
                                  <li key={idx} className={cn("flex items-center gap-1", req.regex.test(password) && "text-green-600")}>
                                    <span>{req.regex.test(password) ? "✓" : "○"}</span><span>{req.label}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Confirme sua senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                              className={cn("pl-10 pr-10 py-6 rounded-2xl bg-white text-slate-900", confirmPassword && password !== confirmPassword ? "border-red-500" : "")} placeholder="Repita a senha" required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 2 ── */}
                    {step === 2 && (
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {/* Tipo de perfil */}
                        <div className="space-y-2">
                          <Label>Você é</Label>
                          <div className="grid grid-cols-2 gap-4">
                            {[{ type: "corretor" as AccountType, icon: User, label: "Corretor" }, { type: "imobiliaria" as AccountType, icon: Building2, label: "Imobiliária" }].map(opt => (
                              <div key={opt.type} onClick={() => { setAccountType(opt.type); setSelectedPlan(null); }}
                                className={cn("p-5 rounded-2xl border-2 cursor-pointer transition-all text-center", accountType === opt.type ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-100")}>
                                <opt.icon className="mx-auto mb-2 w-6 h-6" /><span className="text-sm font-bold">{opt.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Planos */}
                        {accountType && (
                          <div className="space-y-3">
                            <Label>Escolha seu plano</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {plans[accountType].map(plan => (
                                <Card key={plan.id} onClick={() => setSelectedPlan(plan.id as PlanType)}
                                  className={cn("cursor-pointer transition-all relative", selectedPlan === plan.id ? "border-2 border-[#7E22CE] bg-purple-50/50" : "border-slate-200")}>
                                  {plan.popular && <Badge className="absolute -top-2 right-4 bg-[#7E22CE] text-white">Mais popular</Badge>}
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                      <div><h3 className="font-bold text-slate-900">{plan.name}</h3><p className="text-xs text-slate-500">{plan.description}</p></div>
                                      <div className="text-right"><span className="text-xl font-bold text-[#7E22CE]">R$ {plan.price}</span><span className="text-xs text-slate-500">/mês</span></div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Nome */}
                        <div className="space-y-1.5">
                          <Label>Nome completo *</Label>
                          <Input value={fullName} onChange={e => { setFullName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "")); clearFieldError("fullName"); }}
                            className={cn("py-6 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400", fieldErrors.fullName && "border-red-400")} placeholder="Ex: João da Silva" required />
                          <FieldError field="fullName" />
                        </div>

                        {/* Telefone */}
                        <div className="space-y-1.5">
                          <Label>Telefone (celular com DDD) *</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input value={phone} onChange={e => { setPhone(formatPhone(e.target.value)); clearFieldError("phone"); }}
                              className={cn("pl-10 py-6 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400", fieldErrors.phone && "border-red-400")} placeholder="(00) 00000-0000" inputMode="numeric" required />
                          </div>
                          <FieldError field="phone" />
                        </div>

                        {/* Corretor: CPF + CRECI */}
                        {accountType === "corretor" && (
                          <>
                            <div className="space-y-1.5">
                              <Label>CPF *</Label>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input value={cpf} onChange={e => { setCpf(formatCPF(e.target.value)); clearFieldError("cpf"); }}
                                  className={cn("pl-10 py-6 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400", fieldErrors.cpf && "border-red-400")} placeholder="000.000.000-00" inputMode="numeric" required />
                              </div>
                              {cpf && !fieldErrors.cpf && (
                                <p className={cn("text-xs", isValidCPF(cpf) ? "text-green-600" : "text-red-500")}>
                                  {isValidCPF(cpf) ? "✓ CPF válido" : "✗ CPF inválido"}
                                </p>
                              )}
                              <FieldError field="cpf" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>CRECI *</Label>
                              <div className="relative">
                                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input value={creci} onChange={e => { setCreci(e.target.value.toUpperCase()); clearFieldError("creci"); }}
                                  className={cn("pl-10 py-6 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400", fieldErrors.creci && "border-red-400")} placeholder="CRECI-RJ 12345" required />
                              </div>
                              <FieldError field="creci" />
                            </div>
                          </>
                        )}

                        {/* Imobiliária: nome + CPF/CNPJ */}
                        {accountType === "imobiliaria" && (
                          <>
                            <div className="space-y-1.5">
                              <Label>Nome da Imobiliária *</Label>
                              <Input value={companyName} onChange={e => { setCompanyName(e.target.value); clearFieldError("companyName"); }}
                                className={cn("py-6 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400", fieldErrors.companyName && "border-red-400")} placeholder="Ex: Imobiliária R2" required />
                              <FieldError field="companyName" />
                            </div>
                            <div className="space-y-2">
                              <Label>CNPJ da empresa *</Label>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input value={docValue} onChange={e => { setDocValue(formatCNPJ(e.target.value)); clearFieldError("docValue"); }}
                                  className={cn("pl-10 py-6 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400", fieldErrors.docValue && "border-red-400")}
                                  placeholder="00.000.000/0000-00" inputMode="numeric" required />
                              </div>
                              {docValue && !fieldErrors.docValue && (
                                <p className={cn("text-xs", isValidCNPJ(docValue) ? "text-green-600" : "text-red-500")}>
                                  {isValidCNPJ(docValue) ? "✓ CNPJ válido" : "✗ CNPJ inválido"}
                                </p>
                              )}
                              <FieldError field="docValue" />
                            </div>
                          </>
                        )}

                        {/* Área de atuação */}
                        <div className="space-y-2">
                          <Label>Área de atuação</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {["residencial", "comercial", "rural", "todos"].map(area => (
                              <button key={area} type="button" onClick={() => setAreaAtuacao(area as AreaAtuacao)}
                                className={cn("px-3 py-2 rounded-lg border text-sm transition-all", areaAtuacao === area ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-200 text-slate-500")}>
                                {area.charAt(0).toUpperCase() + area.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 3 ── */}
                    {step === 3 && (
                      <div className="space-y-6">
                        <div className="text-center py-8 bg-purple-50 rounded-3xl border border-purple-100">
                          <CheckCircle2 className="w-14 h-14 text-[#7E22CE] mx-auto mb-4" />
                          <p className="text-sm font-medium">Cadastro como <span className="text-[#7E22CE] font-bold uppercase">{accountType}</span> quase pronto!</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox id="terms" checked={acceptTerms} onCheckedChange={c => setAcceptTerms(c as boolean)} />
                          <Label htmlFor="terms" className="text-sm text-slate-600">
                            Li e concordo com os{" "}
                            <Link to="/termos" target="_blank" className="text-[#7E22CE] font-medium hover:underline">Termos de Uso</Link>
                            {" "}e{" "}
                            <Link to="/privacidade" target="_blank" className="text-[#7E22CE] font-medium hover:underline">Política de Privacidade</Link>.
                          </Label>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      {step > 1 && (
                        <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)} className="rounded-2xl py-6">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      )}
                      <Button type="submit" className="flex-1 py-6 bg-[#7E22CE] text-white rounded-2xl font-bold" disabled={loading || checkingEmail}>
                        {loading ? "Verificando..." : checkingEmail ? "Verificando e-mail..." : step === 3 ? "Finalizar Cadastro" : "Próximo"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-center mt-10 text-slate-500 text-sm">
                {isLogin ? "Não possui uma conta?" : "Já é cadastrado?"}{" "}
                <span onClick={resetAllStates} className="text-[#7E22CE] font-extrabold cursor-pointer hover:underline">
                  {isLogin ? "Crie agora" : "Fazer login"}
                </span>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;