import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getSemanaInfo } from "../lib/utils";
import { buildWeeklyPlan } from "../services/weeklyPlan";
import { enviarEmail } from "../lib/email";

const router = Router();

router.get("/semanal", async (_req: Request, res: Response) => {
  const { inicio, fim } = getSemanaInfo();
  const { mensagem, conteudos } = await buildWeeklyPlan(inicio, fim);
  res.json({
    mensagem,
    semana: { inicio, fim },
    atividades_count: conteudos?.length || 0,
  });
});

router.get("/historico", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("mensagens_semanais")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/enviar-email", async (_req: Request, res: Response) => {
  const { inicio, fim } = getSemanaInfo();
  const { mensagem: msg, dataInicio } = await buildWeeklyPlan(inicio, fim);

  const subject = `Plano Semanal 994-Caxinas — ${dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}`;
  try {
    const info = await enviarEmail(subject, msg);

    res.json({ success: true, message: "Email enviado!", destinatario: process.env.EMAIL_TO || "patrickcosta1605@gmail.com", messageId: info.messageId });
  } catch (err: any) {
    console.error("Erro ao enviar email:", err);
    res.status(500).json({
      error: "Erro ao enviar email",
      detalhe: err.message,
      code: err.code,
    });
  }
});

export default router;
