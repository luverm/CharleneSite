"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => startTransition(() => signOut())}
      disabled={pending}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Uitloggen
    </Button>
  );
}
