import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { confirmVerificationCode } from "@/lib/emailVerification";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const { email, code } = await request.json();

  if (typeof email !== "string" || typeof code !== "string" || code.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await confirmVerificationCode(email, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
