create table if not exists financial_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    setembro numeric not null default 0,
    outubro numeric not null default 0,
    novembro numeric not null default 0,
    dezembro numeric not null default 0,
    janeiro numeric not null default 0,
    fevereiro numeric not null default 0,
    marco numeric not null default 0,
    abril numeric not null default 0,
    maio numeric not null default 0,
    junho numeric not null default 0,
    julho numeric not null default 0,
    updated_at timestamptz not null default timezone('utc', now())
);

alter table financial_profiles enable row level security;

drop policy if exists "users read own financial_profiles" on financial_profiles;
drop policy if exists "users insert own financial_profiles" on financial_profiles;
drop policy if exists "users update own financial_profiles" on financial_profiles;

create policy "users read own financial_profiles"
on financial_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "users insert own financial_profiles"
on financial_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users update own financial_profiles"
on financial_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
