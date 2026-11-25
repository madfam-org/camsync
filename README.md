# camsync

> Last Updated: 2026-11-24

A browser-based vertical-video capture and production studio. An iPhone opens a web page that
captures its camera, sends a live view to a control panel on a Mac over the local network, and records
the full-quality master, which is uploaded to the Mac in one-second chunks. Start, stop, resolution,
shape (16:9 or 4:3), lens and zoom are controlled from the Mac.

## Status

- **A working prototype**, moved into `studio/` unchanged. Measured on 2026-11-24 with one iPhone 15:
  vertical masters 2160x3840 at 30 fps (H.264 + AAC MP4), 4:3 full-sensor masters 2160x2880 at
  29.9 fps, live view at 30 fps, remote start and stop working. Not measured on any other phone.
- **Not built:** titles and overlays, an event log, several cameras, rendering through CEQ, a native
  app.
- **Licence:** AGPL-3.0-only, ruled 2026-11-24.
- **Repository:** public (ruled 2026-11-24), [`madfam-org/camsync`](https://github.com/madfam-org/camsync), created 2026-11-25.
- **Landing:** `camsync.madfam.io`, in Spanish (`/`) and English (`/en`), not indexed. **The page has not
  passed the impeccable design process and must not be deployed until it has.** Nothing is deployed.
- **The studio** runs on a Mac on a local network. It is not served from the internet.

## Studio

```bash
node studio/server.mjs
```

Then open `http://127.0.0.1:8791/control` on the Mac and the phone address it shows in Safari on the
iPhone. Details, settings and what it writes: [`studio/README.md`](./studio/README.md).

## Landing

`site/` is the landing for `camsync.madfam.io`: a dependency-free Node server and one page in two
languages. Preview it locally with `node site/server/dev.mjs` (port 18770). Deployment contract:
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Development

No dependencies, nothing to install. Node 22 (`.nvmrc`).

| Command             | What                                                        |
| ------------------- | ----------------------------------------------------------- |
| `npm test`          | the landing server and deployment contract (`node --test`)  |
| `npm run check`     | `node --check` on the studio and the server modules         |
| `npm run studio`    | start the studio                                            |
| `npm run landing:dev` | preview the landing                                       |

## Project structure

```
studio/                the studio: server.mjs and the phone, viewer and control pages (public/)
site/server/           the landing's server, config, site builder, metrics, tests
site/web/              the landing's page template, dictionary (es, en), 404, styles, icon
infra/k8s/production/  the landing's Kubernetes manifests
enclii.yaml            the landing's Enclii manifest
docs/                  repository boundary, deployment contract, naming research, positioning
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`AGENTS.md`](./AGENTS.md).

## License

AGPL-3.0-only. Copyright (C) 2026 Innovaciones MADFAM S.A.S. de C.V. See [`LICENSE`](./LICENSE) and
[`NOTICE`](./NOTICE).
