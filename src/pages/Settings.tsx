import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  corretor: "Corretor",
  imobiliaria: "Imobiliária",
};

const Settings = () => {
  const { profile, isCorretor, isImobiliaria } = useAuth();
  const { canCreateProperties, canManageUsers, canViewAllLeads } = usePermissions();

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold mb-1">Configurações</h1>
        <p className="text-muted-foreground mb-6">Gerencie sua conta</p>

        <div className="space-y-6 max-w-2xl">
          {/* Perfil */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold mb-4">Perfil</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium text-card-foreground">{profile?.full_name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo de conta</p>
                <p className="font-medium text-card-foreground uppercase text-[#7E22CE]">
                  {roleLabels[profile?.role || ""] || "-"}
                </p>
              </div>
              {isCorretor && (
                <div>
                  <p className="text-muted-foreground">Vínculo</p>
                  <p className="font-medium text-card-foreground">
                    {profile?.company_id ? "Vinculado a uma imobiliária" : "Corretor independente"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Permissões */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Permissões do seu perfil
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <PermRow label="Gerenciar leads" allowed={true} />
              <PermRow label="Ver todos os leads" allowed={canViewAllLeads} />
              <PermRow label="Gerenciar imóveis" allowed={canCreateProperties} />
              <PermRow label="Gerenciar funil" allowed={true} />
              <PermRow label="Gerenciar equipe" allowed={canManageUsers} />
              <PermRow label="Ver relatórios gerais" allowed={isImobiliaria} />
            </div>
          </div>

          {/* Plano */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold mb-2">Plano atual</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                Free
              </span>
              <span className="text-sm text-muted-foreground">Funcionalidades básicas incluídas</span>
            </div>
            {isImobiliaria && (
              <p className="text-xs text-muted-foreground mt-3">
                Em breve: plano Pro com mais leads, relatórios avançados e convite de corretores.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
};

const PermRow = ({ label, allowed }: { label: string; allowed: boolean }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${allowed ? "bg-green-500" : "bg-slate-200"}`} />
    <span className={allowed ? "text-card-foreground" : "text-muted-foreground"}>{label}</span>
  </div>
);

export default Settings;