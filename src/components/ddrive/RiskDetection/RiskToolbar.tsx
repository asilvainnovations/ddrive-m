import React from 'react';
import { Plus, Filter, Download, RefreshCw, Search } from 'lucide-react';

interface RiskToolbarProps {
  onAddClick: () => void;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedFramework: string;
  onFrameworkChange: (framework: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: { id: string; name: string }[];
}

const RiskToolbar: React.FC<RiskToolbarProps> = ({
  onAddClick, onRefresh, searchTerm, onSearchChange,
  selectedFramework, onFrameworkChange, selectedCategory, onCategoryChange, categories
}) => {
  const frameworks = ['All', 'ISO 31000', 'COSO ERM', 'DRRM', 'NIST'];

  const handleExport = () => {
    alert('Exporting risk register to CSV...');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search risks..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <select
          value={selectedFramework}
          onChange={(e) => onFrameworkChange(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white text-sm"
        >
          {frameworks.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white text-sm"
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 border rounded-lg hover:bg-gray-50" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleExport} className="p-2 border rounded-lg hover:bg-gray-50" title="Export">
            <Download size={18} />
          </button>
          <button onClick={onAddClick} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} />
            <span className="text-sm font-medium">Add Risk</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiskToolbar;
