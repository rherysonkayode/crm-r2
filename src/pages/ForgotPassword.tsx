import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Verifica se o e-mail existe no banco
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", (await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })).data?.user?.id ?? "")
        .maybeSingle();

      // Tenta enviar o link independente — Supabase não expõe se o e-mail existe por segurança
      // Mas verificamos via RPC se o e-mail está cadastrado
      const { data: emailCheck } = await (supabase.rpc as any)("check_email_exists", { email_to_check: email });
      
      if (!emailCheck) {
        toast.error("Este e-mail não está cadastrado no sistema.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://crm-r2.vercel.app/#/reset-password",
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-white flex flex-col items-center justify-center p-6">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="bg-[#7E22CE] rounded-[20px] px-6 py-3 text-center">
          <span className="text-white font-black text-xl tracking-tight uppercase">CRM R2</span>
          <span className="block text-purple-200 text-xs font-medium tracking-widest mt-0.5">by R2 TECH</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* FORMULÁRIO */}
        {!sent && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#7E22CE]" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Esqueceu sua senha?</h1>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 py-6 rounded-2xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-6 bg-[#7E22CE] hover:bg-purple-700 text-white rounded-2xl font-bold text-base"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                  </span>
                ) : "Enviar link de recuperação"}
              </Button>
            </form>

            <button
              onClick={() => navigate("/auth")}
              className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-[#7E22CE] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </button>
          </motion.div>
        )}

        {/* SUCESSO */}
        {sent && (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </motion.div>

            <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">E-mail enviado!</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Enviamos um link de recuperação para<br />
              <strong className="text-slate-700">{email}</strong><br />
              Verifique sua caixa de entrada e spam.
            </p>

            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-6 text-left">
              <p className="text-sm text-purple-700 font-medium">⏱ O link expira em 24 horas</p>
              <p className="text-sm text-purple-600 mt-1">Não recebeu? Aguarde alguns minutos e tente novamente.</p>
            </div>

            <Button
              onClick={() => navigate("/auth")}
              className="w-full py-6 bg-[#7E22CE] hover:bg-purple-700 text-white rounded-2xl font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao login
            </Button>
          </motion.div>
        )}

      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-xs text-slate-400"
      >
        © {new Date().getFullYear()} R2 Tech · Todos os direitos reservados
      </motion.p>
    </div>
  );
};

export default ForgotPassword;
