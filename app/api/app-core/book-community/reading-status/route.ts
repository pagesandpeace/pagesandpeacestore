import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save books." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const bookId = typeof payload?.bookId === "string" ? payload.bookId : "";
  const status = ["want_to_read", "reading", "read"].includes(payload?.status) ? payload.status as string : null;
  if (!bookId) return NextResponse.json({ error: "Invalid book." }, { status: 400 });
  const db = supabaseService().schema("app_core");
  const [{ data: customer }, { data: book }] = await Promise.all([
    db.from("customers").select("auth_user_id").eq("auth_user_id", user.id).maybeSingle(),
    db.from("books").select("id").eq("id", bookId).maybeSingle(),
  ]);
  if (!customer || !book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  if (!status) await db.from("book_reading_statuses").delete().eq("book_id", bookId).eq("customer_id", user.id);
  else {
    const result = await db.from("book_reading_statuses").upsert({ book_id: bookId, customer_id: user.id, status, updated_at: new Date().toISOString() }, { onConflict: "book_id,customer_id" });
    if (result.error) return NextResponse.json({ error: "Could not save reading status." }, { status: 500 });
  }
  const { data: rows } = await db.from("book_reading_statuses").select("status").eq("book_id", bookId);
  const counts = { want_to_read: 0, reading: 0, read: 0 };
  for (const row of rows ?? []) if (row.status in counts) counts[row.status as keyof typeof counts] += 1;
  return NextResponse.json({ status, counts });
}
