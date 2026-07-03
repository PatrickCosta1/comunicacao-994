-- Eventos recorrentes (ex: Hora de Piedade - 1o domingo de cada mes)
create table if not exists eventos_recorrentes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tipo text not null default 'hora_piedade' check (tipo in ('hora_piedade','custom')),
  data_inicio date not null,
  data_fim date not null,
  ativo boolean not null default true,
  created_at timestamptz default now()
);

alter table eventos_recorrentes enable row level security;
create policy "Acesso total anon" on eventos_recorrentes for all to anon using (true) with check (true);

create index if not exists idx_eventos_recorrentes on eventos_recorrentes(ativo);
