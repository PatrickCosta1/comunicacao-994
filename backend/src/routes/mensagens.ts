import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getSemanaInfo } from "../lib/utils";
import { enviarEmail } from "../lib/email";

const router = Router();

function formatTeams(eqs: any[]): string {
  if (!eqs?.length) return "";
  return eqs
    .filter((ce: any) => ce.equipas)
    .map((ce: any) => {
      const eq = ce.equipas;
      if (eq.membros?.length > 0) {
        return `${eq.nome}: ${eq.membros.map((m: any) => m.nome.split(" ")[0]).join(", ")}`;
      }
      return eq.nome;
    })
    .join(" | ");
}

async function gerarMensagem(inicio: string, fim: string) {
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

  const dataInicio = new Date(inicio + "T00:00:00");
  let msg = `Bom dia a todos! 🙌\n\n`;
  msg += `Relativamente ao plano semanal de ${dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}:\n\n`;

  // --- Atividades ---
  const atividadesSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "atividade" && c.estado !== "publicado"
  );
  if (atividadesSemana.length > 0) {
    msg += `📅 Atividades:\n`;
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
    msg += `🎥 Vídeos da Semana:\n`;
    for (const c of videosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• *${c.title}*`;
      if (d) msg += ` - publicar ${d.toLocaleDateString("pt-PT")}`;
      const eqsV = (c as any).conteudos_equipas || [];
      const teamsV = formatTeams(eqsV);
      if (teamsV) msg += `\n  └ ${teamsV}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Feriados ---
  const feriadosSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "feriado" && c.estado !== "publicado"
  );
  if (feriadosSemana.length > 0) {
    msg += `🎉 Feriados:\n`;
    for (const c of feriadosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• ${c.title}`;
      if (d) msg += ` - ${d.toLocaleDateString("pt-PT")}`;
      const eqsF = (c as any).conteudos_equipas || [];
      const teamsF = formatTeams(eqsF);
      if (teamsF) msg += `\n  └ ${teamsF}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Avisos ---
  const avisosSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "aviso" && c.estado !== "publicado"
  );
  if (avisosSemana.length > 0) {
    msg += `📢 Avisos:\n`;
    for (const c of avisosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• ${c.title}`;
      if (d) msg += ` - publicar ${d.toLocaleDateString("pt-PT")}`;
      const eqsA = (c as any).conteudos_equipas || [];
      const teamsA = formatTeams(eqsA);
      if (teamsA) msg += `\n  └ ${teamsA}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Quizzes ---
  const quizzesSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "quiz" && c.estado !== "publicado"
  );
  if (quizzesSemana.length > 0) {
    msg += `❓ Quizzes:\n`;
    for (const c of quizzesSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      msg += `• *${c.title}*`;
      if (d) msg += ` - publicar ${d.toLocaleDateString("pt-PT")}`;
      const eqsQ = (c as any).conteudos_equipas || [];
      const teamsQ = formatTeams(eqsQ);
      if (teamsQ) msg += `\n  └ ${teamsQ}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // --- Pensamentos ---
  const pensamentosSemana = (todosConteudos || []).filter(
    (c) => c.tipo === "pensamento" && c.estado !== "publicado"
  );
  if (pensamentosSemana.length > 0) {
    for (const c of pensamentosSemana) {
      const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
      const dataStr = d ? ` (${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")})` : "";
      const eqsP = (c as any).conteudos_equipas || [];
      const teamsP = formatTeams(eqsP);
      msg += `💭 Pensamento do Fundador${dataStr}: ${teamsP}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  // Fallback se nada
  if (!atividadesSemana.length && !videosSemana.length && !feriadosSemana.length &&
      !avisosSemana.length && !quizzesSemana.length && !pensamentosSemana.length) {
    msg += `📅 Nada de especial agendado para esta semana.\n\n`;
  }

  msg += `Boa semana a todos! 🚀`;

  await supabase.from("mensagens_semanais").upsert({
    conteudo: msg,
    semana_inicio: inicio,
  }, { onConflict: "semana_inicio" });

  return { mensagem: msg, conteudos: todosConteudos, dataInicio };
}

// GET /api/mensagens/semanal - Gerar mensagem semanal
router.get("/semanal", async (_req: Request, res: Response) => {
  const { inicio, fim } = getSemanaInfo();
  const { mensagem, conteudos } = await gerarMensagem(inicio, fim);
  res.json({
    mensagem,
    semana: { inicio, fim },
    atividades_count: conteudos?.length || 0,
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
  const { inicio, fim } = getSemanaInfo();
  const { mensagem: msg, dataInicio } = await gerarMensagem(inicio, fim);

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
