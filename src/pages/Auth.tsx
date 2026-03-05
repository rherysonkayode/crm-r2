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
import { Building2, User, ArrowLeft, Mail, Lock, CheckCircle2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type AccountType = "corretor" | "imobiliaria" | null;
type AreaAtuacao = "residencial" | "comercial" | "rural" | "todos";
type PlanType = "start" | "pro" | "profissional" | "enterprise" | null;

// Definição dos planos (mesmos da Home)
const plans = {
  corretor: [
    {
      id: "start",
      name: "Start",
      description: "Para corretores autônomos começando",
      price: 97,
      users: 1,
      leads: 200,
      imoveis: 50,
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      description: "Para corretores com alta demanda",
      price: 147,
      users: 1,
      leads: 500,
      imoveis: 150,
      popular: false,
    },
  ],
  imobiliaria: [
    {
      id: "profissional",
      name: "Profissional",
      description: "Para imobiliárias pequenas",
      price: 197,
      users: 5,
      leads: 1000,
      imoveis: 300,
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Para imobiliárias médias",
      price: 347,
      users: 20,
      leads: 5000,
      imoveis: 1000,
      popular: false,
    },
  ],
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [areaAtuacao, setAreaAtuacao] = useState<AreaAtuacao>("residencial");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null);
  const [step, setStep] = useState(1);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const navigate = useNavigate();

  // Validação de senha
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

  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck) return false;
    setCheckingEmail(true);
    try {
      const { data, error } = await (supabase.rpc as any)('check_email_exists', { email_to_check: emailToCheck });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Erro ao verificar e-mail:", error);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Etapa 1: verificar e-mail e avançar
    if (!isLogin && step === 1) {
      const exists = await checkEmailExists(email);
      if (exists) {
        setEmailExists(true);
        toast.error("Este e-mail já está cadastrado. Tente outro ou faça login.");
        return;
      } else {
        setEmailExists(false);
        setStep(2);
        return;
      }
    }

    // Etapa 2: validar perfil e plano, e avançar
    if (!isLogin && step === 2) {
      if (!accountType) {
        toast.error("Selecione seu tipo de perfil");
        return;
      }
      if (!selectedPlan) {
        toast.error("Selecione um plano para começar");
        return;
      }
      setStep(3);
      return;
    }

    // Etapa 3: finalizar cadastro
    if (!isLogin && step === 3) {
      if (!acceptTerms) {
        toast.error("Você precisa aceitar os Termos de Uso e Política de Privacidade");
        return;
      }

      setLoading(true);
      try {
        if (!isPasswordValid) {
          toast.error("A senha não atende aos requisitos mínimos");
          setLoading(false);
          return;
        }

        const exists = await checkEmailExists(email);
        if (exists) {
          toast.error("Este e-mail já está cadastrado.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone,
              company_name: accountType === "imobiliaria" ? companyName : fullName,
              role: accountType,
              area_atuacao: areaAtuacao,
              plan: selectedPlan,
            },
          },
        });

        if (error) throw error;

        // 🔥 CHAMADA À EDGE FUNCTION PARA CRIAR O PERFIL COM OS CAMPOS DE TRIAL
        if (data.user) {
          try {
            await fetch('https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: data.user }),
            });
            // Não mostramos toast de erro aqui para não atrapalhar o fluxo
          } catch (edgeError) {
            console.error('Erro ao chamar Edge Function:', edgeError);
          }
        }

        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar.");
        setIsLogin(true);
        setStep(1);
        setAccountType(null);
        setSelectedPlan(null);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login
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
        {/* Lado esquerdo - Branding */}
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

        {/* Lado direito - Formulário */}
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
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 py-6 rounded-2xl bg-slate-50"
                          placeholder="seu@email.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 py-6 rounded-2xl bg-slate-50"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full py-6 bg-[#7E22CE] text-white rounded-2xl font-bold text-lg" disabled={loading}>
                      {loading ? "Processando..." : "Entrar"}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key={step} initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }} className="space-y-5">
                    {/* Etapa 1: Dados básicos */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setEmailExists(false);
                              }}
                              className={cn(
                                "pl-10 py-6 rounded-2xl",
                                emailExists && "border-red-500 focus-visible:ring-red-500"
                              )}
                              placeholder="seu@email.com"
                              required
                            />
                          </div>
                          {emailExists && (
                            <p className="text-xs text-red-500 mt-1">Este e-mail já está cadastrado.</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-10 py-6 rounded-2xl"
                              placeholder="Crie uma senha"
                              required
                            />
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-1 h-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "h-full flex-1 rounded-full transition-all",
                                    i <= passwordStrength
                                      ? i <= 2
                                        ? "bg-red-400"
                                        : i <= 4
                                        ? "bg-yellow-400"
                                        : "bg-green-400"
                                      : "bg-gray-200"
                                  )}
                                />
                              ))}
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                              {passwordRequirements.map((req, idx) => (
                                <li key={idx} className={cn("flex items-center gap-1", req.regex.test(password) && "text-green-600")}>
                                  <span>{req.regex.test(password) ? "✓" : "○"}</span>
                                  <span>{req.label}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Etapa 2: Perfil + Plano */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Você é</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div
                              onClick={() => {
                                setAccountType("corretor");
                                setSelectedPlan(null);
                              }}
                              className={cn(
                                "p-5 rounded-2xl border-2 cursor-pointer transition-all text-center",
                                accountType === "corretor" ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-100"
                              )}
                            >
                              <User className="mx-auto mb-2 w-6 h-6" />
                              <span className="text-sm font-bold">Corretor</span>
                            </div>
                            <div
                              onClick={() => {
                                setAccountType("imobiliaria");
                                setSelectedPlan(null);
                              }}
                              className={cn(
                                "p-5 rounded-2xl border-2 cursor-pointer transition-all text-center",
                                accountType === "imobiliaria" ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-100"
                              )}
                            >
                              <Building2 className="mx-auto mb-2 w-6 h-6" />
                              <span className="text-sm font-bold">Imobiliária</span>
                            </div>
                          </div>
                        </div>

                        {accountType && (
                          <div className="space-y-3">
                            <Label className="block">Escolha seu plano</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {plans[accountType].map((plan) => (
                                <Card
                                  key={plan.id}
                                  className={cn(
                                    "cursor-pointer transition-all hover:border-[#7E22CE] relative",
                                    selectedPlan === plan.id
                                      ? "border-2 border-[#7E22CE] bg-purple-50/50"
                                      : "border border-slate-200"
                                  )}
                                  onClick={() => setSelectedPlan(plan.id as PlanType)}
                                >
                                  {plan.popular && (
                                    <Badge className="absolute -top-2 right-4 bg-[#7E22CE] text-white">
                                      Mais popular
                                    </Badge>
                                  )}
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <h3 className="font-bold text-slate-900">{plan.name}</h3>
                                        <p className="text-xs text-slate-500">{plan.description}</p>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xl font-bold text-[#7E22CE]">R$ {plan.price}</span>
                                        <span className="text-xs text-slate-500">/mês</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                      <span>{plan.users} {plan.users === 1 ? 'usuário' : 'usuários'}</span>
                                      <span>{plan.leads} leads/mês</span>
                                      <span>{plan.imoveis} imóveis</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 mt-4">
                          <Label>Seu nome completo</Label>
                          <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="py-6 rounded-2xl"
                            placeholder="Ex: João da Silva"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="pl-10 py-6 rounded-2xl"
                              placeholder="(21) 99999-9999"
                            />
                          </div>
                        </div>
                        {accountType === "imobiliaria" && (
                          <div className="space-y-2">
                            <Label>Nome da Imobiliária</Label>
                            <Input
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="py-6 rounded-2xl"
                              placeholder="Ex: Imobiliária R2"
                              required
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Área de atuação principal</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: "residencial", label: "Residencial" },
                              { value: "comercial", label: "Comercial" },
                              { value: "rural", label: "Rural" },
                              { value: "todos", label: "Todos" },
                            ].map((area) => (
                              <button
                                key={area.value}
                                type="button"
                                onClick={() => setAreaAtuacao(area.value as AreaAtuacao)}
                                className={cn(
                                  "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                                  areaAtuacao === area.value
                                    ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]"
                                    : "border-slate-200 text-slate-500"
                                )}
                              >
                                {area.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Etapa 3: Termos e finalização */}
                    {step === 3 && (
                      <div className="space-y-6">
                        <div className="text-center py-8 bg-purple-50 rounded-3xl border border-purple-100">
                          <CheckCircle2 className="w-14 h-14 text-[#7E22CE] mx-auto mb-4" />
                          <p className="text-sm font-medium">
                            Cadastro como <span className="text-[#7E22CE] font-bold uppercase">{accountType === "corretor" ? "Corretor" : "Imobiliária"}</span> com plano <span className="font-bold">{selectedPlan}</span> quase pronto!
                          </p>
                        </div>

                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="terms"
                            checked={acceptTerms}
                            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                          />
                          <Label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed">
                            Li e concordo com os{" "}
                            <a href="/termos" target="_blank" className="text-[#7E22CE] font-medium hover:underline">
                              Termos de Uso
                            </a>{" "}
                            e a{" "}
                            <a href="/privacidade" target="_blank" className="text-[#7E22CE] font-medium hover:underline">
                              Política de Privacidade
                            </a>
                            .
                          </Label>
                        </div>
                      </div>
                    )}

                    {/* Botões de navegação */}
                    <div className="flex gap-3 pt-2">
                      {step > 1 && (
                        <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)} className="rounded-2xl py-6">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className={cn(
                          "flex-1 py-6 bg-[#7E22CE] text-white rounded-2xl font-bold",
                          step === 3 && !acceptTerms && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={
                          loading ||
                          (step === 3 && !acceptTerms) ||
                          checkingEmail ||
                          (step === 2 && (!accountType || !selectedPlan))
                        }
                      >
                        {loading
                          ? "Processando..."
                          : step === totalSteps
                          ? "Finalizar Cadastro"
                          : step === 1 && checkingEmail
                          ? "Verificando..."
                          : "Próximo"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Link para alternar entre login e cadastro */}
              <p className="text-center mt-10 text-slate-500 text-sm">
                {isLogin ? "Não possui uma conta?" : "Já é cadastrado?"}{" "}
                <span
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setStep(1);
                    setAcceptTerms(false);
                    setEmailExists(false);
                    setAccountType(null);
                    setSelectedPlan(null);
                  }}
                  className="text-[#7E22CE] font-extrabold cursor-pointer hover:underline"
                >
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