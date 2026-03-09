import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle2, Eye, EyeOff, ArrowRight } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const strengthColor = ["bg-red-400", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"][passwordStrength];
  const strengthLabel = ["", "Muito fraca", "Fraca", "Média", "Forte", "Muito forte"][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) { toast.error("A senha não atende aos requisitos mínimos"); return; }
    if (password !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/auth"), 3000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha");
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
        {!success && (
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
                <Lock className="w-8 h-8 text-[#7E22CE]" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Criar nova senha</h1>
              <p className="text-slate-500 text-sm mt-2">Defina uma senha segura para sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nova senha */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 py-6 rounded-2xl"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Barra de força */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : "bg-slate-100"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">{strengthLabel}</p>
                    <div className="space-y-1">
                      {passwordRequirements.map((req) => (
                        <p key={req.label} className={`text-xs flex items-center gap-1.5 ${req.regex.test(password) ? "text-green-600" : "text-slate-400"}`}>
                          <span>{req.regex.test(password) ? "✓" : "○"}</span> {req.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar senha */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 py-6 rounded-2xl"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">As senhas não coincidem</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600">✓ Senhas coincidem</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full py-6 bg-[#7E22CE] hover:bg-purple-700 text-white rounded-2xl font-bold text-base"
                disabled={loading || !isPasswordValid}
              >
                {loading ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </form>
          </motion.div>
        )}

        {/* SUCESSO */}
        {success && (
          <motion.div
            key="success"
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

            <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Senha atualizada!</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Sua senha foi redefinida com sucesso.<br />
              Você será redirecionado para o login.
            </p>

            <Button
              onClick={() => navigate("/auth")}
              className="w-full py-6 bg-[#7E22CE] hover:bg-purple-700 text-white rounded-2xl font-bold"
            >
              Ir para o login <ArrowRight className="w-4 h-4 ml-2" />
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

export default ResetPassword;
