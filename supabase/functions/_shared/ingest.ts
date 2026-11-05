// One pass over a CAP feed: read the index, fetch only alerts not yet stored, record them, log the run.
// Network and database access are passed in, so the logic can be tested without either.
import { parseCap, parseFeed, ParsedAlert } from './cap.ts';

export interface IngestDeps {
  fetchText: (url: string) => Promise<string>;
  /** Which of these identifiers are already stored for this source. */
  knownIdentifiers: (source: string, ids: string[]) => Promise<Set<string>>;
  apply: (alert: ParsedAlert) => Promise<'new' | 'exists'>;
  recordRun: (run: { source: string; started: string; ok: boolean; seen: number; added: number; error: string | null }) => Promise<void>;
}

export interface IngestOptions {
  source: string;
  feedUrl: string;
  /** Upper bound on alerts fetched in one run, so a flood of entries cannot exhaust the function. */
  maxNewPerRun?: number;
}

export interface IngestResult {
  ok: boolean;
  seen: number;
  added: number;
  skipped: number;
  failed: { url: string; error: string }[];
}

export async function ingestFeed(opts: IngestOptions, deps: IngestDeps): Promise<IngestResult> {
  const started = new Date().toISOString();
  const max = opts.maxNewPerRun ?? 50;
  const feedHost = new URL(opts.feedUrl).host;
  const failed: { url: string; error: string }[] = [];
  let seen = 0;
  let added = 0;
  let skipped = 0;

  try {
    const { entries, rights } = parseFeed(await deps.fetchText(opts.feedUrl));
    seen = entries.length;
    const known = await deps.knownIdentifiers(opts.source, entries.map((e) => e.id));
    const fresh = entries.filter((e) => !known.has(e.id));
    skipped = entries.length - fresh.length;

    // Oldest first, so an update is normally stored after the alert it replaces.
    fresh.sort((a, b) => Date.parse(a.updated || '0') - Date.parse(b.updated || '0'));

    for (const entry of fresh.slice(0, max)) {
      try {
        const url = new URL(entry.capUrl, opts.feedUrl);
        // Only follow links on the feed's own host and over https (or the same scheme as the feed, for tests).
        if (url.host !== feedHost || url.protocol !== new URL(opts.feedUrl).protocol) {
          throw new Error(`refusing link outside the feed host: ${url.href}`);
        }
        const alert = parseCap(await deps.fetchText(url.href), { source: opts.source, capUrl: url.href, license: rights });
        if ((await deps.apply(alert)) === 'new') added += 1;
      } catch (e) {
        failed.push({ url: entry.capUrl, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const ok = failed.length === 0;
    await deps.recordRun({
      source: opts.source, started, ok, seen, added,
      error: ok ? null : failed.map((f) => `${f.url}: ${f.error}`).join('\n'),
    });
    return { ok, seen, added, skipped, failed };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await deps.recordRun({ source: opts.source, started, ok: false, seen, added, error: message });
    return { ok: false, seen, added, skipped, failed: [{ url: opts.feedUrl, error: message }] };
  }
}

/** fetch() with a timeout, a size cap and a plain user agent. */
export async function fetchText(url: string, timeoutMs = 20_000, maxBytes = 2_000_000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'DDRiVE-M alert ingester (+https://asilvainnovations.com)', accept: 'application/xml, text/xml, */*' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > maxBytes) throw new Error(`response too large (${len} bytes) for ${url}`);
    const body = await res.text();
    if (body.length > maxBytes) throw new Error(`response too large for ${url}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}
