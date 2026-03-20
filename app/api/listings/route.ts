import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { canManageServices } from "@/lib/adminAuth";
import { isServiceCategory } from "@/lib/serviceCategories";
import { isServiceAreaValue } from "@/lib/serviceLocation";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { getZipCentroid } from "@/lib/zipCentroid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

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

  const body = await request.json();
  const {
    title,
    description,
    imageSrc,
    videoSrc,
    category,
    roomCount,
    bathroomCount,
    guestCount,
    location,
    price,
    zipCode,
  } = body;

  if (!title || !description || !imageSrc) {
    return NextResponse.json(
      { error: "Missing required service fields." },
      { status: 400 }
    );
  }

  if (!location?.value) {
    return NextResponse.json(
      { error: "Service coverage area is required." },
      { status: 400 }
    );
  }

  if (!isServiceAreaValue(location.value)) {
    return NextResponse.json(
      {
        error: "Service coverage must be a supported Southern California area.",
      },
      { status: 400 }
    );
  }

  if (!isServiceCategory(category)) {
    return NextResponse.json(
      { error: "Invalid service category." },
      { status: 400 }
    );
  }

  const parsedGuestCount = Number(guestCount);
  const parsedRoomCount = Number(roomCount);
  const parsedBathroomCount = Number(bathroomCount);
  const parsedPrice = Number(price);

  if (
    !Number.isFinite(parsedGuestCount) ||
    !Number.isFinite(parsedRoomCount) ||
    !Number.isFinite(parsedBathroomCount) ||
    !Number.isFinite(parsedPrice) ||
    parsedGuestCount < 1 ||
    parsedRoomCount < 1 ||
    parsedBathroomCount < 1 ||
    parsedPrice < 1
  ) {
    return NextResponse.json(
      { error: "Invalid service capacity or pricing values." },
      { status: 400 }
    );
  }

  let geoFields: { lat?: number; lng?: number } = {};
  const normalizedZip = zipCode ? String(zipCode).trim() : "";
  if (/^\d{5}$/.test(normalizedZip)) {
    const centroid = await getZipCentroid(normalizedZip);
    if (centroid) geoFields = { lat: centroid.lat, lng: centroid.lng };
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      imageSrc,
      ...(videoSrc ? { videoSrc } : {}),
      category,
      roomCount: parsedRoomCount,
      bathroomCount: parsedBathroomCount,
      guestCount: parsedGuestCount,
      locationValue: location.value,
      ...(normalizedZip ? { zipCode: normalizedZip } : {}),
      ...geoFields,
      price: Math.floor(parsedPrice),
      userId: currentUser.id,
    },
  });

  return NextResponse.json(listing);
}
