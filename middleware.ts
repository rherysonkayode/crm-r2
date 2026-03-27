// middleware.ts — raiz do projeto
// Vercel Edge Middleware — sem next/server, sem Next.js

export const config = {
  matcher: ["/catalogo/:path*", "/imovel/:path*"],
};

const CRAWLERS = [
  "whatsapp", "telegram", "facebookexternalhit", "twitterbot",
  "linkedinbot", "slackbot", "discordbot", "googlebot", "applebot",
];

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const ua  = request.headers.get("user-agent") || "";

  const catalogoMatch = url.pathname.match(/^\/catalogo\/([^/]+)$/);
  const imovelMatch   = url.pathname.match(/^\/imovel\/([^/]+)$/);

  // Browser normal — não faz nada, Vercel serve o index.html do Vite
  if (!CRAWLERS.some(c => ua.toLowerCase().includes(c))) {
    return;
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ecmahlxwttfeatvpxwng.supabase.co";
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbWFobHh3dHRmZWF0dnB4d25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTM0NzEsImV4cCI6MjA4Nzc4OTQ3MX0.6IOZBNvnLVB8xnQ81xP8QRZsSvUAH4fo6oRuYQ5Fxc8";
  const APP_URL      = "https://crm-r2.vercel.app";

  let title = "R2 TECH - Imóveis";
  let desc  = "Catálogo de imóveis R2 TECH";
  let image = `${APP_URL}/logo-r2.svg`;

  try {
    if (catalogoMatch) {
      const [p] = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${catalogoMatch[1]}&select=full_name,avatar_url,role`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      ).then(r => r.json());

      if (p) {
        title = `Catálogo de ${p.full_name} | R2 TECH`;
        desc  = `${p.full_name} · ${p.role === "imobiliaria" ? "Imobiliária" : "Corretor"} · Veja os imóveis disponíveis`;
        if (p.avatar_url) image = p.avatar_url;
      }
    }

    if (imovelMatch) {
      const [p] = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?id=eq.${imovelMatch[1]}&select=title,price,city,neighborhood`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      ).then(r => r.json());

      if (p) {
        const preco = p.price
          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.price))
          : "Consulte";
        title = `${p.title} | R2 TECH`;
        desc  = `${[p.neighborhood, p.city].filter(Boolean).join(", ")} · ${preco}`;

        const [img] = await fetch(
          `${SUPABASE_URL}/rest/v1/property_images?property_id=eq.${imovelMatch[1]}&select=url&order=position&limit=1`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        ).then(r => r.json());
        if (img?.url) image = img.url;
      }
    }
  } catch (_) { /* usa meta tags padrão */ }

  const pageUrl = `${APP_URL}${url.pathname}`;

  return new Response(
    `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="R2 TECH">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
</head><body>
<script>window.location.replace("${APP_URL}/#${url.pathname}")</script>
</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}