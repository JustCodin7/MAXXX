-- MAXWELL ONLINE — policy repair script
-- Safe to run even if some policies already exist or are missing.
-- This makes sure RLS is on and all four policies exist on the products table.

alter table products enable row level security;

drop policy if exists "Public read access" on products;
drop policy if exists "Authenticated insert" on products;
drop policy if exists "Authenticated update" on products;
drop policy if exists "Authenticated delete" on products;

create policy "Public read access"
  on products for select
  using (true);

create policy "Authenticated insert"
  on products for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update"
  on products for update
  using (auth.role() = 'authenticated');

create policy "Authenticated delete"
  on products for delete
  using (auth.role() = 'authenticated');

-- Confirm the policies now exist:
select policyname, cmd from pg_policies where tablename = 'products';
