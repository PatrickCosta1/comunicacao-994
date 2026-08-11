import { Router } from "express";
import { verifyCronSecret } from "../../middleware/verifyCronSecret";
import { buildWeeklyPlan, getCurrentWeeklyRange } from "../../services/weeklyPlan";
import { enviarEmail } from "../../lib/email";
import { sendWhatsAppText } from "../../services/whatsapp/client";
import { getWhatsAppPairingState, listWhatsAppGroups, startWhatsAppPairing } from "../../services/whatsapp/pairing";

const router = Router();

router.post("/whatsapp/pair", verifyCronSecret, async (req, res) => {
  try {
    const phoneNumber = String(req.body?.phoneNumber || "").trim();
    const state = await startWhatsAppPairing(phoneNumber);

    res.json({
      success: true,
      state,
      instructions: "Abre WhatsApp no telemóvel, vai a Dispositivos ligados e introduz o código mostrado.",
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "failed_to_start_pairing" });
  }
});

router.get("/whatsapp/status", verifyCronSecret, async (_req, res) => {
  res.json({ success: true, state: getWhatsAppPairingState() });
});

router.get("/whatsapp/groups", verifyCronSecret, async (_req, res) => {
  try {
    const groups = await listWhatsAppGroups();
    res.json({ success: true, groups });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "failed_to_list_groups" });
  }
});

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
