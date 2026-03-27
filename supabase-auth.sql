alter table planning_items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table planning_items alter column user_id set default auth.uid();

drop policy if exists "public read planning_items" on planning_items;
drop policy if exists "public insert planning_items" on planning_items;
drop policy if exists "public update planning_items" on planning_items;
drop policy if exists "public delete planning_items" on planning_items;

alter table planning_items enable row level security;

create policy "users read own planning_items"
on planning_items
for select
to authenticated
using (user_id = auth.uid());

create policy "users insert own planning_items"
on planning_items
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users update own planning_items"
on planning_items
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users delete own planning_items"
on planning_items
for delete
to authenticated
using (user_id = auth.uid());
