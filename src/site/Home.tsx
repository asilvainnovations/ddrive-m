import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CheckCircle2, Clock4, LayoutDashboard, PlayCircle, ShieldCheck, Smartphone, RefreshCw, Network, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { SITE_FULL_NAME } from '@/lib/brand';

// Public-facing description of the seven-phase Integrated Resilience Intelligence Cycle.
// Capability labels describe the current application surface, not institutional certification.

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
    text: 'Bring official PAGASA alerts and organisation-reported hazard information into a shared operational picture. Preserve source, issue time, expiry and freshness so teams can distinguish an official warning from a locally recorded observation.',
    next: 'Next: extend verified multi-agency feeds, geospatial visualisation and structured community observations.',
  },
  {
    n: 2, name: 'Diagnosis', path: '/diagnosis', status: 'partial',
    text: 'Organise strategic, operational, financial, compliance and environmental risks in a traceable risk register. This is the foundation for integrated risk analysis—not a substitute for a full Climate and Disaster Risk Assessment (CDRA).',
    next: 'Next: connect hazard, exposure, vulnerability, capacity, climate projections, spatial evidence and disaggregated data.',
  },
  {
    n: 3, name: 'Response', path: '/response', status: 'partial',
    text: 'Translate risk and incident information into assigned treatments, operational tasks and coordinated action. The separate anticipatory-action workspace records the RA 12287 process while leaving statutory decisions with the competent authorities.',
    next: 'Next: complete EOC workflows, tasking, resource tracking and harmonised situation reporting.',
  },
  {
    n: 4, name: 'Integration', path: '/integration', status: 'partial',
    text: 'Connect risk priorities with governance, institutional capability and the UNDRR Ten Essentials. The aim is to make resilience a whole-of-organisation and whole-of-city responsibility, linked to plans, budgets and accountable owners.',
    next: 'Next: evidence-backed indicator baselines, targets, budgets, responsible offices and outcome measures.',
  },
  {
    n: 5, name: 'Validation', path: '/validation', status: 'partial',
    text: 'Use scenarios, simulations and exercises to test whether plans, people, coordination arrangements and systems work under pressure. Validation should produce an after-action review and tracked corrective actions.',
    next: 'Next: bring exercise design, participation, observations, AARs and corrective-action closure into one evidence trail.',
  },
  {
    n: 6, name: 'Enhancement', path: '/enhancement', status: 'partial',
    text: 'Turn validated findings into improved DRRM, contingency, continuity, adaptation and recovery plans. Generated or assisted content remains a draft until reviewed and approved by an authorised person.',
    next: 'Next: link approved actions to CDRA findings, CLUP/CDP/LDRRMP priorities, investment programmes and recovery needs.',
  },
  {
    n: 7, name: 'Monitoring', path: '/monitoring', status: 'partial',
    text: 'Maintain shared updates, operational messages and visibility of progress. Monitoring should show not only activity, but whether governance, preparedness, response and resilience outcomes are improving.',
    next: 'Next: outcome indicators, disaggregated reporting, data-quality checks and structured feedback into the next cycle.',
  },
];

const LIVE_NOW = [
  { icon: BellRing, title: 'Official alert ingestion', text: 'The platform ingests PAGASA alert information with source and time context. It relays official information; it does not issue warnings.' },
  { icon: ShieldCheck, title: 'Organisation-scoped access design', text: 'Tenant membership, role-based permissions and database policies are part of the architecture. Production assurance still requires live-environment and adversarial testing.' },
  { icon: Clock4, title: 'Human-authorised decisions', text: 'The anticipatory-action workflow records assessments, recommendations, orders, fund use and reports. Competent officials—not software—make statutory decisions.' },
  { icon: Smartphone, title: 'Installable application shell', text: 'The PWA shell can be installed and its application assets can load offline. Do not assume live records, alerts or decision workflows are available without connectivity.' },
];

const FRAMEWORKS = [
  { code: 'RA 10121', text: 'Philippine Disaster Risk Reduction and Management Act of 2010' },
  { code: 'RA 12287', text: 'Declaration of State of Imminent Disaster Act and its implementing rules' },
  { code: 'RA 10173', text: 'Data Privacy Act of 2012' },
  { code: 'NDRRMC / DILG', text: 'EOC, coordination and disaster-response reporting guidance' },
  { code: 'UNDRR MCR2030', text: 'Making Cities Resilient 2030 and the Ten Essentials' },
  { code: 'CDRA / CLUP', text: 'Climate and disaster risk assessment and spatial planning guidance' },
];

const VideoPlayer: React.FC = () => {
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
    document.title = `DDRiVE-M | ${SITE_FULL_NAME}`;
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
      <section className="bg-gradient-to-br from-blue-900 via-blue-900 to-sky-900 text-white">
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
          <p className="text-amber-300 font-semibold text-sm tracking-wide mb-4">
            <span className="text-lg">DDRiVE-M</span> · {SITE_FULL_NAME}
          </p>
          <h1 className="font-montserrat font-extrabold text-3xl sm:text-5xl leading-tight">
            Integrated resilience intelligence—from risk insight to measurable outcomes
          </h1>
          <p className="mt-6 text-lg text-blue-100 max-w-4xl mx-auto">
            DDRiVE-M is designed around the integration of <strong>risk intelligence, governance, operational decisions and resilience outcomes</strong>.
            It connects seven phases in one continuous feedback loop—so evidence informs priorities, priorities guide action, and lessons and results strengthen the next cycle.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Primary label="Open dashboard" />
            <a href="#cycle" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/70 hover:bg-white/10 font-semibold">
              <Network className="w-5 h-5" aria-hidden="true" /> Explore the cycle
            </a>
            <a href="#video" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/70 hover:bg-white/10 font-semibold">
              <PlayCircle className="w-5 h-5" aria-hidden="true" /> Watch the video
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 justify-center" aria-label="Frameworks">
            {['RA 10121', 'RA 12287', 'RA 10173', 'UNDRR MCR2030', 'CDRA / CLUP'].map((b) => (
              <li key={b} className="px-3 py-1 rounded-full bg-white/15 text-sm font-medium">{b}</li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-blue-200">
            DDRiVE-M supports evidence-informed work. It does not replace official warning authorities, statutory decision-makers or an organisation’s approved plans and procedures.
          </p>
          <p className="mt-2 text-xs text-blue-100">
            <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link> ·{' '}
            <Link to="/terms-of-service" className="underline hover:text-white">Terms of Service</Link>
          </p>
        </div>
        <img
          src={HERO_IMAGE}
          alt="DDRiVE-M seven-phase integrated resilience intelligence cycle connecting detection, diagnosis, response, integration, validation, enhancement and monitoring"
          className="w-full max-w-6xl mx-auto block"
          loading="lazy"
        />
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14" aria-labelledby="architecture">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300">The architecture</p>
          <h2 id="architecture" className="mt-2 font-montserrat font-bold text-2xl sm:text-3xl">Four connected dimensions. One resilience system.</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            The platform is not intended to be a collection of disconnected dashboards. It is an organising architecture that connects what is known about risk,
            who is responsible, what must be decided and done, and whether those actions are reducing risk and strengthening resilience.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BellRing, title: 'Risk intelligence', text: 'Hazard and exposure information, vulnerability and capacity evidence, risk analysis, uncertainty and source provenance.' },
            { icon: ShieldCheck, title: 'Governance', text: 'Mandates, roles, institutional arrangements, plans, budgets, accountability and safeguards.' },
            { icon: Target, title: 'Operational decisions', text: 'Prioritised actions, EOC coordination, anticipatory measures, response, resource mobilisation and authorised approvals.' },
            { icon: CheckCircle2, title: 'Resilience outcomes', text: 'Validated capability, reduced risk, continuity, recovery progress, learning and measurable improvements.' },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <Icon className="w-7 h-7 text-blue-700 dark:text-blue-300" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="cycle" className="bg-slate-50 dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800" aria-labelledby="cycle-heading">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300">Continuous feedback loop</p>
            <h2 id="cycle-heading" className="mt-2 font-montserrat font-bold text-2xl sm:text-3xl">Seven phases. Connected—not linear.</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Each phase produces information and decisions that become inputs to the next. Monitoring, validation and operational learning feed back into
              detection, diagnosis, governance and investment priorities. The cycle repeats as risks, conditions and capacities change.
            </p>
          </div>
          <ol className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['1', 'Detection', 'Observe hazards, warnings, changing conditions and community signals.'],
              ['2', 'Diagnosis', 'Interpret risk through hazard, exposure, vulnerability and capacity evidence.'],
              ['3', 'Response', 'Make and coordinate risk-informed operational decisions and actions.'],
              ['4', 'Integration', 'Embed risk priorities in governance, plans, budgets and institutions.'],
              ['5', 'Validation', 'Test plans, capabilities, assumptions and coordination through exercises.'],
              ['6', 'Enhancement', 'Improve policies, plans, investments and recovery pathways using evidence.'],
              ['7', 'Monitoring', 'Track implementation, performance, resilience outcomes and emerging change.'],
            ].map(([n, title, description]) => (
              <li key={n} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-800 text-white font-bold flex items-center justify-center">{n}</span>
                  <h3 className="font-montserrat font-bold">{title}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-5 flex flex-col sm:flex-row gap-4 items-center">
            <RefreshCw className="w-8 h-8 text-blue-800 dark:text-blue-300 shrink-0" aria-hidden="true" />
            <p className="text-sm text-blue-950 dark:text-blue-100">
              <strong>The feedback principle:</strong> new alerts and observations update the risk picture; risk findings reshape decisions and priorities;
              exercises and real events test whether arrangements work; monitoring and after-action learning improve the next round of governance, planning and action.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14" aria-labelledby="live-now">
        <h2 id="live-now" className="font-montserrat font-bold text-2xl sm:text-3xl text-center">What the platform currently supports</h2>
        <p className="mt-3 text-center text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
          These are current application capabilities, not a claim that every workflow is complete or that an LGU has achieved operational readiness.
        </p>
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

      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800" aria-labelledby="modules">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 id="modules" className="font-montserrat font-bold text-2xl sm:text-3xl text-center">The seven phases of the Integrated Resilience Intelligence Cycle</h2>
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Each module has a distinct function, but none is the whole system. Their value comes from connecting evidence, governance, decisions and outcomes across the cycle.
          </p>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.n} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-700 to-amber-500 text-white font-bold flex items-center justify-center" aria-hidden="true">{m.n}</span>
                  <h3 className="font-montserrat font-bold text-lg"><span className="sr-only">Phase {m.n}: </span>{m.name}</h3>
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

      <section id="video" className="max-w-6xl mx-auto px-4 py-14 scroll-mt-20" aria-labelledby="video-heading">
        <h2 id="video-heading" className="font-montserrat font-bold text-2xl sm:text-3xl text-center mb-8">See DDRiVE-M in action</h2>
        <VideoPlayer />
      </section>

      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800" aria-labelledby="frameworks">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 id="frameworks" className="font-montserrat font-bold text-2xl sm:text-3xl text-center">Philippine laws, operational guidance and resilience frameworks</h2>
          <p className="mt-3 text-center text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            DDRiVE-M is designed to support work aligned with these requirements. Use of the platform does not, by itself, establish legal compliance,
            complete a CDRA, certify an EOC or demonstrate resilience.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="font-montserrat font-bold text-2xl sm:text-3xl">Turn risk intelligence into accountable resilience action</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Bring your team together around a shared risk picture, clear responsibilities, informed decisions and measurable learning.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Primary label="Get started" />
          <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-700 text-blue-800 dark:text-blue-200 font-semibold hover:bg-blue-50 dark:hover:bg-white/5">Talk to us</Link>
        </div>
      </section>
    </>
  );
};

export default Home;
