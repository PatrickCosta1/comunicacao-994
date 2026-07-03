export interface Equipa {
  id: string;
  nome: string;
  descricao: string;
  membros: Membro[];
}

export interface Membro {
  id: string;
  equipa_id: string;
  nome: string;
}

export interface Conteudo {
  id: string;
  tipo: "atividade" | "video" | "feriado" | "aviso" | "quiz" | "pensamento";
  title: string;
  descricao: string;
  date_start: string | null;
  date_end: string | null;
  hora: string;
  local: string;
  seccoes: string[];
  data_publicacao: string | null;
  data_acontecimento: string | null;
  estado: "pendente" | "publicado" | "concluido";
  equipas_responsaveis: { id: string; nome: string }[];
  created_at: string;
}

export type TipoConteudo = Conteudo["tipo"];
