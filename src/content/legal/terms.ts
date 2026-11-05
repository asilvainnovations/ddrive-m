import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

// Adapted from the ASilva Innovations Terms of Service (29 April 2026) for DDRiVE-M, adding what a
// disaster-information service must say: it is not an official warning source, and false hazard
// information is a crime under RA 12287.
export const terms: Policy = {
  slug: 'terms',
  title: 'Terms of Service',
  summary: 'The agreement for using DDRiVE-M: accounts, your data, acceptable use, AI drafts, and liability.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'DDRiVE-M relays official warnings. It does not issue them, and it does not replace PAGASA, PHIVOLCS, NDRRMC, OCD or your local DRRM office.',
    'Your organisation owns the records it enters. We use them only to run the service for it.',
    'Never enter false hazard or risk information, or alter an assessment to support a declaration: both are crimes under RA 12287.',
    'AI answers and generated drafts are aids. A named person must review and approve them before they are used.',
    'Philippine law applies.',
  ],
  sections: [
    {
      id: 'agreement',
      title: '1. This agreement',
      blocks: [
        { p: `These terms are an agreement between you and ${F.publisher} for the use of DDRiVE-M, including its web app, installable app and help pages (the "Service"). By using the Service you accept these terms and the Privacy Policy. If you accept them for an organisation, you confirm that you are authorised to do so.` },
        { p: 'If your organisation has signed a separate agreement with us, that agreement takes precedence where it differs from these terms.' },
      ],
    },
    {
      id: 'warnings',
      title: '2. DDRiVE-M is not an official warning service',
      blocks: [
        { p: 'DDRiVE-M shows official alerts from PAGASA with their source, issue time and expiry, exactly as issued. It does not issue warnings, set wind signals or alert levels, or replace official channels.' },
        {
          ul: [
            'Feeds can be late or unavailable. The app shows when each feed was last read and warns you when it may be out of date.',
            'Decisions on evacuation, a declaration of a State of Imminent Disaster under RA 12287, or the release of funds rest with the responsible authorities. DDRiVE-M records those decisions; it does not make them.',
            'In an emergency, call 911 or your local DRRM office.',
          ],
        },
      ],
    },
    {
      id: 'accounts',
      title: '3. Accounts and organisations',
      blocks: [
        {
          ul: [
            'You must be at least 18 years old to have an account.',
            'Give accurate information and keep it up to date.',
            'Keep your password private. You are responsible for what happens under your account; tell us at once if you think someone else has used it.',
            'Your organisation’s administrators decide who joins and what role each person has. They are responsible for removing people who leave.',
          ],
        },
      ],
    },
    {
      id: 'data',
      title: '4. Your organisation’s data',
      blocks: [
        { p: 'Records your organisation enters belong to it. It gives us permission to store and process them only to provide the Service to it. You can ask for an export at any time.' },
        { p: 'Your organisation is responsible for having a lawful basis under the Data Privacy Act for any personal information it enters, and for its accuracy.' },
      ],
    },
    {
      id: 'use',
      title: '5. Acceptable use',
      blocks: [
        { p: 'Do not use the Service unlawfully or in a way that could harm people, the Service or other users. In particular, do not:' },
        {
          ul: [
            'enter false hazard or risk information, or manipulate a pre-disaster risk assessment or related information to support an improper declaration. Under sections 12 and 13 of RA 12287 these are punishable by a fine of ₱50,000 to ₱500,000, imprisonment, or both;',
            'try to reach another organisation’s records, another person’s account, or parts of the Service you are not allowed to use;',
            'interfere with the Service’s operation, security or performance, or send malicious code;',
            'send spam or phishing, or commit fraud;',
            'infringe anyone’s intellectual property;',
            'harass, threaten or harm anyone, including minors.',
          ],
        },
      ],
    },
    {
      id: 'ai',
      title: '6. AI answers and generated drafts',
      blocks: [
        { p: 'DDRiVER AI and the plan drafting tools support decisions; they do not make them. Answers cite their sources, but they can still be wrong or incomplete. Check them against the source before you act.' },
        { p: 'A generated plan (for example an LDRRMP, contingency plan, PSCP or business continuity plan) stays a draft until a named person in your organisation approves it. Do not enter information you are not allowed to share. Our AI Ethics and Governance Policy sets out the rules the AI features follow.' },
      ],
    },
    {
      id: 'third-party',
      title: '7. Official data and third-party content',
      blocks: [
        { p: 'Official alerts and bulletins belong to the agencies that issue them. PAGASA alerts are used under the Creative Commons Attribution 4.0 licence and are credited on screen. Maps are provided by Google under Google’s terms.' },
      ],
    },
    {
      id: 'availability',
      title: '8. Availability and changes',
      blocks: [
        { p: 'We work to keep the Service running, but we cannot promise it will always be available, timely or error-free. We may need to pause it for maintenance, and features may change. We will give notice of important changes.' },
      ],
    },
    {
      id: 'fees',
      title: '9. Fees',
      blocks: [{ p: 'Fees, if any, are set out on the Pricing page or in your organisation’s agreement. The app itself does not take payments.' }],
    },
    {
      id: 'ip',
      title: '10. Intellectual property',
      blocks: [
        {
          table: {
            head: ['Component', 'Who owns it', 'What you may do'],
            rows: [
              ['DDRiVE-M software', `${F.publisher}`, 'Use it under these terms. Do not copy, resell or reverse engineer it.'],
              ['Your organisation’s records', 'Your organisation', 'Everything; you can export them at any time.'],
              ['Documentation and templates', `${F.publisher}`, 'Use them within your organisation.'],
              ['Official alerts and bulletins', 'The issuing agency', 'Follow the agency’s licence; for PAGASA, credit the source.'],
            ],
          },
        },
        { p: 'If you send us feedback, we may use it to improve the Service without owing you anything.' },
      ],
    },
    {
      id: 'warranty',
      title: '11. No warranty',
      blocks: [{ p: 'The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose and non-infringement, to the extent the law allows.' }],
    },
    {
      id: 'liability',
      title: '12. Limitation of liability',
      blocks: [
        { p: `To the extent the law allows, ${F.publisher} is not liable for indirect, incidental, special, consequential or punitive damages, including loss of data, revenue or business. Our total liability for direct damages is limited to what your organisation paid for the Service in the 12 months before the claim.` },
        { p: 'Nothing in these terms limits liability that Philippine law does not allow to be limited, such as liability for fraud.' },
      ],
    },
    {
      id: 'indemnity',
      title: '13. Indemnification',
      blocks: [{ p: `You agree to defend and hold harmless ${F.publisher} and its officers, employees and partners against claims and costs, including reasonable legal fees, that arise from your breach of these terms or your infringement of anyone’s rights.` }],
    },
    {
      id: 'termination',
      title: '14. Suspension and ending',
      blocks: [{ p: 'We may suspend an account that breaks these terms or puts the Service or other users at risk, and we will tell you why unless the law or security prevents it. You can stop using the Service at any time. When an organisation leaves, it can export its records first.' }],
    },
    {
      id: 'law',
      title: '15. Governing law',
      blocks: [{ p: 'These terms are governed by the laws of the Republic of the Philippines. Disputes are subject to the courts of Metro Manila, unless the law requires otherwise.' }],
    },
    {
      id: 'general',
      title: '16. General',
      blocks: [{ p: 'If any part of these terms cannot be enforced, the rest still applies. Not enforcing a right is not giving it up.' }],
    },
    {
      id: 'contact',
      title: '17. Contact',
      blocks: [{ p: `Questions about these terms: ${F.legalEmail} or ${F.phone}, ${F.publisher}, ${F.address}. We aim to reply within 5 business days.` }],
    },
  ],
};
