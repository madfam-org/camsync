# Contributing to camsync

> Last Updated: 2026-11-24

Read [`AGENTS.md`](./AGENTS.md) and [`docs/REPO_BOUNDARY.md`](./docs/REPO_BOUNDARY.md) first.

## Development setup

There is nothing to install: the studio and the landing import only Node's own modules. Use Node 22
(`.nvmrc`).

```bash
node studio/server.mjs        # the studio, on a Mac
node site/server/dev.mjs      # the landing preview
```

## Development workflow

### Branch strategy

- `main` - the default branch; changes arrive by pull request
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

### Making changes

1. Create a branch:

   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes and check them:

   ```bash
   npm test
   npm run check
   ```

3. Commit using conventional commits:

   ```bash
   git commit -m "feat(studio): add a lens setting"
   ```

### Commit message format

We use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`,
`style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `chore:`.

### Testing

The landing has automated tests; CI runs them. The studio needs a phone and a camera, which CI does
not have: when you change it, make a real take and write in the pull request what you measured
(resolution, frames per second, whether start and stop worked). A check you did not run is not a pass.

Never commit a recording, a master, an event log, anything from `certs/`, or anything that shows a
real person or a private space.

## Pull request process

1. Update documentation if needed.
2. Add tests for new landing behaviour.
3. Ensure all CI checks pass.
4. Request review from maintainers.
5. Address review feedback.

Any change to the landing's page goes through the impeccable design process before it ships.

## Reporting issues

Include a clear description, steps to reproduce, expected and actual behaviour, the phone model and
iOS version, the Mac's macOS and Node versions, and any error output. Do not attach recordings that
show a person or a private space.
