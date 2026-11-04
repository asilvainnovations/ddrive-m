/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Publishable key (sb_publishable_...). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Legacy anon key, read only when no publishable key is set. Retired by Supabase at the end of 2026. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
