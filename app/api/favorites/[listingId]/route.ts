import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

interface IPrisma {
  listingId?: string;
}

export async function POST(request: Request, { params }: { params: IPrisma }) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();

  
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid service id." }, { status: 400 });
  }

  const favorite = await prisma.userFavorite.upsert({
    where: {
      userId_listingId: {
        userId: currentUser.id,
        listingId,
      },
    },
    create: {
      userId: currentUser.id,
      listingId,
    },
    update: {},
  });

  return NextResponse.json(favorite);
}

export async function DELETE(
  request: Request,
  { params }: { params: IPrisma }
) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "Invalid service id." }, { status: 400 });
  }

  const favorite = await prisma.userFavorite.deleteMany({
    where: {
      userId: currentUser.id,
      listingId,
    },
  });

  return NextResponse.json(favorite);
}
