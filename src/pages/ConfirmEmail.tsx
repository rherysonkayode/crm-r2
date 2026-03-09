import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "already_confirmed" | "error";

const ConfirmEmail = () => {
  const [status, setStatus] = useState<Status>("loading");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const confirm = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!token_hash || type !== "signup") {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("already_confirmed");
        } else {
          setStatus("error");
        }
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "signup",
      });

      if (error) {
        if (error.message.includes("already confirmed") || error.message.includes("expired")) {
          setStatus("already_confirmed");
        } else {
          setStatus("error");
        }
      } else {
        setStatus("success");
      }
    };

    confirm();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0a1e] flex items-center justify-center p-4 overflow-hidden relative">

      {/* Fundo animado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#7E22CE]/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-400/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-violet-900/10 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(126,34,206,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(126,34,206,0.8) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
            </div>
            <p className="text-white/60 text-lg font-light tracking-wide">Verificando seu e-mail...</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="relative mx-auto w-28 h-28 mb-8"
              >
                <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 border border-green-400/30 flex items-center justify-center">
                  <CheckCircle2 className="w-14 h-14 text-green-400" strokeWidth={1.5} />
                </div>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [1, 1, 0],
                      x: [0, Math.cos((i * 60 * Math.PI) / 180) * 50],
                      y: [0, Math.sin((i * 60 * Math.PI) / 180) * 50],
                    }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.8 }}
                    className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-green-400"
                    style={{ marginTop: -4, marginLeft: -4 }}
                  />
                ))}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-6">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-semibold uppercase tracking-widest">Confirmado</span>
                </div>

                <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
                  E-mail verificado<br />com sucesso!
                </h1>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Sua conta foi ativada. Bem-vindo ao <span className="text-purple-400 font-semibold">CRM R2</span> — a plataforma definitiva para corretores e imobiliárias de alta performance.
                </p>

                <Button
                  onClick={() => navigate("/auth")}
                  className="w-full py-6 bg-gradient-to-r from-[#7E22CE] to-violet-500 hover:from-violet-600 hover:to-purple-500 text-white rounded-2xl font-bold text-base transition-all duration-300 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 hover:scale-[1.02] group"
                >
                  Entrar no sistema
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </div>
            <p className="text-center text-white/20 text-xs mt-6 tracking-widest uppercase">R2 TECH · CRM</p>
          </motion.div>
        )}

        {status === "already_confirmed" && (
          <motion.div
            key="already"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative mx-auto w-28 h-28 mb-8"
              >
                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-600/20 border border-blue-400/30 flex items-center justify-center">
                  <Mail className="w-14 h-14 text-blue-400" strokeWidth={1.5} />
                </div>
              </motion.div>

              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">Já ativo</span>
              </div>

              <h1 className="text-3xl font-bold text-white mb-3">Conta já confirmada!</h1>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                Seu e-mail já foi verificado anteriormente. Você pode acessar o <span className="text-purple-400 font-semibold">CRM R2</span> normalmente.
              </p>

              <Button
                onClick={() => navigate("/auth")}
                className="w-full py-6 bg-gradient-to-r from-[#7E22CE] to-violet-500 hover:from-violet-600 hover:to-purple-500 text-white rounded-2xl font-bold text-base transition-all duration-300 shadow-lg shadow-purple-900/40 hover:scale-[1.02] group"
              >
                Ir para o login
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <p className="text-center text-white/20 text-xs mt-6 tracking-widest uppercase">R2 TECH · CRM</p>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative mx-auto w-28 h-28 mb-8"
              >
                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-red-400/20 to-rose-600/20 border border-red-400/30 flex items-center justify-center">
                  <XCircle className="w-14 h-14 text-red-400" strokeWidth={1.5} />
                </div>
              </motion.div>

              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-red-400 text-xs font-semibold uppercase tracking-widest">Link inválido</span>
              </div>

              <h1 className="text-3xl font-bold text-white mb-3">Link expirado</h1>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                Este link de confirmação é inválido ou expirou. Faça login e solicite um novo e-mail de confirmação.
              </p>

              <Button
                onClick={() => navigate("/auth")}
                className="w-full py-6 bg-gradient-to-r from-[#7E22CE] to-violet-500 hover:from-violet-600 hover:to-purple-500 text-white rounded-2xl font-bold text-base transition-all duration-300 shadow-lg shadow-purple-900/40 hover:scale-[1.02] group"
              >
                Voltar para o login
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <p className="text-center text-white/20 text-xs mt-6 tracking-widest uppercase">R2 TECH · CRM</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConfirmEmail;