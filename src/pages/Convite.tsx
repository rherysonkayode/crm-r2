import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Convite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [validInvite, setValidInvite] = useState<any>(null);
  const [empresa, setEmpresa]       = useState<string>("");
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  const [fullName, setFullName]     = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [password, setPassword]     = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

      // Busca convite + nome da empresa
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
        if (data.email) setEmail(data.email);
        if (data.full_name) setFullName(data.full_name);
        if (data.phone) setPhone(data.phone);
      }
      setLoading(false);
    };
    validateInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validInvite) return;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido"); return;
    }
    if (!fullName.trim()) {
      toast.error("Informe seu nome completo"); return;
    }
    if (!isPasswordValid) {
      toast.error("A senha não atende aos requisitos"); return;
    }
    if (!acceptTerms) {
      toast.error("Você precisa aceitar os Termos de Uso"); return;
    }

    setSubmitting(true);
    try {
      // Verifica se e-mail já existe (apenas para link geral sem e-mail fixo)
      if (!validInvite.email) {
        const { data: exists } = await supabase.rpc("email_already_exists" as any, { check_email: email });
        if (exists) {
          toast.error("Este e-mail já possui uma conta no CRM R2.");
          setSubmitting(false);
          return;
        }
      }

      // 1. Criar conta no auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name:  fullName,
            phone,
            role:       "corretor",
            company_id: validInvite.company_id,
            status:     "inativo",
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. Garantir vínculo no perfil — atualiza diretamente após o signUp
      // O perfil é criado pelo trigger do Supabase; aguardamos 1s e atualizamos
      if (signUpData?.user?.id) {
        await new Promise(r => setTimeout(r, 1000));
        await supabase.from("profiles").update({
          company_id:  validInvite.company_id,
          status:      "inativo",
          invited_by:  validInvite.created_by,
          invited_at:  new Date().toISOString(),
        }).eq("id", signUpData.user.id);
      }

      // 3. Marcar convite como aceito
      await (supabase
        .from("team_invites" as any)
        .update({ status: "aceito" })
        .eq("id", validInvite.id) as any);

      setSuccess(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7E22CE]" />
    </div>
  );

  // ── Erro ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Convite inválido</h1>
        <p className="text-slate-500 mb-6">{error}</p>
        <Button asChild className="bg-[#7E22CE] hover:bg-[#6b21a8]">
          <Link to="/auth">Voltar para o login</Link>
        </Button>
      </motion.div>
    </div>
  );

  // ── Sucesso ───────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Cadastro realizado!</h1>
        <p className="text-slate-500 mb-2">
          Bem-vindo à equipe de <strong>{empresa}</strong>!
        </p>
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

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Banner da imobiliária */}
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
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email" type="email" value={email}
                  onChange={(e) => !emailFixo && setEmail(e.target.value)}
                  disabled={emailFixo}
                  className={cn("pl-10 rounded-xl", emailFixo && "bg-slate-50")}
                  placeholder="seu@email.com" required
                />
              </div>
              {emailFixo && (
                <p className="text-xs text-muted-foreground">Definido pela imobiliária — não pode ser alterado.</p>
              )}
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 rounded-xl" placeholder="Seu nome completo" required
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 rounded-xl" placeholder="(21) 99999-9999"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rounded-xl" placeholder="Crie uma senha forte" required
                />
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className={cn("h-full flex-1 rounded-full transition-all",
                        i <= passwordStrength
                          ? i <= 2 ? "bg-red-400" : i <= 4 ? "bg-yellow-400" : "bg-green-400"
                          : "bg-gray-200"
                      )} />
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
              )}
            </div>

            {/* Termos */}
            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms" checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed">
                Li e concordo com os{" "}
                <a href="/termos" target="_blank" className="text-[#7E22CE] font-medium hover:underline">Termos de Uso</a>
                {" "}e a{" "}
                <a href="/privacidade" target="_blank" className="text-[#7E22CE] font-medium hover:underline">Política de Privacidade</a>.
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#7E22CE] hover:bg-[#6b21a8] text-white rounded-xl font-bold"
              disabled={submitting || !isPasswordValid || !acceptTerms}
            >
              {submitting ? "Processando..." : "Entrar para a equipe"}
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