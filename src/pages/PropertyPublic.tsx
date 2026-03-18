import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MapPin, BedDouble, Maximize, Phone, Mail, User, MessageSquare, ChevronLeft, ChevronRight, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  apartamento: "Apartamento", casa: "Casa", terreno: "Terreno",
  comercial: "Comercial", rural: "Rural", cobertura: "Cobertura",
};

const formatCurrency = (val: number | null) =>
  val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "-";

const PropertyPublic = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty]   = useState<any>(null);
  const [images, setImages]       = useState<any[]>([]);
  const [corretor, setCorretor]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [imgIndex, setImgIndex]   = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [viewCount, setViewCount]   = useState<number>(0);
  const [sending, setSending]     = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", message: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }

      const { data: prop, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !prop) { setNotFound(true); setLoading(false); return; }
      setProperty(prop);

      const { data: imgs } = await (supabase
        .from("property_images" as any)
        .select("url, position")
        .eq("property_id", id)
        .order("position") as any);
      setImages(imgs ?? []);

      // Busca dados do corretor
      if (prop.created_by) {
        const { data: cor } = await supabase
          .from("profiles")
          .select("full_name, phone, avatar_url")
          .eq("id", prop.created_by)
          .single();
        setCorretor(cor);
      }

      // Registrar visualização e buscar contagem
      if (prop?.id) {
        await (supabase.from("property_views" as any).insert({
          property_id: prop.id,
          user_agent: navigator.userAgent.slice(0, 200),
        }) as any);
        const { count } = await (supabase.from("property_views" as any)
          .select("*", { count: "exact", head: true })
          .eq("property_id", prop.id) as any);
        setViewCount(count ?? 0);
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "").slice(0, 15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios"); return;
    }
    setSending(true);
    try {
      // Criar lead vinculado ao corretor do imóvel
      const { error } = await supabase.from("leads").insert({
        name:        form.name,
        phone:       form.phone,
        email:       form.email || null,
        notes:       form.message ? `Mensagem via link do imóvel: ${form.message}` : `Lead captado via link do imóvel: ${property.title}`,
        source:      "Portal",
        status:      "novo",
        assigned_to: property.created_by ?? null,
        company_id:  property.company_id ?? null,
      } as any);

      if (error) throw error;

      // Notificar corretor no sino
      if (property.created_by) {
        await (supabase.from("notifications" as any).insert({
          user_id: property.created_by,
          type:    "lead",
          title:   `Novo lead: ${form.name}`,
          body:    `Interesse no imóvel "${property.title}"`,
          link:    "/#/leads",
          read:    false,
        }) as any);
      }

      setSubmitted(true);
    } catch (e: any) {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const whatsappLink = corretor?.phone
    ? `https://wa.me/55${corretor.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi o imóvel "${property?.title}" e tenho interesse. Meu nome é ${form.name || "..."}.`)}`
    : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#7E22CE] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <Building2 className="w-16 h-16 text-slate-300 mb-4" />
      <h1 className="text-xl font-bold text-slate-800 mb-2">Imóvel não encontrado</h1>
      <p className="text-slate-500 mb-6">Este link pode ter expirado ou o imóvel foi removido.</p>
      <Link to="/" className="text-[#7E22CE] hover:underline text-sm">Voltar ao início</Link>
    </div>
  );

  return (
    <div style={{ colorScheme: "light" }}>
      <style>{`
        .property-public-page {
          --background: 0 0% 100%;
          --foreground: 222 47% 11%;
          --card: 0 0% 100%;
          --card-foreground: 222 47% 11%;
          --border: 214 32% 91%;
          --input: 214 32% 91%;
          --muted: 210 40% 96%;
          --muted-foreground: 215 16% 47%;
          background-color: #f8fafc;
          color: #0f172a;
        }
        .property-public-page input,
        .property-public-page textarea {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #e2e8f0 !important;
        }
        .property-public-page input::placeholder,
        .property-public-page textarea::placeholder {
          color: #94a3b8 !important;
        }
        .property-public-page label {
          color: #475569 !important;
        }
      `}</style>
    <div className="property-public-page min-h-screen" style={{ backgroundColor: "#f8fafc", color: "#0f172a" }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-10" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src="/logo-r2.svg" alt="CRM R2" className="h-8" />
          <span className="text-xs text-slate-400">Powered by CRM R2</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Galeria */}
          <div className="relative aspect-video bg-slate-200 rounded-2xl overflow-hidden">
            {viewCount > 0 && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {viewCount} {viewCount === 1 ? "visualização" : "visualizações"}
              </div>
            )}
            {images.length > 0 ? (
              <>
                <img src={images[imgIndex].url} className="w-full h-full object-cover" alt={property.title} />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setImgIndex(p => (p - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setImgIndex(p => (p + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                      {imgIndex + 1}/{images.length}
                    </span>
                    {/* Thumbnails */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => setImgIndex(i)}
                          className={cn("rounded-full transition-all", i === imgIndex ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/60")} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-16 h-16 text-slate-300" />
              </div>
            )}
          </div>

          {/* Dados do imóvel */}
          <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div>
              <p className="text-sm text-slate-500 capitalize">{typeLabels[property.type] || property.type}</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{property.title}</h1>
              {(property.neighborhood || property.city) && (
                <div className="flex items-center gap-1.5 mt-2 text-slate-500 text-sm">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{[property.neighborhood, property.city].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>

            <p className="text-3xl font-black text-[#7E22CE]">{formatCurrency(property.price)}</p>

            <div className="flex flex-wrap gap-4 py-3 border-y border-slate-100">
              {property.bedrooms && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <BedDouble className="w-4 h-4 text-[#7E22CE]" />
                  <span><strong>{property.bedrooms}</strong> {property.bedrooms === 1 ? "quarto" : "quartos"}</span>
                </div>
              )}
              {property.area && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Maximize className="w-4 h-4 text-[#7E22CE]" />
                  <span><strong>{property.area}</strong> m²</span>
                </div>
              )}
            </div>

            {property.description && (
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Descrição</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{property.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Formulário */}
        <div className="space-y-4">
          {/* Card corretor */}
          {corretor && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
              {corretor.avatar_url ? (
                <img src={corretor.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-lg font-bold text-[#7E22CE]">
                  {(corretor.full_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-slate-800">{corretor.full_name}</p>
                <p className="text-xs text-slate-500">Corretor responsável</p>
              </div>
            </div>
          )}

          {/* Formulário de interesse */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4" style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
          >
            {submitted ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="font-bold text-slate-800">Mensagem enviada!</h3>
                <p className="text-sm text-slate-500">O corretor entrará em contato em breve.</p>
                {whatsappLink && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                    <Phone className="w-4 h-4" />
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-slate-800">Tenho interesse</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Deixe seus dados e o corretor entra em contato</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        className="pl-8 h-9 text-sm" placeholder="Seu nome completo" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                        className="pl-8 h-9 text-sm" placeholder="(21) 99999-9999" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        className="pl-8 h-9 text-sm" placeholder="seu@email.com" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mensagem</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <textarea
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#7E22CE] min-h-[80px]"
                        placeholder="Quero saber mais sobre este imóvel..."
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={sending} className="w-full bg-[#7E22CE] hover:bg-[#6b21a8] text-white font-semibold">
                    {sending ? "Enviando..." : "Quero ser contactado"}
                  </Button>
                </form>
                {whatsappLink && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                    <Phone className="w-4 h-4" />
                    Falar direto no WhatsApp
                  </a>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default PropertyPublic;