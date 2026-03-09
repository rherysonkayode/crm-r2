import PublicHeader from "@/components/PublicHeader";

const Privacidade = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader showBack backTo="/auth" />
      <div className="flex-1 max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-4">Última atualização: 04 de março de 2026</p>

        <div className="prose prose-slate max-w-none">
          <h2>1. Quem somos</h2>
          <p>
            A R2 TECH é uma empresa especializada em soluções tecnológicas para o mercado imobiliário. Esta Política de Privacidade explica como coletamos, usamos, compartilhamos e protegemos seus dados pessoais quando você utiliza a plataforma CRM R2.
          </p>

          <h2>2. Definições importantes</h2>
          <ul>
            <li><strong>Dados Pessoais:</strong> qualquer informação relacionada a uma pessoa natural identificada ou identificável.</li>
            <li><strong>Tratamento:</strong> toda operação realizada com dados pessoais, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, avaliação ou controle da informação, modificação, comunicação, transferência, difusão ou extração.</li>
            <li><strong>Titular:</strong> você, pessoa física a quem se referem os dados pessoais.</li>
            <li><strong>Controlador:</strong> a R2 TECH, responsável por decisões sobre o tratamento de dados pessoais.</li>
            <li><strong>Operador:</strong> pessoa natural ou jurídica que realiza o tratamento em nome do controlador.</li>
          </ul>

          <h2>3. Dados que coletamos</h2>
          <p>Podemos coletar os seguintes dados pessoais:</p>
          <ul>
            <li><strong>Cadastro:</strong> nome completo, e‑mail, telefone, CPF, data de nascimento, senha.</li>
            <li><strong>Perfil profissional:</strong> tipo de conta (corretor/imobiliária), nome da empresa, área de atuação (residencial, comercial, rural).</li>
            <li><strong>Dados de uso:</strong> informações sobre como você utiliza a plataforma, como logs de acesso, funcionalidades mais usadas, endereço IP, tipo de navegador.</li>
            <li><strong>Dados inseridos:</strong> leads, imóveis, negócios, eventos de calendário, simulações financeiras. Esses dados são de sua titularidade e você os controla.</li>
          </ul>

          <h2>4. Finalidades do tratamento</h2>
          <p>Utilizamos seus dados para:</p>
          <ul>
            <li>Fornecer, manter e aprimorar os serviços do CRM R2;</li>
            <li>Criar e gerenciar sua conta;</li>
            <li>Enviar comunicações relacionadas ao serviço (ex.: confirmação de cadastro, alertas, novidades);</li>
            <li>Personalizar sua experiência;</li>
            <li>Analisar o uso da plataforma para melhorias técnicas e de negócio;</li>
            <li>Cumprir obrigações legais e regulatórias;</li>
            <li>Prevenir fraudes e garantir a segurança.</li>
          </ul>

          <h2>5. Compartilhamento de dados</h2>
          <p>
            Seus dados pessoais podem ser compartilhados com:
          </p>
          <ul>
            <li><strong>Provedores de serviços:</strong> empresas que nos auxiliam na operação da plataforma (hospedagem, processamento de pagamentos, suporte técnico). Estes parceiros são contratualmente obrigados a proteger seus dados.</li>
            <li><strong>Autoridades legais:</strong> quando exigido por lei, ordem judicial ou para proteção de direitos.</li>
            <li><strong>Em caso de transferência de negócio:</strong> fusão, aquisição ou venda de ativos.</li>
          </ul>
          <p>Não vendemos seus dados pessoais a terceiros.</p>

          <h2>6. Transferência internacional de dados</h2>
          <p>
            Seus dados podem ser transferidos para servidores localizados nos Estados Unidos, onde utilizamos medidas de segurança adequadas (como cláusulas‑padrão contratuais) para garantir a proteção, em conformidade com a LGPD.
          </p>

          <h2>7. Segurança da informação</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, destruição, perda ou alteração. Isso inclui criptografia em trânsito (SSL/TLS) e em repouso, controle de acesso, monitoramento e backups regulares.
          </p>

          <h2>8. Seus direitos (LGPD)</h2>
          <p>Você tem direito a:</p>
          <ul>
            <li>Confirmar a existência de tratamento;</li>
            <li>Acessar seus dados;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimizar, bloquear ou eliminar dados desnecessários ou excessivos;</li>
            <li>Portabilidade dos dados a outro fornecedor, mediante requisição;</li>
            <li>Eliminar dados tratados com consentimento;</li>
            <li>Informação sobre entidades públicas ou privadas com as quais compartilhamos dados;</li>
            <li>Informação sobre a possibilidade de não fornecer consentimento e consequências;</li>
            <li>Revogar o consentimento a qualquer momento.</li>
          </ul>
          <p>Para exercer seus direitos, entre em contato pelo e-mail <a href="mailto:privacidade@r2tech.com.br" className="text-[#7E22CE] hover:underline">privacidade@r2tech.com.br</a>.</p>

          <h2>9. Retenção de dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento, os dados são mantidos por até 180 dias para cumprimento de obrigações legais, sendo então excluídos de forma segura.
          </p>

          <h2>10. Cookies e tecnologias semelhantes</h2>
          <p>
            Utilizamos cookies para melhorar a experiência, autenticar usuários e analisar tráfego. Você pode gerenciar as preferências de cookies nas configurações do seu navegador.
          </p>

          <h2>11. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta Política periodicamente. Notificaremos você sobre mudanças significativas por e‑mail ou aviso na plataforma. Recomendamos revisá‑la regularmente.
          </p>

          <h2>12. Dúvidas e contato</h2>
          <p>
            Se tiver perguntas sobre esta Política ou sobre o tratamento de seus dados, entre em contato com nosso Encarregado de Proteção de Dados (DPO):
          </p>
          <ul>
            <li>E-mail: <a href="mailto:dpo@r2tech.com.br" className="text-[#7E22CE] hover:underline">dpo@r2tech.com.br</a></li>
            <li>Endereço: Rua Exemplo, 123 – Curitiba/PR – Brasil</li>
          </ul>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600">
              Ao criar uma conta, você concorda com a coleta e uso de seus dados conforme descrito nesta Política de Privacidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacidade;