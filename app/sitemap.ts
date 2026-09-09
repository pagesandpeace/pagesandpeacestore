import type { MetadataRoute } from "next";
import { appCoreDb } from "@/lib/app-core/service";

const SITE="https://pagesandpeace.co.uk";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const db=appCoreDb();
 const [{data:events},{data:series}]=await Promise.all([
  db.from("events").select("slug,updated_at,starts_at").eq("status","published").order("starts_at",{ascending:false}),
  db.from("event_series").select("slug,updated_at").eq("is_public",true)
 ]);
 return [
  {url:SITE,changeFrequency:"weekly",priority:1},{url:`${SITE}/events`,changeFrequency:"daily",priority:.9},{url:`${SITE}/menu`,changeFrequency:"weekly",priority:.7},{url:`${SITE}/about`,changeFrequency:"monthly",priority:.6},{url:`${SITE}/contact`,changeFrequency:"monthly",priority:.5},
  ...(series??[]).map(s=>({url:`${SITE}/events/${s.slug}`,lastModified:s.updated_at,changeFrequency:"weekly" as const,priority:.85})),
  ...(events??[]).map(e=>({url:`${SITE}/events/${e.slug}`,lastModified:e.updated_at,changeFrequency:new Date(e.starts_at)>new Date()?"daily" as const:"never" as const,priority:new Date(e.starts_at)>new Date()?.8:.3}))
 ];
}
