import getCurrentUser from "@/app/actions/getCurrentUser";
import {
  buildFieldSnapshot,
  formatAgreementNo,
} from "@/lib/agreementTemplate";
import { clientIpFromHeaders } from "@/lib/clientIp";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const {
    listingId,
    startDate,
    endDate,
    totalPrice,
    tierId,
    robotCount,
    partyC,
    signedName,
    signedTitle,
  } = body ?? {};

  const partyCValid =
    partyC &&
    typeof partyC.legalName === "string" &&
    partyC.legalName.trim() &&
    typeof partyC.address === "string" &&
    partyC.address.trim() &&
    typeof partyC.contactName === "string" &&
    partyC.contactName.trim() &&
    typeof partyC.contactTitle === "string" &&
    partyC.contactTitle.trim();

  if (
    !listingId ||
    !startDate ||
    !endDate ||
    !totalPrice ||
    !tierId ||
    !robotCount ||
    !partyCValid ||
    !signedName?.trim() ||
    !signedTitle?.trim()
  ) {
    return NextResponse.json(
      { error: "Missing agreement fields." },
      { status: 400 }
    );
  }

  if (totalPrice <= 0) {
    return NextResponse.json(
      { error: "Invalid booking total." },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, locationValue: true, metro: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const signedAt = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json(
      { error: "Invalid rental dates." },
      { status: 400 }
    );
  }

  const monthPrefix = formatAgreementNo(signedAt, 0).slice(0, -4);
  const monthCount = await prisma.agreement.count({
    where: { agreementNo: { startsWith: monthPrefix } },
  });
  const agreementNo = formatAgreementNo(signedAt, monthCount + 1);

  const snapshot = buildFieldSnapshot({
    agreementNo,
    signedAt,
    listing: {
      title: listing.title,
      locationValue: listing.locationValue,
      metro: listing.metro,
    },
    startDate: start,
    endDate: end,
    totalPrice,
    tierId,
    robotCount,
    partyC,
  });

  const agreement = await prisma.agreement.create({
    data: {
      agreementNo,
      templateVersion: snapshot.templateVersion,
      userId: currentUser.id,
      listingId: listing.id,
      startDate: start,
      endDate: end,
      totalPrice,
      tierId,
      robotCount,
      partyCLegalName: partyC.legalName,
      partyCTaxId: partyC.taxId ?? null,
      partyCAddress: partyC.address,
      partyCContactName: partyC.contactName,
      partyCContactTitle: partyC.contactTitle,
      fieldSnapshot: JSON.parse(JSON.stringify(snapshot)),
      signedName,
      signedTitle,
      signedIp: clientIpFromHeaders(request.headers),
      status: "SIGNED",
    },
  });

  return NextResponse.json({
    agreementId: agreement.id,
    agreementNo: agreement.agreementNo,
  });
}
