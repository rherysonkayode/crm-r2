import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, TrendingUp, Home as HomeIcon, Users, Calendar, Calculator, Zap, Shield, Smartphone } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

const Home = () => {
  const plans = [
    { name: "Start", description: "Para corretores autonomos comecando", price: 97, period: "mes", users: 1, leads: 200, imoveis: 50, features: ["Gestao de leads", "Cadastro de imoveis", "Calendario de eventos", "Calculadora financeira", "Relatorios basicos", "Suporte por e-mail"], notIncluded: ["Relatorios avancados", "API", "Multiplas filiais", "Suporte prioritario"], cta: "Comecar teste gratis", popular: false },
    { name: "Pro", description: "Para corretores com alta demanda", price: 147, period: "mes", users: 1, leads: 500, imoveis: 150, features: ["Tudo do Start", "Relatorios avancados", "Exportacao de dados", "Campos personalizados"], notIncluded: ["API", "Multiplas filiais", "Suporte prioritario"], cta: "Comecar teste gratis", popular: false },
    { name: "Profissional", description: "Para imobiliarias pequenas", price: 197, period: "mes", users: 5, leads: 1000, imoveis: 300, features: ["Tudo do Pro", "Ate 5 usuarios", "Gestao de equipe", "Relatorios por corretor"], notIncluded: ["API", "Multiplas filiais"], cta: "Comecar teste gratis", popular: true },
    { name: "Enterprise", description: "Para imobiliarias medias", price: 347, period: "mes", users: 20, leads: 5000, imoveis: 1000, features: ["Tudo do Profissional", "API e Webhooks", "Multiplas filiais", "Suporte prioritario"], notIncluded: [], cta: "Comecar teste gratis", popular: false },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#ffffff", colorScheme: "light" }}>
      <PublicHeader showBack={false} />

      {/* Hero */}
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

      {/* Benefícios */}
      <section className="py-16" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "#0f172a" }}>Por que escolher o CRM R2?</h2>
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

      {/* Planos */}
      <section className="py-16" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: "#0f172a" }}>Planos que cabem no seu bolso</h2>
          <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: "#64748b" }}>Precos acessiveis para voce comecar agora. Teste gratis de 3 dias sem compromisso.</p>

          <div className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto pb-4 items-start">
            {plans.map((plan) => (
              <div key={plan.name} className={`flex-shrink-0 w-[280px] sm:w-[300px] lg:w-auto ${plan.popular ? "pt-4" : ""}`}>
                <div
                  className={`relative flex flex-col h-full rounded-2xl overflow-visible ${
                    plan.popular
                      ? "border-2 border-[#7E22CE] shadow-xl"
                      : "border border-slate-200 shadow-sm"
                  }`}
                  style={{ backgroundColor: "#ffffff" }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <span className="bg-[#7E22CE] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                        Mais popular
                      </span>
                    </div>
                  )}

                  {/* Header do card */}
                  <div className={`p-6 ${plan.popular ? "pt-8" : ""}`}>
                    <h3 className="text-2xl font-bold" style={{ color: "#0f172a" }}>{plan.name}</h3>
                    <p className="text-sm mt-1" style={{ color: "#64748b" }}>{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-3xl font-bold" style={{ color: "#7E22CE" }}>R$ {plan.price}</span>
                      <span className="text-sm ml-1" style={{ color: "#64748b" }}>/{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="px-6 pb-6 flex-1">
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                        <span style={{ color: "#334155" }}><strong>{plan.users}</strong> {plan.users === 1 ? "usuario" : "usuarios"}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                        <span style={{ color: "#334155" }}><strong>{plan.leads}</strong> leads/mes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                        <span style={{ color: "#334155" }}><strong>{plan.imoveis}</strong> imoveis ativos</span>
                      </li>
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                          <span style={{ color: "#334155" }}>{feature}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <X className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#94a3b8" }} />
                          <span className="line-through" style={{ color: "#94a3b8" }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão */}
                  <div className="px-6 pb-6">
                    <Link
                      to="/auth"
                      className="block w-full text-center py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors"
                      style={{
                        backgroundColor: plan.popular ? "#7E22CE" : "#1e293b",
                        color: "#ffffff",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = plan.popular ? "#6b21a8" : "#0f172a")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = plan.popular ? "#7E22CE" : "#1e293b")}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-8" style={{ color: "#64748b" }}>Planos anuais com 20% de desconto (consulte na hora da assinatura)</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: "#0f172a" }}>Perguntas frequentes</h2>
          <div className="space-y-3">
            {[
              { q: "Como funciona o teste gratis?", a: "Voce tem 3 dias para testar todas as funcionalidades. Nao e necessario cartao de credito." },
              { q: "Posso mudar de plano depois?", a: "Sim! Voce pode fazer upgrade a qualquer momento. Downgrades so sao permitidos na renovacao." },
              { q: "Quais formas de pagamento sao aceitas?", a: "Cartao de credito, PIX e boleto bancario (assinaturas anuais)." },
              { q: "Preciso contratar por quanto tempo?", a: "Mensalmente, sem fidelidade. Voce pode cancelar quando quiser." },
            ].map((item, i) => (
              <details key={i} className="rounded-xl border" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
                <summary
                  className="p-4 cursor-pointer font-semibold text-sm select-none"
                  style={{ color: "#0f172a" }}
                >
                  {item.q}
                </summary>
                <p className="px-4 pb-4 text-sm" style={{ color: "#475569" }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
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
  <div className="p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "#f3e8ff", color: "#7E22CE" }}>{icon}</div>
    <h3 className="font-semibold text-lg mb-2" style={{ color: "#1e293b" }}>{title}</h3>
    <p className="text-sm" style={{ color: "#64748b" }}>{text}</p>
  </div>
);

export default Home;