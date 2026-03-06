import { useAuth } from "@/contexts/AuthContext";

export const usePermissions = () => {
  const { profile, isCorretor, isImobiliaria, isAdmin } = useAuth();

  const isCorretorIndependente = isCorretor && !profile?.company_id;
  const isCorretorVinculado = isCorretor && !!profile?.company_id;

  return {
    // Imóveis:
    // - Imobiliária: controle total
    // - Corretor independente: gerencia seus próprios imóveis
    // - Corretor vinculado: agora também pode criar/editar/excluir (regra ajustada)
    canCreateProperties: isImobiliaria || isCorretor, // QUALQUER corretor pode criar
    canEditProperties: isImobiliaria || isCorretor,   // QUALQUER corretor pode editar
    canDeleteProperties: isImobiliaria || isCorretor, // QUALQUER corretor pode excluir

    // Leads: todos criam, mas corretor só vê os seus
    canCreateLeads: true,
    canViewAllLeads: isImobiliaria,

    // Equipe: só imobiliária gerencia
    canManageUsers: isImobiliaria,

    // Configurações avançadas: só imobiliária/admin
    canManageCompany: isImobiliaria,

    // Helpers de tipo
    isCorretorIndependente,
    isCorretorVinculado,
    isCorretor,
    isImobiliaria,
    isAdmin,
  };
};