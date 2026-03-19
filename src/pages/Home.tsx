import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, TrendingUp, Home as HomeIcon, Users, Calendar, Calculator, Zap, Shield, Smartphone, MessageCircle } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

const Home = () => {
  const plans = [
    { name: "Start", description: "Para corretores autonomos comecando", price: 97, period: "mes", users: 1, leads: 200, imoveis: 50, features: ["Gestao de leads", "Cadastro de imoveis", "Calendario de eventos", "Calculadora financeira", "Relatorios basicos", "Suporte por e-mail"], notIncluded: ["Relatorios avancados", "API", "Multiplas filiais", "Suporte prioritario"], cta: "Comecar teste gratis", popular: false },
    { name: "Pro", description: "Para corretores com alta demanda", price: 147, period: "mes", users: 1, leads: 500, imoveis: 150, features: ["Tudo do Start", "Relatorios avancados", "Exportacao de dados", "Campos personalizados"], notIncluded: ["API", "Multiplas filiais", "Suporte prioritario"], cta: "Comecar teste gratis", popular: false },
    { name: "Profissional", description: "Para imobiliarias pequenas", price: 197, period: "mes", users: 5, leads: 1000, imoveis: 300, features: ["Tudo do Pro", "Ate 5 usuarios", "Gestao de equipe", "Relatorios por corretor"], notIncluded: ["API", "Multiplas filiais"], cta: "Comecar teste gratis", popular: true },
    { name: "Enterprise", description: "Para imobiliarias medias", price: 347, period: "mes", users: 20, leads: 5000, imoveis: 1000, features: ["Tudo do Profissional", "API e Webhooks", "Multiplas filiais", "Suporte prioritario"], notIncluded: [], cta: "Comecar teste gratis", popular: false },
  ];

  const whatsappUrl = "https://wa.me/5521973721654";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="fixed bottom-24 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors">
        <MessageCircle className="w-6 h-6" />
      </a>

      <PublicHeader showBack={false} />

      <section className="bg-gradient-to-br from-[#7E22CE] via-purple-700 to-purple-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">CRM R2</h1>
          <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto">A solucao definitiva para corretores e imobiliarias de alta performance</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-[#7E22CE] hover:bg-purple-50 text-lg px-8 py-6" asChild>
              <Link to="/auth">Comecar teste gratis</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white bg-purple-800/20 hover:bg-purple-600 text-lg px-8 py-6" asChild>
              <Link to="/faq">Conhecer funcionalidades</Link>
            </Button>
          </div>
          <p className="text-sm text-purple-200 mt-4">Teste gratis de 3 dias - Sem compromisso</p>
          <p className="mt-6 text-purple-200 text-sm">
            Ja tem conta?{" "}
            <Link to="/auth" className="text-white font-bold underline underline-offset-4 decoration-white/50 hover:decoration-white transition-all">
              Clique aqui para entrar
            </Link>
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Por que escolher o CRM R2?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BenefitCard icon={<TrendingUp />} title="Funil de vendas" text="Acompanhe seus negocios em todas as etapas, do lead ao fechamento." />
            <BenefitCard icon={<HomeIcon />} title="Gestao de imoveis" text="Cadastre fotos e organize seu portfolio com facilidade." />
            <BenefitCard icon={<Users />} title="Equipe integrada" text="Para imobiliarias: convide corretores e divida comissoes." />
            <BenefitCard icon={<Calendar />} title="Calendario" text="Nunca perca um compromisso com lembretes e eventos." />
            <BenefitCard icon={<Calculator />} title="Calculadora financeira" text="Simule financiamentos com taxas reais dos bancos." />
            <BenefitCard icon={<Zap />} title="Rapido e intuitivo" text="Interface pensada para o dia a dia do corretor." />
            <BenefitCard icon={<Shield />} title="Seguro e confiavel" text="Seus dados protegidos com criptografia e backups." />
            <BenefitCard icon={<Smartphone />} title="100% responsivo" text="Acesse de qualquer lugar, no celular, tablet ou computador." />
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">Planos que cabem no seu bolso</h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">Precos acessiveis para voce comecar agora. Teste gratis de 3 dias sem compromisso.</p>

          <div className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto pb-4 items-start">
            {plans.map((plan) => (
              <div key={plan.name} className={`flex-shrink-0 w-[280px] sm:w-[300px] lg:w-auto ${plan.popular ? "pt-4" : ""}`}>
                <Card className={`relative flex flex-col h-full overflow-visible ${plan.popular ? "border-2 border-[#7E22CE] shadow-xl" : "border border-slate-200"}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <span className="bg-[#7E22CE] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                        Mais popular
                      </span>
                    </div>
                  )}
                  <CardHeader className={plan.popular ? "pt-7" : ""}>
                    <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                    <CardDescription className="text-sm text-slate-500">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-[#7E22CE]">R$ {plan.price}</span>
                      <span className="text-sm text-slate-500 ml-1">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><span><strong>{plan.users}</strong> {plan.users === 1 ? "usuario" : "usuarios"}</span></li>
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><span><strong>{plan.leads}</strong> leads/mes</span></li>
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><span><strong>{plan.imoveis}</strong> imoveis ativos</span></li>
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><span>{feature}</span></li>
                      ))}
                      {plan.notIncluded.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-400"><X className="w-4 h-4 mt-0.5 shrink-0" /><span className="line-through">{feature}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className={`w-full ${plan.popular ? "bg-[#7E22CE] hover:bg-[#6b21a8]" : "bg-slate-800 hover:bg-slate-900"}`}>
                      <Link to="/auth">{plan.cta}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-8">Planos anuais com 20% de desconto (consulte na hora da assinatura)</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-8">Perguntas frequentes</h2>
          <div className="space-y-4">
            <details className="bg-white p-4 rounded-lg border border-slate-200">
              <summary className="font-semibold cursor-pointer">Como funciona o teste gratis?</summary>
              <p className="mt-2 text-slate-600">Voce tem 3 dias para testar todas as funcionalidades. Nao e necessario cartao de credito.</p>
            </details>
            <details className="bg-white p-4 rounded-lg border border-slate-200">
              <summary className="font-semibold cursor-pointer">Posso mudar de plano depois?</summary>
              <p className="mt-2 text-slate-600">Sim! Voce pode fazer upgrade a qualquer momento. Downgrades so sao permitidos na renovacao.</p>
            </details>
            <details className="bg-white p-4 rounded-lg border border-slate-200">
              <summary className="font-semibold cursor-pointer">Quais formas de pagamento sao aceitas?</summary>
              <p className="mt-2 text-slate-600">Cartao de credito, PIX e boleto bancario (assinaturas anuais).</p>
            </details>
            <details className="bg-white p-4 rounded-lg border border-slate-200">
              <summary className="font-semibold cursor-pointer">Preciso contratar por quanto tempo?</summary>
              <p className="mt-2 text-slate-600">Mensalmente, sem fidelidade. Voce pode cancelar quando quiser.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="bg-[#7E22CE] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Comece agora mesmo</h2>
          <p className="text-purple-100 text-lg mb-6">Teste gratis por 3 dias. Sem compromisso.</p>
          <Button size="lg" className="bg-white text-[#7E22CE] hover:bg-purple-50 text-lg px-8 py-6" asChild>
            <Link to="/auth">Quero testar</Link>
          </Button>
          <p className="mt-4 text-purple-200 text-sm">
            Ja tem conta?{" "}
            <Link to="/auth" className="text-white font-bold underline underline-offset-4 decoration-white/50 hover:decoration-white transition-all">
              Clique aqui para entrar
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const BenefitCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-[#7E22CE] mb-4">{icon}</div>
    <h3 className="font-semibold text-lg text-slate-800 mb-2">{title}</h3>
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

export default Home;