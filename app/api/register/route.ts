import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { issueVerificationCode } from "@/lib/emailVerification";
import { sendVerificationCode } from "@/lib/email";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const body = await request.json();
  const { email, name, password, userType, phone, businessName, termsVersion } = body;

  if (userType !== "CUSTOMER" && userType !== "PROVIDER") {
    return NextResponse.json({ error: "Invalid user type." }, { status: 400 });
  }

  if (userType === "CUSTOMER") {
    if (typeof termsVersion !== "string" || termsVersion.length === 0) {
      return NextResponse.json(
        { error: "You must accept the Terms to continue." },
        { status: 400 }
      );
    }
  }

  // Reject duplicate emails up-front for a clean client message.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      userType,
      // emailVerified stays null until the code is confirmed.
      ...(phone ? { phone } : {}),
      ...(businessName ? { businessName } : {}),
      ...(userType === "CUSTOMER"
        ? { termsAcceptedAt: new Date(), termsAcceptedVersion: termsVersion }
        : {}),
    },
  });

  // Issue + email the verification code. Storing the code is what matters for
  // the flow; if the email transport hiccups we still return ok and let the
  // user hit "Resend".
  try {
    const code = await issueVerificationCode(email);
    await sendVerificationCode(email, code, name);
  } catch (err) {
    console.error("[register] verification email failed:", err);
  }

  return NextResponse.json({ ok: true, id: user.id });
}
