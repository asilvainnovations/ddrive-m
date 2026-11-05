import type { Policy } from './types';
import { LEGAL_FACTS as F, fact } from './facts';

// Adapted from the ASilva Innovations Privacy Policy (29 April 2026) for DDRiVE-M. Statements are limited
// to what DDRiVE-M actually does: its hosting (Supabase), the third parties the app loads, and the
// security controls that exist in the code. Anything only ASilva can confirm comes from facts.ts.
export const privacy: Policy = {
  slug: 'privacy',
  title: 'Privacy Policy',
  summary: 'What personal information DDRiVE-M collects, why, who processes it, and your rights under the Data Privacy Act.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'We collect what is needed to run your account and your organisation’s workspace, nothing for advertising.',
    'Your organisation owns the records it enters and decides how they are used; we process them on its behalf.',
    'Each organisation sees only its own records. This is enforced in the database, not just on screen.',
    'We do not sell personal information, and we do not use your records to train AI models.',
    'You can ask to see, correct or delete your information, and complain to the National Privacy Commission.',
  ],
  sections: [
    {
      id: 'scope',
      title: '1. Who we are and what this policy covers',
      blocks: [
        { p: `${F.publisher} publishes DDRiVE-M. This policy covers the DDRiVE-M web app, its Home, help and policy pages, and DDRiVE-M installed on a phone or computer.` },
        { p: 'There are two kinds of information in DDRiVE-M, and the Data Privacy Act of 2012 (RA 10173) treats them differently:' },
        {
          ul: [
            `Your account (your name, email address, organisation and sign-in records). For these, ${F.publisher} is the personal information controller.`,
            'The records your organisation enters (hazards, incidents, risk registers, plans, anticipatory action cases and team messages). Your organisation, for example your LGU, decides why and how these are processed, so it is the personal information controller and we are its personal information processor.',
          ],
        },
        { p: 'If an organisation recorded your details in DDRiVE-M, for example in an evacuation or incident record, contact that organisation first. We will help it answer you.' },
      ],
    },
    {
      id: 'collect',
      title: '2. What we collect',
      blocks: [
        {
          table: {
            head: ['Information', 'What it includes', 'Where it comes from'],
            rows: [
              ['Account', 'Name, email address, organisation, role. A password, which our sign-in provider stores only as a one-way hash, or your Google identity if you sign in with Google.', 'You, or your organisation’s administrator'],
              ['Organisation records', 'Whatever your team enters. This can include personal information about residents, such as names of evacuees or people affected by an incident.', 'Your team'],
              ['Change history', 'Who created or changed which record, and when.', 'The system, automatically'],
              ['Technical information', 'IP address, browser and device type, and request times, kept in our hosting provider’s logs.', 'Your device, automatically'],
              ['Settings on your device', 'Your sign-in session, light or dark theme, and the app’s files for offline use. See the Cookie Policy.', 'Your device'],
            ],
          },
        },
        { p: 'We do not use advertising or analytics trackers. The app does not take payments, so it holds no card details. It does not track your location: coordinates are stored only when you type them into a record.' },
        { p: 'Official alerts from PAGASA are public information and contain no personal information.' },
      ],
    },
    {
      id: 'use',
      title: '3. Why we use it',
      blocks: [
        {
          table: {
            head: ['Purpose', 'Lawful basis under RA 10173'],
            rows: [
              ['Running your account and the service', 'Performance of a contract (section 12(b))'],
              ['Keeping each organisation’s records separate and applying roles', 'Contract, and our legitimate interest in security (section 12(f))'],
              ['Keeping a change history for accountability', 'Legitimate interest; for government users, the public functions of the LGU or agency (section 12(e))'],
              ['Answering support requests', 'Contract and legitimate interest'],
              ['Meeting legal obligations, such as answering lawful orders and reporting personal data breaches', 'Legal obligation (section 12(c))'],
              ['Sensitive personal information your organisation enters, such as the health status of evacuees', 'Your organisation’s basis under section 13, for example a law or regulation, or protecting life and health'],
            ],
          },
        },
        { p: 'We do not use your account information or your organisation’s records to train artificial intelligence models, and we do not sell personal information.' },
      ],
    },
    {
      id: 'share',
      title: '4. Who processes it for us',
      blocks: [
        { p: 'Inside DDRiVE-M, members of your organisation see records according to their role. Other organisations cannot see your organisation’s records; the database refuses those requests. Official PAGASA alerts are shared with everyone.' },
        { p: 'Outside DDRiVE-M, these providers process information so the service can work:' },
        {
          table: {
            head: ['Provider', 'What for', 'Information involved'],
            rows: [
              ['Supabase', 'Database, sign-in, sign-in emails, server functions and file storage', `Everything stored in the app. Hosting region: ${fact(F.hostingRegion)}.`],
              ['Google', 'The map on the Detection screen, the fonts the app uses, and "Sign in with Google" if you choose it', 'Your IP address and browser details when the map or fonts load; your Google account email if you sign in with Google'],
              ['YouTube (Google)', 'The video on the Home page, only after you press play', 'Your IP address and browser details'],
              ['PAGASA', 'We read PAGASA’s public alert feed', 'None: we send PAGASA nothing about you'],
            ],
          },
        },
        { p: 'We share information with anyone else only if the law requires it, for example a court order, and we tell your organisation unless the law forbids it.' },
      ],
    },
    {
      id: 'google',
      title: '5. If you sign in with Google',
      blocks: [
        { p: 'You can sign in to DDRiVE-M with your Google account instead of a password. When you do, Google shares only basic profile information with DDRiVE-M, through the "openid", "email" and "profile" permissions:' },
        {
          table: {
            head: ['Google user data', 'How DDRiVE-M uses it'],
            rows: [
              ['Your name', 'Shown in your account and next to records you create or change, so your team knows who did what'],
              ['Your email address', 'Your sign-in name; used to add you to your organisation and to send account emails such as sign-in links'],
              ['Your profile picture address', 'Not used. It may be stored with your sign-in record by our sign-in provider'],
              ['Your Google account identifier', 'Links your Google account to your DDRiVE-M account so you can sign in again'],
            ],
          },
        },
        {
          ul: [
            'DDRiVE-M does not ask for, and cannot reach, your Gmail, Drive, Calendar, Contacts or any other Google data.',
            'Google user data is used only to sign you in and run your account. It is not used for advertising, not sold, not used to train AI models, and not shared with anyone except Supabase, our sign-in and database provider, which stores it for us.',
            'People in your organisation see your name and email address; other organisations do not.',
            'It is kept while your account is active, and deleted with your account as set out in section 8.',
            'You can disconnect DDRiVE-M from your Google account at any time at myaccount.google.com/permissions. To delete the information we hold, email our Data Protection Officer (section 12).',
          ],
        },
        { p: 'DDRiVE-M’s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.' },
      ],
    },
    {
      id: 'transfers',
      title: '6. Where it is stored',
      blocks: [
        { p: `Your information is stored by Supabase in its ${fact(F.hostingRegion)} region. Google’s services may process information outside the Philippines. Under section 21 of RA 10173 we remain responsible for personal information we transfer, and we use providers that commit to protecting it to a comparable standard.` },
      ],
    },
    {
      id: 'security',
      title: '7. How we protect it',
      blocks: [
        {
          ul: [
            'Connections to DDRiVE-M are encrypted (HTTPS), and our hosting provider encrypts stored data.',
            'Access rules are enforced in the database for every organisation and role, so a fault in a screen cannot show another organisation’s records.',
            'Passwords are stored only as one-way hashes by the sign-in provider. We cannot see them.',
            'Every change to a record is logged with who made it and when. Approved plans are locked against changes.',
            'Server keys never reach your device, and the app refuses to be built with one.',
          ],
        },
        { note: 'Two-step sign-in (multi-factor authentication) is not available yet. It is planned; until then, use a long, unique password.' },
        { p: 'If a personal data breach is likely to cause serious harm, we will notify the National Privacy Commission and the people affected within 72 hours of finding out, as NPC Circular 16-03 requires. Where your organisation is the controller, we will notify it without delay so it can do the same.' },
      ],
    },
    {
      id: 'retention',
      title: '8. How long we keep it',
      blocks: [
        {
          table: {
            head: ['Information', 'How long', 'Why'],
            rows: [
              ['Account', 'While the account is active, and 2 years after it is closed', 'Running the service and legal compliance'],
              ['Organisation records and their change history', 'As long as the organisation keeps its workspace. When it closes, we delete them after the organisation has had the chance to export them, unless a law requires us to keep them.', 'They belong to the organisation'],
              ['Support requests', '3 years from your last message', 'Service improvement and resolving disputes'],
              ['Official alert feed logs', '30 days', 'Checking that alerts are arriving'],
              ['Hosting logs', 'As kept by our hosting provider, up to 90 days', 'Security monitoring and fixing faults'],
            ],
          },
        },
      ],
    },
    {
      id: 'rights',
      title: '9. Your rights',
      blocks: [
        { p: 'Under RA 10173 you have the right to be informed, to access your personal information, to object to processing, to have it erased or blocked, to have it corrected, to receive it in a portable format, to claim damages, and to file a complaint with the National Privacy Commission.' },
        { p: `To use these rights, email our Data Protection Officer at ${F.dpoEmail}. We aim to reply within 14 business days. If the request concerns records your organisation holds, we will pass it to your organisation and help it reply.` },
      ],
    },
    {
      id: 'children',
      title: '10. Children',
      blocks: [
        { p: 'DDRiVE-M accounts are for people aged 18 and over. Organisations may need to record information about minors, for example in an evacuation list; the organisation is responsible for that information as its controller.' },
      ],
    },
    {
      id: 'changes',
      title: '11. Changes to this policy',
      blocks: [
        { p: 'When we change this policy we update the date at the top. For important changes, we tell account holders by email or in the app at least 30 days before the change takes effect.' },
      ],
    },
    {
      id: 'contact',
      title: '12. Contact',
      blocks: [
        {
          table: {
            head: ['', ''],
            rows: [
              ['Data Protection Officer', fact(F.dpoName)],
              ['Email', `${F.dpoEmail} or ${F.privacyEmail}`],
              ['Phone', F.phone],
              ['Address', `${F.publisher}, ${F.address}`],
              ['NPC registration', fact(F.npcRegistration)],
            ],
          },
        },
        { p: 'If you are not satisfied with our answer, you can complain to the National Privacy Commission at privacy.gov.ph.' },
      ],
    },
  ],
};
