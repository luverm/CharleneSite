-- ============================================================
-- 0023_realtime_admin_notifications.sql
-- Zet Supabase Realtime aan voor admin_notifications zodat de
-- admin-portal nieuwe boekingen/notificaties live binnenkrijgt.
-- Realtime respecteert RLS: de bestaande "staff manage admin
-- notifications" policy autoriseert de ingelogde admin al.
-- ============================================================

alter publication supabase_realtime add table admin_notifications;
