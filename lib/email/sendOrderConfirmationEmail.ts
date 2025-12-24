import { createClient } from "@supabase/supabase-js";
import { getResendClient, FROM } from "@/lib/email/client";

/* -----------------------------------------------------
   Supabase (SERVICE ROLE)
----------------------------------------------------- */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);


/* =====================================================
   SEND ORDER CONFIRMATION EMAIL
===================================================== */
export async function sendOrderConfirmationEmail(orderId: string) {
  console.log("🔍 Fetching order details for Order ID:", orderId);

  /* -----------------------------------------------------
     Fetch order + items (NO users join)
  ----------------------------------------------------- */
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      total,
      created_at,
      stripe_receipt_url,
      stripe_card_brand,
      stripe_last4,
      user_id_uuid,
      order_items (
        kind,
        name,
        quantity,
        price
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("❌ Order fetch failed", error);
    return; // webhook-safe
  }

  /* -----------------------------------------------------
     Resolve email via Supabase Auth (SOURCE OF TRUTH)
  ----------------------------------------------------- */
  const { data: authUser, error: authErr } =
    await supabase.auth.admin.getUserById(order.user_id_uuid);

  if (authErr || !authUser?.user?.email) {
    console.error(
      "❌ No email found in auth.users for order:",
      orderId,
      authErr
    );
    return; // webhook-safe
  }

  const userEmail = authUser.user.email;
  console.log("📧 Email resolved from auth.users:", userEmail);

  const items = order.order_items ?? [];

  /* -----------------------------------------------------
     Formatting
  ----------------------------------------------------- */
  const formattedTotal = Number(order.total).toFixed(2);

  const date = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const LOGO_URL =
    "https://res.cloudinary.com/dadinnds6/image/upload/v1763726107/Logo_new_update_in_green_no_background_mk3ptz.png";

  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;font-size:15px">
            ${item.name ?? "Item"} × ${item.quantity}
          </td>
          <td style="padding:8px 0;text-align:right;font-size:15px">
            £${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `
    )
    .join("");

  const paymentLine =
    order.stripe_card_brand && order.stripe_last4
      ? `<p style="font-size:14px;color:#555">
          Paid with ${order.stripe_card_brand.toUpperCase()} •••• ${order.stripe_last4}
        </p>`
      : "";

  const isEventOnly =
    items.length > 0 && items.every((item) => item.kind === "event");

  const subject = isEventOnly
    ? "Your Pages & Peace event booking is confirmed"
    : "Your Pages & Peace order is confirmed";

  const html = `
    <div style="background:#FAF6F1;padding:40px 0;font-family:Montserrat,sans-serif">
      <div style="max-width:640px;margin:0 auto;background:#fff;padding:32px 40px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <img src="${LOGO_URL}" style="max-width:200px" />
        </div>

        <h2 style="text-align:center">
          Thank you for your ${isEventOnly ? "booking" : "order"}
        </h2>

        <p style="text-align:center">
          Your Pages & Peace ${isEventOnly ? "event booking" : "order"} has been confirmed.
        </p>

        <hr />

        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${date}</p>

        <table style="width:100%">
          ${itemsHtml}
        </table>

        <hr />

        <p><strong>Total: £${formattedTotal}</strong></p>

        ${paymentLine}

        ${
          order.stripe_receipt_url
            ? `<p><a href="${order.stripe_receipt_url}" target="_blank">View Stripe receipt</a></p>`
            : ""
        }
      </div>
    </div>
  `;

  /* -----------------------------------------------------
     SEND EMAIL (NON-BLOCKING)
  ----------------------------------------------------- */
  try {
    console.log("📧 Sending email to:", userEmail);

    const resend = getResendClient();

    await resend.emails.send({
      from: FROM,
      to: userEmail,
      subject,
      html,
    });

    console.log("✅ Order confirmation email sent");
  } catch (err) {
    console.error("❌ Failed to send order email", err);
    // never throw
  }
}
