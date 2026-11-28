// Sub-regional operating areas for the Validation tools (ADR-019): the local government units an exercise or a watch
// list covers, how they are grouped, and the council that coordinates them. Metro Manila is the first preset.
//
// Sources: PSA Philippine Standard Geographic Code (9-digit codes, the form UP NOAH / LiPAD layer names use);
// RA 10121 s. 10–12 (regional and local councils); MMDRRMC chaired by the MMDA Chair with the OCD-NCR Regional Director
// as Senior Vice-Chair (PIA NCR reports). The official text governs. No population or hazard figures are kept here:
// those come from the organisation's own records (Detection → Flood intelligence) with their source.

export interface Lgu {
  psgc: string;                 // 9-digit PSGC
  name: string;
  kind: 'city' | 'municipality';
  group: string;                // district or cluster within the sub-region
  /** UP NOAH flood hazard layers (Phil-LiDAR / LiPAD GeoServer) known for this LGU, by return period. */
  noahFloodLayers?: { rp: 5 | 25 | 100; layer: string }[];
}

export interface WatchPoint {
  id: string; lgu: string; name: string; unit: 'm';
  levels: { at: number; label: string; meaning: string }[];
  source: string;
}

export interface SubRegion {
  id: string; name: string; council: string; chair: string; secretariat: string;
  groups: { id: string; name: string }[];
  lgus: Lgu[];
  watchPoints: WatchPoint[];
  note: string;
}

const noah = (prefix: string) => ([5, 25, 100] as const).map((rp) => ({ rp, layer: `geonode:${prefix}_fh${rp}yr_10m` }));

export const METRO_MANILA: SubRegion = {
  id: 'ncr',
  name: 'Metro Manila (National Capital Region)',
  council: 'Metro Manila Disaster Risk Reduction and Management Council (MMDRRMC)',
  chair: 'MMDA Chair (Chairperson); OCD-NCR Regional Director (Senior Vice-Chairperson)',
  secretariat: 'Office of Civil Defense – NCR',
  groups: [
    { id: 'capital', name: 'Capital District' },
    { id: 'eastern', name: 'Eastern Manila District' },
    { id: 'camanava', name: 'CAMANAVA (Northern Manila District)' },
    { id: 'southern', name: 'Southern Manila District' },
  ],
  lgus: [
    { psgc: '133900000', name: 'Manila', kind: 'city', group: 'capital', noahFloodLayers: noah('manila') },
    { psgc: '137401000', name: 'Mandaluyong', kind: 'city', group: 'eastern' },
    { psgc: '137402000', name: 'Marikina', kind: 'city', group: 'eastern' },
    { psgc: '137403000', name: 'Pasig', kind: 'city', group: 'eastern' },
    { psgc: '137404000', name: 'Quezon City', kind: 'city', group: 'eastern', noahFloodLayers: noah('ph137404000') },
    { psgc: '137405000', name: 'San Juan', kind: 'city', group: 'eastern' },
    { psgc: '137501000', name: 'Caloocan', kind: 'city', group: 'camanava' },
    { psgc: '137502000', name: 'Malabon', kind: 'city', group: 'camanava' },
    { psgc: '137503000', name: 'Navotas', kind: 'city', group: 'camanava' },
    { psgc: '137504000', name: 'Valenzuela', kind: 'city', group: 'camanava' },
    { psgc: '137601000', name: 'Las Piñas', kind: 'city', group: 'southern' },
    { psgc: '137602000', name: 'Makati', kind: 'city', group: 'southern', noahFloodLayers: noah('ph137602000') },
    { psgc: '137603000', name: 'Muntinlupa', kind: 'city', group: 'southern' },
    { psgc: '137604000', name: 'Parañaque', kind: 'city', group: 'southern' },
    { psgc: '137605000', name: 'Pasay', kind: 'city', group: 'southern' },
    { psgc: '137606000', name: 'Pateros', kind: 'municipality', group: 'southern' },
    { psgc: '137607000', name: 'Taguig', kind: 'city', group: 'southern', noahFloodLayers: noah('ph137607000') },
  ],
  watchPoints: [
    {
      id: 'marikina-sto-nino', lgu: '137402000', name: 'Marikina River at Sto. Niño Bridge', unit: 'm',
      levels: [
        { at: 15, label: '1st alarm', meaning: 'Prepare' },
        { at: 16, label: '2nd alarm', meaning: 'Evacuate (pre-emptive, low-lying riverside areas)' },
        { at: 18, label: '3rd alarm', meaning: 'Forced evacuation' },
      ],
      source: 'Marikina City DRRMO (Rescue 161) three-level alarm system, as reported by PIA, Inquirer and Manila Bulletin. The city\'s own advisory governs.',
    },
  ],
  note: 'Sixteen cities and one municipality. A multi-LGU incident is coordinated through the MMDRRMC; each Local Chief Executive remains the Responsible Official in their own jurisdiction.',
};

export const SUB_REGIONS: SubRegion[] = [METRO_MANILA];
export const subRegionById = (id: string) => SUB_REGIONS.find((r) => r.id === id) ?? METRO_MANILA;

/** The LGU a barangay or LGU code belongs to: a 9-digit PSGC shares its first six digits with its city or municipality. */
export function lguOf(region: SubRegion, code: string | null | undefined): Lgu | null {
  const c = (code ?? '').trim();
  if (!/^\d{9}$/.test(c)) return null;
  return region.lgus.find((l) => l.psgc.slice(0, 6) === c.slice(0, 6)) ?? null;
}

/** Which alarm a watch-point reading is at; null below the first alarm or for a reading that is not a number. */
export function alarmAt(point: WatchPoint, reading: number | null): WatchPoint['levels'][number] | null {
  if (reading == null || !Number.isFinite(reading)) return null;
  let hit: WatchPoint['levels'][number] | null = null;
  for (const l of [...point.levels].sort((a, b) => a.at - b.at)) if (reading >= l.at) hit = l;
  return hit;
}

export const NOAH_LINKS = [
  { name: 'NOAH Studio', by: 'UP NOAH Center', url: 'https://noah.up.edu.ph/noah-studio' },
  { name: 'Know Your Hazards', by: 'UP NOAH Center', url: 'https://noah.up.edu.ph/know-your-hazards' },
];
