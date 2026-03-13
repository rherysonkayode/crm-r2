import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  accentColor?: "primary" | "accent" | "success" | "info" | "warning";
}

const colorMap = {
  primary: "bg-[#7E22CE]/10 text-[#7E22CE]",
  info:    "bg-indigo-50 text-indigo-500",
  success: "bg-fuchsia-50 text-fuchsia-600",
  accent:  "bg-purple-50 text-purple-600",
  warning: "bg-amber-50 text-amber-500",
};

export const StatCard = ({ title, value, icon: Icon, description, accentColor = "primary" }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] border border-slate-100 p-4 sm:p-6 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-purple-900/10 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Ícone em cima, alinhado à direita — não compete com o texto no mobile */}
      <div className="flex justify-end mb-3">
        <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${colorMap[accentColor]}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {/* Texto embaixo, ocupa largura total */}
      <div className="space-y-1">
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">
          {title}
        </p>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
          {value}
        </p>
        {description && (
          <p className="text-xs sm:text-sm font-medium text-slate-400">{description}</p>
        )}
      </div>
    </motion.div>
  );
};