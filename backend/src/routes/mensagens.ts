import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getSemanaInfo, getNextThursday } from "../lib/utils";
import { enviarEmail } from "../lib/email";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────

function isoDate(d: string) {
  return new Date(d + "T00:00:00");
}

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

function teamsLine(conteudo: any): string {
  const t = formatTeams((conteudo as any).conteudos_equipas || []);
  return t ? `\n  └ ${t}` : "";
}

function ptDate(d: Date): string {
  return d.toLocaleDateString("pt-PT");
}

function dataDDMM(d: Date): string {
  return `(${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")})`;
}

interface SecaoConfig {
  tipo: string;
  titulo: string;
  emoji: string;
  /** mostra "publicar" antes da data */
  pubPrefix?: boolean;
  /** usar date_start em vez de data_publicacao */
  usarDateStart?: boolean;
  /** negrito no título do item */
  negrito?: boolean;
  /** se false, a secção não aparece na mensagem */
  ativo?: boolean;
}

interface MensagemConfig {
  saudacao: string;
  cabecalho: string;
  despedida: string;
  seccoes: SecaoConfig[];
}

const DEFAULT_CONFIG: MensagemConfig = {
  saudacao: "Bom dia a todos! 🙌",
  cabecalho: "Relativamente ao plano semanal de {data}:",
  despedida: "Boa semana a todos! 🚀",
  seccoes: [
    { tipo: "atividade", titulo: "Atividades", emoji: "📅", ativo: true, usarDateStart: true },
    { tipo: "video", titulo: "Vídeos da Semana", emoji: "🎥", negrito: true, ativo: true },
    { tipo: "feriado", titulo: "Feriados", emoji: "🎉", pubPrefix: false, ativo: true },
    { tipo: "aviso", titulo: "Avisos", emoji: "📢", ativo: true },
    { tipo: "quiz", titulo: "Quizzes", emoji: "❓", negrito: true, ativo: true },
    { tipo: "pensamento", titulo: "Pensamento do Fundador", emoji: "💭", ativo: true },
  ],
};

async function getMensagemConfig(): Promise<MensagemConfig> {
  try {
    const { data, error } = await supabase
      .from("mensagem_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return DEFAULT_CONFIG;

    return {
      saudacao: data.saudacao || DEFAULT_CONFIG.saudacao,
      cabecalho: data.cabecalho || DEFAULT_CONFIG.cabecalho,
      despedida: data.despedida || DEFAULT_CONFIG.despedida,
      seccoes: Array.isArray(data.seccoes) && data.seccoes.length ? data.seccoes : DEFAULT_CONFIG.seccoes,
    };
  } catch {
    // tabela ainda não existe na BD — usa valores padrão
    return DEFAULT_CONFIG;
  }
}

function renderSecao(conteudos: any[], cfg: SecaoConfig): string {
  if (cfg.ativo === false) return "";
  const items = (conteudos || []).filter(
    (c) => c.tipo === cfg.tipo && c.estado !== "publicado"
  );
  if (!items.length) return "";

  let bloc = `${cfg.emoji} ${cfg.titulo}:\n`;
  for (const c of items) {
    const d = cfg.usarDateStart && c.date_start ? isoDate(c.date_start) : c.data_publicacao ? isoDate(c.data_publicacao) : null;
    const tit = cfg.negrito ? `*${c.title}*` : c.title;

    let linha = `• ${tit}`;
    if (d) linha += cfg.pubPrefix !== false ? ` - publicar ${ptDate(d)}` : ` - ${ptDate(d)}`;
    if (c.local && cfg.usarDateStart) linha += ` (${c.local})`;
    linha += teamsLine(c);
    linha += `\n`;
    bloc += linha;
  }
  return bloc + `\n`;
}

function renderAtividades(conteudos: any[], cfg: SecaoConfig): string {
  if (cfg.ativo === false) return "";
  const items = (conteudos || []).filter(
    (c) => c.tipo === "atividade" && c.estado !== "publicado"
  );
  if (!items.length) return "";

  let bloc = `${cfg.emoji} ${cfg.titulo}:\n`;
  for (const c of items) {
    const d = c.date_start ? isoDate(c.date_start) : null;
    const dataStr = d ? ptDate(d) : "";
    bloc += `• *${c.title}* - ${dataStr}`;
    if (c.local) bloc += ` (${c.local})`;
    bloc += `\n`;

    const eqs = (c as any).conteudos_equipas || [];
    for (const ce of eqs) {
      const eq = ce.equipas;
      if (eq?.membros?.length > 0) {
        bloc += `  └ ${eq.nome}: ${eq.membros.map((m: any) => m.nome.split(" ")[0]).join(", ")}\n`;
      } else if (eq) {
        bloc += `  └ ${eq.nome}\n`;
      }
    }
    if (c.data_publicacao) {
      bloc += `  └ 📱 Publicação até ${ptDate(isoDate(c.data_publicacao))}\n`;
    }
    bloc += `\n`;
  }
  return bloc;
}

function renderPensamento(equipas: any[], cfg: SecaoConfig): string {
  if (cfg.ativo === false) return "";
  const thursday = getNextThursday();
  const d = isoDate(thursday);
  const eqPensamentos = (equipas || []).find(
    (eq) => eq.nome?.toLowerCase().includes("pensamento")
  );
  const nomes = eqPensamentos?.membros?.length
    ? eqPensamentos.membros.map((m: any) => m.nome.split(" ")[0]).join(", ")
    : "";
  return `${cfg.emoji} ${cfg.titulo} ${dataDDMM(d)}: ${nomes}\n\n`;
}

// ─── Geração da mensagem ───────────────────────────────────────

export async function gerarMensagem(inicio: string, fim: string) {
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

  const { data: equipas } = await supabase
    .from("equipas")
    .select("*, membros(nome)")
    .order("created_at");

  const dataInicio = isoDate(inicio);
  const config = await getMensagemConfig();
  const secao = (tipo: string) => config.seccoes.find((s) => s.tipo === tipo) || DEFAULT_CONFIG.seccoes.find((s) => s.tipo === tipo)!;

  const cabecalho = config.cabecalho.replace(
    "{data}",
    dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })
  );

  const saida = [
    config.saudacao ? `${config.saudacao}\n\n` : "",
    cabecalho ? `${cabecalho}\n\n` : "",
    renderAtividades(todosConteudos, secao("atividade")),
    renderSecao(todosConteudos, secao("video")),
    renderSecao(todosConteudos, secao("feriado")),
    renderSecao(todosConteudos, secao("aviso")),
    renderSecao(todosConteudos, secao("quiz")),
    renderPensamento(equipas || [], secao("pensamento")),
    config.despedida ? config.despedida : "",
  ];

  const msg = saida.join("");

  await supabase.from("mensagens_semanais").upsert({
    conteudo: msg,
    semana_inicio: inicio,
  }, { onConflict: "semana_inicio" });

  return { mensagem: msg, conteudos: todosConteudos, dataInicio };
}

// GET /api/mensagens/config - Obter configuração do plano semanal
router.get("/config", async (_req: Request, res: Response) => {
  const config = await getMensagemConfig();
  res.json(config);
});

// PUT /api/mensagens/config - Atualizar configuração do plano semanal
router.put("/config", async (req: Request, res: Response) => {
  const { saudacao, cabecalho, despedida, seccoes } = req.body;

  const clean = (v: any, fallback: string) => (typeof v === "string" ? v.trim() : fallback);
  const novaConfig: MensagemConfig = {
    saudacao: clean(saudacao, DEFAULT_CONFIG.saudacao),
    cabecalho: clean(cabecalho, DEFAULT_CONFIG.cabecalho),
    despedida: clean(despedida, DEFAULT_CONFIG.despedida),
    seccoes: Array.isArray(seccoes) && seccoes.length ? seccoes : DEFAULT_CONFIG.seccoes,
  };

  try {
    const { data, error } = await supabase
      .from("mensagem_config")
      .upsert({ id: 1, ...novaConfig, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message,
        dica: "A tabela 'mensagem_config' ainda não existe no Supabase. Corre a migration migration_mensagem_config.sql no SQL Editor.",
      });
    }

    res.json({
      saudacao: data.saudacao,
      cabecalho: data.cabecalho,
      despedida: data.despedida,
      seccoes: data.seccoes,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err?.message || "Erro ao guardar configuração",
      dica: "A tabela 'mensagem_config' ainda não existe no Supabase. Corre a migration migration_mensagem_config.sql no SQL Editor.",
    });
  }
});

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
