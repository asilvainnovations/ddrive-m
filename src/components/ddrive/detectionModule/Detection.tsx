import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Radar, ExternalLink, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useHazards, Hazard } from '@/hooks/useDDriveData';
import { reportHazard, NewHazard } from '@/lib/actions';
import { LinkedActions } from '@/components/ddrive/responseModule/ProposeAction';
import { priorityFor } from '@/lib/responseActions';
import GatedButton from '@/components/ddrive/GatedButton';
import OfficialAlerts from '@/components/ddrive/detectionModule/OfficialAlerts';
import { OfficialAlert, alertTitle, manila, useOfficialAlerts } from '@/hooks/useOfficialAlerts';
import HazardRecords from '@/components/ddrive/detectionModule/HazardRecords';

const DetectionModule: React.FC = () => {
  const { data: hazards, refetch } = useHazards();
  const { feeds } = useOfficialAlerts();
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  // When set, the hazard form is prefilled from this official alert and the record links to it.
  const [fromAlert, setFromAlert] = useState<OfficialAlert | null>(null);
  const openForm = (alert: OfficialAlert | null) => { setFromAlert(alert); setShowAdd(true); };
  const alertType = (a: OfficialAlert) =>
    /tsunami/i.test(a.event) ? 'Tsunami'
      : /storm surge/i.test(a.event) ? 'Storm Surge'
      : /tropical cyclone|typhoon/i.test(a.event) ? 'Typhoon'
      : /earthquake/i.test(a.event) ? 'Earthquake'
      : /volcan/i.test(a.event) ? 'Volcanic'
      : /landslide/i.test(a.event) ? 'Landslide'
      : 'Flood';
  // The record names the agency that issued the alert; international sources are named as such.
  const alertAgency = (a: OfficialAlert) => (a.source === 'PAGASA' ? 'PAGASA' : a.source === 'PTWC' ? 'PTWC (NOAA)' : `${a.source} (international)`);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const psgc = String(form.get('psgc') ?? '').trim();
    const hazard: NewHazard = {
      agency: form.get('agency') as string,
      type: form.get('type') as string,
      name: form.get('name') as string,
      severity: form.get('severity') as NewHazard['severity'],
      location: form.get('location') as string,
      // Required and range-checked by the form; never defaulted to a made-up location.
      lat: Number(form.get('lat')),
      lng: Number(form.get('lng')),
      psgc_code: psgc || null,
      official_alert_id: fromAlert?.id ?? null,
      // The database accepts only https links; the record keeps the alert itself either way.
      source_url: fromAlert?.cap_url.startsWith('https://') ? fromAlert.cap_url : null,
    };
    const { error } = await reportHazard(hazard);
    if (error) { toast.error(error); return; }
    toast.success('Hazard record saved');
    setShowAdd(false);
    setFromAlert(null);
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
              <p className="text-sm text-slate-500 font-poppins">Phase 1 · Official alerts from four sources, risk-informed by your assessments, and hazard records</p>
            </div>
          </div>
          <GatedButton min="responder" onClick={() => openForm(null)} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" /> Report Hazard
          </GatedButton>
        </div>
      </GlassCard>

      <OfficialAlerts onLogAsHazard={(a) => openForm(a)} />

      <HazardRecords hazards={hazards} feeds={feeds} onSelect={setSelectedHazard} />

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
              <div className="flex justify-between"><span className="text-slate-500">Source</span><strong>{selectedHazard.origin === 'official' ? 'Official alert, synchronised' : 'Field report'}</strong></div>
              {selectedHazard.status_reason && <p className="text-xs text-slate-600">{selectedHazard.status_reason}</p>}
              {selectedHazard.source_url && <a href={selectedHazard.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline font-semibold">The agency's alert <ExternalLink className="w-3 h-3" aria-hidden="true" /></a>}
            </div>
            <div className="mt-5 border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">Response actions for this hazard. A DRRM officer decides on them in Response.</p>
              <LinkedActions
                filter={{ hazardRecordId: selectedHazard.id }} link={{ origin: 'detection', hazard_record_id: selectedHazard.id }} min="responder"
                idPrefix={`hz-${selectedHazard.id}`} context={selectedHazard.name}
                defaultTitle={`Respond to ${selectedHazard.name}, ${selectedHazard.location}`} defaultPriority={priorityFor(selectedHazard.severity)}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setSelectedHazard(null)} className="ml-auto px-4 py-2 rounded-xl border border-slate-300 font-semibold text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-montserrat font-bold text-xl mb-4">Report New Hazard</h3>
            <form key={fromAlert?.id ?? 'new'} onSubmit={handleAdd} className="space-y-3">
              {fromAlert && (
                <p className="text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 text-slate-700 dark:text-slate-200">
                  Linked to the {fromAlert.source} alert issued {manila(fromAlert.sent)}. Add the coordinates of the place you are recording.
                </p>
              )}
              <select name="agency" required aria-label="Source of the information" defaultValue={fromAlert ? alertAgency(fromAlert) : undefined} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                <option>PAGASA</option><option>PHIVOLCS</option><option>NOAH</option><option>NDRRMC</option><option>Local DRRM office</option><option>Field observation</option>
                <option>PTWC (NOAA)</option><option>USGS (international)</option><option>GDACS (international)</option>
              </select>
              <select name="type" required aria-label="Hazard type" defaultValue={fromAlert ? alertType(fromAlert) : undefined} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                <option>Typhoon</option><option>Earthquake</option><option>Flood</option>
                <option>Volcanic</option><option>Landslide</option><option>Storm Surge</option><option>Tsunami</option>
              </select>
              <input name="name" required aria-label="Hazard name" defaultValue={fromAlert ? alertTitle(fromAlert) : undefined} placeholder="Hazard name" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <input name="location" required aria-label="Location" defaultValue={fromAlert ? fromAlert.area_names.join(', ') : undefined} placeholder="Location (e.g. Marikina)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <div className="grid grid-cols-2 gap-2">
                <input name="lat" type="number" step="any" min="4" max="22" required aria-label="Latitude (4 to 22)" placeholder="Latitude" defaultValue={fromAlert?.latitude ?? undefined} className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
                <input name="lng" type="number" step="any" min="116" max="127" required aria-label="Longitude (116 to 127)" placeholder="Longitude" defaultValue={fromAlert?.longitude ?? undefined} className="px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              </div>
              <input name="psgc" inputMode="numeric" pattern="[0-9]{10}" aria-label="PSGC code (optional, 10 digits)" placeholder="PSGC code (optional, 10 digits)" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent" />
              <select name="severity" required aria-label="Severity" className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-transparent">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
              <button type="submit" className="w-full px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold">Save hazard record</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionModule;
