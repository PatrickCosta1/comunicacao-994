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
import sugestoesRouter from "./routes/sugestoes";

app.use("/api/equipas", equipasRouter);
app.use("/api/conteudos", conteudosRouter);
app.use("/api/mensagens", mensagensRouter);
app.use("/api/sugestoes", sugestoesRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend 994-Comunicação a correr em http://localhost:${PORT}`);
});
