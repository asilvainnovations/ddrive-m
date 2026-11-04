import { createClient } from '@supabase/supabase-js';

// Connection settings come from the environment (.env.local in development, the host's
// environment variables in production). See .env.example. The anon key is public by design:
// what protects the data is Row Level Security on the server, not hiding this key.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isBackendConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isBackendConfigured) {
  console.error(
    '[DDRiVE-M] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env.local and fill them in.'
  );
}

const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseKey || 'missing-anon-key',
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
