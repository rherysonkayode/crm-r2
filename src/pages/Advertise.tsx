import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProperties } from "@/hooks/useCompanyData";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, Zap, Star, Crown, Megaphone, Phone, Mail, Building2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "Grátis",
    period: "",
    icon: Zap,
    color: "border-slate-200 bg-white",
    headerColor: "bg-slate-50",
    iconColor: "text-slate-500",
    badgeColor: "bg-slate-100 text-slate-600",
    features: [
      "1 anúncio ativo",
      "Fotos básicas (até 5)",
      "Listagem simples",
      "Sem destaque nos portais",
    ],
    missing: ["Portais parceiros", "Destaque premium", "Relatório de visitas"],
    cta: "Plano atual",
    disabled: true,
  },
  {
    id: "essencial",
    name: "Essencial",
    price: "R$ 97",
    period: "/mês",
    icon: Star,
    color: "border-purple-200 bg-white",
    headerColor: "bg-purple-50",
    iconColor: "text-purple-600",
    badgeColor: "bg-purple-100 text-purple-700",
    features: [
      "5 anúncios ativos",
      "Fotos ilimitadas",
      "ZAP Imóveis + OLX",
      "Relatório mensal de visitas",
      "Suporte por e-mail",
    ],
    missing: ["Destaque premium", "Viva Real"],
    cta: "Solicitar plano",
    disabled: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    icon: Crown,
    color: "border-[#7E22CE] bg-white ring-2 ring-[#7E22CE]/20",
    headerColor: "bg-[#7E22CE]",
    iconColor: "text-white",
    badgeColor: "bg-[#7E22CE] text-white",
    badge: "Mais popular",
    features: [
      "15 anúncios ativos",
      "Fotos + vídeo tour",
      "ZAP + OLX + Viva Real",
      "Destaque nos resultados",
      "Relatório semanal detalhado",
      "Suporte prioritário",
    ],
    missing: [],
    cta: "Solicitar plano",
    disabled: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 397",
    period: "/mês",
    icon: Megaphone,
    color: "border-amber-200 bg-white",
    headerColor: "bg-gradient-to-br from-amber-400 to-orange-500",
    iconColor: "text-white",
    badgeColor: "bg-amber-100 text-amber-700",
    features: [
      "Anúncios ilimitados",
      "Fotos + vídeo + tour 360°",
      "Todos os portais parceiros",
      "Destaque máximo (topo dos resultados)",
      "Relatório diário com leads",
      "Gerente de conta dedicado",
      "Integração com redes sociais",
    ],
    missing: [],
    cta: "Solicitar plano",
    disabled: false,
  },
];

const portais = [
  { name: "ZAP Imóveis", plans: ["essencial", "pro", "premium"] },
  { name: "OLX", plans: ["essencial", "pro", "premium"] },
  { name: "Viva Real", plans: ["pro", "premium"] },
  { name: "Instagram Ads", plans: ["premium"] },
  { name: "Google Ads", plans: ["premium"] },
];

type ContactMethod = "whatsapp" | "email";

const Advertise = () => {
  const { profile, isImobiliaria } = useAuth();
  const { data: properties } = useProperties();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [form, setForm] = useState({
    property_id: "",
    contact_whatsapp: "",
    contact_email: "",
    message: "",
  });

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") return;
    setSelectedPlan(planId);
    setDialogOpen(true);
  };

  const handleSolicitar = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    if (contactMethod === "whatsapp") {
      if (!form.contact_whatsapp) { toast.error("Informe seu WhatsApp"); return; }
      const msg = encodeURIComponent(
        `Olá! Sou ${profile?.full_name || "usuário"} do CRM R2 e gostaria de contratar o plano *${plan.name}* de anúncios.\n\nMeu WhatsApp: ${form.contact_whatsapp}\n${form.message ? `\nMensagem: ${form.message}` : ""}`
      );
      window.open(`https://wa.me/5500000000000?text=${msg}`, "_blank");
    } else {
      if (!form.contact_email) { toast.error("Informe seu e-mail"); return; }
      window.location.href = `mailto:contato@r2tech.com.br?subject=Solicitar Plano ${plan.name}&body=Olá! Sou ${profile?.full_name || "usuário"} e gostaria de contratar o plano ${plan.name}.%0D%0AMeu e-mail: ${form.contact_email}%0D%0A${form.message ? `Mensagem: ${form.message}` : ""}`;
    }

    toast.success("Redirecionando para contato!");
    setDialogOpen(false);
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-12">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-full text-xs font-bold text-purple-700 uppercase tracking-wider mb-4">
            <Megaphone className="w-3.5 h-3.5" />
            R2 Tech Mídia
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Anuncie seus imóveis
          </h1>
          <p className="text-slate-500 text-lg max-w-xl">
            Divulgue seu portfólio nos principais portais do Brasil e alcance mais compradores qualificados.
          </p>
        </div>

        {/* Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-12">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn("rounded-2xl border-2 overflow-hidden flex flex-col transition-all hover:shadow-lg", plan.color)}
              >
                {/* Header do card */}
                <div className={cn("p-5", plan.headerColor)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-2 rounded-xl", plan.id === "pro" ? "bg-white/20" : "bg-white/80")}>
                      <Icon className={cn("w-5 h-5", plan.iconColor)} />
                    </div>
                    {plan.badge && (
                      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", plan.badgeColor)}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className={cn("font-black text-lg", plan.id === "pro" ? "text-white" : "text-slate-900")}>{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={cn("text-2xl font-black", plan.id === "pro" ? "text-white" : "text-slate-900")}>{plan.price}</span>
                    <span className={cn("text-sm", plan.id === "pro" ? "text-white/70" : "text-slate-500")}>{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="p-5 flex-1 flex flex-col">
                  <ul className="space-y-2.5 mb-4 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300 line-through">
                        <Check className="w-4 h-4 text-slate-200 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={plan.disabled}
                    className={cn(
                      "w-full rounded-xl font-bold",
                      plan.id === "pro"
                        ? "bg-[#7E22CE] hover:bg-[#6b21a8] text-white"
                        : plan.id === "premium"
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white border-0"
                        : plan.disabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Portais parceiros */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-slate-900 mb-4 text-lg">Portais parceiros por plano</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Portal</th>
                  {plans.map(p => (
                    <th key={p.id} className="text-center py-2 px-3 text-slate-500 font-semibold">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {portais.map((portal) => (
                  <tr key={portal.name}>
                    <td className="py-3 pr-4 font-medium text-slate-700">{portal.name}</td>
                    {plans.map(p => (
                      <td key={p.id} className="text-center py-3 px-3">
                        {portal.plans.includes(p.id)
                          ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                          : <span className="text-slate-200 text-lg">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dialog de solicitação */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Solicitar plano {plans.find(p => p.id === selectedPlan)?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Como prefere que nossa equipe entre em contato?
              </p>

              {/* Escolha do canal */}
              <div className="flex gap-2">
                <button
                  onClick={() => setContactMethod("whatsapp")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                    contactMethod === "whatsapp"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-slate-100 text-slate-500"
                  )}
                >
                  <Phone className="w-4 h-4" /> WhatsApp
                </button>
                <button
                  onClick={() => setContactMethod("email")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                    contactMethod === "email"
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-slate-100 text-slate-500"
                  )}
                >
                  <Mail className="w-4 h-4" /> E-mail
                </button>
              </div>

              {contactMethod === "whatsapp" ? (
                <div className="space-y-2">
                  <Label>Seu WhatsApp</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={form.contact_whatsapp}
                    onChange={(e) => setForm(f => ({ ...f, contact_whatsapp: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Seu e-mail</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={form.contact_email}
                    onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  />
                </div>
              )}

              {properties && properties.length > 0 && (
                <div className="space-y-2">
                  <Label>Imóvel para anunciar (opcional)</Label>
                  <Select value={form.property_id} onValueChange={(v) => setForm(f => ({ ...f, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione um imóvel" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Mensagem (opcional)</Label>
                <Textarea
                  placeholder="Alguma dúvida ou informação adicional..."
                  value={form.message}
                  onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button onClick={handleSolicitar} className="w-full bg-[#7E22CE] hover:bg-[#6b21a8] text-white font-bold rounded-xl py-6">
                <MessageSquare className="w-4 h-4 mr-2" />
                Entrar em contato
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </motion.div>
    </AppLayout>
  );
};

export default Advertise;