// Cloudflare Workers entry. Secrets and vars arrive on `env`, not process.env.
import type { Hono } from 'hono';
import { createApp } from './app.js';
import { loadConfig, type Env } from './config.js';

let app: Hono | undefined;

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    app ??= createApp({ config: loadConfig(env) });
    return app.fetch(request, env);
  },
};
