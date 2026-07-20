import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import COSOFramework from '@/components/compliance/COSOFramework';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';


const Compliance: React.FC = () => {
  const [showFramework, setShowFramework] = useState(false);

  const frameworks = [
    { name: 'COSO ERM 2017', compliance: 92, items: 20, completed: 18, pending: 2 },
    { name: 'ISO 31000:2018', compliance: 88, items: 15, completed: 13, pending: 2 },
    { name: 'ISO 22301:2019', compliance: 85, items: 18, completed: 15, pending: 3 },
    { name: 'DRRM Law (RA 10121)', compliance: 95, items: 25, completed: 24, pending: 1 },
  ];

  const requirements = [
    { id: 1, framework: 'COSO ERM', requirement: 'Risk Governance Structure', status: 'Compliant', dueDate: '2025-03-01' },
    { id: 2, framework: 'COSO ERM', requirement: 'Risk Culture Assessment', status: 'Pending', dueDate: '2025-02-15' },
    { id: 3, framework: 'ISO 31000', requirement: 'Risk Assessment Process', status: 'Compliant', dueDate: '2025-04-01' },
    { id: 4, framework: 'DRRM Law', requirement: 'Emergency Response Plan', status: 'Compliant', dueDate: '2025-06-01' },
    { id: 5, framework: 'ISO 22301', requirement: 'Business Impact Analysis', status: 'In Progress', dueDate: '2025-02-28' },
    { id: 6, framework: 'DRRM Law', requirement: 'Hazard Mapping', status: 'Compliant', dueDate: '2025-05-01' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header title="Compliance Dashboard" />
        <main className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {frameworks.map((fw, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">{fw.name}</h4>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Compliance</span>
                    <span className="font-semibold text-gray-900">{fw.compliance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${fw.compliance}%` }}></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{fw.completed}/{fw.items} Complete</span>
                  <span>{fw.pending} Pending</span>
                </div>
              </div>
            ))}
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Compliance Requirements</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Framework</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Requirement</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requirements.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{req.framework}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">{req.requirement}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {req.status === 'Compliant' ? (
                              <><CheckCircle size={16} className="text-green-600" /><span className="text-sm text-green-600">Compliant</span></>
                            ) : req.status === 'Pending' ? (
                              <><AlertCircle size={16} className="text-red-600" /><span className="text-sm text-red-600">Pending</span></>
                            ) : (
                              <><Clock size={16} className="text-yellow-600" /><span className="text-sm text-yellow-600">In Progress</span></>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <COSOFramework />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Compliance;
