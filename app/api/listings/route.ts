import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { hasRobotxAdminConfig, isRobotxAdminEmail } from "@/lib/robotxAdmin";
import { isRobotxServiceCategory } from "@/lib/robotxServiceCategories";
import { isServiceAreaValue } from "@/lib/serviceLocation";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRobotxAdminConfig()) {
    return NextResponse.json(
      { error: "ROBOTX_ADMIN_EMAILS is not configured." },
      { status: 500 }
    );
  }

  if (!isRobotxAdminEmail(currentUser.email)) {
    return NextResponse.json(
      { error: "Forbidden: admin access required." },
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

  if (!isRobotxServiceCategory(category)) {
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
      locationValue: location.value,
      price: Math.floor(parsedPrice),
      userId: currentUser.id,
    },
  });

  return NextResponse.json(listing);
}
