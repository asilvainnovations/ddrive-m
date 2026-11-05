import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

// Adapted from the ASilva Innovations Cookie Policy for DDRiVE-M. Lists only what the app really stores
// (see src/components/theme-provider.tsx, the Supabase client, and the service worker in vite.config.ts).
export const cookies: Policy = {
  slug: 'cookies',
  title: 'Cookie Policy',
  summary: 'What DDRiVE-M stores on your device, what third parties may set, and how to clear it.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'DDRiVE-M uses no advertising or analytics cookies.',
    'It stores a few things on your device so you stay signed in and the app opens offline.',
    'The Google map on the Detection screen and the Home page video (only if you press play) come from Google, which may set its own cookies.',
    'You can clear everything from your browser settings at any time.',
  ],
  sections: [
    {
      id: 'what',
      title: '1. Cookies and local storage',
      blocks: [
        { p: 'Cookies are small files a website saves on your device. DDRiVE-M mostly uses similar browser features instead: local storage, which holds small settings, and the cache, which holds the app’s files so it can open offline. This policy covers all of them.' },
      ],
    },
    {
      id: 'ours',
      title: '2. What DDRiVE-M stores',
      blocks: [
        {
          table: {
            head: ['Item', 'Where', 'Purpose', 'How long', 'Type'],
            rows: [
              ['Sign-in session (named sb-…-auth-token)', 'Local storage', 'Keeps you signed in', 'Until you sign out or the session expires', 'Essential'],
              ['theme', 'Local storage', 'Remembers light or dark mode', 'Until you clear it', 'Functional'],
              ['App files (workbox-precache)', 'Cache storage, through a service worker', 'Lets the app open quickly and without a connection', 'Until the next app update or until you clear it', 'Essential'],
            ],
          },
        },
        { p: 'DDRiVE-M does not cache your organisation’s records or official alerts for offline use, so it never shows an old alert as if it were current.' },
      ],
    },
    {
      id: 'third',
      title: '3. Third-party services',
      blocks: [
        {
          table: {
            head: ['Service', 'When', 'What may be set or sent'],
            rows: [
              ['Google Maps', 'When you open the Detection screen', 'Google may set cookies and receives your IP address, under Google’s privacy policy'],
              ['Google Fonts', 'When the app loads', 'Google receives your IP address; no cookies'],
              ['YouTube, privacy-enhanced mode', 'Only after you press play on the Home page video', 'YouTube may store information on your device once the video plays'],
              ['Sign in with Google', 'When you open the sign-in window, Google’s sign-in script loads; when you use it, Google signs you in', 'Google may set its own cookies on Google’s domain, under Google’s privacy policy'],
            ],
          },
        },
      ],
    },
    {
      id: 'consent',
      title: '4. Why there is no cookie banner',
      blocks: [
        { p: 'Everything DDRiVE-M stores itself is needed for the service you asked for, or remembers a setting you chose. The Home page video loads only when you choose to play it. If we ever add analytics, we will ask for your consent first and add a choice here.' },
        { p: 'For people in the Philippines, this follows the Data Privacy Act (RA 10173); for visitors from the European Union, storage that is strictly necessary for a service you request does not need consent.' },
      ],
    },
    {
      id: 'manage',
      title: '5. Clearing or blocking storage',
      blocks: [
        {
          ul: [
            'Sign out to remove your sign-in session.',
            'In your browser’s settings, clear "site data" or "cookies and site data" for this site to remove everything, including the offline files.',
            'If you installed DDRiVE-M, uninstalling it removes its files.',
            'If you block storage completely, you will not be able to stay signed in, and the app will not open offline.',
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: '6. Changes and contact',
      blocks: [{ p: `We will update this page and its date when what we store changes. Questions: ${F.privacyEmail}.` }],
    },
  ],
};
