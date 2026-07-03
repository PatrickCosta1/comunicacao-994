-- Schema para Plataforma de Coordenação 994-Caxinas
-- Executar no SQL Editor do Supabase Dashboard

-- === EQUIPAS ===
create table if not exists equipas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  created_at timestamptz default now()
);

-- === MEMBROS DAS EQUIPAS ===
create table if not exists membros (
  id uuid primary key default gen_random_uuid(),
  equipa_id uuid not null references equipas(id) on delete cascade,
  nome text not null,
  created_at timestamptz default now()
);

-- === ATIVIDADES ===
create table if not exists atividades (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  descricao text not null default '',
  date_start date not null,
  date_end date not null,
  hora text not null default '',
  local text not null default '',
  seccoes text[] not null default '{}',
  precisa_publicacao boolean not null default false,
  data_publicacao date,
  estado text not null default 'agendado' check (estado in ('agendado','decorrer','concluido')),
  created_at timestamptz default now()
);

-- === EQUIPAS RESPONSÁVEIS POR CADA ATIVIDADE ===
create table if not exists atividades_equipas (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references atividades(id) on delete cascade,
  equipa_id uuid not null references equipas(id) on delete cascade,
  unique(atividade_id, equipa_id)
);

-- === MENSAGENS SEMANAIS GERADAS ===
create table if not exists mensagens_semanais (
  id uuid primary key default gen_random_uuid(),
  conteudo text not null,
  semana_inicio date not null,
  created_at timestamptz default now()
);

-- === ÍNDICES ===
create index if not exists idx_atividades_data on atividades(date_start);
create index if not exists idx_atividades_estado on atividades(estado);
create index if not exists idx_membros_equipa on membros(equipa_id);
create index if not exists idx_atividades_equipas_atividade on atividades_equipas(atividade_id);
create index if not exists idx_atividades_equipas_equipa on atividades_equipas(equipa_id);

-- === RLS (Row Level Security) - Desativado para single-user ===
alter table equipas enable row level security;
alter table membros enable row level security;
alter table atividades enable row level security;
alter table atividades_equipas enable row level security;
alter table mensagens_semanais enable row level security;

-- Permitir tudo para anon (single-user, sem auth)
create policy "Acesso total anon" on equipas for all to anon using (true) with check (true);
create policy "Acesso total anon" on membros for all to anon using (true) with check (true);
create policy "Acesso total anon" on atividades for all to anon using (true) with check (true);
create policy "Acesso total anon" on atividades_equipas for all to anon using (true) with check (true);
create policy "Acesso total anon" on mensagens_semanais for all to anon using (true) with check (true);

-- === INSERIR EQUIPAS PADRÃO ===
insert into equipas (nome, descricao) values
  ('📸 Fotos', 'Tirar fotos/vídeos das atividades'),
  ('🎥 Vídeos', 'Editar e produzir vídeos promocionais'),
  ('✍️ Textos', 'Escrever textos e publicar nas redes'),
  ('🎂 Aniversários', 'Publicar story de aniversários'),
  ('🎉 Feriados', 'Publicar arte em feriados'),
  ('💭 Pensamentos', 'Publicar frase do fundador semanalmente'),
  ('❓ Quizzes', 'Criar quizzes para os storys'),
  ('📢 Avisos', 'Publicar avisos nos storys'),
  ('🌐 Website', 'Manutenção do site')
on conflict do nothing;
