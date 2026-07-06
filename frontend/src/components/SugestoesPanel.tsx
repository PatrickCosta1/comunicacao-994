import { useEffect, useState, useCallback } from "react";

export interface Sugestao {
  id: string;
  tipo: "urgencia" | "acao" | "info" | "lembrete";
  icon: string;
  mensagem: string;
  acao?: { label: string; metodo: "POST" | "PATCH" | "DELETE" | "GET"; url: string; body?: Record<string, any> };
  link?: { label: string; to: string };
  dismissivel?: boolean;
}

const API = "/api";

const CORES: Record<string, { bg: string; borda: string; dot: string; btn: string }> = {
  urgencia: { bg: "bg-red-50", borda: "border-red-200", dot: "bg-red-500", btn: "bg-red-600 hover:bg-red-700 text-white" },
  acao:     { bg: "bg-blue-50", borda: "border-blue-200", dot: "bg-blue-500", btn: "bg-blue-600 hover:bg-blue-700 text-white" },
  info:     { bg: "bg-gray-50", borda: "border-gray-200", dot: "bg-gray-400", btn: "bg-gray-600 hover:bg-gray-700 text-white" },
  lembrete: { bg: "bg-amber-50", borda: "border-amber-200", dot: "bg-amber-500", btn: "bg-amber-600 hover:bg-amber-700 text-white" },
};

function SugestaoCard({ s, onExec, onDismiss, executando }: {
  s: Sugestao; onExec: (s: Sugestao) => void; onDismiss: (id: string) => void; executando: boolean;
}) {
  const c = CORES[s.tipo] || CORES.info;

  return (
    <div className={`${c.bg} ${c.borda} border rounded-xl p-4 transition-all duration-300 animate-slide-up`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{s.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">{s.mensagem}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {s.acao && (
              <button onClick={() => onExec(s)} disabled={executando}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${c.btn} disabled:opacity-50`}>
                {executando ? "⏳..." : s.acao.label}
              </button>
            )}
            {s.link && (
              <a href={s.link.to}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                {s.link.label} →
              </a>
            )}
            {s.dismissivel && (
              <button onClick={() => onDismiss(s.id)}
                className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SugestoesPanel() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [executando, setExecutando] = useState<string | null>(null);
  const [minimizado, setMinimizado] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const fetchSugestoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/sugestoes`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const descartados = JSON.parse(sessionStorage.getItem("sugestoes-descartadas") || "[]");
        setSugestoes(data.filter((s: any) => !descartados.includes(s.id)));
      }
    } catch { /* silêncio */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSugestoes(); }, [fetchSugestoes]);

  const executar = async (s: Sugestao) => {
    if (!s.acao) return;
    setExecutando(s.id);
    try {
      const res = await fetch(s.acao.url, {
        method: s.acao.metodo,
        headers: { "Content-Type": "application/json" },
        body: s.acao.body ? JSON.stringify(s.acao.body) : undefined,
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ id: s.id, ok: true, msg: "✅ " + (data.success ? "Feito!" : data.mensagem || "Sucesso!") });
        setTimeout(() => setFeedback(null), 3000);
        fetchSugestoes();
      } else {
        setFeedback({ id: s.id, ok: false, msg: "❌ " + (data.error || "Erro") });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      setFeedback({ id: s.id, ok: false, msg: "❌ Erro de ligação" });
      setTimeout(() => setFeedback(null), 4000);
    }
    setExecutando(null);
  };

  const dismiss = (id: string) => {
    const descartadas = JSON.parse(sessionStorage.getItem("sugestoes-descartadas") || "[]");
    descartadas.push(id);
    sessionStorage.setItem("sugestoes-descartadas", JSON.stringify(descartadas));
    setSugestoes((prev) => prev.filter((s) => s.id !== id));
  };

  const urgencias = sugestoes.filter((s) => s.tipo === "urgencia");
  const outras = sugestoes.filter((s) => s.tipo !== "urgencia");

  if (loading && sugestoes.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Feedback toast */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-up ${feedback.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {feedback.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMinimizado(!minimizado)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          <span className="text-lg">{minimizado ? "▶" : "▼"}</span>
          Sugestões Inteligentes
          {urgencias.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full animate-pulse">
              {urgencias.length} urgente{urgencias.length > 1 ? "s" : ""}
            </span>
          )}
        </button>
        <button onClick={fetchSugestoes} className="text-xs text-gray-400 hover:text-gray-600 transition-colors" title="Atualizar">
          🔄
        </button>
      </div>

      {!minimizado && (
        <div className="space-y-2">
          {sugestoes.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
              ✅ Tudo em ordem! Nenhuma ação necessária.
            </div>
          ) : (
            <>
              {urgencias.map((s) => (
                <SugestaoCard key={s.id} s={s} onExec={executar} onDismiss={dismiss} executando={executando === s.id} />
              ))}
              {outras.map((s) => (
                <SugestaoCard key={s.id} s={s} onExec={executar} onDismiss={dismiss} executando={executando === s.id} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
