import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
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
    .filter(([, value]) => value.startsWith("sb_secret_") || role(value) === "service_role")
    .map(([name]) => name);
  if (leaks.length > 0) {
    throw new Error(
      `[DDRiVE-M] ${leaks.join(", ")} holds a Supabase secret or service_role key, which would be published ` +
        "to every visitor. Use the publishable key (sb_publishable_...) instead, and rotate the exposed key " +
        "in Supabase (Settings → API Keys) if it was ever committed or deployed."
    );
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  refuseServerKeys(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
