// Provide stable env vars for any module that imports `@/lib/env`.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role";
process.env.ADMIN_NOTIFY_EMAIL ??= "admin@example.com";
process.env.ADMIN_ICS_TOKEN ??= "test-ics-token-min-16-chars";

// Ensure the Node test runner uses the same wall-clock zone as the app expects.
process.env.TZ = "UTC";
