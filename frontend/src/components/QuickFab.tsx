import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function QuickFab() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const acoes = [
    { icon: "📅", label: "Nova Atividade", path: "/conteudos" },
    { icon: "🎥", label: "Novo Vídeo", path: "/conteudos" },
    { icon: "📢", label: "Novo Aviso", path: "/conteudos" },
    { icon: "🎉", label: "Novo Feriado", path: "/feriados" },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse gap-2 items-start">
      {open && acoes.map((a) => (
        <button
          key={a.label}
          onClick={() => { navigate(a.path); setOpen(false); }}
          className="flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-scout-50 hover:border-scout-200 hover:text-scout-700 transition-all animate-slide-up"
        >
          <span>{a.icon}</span>
          {a.label}
        </button>
      ))}
      <button
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-white text-xl font-bold transition-all ${
          open ? "bg-red-500 rotate-45" : "bg-scout-600 hover:bg-scout-700"
        }`}
        title="Ações rápidas"
      >
        {open ? "✕" : "⚡"}
      </button>
    </div>
  );
}
