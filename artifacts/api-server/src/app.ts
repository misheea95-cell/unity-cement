import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const allowedOrigins = (process.env.PUBLIC_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-key"],
    optionsSuccessStatus: 204,
    maxAge: 600,
  }),
);
app.use(compression({ threshold: 1024, level: 6 }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json({ limit: "8mb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "8mb", parameterLimit: 20 }));

app.use("/api", router);

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  req.log.error({ err: error }, "Unhandled API error");
  if (res.headersSent) return;
  res.status(500).json({ error: "تعذر إتمام الطلب. حاول مرة أخرى." });
};

app.use(errorHandler);

export default app;
