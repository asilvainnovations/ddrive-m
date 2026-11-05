import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { LEGAL_FACTS as F } from '@/content/legal';
import PageHeader from './PageHeader';

const TOPICS = [
  { value: 'demo', label: 'A demonstration or pilot for my organisation', to: F.generalEmail },
  { value: 'support', label: 'Help using DDRiVE-M', to: F.generalEmail },
  { value: 'privacy', label: 'Privacy or my personal information', to: F.dpoEmail },
  { value: 'legal', label: 'Terms, contracts or procurement', to: F.legalEmail },
  { value: 'other', label: 'Something else', to: F.generalEmail },
];

const input = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

// The form opens the visitor's email app with the message filled in: nothing is sent to or stored by
// DDRiVE-M, so no personal information is collected on this page.
const Contact: React.FC = () => {
  const [topic, setTopic] = useState(TOPICS[0].value);
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [message, setMessage] = useState('');
  const chosen = TOPICS.find((t) => t.value === topic) ?? TOPICS[0];

  const href = `mailto:${chosen.to}?subject=${encodeURIComponent(`DDRiVE-M: ${chosen.label}`)}&body=${encodeURIComponent(
    `${message}\n\n${name}${org ? `\n${org}` : ''}`
  )}`;

  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to the DDRiVE-M team" intro="Pilots for LGUs, questions about your data, or help with the platform." />
      <div className="max-w-5xl mx-auto px-4 py-12 grid gap-8 lg:grid-cols-[1fr_320px]">
        <form
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = href;
          }}
        >
          <div>
            <label htmlFor="c-topic" className="block text-sm font-semibold mb-1">What is it about?</label>
            <select id="c-topic" className={input} value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="block text-sm font-semibold mb-1">Your name</label>
              <input id="c-name" className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="c-org" className="block text-sm font-semibold mb-1">Organisation (optional)</label>
              <input id="c-org" className={input} value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" />
            </div>
          </div>
          <div>
            <label htmlFor="c-msg" className="block text-sm font-semibold mb-1">Message</label>
            <textarea id="c-msg" required rows={6} className={input} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm">
            <Send className="w-4 h-4" aria-hidden="true" /> Write the email
          </button>
          <p className="text-xs text-slate-500">This opens your email app with your message ready to send to {chosen.to}. Nothing is sent until you send it there.</p>
        </form>

        <aside className="space-y-4 text-sm">
          <div className="rounded-2xl bg-blue-800 text-white p-6 space-y-3">
            <p className="flex gap-2"><Mail className="w-4 h-4 mt-0.5" aria-hidden="true" /> <a className="underline" href={`mailto:${F.generalEmail}`}>{F.generalEmail}</a></p>
            <p className="flex gap-2"><Phone className="w-4 h-4 mt-0.5" aria-hidden="true" /> <a className="underline" href={`tel:${F.phone.replace(/\s/g, '')}`}>{F.phone}</a></p>
            <p className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5" aria-hidden="true" /> {F.publisher}, {F.address}</p>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Privacy requests go to our Data Protection Officer at <a className="text-blue-700 dark:text-blue-300 underline" href={`mailto:${F.dpoEmail}`}>{F.dpoEmail}</a>.
          </p>
          <p className="text-slate-600 dark:text-slate-300">In an emergency, call 911 or your local DRRM office.</p>
        </aside>
      </div>
    </>
  );
};

export default Contact;
