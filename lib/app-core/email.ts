import "server-only";

import { getResendClient, FROM } from "@/lib/email/client";
import { appCoreDb } from "@/lib/app-core/service";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function sendAppCoreBookingConfirmation(orderId: string) {
  const db = appCoreDb();
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, auth_user_id, total_pence, currency, paid_at")
    .eq("id", orderId)
    .eq("status", "paid")
    .single();
  if (orderError || !order) throw new Error("Confirmed order not found");

  const { data: customer, error: customerError } = await db
    .from("customers")
    .select("email, display_name")
    .eq("auth_user_id", order.auth_user_id)
    .single();
  if (customerError || !customer?.email) throw new Error("Customer email not found");

  const { data: lines, error: linesError } = await db
    .from("order_lines")
    .select("item_name, quantity, unit_amount_pence")
    .eq("order_id", orderId);
  if (linesError || !lines?.length) throw new Error("Order lines not found");

  const { data: delivery } = await db
    .from("email_deliveries")
    .select("sent_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (delivery?.sent_at) return;

  await db.from("email_deliveries").upsert({ order_id: orderId, kind: "booking_confirmation" }, { onConflict: "order_id" });

  const items = lines.map((line) => `<li style="margin:8px 0">${escapeHtml(line.item_name)} × ${line.quantity} — £${((line.unit_amount_pence * line.quantity) / 100).toFixed(2)}</li>`).join("");
  const total = new Intl.NumberFormat("en-GB", { style: "currency", currency: order.currency.toUpperCase() }).format(order.total_pence / 100);

  const { data, error } = await getResendClient().emails.send({
    from: FROM,
    to: customer.email,
    subject: "Your Pages & Peace event booking is confirmed",
    html: `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1a1a1a">
      <h1>Booking confirmed</h1>
      <p>Thank you${customer.display_name ? `, ${escapeHtml(customer.display_name)}` : ""}. Your event booking is confirmed.</p>
      <ul>${items}</ul>
      <p><strong>Total paid: ${total}</strong></p>
      <p>Your booking reference is ${order.id}.</p>
    </main>`,
  }, { headers: { "Idempotency-Key": `app-core-booking-confirmation-${orderId}` } });

  if (error) throw new Error("Email provider rejected confirmation");
  await db.from("email_deliveries").update({ provider_message_id: data?.id ?? null, sent_at: new Date().toISOString() }).eq("order_id", orderId);
}
