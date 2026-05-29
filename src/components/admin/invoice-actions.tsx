import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/admin/print-button";

/** Download (real PDF) + print actions for an invoice. */
export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        download
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <Download />
        PDF downloaden
      </a>
      <PrintButton label="Printen" />
    </div>
  );
}
