import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, BedDouble, Maximize, Phone, Search,
  Building2, ChevronRight, MessageCircle, Filter, X,
  DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Share2, Download, CheckCircle2, Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoR2 from "/logo-r2.svg";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FinancingSimulator } from "@/components/FinancingSimulator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapComponent } from "@/components/ui/map/MapComponent";
import { MapControls } from "@/components/ui/map/MapControls";
import { useMapData } from "@/hooks/useMapData";

const typeLabels: Record<string, string> = {
  apartamento: "Apartamento", casa: "Casa", terreno: "Terreno",
  comercial: "Comercial", rural: "Rural", cobertura: "Cobertura",
};
const statusColors: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  reservado:  "bg-amber-100 text-amber-700",
  vendido:    "bg-purple-100 text-purple-700",
  alugado:    "bg-blue-100 text-blue-700",
};
const statusLabels: Record<string, string> = {
  disponivel: "Disponível", reservado: "Reservado",
  vendido: "Vendido", alugado: "Alugado",
};
const formatCurrency = (val: number | null) =>
  val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "Consulte";

const sortOptions = [
  { value: "recent",       label: "Mais recentes", icon: ArrowUpDown },
  { value: "price_asc",    label: "Menor preço",   icon: ArrowUp    },
  { value: "price_desc",   label: "Maior preço",   icon: ArrowDown  },
  { value: "area_desc",    label: "Maior área",    icon: Maximize   },
  { value: "bedrooms_desc",label: "Mais quartos",  icon: BedDouble  },
];
const bedroomOptions = [
  { value: "any", label: "Qualquer", min: 0 },
  { value: "1+",  label: "1+ quarto",  min: 1 },
  { value: "2+",  label: "2+ quartos", min: 2 },
  { value: "3+",  label: "3+ quartos", min: 3 },
  { value: "4+",  label: "4+ quartos", min: 4 },
];
const checklistData = [
  { title: "💰 Análise Financeira", items: ["Verifique seu score de crédito","Calcule sua capacidade de pagamento (parcela máx. 30% da renda)","Separe a documentação: RG, CPF, comprovante de renda e residência","Simule financiamento em diferentes bancos (use nossa calculadora!)","Verifique se tem FGTS disponível para entrada ou amortização"] },
  { title: "🏠 Pesquisa do Imóvel", items: ["Defina prioridades: localização, tamanho, número de quartos","Pesquise valores de imóveis similares na região","Visite o imóvel em diferentes horários do dia","Converse com vizinhos sobre segurança e infraestrutura","Verifique a documentação do imóvel (matrícula atualizada)"] },
  { title: "📋 Documentação e Vistoria", items: ["Solicite certidões negativas (federal, estadual, municipal)","Verifique se há débitos de IPTU, condomínio ou contas","Contrate um engenheiro para vistoria (se for usado)","Confirme se o imóvel está regular no cartório","Verifique se há ações judiciais contra o imóvel"] },
  { title: "🏦 Financiamento e Negociação", items: ["Compare taxas de juros entre bancos","Negocie o valor do imóvel com o vendedor","Calcule ITBI, cartório e taxas de registro","Simule diferentes prazos de financiamento","Verifique se há linhas especiais como MCMV ou Pró-Cotista"] },
  { title: "✅ Assinatura e Pós-Compra", items: ["Leia atentamente o contrato de compra e venda","Verifique se todas as pendências foram resolvidas","Registre a escritura no cartório","Atualize o IPTU e contas de serviços para seu nome","Planeje a mudança e manutenções necessárias"] },
];

const APP_URL = "https://crm-r2.vercel.app";

const CatalogoPublico = () => {
  const { userId } = useParams<{ userId: string }>();
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [corretor,            setCorretor]            = useState<any>(null);
  const [properties,          setProperties]          = useState<any[]>([]);
  const [images,              setImages]              = useState<Record<string, string>>({});
  const [loading,             setLoading]             = useState(true);
  const [notFound,            setNotFound]            = useState(false);
  const [subscriptionStatus,  setSubscriptionStatus]  = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const [search,          setSearch]          = useState("");
  const [filterType,      setFilterType]      = useState("all");
  const [filterStatus,    setFilterStatus]    = useState("disponivel");
  const [showFilters,     setShowFilters]     = useState(false);
  const [bedroomsFilter,  setBedroomsFilter]  = useState("any");
  const [showAreaFilter,  setShowAreaFilter]  = useState(false);
  const [sortBy,          setSortBy]          = useState("recent");
  const [showSortMenu,    setShowSortMenu]    = useState(false);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [minPrice,   setMinPrice]   = useState(0);
  const [maxPrice,   setMaxPrice]   = useState(1000000);
  const [areaRange,  setAreaRange]  = useState<[number, number]>([0, 1000]);
  const [minArea,    setMinArea]    = useState(0);
  const [maxArea,    setMaxArea]    = useState(1000);

  const [showLeadMagnet,    setShowLeadMagnet]    = useState(false);
  const [leadEmail,         setLeadEmail]         = useState("");
  const [leadName,          setLeadName]          = useState("");
  const [sendingLead,       setSendingLead]       = useState(false);
  const [leadSubmitted,     setLeadSubmitted]     = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showSimulator,     setShowSimulator]     = useState(false);
  const [viewMode,          setViewMode]          = useState<"list" | "map">("list");

  const {
    properties: mapProperties, loading: mapLoading,
    viewState, setViewState, selectedProperty, setSelectedProperty,
  } = useMapData(
    userId || "",
    corretor?.role === "imobiliaria" ? corretor?.company_id ?? undefined : undefined
  );

  const handleZoomIn    = () => setViewState({ ...viewState, zoom: viewState.zoom + 1 });
  const handleZoomOut   = () => setViewState({ ...viewState, zoom: Math.max(1, viewState.zoom - 1) });
  const handleResetView = () => { setViewState({ center: { lat: -15.7801, lng: -47.9292 }, zoom: 4 }); setSelectedProperty(null); };

  // ── Meta tags dinâmicas (para browser — title aparece na aba) ──────────────
  useEffect(() => {
    if (!corretor?.full_name) return;
    document.title = `Catálogo - ${corretor.full_name} | R2 TECH`;
    const setMeta = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr.split("=")[0], attr.split("=")[1]); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    const img = corretor.avatar_url || `${APP_URL}/logo-r2.svg`;
    const title = `Catálogo de ${corretor.full_name} | R2 TECH`;
    const desc  = `Confira os imóveis disponíveis com ${corretor.full_name}.`;
    setMeta('meta[property="og:title"]',       'property=og:title',       title);
    setMeta('meta[property="og:description"]', 'property=og:description', desc);
    setMeta('meta[property="og:image"]',       'property=og:image',       img);
    setMeta('meta[name="description"]',        'name=description',        desc);
  }, [corretor]);

  // ── Checagem de assinatura ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setSubscriptionLoading(false); return; }
    const check = async () => {
      try {
        const { data } = await supabase.from("profiles")
          .select("subscription_status, trial_end")
          .eq("id", userId).single();
        let status = data?.subscription_status || "active";
        if (status === "trial" && data?.trial_end && new Date(data.trial_end) < new Date()) status = "expired";
        setSubscriptionStatus(status);
      } catch {
        setSubscriptionStatus("active");
      } finally {
        setSubscriptionLoading(false);
      }
    };
    check();
  }, [userId]);

  // ── Lead magnet timer ─────────────────────────────────────────────────────
  useEffect(() => {
    const already = localStorage.getItem(`lead_magnet_${userId}`);
    if (already === "true") setLeadSubmitted(true);
  }, [userId]);

  useEffect(() => {
    if (loading || properties.length === 0 || leadSubmitted) return;
    modalTimerRef.current = setTimeout(() => setShowLeadMagnet(true), 10000);
    return () => { if (modalTimerRef.current) clearTimeout(modalTimerRef.current); };
  }, [loading, properties.length, leadSubmitted]);

  // ── Carregar dados ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setNotFound(true); setLoading(false); return; }
    const load = async () => {
      const { data: profile, error } = await supabase.from("profiles")
        .select("id, full_name, avatar_url, phone, telefone, role, company_id")
        .eq("id", userId).single();
      if (error || !profile) { setNotFound(true); setLoading(false); return; }
      setCorretor(profile);

      let q = supabase.from("properties").select("*").neq("status", "vendido").order("created_at", { ascending: false });
      if (profile.role === "imobiliaria" && profile.company_id) {
        q = q.eq("company_id", profile.company_id) as any;
      } else {
        q = q.eq("created_by", userId) as any;
      }
      const { data: props } = await q;
      const list = props ?? [];
      setProperties(list);

      const prices = list.map((p: any) => p.price).filter((p: any) => p !== null && p > 0);
      if (prices.length > 0) { setMinPrice(Math.min(...prices)); setMaxPrice(Math.max(...prices)); setPriceRange([Math.min(...prices), Math.max(...prices)]); }
      const areas = list.map((p: any) => p.area).filter((a: any) => a !== null && a > 0);
      if (areas.length > 0) { setMinArea(Math.min(...areas)); setMaxArea(Math.max(...areas)); setAreaRange([Math.min(...areas), Math.max(...areas)]); }

      if (list.length > 0) {
        const ids = list.map((p: any) => p.id);
        const { data: imgs } = await (supabase.from("property_images" as any).select("property_id, url, position").in("property_id", ids).order("position") as any);
        const map: Record<string, string> = {};
        (imgs ?? []).forEach((img: any) => { if (!map[img.property_id]) map[img.property_id] = img.url; });
        setImages(map);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  // ── Share — URL SEM hash para o middleware Vercel injetar OG tags ─────────
  // O WhatsApp ignora tudo após "#", então compartilhamos /catalogo/:id
  // O middleware.ts intercepta essa rota, injeta as meta tags e redireciona
  // browsers para /#/catalogo/:id automaticamente.
  const shareUrl = `${APP_URL}/catalogo/${userId}`;

  const handleShare = () => {
    const data = {
      title: `Catálogo de ${corretor?.full_name || "Imóveis"} | R2 TECH`,
      text:  `Confira os imóveis disponíveis com ${corretor?.full_name || "este corretor"}!`,
      url:   shareUrl,
    };
    if (navigator.share) {
      void navigator.share(data).then(() => {}).catch((err: Error) => {
        if (err.name !== "AbortError") { navigator.clipboard.writeText(shareUrl); toast.success("Link copiado!"); }
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado! Cole no WhatsApp para ver a prévia.");
    }
  };

  // ── Filtros e ordenação ───────────────────────────────────────────────────
  const getMinBedrooms = () => bedroomOptions.find(o => o.value === bedroomsFilter)?.min || 0;
  const filtered = properties.filter(p => {
    const ms = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()) || p.neighborhood?.toLowerCase().includes(search.toLowerCase());
    return ms && (filterType === "all" || p.type === filterType) && (filterStatus === "all" || p.status === filterStatus)
      && (p.price !== null && p.price >= priceRange[0] && p.price <= priceRange[1])
      && (p.bedrooms !== null && p.bedrooms >= getMinBedrooms())
      && (p.area !== null && p.area >= areaRange[0] && p.area <= areaRange[1]);
  });
  const sortedProperties = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "price_asc":    return (a.price || 0) - (b.price || 0);
      case "price_desc":   return (b.price || 0) - (a.price || 0);
      case "area_desc":    return (b.area || 0) - (a.area || 0);
      case "bedrooms_desc":return (b.bedrooms || 0) - (a.bedrooms || 0);
      default:             return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  const activeFilters = (filterType !== "all" ? 1 : 0) + (filterStatus !== "disponivel" ? 1 : 0)
    + (priceRange[0] !== minPrice || priceRange[1] !== maxPrice ? 1 : 0)
    + (bedroomsFilter !== "any" ? 1 : 0)
    + (areaRange[0] !== minArea || areaRange[1] !== maxArea ? 1 : 0);
  const typeOptions = [...new Set(properties.map(p => p.type).filter(Boolean))];
  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label || "Mais recentes";
  const CurrentSortIcon  = sortOptions.find(o => o.value === sortBy)?.icon  || ArrowUpDown;
  const corretorPhone = corretor?.phone || corretor?.telefone || null;
  const whatsappLink  = corretorPhone ? `https://wa.me/55${corretorPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${corretor?.full_name || ""}! Vi seu catálogo de imóveis e gostaria de mais informações.`)}` : null;

  // ── Lead magnet handlers ──────────────────────────────────────────────────
  const handleSubmitLeadMagnet = async () => {
    if (!leadEmail.trim() || !leadName.trim()) { toast.error("Preencha seu nome e e-mail"); return; }
    setSendingLead(true);
    try {
      await supabase.from("leads").insert({ name: leadName, email: leadEmail, phone: null, source: "Lead Magnet - Checklist", notes: `Checklist solicitado via catálogo de ${corretor?.full_name || "corretor"}`, status: "novo", assigned_to: userId || null, company_id: corretor?.company_id || null });
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email: leadEmail, name: leadName, corretor: corretor?.full_name || "CRM R2 Tech", checklistContent: checklistData }),
      });
      if (!resp.ok) { toast.warning("Não foi possível enviar o e-mail. Mas seus dados foram salvos!"); }
      else { toast.success("Checklist enviado para seu e-mail!"); }
      setLeadSubmitted(true);
      localStorage.setItem(`lead_magnet_${userId}`, "true");
      setShowLeadMagnet(false);
      setShowThankYouModal(true);
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar. Tente novamente.");
    } finally { setSendingLead(false); }
  };

  const generateChecklistHTML = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Checklist - ${leadName}</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;background:#f8fafc}.container{background:white;border-radius:24px;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}h1{color:#7E22CE;border-bottom:2px solid #7E22CE;padding-bottom:16px}h2{color:#334155;margin-top:24px;margin-bottom:12px}ul{list-style:none;padding:0}li{margin-bottom:8px;padding:4px 0;display:flex;align-items:flex-start;gap:8px}.check{color:#22C55E;font-weight:bold}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px}</style></head><body><div class="container"><h1>📋 Checklist do Comprador de Imóvel</h1><p><strong>${leadName}</strong>, este checklist foi preparado especialmente para você!</p>${checklistData.map(c => `<h2>${c.title}</h2><ul>${c.items.map(i => `<li><span class="check">✓</span> ${i}</li>`).join("")}</ul>`).join("")}<div class="footer"><p>CRM R2 Tech</p><p>Corretor: ${corretor?.full_name || "R2 TECH"}</p></div></div></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `checklist_${leadName.replace(/\s/g, "_")}.html` });
    a.click(); URL.revokeObjectURL(url);
    toast.success("Checklist baixado!");
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading || subscriptionLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
      <div className="w-8 h-8 border-2 border-[#7E22CE] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (subscriptionStatus === "expired" || subscriptionStatus === "canceled") return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: "#f8fafc" }}>
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Catálogo temporariamente indisponível</h1>
      <p className="text-slate-500 mb-4 max-w-md">O catálogo de {corretor?.full_name || "este corretor"} está temporariamente indisponível.</p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md">
        <p className="text-sm text-amber-700">🔄 Para reativar o catálogo, o corretor precisa renovar sua assinatura.</p>
      </div>
      <Link to="/" className="mt-8 text-[#7E22CE] hover:underline text-sm">Voltar ao início</Link>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: "#f8fafc" }}>
      <Building2 className="w-16 h-16 text-slate-300 mb-4" />
      <h1 className="text-xl font-bold text-slate-800 mb-2">Catálogo não encontrado</h1>
      <p className="text-slate-500 mb-6">Este link pode ter expirado ou o corretor não foi encontrado.</p>
      <Link to="/" className="text-[#7E22CE] hover:underline text-sm">Voltar ao início</Link>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", colorScheme: "light" }}>

      {/* Header sticky */}
      <header className="sticky top-0 z-20 border-b shadow-sm" style={{ backgroundColor: "#fff", borderColor: "#e2e8f0" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {corretor?.avatar_url ? (
              <img src={corretor.avatar_url} alt={corretor.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-[#7E22CE] font-bold text-sm">{(corretor?.full_name || "?")[0].toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{corretor?.full_name}</p>
              <p className="text-xs text-slate-500">{corretor?.role === "imobiliaria" ? "Imobiliária" : "Corretor de Imóveis"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleShare}
              className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-full hover:bg-slate-200 transition-colors">
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold px-3 py-2 rounded-full hover:bg-[#20b858] transition-colors">
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            <img src={logoR2} alt="CRM R2" className="h-6 opacity-60" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #7E22CE, #9333ea)" }}>
          <div className="px-6 py-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-white">
            {corretor?.avatar_url ? (
              <img src={corretor.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-4xl font-bold">{(corretor?.full_name || "?")[0].toUpperCase()}</span>
              </div>
            )}
            <div className="text-center sm:text-left">
              <p className="text-purple-200 text-sm mb-1">Catálogo de Imóveis</p>
              <h1 className="text-2xl font-black">{corretor?.full_name}</h1>
              <p className="text-purple-200 text-sm mt-1">
                {sortedProperties.length} imóvel{sortedProperties.length !== 1 ? "is" : ""} disponível{sortedProperties.length !== 1 ? "is" : ""}
              </p>
              {corretorPhone && (
                <p className="text-purple-200 text-sm mt-1 flex items-center gap-1 justify-center sm:justify-start">
                  <Phone className="w-3.5 h-3.5" />{corretorPhone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Simulador */}
        <div className="flex justify-end">
          <button onClick={() => setShowSimulator(true)}
            className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold px-4 py-2 rounded-full transition-colors text-sm">
            <Calculator className="w-4 h-4" /> Simular financiamento
          </button>
        </div>

        {/* Busca + filtros */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por título, cidade ou bairro..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#7E22CE]"
                style={{ color: "#0f172a" }} />
            </div>
            <div className="relative">
              <button onClick={() => setShowSortMenu(!showSortMenu)}
                className={cn("flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all bg-white",
                  showSortMenu ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-200 text-slate-600")}>
                <CurrentSortIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{currentSortLabel}</span>
                <ArrowUpDown className="w-3.5 h-3.5 sm:hidden" />
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden min-w-[160px]">
                    {sortOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <button key={option.value} onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                          className={cn("w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors",
                            sortBy === option.value ? "bg-purple-50 text-[#7E22CE] font-medium" : "text-slate-600 hover:bg-slate-50")}>
                          <Icon className="w-4 h-4" />{option.label}
                          {sortBy === option.value && <span className="ml-auto text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={cn("flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                showFilters || activeFilters > 0 ? "border-[#7E22CE] bg-purple-50 text-[#7E22CE]" : "border-slate-200 bg-white text-slate-600")}>
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilters > 0 && <span className="bg-[#7E22CE] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex flex-col gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  {/* Tipo */}
                  <div className="flex flex-wrap gap-1.5">
                    {["all", ...typeOptions].map(t => (
                      <button key={t} onClick={() => setFilterType(filterType === t ? "all" : t)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          filterType === t ? "bg-[#7E22CE] text-white border-[#7E22CE]" : "border-slate-200 text-slate-600 bg-white")}>
                        {t === "all" ? "Todos os tipos" : typeLabels[t] || t}
                      </button>
                    ))}
                  </div>
                  <div className="w-full h-px bg-slate-100" />
                  {/* Status */}
                  <div className="flex flex-wrap gap-1.5">
                    {["all", "disponivel", "reservado"].map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          filterStatus === s ? "bg-[#7E22CE] text-white border-[#7E22CE]" : "border-slate-200 text-slate-600 bg-white")}>
                        {s === "all" ? "Todos os status" : statusLabels[s]}
                      </button>
                    ))}
                  </div>
                  <div className="w-full h-px bg-slate-100" />
                  {/* Quartos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><BedDouble className="w-3.5 h-3.5 text-slate-500" /><span className="text-xs font-medium text-slate-600">Quartos</span></div>
                    <div className="flex flex-wrap gap-1.5">
                      {bedroomOptions.map(opt => (
                        <button key={opt.value} onClick={() => setBedroomsFilter(opt.value)}
                          className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            bedroomsFilter === opt.value ? "bg-[#7E22CE] text-white border-[#7E22CE]" : "border-slate-200 text-slate-600 bg-white")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-full h-px bg-slate-100" />
                  {/* Área */}
                  <div className="space-y-2">
                    <button onClick={() => setShowAreaFilter(!showAreaFilter)}
                      className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-[#7E22CE] transition-colors">
                      <Maximize className="w-3.5 h-3.5" /> Área (m²)
                      <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showAreaFilter && "rotate-90")} />
                    </button>
                    {showAreaFilter && (
                      <div className="pt-1">
                        <div className="flex justify-between text-xs text-slate-500 mb-2"><span>{areaRange[0]} m²</span><span>{areaRange[1]} m²</span></div>
                        <Slider value={[areaRange[0], areaRange[1]]} min={minArea || 0} max={maxArea || 1000} step={Math.max(1, Math.ceil(((maxArea || 1000) - (minArea || 0)) / 50))} onValueChange={v => setAreaRange([v[0], v[1]])} className="w-full" />
                      </div>
                    )}
                  </div>
                  <div className="w-full h-px bg-slate-100" />
                  {/* Preço */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-slate-500" /><span className="text-xs font-medium text-slate-600">Faixa de preço</span></div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2"><span>{formatCurrency(priceRange[0])}</span><span>{formatCurrency(priceRange[1])}</span></div>
                    <Slider value={[priceRange[0], priceRange[1]]} min={minPrice || 0} max={maxPrice || 1000000} step={Math.max(1, Math.ceil(((maxPrice || 1000000) - (minPrice || 0)) / 100))} onValueChange={v => setPriceRange([v[0], v[1]])} className="w-full" />
                  </div>
                  {activeFilters > 0 && (
                    <button onClick={() => { setFilterType("all"); setFilterStatus("disponivel"); setPriceRange([minPrice, maxPrice]); setBedroomsFilter("any"); setAreaRange([minArea, maxArea]); }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1">
                      <X className="w-3 h-3" /> Limpar todos os filtros
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Abas Lista / Mapa */}
        <Tabs value={viewMode} onValueChange={v => setViewMode(v as "list" | "map")} className="w-full">
          <TabsList className="mb-4 bg-slate-100">
            <TabsTrigger value="list" className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Lista de Imóveis</TabsTrigger>
            <TabsTrigger value="map"  className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Mapa Interativo</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs text-slate-500">
                {sortedProperties.length === 0 ? "Nenhum imóvel encontrado"
                  : `${sortedProperties.length} imóvel${sortedProperties.length !== 1 ? "is" : ""} encontrado${sortedProperties.length !== 1 ? "s" : ""}`}
              </p>
              <p className="text-[10px] text-slate-400 hidden sm:block">Ordenado por: <span className="font-medium text-slate-500">{currentSortLabel}</span></p>
            </div>
            {sortedProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Building2 className="w-14 h-14 text-slate-200 mb-4" />
                <p className="font-semibold text-slate-600 mb-1">Nenhum imóvel encontrado</p>
                <p className="text-sm text-slate-400">Tente outros filtros ou termos de busca</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProperties.map((prop, idx) => {
                  const img = images[prop.id];
                  return (
                    <motion.div key={prop.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                      <Link to={`/imovel/${prop.id}`} className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
                        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                          {img ? <img src={img} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1"><Building2 className="w-10 h-10 opacity-30" /><span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Sem foto</span></div>}
                          <div className={cn("absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full", statusColors[prop.status] || "bg-slate-100 text-slate-600")}>{statusLabels[prop.status] || prop.status}</div>
                          <div className="absolute bottom-2 right-2 bg-[#7E22CE] text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-4 h-4" /></div>
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-slate-400 capitalize mb-0.5">{typeLabels[prop.type] || prop.type}</p>
                          <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 group-hover:text-[#7E22CE] transition-colors">{prop.title}</h3>
                          {(prop.neighborhood || prop.city) && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-2"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{[prop.neighborhood, prop.city].filter(Boolean).join(", ")}</span></div>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-base font-black text-[#7E22CE]">{formatCurrency(Number(prop.price))}</p>
                            {prop.area && <p className="text-xs text-slate-400 flex items-center gap-1"><Maximize className="w-3 h-3" /> {prop.area} m²</p>}
                          </div>
                          {prop.bedrooms && <p className="text-xs text-slate-400 flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{prop.bedrooms} qto{prop.bedrooms > 1 ? "s" : ""}</p>}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <div className="relative">
              <MapComponent properties={mapProperties} viewState={viewState} onViewStateChange={setViewState} onPropertySelect={setSelectedProperty} selectedProperty={selectedProperty} loading={mapLoading} />
              <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onResetView={handleResetView} />
              {mapProperties.length === 0 && !mapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                  <div className="text-center"><MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">Nenhum imóvel com localização disponível</p></div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-6 pb-4 flex items-center justify-center gap-2 border-t border-slate-200">
          <img src={logoR2} alt="CRM R2" className="h-5 opacity-40" />
          <span className="text-xs text-slate-400">Powered by CRM R2 Tech</span>
        </div>
      </div>

      {/* Modal Lead Magnet */}
      <Dialog open={showLeadMagnet} onOpenChange={o => !o && setShowLeadMagnet(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><Download className="w-5 h-5 text-[#7E22CE]" /> Checklist do Comprador</DialogTitle>
            <DialogDescription>Baixe gratuitamente o checklist completo com 25 itens essenciais para comprar seu imóvel com segurança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 rounded-xl p-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 mb-2">✓ O que você vai receber:</p>
              <ul className="space-y-1">
                {checklistData.slice(0, 3).map((cat, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    <span className="font-medium text-purple-600">📌 {cat.title}</span>
                    <ul className="ml-4 mt-1 space-y-0.5">
                      {cat.items.slice(0, 2).map((item, j) => (
                        <li key={j} className="text-xs text-slate-500 flex items-start gap-1"><CheckCircle2 className="w-2.5 h-2.5 text-green-500 mt-0.5 shrink-0" />{item.length > 50 ? item.slice(0, 50) + "..." : item}</li>
                      ))}
                    </ul>
                  </li>
                ))}
                <li className="text-xs text-purple-600 font-medium mt-2">+ {checklistData.length - 3} categorias e 15 itens adicionais</li>
              </ul>
            </div>
            <div className="space-y-3">
              <Input placeholder="Seu nome completo" value={leadName} onChange={e => setLeadName(e.target.value)} className="bg-white" />
              <Input type="email" placeholder="Seu melhor e-mail" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} className="bg-white" />
              <Button onClick={handleSubmitLeadMagnet} disabled={sendingLead} className="w-full bg-[#7E22CE] hover:bg-purple-700">
                {sendingLead ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</div> : <><Download className="w-4 h-4 mr-2" />Receber checklist</>}
              </Button>
            </div>
            <p className="text-[10px] text-center text-slate-400">Ao enviar, você concorda em receber conteúdos por e-mail.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal agradecimento */}
      <Dialog open={showThankYouModal} onOpenChange={o => !o && setShowThankYouModal(false)}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <DialogTitle>Checklist enviado! 📋</DialogTitle>
            <p className="text-sm text-slate-600">Verifique sua caixa de entrada. Se não encontrar, verifique o spam.</p>
            <Button onClick={generateChecklistHTML} variant="outline" className="mt-2"><Download className="w-4 h-4 mr-2" />Baixar agora</Button>
            <Button onClick={() => setShowThankYouModal(false)} className="mt-2 bg-[#7E22CE]">Continuar navegando</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal simulador */}
      <Dialog open={showSimulator} onOpenChange={setShowSimulator}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-[#7E22CE]" />Simulador de Financiamento</DialogTitle>
            <DialogDescription>Simule seu financiamento e compare as melhores opções dos principais bancos</DialogDescription>
          </DialogHeader>
          <FinancingSimulator propertyValue={sortedProperties[0]?.price ? Number(sortedProperties[0].price) : undefined} onClose={() => setShowSimulator(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogoPublico;