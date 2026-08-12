import { Command } from "commander";
import { runValidate } from "./commands/validate.js";
import { runBuild } from "./commands/build.js";
import { runCheck } from "./commands/check.js";
import { runAnalyze } from "./commands/analyze.js";
import { runDocCheck } from "./commands/doc-check.js";
import { runNew } from "./commands/new.js";
import { runChangelog } from "./commands/changelog.js";
import {
  runRequestNew,
  runRequestApprove,
  runRequestBrief,
  runRequestSetFigmaFile,
  runRequestVerify,
  runRequestList,
} from "./commands/request.js";

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
  .option("--check-docs", "also run the documentation quality check on every component classified \"have\"")
  .action(async (prdPath: string, cmdOptions: { checkDocs?: boolean }) => {
    const ok = await runAnalyze(prdPath, { cwd: process.cwd(), checkDocs: cmdOptions.checkDocs });
    process.exitCode = ok ? 0 : 1;
  });

program
  .command("doc-check [component]")
  .description("Judge whether a component's documentation is proper enough to adopt without asking questions")
  .action(async (component: string | undefined) => {
    const ok = await runDocCheck(component, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

program
  .command("new <name>")
  .description("Intake interview: ask what a PRD can't answer, then draft a component spec")
  .option("--prd <path>", "PRD markdown file to use as context")
  .option("--from-request <id>", "Promote a ready-for-verification component request instead of a PRD file")
  .action(async (name: string, cmdOptions: { prd?: string; fromRequest?: string }) => {
    const ok = await runNew(name, { cwd: process.cwd(), prdPath: cmdOptions.prd, fromRequest: cmdOptions.fromRequest });
    process.exitCode = ok ? 0 : 1;
  });

program
  .command("changelog <component>")
  .description("Governance gate: derive the semver bump from the spec diff and require it to match, then write the changelog")
  .option("--base <ref>", "git ref to diff the working-tree spec against", "HEAD")
  .action((component: string, cmdOptions: { base: string }) => {
    const ok = runChangelog(component, { cwd: process.cwd(), base: cmdOptions.base });
    process.exitCode = ok ? 0 : 1;
  });

const request = program.command("request").description("Manage component requests (pre-spec intake queue)");

request
  .command("new <name>")
  .description("File a new component request")
  .action(async (name: string) => {
    const ok = await runRequestNew(name, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

request
  .command("approve <id>")
  .description("Approve a pending request")
  .action((id: string) => {
    const ok = runRequestApprove(id, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

request
  .command("brief <id>")
  .description("Generate a design brief for an approved request, for a human designer to build from in Figma")
  .action((id: string) => {
    const ok = runRequestBrief(id, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

request
  .command("set-figma-file <id> <fileKey>")
  .description("Record which Figma file a designer built this request in")
  .action((id: string, fileKey: string) => {
    const ok = runRequestSetFigmaFile(id, fileKey, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

request
  .command("verify <id>")
  .description("Reconcile the live Figma file against the request via the Figma REST API")
  .action(async (id: string) => {
    const ok = await runRequestVerify(id, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

request
  .command("list")
  .description("List every component request, grouped by status")
  .action(() => {
    const ok = runRequestList({ cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

program.parse();
