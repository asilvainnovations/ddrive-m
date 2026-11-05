import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Everything in a VITE_ variable is copied into the public app bundle. Stop the build (and the dev
// server) if a Supabase server key is in one: a secret key (sb_secret_...) or a JWT whose role is
// service_role. Refusing to use it at runtime is not enough, because the value would still ship.
function refuseServerKeys(env: Record<string, string>) {
  const role = (value: string) => {
    try {
      const body = value.split(".")[1];
      return body ? JSON.parse(Buffer.from(body, "base64url").toString("utf8")).role : undefined;
    } catch {
      return undefined;
    }
  };
  const leaks = Object.entries(env)
    .filter(([name]) => name.startsWith("VITE_"))
    .filter(([, value]) => value.startsWith("sb_secret_") || value.startsWith("GOCSPX-") || role(value) === "service_role")
    .map(([name]) => name);
  if (leaks.length > 0) {
    throw new Error(
      `[DDRiVE-M] ${leaks.join(", ")} holds a secret (a Supabase secret or service_role key, or a Google client secret), which would be published ` +
        "to every visitor. Only public values belong in VITE_ variables: the Supabase publishable key and the Google " +
        "Client ID. Put the Google Client Secret in Supabase (Authentication → Providers → Google), and rotate any " +
        "secret that was ever committed or deployed."
    );
  }
}

// https://vitejs.dev/config/
// On Vercel, a build without the Supabase settings would deploy an app that cannot reach its database.
// They come from .env.production (committed) or the project's environment variables.
function requireBackendOnVercel(env: Record<string, string>) {
  if (!process.env.VERCEL) return;
  const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(
    (k) => !env[k] && !(k === "VITE_SUPABASE_PUBLISHABLE_KEY" && env.VITE_SUPABASE_ANON_KEY)
  );
  if (missing.length > 0) {
    throw new Error(
      `[DDRiVE-M] ${missing.join(" and ")} not set. Push .env.production with git (GitHub's web upload drops files ` +
        "whose names start with a dot), or set the variables in Vercel → Project → Settings → Environment Variables."
    );
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  refuseServerKeys(env);
  requireBackendOnVercel(env);
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      // Installable app (PWA). The service worker caches the app's own files so screens open offline.
      // It never caches Supabase responses (records, official alerts): offline, the app says it is
      // offline instead of showing old alerts as if they were current.
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/*.png"],
        manifest: {
          id: "/",
          name: "DDRiVE-M · Risk and Resilience Intelligence",
          short_name: "DDRiVE-M",
          description: "Disaster risk reduction, anticipatory action and continuity planning for Philippine LGUs and organisations.",
          lang: "en-PH",
          start_url: "/dashboard",
          scope: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#1e3a8a",
          categories: ["productivity", "government", "utilities"],
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          shortcuts: [
            { name: "Command Dashboard", url: "/dashboard" },
            { name: "Official alerts", url: "/detection" },
            { name: "Anticipatory action", url: "/anticipatory-action" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
          globIgnores: ["**/node_modules/**"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: "/index.html",
          // The standalone tool pages (*.html) load as themselves, not as the app.
          navigateFallbackDenylist: [/^\/[^/]+\.html$/, /^\/functions\//, /^\/rest\//, /^\/auth\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "ddrive-font-css" },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: { cacheName: "ddrive-fonts", expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
            },
            {
              // The logo and Home page images, until `npm run icons` stores the logo locally.
              urlPattern: ({ url }) => url.origin === "https://appimize.app",
              handler: "CacheFirst",
              options: { cacheName: "ddrive-images", expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
