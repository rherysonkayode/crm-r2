import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const Convite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [validInvite, setValidInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulário
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        setError("Link inválido");
        setLoading(false);
        return;
      }
      const { data, error } = await (supabase
        .from("team_invites" as any)
        .select("*")
        .eq("token", token)
        .single() as any);

      if (error || !data) {
        setError("Convite não encontrado");
      } else if (data.status !== 'pendente') {
        setError("Este convite já foi utilizado ou cancelado");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("Este convite expirou");
      } else {
        setValidInvite(data);
      }
      setLoading(false);
    };
    validateInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validInvite) return;

    if (!isPasswordValid) {
      toast.error("A senha não atende aos requisitos");
      return;
    }
    if (!acceptTerms) {
      toast.error("Você precisa aceitar os Termos de Uso");
      return;
    }

    setSubmitting(true);
    try {
      // Criar usuário no auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: validInvite.email || `${validInvite.token}@temp.com`, // fallback para link
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role: 'corretor',
            company_id: validInvite.company_id,
            status: 'inativo',
            invited_by: validInvite.created_by,
            invited_at: new Date().toISOString(),
          }
        }
      });

      if (signUpError) throw signUpError;

      // Marcar convite como aceito
      await (supabase
        .from("team_invites" as any)
        .update({ status: 'aceito', accepted_at: new Date().toISOString() })
        .eq("id", validInvite.id) as any);

      toast.success("Cadastro realizado! Aguarde a ativação pela imobiliária.");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7E22CE]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Convite inválido</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button asChild className="bg-[#7E22CE] hover:bg-[#6b21a8]">
            <Link to="/auth">Voltar para login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-6">
          <img src="/logo-r2.svg" alt="CRM R2" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Aceitar convite</h1>
          <p className="text-slate-500 text-sm">
            Você foi convidado para fazer parte da equipe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={validInvite?.email || ''}
                disabled
                className="pl-10 py-6 rounded-xl bg-slate-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 py-6 rounded-xl"
                placeholder="Seu nome"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 py-6 rounded-xl"
                placeholder="(21) 99999-9999"
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
                className="pl-10 py-6 rounded-xl"
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
              </a>.
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full py-6 bg-[#7E22CE] hover:bg-[#6b21a8] text-white rounded-xl font-bold text-lg"
            disabled={submitting}
          >
            {submitting ? "Processando..." : "Finalizar cadastro"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Convite;