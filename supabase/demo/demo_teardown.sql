-- ============================================================
-- demo_teardown.sql — wist alle demo-data van demo_seed.sql
-- ============================================================
-- Verwijdert uitsluitend de gemarkeerde demo-rijen:
--   * uuid-tabellen → id begint met 'dddddddd-'
--   * facturen      → nummer begint met 'DEMO-'
--   * e-maillog     → context = 'demo'
-- De basisconfig (staff, diensten, openingstijden, teksten) blijft
-- volledig intact. Draai dit ná de demo in de Supabase SQL-editor.
--
-- Let op: de placeholder-portfoliofoto's staan in de repo
-- (public/images/portfolio/) en worden hier NIET geraakt — verwijder
-- die desgewenst apart met `git rm`.
-- ============================================================

begin;

delete from invoices            where number like 'DEMO-%';
delete from bookings            where id::text like 'dddddddd-%';
delete from waitlist            where id::text like 'dddddddd-%';
delete from reviews             where id::text like 'dddddddd-%';
delete from admin_notifications where id::text like 'dddddddd-%';
delete from chat_messages       where thread_id::text like 'dddddddd-%';
delete from chat_threads        where id::text like 'dddddddd-%';
delete from email_log           where context = 'demo';
delete from customers           where id::text like 'dddddddd-%';

commit;
