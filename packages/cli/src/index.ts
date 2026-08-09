import { Command } from "commander";
import { runValidate } from "./commands/validate.js";
import { runBuild } from "./commands/build.js";
import { runCheck } from "./commands/check.js";
import { runAnalyze } from "./commands/analyze.js";
import { runNew } from "./commands/new.js";

const program = new Command();
program.name("ds").description("Spec-driven design system platform CLI");

program
  .command("validate [component]")
  .description("Validate one or every component spec against the schema, tokens, and governance rules")
  .action((component: string | undefined) => {
    const ok = runValidate(component, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

program
  .command("build [component]")
  .description("Validate, then generate React output for one or every component into generated/")
  .action(async (component: string | undefined) => {
    const ok = await runBuild(component, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

program
  .command("check [component]")
  .description("Sync gate: fail if generated/ doesn't match what `ds build` would produce right now")
  .action(async (component: string | undefined) => {
    const ok = await runCheck(component, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

program
  .command("analyze <prdPath>")
  .description("Gap analysis: classify what a PRD needs against the real components/ inventory")
  .action(async (prdPath: string) => {
    const ok = await runAnalyze(prdPath, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

program
  .command("new <name>")
  .description("Intake interview: ask what a PRD can't answer, then draft a component spec")
  .option("--prd <path>", "PRD markdown file to use as context")
  .action(async (name: string, cmdOptions: { prd?: string }) => {
    const ok = await runNew(name, { cwd: process.cwd(), prdPath: cmdOptions.prd });
    process.exitCode = ok ? 0 : 1;
  });

program.parse();
