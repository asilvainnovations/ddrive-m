import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import RiskMatrix from '@/components/risk/RiskMatrix';
import RiskToolbar from '@/components/risk/RiskToolbar';
import RiskStats from '@/components/risk/RiskStats';
import RiskTable from '@/components/risk/RiskTable';
import AddRiskModal from '@/components/risk/AddRiskModal';
import RiskDetailModal from '@/components/risk/RiskDetailModal';
import GeoRiskPanel from '@/components/georisk/GeoRiskPanel';
import { useRisks } from '@/hooks/useRisks';
import { Risk } from '@/types/risk';
import { Loader2 } from 'lucide-react';

const RiskAssessment: React.FC = () => {
  const { risks, categories, loading, addRisk, updateRisk, deleteRisk, refetch } = useRisks();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'matrix' | 'table'>('matrix');

  const filteredRisks = useMemo(() => {
    return risks.filter(risk => {
      const matchesSearch = risk.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFramework = selectedFramework === 'All' || risk.framework === selectedFramework;
      const matchesCategory = selectedCategory === 'All' || risk.category_id === selectedCategory;
      return matchesSearch && matchesFramework && matchesCategory;
    });
  }, [risks, searchTerm, selectedFramework, selectedCategory]);

  const handleAddRisk = async (riskData: Partial<Risk>) => {
    try { await addRisk(riskData); } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header title="Risk Assessment" />
        <main className="p-6">
          <RiskStats risks={filteredRisks} />
          <RiskToolbar
            onAddClick={() => setShowAddModal(true)} onRefresh={refetch}
            searchTerm={searchTerm} onSearchChange={setSearchTerm}
            selectedFramework={selectedFramework} onFrameworkChange={setSelectedFramework}
            selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory}
            categories={categories}
          />
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('matrix')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'matrix' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Matrix View</button>
            <button onClick={() => setActiveTab('table')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'table' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Table View</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {activeTab === 'matrix' ? (
                <RiskMatrix risks={filteredRisks} onRiskClick={setSelectedRisk} />
              ) : (
                <RiskTable risks={filteredRisks} onRiskClick={setSelectedRisk} />
              )}
            </div>
            <GeoRiskPanel />
          </div>
        </main>
      </div>
      <AddRiskModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleAddRisk} categories={categories} />
      <RiskDetailModal risk={selectedRisk} categories={categories} onClose={() => setSelectedRisk(null)} onUpdate={updateRisk} onDelete={deleteRisk} />
    </div>
  );
};

export default RiskAssessment;
