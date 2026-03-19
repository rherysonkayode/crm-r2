import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, AlertCircle, Building2, CheckCircle2, CreditCard, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Validadores ───────────────────────────────────────────────────────────
const isValidCPF = (cpf: string) => {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(c[10]);
};

const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length === 11;

const hasMinTwoWords = (name: string) => name.trim().split(/\s+/).filter(Boolean).length >= 2;

const formatPhone = (v: string) => {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

const formatCPF = (v: string) => {
  v = v.replace(/\D/g, "").slice(0, 11);
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
};

const Convite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [validInvite, setValidInvite] = useState<any>(null);
  const [empresa, setEmpresa]         = useState<string>("");
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [cpf, setCpf]                 = useState("");
  const [creci, setCreci]             = useState("");
  const [password, setPassword]       = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Erros de campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const passwordRequirements = [
    { regex: /.{8,}/,                    label: "Pelo menos 8 caracteres" },
    { regex: /[A-Z]/,                    label: "Uma letra maiúscula" },
    { regex: /[a-z]/,                    label: "Uma letra minúscula" },
    { regex: /[0-9]/,                    label: "Um número" },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, label: "Um caractere especial" },
  ];
  const passwordStrength = passwordRequirements.filter(r => r.regex.test(password)).length;
  const isPasswordValid  = passwordStrength === passwordRequirements.length;

  useEffect(() => {
    const validateInvite = async () => {
      if (!token) { setError("Link inválido"); setLoading(false); return; }

      const { data, error } = await (supabase
        .from("team_invites" as any)
        .select("*, companies:company_id(name)")
        .eq("token", token)
        .single() as any);

      if (error || !data) {
        setError("Convite não encontrado. Verifique o link ou peça um novo convite.");
      } else if (data.status !== "pendente") {
        setError("Este convite já foi utilizado ou cancelado.");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("Este convite expirou. Peça à imobiliária que gere um novo link.");
      } else {
        setValidInvite(data);
        setEmpresa(data.companies?.name || "a imobiliária");
        if (data.email)     setEmail(data.email);
        if (data.full_name) setFullName(data.full_name);
        if (data.phone)     setPhone(formatPhone(data.phone));
        if (data.cpf)       setCpf(formatCPF(data.cpf));
        if (data.creci)     setCreci(data.creci);
      }
      setLoading(false);
    };
    validateInvite();
  }, [token]);

  const validate = async (): Promise<boolean> => {
    const errors: Record<string, string> = {};

    // Nome completo — mínimo 2 palavras
    if (!fullName.trim()) {
      errors.fullName = "Nome completo é obrigatório";
    } else if (!hasMinTwoWords(fullName)) {
      errors.fullName = "Informe nome e sobrenome";
    }

    // E-mail
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Informe um e-mail válido";
    }

    // Telefone
    if (!phone) {
      errors.phone = "Telefone é obrigatório";
    } else if (!isValidPhone(phone)) {
      errors.phone = "Telefone deve ter 11 dígitos com DDD";
    }

    // CPF
    if (!cpf) {
      errors.cpf = "CPF é obrigatório";
    } else if (!isValidCPF(cpf)) {
      errors.cpf = "CPF inválido";
    }

    // CRECI
    if (!creci.trim()) {
      errors.creci = "CRECI é obrigatório";
    }

    // Senha
    if (!isPasswordValid) {
      errors.password = "A senha não atende aos requisitos";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return false;

    // Verificações de unicidade no banco
    const phoneClean = phone.replace(/\D/g, "");
    const cpfClean   = cpf.replace(/\D/g, "");

    // E-mail único (só para convite sem e-mail fixo)
    if (!validInvite?.email) {
      const { data: emailExists } = await supabase.rpc("email_already_exists" as any, { check_email: email });
      if (emailExists) {
        setFieldErrors(e => ({ ...e, email: "Este e-mail já possui uma conta" }));
        return false;
      }
    }

    // Telefone único
    const { data: phoneProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phoneClean)
      .maybeSingle();
    if (phoneProfile) {
      setFieldErrors(e => ({ ...e, phone: "Este telefone já está cadastrado" }));
      return false;
    }

    // CPF único
    const { data: cpfProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("cpf", cpfClean)
      .maybeSingle();
    if (cpfProfile) {
      setFieldErrors(e => ({ ...e, cpf: "Este CPF já está cadastrado" }));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validInvite) return;
    if (!acceptTerms) { toast.error("Aceite os Termos de Uso"); return; }

    setSubmitting(true);
    try {
      const valid = await validate();
      if (!valid) { setSubmitting(false); return; }

      const phoneClean = phone.replace(/\D/g, "");
      const cpfClean   = cpf.replace(/\D/g, "");

      // 1. Criar conta no auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name:  fullName,
            phone:      phoneClean,
            role:       "corretor",
            company_id: validInvite.company_id,
            status:     "inativo",
            cpf:        cpfClean,
            creci,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. Atualizar perfil com todos os dados
      if (signUpData?.user?.id) {
        await new Promise(r => setTimeout(r, 1000));
        await supabase.from("profiles").update({
          company_id:  validInvite.company_id,
          status:      "inativo",
          invited_by:  validInvite.created_by,
          invited_at:  new Date().toISOString(),
          phone:       phoneClean,
          cpf:         cpfClean,
          creci,
          full_name:   fullName,
        }).eq("id", signUpData.user.id);
      }

      // 3. Marcar convite como aceito
      await (supabase
        .from("team_invites" as any)
        .update({ status: "aceito" })
        .eq("id", validInvite.id) as any);

      setSuccess(true);
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        if (error.message.includes("phone")) {
          setFieldErrors(e => ({ ...e, phone: "Este telefone já está cadastrado" }));
        } else if (error.message.includes("cpf")) {
          setFieldErrors(e => ({ ...e, cpf: "Este CPF já está cadastrado" }));
        } else {
          toast.error("Dados duplicados. Verifique CPF e telefone.");
        }
      } else {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7E22CE]" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Convite inválido</h1>
        <p className="text-slate-500 mb-6">{error}</p>
        <Button asChild className="bg-[#7E22CE] hover:bg-[#6b21a8]">
          <Link to="/auth">Voltar para o login</Link>
        </Button>
      </motion.div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Cadastro realizado!</h1>
        <p className="text-slate-500 mb-2">Bem-vindo à equipe de <strong>{empresa}</strong>!</p>
        <p className="text-sm text-slate-400 mb-6">
          Verifique seu e-mail para confirmar a conta. Após a ativação pela imobiliária, você já poderá fazer login.
        </p>
        <Button asChild className="bg-[#7E22CE] hover:bg-[#6b21a8] w-full">
          <Link to="/auth">Ir para o login</Link>
        </Button>
      </motion.div>
    </div>
  );

  const emailFixo = !!validInvite?.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Banner */}
        <div className="bg-[#7E22CE] px-8 py-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-purple-200 mb-1">Você foi convidado por</p>
          <h1 className="text-xl font-bold">{empresa}</h1>
          <p className="text-sm text-purple-200 mt-1">para fazer parte da equipe de corretores</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email}
                  onChange={(e) => { if (!emailFixo) { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: "" })); } }}
                  disabled={emailFixo}
                  className={cn("pl-10 rounded-xl", emailFixo && "bg-slate-50", fieldErrors.email && "border-red-400")}
                  placeholder="seu@email.com" required />
              </div>
              {emailFixo && <p className="text-xs text-muted-foreground">Definido pela imobiliária.</p>}
              {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nome completo * <span className="text-xs text-muted-foreground font-normal">(nome e sobrenome)</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="fullName" value={fullName}
                  onChange={(e) => { setFullName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "")); setFieldErrors(f => ({ ...f, fullName: "" })); }}
                  className={cn("pl-10 rounded-xl", fieldErrors.fullName && "border-red-400")}
                  placeholder="João da Silva" required />
              </div>
              {fieldErrors.fullName && <p className="text-xs text-red-500">{fieldErrors.fullName}</p>}
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone (celular com DDD) *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="phone" value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setFieldErrors(f => ({ ...f, phone: "" })); }}
                  className={cn("pl-10 rounded-xl", fieldErrors.phone && "border-red-400")}
                  placeholder="(21) 99999-9999" inputMode="numeric" required />
              </div>
              {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF *</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="cpf" value={cpf}
                  onChange={(e) => { setCpf(formatCPF(e.target.value)); setFieldErrors(f => ({ ...f, cpf: "" })); }}
                  className={cn("pl-10 rounded-xl", fieldErrors.cpf && "border-red-400")}
                  placeholder="000.000.000-00" inputMode="numeric" required />
              </div>
              {cpf && !fieldErrors.cpf && (
                <p className={cn("text-xs", isValidCPF(cpf) ? "text-green-600" : "text-red-500")}>
                  {isValidCPF(cpf) ? "✓ CPF válido" : "✗ CPF inválido"}
                </p>
              )}
              {fieldErrors.cpf && <p className="text-xs text-red-500">{fieldErrors.cpf}</p>}
            </div>

            {/* CRECI */}
            <div className="space-y-1.5">
              <Label htmlFor="creci">CRECI *</Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="creci" value={creci}
                  onChange={(e) => { setCreci(e.target.value.toUpperCase()); setFieldErrors(f => ({ ...f, creci: "" })); }}
                  className={cn("pl-10 rounded-xl", fieldErrors.creci && "border-red-400")}
                  placeholder="CRECI-RJ 12345" required />
              </div>
              {fieldErrors.creci && <p className="text-xs text-red-500">{fieldErrors.creci}</p>}
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: "" })); }}
                  className={cn("pl-10 rounded-xl", fieldErrors.password && "border-red-400")}
                  placeholder="Crie uma senha forte" required />
              </div>
              {password && (
                <div className="space-y-1 mt-1">
                  <div className="flex gap-1 h-1">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className={cn("h-full flex-1 rounded-full transition-all",
                        i <= passwordStrength ? i <= 2 ? "bg-red-400" : i <= 4 ? "bg-yellow-400" : "bg-green-400" : "bg-gray-200"
                      )} />
                    ))}
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    {passwordRequirements.map((req, idx) => (
                      <li key={idx} className={cn("flex items-center gap-1", req.regex.test(password) && "text-green-600")}>
                        <span>{req.regex.test(password) ? "✓" : "○"}</span>
                        <span>{req.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            {/* Termos */}
            <div className="flex items-start space-x-2 pt-1">
              <Checkbox id="terms" checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)} />
              <Label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed">
                Li e concordo com os{" "}
                <a href="/termos" target="_blank" className="text-[#7E22CE] font-medium hover:underline">Termos de Uso</a>
                {" "}e a{" "}
                <a href="/privacidade" target="_blank" className="text-[#7E22CE] font-medium hover:underline">Política de Privacidade</a>.
              </Label>
            </div>

            <Button type="submit"
              className="w-full bg-[#7E22CE] hover:bg-[#6b21a8] text-white rounded-xl font-bold"
              disabled={submitting || !isPasswordValid || !acceptTerms}>
              {submitting ? "Verificando dados..." : "Entrar para a equipe"}
            </Button>

            <p className="text-center text-xs text-slate-400">
              Já tem uma conta?{" "}
              <Link to="/auth" className="text-[#7E22CE] hover:underline font-medium">Fazer login</Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Convite;