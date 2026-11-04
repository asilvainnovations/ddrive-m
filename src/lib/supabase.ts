import { createClient } from '@supabase/supabase-js';

// Connection settings come from the environment: .env.production for builds, .env.local in
// development, or the host's environment variables (which take precedence). See .env.example.
//
// The publishable key (sb_publishable_...) is public by design: what protects the data is Row Level
// Security on the server, not hiding this key. The legacy anon key is still read as a fallback until
// Supabase retires it (end of 2026). A secret key must never reach the browser, so it is refused.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const configuredKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

const isSecretKey = Boolean(configuredKey?.startsWith('sb_secret_'));
const supabaseKey = isSecretKey ? undefined : configuredKey;

export const isBackendConfigured = Boolean(supabaseUrl && supabaseKey);

if (isSecretKey) {
  console.error(
    '[DDRiVE-M] A Supabase SECRET key was put in a VITE_ variable, which would publish it to every visitor. ' +
      'It has not been used. Rotate that key in Supabase (Settings → API Keys) and set ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY to the publishable key instead.'
  );
} else if (!isBackendConfigured) {
  console.error(
    '[DDRiVE-M] VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set. ' +
      'Copy .env.example to .env.local and fill them in.'
  );
}

const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseKey || 'missing-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  }
);

// DDRiVE-M logo, served from the project's public storage bucket.
export const DDRIVE_LOGO_URL = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/image-assets/public/DDRiVE-M%20logo.png`
  : '';

export { supabase };
