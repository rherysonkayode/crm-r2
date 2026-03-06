import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useCompanyData";
import { useDealCommissions } from "@/hooks/useDealCommissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

const DealCommissionsEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isImobiliaria } = useAuth();
  const { data: profiles } = useProfiles();
  const { commissions, addCommissions } = useDealCommissions(id);
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<{ corretor_id: string; percentual: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchDeal();
  }, [id]);

  useEffect(() => {
    if (commissions && commissions.length > 0) {
      // Carregar comissões existentes no estado
      setEntries(
        commissions.map(c => ({
          corretor_id: c.corretor_id,
          percentual: c.percentual.toString(),
        }))
      );
    }
  }, [commissions]);

  const fetchDeal = async () => {
    const { data, error } = await supabase
      .from("deals")
      .select("value, stage")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erro ao carregar negócio");
      navigate("/funnel");
    } else {
      setDeal(data);
    }
    setLoading(false);
  };

  if (!isImobiliaria) {
    return (
      <AppLayout>
        <div className="p-8 text-center">Acesso restrito.</div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7E22CE]" />
        </div>
      </AppLayout>
    );
  }

  if (!deal || deal.stage !== "fechado") {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-lg font-medium">Negócio não está fechado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/deal/${id}`)}>
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const addEntry = () => {
    setEntries([...entries, { corretor_id: "", percentual: "" }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof typeof entries[0], value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSave = async () => {
    // Validar percentuais
    let total = 0;
    for (const e of entries) {
      const p = parseFloat(e.percentual);
      if (isNaN(p) || p <= 0) {
        toast.error("Percentuais devem ser números positivos");
        return;
      }
      total += p;
    }
    if (total > 100) {
      toast.error("A soma dos percentuais não pode ultrapassar 100%");
      return;
    }

    // Preparar dados para envio
    const commissionsData = entries.map(e => ({
      corretor_id: e.corretor_id,
      percentual: parseFloat(e.percentual),
    }));

    await addCommissions.mutateAsync(commissionsData);
    navigate(`/deal/${id}`);
  };

  const corretores = profiles?.filter(p => p.role === "corretor" && p.company_id === deal?.company_id) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/deal/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Editar Repartição de Comissão</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Distribuir comissão entre corretores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Valor do negócio: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(deal.value)}
            </p>

            {entries.map((entry, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Corretor</Label>
                  <Select
                    value={entry.corretor_id}
                    onValueChange={(v) => updateEntry(index, "corretor_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {corretores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-2">
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={entry.percentual}
                    onChange={(e) => updateEntry(index, "percentual", e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEntry(index)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}

            <Button variant="outline" onClick={addEntry} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar corretor
            </Button>

            <div className="pt-4 flex gap-2">
              <Button onClick={handleSave} className="bg-[#7E22CE] hover:bg-[#6b21a8]" disabled={addCommissions.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {addCommissions.isPending ? "Salvando..." : "Salvar repartição"}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/deal/${id}`)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DealCommissionsEdit;