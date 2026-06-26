import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { issueVerificationCode } from "@/lib/emailVerification";
import { sendPasswordResetCode } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond ok to avoid leaking which emails exist; only actually send
  // when there's an account that can sign in with a password.
  if (user && user.hashedPassword) {
    try {
      const code = await issueVerificationCode(email);
      await sendPasswordResetCode(email, code, user.name);
    } catch (err) {
      console.error("[forgot-password] failed:", err);
      return NextResponse.json({ error: "Could not send the reset code." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
