import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { canManageServices } from "@/lib/adminAuth";
import { isProviderProfileComplete } from "@/lib/providerProfile";
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

  // Anyone listing must have a complete provider profile (name, phone, company).
  if (!isProviderProfileComplete(currentUser)) {
    return NextResponse.json(
      { error: "Complete your provider profile (name, phone, company) before listing." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const {
    title,
    description,
    imageSrc,
    videoSrc,
    sku,
    skuImageSrc,
    zipCode,
    robotModelId,
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

  if (!robotModelId) {
    return NextResponse.json(
      { error: "A robot model is required." },
      { status: 400 }
    );
  }

  const robot = await prisma.robotModel.findUnique({
    where: { id: String(robotModelId) },
    select: { id: true, listable: true, useCase: true, priceDaily: true },
  });

  if (!robot || !robot.listable) {
    return NextResponse.json(
      { error: "Selected robot model is not available for listing." },
      { status: 400 }
    );
  }

  if (robot.priceDaily == null || robot.useCase.length === 0) {
    return NextResponse.json(
      { error: "Selected robot model is missing pricing or use case." },
      { status: 400 }
    );
  }

  const derivedCategory = robot.useCase[0];
  const derivedPrice = robot.priceDaily;

  const parsedGuestCount = 1;
  const parsedRoomCount = 1;
  const parsedBathroomCount = 1;

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      imageSrc,
      ...(videoSrc ? { videoSrc } : {}),
      ...(sku ? { sku: String(sku) } : {}),
      ...(skuImageSrc ? { skuImageSrc: String(skuImageSrc) } : {}),
      category: derivedCategory,
      roomCount: parsedRoomCount,
      bathroomCount: parsedBathroomCount,
      guestCount: parsedGuestCount,
      locationValue: getMetroLabel(zipData.metro),
      metro: zipData.metro,
      zipCode: normalizedZip,
      lat: zipData.lat,
      lng: zipData.lng,
      price: derivedPrice,
      userId: currentUser.id,
      robotModelId: robot.id,
    },
  });

  return NextResponse.json(listing);
}
