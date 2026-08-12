# ds-platform

A spec-driven design system platform. One hand-authored JSON file per
component — `components/<id>/spec.json` — is the single source of truth;
React, React Native, Storybook stories, conformance tests, and a Figma
plugin are all *generated* from it, never hand-edited. A docs site
(`apps/docs`) renders the generated components and drives the whole
pipeline — from a PRD, through a request queue, to a promoted spec — as a
guided "Wizard," both locally and on a deployed Cloudflare Worker.

This README documents every flow in the platform: the CLI, the component
request lifecycle, the docs site (local and deployed), governance/CI, and
the Figma and MCP integrations.

## Repository layout

```
components/<id>/spec.json     Hand-authored component specs (the only hand-authored shape)
components/<id>/CHANGELOG.md  Written by `ds changelog`, one per component
requests/<id>/request.json    Pre-spec intake queue (see "Component request flow")
requests/<id>/BRIEF.md        Design brief, written by `ds request brief`
tokens/tokens.json            DTCG design tokens — the only place raw color/spacing/etc. values live
generated/react/              `ds build` output: .tsx + .css per component, tokens.css
generated/react-native/       `ds build` output: React Native components
generated/figma/<Name>/       `ds build` output: a Figma plugin (code.ts + manifest.json)
generated/stories/            `ds build` output: Storybook stories
generated/tests/              `ds build` output: conformance + native-smoke tests
overrides/<id>/               Hand-written escape hatches a generator can't express

packages/core/                Schema, token resolution, contrast/selector logic — no I/O beyond load.ts
packages/validator/           `ds validate`'s rule set (schema conformance, raw values, token refs, examples, contrast)
packages/generators/react/    Spec -> .tsx + .css (Handlebars template + Style Dictionary for tokens.css)
packages/generators/react-native/  Spec -> React Native components
packages/generators/figma/    Spec -> a Figma plugin (Plugin API, not REST — see "Figma integration")
packages/generators/stories/  Spec -> Storybook stories
packages/generators/tests/    Spec -> conformance + native-smoke tests
packages/agents/              AI Gateway/direct-provider calls: gap analysis, doc-quality, intake interview, docs Q&A
packages/figma-client/        Figma REST client + reconciliation (request <-> live Figma file)
packages/governance/          Semver diff + changelog generation
packages/cli/                 The `ds` command (bin: packages/cli/bin/ds.mjs)
packages/mcp-server/          Serves every component spec as an MCP resource (bin: ds-mcp-server)

apps/docs/                    The docs site + its Cloudflare Worker (see "The docs site")
```

## Getting started

```bash
pnpm install
pnpm validate   # ds validate — every spec against schema, tokens, governance rules
pnpm build      # ds build — generate React/RN/Figma/stories/tests for every spec
pnpm typecheck  # tsc -b across every package
pnpm test       # vitest run
```

## The core loop: spec → generated code

```
components/<id>/spec.json
        │
        ▼
   ds validate  ──── schema conformance, raw-value ban, token-ref resolution,
        │             example coverage, WCAG AA contrast
        ▼
   ds build     ──── generateReact / generateReactNative / generateFigmaPlugin /
        │             generateStories / generateConformanceTests (all pure functions
        │             of a validated spec — no network, no AI)
        ▼
   generated/**       ds check verifies this matches what `ds build` would
                       produce right now (the CI "sync gate" — generated/
                       must never drift from what its spec implies)
```

Every generator in `packages/generators/*` is a pure function: `(spec) =>
GeneratedFile[]`. Nothing about turning a *validated* spec into code touches
the network or an AI model — that only happens earlier, in drafting the spec
itself (see "Component request flow").

## CLI reference (`ds ...`, aliased as `pnpm ds ...`)

| Command | What it does |
|---|---|
| `ds validate [component]` | Validate one or every spec against the schema, tokens, and governance rules |
| `ds build [component]` | Validate, then generate React/RN/Figma/stories/tests output into `generated/` |
| `ds check [component]` | Sync gate — fails if `generated/` doesn't match what `ds build` would produce right now |
| `ds analyze <prdPath> [--check-docs]` | Gap analysis — classify what a PRD needs against the real `components/` inventory (AI) |
| `ds doc-check [component]` | Judge whether a component's docs are proper enough to adopt without asking questions (AI) |
| `ds new <name> [--prd <path>] [--from-request <id>]` | Intake interview: ask what a PRD (or a promoted request) can't answer, then draft a spec (AI) |
| `ds changelog <component> [--base <ref>]` | Governance gate — derive the semver bump from the spec diff, require it to match, write the changelog |
| `ds request new <name>` | File a new component request |
| `ds request approve <id>` | Approve a pending request |
| `ds request brief <id>` | Generate a design brief for an approved request |
| `ds request set-figma-file <id> <fileKey>` | Record which Figma file a designer built the request in |
| `ds request verify <id>` | Reconcile the live Figma file against the request via the Figma REST API |
| `ds request list` | List every request, grouped by status |

AI-backed commands (`analyze`, `doc-check`, `new`) need Cloudflare AI Gateway
credentials — see "Environment variables" below.

## Component request flow

The pre-spec intake queue (`requests/<id>/request.json`) tracks a component
from "someone needs this" to "a real spec exists," independent of
`components/*/spec.json` — a request has no version and never touches the
validator, sync gate, or changelog gate until it's promoted.

```
pending ──approve──▶ approved ──brief──▶ in-design ──verify──▶ ready-for-verification ──promote──▶ promoted
  │                                           ▲                         │
  │                                    (paste Figma file key,           │
  │                                     re-run verify until it          │
  │                                     reconciles)                     │
  │                                                                     ▼
  └── rejected                                              components/<id>/spec.json drafted,
                                                              then `ds build <id>` runs for real
```

- **approve** — a human decides this is worth building.
- **brief** — generates `requests/<id>/BRIEF.md`, a mechanical (non-AI) design
  brief: problem, expected variants, and this platform's fixed token/anatomy/
  accessibility conventions, for a designer to build from in Figma.
- **verify** — reconciles the live Figma file (via `figmaFileKey`) against
  the request's expected variants, using the Figma REST API. Only a real
  Component/Component Set built with bound Figma Variables reconciles — a
  mockup or spec sheet, however accurate it looks, won't.
- **promote** — an intake interview (AI) asks what the request still doesn't
  answer, drafts a `ComponentSpec` from the answers (forced to
  `status: "draft"`, never `"stable"`), writes `components/<id>/spec.json`,
  and runs the real code generators against it.

Run this end to end from the CLI (`ds request new/approve/brief/verify`,
`ds new --from-request <id>`) or from the docs site's Wizard — both drive
the same lifecycle.

## The docs site (`apps/docs`)

A Vite + React app, deployable as a Cloudflare Worker. Two things live in
one app: a documentation browser for every built component, and the Wizard
— a UI for the entire request-to-component flow above.

### Local development

```bash
cd apps/docs
pnpm dev          # vite — the Wizard's backend is a Vite dev-server plugin
                   # reading/writing components/ and requests/ on disk (see
                   # dev-server/api.ts), backed by real Node fs access
pnpm worker:dev    # wrangler dev — runs the *deployed* code path locally
                    # instead (D1-backed, see "Deployment" below)
```

`pnpm dev`'s Wizard reads/writes real files under `components/` and
`requests/` — the same files `ds` reads/writes from the terminal. Nothing it
does is committed automatically; that's still a manual `git add`/commit, same
as running `ds build` by hand.

### Deployed (Cloudflare Worker + D1)

The deployed Worker (`apps/docs/worker/`) has no filesystem, so the same
Wizard flow is backed by a D1 database instead of `components/`/`requests/`
files:

- `worker/dev-api.ts` implements the same `/api/dev/*` routes as local dev,
  reading/writing D1 (`worker/dev-storage.ts`) instead of disk.
- The **promote** step runs `generator-react`'s real `generateReact()`
  in-Worker (not a subprocess, and not Handlebars' default eval-based
  compiler — Workers refuses runtime code generation, so a small hand-written
  renderer stands in for the one logic-free `.hbs` template involved).
- The docs browser compiles a component's generated `.tsx` source with
  Sucrase directly in the browser (`src/compileComponent.ts`) instead of a
  Vite-only `/@fs/...` dynamic import — the same rendering path for local dev
  and production.
- `worker/schema.sql` is the D1 schema. The two example components checked
  into this repo (`button`, `status-indicator`) and their requests are
  seeded into D1 so the deployed site isn't empty on first load.

Everything else about the flow — approve, brief, verify, promote, the
Wizard's four steps — behaves identically in both environments.

### Simulation mode

A "Simulation mode" toggle (sidebar) makes every AI Gateway/Figma REST call
in the Wizard return canned, schema-valid responses instead of a real
network call (`dev-server/simulate.ts` locally, `worker/simulate.ts` on the
Worker — kept in sync by hand, not imported across that project boundary).
Every simulated string is prefixed `"(simulated)"`. This lets the entire
Wizard — PRD scan through a real generated, renderable component — be
exercised with zero API keys. Code generation itself (`generateReact`)
always runs for real regardless of this toggle; only the AI/Figma calls are
faked.

### Credentials

Real (non-simulated) AI generation and Figma verification need credentials,
supplied one of two ways, tried in this order:

1. Pasted into the docs site's **Settings** page (stored in `localStorage`,
   sent per-request) — a direct provider key (Groq/OpenRouter/Kimi), a
   Cloudflare AI Gateway config, or a Figma personal access token.
2. Server-side env vars / Worker secrets (see "Environment variables").

### Docs Q&A assistant

`/api/ask` (server-side only — API keys never reach the browser) answers
free-text questions about every built component's spec, backed by the same
AI Gateway credentials.

## Governance & CI

`ds changelog <id>` derives the required semver bump from a spec's diff
against a base git ref (adding a prop → minor, removing/renaming one →
major, docs-only → patch, etc.), fails if the spec's declared `version`
doesn't match what the diff implies, and — only on success — writes
`components/<id>/CHANGELOG.md` (and a migration guide for a major bump).

`.github/workflows/ds.yml` runs on every PR into `main`: typecheck → `ds
validate` → `ds build` → `ds check` (sync gate) → `pnpm test` → governance
(every changed spec's version bump checked against its diff), and posts one
running PR comment with the result of each step. Nothing here is advisory —
any red step fails the job.

## Figma integration

Two independent, non-overlapping integrations:

- **Verify** (`packages/figma-client`, REST API) — reconciles a component
  *request* against a live Figma file a designer built: fetches the file via
  `GET /v1/files/:key`, checks that every expected variant exists as a real
  Component/Component Set (not a mockup) with at least one bound Figma
  Variable. The REST API can only *read* Figma — it cannot create anything.
- **Figma plugin generator** (`packages/generators/figma`) — `ds build`
  generates a Figma **plugin** (`generated/figma/<Name>/code.ts` +
  `manifest.json`) that uses the Plugin API to construct the component as
  real Figma nodes/variables. Plugins run inside Figma's own sandbox; this
  can only be loaded and run inside the Figma app itself, never headlessly.

## MCP server

`packages/mcp-server` (bin: `ds-mcp-server`) serves every
`components/<id>/spec.json` as an MCP resource at `ds-spec://<id>` —
re-validated against `ComponentSpecSchema` before being served, never a raw
passthrough of whatever's on disk — so an editor or agent in another repo
can pull the governed contract directly instead of copying it by hand.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `CF_AI_GATEWAY_ACCOUNT_ID` | CLI, docs site | Cloudflare account id for AI Gateway |
| `CF_AI_GATEWAY_ID` | CLI, docs site | The AI Gateway's id |
| `CF_AI_GATEWAY_TOKEN` | CLI, docs site | AI Gateway auth token |
| `DS_MODEL` | CLI, docs site | Model id, e.g. `workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| `FIGMA_ACCESS_TOKEN` | CLI, docs site | Figma personal access token, for `ds request verify` / the Wizard's Verify step |

Locally: copy `apps/docs/.env.example` → `apps/docs/.env.local` (read by
`pnpm dev`) and/or `apps/docs/.dev.vars.example` → `apps/docs/.dev.vars`
(read by `wrangler dev` / `ds` run from a shell with these exported). Both
are gitignored. In production, set them as Worker secrets:

```bash
cd apps/docs
wrangler secret put CF_AI_GATEWAY_ACCOUNT_ID
wrangler secret put CF_AI_GATEWAY_ID
wrangler secret put CF_AI_GATEWAY_TOKEN
wrangler secret put DS_MODEL
wrangler secret put FIGMA_ACCESS_TOKEN
```

None of these are required to use Simulation mode.

## Deployment

```bash
cd apps/docs
pnpm build          # vite build
wrangler deploy     # ships dist/ as static assets + worker/index.ts as the Worker
```

The D1 database (binding `DB`, see `wrangler.jsonc`) must exist and have
`worker/schema.sql` applied before first deploy:

```bash
wrangler d1 execute ds-platform-docs --remote --file worker/schema.sql
```
