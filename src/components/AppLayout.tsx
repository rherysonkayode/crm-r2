import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
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
          fixed inset-y-0 left-0 z-30 bg-white shadow-lg transform transition-transform duration-300
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">
        {/* Cabeçalho mobile com botão hambúrguer */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-4 font-bold text-lg">CRM R2</span>
        </div>

        {/* Área de conteúdo */}
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};