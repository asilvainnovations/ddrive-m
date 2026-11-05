import React from 'react';
import { Link } from 'react-router-dom';
import { Accessibility, ArrowRight, Bot, Cookie, FileText, Lock } from 'lucide-react';
import { POLICIES } from '@/content/legal';
import PageHeader from './PageHeader';

const ICONS = { privacy: Lock, terms: FileText, cookies: Cookie, accessibility: Accessibility, 'ai-ethics': Bot } as const;

const PolicyIndex: React.FC = () => (
  <>
    <PageHeader
      eyebrow="Policies"
      title="How DDRiVE-M handles your information"
      intro="The rules we follow on privacy, use of the service, storage on your device, accessibility and artificial intelligence."
    />
    <div className="max-w-5xl mx-auto px-4 py-12 grid gap-5 sm:grid-cols-2">
      {POLICIES.map((p) => {
        const Icon = ICONS[p.slug];
        return (
          <Link
            key={p.slug}
            to={`/policies/${p.slug}`}
            className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-blue-600 hover:shadow-md transition"
          >
            <span className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-700 to-amber-500 text-white flex items-center justify-center">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-montserrat font-bold text-lg">{p.title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{p.summary}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300 group-hover:underline">
              Read <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </Link>
        );
      })}
    </div>
  </>
);

export default PolicyIndex;
