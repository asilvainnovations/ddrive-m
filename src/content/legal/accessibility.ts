import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

export const accessibility: Policy = {
  slug: 'accessibility',
  title: 'Accessibility Statement',
  summary: 'Our accessibility objectives, current assurance status and how to report a barrier.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'DDRiVE-M aims to support accessible use in emergency-management and resilience workflows.',
    'WCAG 2.1 AA is a target for design and testing, not a claim of independently verified conformance.',
    'Users can report barriers and request information in an alternative format.',
  ],
  sections: [
    { id: 'commitment', title: '1. Our commitment', blocks: [
      { p: 'Disaster and resilience information should be usable by people with different abilities, devices, literacy levels and connectivity conditions. DDRiVE-M uses the Web Content Accessibility Guidelines (WCAG) as a design and evaluation reference, with WCAG 2.1 Level AA as the current target.' },
      { p: 'The platform has not been represented here as independently certified or fully conformant. Conformance must be established through automated checks, manual keyboard and screen-reader testing, representative device testing and evaluation with users with disabilities.' },
    ] },
    { id: 'status', title: '2. Current assurance status', blocks: [
      { note: 'Accessibility status: not yet independently audited. Individual implemented features must not be interpreted as proof of whole-platform conformance.' },
      { p: 'The development team should maintain an accessibility test record covering keyboard operation, focus visibility and order, semantics and landmarks, labels and errors, contrast, zoom/reflow, non-text alternatives, status announcements, maps and charts, documents, and mobile interaction.' },
    ] },
    { id: 'known', title: '3. Known evaluation areas', blocks: [
      { ul: [
        'Interactive maps and geospatial visualisations must have equivalent text-based information and usable keyboard alternatives.',
        'Charts, risk matrices and status indicators must not rely on colour alone.',
        'Alerts and time-critical messages must be announced clearly and remain understandable to assistive technologies.',
        'Standalone tools, uploaded documents, generated reports and embedded third-party content require separate evaluation.',
        'Low-bandwidth and mobile use must be tested without removing access to essential information.',
      ] },
    ] },
    { id: 'feedback', title: '4. Report an accessibility barrier', blocks: [
      { p: `Email ${F.generalEmail} or call ${F.phone}. Include the page or feature, the task you were attempting, the barrier encountered and any assistive technology or device details you wish to share. Do not include sensitive personal or health information in a general support request.` },
    ] },
  ],
};
