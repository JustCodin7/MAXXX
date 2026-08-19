-- MAXWELL ONLINE — Supabase database setup
-- Paste this entire file into Supabase SQL Editor and click "Run"

-- 1. Create the products table
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  subcategory text,
  price numeric not null,
  icon text default 'box',
  images text,              -- pipe-separated image URLs, e.g. "url1|url2|url3"
  description text,
  stock int default 0,
  featured boolean default false,
  created_at timestamptz default now()
);

-- 2. Turn on Row Level Security (locks the table down by default)
alter table products enable row level security;

-- 3. Anyone (including your live website, not logged in) can READ products
create policy "Public read access"
  on products for select
  using (true);

-- 4. Only YOU (logged in as admin) can add, edit, or delete products
create policy "Authenticated insert"
  on products for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update"
  on products for update
  using (auth.role() = 'authenticated');

create policy "Authenticated delete"
  on products for delete
  using (auth.role() = 'authenticated');

-- 5. Storage policies for the product-images bucket
-- (Run this AFTER creating the 'product-images' bucket in the Storage tab)
create policy "Public read for product images"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

create policy "Authenticated upload for product images"
  on storage.objects for insert
  with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

create policy "Authenticated delete for product images"
  on storage.objects for delete
  using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
