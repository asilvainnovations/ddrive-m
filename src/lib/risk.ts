export interface RiskCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
}

export interface Risk {
  id: string;
  name: string;
  description: string;
  category_id: string;
  likelihood: number;
  impact: number;
  framework: 'ISO 31000' | 'COSO ERM' | 'DRRM' | 'NIST';
  status: 'Identified' | 'Active' | 'Monitoring' | 'Closed';
  owner: string;
  risk_score: number;
  created_at: string;
  updated_at: string;
  category?: RiskCategory;
}

export interface RiskTreatment {
  id: string;
  risk_id: string;
  treatment_type: 'Avoid' | 'Mitigate' | 'Transfer' | 'Accept';
  description: string;
  status: 'Planned' | 'In Progress' | 'Completed';
  due_date: string;
  responsible: string;
  created_at: string;
}

export interface RiskControl {
  id: string;
  risk_id: string;
  control_name: string;
  control_type: 'Preventive' | 'Detective' | 'Corrective';
  effectiveness: 'High' | 'Moderate' | 'Low';
  description: string;
  created_at: string;
}

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
};

export const getRiskLevelColor = (level: RiskLevel): string => {
  switch (level) {
    case 'Critical': return 'bg-red-500 text-white';
    case 'High': return 'bg-orange-500 text-white';
    case 'Medium': return 'bg-yellow-500 text-black';
    case 'Low': return 'bg-green-500 text-white';
  }
};
