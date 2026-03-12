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
import { Building2, User, ArrowLeft, Mail, Lock, CheckCircle2, Phone, CreditCard, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";

type AccountType = "corretor" | "imobiliaria" | null;
type AreaAtuacao = "residencial" | "comercial" | "rural" | "todos";
type PlanType = "start" | "pro" | "profissional" | "enterprise" | null;

const plans = {
  corretor: [
    { id: "start", name: "Start", description: "Para corretores autônomos começando", price: 97, users: 1, leads: 200, imoveis: 50, popular: false },
    { id: "pro", name: "Pro", description: "Para corretores com alta demanda", price: 147, users: 1, leads: 500, imoveis: 150, popular: false },
  ],
  imobiliaria: [
    { id: "profissional", name: "Profissional", description: "Para imobiliárias pequenas", price: 197, users: 5, leads: 1000, imoveis: 300, popular: true },
    { id: "enterprise", name: "Enterprise", description: "Para imobiliárias médias", price: 347, users: 20, leads: 5000, imoveis: 1000, popular: false },
  ],
};

const formatPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "").slice(0, 15);
};

const formatCPF = (v: string) => {
  v = v.replace(/\D/g, "");
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4").slice(0, 14);
};

const formatCNPJ = (v: string) => {
  v = v.replace(/\D/g, "");
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5").slice(0, 18);
};

// ===== FUNÇÕES DE VALIDAÇÃO =====
const isValidCPF = (cpf: string) => {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(clean)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;
  
  return true;
};

const isValidCNPJ = (cnpj: string) => {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(clean)) return false;
  
  // Validação do primeiro dígito verificador
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Validação do segundo dígito verificador
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

const SUPABASE_URL = "https://ecmahLxwttfeatvpxwng.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false); // <-- ESTADO MOVIDO PARA CÁ

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [docType, setDocType] = useState<"cpf" | "cnpj">("cpf");
  const [docValue, setDocValue] = useState("");

  const [accountType, setAccountType] = useState<AccountType>(null);
  const [areaAtuacao, setAreaAtuacao] = useState<AreaAtuacao>("residencial");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null);
  const [step, setStep] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const navigate = useNavigate();

  const passwordRequirements = [
    { regex: /.{8,}/, label: "Pelo menos 8 caracteres" },
    { regex: /[A-Z]/, label: "Uma letra maiúscula" },
    { regex: /[a-z]/, label: "Uma letra minúscula" },
    { regex: /[0-9]/, label: "Um número" },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, label: "Um caractere especial" },
  ];
  const passwordStrength = passwordRequirements.filter(req => req.regex.test(password)).length;
  const isPasswordValid = passwordStrength === passwordRequirements.length;

  const totalSteps = 3;
  const progressValue = (step / totalSteps) * 100;

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ""));
  };

  // ===== FUNÇÕES DE VERIFICAÇÃO NO BANCO =====
  const checkCpfCnpjExists = async (doc: string): Promise<boolean> => {
    if (!doc) return false;
    
    const clean = doc.replace(/\D/g, "");
    if (clean.length < 11) return false;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("cpf", clean)
        .maybeSingle();
      
      if (error) {
        console.error("Erro ao verificar CPF/CNPJ:", error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error("Erro na verificação:", error);
      return false;
    }
  };

  const checkPhoneExists = async (phoneToCheck: string) => {
    const clean = phoneToCheck.replace(/\D/g, "");
    const { data } = await supabase.from("profiles").select("id").eq("phone", clean).maybeSingle();
    return !!data;
  };

  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck) return false;
    setCheckingEmail(true);
    try {
      const { data, error } = await (supabase.rpc as any)("check_email_exists", { email_to_check: emailToCheck });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Erro ao verificar e-mail:", error);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const resetAllStates = () => {
    setIsLogin(!isLogin);
    setStep(1);
    setAcceptTerms(false);
    setEmailExists(false);
    setAccountType(null);
    setSelectedPlan(null);
    setConfirmPassword("");
    setCpf("");
    setDocValue("");
    setPhone("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && step === 1) {
      if (!isPasswordValid) { toast.error("A senha não atende aos requisitos mínimos"); return; }
      if (password !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
      const exists = await checkEmailExists(email);
      if (exists) {
        setEmailExists(true);
        toast.error("Este e-mail já está cadastrado. Tente outro ou faça login.");
        return;
      }
      setStep(2);
      return;
    }

    // ===== BLOCO DE VALIDAÇÃO MELHORADO =====
    if (!isLogin && step === 2) {
      if (!accountType) { toast.error("Selecione seu tipo de perfil"); return; }
      if (!selectedPlan) { toast.error("Selecione um plano para começar"); return; }
      if (!fullName) { toast.error("Informe seu nome completo"); return; }
      if (!/^[a-zA-Z\u00C0-\u00FF\s]+$/.test(fullName)) { toast.error("Nome deve conter apenas letras"); return; }
      if (!phone || phone.replace(/\D/g, "").length < 11) { toast.error("Informe um celular válido com DDD"); return; }
      
      setLoading(true);
      try {
        // Verificar telefone
        const phoneExists = await checkPhoneExists(phone);
        if (phoneExists) { 
          toast.error("Este celular já está cadastrado. Use outro número."); 
          setLoading(false); 
          return; 
        }
        
        // Verificar CPF/CNPJ
        const docToCheck = accountType === "corretor" ? cpf : docValue;
        if (docToCheck) {
          // Validação de formato primeiro
          if (accountType === "corretor") {
            if (!isValidCPF(docToCheck)) {
              toast.error("CPF inválido. Verifique o número digitado.");
              setLoading(false);
              return;
            }
          } else {
            if (docType === "cpf" && !isValidCPF(docToCheck)) {
              toast.error("CPF do gestor inválido.");
              setLoading(false);
              return;
            }
            if (docType === "cnpj" && !isValidCNPJ(docToCheck)) {
              toast.error("CNPJ inválido. Verifique o número digitado.");
              setLoading(false);
              return;
            }
          }
          
          // Depois verifica duplicidade no banco
          const docExists = await checkCpfCnpjExists(docToCheck);
          if (docExists) { 
            toast.error(`Este ${accountType === "corretor" ? "CPF" : docType === "cpf" ? "CPF" : "CNPJ"} já está cadastrado.`); 
            setLoading(false); 
            return; 
          }
        }
        
        // Validações de campo obrigatório
        if (accountType === "corretor" && (!cpf || cpf.replace(/\D/g, "").length < 11)) { 
          toast.error("CPF obrigatório"); 
          setLoading(false); 
          return; 
        }
        
        if (accountType === "imobiliaria" && (!companyName || !docValue)) { 
          toast.error("Preencha os dados da imobiliária"); 
          setLoading(false); 
          return; 
        }
        
        // Se passou por todas as validações, vai para o passo 3
        setStep(3);
      } catch (err) {
        console.error("Erro na validação:", err);
        toast.error("Erro ao verificar dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isLogin && step === 3) {
      if (!acceptTerms) { toast.error("Aceite os Termos de Uso"); return; }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://crm-r2.vercel.app/confirm-email",
            data: {
              full_name: fullName,
              phone,
              company_name: accountType === "imobiliaria" ? companyName : fullName,
              role: accountType,
              area_atuacao: areaAtuacao,
              plan: selectedPlan,
              cpf: accountType === "corretor" ? cpf : (docType === "cpf" ? docValue : null),
              cnpj: accountType === "imobiliaria" && docType === "cnpj" ? docValue : null,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          const { data: sessionData } = await supabase.auth.getSession();
          const authToken = sessionData.session?.access_token ?? ANON_KEY;

          await fetch(`${SUPABASE_URL}/functions/v1/create-profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
              "apikey": ANON_KEY,
            },
            body: JSON.stringify({ user: data.user }),
          });
        }

        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar sua conta.");
        resetAllStates();
        setIsLogin(true);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

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

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <div className="flex-1 flex">
        <div className="hidden lg:flex lg:w-1/2 bg-[#7E22CE] items-center justify-center p-12 relative overflow-hidden">
          <div className="relative z-10 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-10">
              <img src="/logo-r2.svg" alt="R2 Tech" className="w-48 h-auto mx-auto rounded-[2.5rem] shadow-2xl transition-all hover:scale-105" />
            </motion.div>
            <h1 className="text-5xl font-black text-white mb-6 tracking-tighter uppercase">CRM R2</h1>
            <p className="text-purple-100 text-xl opacity-90 max-w-sm mx-auto leading-relaxed">
              A solução definitiva da <span className="font-extrabold text-white underline decoration-white/40 underline-offset-8">R2 TECH</span> para corretores e imobiliárias de alta performance.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900">{isLogin ? "Entrar" : "Criar Conta"}</h2>
              {!isLogin && <p className="text-slate-500 mt-2">Etapa {step} de {totalSteps}</p>}
            </div>

            {!isLogin && <Progress value={progressValue} className="h-2 mb-8 bg-slate-100 [&>div]:bg-[#7E22CE]" />}

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 py-6 rounded-2xl bg-slate-50" placeholder="seu@email.com" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Senha</Label>
                        <Link to="/forgot-password" className="text-xs text-[#7E22CE] hover:underline font-medium">Esqueceu sua senha?</Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 py-6 rounded-2xl bg-slate-50" placeholder="••••••••" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
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

                    {step === 1 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailExists(false); }} className={cn("pl-10 py-6 rounded-2xl", emailExists && "border-red-500 focus-visible:ring-red-500")} placeholder="seu@email.com" required />
                          </div>
                          {emailExists && <p className="text-xs text-red-500">Este e-mail já está cadastrado.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 py-6 rounded-2xl" placeholder="Crie uma senha" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-1 h-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className={cn("h-full flex-1 rounded-full transition-all", i <= passwordStrength ? (i <= 2 ? "bg-red-400" : i <= 4 ? "bg-yellow-400" : "bg-green-400") : "bg-gray-200")} />
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
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirme sua senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={cn("pl-10 pr-10 py-6 rounded-2xl", confirmPassword && password !== confirmPassword ? "border-red-500" : "")} placeholder="Repita a senha" required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="space-y-2">
                          <Label>Você é</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div onClick={() => { setAccountType("corretor"); setSelectedPlan(null); }} className={cn("p-5 rounded-2xl border-2 cursor-pointer transition-all text-center", accountType === "corretor" ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-100")}>
                              <User className="mx-auto mb-2 w-6 h-6" /><span className="text-sm font-bold">Corretor</span>
                            </div>
                            <div onClick={() => { setAccountType("imobiliaria"); setSelectedPlan(null); }} className={cn("p-5 rounded-2xl border-2 cursor-pointer transition-all text-center", accountType === "imobiliaria" ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-100")}>
                              <Building2 className="mx-auto mb-2 w-6 h-6" /><span className="text-sm font-bold">Imobiliária</span>
                            </div>
                          </div>
                        </div>

                        {accountType && (
                          <div className="space-y-3">
                            <Label>Escolha seu plano</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {plans[accountType].map((plan) => (
                                <Card key={plan.id} onClick={() => setSelectedPlan(plan.id as PlanType)} className={cn("cursor-pointer transition-all relative", selectedPlan === plan.id ? "border-2 border-[#7E22CE] bg-purple-50/50" : "border-slate-200")}>
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

                        <div className="space-y-2">
                          <Label>Seu nome completo</Label>
                          <Input value={fullName} onChange={handleFullNameChange} className="py-6 rounded-2xl" placeholder="Ex: João da Silva" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefone (Celular)</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="pl-10 py-6 rounded-2xl" placeholder="(00) 00000-0000" required />
                          </div>
                        </div>

                        {accountType === "corretor" && (
                          <div className="space-y-2">
                            <Label>CPF</Label>
                            <div className="relative">
                              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input 
                                value={cpf} 
                                onChange={(e) => setCpf(formatCPF(e.target.value))} 
                                className={cn(
                                  "pl-10 py-6 rounded-2xl",
                                  cpf && !isValidCPF(cpf) && "border-red-500 focus-visible:ring-red-500"
                                )} 
                                placeholder="000.000.000-00" 
                                required 
                              />
                            </div>
                            {/* FEEDBACK VISUAL PARA CPF */}
                            {cpf && (
                              <p className={cn(
                                "text-xs mt-1",
                                isValidCPF(cpf) ? "text-green-600" : "text-red-500"
                              )}>
                                {isValidCPF(cpf) ? "✓ CPF válido" : "✗ CPF inválido"}
                              </p>
                            )}
                          </div>
                        )}

                        {accountType === "imobiliaria" && (
                          <>
                            <div className="space-y-2">
                              <Label>Nome da Imobiliária</Label>
                              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="py-6 rounded-2xl" placeholder="Ex: Imobiliária R2" required />
                            </div>
                            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <Label>Documento</Label>
                              <div className="flex gap-6 mb-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input type="radio" name="docType" checked={docType === "cpf"} onChange={() => { setDocType("cpf"); setDocValue(""); }} className="accent-[#7E22CE]" /> CPF Gestor
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input type="radio" name="docType" checked={docType === "cnpj"} onChange={() => { setDocType("cnpj"); setDocValue(""); }} className="accent-[#7E22CE]" /> CNPJ Empresa
                                </label>
                              </div>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input 
                                  value={docValue} 
                                  onChange={(e) => setDocValue(docType === "cpf" ? formatCPF(e.target.value) : formatCNPJ(e.target.value))} 
                                  className={cn(
                                    "pl-10 py-6 rounded-2xl bg-white",
                                    docValue && docType === "cpf" && !isValidCPF(docValue) && "border-red-500",
                                    docValue && docType === "cnpj" && !isValidCNPJ(docValue) && "border-red-500"
                                  )} 
                                  placeholder={docType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"} 
                                  required 
                                />
                              </div>
                              {/* FEEDBACK VISUAL PARA CPF/CNPJ */}
                              {docValue && (
                                <p className={cn(
                                  "text-xs mt-1",
                                  (docType === "cpf" && isValidCPF(docValue)) || (docType === "cnpj" && isValidCNPJ(docValue)) 
                                    ? "text-green-600" 
                                    : "text-red-500"
                                )}>
                                  {(docType === "cpf" && isValidCPF(docValue)) || (docType === "cnpj" && isValidCNPJ(docValue))
                                    ? `✓ ${docType === "cpf" ? "CPF" : "CNPJ"} válido`
                                    : `✗ ${docType === "cpf" ? "CPF" : "CNPJ"} inválido`}
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label>Área de atuação</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {["residencial", "comercial", "rural", "todos"].map((area) => (
                              <button key={area} type="button" onClick={() => setAreaAtuacao(area as AreaAtuacao)} className={cn("px-3 py-2 rounded-lg border text-sm transition-all", areaAtuacao === area ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-200 text-slate-500")}>
                                {area.charAt(0).toUpperCase() + area.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-6">
                        <div className="text-center py-8 bg-purple-50 rounded-3xl border border-purple-100">
                          <CheckCircle2 className="w-14 h-14 text-[#7E22CE] mx-auto mb-4" />
                          <p className="text-sm font-medium">Cadastro como <span className="text-[#7E22CE] font-bold uppercase">{accountType}</span> quase pronto!</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(checked) => setAcceptTerms(checked as boolean)} />
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
                        {loading ? "Processando..." : checkingEmail ? "Verificando..." : step === 3 ? "Finalizar Cadastro" : "Próximo"}
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