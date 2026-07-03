import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

let sendgridReady = false;

export function initEmail() {
  const key = process.env.SENDGRID_API_KEY;
  if (key) {
    sgMail.setApiKey(key);
    sendgridReady = true;
  }
}

function criarTransporteGmail() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 15000,
  });
}

export async function enviarEmail(subject: string, text: string): Promise<any> {
  const from = process.env.EMAIL_FROM || "patrickcosta1605@gmail.com";
  const to = process.env.EMAIL_TO || from;

  // 1. Tentar Gmail SMTP porta 465 (SSL)
  const gmail = criarTransporteGmail();
  if (gmail) {
    try {
      const info = await gmail.sendMail({ from, to, subject, text });
      console.log("Email enviado via Gmail SMTP (porta 465):", info.messageId);
      return info;
    } catch (err: any) {
      console.warn("Gmail SMTP falhou, a tentar alternativa:", err.message);
    }
  }

  // 2. Tentar SendGrid (API HTTP, funciona sempre no Render)
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
