import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getNextThursday(): string {
  const hoje = new Date();
  const dia = hoje.getDay(); // 0=domingo, 4=quinta
  const diff = dia <= 4 ? 4 - dia : 4 + 7 - dia;
  const next = new Date(hoje);
  next.setDate(hoje.getDate() + diff);
  return next.toISOString().split("T")[0];
}

// GET /api/conteudos - Listar com filtro opcional por tipo
router.get("/", async (req: Request, res: Response) => {
  const { tipo, estado } = req.query;
  let query = supabase
    .from("conteudos")
    .select("*, conteudos_equipas(equipa_id, equipas(id, nome))")
    .order("created_at", { ascending: false });

  if (tipo && tipo !== "todos") query = query.eq("tipo", tipo as string);
  if (estado && estado !== "todos") query = query.eq("estado", estado as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const formatted = data?.map((c: any) => ({
    ...c,
    equipas_responsaveis: c.conteudos_equipas?.map((ce: any) => ({
      id: ce.equipas?.id,
      nome: ce.equipas?.nome,
    })) || [],
    conteudos_equipas: undefined,
  }));

  res.json(formatted);
});

// POST /api/conteudos - Criar
router.post("/", async (req: Request, res: Response) => {
  const { tipo, title, descricao, date_start, date_end, hora, local, seccoes,
          data_publicacao, data_acontecimento } = req.body;

  if (!tipo || !title) {
    return res.status(400).json({ error: "tipo e title são obrigatórios" });
  }

  let dataPub = data_publicacao || null;

  // Lógica automática por tipo
  if (tipo === "atividade") {
    const fim = date_end || date_start;
    dataPub = addDays(fim, 7); // Publicação 7 dias após fim
  }
  if (tipo === "pensamento") {
    dataPub = getNextThursday(); // Próxima quinta-feira
  }
  if (tipo === "aviso" && data_acontecimento) {
    dataPub = addDays(data_acontecimento, -1); // Publicar 1 dia antes do evento
  }

  const { data: conteudo, error: err } = await supabase
    .from("conteudos")
    .insert({
      tipo,
      title: title.trim(),
      descricao: (descricao || "").trim(),
      date_start: date_start || null,
      date_end: date_end || date_start || null,
      hora: hora || "",
      local: (local || "").trim(),
      seccoes: seccoes || [],
      data_publicacao: dataPub,
      data_acontecimento: data_acontecimento || null,
      estado: "pendente",
    })
    .select()
    .single();

  if (err) return res.status(500).json({ error: err.message });

  // Associar equipas responsáveis (automático ou manual)
  let equipasIds: string[] = req.body.equipas_ids || [];

  if (equipasIds.length === 0) {
    // Equipas automáticas por tipo
    const mapaEquipas: Record<string, string[]> = {
      atividade: [],  // Stories: Fotos+Videos, Pub: Textos - tratado abaixo separadamente
      video: [],      // Videos team
      feriado: [],    // Feriados team
      aviso: [],      // Avisos team
      quiz: [],       // Quizzes team
      pensamento: [],  // Pensamentos team
    };

    // Buscar equipas pelo nome
    const { data: todas } = await supabase.from("equipas").select("id, nome");
    const eqMap = new Map(todas?.map((e) => [e.nome.replace(/[^\w\s]/g, "").trim().toLowerCase(), e.id]));

    const matchEquipa = (palavra: string) => {
      for (const [key, id] of eqMap) {
        if (key.includes(palavra)) return id;
      }
      return null;
    };

    if (tipo === "video") {
      const id = matchEquipa("videos");
      if (id) equipasIds.push(id);
    } else if (tipo === "feriado") {
      const id = matchEquipa("feriados");
      if (id) equipasIds.push(id);
    } else if (tipo === "aviso") {
      const id = matchEquipa("avisos");
      if (id) equipasIds.push(id);
    } else if (tipo === "quiz") {
      const id = matchEquipa("quizzes");
      if (id) equipasIds.push(id);
    } else if (tipo === "pensamento") {
      const id = matchEquipa("pensamentos");
      if (id) equipasIds.push(id);
    } else if (tipo === "atividade") {
      // Stories: Fotos + Videos; Publicação: Textos
      const fotosId = matchEquipa("fotos");
      const videosId = matchEquipa("videos");
      const textosId = matchEquipa("textos");
      if (fotosId) equipasIds.push(fotosId);
      if (videosId) equipasIds.push(videosId);
      if (textosId) equipasIds.push(textosId);
    }
  }

  if (equipasIds.length > 0) {
    const assoc = equipasIds.map((equipa_id: string) => ({
      conteudo_id: conteudo.id,
      equipa_id,
    }));
    await supabase.from("conteudos_equipas").insert(assoc);
  }

  // Buscar completo
  const { data: completo } = await supabase
    .from("conteudos")
    .select("*, conteudos_equipas(equipa_id, equipas(id, nome))")
    .eq("id", conteudo.id)
    .single();

  res.status(201).json({
    ...completo,
    equipas_responsaveis: (completo as any)?.conteudos_equipas?.map((ce: any) => ({
      id: ce.equipas?.id,
      nome: ce.equipas?.nome,
    })) || [],
    conteudos_equipas: undefined,
  });
});

// PATCH /api/conteudos/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const updates: any = {};
  if (req.body.estado) updates.estado = req.body.estado;
  if (req.body.title) updates.title = req.body.title;
  if (req.body.descricao !== undefined) updates.descricao = req.body.descricao;
  if (req.body.data_publicacao) updates.data_publicacao = req.body.data_publicacao;

  const { data, error } = await supabase
    .from("conteudos")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/conteudos/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("conteudos")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
