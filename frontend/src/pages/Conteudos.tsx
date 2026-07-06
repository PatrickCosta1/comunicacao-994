import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import type { Conteudo, TipoConteudo, Equipa } from "../types";

const API = "/api";

const TABS: { tipo: TipoConteudo; label: string; icon: string; btnLabel: string }[] = [
  { tipo: "atividade", label: "Atividades", icon: "📅", btnLabel: "📅 Nova Atividade" },
  { tipo: "video", label: "Vídeos", icon: "🎥", btnLabel: "🎥 Novo Vídeo" },
  { tipo: "aviso", label: "Avisos", icon: "📢", btnLabel: "📢 Novo Aviso" },
  { tipo: "quiz", label: "Quizzes", icon: "❓", btnLabel: "❓ Novo Quiz" },
  { tipo: "pensamento", label: "Pensamentos", icon: "💭", btnLabel: "💭 Novo Pensamento" },
];

const SECCOES = ["Lobitos", "Exploradores", "Pioneiros", "Caminheiros", "Agrupamento"];

function getNextThursday(): string {
  const hoje = new Date();
  const dia = hoje.getDay();
  const diff = dia <= 4 ? 4 - dia : 4 + 7 - dia;
  const next = new Date(hoje);
  next.setDate(hoje.getDate() + diff);
  return next.toISOString().split("T")[0];
}

function getTituloPorTipo(tipo: TipoConteudo): string {
  const t = TABS.find((t) => t.tipo === tipo);
  return t ? `${t.icon} ${t.label}` : tipo;
}

export default function Conteudos() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [equipas, setEquipas] = useState<Equipa[]>([]);
  const [activeTab, setActiveTab] = useState<TipoConteudo>("atividade");
  const [showModal, setShowModal] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchConteudos();
    supabase.from("equipas").select("*").order("created_at").then((r) => {
      if (r.data) setEquipas(r.data);
    });
  }, []);

  const fetchConteudos = async () => {
    setLoading(true);
    setErro("");
    const { data, error } = await supabase
      .from("conteudos")
      .select("*, conteudos_equipas(equipa_id, equipas(id, nome))")
      .order("created_at", { ascending: false });

    if (error) {
      setErro("Erro ao carregar conteúdos: " + error.message);
    } else if (data) {
      const formatted = data.map((c: any) => ({
        ...c,
        equipas_responsaveis: c.conteudos_equipas?.map((ce: any) => ({
          id: ce.equipas?.id,
          nome: ce.equipas?.nome,
        })) || [],
        conteudos_equipas: undefined,
      }));
      setConteudos(formatted);
    }
    setLoading(false);
  };

  const filtered = conteudos.filter((c) => c.tipo === activeTab);

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`Apagar "${titulo}"?`)) return;
    const res = await fetch(`${API}/conteudos/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ tipo: "success", titulo: `🗑️ "${titulo}" apagado` });
      fetchConteudos();
    } else {
      toast({ tipo: "error", titulo: "Erro ao apagar", mensagem: titulo });
    }
  };

  const handleEstado = async (id: string, estado: string, titulo: string) => {
    const res = await fetch(`${API}/conteudos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      toast({ tipo: "success", titulo: estado === "publicado" ? `✅ "${titulo}" publicado!` : `⏳ "${titulo}" pendente` });
      fetchConteudos();
    } else {
      toast({ tipo: "error", titulo: "Erro ao atualizar", mensagem: titulo });
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📋 Conteúdos</h1>

        {/* Botão específico por tab */}
        {activeTab === "aviso" ? (
          <div className="flex gap-2">
            <button onClick={() => setShowModal("hora_piedade")}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-200 transition-all active:scale-[0.98]">
              ⛪ Hora de Piedade
            </button>
            <button onClick={() => setShowModal("aviso_manual")}
              className="px-4 py-2.5 bg-gradient-to-r from-scout-600 to-scout-500 text-white rounded-xl text-sm font-medium hover:from-scout-700 hover:to-scout-600 shadow-lg shadow-scout-200 transition-all active:scale-[0.98]">
              📢 Novo Aviso
            </button>
          </div>
        ) : (
          <button onClick={() => setShowModal("novo")}
            className="px-5 py-2.5 bg-gradient-to-r from-scout-600 to-scout-500 text-white rounded-xl text-sm font-medium hover:from-scout-700 hover:to-scout-600 shadow-lg shadow-scout-200 transition-all active:scale-[0.98]">
            {TABS.find((t) => t.tipo === activeTab)?.btnLabel || "➕ Novo"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-1">
        {TABS.map((tab) => (
          <button key={tab.tipo} onClick={() => { setActiveTab(tab.tipo); setShowModal(false); }}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.tipo
                ? "bg-white text-scout-700 border-b-2 border-scout-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >{tab.icon} {tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400">⏳ A carregar...</p>
        </div>
      ) : erro ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{erro}</div>
      ) : activeTab === "aviso" ? (
        <>
          <HoraPiedadeModal
            open={showModal === "hora_piedade"}
            onClose={() => setShowModal(false)}
            onCreated={fetchConteudos}
          />
          <AvisoManualModal
            open={showModal === "aviso_manual"}
            onClose={() => setShowModal(false)}
            onCreated={fetchConteudos}
          />

          <ListaConteudos items={filtered} onDelete={handleDelete} onEstado={handleEstado} />
        </>
      ) : (
        <>
          <CriarConteudoModal
            tipo={activeTab}
            open={showModal === "novo"}
            onClose={() => setShowModal(false)}
            onCreated={fetchConteudos}
            equipas={equipas}
          />
          <ListaConteudos items={filtered} onDelete={handleDelete} onEstado={handleEstado} />
        </>
      )}
    </div>
  );
}

// ===== Lista de conteudos =====
function ListaConteudos({ items, onDelete, onEstado }: {
  items: Conteudo[];
  onDelete: (id: string, titulo: string) => void;
  onEstado: (id: string, estado: string, titulo: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white/50 rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
        <p className="text-5xl mb-4 opacity-40">📭</p>
        <p className="text-gray-400 font-medium">Nada por aqui ainda</p>
        <p className="text-gray-300 text-sm mt-1">Usa o botao acima para criar o primeiro</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.id} className="group bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-800 text-sm">{c.title}</h3>
                {c.seccoes?.map((s) => (
                  <span key={s} className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>
                ))}
                {c.tipo && (
                  <span className="text-[10px] font-medium bg-scout-50 text-scout-600 px-2 py-0.5 rounded-full">
                    {c.tipo === "atividade" ? "📅" : c.tipo === "video" ? "🎥" : c.tipo === "feriado" ? "🎉" : c.tipo === "aviso" ? "📢" : c.tipo === "quiz" ? "❓" : "💭"} {c.tipo}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5 space-x-2">
                {c.date_start && <span>📅 {new Date(c.date_start).toLocaleDateString("pt-PT")}</span>}
                {c.date_end && c.date_end !== c.date_start && <span>→ {new Date(c.date_end).toLocaleDateString("pt-PT")}</span>}
                {c.data_publicacao && <span className="text-orange-500">📱 {new Date(c.data_publicacao).toLocaleDateString("pt-PT")}</span>}
                {c.hora && <span>🕐 {c.hora}</span>}
                {c.local && <span>📍 {c.local}</span>}
                {c.data_acontecimento && <span className="text-purple-500">📅 Evento: {new Date(c.data_acontecimento).toLocaleDateString("pt-PT")}</span>}
              </p>
              {c.equipas_responsaveis?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.equipas_responsaveis.map((e) => (
                    <span key={e.id} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">{e.nome}</span>
                  ))}
                </div>
              )}
              {c.descricao && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{c.descricao}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
              <select value={c.estado} onChange={(e) => onEstado(c.id, e.target.value, c.title)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-scout-500 outline-none cursor-pointer">
                <option value="pendente">⏳ Pendente</option>
                <option value="publicado">✅ {c.tipo === "atividade" ? "Concluído" : "Publicado"}</option>
              </select>
              <button onClick={() => onDelete(c.id, c.title)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Apagar">🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== SECCAO HORA DE PIEDADE =====
function HoraPiedadeModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [datas, setDatas] = useState<string[]>([]);
  const [inputDate, setInputDate] = useState("");
  const [descricao, setDescricao] = useState("Hora de Piedade amanha, domingo as 15h00. Nao faltes!");
  const [gerando, setGerando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const addDate = () => {
    if (!inputDate || datas.includes(inputDate)) return;
    setDatas((prev) => [...prev, inputDate].sort());
    setInputDate("");
  };

  const removeDate = (d: string) => setDatas((prev) => prev.filter((x) => x !== d));

  const handleGerar = async () => {
    if (datas.length === 0) return;
    setGerando(true); setResultado(null);
    let criados = 0;
    for (const data of datas) {
      const titulo = `⛪ Hora de Piedade - ${new Date(data + "T00:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}`;
      const res = await fetch("/api/conteudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "aviso", title: titulo,
          descricao: descricao,
          data_acontecimento: data,
        }),
      });
      if (res.ok) criados++;
    }
    setResultado(`${criados} avisos criados com sucesso! ✅`);
    if (criados > 0) { setDatas([]); onCreated(); }
    setGerando(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">⛪ Hora de Piedade</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Adiciona as datas e o sistema cria os avisos (publicados no sabado anterior).</p>
          <div className="flex gap-2">
            <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            <button onClick={addDate} disabled={!inputDate}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 disabled:opacity-50 transition-colors">+</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem do aviso</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          {datas.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-3">
              <div className="flex flex-wrap gap-2">
                {datas.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-700 rounded-full text-xs font-medium shadow-sm">
                    {new Date(d + "T00:00:00").toLocaleDateString("pt-PT")}
                    <button onClick={() => removeDate(d)} className="text-purple-400 hover:text-purple-600">x</button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleGerar} disabled={gerando || datas.length === 0}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 shadow-lg shadow-purple-200 transition-all active:scale-[0.98]">
            {gerando ? "A criar..." : `Criar ${datas.length} Aviso${datas.length !== 1 ? "s" : ""}`}
          </button>
          {resultado && <p className="text-sm text-green-600 font-medium text-center">{resultado}</p>}
        </div>
      </div>
    </div>
  );
}

function AvisoManualModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dataEvento) return;
    setSubmitting(true);
    await fetch(`${API}/conteudos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "aviso", title: title.trim(), data_acontecimento: dataEvento }),
    });
    setSubmitting(false);
    onClose(); setTitle(""); setDataEvento("");
    onCreated();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Novo Aviso</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">x</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none" placeholder="Ex: Acampamento neste domingo" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Acontecimento *</label>
            <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none" required />
            <p className="text-xs text-gray-400 mt-1.5">O aviso sera publicado no dia anterior ao evento</p>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-scout-600 to-scout-500 text-white rounded-xl text-sm font-medium hover:from-scout-700 hover:to-scout-600 disabled:opacity-50 shadow-lg shadow-scout-200 transition-all active:scale-[0.98]">
            {submitting ? "A criar..." : "Criar Aviso"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ===== Modal de Criação (genérico para todos os tipos exceto aviso) =====
function CriarConteudoModal({ tipo, open, onClose, onCreated, equipas }: {
  tipo: TipoConteudo;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  equipas: Equipa[];
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [seccoes, setSeccoes] = useState<string[]>([]);
  const [dataPub, setDataPub] = useState("");
  const [selectedEquipas, setSelectedEquipas] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(""); setDesc(""); setDateStart(""); setDateEnd("");
    setHora(""); setLocal(""); setSeccoes([]); setSelectedEquipas([]);
    if (tipo === "pensamento") setDataPub(getNextThursday());
    else setDataPub("");
  }, [open, tipo]);

  const toggleSecao = (s: string) =>
    setSeccoes((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const toggleEquipa = (id: string) =>
    setSelectedEquipas((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);

    const body: any = { tipo, title, descricao: desc };
    if (tipo === "atividade") {
      body.date_start = dateStart;
      body.date_end = dateEnd || dateStart;
      body.hora = hora;
      body.local = local;
      body.seccoes = seccoes;
    } else if (tipo === "video" || tipo === "feriado" || tipo === "quiz") {
      body.data_publicacao = dataPub;
    } else if (tipo === "pensamento") {
      body.data_publicacao = dataPub || getNextThursday();
    }

    if (selectedEquipas.length > 0) body.equipas_ids = selectedEquipas;

    await fetch(`${API}/conteudos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);
    onClose();
    onCreated();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-gray-800">Novo {TABS.find((t) => t.tipo === tipo)?.label}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tipo === "pensamento" ? "Frase do Fundador" : tipo === "aviso" ? "Mensagem do Aviso" : "Título"} *
            </label>
            {tipo === "pensamento" || tipo === "aviso" ? (
              <textarea value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" rows={3} required />
            ) : (
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" required />
            )}
          </div>

          {/* Campos específicos por tipo */}
          {tipo === "atividade" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
                  <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                  <input type="text" value={local} onChange={(e) => setLocal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secções</label>
                <div className="flex flex-wrap gap-2">
                  {SECCOES.map((s) => (
                    <button key={s} type="button" onClick={() => toggleSecao(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${seccoes.includes(s) ? "bg-scout-600 text-white border-scout-600" : "bg-white text-gray-600 border-gray-300"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                💡 Stories durante o evento (📸 Fotos + 🎥 Vídeos) · Publicação 7 dias após fim (✍️ Textos)
              </div>
            </>
          )}

          {(tipo === "video" || tipo === "feriado" || tipo === "quiz") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Publicação *</label>
              <input type="date" value={dataPub} onChange={(e) => setDataPub(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" required />
            </div>
          )}

          {tipo === "pensamento" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Publicação</label>
              <input type="date" value={dataPub} onChange={(e) => setDataPub(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">💡 Por defeito: próxima quinta-feira</p>
            </div>
          )}

          {/* Equipas responsáveis (opcional override) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Equipas Responsáveis <span className="text-gray-400 font-normal">(opcional - auto se vazio)</span></label>
            <div className="flex flex-wrap gap-2">
              {equipas.map((eq) => (
                <button key={eq.id} type="button" onClick={() => toggleEquipa(eq.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${selectedEquipas.includes(eq.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                >{eq.nome}</button>
              ))}
            </div>
          </div>

          {tipo !== "pensamento" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-500 outline-none" rows={2} />
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-scout-600 to-scout-500 text-white rounded-xl text-sm font-medium hover:from-scout-700 hover:to-scout-600 disabled:opacity-50 shadow-lg shadow-scout-200 transition-all active:scale-[0.98]"
          >{submitting ? "⏳ A criar..." : `✅ Criar ${TABS.find((t) => t.tipo === tipo)?.label}`}</button>
        </form>
      </div>
    </div>
  );
}
