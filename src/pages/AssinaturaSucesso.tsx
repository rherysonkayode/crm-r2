// src/pages/AssinaturaSucesso.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function AssinaturaSucesso() {
  const { profile, refreshProfile } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [verifying, setVerifying] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Tentar atualizar o perfil várias vezes até a assinatura ser ativada
    let attempts = 0;
    const maxAttempts = 10;

    const checkSubscription = async () => {
      await refreshProfile();
      attempts++;
      
      if (profile?.subscription_status === 'active') {
        setVerifying(false);
        return true;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkSubscription, 2000);
        return false;
      }
      
      setVerifying(false);
      return false;
    };

    checkSubscription();
  }, [profile]);

  useEffect(() => {
    if (!verifying && profile?.subscription_status === 'active') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [verifying, profile]);

  if (verifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
        <h2 className="text-xl font-semibold">Verificando sua assinatura...</h2>
        <p className="text-muted-foreground mt-2">Aguarde um momento</p>
      </div>
    );
  }

  if (profile?.subscription_status !== 'active') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Aguardando confirmação</h1>
        <p className="text-muted-foreground max-w-md mt-2">
          Sua assinatura está sendo processada. Isso pode levar alguns minutos.
          Você receberá um e-mail de confirmação.
        </p>
        <Button asChild className="mt-6">
          <Link to="/subscription">Voltar para assinaturas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold">Assinatura confirmada! 🎉</h1>
      <p className="text-muted-foreground max-w-md mt-2">
        Seu plano {profile?.plan === 'start' ? 'Start' : 
                       profile?.plan === 'pro' ? 'Pro' : 
                       profile?.plan === 'profissional' ? 'Profissional' : 'Enterprise'} 
        foi ativado com sucesso.
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Você será redirecionado em {countdown} segundos.
      </p>
      <div className="flex gap-3 mt-6">
        <Button asChild>
          <Link to="/dashboard">Ir para o Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/calculators">Ver calculadoras</Link>
        </Button>
      </div>
    </div>
  );
}