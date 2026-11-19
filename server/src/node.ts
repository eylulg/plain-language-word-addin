import { createServer } from 'node:https';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

const config = loadConfig(process.env);
const port = Number(process.env.PORT ?? 8787);
const behindProxy = process.env.TRUST_PROXY === 'true';

function log(line: string) {
  process.stdout.write(`${line}\n`);
}

const app = createApp({
  config,
  // Only the error type is logged: the paragraph may be confidential.
  onError: (error) =>
    process.stderr.write(`rewrite failed: ${error instanceof Error ? error.name : 'unknown'}\n`),
  // Without a proxy in front, headers can be forged, so use the socket address.
  clientKey: behindProxy ? undefined : (c) => getConnInfo(c).remote.address ?? 'unknown',
});

/**
 * The task pane runs on https://localhost:3100, and Office webviews block
 * calls from HTTPS pages to plain HTTP. In development, reuse the Office
 * dev certificates so the server is on HTTPS too.
 */
async function devHttpsOptions() {
  if (process.env.HTTPS === 'false' || process.env.NODE_ENV === 'production') return undefined;
  try {
    const devCerts = await import('office-addin-dev-certs');
    return await devCerts.getHttpsServerOptions();
  } catch {
    log(
      'Dev certificates not found. Run `npm run certs -w addin` for HTTPS. Falling back to HTTP.',
    );
    return undefined;
  }
}

const https = await devHttpsOptions();
serve(
  { fetch: app.fetch, port, ...(https ? { createServer, serverOptions: https } : {}) },
  (info) => {
    const scheme = https ? 'https' : 'http';
    log(`Plain Language server on ${scheme}://localhost:${info.port}`);
    log(
      config.apiKey
        ? `Rewrites use ${config.defaultModel}.`
        : 'No ANTHROPIC_API_KEY: demo mode with fixture rewrites.',
    );
    log(`Allowed origins: ${config.allowedOrigins.join(', ')}`);
  },
);
