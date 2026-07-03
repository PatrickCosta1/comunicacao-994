import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

// GET /api/equipas - Listar todas as equipas com membros
router.get("/", async (_req: Request, res: Response) => {
  const { data: equipas, error } = await supabase
    .from("equipas")
    .select("*, membros(*)")
    .order("created_at");

  if (error) return res.status(500).json({ error: error.message });
  res.json(equipas);
});

// GET /api/equipas/:id - Detalhes de uma equipa
router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("equipas")
    .select("*, membros(*)")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Equipa não encontrada" });
  res.json(data);
});

// POST /api/equipas/:id/membros - Adicionar membro
router.post("/:id/membros", async (req: Request, res: Response) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

  const { data, error } = await supabase
    .from("membros")
    .insert({ equipa_id: req.params.id, nome: nome.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/equipas/membros/:id - Remover membro
router.delete("/membros/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("membros")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/equipas/:id/membros/batch - Atualizar lista de membros (substitui todos)
router.post("/:id/membros/batch", async (req: Request, res: Response) => {
  const { nomes }: { nomes: string[] } = req.body;
  const equipaId = req.params.id;

  // Remover membros existentes
  await supabase.from("membros").delete().eq("equipa_id", equipaId);

  // Inserir novos
  const membros = nomes
    .filter((n) => n.trim())
    .map((nome) => ({ equipa_id: equipaId, nome: nome.trim() }));

  if (membros.length === 0) return res.json([]);

  const { data, error } = await supabase
    .from("membros")
    .insert(membros)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
