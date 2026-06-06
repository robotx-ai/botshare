import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { issueVerificationCode } from "@/lib/emailVerification";
import { sendVerificationCode } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const { email } = await request.json();
  if (typeof email !== "string" || !email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond ok to avoid leaking which emails exist; only actually send
  // when there's an unverified account.
  if (user && !user.emailVerified) {
    try {
      const code = await issueVerificationCode(email);
      await sendVerificationCode(email, code, user.name);
    } catch (err) {
      console.error("[verify-email/resend] failed:", err);
      return NextResponse.json({ error: "Could not resend the code." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
