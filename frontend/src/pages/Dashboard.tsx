import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Conteudo, Equipa } from "../types";

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function Dashboard() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [equipas, setEquipas] = useState<Equipa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [ctRes, eqRes] = await Promise.all([
        supabase.from("conteudos").select("*").order("created_at", { ascending: false }),
        supabase.from("equipas").select("*, membros(*)").order("created_at"),
      ]);
      if (ctRes.data) setConteudos(ctRes.data);
      if (eqRes.data) setEquipas(eqRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const hoje = hojeISO();
  const hojeDate = new Date();

  // Urgência: itens com data_publicacao passada e não publicados
  const atrasados = conteudos.filter(
    (c) => c.data_publicacao && c.data_publicacao < hoje && c.estado !== "publicado" && c.estado !== "concluido"
  ).sort((a, b) => (a.data_publicacao || "").localeCompare(b.data_publicacao || ""));

  // Vencem hoje
  const vencemHoje = conteudos.filter(
    (c) => c.data_publicacao === hoje && c.estado !== "publicado" && c.estado !== "concluido"
  );

  // Esta semana (inclui vencidos)
  const inicioSemana = new Date(hojeDate);
  inicioSemana.setDate(hojeDate.getDate() - hojeDate.getDay() + 1);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const atvSemana = conteudos.filter((c) => {
    if (!c.date_start) return false;
    const d = new Date(c.date_start);
    return d >= inicioSemana && d <= fimSemana && c.estado !== "concluido";
  });

  // Cumprimento por equipa (últimos 30 dias)
  const trintaDiasAtras = new Date(hojeDate);
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const publicadosRecentes = conteudos.filter(
    (c) => c.published_at && new Date(c.published_at) >= trintaDiasAtras
  );

  const pontuais = publicadosRecentes.filter(
    (c) => c.data_publicacao && c.published_at && new Date(c.published_at) <= new Date(c.data_publicacao + "T23:59:59")
  ).length;

  const atrasadosPub = publicadosRecentes.length - pontuais;

  const totalPublicados = conteudos.filter((c) => c.estado === "publicado").length;
  const totalPontuais = conteudos.filter(
    (c) => c.estado === "publicado" && c.data_publicacao && c.published_at &&
      new Date(c.published_at) <= new Date(c.data_publicacao + "T23:59:59")
  ).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">A carregar...</p></div>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="text-gray-500 mt-1">O que precisa da tua atenção agora.</p>
      </div>

      {/* Cards de urgência */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-5 ${atrasados.length > 0 ? "bg-red-50 border-red-300 animate-pulse" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">🔴 Atrasados</p>
          <p className={`text-3xl font-bold ${atrasados.length > 0 ? "text-red-600" : "text-gray-400"}`}>{atrasados.length}</p>
          <p className="text-xs mt-1.5 text-gray-400">{atrasados.length > 0 ? "Precisam de ação urgente!" : "Nenhum atrasado 👍"}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${vencemHoje.length > 0 ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">🟡 Vencem Hoje</p>
          <p className={`text-3xl font-bold ${vencemHoje.length > 0 ? "text-amber-600" : "text-gray-400"}`}>{vencemHoje.length}</p>
          <p className="text-xs mt-1.5 text-gray-400">{vencemHoje.length > 0 ? "Publicar ainda hoje!" : "Nada para hoje"}</p>
        </div>
        <Card title="Publicações Pendentes" value={(atrasados.length + vencemHoje.length + conteudos.filter(c => c.data_publicacao && c.data_publicacao > hoje && c.estado !== "publicado").length).toString()} subtitle="Futuras" color="bg-blue-50 border-blue-200" />
        <div className="rounded-2xl border p-5 bg-scout-50 border-scout-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">✅ Cumprimento</p>
          <p className="text-3xl font-bold text-scout-700">{totalPublicados > 0 ? Math.round(totalPontuais / totalPublicados * 100) : 0}%</p>
          <p className="text-xs mt-1.5 text-gray-400">{totalPontuais}/{totalPublicados} publicações a tempo</p>
        </div>
      </div>

      {/* Secção de Urgência - Atrasados */}
      {atrasados.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-red-200 p-5 shadow-lg">
          <h2 className="font-semibold text-red-700 mb-3">🔴 Publicações Atrasadas</h2>
          <div className="space-y-2">
            {atrasados.map((c) => {
              const dias = daysBetween(hojeDate, new Date(c.data_publicacao + "T00:00:00"));
              return (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-red-800">{c.title}</p>
                    <p className="text-xs text-red-500">
                      {c.tipo} · Devia: {new Date(c.data_publicacao + "T00:00:00").toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-red-200 text-red-700 rounded-full">
                    {Math.abs(dias)} dias atrasado
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vencem Hoje */}
      {vencemHoje.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-5">
          <h2 className="font-semibold text-amber-700 mb-3">🟡 Publicam Hoje</h2>
          <div className="space-y-2">
            {vencemHoje.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-xl">
                <p className="text-sm font-medium text-amber-800">{c.title}</p>
                <span className="text-xs font-bold px-3 py-1 bg-amber-200 text-amber-700 rounded-full">Vence hoje</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atividades da Semana */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">📅 Atividades desta Semana</h2>
        {atvSemana.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma atividade esta semana.</p>
        ) : (
          <div className="space-y-2">
            {atvSemana.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium text-gray-700">{c.title}</p>
                <span className="text-xs text-gray-400">
                  {c.date_start && new Date(c.date_start).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" })}
                </span>
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
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-xs mt-1.5 text-gray-400">{subtitle}</p>
    </div>
  );
}
