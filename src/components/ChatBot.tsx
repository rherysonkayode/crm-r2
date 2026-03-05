import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, X, ChevronRight } from "lucide-react";
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
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96"
          >
            <Card className="border border-slate-200 shadow-xl">
              {/* Cabeçalho */}
              <div className="bg-[#7E22CE] text-white p-4 rounded-t-lg flex justify-between items-center">
                <span className="font-semibold">Dúvidas? Pergunte aqui!</span>
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

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