import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CheckCircle2, Clock4, LayoutDashboard, PlayCircle, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Copy adapted from the DDRiVE-M landing page (formerly public/index.html). Claims are limited to what
// the platform does today; modules say plainly what is still being built. Figures such as numbers of
// LGUs or compliance rates are left out until there is a source for them.

const HERO_IMAGE = 'https://appimize.app/assets/apps/user_1097/images/493f05493f25_122_1097.png';
const VIDEO_ID = 'P6U9L8xxq4E';

type Status = 'available' | 'partial' | 'building';
const STATUS_LABEL: Record<Status, string> = { available: 'Available', partial: 'Partly available', building: 'In development' };
const STATUS_CLASS: Record<Status, string> = {
  available: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  partial: 'bg-amber-50 text-amber-900 border-amber-200',
  building: 'bg-slate-100 text-slate-700 border-slate-200',
};

const MODULES: { n: number; name: string; path: string; status: Status; text: string; next?: string }[] = [
  {
    n: 1, name: 'Detection', path: '/detection', status: 'available',
    text: 'Official PAGASA wind signals and flood advisories arrive automatically, with their source, issue time and expiry, and are flagged for the provinces your organisation watches. Log any alert as a hazard record for your team.',
    next: 'Coming: PHIVOLCS earthquake and volcano bulletins, NOAH hazard maps, alerts plotted on the map.',
  },
  {
    n: 2, name: 'Diagnosis', path: '/diagnosis', status: 'available',
    text: 'An ISO 31000-aligned risk register: strategic, operational, financial, compliance and environmental risks, rated by likelihood and impact against your organisation’s own criteria.',
    next: 'Coming: hazard × exposure × vulnerability analysis with PSA census layers.',
  },
  {
    n: 3, name: 'Response', path: '/response', status: 'available',
    text: 'Risk treatments and incident management: track incidents, assign tasks and follow progress. Anticipatory action under RA 12287 has its own workspace alongside it, from forecast trigger to the report to OCD.',
  },
  {
    n: 4, name: 'Integration', path: '/integration', status: 'available',
    text: 'Measure organisational and community resilience with the UNDRR Ten Essentials scorecard, and track your scores from year to year.',
  },
  {
    n: 5, name: 'Validation', path: '/validation', status: 'partial',
    text: 'Scenario-based exercises for typhoons, earthquakes and floods, and the ICS simulator for Emergency Operations Center procedures.',
    next: 'Coming: the simulators and exercise results inside the app, on your own data.',
  },
  {
    n: 6, name: 'Enhancement', path: '/enhancement', status: 'partial',
    text: 'DRRM, contingency, continuity and recovery plan drafts from templates aligned with RA 10121, ISO 22301 and the Public Service Continuity Plan (PSCP) guide.',
    next: 'Coming: editable drafts generated from your records, each needing a named approver.',
  },
  {
    n: 7, name: 'Monitoring', path: '/monitoring', status: 'available',
    text: 'A coordination hub for your team: messages, presence and shared updates during assessments and events.',
  },
];

const LIVE_NOW = [
  { icon: BellRing, title: 'Official alerts, every 10 minutes', text: 'PAGASA alerts with source, issue and expiry times. If the feed goes quiet, the app says so.' },
  { icon: ShieldCheck, title: 'Your records stay yours', text: 'Each organisation sees only its own records. Roles decide who can add, approve and change them.' },
  { icon: Clock4, title: 'Anticipatory action, step by step', text: 'From forecast trigger to declaration, fund use and lifting report, as set out in RA 12287.' },
  { icon: Smartphone, title: 'Install it, open it offline', text: 'Add DDRiVE-M to your phone or computer. Screens open without a connection.' },
];

const FRAMEWORKS = [
  { code: 'RA 10121', text: 'Philippine Disaster Risk Reduction and Management Act of 2010' },
  { code: 'RA 12287', text: 'Declaration of State of Imminent Disaster Act (anticipatory action), 2025' },
  { code: 'RA 10173', text: 'Data Privacy Act of 2012' },
  { code: 'ISO 31000', text: 'Risk management guidelines' },
  { code: 'UNDRR MCR2030', text: 'Making Cities Resilient 2030 and the Ten Essentials' },
];

const VideoPlayer: React.FC = () => {
  // Loads YouTube only when asked, so visiting the Home page sends nothing to Google.
  const [play, setPlay] = useState(false);
  return (
    <div className="relative w-full max-w-3xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-lg bg-slate-900">
      {play ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1`}
          title="DDRiVE-M overview video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 text-white bg-gradient-to-br from-blue-900 to-sky-900 hover:from-blue-800"
        >
          <PlayCircle className="w-16 h-16" aria-hidden="true" />
          <span className="font-semibold">Play the DDRiVE-M video</span>
          <span className="text-xs text-blue-100">Plays from YouTube (privacy-enhanced mode)</span>
        </button>
      )}
    </div>
  );
};

const Home: React.FC = () => {
  const { user, openLogin } = useAuth();
  useEffect(() => {
    document.title = 'DDRiVE-M | Risk and Resilience Intelligence Platform';
  }, []);

  const Primary: React.FC<{ label: string; className?: string }> = ({ label, className }) =>
    user ? (
      <Link to="/dashboard" className={cn('inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold', className)}>
        <LayoutDashboard className="w-5 h-5" aria-hidden="true" /> {label}
      </Link>
    ) : (
      <Link to="/dashboard" onClick={() => openLogin()} className={cn('inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold', className)}>
        <LayoutDashboard className="w-5 h-5" aria-hidden="true" /> {label}
      </Link>
    );

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-900 to-sky-900 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
          <p className="text-amber-300 font-semibold text-sm tracking-widest uppercase mb-4">DDRiVE-M · Data-Driven Resilience Management</p>
          <h1 className="font-montserrat font-extrabold text-3xl sm:text-5xl leading-tight">
            Disaster resilience intelligence for LGUs, enterprises and development institutions
          </h1>
          <p className="mt-6 text-lg text-blue-100">
            One platform for the whole disaster risk reduction and management cycle, from detection to recovery, built around
            RA 10121, RA 12287, ISO 31000 and the UNDRR frameworks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Primary label="Open dashboard" />
            <a href="#video" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/70 hover:bg-white/10 font-semibold">
              <PlayCircle className="w-5 h-5" aria-hidden="true" /> Watch the video
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 justify-center" aria-label="Frameworks">
            {['Built around RA 10121', 'RA 12287 anticipatory action', 'ISO 31000', 'UNDRR MCR2030', 'RA 10173 privacy'].map((b) => (
              <li key={b} className="px-3 py-1 rounded-full bg-white/15 text-sm font-medium">{b}</li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-blue-200">
            DDRiVE-M relays official warnings; it does not issue them. Always follow PAGASA, PHIVOLCS and your local DRRM office.
          </p>
        </div>
        <img
          src={HERO_IMAGE}
          alt="The DDRiVE-M intelligence cycle: detection, diagnosis, response, integration, validation, enhancement and monitoring"
          className="w-full max-w-6xl mx-auto block"
          loading="lazy"
        />
      </section>

      {/* What works today */}
      <section className="max-w-6xl mx-auto px-4 py-14" aria-labelledby="live-now">
        <h2 id="live-now" className="font-montserrat font-bold text-2xl sm:text-3xl text-center">Working today</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LIVE_NOW.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <Icon className="w-6 h-6 text-blue-700 dark:text-blue-300" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seven modules */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800" aria-labelledby="modules">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 id="modules" className="font-montserrat font-bold text-2xl sm:text-3xl text-center">The seven risk and resilience intelligence modules</h2>
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            An end-to-end resilience cycle, designed for Philippine local government units and the organisations that work with them.
          </p>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.n} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-700 to-amber-500 text-white font-bold flex items-center justify-center" aria-hidden="true">
                    {m.n}
                  </span>
                  <h3 className="font-montserrat font-bold text-lg">
                    <span className="sr-only">Module {m.n}: </span>{m.name}
                  </h3>
                  <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full border', STATUS_CLASS[m.status])}>{STATUS_LABEL[m.status]}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 flex-1">{m.text}</p>
                {m.next && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{m.next}</p>}
                <Link to={m.path} className="mt-4 text-sm font-semibold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1 hover:underline">
                  Open {m.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Video */}
      <section id="video" className="max-w-6xl mx-auto px-4 py-14 scroll-mt-20" aria-labelledby="video-heading">
        <h2 id="video-heading" className="font-montserrat font-bold text-2xl sm:text-3xl text-center mb-8">See DDRiVE-M in action</h2>
        <VideoPlayer />
      </section>

      {/* Frameworks */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800" aria-labelledby="frameworks">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 id="frameworks" className="font-montserrat font-bold text-2xl sm:text-3xl text-center">Philippine laws and international standards</h2>
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            DDRiVE-M’s workflows follow these laws and frameworks. Using the platform supports your compliance; it does not certify it.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FRAMEWORKS.map((f) => (
              <li key={f.code} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5 text-center">
                <CheckCircle2 className="w-6 h-6 mx-auto text-blue-700 dark:text-blue-300" aria-hidden="true" />
                <p className="mt-2 font-montserrat font-bold">{f.code}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="font-montserrat font-bold text-2xl sm:text-3xl">Ready to turn risk into resilience?</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Set up your organisation, invite your DRRM team and start with the official alerts for the provinces you cover.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Primary label="Get started" />
          <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-700 text-blue-800 dark:text-blue-200 font-semibold hover:bg-blue-50 dark:hover:bg-white/5">
            Talk to us
          </Link>
        </div>
      </section>
    </>
  );
};

export default Home;
