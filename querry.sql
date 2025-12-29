-- 1. Create Tables
create table public.products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  current_price numeric not null, -- Default price for new logs
  active boolean default true,
  created_at timestamptz default now()
);

create table public.logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  product_id uuid references public.products not null,
  log_date date default current_date,
  quantity numeric not null, 
  price_snapshot numeric not null, -- CRITICAL: Price at the moment of logging
  created_at timestamptz default now()
);

-- 2. Enable Security (RLS)
alter table public.products enable row level security;
alter table public.logs enable row level security;

-- 3. Create Access Policies (User can only see their own data)
create policy "Manage own products" on public.products
  for all using (auth.uid() = user_id);

create policy "Manage own logs" on public.logs
  for all using (auth.uid() = user_id);