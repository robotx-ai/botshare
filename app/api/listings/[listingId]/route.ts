import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { canManageServices } from "@/lib/adminAuth";
import { getWritesBlockedResponse } from "@/lib/writeGuard";

interface IParams {
  listingId?: string;
}

export async function DELETE(
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
      { error: "Forbidden: service provider access required." },
      { status: 403 }
    );
  }

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid service id." }, { status: 400 });
  }

  const listing = await prisma.listing.deleteMany({
    where: {
      id: listingId,
    },
  });

  return NextResponse.json(listing);
}
