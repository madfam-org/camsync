# The studio

> Last Updated: 2026-11-25

The working part of camsync. An iPhone opens a web page that captures its camera; a control panel on
a Mac shows a live view over the local network and controls the take; the iPhone records the
full-quality master and uploads it to the Mac in one-second chunks.

It runs on a Mac on a local network only. It is never deployed and is not served from the internet
(owner ruling, 2026-11-24). The files here are the working prototype moved in unchanged.

## Run it

From the repository root, on the Mac:

```bash
node studio/server.mjs
```

The process prints three addresses:

| Address                              | What                                                       | Reachable from          |
| ------------------------------------ | ---------------------------------------------------------- | ----------------------- |
| `http://127.0.0.1:8791/control`      | the control panel (live view, start/stop, settings, files) | this Mac only           |
| `http://127.0.0.1:8791/view`         | the live view alone, for another program to show           | this Mac only           |
| `https://<lan-address>:8792/c/<key>` | the phone's camera page                                    | the local network       |

The Mac's local-network address is discovered at run time, never configured. The phone's address
carries a short random key; without it the phone listener answers 403 or 404.

On the iPhone: open the phone address in Safari (the control panel shows it, and a QR code of it when
`python3` with the `qrcode` module is installed), accept the self-signed certificate warning the first
time, and allow the camera and the microphone. Start, stop, resolution, shape (16:9 or 4:3), lens and
zoom are then controlled from the panel.

## What it writes

| Path                                 | What                                                         | Committed?               |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------ |
| `studio/certs/`                      | the phone key, a self-signed TLS key and certificate          | never (git-ignored)      |
| `~/Movies/iPhone footage/<take>/` (default) | one folder per take: `master.mp4` (H.264 + AAC) and `take.json`, the measurements read from the file when the take ends (size, orientation, frame rate, sound level, warnings) | outside the repository   |

The certificate is regenerated when the Mac's network address changes. Nothing is uploaded anywhere
but this Mac: phone and viewer exchange video directly over WebRTC on the local network, and this
process only relays signalling messages, keeps the phone's latest status and writes the chunks.

## Settings

| Variable              | Default                   | Meaning                       |
| --------------------- | ------------------------- | ----------------------------- |
| `PHONECAM_HTTP_PORT`  | `8791`                    | the local control listener    |
| `PHONECAM_HTTPS_PORT` | `8792`                    | the phone listener (TLS)      |
| `PHONECAM_OUT`        | `~/Movies/iPhone footage` | where masters are written     |

The variable names and page titles still carry the prototype's working name; renaming them changes
behaviour and is left for a separate change.

## Needs

- macOS (the local host name comes from `scutil`; elsewhere it falls back to the OS host name).
- Node.js (no packages are installed; the server imports only Node's own modules).
- `openssl` on the path, to create the certificate on first run.
- Optional: `python3` with the `qrcode` module, for the QR code in the panel.

## Measured (2026-11-24, one iPhone 15)

- Vertical masters 2160x3840 at 30 fps; 4:3 full-sensor masters 2160x2880 at 29.9 fps; H.264 + AAC MP4.
- Live view at 30 fps.
- Remote start and stop work.

Not built: titles and overlays, an event log, several cameras, rendering through CEQ, a native app.
