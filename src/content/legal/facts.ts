// Central facts used by the public legal and policy pages.
// The values below were supplied by the platform owner. They must still be checked against
// the live Supabase project settings and the organisation's formal privacy-governance records
// before the policy-review gate is lifted.
export const LEGAL_FACTS = {
  // Keep false until the DPO, management and Philippine privacy counsel complete the publication checklist.
  reviewed: false,

  publisher: 'ASilva Innovations',
  address: 'Muntinlupa City, Metro Manila, Philippines',
  generalEmail: 'info@asilvainnovations.com',
  privacyEmail: 'privacy@asilvainnovations.com',
  dpoEmail: 'dataofficer@asilvainnovations.com',
  legalEmail: 'legal@asilvainnovations.com',
  phone: '+63 917 855 5134',

  /** Data Protection Officer name supplied by the platform owner; appointment evidence remains a governance record. */
  dpoName: 'Alvin M. Silva' as string | null,
  /** NPC registration of the data processing system, if registration applies. */
  npcRegistration: null as string | null,
  /** Supabase host region supplied by the platform owner; verify against Supabase Dashboard → Settings → General. */
  hostingRegion: 'Northeast Asia' as string | null,

  effective: '2026-11-05',
  updated: '2026-11-05',
};

export const TO_CONFIRM = 'to be confirmed';
export const fact = (v: string | null): string => v ?? TO_CONFIRM;
