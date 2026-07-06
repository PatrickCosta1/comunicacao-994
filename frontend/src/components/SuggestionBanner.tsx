interface Props {
  tipo: "atrasado" | "hoje" | "info";
  titulo: string;
  descricao: string;
  botoes: { label: string; onClick: () => void; variant?: "primary" | "secondary" }[];
  onDismiss?: () => void;
}

const cores = {
  atrasado: {
    bg: "bg-red-50 border-red-200",
    icon: "🔴",
    btn: "bg-red-600 hover:bg-red-700 text-white",
    btnSec: "bg-red-100 hover:bg-red-200 text-red-700",
  },
  hoje: {
    bg: "bg-amber-50 border-amber-200",
    icon: "🟡",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
    btnSec: "bg-amber-100 hover:bg-amber-200 text-amber-700",
  },
  info: {
    bg: "bg-blue-50 border-blue-200",
    icon: "ℹ️",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
    btnSec: "bg-blue-100 hover:bg-blue-200 text-blue-700",
  },
};

export default function SuggestionBanner({ tipo, titulo, descricao, botoes, onDismiss }: Props) {
  const c = cores[tipo];

  return (
    <div className={`${c.bg} rounded-xl border p-4 flex items-start gap-3 animate-in`}>
      <span className="text-xl shrink-0 mt-0.5">{c.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-800">{titulo}</p>
        <p className="text-xs text-gray-600 mt-0.5">{descricao}</p>
        <div className="flex gap-2 mt-3">
          {botoes.map((b, i) => (
            <button
              key={i}
              onClick={b.onClick}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                b.variant === "secondary" ? c.btnSec : c.btn
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">✕</button>
      )}
    </div>
  );
}
