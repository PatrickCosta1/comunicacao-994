-- Migration: configuração do plano semanal (textos fixos + secções ligadas/desligadas)
-- Executar no SQL Editor do Supabase Dashboard.

create table if not exists mensagem_config (
  id integer primary key default 1 check (id = 1),
  saudacao text not null default 'Bom dia a todos! 🙌',
  cabecalho text not null default 'Relativamente ao plano semanal de {data}:',
  despedida text not null default 'Boa semana a todos! 🚀',
  seccoes jsonb not null default '[
    {"tipo": "atividade", "titulo": "Atividades", "emoji": "📅", "ativo": true},
    {"tipo": "video", "titulo": "Vídeos da Semana", "emoji": "🎥", "ativo": true, "negrito": true},
    {"tipo": "feriado", "titulo": "Feriados", "emoji": "🎉", "ativo": true, "pubPrefix": false},
    {"tipo": "aviso", "titulo": "Avisos", "emoji": "📢", "ativo": true},
    {"tipo": "quiz", "titulo": "Quizzes", "emoji": "❓", "ativo": true, "negrito": true},
    {"tipo": "pensamento", "titulo": "Pensamento do Fundador", "emoji": "💭", "ativo": true}
  ]'::jsonb,
  updated_at timestamptz default now()
);

alter table mensagem_config enable row level security;

create policy "Acesso total anon" on mensagem_config for all to anon using (true) with check (true);

-- Linha única padrão
insert into mensagem_config (id)
values (1)
on conflict (id) do nothing;
