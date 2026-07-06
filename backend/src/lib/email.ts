import { Resend } from "resend";
import sgMail from "@sendgrid/mail";

let resend: Resend | null = null;
let sendgridReady = false;

export function initEmail() {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) resend = new Resend(resendKey);

  const sgKey = process.env.SENDGRID_API_KEY;
  if (sgKey) {
    sgMail.setApiKey(sgKey);
    sendgridReady = true;
  }
}

export async function enviarEmail(subject: string, text: string): Promise<any> {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const to = process.env.EMAIL_TO || "patrickcosta1605@gmail.com";

  // 1. Resend (API HTTP, funciona sempre no Render)
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        text,
      });
      if (error) throw error;
      console.log("Email enviado via Resend:", data?.id);
      return data;
    } catch (err: any) {
      console.warn("Resend falhou:", err.message);
    }
  }

  // 2. Tentar SendGrid (fallback)
  if (sendgridReady) {
    try {
      const info = await sgMail.send({ to, from, subject, text });
      console.log("Email enviado via SendGrid:", info[0]?.statusCode);
      return info;
    } catch (err: any) {
      console.warn("SendGrid falhou:", err.message);
    }
  }

  // 3. Fallback: log apenas
  console.log("--- EMAIL (simulado - sem servico configurado) ---");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Body:", text);
  console.log("--- FIM ---");
  return { messageId: "simulado" };
}
