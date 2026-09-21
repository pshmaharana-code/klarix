# Klarix V2 — Master Engineering Specification

**Status:** Locked implementation specification  
**Audience:** Coding agents and engineers (Codex, Antigravity, Claude Code, Cursor, or equivalent)  
**Implementation mode:** Incremental evolution of the existing Klarix V1 repository  
**Product version:** V2 — Brand Intelligence Engine

---

## 00. Read This First

This document is the source of truth for Klarix V2. It is not a request to build a new product from scratch and it is not permission to implement every feature in one pass.

The coding agent must work one approved phase at a time. For each phase it must inspect the current repository, make the smallest compatible change, run the required verification loop, record evidence, and stop at that phase boundary.

### Non-negotiable operating rules

1. **Preserve V1.** Existing routes, the single-content analyser, its three-agent pipeline, visual language, and working behaviour are the baseline. Do not delete, replace wholesale, or silently regress them.
2. **Evolve, do not rewrite.** Extend the existing Node/Express backend and Vue 3/Vite frontend unless a contained refactor is explicitly required by this specification.
3. **Code written is not complete.** A feature is complete only when all defined acceptance criteria and verification gates pass.
4. **No invented evidence.** V2 must never present simulated Instagram metrics, synthetic pattern evidence, or fabricated AI conclusions as real data.
5. **Data is brand-scoped.** Every persisted record and every agent invocation must be scoped to an authorised brand.
6. **Long-running work is asynchronous.** HTTP requests create jobs and return promptly; workers execute sync, analysis, intelligence, and generation work.
7. **Agents exchange validated structured data.** Do not make agents coordinate through unvalidated natural-language blobs.
8. **Stay inside V2.** Publishing, autonomous experimentation, agency operations, multi-brand agency control planes, white-labeling, public APIs, and V3+ automation are explicitly out of scope unless separately approved.

### Required agent behaviour at the start of every phase

1. Read this specification and the current repository instructions.
2. Inspect the relevant V1 code before proposing edits.
3. Identify files to preserve, extend, create, and test.
4. State a phase-sized plan; do not implement later phases opportunistically.
5. Implement incrementally with migrations and backwards-compatible API behaviour where relevant.
6. Execute the Closed-Loop Engineering Protocol in section 13.
7. Report changed files, commands/tests run, screenshots or browser evidence, known limitations, and the pass/fail result against the phase acceptance criteria.

---

## 01. Product Context and Version Boundaries

### 1.1 Product ladder

| Version | Product promise |
|---|---|
| V1 | Analyse one piece of content and return diagnosis, strategy, and a ready-to-record script. |
| **V2** | Connect a professional Instagram account; learn from content history; surface evidence-backed patterns and brand memory; turn them into a living strategy, ideas, scripts, and a plan. |
| V3 | Run measurable growth experiments and learn causally over time. |
| V4 | Operate a full Brand Growth OS. |
| V5+ | Platform/API and broader agency infrastructure. |

### 1.2 V2 mission

> Klarix V2 is a **Brand Intelligence Engine**: it studies what has actually happened for one brand, remembers what it learns, explains why it believes it, and recommends what the brand should create next.

V2 is not a generic social-media scheduler, a generic chatbot, or a traditional social-media agency product.

### 1.3 The V2 intelligence loop

```text
Connect account → ingest real content and metrics → analyse content
→ detect patterns → update Brand Memory → generate strategy
→ generate grounded ideas/scripts/plans → user creates/publishes
→ later performance refreshes the next learning cycle
```

The core distinction is:

```text
Analytics: what happened?
Patterns:  why does this repeatedly happen?
Strategy:  what should happen next?
```

### 1.4 In scope

- User identity, authentication, brands, and persistent onboarding state.
- Meta-approved Instagram Professional (Business/Creator) connection and data ingestion.
- Initial catalogue of 20–30 recent posts, then incremental sync.
- Raw metrics, normalised/derived metrics, and AI interpretations as separate layers.
- Post-level content analysis; catalogue-level patterns; explainable Brand Memory.
- Brand strategy, grounded ideas, structured scripts, and a content planner.
- Persistent jobs, retries, progress, logs, observability, and test coverage.

### 1.5 Explicitly out of scope for V2

- Automatic posting/publishing, inboxes/comments/DM automation, ad management.
- Autonomous experimentation or promises of growth outcomes.
- Client/agency portfolio management, role hierarchies beyond V2 needs, white-labeling, billing, public API, or marketplace.
- Cross-brand learning exposed to users. Aggregate learning, if ever added, requires a separate privacy/product decision.
- A rebuild in a new framework or replacement of the existing UI design language.

---

## 02. Existing V1 Baseline — Preserve and Extend

The implementation must confirm these facts against the current checkout before editing. This audit summary is a baseline, not a substitute for inspection.

### 2.1 V1 architecture observed

```text
backend/                    Node.js + Express
  server.js                 API entry point
  services/
    agentVisualAnalyst.js
    agentStrategist.js
    agentScriptwriter.js
    instagramScraper.js
    openRouterClient.js     historical name; direct Gemini client in V1
    runAnalysis.js

frontend/                   Vue 3 + Vite
  src/
    App.vue, main.js, router.js, style.css
    views/, components/, services/, utils/
```

V1 has routes for the landing page, analyser, demo, and about pages. The analyser calls `POST /api/analyse`, receives the three-agent result, and has meaningful `IDLE`, `LOADING`, `PARTIAL`, `COMPLETE`, and `ERROR` user states. V1 also includes prototype URL ingestion and in-memory background-job behaviour.

### 2.2 Preserve

- Node/Express and Vue/Vite foundation.
- Existing analyser route and its successful API contract wherever consumers depend on it.
- The Visual Analyst → Strategist → Scriptwriter conceptual pipeline.
- Existing components, typography, colour palette, animation language, spacing, and brand assets where they remain fit for purpose.
- V1 health endpoint and existing local developer flow.

### 2.3 Refactor gradually

- Move V1's in-memory job registry to persistent jobs plus a real queue/worker.
- Decompose oversized view logic only when modifying the same area; do not perform a cosmetic rewrite unrelated to a phase.
- Rename misleading internals only through safe, tested migrations; the current Gemini client filename must not dictate V2 architecture.
- Replace prototype scraping and simulated fallback values with an approved integration and honest capability/error states.
- Replace permissive JSON parsing/repair with runtime-schema validation for AI outputs.

### 2.4 V1 compatibility gates

Before every V2 release, confirm:

- Existing landing, demo, about, and analyser routes still load.
- A valid V1 manual analysis still completes or fails with a clear, non-breaking error.
- No V2 database or auth requirement blocks the legacy analyser unless the user deliberately enters V2 flow.
- Existing visual styles are not globally broken.

---

## 03. Target Architecture

```text
Vue 3 application
  └─ authenticated AppShell and V1 public/analyser experience
       └─ versioned Express API
            ├─ auth + authorisation middleware
            ├─ domain services and repositories
            ├─ relational database + migrations
            ├─ durable queue + worker processes
            ├─ encrypted secrets/token storage
            ├─ Instagram/Meta adapter
            └─ AI orchestration + output validators
```

### 3.1 Backend target folder evolution

Use the current naming conventions where possible. Introduce these layers incrementally rather than moving V1 files all at once.

```text
backend/
  server.js
  config/
  routes/                 thin HTTP handlers / route registration
  middleware/             auth, validation, error handling, rate limits
  controllers/            optional only if consistent with existing style
  services/               domain orchestration; retain V1 agent services here initially
  agents/                 new validated V2 agent contracts and prompts
  repositories/           database access only; no business decisions
  models/ or db/          schema, migrations, ORM/query client
  schemas/                request/response and AI runtime validators
  integrations/           Meta adapter, Gemini/model provider adapter, object storage
  jobs/                   job definitions, queue configuration, processors
  workers/                worker entry points and schedulers
  lib/                    logging, crypto, IDs, errors, metrics
  tests/
```

Rules: route handlers must not call an LLM directly; repository functions must not contain product policy; job processors must call idempotent domain services; model-provider details must not leak into agents or frontend responses.

### 3.2 Frontend target folder evolution

```text
frontend/src/
  views/                  route-level orchestration
  components/
    ui/ layout/ brand/ content/ analytics/ intelligence/ strategy/ planner/ ai/
  services/               typed API clients
  stores/                 auth/session/brand only; do not make a giant store
  composables/            reusable server-state and UI behaviour
  router.js
  style.css + existing design tokens
```

Server state belongs in request/query composables or the project’s established equivalent. UI state (filters, dialog open state) remains local where possible. Session/auth and selected brand state may be global.

---

## 04. Data Architecture

Use a relational database with migrations and foreign keys. Choose the specific database/ORM only after inspecting the repository and deployment constraints; do not introduce an incompatible second persistence system. UUIDs (or the project’s equivalent opaque IDs), UTC timestamps, `created_at`, and `updated_at` are required on persistent entities.

### 4.1 Data principles

- A user is not an Instagram account; a user owns or can access brands, and a brand has connected accounts.
- Never couple internal records directly to Meta response shape.
- Keep raw source data, calculated data, and AI interpretation distinct.
- All brand-owned tables have `brand_id` or a secure, enforceable ownership path.
- Use immutable/snapshotted facts where history matters; do not overwrite metric history without provenance.

### 4.2 Core schema

| Entity | Essential fields / responsibility |
|---|---|
| `users` | `id`, `email`, identity-provider fields, timestamps. |
| `brands` | `id`, `owner_user_id`, name, onboarding status, positioning, audience, goals, voice/style inputs. |
| `brand_members` | `brand_id`, `user_id`, role; start with owner/member semantics even if V2 uses owner only. |
| `social_accounts` | `id`, `brand_id`, platform, external_account_id, username, account type, profile metadata, connection status, token reference/encrypted token, expiry, last sync. Unique `(platform, external_account_id)`. |
| `contents` | `id`, `brand_id`, `social_account_id`, external_content_id`, type, caption/transcript fields, permalink, published time, raw metadata reference, current analysis status. Unique `(social_account_id, external_content_id)`. |
| `content_media` | `content_id`, type, source URL/object reference, width/height/duration, checksum; do not store credentials in URLs. |
| `content_metric_snapshots` | `content_id`, observed_at, source metrics (reach, impressions, views, likes, comments, saves, shares, etc. when available), raw source reference. |
| `content_derived_metrics` | `content_id`, calculation version, metric values (engagement/share/save rates, percentile/baseline comparison), calculated_at. |
| `content_analyses` | `content_id`, analysis version, status, structured visual/content/performance results, confidence, model/provider metadata, evidence references, completed_at. |
| `patterns` | `id`, `brand_id`, category, title, claim, confidence, impact, status, analysis version, recommended action, created/superseded timestamps. |
| `pattern_evidence` | `pattern_id`, `content_id` and/or metric reference, contribution/summary; every displayed pattern must have evidence rows. |
| `brand_memory_entries` | `id`, `brand_id`, domain (audience/voice/pillar/preference/learning), statement, confidence, status, provenance/evidence, valid-from/to, source version. |
| `strategies` | `id`, `brand_id`, status, objective, target audience, positioning, pillars, formats, do/stop list, experiments, success metrics, source snapshot/version. |
| `content_ideas` | `id`, `brand_id`, `strategy_id`, title/hook, pillar, format, rationale, source pattern/memory links, status. |
| `scripts` | `id`, `content_idea_id`, structured hook/open/body/transitions/CTA/visual direction/duration/voice check, version. |
| `content_plans` | `id`, `brand_id`, strategy snapshot, period start/end, status. |
| `content_plan_items` | `content_plan_id`, scheduled date, content idea/script references, objective, format, status. |
| `jobs` | `id`, `brand_id`, parent job, type, state, priority, idempotency key, progress fields, input/result/error metadata, attempts, timestamps. |
| `job_logs` | `job_id`, timestamp, level, event, structured safe context. |
| `ai_usage_events` | brand/job/content linkage, provider/model, input/output units where available, estimated cost, latency, outcome. |
| `audit_events` | actor, brand, action, entity, safe metadata, timestamp. |

### 4.3 Required relationships and constraints

```text
user → brands → social_accounts → contents → metric snapshots / analyses
brand → patterns → pattern_evidence → contents
brand → memory / strategies → ideas → scripts / plan items
brand → jobs → job logs / AI usage
```

Enforce uniqueness for platform content IDs per connected account; add indexes for `brand_id`, external IDs, `published_at`, job state/type, and pattern/memory lookup. Store schema/version fields on derived AI artifacts to permit safe reanalysis.

### 4.4 Data lifecycle and retention

- Save the raw Meta payload or a protected object reference for traceability, not as an unbounded duplicate in many tables.
- Record metric snapshots rather than only “current metrics.”
- Preserve superseded patterns/memory/strategy versions for auditability; hide stale versions from normal UI.
- Provide a defined deletion/export path before production release. Token revocation/deletion must be separately logged and verified.

---

## 05. API Architecture and Contracts

Use a versioned `/api/v2` namespace for new persistent product APIs. Keep V1 endpoints working under their existing paths until consciously migrated.

### 5.1 API rules

- JSON responses use a consistent success/error envelope.
- Validate every request at the boundary.
- Authorise the current user against the requested brand/resource before loading sensitive data.
- Never return access tokens, provider raw secrets, stack traces, or unvalidated model output.
- Mutations use idempotency keys when retries can create duplicate work.
- Async operations return `202 Accepted` with a job reference, not an open request waiting on an LLM.

### 5.2 Core endpoint map

| Area | Contract |
|---|---|
| Session | `GET /api/v2/session`; auth callback/login/logout according to selected identity provider. |
| Brands | `GET/POST /api/v2/brands`; `GET/PATCH /api/v2/brands/:brandId`; onboarding update endpoint. |
| Connections | `POST /api/v2/brands/:brandId/social-accounts/instagram/connect`; OAuth callback; `GET/DELETE /.../social-accounts/:accountId`. |
| Sync | `POST /api/v2/brands/:brandId/sync` → `202 { job }`; `GET /.../jobs/:jobId`. |
| Content | `GET /api/v2/brands/:brandId/content` with cursor/filter; `GET /api/v2/content/:contentId`; detail includes only authorised brand data. |
| Analytics | `GET /api/v2/brands/:brandId/analytics/overview`; content-level metrics endpoint; date/filter parameters validated. |
| Patterns | `GET /api/v2/brands/:brandId/patterns`; `GET /api/v2/patterns/:patternId`; discovery mutation returns a job. |
| Memory | `GET /api/v2/brands/:brandId/memory`; filtered by domain/status; no hidden unsupported claims. |
| Strategy | `GET /api/v2/brands/:brandId/strategy`; `POST /.../strategy/generate` → job; strategy version endpoint. |
| Ideas/scripts | list/detail; `POST .../ideas/generate` and script generation/regeneration return jobs; generated data is structured. |
| Planner | `GET/POST /api/v2/brands/:brandId/content-plans`; plan item edits are authorised and validated. |
| Jobs | `GET /api/v2/brands/:brandId/jobs/:jobId`; optional safe job list; cancel only queued work initially. |

### 5.3 Async job response shape

```json
{
  "data": {
    "job": {
      "id": "opaque-id",
      "type": "SYNC_ACCOUNT",
      "state": "QUEUED",
      "progress": { "percent": 0, "processed": 0, "total": null, "currentStep": "Queued" }
    }
  }
}
```

### 5.4 Error contract

Use stable codes such as `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, and `INTERNAL_ERROR`. User-facing messages must be actionable; internal causes belong only in protected logs.

---

## 06. AI Agent System and Contracts

### 6.1 System order

```text
Brand context + content + metrics
  → post analysis (visual, content, performance)
  → Pattern Engine
  → Memory Engine
  → Strategy Engine
  → Idea Generator
  → Scriptwriter
```

The V1 Visual Analyst, Strategist, and Scriptwriter are foundations, not disposable prototypes. Their V2 responsibilities must be narrowed and their outputs validated.

### 6.2 Universal agent contract

Every agent receives:

- A versioned, minimal, brand-authorised input object.
- Explicit responsibility and non-responsibilities.
- A machine-validated JSON schema.
- Evidence/provenance requirements.
- Model/provider metadata capture.
- A failure path: invalid/unsafe/unparseable output is rejected, logged, and retried/fails according to job policy; it is never silently persisted as truth.

Agents must not access arbitrary brands, invent data unavailable in their input, mutate databases directly, or call each other through free-form prose.

### 6.3 V2 agents

| Agent | Input | Validated output | Responsibility |
|---|---|---|---|
| Visual Analyst | authorised media/transcript/metadata | visual observations, on-screen text, hook/retention observations, confidence | Analyse observable creative properties. |
| Content Analyst | caption/transcript/content metadata | themes, format, CTA, narrative, audience signals | Classify what the content says and how it communicates. |
| Performance Analyst | source + derived metrics and comparable brand baseline | metric interpretation, performance factors, confidence | Interpret performance without claiming causality beyond evidence. |
| Content Intelligence Orchestrator | three post analyses | consolidated content learning and evidence links | Produce one coherent post-level record. |
| Pattern Engine | sufficient brand-scoped analysed catalogue | pattern candidates, impact/confidence, qualifying sample size, evidence content IDs, recommended action | Identify recurring relationships; never create a pattern with no evidence. |
| Memory Engine | onboarding inputs, accepted patterns, approved strategy context | versioned memory entries with provenance/confidence | Maintain explainable brand beliefs. |
| Strategy Engine | current brand, memory, patterns, metrics, recent content | structured living strategy and sources | Recommend a plan grounded in current evidence. |
| Idea Generator | strategy + linked evidence + exclusions | ideas with hook, pillar, format, rationale/source links | Produce contextual ideas, not generic filler. |
| Scriptwriter | selected idea, brand voice, strategy, constraints | structured script sections, visual direction, duration, voice check | Extend V1 script capability with stronger context. |

### 6.4 Confidence and explainability

Confidence is not a decorative percentage. It must derive from declared factors (sample size, consistency, evidence quality, and model certainty if used) and be stored alongside the explanation. The UI must show the supporting posts/metrics for material patterns and memory claims via “Why Klarix believes this.”

### 6.5 Prompt and model management

- Version prompts and JSON schemas together.
- Centralise provider/model adapters and fallback policy.
- Retain V1 Gemini support only behind an adapter; never scatter provider calls through routes.
- Record provider/model, prompt/schema version, latency, usage/cost, and result status per invocation.
- Test primary-model failure, malformed structured output, timeout, rate-limit, and fallback behaviour.

---

## 07. Jobs, Queues, and Workers

### 7.1 Fundamental flow

```text
UI → API creates durable job → returns job ID → queue → worker
→ service/agent/integration → database → job progress/result → UI polls or subscribes
```

### 7.2 Canonical states

`CREATED → QUEUED → PROCESSING → COMPLETED`  
Terminal alternatives: `FAILED`, `CANCELLED`.

State transitions must be validated and timestamped. A job never becomes completed merely because a worker process ended.

### 7.3 V2 job types

```text
SYNC_ACCOUNT, IMPORT_CONTENT, FETCH_METRICS,
ANALYZE_CONTENT, ANALYZE_BATCH,
DISCOVER_PATTERNS, UPDATE_MEMORY,
GENERATE_STRATEGY, GENERATE_CONTENT_IDEAS, GENERATE_SCRIPT
```

Publishing, media generation, reporting, and other future jobs may be designed for but must not be implemented as V2 scope.

### 7.4 Parent/child pipeline

```text
SYNC_ACCOUNT
  ├─ IMPORT_CONTENT × N
  │    └─ ANALYZE_CONTENT × N
  └─ after eligible analysis: DISCOVER_PATTERNS
       → UPDATE_MEMORY → GENERATE_STRATEGY
```

Parent progress derives from child state. A partial failure must be visible: e.g. “490 of 500 analysed; 3 need retry,” not an all-or-nothing hidden failure.

### 7.5 Reliability requirements

- Long work never blocks HTTP.
- All processors are idempotent. Use stable idempotency keys and database unique constraints.
- Retry only transient failures with bounded exponential backoff and jitter. Do not retry validation, permission, or permanent provider errors indefinitely.
- Concurrency is configurable and separately limited for Meta and model-provider work.
- Capture safe structured logs, attempts, job progress, current step, error classification, duration, and AI usage.
- Dependencies must be explicit: strategy cannot run on an empty/incomplete catalogue without a documented degraded state.
- Scheduled/incremental sync capability may be introduced as backend support, but no scheduler UI is required in V2.

---

## 08. Frontend Architecture and Experience

### 8.1 App shell and navigation

Authenticated V2 pages render inside one persistent `AppShell` with Sidebar, Topbar, Notifications, and global state. Do not recreate independent layouts per route.

```text
Overview:     Dashboard
Intelligence: Content, Analytics, Patterns, Brand Memory
Strategy:     Strategy, Content Ideas, Planner
System:       Settings
```

Jobs, databases, agents, and APIs are infrastructure—not normal-user navigation items.

### 8.2 Route map

```text
Public / legacy: /, /login, /register, /analyse, /demo, /about
Onboarding:     /onboarding, /onboarding/brand, /onboarding/connect,
                /onboarding/sync, /onboarding/ready
Authenticated:  /dashboard
                /brand, /brand/memory
                /content, /content/:contentId
                /analytics
                /patterns, /patterns/:patternId
                /strategy
                /ideas, /ideas/:ideaId, /ideas/:ideaId/script
                /planner
                /ai (optional V2 surface only after intelligence exists)
                /settings
```

If the repository uses different V1 route names, map deliberately and preserve redirects/links.

### 8.3 Page responsibilities

| Page | Must answer / show |
|---|---|
| Dashboard | Brand health, meaningful change, what Klarix learned, and next actions—not a giant chart wall. |
| Brand | Positioning, audience, voice, pillars, goals, preferences, learned insights. |
| Brand Memory | What Klarix knows, confidence, provenance, and evidence path. |
| Content list/detail | Catalogue and per-content media, performance, analyses, what worked/failed, and learning. |
| Analytics | Quantitative overview, growth/engagement/reach/content performance/trends with filters. |
| Patterns/detail | Evidence-backed discovery, confidence, impact, supporting posts/metrics, action. |
| Strategy | Current objective/audience/positioning/pillars/formats/do/stop/experiments/success metrics as a living plan. |
| Ideas/script | Grounded idea rationale, then editable structured script and visual direction. |
| Planner | Calendar/list/board representation of strategy → ideas → scheduled content. |
| Settings | Profile, brand, social accounts, AI preferences, account. |

### 8.4 Required reusable components

Use existing primitives before adding equivalents. Likely V2 groups: `ui` (Button/Input/Modal/Tabs/Badge/Skeleton), `layout` (AppShell/Sidebar/Topbar/PageContainer), `content` (ContentCard/Grid/Metrics), `analytics` (MetricCard/Charts), `intelligence` (PatternCard/Evidence/Confidence/Insight), `strategy`, `planner`, and `ai` (response/status/generation controls).

### 8.5 UX states

Every data surface needs an intentional loading, empty, partial, error, and ready state. Distinguish:

- data loading: “Loading analytics…”;
- background work: “342 / 500 posts analysed” with a job/status link;
- AI work: “Klarix is identifying patterns…”;
- empty onboarding: “Connect your Instagram account to begin building intelligence.”;
- failure: an honest explanation and safe retry action.

Do not use a generic spinner for all of these. Persist onboarding stage so a return after a closed browser resumes by reading job status rather than restarting sync.

---

## 09. Security, Permissions, and Privacy

### 9.1 Identity and access

- Require authenticated identity for every V2 API except auth callbacks/health/public pages.
- Enforce brand ownership/membership server-side for every route, query, job, media asset, and agent context.
- Treat client-provided `brandId` as untrusted; resolve access from the session and membership.
- Use least-privilege roles; owner/member is sufficient initially. Do not build agency RBAC early.

### 9.2 Instagram/Meta integration

- Use an approved Meta flow for Instagram Professional accounts only, with minimal permissions required for available V2 read capabilities.
- Validate OAuth state/PKCE as applicable; verify callback identity and account ownership before persisting.
- Encrypt refresh/access tokens at rest with managed keys; never log, return, commit, or place them in frontend storage.
- Explicitly handle expired/revoked permissions and unavailable insights. Never fall back to simulated metrics.
- Verify current Meta requirements against official documentation at implementation time; platform permissions and endpoints change.

### 9.3 Application security baseline

- Environment-only secrets; committed examples contain placeholders only.
- Input validation, secure headers, CORS allowlist, rate limits, request-size limits, secure file/media handling, and dependency scanning.
- Structured logs redact tokens, authorization headers, PII beyond operational need, and raw model prompts where they contain private data.
- Authorised object-storage access uses short-lived signed URLs where media is private.
- Implement deletion/connection revoke paths before public launch.

---

## 10. Observability, Testing, Reliability

### 10.1 Observability

Every request gets a correlation ID propagated into jobs, logs, provider calls, and errors. Track health/readiness, API error rate/latency, queue depth/age/failures, job duration/retries, integration failures, AI validation/fallback/usage, and database errors.

An operator must be able to answer: What failed? For which brand/job? At which step? Was it provider, validation, data, or application failure? Did retry succeed? What changed after deployment?

### 10.2 Test pyramid

| Level | Required coverage |
|---|---|
| Unit | metric calculations, ownership guards, idempotency, job-state transitions, agent schema validators, prompt transforms. |
| Integration | repositories/migrations, auth → brand isolation, Meta adapter fixtures, API request/response schema, queue processor with mocked providers. |
| Contract | V1 analyser contract remains supported; V2 endpoint envelopes and agent JSON schemas. |
| End-to-end | onboarding/connect mock path, sync progress/resume, content/pattern/strategy journey, denied cross-brand access. |
| Browser/visual | desktop and mobile layouts; nav, loading/empty/error/ready states; no console errors or failed critical requests. |

### 10.3 Reliability standards

- Fail closed on authorisation and invalid AI data.
- Degrade honestly when a provider is unavailable; retain existing valid data and show a retryable state.
- Do not display a pattern/strategy based on missing, stale, or insufficient source material without an explicit status.
- Migrations are reversible where practical, backed up, tested on a copy/staging database, and never edited after production application.

---

## 11. Infrastructure and Deployment

### 11.1 Environments

Maintain local, test/CI, staging, and production configuration. Production uses separate web/API, worker, database, queue, object storage, secrets management, monitoring, and backups appropriate to the chosen host.

### 11.2 Deployment rules

- Build/test/lint before deployment; run migrations as a controlled release step.
- Worker and API processes may scale independently.
- Health and readiness endpoints distinguish “process alive” from “can serve traffic.”
- No secrets in logs, images, commits, client bundles, or browser screenshots.
- Have rollback steps for application release and a compatible migration strategy.

### 11.3 Configuration categories

Identity/auth, database, queue, storage, encryption key, Meta OAuth, AI provider/models, rate/concurrency limits, logging/telemetry, allowed origins, and feature flags. Validate required configuration at startup and fail with safe diagnostics.

---

## 12. Phased, Week-Wise Execution Plan

The calendar is directional; do not sacrifice verification to hit a date. Each phase is a merge/release boundary and must pass its exit gate before the next begins.

| Phase / indicative week | Deliverable | Exit gate |
|---|---|---|
| 0 / Week 1 | V1 forensic confirmation, architecture decision record, local/staging baseline, test harness, design-system inventory. | V1 routes and analyser pass regression; implementation plan approved. |
| 1 / Week 1–2 | Database, migrations, authentication, brands, brand isolation, app/session shell. | Cross-brand access denied; migrations and auth tests pass; V1 intact. |
| 2 / Week 2–3 | Meta connection adapter, encrypted account storage, job queue/worker foundation, job UI/resume. | Mocked connection and durable job lifecycle pass; no fake fallback data. |
| 3 / Week 3–4 | Import 20–30 recent posts, media/metric normalisation, content catalogue/detail. | Idempotent repeat sync, metrics snapshots, progress/partial failure tested. |
| 4 / Week 4–5 | Post analysis orchestration and V1-agent adaptation with strict schemas. | Validated results persist; malformed/provider failures safe; content detail works. |
| 5 / Week 5–6 | Derived analytics and Analytics UI. | Calculations unit-tested; filters/states/browser checks pass. |
| 6 / Week 6–7 | Pattern Engine, evidence model, Patterns UI/detail. | Every displayed pattern has sufficient evidence and confidence; empty/insufficient-data states pass. |
| 7 / Week 7–8 | Brand Memory Engine and explainable Memory UI. | Each meaningful memory entry exposes provenance; stale/superseded handling works. |
| 8 / Week 8–9 | Strategy Engine and living Strategy UI. | Strategy is tied to current memory/pattern snapshot and generation is async/validated. |
| 9 / Week 9–10 | Ideas, structured scripts, planner. | Every idea has rationale/source; script edits/versioning and planner states pass. |
| 10 / Week 10–11 | Security hardening, observability, reliability, performance, deploy/staging rehearsal. | Threat/permission, backup/rollback, monitoring and full E2E suite pass. |
| 11 / Week 11–12 | Limited beta, production readiness fixes, regression and release evidence. | Definition of Done and final validation complete. |

No phase may introduce V3/agency functionality just because it appears adjacent.

---

## 13. Closed-Loop Engineering Protocol (CLEP)

CLEP is mandatory for every phase, feature, bug fix, migration, and UI change. It governs implementation; it is not an optional feature.

### 13.1 Core loop

```text
Read scope → inspect current code → define measurable acceptance criteria
→ implement smallest coherent change → run static/unit/integration checks
→ run app/worker → exercise real or controlled browser flow
→ inspect UI, console, network, logs, database/job state
→ compare evidence against acceptance criteria
→ diagnose and fix failures → repeat
→ only then report completion
```

### 13.2 Completion is criteria-based, not “100% perfect”

The agent must not loop against an undefined subjective notion of perfection. It must continue until every explicit criterion for the phase passes, required regressions pass, and no severity-1 or severity-2 defect remains. Unresolved non-blocking issues must be documented rather than silently ignored.

### 13.3 Per-feature verification checklist

For each feature, define before code:

1. Objective and non-goals.
2. Expected user behaviour and state transitions.
3. UI/visual requirements using existing Klarix design language.
4. API/database/agent/job requirements.
5. Security and brand-isolation requirements.
6. Acceptance criteria and failure conditions.
7. Test data and verification procedure.
8. Completion gate.

### 13.4 Required evidence

- Changed-file list with justification.
- Test/lint/type/build results.
- API or integration evidence for backend work.
- Database/job-state evidence for async work.
- Browser evidence for frontend work: key route screenshots at relevant desktop/mobile viewports, console inspected, critical network requests checked.
- Regression evidence for V1 analyser and affected V2 journeys.

Visual verification checks hierarchy, spacing, typography, overflow, loading/empty/error/ready states, responsiveness, component consistency, and accessibility basics. Functional verification checks navigation, form/button behaviour, auth, API status codes, error recovery, job progression, and data persistence.

### 13.5 Failure discipline

- Do not paper over failures with fake data, skipped tests, broad catch blocks, or static success UI.
- Do not change acceptance criteria mid-loop to fit an implementation without explicit approval.
- If blocked by missing credentials/external approval, complete all safe mocked/fixture checks, document the exact blocker, and stop rather than pretending production verification passed.
- Re-run the whole affected acceptance suite after a fix, not only the one symptom.

---

## 14. Feature Acceptance Criteria

### 14.1 Connection and onboarding

- A user can create/select a brand and resume onboarding after refresh.
- Only a supported professional account can be connected; unsupported/expired/insufficient-permission states are clear.
- Tokens are encrypted and never shown/logged.
- Sync starts asynchronously, exposes genuine progress, survives API restart according to queue durability, and prevents duplicate content on retry.

### 14.2 Content, metrics, and analysis

- Initial sync creates an honest catalogue of 20–30 recent eligible posts where available; the actual count and limitations are shown.
- Raw source metrics, derived metrics, and AI interpretations are separately persisted and traceable.
- Content detail displays media/basic facts/performance/analysis/learning with loading, empty, partial, and error states.
- Invalid or incomplete agent output is not displayed as completed analysis.

### 14.3 Patterns and Brand Memory

- A pattern includes claim, category, impact, confidence, sample/evidence, recommended action, and version/status.
- Pattern detail links to evidence; no evidence means no published pattern.
- Brand Memory separates user-provided facts from learned entries and provides provenance/confidence.
- Insufficient content produces an educational empty state, not speculative advice.

### 14.4 Strategy through planner

- Strategy is a structured, versioned operating plan grounded in the current snapshot of brand context/patterns/memory.
- Each generated idea says why it was recommended and links to relevant sources.
- Scripts contain editable structured sections, visual direction, duration, and a brand-voice check.
- Planner items link back to ideas/strategy and support an honest status; V2 does not publish content automatically.

### 14.5 Security and reliability

- Attempts to read/mutate another brand’s resources return `403`/safe not-found as the API policy requires.
- Sensitive data never appears in responses, screenshots, client storage, or logs.
- Jobs are idempotent, retryable when transient, cancellable only where safe, and observable.
- Provider outage, malformed output, rate limit, worker restart, and partial import scenarios have tested behaviour.

---

## 15. Regression Requirements

Run these before merging/releasing any phase that touches the relevant area:

- V1 landing, analyser, demo, and about routes render.
- Existing V1 analyser input → API → three-agent response handling remains compatible.
- Build, lint, type checks (if configured), unit/integration suites pass.
- Authentication does not leak or block legacy public routes incorrectly.
- Existing global styling, responsive layout, and core interactions retain their visual language.
- Existing health endpoint and developer startup workflow remain usable or are deliberately documented/migrated.
- A clean database/bootstrap and an upgraded database path both work.

---

## 16. Definition of Done

A phase or feature is done only if all statements are true:

- Scope matches this specification; later-version features were not added.
- The V1 baseline was preserved and required regressions passed.
- Schema/migrations, APIs, queues, agent contracts, and UI are aligned and versioned where needed.
- Required authentication, brand isolation, secret handling, and input/output validation are enforced.
- Automated checks and relevant browser/integration tests pass.
- CLEP evidence is recorded, including screenshots where a visual surface changed.
- Error, loading, empty, partial, and retry states were explicitly tested.
- Observability is sufficient to diagnose production failure.
- Documentation/configuration examples are updated without exposing secrets.
- No critical/high-severity issue remains; any accepted limitation is explicit and approved.

---

## 17. Final V2 Validation and Handoff

Before declaring Klarix V2 release-ready, execute an end-to-end staging run:

```text
Create user/brand → connect approved test professional account
→ sync initial catalogue → observe durable jobs/progress
→ inspect content and analytics → discover evidence-backed patterns
→ inspect Brand Memory provenance → generate strategy
→ generate grounded idea and structured script → place item in planner
→ refresh/re-login/retry controlled failure → verify persistence, isolation, logs, and no V1 regression
```

The release handoff must contain the deployed revision, migration identifiers, environment/configuration checklist (without secrets), test report, browser evidence, monitoring dashboards/alerts, known limitations, rollback procedure, and the next explicitly approved phase.

---

## Appendix A — Agent Session Prompt Template

Use this prompt when handing one phase to a coding agent:

```text
Read Klarix_V2_Master_Engineering_Specification.md and the repository instructions.
Implement Phase [N] only: [name]. Do not begin later phases or V3 features.

First inspect the existing V1 code relevant to this phase. State the files you will preserve,
extend, create, and test. Implement the smallest compatible change.

Apply the Closed-Loop Engineering Protocol: run required tests, start the application/worker,
exercise the affected browser flows, inspect console/network/logs/job/database evidence, fix all
acceptance-criterion failures, rerun regressions, and then report evidence. Do not claim completion
until the phase exit gate passes. Do not invent data or expose secrets.
```

## Appendix B — V2 Product Boundary Reminder

The agency vision and future Growth OS are strategic context, not implementation authority. V2 earns the right to build V3 only after it reliably captures real data, produces explainable brand-specific intelligence, and proves the complete learning-to-recommendation loop with users.

---

## 18. Implementation Lock — Exact Technical Decisions

This section removes implementation discretion from coding agents. These are the locked V2 defaults. A change requires an explicit architecture decision record and approval; an agent must not substitute a different framework because it is more familiar.

### 18.1 Locked stack

| Concern | Locked V2 choice | Why / boundary |
|---|---|---|
| Existing application | Node.js (current supported LTS), Express, Vue 3, Vite, JavaScript | Preserve the V1 runtime and frontend. Do not convert the product to Next.js, React, Python, or a monorepo rewrite. |
| Database | PostgreSQL 16+ | Relational ownership, history, transactions, constraints, and indexes are required. |
| Database access/migrations | Prisma ORM + Prisma Migrate | One schema and committed SQL migration history; never use `db push` outside disposable local prototypes. |
| Queue | BullMQ backed by Redis 7+ | API producer and worker consumer are separate processes; Redis is queue transport, PostgreSQL is the durable product record. |
| Runtime validation | Zod | Validate HTTP inputs, HTTP outputs where practical, provider payloads, and all agent results before persistence. |
| Authentication | Auth.js-compatible JWT/session verification in Express with a Vue session client | Use a single identity provider integration; do not create a home-grown password/auth protocol. Provider selection may be Clerk or Auth0 only if an existing V1 dependency/account already dictates it; all server-side authorisation rules in this specification remain mandatory. |
| Object/media storage | S3-compatible private object storage | Store only object keys/checksums in PostgreSQL; serve private assets with short-lived signed URLs. |
| AI provider layer | Existing Gemini implementation behind `integrations/ai/geminiClient.js` | Preserve the proven V1 provider, but routes/agents cannot call it directly. Model identifiers are environment configuration, not hard-coded product logic. |
| Instagram | Meta Instagram API using the current official professional-account/OAuth flow | Read-only V2 integration. At implementation time, confirm current approved permissions/endpoints in Meta documentation before requesting them. |
| Observability | Pino structured JSON logs + OpenTelemetry-compatible traces/metrics | Logs must carry correlation, brand, job, and request identifiers without secrets. |
| Tests | Vitest for unit/integration; Playwright for browser E2E/visual evidence | Retain any existing test runner only where it is already working; do not duplicate suites. |
| Deployment unit | Separate `api` and `worker` services, plus managed Postgres, managed Redis, and private object storage | A single process cannot be the durable worker architecture. |

Prisma Migrate maintains a committed SQL migration history and supports custom SQL; production applies pending migrations with `prisma migrate deploy`. BullMQ uses Redis-backed queues and processes work through independent worker processes. These choices are intentional and must not be replaced with an in-memory `Map`, cron-in-request, or detached promise pattern. [Prisma Migrate documentation](https://docs.prisma.io/docs/orm/prisma-migrate), [BullMQ queues documentation](https://docs.bullmq.io/guide/queues)

### 18.2 Locked package boundaries

```text
backend/
  prisma/schema.prisma
  prisma/migrations/<timestamp>_<name>/migration.sql
  src/
    server.js                    Express API process only
    worker.js                    BullMQ worker process only
    config/env.js                parse/validate environment once at startup
    db/prisma.js                 sole PrismaClient factory
    routes/v2/*.js               route registration only
    middleware/*.js              auth, validate, error handler, request context
    schemas/*.js                 Zod request/response/agent schemas
    repositories/*.js            Prisma queries only
    services/*.js                domain workflows/transactions
    jobs/*.js                    queue names, job schemas, enqueue functions/processors
    agents/*.js                  prompt composition + validated structured-result mapping
    integrations/meta/*.js       OAuth/API normalisation only
    integrations/ai/*.js         provider clients/fallbacks only
    lib/*.js                     crypto, logger, errors, pagination, metrics
    tests/
frontend/src/
  services/api.js                one authenticated API client
  stores/session.js
  stores/brand.js
  composables/
  components/
  views/
```

Rules: exactly one Prisma client factory; exactly one queue configuration module; no SQL/Prisma in Vue components; no provider token/client in frontend; no database calls in route files other than calling a service; no LLM calls outside `agents/` and `integrations/ai/`.

### 18.3 Environment contract

The agent must create `.env.example` with names only, no real values, and validate all required values at API/worker startup.

```text
NODE_ENV, PORT, API_PUBLIC_URL, FRONTEND_ORIGIN,
DATABASE_URL, DIRECT_URL, REDIS_URL,
AUTH_ISSUER, AUTH_AUDIENCE, AUTH_JWKS_URL,
TOKEN_ENCRYPTION_KEY, OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_REGION,
OBJECT_STORAGE_BUCKET, OBJECT_STORAGE_ACCESS_KEY_ID, OBJECT_STORAGE_SECRET_ACCESS_KEY,
META_APP_ID, META_APP_SECRET, META_REDIRECT_URI,
GEMINI_API_KEY, GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODEL,
OTEL_EXPORTER_OTLP_ENDPOINT, LOG_LEVEL
```

`TOKEN_ENCRYPTION_KEY` must be a rotation-capable application secret. OAuth tokens are encrypted before database write using authenticated encryption; neither ciphertext nor the key may be logged.

---

## 19. Database Execution Contract

### 19.1 Conventions and enums

Use PostgreSQL `uuid` primary keys generated in the database or application consistently. All timestamps are `timestamptz` in UTC. JSON data uses `jsonb`. Money/cost is `numeric`, never floating point. Deletion uses explicit product-specific state; do not add soft delete everywhere by default.

Required enums:

```text
BrandRole: OWNER | MEMBER
OnboardingStatus: NOT_STARTED | BRAND_PROFILE | CONNECT_ACCOUNT | SYNCING | READY | ERROR
Platform: INSTAGRAM
ConnectionStatus: CONNECTED | EXPIRED | REVOKED | ERROR | DISCONNECTED
ContentType: REEL | IMAGE | CAROUSEL | VIDEO | OTHER
AnalysisStatus: NOT_STARTED | QUEUED | PROCESSING | COMPLETED | PARTIAL | FAILED
PatternStatus: CANDIDATE | ACTIVE | SUPERSEDED | REJECTED
MemoryStatus: ACTIVE | SUPERSEDED | REJECTED
JobType: SYNC_ACCOUNT | IMPORT_CONTENT | FETCH_METRICS | ANALYZE_CONTENT | ANALYZE_BATCH | DISCOVER_PATTERNS | UPDATE_MEMORY | GENERATE_STRATEGY | GENERATE_CONTENT_IDEAS | GENERATE_SCRIPT
JobState: CREATED | QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED
JobPriority: HIGH | NORMAL | LOW
PlanStatus: DRAFT | ACTIVE | ARCHIVED
PlanItemStatus: IDEA | DRAFTING | READY | SCHEDULED | COMPLETED | CANCELLED
```

### 19.2 Required Prisma models (field-level contract)

The implementation may format relations differently, but it must create every field/constraint below. Add `@map` only if repository naming conventions require it.

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
  brands    Brand[]  @relation("BrandOwner")
  memberships BrandMember[]
}

model Brand {
  id               String            @id @default(uuid()) @db.Uuid
  ownerUserId      String            @db.Uuid
  name             String
  onboardingStatus OnboardingStatus  @default(NOT_STARTED)
  positioning      String?
  targetAudience   String?
  primaryGoal      String?
  contentStyle     String?
  createdAt        DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime          @updatedAt @db.Timestamptz(6)
  owner            User              @relation("BrandOwner", fields: [ownerUserId], references: [id], onDelete: Restrict)
  members          BrandMember[]
  socialAccounts   SocialAccount[]
  contents         Content[]
  patterns         Pattern[]
  memoryEntries    BrandMemoryEntry[]
  strategies       Strategy[]
  jobs             Job[]
  @@index([ownerUserId])
}

model BrandMember {
  brandId String @db.Uuid
  userId  String @db.Uuid
  role    BrandRole @default(OWNER)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  brand Brand @relation(fields: [brandId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([brandId, userId])
  @@index([userId])
}

model SocialAccount {
  id                 String @id @default(uuid()) @db.Uuid
  brandId            String @db.Uuid
  platform           Platform
  externalAccountId  String
  username           String
  accountType        String?
  profilePictureUrl  String?
  tokenCiphertext    String
  tokenExpiresAt     DateTime? @db.Timestamptz(6)
  connectionStatus   ConnectionStatus @default(CONNECTED)
  lastSyncedAt       DateTime? @db.Timestamptz(6)
  createdAt          DateTime @default(now()) @db.Timestamptz(6)
  updatedAt          DateTime @updatedAt @db.Timestamptz(6)
  brand              Brand @relation(fields: [brandId], references: [id], onDelete: Cascade)
  contents           Content[]
  @@unique([platform, externalAccountId])
  @@index([brandId, connectionStatus])
}

model Content {
  id                  String @id @default(uuid()) @db.Uuid
  brandId             String @db.Uuid
  socialAccountId     String @db.Uuid
  externalContentId   String
  type                ContentType
  caption             String?
  transcript          String?
  permalink           String?
  publishedAt         DateTime? @db.Timestamptz(6)
  rawPayload          Json?
  analysisStatus      AnalysisStatus @default(NOT_STARTED)
  createdAt           DateTime @default(now()) @db.Timestamptz(6)
  updatedAt           DateTime @updatedAt @db.Timestamptz(6)
  brand               Brand @relation(fields: [brandId], references: [id], onDelete: Cascade)
  socialAccount       SocialAccount @relation(fields: [socialAccountId], references: [id], onDelete: Cascade)
  media               ContentMedia[]
  metricSnapshots     ContentMetricSnapshot[]
  derivedMetrics      ContentDerivedMetric[]
  analyses            ContentAnalysis[]
  @@unique([socialAccountId, externalContentId])
  @@index([brandId, publishedAt])
  @@index([brandId, analysisStatus])
}

model ContentMedia {
  id String @id @default(uuid()) @db.Uuid
  contentId String @db.Uuid
  mediaType String
  objectKey String?
  sourceUrl String?
  sha256 String?
  width Int?
  height Int?
  durationSeconds Int?
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  @@index([contentId])
  @@index([sha256])
}

model ContentMetricSnapshot {
  id String @id @default(uuid()) @db.Uuid
  contentId String @db.Uuid
  observedAt DateTime @db.Timestamptz(6)
  reach Int?
  impressions Int?
  plays Int?
  likes Int?
  comments Int?
  saves Int?
  shares Int?
  rawPayload Json?
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  @@unique([contentId, observedAt])
  @@index([contentId, observedAt])
}

model ContentDerivedMetric {
  id String @id @default(uuid()) @db.Uuid
  contentId String @db.Uuid
  calculationVersion Int
  calculatedAt DateTime @default(now()) @db.Timestamptz(6)
  engagementRate Decimal? @db.Decimal(10, 6)
  shareRate Decimal? @db.Decimal(10, 6)
  saveRate Decimal? @db.Decimal(10, 6)
  performancePercentile Decimal? @db.Decimal(5, 2)
  values Json
  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  @@unique([contentId, calculationVersion, calculatedAt])
  @@index([contentId, calculatedAt])
}

model ContentAnalysis {
  id String @id @default(uuid()) @db.Uuid
  contentId String @db.Uuid
  analysisVersion Int
  status AnalysisStatus
  visual Json?
  contentAnalysis Json?
  performance Json?
  intelligence Json?
  confidence Decimal? @db.Decimal(5, 2)
  provider String?
  model String?
  promptVersion String
  evidence Json?
  completedAt DateTime? @db.Timestamptz(6)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  @@unique([contentId, analysisVersion])
  @@index([contentId, status])
}
```

The remaining models must follow this exact minimal contract:

```text
Pattern: id, brandId, category, title, claim, confidence decimal(5,2), impact jsonb,
  status, analysisVersion, recommendedAction, createdAt, supersededAt; index brandId/status.
PatternEvidence: id, patternId, contentId nullable, metricSnapshotId nullable, contribution,
  summary, createdAt; at least one row required before Pattern becomes ACTIVE.
BrandMemoryEntry: id, brandId, domain, statement, confidence decimal(5,2), status,
  provenance jsonb, evidence jsonb, sourceVersion, validFrom, validTo, createdAt; index brandId/domain/status.
Strategy: id, brandId, status, version, objective, targetAudience, positioning, pillars jsonb,
  recommendedFormats jsonb, doList jsonb, stopList jsonb, experiments jsonb, successMetrics jsonb,
  sourceSnapshot jsonb, generatedAt, createdAt; unique brandId/version.
ContentIdea: id, brandId, strategyId, title, hook, pillar, format, rationale, sourceRefs jsonb,
  status, createdAt, updatedAt; index brandId/status.
Script: id, contentIdeaId, version, hook, opening, body, transitions jsonb, cta, visualDirection,
  estimatedDurationSeconds, voiceCheck jsonb, createdAt, updatedAt; unique contentIdeaId/version.
ContentPlan: id, brandId, strategyId nullable, periodStart date, periodEnd date, status, createdAt, updatedAt.
ContentPlanItem: id, contentPlanId, contentIdeaId nullable, scriptId nullable, scheduledFor timestamptz,
  objective, format, status, createdAt, updatedAt; index contentPlanId/scheduledFor.
Job: id, brandId, parentJobId nullable, type, state, priority, idempotencyKey, progressPercent,
  processedCount, totalCount nullable, currentStep, input jsonb, result jsonb, errorCode, errorMessage,
  attempts, maxAttempts, queuedAt, startedAt, completedAt, createdAt, updatedAt; unique brandId/idempotencyKey;
  indexes state/priority/createdAt and parentJobId.
JobLog: id, jobId, occurredAt, level, event, context jsonb; index jobId/occurredAt.
AiUsageEvent: id, brandId, jobId nullable, contentId nullable, provider, model, inputUnits, outputUnits,
  estimatedCost numeric(12,6), latencyMs, outcome, createdAt; indexes brandId/createdAt and jobId.
AuditEvent: id, actorUserId nullable, brandId nullable, action, entityType, entityId, context jsonb, createdAt.
```

### 19.3 Migration order and data safety

1. Add Prisma, database client, base `User`, `Brand`, and `BrandMember` migrations.
2. Add auth subject mapping and create a V1-safe bootstrap path; do not require a user for legacy analyser traffic.
3. Add social accounts and job tables; deploy queue/worker before accepting connection requests.
4. Add content/media/metric tables, then import/sync services.
5. Add analysis, patterns, memory, strategy, ideas/scripts/plans in that dependency order.
6. Seed test fixtures only in development/test. Production migration never inserts simulated social data.

For every migration: generate it, inspect its SQL, run it against a clean database and a populated staging copy, run `prisma migrate status`, then use `prisma migrate deploy` in staging/production. Never edit a migration that has been applied outside local development. [Prisma migration commands](https://docs.prisma.io/docs/cli/migrate)

---

## 20. API Execution Contract

### 20.1 Universal shapes

```ts
type ApiSuccess<T> = { data: T; meta?: { requestId: string; nextCursor?: string } };
type ApiError = {
  error: {
    code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' |
          'CONFLICT' | 'RATE_LIMITED' | 'PROVIDER_UNAVAILABLE' | 'INTERNAL_ERROR';
    message: string;
    details?: Array<{ path: string; message: string }>;
    requestId: string;
  };
};
type JobDto = {
  id: string; type: JobType; state: JobState;
  progress: { percent: number; processed: number; total: number | null; currentStep: string };
  createdAt: string; startedAt: string | null; completedAt: string | null;
  error: { code: string; message: string } | null;
};
```

All endpoint examples below return `ApiSuccess<T>` or `ApiError`. List endpoints are cursor-paginated with `limit` (default 20, maximum 100) and opaque `cursor`. Timestamps are ISO-8601 UTC strings. IDs are opaque UUID strings.

### 20.2 Exact endpoints

| Method and path | Request schema | Success response / rules |
|---|---|---|
| `GET /api/v2/session` | none | `{ user: { id, email }, activeBrandId: string \| null }`. `401` if no session. |
| `GET /api/v2/brands` | `limit`, `cursor` | `{ items: BrandSummary[] }`; only memberships. |
| `POST /api/v2/brands` | `{ name: string(1..120) }` | `201 { brand }`; creator receives owner membership. |
| `GET /api/v2/brands/:brandId` | path UUID | `{ brand }`; membership required. |
| `PATCH /api/v2/brands/:brandId` | `{ name?, positioning?, targetAudience?, primaryGoal?, contentStyle? }`, bounded strings | `{ brand }`; owner only in V2. |
| `POST /api/v2/brands/:brandId/onboarding` | `{ positioning, targetAudience, primaryGoal, contentStyle? }` | `{ brand }`; updates only user-supplied profile fields. |
| `POST /api/v2/brands/:brandId/social-accounts/instagram/connect` | `{ returnTo?: safeInternalPath }` | `{ authorizationUrl }`; state is server-created/signed; no access token returned. |
| `GET /api/v2/integrations/instagram/callback` | Meta query parameters | validates state/code, creates/updates account, redirects to safe V2 route; errors show safe UI. |
| `GET /api/v2/brands/:brandId/social-accounts` | none | `{ items: SocialAccountDto[] }`; excludes token data. |
| `DELETE /api/v2/brands/:brandId/social-accounts/:accountId` | none | `204`; revokes/disconnects and queues bounded deletion/reconciliation if product policy requires it. |
| `POST /api/v2/brands/:brandId/sync` | `{ accountId: UUID, mode: 'INITIAL' \| 'INCREMENTAL' }`, `Idempotency-Key` header | `202 { job }`; an existing matching live idempotent job is returned rather than duplicated. |
| `GET /api/v2/brands/:brandId/jobs/:jobId` | path UUIDs | `{ job: JobDto, children?: JobDto[] }`; membership and job brand match required. |
| `POST /api/v2/brands/:brandId/jobs/:jobId/cancel` | none | `{ job }`; only queued, safe cancellation; return `409` otherwise. |
| `GET /api/v2/brands/:brandId/content` | `type?`, `status?`, `from?`, `to?`, cursor/limit | `{ items: ContentSummary[] }`; sorting newest published first. |
| `GET /api/v2/content/:contentId` | path UUID | `{ content: ContentDetailDto }`; resolve brand through content, never trust query brand ID. |
| `GET /api/v2/brands/:brandId/analytics/overview` | `from`, `to`, `contentType?` | `{ overview, series, comparisons }`; derived values identify calculation version. |
| `GET /api/v2/brands/:brandId/patterns` | `status?`, `category?`, cursor/limit | `{ items: PatternSummary[] }`; default active patterns only. |
| `GET /api/v2/patterns/:patternId` | path UUID | `{ pattern, evidence: PatternEvidenceDto[] }`; no pattern evidence omitted. |
| `POST /api/v2/brands/:brandId/patterns/discover` | `{ force?: boolean }`, idempotency header | `202 { job }`; reject/educate if minimum qualified catalogue threshold not met. |
| `GET /api/v2/brands/:brandId/memory` | `domain?`, `status?` | `{ items: BrandMemoryEntryDto[] }`; source/provenance included. |
| `GET /api/v2/brands/:brandId/strategy` | `version?` | `{ strategy: StrategyDto \| null }`. |
| `POST /api/v2/brands/:brandId/strategy/generate` | `{ force?: boolean }`, idempotency header | `202 { job }`; immutable new version on success. |
| `GET /api/v2/brands/:brandId/ideas` | `status?`, `strategyId?`, cursor/limit | `{ items: ContentIdeaDto[] }`. |
| `POST /api/v2/brands/:brandId/ideas/generate` | `{ strategyId: UUID, count: integer(1..20), constraints?: string(max 2000) }`, idempotency header | `202 { job }`. |
| `GET /api/v2/ideas/:ideaId` | path UUID | `{ idea, scripts }`; ownership resolved server-side. |
| `POST /api/v2/ideas/:ideaId/scripts/generate` | `{ instruction?: string(max 1000) }`, idempotency header | `202 { job }`; generation creates next script version. |
| `PATCH /api/v2/scripts/:scriptId` | structured partial script fields, each bounded | `{ script }`; user edit creates a new version or explicitly stored edit revision. |
| `GET /api/v2/brands/:brandId/content-plans` | `from?`, `to?` | `{ items: ContentPlanDto[] }`. |
| `POST /api/v2/brands/:brandId/content-plans` | `{ strategyId?, periodStart: date, periodEnd: date }` | `201 { plan }`; max period 31 days in V2. |
| `POST /api/v2/content-plans/:planId/items` | `{ ideaId?, scriptId?, scheduledFor?, objective, format }` | `201 { item }`; references must belong to same brand. |
| `PATCH /api/v2/content-plan-items/:itemId` | allowed schedule/status/reference fields | `{ item }`; no publishing side-effect. |

### 20.3 DTO minimum fields

```text
BrandSummary: id, name, onboardingStatus, createdAt, updatedAt.
SocialAccountDto: id, platform, username, accountType, profilePictureUrl, connectionStatus, tokenExpiresAt, lastSyncedAt.
ContentSummary: id, type, captionExcerpt, primaryMedia, permalink, publishedAt, latestMetrics, analysisStatus.
ContentDetailDto: ContentSummary plus media, metricSnapshots/derived metric summary, latestAnalysis, learning summary.
PatternSummary: id, category, title, claim, confidence, impact, evidenceCount, recommendedAction, createdAt.
PatternEvidenceDto: id, contentId, content summary, contribution, metric comparison/summary.
BrandMemoryEntryDto: id, domain, statement, confidence, provenance, evidence, sourceVersion, validFrom, status.
StrategyDto: id, version, objective, targetAudience, positioning, pillars, recommendedFormats, doList, stopList, experiments, successMetrics, sources, generatedAt.
ContentIdeaDto: id, strategyId, title, hook, pillar, format, rationale, sourceRefs, status, createdAt.
ScriptDto: id, contentIdeaId, version, hook, opening, body, transitions, cta, visualDirection, estimatedDurationSeconds, voiceCheck, updatedAt.
```

### 20.4 Authorisation invariant

Every controller uses a single helper equivalent to `requireBrandAccess(userId, brandId)`. Direct-resource routes first load the resource’s `brandId`, then call the same helper. Tests must prove that changing a URL ID to another user’s brand/content/job/pattern/script/plan yields a safe denial and does not disclose existence or metadata.

---

## 21. Exact Queue, Agent, and V1 Change Map

### 21.1 Queue implementation contract

Use named queues: `klarix-sync`, `klarix-analysis`, and `klarix-generation`. Use job `type` to select processors rather than creating a queue for every agent. Each queued payload contains only `{ jobId }`; the processor reloads authorised, current data from PostgreSQL. Never place access tokens, full media, or unbounded prompts in Redis payloads.

| Job type | Queue | Idempotency key | Processor completion rule |
|---|---|---|---|
| `SYNC_ACCOUNT` | sync | `sync:<accountId>:<mode>:<syncWindow>` | Creates/imports child work; complete only after dependency state is reconciled. |
| `IMPORT_CONTENT` | sync | `import:<accountId>:<externalContentId>` | Upserts one content record and media/initial metrics. |
| `FETCH_METRICS` | sync | `metrics:<contentId>:<observedDate>` | Creates one metric snapshot; does not overwrite history. |
| `ANALYZE_CONTENT` | analysis | `analysis:<contentId>:<analysisVersion>` | All required validated sub-analyses persisted, or job partial/failed with explicit reason. |
| `ANALYZE_BATCH` | analysis | `batch:<brandId>:<catalogueVersion>` | Enqueues/observes content analyses; reports aggregate counts. |
| `DISCOVER_PATTERNS` | analysis | `patterns:<brandId>:<catalogueVersion>` | Only activates patterns with evidence rows and a qualified sample. |
| `UPDATE_MEMORY` | analysis | `memory:<brandId>:<intelligenceVersion>` | Writes versioned/provenanced entries; supersedes safely. |
| `GENERATE_STRATEGY` | generation | `strategy:<brandId>:<intelligenceVersion>` | Persists a new structured strategy version, never overwrites the old version. |
| `GENERATE_CONTENT_IDEAS` | generation | `ideas:<strategyId>:<constraintHash>` | Persists validated, source-linked ideas. |
| `GENERATE_SCRIPT` | generation | `script:<ideaId>:<instructionHash>` | Persists next structured script version. |

Default retry policy: at most three attempts for network timeout, temporary provider 5xx, and rate limit; exponential backoff with jitter. Do not retry authentication/permission errors, Zod validation errors, malformed provider output after a fallback attempt, or schema/ownership errors. Record the root classification in `Job.errorCode`.

### 21.2 Agent schemas and gates

Each V2 agent must have a Zod schema with these common fields:

```ts
const agentEnvelope = z.object({
  schemaVersion: z.string(),
  confidence: z.number().min(0).max(100),
  observations: z.array(z.object({
    claim: z.string().min(1).max(1000),
    evidenceContentIds: z.array(z.string().uuid()).max(50),
    evidenceSummary: z.string().min(1).max(1500)
  })).max(50),
  limitations: z.array(z.string().max(500)).max(20)
});
```

Additional gates:

- Visual/Content/Performance Analyst receives one content record only and cannot assert cross-catalogue patterns.
- Pattern Engine receives a bounded catalogue summary and must return `sampleSize`, `comparisonDefinition`, at least two evidence IDs, a confidence value, and limitations. If qualified sample size is below 10, it returns `INSUFFICIENT_DATA`, not a pattern.
- Memory Engine may use only user-provided profile fields and ACTIVE patterns/approved strategy. It must include provenance (`USER_INPUT`, `PATTERN`, `STRATEGY`) on each entry.
- Strategy Engine must cite source pattern/memory IDs in `sources`. Missing source references fail validation.
- Idea Generator must cite strategy and at least one source reference. Generic “because it may perform well” is invalid.
- Scriptwriter may make creative suggestions but cannot invent claimed performance evidence.

### 21.3 Explicit V1 → V2 file map

This is a controlled extension plan based on the V1 audit. The agent must verify actual filenames/content before modifying them; if a path differs, it must map the role rather than delete/recreate blindly.

| Current V1 area | V2 action | Guardrail |
|---|---|---|
| `backend/server.js` | Keep as API entry point; extract route registration/config/error middleware incrementally. | Preserve `/api/health` and existing V1 routes. |
| `backend/services/runAnalysis.js` | Retain as V1 pipeline adapter; introduce V2 content-analysis orchestrator alongside it. | Do not break `POST /api/analyse` response shape. |
| `backend/services/agentVisualAnalyst.js` | Refactor only to expose validated V2 structured output through adapter. | Preserve V1 prompt/result compatibility until a dedicated V1 regression suite passes. |
| `backend/services/agentStrategist.js` | Keep for V1 single-post strategy; add catalogue `StrategyEngine` separately. | V2 strategy cannot be a loop over one-post strategist calls. |
| `backend/services/agentScriptwriter.js` | Reuse/adapt behind structured script contract. | Retain V1 script output mapping where consumed. |
| `backend/services/openRouterClient.js` | Move or wrap as Gemini provider adapter; add a deprecation-compatible export if imports still depend on the name. | Do not replace model provider in the same phase as persistence. |
| `backend/services/instagramScraper.js` | Stop using it for V2 account sync; isolate it to V1 legacy URL-demo flow if that route remains. | No simulated fallback data enters V2 tables/UI. |
| V1 in-memory `backgroundJobs` | Replace only V2 job operations with PostgreSQL + BullMQ. | Keep legacy demo behaviour until a planned compatibility migration; no mixed state for same V2 job. |
| `frontend/src/router.js` | Add auth/onboarding/app-shell routes after legacy routes, preferably lazy-loaded. | Do not rename/remove V1 route paths. |
| `frontend/src/views/Analyse.vue` | Leave behaviour intact; extract composables/components only when regression tests cover it. | No large rewrite as a prerequisite to V2. |
| `frontend/src/style.css` and assets | Reuse as the V2 visual baseline; add tokens/components compatibly. | No generic dashboard theme swap. |
| `frontend/src/services/` | Add authenticated V2 client and feature API modules. | V1 analyser client retains current endpoint/shape. |

### 21.4 Required phase-0 repository audit output

Before Phase 1 code, the coding agent must write `docs/v2/phase-0-baseline.md` in the repository containing:

1. Current Node/npm and package versions from both package manifests.
2. Exact current frontend/backend tree (excluding generated assets/dependencies).
3. Existing V1 routes and API endpoint request/response samples.
4. Exact imports/callers of each V1 agent and Gemini client.
5. Existing `.agents`, `.gemini`, environment examples, CI/deployment scripts, and their effect on changes.
6. A file-by-file “preserve / extend / create / do not touch in this phase” map.
7. The concrete Auth provider decision (existing provider if any; otherwise the approved choice) and current official Meta permission/endpoints checked at that date.

No Phase 1 implementation can begin until this audit is complete and V1 baseline tests/browser evidence are recorded.
