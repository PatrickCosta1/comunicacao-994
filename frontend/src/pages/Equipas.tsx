import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Equipa } from "../types";

export default function Equipas() {
  const [equipas, setEquipas] = useState<Equipa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEquipas();
  }, []);

  const loadEquipas = async () => {
    const { data } = await supabase
      .from("equipas")
      .select("*, membros(*)")
      .order("created_at");
    if (data) setEquipas(data);
    setLoading(false);
  };

  const updateMembros = async (equipaId: string, nomesStr: string) => {
    const nomes = nomesStr.split(",").map((n) => n.trim()).filter((n) => n);

    await fetch(`/api/equipas/${equipaId}/membros/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomes }),
    });

    loadEquipas();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">A carregar...</p></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">👥 Equipas</h1>
        <p className="text-gray-500 mt-1">Define os membros de cada equipa. Separa os nomes por vírgula.</p>
      </div>

      <div className="space-y-3">
        {equipas.map((eq) => (
          <div key={eq.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-md transition-all duration-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{eq.nome}</label>
            <input
              type="text"
              defaultValue={eq.membros?.map((m) => m.nome).join(", ") || ""}
              onBlur={(e) => updateMembros(eq.id, e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-scout-500 outline-none transition-shadow"
              placeholder="Nome1, Nome2, Nome3"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {(eq.membros?.length || 0)} membro{(eq.membros?.length || 0) !== 1 ? "s" : ""} registado{(eq.membros?.length || 0) !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
