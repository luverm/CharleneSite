import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { needsAdminSetup } from "@/lib/auth/staff-bootstrap";
import { business } from "@/content/business";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await needsAdminSetup()) {
    redirect("/login/setup");
  }

  const params = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
      <h1 className="mt-4 font-serif text-4xl italic tracking-tight">
        {business.name}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Log in met je e-mailadres en wachtwoord.
      </p>

      <div className="mt-10">
        <LoginForm />
      </div>

      {params?.error && (
        <p className="mt-6 rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Inloggen mislukt. Probeer het opnieuw.
        </p>
      )}
    </div>
  );
}
