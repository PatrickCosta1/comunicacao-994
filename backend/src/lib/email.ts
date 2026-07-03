import sgMail from "@sendgrid/mail";

export function initEmail() {
  const key = process.env.SENDGRID_API_KEY;
  if (key) sgMail.setApiKey(key);
}

export function enviarEmail(subject: string, text: string): Promise<any> {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM || "patrickcosta1605@gmail.com";
  const to = process.env.EMAIL_TO || from;

  if (key) {
    return sgMail.send({ to, from, subject, text });
  }

  // Fallback: log apenas
  console.log("--- EMAIL (SendGrid nao configurado) ---");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Body:", text);
  console.log("--- FIM ---");
  return Promise.resolve({ messageId: "simulado" });
}
