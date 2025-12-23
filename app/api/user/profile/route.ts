import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* -------------------------------------------------------
   GET — load current user (SOURCE OF TRUTH: auth_user_id)
------------------------------------------------------- */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ user: null });
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, name, image, role, auth_provider")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (error || !profile) {
    console.error("[API /user] profile lookup failed", error);

    return NextResponse.json({
      user: {
        id: auth.user.id,
        email: auth.user.email,
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
      email: profile.email,
      name: profile.name ?? "",
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
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      name: newName,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", auth.user.id);

  if (error) {
    console.error("[API /user] name update failed", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, name: newName });
}
