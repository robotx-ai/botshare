import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdminEmail } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isAdminEmail(currentUser.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase storage not configured" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("service-images")
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage
    .from("service-images")
    .getPublicUrl(filename);

  return NextResponse.json({ url: data.publicUrl });
}
