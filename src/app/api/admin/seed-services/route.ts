// One-shot bootstrap endpoint that upserts the canonical service
// catalogue from src/content/services.ts. Self-locking: once the live
// table holds at least as many services as the seed list, the route
// returns 423 Locked and refuses to run. That way it's safe to leave
// in place — accidental hits after the initial seed have no effect.
//
// Optionally still accepts ADMIN_ICS_TOKEN as a "force" override
// (?token=...) so the catalogue can be re-applied after manual edits
// without redeploying.

import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getServerEnv } from "@/lib/env";
import { SEED_SERVICES } from "@/content/services";

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const headerToken = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const provided = queryToken ?? headerToken;

  let force = false;
  try {
    const { ADMIN_ICS_TOKEN } = getServerEnv();
    if (provided && provided === ADMIN_ICS_TOKEN) force = true;
  } catch {
    // env not fully configured — ignore force path
  }

  const supabase = createSupabaseServiceClient();

  if (!force) {
    const { count, error: countErr } = await supabase
      .from("services")
      .select("slug", { count: "exact", head: true });
    if (countErr) {
      return NextResponse.json(
        { error: countErr.message, details: countErr },
        { status: 500 },
      );
    }
    if ((count ?? 0) >= SEED_SERVICES.length) {
      return NextResponse.json(
        {
          error: "locked",
          reason:
            "Service catalogue is already at or above the seed size. Pass ?token=<ADMIN_ICS_TOKEN> to force a re-apply.",
          existingCount: count,
          seedCount: SEED_SERVICES.length,
        },
        { status: 423 },
      );
    }
  }

  const { data, error } = await supabase
    .from("services")
    .upsert(
      SEED_SERVICES.map((s) => ({ ...s, is_active: true })),
      { onConflict: "slug" },
    )
    .select("slug, name, kind, duration_min, price_cents, is_online_bookable");
  if (error) {
    return NextResponse.json(
      { error: error.message, details: error },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    forced: force,
    upserted: data?.length ?? 0,
    services: data,
  });
}

export const GET = handle;
export const POST = handle;
