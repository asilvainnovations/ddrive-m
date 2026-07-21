import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

// Layout
import AppLayout from "@/components/AppLayout";

// Pages/Modules (Imported directly from the ddrive structure as defined in your project tree)
import Dashboard from "@/components/ddrive/dashboardModule/Dashboard";
import RiskAssessment from "@/components/ddrive/diagnosisModule/RiskAssessment";
import PlanGenerator from "@/components/ddrive/documentsModule/PlanGenerator";
import PlanLibrary from "@/components/ddrive/documentsModule/PlanLibrary";
import Compliance from "@/components/ddrive/enhancementModule/Compliance";
import Collaboration from "@/components/ddrive/monitoringModule/Collaboration";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* AppLayout wraps all these routes, providing Sidebar, TopBar, and Background */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="risk-assessment" element={<RiskAssessment />} />
              <Route path="plan-generator" element={<PlanGenerator />} />
              <Route path="plan-library" element={<PlanLibrary />} />
              <Route path="compliance" element={<Compliance />} />
              <Route path="collaboration" element={<Collaboration />} />
              
              {/* Future routes can be added here following the same pattern (e.g., detection, response, etc.) */}
            </Route>
            
            {/* Catch-all route for 404 (outside AppLayout so it renders a clean error page) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;