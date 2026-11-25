// @ts-check
/**
 * Local preview: `node site/server/dev.mjs [port]`. Development only: any host is served, nothing is
 * cached, and the metrics listener takes the next port up.
 */
import { configFromEnv } from './config.mjs';
import { start } from './server.mjs';

const port = Number(process.argv[2] ?? process.env.PORT ?? 18770);
await start(
  configFromEnv({
    ...process.env,
    CAMSYNC_ENV: 'development',
    CAMSYNC_PORT: String(port),
    CAMSYNC_METRICS_PORT: String(port + 1),
  }),
);
