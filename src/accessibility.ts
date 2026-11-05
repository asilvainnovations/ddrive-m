import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

// Adapted from the ASilva Innovations Accessibility Policy (29 April 2026) as a DDRiVE-M accessibility
// statement. Conformance is stated honestly ("partially conforms") until a full WCAG audit (Phase 3).
export const accessibility: Policy = {
  slug: 'accessibility',
  title: 'Accessibility Statement',
  summary: 'Our accessibility target, where DDRiVE-M stands today, known gaps, and how to ask for help.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'Our target is WCAG 2.1 level AA for every DDRiVE-M screen.',
    'DDRiVE-M partially meets it today. Known gaps are listed below, with what to use instead.',
    'Tell us about any barrier. We aim to reply within 5 business days and fix blocking problems within 48 hours.',
  ],
  sections: [
    {
      id: 'commitment',
      title: '1. Our commitment',
      blocks: [
        { p: 'Disaster information has to reach everyone, including people who use screen readers, keyboards, magnification or slow connections. We design DDRiVE-M to the Web Content Accessibility Guidelines (WCAG) 2.1 level AA, and use EN 301 549 and ISO 30071-1 as reference standards.' },
        { p: 'In the Philippines, this supports the Magna Carta for Persons with Disability (RA 7277, as amended), which protects equal access to information.' },
      ],
    },
    {
      id: 'status',
      title: '2. Where we are today',
      blocks: [
        { p: 'DDRiVE-M partially conforms to WCAG 2.1 level AA: some parts do not fully meet the standard yet. A full independent audit is planned before general release.' },
        { p: 'What is in place:' },
        {
          ul: [
            'A "Skip to main content" link, headings and landmarks on every screen.',
            'Every control can be used with a keyboard, with a visible focus outline.',
            'Form fields have labels, and errors and status messages are announced to screen readers.',
            'Official alerts are not colour-coded: the signal number or event name is always written out.',
            'Text can be enlarged to 200% without losing content, and there is a dark mode.',
            'Screens load only when opened, to save data on slow connections, and open offline once installed.',
          ],
        },
      ],
    },
    {
      id: 'gaps',
      title: '3. Known gaps',
      blocks: [
        {
          table: {
            head: ['Gap', 'What to use instead', 'Plan'],
            rows: [
              ['The Google map on the Detection screen is hard to use with a keyboard or screen reader', 'The alert list beside it gives the same information as text', 'Accessible map with a text alternative for each plotted item'],
              ['The standalone tools (ICS simulator, PSCP template, Gawad Kalasag, FPIC tracker) and the user manual have not been reviewed yet', 'Ask us for the information in another format', 'Being moved into the app, and reviewed as they move'],
              ['The app is in English only', 'Ask us for help in Filipino', 'Filipino translation of the main screens'],
              ['Documents your organisation uploads may not be accessible', 'Ask the organisation that uploaded them', 'Guidance for accessible documents'],
            ],
          },
        },
      ],
    },
    {
      id: 'testing',
      title: '4. How we check',
      blocks: [
        { p: 'We check new screens with the keyboard alone and with a screen reader while they are built. Automated accessibility checks on every release, and testing with people with disabilities, are part of our plan before general release.' },
      ],
    },
    {
      id: 'remediation',
      title: '5. How quickly we fix problems',
      blocks: [
        {
          table: {
            head: ['Priority', 'Meaning', 'Target'],
            rows: [
              ['1, Critical', 'Stops someone from using a feature at all', 'Within 48 hours'],
              ['2, High', 'Makes a feature much harder to use', 'Within 1 week'],
              ['3, Medium', 'A workaround exists', 'Within 30 days'],
              ['4, Low', 'A minor issue', 'In the next scheduled update'],
            ],
          },
        },
      ],
    },
    {
      id: 'feedback',
      title: '6. Tell us about a barrier',
      blocks: [
        { p: `Email ${F.generalEmail} or call ${F.phone}. Tell us which screen, what you were trying to do, and what assistive technology you use, if any. We aim to reply within 5 business days, and we can give you the information in another format while we fix the problem.` },
        { p: 'If you are not satisfied with our response, you can contact the National Council on Disability Affairs (NCDA).' },
      ],
    },
  ],
};
