# Deployment contract: the landing

> Last Updated: 2026-11-25
>
> Boundary: Enclii-first. This file names the service, its ports, its host and the absence of secrets.
> Operator gates and adapter-gap records live in MADFAM's private ops repository; this file keeps the
> public-safe command sequence only.

**State: live since 2026-11-25, unindexed.** The page passed the impeccable design process (shape,
build, critique, polish) and the owner gave his word to create the host («Yes, create it»). The
[onboarding sequence](#onboarding-sequence) below was run that day; each step says what it returned.

Only the landing could be deployed from this repository. The studio (`studio/`) runs on a Mac on a
local network; it is never built into an image and is not served from the internet (owner ruling,
2026-11-24).

The Landing workflow is **dispatch-only**; a merge never builds or deploys by itself
(`autoDeploy: false` in [`../enclii.yaml`](../enclii.yaml)), and promotion is manual.

## Host names

| Host            | Surface                                                     | Declared |
| --------------- | ----------------------------------------------------------- | -------- |
| `camsync.madfam.io` | The platform's landing (owner direction, 2026-11-25)         | yes      |

The convention for the platform's other services (owner, 2026-11-24): one level under `madfam.io`,
never nested (MADFAM's wildcard certificate covers one level), the short label, a hyphen and the
surface:

| Host                  | Surface                                              | Declared |
| --------------------- | ---------------------------------------------------- | -------- |
| `camsync-app.madfam.io`   | the studio, if it is ever served from the internet   | no       |
| `camsync-api.madfam.io`   | an interface                                         | no       |
| `camsync-ws.madfam.io`    | live signalling, if it needs its own host            | no       |
| `camsync-admin.madfam.io` | an operator view                                     | no       |

None of those exists. A host is declared in `enclii.yaml` only when a runtime exists for it, and each
one needs the owner's word. camsync is a codename (docs/NAMING.md): if a brand replaces it, the hosts
follow the brand by the same convention.

## What is served

| Path  | Surface                                      | Indexing                                                                                  |
| ----- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/`   | The landing in Spanish (the source language) | `X-Robots-Tag: noindex, nofollow`, `<meta name="robots">` and a disallow-all `robots.txt` |
| `/en` | The same landing in English                  | the same                                                                                  |

The page stays out of search until the owner says to index it; `INDEXABLE` in
[`../site/server/config.mjs`](../site/server/config.mjs) is the one switch, and a test holds it off.
The zone's edge places its own managed block ahead of any `robots.txt`, so the header and the meta tag
carry the rule, never `robots.txt` alone.

The host answers `/health` (liveness, with the revision) and `/ready` (the site was built: both
languages, the strings, the assets, and the revision). `/metrics` listens only on the internal port
9090 (Service `camsync-landing-metrics`), never routed; on 8000 it is 404. In production any other host
gets 421, and every response carries HSTS. http→https is the edge's redirect, not this server's.
Stateless: **no database, no bucket, no Janua client, no secret, no cookie, no analytics, no script,
no outbound call**. The content security policy names no other origin. The page has one outbound link,
to this public repository.

## Runtime

One image ([`../site/Dockerfile`](../site/Dockerfile), `node:22-slim` pinned by digest, nothing
installed) behind one Service `camsync-landing` (Service port 80 → container 8000). uid 1001, read-only
root (only `/tmp` writable), drop ALL capabilities, seccomp RuntimeDefault, no service links, no
service-account token. Two replicas, surge rollout, preferred anti-affinity across nodes,
PodDisruptionBudget, liveness and readiness probes ([`../infra/k8s/production/`](../infra/k8s/production/)).
Network: default deny; ingress 8000 from the tunnel namespace only, 9090 from the monitoring namespace
only; egress DNS only.

The image holds the server and the web files. The studio is not in it.

| Variable               | Value           | Meaning                                   |
| ---------------------- | --------------- | ----------------------------------------- |
| `CAMSYNC_ENV`          | `production`    | turns on the host check, HSTS and caching |
| `CAMSYNC_PUBLIC_HOSTS` | `camsync.madfam.io` | the only host that gets the page          |
| `CAMSYNC_PORT`         | `8000`          | the port the page is served on            |
| `CAMSYNC_METRICS_PORT` | `9090`          | the internal port `/metrics` answers on   |
| `CAMSYNC_REVISION`     | set at build    | the commit `/health` and `/ready` report  |

The kustomization carries an all-zero digest: a placeholder the first Landing build overwrites. It
never resolves, so nothing can run an unpinned image before then.

## Guards

CI and the Landing workflow's preflight run `node --test site/server/test/*.test.mjs`: host and 421,
security headers, unindexed, both languages with the same structure, no third-party request, no
script, no cookie, no price in the copy and the measured facts present, and the deployment files
agreeing with each other (host, port 80, manual promotion, status entry off, replicas, surge,
anti-affinity, read-only root, no secret, digest pin, dispatch-only, the Dockerfile copying only the
landing and the workflow watching what it copies).

Local preview without a container:

```bash
node site/server/dev.mjs
```

Local check of the image:

```bash
docker build -f site/Dockerfile --build-arg CAMSYNC_REVISION=local -t camsync-landing:local .
```

```bash
docker run --rm --read-only --tmpfs /tmp --user 1001:1001 --cap-drop ALL -p 127.0.0.1:18780:8000 camsync-landing:local
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: camsync.madfam.io' http://127.0.0.1:18780/
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: other.example' http://127.0.0.1:18780/
```

Expect 200 and 421. (Not run locally: the first image was built by the Landing workflow.)

## Onboarding sequence

**Run on 2026-11-25.** Kept as the sequence for a rebuild or a second environment. Preconditions, in order:

1. The page has passed the impeccable design process.
2. The owner has given his specific word to create the GitHub repository `madfam-org/camsync`, the
   Enclii project `camsync`, and the host `camsync.madfam.io` (DNS, route and certificate). Creating a host
   is never done on a general instruction.

Run from a machine with an Enclii login (`enclii login`) and the GitHub CLI. Each apply follows its own
dry run. Nothing here takes a secret value, and nothing here creates a Janua client: the landing has no
sign-in.

1. **Merge** the landing pull request into `main` (CI green). Done: #3.
2. **Build** (replaces the all-zero placeholder digest with the signed image digest, committed to
   `main`). Done: the first pin was committed by the workflow:

   ```bash
   gh workflow run landing.yml -R madfam-org/camsync --ref main
   ```

3. **Onboard** (project, service, namespace `camsync`, GitOps application; no database, bucket or
   secret). A first run can report `PARTIAL` until pods serve; `onboard ensure` then registers the
   domain. Done. `enclii onboard` exited 1 and printed its usage although it had onboarded; read the
   top of its output, then run `onboard ensure`:

   ```bash
   enclii onboard --repo madfam-org/camsync --project camsync --manifest-path infra/k8s/production --skip-postgres --skip-r2 --skip-secrets --dry-run
   ```

   ```bash
   enclii onboard ensure --repo madfam-org/camsync --project camsync --manifest-path infra/k8s/production --namespace camsync
   ```

4. **Domain** (proxied DNS and TLS for the one host declared in `enclii.yaml`; needs the owner's
   specific word). Run the dry run, then `--apply`, until `stillMissing` is empty; a pass can end
   `partial` more than once, so wait and re-run before planning the tunnel. Done. On 2026-11-25 every
   pass said `created=1` yet `stillMissing=[camsync.madfam.io]` until the service row was given its
   namespace with `enclii projects reconcile-services camsync` (it reported `updated_namespace`); the
   next pass registered the host:

   ```bash
   enclii ops domains reconcile camsync-landing
   ```

5. **Tunnel route** (to the Service `camsync-landing`, port 80). The plan is empty until the domain
   reconcile returns `stillMissing=[]`. Done: dry run first, then `--apply --expect-plan <plan id>`
   with a reason:

   ```bash
   enclii providers cloudflare tunnels-apply --project camsync
   ```

6. **Probe** from outside. Done: `/health` reports `"status":"ok"` and the revision; `/` and `/en`
   200 with the content security policy, HSTS and `x-robots-tag: noindex, nofollow`; `/metrics` 404:

   ```bash
   curl -s https://camsync.madfam.io/health
   ```

   ```bash
   curl -sI https://camsync.madfam.io/ | grep -i -E '^(HTTP|x-robots-tag|content-security-policy)'
   ```

The zone's edge adds an analytics script tag to HTML it serves to browsers. The page's content
security policy (no script source at all) refuses it, so nothing is measured; do not loosen that
policy. Turning the tag off is a zone setting and the owner's call.

The status-page entry in `enclii.yaml` is written out but off (`status.enabled: false`): a status entry
is a public mention of the host. Turning it on is the owner's word.
