import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDeals } from "@/hooks/useCompanyData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, Home, User, Calendar, FileText, MessageSquare,
  Upload, ChevronRight, TrendingUp, CheckCircle2, Clock,
  AlertCircle, Paperclip, Send, Download, Share2, Building2,
} from "lucide-react";

const PROCESS_STATUS = [
  { value: "em_andamento",  label: "Em andamento",  color: "bg-blue-100 text-blue-700",     icon: Clock        },
  { value: "escritura",     label: "Escritura",      color: "bg-amber-100 text-amber-700",   icon: FileText     },
  { value: "financiamento", label: "Financiamento",  color: "bg-purple-100 text-purple-700", icon: Building2    },
  { value: "concluido",     label: "Concluído",      color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  { value: "cancelado",     label: "Cancelado",      color: "bg-red-100 text-red-700",       icon: AlertCircle  },
];

const formatCurrency = (val: number | null) =>
  val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "R$ 0,00";

const useDealDetails = (dealId: string | null) => {
  return useQuery({
    queryKey: ["deal_details", dealId],
    queryFn: async () => {
      if (!dealId) return null;
      const [activities, documents, deal] = await Promise.all([
        supabase.from("deal_activities" as any).select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
        supabase.from("deal_documents" as any).select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
        supabase.from("deals").select("*, leads(name, phone, email), properties(title, neighborhood, city, price)").eq("id", dealId).single(),
      ]);
      return {
        activities: (activities.data ?? []) as any[],
        documents:  (documents.data  ?? []) as any[],
        deal:       deal.data as any,
      };
    },
    enabled: !!dealId,
  });
};

const usePropertyImage = (propertyId: string | null) => {
  return useQuery({
    queryKey: ["property_first_image", propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const { data } = await (supabase
        .from("property_images" as any)
        .select("url")
        .eq("property_id", propertyId)
        .order("position")
        .limit(1)
        .single() as any);
      return data?.url ?? null;
    },
    enabled: !!propertyId,
  });
};

const SaleCard = ({ deal, onClick }: { deal: any; onClick: () => void }) => {
  const { data: imageUrl } = usePropertyImage(deal.property_id);
  const status     = PROCESS_STATUS.find(s => s.value === (deal.process_status ?? "em_andamento")) ?? PROCESS_STATUS[0];
  const StatusIcon = status.icon;
  const commission = deal.value ? (deal.value * ((deal.commission_rate ?? 6) / 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all group"
    >
      <div className="h-36 bg-slate-100 relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <div className={cn("absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1", status.color)}>
          <StatusIcon className="w-3 h-3" />{status.label}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="font-bold text-sm truncate">{deal.properties?.title || "Imóvel"}</p>
          {deal.properties?.city && (
            <p className="text-xs text-muted-foreground">{deal.properties.neighborhood ? `${deal.properties.neighborhood}, ` : ""}{deal.properties.city}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{deal.leads?.name || "Comprador não informado"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{deal.created_at ? format(parseISO(deal.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}</span>
        </div>
        <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground">Valor da venda</p>
            <p className="text-sm font-bold text-[#7E22CE]">{formatCurrency(deal.value)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Comissão ({deal.commission_rate ?? 6}%)</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(commission)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Ver detalhes</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};

const Sales = () => {
  const { profile, isImobiliaria, isCorretor } = useAuth();
  const queryClient = useQueryClient();
  const { data: deals, isLoading } = useDeals();

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [detailOpen,     setDetailOpen]     = useState(false);
  const [comment,        setComment]        = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [uploadingDoc,   setUploadingDoc]   = useState(false);

  const { data: details, isLoading: loadingDetails } = useDealDetails(selectedDealId);

  const sales       = deals?.filter((d: any) => d.stage === "fechado") ?? [];
  const totalVendas = sales.length;
  const totalValor  = sales.reduce((acc: number, d: any) => acc + (d.value ?? 0), 0);
  const totalComiss = sales.reduce((acc: number, d: any) => acc + (d.value ?? 0) * ((d.commission_rate ?? 6) / 100), 0);
  const concluidas  = sales.filter((d: any) => d.process_status === "concluido").length;

  const openDetail = (dealId: string) => { setSelectedDealId(dealId); setDetailOpen(true); };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedDealId) return;
    setSendingComment(true);
    try {
      const { error } = await supabase.from("deal_activities" as any).insert({
        deal_id: selectedDealId, user_id: profile!.id, type: "comment", content: comment.trim(),
      });
      if (error) throw error;
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["deal_details", selectedDealId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingComment(false);
    }
  };

  const handleChangeStatus = async (status: string) => {
    if (!selectedDealId) return;
    try {
      const { error } = await supabase.from("deals").update({ process_status: status } as any).eq("id", selectedDealId);
      if (error) throw error;
      await supabase.from("deal_activities" as any).insert({
        deal_id: selectedDealId, user_id: profile!.id, type: "status_change",
        content: `Status alterado para: ${PROCESS_STATUS.find(s => s.value === status)?.label}`,
      });
      queryClient.invalidateQueries({ queryKey: ["deal_details", selectedDealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Status atualizado!");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDealId) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo 10MB."); return; }
    setUploadingDoc(true);
    try {
      const ext      = file.name.split(".").pop();
      const fileName = `deals/${selectedDealId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("deal_documents" as any).insert({
        deal_id: selectedDealId, user_id: profile!.id, name: file.name, url: urlData.publicUrl, size: file.size,
      });
      if (dbError) throw dbError;
      await supabase.from("deal_activities" as any).insert({
        deal_id: selectedDealId, user_id: profile!.id, type: "document",
        content: `Documento adicionado: ${file.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["deal_details", selectedDealId] });
      toast.success("Documento enviado!");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    } finally { setUploadingDoc(false); e.target.value = ""; }
  };

  const handleShare = () => {
    if (!details?.deal) return;
    const d    = details.deal;
    const text = `*Proposta de Compra*\n\nImóvel: ${d.properties?.title}\nValor: ${formatCurrency(d.value)}\nComprador: ${d.leads?.name}\n\nGerado pelo CRM R2`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleUpdateCommission = async (rate: number) => {
    if (!selectedDealId) return;
    const { error } = await supabase.from("deals").update({ commission_rate: rate } as any).eq("id", selectedDealId);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["deal_details", selectedDealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Comissão atualizada!");
    }
  };

  const currentDeal = details?.deal;
  const canChangeStatus = isImobiliaria ||
    (isCorretor && currentDeal?.allow_corretor_status_change === true);
  const canToggleCorretorPermission = isImobiliaria;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        <div>
          <h1 className="text-2xl font-bold">{isImobiliaria ? "Vendas da Equipe" : "Minhas Vendas"}</h1>
          <p className="text-muted-foreground text-sm">
            {isImobiliaria ? "Acompanhe todas as vendas da imobiliária" : "Acompanhe o processo de cada negócio fechado"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total de vendas",  value: totalVendas,  color: "text-foreground" },
            { label: "Volume total",     value: new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL" }).format(totalValor),  color: "text-[#7E22CE]" },
            { label: "Total comissões",  value: new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL" }).format(totalComiss), color: "text-green-600"  },
            { label: "Concluídas",       value: `${concluidas}/${totalVendas}`, color: "text-amber-600" },
          ].map(m => (
            <div key={m.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <p className={cn("text-2xl font-bold", m.color)}>{m.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl bg-card text-center">
            <DollarSign className="w-14 h-14 text-muted-foreground/20 mb-4" />
            <p className="font-semibold text-slate-700 mb-1">Nenhuma venda ainda</p>
            <p className="text-sm text-muted-foreground">Registre vendas nos seus imóveis para acompanhar aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sales.map((deal: any) => <SaleCard key={deal.id} deal={deal} onClick={() => openDetail(deal.id)} />)}
          </div>
        )}

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />Detalhes da Venda
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="space-y-3 py-4">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}</div>
            ) : currentDeal ? (
              <div className="space-y-5 py-2">

                {/* Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1 bg-muted/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="w-4 h-4 text-[#7E22CE]" />
                      <span className="font-semibold">{currentDeal.properties?.title}</span>
                    </div>
                    {currentDeal.properties?.city && (
                      <p className="text-xs text-muted-foreground pl-6">{currentDeal.properties.neighborhood ? `${currentDeal.properties.neighborhood}, ` : ""}{currentDeal.properties.city}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-blue-500" />
                      <span>{currentDeal.leads?.name}</span>
                    </div>
                    {currentDeal.leads?.phone && <p className="text-xs text-muted-foreground pl-6">{currentDeal.leads.phone}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-muted/40 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor da venda</p>
                      <p className="text-xl font-bold text-[#7E22CE]">{formatCurrency(currentDeal.value)}</p>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Taxa de comissão (%)</p>
                        <Input
                          type="number"
                          defaultValue={currentDeal.commission_rate ?? 6}
                          min={0} max={100}
                          className="h-8 text-sm"
                          onBlur={(e) => {
                            const newRate     = parseFloat(e.target.value);
                            const currentRate = currentDeal.commission_rate ?? 6;
                            if (newRate !== currentRate) handleUpdateCommission(newRate);
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Comissão</p>
                        <p className="text-sm font-bold text-green-600">
                          {formatCurrency(currentDeal.value * ((currentDeal.commission_rate ?? 6) / 100))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status do processo</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROCESS_STATUS.map(s => {
                      const Icon     = s.icon;
                      const isActive = (currentDeal.process_status ?? "em_andamento") === s.value;
                      return (
                        <button key={s.value} onClick={() => handleChangeStatus(s.value)}
                          className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                            !canChangeStatus && "opacity-50 cursor-not-allowed",
                            isActive ? cn(s.color, "border-transparent") : "border-border text-muted-foreground hover:border-[#7E22CE]"
                          )}>
                          <Icon className="w-3 h-3" />{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Permissão do corretor — só imobiliária vê */}
                {canToggleCorretorPermission && (
                  <div className="flex items-center justify-between p-3 pr-4 bg-muted/40 rounded-xl border border-border">
                    <div>
                      <p className="text-sm font-medium">Permitir que o corretor altere status</p>
                      <p className="text-xs text-muted-foreground">O corretor atribuído poderá mudar o status desta venda</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !currentDeal?.allow_corretor_status_change;
                        await supabase.from("deals").update({ allow_corretor_status_change: newVal } as any).eq("id", selectedDealId!);
                        queryClient.invalidateQueries({ queryKey: ["deal_details", selectedDealId] });
                        queryClient.invalidateQueries({ queryKey: ["deals"] });
                        toast.success(newVal ? "Corretor pode alterar status!" : "Permissão removida.");
                      }}
                      className="shrink-0"
                    >
                      <div className={cn(
                        "w-11 h-6 rounded-full flex items-center px-0.5 transition-colors",
                        currentDeal?.allow_corretor_status_change ? "bg-[#7E22CE] justify-end" : "bg-slate-300 justify-start"
                      )}>
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Documentos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Paperclip className="w-4 h-4" /> Documentos</Label>
                    <label className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors", uploadingDoc && "opacity-50 pointer-events-none")}>
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingDoc ? "Enviando..." : "Adicionar"}
                      <input type="file" className="hidden" onChange={handleUploadDocument} disabled={uploadingDoc} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    </label>
                  </div>
                  {!details?.documents || details.documents.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Nenhum documento adicionado ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {details.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-lg">
                          <FileText className="w-4 h-4 text-[#7E22CE] shrink-0" />
                          <span className="text-xs flex-1 truncate">{doc.name}</span>
                          {doc.size && <span className="text-[10px] text-muted-foreground">{(doc.size / 1024).toFixed(0)}KB</span>}
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded transition-colors">
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comentários */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" /> Comentários
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escreva um comentário... (Enter para enviar)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                      className="flex-1"
                    />
                    <Button onClick={handleAddComment} disabled={sendingComment || !comment.trim()} size="icon" className="bg-[#7E22CE] hover:bg-[#6b21a8]">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {details?.activities.filter((a: any) => a.type === "comment").length === 0 ? (
                      <div className="text-center py-4 bg-muted/30 rounded-xl">
                        <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
                      </div>
                    ) : (
                      details?.activities.filter((a: any) => a.type === "comment").map((act: any) => (
                        <div key={act.id} className="flex gap-3 items-start p-3 rounded-xl border bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground leading-relaxed">{act.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-medium text-muted-foreground">{profile?.full_name || "Você"}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-[11px] text-muted-foreground">
                                {format(parseISO(act.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Histórico de atividades */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" /> Histórico de atividades
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {details?.activities.filter((a: any) => a.type !== "comment").length === 0 ? (
                      <div className="text-center py-4 bg-muted/30 rounded-xl">
                        <p className="text-xs text-muted-foreground">Nenhuma atividade registrada.</p>
                      </div>
                    ) : (
                      details?.activities.filter((a: any) => a.type !== "comment").map((act: any) => (
                        <div key={act.id} className={cn(
                          "flex gap-3 items-start p-3 rounded-xl border",
                          act.type === "document"
                            ? "bg-purple-50/50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30"
                            : "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30"
                        )}>
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            act.type === "document" ? "bg-purple-100" : "bg-amber-100"
                          )}>
                            {act.type === "document"
                              ? <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                              : <TrendingUp className="w-3.5 h-3.5 text-amber-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{act.content}</p>
                            <span className="text-[11px] text-muted-foreground">
                              {format(parseISO(act.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Compartilhar */}
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button variant="outline" onClick={handleShare} className="gap-2">
                    <Share2 className="w-4 h-4" />Compartilhar via WhatsApp
                  </Button>
                </div>

              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            )}
          </DialogContent>
        </Dialog>

      </motion.div>
    </AppLayout>
  );
};

export default Sales;