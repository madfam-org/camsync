# Product

> Last Updated: 2026-11-24
>
> Known facts and owner rulings only. This is the input to the impeccable design process, not its
> output: nothing about the landing's look, voice or structure is decided here, and there is no
> `DESIGN.md` until that process writes one. See [Open, for the owner](#open-for-the-owner).

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The studio: plain HTML pages and one Node server with no dependency, run on a Mac on a local network.
The landing: a dependency-free Node service serving one page in two languages, built like MADFAM's
other stateless landings (mirrored from an existing one on 2026-11-24, not separately ruled).

## Users

MADFAM's own production work first (owner ruling, 2026-11-24): the people making MADFAM's own vertical
video with an iPhone and a Mac. camsync is a tool, not a product (owner ruling, 2026-11-24).

## Product Purpose

Record vertical video on an iPhone at full quality while controlling the take from a Mac, and land the
master on the Mac without moving files by hand.

## Operating Context

An iPhone (Safari) and a Mac on the same local network. The Mac runs `node studio/server.mjs`, which
serves a control panel to the Mac only and the camera page to the phone over TLS with a self-signed
certificate and a short key in the address. Phone and Mac exchange the live view directly (WebRTC on
the local network); the master is uploaded to the Mac in one-second chunks. The studio is not served
from the internet (owner ruling, 2026-11-24).

## Capabilities and Constraints

Exists today (working prototype):

- Live view of the phone in the Mac's control panel.
- Full-quality master recorded on the phone, uploaded to the Mac in one-second chunks.
- From the Mac: start, stop, resolution, shape (16:9 or 4:3), lens, zoom.

Measured on 2026-11-24 with one iPhone 15:

- Vertical masters 2160x3840 at 30 fps, H.264 + AAC MP4.
- 4:3 full-sensor masters 2160x2880 at 29.9 fps.
- Live view at 30 fps (its resolution was not recorded).
- Remote start and stop working.

Not built: titles and overlays, an event log, multi-camera, rendering through the CEQ platform, a
native app. The landing must say each of those limits and must not imply anything beyond the list
above.

Constraints: no prices, no client names, no people's names, no invented metrics, no recordings of real
people or private spaces in the repository or on the page.

## Brand Commitments

Name: **camsync, a codename** (owner direction, 2026-11-25), used until a public brand is chosen; the
research and the names already set aside are in [`docs/NAMING.md`](./docs/NAMING.md). Host:
`camsync.madfam.io` (owner direction, 2026-11-25; it replaces `obs.madfam.io`, which was never
created). Positioning: [`docs/POSITIONING.md`](./docs/POSITIONING.md). No third-party product is named in the landing's copy. Licence AGPL-3.0-only, holder
Innovaciones MADFAM S.A.S. de C.V.; repository public (owner rulings, 2026-11-24). Spanish is served at
`/` and English at `/en`; the page is not indexed until the owner says. No visual identity exists.

## Evidence on Hand

- The measurements above, from one session with one iPhone 15.
- The working studio in `studio/`.
- Absent, never to be fabricated: testimonials, logos, usage numbers, measurements on other phones,
  stills or footage (none is cleared for the page).

## Product Principles

1. Say what exists; label what is not built.
2. The master is the point: full quality, on the Mac, without moving files by hand.
3. Local first: the video stays on the local network.

## Accessibility & Inclusion

WCAG 2.2 AA for the landing. The page reads the same with scripts off (today it ships none).

## Open, for the owner

1. *(Settled 2026-11-25: the page passed the impeccable process and is live, unindexed.)*
2. When, if ever, the page may be indexed (`INDEXABLE` stays `false` until then).
3. *(Settled 2026-11-25: the landing links to the public repository, its one outbound link.)*
4. Whether the landing may name CEQ among the things not built, or should describe it without the name.
5. Whether any still or footage may appear on the page, and from which take (none is cleared; any
   would need to show no real person and no private space).
6. Creating the GitHub repository `madfam-org/camsync`, the Enclii project `camsync` and the host
   `camsync.madfam.io`: each needs the owner's specific word (docs/DEPLOYMENT.md).
7. Renaming the studio's prototype-era environment variables and page titles to camsync (a behaviour
   change, left out of the move on purpose).
