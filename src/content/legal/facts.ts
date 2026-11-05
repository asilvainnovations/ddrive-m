// Facts the policies depend on. Only ASilva Innovations can confirm these; nothing here may be guessed.
//
// While `reviewed` is false, every policy page shows a "draft under review" notice. Set it to true once
// counsel and the Data Protection Officer have reviewed the five policies and every `null` below is filled
// in. Values that are still null are shown on the pages as "to be confirmed", never left blank.
export const LEGAL_FACTS = {
  reviewed: false,

  publisher: 'ASilva Innovations',
  address: 'Muntinlupa City, Metro Manila, Philippines',
  generalEmail: 'info@asilvainnovations.com',
  privacyEmail: 'privacy@asilvainnovations.com',
  dpoEmail: 'dataofficer@asilvainnovations.com',
  legalEmail: 'legal@asilvainnovations.com',
  phone: '+63 917 855 5134',

  /** Name of the Data Protection Officer (RA 10173 and NPC Circular 2022-04). */
  dpoName: null as string | null,
  /** NPC registration of the data processing system, if registration applies (NPC Circular 2022-04). */
  npcRegistration: null as string | null,
  /** Supabase project region, from the Supabase dashboard: Settings → General (for example "Singapore (ap-southeast-1)"). */
  hostingRegion: null as string | null,

  effective: '2026-11-05',
  updated: '2026-11-05',
};

export const TO_CONFIRM = 'to be confirmed';
export const fact = (v: string | null): string => v ?? TO_CONFIRM;
