import React, { useState } from 'react';
import { X, Edit2, Trash2, Save, AlertTriangle, Shield, Target } from 'lucide-react';
import { Risk, RiskCategory, getRiskLevel, getRiskLevelColor } from '@/types/risk';

interface RiskDetailModalProps {
  risk: Risk | null;
  categories: RiskCategory[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Risk>) => void;
  onDelete: (id: string) => void;
}

const RiskDetailModal: React.FC<RiskDetailModalProps> = ({ risk, categories, onClose, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Risk>>(risk || {});

  if (!risk) return null;

  const level = getRiskLevel(risk.likelihood * risk.impact);

  const handleSave = () => {
    onUpdate(risk.id, form);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Delete this risk?')) {
      onDelete(risk.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={24} />
            <h3 className="text-lg font-semibold">{risk.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(level)}`}>{level}</span>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button onClick={handleSave} className="p-2 bg-green-500 text-white rounded hover:bg-green-600"><Save size={18} /></button>
            ) : (
              <button onClick={() => { setForm(risk); setIsEditing(true); }} className="p-2 hover:bg-gray-200 rounded"><Edit2 size={18} /></button>
            )}
            <button onClick={handleDelete} className="p-2 hover:bg-red-100 text-red-500 rounded"><Trash2 size={18} /></button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded"><X size={18} /></button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{risk.likelihood * risk.impact}</div>
              <div className="text-xs text-gray-600">Risk Score</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-orange-600">{risk.likelihood}</div>
              <div className="text-xs text-gray-600">Likelihood</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-600">{risk.impact}</div>
              <div className="text-xs text-gray-600">Impact</div>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Risk Name" />
              <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Description" />
              <div className="grid grid-cols-2 gap-4">
                <select value={form.category_id || ''} onChange={e => setForm({...form, category_id: e.target.value})} className="px-3 py-2 border rounded-lg">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={form.owner || ''} onChange={e => setForm({...form, owner: e.target.value})} className="px-3 py-2 border rounded-lg" placeholder="Owner" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700">{risk.description || 'No description provided.'}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Category:</span> <span className="font-medium">{risk.category?.name || 'N/A'}</span></div>
                <div><span className="text-gray-500">Framework:</span> <span className="font-medium">{risk.framework}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="font-medium">{risk.status}</span></div>
                <div><span className="text-gray-500">Owner:</span> <span className="font-medium">{risk.owner || 'Unassigned'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskDetailModal;
