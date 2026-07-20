import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RiskCategory } from '@/types/risk';

interface AddRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (risk: any) => void;
  categories: RiskCategory[];
}

const AddRiskModal: React.FC<AddRiskModalProps> = ({ isOpen, onClose, onSubmit, categories }) => {
  const [form, setForm] = useState({
    name: '', description: '', category_id: '', likelihood: 3, impact: 3,
    framework: 'ISO 31000', status: 'Identified', owner: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setForm({ name: '', description: '', category_id: '', likelihood: 3, impact: 3, framework: 'ISO 31000', status: 'Identified', owner: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Add New Risk</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Risk Name *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Framework</label>
              <select value={form.framework} onChange={e => setForm({...form, framework: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg">
                <option>ISO 31000</option><option>COSO ERM</option><option>DRRM</option><option>NIST</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Likelihood (1-5)</label>
              <input type="range" min="1" max="5" value={form.likelihood}
                onChange={e => setForm({...form, likelihood: +e.target.value})} className="w-full" />
              <span className="text-sm text-gray-600">{form.likelihood}</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Impact (1-5)</label>
              <input type="range" min="1" max="5" value={form.impact}
                onChange={e => setForm({...form, impact: +e.target.value})} className="w-full" />
              <span className="text-sm text-gray-600">{form.impact}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Risk Owner</label>
            <input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Risk</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRiskModal;
