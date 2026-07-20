import express from "express";
import cors from "cors";
import { config } from "dotenv";
import cron from "node-cron";
import { initEmail, enviarEmail } from "./lib/email";
import { supabase } from "./lib/supabase";
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

// ─── Ping leve (para keep-alive externo) ──────────────────────
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

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

// ─── Keep-alive (Render + Supabase) a cada 10 min ─────────────
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  cron.schedule(
    "*/10 * * * *",
    async () => {
      console.log("🔋 Keep-alive: a pingar Render e Supabase...");
      try {
        await fetch(`${RENDER_URL}/api/ping`);
      } catch {
        // se falhar, o serviço pode estar a hibernar — é normal
      }
      try {
        const { error } = await supabase.from("conteudos").select("id", { count: "exact", head: true }).limit(1);
        if (error) throw error;
        console.log("✅ Keep-alive: Supabase ativo");
      } catch (err: any) {
        console.warn("⚠️ Keep-alive: Supabase com erro:", err?.message || err);
      }
    },
    { timezone: "Europe/Lisbon" }
  );
  console.log("⏰ Keep-alive agendado: a cada 10 minutos");
} else {
  console.log("ℹ️ Keep-alive desativado (RENDER_EXTERNAL_URL não definido — ambiente local)");
}
