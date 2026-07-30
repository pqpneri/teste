-- Execute este arquivo no SQL Editor do Supabase.

create table if not exists public.transfer_reports (
  id text primary key,
  created_at timestamptz not null default now(),
  origin text not null,
  destination text not null,
  reason text not null,
  transport text not null,
  products jsonb not null default '[]'::jsonb,
  message text not null default ''
);

create table if not exists public.customer_reports (
  id text primary key,
  created_at timestamptz not null default now(),
  code text not null,
  customer_name text not null,
  phone text not null default '',
  proposal_type text not null default 'Venda de produto',
  proposal_date date,
  store text not null default '',
  channel text not null default '',
  service text not null default '',
  notes text not null default '',
  products jsonb not null default '[]'::jsonb,
  total numeric(14,2) not null default 0,
  action text not null default 'generated'
);

create index if not exists transfer_reports_created_at_idx
  on public.transfer_reports (created_at desc);

create index if not exists customer_reports_created_at_idx
  on public.customer_reports (created_at desc);

alter table public.transfer_reports enable row level security;
alter table public.customer_reports enable row level security;

-- Políticas simples para o site atual. Para produção com vários usuários,
-- substitua por Supabase Auth e políticas usando auth.uid().
drop policy if exists "transfer_reports_read" on public.transfer_reports;
drop policy if exists "transfer_reports_insert" on public.transfer_reports;
drop policy if exists "transfer_reports_update" on public.transfer_reports;
drop policy if exists "transfer_reports_delete" on public.transfer_reports;
create policy "transfer_reports_read" on public.transfer_reports for select to anon, authenticated using (true);
create policy "transfer_reports_insert" on public.transfer_reports for insert to anon, authenticated with check (true);
create policy "transfer_reports_update" on public.transfer_reports for update to anon, authenticated using (true) with check (true);
create policy "transfer_reports_delete" on public.transfer_reports for delete to anon, authenticated using (true);

drop policy if exists "customer_reports_read" on public.customer_reports;
drop policy if exists "customer_reports_insert" on public.customer_reports;
drop policy if exists "customer_reports_update" on public.customer_reports;
drop policy if exists "customer_reports_delete" on public.customer_reports;
create policy "customer_reports_read" on public.customer_reports for select to anon, authenticated using (true);
create policy "customer_reports_insert" on public.customer_reports for insert to anon, authenticated with check (true);
create policy "customer_reports_update" on public.customer_reports for update to anon, authenticated using (true) with check (true);
create policy "customer_reports_delete" on public.customer_reports for delete to anon, authenticated using (true);
