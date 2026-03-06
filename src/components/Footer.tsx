import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} R2 TECH. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <Link to="/termos" className="text-slate-500 hover:text-[#7E22CE] transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="text-slate-500 hover:text-[#7E22CE] transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/faq" className="text-slate-500 hover:text-[#7E22CE] transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;