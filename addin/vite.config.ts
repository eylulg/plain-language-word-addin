import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ServerOptions } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * Office only loads add-ins over HTTPS. The dev certificates come from
 * office-addin-dev-certs and are only needed by the dev server, never by
 * the build or the tests.
 */
async function httpsOptions(): Promise<ServerOptions["https"]> {
  const devCerts = await import("office-addin-dev-certs");
  return devCerts.getHttpsServerOptions();
}

export default defineConfig(async ({ command }) => {
  const needsHttps = command === "serve" && !process.env.VITEST;
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": `${root}src` },
    },
    server: {
      port: 3100,
      strictPort: true,
      https: needsHttps ? await httpsOptions() : undefined,
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          taskpane: `${root}taskpane.html`,
          commands: `${root}commands.html`,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-utils/setup.ts"],
      css: false,
      restoreMocks: true,
    },
  };
});
