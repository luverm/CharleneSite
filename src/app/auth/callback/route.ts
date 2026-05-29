import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { claimStaffIfUnlinked } from "@/lib/auth/staff-bootstrap";

const ALLOWED_NEXT = /^\/[a-z][a-z0-9/_-]*$/i;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = ALLOWED_NEXT.test(requestedNext) ? requestedNext : "/dashboard";

  const supabase = await createSupabaseServerClient();

  let authed = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });
    authed = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authed = !error;
  }

  if (!authed) {
    return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await claimStaffIfUnlinked(user.id, user.email ?? null);
    } catch (e) {
      console.error("[auth] claimStaffIfUnlinked failed", e);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
