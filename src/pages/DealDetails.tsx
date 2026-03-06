import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDealCommissions } from "@/hooks/useDealCommissions";
import { useProfiles } from "@/hooks/useCompanyData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface simplificada para o Deal, compatível com o retorno do Supabase
interface Deal {
  id: string;
  title: string | null;
  value: number;
  stage: string;
  created_at: string;
  lead_id: string | null;
  property_id: string | null;
  assigned_to: string | null;
  parceiro_externo: string | null;
  comissao_parceiro: number | null;
  company_id: string;
  leads: { name: string } | null;
  properties: { title: string } | null;
  profiles: { full_name: string } | null;
}

const DealDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isImobiliaria } = useAuth();
  const { data: profiles } = useProfiles();
  const { commissions } = useDealCommissions(id);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchDeal();
  }, [id]);

  const fetchDeal = async () => {
    // Usamos 'as any' para contornar tipagem ausente
    const { data, error } = await (supabase
      .from("deals" as any)
      .select("*, leads(name), properties(title), profiles!deals_assigned_to_fkey(full_name)")
      .eq("id", id)
      .single() as any);

    if (error) {
      toast.error("Erro ao carregar negócio");
      navigate("/funnel");
    } else {
      // Cast para Deal
      setDeal(data as Deal);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7E22CE]" />
        </div>
      </AppLayout>
    );
  }

  if (!deal) return null;

  const totalComissoes = commissions?.reduce((acc, c) => acc + c.valor_comissao, 0) || 0;
  const saldoParaImobiliaria = deal.value - totalComissoes - (deal.comissao_parceiro || 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/funnel")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para funil
          </Button>
          <h1 className="text-2xl font-bold">Detalhes do Negócio</h1>
        </div>

        {/* Informações principais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Negócio</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Título</p>
              <p className="font-medium">{deal.title || deal.leads?.name || "Negócio"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="font-bold text-green-600">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(deal.value)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estágio</p>
              <Badge>{deal.stage}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de criação</p>
              <p>{format(new Date(deal.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lead</p>
              <p>{deal.leads?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Imóvel</p>
              <p>{deal.properties?.title || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Corretor responsável</p>
              <p>{deal.profiles?.full_name || "-"}</p>
            </div>
            {deal.parceiro_externo && (
              <div>
                <p className="text-sm text-muted-foreground">Parceiro externo</p>
                <p>{deal.parceiro_externo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repartição de comissões */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Repartição da Comissão
            </CardTitle>
            {isImobiliaria && deal.stage === "fechado" && (
              <Button asChild size="sm">
                <Link to={`/deal/${id}/commissions`}>Editar repartição</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {commissions && commissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corretor</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead>Valor da comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.corretor?.full_name || "Corretor"}</TableCell>
                      <TableCell>{c.percentual}%</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.valor_comissao)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma repartição de comissão registrada.
              </p>
            )}

            {deal.parceiro_externo && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">Parceiro externo: {deal.parceiro_externo}</p>
                <p className="text-sm">Comissão: {deal.comissao_parceiro}%</p>
              </div>
            )}

            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm font-semibold text-purple-700">Resumo financeiro</p>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total do negócio</p>
                  <p className="text-lg font-bold">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(deal.value)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total comissões</p>
                  <p className="text-lg font-bold text-red-600">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalComissoes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo imobiliária</p>
                  <p className="text-lg font-bold text-green-600">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saldoParaImobiliaria)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão para acessar perfil do corretor */}
        {deal.assigned_to && (
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <Link to={`/team/${deal.assigned_to}`}>Ver perfil do corretor</Link>
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DealDetails;