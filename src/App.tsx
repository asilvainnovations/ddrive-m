import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';

// Page imports (Wrappers or direct module imports based on your preference)
import Dashboard from '@/pages/Dashboard';
import RiskAssessment from '@/pages/RiskAssessment';
import PlanGenerator from '@/pages/PlanGenerator';
import PlanLibrary from '@/pages/PlanLibrary';
import Compliance from '@/pages/Compliance';
import Collaboration from '@/pages/Collaboration';
import NotFound from '@/pages/NotFound';

// Note: You can also import these directly from '@/components/ddrive/...' 
// if you don't use a separate 'pages' directory for them.

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* AppLayout wraps all child routes, providing Sidebar, TopBar, and Background */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="risk-assessment" element={<RiskAssessment />} />
          <Route path="plan-generator" element={<PlanGenerator />} />
          <Route path="plan-library" element={<PlanLibrary />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="collaboration" element={<Collaboration />} />
          
          {/* Add other module routes here as you build them out */}
          
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
