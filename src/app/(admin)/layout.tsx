import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /login is the only (admin) route reachable without a session — render it
  // bare so the user doesn't see an empty admin shell.
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav email={user.email ?? null} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">{children}</main>
        <Toaster richColors position="top-right" />
      </div>
    </div>
  );
}
