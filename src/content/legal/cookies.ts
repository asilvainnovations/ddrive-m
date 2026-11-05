import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

export const cookies: Policy = {
  slug: 'cookies',
  title: 'Cookie and Device Storage Policy',
  summary: 'How DDRiVE-M may use cookies, local storage, session storage and cached application files.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'The application may use browser storage to support sign-in, remember preferences and cache application resources.',
    'Third-party services may receive technical information when their content or features are loaded.',
    'The exact storage inventory must be checked against the deployed build and browser behaviour.',
    'Clearing site data may sign you out and remove locally cached application resources.',
  ],
  sections: [
    { id: 'scope', title: '1. What this policy covers', blocks: [
      { p: 'Cookies are small files stored by a website. Web applications may also use local storage, session storage, IndexedDB, service-worker caches and similar technologies. This policy covers these technologies when used by DDRiVE-M.' },
    ] },
    { id: 'first-party', title: '2. First-party storage', blocks: [
      { p: 'DDRiVE-M may use browser storage for authentication session handling, user interface preferences and application resources. The exact keys, purposes, expiry, persistence and whether any operational or personal records are cached must be verified against the current production build before this inventory is treated as complete.' },
      { note: 'Do not assume that offline caching is limited to static application files until the service worker, browser storage and network behaviour have been tested in the deployed version.' },
    ] },
    { id: 'third-party', title: '3. Third-party services', blocks: [
      { p: 'Maps, fonts, identity providers, embedded media and other external services may receive technical information such as IP address, browser details and request metadata when loaded. The services actually used must be listed in the current third-party inventory, together with their purpose and privacy links.' },
    ] },
    { id: 'choices', title: '4. Your choices', blocks: [
      { ul: [
        'Use your browser settings to review, block or clear cookies and site data.',
        'Signing out may clear or invalidate your authentication session.',
        'Blocking all storage may prevent sign-in, preferences or some application functions from working.',
        'If an optional third-party feature is not needed, do not open or activate it.',
      ] },
    ] },
    { id: 'review', title: '5. Review and contact', blocks: [
      { p: 'The storage inventory will be updated when the deployed application or its third-party services change. Questions may be sent to ' + F.privacyEmail + '.' },
    ] },
  ],
};
