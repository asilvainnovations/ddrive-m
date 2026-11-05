import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import { POLICIES, policyBySlug, LEGAL_FACTS } from '@/content/legal';
import type { Block } from '@/content/legal/types';
import { TO_CONFIRM } from '@/content/legal/facts';
import NotFound from '@/pages/NotFound';
import PageHeader from './PageHeader';

const date = (iso: string) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString('en-PH', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila',
});

const Text: React.FC<{ children: string }> = ({ children }) => {
  const parts = children.split(TO_CONFIRM);
  return <>{parts.map((part, i) => <React.Fragment key={i}>{part}{i < parts.length - 1 && <mark className="bg-amber-100 text-amber-900 px-1 rounded">{TO_CONFIRM}</mark>}</React.Fragment>)}</>;
};

const BlockView: React.FC<{ block: Block }> = ({ block }) => {
  if ('p' in block) return <p className="text-slate-700 dark:text-slate-300 leading-relaxed"><Text>{block.p}</Text></p>;
  if ('ul' in block) return <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">{block.ul.map((li) => <li key={li}><Text>{li}</Text></li>)}</ul>;
  if ('note' in block) return <p role="note" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-4 text-sm text-amber-950 dark:text-amber-100"><Info className="w-5 h-5 shrink-0" aria-hidden="true" /><span><Text>{block.note}</Text></span></p>;
  const { head, rows, caption } = block.table;
  const hasHead = head.some(Boolean);
  return <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
    <table className="w-full text-sm text-left">
      {caption && <caption className="sr-only">{caption}</caption>}
      {hasHead && <thead className="bg-blue-800 text-white"><tr>{head.map((h, i) => <th key={`${h}-${i}`} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>}
      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
        {rows.map((r, ri) => <tr key={`${ri}-${r[0]}`}>{r.map((c, i) => i === 0
          ? <th key={i} scope="row" className="px-4 py-3 font-medium text-slate-900 dark:text-white align-top"><Text>{c}</Text></th>
          : <td key={i} className="px-4 py-3 text-slate-700 dark:text-slate-300 align-top"><Text>{c}</Text></td>)}</tr>)}
      </tbody>
    </table>
  </div>;
};

const PolicyPage: React.FC<{ slug?: string }> = ({ slug: fixed }) => {
  const params = useParams();
  const policy = policyBySlug(fixed ?? params.slug);
  if (!policy) return <NotFound />;

  return <>
    <PageHeader eyebrow="Policies" title={policy.title}>
      <p className="mt-3 text-sm text-amber-300 font-semibold">Draft effective date: {date(policy.effective)} · Last reviewed: {date(policy.updated)}</p>
    </PageHeader>
    <div className="max-w-6xl mx-auto px-4 py-10 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-24 space-y-1 text-sm">
          <p className="font-semibold text-slate-900 dark:text-white mb-2">On this page</p>
          {policy.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="block px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-blue-800">{s.title}</a>)}
          <p className="font-semibold text-slate-900 dark:text-white mt-6 mb-2">Other policies</p>
          {POLICIES.filter((p) => p.slug !== policy.slug).map((p) => <Link key={p.slug} to={`/policies/${p.slug}`} className="block px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-blue-800">{p.title}</Link>)}
        </nav>
      </aside>
      <article className="space-y-8 min-w-0">
        {!LEGAL_FACTS.reviewed && <div role="alert" className="flex gap-3 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <div><strong>Draft — not yet approved for final publication.</strong><p className="mt-1">This page is undergoing technical, operational and privacy/legal review. Do not treat it as evidence of independent certification or completed control testing. Values marked “{TO_CONFIRM}” require confirmation.</p></div>
        </div>}
        <section aria-labelledby="key-points" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h2 id="key-points" className="font-montserrat font-bold text-lg text-blue-800 dark:text-blue-300">In short</h2>
          <ul className="mt-3 list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">{policy.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
        </section>
        {policy.sections.map((s) => <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24 space-y-4">
          <h2 id={`${s.id}-h`} className="font-montserrat font-bold text-xl sm:text-2xl text-blue-800 dark:text-blue-300 border-b border-slate-200 dark:border-slate-800 pb-2">{s.title}</h2>
          {s.blocks.map((b, i) => <BlockView key={i} block={b} />)}
        </section>)}
        {policy.signoff && <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center"><p className="text-sm text-slate-500">Policy owner</p><p className="mt-1 font-montserrat font-bold text-blue-800 dark:text-blue-300">{policy.signoff.name}</p><p className="text-sm text-slate-600 dark:text-slate-400">{policy.signoff.role}</p></div>}
        <p className="text-sm text-slate-500 dark:text-slate-400">Questions: {LEGAL_FACTS.generalEmail}. Privacy requests: {LEGAL_FACTS.dpoEmail}.</p>
      </article>
    </div>
  </>;
};

export default PolicyPage;
