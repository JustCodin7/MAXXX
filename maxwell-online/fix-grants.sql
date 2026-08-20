-- MAXWELL ONLINE — grant table privileges
-- Fixes "permission denied for table products"
-- This is separate from RLS policies: RLS controls WHICH rows,
-- these GRANTs control whether the role can touch the table at all.

grant select on products to anon, authenticated;
grant insert, update, delete on products to authenticated;

-- Confirm it worked:
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'products';
