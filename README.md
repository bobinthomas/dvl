# ds-platform

A spec-driven design system platform. One hand-authored JSON file per
component — `components/<id>/spec.json` — is the single source of truth;
React, React Native, Storybook stories, and conformance tests are all
*generated* from it, never hand-edited. A single spec-agnostic Figma plugin
(`packages/figma-plugin`, installed once) builds any component's real Figma
nodes/Variables at runtime from the same spec. A docs site (`apps/docs`)
renders the generated components and drives the whole pipeline — from a
PRD, through a request queue, to a promoted spec, including sending a
request to that Figma plugin and auto-verifying the result — as a guided
"Wizard," both locally and on a deployed Cloudflare Worker.

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
generated/stories/            `ds build` output: Storybook stories
generated/tests/              `ds build` output: conformance + native-smoke tests
overrides/<id>/               Hand-written escape hatches a generator can't express

packages/core/                Schema, token resolution, contrast/selector logic — no I/O beyond load.ts
packages/validator/           `ds validate`'s rule set (schema conformance, raw values, token refs, examples, contrast)
packages/generators/react/    Spec -> .tsx + .css (Handlebars template + Style Dictionary for tokens.css)
packages/generators/react-native/  Spec -> React Native components
packages/generators/stories/  Spec -> Storybook stories
packages/generators/tests/    Spec -> conformance + native-smoke tests
packages/agents/              AI Gateway/direct-provider calls: gap analysis, doc-quality, intake interview, docs Q&A
packages/figma-client/        Figma REST client + reconciliation (request <-> live Figma file) — see "Figma integration"
packages/figma-plugin/        The spec-agnostic Figma plugin (Plugin API, not REST) — see "Figma integration"
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
   ds build     ──── generateReact / generateReactNative / generateStories /
        │             generateConformanceTests (all pure functions of a
        │             validated spec — no network, no AI)
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
| `ds build [component]` | Validate, then generate React/RN/stories/tests output into `generated/` |
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
  │                        │                  ▲    │                       │
  │                        └── Send to Figma ─┘    │                       │
  │                    (see "Figma integration") (paste a fileKey,         │
  │                                              re-run verify by hand     │
  │                                              — still works as a       ▼
  │                                              fallback)     components/<id>/spec.json drafted,
  └── rejected                                                then `ds build <id>` runs for real
```

- **approve** — a human decides this is worth building.
- **brief** — generates `requests/<id>/BRIEF.md`, a mechanical (non-AI) design
  brief: problem, expected variants, and this platform's fixed token/anatomy/
  accessibility conventions, for a designer to build from in Figma.
- **verify** — reconciles a live Figma file against the request's expected
  variants, using the Figma REST API. Only a real Component/Component Set
  built with bound Figma Variables reconciles — a mockup or spec sheet,
  however accurate it looks, won't. Two ways to get there: manually paste a
  `figmaFileKey` once a designer's built something and re-run verify, or
  **Send to Figma** (available once approved) — no fileKey to paste, no
  manual verify click; see "Figma integration."
- **promote** — an intake interview (AI) asks what the request still doesn't
  answer, drafts a `ComponentSpec` from the answers (forced to
  `status: "draft"`, never `"stable"`), writes `components/<id>/spec.json`,
  and runs the real code generators against it.

Run this end to end from the CLI (`ds request new/approve/brief/verify`,
`ds new --from-request <id>`) or from the docs site's Wizard — both drive
the same lifecycle. Send to Figma is docs-site-only (the plugin has nothing
to talk to from a terminal).

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

Two platform constraints shape everything here: the Figma REST API is
read-only (it cannot create nodes, components, or variables), and plugins
only execute inside the Figma app (no headless path). So a human still has
to press **Build** inside Figma — but everything on either side of that
press is automatic. The round trip:

```
Docs site: "Send to Figma" on an approved/in-design request
        │  POST /api/figma/jobs — draftJobSpec(request) synthesizes a small,
        │  ungoverned ComponentSpec (real props/tokens, never written to
        │  components/) as the job's payload; row status: pending
        ▼
Figma plugin (installed once, spec-agnostic): open it, see every pending
job across every request, pick one
        │  GET /api/figma/jobs/:id?claim=1 — fetches the full spec, flips
        │  the job to claimed
        ▼
Plugin builds for real, using the Plugin API (packages/figma-plugin):
one ComponentSet, one Component per legal (prop combo, state) pairing,
every styled property bound to a real Figma Variable — no raw hex/px,
no component name hardcoded anywhere in the plugin
        │  POST /api/figma/jobs/:id/result — { fileKey, nodeId,
        │  componentSetId, variantKeys, status: "done" }
        ▼
Callback sets the request's figmaFileKey from the result, then
immediately runs reconcileRequest — the exact same reconciliation
packages/figma-client has always used, called once here, not duplicated
        │
        ▼
reconciles ─▶ request moves to ready-for-verification
doesn't    ─▶ request stays in-design; the docs site shows what was
              expected vs. what was found, same as a failed manual verify
```

- **`packages/figma-client`** (REST API, read-only) — `reconcileRequest`
  fetches the live file via `GET /v1/files/:key` and checks that every
  expected variant exists as a real Component/Component Set (not a mockup)
  with at least one bound Figma Variable. This is the single reconciliation
  implementation — the manual `ds request verify` path, the docs site's
  manual Verify button, and the automated callback above all call the exact
  same function.
- **`packages/figma-plugin`** (Plugin API) — one plugin, installed once
  (Figma → Plugins → Development → Import plugin from manifest, pointed at
  this package's `manifest.json`), that reads *any* spec at runtime and
  builds it — never a per-component generated plugin. `pnpm --filter
  @ds-platform/figma-plugin build` bundles `src/code.ts` into
  `dist/code.js` (the one thing in this repo that needs a real bundler —
  everything else runs as TS source directly). `manifest.json`'s
  `networkAccess` must list every origin the plugin's `fetch()` calls hit —
  Figma blocks any request to a domain not listed there, on top of ordinary
  CORS — split across `allowedDomains` (the deployed Worker; requires a
  `reasoning` string) and `devAllowedDomains` (localhost ports; Figma
  rejects plain `http://localhost:*` entries under `allowedDomains`
  outright). `manifest.json` also needs `"enablePrivatePluginApi": true` —
  without it `figma.fileKey` (how the callback reports which file it built
  into) stays `undefined` regardless of whether the file is saved into a
  real project; this is a private-plugin-only API and this plugin is never
  published to Community, so it's safe to enable unconditionally.
- **The job queue** — `figma_jobs` (D1 table, `worker/schema.sql`) in
  production, `requests/<id>/figma-jobs/<jobId>.json` files locally
  (`dev-server/api.ts`) — both backends expose the identical
  `/api/figma/jobs*` routes (a separate mount from `/api/dev/*`: these need
  real `GET` support and CORS, since the plugin calls them cross-origin
  from Figma's sandbox, unlike every `/api/dev/*` route which only this
  app's own UI ever calls).
- **Simulation mode** extends to this too: with Simulation mode on, Send to
  Figma resolves synchronously — no plugin, no Figma, no credentials — via
  a canned `simulateFigmaJobResult`, running through the exact same
  callback/reconciliation code a real plugin's POST would.

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
