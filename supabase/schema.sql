create table if not exists profiles (id uuid primary key references auth.users(id), full_name text, phone text, office_name text, office_address text, avatar_url text, logo_url text, created_at timestamp default now());
create table if not exists projects (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users(id), title text, geojson jsonb, center_lat float, center_lon float, created_at timestamp default now());
create table if not exists videos (id uuid default gen_random_uuid() primary key, project_id uuid references projects(id), url text, duration int, mode text, status text default 'processing', created_at timestamp default now());
create table if not exists analyses (id uuid default gen_random_uuid() primary key, project_id uuid references projects(id), content jsonb, score int, created_at timestamp default now());
create table if not exists credits (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users(id), amount int default 0, created_at timestamp default now());
alter table projects enable row level security; alter table videos enable row level security; alter table analyses enable row level security; alter table credits enable row level security;
create policy "users read own projects" on projects for select using (auth.uid() = user_id);
create policy "users insert own projects" on projects for insert with check (auth.uid() = user_id);
