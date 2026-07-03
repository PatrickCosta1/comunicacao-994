import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Conteudo, Equipa } from "../types";

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}
function hojeISO() { return new Date().toISOString().split("T")[0]; }

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

  // Urgência: itens com data_publicacao passada e não publicados (excluir feriados passados)
  const atrasados = conteudos.filter(
    (c) => c.data_publicacao && c.data_publicacao < hoje && c.estado !== "publicado"
      && !(c.tipo === "feriado")
  ).sort((a, b) => (a.data_publicacao || "").localeCompare(b.data_publicacao || ""));

  // Vencem hoje (excluir feriados)
  const vencemHoje = conteudos.filter(
    (c) => c.data_publicacao === hoje && c.estado !== "publicado"
      && c.tipo !== "feriado"
  );

  // Esta semana (inclui vencidos)
  const inicioSemana = new Date(hojeDate);
  inicioSemana.setDate(hojeDate.getDate() - hojeDate.getDay() + 1);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const atvSemana = conteudos.filter((c) => {
    if (!c.date_start) return false;
    const d = new Date(c.date_start);
    return d >= inicioSemana && d <= fimSemana && c.estado !== "publicado";
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        {atrasados.length > 0 && (
          <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse">
            {atrasados.length} atrasado{atrasados.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Cards — 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${atrasados.length > 0 ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1">🔴 Atrasados</p>
          <p className={`text-xl sm:text-3xl font-bold ${atrasados.length > 0 ? "text-red-600" : "text-gray-400"}`}>{atrasados.length}</p>
          <p className="text-[10px] sm:text-xs mt-1 text-gray-400 truncate">{atrasados.length > 0 ? "Urgente!" : "Tudo em dia 👍"}</p>
        </div>
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${vencemHoje.length > 0 ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1">🟡 Hoje</p>
          <p className={`text-xl sm:text-3xl font-bold ${vencemHoje.length > 0 ? "text-amber-600" : "text-gray-400"}`}>{vencemHoje.length}</p>
          <p className="text-[10px] sm:text-xs mt-1 text-gray-400 truncate">{vencemHoje.length > 0 ? "Publicar hoje!" : "Nada hoje"}</p>
        </div>
        <Card title="📱 Pendentes" value={(atrasados.length + vencemHoje.length + conteudos.filter(c => c.data_publicacao && c.data_publicacao > hoje && c.estado !== "publicado").length).toString()} subtitle="Futuras" color="bg-blue-50 border-blue-200" />
        <div className="rounded-xl sm:rounded-2xl border p-3 sm:p-5 bg-scout-50 border-scout-200">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1">✅ Cumprimento</p>
          <p className="text-xl sm:text-3xl font-bold text-scout-700">{totalPublicados > 0 ? Math.round(totalPontuais / totalPublicados * 100) : 0}%</p>
          <p className="text-[10px] sm:text-xs mt-1 text-gray-400 truncate">{totalPontuais}/{totalPublicados} a tempo</p>
        </div>
      </div>

      {/* Secção de Urgência - Atrasados */}
      {atrasados.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-red-200 p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-red-700 mb-3">🔴 Atrasadas</h2>
          <div className="space-y-2">
            {atrasados.map((c) => {
              const dias = daysBetween(hojeDate, new Date(c.data_publicacao + "T00:00:00"));
              return (
                <div key={c.id} className="flex items-center gap-3 py-2 px-3 bg-red-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 truncate">{c.title}</p>
                    <p className="text-xs text-red-500 truncate">
                      {c.tipo} · {new Date(c.data_publicacao + "T00:00:00").toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold px-3 py-1 bg-red-200 text-red-700 rounded-full">
                    {Math.abs(dias)}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vencem Hoje */}
      {vencemHoje.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-amber-200 p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-amber-700 mb-3">🟡 Hoje</h2>
          <div className="space-y-2">
            {vencemHoje.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 px-3 bg-amber-50 rounded-xl">
                <p className="flex-1 text-sm font-medium text-amber-800 truncate">{c.title}</p>
                <span className="shrink-0 text-xs font-bold px-3 py-1 bg-amber-200 text-amber-700 rounded-full">Hoje</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atividades da Semana */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">📅 Atividades</h2>
        {atvSemana.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma esta semana.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {atvSemana.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5">
                <p className="text-sm font-medium text-gray-700 truncate">{c.title}</p>
                <span className="shrink-0 text-xs text-gray-400 ml-2">
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
    <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${color} hover:shadow-md transition-all duration-200`}>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1">{title}</p>
      <p className="text-xl sm:text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-[10px] sm:text-xs mt-1 text-gray-400 truncate">{subtitle}</p>
    </div>
  );
}
