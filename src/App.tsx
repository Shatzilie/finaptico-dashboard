import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { RequireAuth } from "./context/AuthContext";
import LoginPage from "./pages/Login";
import Index from "./pages/Index";
import Tesoreria from "./pages/Tesoreria";
import Proyecciones from "./pages/Proyecciones";
import Acciones from "./pages/Acciones";
import Calendario from "./pages/Calendario";
import Configuracion from "./pages/Configuracion";
import Ayuda from "./pages/Ayuda";
import AdminTaxFilings from "./pages/AdminTaxFilings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/tesoreria" element={<Tesoreria />} />
                <Route path="/proyecciones" element={<Proyecciones />} />
                <Route path="/acciones" element={<Acciones />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/ayuda" element={<Ayuda />} />
                <Route path="/admin/tax-filings" element={<AdminTaxFilings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RequireAuth>
          }
        />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
