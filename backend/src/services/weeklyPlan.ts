import { supabase } from "../lib/supabase";
import { getNextThursday, getSemanaInfo } from "../lib/utils";

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
  pubPrefix?: boolean;
  usarDateStart?: boolean;
  negrito?: boolean;
}

function renderSecao(conteudos: any[], cfg: SecaoConfig): string {
  const items = (conteudos || []).filter((c) => c.tipo === cfg.tipo && c.estado !== "publicado");
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

function renderAtividades(conteudos: any[]): string {
  const items = (conteudos || []).filter((c) => c.tipo === "atividade" && c.estado !== "publicado");
  if (!items.length) return "";

  let bloc = `📅 Atividades:\n`;
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

function renderPensamento(equipas: any[]): string {
  const thursday = getNextThursday();
  const d = isoDate(thursday);
  const eqPensamentos = (equipas || []).find((eq) => eq.nome?.toLowerCase().includes("pensamento"));
  const nomes = eqPensamentos?.membros?.length ? eqPensamentos.membros.map((m: any) => m.nome.split(" ")[0]).join(", ") : "";
  return `💭 Pensamento do Fundador ${dataDDMM(d)}: ${nomes}\n\n`;
}

export async function buildWeeklyPlan(inicio: string, fim: string) {
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
  const cabecalho = `Relativamente ao plano semanal de ${dataInicio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}:\n\n`;
  const saida = [
    `Bom dia a todos! 🙌\n\n`,
    cabecalho,
    renderAtividades(todosConteudos),
    renderSecao(todosConteudos, { tipo: "video", titulo: "Vídeos da Semana", emoji: "🎥", negrito: true }),
    renderSecao(todosConteudos, { tipo: "feriado", titulo: "Feriados", emoji: "🎉", pubPrefix: false }),
    renderSecao(todosConteudos, { tipo: "aviso", titulo: "Avisos", emoji: "📢" }),
    renderSecao(todosConteudos, { tipo: "quiz", titulo: "Quizzes", emoji: "❓", negrito: true }),
    renderPensamento(equipas || []),
    `Boa semana a todos! 🚀`,
  ];

  const mensagem = saida.join("");

  await supabase.from("mensagens_semanais").upsert(
    {
      conteudo: mensagem,
      semana_inicio: inicio,
    },
    { onConflict: "semana_inicio" }
  );

  return { mensagem, conteudos: todosConteudos, dataInicio, inicio, fim };
}

export function getCurrentWeeklyRange() {
  return getSemanaInfo();
}
