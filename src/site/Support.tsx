import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, LifeBuoy, Mail, Phone, Siren } from 'lucide-react';
import { LEGAL_FACTS as F } from '@/content/legal';
import PageHeader from './PageHeader';

const Card: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
    <Icon className="w-6 h-6 text-blue-700 dark:text-blue-300" aria-hidden="true" />
    <h2 className="mt-3 font-montserrat font-bold text-lg">{title}</h2>
    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-2">{children}</div>
  </div>
);

const Support: React.FC = () => (
  <>
    <PageHeader eyebrow="Support" title="Get help with DDRiVE-M" intro="Guides, answers and people to talk to." />
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      <p className="flex gap-3 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-5 text-red-950 dark:text-red-100">
        <Siren className="w-6 h-6 shrink-0" aria-hidden="true" />
        <span>
          <strong>In an emergency, call 911 or your local DRRM office.</strong> DDRiVE-M support cannot dispatch help, and DDRiVE-M
          is not a source of official warnings.
        </span>
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Card icon={BookOpen} title="User manual">
          <p>Step-by-step guides for every module, from setting watch areas to recording an anticipatory action case.</p>
          <a href="/user-manual.html" className="font-semibold text-blue-700 dark:text-blue-300 hover:underline">Open the user manual</a>
        </Card>
        <Card icon={HelpCircle} title="Frequently asked questions">
          <p>Short answers about accounts, roles, official alerts and data.</p>
          <a href="/faq.html" className="font-semibold text-blue-700 dark:text-blue-300 hover:underline">Read the FAQ</a>
        </Card>
        <Card icon={Mail} title="Email support">
          <p>
            Write to <a className="font-semibold text-blue-700 dark:text-blue-300 hover:underline" href={`mailto:${F.generalEmail}?subject=DDRiVE-M%20support`}>{F.generalEmail}</a>.
            Tell us your organisation, the screen you were on, what you expected, and what happened. A screenshot helps.
          </p>
        </Card>
        <Card icon={Phone} title="Phone">
          <p><a className="font-semibold text-blue-700 dark:text-blue-300 hover:underline" href={`tel:${F.phone.replace(/\s/g, '')}`}>{F.phone}</a></p>
          <p>For safety concerns about the AI features, say "URGENT SAFETY CONCERN".</p>
        </Card>
      </div>
      <Card icon={LifeBuoy} title="Common questions">
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold text-slate-900 dark:text-white">I can’t see my organisation’s records.</dt>
            <dd>Check you are signed in and working in the right organisation (account menu, top right). Your administrator sets your role in Settings → Organisation.</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900 dark:text-white">The dashboard says the PAGASA feed may be out of date.</dt>
            <dd>DDRiVE-M has not been able to read PAGASA’s feed for 30 minutes. Check pagasa.dost.gov.ph directly and tell your administrator.</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900 dark:text-white">Can I use DDRiVE-M without a connection?</dt>
            <dd>Once installed, the screens open offline, but records and alerts cannot be refreshed or saved until you reconnect.</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900 dark:text-white">I found an accessibility barrier.</dt>
            <dd>Please tell us; see the <Link className="text-blue-700 dark:text-blue-300 hover:underline" to="/policies/accessibility">Accessibility Statement</Link>.</dd>
          </div>
        </dl>
      </Card>
    </div>
  </>
);

export default Support;
