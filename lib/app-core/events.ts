import "server-only";

import { appCoreDb } from "./service";

export type CoreEvent = { id:string; slug:string; title:string; subtitle:string|null; short_description:string|null; description:string; starts_at:string; capacity:number; image_url:string|null; series_id?:string|null; series_name?:string|null };
export type CoreTicketType = { id:string; name:string; description:string|null; price_pence:number; capacity:number|null };

function reportCoreQueryError(operation:string,error:{code?:string;message?:string}) { console.error("app_core query failed",{operation,code:error.code??"unknown",message:error.message??"unknown"}); }

async function reservedSeats(eventId:string) {
  const db=appCoreDb();
  const {data:bookings,error}=await db.from("bookings").select("quantity,status,order_line_id").eq("event_id",eventId).in("status",["pending","confirmed"]);
  if(error){reportCoreQueryError("reservedSeats",error);throw new Error("Unable to load event availability");}
  const ids=(bookings??[]).map(b=>b.order_line_id); const refunded=new Map<string,number>();
  if(ids.length){const {data:lines,error:e}=await db.from("order_lines").select("id,refunded_quantity").in("id",ids);if(e)throw new Error("Unable to load event availability");for(const l of lines??[])refunded.set(l.id,Number(l.refunded_quantity??0));}
  return (bookings??[]).reduce((t,b)=>b.status==="pending"?t+Number(b.quantity):t+Math.max(0,Number(b.quantity)-(refunded.get(b.order_line_id)??0)),0);
}

export async function listPublishedEvents(){const db=appCoreDb();const {data,error}=await db.from("events").select("id,slug,title,subtitle,short_description,starts_at,capacity,image_url,series_id,series_name").eq("status","published").gte("starts_at",new Date().toISOString()).order("starts_at",{ascending:true});if(error)throw new Error("Unable to load events");return Promise.all((data??[]).map(async e=>({...e,remaining_seats:Math.max(e.capacity-await reservedSeats(e.id),0)})));}

export async function getPublishedEvent(slug:string){
  const db=appCoreDb();
  const {data:event,error}=await db.from("events").select("id,slug,legacy_slug,title,subtitle,short_description,description,starts_at,capacity,image_url,series_id,series_name").or(`slug.eq.${slug},legacy_slug.eq.${slug}`).eq("status","published").maybeSingle();
  if(error||!event)return null;
  const {data:ticketTypes,error:ticketError}=await db.from("ticket_types").select("id,name,description,price_pence,capacity").eq("event_id",event.id).eq("is_active",true).order("price_pence",{ascending:true});
  if(ticketError){reportCoreQueryError("getPublishedEventTicketTypes",ticketError);throw new Error("Unable to load ticket types");}
  return {...event,ticket_types:ticketTypes??[],remaining_seats:Math.max(event.capacity-await reservedSeats(event.id),0)};
}
