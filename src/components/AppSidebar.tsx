import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, GitBranch, LogOut,
  ChevronLeft, ChevronRight, UserPlus, Settings,
  CalendarDays, Calculator, PlusCircle, X, CreditCard, Crown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useState } from "react";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin:      "Administrador",
  corretor:   "Corretor",
  imobiliaria:"Imobiliária",
  superadmin: "Super Admin",
};

interface AppSidebarProps {
  onClose?: () => void;
}

export const AppSidebar = ({ onClose }: AppSidebarProps) => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { canManageUsers } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);

  const currentRole = profile?.role?.toLowerCase() || "";
  const isImobiliaria = currentRole === "imobiliaria" || currentRole === "admin";
  const isSuperAdmin  = currentRole === "superadmin";

  const navItems = [
    // Superadmin vê só o painel admin
    { icon: Crown,          label: "Painel Admin",   path: "/admin",       visible: isSuperAdmin },

    // Clientes normais
    { icon: LayoutDashboard,label: "Dashboard",      path: "/dashboard",   visible: !isSuperAdmin },
    { icon: Users,          label: "Leads",          path: "/leads",       visible: !isSuperAdmin },
    { icon: Building2,      label: "Imóveis",        path: "/properties",  visible: !isSuperAdmin },
    { icon: CalendarDays,   label: "Calendário",     path: "/calendar",    visible: !isSuperAdmin },
    { icon: GitBranch,      label: "Funil",          path: "/funnel",      visible: !isSuperAdmin },
    { icon: PlusCircle,     label: "Anuncie Comigo", path: "/advertise",   visible: !isSuperAdmin },
    { icon: Calculator,     label: "Calculadoras",   path: "/calculators", visible: !isSuperAdmin },
    { icon: UserPlus,       label: "Equipe",         path: "/team",        visible: !isSuperAdmin && isImobiliaria },
    { icon: CreditCard,     label: "Assinatura",     path: "/subscription",visible: !isSuperAdmin },
    { icon: Settings,       label: "Configurações",  path: "/settings",    visible: !isSuperAdmin },
  ];

  const handleLinkClick = () => { if (onClose) onClose(); };
  const handleLogout = () => { signOut(); if (onClose) onClose(); };

  return (
    <div
      className={cn(
        "bg-[#0B1120] flex flex-col border-r border-slate-800/60 transition-all duration-300 h-full",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 px-5 py-6 border-b border-slate-800/60">
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/logo-r2.svg"
            alt="R2 Tech"
            className={cn(
              "h-auto rounded-xl shadow-lg shadow-black/20 transition-all duration-300",
              collapsed ? "w-10" : "w-12"
            )}
          />
          {!collapsed && (
            <span className="font-black text-white text-xl tracking-tight uppercase truncate">CRM R2</span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Badge superadmin */}
      {isSuperAdmin && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-1.5 bg-[#7E22CE]/20 border border-[#7E22CE]/30 rounded-lg flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-[#7E22CE]" />
          <span className="text-[11px] text-[#7E22CE] font-bold">Acesso total</span>
        </div>
      )}

      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems
          .filter(i => i.visible)
          .map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group",
                  isActive
                    ? "bg-[#7E22CE] text-white shadow-lg shadow-purple-900/20"
                    : "text-slate-400 hover:bg-[#7E22CE]/10 hover:text-[#7E22CE]"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-[#7E22CE]")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-slate-800/60 p-4 space-y-3">
        {!collapsed && profile && (
          <div className="px-3 py-2.5 mb-2 bg-slate-900/50 border border-slate-800/50 rounded-xl">
            <p className="text-sm font-bold text-slate-200 truncate">{profile.full_name || "Usuário"}</p>
            <p className="text-xs text-[#7E22CE] truncate font-bold uppercase mt-0.5">
              {roleLabels[currentRole] || currentRole}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full group",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:text-red-400" />
          {!collapsed && <span>Sair do sistema</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-full py-2 mt-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};