import { Router } from "express";
import { verifyCronSecret } from "../../middleware/verifyCronSecret";
import { buildWeeklyPlan, getCurrentWeeklyRange } from "../../services/weeklyPlan";
import { enviarEmail } from "../../lib/email";
import { sendWhatsAppText } from "../../services/whatsapp/client";

const router = Router();

router.post("/trigger-weekly-plan", verifyCronSecret, async (_req, res) => {
  try {
    const { inicio, fim } = getCurrentWeeklyRange();
    const plan = await buildWeeklyPlan(inicio, fim);
    const subject = `Plano Semanal 994-Caxinas — ${plan.dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}`;
    const emailResult = await enviarEmail(subject, plan.mensagem);
    let whatsappResult: { success: boolean; messageId?: string } | null = null;

    if (process.env.WHATSAPP_GROUP_JID) {
      whatsappResult = await sendWhatsAppText(process.env.WHATSAPP_GROUP_JID, plan.mensagem);
    }

    res.json({
      success: true,
      range: { inicio, fim },
      messageId: emailResult?.messageId ?? null,
      whatsapp: whatsappResult,
      length: plan.mensagem.length,
    });
  } catch (err: any) {
    console.error("Webhook weekly plan falhou:", err);
    res.status(500).json({ error: "failed_to_send_weekly_plan", detail: err?.message || String(err) });
  }
});

export default router;
