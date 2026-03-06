import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error" | "already_confirmed";

export default function ConfirmEmail() {
  const [status, setStatus] = useState<Status>("loading");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    // Supabase redireciona com token_hash + type=signup
    if (token_hash && type === "signup") {
      supabase.auth
        .verifyOtp({ token_hash, type: "signup" })
        .then(({ error }) => {
          if (error) {
            console.error("Erro ao verificar OTP:", error);
            // Token expirado ou já usado → trata como já confirmado
            if (
              error.message?.includes("expired") ||
              error.message?.includes("already") ||
              error.message?.includes("used")
            ) {
              setStatus("already_confirmed");
            } else {
              setStatus("error");
            }
          } else {
            setStatus("success");
            // Redireciona pro dashboard após 3s
            setTimeout(() => navigate("/dashboard"), 3000);
          }
        });
    } else {
      // Sem parâmetros válidos → pode ser acesso direto
      setStatus("already_confirmed");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-white flex flex-col items-center justify-center p-6 font-sans">

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

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 text-center"
        >
          {/* LOADING */}
          {status === "loading" && (
            <div className="space-y-5">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-9 h-9 text-[#7E22CE] animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Verificando seu e-mail...</h1>
              <p className="text-slate-500 text-sm">Aguarde um momento.</p>
            </div>
          )}

          {/* SUCCESS */}
          {status === "success" && (
            <div className="space-y-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-900">E-mail confirmado! 🎉</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Sua conta foi ativada com sucesso.<br />
                Você será redirecionado para o dashboard em instantes.
              </p>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-sm text-purple-700 font-medium">
                  🎁 Seu período de teste gratuito de <strong>3 dias</strong> já começou!
                </p>
              </div>
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-[#7E22CE] hover:bg-[#6b21a8] text-white rounded-2xl py-6 font-bold"
              >
                Ir para o Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ALREADY CONFIRMED */}
          {status === "already_confirmed" && (
            <div className="space-y-5">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-9 h-9 text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Conta já confirmada</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Seu e-mail já foi verificado anteriormente.<br />
                Faça login para acessar o CRM R2.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-[#7E22CE] hover:bg-[#6b21a8] text-white rounded-2xl py-6 font-bold"
              >
                Fazer Login <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ERROR */}
          {status === "error" && (
            <div className="space-y-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto"
              >
                <XCircle className="w-10 h-10 text-red-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-900">Link inválido ou expirado</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Este link de confirmação expirou ou já foi utilizado.<br />
                Faça login e solicite um novo link de verificação.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                className="w-full rounded-2xl py-6 font-bold border-slate-200"
              >
                Voltar para o Login
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
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
}