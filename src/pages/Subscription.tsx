import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard, Clock, AlertCircle, CheckCircle, LogOut, Building2 } from "lucide-react";

const plans = {
  start: {
    name: "Start",
    price: 97,
    users: 1,
    leads: 200,
    imoveis: 50,
    features: ["Gestão de leads", "Cadastro de imóveis", "Calendário", "Calculadora financeira", "Relatórios básicos", "Suporte por e-mail"],
  },
  pro: {
    name: "Pro",
    price: 147,
    users: 1,
    leads: 500,
    imoveis: 150,
    features: ["Tudo do Start", "Relatórios avançados", "Exportação de dados", "Campos personalizados"],
  },
  profissional: {
    name: "Profissional",
    price: 197,
    users: 5,
    leads: 1000,
    imoveis: 300,
    features: ["Tudo do Pro", "Até 5 usuários", "Gestão de equipe", "Relatórios por corretor"],
  },
  enterprise: {
    name: "Enterprise",
    price: 347,
    users: 20,
    leads: 5000,
    imoveis: 1000,
    features: ["Tudo do Profissional", "API e Webhooks", "Múltiplas filiais", "Suporte prioritário"],
  },
};

const Subscription = () => {
  const { profile, signOut, companyProfile, isCorretorVinculado } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Timer de contagem regressiva — só para trial ainda ativo
  useEffect(() => {
    if (!profile) return;
    if (profile.subscription_status !== "trial" || !profile.trial_end) return;
    const trialEnd = new Date(profile.trial_end);
    if (trialEnd < new Date()) return; // já expirou, não precisa de timer

    const updateTimer = () => {
      const now = new Date();
      const diffMs = trialEnd.getTime() - now.getTime();
      if (diffMs <= 0) { setTimeLeft("Expirado"); return; }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days} dia${days > 1 ? "s" : ""} e ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h e ${minutes}min`);
      else setTimeLeft(`${minutes} minuto${minutes !== 1 ? "s" : ""}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  // REMOVIDO: useEffect que atualizava status no banco e chamava refreshProfile()
  // Isso causava loop: profile ficava null momentaneamente → ProtectedRoute redirecionava
  // A expiração é calculada em tempo real no frontend (ProtectedRoute + aqui embaixo)

  if (!profile) {
    return (
      <AppLayout>
        <div className="space-y-6 p-6 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  // Corretor vinculado — mostrar info da imobiliária
  if (isCorretorVinculado) {
    const company = companyProfile;
    const companyTrialEnd = company?.trial_end ? new Date(company.trial_end) : null;
    const now = new Date();
    const companyExpired =
      company?.subscription_status === "expired" ||
      (company?.subscription_status === "trial" && companyTrialEnd && companyTrialEnd < now);

    return (
      <AppLayout>
        <div className="space-y-6 p-6 max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">Assinatura</h1>
            <p className="text-muted-foreground text-sm">Status do seu acesso</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-[#7E22CE]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Acesso gerenciado pela imobiliária</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seu acesso ao CRM R2 está incluído no plano da imobiliária à qual você está vinculado.
                    Você não precisa de uma assinatura separada.
                  </p>
                </div>
                {company && (
                  <div className="w-full p-4 bg-muted/40 rounded-xl text-left space-y-2">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Imobiliária</p>
                    <p className="font-bold">{company.full_name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {companyExpired
                        ? <Badge variant="destructive">Expirado</Badge>
                        : company?.subscription_status === "active"
                          ? <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                          : <Badge className="bg-blue-100 text-blue-700">Trial</Badge>
                      }
                    </div>
                    {!companyExpired && companyTrialEnd && company?.subscription_status === "trial" && (
                      <p className="text-xs text-muted-foreground">
                        Trial válido até {companyTrialEnd.toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}
                {companyExpired && (
                  <Alert variant="destructive" className="w-full">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      O plano da imobiliária expirou. Entre em contato com o responsável para renovar o acesso.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const planKey = profile.plan && profile.plan in plans ? profile.plan : "start";
  const currentPlan = plans[planKey as keyof typeof plans];

  // Calcula estado real em tempo real (não depende só do campo do banco)
  const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null;
  const now = new Date();
  const isExpired =
    profile.subscription_status === "expired" ||
    (profile.subscription_status === "trial" && trialEnd !== null && trialEnd < now);
  const isActive = profile.subscription_status === "active";
  const isTrial = profile.subscription_status === "trial" && !isExpired;

  const trialProgressValue =
    trialEnd && profile.trial_start
      ? Math.min(
          100,
          Math.max(
            0,
            ((now.getTime() - new Date(profile.trial_start).getTime()) /
              (trialEnd.getTime() - new Date(profile.trial_start).getTime())) *
              100
          )
        )
      : trialEnd
      ? Math.min(
          100,
          Math.max(
            0,
            100 -
              ((trialEnd.getTime() - now.getTime()) / (3 * 24 * 60 * 60 * 1000)) * 100
          )
        )
      : 0;

  const getStatusBadge = () => {
    if (isExpired) return <Badge variant="destructive">Expirado</Badge>;
    if (isActive) return <Badge className="bg-green-100 text-green-700 border-green-200">Ativo</Badge>;
    if (isTrial) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Trial</Badge>;
    return <Badge variant="outline">Inativo</Badge>;
  };

  const handleSubscribe = () => {
    alert("Redirecionar para checkout (em desenvolvimento)");
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6 max-w-2xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Minha Assinatura</h1>
            <p className="text-muted-foreground text-sm">Gerencie seu plano e pagamentos</p>
          </div>
          <Button variant="destructive" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Card de status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Status da assinatura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <p className="text-2xl font-bold text-[#7E22CE]">{currentPlan.name}</p>
              </div>
              <div>{getStatusBadge()}</div>
            </div>

            {/* Trial ativo */}
            {isTrial && trialEnd && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">⏳ Período de teste</span>
                </div>
                <p className="text-sm text-blue-600">
                  Seu acesso expira em: <strong>{timeLeft}</strong>
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  até {format(trialEnd, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <Progress value={trialProgressValue} className="mt-3 h-2" />
              </div>
            )}

            {/* Expirado */}
            {isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {trialEnd
                    ? `Seu período de teste expirou em ${format(trialEnd, "dd/MM/yyyy", { locale: ptBR })}.`
                    : "Seu acesso expirou."}{" "}
                  Assine agora para continuar usando o CRM R2.
                </AlertDescription>
              </Alert>
            )}

            {/* Ativo */}
            {isActive && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold">Assinatura ativa</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Sua assinatura está em dia. Aproveite todos os recursos do plano {currentPlan.name}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes do plano */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do plano {currentPlan.name}</CardTitle>
            <CardDescription>
              R$ {currentPlan.price}/mês •{" "}
              {currentPlan.users === 1 ? "1 usuário" : `${currentPlan.users} usuários`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span><strong>{currentPlan.leads}</strong> leads/mês</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span><strong>{currentPlan.imoveis}</strong> imóveis ativos</span>
              </li>
              {currentPlan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {(isExpired || isTrial) && (
              <Button
                onClick={handleSubscribe}
                className="mt-6 w-full bg-[#7E22CE] hover:bg-[#6b21a8]"
              >
                {isExpired ? "Assinar agora" : "Assinar após o trial"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum pagamento registrado ainda.
            </p>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
};

export default Subscription;