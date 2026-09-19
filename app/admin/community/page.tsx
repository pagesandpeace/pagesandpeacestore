import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";
import CommunityModerationActions from "@/components/admin/CommunityModerationActions";

export const dynamic = "force-dynamic";

export default async function CommunityAdminPage() {
  if (!await requireAdminUser()) redirect("/sign-in?callbackURL=/admin/community");
  const db = supabaseService().schema("app_core");
  const [{ data: reports }, { data: recentReviews }] = await Promise.all([
    db.from("book_community_reports").select("id,review_id,comment_id,reason,details,status,created_at,reporter_customer_id").eq("status","open").order("created_at",{ascending:true}).limit(100),
    db.from("book_reviews").select("id,book_id,customer_id,rating,body,status,created_at,share_slug").order("created_at",{ascending:false}).limit(20),
  ]);
  const bookIds=[...new Set((recentReviews??[]).map(r=>r.book_id))];
  const {data:books}=bookIds.length?await db.from("books").select("id,title,author,slug").in("id",bookIds):{data:[]};
  const byBook=new Map((books??[]).map(b=>[b.id,b]));
  return <div><div className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-neutral-500">Community safety</p><h1 className="mt-1 text-3xl font-semibold">Book community moderation</h1><p className="mt-2 text-sm text-neutral-600">Reports are reviewed by a human before content is hidden or removed.</p></div><Link href="/book-reviews" className="text-sm font-semibold text-[#189458] underline">View public community</Link></div>
    <section className="mt-8"><h2 className="text-xl font-semibold">Open reports · {reports?.length??0}</h2><div className="mt-4 space-y-3">{(reports??[]).map(report=><article key={report.id} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold capitalize">{report.reason}</p><p className="mt-1 text-xs text-neutral-500">{report.review_id?"Review report":"Comment report"} · {new Date(report.created_at).toLocaleString("en-GB")}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Open</span></div>{report.details?<p className="mt-3 text-sm text-neutral-700">{report.details}</p>:null}<CommunityModerationActions reportId={report.id} target={report.review_id?"review":"comment"}/></article>)}{!reports?.length?<div className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">No open reports.</div>:null}</div></section>
    <section className="mt-10"><h2 className="text-xl font-semibold">Recent reviews</h2><div className="mt-4 overflow-hidden rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F3ECE5] text-xs uppercase tracking-wide text-neutral-600"><tr><th className="px-4 py-3">Book</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Posted</th></tr></thead><tbody>{(recentReviews??[]).map(review=>{const book=byBook.get(review.book_id);return <tr key={review.id} className="border-t"><td className="px-4 py-3">{book?<Link href={`/books/${book.slug}/reviews/${review.share_slug??review.id}`} className="font-semibold underline">{book.title}</Link>:"Book"}</td><td className="px-4 py-3">{"★".repeat(review.rating)}</td><td className="px-4 py-3 capitalize">{review.status}</td><td className="px-4 py-3">{new Date(review.created_at).toLocaleDateString("en-GB")}</td></tr>})}</tbody></table></div></section>
  </div>;
}
