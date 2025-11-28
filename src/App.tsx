import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Tesoreria from "./pages/Tesoreria";
import Proyecciones from "./pages/Proyecciones";
import Acciones from "./pages/Acciones";
import Calendario from "./pages/Calendario";
import Configuracion from "./pages/Configuracion";
import Ayuda from "./pages/Ayuda";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/tesoreria" element={<Tesoreria />} />
          <Route path="/proyecciones" element={<Proyecciones />} />
          <Route path="/acciones" element={<Acciones />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
