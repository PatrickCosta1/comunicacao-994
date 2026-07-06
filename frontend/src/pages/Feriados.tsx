import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import type { Conteudo } from "../types";

export default function Feriados() {
  const [feriados, setFeriados] = useState<Conteudo[]>([]);
  const [search, setSearch] = useState("");
  const [mesFiltro, setMesFiltro] = useState<number | "todos">("todos");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const [editando, setEditando] = useState<Conteudo | null>(null);
  const [erro, setErro] = useState("");

  // Form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dataPub, setDataPub] = useState("");

  useEffect(() => {
    fetchFeriados();
  }, []);

  const fetchFeriados = async () => {
    setErro("");
    const { data, error } = await supabase
      .from("conteudos")
      .select("*")
      .eq("tipo", "feriado")
      .order("data_publicacao", { ascending: true });
    if (error) setErro("Erro ao carregar feriados: " + error.message);
    else if (data) setFeriados(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditando(null);
    setTitle(""); setDesc(""); setDataPub("");
    setShowModal(true);
  };

  const openEdit = (f: Conteudo) => {
    setEditando(f);
    setTitle(f.title);
    setDesc(f.descricao || "");
    setDataPub(f.data_publicacao || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dataPub) return;

    const body = {
      tipo: "feriado",
      title: title.trim(),
      descricao: desc.trim(),
      data_publicacao: dataPub,
    };

    try {
      if (editando) {
        await fetch(`/api/conteudos/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast({ tipo: "success", titulo: `✏️ "${title.trim()}" atualizado` });
      } else {
        await fetch("/api/conteudos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast({ tipo: "success", titulo: `🎉 "${title.trim()}" criado` });
      }
      setShowModal(false);
      fetchFeriados();
    } catch {
      toast({ tipo: "error", titulo: "Erro ao guardar feriado" });
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`Remover "${titulo}"?`)) return;
    try {
      await fetch(`/api/conteudos/${id}`, { method: "DELETE" });
      toast({ tipo: "success", titulo: `🗑️ "${titulo}" removido` });
      fetchFeriados();
    } catch {
      toast({ tipo: "error", titulo: "Erro ao remover feriado" });
    }
  };

  const handleEstado = async (id: string, estado: string, titulo: string) => {
    try {
      await fetch(`/api/conteudos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      toast({ tipo: "success", titulo: estado === "publicado" ? `✅ "${titulo}" publicado` : `⏳ "${titulo}" pendente` });
      fetchFeriados();
    } catch {
      toast({ tipo: "error", titulo: "Erro ao atualizar feriado" });
    }
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const hoje = new Date();

  const filtered = feriados.filter((f) => {
    if (!f.data_publicacao) return false;
    const [ano, mes, dia] = f.data_publicacao.split("-").map(Number);
    if (mesFiltro !== "todos" && mes !== mesFiltro) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">⏳ A carregar...</p></div>;
  if (erro) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{erro}</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎉 Feriados</h1>
          <p className="text-gray-500 mt-1">{feriados.length} feriados registados</p>
        </div>
        <button onClick={openNew}
          className="px-5 py-2.5 bg-gradient-to-r from-scout-600 to-scout-500 text-white rounded-xl text-sm font-medium hover:from-scout-700 hover:to-scout-600 shadow-lg shadow-scout-200 transition-all active:scale-[0.98]"
        >🎉 Adicionar Feriado</button>
      </div>

      {/* Pesquisa e Filtro */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none"
            placeholder="Pesquisar feriado..." />
        </div>
        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value === "todos" ? "todos" : Number(e.target.value))}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none">
          <option value="todos">Todos os meses</option>
          {meses.map((nome, i) => (<option key={i + 1} value={i + 1}>{nome}</option>))}
        </select>
        <span className="text-sm text-gray-400 self-center">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">{editando ? "Editar" : "Novo"} Feriado</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input type="date" value={dataPub} onChange={(e) => setDataPub(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none" />
              </div>
              <button type="submit"
                className="w-full py-3 bg-gradient-to-r from-scout-600 to-scout-500 text-white rounded-xl text-sm font-medium hover:from-scout-700 hover:to-scout-600 shadow-lg shadow-scout-200 transition-all active:scale-[0.98]"
              >{editando ? "💾 Guardar" : "🎉 Adicionar Feriado"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white/50 rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <p className="text-5xl mb-4 opacity-40">🎉</p>
            <p className="text-gray-400 font-medium">Nenhum feriado encontrado</p>
          </div>
        ) : (
          filtered.map((f) => {
            const [ano, mes, dia] = f.data_publicacao!.split("-").map(Number);
            const dataObj = new Date(ano, mes - 1, dia);
            const isHoje = dataObj.toDateString() === hoje.toDateString();
            const isPassado = dataObj < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

            return (
              <div key={f.id} className={`group bg-white border rounded-xl p-4 hover:shadow-md transition-all duration-200 ${
                isHoje ? "border-scout-400 ring-2 ring-scout-100" : "border-gray-100"
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{isHoje ? "🎉" : isPassado ? "📅" : "📆"}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 text-sm">{f.title}</h3>
                        {isHoje && <span className="text-xs font-bold px-2 py-0.5 bg-scout-100 text-scout-700 rounded-full">Hoje!</span>}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {dia} de {meses[mes - 1]} {ano}
                        {f.descricao && ` · ${f.descricao}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(f)}
                      className="p-1.5 text-gray-300 hover:text-scout-600 transition-colors" title="Editar">✏️</button>
                    <button onClick={() => handleDelete(f.id, f.title)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Remover">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
