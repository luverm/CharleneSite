import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/admin/setup-form";
import { needsAdminSetup } from "@/lib/auth/staff-bootstrap";
import { business } from "@/content/business";

export const metadata: Metadata = {
  title: "Beheerder instellen",
  robots: { index: false },
};

export default async function SetupPage() {
  if (!(await needsAdminSetup())) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {business.name} — beheerder instellen
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dit is een eenmalige stap. Kies een e-mailadres en wachtwoord voor het
        beheer. Daarna is deze pagina gesloten en log je voortaan hiermee in.
      </p>

      <div className="mt-8">
        <SetupForm />
      </div>
    </div>
  );
}
