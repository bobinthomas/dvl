# Build prompt: spec-driven design system platform

Paste this as your opening message in Claude Code. Attach `component.schema.json`,
`button.spec.json` and `PRD-returns-pickup-scheduling.md` to the session first.

---

## Context

I am building a working prototype of a spec-driven design system platform. The
argument it exists to prove: a design system fails when its artifacts stop agreeing
with each other, so instead of maintaining Figma, code and documentation in parallel,
we make one governed specification the source of truth and generate everything else
from it.

This is a demo I am presenting to a design systems team. It has to actually run, end
to end, in front of people who will look for the seams. Working beats complete.

## Non-negotiable principles

Read these before you write anything. If a decision later in this document conflicts
with one of these, the principle wins.

1. **The spec is the only source of truth.** React, React Native, documentation,
   Storybook stories, conformance tests and the Figma payload are all derived. If they
   disagree with the spec, they are wrong by definition.

2. **Nothing downstream is hand-authored.** Every generated file carries a header
   marking it generated. There is a CI check that regenerates everything and fails if
   the working tree changes. That check is the whole thesis in executable form, so do
   not skip it or make it advisory.

3. **Generation is deterministic. Models sit at the edges.** Template rendering,
   validation, token resolution, semver derivation and changelog writing are plain
   code with no model calls anywhere in them. Models are used only at intake (reading
   a PRD, interviewing a human) and at consumption (answering questions about a spec).
   Never let a model generate a component file or a docs page.

4. **Judgment enters through one door.** A human authors or edits the spec. That is
   the design act. Everything else is mechanical.

5. **There is one escape hatch and it is explicit.** Real behavioural code that a
   generator cannot express lives in `overrides/<component>/`, and the generated
   component imports from there. Without this the whole approach dies the first time
   someone needs a focus trap. Design it in from the start, do not bolt it on.

6. **The validator is a gate, not a linter.** If a spec fails validation, nothing
   generates. Failure output must name the file, the JSON pointer and what to do about
   it.

## Stack

- TypeScript throughout. pnpm workspaces monorepo. Node 20+.
- Zod for runtime validation, with the JSON Schema as the published contract. Keep
  them in sync by deriving the JSON Schema from Zod, not the other way round.
- Style Dictionary for token compilation from DTCG JSON.
- Handlebars for code and docs templates. Deterministic, inspectable, no cleverness.
- Vite + React for the documentation app.
- Cloudflare Workers for hosting and for the agent API. Deploy with wrangler.
- **All model calls go through the Cloudflare AI Gateway OpenAI-compatible endpoint.**
  Base URL `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat`,
  called with the `openai` npm client. The model is a `{provider}/{model}` string read
  from env. Never import a provider SDK directly. Switching from
  `workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast` to `anthropic/claude-sonnet-4-5`
  must be an env var change and nothing else.
- Structured model output uses `response_format` with a `json_schema`. Every model
  response is parsed and validated against a Zod schema before it is used. Treat a
  model returning malformed output as an expected case with a retry and then a clear
  failure, not an exception that crashes the CLI.
- GitHub Actions for CI. Real workflow, real PR checks.

## Repository layout

```
ds-platform/
├─ .ds-config.yaml              platform settings (docs sections, tone, gates)
├─ schemas/
│  └─ component.schema.json     the contract (I am providing this)
├─ tokens/
│  └─ tokens.json               DTCG token set
├─ components/
│  └─ <id>/spec.json            one spec per component (I am providing button)
├─ overrides/
│  └─ <id>/                     hand-written behaviour, imported by generated code
├─ generated/                   all output; never hand-edited
│  ├─ react/
│  ├─ react-native/
│  ├─ docs/
│  ├─ stories/
│  ├─ tests/
│  └─ figma/
├─ packages/
│  ├─ core/                     spec loading, token resolution, selector matching
│  ├─ validator/                validation rules
│  ├─ generators/               one module per target
│  ├─ agents/                   gateway client + the three agents
│  └─ cli/                      the `ds` command
├─ apps/
│  └─ docs/                     Vite React app + Worker with the agent route
├─ demo/
│  └─ PRD-returns-pickup-scheduling.md
└─ .github/workflows/ds.yml
```

## Core concepts you need to get right

**Token resolution.** A spec never contains a raw value, only references like
`{color.action.primary.default.bg}`. `packages/core` resolves a reference against the
DTCG token set, following aliases, and errors on an unresolvable reference. The
validator rejects any spec containing a literal hex, px, rem or numeric style value.

**Selector matching.** The `tokens` array in a spec is a flat list of
`{ part, when, properties }`. `when` is a partial match on prop values plus `state`.
Resolution order is specificity: a binding with more matched keys wins over one with
fewer, and a later binding wins a tie. This flat shape is deliberate, it is what lets
the same generator handle a button and a composite component without special casing.
Do not "improve" it into a nested per-variant structure.

**Invalid combinations.** `invalidCombinations` prunes three things at once: the
generated TypeScript union, the Figma variant matrix, and a validator rule that
rejects any example using a forbidden combination. Implement it once in core and
consume it in all three places.

## Build order

Each phase has an acceptance test. Do not start a phase until the previous one passes
its test. Tell me when each phase passes and stop for review.

### Phase 1: core, validator, CLI skeleton

Spec loading with Zod, token resolution, selector matching, invalid-combination
checking. Validation rules: schema conformance, every token reference resolves, no raw
values, every prop has a description, every example uses a legal combination, every
declared contrast pair meets AA using a real WCAG contrast calculation on resolved
token values.

`ds validate` and `ds validate button`.

**Acceptance:** `ds validate button` passes on the provided spec. Introduce a raw hex
value into the spec and it fails with the JSON pointer and a fix suggestion.

### Phase 2: React generator and the sync gate

Handlebars template producing a typed React component using CSS custom properties and
data attributes for variant and state. No CSS-in-JS, no Tailwind. Types exclude invalid
combinations. Generated file carries a generated-by header. Style Dictionary compiles
tokens to CSS custom properties.

`ds build button` writes to `generated/`.

**Acceptance:** the generated Button renders and every variant, intent, size and state
in the spec is reachable. Running `ds build` twice produces no diff. Hand-editing a
generated file and running the sync check fails.

### Phase 3: docs site

Vite React app that reads specs and generated components and renders, per component:
overview and intent, anatomy, props table, variant gallery rendering the real
component, states, usage do and don't, the accessibility contract, the token map, code
tabs, and the changelog. Every section is driven by `.ds-config.yaml`.

Give it a real typographic identity. Not a bootstrap-looking docs template. Restrained,
one strong display face, generous scale, disciplined everywhere else.

**Acceptance:** the site runs locally and shows the live Button. Change a token value,
rebuild, and the site reflects it with no hand edits.

### Phase 4: React Native generator, stories, tests

Second renderer from the same spec, proving platform independence. Storybook story per
example. Conformance tests generated from the a11y block: role, keyboard map, ARIA
conditions, contrast pairs.

**Acceptance:** one `ds build` produces web and native output plus stories plus passing
tests, all from the unchanged spec.

### Phase 5: agents

`packages/agents` with a single `callModel({ schema, system, messages })` helper that
goes through the gateway and validates the response.

- **Gap analysis.** Input a PRD markdown file. Output a component inventory classified
  as have, partial or missing, each with the evidence line from the PRD and, for
  partial, what is missing from the existing spec. Compares against the real specs in
  `components/`.
- **Intake interview.** Given a component name and PRD context, asks the human the
  questions the PRD cannot answer: intent, when not to use, invalid combinations, the
  a11y contract, content rules. Writes a draft spec. Marks it `status: draft` and never
  claims completeness it does not have.
- **Docs Q&A.** Answers only from the spec bundle in context. When the answer is not in
  the spec it says so plainly and does not guess. This refusal behaviour is
  demonstrated on purpose, so make it clean and confident rather than apologetic.

`ds analyze demo/PRD-returns-pickup-scheduling.md` and `ds new <name>`.

**Acceptance:** the gap report correctly classifies the four components implied by the
demo PRD. The interview produces a spec that passes `ds validate` after I edit it. The
docs agent refuses an off-spec question.

### Phase 6: governance

Semver derived from the spec diff: removed enum value or prop is major, added prop or
variant is minor, description or token change is patch. Changelog and migration guide
generated from the same diff. GitHub Action on PR running validate, build, the sync
check, and the conformance tests, posting results as a PR comment.

**Acceptance:** a real PR that changes a spec shows the derived version bump, the
generated changelog, and green checks.

### Phase 7: Figma and MCP

Figma generator emits a Plugin API script from the spec: component set, variant matrix
with invalid combinations pruned, variables bound, states as rows. Runs in a Figma
plugin against a file I will provide. Do not use the Figma REST API for this, it cannot
create components.

MCP server exposing the specs as resources so a product team's editor can pull the
contract into their own repo.

**Acceptance:** the Figma file gains a Button component set matching the spec. The MCP
server responds to a spec query.

## Things not to do

- Do not add a database. Git is the store.
- Do not add authentication, multi-tenancy, or a dashboard.
- Do not generate event handlers, form logic, data fetching or animation. Scaffold and
  contract only, behaviour goes in `overrides/`.
- Do not use the Figma REST API to create components.
- Do not put an API key in client-side code. The agent route runs in the Worker.
- Do not add Angular. The spec supports it, the generator is out of scope.
- Do not silently widen the schema to make a model's output validate. If the model
  produces something the schema rejects, fix the prompt or the retry, not the contract.

## How to work with me

Small commits with clear messages. After each phase, stop and show me the acceptance
test running. If you hit a decision I have not covered, ask rather than guessing, and
say what you would pick and why.
