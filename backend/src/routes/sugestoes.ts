import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getSemanaInfo } from "../lib/utils";

const router = Router();

export interface Sugestao {
  id: string;
  tipo: "urgencia" | "acao" | "info" | "lembrete";
  icon: string;
  mensagem: string;
  /** Acao executavel via API */
  acao?: {
    label: string;
    metodo: "POST" | "PATCH" | "DELETE";
    url: string;
    body?: Record<string, any>;
  };
  /** Link para navegacao no frontend */
  link?: { label: string; to: string };
  /** Se pode ser descartada */
  dismissivel?: boolean;
}

// GET /api/sugestoes
router.get("/", async (_req: Request, res: Response) => {
  const sugestoes: Sugestao[] = [];

  const { inicio, fim } = getSemanaInfo();
  const hoje = new Date().toISOString().split("T")[0];

  // --- Dados ---
  const [ctRes, eqRes, msgRes] = await Promise.all([
    supabase.from("conteudos").select("*, conteudos_equipas(equipa_id, equipas(id, nome, membros(nome)))"),
    supabase.from("equipas").select("*, membros(nome)").order("created_at"),
    supabase.from("mensagens_semanais").select("*").eq("semana_inicio", inicio).maybeSingle(),
  ]);

  const conteudos = ctRes.data || [];
  const equipas = eqRes.data || [];
  const msgSemana = msgRes.data;

  // ─── URGÊNCIA: Conteúdos atrasados ──────────────────────────
  const atrasados = conteudos.filter(
    (c: any) => c.data_publicacao && c.data_publicacao < hoje
      && c.estado !== "publicado" && c.tipo !== "feriado"
  );

  if (atrasados.length === 1) {
    const c = atrasados[0];
    sugestoes.push({
      id: `atrasado-${c.id}`,
      tipo: "urgencia",
      icon: "🔴",
      mensagem: `"${c.title}" está ${Math.ceil((new Date(hoje).getTime() - new Date(c.data_publicacao).getTime()) / (1000*60*60*24))} dias atrasado.`,
      acao: { label: "✅ Marcar como publicado", metodo: "PATCH", url: `/api/conteudos/${c.id}`, body: { estado: "publicado" } },
      dismissivel: true,
    });
  } else if (atrasados.length > 1) {
    sugestoes.push({
      id: "atrasados-multiplos",
      tipo: "urgencia",
      icon: "🔴",
      mensagem: `${atrasados.length} conteúdos atrasados por publicar.`,
      acao: { label: `✅ Publicar todos (${atrasados.length})`, metodo: "POST", url: `/api/conteudos/bulk/publicar`, body: { ids: atrasados.map((c: any) => c.id) } },
      link: { label: "Ver atrasados", to: "/conteudos" },
      dismissivel: true,
    });
  }

  // ─── URGÊNCIA: Vencem hoje ───────────────────────────────────
  const vencemHoje = conteudos.filter(
    (c: any) => c.data_publicacao === hoje && c.estado !== "publicado" && c.tipo !== "feriado"
  );
  for (const c of vencemHoje) {
    sugestoes.push({
      id: `hoje-${c.id}`,
      tipo: "urgencia",
      icon: "🟡",
      mensagem: `"${c.title}" vence hoje!`,
      acao: { label: "✅ Publicar agora", metodo: "PATCH", url: `/api/conteudos/${c.id}`, body: { estado: "publicado" } },
      dismissivel: true,
    });
  }

  // ─── AÇÃO: Mensagem semanal não gerada ───────────────────────
  if (!msgSemana) {
    sugestoes.push({
      id: "semana-sem-mensagem",
      tipo: "acao",
      icon: "💬",
      mensagem: "Ainda não geraste a mensagem para esta semana.",
      acao: { label: "📋 Gerar agora", metodo: "GET", url: `/api/mensagens/semanal` },
      dismissivel: true,
    });
  }

  // ─── INFO: Feriados próximos ─────────────────────────────────
  const feriadosProximos = conteudos.filter((c: any) =>
    c.tipo === "feriado" && c.data_publicacao && c.data_publicacao >= hoje
    && c.data_publicacao <= fim
  );
  for (const f of feriadosProximos) {
    sugestoes.push({
      id: `feriado-${f.id}`,
      tipo: "info",
      icon: "🎉",
      mensagem: `${f.title} é ${new Date(f.data_publicacao + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}.`,
      link: { label: "Ver feriados", to: "/feriados" },
    });
  }

  // ─── LEMBRETE: Equipas sem membros ──────────────────────────
  for (const eq of equipas) {
    if (!eq.membros || eq.membros.length === 0) {
      sugestoes.push({
        id: `equipa-vazia-${eq.id}`,
        tipo: "lembrete",
        icon: "👥",
        mensagem: `A equipa "${eq.nome}" não tem membros atribuídos.`,
        link: { label: "Adicionar membros", to: "/equipas" },
        dismissivel: true,
      });
    }
  }

  // ─── INFO: Resumo da semana ──────────────────────────────────
  const atvSemana = conteudos.filter((c: any) =>
    c.tipo !== "feriado" && c.data_publicacao && c.data_publicacao >= inicio
    && c.data_publicacao <= fim && c.estado !== "publicado"
  );
  if (atvSemana.length > 0) {
    sugestoes.push({
      id: "resumo-semana",
      tipo: "info",
      icon: "📋",
      mensagem: `${atvSemana.length} publicação${atvSemana.length > 1 ? "ões" : ""} agendada${atvSemana.length > 1 ? "s" : ""} para esta semana.`,
      link: { label: "Ver tudo", to: "/conteudos" },
    });
  }

  // ─── AÇÃO: Pensamento da semana ──────────────────────────────
  const pensamentoSemana = conteudos.find(
    (c: any) => c.tipo === "pensamento" && c.estado !== "publicado"
  );
  if (!pensamentoSemana) {
    sugestoes.push({
      id: "sem-pensamento",
      tipo: "acao",
      icon: "💭",
      mensagem: "Ainda não há pensamento do fundador para esta semana.",
      link: { label: "Criar pensamento", to: "/conteudos" },
      dismissivel: true,
    });
  }

  // ─── INFO: Cumprimento ──────────────────────────────────────
  const total30 = conteudos.filter((c: any) =>
    c.published_at && new Date(c.published_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const pontuais = total30.filter((c: any) =>
    c.data_publicacao && new Date(c.published_at) <= new Date(c.data_publicacao + "T23:59:59")
  );
  const taxa = total30.length > 0 ? Math.round((pontuais.length / total30.length) * 100) : 0;
  sugestoes.push({
    id: "taxa-cumprimento",
    tipo: "info",
    icon: taxa >= 80 ? "✅" : taxa >= 50 ? "⚠️" : "❌",
    mensagem: `Taxa de cumprimento nos últimos 30 dias: ${taxa}% (${pontuais.length}/${total30.length}).`,
  });

  res.json(sugestoes);
});

// POST /api/conteudos/bulk/publicar - Publicar vários de uma vez
router.post("/bulk/publicar", async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: "ids em falta" });

  const { data, error } = await supabase
    .from("conteudos")
    .update({ estado: "publicado", published_at: new Date().toISOString() })
    .in("id", ids)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, count: data?.length || 0 });
});

export default router;
