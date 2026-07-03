import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import { supabase } from "../lib/supabase";
import { getSemanaInfo } from "../lib/utils";

const router = Router();

function criarTransporte() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    connectionTimeout: 15000,
  });
}

// GET /api/mensagens/semanal - Gerar mensagem semanal
router.get("/semanal", async (_req: Request, res: Response) => {
  const { inicio, fim } = getSemanaInfo();

  // Buscar conteúdos com publicação esta semana
  const { data: conteudos } = await supabase
    .from("conteudos")
    .select("*, conteudos_equipas(equipa_id, equipas(id, nome, membros(nome)))")
    .gte("data_publicacao", inicio)
    .lte("data_publicacao", fim)
    .order("data_publicacao", { ascending: true });

  // Também buscar atividades que decorrem esta semana (mesmo sem data_publicacao)
  const { data: atvExtra } = await supabase
    .from("conteudos")
    .select("*, conteudos_equipas(equipa_id, equipas(id, nome, membros(nome)))")
    .eq("tipo", "atividade")
    .lte("date_start", fim)
    .gte("date_end", inicio)
    .neq("estado", "publicado");

  // Juntar sem duplicar
  const seen = new Set<string>();
  const todosConteudos = [...(conteudos || []), ...(atvExtra || [])].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // Buscar equipas (para membros)
  const { data: equipas } = await supabase
    .from("equipas")
    .select("*, membros(nome)")
    .order("created_at");

  // Montar mensagem
  const dataInicio = new Date(inicio + "T00:00:00");
  let msg = `*📋 Plano Semanal - ${dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}*\n\n`;
  msg += `*Bom dia a todos!* 🙌\n\nRelativamente ao plano semanal:\n\n`;

  // --- Atividades ---
  const atividadesSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "atividade" && c.estado !== "publicado"
  );
  if (atividadesSemana.length > 0) {
    msg += `*📅 Atividades:*\n`;
    for (const c of atividadesSemana) {
      const d = c.date_start ? new Date(c.date_start + "T00:00:00") : null;
      const dataStr = d ? d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" }) : "";
      msg += `• *${c.title}* - ${dataStr}`;
      if (c.local) msg += ` (${c.local})`;
      msg += `\n`;

      const eqs = (c as any).conteudos_equipas || [];
      for (const ce of eqs) {
        const eq = ce.equipas;
        if (eq?.membros?.length > 0) {
          const nomes = eq.membros.map((m: any) => m.nome.split(" ")[0]).join(", ");
          msg += `  └ ${eq.nome}: ${nomes}\n`;
        } else if (eq) {
          msg += `  └ ${eq.nome}\n`;
        }
      }
      if (c.data_publicacao) {
        msg += `  └ 📱 Publicação até ${new Date(c.data_publicacao + "T00:00:00").toLocaleDateString("pt-PT")}\n`;
      }
      msg += `\n`;
    }
  }

  // --- Vídeos ---
  const videosSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "video" && c.estado !== "publicado"
  );
  if (videosSemana.length > 0) {
    msg += `*🎥 Vídeos da Semana:*\n`;
    for (const c of videosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• *${c.title}*`;
      if (d) msg += ` - publicar ${d.toLocaleDateString("pt-PT")}`;
      const eqs = (c as any).conteudos_equipas || [];
      const eqVid = eqs.find((ce: any) => ce.equipas?.nome?.includes("Videos"));
      if (eqVid?.equipas?.membros?.length > 0) {
        msg += ` (${eqVid.equipas.membros.map((m: any) => m.nome.split(" ")[0]).join(", ")})`;
      }
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Feriados ---
  const feriadosSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "feriado" && c.estado !== "publicado"
  );
  if (feriadosSemana.length > 0) {
    msg += `*🎉 Feriados:*\n`;
    for (const c of feriadosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• ${c.title}`;
      if (d) msg += ` - ${d.toLocaleDateString("pt-PT")}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Avisos ---
  const avisosSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "aviso" && c.estado !== "publicado"
  );
  if (avisosSemana.length > 0) {
    msg += `*📢 Avisos:*\n`;
    for (const c of avisosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• ${c.title}`;
      if (d) msg += ` - publicar ${d.toLocaleDateString("pt-PT")}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Quizzes ---
  const quizzesSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "quiz" && c.estado !== "publicado"
  );
  if (quizzesSemana.length > 0) {
    msg += `*❓ Quizzes:*\n`;
    for (const c of quizzesSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• *${c.title}*`;
      if (d) msg += ` - publicar ${d.toLocaleDateString("pt-PT")}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Pensamentos ---
  const pensamentosSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "pensamento" && c.estado !== "publicado"
  );
  if (pensamentosSemana.length > 0) {
    msg += `*💭 Pensamento da Semana:*\n`;
    for (const c of pensamentosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• "${c.title}"`;
      if (d) msg += ` - publicar ${d.toLocaleDateString("pt-PT")}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // Fallback se nada
  if (!atividadesSemana.length && !videosSemana.length && !feriadosSemana.length &&
      !avisosSemana.length && !quizzesSemana.length && !pensamentosSemana.length) {
    msg += `📅 *Agenda:* Nada de especial agendado para esta semana.\n\n`;
  }

  msg += `*Boa semana a todos!* 🚀`;
  await supabase.from("mensagens_semanais").upsert({
    conteudo: msg,
    semana_inicio: inicio,
  }, { onConflict: "semana_inicio" });

  res.json({
    mensagem: msg,
    semana: { inicio, fim },
    atividades_count: todosConteudos?.length || 0,
  });
});

// GET /api/mensagens/historico - Últimas mensagens geradas
router.get("/historico", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("mensagens_semanais")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/mensagens/enviar-email - Gera mensagem semanal e envia por email
router.post("/enviar-email", async (_req: Request, res: Response) => {
  const transport = criarTransporte();
  if (!transport) {
    return res.status(400).json({
      error: "EMAIL_USER e EMAIL_PASS nao definidos no .env",
      instrucoes: "Cria uma palavra-passe de app no Google e adiciona ao .env: EMAIL_USER=teuemail@gmail.com EMAIL_PASS=passwordapp"
    });
  }

  // Reutilizar a logica da mensagem semanal
  const { inicio, fim } = getSemanaInfo();

  // Fetch data (copied from /semanal logic)
  const { data: conteudos } = await supabase
    .from("conteudos")
    .select("*, conteudos_equipas(equipa_id, equipas(id, nome, membros(nome)))")
    .gte("data_publicacao", inicio)
    .lte("data_publicacao", fim)
    .order("data_publicacao", { ascending: true });

  const { data: atvExtra } = await supabase
    .from("conteudos")
    .select("*, conteudos_equipas(equipa_id, equipas(id, nome, membros(nome)))")
    .eq("tipo", "atividade")
    .lte("date_start", fim)
    .gte("date_end", inicio)
    .neq("estado", "publicado");

  const seen = new Set<string>();
  const todosConteudos = [...(conteudos || []), ...(atvExtra || [])].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // Gerar mensagem (logica simplificada)
  const dataInicio = new Date(inicio + "T00:00:00");
  let msg = `Bom dia a todos! 🙌\n\n`;
  msg += `Relativamente ao plano semanal de ${dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}:\n\n`;

  const atvSemana = todosConteudos.filter((c) => c.tipo === "atividade" && c.estado !== "publicado");
  if (atvSemana.length > 0) {
    msg += `📅 Atividades:\n`;
    for (const c of atvSemana) {
      msg += `• ${c.title}${c.local ? ` (${c.local})` : ""}\n`;
      const eqs = (c as any).conteudos_equipas || [];
      for (const ce of eqs) {
        const eq = ce.equipas;
        if (eq?.membros?.length > 0) {
          msg += `  └ ${eq.nome}: ${eq.membros.map((m: any) => m.nome.split(" ")[0]).join(", ")}\n`;
        }
      }
    }
    msg += `\n`;
  }

  const pubsSemana = todosConteudos.filter((c) => c.data_publicacao && c.estado !== "publicado");
  if (pubsSemana.length > 0) {
    msg += `📱 Publicacoes da Semana:\n`;
    for (const c of pubsSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00").toLocaleDateString("pt-PT") : "";
      msg += `• ${c.title} — ${d}\n`;
    }
    msg += `\n`;
  }

  msg += `💭 Pensamento da Semana: A equipa de pensamentos trata desta publicacao.\n\n`;
  msg += `Boa semana a todos! 🚀`;

  // Enviar email
  const para = process.env.EMAIL_TO || process.env.EMAIL_USER;
  try {
    await transport.sendMail({
      from: process.env.EMAIL_USER,
      to: para,
      subject: `📋 Plano Semanal 994-Caxinas — ${dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}`,
      text: msg,
    });

    await supabase.from("mensagens_semanais").upsert({
      conteudo: msg,
      semana_inicio: inicio,
    }, { onConflict: "semana_inicio" });

    res.json({ success: true, message: "Email enviado com sucesso!", destinatario: para });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao enviar email: " + err.message });
  }
});

export default router;
