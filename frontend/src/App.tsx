import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Conteudos from "./pages/Conteudos";
import Equipas from "./pages/Equipas";
import Mensagens from "./pages/Mensagens";

const nav = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/conteudos", label: "Conteúdos", icon: "📋" },
  { path: "/equipas", label: "Equipas", icon: "👥" },
  { path: "/mensagens", label: "Mensagens", icon: "💬" },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h1 className="font-bold text-gray-800 text-sm">⚜️ 994-Caxinas</h1>
            <p className="text-xs text-gray-400">Coordenação</p>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {nav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-scout-100 text-scout-800"
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-100 text-center text-xs text-gray-400">
            v2 · 994-Caxinas
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/conteudos" element={<Conteudos />} />
            <Route path="/equipas" element={<Equipas />} />
            <Route path="/mensagens" element={<Mensagens />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
