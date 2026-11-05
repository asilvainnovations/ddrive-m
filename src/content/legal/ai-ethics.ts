import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

// Adapted from the ASilva Innovations AI Ethics and Policy (effective 24 February 2026, updated 29 April
// 2026), signed by its Chief Executive Officer, and turned into concrete rules for DDRiVE-M's AI features.
// The governance commitments (Ethics Board, assessments, pledge) are ASilva's own, kept as published.
export const aiEthics: Policy = {
  slug: 'ai-ethics',
  title: 'AI Ethics and Governance Policy',
  summary: 'The rules DDRiVE-M’s AI features follow, who oversees them, and how to report a concern.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'AI supports human decisions; people decide. Life-critical decisions always stay with named people.',
    'Every AI answer cites its source. Without a source, the assistant says it does not know.',
    'AI never issues, changes or guesses an official warning, signal or alert level.',
    'Your organisation’s records are used only to answer your organisation, and never to train models.',
    'Report any concern: info@asilvainnovations.com or the 24-hour hotline.',
  ],
  sections: [
    {
      id: 'status',
      title: '1. Where the AI features stand',
      blocks: [
        { note: 'DDRiVER AI, the DDRiVE-M assistant, is not connected yet. These rules apply from the day it is, and to every AI feature added after it. The rules on official warnings and on figures needing a source already apply to the whole platform.' },
      ],
    },
    {
      id: 'principles',
      title: '2. Our principles',
      blocks: [
        { p: '"Technology that builds unbreakable communities must itself be built on unbreakable ethical foundations." (ASilva Innovations Ethical AI Manifesto)' },
        {
          ul: [
            'Human in command: AI adds to human judgment and never replaces it in decisions about life and safety.',
            'Context: the assistant is built for Philippine communities, LGU workflows and Philippine DRRM law.',
            'Justice and fairness: we look for bias that could disadvantage marginalised communities, and risk analysis puts the most vulnerable people first.',
            'Transparency: you can always see why the assistant said what it said, and what it is unsure about.',
            'Accessibility: AI features meet the same accessibility standard as the rest of DDRiVE-M and work on slow connections.',
          ],
        },
      ],
    },
    {
      id: 'rules',
      title: '3. Rules every AI feature follows',
      blocks: [
        {
          table: {
            head: ['Rule', 'What it means in DDRiVE-M'],
            rows: [
              ['Sources for every answer', 'Answers cite the document, record or agency bulletin they rely on, with a link. If nothing supports an answer, the assistant says so instead of guessing.'],
              ['No AI warnings', 'The assistant never issues, changes or predicts warnings, wind signals or alert levels. It quotes official ones with their source and time.'],
              ['People decide', 'Evacuation, a declaration of a State of Imminent Disaster under RA 12287, and the release of funds are decided and recorded by named people. AI may help prepare the paperwork.'],
              ['Drafts need approval', 'Generated plans (LDRRMP, contingency, PSCP, business continuity) are editable drafts until a named person approves them.'],
              ['Uncertainty shown', 'Forecast-based estimates show their inputs and a range, never a single figure presented as certain.'],
              ['Your data stays yours', 'Your organisation’s records are used only to answer your organisation’s questions. They are never shared with other organisations or used to train AI models.'],
              ['Everything logged', 'Questions, the sources used and the answers are logged, and your organisation’s administrators can review them.'],
              ['Tested against manipulation', 'Before each release, the assistant is tested against hidden instructions in documents, feeds and messages (prompt injection).'],
              ['Works without AI', 'Every core function works without the assistant, including when the connection is poor.'],
            ],
          },
        },
      ],
    },
    {
      id: 'governance',
      title: '4. Governance',
      blocks: [
        { p: 'ASilva Innovations’ AI Ethics Board has 7 members, including ethicists, a disaster response practitioner, a community representative, a data privacy expert and technical leads. It can stop the release of any AI feature pending ethical review, and meets quarterly in public sessions with published minutes.' },
        { p: 'Before any new AI capability is released, an ethical impact assessment answers these questions:' },
        {
          table: {
            head: ['Area', 'Question'],
            rows: [
              ['Human rights', 'Could this put the right to life or safety at risk during a disaster?'],
              ['Power', 'Does this move decisions away from affected communities?'],
              ['Cultural safety', 'Does it respect indigenous knowledge systems?'],
              ['Long-term effects', 'Could relying on it weaken communities’ own organisation?'],
              ['Exit', 'How will communities manage if support ends?'],
            ],
          },
        },
        { p: 'Each AI model used in production has a model card describing what it can and cannot do.' },
      ],
    },
    {
      id: 'protocols',
      title: '5. Rules for disaster work and for LGUs',
      blocks: [
        {
          ul: [
            'Before an event: forecasts and estimates come with confidence ranges, never single-point predictions.',
            'During an event: systems keep working, in reduced form, when the connection is lost.',
            'After an event: AI damage assessments are checked against ground truth within 72 hours.',
            'For LGUs: open data formats and documented interfaces, so there is no lock-in; AI work is clearly labelled as such in procurement; staff are trained on what the AI cannot do.',
          ],
        },
      ],
    },
    {
      id: 'compliance',
      title: '6. Laws and standards',
      blocks: [
        {
          ul: [
            'Data Privacy Act (RA 10173): a Data Protection Officer, and privacy impact assessments for AI features.',
            'Philippine DRRM Act (RA 10121): AI features support the National DRRM Framework and LGU plans.',
            'Declaration of State of Imminent Disaster Act (RA 12287): AI never creates hazard or risk information, and never alters assessments.',
            'Local Government Code: each LGU decides whether and how to use AI features.',
            'ISO/IEC 23894 for AI risk management; the EU AI Act’s high-risk requirements as a benchmark for disaster response AI; and the UN Guiding Principles on Business and Human Rights.',
          ],
        },
      ],
    },
    {
      id: 'pledge',
      title: '7. Our pledge to vulnerable communities',
      blocks: [
        { p: 'Our AI tools work where mistakes can cost lives. We pledge:' },
        {
          ul: [
            'No exploitation: we will never sell crisis data or predictions about vulnerable people.',
            'No abandonment: AI systems deployed in disaster-prone areas are supported for at least 5 years.',
            'No opacity: we explain the AI’s limits in plain language before it is used.',
            'No extraction: communities that contribute data receive capacity building in return.',
            'No exceptions: emergencies do not suspend these safeguards.',
          ],
        },
      ],
    },
    {
      id: 'report',
      title: '8. Reporting a concern',
      blocks: [
        { p: 'This policy binds all ASilva Innovations personnel, contractors and partners. Breaches can lead to an AI feature being suspended immediately.' },
        { p: `Email ${F.generalEmail} or call the hotline ${F.phone}, 24 hours a day. For an urgent safety issue, say "URGENT SAFETY CONCERN" to be dealt with at once.` },
      ],
    },
  ],
  signoff: { name: 'Alvin Silva', role: 'Chief Executive Officer, ASilva Innovations' },
};
