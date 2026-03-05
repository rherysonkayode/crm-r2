import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDeals, useLeads } from "@/hooks/useCompanyData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Edit, Save, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Corretor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  creci: string | null;
  equipe: string | null;
  observations: string | null;
  status: string;
  role: string;
  company_id: string;
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
  avatar_url: string | null;
}

const TeamDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isImobiliaria } = useAuth();
  const { data: deals } = useDeals();
  const { data: leads } = useLeads();

  const [corretor, setCorretor] = useState<Corretor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    cpf: "",
    creci: "",
    equipe: "",
    observations: "",
  });

  // Buscar comissões recebidas pelo corretor
  const { data: commissionsByCorretor } = useQuery({
    queryKey: ["corretor_commissions", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await (supabase
        .from("deal_commissions" as any)
        .select(`
          *,
          deals (
            value,
            created_at,
            leads (name),
            properties (title)
          )
        `)
        .eq("corretor_id", id) as any);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!id || !isImobiliaria) return;
    fetchCorretor();
  }, [id]);

  const fetchCorretor = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erro ao carregar dados do corretor");
      navigate("/team");
    } else {
      const corretorData = data as any as Corretor;
      setCorretor(corretorData);
      setEditForm({
        full_name: corretorData.full_name,
        email: corretorData.email || "",
        phone: corretorData.phone || "",
        cpf: corretorData.cpf || "",
        creci: corretorData.creci || "",
        equipe: corretorData.equipe || "",
        observations: corretorData.observations || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `https://ecmahLxwttfeatvpxwng.supabase.co/functions/v1/hyper-api/users?id=${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...editForm,
            company_id: profile?.company_id,
            invited_by: profile?.id,
          }),
        }
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success("Corretor atualizado!");
      setEditing(false);
      fetchCorretor();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  // Negócios fechados pelo corretor (considerando apenas os deals onde ele é assigned_to)
  const negociosFechados = deals?.filter(d => {
    const lead = leads?.find(l => l.id === d.lead_id);
    return lead?.assigned_to === id && d.stage === "fechado";
  }) ?? [];

  const totalVendas = negociosFechados.length;
  const valorTotal = negociosFechados.reduce((acc, d) => acc + (Number(d.value) || 0), 0);
  const comissaoEstimada = valorTotal * 0.05; // 5% de exemplo

  // Total de comissão recebida (vindo da tabela deal_commissions)
  const totalComissaoRecebida = commissionsByCorretor?.reduce((acc: number, c: any) => acc + c.valor_comissao, 0) || 0;

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

  if (!corretor) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/team")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para equipe
          </Button>
          <h1 className="text-2xl font-bold">Detalhes do Corretor</h1>
        </div>

        {/* Informações básicas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informações Pessoais</CardTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={editForm.cpf}
                    onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CRECI</Label>
                  <Input
                    value={editForm.creci}
                    onChange={(e) => setEditForm({ ...editForm, creci: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equipe</Label>
                  <Input
                    value={editForm.equipe}
                    onChange={(e) => setEditForm({ ...editForm, equipe: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={4}
                    value={editForm.observations}
                    onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                    placeholder="Anotações sobre o corretor..."
                  />
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button onClick={handleSave} className="bg-[#7E22CE] hover:bg-[#6b21a8]">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{corretor.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p>{corretor.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p>{corretor.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p>{corretor.cpf || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CRECI</p>
                  <p>{corretor.creci || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Equipe</p>
                  <p>{corretor.equipe || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={corretor.status === "ativo" ? "default" : "secondary"}>
                    {corretor.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {corretor.observations && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Observações</p>
                    <p className="whitespace-pre-wrap">{corretor.observations}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Métricas de vendas */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total de vendas</p>
                <p className="text-2xl font-bold">{totalVendas}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor total vendido</p>
                <p className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorTotal)}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Comissão estimada (5%)</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(comissaoEstimada)}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Comissão recebida</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalComissaoRecebida)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de vendas (negócios fechados) */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            {negociosFechados.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma venda registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Imóvel</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Comissão (5%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {negociosFechados.map((deal) => {
                      const lead = leads?.find(l => l.id === deal.lead_id);
                      return (
                        <TableRow key={deal.id}>
                          <TableCell>{format(new Date(deal.created_at), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{deal.properties?.title || "-"}</TableCell>
                          <TableCell>{lead?.name || "-"}</TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(deal.value) || 0)}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(deal.value) || 0) * 0.05)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TeamDetails;