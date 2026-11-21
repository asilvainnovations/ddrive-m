// Reads a filled DDRiVE workbook (.xlsm or .xlsx) in the browser: the Information sheet and the Hazard Data Entry rows.
// Only cell values are read. Macros (vbaProject.bin) are never opened, and formulas are recomputed by DDRiVE-M,
// not taken from the file (ADR-006).
import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { ALL_PERILS, FAMILIES, type FamilyCode } from './scoring';

export interface ImportedEntry {
  row: number;
  family_code: FamilyCode;
  main_hazard: string;
  hazard_event: string;
  exposure: number | null;
  v_infrastructure: number | null;
  v_productive: number | null;
  v_services: number | null;
  v_social: number | null;
  response: number | null;
  comments: string | null;
}

export interface WorkbookImport {
  info: { title: string | null; description: string | null; assessor: string | null; completed_on: string | null; review: string | null };
  entries: ImportedEntry[];
  skipped: { row: number; reason: string }[];
}

// Hazard Data Entry layout: eight families, five rows each, starting at row 8 (H1) every six rows.
const BLOCKS: { code: FamilyCode; first: number }[] = (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'] as FamilyCode[])
  .map((code, i) => ({ code, first: 8 + i * 6 }));

const MAX_UNZIPPED = 60_000_000;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false,
                               isArray: (n) => ['sheet', 'Relationship', 'si', 'r', 'row', 'c'].includes(n) });
type Node = Record<string, unknown>;
const arr = (v: unknown): Node[] => (Array.isArray(v) ? v as Node[] : v ? [v as Node] : []);

function text(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  const n = v as Node;
  if ('#text' in n) return text(n['#text']);
  if ('t' in n) return text(n.t);
  if ('r' in n) return arr(n.r).map((x) => text(x.t)).join('');
  return '';
}

/** "9-Extremely likely" → 9; "4" → 4; anything else → null. */
export function scaleValue(v: string | null): number | null {
  if (!v) return null;
  const m = /^\s*(10|[0-9])\s*(?:-|$)/.exec(v);
  return m ? Number(m[1]) : null;
}

/** Excel serial day (1900 date system) or a date-like string → YYYY-MM-DD. */
export function excelDate(v: string | null): string | null {
  if (!v) return null;
  const n = Number(v);
  if (Number.isFinite(n) && n > 20000 && n < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000).toISOString().slice(0, 10);
  const d = Date.parse(v);
  return Number.isNaN(d) ? null : new Date(d).toISOString().slice(0, 10);
}

/** Reads the two sheets DDRiVE needs. Throws with a plain message when the file is not a DDRiVE workbook. */
export function readDdriveWorkbook(data: ArrayBuffer | Uint8Array): WorkbookImport {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('This is not an Excel workbook (.xlsx or .xlsm).');
  let total = 0;
  // Unzip only the workbook parts: never vbaProject.bin, and not the very large glossary or chart parts.
  const wanted = (name: string) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/sheet[0-9]+\.xml)$/.test(name);
  const files = unzipSync(bytes, {
    filter: (f) => {
      if (!wanted(f.name)) return false;
      if (f.originalSize > 40_000_000) return false;   // skip huge sheets (the glossary); we do not need them
      total += f.originalSize;
      if (total > MAX_UNZIPPED) throw new Error('The workbook is too large to read here.');
      return true;
    },
  });
  const wb = files['xl/workbook.xml'];
  const rels = files['xl/_rels/workbook.xml.rels'];
  if (!wb || !rels) throw new Error('The file has no workbook part. Save it again from Excel and retry.');

  const relDoc = parser.parse(strFromU8(rels)) as Node;
  const relMap = new Map(arr((relDoc.Relationships as Node | undefined)?.Relationship)
    .map((r) => [String(r['@_Id']), String(r['@_Target']).replace(/^\/?xl\//, '')]));
  const wbDoc = parser.parse(strFromU8(wb)) as Node;
  const sheets = arr(((wbDoc.workbook as Node | undefined)?.sheets as Node | undefined)?.sheet);
  const path = (name: string) => {
    const s = sheets.find((x) => String(x['@_name']).trim().toLowerCase() === name.toLowerCase());
    const target = s ? relMap.get(String(s['@_id'])) : undefined;
    return target ? `xl/${target}` : undefined;
  };
  const shared = files['xl/sharedStrings.xml']
    ? arr(((parser.parse(strFromU8(files['xl/sharedStrings.xml'])) as Node).sst as Node)?.si).map(text) : [];

  const cells = (p: string | undefined): Map<string, string> => {
    const out = new Map<string, string>();
    if (!p || !files[p]) return out;
    const ws = (parser.parse(strFromU8(files[p])) as Node).worksheet as Node;
    for (const row of arr((ws?.sheetData as Node)?.row)) {
      for (const c of arr(row.c)) {
        const ref = String(c['@_r'] ?? '');
        const t = c['@_t'];
        let v: string;
        if (t === 's') v = shared[Number(text(c.v))] ?? '';
        else if (t === 'inlineStr') v = text(c.is);
        else v = text(c.v);
        if (ref && v !== '') out.set(ref, v.trim());
      }
    }
    return out;
  };

  const entrySheet = path('Hazard Data Entry');
  if (!entrySheet) throw new Error('No "Hazard Data Entry" sheet: this does not look like a DDRiVE workbook.');
  const he = cells(entrySheet);
  const info = cells(path('Information'));
  const get = (m: Map<string, string>, ref: string) => m.get(ref) ?? null;

  const result: WorkbookImport = {
    info: {
      title: get(info, 'L15'), description: get(info, 'L17'), assessor: get(info, 'L20'),
      completed_on: excelDate(get(info, 'L22')), review: get(info, 'L24'),
    },
    entries: [],
    skipped: [],
  };

  for (const b of BLOCKS) {
    const fam = FAMILIES.find((f) => f.code === b.code)!;
    for (let row = b.first; row < b.first + 5; row++) {
      const main = get(he, `B${row}`);
      const event = get(he, `C${row}`);
      if (!main && !event) continue;
      if (!main || !event) { result.skipped.push({ row, reason: 'Main hazard or hazard event is missing.' }); continue; }
      const mainOk = b.code === 'H8' ? main.length >= 2 && !/^spare [0-9]$/i.test(main) : fam.mainHazards.includes(main);
      if (!mainOk) {
        result.skipped.push({ row, reason: b.code === 'H8' ? `Name the main hazard instead of "${main}".` : `"${main}" is not a main hazard of ${fam.name}.` });
        continue;
      }
      const allowed = b.code === 'H8' ? ALL_PERILS : fam.events;
      const matched = allowed.find((e) => e.toLowerCase().replace(/\s+/g, '') === event.toLowerCase().replace(/\s+/g, ''));
      if (!matched) { result.skipped.push({ row, reason: `"${event}" is not a hazard event of ${fam.name}.` }); continue; }
      result.entries.push({
        row, family_code: b.code, main_hazard: main, hazard_event: matched,
        exposure: scaleValue(get(he, `D${row}`)),
        v_infrastructure: scaleValue(get(he, `E${row}`)),
        v_productive: scaleValue(get(he, `F${row}`)),
        v_services: scaleValue(get(he, `G${row}`)),
        v_social: scaleValue(get(he, `H${row}`)),
        response: scaleValue(get(he, `J${row}`)),
        comments: get(he, `N${row}`),
      });
    }
  }
  return result;
}
