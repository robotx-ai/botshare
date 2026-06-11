import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

// Lets a signed-in user update their own profile fields. Cannot change email,
// userType, or verified.
export async function PATCH(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const data: { name?: string; phone?: string; businessName?: string } = {};

  for (const field of ["name", "phone", "businessName"] as const) {
    if (body[field] === undefined) continue;
    const value = String(body[field]).trim();
    if (!value) {
      return NextResponse.json(
        { error: `${field} cannot be empty.` },
        { status: 400 }
      );
    }
    data[field] = value;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      businessName: true,
      verified: true,
      userType: true,
    },
  });

  return NextResponse.json(updated);
}
