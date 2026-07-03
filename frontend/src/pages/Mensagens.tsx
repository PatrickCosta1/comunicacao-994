import { useState } from "react";

const API = "/api";

export default function Mensagens() {
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(false);

  const gerarSemanal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/mensagens/semanal`);
      const data = await res.json();
      setMensagem(data.mensagem);
    } catch {
      setMensagem("Erro ao gerar mensagem. Verifica se o backend está a correr.");
    }
    setLoading(false);
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💬 Mensagens</h1>
        <p className="text-gray-500 mt-1">Gera a mensagem semanal para o grupo de WhatsApp.</p>
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
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-700">
          💡 Cola esta mensagem no grupo principal do WhatsApp à segunda-feira de manhã.
        </p>
      </div>
    </div>
  );
}
