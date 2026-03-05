import PublicHeader from "@/components/PublicHeader";

const Termos = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader showBack backTo="/auth" />
      <div className="flex-1 max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-4">Última atualização: 04 de março de 2026</p>

        <div className="prose prose-slate max-w-none">
          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao acessar ou usar a plataforma CRM R2, você confirma que leu, entendeu e concorda em estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte, não poderá usar nossos serviços.
          </p>

          <h2>2. Descrição do Serviço</h2>
          <p>
            O CRM R2 é uma plataforma em nuvem desenvolvida pela R2 TECH para auxiliar corretores e imobiliárias no gerenciamento de leads, imóveis, negócios, calendário e simulações financeiras. O serviço é fornecido "como está" e pode ser atualizado periodicamente.
          </p>

          <h2>3. Cadastro e Conta</h2>
          <p>
            Para utilizar a plataforma, você deve criar uma conta fornecendo informações verdadeiras, precisas e completas. Você é o único responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrerem em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
          </p>

          <h2>4. Uso Permitido e Restrições</h2>
          <p>
            Você concorda em usar o CRM R2 apenas para fins legais e de acordo com estes Termos. Não é permitido:
          </p>
          <ul>
            <li>Utilizar a plataforma para atividades ilícitas ou fraudulentas;</li>
            <li>Violar direitos de propriedade intelectual;</li>
            <li>Transmitir vírus, malware ou qualquer código malicioso;</li>
            <li>Tentar acessar dados de outros usuários ou áreas não autorizadas do sistema;</li>
            <li>Reproduzir, modificar ou distribuir o software sem autorização.</li>
          </ul>

          <h2>5. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo, design, logotipos, marcas e software do CRM R2 são de propriedade exclusiva da R2 TECH e protegidos por leis de propriedade intelectual. Você recebe uma licença limitada, não exclusiva e intransferível para uso pessoal ou empresarial da plataforma, sem direito de revenda ou cessão.
          </p>

          <h2>6. Dados do Cliente</h2>
          <p>
            Você mantém a propriedade de todos os dados inseridos na plataforma (leads, imóveis, negócios etc.). A R2 TECH atua como operadora desses dados, tratando‑os apenas conforme suas instruções e para fornecer o serviço. Mais detalhes na nossa <a href="/privacidade" className="text-[#7E22CE] hover:underline">Política de Privacidade</a>.
          </p>

          <h2>7. Privacidade e Proteção de Dados</h2>
          <p>
            Nosso compromisso com a privacidade está descrito na Política de Privacidade. Ao usar o CRM R2, você consente com a coleta e uso de suas informações conforme estabelecido naquele documento.
          </p>

          <h2>8. Pagamentos e Assinaturas</h2>
          <p>
            O acesso ao CRM R2 pode ser gratuito ou pago, conforme plano escolhido. Os valores das assinaturas e eventuais renovações serão informados no momento da contratação. Você é responsável pelo pagamento pontual, e a R2 TECH reserva‑se o direito de suspender o serviço em caso de inadimplência.
          </p>

          <h2>9. Cancelamento e Rescisão</h2>
          <p>
            Você pode cancelar sua conta a qualquer momento. A R2 TECH pode suspender ou encerrar seu acesso se houver violação destes Termos. Em caso de rescisão, os dados serão tratados conforme nossa política de retenção (descrita na Política de Privacidade).
          </p>

          <h2>10. Limitação de Responsabilidade</h2>
          <p>
            Em nenhuma hipótese a R2 TECH será responsável por danos indiretos, incidentais ou consequenciais decorrentes do uso ou da impossibilidade de uso da plataforma. Nossa responsabilidade máxima está limitada ao valor pago por você nos últimos 12 meses.
          </p>

          <h2>11. Modificações dos Termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. Notificaremos você sobre alterações significativas por e‑mail ou por aviso na plataforma. O uso continuado após a alteração constitui aceitação dos novos termos.
          </p>

          <h2>12. Lei Aplicável e Foro</h2>
          <p>
            Estes Termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da Comarca de Curitiba – PR, com exclusão de qualquer outro.
          </p>

          <h2>13. Contato</h2>
          <p>
            Em caso de dúvidas, entre em contato conosco pelo e-mail: <a href="mailto:suporte@r2tech.com.br" className="text-[#7E22CE] hover:underline">suporte@r2tech.com.br</a>.
          </p>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600">
              Ao criar uma conta, você declara ter lido e concordado com estes Termos de Uso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Termos;