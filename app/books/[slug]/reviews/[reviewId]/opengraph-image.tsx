import { ImageResponse } from "next/og";
import { getPublicReview } from "@/lib/app-core/book-reviews";

export const alt = "Pages & Peace community book review";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; reviewId: string }> }) {
  const { slug, reviewId } = await params;
  const data = await getPublicReview(slug, reviewId);
  const title = data?.book.title ?? "Pages & Peace";
  const author = data?.book.author ?? "Reading community";
  const reviewer = data?.review.reviewer.name ?? "Pages & Peace reader";
  const rating = data?.review.rating ?? 5;
  const excerpt = data?.review.body.replace(/\s+/g, " ").slice(0, 180) ?? "Books are better when we talk about them.";
  return new ImageResponse(<div style={{ width:"100%",height:"100%",display:"flex",background:"#FAF6F1",color:"#17221f",padding:"64px",fontFamily:"sans-serif" }}>
    <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"100%",border:"2px solid #d9d1c7",borderRadius:"32px",padding:"54px",background:"white"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{fontSize:24,fontWeight:700,letterSpacing:3,color:"#189458"}}>PAGES & PEACE · READER REVIEW</div><div style={{fontSize:34,color:"#189458"}}>{"★".repeat(rating)}</div></div>
      <div style={{display:"flex",flexDirection:"column"}}><div style={{fontSize:64,fontWeight:700,lineHeight:1.05}}>{title}</div><div style={{fontSize:30,marginTop:12,color:"#64605b"}}>by {author}</div><div style={{fontSize:30,lineHeight:1.4,marginTop:34,color:"#3d3a36"}}>“{excerpt}{data && data.review.body.length>180?"…":""}”</div></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:24}}><span>{reviewer}</span><span style={{color:"#64605b"}}>pagesandpeace.co.uk</span></div>
    </div>
  </div>, size);
}
