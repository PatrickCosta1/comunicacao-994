-- Adicionar coluna published_at para tracking de cumprimento
alter table conteudos add column if not exists published_at timestamptz;

-- Remover 'concluido' da constraint (agora so 'pendente' e 'publicado')
alter table conteudos drop constraint if exists conteudos_estado_check;
alter table conteudos add constraint conteudos_estado_check
  check (estado in ('pendente','publicado'));

-- Migrar 'concluido' para 'publicado'
update conteudos set estado = 'publicado' where estado = 'concluido';

-- Feriados pre-populados (2026)
insert into conteudos (tipo, title, descricao, data_publicacao, estado) values
  ('feriado', 'Ano Novo', 'Ano Novo', '2026-01-01', 'pendente'),
  ('feriado', 'Carnaval', 'Carnaval', '2026-02-17', 'pendente'),
  ('feriado', 'Dia do Fundador (Baden-Powell)', 'Nascimento de Robert Baden-Powell', '2026-02-22', 'pendente'),
  ('feriado', 'Sexta-Feira Santa', 'Sexta-Feira Santa', '2026-04-03', 'pendente'),
  ('feriado', 'Pascoa', 'Domingo de Pascoa', '2026-04-05', 'pendente'),
  ('feriado', 'Dia da Liberdade', 'Revolucao dos Cravos', '2026-04-25', 'pendente'),
  ('feriado', 'Dia do Trabalhador', 'Dia Internacional do Trabalhador', '2026-05-01', 'pendente'),
  ('feriado', 'Dia da Mãe', '2o Domingo de Maio', '2026-05-04', 'pendente'),
  ('feriado', 'Aniversário do CNE', 'Fundacao do Corpo Nacional de Escutas (1923)', '2026-05-27', 'pendente'),
  ('feriado', 'Dia da Criança', 'Dia Internacional da Criança', '2026-06-01', 'pendente'),
  ('feriado', 'Corpo de Deus', 'Corpo de Deus', '2026-06-04', 'pendente'),
  ('feriado', 'Dia de Portugal', 'Dia de Portugal, de Camoes e das Comunidades Portuguesas', '2026-06-10', 'pendente'),
  ('feriado', 'Dia de Santo António', 'Santo Antonio de Lisboa', '2026-06-13', 'pendente'),
  ('feriado', 'Dia de São João', 'Sao Joao do Porto', '2026-06-24', 'pendente'),
  ('feriado', 'Assunção de Nossa Senhora', 'Assuncao de Maria', '2026-08-15', 'pendente'),
  ('feriado', 'Implantação da República', 'Implantacao da Republica Portuguesa', '2026-10-05', 'pendente'),
  ('feriado', 'Dia de Todos os Santos', 'Todos os Santos', '2026-11-01', 'pendente'),
  ('feriado', 'Restauração da Independência', 'Restauracao da Independencia de Portugal', '2026-12-01', 'pendente'),
  ('feriado', 'Imaculada Conceição', 'Imaculada Conceicao', '2026-12-08', 'pendente'),
  ('feriado', 'Natal', 'Natal', '2026-12-25', 'pendente')
on conflict do nothing;
