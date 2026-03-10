import { useState } from "react";
import { Link } from "react-router-dom";
import PublicHeader from "@/components/PublicHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Mail, HelpCircle, Users, CreditCard, Smartphone, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const categories = [
    {
      id: "geral",
      icon: HelpCircle,
      title: "Sobre o CRM R2",
      questions: [
        {
          q: "O que é o CRM R2?",
          a: "O CRM R2 é uma plataforma desenvolvida pela R2 TECH para corretores e imobiliárias, oferecendo ferramentas de gestão de leads, imóveis, negócios, calendário e simulações financeiras, tudo em um só lugar."
        },
        {
          q: "Preciso ter conhecimentos técnicos para usar?",
          a: "Não! O CRM R2 foi desenvolvido para ser intuitivo. Você consegue gerenciar seus leads, imóveis e negócios sem qualquer conhecimento técnico. Nossa interface é simples e contamos com tutoriais e suporte."
        },
        {
          q: "Posso usar em qualquer dispositivo?",
          a: "Sim! O CRM R2 é totalmente responsivo e pode ser acessado de qualquer computador, tablet ou smartphone com conexão à internet."
        }
      ]
    },
    {
      id: "planos",
      icon: CreditCard,
      title: "Planos e Pagamentos",
      questions: [
        {
          q: "Quais são os planos disponíveis?",
          a: "Temos planos para corretores individuais e imobiliárias. Em breve você poderá conferir todos os detalhes na nossa página de Planos."
        },
        {
          q: "Como funciona o teste grátis?",
          a: "Oferecemos um período de teste gratuito de 14 dias para que você possa experimentar todas as funcionalidades do CRM R2 sem compromisso. Não é necessário cadastrar cartão de crédito."
        },
        {
          q: "Quais as formas de pagamento?",
          a: "Aceitamos cartões de crédito (à vista ou parcelado), PIX e boleto bancário. As assinaturas são gerenciadas por plataformas seguras como Stripe e Asaas."
        },
        {
          q: "Posso cancelar minha assinatura a qualquer momento?",
          a: "Sim! Você pode cancelar quando quiser diretamente na área de configurações da sua conta. O acesso permanecerá ativo até o final do período já pago."
        }
      ]
    },
    {
      id: "funcionalidades",
      icon: Settings,
      title: "Funcionalidades",
      questions: [
        {
          q: "Como faço para adicionar um novo lead?",
          a: "Na aba 'Leads', clique no botão '+ Novo Lead' e preencha as informações. Você pode categorizar por status e atribuir a um corretor."
        },
        {
          q: "O CRM R2 permite múltiplas fotos para um imóvel?",
          a: "Sim! Na edição de um imóvel, você pode adicionar quantas fotos quiser, com visualização em carrossel e possibilidade de reordenar as imagens."
        },
        {
          q: "Como funciona o funil de vendas?",
          a: "O funil de vendas (Kanban) permite arrastar os negócios entre as etapas (Novo, Contato, Proposta, Fechado, Perdido). Você também pode configurar repartição de comissões ao fechar um negócio."
        },
        {
          q: "A calculadora de financiamento é precisa?",
          a: "Utilizamos as taxas e regras atualizadas dos principais bancos (Caixa, Bradesco, Itaú, Santander, BB, Inter) para fornecer simulações próximas da realidade. Incluímos modos de simulação por valor, parcela e renda."
        }
      ]
    },
    {
      id: "equipe",
      icon: Users,
      title: "Equipe e Convites",
      questions: [
        {
          q: "Como adiciono um corretor à minha imobiliária?",
          a: "Como administrador, vá na aba 'Equipe' e clique em 'Convidar'. Você pode enviar convites por e‑mail ou gerar um link para o corretor se autocadastrar. Após o cadastro, ele fica inativo até você ativar."
        },
        {
          q: "Posso cadastrar um corretor manualmente?",
          a: "Sim! Ainda na aba 'Equipe', use o botão 'Cadastrar manualmente' e preencha os dados (nome, e‑mail, CPF, CRECI, etc.). O corretor receberá um e‑mail para definir a senha."
        },
        {
          q: "Como dividir comissões entre corretores?",
          a: "Ao fechar um negócio, você pode acessar os detalhes e clicar em 'Editar repartição'. Lá pode adicionar quantos corretores quiser, informando o percentual de cada um. O sistema calcula automaticamente os valores."
        }
      ]
    },
    {
      id: "suporte",
      icon: Mail,
      title: "Suporte e Contato",
      questions: [
        {
          q: "Como entro em contato com o suporte?",
          a: "Você pode enviar um e‑mail para suporte@r2tech.com.br ou utilizar o chat disponível no canto inferior direito da plataforma. Nosso horário de atendimento é de segunda a sexta, das 9h às 18h."
        },
        {
          q: "Onde encontro tutoriais e documentação?",
          a: "Estamos desenvolvendo uma central de ajuda completa. Enquanto isso, você pode conferir nossos vídeos no YouTube e artigos no blog da R2 TECH."
        },
        {
          q: "Como reportar um bug ou sugerir melhoria?",
          a: "Ficaremos felizes em ouvir você! Envie um e‑mail para feedback@r2tech.com.br ou utilize o chat de suporte. Toda sugestão é bem‑vinda."
        }
      ]
    }
  ];

  const toggleItem = (categoryId: string, questionIndex: number) => {
    const key = `${categoryId}-${questionIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredCategories = categories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
           q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader showBack backTo="/auth" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 max-w-4xl mx-auto py-8 px-4 sm:px-6 w-full">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Perguntas Frequentes</h1>

        {/* Busca */}
        <div className="max-w-xl mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-6 text-base rounded-full border-slate-200 focus:border-[#7E22CE] focus:ring-[#7E22CE]/20"
          />
        </div>

        {/* Categorias */}
        <div className="grid gap-8">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.id} className="border border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#7E22CE]/10">
                        <Icon className="w-5 h-5 text-[#7E22CE]" />
                      </div>
                      <CardTitle className="text-xl">{category.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 divide-y divide-slate-100">
                    {category.questions.map((item, idx) => {
                      const key = `${category.id}-${idx}`;
                      const isOpen = openItems[key];
                      return (
                        <div key={idx} className="py-4 first:pt-0 last:pb-0">
                          <button
                            onClick={() => toggleItem(category.id, idx)}
                            className="w-full flex items-start justify-between gap-4 text-left focus:outline-none"
                          >
                            <span className="font-medium text-slate-800 text-base flex-1">
                              {item.q}
                            </span>
                            <span className="mt-1 text-[#7E22CE] shrink-0">
                              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </span>
                          </button>
                          <div
                            className={cn(
                              "mt-2 text-slate-600 text-sm leading-relaxed overflow-hidden transition-all duration-300",
                              isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                            )}
                          >
                            <p>{item.a}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-lg">Nenhuma pergunta encontrada para "{searchTerm}"</p>
              <Button variant="link" className="text-[#7E22CE] mt-2" onClick={() => setSearchTerm("")}>
                Limpar busca
              </Button>
            </div>
          )}
        </div>

        {/* Contato adicional */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mt-8">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Ainda tem dúvidas?</h3>
          <p className="text-slate-500 mb-4">Nossa equipe está pronta para ajudar você.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" className="gap-2">
              <a href="mailto:suporte@r2tech.com.br">
                <Mail className="w-4 h-4" />
                Enviar e‑mail
              </a>
            </Button>
            <Button asChild className="bg-[#7E22CE] hover:bg-[#6b21a8] gap-2">
              <a href="https://wa.me/5521999999999" target="_blank" rel="noopener noreferrer">
                <Smartphone className="w-4 h-4" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FAQ;