import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { FileText, Download, Eye, Edit, Clock } from 'lucide-react';

const PlanLibrary: React.FC = () => {
  const [filter, setFilter] = useState('all');

  const plans = [
    { id: 1, name: 'DRRM Plan 2025', type: 'DRRM', status: 'Active', lastUpdated: '2025-01-15', version: '2.1' },
    { id: 2, name: 'Business Continuity Plan', type: 'BCM', status: 'Active', lastUpdated: '2024-12-10', version: '1.5' },
    { id: 3, name: 'Earthquake Response Plan', type: 'Contingency', status: 'Active', lastUpdated: '2025-01-20', version: '3.0' },
    { id: 4, name: 'IT Disaster Recovery', type: 'Recovery', status: 'Active', lastUpdated: '2024-11-30', version: '1.8' },
    { id: 5, name: 'Pandemic Response Plan', type: 'Contingency', status: 'Review', lastUpdated: '2024-10-15', version: '2.0' },
    { id: 6, name: 'Flood Mitigation Plan', type: 'DRRM', status: 'Active', lastUpdated: '2025-01-05', version: '1.3' },
    { id: 7, name: 'Cyber Incident Response', type: 'Contingency', status: 'Active', lastUpdated: '2024-12-20', version: '2.2' },
    { id: 8, name: 'Supply Chain Recovery', type: 'Recovery', status: 'Draft', lastUpdated: '2025-01-25', version: '0.9' },
  ];

  const filteredPlans = filter === 'all' ? plans : plans.filter(p => p.type === filter);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header title="Plan Library" />
        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Document Repository</h3>
              <p className="text-sm text-gray-600">Manage all organizational plans and templates</p>
            </div>
            <div className="flex gap-2">
              {['all', 'DRRM', 'BCM', 'Contingency', 'Recovery'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map(plan => (
              <div key={plan.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <FileText className="text-blue-600" size={32} />
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    plan.status === 'Active' ? 'bg-green-100 text-green-800' :
                    plan.status === 'Review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.status}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{plan.name}</h4>
                <p className="text-sm text-gray-600 mb-4">{plan.type} • Version {plan.version}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Clock size={14} />
                  <span>Updated {plan.lastUpdated}</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                    <Eye size={16} />
                    <span>View</span>
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                    <Edit size={16} className="text-gray-600" />
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                    <Download size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlanLibrary;
