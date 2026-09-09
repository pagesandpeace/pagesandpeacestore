import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedEvent } from "@/lib/app-core/events";
import { getPublicEventSeries } from "@/lib/app-core/event-series";
import { EventTicketPicker } from "@/components/app-core/event-ticket-picker";

type PageProps={params:Promise<{slug:string}>};
const SITE="https://pagesandpeace.co.uk";
const fmt=(v:string)=>new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
const dateParts=(v:string)=>{const d=new Date(v);return{day:new Intl.DateTimeFormat("en-GB",{day:"2-digit"}).format(d),month:new Intl.DateTimeFormat("en-GB",{month:"short"}).format(d).toUpperCase(),weekday:new Intl.DateTimeFormat("en-GB",{weekday:"short"}).format(d),time:new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit"}).format(d),year:new Intl.DateTimeFormat("en-GB",{year:"numeric"}).format(d)}};

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
 const {slug}=await params; const series=await getPublicEventSeries(slug);
 if(series){const description=series.seo_description??series.short_description??`Discover upcoming ${series.name} events at Pages & Peace.`;return{title:series.seo_title??`${series.name} events | Pages & Peace`,description,alternates:{canonical:`${SITE}/events/${series.slug}`},openGraph:{title:series.seo_title??series.name,description,url:`${SITE}/events/${series.slug}`,images:series.image_url?[series.image_url]:undefined}};}
 const event=await getPublishedEvent(slug); if(!event)return{title:"Event not found"};
 const description=event.short_description??event.subtitle??`Join us for ${event.title} at Pages & Peace.`;
 return{title:`${event.title} | Pages & Peace`,description,alternates:{canonical:`${SITE}/events/${event.slug}`},openGraph:{title:event.title,description,url:`${SITE}/events/${event.slug}`,type:"website",images:event.image_url?[event.image_url]:undefined}};
}

export default async function EventOrSeriesPage({params}:PageProps){
 const {slug}=await params; const series=await getPublicEventSeries(slug);
 if(series){
  const now=Date.now();
  const upcoming=series.events.filter(e=>new Date(e.starts_at).getTime()>=now);
  const past=series.events.filter(e=>new Date(e.starts_at).getTime()<now).reverse().slice(0,12);
  return <main className="min-h-screen bg-background pb-20">
    <section className="bg-[#f5efe9] px-6 py-16"><div className="mx-auto max-w-5xl"><Link href="/events" className="text-sm underline">← All events</Link><p className="mt-8 text-sm font-semibold uppercase tracking-[.2em] text-neutral-500">Event series</p><h1 className="mt-2 text-4xl font-bold md:text-6xl">{series.name}</h1>{series.short_description?<p className="mt-5 max-w-3xl text-xl text-neutral-700">{series.short_description}</p>:null}</div></section>
    <section className="mx-auto max-w-5xl px-6 py-12">
      {series.description?<p className="mb-10 max-w-3xl whitespace-pre-line text-lg leading-8 text-neutral-700">{series.description}</p>:null}
      <h2 className="text-2xl font-bold">Upcoming dates</h2>
      {upcoming.length?<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{upcoming.map(e=>{const d=dateParts(e.starts_at);return <Link key={e.id} href={`/events/${e.slug}`} className="group flex min-h-40 flex-col items-center justify-center rounded-2xl border bg-white px-3 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="text-xs font-semibold uppercase tracking-[.18em] text-neutral-500">{d.weekday}</span><span className="mt-1 text-4xl font-bold leading-none">{d.day}</span><span className="mt-1 text-sm font-bold tracking-wide">{d.month}</span><span className="mt-2 text-xs text-neutral-500">{d.year} · {d.time}</span><span className="mt-3 text-xs font-semibold underline underline-offset-4 group-hover:no-underline">View & book</span></Link>})}</div>:<p className="mt-5 text-neutral-600">No new dates are currently on sale. Check back soon.</p>}
      {past.length?<><h2 className="mt-14 text-2xl font-bold">Previous dates</h2><div className="mt-5 flex flex-wrap gap-2">{past.map(e=><span key={e.id} className="rounded-full border px-3 py-2 text-sm text-neutral-600">{fmt(e.starts_at)}</span>)}</div></>:null}
    </section>
  </main>;
 }
 const event=await getPublishedEvent(slug); if(!event)notFound(); if(event.slug!==slug)permanentRedirect(`/events/${event.slug}`);
 const soldOut=event.remaining_seats<=0; const past=new Date(event.starts_at).getTime()<Date.now(); const low=!soldOut&&event.remaining_seats<=5;
 const jsonLd={"@context":"https://schema.org","@type":"Event",name:event.title,description:event.short_description??event.description,startDate:event.starts_at,eventStatus:past?"https://schema.org/EventCompleted":"https://schema.org/EventScheduled",eventAttendanceMode:"https://schema.org/OfflineEventAttendanceMode",location:{"@type":"Place",name:"Pages & Peace",address:{"@type":"PostalAddress",addressCountry:"GB"}},image:event.image_url?[event.image_url]:undefined,url:`${SITE}/events/${event.slug}`,offers:event.ticket_types.map(t=>({"@type":"Offer",price:(t.price_pence/100).toFixed(2),priceCurrency:"GBP",availability:soldOut?"https://schema.org/SoldOut":"https://schema.org/InStock",url:`${SITE}/events/${event.slug}`}))};
 return <main className="min-h-screen bg-background pb-20 font-[Montserrat]"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}}/><div className="relative min-h-80 h-[48vh] w-full bg-[#e8dfd6]">{event.image_url?<Image src={event.image_url} alt={event.title} fill priority sizes="100vw" className="object-cover"/>:null}<div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent"/><div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-6 pb-10 text-white"><Link href="/events" className="text-sm underline">← All events</Link><h1 className="mt-4 text-4xl font-bold md:text-5xl">{event.title}</h1>{event.subtitle?<p className="mt-3 text-xl text-white/90">{event.subtitle}</p>:null}</div></div><div className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-[1fr_20rem]"><article className="space-y-7 text-lg leading-relaxed text-foreground/85">{event.series_name&&event.series_id?<Link href={`/events/${event.series_name==="Silent Read"?"silent-reading":event.series_name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`} className="inline-flex rounded-full bg-[#f5efe9] px-4 py-2 text-sm font-semibold">Explore the {event.series_name} series →</Link>:null}{event.short_description?<p className="text-xl font-medium text-foreground">{event.short_description}</p>:null}<div><h2 className="mb-3 text-2xl font-semibold">About this event</h2><p className="whitespace-pre-line">{event.description}</p></div></article><aside className="h-fit rounded-2xl border border-black/10 bg-white p-6 shadow-sm lg:sticky lg:top-6"><dl className="space-y-4 text-sm"><div><dt className="font-semibold">Date &amp; time</dt><dd className="mt-1 text-foreground/70">{fmt(event.starts_at)}</dd></div><div><dt className="font-semibold">Availability</dt><dd className={`mt-1 font-medium ${low?"text-amber-700":"text-foreground/70"}`}>{past?"This event has ended":soldOut?"Sold out":low?`Only ${event.remaining_seats} ${event.remaining_seats===1?"ticket":"tickets"} left`:`${event.remaining_seats} places remaining`}</dd></div></dl>{!past?<EventTicketPicker tickets={event.ticket_types.map(t=>({id:t.id,name:t.name,price_pence:t.price_pence}))} soldOut={soldOut} remainingSeats={event.remaining_seats}/>:null}</aside></div></main>;
}
