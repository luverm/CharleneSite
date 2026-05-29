-- ============================================================
-- 0010_lead_attachments.sql
-- Storage object paths for inspiration images uploaded with a
-- bridal lead (objects live in the private 'bridal-moodboards'
-- Storage bucket).
-- ============================================================

alter table bridal_leads
  add column if not exists attachment_paths text[];
