import { Command } from "commander";
import { runValidate } from "./commands/validate.js";

const program = new Command();
program.name("ds").description("Spec-driven design system platform CLI");

program
  .command("validate [component]")
  .description("Validate one or every component spec against the schema, tokens, and governance rules")
  .action((component: string | undefined) => {
    const ok = runValidate(component, { cwd: process.cwd() });
    process.exitCode = ok ? 0 : 1;
  });

program.parse();
