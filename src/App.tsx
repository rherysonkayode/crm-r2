import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail from "./pages/ConfirmEmail";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Properties from "./pages/Properties";
import Funnel from "./pages/Funnel";
import CalendarPage from "./pages/CalendarPage";
import Team from "./pages/Team";
import TeamDetails from "./pages/TeamDetails";
import DealDetails from "./pages/DealDetails";
import DealCommissionsEdit from "./pages/DealCommissionsEdit";
import Settings from "./pages/Settings";
import Calculators from "./pages/Calculators";
import Advertise from "./pages/Advertise";
import Sales from "./pages/Sales";
import PropertyPublic from "./pages/PropertyPublic";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import FAQ from "./pages/FAQ";
import Convite from "./pages/Convite";
import Home from "./pages/Home";
import Subscription from "./pages/Subscription";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import ChatBot from "@/components/ChatBot";

const queryClient = new QueryClient();

// Redireciona superadmin direto para /admin, outros veem o Dashboard normal
const DashboardRouter = () => {
  const { profile } = useAuth();
  if (profile?.role === "superadmin") return <Navigate to="/admin" replace />;
  return <Dashboard />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();
  const [profileTimeout, setProfileTimeout] = useState(false);

  useEffect(() => {
    if (!loading && user && !profile && profileLoading) {
      const t = setTimeout(() => setProfileTimeout(true), 3000);
      return () => clearTimeout(t);
    }
    if (profile || !profileLoading) setProfileTimeout(false);
  }, [loading, user, profile, profileLoading]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
      Carregando...
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  if (profileLoading && !profileTimeout) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground text-sm">
      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      Carregando perfil...
    </div>
  );

  if (!profile) {
    if (location.pathname !== "/subscription") return <Navigate to="/subscription" replace />;
    return <>{children}</>;
  }

  // Superadmin: acesso irrestrito, sem verificação de plano
  if (profile.role === "superadmin") return <>{children}</>;

  const trialEnd  = profile.trial_end ? new Date(profile.trial_end) : null;
  const now       = new Date();
  const isExpired =
    profile.subscription_status === "expired" ||
    (profile.subscription_status === "trial" && trialEnd && trialEnd < now);

  if (isExpired && location.pathname !== "/subscription") {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

// Rota exclusiva superadmin
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user || profile?.role !== "superadmin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <>{children}</>;

  const trialEnd  = profile?.trial_end ? new Date(profile.trial_end) : null;
  const now       = new Date();
  const isExpired =
    profile?.subscription_status === "expired" ||
    (profile?.subscription_status === "trial" && trialEnd && trialEnd < now);

  if (isExpired) return <>{children}</>;

  // Superadmin vai para /admin ao tentar acessar rota pública
  if (profile?.role === "superadmin") return <Navigate to="/admin" replace />;

  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/"                      element={<Home />} />
              <Route path="/home"                  element={<Home />} />
              <Route path="/auth"                  element={<PublicRoute><Auth /></PublicRoute>} />
              <Route path="/forgot-password"       element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password"        element={<ResetPassword />} />
              <Route path="/confirmar-email"       element={<ConfirmEmail />} />
              <Route path="/termos"                element={<Termos />} />
              <Route path="/privacidade"           element={<Privacidade />} />
              <Route path="/faq"                   element={<FAQ />} />
              <Route path="/convite/:token"        element={<Convite />} />
              <Route path="/imovel/:id"             element={<PropertyPublic />} />
              <Route path="/imovel/:id"             element={<PropertyPublic />} />

              {/* Painel exclusivo do gestor */}
              <Route path="/admin"                 element={<SuperAdminRoute><AdminPanel /></SuperAdminRoute>} />

              <Route path="/subscription"          element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/dashboard"             element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
              <Route path="/leads"                 element={<ProtectedRoute><Leads /></ProtectedRoute>} />
              <Route path="/properties"            element={<ProtectedRoute><Properties /></ProtectedRoute>} />
              <Route path="/funnel"                element={<ProtectedRoute><Funnel /></ProtectedRoute>} />
              <Route path="/calendar"              element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/team"                  element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/team/:id"              element={<ProtectedRoute><TeamDetails /></ProtectedRoute>} />
              <Route path="/deal/:id"              element={<ProtectedRoute><DealDetails /></ProtectedRoute>} />
              <Route path="/deal/:id/commissions"  element={<ProtectedRoute><DealCommissionsEdit /></ProtectedRoute>} />
              <Route path="/settings"              element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/calculators"           element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
              <Route path="/advertise"             element={<ProtectedRoute><Advertise /></ProtectedRoute>} />
              <Route path="/sales"                element={<ProtectedRoute><Sales /></ProtectedRoute>} />

              <Route path="*"                      element={<NotFound />} />
            </Routes>
            <ChatBot />
          </ThemeProvider>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;