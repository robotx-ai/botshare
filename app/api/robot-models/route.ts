import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { canManageServices } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

// Curated robot catalog a provider picks from when creating a listing.
// Gated to the same audience that can create services (providers + admins).
export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageServices(currentUser)) {
    return NextResponse.json(
      { error: "Forbidden: service provider access required." },
      { status: 403 }
    );
  }

  const robots = await prisma.robotModel.findMany({
    orderBy: [{ brand: "asc" }, { model: "asc" }],
    select: {
      id: true,
      slug: true,
      brand: true,
      model: true,
      productName: true,
      description: true,
      msrp: true,
      serviceCategory: true,
      capabilityTag: true,
      imageUrl: true,
    },
  });

  return NextResponse.json(robots);
}
