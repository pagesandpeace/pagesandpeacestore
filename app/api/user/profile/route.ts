import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ user: null });
  }

  const authId = auth.user.id;
  const authEmail = auth.user.email ?? "";

  // Try loading via email
  let { data: profile } = await supabase
    .from("users")
    .select("id, email, name, image, role, auth_provider")
    .eq("email", authEmail)
    .maybeSingle();

  // Fallback: load via ID
  if (!profile) {
    const { data: byId } = await supabase
      .from("users")
      .select("id, email, name, image, role, auth_provider")
      .eq("id", authId)
      .maybeSingle();

    profile = byId ?? null;
  }

  // Fallback profile (rare)
  if (!profile) {
    return NextResponse.json({
      user: {
        id: authId,
        email: authEmail,
        name: "",
        image: null,
        role: "customer",
        auth_provider: "credentials",
      },
    });
  }

  return NextResponse.json({
    user: {
      id: profile.id,
      name: profile.name ?? "",
      email: profile.email,
      image: profile.image ?? null,
      role: profile.role ?? "customer",
      auth_provider: profile.auth_provider ?? "credentials",
    },
  });
}

/* -------------------------------------------------------
   PATCH — update display name
------------------------------------------------------- */
export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const newName = body.name?.toString().trim();

  if (!newName || newName.length < 2) {
    return NextResponse.json(
      { error: "Invalid name" },
      { status: 400 }
    );
  }

  const { error: updateErr } = await supabase
    .from("users")
    .update({
      name: newName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (updateErr) {
    console.error("Update profile error:", updateErr);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, name: newName });
}
