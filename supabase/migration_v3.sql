-- Migration v3: adiciona coluna `notas` para registo de coordenação
alter table conteudos add column if not exists notas text;
