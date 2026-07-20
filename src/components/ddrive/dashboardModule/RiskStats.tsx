import React from 'react';
import { AlertTriangle, Shield, TrendingUp, Activity } from 'lucide-react';
import { Risk, getRiskLevel } from '@/types/risk';

interface RiskStatsProps {
  risks: Risk[];
}

const RiskStats: React.FC<RiskStatsProps> = ({ risks }) => {
  const criticalCount = risks.filter(r => getRiskLevel(r.likelihood * r.impact) === 'Critical').length;
  const highCount = risks.filter(r => getRiskLevel(r.likelihood * r.impact) === 'High').length;
  const avgScore = risks.length ? Math.round(risks.reduce((sum, r) => sum + r.likelihood * r.impact, 0) / risks.length) : 0;
  const activeCount = risks.filter(r => r.status === 'Active').length;

  const stats = [
    { label: 'Total Risks', value: risks.length, icon: Shield, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
    { label: 'Critical Risks', value: criticalCount, icon: AlertTriangle, color: 'bg-red-500', bgColor: 'bg-red-50' },
    { label: 'High Risks', value: highCount, icon: TrendingUp, color: 'bg-orange-500', bgColor: 'bg-orange-50' },
    { label: 'Avg Risk Score', value: avgScore, icon: Activity, color: 'bg-purple-500', bgColor: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, i) => (
        <div key={i} className={`${stat.bgColor} rounded-lg p-4 border border-gray-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`${stat.color} p-2 rounded-lg`}>
              <stat.icon size={20} className="text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RiskStats;
