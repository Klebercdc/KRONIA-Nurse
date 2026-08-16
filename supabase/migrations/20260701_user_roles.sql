-- Tabela de papéis de usuário (aditiva — não altera nenhuma tabela existente).
-- Papel default 'nurse'; curadoria da Biblioteca Técnica exige 'admin'.
-- Admins são inseridos manualmente via service_role (nunca pelo client).
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'nurse',
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Leitura: cada usuário enxerga apenas o próprio papel.
create policy "user_roles_select_own" on public.user_roles
  for select using (auth.uid() = user_id);

-- Escrita: nenhuma policy de insert/update/delete → negada a clients
-- (anon/authenticated). Apenas o service_role, que ignora RLS, gerencia papéis.
