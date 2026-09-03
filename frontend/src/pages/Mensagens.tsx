import { useEffect, useState } from "react";

const API = "/api";

type Secao = {
  tipo: string;
  titulo: string;
  emoji: string;
  ativo: boolean;
  negrito?: boolean;
  pubPrefix?: boolean;
  usarDateStart?: boolean;
};

type MensagemConfig = {
  saudacao: string;
  cabecalho: string;
  despedida: string;
  seccoes: Secao[];
};

const DEFAULT_CONFIG: MensagemConfig = {
  saudacao: "Bom dia a todos! 🙌",
  cabecalho: "Relativamente ao plano semanal de {data}:",
  despedida: "Boa semana a todos! 🚀",
  seccoes: [
    { tipo: "atividade", titulo: "Atividades", emoji: "📅", ativo: true, usarDateStart: true },
    { tipo: "video", titulo: "Vídeos da Semana", emoji: "🎥", negrito: true, ativo: true },
    { tipo: "feriado", titulo: "Feriados", emoji: "🎉", pubPrefix: false, ativo: true },
    { tipo: "aviso", titulo: "Avisos", emoji: "📢", ativo: true },
    { tipo: "quiz", titulo: "Quizzes", emoji: "❓", negrito: true, ativo: true },
    { tipo: "pensamento", titulo: "Pensamento do Fundador", emoji: "💭", ativo: true },
  ],
};

export default function Mensagens() {
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Config
  const [config, setConfig] = useState<MensagemConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configStatus, setConfigStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch(`${API}/mensagens/config`);
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data, seccoes: data.seccoes?.length ? data.seccoes : DEFAULT_CONFIG.seccoes });
    } catch {
      setConfig(DEFAULT_CONFIG);
    }
    setConfigLoading(false);
  };

  const gerarSemanal = async () => {
    setLoading(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`${API}/mensagens/semanal`);
      const data = await res.json();
      setMensagem(data.mensagem);
    } catch {
      setMensagem("Erro ao gerar mensagem. Verifica se o backend está a correr.");
    }
    setLoading(false);
  };

  const enviarEmail = async () => {
    setEmailStatus(null);
    try {
      const res = await fetch(`${API}/mensagens/enviar-email`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setEmailStatus({ ok: true, msg: "✅ Email enviado com sucesso!" });
      } else {
        setEmailStatus({ ok: false, msg: `❌ ${data.error || "Erro desconhecido"}` });
      }
    } catch {
      setEmailStatus({ ok: false, msg: "❌ Erro de ligação ao servidor." });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert("Não foi possível copiar.");
    }
  };

  const guardarConfig = async () => {
    if (!config) return;
    setConfigStatus(null);
    try {
      const res = await fetch(`${API}/mensagens/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.error) {
        setConfigStatus({ ok: false, msg: `❌ ${data.error}` });
      } else {
        setConfigStatus({ ok: true, msg: "✅ Configuração guardada!" });
      }
    } catch {
      setConfigStatus({ ok: false, msg: "❌ Erro ao guardar configuração." });
    }
  };

  const updateSecao = (tipo: string, patch: Partial<Secao>) => {
    if (!config) return;
    setConfig({
      ...config,
      seccoes: config.seccoes.map((s) => (s.tipo === tipo ? { ...s, ...patch } : s)),
    });
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none transition-shadow";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💬 Mensagens</h1>
        <p className="text-gray-500 mt-1">Gera a mensagem semanal e envia por email.</p>
      </div>

      {/* Personalizar Mensagem */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <span className="font-semibold text-gray-800">🎛️ Personalizar Mensagem</span>
          <span className="text-gray-400 text-sm">{configOpen ? "▲" : "▼"}</span>
        </button>

        {configOpen && (
          <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">
            {configLoading ? (
              <p className="text-sm text-gray-400">A carregar configuração...</p>
            ) : config ? (
              <>
                {/* Textos fixos */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Saudação</label>
                  <input
                    className={inputCls}
                    value={config.saudacao}
                    onChange={(e) => setConfig({ ...config, saudacao: e.target.value })}
                    placeholder="Bom dia a todos! 🙌"
                  />

                  <label className="block text-sm font-semibold text-gray-700">Cabeçalho (usa {"{data}"} para a data)</label>
                  <input
                    className={inputCls}
                    value={config.cabecalho}
                    onChange={(e) => setConfig({ ...config, cabecalho: e.target.value })}
                    placeholder="Relativamente ao plano semanal de {data}:"
                  />

                  <label className="block text-sm font-semibold text-gray-700">Despedida</label>
                  <input
                    className={inputCls}
                    value={config.despedida}
                    onChange={(e) => setConfig({ ...config, despedida: e.target.value })}
                    placeholder="Boa semana a todos! 🚀"
                  />
                </div>

                {/* Secções (departamentos) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Secções / Departamentos</h3>
                  <div className="space-y-2">
                    {config.seccoes.map((s) => (
                      <div key={s.tipo} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={s.ativo}
                            onChange={(e) => updateSecao(s.tipo, { ativo: e.target.checked })}
                            className="w-4 h-4 accent-scout-600"
                          />
                          <span className={`text-lg ${s.ativo ? "" : "opacity-40 grayscale"}`}>{s.emoji}</span>
                        </label>
                        <input
                          className={`flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none transition-shadow ${s.ativo ? "" : "opacity-60"}`}
                          value={s.titulo}
                          onChange={(e) => updateSecao(s.tipo, { titulo: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Desliga uma secção para ela não aparecer na mensagem semanal.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={guardarConfig}
                    className="px-5 py-2.5 bg-scout-600 text-white rounded-lg text-sm font-medium hover:bg-scout-700 transition-colors"
                  >
                    💾 Guardar Configuração
                  </button>
                  {configStatus && (
                    <span className={`text-sm ${configStatus.ok ? "text-green-600" : "text-red-600"}`}>{configStatus.msg}</span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-red-500">Erro ao carregar configuração.</p>
            )}
          </div>
        )}
      </div>

      {/* Gerar Mensagem Semanal */}
      <div className="bg-gradient-to-r from-scout-50 to-blue-50 border border-scout-200 rounded-xl p-6">
        <h2 className="font-semibold text-scout-800 mb-2">📋 Mensagem Semanal</h2>
        <p className="text-sm text-gray-600 mb-4">
          Gera automaticamente a mensagem com as atividades, equipas responsáveis e publicações da semana.
        </p>
        <button
          onClick={gerarSemanal}
          disabled={loading}
          className="px-6 py-3 bg-scout-600 text-white rounded-lg text-sm font-medium hover:bg-scout-700 transition-colors disabled:opacity-50"
        >
          {loading ? "⏳ A gerar..." : "📋 Gerar Mensagem Semanal"}
        </button>
      </div>

      {/* Mensagem gerada */}
      {mensagem && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800">📤 Mensagem Gerada</h3>
            <button
              onClick={copyToClipboard}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${copiado ? "bg-green-100 text-green-700" : "bg-scout-100 text-scout-700 hover:bg-scout-200"}`}
            >
              {copiado ? "✅ Copiado!" : "📋 Copiar"}
            </button>
          </div>
          <pre className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap font-sans text-gray-700 border border-gray-100">
            {mensagem}
          </pre>

          <div className="flex gap-3 pt-2">
            <button
              onClick={enviarEmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              📧 Enviar Email Agora
            </button>
            <button
              onClick={gerarSemanal}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              🔄 Regenerar
            </button>
          </div>

          {emailStatus && (
            <div className={`text-sm px-3 py-2 rounded-lg ${emailStatus.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {emailStatus.msg}
            </div>
          )}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-700">
          💡 O email é enviado automaticamente à segunda-feira às 8h (cronjob). Podes também enviar manualmente aqui.
        </p>
      </div>
    </div>
  );
}
