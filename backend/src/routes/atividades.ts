import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { addDays } from "../lib/utils";

const router = Router();

// GET /api/atividades - Listar atividades (com equipas responsáveis)
router.get("/", async (req: Request, res: Response) => {
  const { estado } = req.query;
  let query = supabase
    .from("atividades")
    .select("*, atividades_equipas!inner(equipa_id, equipas!inner(id, nome))")
    .order("date_start", { ascending: true });

  if (estado && estado !== "todas") {
    query = query.eq("estado", estado as string);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  // Formatar resposta
  const formatted = data?.map((a: any) => ({
    ...a,
    equipas_responsaveis: a.atividades_equipas?.map((ae: any) => ({
      id: ae.equipas?.id,
      nome: ae.equipas?.nome,
    })) || [],
    atividades_equipas: undefined,
  }));

  res.json(formatted);
});

// GET /api/atividades/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("atividades")
    .select("*, atividades_equipas(equipa_id, equipas(id, nome))")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Atividade não encontrada" });

  res.json({
    ...data,
    equipas_responsaveis: (data as any).atividades_equipas?.map((ae: any) => ({
      id: ae.equipas?.id,
      nome: ae.equipas?.nome,
    })) || [],
    atividades_equipas: undefined,
  });
});

// POST /api/atividades - Criar atividade
router.post("/", async (req: Request, res: Response) => {
  const { title, descricao, date_start, date_end, hora, local, seccoes, precisa_publicacao, equipas_ids } = req.body;

  if (!title || !date_start) {
    return res.status(400).json({ error: "Título e data de início são obrigatórios" });
  }

  const dataFim = date_end || date_start;
  let dataPub: string | null = null;

  if (precisa_publicacao) {
    dataPub = addDays(dataFim, 7);
  }

  // Inserir atividade
  const { data: atividade, error: errAtv } = await supabase
    .from("atividades")
    .insert({
      title: title.trim(),
      descricao: (descricao || "").trim(),
      date_start,
      date_end: dataFim,
      hora: hora || "",
      local: (local || "").trim(),
      seccoes: seccoes || [],
      precisa_publicacao: !!precisa_publicacao,
      data_publicacao: dataPub,
      estado: "agendado",
    })
    .select()
    .single();

  if (errAtv) return res.status(500).json({ error: errAtv.message });

  // Associar equipas responsáveis
  if (equipas_ids && equipas_ids.length > 0) {
    const assoc = equipas_ids.map((equipa_id: string) => ({
      atividade_id: atividade.id,
      equipa_id,
    }));

    const { error: errAssoc } = await supabase
      .from("atividades_equipas")
      .insert(assoc);

    if (errAssoc) return res.status(500).json({ error: errAssoc.message });
  }

  // Buscar atividade completa com equipas
  const { data: completa } = await supabase
    .from("atividades")
    .select("*, atividades_equipas(equipa_id, equipas(id, nome))")
    .eq("id", atividade.id)
    .single();

  res.status(201).json({
    ...completa,
    equipas_responsaveis: (completa as any)?.atividades_equipas?.map((ae: any) => ({
      id: ae.equipas?.id,
      nome: ae.equipas?.nome,
    })) || [],
    atividades_equipas: undefined,
  });
});

// PATCH /api/atividades/:id - Atualizar estado
router.patch("/:id", async (req: Request, res: Response) => {
  const { estado } = req.body;

  if (!["agendado", "decorrer", "concluido"].includes(estado)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  const { data, error } = await supabase
    .from("atividades")
    .update({ estado })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/atividades/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("atividades")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
