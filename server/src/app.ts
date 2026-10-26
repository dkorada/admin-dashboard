import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { HttpError } from "./lib/http.js";
import authRoutes from "./routes/auth.js";
import metricsRoutes from "./routes/metrics.js";
import userRoutes from "./routes/users.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  // serverless-http hands Express a pre-read Buffer body, which body-parser 2 skips; parse it here.
  app.use((req, _res, next) => {
    if (!Buffer.isBuffer(req.body)) return next();
    const raw = req.body.toString("utf8");
    req.body = undefined;
    if (!raw || !req.is("application/json")) return next();
    try {
      req.body = JSON.parse(raw);
      next();
    } catch {
      next(new HttpError(400, "Malformed JSON body"));
    }
  });
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // On Netlify the function sees /.netlify/functions/api/...; normalise to /api/...
  app.use((req, _res, next) => {
    if (req.url.startsWith("/.netlify/functions/api")) {
      req.url = "/api" + req.url.slice("/.netlify/functions/api".length);
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/users", userRoutes);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request", details: err.issues });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, details: err.details });
      return;
    }
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  };
  app.use(errorHandler);

  return app;
}
