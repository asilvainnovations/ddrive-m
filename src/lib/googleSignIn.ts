// Sign in with Google, using Google's own button (Google Identity Services) and Supabase's
// signInWithIdToken. See https://supabase.com/docs/guides/auth/social-sign-in/auth-google.
//
// Why this flow: the consent screen and Google's checks refer to DDRiVE-M's own domain, not the
// Supabase project's address, and no redirect goes through supabase.co.
//
// Configuration:
// - VITE_GOOGLE_CLIENT_ID (Vercel environment variable): the OAuth *Client ID*, ending in
//   .apps.googleusercontent.com. It is public by design.
// - The *Client Secret* goes only into Supabase (Authentication → Sign In / Providers → Google).
//   Never put it in a VITE_ variable: the build refuses to run if one holds a Google client secret.
// Without VITE_GOOGLE_CLIENT_ID, the app falls back to Supabase's redirect flow (signInWithOAuth).
import { supabase } from '@/lib/supabase';

const raw = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';
export const GOOGLE_CLIENT_ID = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(raw) ? raw : '';
if (raw && !GOOGLE_CLIENT_ID) {
  console.error('[DDRiVE-M] VITE_GOOGLE_CLIENT_ID does not look like a Google OAuth Client ID (…apps.googleusercontent.com). Google’s button is off.');
}

const SCRIPT = 'https://accounts.google.com/gsi/client';

interface CredentialResponse { credential: string }
interface GoogleId {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  cancel: () => void;
}
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

let loading: Promise<void> | null = null;
/** Loads Google's script once. Called only when the sign-in window opens. */
export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error('Could not reach Google. Check your connection, or sign in with your email.')); };
    document.head.appendChild(s);
  });
  return loading;
}

/** A random nonce, and its SHA-256 hex digest: Google gets the digest, Supabase the raw value. */
export async function makeNonce(): Promise<{ nonce: string; hashed: string }> {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce));
  const hashed = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return { nonce, hashed };
}

/**
 * Renders Google's "Sign in with Google" button into `el`. `onResult` is called with an error message,
 * or null once Supabase has a session.
 */
export async function renderGoogleButton(el: HTMLElement, width: number, onResult: (error: string | null) => void): Promise<void> {
  await loadGoogleScript();
  const { nonce, hashed } = await makeNonce();
  const id = window.google!.accounts.id;
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: hashed,
    ux_mode: 'popup',
    context: 'signin',
    itp_support: true,
    use_fedcm_for_prompt: true,
    callback: async (response: CredentialResponse) => {
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: response.credential, nonce });
      onResult(error ? error.message : null);
    },
  });
  id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'left', width });
}
