import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Conteudos from "./pages/Conteudos";
import Feriados from "./pages/Feriados";
import Equipas from "./pages/Equipas";
import Mensagens from "./pages/Mensagens";

const nav = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/conteudos", label: "Conteúdos", icon: "📋" },
  { path: "/feriados", label: "Feriados", icon: "🎉" },
  { path: "/equipas", label: "Equipas", icon: "👥" },
  { path: "/mensagens", label: "Mensagens", icon: "💬" },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />}

      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-full w-64 md:w-56
        bg-white/95 md:bg-white backdrop-blur-lg md:backdrop-blur-none
        border-r border-gray-200 flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h1 className="font-bold text-gray-800 text-sm">⚜️ 994-Caxinas</h1>
            <p className="text-[10px] text-gray-400">Coordenação</p>
          </div>
          <button onClick={onClose} className="md:hidden w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-scout-100 text-scout-800 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 text-center text-[10px] text-gray-300">
          v2 · 994-Caxinas
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Top bar mobile */}
          <div className="sticky top-0 z-30 md:hidden bg-white/95 backdrop-blur-lg border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-gray-700">⚜️ 994-Caxinas</h1>
          </div>

          <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/conteudos" element={<Conteudos />} />
              <Route path="/feriados" element={<Feriados />} />
              <Route path="/equipas" element={<Equipas />} />
              <Route path="/mensagens" element={<Mensagens />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
