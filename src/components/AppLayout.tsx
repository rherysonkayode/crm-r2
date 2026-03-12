import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { UserNav } from "./UserNav";
import { useTheme } from "@/contexts/ThemeContext";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Overlay escuro quando sidebar está aberta no mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 bg-card shadow-lg transform transition-transform duration-300
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">
        {/* Cabeçalho */}
        <header className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-muted lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="ml-4 font-bold text-lg text-foreground lg:hidden">CRM R2</span>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserNav />
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};