import { Request, Response, NextFunction } from "express";

export function verifyCronSecret(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.WHATSAPP_CRON_SECRET;
  const header = req.header("authorization") || req.header("x-cron-secret") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!expected) {
    return res.status(500).json({ error: "WHATSAPP_CRON_SECRET não configurado" });
  }

  if (token !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  next();
}
