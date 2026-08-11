import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { initEmail } from "./lib/email";

config();
initEmail();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
import equipasRouter from "./routes/equipas";
import conteudosRouter from "./routes/conteudos";
import mensagensRouter from "./routes/mensagens";
import weeklyPlanWebhookRouter from "./routes/webhooks/weeklyPlan";

app.use("/api/equipas", equipasRouter);
app.use("/api/conteudos", conteudosRouter);
app.use("/api/mensagens", mensagensRouter);
app.use("/api/webhooks", weeklyPlanWebhookRouter);

// ─── Ping leve (para keep-alive externo) ──────────────────────
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2" });
});

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "invalid_json" });
  }

  next(err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection capturada:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception capturada:", error);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend 994-Comunicação a correr em http://localhost:${PORT}`);
});
