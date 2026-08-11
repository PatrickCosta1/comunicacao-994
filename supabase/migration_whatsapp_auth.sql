-- Migration: persistência da sessão WhatsApp Baileys
create table if not exists whatsapp_auth_state (
  id text primary key,
  creds_payload text not null,
  keys_payload text not null,
  updated_at timestamptz not null default now()
);

alter table whatsapp_auth_state enable row level security;

create policy "Acesso total anon" on whatsapp_auth_state for all to anon using (true) with check (true);
