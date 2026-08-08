import { violatesInvalidCombination, type ComponentSpec } from "@ds-platform/core";
import { toPointer, type ValidationIssue } from "../issue.js";

/** Every example must use props/state that are declared, legal, and not a forbidden combination. */
export function checkExamplesAreLegal(file: string, spec: ComponentSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const propsByName = new Map(spec.props.map((p) => [p.name, p]));

  spec.examples.forEach((example, i) => {
    for (const [propName, value] of Object.entries(example.props)) {
      const prop = propsByName.get(propName);
      if (!prop) {
        issues.push({
          file,
          pointer: toPointer(["examples", i, "props", propName]),
          message: `example "${example.name}" uses undeclared prop "${propName}"`,
          fix: `remove it from the example, or add "${propName}" to the spec's props list`,
        });
        continue;
      }
      if (prop.type === "enum" && prop.values && !prop.values.includes(String(value))) {
        issues.push({
          file,
          pointer: toPointer(["examples", i, "props", propName]),
          message: `"${value}" is not a legal value for "${propName}" (expected one of [${prop.values.join(", ")}])`,
          fix: `use one of [${prop.values.join(", ")}]`,
        });
      }
    }

    const combo: Record<string, string> = { state: example.state };
    for (const [key, value] of Object.entries(example.props)) combo[key] = String(value);
    const forbidden = violatesInvalidCombination(combo, spec.invalidCombinations);
    if (forbidden) {
      issues.push({
        file,
        pointer: toPointer(["examples", i]),
        message: `example "${example.name}" uses a forbidden combination: ${JSON.stringify(forbidden)}`,
        fix: `change one of the matched prop values, or remove this example`,
      });
    }
  });

  return issues;
}
