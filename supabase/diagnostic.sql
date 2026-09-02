-- Diagnostic: list existing objects
select 'tables' as kind, count(*)::text as count from information_schema.tables where table_schema = 'public'
union all
select 'enums', count(*)::text from pg_type t where typnamespace = (select oid from pg_namespace where nspname = 'public') and typtype = 'e'
union all
select 'rls_enabled', count(*)::text from pg_tables where schemaname = 'public' and rowsecurity = true;