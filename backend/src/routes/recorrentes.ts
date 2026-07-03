import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Devolve todos os primeiros domingos entre duas datas
function getPrimeirosDomingos(inicio: string, fim: string): string[] {
  const datas: string[] = [];
  let d = new Date(inicio + "T00:00:00");
  const fimD = new Date(fim + "T00:00:00");

  // Avancar para o primeiro domingo do mes de inicio
  while (d <= fimD) {
    const mes = d.getMonth();
    const ano = d.getFullYear();

    // Primeiro domingo deste mes
    const primeiroDia = new Date(ano, mes, 1);
    const diaSemana = primeiroDia.getDay(); // 0=domingo
    const diffDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
    const primeiroDomingo = new Date(ano, mes, 1 + diffDomingo);

    if (primeiroDomingo >= new Date(inicio + "T00:00:00") && primeiroDomingo <= fimD) {
      datas.push(primeiroDomingo.toISOString().split("T")[0]);
    }

    // Avancar para o proximo mes
    d.setMonth(mes + 1);
    d.setDate(1);
  }

  return datas;
}

// GET /api/eventos-recorrentes - Listar
router.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("eventos_recorrentes")
    .select("*")
    .order("data_inicio");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/eventos-recorrentes - Criar e gerar avisos
router.post("/", async (req: Request, res: Response) => {
  const { title, data_inicio, data_fim } = req.body;
  if (!title || !data_inicio || !data_fim) {
    return res.status(400).json({ error: "title, data_inicio e data_fim sao obrigatorios" });
  }

  // Guardar registo
  const { data: evento, error: errEvento } = await supabase
    .from("eventos_recorrentes")
    .insert({ title, tipo: "hora_piedade", data_inicio, data_fim })
    .select()
    .single();

  if (errEvento) return res.status(500).json({ error: errEvento.message });

  // Buscar equipa de Avisos
  const { data: equipas } = await supabase.from("equipas").select("id, nome");
  const eqAvisos = equipas?.find((e) => e.nome.includes("Avisos"));

  // Gerar avisos para cada primeiro domingo
  const domingos = getPrimeirosDomingos(data_inicio, data_fim);
  let criados = 0;

  for (const domingo of domingos) {
    const sabado = addDays(domingo, -1);
    const titulo = `⛪ Hora de Piedade - ${new Date(domingo + "T00:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}`;

    // Verificar se ja existe
    const { data: existentes } = await supabase
      .from("conteudos")
      .select("id")
      .eq("title", titulo)
      .eq("tipo", "aviso");

    if (existentes && existentes.length > 0) continue; // ja existe

    const { error: errIns } = await supabase.from("conteudos").insert({
      tipo: "aviso",
      title: titulo,
      descricao: `Hora de Piedade amanha, domingo as 15h00. Nao faltes!`,
      data_publicacao: sabado,
      data_acontecimento: domingo,
      estado: "pendente",
    });

    if (!errIns) criados++;
  }

  res.status(201).json({
    evento,
    avisos_gerados: criados,
    total_domingos: domingos.length,
    proximas_datas: domingos,
  });
});

// DELETE /api/eventos-recorrentes/:id - Remover
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("eventos_recorrentes")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
