import React, { useState } from 'react';
import { MapPin, Search, Layers, AlertTriangle, ExternalLink } from 'lucide-react';

const GeoRiskPanel: React.FC = () => {
  const [activeModule, setActiveModule] = useState('noah');

  const modules = [
    { id: 'noah', name: 'NOAH', desc: 'Know Your Hazards', url: 'https://noah.up.edu.ph/know-your-hazards' },
    { id: 'hazard', name: 'HazardHunter', desc: 'Municipal Level', url: 'https://hazardhunter.georisk.gov.ph/map' },
    { id: 'analytics', name: 'GeoAnalytics', desc: 'Barangay Level', url: 'https://geoanalytics.georisk.gov.ph/' },
    { id: 'faultfinder', name: 'PHIVOLCS', desc: 'Seismic Faults', url: 'https://maps.phivolcs.dost.gov.ph/' }
  ];

  const activeModuleData = modules.find(m => m.id === activeModule);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MapPin size={20} />
          GeoRisk Integration
        </h3>
        <p className="text-sm text-slate-300 mt-1">Philippine hazard assessment tools</p>
      </div>

      <div className="p-3 border-b bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeModule === module.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              {module.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 mb-4 border">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{activeModuleData?.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{activeModuleData?.desc}</p>
              <a
                href={activeModuleData?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Open Tool <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <span className="text-sm text-gray-700">Flood Susceptibility</span>
            <span className="text-sm font-semibold text-orange-600">Moderate</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="text-sm text-gray-700">Landslide Risk</span>
            <span className="text-sm font-semibold text-yellow-600">Low</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <span className="text-sm text-gray-700">Storm Surge</span>
            <span className="text-sm font-semibold text-red-600">High</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeoRiskPanel;
