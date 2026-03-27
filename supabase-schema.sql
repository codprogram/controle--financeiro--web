create table if not exists planning_items (
    id uuid primary key,
    name text not null,
    notes text not null default '',
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
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists planning_items_name_idx on planning_items (name);
