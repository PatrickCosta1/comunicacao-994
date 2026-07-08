import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import SuggestionBanner from "../components/SuggestionBanner";
import { hojeISO, daysBetween } from "../lib/utils";
import type { Conteudo, Equipa } from "../types";

const API = "/api";

export default function Dashboard() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [equipas, setEquipas] = useState<Equipa[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicando, setPublicando] = useState<string | null>(null);
  const [dismissBulk, setDismissBulk] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [ctRes, eqRes] = await Promise.all([
      supabase.from("conteudos").select("*, conteudos_equipas(equipa_id, equipas(id, nome, membros(nome)))").order("created_at", { ascending: false }),
      supabase.from("equipas").select("*, membros(*)").order("created_at"),
    ]);
    if (ctRes.data) setConteudos(ctRes.data);
    if (eqRes.data) setEquipas(eqRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const marcarPublicado = async (id: string, titulo: string) => {
    setPublicando(id);
    try {
      const res = await fetch(`${API}/conteudos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "publicado" }),
      });
      if (!res.ok) throw new Error();
      toast({ tipo: "success", titulo: `✅ "${titulo}" publicado!` });
      fetchData();
    } catch {
      toast({ tipo: "error", titulo: "Erro ao publicar", mensagem: `Não foi possível publicar "${titulo}"` });
    }
    setPublicando(null);
  };

  const marcarTodosAtrasados = async () => {
    for (const c of atrasados) {
      await fetch(`${API}/conteudos/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "publicado" }),
      });
    }
    toast({ tipo: "success", titulo: `✅ ${atrasados.length} conteúdos marcados como publicados!` });
    fetchData();
  };

  const hoje = hojeISO();
  const hojeDate = new Date();

  const atrasados = conteudos.filter(
    (c) => c.data_publicacao && c.data_publicacao < hoje && c.estado !== "publicado"
      && !(c.tipo === "feriado")
  ).sort((a, b) => (a.data_publicacao || "").localeCompare(b.data_publicacao || ""));

  const vencemHoje = conteudos.filter(
    (c) => c.data_publicacao === hoje && c.estado !== "publicado"
      && c.tipo !== "feriado"
  );

  const inicioSemana = new Date(hojeDate);
  inicioSemana.setDate(hojeDate.getDate() - hojeDate.getDay() + 1);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const atvSemana = conteudos.filter((c) => {
    if (!c.date_start) return false;
    const d = new Date(c.date_start);
    return d >= inicioSemana && d <= fimSemana && c.estado !== "publicado";
  });

  const trintaDiasAtras = new Date(hojeDate);
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const publicadosRecentes = conteudos.filter(
    (c) => c.published_at && new Date(c.published_at) >= trintaDiasAtras
  );

  const totalPublicados = conteudos.filter((c) => c.estado === "publicado").length;
  const totalPontuais = conteudos.filter(
    (c) => c.estado === "publicado" && c.data_publicacao && c.published_at &&
      new Date(c.published_at) <= new Date(c.data_publicacao + "T23:59:59")
  ).length;

  // Próximos 7 dias
  const fim7 = new Date(hojeDate);
  fim7.setDate(fim7.getDate() + 7);
  const proximos7 = conteudos
    .filter((c) => {
      if (c.estado === "publicado") return false;
      if (!c.data_publicacao) return false;
      const d = new Date(c.data_publicacao + "T00:00:00");
      return d >= hojeDate && d <= fim7;
    })
    .sort((a, b) => (a.data_publicacao || "").localeCompare(b.data_publicacao || ""));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">⏳ A carregar...</p></div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        {atrasados.length > 0 && (
          <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse">
            {atrasados.length} atrasado{atrasados.length > 1 ? "s" : ""}
          </span>
        )}
        <button onClick={fetchData} className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors" title="Atualizar">
          🔄
        </button>
      </div>

      {/* Sugestão bulk */}
      {atrasados.length >= 2 && !dismissBulk && (
        <SuggestionBanner
          tipo="atrasado"
          titulo={`${atrasados.length} conteúdos por publicar`}
          descricao={`${atrasados.length} itens estão atrasados. Queres marcar todos como publicados de uma vez?`}
          botoes={[
            { label: `✅ Marcar ${atrasados.length} como publicados`, onClick: marcarTodosAtrasados },
            { label: "Ignorar", onClick: () => setDismissBulk(true), variant: "secondary" },
          ]}
          onDismiss={() => setDismissBulk(true)}
        />
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all duration-200 hover:shadow-md ${atrasados.length > 0 ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1">🔴 Atrasados</p>
          <p className={`text-xl sm:text-3xl font-bold ${atrasados.length > 0 ? "text-red-600" : "text-gray-400"}`}>{atrasados.length}</p>
          <p className="text-[10px] sm:text-xs mt-1 text-gray-400 truncate">{atrasados.length > 0 ? "Urgente!" : "Tudo em dia 👍"}</p>
        </div>
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all duration-200 hover:shadow-md ${vencemHoje.length > 0 ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1">🟡 Hoje</p>
          <p className={`text-xl sm:text-3xl font-bold ${vencemHoje.length > 0 ? "text-amber-600" : "text-gray-400"}`}>{vencemHoje.length}</p>
          <p className="text-[10px] sm:text-xs mt-1 text-gray-400 truncate">{vencemHoje.length > 0 ? "Publicar hoje!" : "Nada hoje"}</p>
        </div>
        <Card title="📱 Pendentes" value={conteudos.filter(c => c.estado !== "publicado" && c.tipo !== "feriado").length.toString()} subtitle="Total pendentes" color="bg-blue-50 border-blue-200" />
        <div className="rounded-xl sm:rounded-2xl border p-3 sm:p-5 bg-scout-50 border-scout-200 transition-all duration-200 hover:shadow-md">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1">✅ Cumprimento</p>
          <p className="text-xl sm:text-3xl font-bold text-scout-700">{totalPublicados > 0 ? Math.round(totalPontuais / totalPublicados * 100) : 0}%</p>
          <p className="text-[10px] sm:text-xs mt-1 text-gray-400 truncate">{totalPontuais}/{totalPublicados} a tempo</p>
        </div>
      </div>

      {/* Atrasados com botão publicar */}
      {atrasados.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-red-200 p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
            🔴 Atrasados
            <span className="text-xs font-normal text-gray-400">— clica em ✅ para publicar</span>
          </h2>
          <div className="space-y-2">
            {atrasados.map((c) => {
              const dias = daysBetween(hojeDate, new Date(c.data_publicacao + "T00:00:00"));
              return (
                <div key={c.id} className="flex items-center gap-3 py-2 px-3 bg-red-50 rounded-xl group hover:bg-red-100 transition-colors">
                  <button
                    onClick={() => marcarPublicado(c.id, c.title)}
                    disabled={publicando === c.id}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-200 text-red-600 opacity-60 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 hover:bg-red-300 hover:text-red-700 transition-all disabled:opacity-50 text-sm"
                    title="Marcar como publicado"
                  >
                    {publicando === c.id ? "⏳" : "✅"}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 truncate">{c.title}</p>
                    <p className="text-xs text-red-500 truncate">
                      {c.tipo} · {new Date(c.data_publicacao + "T00:00:00").toLocaleDateString("pt-PT")}
                      {c.equipas_responsaveis?.length > 0 && ` · ${c.equipas_responsaveis.map(e => e.nome).join(", ")}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold px-3 py-1 bg-red-200 text-red-700 rounded-full">
                    {Math.abs(dias)}d atrasado
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vencem Hoje com botão publicar */}
      {vencemHoje.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-amber-200 p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-amber-700 mb-3 flex items-center gap-2">
            🟡 Vencem Hoje
            <span className="text-xs font-normal text-gray-400">— publicar urgente</span>
          </h2>
          <div className="space-y-2">
            {vencemHoje.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 px-3 bg-amber-50 rounded-xl group hover:bg-amber-100 transition-colors">
                <button
                  onClick={() => marcarPublicado(c.id, c.title)}
                  disabled={publicando === c.id}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-200 text-amber-600 opacity-60 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 hover:bg-amber-300 hover:text-amber-700 transition-all disabled:opacity-50 text-sm"
                >
                  {publicando === c.id ? "⏳" : "✅"}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 truncate">{c.title}</p>
                  <p className="text-xs text-amber-500 truncate">{c.tipo}</p>
                </div>
                <span className="shrink-0 text-xs font-bold px-3 py-1 bg-amber-200 text-amber-700 rounded-full animate-pulse-soft">Hoje!</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos 7 dias — publicações e feriados */}
      {proximos7.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-semibold text-blue-700 mb-3">📅 Próximos 7 Dias</h2>
          <div className="divide-y divide-blue-50">
            {proximos7.map((c) => {
              const d = c.data_publicacao ? new Date(c.data_publicacao + "T00:00:00") : null;
              const hojeData = new Date();
              const diff = d ? Math.ceil((d.getTime() - hojeData.getTime()) / (1000*60*60*24)) : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${diff <= 1 ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
                    {diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : `${d?.toLocaleDateString("pt-PT", { weekday: "short" })}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.tipo === "feriado" ? "🎉 Feriado" : `📱 Publicar ${d?.toLocaleDateString("pt-PT")}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Atividades da Semana */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">📅 Atividades da Semana</h2>
        {atvSemana.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma atividade esta semana.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {atvSemana.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{c.title}</p>
                  {c.local && <p className="text-xs text-gray-400 truncate">📍 {c.local}</p>}
                </div>
                <span className="shrink-0 text-xs text-gray-400 ml-2">
                  {c.date_start && new Date(c.date_start).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })}
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
