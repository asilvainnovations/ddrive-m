import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Radar, MapPin, Cloud, Mountain, Waves, Flame, Wind, AlertCircle, ExternalLink, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useHazards, insertRow, Hazard } from '@/hooks/useDDriveData';

const agencies = [
  { name: 'PAGASA', desc: 'Weather & Typhoon', color: 'from-blue-500 to-blue-700', icon: Cloud },
  { name: 'PHIVOLCS', desc: 'Seismic & Volcanic', color: 'from-red-500 to-red-700', icon: Mountain },
  { name: 'NOAH', desc: 'Flood & Rainfall', color: 'from-cyan-500 to-cyan-700', icon: Waves },
  { name: 'NDRRMC', desc: 'National Coordination', color: 'from-amber-500 to-amber-700', icon: AlertCircle },
];

const hazardTypes = [
  { name: 'Typhoon', icon: Wind, color: 'text-blue-600' },
  { name: 'Earthquake', icon: Mountain, color: 'text-red-600' },
  { name: 'Flood', icon: Waves, color: 'text-cyan-600' },
  { name: 'Volcanic', icon: Flame, color: 'text-orange-600' },
  { name: 'Landslide', icon: Mountain, color: 'text-amber-700' },
  { name: 'Storm Surge', icon: Waves, color: 'text-teal-600' },
];

const DetectionModule: React.FC = () => {
  const { data: hazards, refetch } = useHazards();
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = selectedAgency ? hazards.filter(h => h.agency === selectedAgency) : hazards;

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const row = {
      agency: form.get('agency') as string,
      type: form.get('type') as string,
      name: form.get('name') as string,
      severity: form.get('severity') as string,
      location: form.get('location') as string,
      lat: parseFloat(form.get('lat') as string) || 12,
      lng: parseFloat(form.get('lng') as string) || 122,
      status: 'Active',
    };
    const { error } = await insertRow('ddrive_hazards', row);
    if (error) { toast.error(error.message); return; }
    toast.success('Hazard added to live feed');
    setShowAdd(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-montserrat font-bold text-2xl">Detection Module</h1>
              <p className="text-sm text-slate-500 font-poppins">Phase 1 · Multi-agency hazard monitoring (Supabase live)</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Report Hazard
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {agencies.map((a) => {
          const Icon = a.icon;
          const count = hazards.filter(h => h.agency === a.name).length;
          const isActive = selectedAgency === a.name;
          return (
            <GlassCard
              key={a.name}
              onClick={() => setSelectedAgency(isActive ? null : a.name)}
              className={`p-5 ${isActive ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-montserrat font-bold">{a.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-2xl font-bold font-montserrat">{count}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-0 overflow-hidden lg:col-span-2 min-h-[480px]">
          <div className="p-4 border-b border-white/40 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-montserrat font-bold text-lg">Geospatial Threat Map</h3>
              <p className="text-xs text-slate-500">Google Maps + Zoom Earth + Faultfinder + Open-Meteo</p>
            </div>
            <div className="flex gap-1">
              {['3D', 'Satellite', 'Terrain'].map(v => (
                <button key={v} className="text-[10px] px-2 py-1 rounded-lg bg-white/60 dark:bg-white/10 border border-white/40 hover:bg-white">{v}</button>
              ))}
            </div>
          </div>
          <div className="relative" style={{ height: 420 }}>
            <iframe
              title="PH Hazard Map"
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3101907.858!2d121.5!3d12.8797!2m3!1f0!2f45!3f0!3m2!1i1024!2i768!4f35!5e1!3m2!1sen!2sph!4v1700000000000"
              className="w-full h-full"
              loading="lazy"
            />
            <div className="absolute top-4 left-4 space-y-2 pointer-events-none">
              <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 shadow-lg">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Active Threats</p>
                <p className="font-montserrat font-bold text-lg">{hazards.length}</p>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 shadow-lg pointer-events-none">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Legend</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" /> High</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-montserrat font-bold text-lg mb-4">Hazard Classification</h3>
          <div className="space-y-2">
            {hazardTypes.map((h) => {
              const Icon = h.icon;
              const count = hazards.filter(x => x.type === h.name).length;
              return (
                <div key={h.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${h.color}`} />
                    <span className="text-sm font-poppins font-medium">{h.name}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{count}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => toast.success('Connecting to Open-Meteo Flood API...')}
            className="w-full mt-4 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Sync External APIs
          </button>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-montserrat font-bold text-lg">Active Hazard Feed {selectedAgency && `· ${selectedAgency}`}</h3>
          {selectedAgency && (
            <button onClick={() => setSelectedAgency(null)} className="text-xs text-blue-700 font-semibold">Clear filter</button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((h) => (
            <div
              key={h.id}
              onClick={() => setSelectedHazard(h)}
              className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:border-blue-500 cursor-pointer transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40">{h.agency}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      h.severity === 'Critical' ? 'bg-red-500/15 text-red-700' :
                      h.severity === 'High' ? 'bg-orange-500/15 text-orange-700' :
                      'bg-amber-500/15 text-amber-700'
                    }`}>{h.severity}</span>
                  </div>
                  <p className="font-montserrat font-bold text-sm">{h.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {h.location}</p>
                </div>
                <span className="text-xs text-slate-500">{new Date(h.detected_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {selectedHazard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedHazard(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-montserrat font-bold text-xl">{selectedHazard.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{selectedHazard.location}</p>
            <div className="space-y-2 mt-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Agency</span><strong>{selectedHazard.agency}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Type</span><strong>{selectedHazard.type}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Severity</span><strong>{selectedHazard.severity}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Coordinates</span><strong>{selectedHazard.lat}°, {selectedHazard.lng}°</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><strong>{selectedHazard.status}</strong></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { toast.success('Escalated to Response Module'); setSelectedHazard(null); }} className="flex-1 px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-sm">Escalate</button>
              <button onClick={() => setSelectedHazard(null)} className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-montserrat font-bold text-xl mb-4">Report New Hazard</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <select name="agency" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                <option>PAGASA</option><option>PHIVOLCS</option><option>NOAH</option><option>NDRRMC</option>
              </select>
              <select name="type" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                <option>Typhoon</option><option>Earthquake</option><option>Flood</option>
                <option>Volcanic</option><option>Landslide</option><option>Storm Surge</option><option>Tsunami</option>
              </select>
              <input name="name" required placeholder="Hazard name" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <input name="location" required placeholder="Location (e.g. Marikina)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <div className="grid grid-cols-2 gap-2">
                <input name="lat" placeholder="Latitude" className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
                <input name="lng" placeholder="Longitude" className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              </div>
              <select name="severity" required className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
              <button type="submit" className="w-full px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold">Save to Supabase</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionModule;
