// Central facts used by DDRiVE-M public legal and policy pages.
// Owner-supplied values are recorded here once. `reviewed` stays false until
// documentary and technical verification and the required approvals are complete.
export const LEGAL_FACTS = {
  reviewed: false,

  publisher: 'ASilva Innovations',
  address: 'Muntinlupa City, Metro Manila, Philippines',
  generalEmail: 'info@asilvainnovations.com',
  privacyEmail: 'privacy@asilvainnovations.com',
  dpoEmail: 'dataofficer@asilvainnovations.com',
  legalEmail: 'legal@asilvainnovations.com',
  phone: '+63 917 855 5134',

  // Supplied by the platform owner; formal appointment evidence must be retained.
  dpoName: 'Alvin M. Silva' as string | null,

  // Supplied by the platform owner; verify in the live Supabase project settings.
  hostingRegion: 'Northeast Asia' as string | null,

  // Do not publish a registration number until its applicability and details are verified.
  npcRegistration: null as string | null,

  effective: '2026-11-05',
  updated: '2026-11-05',
} as const;

export const TO_CONFIRM = 'to be confirmed';
export const fact = (value: string | null | undefined): string => value ?? TO_CONFIRM;
