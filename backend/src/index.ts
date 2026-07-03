import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
import equipasRouter from "./routes/equipas";
import conteudosRouter from "./routes/conteudos";
import recorrentesRouter from "./routes/recorrentes";
import mensagensRouter from "./routes/mensagens";

app.use("/api/equipas", equipasRouter);
app.use("/api/conteudos", conteudosRouter);
app.use("/api/eventos-recorrentes", recorrentesRouter);
app.use("/api/mensagens", mensagensRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2", emailRoute: "registada" });
});
app.get("/api/test-enviar", (_req, res) => {
  res.json({ message: "rota de teste funciona" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend 994-Comunicação a correr em http://localhost:${PORT}`);
});
