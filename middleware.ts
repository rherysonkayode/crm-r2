// middleware.ts — raiz do projeto
// Intercepta /catalogo/:id e /imovel/:id ANTES do React carregar
// Retorna HTML com OG tags para crawlers (WhatsApp, Telegram, etc.)
// Para browsers normais, serve o index.html normalmente

import { NextRequest, NextResponse } from "next/server";

const CRAWLERS = [
  "whatsapp", "telegram", "facebookexternalhit", "twitterbot",
  "linkedinbot", "slackbot", "discordbot", "googlebot", "applebot",
];

function isCrawler(ua: string) {
  const lower = ua.toLowerCase();
  return CRAWLERS.some(c => lower.includes(c));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent") || "";

  const catalogoMatch = pathname.match(/^\/catalogo\/([^/]+)$/);
  const imovelMatch   = pathname.match(/^\/imovel\/([^/]+)$/);

  if (!catalogoMatch && !imovelMatch) return NextResponse.next();
  if (!isCrawler(ua)) return NextResponse.next();

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ecmahlxwttfeatvpxwng.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbWFobHh3dHRmZWF0dnB4d25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTM0NzEsImV4cCI6MjA4Nzc4OTQ3MX0.6IOZBNvnLVB8xnQ81xP8QRZsSvUAH4fo6oRuYQ5Fxc8";
  const appUrl      = "https://crm-r2.vercel.app";

  try {
    let title = "R2 TECH - Imóveis";
    let desc  = "Catálogo de imóveis R2 TECH";
    let image = `${appUrl}/logo-r2.svg`;

    if (catalogoMatch) {
      const userId = catalogoMatch[1];
      const r = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=full_name,avatar_url,role`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const [p] = await r.json().catch(() => [null]);
      if (p) {
        title = `Catálogo de ${p.full_name} | R2 TECH`;
        desc  = `${p.full_name} · ${p.role === "imobiliaria" ? "Imobiliária" : "Corretor"} · Veja os imóveis disponíveis`;
        if (p.avatar_url) image = p.avatar_url;
      }
    }

    if (imovelMatch) {
      const propId = imovelMatch[1];
      const r = await fetch(
        `${supabaseUrl}/rest/v1/properties?id=eq.${propId}&select=title,price,city,neighborhood`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const [p] = await r.json().catch(() => [null]);
      if (p) {
        const preco = p.price
          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.price))
          : "Consulte";
        title = `${p.title} | R2 TECH`;
        desc  = `${[p.neighborhood, p.city].filter(Boolean).join(", ")} · ${preco}`;
        const ir = await fetch(
          `${supabaseUrl}/rest/v1/property_images?property_id=eq.${propId}&select=url&order=position&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        const [img] = await ir.json().catch(() => [null]);
        if (img?.url) image = img.url;
      }
    }

    // URL canônica SEM hash — o middleware roda antes do React
    const pageUrl = `${appUrl}${pathname}`;

    return new NextResponse(`<!DOCTYPE html>
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
<script>window.location.replace("${appUrl}/#${pathname}")</script>
</body></html>`, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

  } catch (e) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/catalogo/:path*", "/imovel/:path*"],
};