import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicHeaderProps {
  showBack?: boolean;
  backTo?: string;
}

const PublicHeader = ({ showBack = false, backTo = "/auth" }: PublicHeaderProps) => {
  return (
    <header className="bg-[#7E22CE] py-4 px-6 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo-r2.svg" alt="R2 Tech" className="h-10 w-auto" />
          <span className="font-black text-white text-2xl tracking-tight uppercase hidden sm:block">CRM R2</span>
        </Link>
        {showBack && (
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-purple-600">
            <Link to={backTo}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
};

export default PublicHeader;