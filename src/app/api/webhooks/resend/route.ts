import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented — built in Phase 3" },
    { status: 501 },
  );
}
