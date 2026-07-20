import express from "express";
import cors from "cors";
import { config } from "dotenv";
import cron from "node-cron";
import { initEmail, enviarEmail } from "./lib/email";
import { getSemanaInfo } from "./lib/utils";
import { gerarMensagem } from "./routes/mensagens";

config();
initEmail();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
import equipasRouter from "./routes/equipas";
import conteudosRouter from "./routes/conteudos";
import mensagensRouter from "./routes/mensagens";

app.use("/api/equipas", equipasRouter);
app.use("/api/conteudos", conteudosRouter);
app.use("/api/mensagens", mensagensRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend 994-Comunicação a correr em http://localhost:${PORT}`);
});

// ─── Cron semanal: Segunda-feira às 8h (hora de Portugal) ─────
cron.schedule(
  "0 8 * * 1",
  async () => {
    console.log("⏰ Cron semanal: a gerar mensagem e enviar email...");
    try {
      const { inicio, fim } = getSemanaInfo();
      const { mensagem: msg, dataInicio } = await gerarMensagem(inicio, fim);
      const subject = `Plano Semanal 994-Caxinas — ${dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}`;
      await enviarEmail(subject, msg);
      console.log("✅ Cron semanal: email enviado com sucesso!");
    } catch (err: any) {
      console.error("❌ Cron semanal: erro ao enviar email:", err?.message || err);
    }
  },
  { timezone: "Europe/Lisbon" }
);
console.log("📅 Cron semanal agendado: Segunda-feira às 08:00 (Europe/Lisbon)");
