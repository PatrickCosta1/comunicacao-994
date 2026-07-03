-- Migração: tabela unificada de conteúdos
-- Executar no SQL Editor do Supabase

create table if not exists conteudos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('atividade','video','feriado','aviso','quiz','pensamento')),
  title text not null,
  descricao text not null default '',

  -- Campos específicos para atividades
  date_start date,
  date_end date,
  hora text not null default '',
  local text not null default '',
  seccoes text[] not null default '{}',

  -- Data de publicação (usado por todos os tipos)
  data_publicacao date,

  -- Para avisos: data do acontecimento (publicação é escolhida manualmente)
  data_acontecimento date,

  -- Estado
  estado text not null default 'pendente' check (estado in ('pendente','publicado','concluido')),

  created_at timestamptz default now()
);

-- Equipas responsáveis por cada conteúdo
create table if not exists conteudos_equipas (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null references conteudos(id) on delete cascade,
  equipa_id uuid not null references equipas(id) on delete cascade,
  unique(conteudo_id, equipa_id)
);

-- Índices
create index if not exists idx_conteudos_tipo on conteudos(tipo);
create index if not exists idx_conteudos_data on conteudos(data_publicacao);
create index if not exists idx_conteudos_estado on conteudos(estado);

-- RLS
alter table conteudos enable row level security;
alter table conteudos_equipas enable row level security;

create policy "Acesso total anon" on conteudos for all to anon using (true) with check (true);
create policy "Acesso total anon" on conteudos_equipas for all to anon using (true) with check (true);

-- Migrar atividades existentes para conteudos
insert into conteudos (id, tipo, title, descricao, date_start, date_end, hora, local, seccoes, data_publicacao, estado, created_at)
select id, 'atividade', title, descricao, date_start, date_end, hora, local, seccoes, data_publicacao,
  case when estado = 'concluido' then 'concluido' else 'pendente' end,
  created_at
from atividades
on conflict do nothing;

-- Migrar relações atividades_equipas
insert into conteudos_equipas (conteudo_id, equipa_id)
select atividade_id, equipa_id
from atividades_equipas ae
where exists (select 1 from conteudos c where c.id = ae.atividade_id)
on conflict do nothing;
