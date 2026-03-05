import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import FAQ from "./pages/FAQ";
import Convite from "./pages/Convite";
import Home from "./pages/Home";
import Subscription from "./pages/Subscription";
import ChatBot from "@/components/ChatBot";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">
      Carregando...
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  if (!profile) return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">
      Carregando perfil...
    </div>
  );

  const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null;
  const now = new Date();
  const isExpired =
    profile.subscription_status === "expired" ||
    (profile.subscription_status === "trial" && trialEnd && trialEnd < now);

  if (isExpired && location.pathname !== "/subscription") {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return null;
  if (!user) return <>{children}</>;

  const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null;
  const now = new Date();
  const isExpired =
    profile?.subscription_status === "expired" ||
    (profile?.subscription_status === "trial" && trialEnd && trialEnd < now);

  if (isExpired) return <>{children}</>;

  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/convite/:token" element={<Convite />} />

            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
            <Route path="/funnel" element={<ProtectedRoute><Funnel /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/team/:id" element={<ProtectedRoute><TeamDetails /></ProtectedRoute>} />
            <Route path="/deal/:id" element={<ProtectedRoute><DealDetails /></ProtectedRoute>} />
            <Route path="/deal/:id/commissions" element={<ProtectedRoute><DealCommissionsEdit /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/calculators" element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
            <Route path="/advertise" element={<ProtectedRoute><Advertise /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatBot />
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;