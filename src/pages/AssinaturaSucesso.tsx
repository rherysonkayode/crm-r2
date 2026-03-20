import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PLAN_NAMES: Record<string, string> = {
  start: "Start", pro: "Pro", profissional: "Profissional", enterprise: "Enterprise",
};

const AssinaturaSucesso = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "active" | "pending">("verifying");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 12; // ~24 segundos

    const check = async () => {
      attempts++;
      try {
        // Tentar recuperar sessão primeiro
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Sessão perdida após redirect — mostrar tela de pendente com instrução de login
          setStatus("pending");
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", user.id)
          .single();

        if (data?.subscription_status === "active") {
          await refreshProfile();
          setStatus("active");
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(check, 2000);
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("pending");
      }
    };

    check();
  }, []);

  // Countdown para redirect após ativação
  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); navigate("/dashboard"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Verificando
  if (status === "verifying") return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#7E22CE]" />
        <h2 className="text-xl font-bold text-slate-800">Verificando pagamento...</h2>
        <p className="text-sm text-muted-foreground text-center">
          Aguarde enquanto confirmamos seu pagamento. Isso pode levar alguns segundos.
        </p>
      </div>
    </div>
  );

  // Pendente — webhook ainda não chegou
  if (status === "pending") return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-4 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Processando pagamento</h1>
        <p className="text-muted-foreground text-sm">
          Seu pagamento está sendo confirmado. Isso pode levar alguns minutos.
          Assim que confirmado, seu acesso será liberado automaticamente.
        </p>
        <p className="text-xs text-muted-foreground">
          Você receberá uma notificação no sistema quando o plano for ativado.
          Se você foi deslogado, faça login novamente — seu plano será ativado automaticamente.
        </p>
        <div className="flex gap-3 mt-2 w-full">
          <Button className="flex-1 bg-[#7E22CE] hover:bg-[#6b21a8]" asChild>
            <Link to="/dashboard">Ir ao Dashboard</Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/subscription">Ver assinatura</Link>
          </Button>
        </div>
      </div>
    </div>
  );

  // Ativo — sucesso!
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-5 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Tudo certo! 🎉</h1>
          <p className="text-muted-foreground mt-2">
            Seu plano <strong className="text-[#7E22CE]">
              {PLAN_NAMES[profile?.plan ?? ""] ?? profile?.plan ?? ""}
            </strong> foi ativado com sucesso.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Redirecionando em <strong>{countdown}</strong> segundos...
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <Button className="flex-1 bg-[#7E22CE] hover:bg-[#6b21a8]" asChild>
            <Link to="/dashboard">Ir ao Dashboard</Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/subscription">Ver assinatura</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssinaturaSucesso;