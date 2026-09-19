import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ShareReviewButton from "@/components/community/ShareReviewButton";
import ReviewCommunityActions from "@/components/community/ReviewCommunityActions";
import { getPublicReview } from "@/lib/app-core/book-reviews";

type Props = { params: Promise<{ slug: string; reviewId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, reviewId } = await params;
  const data = await getPublicReview(slug, reviewId);
  if (!data) return { title: "Book review" };
  const excerpt = data.review.body.replace(/\s+/g, " ").slice(0, 155);
  return {
    title: `${data.review.reviewer.name} reviews ${data.book.title}`,
    description: excerpt,
    alternates: { canonical: `/books/${slug}/reviews/${data.review.share_slug ?? data.review.id}` },
    openGraph: {
      title: `${data.review.reviewer.name} reviews ${data.book.title}`,
      description: excerpt,
      type: "article",
    },
  };
}

export default async function ReviewPage({ params }: Props) {
  const { slug, reviewId } = await params;
  const data = await getPublicReview(slug, reviewId);
  if (!data) notFound();
  const sharePath = `/books/${slug}/reviews/${data.review.share_slug ?? data.review.id}`;
  const shareUrl = `https://pagesandpeace.co.uk${sharePath}`;

  return <><Navbar /><main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#17221f]">
    <div className="mx-auto max-w-3xl">
      <Link href={`/books/${slug}`} className="text-sm font-semibold text-[#189458] underline">← {data.book.title}</Link>
      <article className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
        {data.review.image_url ? <div className="relative aspect-[4/3] bg-[#f5f2ed] sm:aspect-[16/10]"><Image src={data.review.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain p-3 md:p-4" /></div> : null}
        <div className="p-6 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-widest text-[#189458]">Reader review</p><h1 className="mt-2 text-3xl font-semibold">{data.book.title}</h1><p className="mt-1 text-neutral-500">by {data.book.author}</p></div>
            <p className="text-xl tracking-widest text-[#189458]" aria-label={`${data.review.rating} out of 5 stars`}>{"★".repeat(data.review.rating)}<span className="text-neutral-200">{"★".repeat(5-data.review.rating)}</span></p>
          </div>
          <div className="mt-6 flex items-center gap-3 border-y py-4">
            <Image src={data.review.reviewer.image || "/user_avatar_placeholder.svg"} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            <div><p className="font-semibold">{data.review.reviewer.name}</p><p className="text-xs text-neutral-500">{new Date(data.review.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}{data.review.edited_at ? " · edited" : ""}</p></div>
          </div>
          {data.review.contains_spoilers ? <p className="mt-6 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Contains spoilers</p> : null}
          <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-neutral-700">{data.review.body}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3"><ShareReviewButton url={shareUrl} title={`${data.review.reviewer.name} reviews ${data.book.title}`} text={`A Pages & Peace reader review of ${data.book.title} by ${data.book.author}`} /><Link href="/dashboard/reviews/new" className="rounded-full bg-[#17221f] px-4 py-2 text-sm font-semibold text-white">Add your review</Link></div>
          <ReviewCommunityActions reviewId={data.review.id} initialHelpful={data.review.helpful_count} initialLove={data.review.love_count} initialComments={data.comments} initialCommentCount={data.review.comment_count} initialHasMoreComments={data.commentPagination.hasMore} initialCommentCursor={data.commentPagination.cursor} />
        </div>
      </article>
    </div>
  </main></>;
}
