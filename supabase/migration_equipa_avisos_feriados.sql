-- Migration: funde as equipas de trabalho '🎉 Feriados' e '📢 Avisos' numa só
-- '📢 Avisos & Feriados' (mantém os tipos de conteúdo 'feriado' e 'aviso' separados na mensagem).
-- Executar no SQL Editor do Supabase Dashboard.

-- 1. Criar a nova equipa (se ainda não existir)
insert into equipas (nome, descricao)
select '📢 Avisos & Feriados', 'Publicar avisos e arte de feriados nos storys'
where not exists (select 1 from equipas where nome = '📢 Avisos & Feriados');

-- 2. Mover membros das antigas para a nova
update membros
set equipa_id = (select id from equipas where nome = '📢 Avisos & Feriados')
where equipa_id in (
  select id from equipas where nome in ('🎉 Feriados', '📢 Avisos')
);

-- 3. Mover associações de conteúdos das antigas para a nova (sem duplicar)
update conteudos_equipas ce
set equipa_id = (select id from equipas where nome = '📢 Avisos & Feriados')
where ce.equipa_id in (
  select id from equipas where nome in ('🎉 Feriados', '📢 Avisos')
)
and not exists (
  select 1 from conteudos_equipas ce2
  where ce2.conteudo_id = ce.conteudo_id
    and ce2.equipa_id = (select id from equipas where nome = '📢 Avisos & Feriados')
);

-- 4. Apagar as equipas antigas (agora vazias)
delete from equipas where nome in ('🎉 Feriados', '📢 Avisos');
