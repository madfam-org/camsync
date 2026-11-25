# camsync Agent Operating Guide

> Last Updated: 2026-11-24

<!-- MADFAM-AGENTS-CANONICAL v1 -->

This is the canonical instruction file for Claude, Codex, and any other LLM
agent working in this repository. `CLAUDE.md` is kept only as a compatibility
redirect and should not become the source of truth again.

## Required operating doctrine

- Read this file before making repo changes.
- Prefer existing repo conventions, scripts, and docs over introducing new
  patterns.
- Preserve user work and never revert unrelated changes.
- Treat production operations as Enclii-first: use Enclii web, API, or CLI for
  provisioning, deployment, observability, domains, secrets, provider
  operations, scaling, rollback, and remediation.
- Use direct `kubectl`, `helm`, SSH, provider CLIs/APIs, `docker exec`, or
  direct container access only for platform bootstrap or documented break-glass
  emergencies when Enclii is unavailable or lacks an implemented adapter.
- Record any missing Enclii adapter gap instead of normalizing raw production
  access in docs or runbooks.

## What this repository is

camsync is a browser-based vertical-video capture and production studio, and a tool (not a
product): an iPhone opens a web page that captures its camera, sends a live view to a control panel on
a Mac over the local network, and records the full-quality master, which it uploads to the Mac in
one-second chunks. Start, stop, resolution, shape (16:9 or 4:3), lens and zoom are controlled from the
Mac. It is for MADFAM's own production work first.

Two parts:

- `studio/` — the working studio. It runs on a Mac on a local network and is **never deployed**; it is
  not served from the internet for now (owner ruling, 2026-11-24). See [`studio/README.md`](./studio/README.md).
- `site/` — the landing for `camsync.madfam.io` (see [The landing](#the-landing)). The only thing that
  could be deployed from this repository, and not yet.

Measured on 2026-11-24 with one iPhone 15: vertical 2160x3840 masters at 30 fps (H.264 + AAC MP4),
4:3 full-sensor 2160x2880 at 29.9 fps, live view at 30 fps, remote start and stop working. Nothing else
is claimed. Not built: titles and overlays, an event log, several cameras, rendering through CEQ, a
native app.

## Boundary

This repository is **public** (owner ruling, 2026-11-24). Read
[`docs/REPO_BOUNDARY.md`](./docs/REPO_BOUNDARY.md) before adding a file. The short form: no secrets, no
infrastructure identity, no recordings, nothing that shows a real person or a private space. `certs/`
(the studio's TLS key and the phone key) and recordings are git-ignored and never committed. The
canonical policy is the MADFAM repo-boundary contract, kept in MADFAM's private ops repository.
Licensing, visibility, naming and publishing rulings belong to the owner: prepare them, never take them.

## Naming

**camsync is a codename** (owner direction, 2026-11-25): it names the tool, the repository, the
services and the host `camsync.madfam.io` until a public brand is chosen. Call it camsync in every text,
page and log, and do not present it as a final brand (no logo, no tagline built on the word). The brand
research so far is in [`docs/NAMING.md`](./docs/NAMING.md). Do not name third-party products in the
landing's copy.

## The landing

`site/` is the landing for `https://camsync.madfam.io` (owner direction, 2026-11-25): a dependency-free
Node server (`site/server/`) and one page in Spanish and English (`site/web/`). It is deployed through
Enclii, dispatch-only; [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) is the contract.

- **Designed and live.** The page passed the impeccable design process (2026-11-25) and is served at
  `camsync.madfam.io`, unindexed. Any change to it goes through that process again, and
  [`DESIGN.md`](./DESIGN.md) (written by the process from the build) is its system; do not edit it
  by hand. [`PRODUCT.md`](./PRODUCT.md) holds the
  known facts and the questions still open for the owner.
- Host names sit one level under `madfam.io` and are never nested. The platform's further surfaces
  take a hyphenated name: `camsync-app.madfam.io` (the studio, if it is ever served from the internet),
  `camsync-api.madfam.io`, `camsync-ws.madfam.io` (live signalling, if it needs its own host),
  `camsync-admin.madfam.io`. None is declared; a host is declared only when a runtime exists for it, and
  each needs the owner's word.
- The page is unindexed until the owner says otherwise (`INDEXABLE` in `site/server/config.mjs`).
- The page states only what the tool does today and its measured limits. Work not built is labelled
  as such, never shown as shipped. No invented metric, no price, no client name, no person's name.
- Checks: `node --test site/server/test/*.test.mjs` (CI runs it). Preview: `node site/server/dev.mjs`.
- `site/Dockerfile` is the landing's image. The studio is never in it (a test holds this).

## Licence

AGPL-3.0-only (owner ruling 2026-11-24), holder Innovaciones MADFAM S.A.S. de C.V. See `LICENSE` and
`NOTICE`. Do not add a dependency whose licence is incompatible with AGPL-3.0-only. Today there are
no dependencies at all; keep it that way unless a change needs one and says why.

## Checks

| Check                                  | Runs in CI    | Command                                         |
| -------------------------------------- | ------------- | ----------------------------------------------- |
| Landing server and deploy contract     | yes           | `node --test site/server/test/*.test.mjs`       |
| Syntax of the studio and the server    | yes           | `npm run check` (`node --check` on each module) |
| Agent docs, licence, no tracked keys   | yes           | see `.github/workflows/ci.yml`                  |
| A real take on a phone                 | **no, local** | `node studio/server.mjs` and an iPhone          |

The runners carry no phone and no camera. When a change touches the studio, make a real take on a
phone and write in the pull request what was measured (resolution, frames per second, whether start
and stop worked). A skipped check is not a pass, and a pending CI run is not green.

## Repo entrypoints

- `README.md`
- `studio/` and `studio/README.md`
- `site/`, `docs/` ([`REPO_BOUNDARY.md`](./docs/REPO_BOUNDARY.md), [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md))
- `.github/workflows/`

## LLM context files

- `llms.txt` is the compact context index.
- `AGENTS.md` is canonical for agent instructions.
- `CLAUDE.md` redirects here for Claude compatibility.

## Maintenance

Regenerate or repair these files with
`internal-devops/scripts/sync-agent-docs.py` from the labspace ecosystem.
