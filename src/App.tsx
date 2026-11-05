import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";
import { LEGACY_REDIRECTS } from "@/lib/modules";

// Each module is loaded only when it is opened, so the first screen stays small on slow connections.
const Dashboard = lazy(() => import("@/components/ddrive/dashboardModule/Dashboard"));
const Detection = lazy(() => import("@/components/ddrive/detectionModule/Detection"));
const Diagnosis = lazy(() => import("@/components/ddrive/diagnosisModule/Diagnosis"));
const Response = lazy(() => import("@/components/ddrive/responseModule/Response"));
const Integration = lazy(() => import("@/components/ddrive/IntegrationModule"));
const Validation = lazy(() => import("@/components/ddrive/ValidationModule"));
const Enhancement = lazy(() => import("@/components/ddrive/enhancementModule/Enhancement"));
const Monitoring = lazy(() => import("@/components/ddrive/monitoringModule/Monitoring"));
const Documents = lazy(() => import("@/components/ddrive/documentsModule/Documents"));
const Assistant = lazy(() => import("@/components/ddrive/AIChatbot"));
const Settings = lazy(() => import("@/components/ddrive/SettingsModule"));
const AnticipatoryAction = lazy(() => import("@/components/ddrive/anticipatoryModule/AnticipatoryAction"));

// Public pages: Home, policies and help. Readable without signing in.
import SiteLayout from "@/site/SiteLayout";
const Home = lazy(() => import("@/site/Home"));
const PolicyIndex = lazy(() => import("@/site/PolicyIndex"));
const PolicyPage = lazy(() => import("@/site/PolicyPage"));
const Support = lazy(() => import("@/site/Support"));
const Resources = lazy(() => import("@/site/Resources"));
const Contact = lazy(() => import("@/site/Contact"));
const ResetPassword = lazy(() => import("@/site/ResetPassword"));

const queryClient = new QueryClient();

const Loading = () => (
  <div role="status" className="p-8 text-sm text-slate-500 font-poppins">
    Loading…
  </div>
);

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route element={<SiteLayout />}>
                    <Route index element={<Home />} />
                    <Route path="policies" element={<PolicyIndex />} />
                    <Route path="policies/:slug" element={<PolicyPage />} />
                    <Route path="support" element={<Support />} />
                    <Route path="resources" element={<Resources />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="reset-password" element={<ResetPassword />} />
                    {/* Fixed policy addresses (Google OAuth consent screen, older ASilva links). Same page, no redirect. */}
                    <Route path="privacy-policy" element={<PolicyPage slug="privacy" />} />
                    <Route path="privacy" element={<PolicyPage slug="privacy" />} />
                    <Route path="terms-of-service" element={<PolicyPage slug="terms" />} />
                    <Route path="terms" element={<PolicyPage slug="terms" />} />
                    <Route path="cookie-policy" element={<PolicyPage slug="cookies" />} />
                    <Route path="accessibility-policy" element={<PolicyPage slug="accessibility" />} />
                    <Route path="ai-ethics" element={<PolicyPage slug="ai-ethics" />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  <Route element={<AppLayout />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="detection" element={<Detection />} />
                    <Route path="diagnosis" element={<Diagnosis />} />
                    <Route path="response" element={<Response />} />
                    <Route path="anticipatory-action" element={<AnticipatoryAction />} />
                    <Route path="integration" element={<Integration />} />
                    <Route path="validation" element={<Validation />} />
                    <Route path="enhancement" element={<Enhancement />} />
                    <Route path="monitoring" element={<Monitoring />} />
                    <Route path="documents" element={<Documents />} />
                    <Route path="assistant" element={<Assistant embedded />} />
                    <Route path="settings" element={<Settings />} />
                    {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
                      <Route key={from} path={from.slice(1)} element={<Navigate to={to} replace />} />
                    ))}
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
