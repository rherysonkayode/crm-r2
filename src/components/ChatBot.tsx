import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
<<<<<<< HEAD
import { MessageCircle, X, ChevronRight, Bot } from "lucide-react"; 
=======
import { MessageCircle, X, ChevronRight } from "lucide-react";
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
import { motion, AnimatePresence } from "framer-motion";

type Question = {
  id: string;
  question: string;
  answer: string;
};

const questions: Question[] = [
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

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleBack = () => setSelectedQuestion(null);

<<<<<<< HEAD
  // COLOQUE SEU NÚMERO AQUI (Apenas números, com DDD)
  const whatsappNumber = "5521973721654"; 
  const whatsappMessage = encodeURIComponent("Olá! Vim pelo CRM R2 e gostaria de tirar uma dúvida.");

  return (
    <>
      {/* Container de botões flutuantes */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        
        {/* Botão do WhatsApp (VERDE) */}
        <a
          href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
          title="Fale direto pelo WhatsApp"
        >
          {/* Ícone simples de telefone/msg para representar o zap */}
          <svg 
            viewBox="0 0 24 24" 
            width="24" 
            height="24" 
            stroke="currentColor" 
            strokeWidth="2" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </a>

        {/* Botão do Hermes (ROXO) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#7E22CE] text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Janela do chat */}
=======
  return (
    <>
      {/* Botão flutuante - agora na DIREITA */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-[#7E22CE] text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Janela do chat - também alinhada à direita */}
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96"
          >
<<<<<<< HEAD
            <Card className="border border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-[#7E22CE] text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm leading-none">Hermes</span>
                    <span className="text-[10px] opacity-80">R2 TECH Assistente</span>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-md transition-colors">
=======
            <Card className="border border-slate-200 shadow-xl">
              {/* Cabeçalho */}
              <div className="bg-[#7E22CE] text-white p-4 rounded-t-lg flex justify-between items-center">
                <span className="font-semibold">Dúvidas? Pergunte aqui!</span>
                <button onClick={() => setIsOpen(false)}>
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
                  <X className="w-5 h-5" />
                </button>
              </div>

<<<<<<< HEAD
              <CardContent className="p-4 max-h-96 overflow-y-auto">
                {selectedQuestion ? (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                    <button
                      onClick={handleBack}
                      className="text-xs font-semibold text-[#7E22CE] mb-3 flex items-center gap-1 hover:underline"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
                    </button>
                    <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                      <h3 className="font-bold text-slate-800 text-sm mb-2">{selectedQuestion.question}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{selectedQuestion.answer}</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                      <p className="text-sm text-slate-700">
                        Olá! Eu sou o <strong>Hermes</strong>, seu assistente da <strong>R2 TECH</strong>. 🚀
                        <br /><br />
                        Como posso facilitar o seu trabalho hoje? Escolha uma opção abaixo:
                      </p>
                    </div>

                    <div className="space-y-2">
                      {questions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => setSelectedQuestion(q)}
                          className="w-full text-left p-3 rounded-xl border border-slate-100 bg-white hover:border-purple-200 hover:bg-purple-50 transition-all text-sm text-slate-700 font-medium group flex justify-between items-center"
                        >
                          {q.question}
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-400 transition-colors" />
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-semibold">
                        Hermes • Suporte Inteligente R2 TECH
=======
              {/* Corpo */}
              <CardContent className="p-4 max-h-96 overflow-y-auto">
                {selectedQuestion ? (
                  <div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-[#7E22CE] mb-3 flex items-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
                    </button>
                    <h3 className="font-semibold text-slate-800 mb-2">{selectedQuestion.question}</h3>
                    <p className="text-sm text-slate-600">{selectedQuestion.answer}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 mb-2">Selecione uma opção:</p>
                    {questions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuestion(q)}
                        className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-slate-700"
                      >
                        {q.question}
                      </button>
                    ))}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 text-center">
                        Atendimento humano em breve. Enquanto isso, use nosso FAQ.
>>>>>>> 8ef6bb3c4fb2f51adebc971ac1d20716470d4b07
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