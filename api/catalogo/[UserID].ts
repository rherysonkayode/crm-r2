// api/catalogo/[userId].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;

  // Validação do userId
  if (!userId || typeof userId !== 'string') {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Catálogo não encontrado</title></head>
        <body><h1>Catálogo não encontrado</h1></body>
      </html>
    `);
  }

  // Inicializar Supabase
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  // Buscar informações do corretor
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single();

  // Nome do corretor (fallback)
  const corretorName = profile?.full_name || 'Corretor';
  
  // Imagem para compartilhamento (avatar do corretor ou logo)
  const imageUrl = profile?.avatar_url 
    ? profile.avatar_url 
    : `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://crmr2.com.br'}/logo-r2.svg`;

  // URL completa para o catálogo
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://crmr2.com.br';
  const catalogUrl = `${baseUrl}/#/catalogo/${userId}`;

  // Gerar HTML com meta tags dinâmicas
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <title>Catálogo de ${corretorName} | R2 TECH</title>
        <meta name="description" content="Confira os imóveis disponíveis com ${corretorName}. Encontre o imóvel dos seus sonhos com o catálogo R2 TECH." />
        <meta name="author" content="R2 TECH" />
        <meta name="robots" content="index, follow" />
        
        <!-- Open Graph / Facebook / WhatsApp / LinkedIn -->
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Catálogo de ${corretorName} | R2 TECH" />
        <meta property="og:description" content="Confira os imóveis disponíveis com ${corretorName}. Catálogo completo para você encontrar o imóvel ideal." />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:url" content="${catalogUrl}" />
        <meta property="og:site_name" content="R2 TECH" />
        
        <!-- Twitter Cards -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Catálogo de ${corretorName}" />
        <meta name="twitter:description" content="Confira os imóveis disponíveis com ${corretorName}." />
        <meta name="twitter:image" content="${imageUrl}" />
        
        <link rel="icon" type="image/svg+xml" href="/logo-r2.svg" />
        <link rel="apple-touch-icon" href="/logo-r2.svg" />
        
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #7E22CE, #9333ea);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            padding: 2rem;
            color: white;
          }
          .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 1.5rem;
            background: white;
            border-radius: 20px;
            padding: 10px;
            margin: 0 auto 1.5rem auto;
          }
          h1 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }
          p {
            opacity: 0.9;
            margin-bottom: 1.5rem;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
        
        <!-- Redirecionar para o app React -->
        <script>
          // Redirecionamento para a SPA
          window.location.href = '/#/catalogo/${userId}';
        </script>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="/logo-r2.svg" alt="R2 TECH" style="width: 100%; height: 100%;" />
          </div>
          <h1>Catálogo de ${corretorName}</h1>
          <p>Carregando catálogo de imóveis...</p>
          <div class="spinner"></div>
        </div>
      </body>
    </html>
  `;

  // Configurar headers para cache
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(html);
}