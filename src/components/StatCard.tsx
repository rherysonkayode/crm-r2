import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  // Adicionei o "warning" aqui para o cartão de Receita (Dourado) funcionar sem erros
  accentColor?: "primary" | "accent" | "success" | "info" | "warning"; 
}

// A nova paleta de cores baseada na Identidade R2 Tech
const colorMap = {
  primary: "bg-[#7E22CE]/10 text-[#7E22CE]", // Roxo Oficial (Leads)
  info: "bg-indigo-50 text-indigo-500",      // Azul/Roxo Suave (Imóveis)
  success: "bg-fuchsia-50 text-fuchsia-600", // Fúcsia/Rosa (Negócios Fechados)
  accent: "bg-purple-50 text-purple-600",    // Roxo Padrão
  warning: "bg-amber-50 text-amber-500",     // Dourado/Âmbar (Receita Total)
};

export const StatCard = ({ title, value, icon: Icon, description, accentColor = "primary" }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-purple-900/10 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-4xl font-black text-slate-900 tracking-tight">{value}</p>
          {description && (
            <p className="text-sm font-medium text-slate-400">{description}</p>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${colorMap[accentColor]}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </motion.div>
  );
};