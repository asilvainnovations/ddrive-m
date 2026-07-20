import React from 'react';
import { Risk, getRiskLevel, getRiskLevelColor } from '@/types/risk';

interface RiskMatrixProps {
  risks: Risk[];
  onRiskClick: (risk: Risk) => void;
}

const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks, onRiskClick }) => {
  const getCellColor = (l: number, i: number) => {
    const score = l * i;
    if (score >= 15) return 'bg-red-100 hover:bg-red-200';
    if (score >= 10) return 'bg-orange-100 hover:bg-orange-200';
    if (score >= 6) return 'bg-yellow-100 hover:bg-yellow-200';
    return 'bg-green-100 hover:bg-green-200';
  };

  const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Risk Assessment Matrix</h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-green-100 rounded">Low</span>
          <span className="px-2 py-1 bg-yellow-100 rounded">Medium</span>
          <span className="px-2 py-1 bg-orange-100 rounded">High</span>
          <span className="px-2 py-1 bg-red-100 rounded">Critical</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-slate-800 text-white text-xs">Likelihood / Impact</th>
              {impactLabels.map((label, i) => (
                <th key={i} className="border p-2 bg-slate-700 text-white text-xs">{i + 1}<br/><span className="font-normal">{label}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map(likelihood => (
              <tr key={likelihood}>
                <td className="border p-2 bg-slate-700 text-white text-xs text-center font-semibold">
                  {likelihood}<br/><span className="font-normal">{likelihoodLabels[likelihood - 1]}</span>
                </td>
                {[1, 2, 3, 4, 5].map(impact => {
                  const cellRisks = risks.filter(r => r.likelihood === likelihood && r.impact === impact);
                  return (
                    <td key={impact} className={`border p-2 ${getCellColor(likelihood, impact)} min-w-[100px] align-top`}>
                      <div className="text-center text-xs text-gray-500 mb-1">{likelihood * impact}</div>
                      {cellRisks.map(risk => (
                        <div key={risk.id} onClick={() => onRiskClick(risk)}
                          className="text-xs mb-1 p-1 bg-white rounded shadow-sm hover:shadow-md cursor-pointer transition-all truncate">
                          {risk.name}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskMatrix;
