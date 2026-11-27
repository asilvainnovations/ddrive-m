// Opens a clean, printable page for a plan, form, certificate or after-action report. Everything is escaped;
// the page has no scripts. The browser's print dialog saves it as PDF.
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Text with line breaks kept. */
export const para = (s: unknown) => (String(s ?? '').trim() ? `<p>${esc(s).replace(/\n/g, '<br>')}</p>` : '<p class="empty">Not filled in.</p>');

export function table(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  if (!rows.length) return '<p class="empty">No rows.</p>';
  return `<table><thead><tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${
    rows.map((r) => `<tr>${columns.map((c) => `<td>${esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function printDocument(title: string, bodyHtml: string, footer = 'Prepared in DDRiVE-M') {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>body{font:11pt/1.45 Georgia,serif;max-width:46rem;margin:2rem auto;color:#111}h1{font-size:18pt}h2{font-size:13pt;margin-top:1.4rem;border-bottom:1px solid #999}
.src{font:8.5pt Arial,sans-serif;color:#555}table{border-collapse:collapse;width:100%;font:9pt Arial,sans-serif;margin:.4rem 0}th,td{border:1px solid #999;padding:3px 5px;text-align:left;vertical-align:top}
th{background:#eee}.empty{color:#888;font-style:italic}.meta{font:9pt Arial,sans-serif;color:#333}footer{margin-top:2rem;font:8pt Arial,sans-serif;color:#666}
@media print{body{margin:0}}</style></head><body>${bodyHtml}<footer>${esc(footer)} · ${esc(new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))}</footer></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return w;
}
