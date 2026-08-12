import { join } from "node:path";
import { defineConfig, loadEnv, searchForWorkspaceRoot, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import type { DevApiContext } from "./dev-server/api.js";

/**
 * Lets the docs app's UI drive PRD scanning, doc-quality checks, and the
 * full request lifecycle (approve/brief/verify/promote) while `pnpm dev` is
 * running, with real Node fs/AI-Gateway/Figma-REST access. Dev-server-only
 * (`apply: "serve"`, stripped from `vite build`) — a deployed Cloudflare
 * Worker has no filesystem access to write git-tracked files (see
 * apps/docs/worker/index.ts), so none of this exists there; the UI handles
 * that 404 gracefully, the same way AskWidget.tsx handles /api/ask not
 * existing under plain `vite dev`.
 *
 * The actual route handlers live in dev-server/api.ts, loaded here via
 * `server.ssrLoadModule` rather than a top-level import: this repo's
 * packages are TS source consumed directly (no compiled dist), and Vite's
 * own config-file loader bundles vite.config.ts with a raw esbuild pass
 * that — unlike the running dev server's module graph — doesn't resolve
 * the `./schema.js`-importing-`schema.ts` convention those packages use,
 * and fails to load. `ssrLoadModule` runs dev-server/api.ts (and everything
 * it imports) through the dev server's real resolver instead, where that
 * already works.
 */
function devApiPlugin(): Plugin {
  return {
    name: "ds-dev-api",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      const root = searchForWorkspaceRoot(process.cwd());
      const ctx: DevApiContext = {
        repoRoot: root,
        componentsDir: join(root, "components"),
        requestsDir: join(root, "requests"),
        tokensPath: join(root, "tokens", "tokens.json"),
      };

      server.middlewares.use("/api/dev", async (req, res) => {
        const api = await server.ssrLoadModule("/dev-server/api.ts");
        await (api.handleDevApi as typeof import("./dev-server/api.js").handleDevApi)(ctx, req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Lets `pnpm dev`'s AI Gateway / Figma credentials come from
  // apps/docs/.env.local (gitignored, see .env.example) instead of having
  // to `export` them in every terminal that runs `pnpm dev`. Vite loads
  // .env files into `import.meta.env` for client code automatically, but
  // deliberately not into `process.env` — this explicitly bridges just
  // that, only filling in vars not already set in the real shell env, and
  // only for this dev-server-only plugin (never shipped to the browser).
  const fileEnv = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), devApiPlugin()],
    server: {
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd())],
      },
      // Native filesystem-event watching (chokidar's default backend) has
      // repeatedly failed to notice new files under components/generated/
      // requests on this machine — e.g. after `ds build` writes a brand-new
      // generated/react/<Name>.tsx, registry.ts's import.meta.glob keeps
      // serving a stale scan that's missing it, with no error, until the
      // whole dev server is restarted. Polling reads the directory tree on
      // an interval instead of relying on OS-level fs events, which is slower
      // but can't silently miss a write the way native-event watching has
      // been doing here.
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  };
});
