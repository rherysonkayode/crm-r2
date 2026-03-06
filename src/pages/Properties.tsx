import { useState } from "react";
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
import { Plus, Search, Trash2, Pencil, MapPin, BedDouble, Maximize, Image as ImageIcon, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { usePermissions } from "@/hooks/usePermissions";
import { ImageUploadMultiple } from "@/components/ImageUploadMultiple";
import { cn } from "@/lib/utils";

const typeOptions = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "terreno", label: "Terreno" },
  { value: "comercial", label: "Comercial" },
  { value: "rural", label: "Rural" },
  { value: "cobertura", label: "Cobertura" },
];

const statusOptions = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "alugado", label: "Alugado" },
];

const statusColors: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  reservado: "bg-amber-100 text-amber-700",
  vendido: "bg-purple-100 text-purple-700",
  alugado: "bg-blue-100 text-blue-700",
};

interface VendaInfo {
  id: string;
  value: number;
  created_at: string;
  lead: { name: string } | null;
  corretor: { full_name: string } | null;
}

const Properties = () => {
  const { data: properties, isLoading } = useProperties();
  const { data: allImages, refetch: refetchImages } = useAllPropertyImages();
  const { data: leads } = useLeads();
  const { data: profiles } = useProfiles();
  const { profile } = useAuth();
  const { canCreateProperties } = usePermissions();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});
  const [tempImages, setTempImages] = useState<{ id: string; url: string; position: number }[]>([]);
  const [vendaInfo, setVendaInfo] = useState<VendaInfo | null>(null);
  const [viewImageIndex, setViewImageIndex] = useState(0);

  const [vendaDialogOpen, setVendaDialogOpen] = useState(false);
  const [vendaForm, setVendaForm] = useState({
    lead_id: "",
    corretor_id: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
  });

  const [form, setForm] = useState({
    title: "", price: "", neighborhood: "", city: "",
    type: "apartamento", status: "disponivel",
    bedrooms: "", area: "", description: "",
  });

  const resetForm = () => {
    setForm({
      title: "", price: "", neighborhood: "", city: "",
      type: "apartamento", status: "disponivel",
      bedrooms: "", area: "", description: "",
    });
    setEditing(null);
    setTempImages([]);
  };

  const openEdit = (prop: any) => {
    setForm({
      title: prop.title || "",
      price: prop.price?.toString() || "",
      neighborhood: prop.neighborhood || "",
      city: prop.city || "",
      type: prop.type || "apartamento",
      status: prop.status || "disponivel",
      bedrooms: prop.bedrooms?.toString() || "",
      area: prop.area?.toString() || "",
      description: prop.description || "",
    });
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
        .select(`
          id,
          value,
          created_at,
          leads (name),
          profiles!deals_assigned_to_fkey (full_name)
        `)
        .eq("property_id", prop.id)
        .eq("stage", "fechado")
        .maybeSingle() as any);

      if (!error && data) {
        setVendaInfo({
          id: data.id,
          value: data.value,
          created_at: data.created_at,
          lead: data.leads,
          corretor: data.profiles,
        });
      }
    }

    setViewDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!form.title) {
      toast.error("Título é obrigatório");
      return;
    }

    const payload = {
      title: form.title,
      price: form.price ? parseFloat(form.price) : null,
      neighborhood: form.neighborhood || null,
      city: form.city || null,
      type: form.type as any,
      status: form.status as any,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      area: form.area ? parseFloat(form.area) : null,
      description: form.description || null,
      company_id: profile.company_id ?? null,
      created_by: profile.id,
    };

    let savedPropertyId = editing?.id;

    if (editing) {
      const { error } = await supabase
        .from("properties")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("properties")
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar: " + error.message);
        return;
      }
      savedPropertyId = data.id;

      if (tempImages.length > 0) {
        for (const img of tempImages) {
          await (supabase
            .from("property_images" as any)
            .insert({
              property_id: savedPropertyId,
              url: img.url,
              position: img.position,
            }) as any);
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

  // ─── FUNÇÃO DE DELETAR CORRIGIDA E BLINDADA ────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    // 1. Verifica se o imóvel está preso a algum Negócio
    const { data: deals, error: checkError } = await supabase
      .from("deals")
      .select("id")
      .eq("property_id", id);

    if (checkError) {
      toast.error("Erro ao verificar vínculos do imóvel");
      return;
    }

    // 2. Se estiver preso, avisa o usuário e desvincula antes de apagar
    if (deals && deals.length > 0) {
      const confirmMsg = `Este imóvel está vinculado a ${deals.length} negócio(s). Deseja desvinculá-los e excluir?`;
      if (!confirm(confirmMsg)) return;

      const { error: updateError } = await supabase
        .from("deals")
        .update({ property_id: null })
        .eq("property_id", id);

      if (updateError) {
        toast.error("Erro ao desvincular negócios: " + updateError.message);
        return;
      }
    }

    // 3. Deleta o imóvel forçando a contagem para detectar erro de RLS (Permissão no Banco)
    const { error, count } = await supabase
      .from("properties")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      toast.error("Erro no banco: " + error.message);
      return;
    }

    if (count === 0) {
      toast.error("O banco de dados recusou a exclusão. Verifique as regras de RLS!");
      return;
    }

    toast.success("Imóvel excluído com sucesso!");
    
    // 4. O await aqui garante que a tela atualize na mesma hora
    await queryClient.invalidateQueries({ queryKey: ["properties"] });
  };

  const handleRegistrarVenda = async () => {
    if (!viewing) return;
    if (!vendaForm.lead_id || !vendaForm.corretor_id || !vendaForm.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        "https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/hyper-api/deals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lead_id: vendaForm.lead_id,
            property_id: viewing.id,
            value: parseFloat(vendaForm.valor),
            stage: "fechado",
            company_id: profile?.company_id,
            created_by: profile?.id,
            assigned_to: vendaForm.corretor_id,
          }),
        }
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success("Venda registrada com sucesso!");
      setVendaDialogOpen(false);
      setVendaForm({ lead_id: "", corretor_id: "", valor: "", data: new Date().toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setViewDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao registrar venda: " + error.message);
    }
  };

  const formatCurrency = (val: number | null) =>
    val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "-";

  const getImagesForProperty = (propertyId: string): PropertyImage[] => {
    if (!allImages) return [];
    return allImages.filter((img) => img.property_id === propertyId);
  };

  const filtered = properties?.filter((p: any) => {
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchType = filterType === "all" || p.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const nextImage = (propertyId: string, total: number) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) + 1) % total,
    }));
  };

  const prevImage = (propertyId: string, total: number) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) - 1 + total) % total,
    }));
  };

  const viewImages = viewing ? getImagesForProperty(viewing.id) : [];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Imóveis</h1>
            <p className="text-muted-foreground text-sm">Gerencie o portfólio de imóveis da empresa</p>
          </div>

          {canCreateProperties && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#7E22CE] hover:bg-[#6b21a8]">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Imóvel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Fotos do Imóvel</Label>
                    {editing && editing.id ? (
                      <ImageUploadMultiple
                        propertyId={editing.id}
                        images={getImagesForProperty(editing.id)}
                        onUploadSuccess={async (url) => {
                          const { error } = await (supabase
                            .from("property_images" as any)
                            .insert({
                              property_id: editing.id,
                              url,
                              position: getImagesForProperty(editing.id).length,
                            }) as any);
                          if (!error) {
                            await refetchImages();
                            toast.success("Imagem adicionada!");
                          } else {
                            toast.error("Erro ao salvar imagem: " + error.message);
                          }
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
                        onUploadSuccess={(url) => {
                          setTempImages((prev) => [...prev, { id: `temp-${Date.now()}`, url, position: prev.length }]);
                        }}
                        onRemove={(imageId) => {
                          setTempImages((prev) => prev.filter((img) => img.id !== imageId));
                        }}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Preço (R$)</Label>
                      <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Bairro</Label><Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Quartos</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Área (m²)</Label><Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <textarea
                      className="w-full min-h-[100px] p-2 border rounded-md"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Detalhes do imóvel..."
                    />
                  </div>
                  <Button onClick={handleSave} className="bg-[#7E22CE] hover:bg-[#6b21a8]">{editing ? "Salvar" : "Criar"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((prop: any) => {
            const images = getImagesForProperty(prop.id);
            const currentIdx = currentImageIndex[prop.id] || 0;
            const hasImages = images.length > 0;
            const currentImage = hasImages ? images[currentIdx].url : null;

            return (
              <motion.div
                key={prop.id}
                className="bg-card rounded-xl border border-border overflow-hidden group shadow-sm cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openView(prop)}
              >
                <div className="h-40 bg-slate-100 relative">
                  {hasImages ? (
                    <>
                      <img src={currentImage!} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); prevImage(prop.id, images.length); }}
                            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); nextImage(prop.id, images.length); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {currentIdx + 1}/{images.length}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                      <ImageIcon className="w-8 h-8 opacity-20" />
                      <span className="text-[10px] font-bold opacity-30 uppercase">Sem foto</span>
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[prop.status] || "bg-slate-100 text-slate-600"}`}>
                    {statusOptions.find((s) => s.value === prop.status)?.label || prop.status}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-sm truncate">{prop.title}</h3>
                  <p className="text-xs text-muted-foreground capitalize mb-2">{prop.type}</p>
                  <p className="text-lg font-black text-[#7E22CE] mb-3">{formatCurrency(Number(prop.price))}</p>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {prop.city}</span>
                    {prop.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> {prop.bedrooms}q</span>}
                    {prop.area && <span className="flex items-center gap-1"><Maximize className="w-3 h-3" /> {prop.area}m²</span>}
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); openEdit(prop); }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Modal de visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Imóvel</DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="grid gap-6 py-4">
                {viewImages.length > 0 ? (
                  <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                    <img src={viewImages[viewImageIndex].url} alt="" className="w-full h-full object-contain" />
                    {viewImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setViewImageIndex((prev) => (prev - 1 + viewImages.length) % viewImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setViewImageIndex((prev) => (prev + 1) % viewImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                          {viewImageIndex + 1}/{viewImages.length}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-12 h-12 opacity-30" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Título</p>
                    <p className="font-medium">{viewing.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço</p>
                    <p className="font-bold text-[#7E22CE]">{formatCurrency(viewing.price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="capitalize">{viewing.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", statusColors[viewing.status] || "bg-gray-100 text-gray-700")}>
                      {statusOptions.find((s) => s.value === viewing.status)?.label || viewing.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cidade</p>
                    <p>{viewing.city || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bairro</p>
                    <p>{viewing.neighborhood || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quartos</p>
                    <p>{viewing.bedrooms || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Área (m²)</p>
                    <p>{viewing.area || "-"}</p>
                  </div>
                </div>

                {viewing.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm whitespace-pre-wrap">{viewing.description}</p>
                  </div>
                )}

                {viewing.status === "vendido" && vendaInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-3">Informações da Venda</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-green-600">Data da venda</p>
                        <p className="text-sm font-medium">{new Date(vendaInfo.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600">Valor da venda</p>
                        <p className="text-sm font-medium text-green-700">{formatCurrency(vendaInfo.value)}</p>
                      </div>
                      {vendaInfo.lead && (
                        <div>
                          <p className="text-xs text-green-600">Comprador</p>
                          <p className="text-sm font-medium">{vendaInfo.lead.name}</p>
                        </div>
                      )}
                      {vendaInfo.corretor && (
                        <div>
                          <p className="text-xs text-green-600">Corretor responsável</p>
                          <p className="text-sm font-medium">{vendaInfo.corretor.full_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  {viewing.status !== "vendido" && (
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setVendaForm({ ...vendaForm, valor: viewing.price?.toString() || "" });
                        setVendaDialogOpen(true);
                      }}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Registrar venda
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                  <Button variant="default" onClick={() => { setViewDialogOpen(false); openEdit(viewing); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { setViewDialogOpen(false); handleDelete(viewing.id); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo registrar venda */}
        <Dialog open={vendaDialogOpen} onOpenChange={setVendaDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar venda do imóvel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Lead (comprador) *</Label>
                <Select value={vendaForm.lead_id} onValueChange={(v) => setVendaForm({ ...vendaForm, lead_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                  <SelectContent>
                    {leads?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Corretor responsável *</Label>
                <Select value={vendaForm.corretor_id} onValueChange={(v) => setVendaForm({ ...vendaForm, corretor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
                  <SelectContent>
                    {profiles?.filter((p: any) => p.role === "corretor").map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor da venda *</Label>
                <Input
                  type="number"
                  value={vendaForm.valor}
                  onChange={(e) => setVendaForm({ ...vendaForm, valor: e.target.value })}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data da venda</Label>
                <Input
                  type="date"
                  value={vendaForm.data}
                  onChange={(e) => setVendaForm({ ...vendaForm, data: e.target.value })}
                />
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