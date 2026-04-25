import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { canManageServices } from "@/lib/adminAuth";
import { isServiceCategory } from "@/lib/serviceCategories";
import { getMetroLabel, getZipData } from "@/lib/zipMetro";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
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
    price,
    zipCode,
  } = body;

  if (!title || !description || !imageSrc) {
    return NextResponse.json(
      { error: "Missing required service fields." },
      { status: 400 }
    );
  }

  const normalizedZip = zipCode ? String(zipCode).trim() : "";
  if (!/^\d{5}$/.test(normalizedZip)) {
    return NextResponse.json(
      { error: "A 5-digit zip code is required." },
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
      locationValue: getMetroLabel(zipData.metro),
      metro: zipData.metro,
      zipCode: normalizedZip,
      lat: zipData.lat,
      lng: zipData.lng,
      price: Math.floor(parsedPrice),
      userId: currentUser.id,
    },
  });

  return NextResponse.json(listing);
}
