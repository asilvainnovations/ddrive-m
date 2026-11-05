import React from 'react';
import { ExternalLink } from 'lucide-react';
import PageHeader from './PageHeader';

interface R { name: string; href: string; text: string; external?: boolean }

const GROUPS: { heading: string; intro: string; items: R[] }[] = [
  {
    heading: 'Official warnings and hazard information',
    intro: 'Always the first place to look. DDRiVE-M relays some of these; it does not replace them.',
    items: [
      { name: 'PAGASA', href: 'https://www.pagasa.dost.gov.ph', text: 'Weather, tropical cyclone, rainfall and flood warnings', external: true },
      { name: 'PAGASA public alerts (CAP)', href: 'https://publicalert.pagasa.dost.gov.ph', text: 'The alert feed DDRiVE-M reads', external: true },
      { name: 'PHIVOLCS', href: 'https://www.phivolcs.dost.gov.ph', text: 'Earthquake, tsunami and volcano bulletins', external: true },
      { name: 'NDRRMC', href: 'https://ndrrmc.gov.ph', text: 'National situation reports and advisories', external: true },
      { name: 'Office of Civil Defense', href: 'https://ocd.gov.ph', text: 'National civil defense and RA 12287 implementation', external: true },
      { name: 'Project NOAH', href: 'https://noah.up.edu.ph', text: 'Flood, landslide and storm surge hazard maps', external: true },
      { name: 'HazardHunterPH', href: 'https://hazardhunter.georisk.gov.ph', text: 'Hazard assessment for any location', external: true },
    ],
  },
  {
    heading: 'Laws and frameworks',
    intro: 'The laws and standards DDRiVE-M’s workflows follow.',
    items: [
      { name: 'RA 10121', href: 'https://lawphil.net/statutes/repacts/ra2010/ra_10121_2010.html', text: 'Philippine Disaster Risk Reduction and Management Act of 2010', external: true },
      { name: 'RA 12287', href: 'https://lawphil.net/statutes/repacts/ra2025/ra_12287_2025.html', text: 'Declaration of State of Imminent Disaster Act (anticipatory action)', external: true },
      { name: 'RA 10173', href: 'https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html', text: 'Data Privacy Act of 2012', external: true },
      { name: 'UNDRR MCR2030', href: 'https://mcr2030.undrr.org', text: 'Making Cities Resilient 2030 and the Ten Essentials', external: true },
      { name: 'Philippine Statistics Authority', href: 'https://psa.gov.ph', text: 'Census and PSGC location codes', external: true },
    ],
  },
  {
    heading: 'DDRiVE-M tools and guides',
    intro: 'Standalone tools that are being moved into the app.',
    items: [
      { name: 'User manual', href: '/user-manual.html', text: 'Guides for every module' },
      { name: 'Understanding ICS', href: '/understanding-ics.html', text: 'The Incident Command System explained' },
      { name: 'ICS simulator', href: '/ics-simulator-3.0.html', text: 'Practise Emergency Operations Center procedures' },
      { name: 'PSCP template', href: '/PSCP-Digital-Template.html', text: 'Public Service Continuity Plan, digital template' },
      { name: 'Gawad Kalasag', href: '/gawad-kalasag.html', text: 'Self-assessment for the Gawad KALASAG awards' },
      { name: 'Safeguard and FPIC tracker', href: '/Safeguard-FPIC-Tracker.html', text: 'Free, prior and informed consent tracking' },
      { name: 'SPARC tool', href: '/sparc.html', text: 'Resilience scorecard tool' },
    ],
  },
];

const Resources: React.FC = () => (
  <>
    <PageHeader eyebrow="Resources" title="Official sources, laws and tools" intro="Where to find authoritative information, and the DDRiVE-M tools that go with it." />
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      {GROUPS.map((g) => (
        <section key={g.heading} aria-labelledby={g.heading}>
          <h2 id={g.heading} className="font-montserrat font-bold text-xl sm:text-2xl text-blue-800 dark:text-blue-300">{g.heading}</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{g.intro}</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((r) => (
              <li key={r.name}>
                <a
                  href={r.href}
                  {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="block h-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-600 hover:shadow-md transition"
                >
                  <span className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1">
                    {r.name}
                    {r.external && <ExternalLink className="w-3.5 h-3.5" aria-label="(opens in a new tab)" />}
                  </span>
                  <span className="block mt-1 text-sm text-slate-600 dark:text-slate-300">{r.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </>
);

export default Resources;
