// api/catalogo/[userId].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const CRAWLERS = [
  "whatsapp", "telegram", "facebookexternalhit", "twitterbot",
  "linkedinbot", "slackbot", "discordbot", "googlebot", "applebot",
];

const APP_URL      = "https://crm-r2.vercel.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extrair userId diretamente da URL — mais confiável que req.query
  const userId = (req.query.userId as string)
    || req.url?.split("/catalogo/")?.[1]?.split("?")?.[0]
    || "";

  console.log("[catalogo] userId:", userId, "url:", req.url);

  const ua        = (req.headers["user-agent"] || "").toLowerCase();
  const isCrawler = CRAWLERS.some(c => ua.includes(c));

  // Browser normal → redirect para o app com hash
  if (!isCrawler) {
    return res
      .setHeader("Location", `${APP_URL}/#/catalogo/${userId}`)
      .status(302)
      .end();
  }

  // Crawler → retornar HTML com OG tags
  let title = "R2 TECH - Imóveis";
  let desc  = "Catálogo de imóveis R2 TECH";
  let image = `${APP_URL}/logo-r2.svg`;

  try {
    if (userId) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=full_name,avatar_url,role`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await r.json();
      const p = Array.isArray(data) ? data[0] : null;
      if (p) {
        const role = p.role === "imobiliaria" ? "Imobiliária" : "Corretor de Imóveis";
        title = `Catálogo de ${p.full_name} | R2 TECH`;
        desc  = `${p.full_name} · ${role} · Veja os imóveis disponíveis`;
        if (p.avatar_url) image = p.avatar_url;
      }
    }
  } catch (e) {
    console.error("[catalogo] Erro:", e);
  }

  const pageUrl = `${APP_URL}/catalogo/${userId}`;

  return res
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .status(200)
    .send(`<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="R2 TECH">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
</head><body>
<script>window.location.replace("${APP_URL}/#/catalogo/${userId}")</script>
</body></html>`);
}