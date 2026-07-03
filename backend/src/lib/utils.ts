export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function getNextThursday(): string {
  const hoje = new Date();
  const dia = hoje.getDay();
  const diff = dia <= 4 ? 4 - dia : 4 + 7 - dia;
  const next = new Date(hoje);
  next.setDate(hoje.getDate() + diff);
  return next.toISOString().split("T")[0];
}

export function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function getSemanaInfo(): { inicio: string; fim: string } {
  const hoje = new Date();
  const dia = hoje.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() + diff);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return {
    inicio: inicio.toISOString().split("T")[0],
    fim: fim.toISOString().split("T")[0],
  };
}
