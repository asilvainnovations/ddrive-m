// Navigation for the public pages (Home, policies, help). Internal routes use the router; the
// About, FAQ, Pricing and user manual pages are standalone pages served from public/.
export interface SiteLink {
  label: string;
  to: string;
  /** A standalone page outside the app router (full page load). */
  external?: boolean;
}

export const PRIMARY_NAV: SiteLink[] = [
  { label: 'About', to: '/about.html', external: true },
  { label: 'FAQ', to: '/faq.html', external: true },
  { label: 'Support', to: '/support' },
  { label: 'Resources', to: '/resources' },
  { label: 'Policies', to: '/policies' },
  { label: 'Pricing', to: '/pricing.html', external: true },
  { label: 'Contact', to: '/contact' },
];

export const FOOTER_NAV: { heading: string; links: SiteLink[] }[] = [
  {
    heading: 'DDRiVE-M',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'About', to: '/about.html', external: true },
      { label: 'Pricing', to: '/pricing.html', external: true },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'Support', to: '/support' },
      { label: 'FAQ', to: '/faq.html', external: true },
      { label: 'User manual', to: '/user-manual.html', external: true },
      { label: 'Resources', to: '/resources' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    heading: 'Policies',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms-of-service' },
      { label: 'Cookie Policy', to: '/policies/cookies' },
      { label: 'Accessibility', to: '/policies/accessibility' },
      { label: 'AI Ethics and Governance', to: '/policies/ai-ethics' },
    ],
  },
];
