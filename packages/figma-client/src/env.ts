/**
 * Figma REST credentials — a personal access token, read the same way the
 * Cloudflare AI Gateway credentials are (see @ds-platform/agents/env.ts):
 * `Record<string, string | undefined>` rather than `NodeJS.ProcessEnv` so
 * this reads identically from `process.env` or a Worker's env bindings.
 */
export interface FigmaEnv {
  /** Figma personal access token, sent as the X-Figma-Token header. */
  accessToken: string;
}

export class MissingFigmaEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `missing environment variable(s) for the Figma REST client: ${missing.join(", ")}. ` +
        `Set FIGMA_ACCESS_TOKEN.`
    );
    this.name = "MissingFigmaEnvError";
  }
}

export function loadFigmaEnv(env: Record<string, string | undefined> = process.env): FigmaEnv {
  const accessToken = env.FIGMA_ACCESS_TOKEN;

  const missing = [!accessToken && "FIGMA_ACCESS_TOKEN"].filter((v): v is string => !!v);
  if (missing.length > 0) throw new MissingFigmaEnvError(missing);

  return { accessToken: accessToken! };
}
