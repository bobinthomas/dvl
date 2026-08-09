import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  createGatewayClient,
  loadGatewayEnv,
  generateInterviewQuestions,
  draftSpecFromAnswers,
  ModelOutputError,
  type ModelClient,
} from "@ds-platform/agents";

export interface NewOptions {
  cwd: string;
  prdPath?: string;
}

/** Asks one question, returns the human's answer. Injectable so runNew is testable without a real TTY. */
export type Asker = (prompt: string) => Promise<string>;

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join("");
}

/**
 * `ds new <name>` — interviews the human for what a PRD can't answer, then
 * drafts a spec. `ask` and `client` are both injectable so this is testable
 * without a real TTY or a live Cloudflare AI Gateway credential.
 */
export async function runNew(
  name: string,
  options: NewOptions,
  ask?: Asker,
  client?: ModelClient
): Promise<boolean> {
  const { cwd } = options;

  if (!KEBAB_CASE.test(name)) {
    console.error(`"${name}" must be kebab-case, e.g. "date-picker"`);
    return false;
  }

  const specDir = join(cwd, "components", name);
  const specPath = join(specDir, "spec.json");
  if (existsSync(specPath)) {
    console.error(`components/${name}/spec.json already exists — ds new never overwrites an existing spec`);
    return false;
  }

  const prdContext = options.prdPath
    ? readFileSync(join(cwd, options.prdPath), "utf-8")
    : "(no PRD provided — draft from the component name alone, and say so in the description)";

  let env;
  try {
    env = loadGatewayEnv();
  } catch (err) {
    console.error((err as Error).message);
    return false;
  }
  const modelClient = client ?? createGatewayClient(env);
  const componentName = toPascalCase(name);

  let rl: ReturnType<typeof createInterface> | undefined;
  const askFn: Asker =
    ask ??
    (async (prompt) => {
      if (!rl) rl = createInterface({ input: stdin, output: stdout });
      return rl.question(`${prompt}\n> `);
    });

  try {
    const { questions } = await generateInterviewQuestions(modelClient, env.model, componentName, prdContext);

    const answers: Record<string, string> = {};
    for (const q of questions) {
      console.log(`\n${q.prompt}`);
      console.log(`  (${q.why})`);
      answers[q.id] = await askFn(q.prompt);
    }

    const spec = await draftSpecFromAnswers(modelClient, env.model, componentName, prdContext, answers);

    mkdirSync(specDir, { recursive: true });
    writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n", "utf-8");

    console.log(`\nDraft written to components/${name}/spec.json (status: draft).`);
    console.log(`It has not been validated — review it, then run \`ds validate ${name}\`.`);
    return true;
  } catch (err) {
    if (err instanceof ModelOutputError) {
      console.error(`intake interview failed: ${err.message}`);
      return false;
    }
    throw err;
  } finally {
    rl?.close();
  }
}
