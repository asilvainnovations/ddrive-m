import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { FileText, Search, Upload, Download, Folder, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useDocuments, insertRow } from '@/hooks/useDDriveData';

const DocumentsModule: React.FC = () => {
  const { data: documents, refetch } = useDocuments();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const cats = ['All', 'Policy', 'Standard', 'Template', 'Protocol'];

  // PSCP Template wired to external link
  const pscpTemplate = {
    id: 'PSCP-001',
    name: 'PSCP Digital Template',
    category: 'Template',
    size: 'External Link',
    updated_at: '2026-04-14',
    externalUrl: 'https://asilvainnovations.github.io/ddrive-m/PSCP-Digital-Template.html'
  };

  const filtered = documents.filter(d =>
    (cat === 'All' || d.category === cat) &&
    (query === '' || d.name.toLowerCase().includes(query.toLowerCase()))
  );

  // Combine PSCP template with filtered documents when 'All' or 'Template' category is selected
  const displayDocuments = (cat === 'All' || cat === 'Template') && query === ''
    ? [pscpTemplate, ...filtered]
    : filtered;

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextId = `D-${String(documents.length + 1).padStart(3, '0')}`;
    const { error } = await insertRow('ddrive_documents', {
      id: nextId,
      name: form.get('name'),
      category: form.get('category'),
      size: form.get('size') || '1.0 MB',
      updated_at: new Date().toISOString().split('T')[0],
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Document registered in Supabase');
    setShowUpload(false);
    refetch();
  };

  const handleDownload = (doc: typeof pscpTemplate | typeof filtered[0]) => {
    if ('externalUrl' in doc && doc.externalUrl) {
      window.open(doc.externalUrl, '_blank');
      toast.success(`Opening ${doc.name} in new tab`);
    } else {
      toast.success(`Downloading ${(doc as any).name}`);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-montserrat font-bold text-2xl">Document Management</h1>
              <p className="text-sm text-slate-500 font-poppins">Centralized library (Supabase persisted)</p>
            </div>
          </div>
          <button onClick={() => setShowUpload(true)} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm" />
          </div>
          <div className="flex gap-1">
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${cat === c ? 'bg-blue-700 text-white' : 'bg-white/60 dark:bg-white/5'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayDocuments.map(d => (
            <div key={d.id} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center gap-3 hover:shadow-lg transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${'externalUrl' in d ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                {'externalUrl' in d ? <ExternalLink className="w-5 h-5 text-white" /> : <Folder className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-poppins font-semibold truncate">{d.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold">{d.category}</span>
                  <span>{d.size}</span>
                  <span>·</span>
                  <span>{d.updated_at}</span>
                  {'externalUrl' in d && <span className="text-emerald-600 font-semibold">External</span>}
                </div>
              </div>
              <button onClick={() => handleDownload(d)} className={`p-2 rounded-lg ${'externalUrl' in d ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30' : 'hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}>
                {'externalUrl' in d ? <ExternalLink className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-blue-700" />}
              </button>
            </div>
          ))}
          {displayDocuments.length === 0 && <p className="col-span-2 text-center py-8 text-slate-500 text-sm">No documents found</p>}
        </div>
      </GlassCard>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-montserrat font-bold text-xl mb-4">Register Document</h3>
            <form onSubmit={handleUpload} className="space-y-3">
              <input name="name" required placeholder="File name (e.g. Plan 2025.pdf)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <select name="category" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                <option>Policy</option><option>Standard</option><option>Template</option><option>Protocol</option>
              </select>
              <input name="size" placeholder="Size (e.g. 2.4 MB)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500">Drop file or browse</p>
              </div>
              <button type="submit" className="w-full px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold">Save to Supabase</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsModule;