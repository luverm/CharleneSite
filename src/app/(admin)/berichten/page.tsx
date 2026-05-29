import type { Metadata } from "next";
import { ChatInbox } from "@/components/admin/chat-inbox";

export const metadata: Metadata = {
  title: "Berichten",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function BerichtenPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Berichten</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chatgesprekken via de website. Niet-bewaarde gesprekken worden na
          30 dagen automatisch verwijderd.
        </p>
      </header>
      <ChatInbox />
    </div>
  );
}
