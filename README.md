# Plataforma de Coordenação 994-Caxinas v2

App simples para coordenar a equipa de comunicação do Agrupamento 994-Caxinas.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Base de Dados:** Supabase (PostgreSQL)
- **Deploy:** Netlify (frontend) + Render (backend)

## Estrutura

```
plataforma-comunicacao-v2/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── pages/     # Dashboard, Atividades, Equipas, Mensagens
│   │   ├── lib/       # Supabase client
│   │   └── App.tsx
│   └── ...
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/    # equipas, atividades, mensagens
│   │   └── index.ts
│   └── ...
├── supabase/
│   └── schema.sql     # Base de dados
└── README.md
```

## Setup

### 1. Base de Dados (Supabase)

1. Vai a [https://supabase.com](https://supabase.com) e faz login
2. Abre o projeto: `lgmbwovpbidxijirodrx`
3. Vai a **SQL Editor** e cola o conteúdo de `supabase/schema.sql` - executa
4. Vai a **Settings > API** e copia a `anon public` key

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edita .env com a chave anon do Supabase
npm install
npm run dev
```

O backend corre em `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edita .env com a chave anon do Supabase
npm install
npm run dev
```

O frontend corre em `http://localhost:5173`.

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/equipas` | Lista equipas com membros |
| POST | `/api/equipas/:id/membros/batch` | Atualiza membros de uma equipa |
| GET | `/api/atividades` | Lista atividades |
| POST | `/api/atividades` | Cria atividade |
| PATCH | `/api/atividades/:id` | Atualiza estado |
| DELETE | `/api/atividades/:id` | Remove atividade |
| GET | `/api/mensagens/semanal` | Gera mensagem semanal |

## Deploy

### Frontend → Netlify

```bash
cd frontend
npm run build
# Faz upload da pasta dist/ para o Netlify
```

### Backend → Render

Cria um Web Service no Render apontando para a pasta `backend/`.
Comando de start: `npm start`

## Funcionalidades

- **Dashboard** - visão geral das atividades ativas e publicações pendentes
- **Atividades** - criar atividades, selecionar equipas responsáveis, marcar estado
- **Equipas** - gerir membros de cada equipa
- **Mensagens** - gerar mensagem semanal para WhatsApp com 1 clique
