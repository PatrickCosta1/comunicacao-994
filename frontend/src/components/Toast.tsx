import { useState, useEffect, useCallback, createContext, useContext } from "react";

type TipoToast = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  mensagem?: string;
  acao?: { label: string; onClick: () => void };
}

interface ToastCtx {
  toast: (t: Omit<Toast, "id">) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);

  const remover = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <Ctx.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-slide-up rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
              t.tipo === "success"
                ? "bg-green-50/95 border-green-200 text-green-800"
                : t.tipo === "error"
                ? "bg-red-50/95 border-red-200 text-red-700"
                : t.tipo === "warning"
                ? "bg-amber-50/95 border-amber-200 text-amber-700"
                : "bg-blue-50/95 border-blue-200 text-blue-700"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.titulo}</p>
                {t.mensagem && <p className="text-xs mt-0.5 opacity-80">{t.mensagem}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.acao && (
                  <button
                    onClick={t.acao.onClick}
                    className="text-xs font-semibold underline hover:no-underline whitespace-nowrap"
                  >
                    {t.acao.label}
                  </button>
                )}
                <button onClick={() => remover(t.id)} className="text-sm opacity-60 hover:opacity-100">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
