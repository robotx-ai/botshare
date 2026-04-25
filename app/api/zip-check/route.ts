import { NextResponse } from "next/server";
import { getZipData } from "@/lib/zipMetro";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = (searchParams.get("zip") ?? "").trim();
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ serviceable: false, data: null });
  }
  const data = getZipData(zip);
  return NextResponse.json({ serviceable: data !== null, data });
}
