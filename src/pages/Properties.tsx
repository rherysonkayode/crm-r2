import { useState } from "react";
import { ShareCatalogModal } from "@/components/ShareCatalogModal";
import { AppLayout } from "@/components/AppLayout";
import { useProperties } from "@/hooks/useCompanyData";
import { useAllPropertyImages, PropertyImage } from "@/hooks/useAllPropertyImages";
import { useLeads, useProfiles } from "@/hooks/useCompanyData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Search, Trash2, Pencil, MapPin, BedDouble, Maximize,
  Image as ImageIcon, ChevronLeft, ChevronRight, DollarSign, Building2, SlidersHorizontal, Share2, Eye, Phone, Users, LayoutGrid, ExternalLink
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { usePermissions } from "@/hooks/usePermissions";
import { ImageUploadMultiple } from "@/components/ImageUploadMultiple";
import { cn } from "@/lib/utils";
import { LocationSearch } from "@/components/LocationSearch";
import { Link } from "react-router-dom";

const typeOptions = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa",        label: "Casa"        },
  { value: "terreno",     label: "Terreno"     },
  { value: "comercial",   label: "Comercial"   },
  { value: "rural",       label: "Rural"       },
  { value: "cobertura",   label: "Cobertura"   },
];

const statusOptions = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado",  label: "Reservado"  },
  { value: "vendido",    label: "Vendido"    },
  { value: "alugado",    label: "Alugado"    },
];

const statusColors: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  reservado:  "bg-amber-100 text-amber-700",
  vendido:    "bg-purple-100 text-purple-700",
  alugado:    "bg-blue-100 text-blue-700",
};

interface VendaInfo {
  id: string;
  value: number;
  created_at: string;
  lead: { name: string } | null;
  corretor: { full_name: string } | null;
}

const usePropertyLeadsCount = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ["property_leads_count", userId],
    queryFn: async () => {
      if (!userId) return {};
      const { data } = await (supabase
        .from("leads")
        .select("property_id")
        .not("property_id", "is", null) as any);
      if (!data) return {};
      const counts: Record<string, number> = {};
      (data as any[]).forEach((l: any) => {
        if (l.property_id) counts[l.property_id] = (counts[l.property_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!userId,
  });
};

const usePropertyViews = (userId: string | null | undefined, companyId: string | null | undefined) => {
  return useQuery({
    queryKey: ["property_views", userId, companyId],
    queryFn: async () => {
      if (!userId) return {};
      let query = supabase.from("properties").select("id");
      if (companyId) {
        query = query.eq("company_id", companyId) as any;
      } else {
        query = query.eq("created_by", userId) as any;
      }
      const { data: props } = await query;
      if (!props || props.length === 0) return {};
      const ids = props.map((p: any) => p.id);
      const { data } = await (supabase.from("property_views" as any).select("property_id").in("property_id", ids) as any);
      if (!data) return {};
      const counts: Record<string, number> = {};
      (data as any[]).forEach((v: any) => {
        counts[v.property_id] = (counts[v.property_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!userId,
  });
};

const useLeadContactCounts = (propertyIds: string[]) => {
  return useQuery({
    queryKey: ["lead_contacts", propertyIds],
    queryFn: async () => {
      if (!propertyIds.length) return {};
      const { data } = await supabase
        .from("leads")
        .select("notes")
        .or(propertyIds.map(id => `notes.ilike.%${id}%`).join(","));
      const counts: Record<string, number> = {};
      (data ?? []).forEach((l: any) => {
        propertyIds.forEach(id => {
          if (l.notes?.includes(id)) counts[id] = (counts[id] || 0) + 1;
        });
      });
      return counts;
    },
    enabled: propertyIds.length > 0,
  });
};

const Properties = () => {
  const { data: properties, isLoading } = useProperties();
  const { data: allImages, refetch: refetchImages } = useAllPropertyImages();
  const { data: leads }    = useLeads();
  const { data: profiles } = useProfiles();
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const { canCreateProperties } = usePermissions();
  const { data: viewCounts = {} } = usePropertyViews(profile?.id, profile?.company_id);
  const { data: leadsCount = {} } = usePropertyLeadsCount(profile?.id);
  const propertyIds = (properties ?? []).map((p: any) => p.id);
  const { data: contactCounts = {} } = useLeadContactCounts(propertyIds);
  const queryClient = useQueryClient();

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType,   setFilterType]   = useState("all");
  const [showFilters,  setShowFilters]  = useState(false);

  const [dialogOpen,        setDialogOpen]        = useState(false);
  const [editing,           setEditing]           = useState<any>(null);
  const [viewing,           setViewing]           = useState<any>(null);
  const [viewDialogOpen,    setViewDialogOpen]    = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});
  const [tempImages,        setTempImages]        = useState<{ id: string; url: string; position: number }[]>([]);
  const [vendaInfo,         setVendaInfo]         = useState<VendaInfo | null>(null);
  const [viewImageIndex,    setViewImageIndex]    = useState(0);
  const [vendaDialogOpen,   setVendaDialogOpen]   = useState(false);
  const [shareModalOpen,    setShareModalOpen]    = useState(false);
  
  // Estado para localização
  const [location, setLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
    neighborhood?: string;
    city?: string;
  } | null>(null);

  const [vendaForm, setVendaForm] = useState({
    lead_id: "", corretor_id: "", valor: "",
    data: new Date().toISOString().split("T")[0],
  });

  const FORM_STORAGE_KEY = "crm_r2_property_form_draft";

  const [form, setFormState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { title: "", price: "", neighborhood: "", city: "", type: "apartamento", status: "disponivel", bedrooms: "", area: "", description: "" };
  });

  const setForm = (newForm: typeof form | ((prev: typeof form) => typeof form)) => {
    setFormState(prev => {
      const next = typeof newForm === "function" ? newForm(prev) : newForm;
      if (!editing) {
        try { sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };

  // Função auxiliar para atualizar o formulário
  const updateForm = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  // Função para abrir o diálogo de novo imóvel
  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    const empty = { title: "", price: "", neighborhood: "", city: "", type: "apartamento", status: "disponivel", bedrooms: "", area: "", description: "" };
    setFormState(empty);
    setLocation(null);
    try { sessionStorage.removeItem(FORM_STORAGE_KEY); } catch {}
    setEditing(null);
    setTempImages([]);
  };

  const openEdit = (prop: any) => {
    setForm({
      title:        prop.title        || "",
      price:        prop.price?.toString() || "",
      neighborhood: prop.neighborhood || "",
      city:         prop.city         || "",
      type:         prop.type         || "apartamento",
      status:       prop.status       || "disponivel",
      bedrooms:     prop.bedrooms?.toString() || "",
      area:         prop.area?.toString()     || "",
      description:  prop.description  || "",
    });
    // Preencher localização se existir
    if (prop.latitude && prop.longitude) {
      setLocation({
        address: prop.full_address || `${prop.neighborhood || ""}, ${prop.city || ""}`.trim(),
        lat: prop.latitude,
        lng: prop.longitude,
        neighborhood: prop.neighborhood,
        city: prop.city,
      });
    } else {
      setLocation(null);
    }
    setEditing(prop);
    setTempImages([]);
    setDialogOpen(true);
  };

  const openView = async (prop: any) => {
    setViewing(prop);
    setViewImageIndex(0);
    setVendaInfo(null);

    if (prop.status === "vendido") {
      const { data, error } = await (supabase
        .from("deals" as any)
        .select(`id, value, created_at, leads (name), profiles!deals_assigned_to_fkey (full_name)`)
        .eq("property_id", prop.id)
        .eq("stage", "fechado")
        .maybeSingle() as any);
      if (!error && data) {
        setVendaInfo({ id: data.id, value: data.value, created_at: data.created_at, lead: data.leads, corretor: data.profiles });
      }
    }
    setViewDialogOpen(true);
  };

  const canEditProp  = (prop: any) => isImobiliaria || prop.created_by === profile?.id;
  const canDeleteProp = (prop: any) => isImobiliaria || prop.created_by === profile?.id;

  const handleSave = async () => {
    if (!profile || !form.title) { toast.error("Título é obrigatório"); return; }

    const payload = {
      title:        form.title,
      price:        form.price        ? parseFloat(form.price)    : null,
      neighborhood: location?.neighborhood || form.neighborhood || null,
      city:         location?.city || form.city || null,
      full_address: location?.address || null,
      latitude:     location?.lat || null,
      longitude:    location?.lng || null,
      type:         form.type         as any,
      status:       form.status       as any,
      bedrooms:     form.bedrooms     ? parseInt(form.bedrooms)   : null,
      area:         form.area         ? parseFloat(form.area)     : null,
      description:  form.description  || null,
      company_id:   profile.company_id ?? null,
      created_by:   profile.id,
    };

    let savedPropertyId = editing?.id;

    if (editing) {
      const { error } = await supabase.from("properties").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("properties").insert(payload).select().single();
      if (error) { toast.error("Erro ao criar: " + error.message); return; }
      savedPropertyId = data.id;
      if (tempImages.length > 0) {
        for (const img of tempImages) {
          await (supabase.from("property_images" as any).insert({ property_id: savedPropertyId, url: img.url, position: img.position }) as any);
        }
        setTempImages([]);
        await refetchImages();
      }
    }

    toast.success(editing ? "Imóvel atualizado!" : "Imóvel criado!");
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    const { data: deals, error: checkError } = await supabase.from("deals").select("id").eq("property_id", id);
    if (checkError) { toast.error("Erro ao verificar vínculos do imóvel"); return; }

    if (deals && deals.length > 0) {
      if (!confirm(`Este imóvel está vinculado a ${deals.length} negócio(s). Deseja desvinculá-los e excluir?`)) return;
      const { error: updateError } = await supabase.from("deals").update({ property_id: null }).eq("property_id", id);
      if (updateError) { toast.error("Erro ao desvincular negócios: " + updateError.message); return; }
    }

    const { error, count } = await supabase.from("properties").delete({ count: "exact" }).eq("id", id);
    if (error) { toast.error("Erro no banco: " + error.message); return; }
    if (count === 0) { toast.error("O banco recusou a exclusão. Verifique as regras de RLS!"); return; }

    toast.success("Imóvel excluído com sucesso!");
    await queryClient.invalidateQueries({ queryKey: ["properties"] });
  };

  const handleRegistrarVenda = async () => {
    if (!viewing) return;
    const corretorId = isCorretor ? profile!.id : vendaForm.corretor_id;
    if (!vendaForm.lead_id || !corretorId || !vendaForm.valor) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    try {
      const { error: dealError } = await supabase.from("deals").insert({
        lead_id:     vendaForm.lead_id,
        property_id: viewing.id,
        value:       parseFloat(vendaForm.valor),
        stage:       "fechado",
        company_id:  profile?.company_id ?? null,
        created_by:  profile!.id,
        assigned_to: corretorId,
      });
      if (dealError) throw dealError;

      const { error: propError } = await supabase
        .from("properties")
        .update({ status: "vendido" })
        .eq("id", viewing.id);
      if (propError) throw propError;

      await supabase.from("leads").update({ status: "convertido" }).eq("id", vendaForm.lead_id);

      toast.success("Venda registrada com sucesso!");
      setVendaDialogOpen(false);
      setVendaForm({ lead_id: "", corretor_id: "", valor: "", data: new Date().toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setViewDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao registrar venda: " + error.message);
    }
  };

  const formatCurrency = (val: number | null) =>
    val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "-";

  const getImagesForProperty = (propertyId: string): PropertyImage[] =>
    allImages ? allImages.filter((img) => img.property_id === propertyId) : [];

  const filtered = properties?.filter((p: any) => {
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase()) ||
                        p.city?.toLowerCase().includes(search.toLowerCase()) ||
                        p.neighborhood?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchType   = filterType   === "all" || p.type   === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const activeFilters = (filterStatus !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0);

  const nextImage = (propertyId: string, total: number) =>
    setCurrentImageIndex((prev) => ({ ...prev, [propertyId]: ((prev[propertyId] || 0) + 1) % total }));
  const prevImage = (propertyId: string, total: number) =>
    setCurrentImageIndex((prev) => ({ ...prev, [propertyId]: ((prev[propertyId] || 0) - 1 + total) % total }));

  const viewImages = viewing ? getImagesForProperty(viewing.id) : [];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Imóveis</h1>
            <p className="text-muted-foreground text-sm">
              {isCorretor ? "Seu portfólio de imóveis" : "Portfólio de imóveis da empresa"}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Botão Acessar Catálogo */}
            <Button
              variant="outline"
              className="gap-2 border-[#7E22CE] text-[#7E22CE] hover:bg-purple-50"
              asChild
            >
              <Link to={`/catalogo/${profile?.id}`} target="_blank">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Acessar Catálogo</span>
                <span className="sm:hidden">Catálogo</span>
              </Link>
            </Button>

            {/* Botão Compartilhar catálogo - ABRE MODAL */}
            <Button
              variant="outline"
              className="gap-2 border-[#7E22CE] text-[#7E22CE] hover:bg-purple-50"
              onClick={() => setShareModalOpen(true)}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartilhar catálogo</span>
              <span className="sm:hidden">Compartilhar</span>
            </Button>

            {/* Modal de compartilhamento */}
            <ShareCatalogModal
              open={shareModalOpen}
              onOpenChange={setShareModalOpen}
              catalogLink={`${window.location.origin}/catalogo/${profile?.id}`}
              corretorName={profile?.full_name}
            />

            {canCreateProperties && (
              <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]" onClick={openNewDialog}>
                    <Plus className="w-4 h-4 mr-2" />Novo Imóvel
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editing ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Fotos do Imóvel</Label>
                      {editing && editing.id ? (
                        <ImageUploadMultiple
                          propertyId={editing.id}
                          images={getImagesForProperty(editing.id)}
                          onUploadSuccess={async (url) => {
                            const { error } = await (supabase.from("property_images" as any).insert({ property_id: editing.id, url, position: getImagesForProperty(editing.id).length }) as any);
                            if (!error) { await refetchImages(); toast.success("Imagem adicionada!"); }
                            else toast.error("Erro ao salvar imagem: " + error.message);
                          }}
                          onRemove={async (imageId) => {
                            await (supabase.from("property_images" as any).delete().eq("id", imageId) as any);
                            await refetchImages();
                          }}
                        />
                      ) : (
                        <ImageUploadMultiple
                          propertyId="temp"
                          images={tempImages}
                          onUploadSuccess={(url) => setTempImages((prev) => [...prev, { id: `temp-${Date.now()}`, url, position: prev.length }])}
                          onRemove={(imageId) => setTempImages((prev) => prev.filter((img) => img.id !== imageId))}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input value={form.title} onChange={(e) => editing ? setForm({ ...form, title: e.target.value }) : updateForm("title", e.target.value)} />
                    </div>
                    
                    {/* Busca de localização */}
                    <div className="space-y-2">
                      <Label>Localização do Imóvel</Label>
                      <LocationSearch
                        value={`${form.neighborhood || ""} ${form.city || ""}`.trim()}
                        onChange={(loc) => {
                          setLocation(loc);
                          setForm({
                            ...form,
                            neighborhood: loc.neighborhood || form.neighborhood,
                            city: loc.city || form.city,
                          });
                        }}
                        placeholder="Buscar endereço, bairro ou cidade..."
                      />
                      <p className="text-[10px] text-slate-400">
                        Digite o endereço para posicionar o imóvel no mapa. Isso ajuda os compradores a visualizar a localização.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preço (R$)</Label>
                        <Input type="number" value={form.price} onChange={(e) => editing ? setForm({ ...form, price: e.target.value }) : updateForm("price", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Bairro</Label><Input value={form.neighborhood} onChange={(e) => editing ? setForm({ ...form, neighborhood: e.target.value }) : updateForm("neighborhood", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => editing ? setForm({ ...form, city: e.target.value }) : updateForm("city", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Quartos</Label><Input type="number" value={form.bedrooms} onChange={(e) => editing ? setForm({ ...form, bedrooms: e.target.value }) : updateForm("bedrooms", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Área (m²)</Label><Input type="number" value={form.area} onChange={(e) => editing ? setForm({ ...form, area: e.target.value }) : updateForm("area", e.target.value)} /></div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <textarea
                        className="w-full min-h-[100px] p-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-muted-foreground"
                        value={form.description}
                        onChange={(e) => editing ? setForm({ ...form, description: e.target.value }) : updateForm("description", e.target.value)}
                        placeholder="Detalhes do imóvel..."
                      />
                    </div>
                    <Button onClick={handleSave} className="bg-[#7E22CE] hover:bg-[#6b21a8]">{editing ? "Salvar" : "Criar"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Barra de busca + filtros */}
        <div className="space-y-3 mb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, cidade ou bairro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters((v) => !v)}
              className={cn("shrink-0 gap-2", activeFilters > 0 && "border-[#7E22CE] text-[#7E22CE]")}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilters > 0 && (
                <span className="bg-[#7E22CE] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-xl border border-border"
            >
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterType("all"); }}
                  className="text-muted-foreground text-xs">
                  Limpar filtros
                </Button>
              )}
            </motion.div>
          )}
        </div>

        {/* Contador de resultados */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground mb-4">
            {filtered?.length === 0
              ? "Nenhum imóvel encontrado"
              : `${filtered?.length} imóvel${(filtered?.length ?? 0) > 1 ? "is" : ""} encontrado${(filtered?.length ?? 0) > 1 ? "s" : ""}`}
            {(search || activeFilters > 0) && properties?.length !== filtered?.length &&
              ` de ${properties?.length} no total`}
          </p>
        )}

        {/* Grid de cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
                <div className="h-44 bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-6 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl text-center bg-card">
            <Building2 className="w-14 h-14 text-muted-foreground/20 mb-4" />
            <p className="font-semibold text-slate-700 mb-1">
              {search || activeFilters > 0 ? "Nenhum imóvel encontrado" : "Nenhum imóvel cadastrado"}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {search || activeFilters > 0
                ? "Tente outros termos ou remova os filtros"
                : "Adicione seu primeiro imóvel ao portfólio"}
            </p>
            {canCreateProperties && !search && !activeFilters && (
              <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />Adicionar Imóvel
              </Button>
            )}
            {(search || activeFilters > 0) && (
              <Button variant="outline" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((prop: any) => {
              const images     = getImagesForProperty(prop.id);
              const currentIdx = currentImageIndex[prop.id] || 0;
              const hasImages  = images.length > 0;
              const currentImage = hasImages ? images[currentIdx].url : null;
              const canEdit   = canEditProp(prop);
              const canDelete = canDeleteProp(prop);

              return (
                <motion.div
                  key={prop.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border overflow-hidden group shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openView(prop)}
                >
                  {/* Imagem */}
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    {hasImages ? (
                      <>
                        <img src={currentImage!} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={prop.title} />
                        {images.length > 1 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); prevImage(prop.id, images.length); }}
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); nextImage(prop.id, images.length); }}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <span className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                              {currentIdx + 1}/{images.length}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                        <ImageIcon className="w-8 h-8 opacity-20" />
                        <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Sem foto</span>
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[prop.status] || "bg-slate-100 text-slate-600"}`}>
                      {statusOptions.find((s) => s.value === prop.status)?.label || prop.status}
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {(viewCounts as any)[prop.id] > 0 && (
                        <div className="flex items-center gap-1 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Eye className="w-2.5 h-2.5" />
                          {(viewCounts as any)[prop.id]}
                        </div>
                      )}
                      {(contactCounts as any)[prop.id] > 0 && (
                        <div className="flex items-center gap-1 bg-[#7E22CE]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Phone className="w-2.5 h-2.5" />
                          {(contactCounts as any)[prop.id]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-bold text-sm truncate mb-0.5">{prop.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize mb-2">
                      {typeOptions.find(t => t.value === prop.type)?.label || prop.type}
                    </p>
                    <p className="text-base font-black text-[#7E22CE] mb-2">{formatCurrency(Number(prop.price))}</p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-3">
                      {prop.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{prop.city}</span>}
                      {prop.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3 shrink-0" />{prop.bedrooms}q</span>}
                      {prop.area && <span className="flex items-center gap-1"><Maximize className="w-3 h-3 shrink-0" />{prop.area}m²</span>}
                    </div>
                    {/* Botões */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/imovel/${prop.id}`;
                          navigator.clipboard.writeText(link);
                          toast.success("Link copiado!");
                        }}>
                        <Share2 className="w-3 h-3" />Link
                      </Button>
                      {canEdit && (
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); openEdit(prop); }}>
                          <Pencil className="w-3 h-3 mr-1" />Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Modal visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Detalhes do Imóvel</DialogTitle></DialogHeader>
            {viewing && (
              <div className="grid gap-5 py-2">
                {/* Galeria */}
                {viewImages.length > 0 ? (
                  <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden">
                    <img src={viewImages[viewImageIndex].url} alt="" className="w-full h-full object-contain" />
                    {viewImages.length > 1 && (
                      <>
                        <button onClick={() => setViewImageIndex((p) => (p - 1 + viewImages.length) % viewImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewImageIndex((p) => (p + 1) % viewImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                          {viewImageIndex + 1}/{viewImages.length}
                        </span>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {viewImages.map((_, i) => (
                            <button key={i} onClick={() => setViewImageIndex(i)}
                              className={cn("w-1.5 h-1.5 rounded-full transition-all", i === viewImageIndex ? "bg-white w-3" : "bg-white/50")} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-slate-300" />
                  </div>
                )}

                {/* Dados */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div><p className="text-xs text-muted-foreground mb-0.5">Título</p><p className="font-semibold text-sm">{viewing.title}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">Preço</p><p className="font-bold text-[#7E22CE]">{formatCurrency(viewing.price)}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">Tipo</p><p className="text-sm capitalize">{typeOptions.find(t => t.value === viewing.type)?.label || viewing.type}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", statusColors[viewing.status] || "bg-gray-100 text-gray-700")}>
                      {statusOptions.find((s) => s.value === viewing.status)?.label || viewing.status}
                    </span>
                  </div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">Cidade</p><p className="text-sm">{viewing.city || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">Bairro</p><p className="text-sm">{viewing.neighborhood || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">Quartos</p><p className="text-sm">{viewing.bedrooms || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">Área (m²)</p><p className="text-sm">{viewing.area || "-"}</p></div>
                </div>

                {/* Localização no mapa (se tiver coordenadas) */}
                {(viewing.latitude && viewing.longitude) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Localização no Mapa</p>
                    <div className="bg-slate-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500 mb-2">
                        Coordenadas: {viewing.latitude.toFixed(6)}, {viewing.longitude.toFixed(6)}
                      </p>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${viewing.latitude}&mlon=${viewing.longitude}#map=15/${viewing.latitude}/${viewing.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#7E22CE] hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        Ver no mapa
                      </a>
                    </div>
                  </div>
                )}

                {viewing.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted rounded-lg p-3 border border-border text-foreground">{viewing.description}</p>
                  </div>
                )}

                {viewing.status === "vendido" && vendaInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-3">Informações da Venda</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-green-600">Data</p><p className="text-sm font-medium">{new Date(vendaInfo.created_at).toLocaleDateString("pt-BR")}</p></div>
                      <div><p className="text-xs text-green-600">Valor</p><p className="text-sm font-medium text-green-700">{formatCurrency(vendaInfo.value)}</p></div>
                      {vendaInfo.lead    && <div><p className="text-xs text-green-600">Comprador</p><p className="text-sm font-medium">{vendaInfo.lead.name}</p></div>}
                      {vendaInfo.corretor && <div><p className="text-xs text-green-600">Corretor</p><p className="text-sm font-medium">{vendaInfo.corretor.full_name}</p></div>}
                    </div>
                  </div>
                )}

                {/* Botões do modal */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="sm:order-first">
                    Fechar
                  </Button>
                  {canEditProp(viewing) && (
                    <Button variant="outline" onClick={() => { setViewDialogOpen(false); openEdit(viewing); }}>
                      <Pencil className="w-4 h-4 mr-2" />Editar
                    </Button>
                  )}
                  {canDeleteProp(viewing) && (
                    <Button variant="destructive" onClick={() => { setViewDialogOpen(false); handleDelete(viewing.id); }}>
                      <Trash2 className="w-4 h-4 mr-2" />Excluir
                    </Button>
                  )}
                  {(isImobiliaria || (isCorretor && viewing.created_by === profile?.id)) && viewing.status !== "vendido" && (
                    <Button className="bg-green-600 hover:bg-green-700"
                      onClick={() => { setVendaForm({ ...vendaForm, valor: viewing.price?.toString() || "" }); setVendaDialogOpen(true); }}>
                      <DollarSign className="w-4 h-4 mr-2" />Registrar venda
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo registrar venda */}
        <Dialog open={vendaDialogOpen} onOpenChange={setVendaDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Registrar venda do imóvel</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Lead (comprador) *</Label>
                <Select value={vendaForm.lead_id} onValueChange={(v) => setVendaForm({ ...vendaForm, lead_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                  <SelectContent>{leads?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isImobiliaria && (
                <div className="space-y-2">
                  <Label>Corretor responsável *</Label>
                  <Select value={vendaForm.corretor_id} onValueChange={(v) => setVendaForm({ ...vendaForm, corretor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
                    <SelectContent>
                      {profiles?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isCorretor && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Corretor responsável</p>
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Valor da venda *</Label>
                <Input type="number" value={vendaForm.valor} onChange={(e) => setVendaForm({ ...vendaForm, valor: e.target.value })} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Data da venda</Label>
                <Input type="date" value={vendaForm.data} onChange={(e) => setVendaForm({ ...vendaForm, data: e.target.value })} />
              </div>
              <Button onClick={handleRegistrarVenda} className="w-full bg-green-600 hover:bg-green-700">
                Confirmar venda
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </motion.div>
    </AppLayout>
  );
};

export default Properties;