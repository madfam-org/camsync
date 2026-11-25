# Repository boundary

> Last Updated: 2026-11-24

camsync is a **public** repository in the `madfam-org` organisation (owner ruling, 2026-11-24). It
owns the camsync studio (the phone, viewer and control pages and the local relay that serves them) and
the landing for `camsync.madfam.io`.

Keep here: reusable code, synthetic test fixtures, product documentation, deployment manifests with
secret **names** only, and measurements stated as numbers (resolution, frames per second).

Never put here:

- secret values, tokens, keys or credentials of any kind, including the studio's phone key and its
  TLS key and certificate (`certs/` and `studio/certs/` are git-ignored; they are generated on the Mac
  at run time);
- node hostnames, IP addresses (including a Mac's local-network address: the studio discovers it at
  run time), hardware, cluster names or tunnel ids;
- secret-store paths or break-glass procedures (production operations are Enclii-first);
- raw links into MADFAM's private ops repository (name a document, never link it);
- raw footage, masters, recordings, live-view captures or event logs (`*.mp4`, `*.webm`, `*.mov`,
  `recordings/`, `exports/` and the like are git-ignored; the studio writes masters outside the
  repository by default);
- anything that shows a real person or a private space: no still, frame, screenshot or test clip of a
  person, a home or a workplace, even as a fixture;
- MADFAM prices, costs, margins or quotes typed by hand (pricing is ruled through Tulana and Dhanam);
- client hosts, workspaces or names; supplier, client or staff identities, or people's names beyond
  the public maintainer handles.

The landing ships no footage. Adding any still or clip to it needs the owner's word, a record of its
source, and a take that shows no real person and no private space.

Enclii owns routine deployment, observability and secret intake. Record missing platform capabilities
privately; do not add a raw production-access fallback. Licensing, governance, naming, visibility and
access rulings remain with the owner. A test skip or an unavailable dependency is not verification, and
a pending CI run is not green.

Canonical policy: the MADFAM repository boundary contract, kept in MADFAM's private ops repository. The
[public ecosystem contract hub](https://github.com/madfam-org/solarpunk-foundry) owns shared public
ecosystem guidance.
