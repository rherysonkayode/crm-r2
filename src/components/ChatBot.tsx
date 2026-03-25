import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, X, ChevronRight, Bot, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Question = {
  id: string;
  question: string;
  answer: string;
};

const defaultQuestions: Question[] = [
  {
    id: "teste",
    question: "Como funciona o teste grátis?",
    answer: "Você tem 3 dias para testar todas as funcionalidades. Não pedimos cartão de crédito. Após o período, o acesso é bloqueado até a assinatura."
  },
  {
    id: "planos",
    question: "Quais são os planos e preços?",
    answer: "Temos planos a partir de R$ 97/mês para corretores individuais e até R$ 347/mês para imobiliárias. Você pode ver todos os detalhes na seção de Planos da home."
  },
  {
    id: "pagamento",
    question: "Quais as formas de pagamento?",
    answer: "Aceitamos cartão de crédito (parcelado ou à vista), PIX e boleto bancário (assinaturas anuais)."
  },
  {
    id: "cancelar",
    question: "Posso cancelar quando quiser?",
    answer: "Sim! Não há fidelidade. Você pode cancelar a qualquer momento diretamente na área de configurações."
  },
  {
    id: "suporte",
    question: "Como entro em contato com o suporte?",
    answer: "Você pode enviar um e-mail para suporte@r2tech.com.br ou usar este chat (em breve, atendimento humano)."
  }
];

// Perguntas específicas para o catálogo de imóveis
const catalogoQuestions: Question[] = [
  {
    id: "catalogo_imoveis",
    question: "Quais imóveis estão disponíveis?",
    answer: "No catálogo acima você encontra todos os imóveis disponíveis. Use os filtros para refinar sua busca por tipo, preço ou localização."
  },
  {
    id: "catalogo_contato",
    question: "Como entro em contato com o corretor?",
    answer: "Você pode clicar no botão 'WhatsApp' no cabeçalho ou em qualquer imóvel para falar diretamente com o corretor responsável."
  },
  {
    id: "catalogo_visita",
    question: "Como agendar uma visita?",
    answer: "Clique no imóvel de interesse, preencha o formulário com seus dados ou clique em 'Falar no WhatsApp' para agendar uma visita diretamente com o corretor."
  },
  {
    id: "catalogo_financiamento",
    question: "Posso financiar?",
    answer: "Sim! Temos calculadora de financiamento que simula as melhores opções de bancos. O corretor pode te ajudar com a simulação personalizada."
  },
  {
    id: "catalogo_documentos",
    question: "Quais documentos preciso para comprar?",
    answer: "Para compra à vista: RG, CPF e comprovante de renda. Para financiamento: os mesmos documentos + comprovante de residência e extrato bancário."
  }
];

const ChatBot = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [corretorInfo, setCorretorInfo] = useState<{ nome: string; phone: string } | null>(null);
  const [isCatalogoPage, setIsCatalogoPage] = useState(false);
  const [catalogoUserId, setCatalogoUserId] = useState<string | null>(null);

  // Detectar se está na página de catálogo e obter informações do corretor
  useEffect(() => {
    const isCatalogo = location.pathname.startsWith("/catalogo/");
    setIsCatalogoPage(isCatalogo);

    if (isCatalogo) {
      const userId = location.pathname.split("/catalogo/")[1];
      setCatalogoUserId(userId);
      
      // Buscar informações do corretor para personalizar o chat
      const fetchCorretor = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, phone, telefone")
          .eq("id", userId)
          .single();
        
        if (data) {
          setCorretorInfo({
            nome: data.full_name,
            phone: data.phone || data.telefone
          });
        }
      };
      fetchCorretor();
    } else {
      setCorretorInfo(null);
    }
  }, [location.pathname]);

  // Selecionar as perguntas baseado na página
  const currentQuestions = isCatalogoPage ? catalogoQuestions : defaultQuestions;
  
  // Número do WhatsApp: se estiver no catálogo, usa o do corretor; senão, o da R2
  const whatsappNumber = isCatalogoPage && corretorInfo?.phone 
    ? corretorInfo.phone.replace(/\D/g, "")
    : "5521973721654";
  
  const whatsappMessage = isCatalogoPage
    ? encodeURIComponent(`Olá ${corretorInfo?.nome || "corretor"}! Vim pelo seu catálogo de imóveis e gostaria de mais informações.`)
    : encodeURIComponent("Olá! Vim pelo CRM R2 e gostaria de tirar uma dúvida.");

  // Não exibir na página pública de imóvel (mas exibir no catálogo)
  if (location.pathname.startsWith("/imovel/")) return null;

  const handleBack = () => setSelectedQuestion(null);

  // Mensagem de boas-vindas personalizada para o catálogo
  const getWelcomeMessage = () => {
    if (isCatalogoPage && corretorInfo) {
      return `Olá! Eu sou o <strong>Hermes</strong> da <strong>R2 TECH</strong>. 🚀<br /><br />Bem-vindo ao catálogo de <strong>${corretorInfo.nome}</strong>! Posso ajudar com informações sobre os imóveis, financiamento ou como entrar em contato.`;
    }
    return `Olá! Eu sou o <strong>Hermes</strong> da <strong>R2 TECH</strong>. 🚀<br />Como posso ajudar?`;
  };

  return (
    <>
      {/* Botões flutuantes */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-center gap-3">

        {/* WhatsApp */}
        <a
          href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white p-3 sm:p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
          title={isCatalogoPage ? "Falar com o corretor" : "Fale direto pelo WhatsApp"}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </a>

        {/* Hermes */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#7E22CE] text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
        >
          {isCatalogoPage ? <Home className="w-[22px] h-[22px]" /> : <MessageCircle className="w-[22px] h-[22px]" />}
        </button>
      </div>

      {/* Janela do chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-[7rem] right-4 sm:right-6 z-50 w-[min(320px,calc(100vw-2rem))]"
          >
            <Card className="border border-slate-200 shadow-2xl overflow-hidden rounded-2xl">
              {/* Header */}
              <div className="bg-[#7E22CE] text-white px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1 rounded-lg">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-sm">Hermes</span>
                    <span className="text-[10px] opacity-80">
                      {isCatalogoPage ? "Assistente do Catálogo" : "R2 TECH Assistente"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-md transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo */}
              <CardContent className="p-3 max-h-[52vh] overflow-y-auto bg-white">
                {selectedQuestion ? (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                    <button
                      onClick={handleBack}
                      className="text-xs font-semibold text-[#7E22CE] mb-3 flex items-center gap-1 hover:underline"
                    >
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Voltar
                    </button>
                    <div className="bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100">
                      <h3 className="font-bold text-slate-800 text-sm mb-1.5">{selectedQuestion.question}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{selectedQuestion.answer}</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100">
                      <p className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: getWelcomeMessage() }} />
                      {isCatalogoPage && corretorInfo && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                          📞 <strong>{corretorInfo.nome}</strong> está disponível para atendimento.
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {currentQuestions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => setSelectedQuestion(q)}
                          className="w-full text-left p-2.5 rounded-xl border border-slate-100 bg-white hover:border-purple-200 hover:bg-purple-50 transition-all text-sm text-slate-700 font-medium group flex justify-between items-center gap-2"
                        >
                          <span className="text-xs leading-snug">{q.question}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-400 shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-semibold">
                        Hermes • R2 TECH
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;