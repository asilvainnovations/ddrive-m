import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { FileText, Download, Sparkles } from 'lucide-react';

const PlanGenerator: React.FC = () => {
  const [planType, setPlanType] = useState('drrm');
  const [generating, setGenerating] = useState(false);

  const planTypes = [
    { id: 'drrm', name: 'DRRM Plan', desc: 'Disaster Risk Reduction & Management (RA 10121)' },
    { id: 'bcm', name: 'Business Continuity Plan', desc: 'ISO 22301 compliant continuity management' },
    { id: 'contingency', name: 'Contingency Plan', desc: 'Emergency response procedures' },
    { id: 'recovery', name: 'Recovery Plan', desc: 'Post-incident recovery strategies' },
  ];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert('Plan generated successfully! Ready for download.');
    }, 2000);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header title="Plan Generator" />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={24} />
                AI-Enhanced Plan Generation
              </h3>
              <p className="text-gray-600 mb-6">Generate comprehensive plans aligned with COSO ERM, ISO standards, and Philippine DRRM Law (RA 10121)</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {planTypes.map(type => (
                      <div
                        key={type.id}
                        onClick={() => setPlanType(type.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          planType === type.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <h4 className="font-semibold text-gray-900 mb-1">{type.name}</h4>
                        <p className="text-sm text-gray-600">{type.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter organization name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scope & Objectives</label>
                  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={4} placeholder="Describe the scope and objectives of this plan"></textarea>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleGenerate} disabled={generating} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                    {generating ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={20} />
                        <span>Generate Plan</span>
                      </>
                    )}
                  </button>
                  <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                    <Download size={20} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlanGenerator;
