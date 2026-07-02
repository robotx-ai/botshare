import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { canManageServices } from "@/lib/adminAuth";
import { canClaimListing } from "@/lib/individualListing";
import { getMetroLabel, getZipData } from "@/lib/zipMetro";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

interface IParams {
  listingId?: string;
}

export async function POST(
  request: Request,
  { params }: { params: IParams }
) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageServices(currentUser)) {
    return NextResponse.json(
      { error: "Forbidden: service operator access required." },
      { status: 403 }
    );
  }

  const { listingId } = params;
  if (!listingId) {
    return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
  }

  const body = await request.json();
  const normalizedZip = body?.zipCode ? String(body.zipCode).trim() : "";
  if (!/^\d{5}$/.test(normalizedZip)) {
    return NextResponse.json(
      { error: "A 5-digit operating zip code is required." },
      { status: 400 }
    );
  }
  const zipData = getZipData(normalizedZip);
  if (!zipData) {
    return NextResponse.json(
      { error: "Zip code is not in a supported service area." },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, isIndividualOwned: true, status: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Robot not found." }, { status: 404 });
  }
  if (!canClaimListing(listing)) {
    return NextResponse.json(
      { error: "This robot is no longer available to claim." },
      { status: 409 }
    );
  }

  const claim = await prisma.listing.updateMany({
    where: { id: listingId, isIndividualOwned: true, status: "AVAILABLE" },
    data: {
      operatorId: currentUser.id,
      status: "CLAIMED",
      claimedAt: new Date(),
      metro: zipData.metro,
      zipCode: normalizedZip,
      lat: zipData.lat,
      lng: zipData.lng,
      locationValue: getMetroLabel(zipData.metro),
    },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      { error: "This robot was just claimed by someone else." },
      { status: 409 }
    );
  }
  const updated = await prisma.listing.findUnique({ where: { id: listingId } });

  return NextResponse.json(updated);
}
