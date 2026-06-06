import prisma from "@/lib/prismadb";
import { TERMS_VERSION } from "@/lib/termsContent";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
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

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      userType,
      ...(phone ? { phone } : {}),
      ...(businessName ? { businessName } : {}),
      ...(userType === "CUSTOMER"
        ? { termsAcceptedAt: new Date(), termsAcceptedVersion: termsVersion }
        : {}),
    },
  });

  return NextResponse.json(user);
}
