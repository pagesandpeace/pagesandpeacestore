import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const reportId = typeof payload?.reportId === "string" ? payload.reportId : "";
  const action = ["hide_review","remove_review","hide_comment","remove_comment","dismiss"].includes(payload?.action) ? payload.action as string : null;
  if (!reportId || !action) return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 });
  const db = supabaseService().schema("app_core");
  const { data: report } = await db.from("book_community_reports").select("id,review_id,comment_id,status").eq("id", reportId).maybeSingle();
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  if (action === "hide_review" || action === "remove_review") {
    if (!report.review_id) return NextResponse.json({ error: "Report is not for a review." }, { status: 400 });
    await db.from("book_reviews").update({ status: action === "hide_review" ? "hidden" : "removed", updated_at: new Date().toISOString() }).eq("id", report.review_id);
  }
  if (action === "hide_comment" || action === "remove_comment") {
    if (!report.comment_id) return NextResponse.json({ error: "Report is not for a comment." }, { status: 400 });
    await db.from("book_review_comments").update({ status: action === "hide_comment" ? "hidden" : "removed", updated_at: new Date().toISOString() }).eq("id", report.comment_id);
  }
  const status = action === "dismiss" ? "dismissed" : "actioned";
  const result = await db.from("book_community_reports").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: admin.id }).eq("id", reportId);
  if (result.error) return NextResponse.json({ error: "Could not complete moderation." }, { status: 500 });
  return NextResponse.json({ success: true });
}
