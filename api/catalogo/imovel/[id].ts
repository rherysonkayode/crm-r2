// api/imovel/[id].ts
// Vercel Serverless Function — intercepta /imovel/:id

import type { VercelRequest, VercelResponse } from "@vercel/node";

const CRAWLERS = [
  "whatsapp", "telegram", "facebookexternalhit", "twitterbot",
  "linkedinbot", "slackbot", "discordbot", "googlebot", "applebot",
];

const APP_URL      = "https://crm-r2.vercel.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id     = req.query.id as string;
  const ua     = (req.headers["user-agent"] || "").toLowerCase();
  const isCrawler = CRAWLERS.some(c => ua.includes(c));

  if (!isCrawler) {
    return res.redirect(302, `${APP_URL}/#/imovel/${id}`);
  }

  let title = "Imóvel | R2 TECH";
  let desc  = "Veja os detalhes deste imóvel";
  let image = `${APP_URL}/logo-r2.svg`;

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${id}&select=title,price,city,neighborhood`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const [p] = await r.json();
    if (p) {
      const preco = p.price
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.price))
        : "Consulte";
      title = `${p.title} | R2 TECH`;
      desc  = `${[p.neighborhood, p.city].filter(Boolean).join(", ")} · ${preco}`;

      const ir = await fetch(
        `${SUPABASE_URL}/rest/v1/property_images?property_id=eq.${id}&select=url&order=position&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const [img] = await ir.json();
      if (img?.url) image = img.url;
    }
  } catch (_) { /* usa padrão */ }

  const pageUrl = `${APP_URL}/imovel/${id}`;

  return res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
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
<script>window.location.replace("${APP_URL}/#/imovel/${id}")</script>
</body></html>`);
}