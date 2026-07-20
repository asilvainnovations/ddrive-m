import React from 'react';

const RiskHeatMap: React.FC = () => {
  const risks = [
    { name: 'Cybersecurity', likelihood: 4, impact: 5 },
    { name: 'Supply Chain', likelihood: 3, impact: 4 },
    { name: 'Regulatory', likelihood: 5, impact: 3 },
    { name: 'Natural Disaster', likelihood: 2, impact: 5 },
    { name: 'Financial', likelihood: 3, impact: 3 },
    { name: 'Operational', likelihood: 4, impact: 2 },
  ];

  const getColor = (l: number, i: number) => {
    const score = l * i;
    if (score >= 15) return 'bg-red-600';
    if (score >= 10) return 'bg-orange-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Risk Heat Map</h3>
      <div className="grid grid-cols-6 gap-2">
        {[5, 4, 3, 2, 1].map((impact) => (
          <React.Fragment key={impact}>
            <div className="text-xs font-medium text-gray-600 flex items-center justify-center">
              {impact === 3 && 'Impact'}
            </div>
            {[1, 2, 3, 4, 5].map((likelihood) => (
              <div key={`${impact}-${likelihood}`} className="aspect-square relative">
                <div className={`w-full h-full ${getColor(likelihood, impact)} opacity-20 rounded`}></div>
                {risks.filter(r => r.likelihood === likelihood && r.impact === impact).map((risk, i) => (
                  <div key={i} className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-800">{risk.name.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            ))}
          </React.Fragment>
        ))}
        <div></div>
        {[1, 2, 3, 4, 5].map((l) => (
          <div key={l} className="text-xs font-medium text-gray-600 text-center">{l}</div>
        ))}
        <div className="col-span-6 text-xs font-medium text-gray-600 text-center mt-1">Likelihood</div>
      </div>
    </div>
  );
};

export default RiskHeatMap;
