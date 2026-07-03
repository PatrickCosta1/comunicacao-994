import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Conteudo, Equipa } from "../types";

export default function Dashboard() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [equipas, setEquipas] = useState<Equipa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [ctRes, eqRes] = await Promise.all([
        supabase.from("conteudos").select("*").neq("estado", "concluido").order("created_at", { ascending: false }),
        supabase.from("equipas").select("*, membros(*)").order("created_at"),
      ]);
      if (ctRes.data) setConteudos(ctRes.data);
      if (eqRes.data) setEquipas(eqRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const atvSemana = conteudos.filter((c) => {
    if (!c.date_start) return false;
    const d = new Date(c.date_start);
    return d >= inicioSemana && d <= fimSemana;
  });

  const pubsPendentes = conteudos.filter(
    (c) => c.data_publicacao && c.estado !== "publicado"
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">A carregar...</p></div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral da semana.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Conteúdos Ativos" value={conteudos.length.toString()} subtitle={`${atvSemana.length} esta semana`} color="bg-amber-50 border-amber-200" />
        <Card title="Equipas" value={equipas.length.toString()} subtitle={`${equipas.reduce((a, e) => a + (e.membros?.length || 0), 0)} membros`} color="bg-blue-50 border-blue-200" />
        <Card title="Publicações Pendentes" value={pubsPendentes.length.toString()} subtitle="Precisam de atenção" color="bg-purple-50 border-purple-200" />
      </div>

      {/* Conteúdos da Semana */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">📅 Conteúdos desta Semana</h2>
        {atvSemana.length === 0 && pubsPendentes.length === 0 ? (
          <p className="text-sm text-gray-400">Nada agendado para esta semana.</p>
        ) : (
          <div className="space-y-2">
            {atvSemana.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{c.title}</p>
                  <p className="text-xs text-gray-400">
                    {c.date_start && new Date(c.date_start).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })}
                    {c.local && ` · ${c.local}`}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                  {c.tipo === "atividade" ? "📅 Atividade" : c.tipo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximas Publicações */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">📱 Próximas Publicações</h2>
        {pubsPendentes.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma publicação pendente.</p>
        ) : (
          <div className="space-y-2">
            {pubsPendentes
              .sort((a, b) => (a.data_publicacao || "").localeCompare(b.data_publicacao || ""))
              .map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm text-gray-700">
                    {c.title} - <span className="text-gray-400">{c.data_publicacao ? new Date(c.data_publicacao).toLocaleDateString("pt-PT") : "?"}</span>
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${color} hover:shadow-lg transition-all duration-200`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-xs mt-1.5 text-gray-400">{subtitle}</p>
    </div>
  );
}
