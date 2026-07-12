import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";

/**
 * Vite only serves the SPA. Stripe APIs live in /api (Vercel serverless).
 * This plugin runs those handlers locally in `npm run dev` so billing-status
 * and checkout work with .env (not only after a Vercel deploy).
 */
function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server) {
      // Load ALL .env keys into process.env (Vite only injects VITE_* into the client).
      const env = loadEnv(server.config.mode, process.cwd(), "");
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/api/")) return next();

        const route = url.split("?")[0].replace(/^\/api\//, "").replace(/\/$/, "");
        if (!route || route.includes("..")) return next();

        const filePath = path.resolve(process.cwd(), "api", `${route}.js`);
        if (!existsSync(filePath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Unknown API route: /api/${route}` }));
          return;
        }

        try {
          // Bust cache so env/handler edits reload during dev.
          const mod = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
          const handler = mod.default;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid API handler" }));
            return;
          }

          // Minimal Vercel-like res helpers if missing.
          if (!res.status) {
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
          }
          if (!res.json) {
            res.json = (body) => {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(body));
            };
          }
          if (!res.send) {
            res.send = (body) => {
              res.end(typeof body === "string" ? body : JSON.stringify(body));
            };
          }

          await handler(req, res);
        } catch (e) {
          console.error(`[local-api] /api/${route}:`, e);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e.message || "API error" }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
});
