// src/pages/AssinaturaCancelado.tsx
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AssinaturaCancelado() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-3xl font-bold">Assinatura cancelada</h1>
      <p className="text-muted-foreground max-w-md mt-2">
        Você cancelou o processo de assinatura. Se foi um engano, pode tentar novamente quando quiser.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button asChild>
          <Link to="/subscription">Ver planos novamente</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>

      <Card className="mt-8 max-w-md bg-muted/30 border-dashed">
        <div className="p-4 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-sm font-medium">Precisa de ajuda?</p>
            <p className="text-xs text-muted-foreground">
              Se você teve algum problema durante o pagamento, entre em contato conosco pelo e-mail 
              <a href="mailto:suporte@r2tech.com.br" className="text-purple-600 hover:underline ml-1">
                suporte@r2tech.com.br
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}