// Default export for platforms that run a Hono app directly, such as Vercel.
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const app = createApp({ config: loadConfig(process.env) });

export default app;
