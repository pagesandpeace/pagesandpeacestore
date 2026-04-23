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
  console.log("🚨 EMAIL FUNCTION CALLED WITH ORDER:", orderId);

  /* -----------------------------------------------------
     FETCH ORDER (NO RELATION)
  ----------------------------------------------------- */
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      created_at,
      stripe_receipt_url,
      stripe_card_brand,
      stripe_last4,
      user_id_uuid
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("❌ Order fetch failed", error);
    return;
  }

  /* -----------------------------------------------------
     FETCH ORDER ITEMS
  ----------------------------------------------------- */
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, kind, name, quantity, price, event_id")
    .eq("order_id", orderId);

  if (itemsError) {
    console.error("❌ Items fetch failed", itemsError);
  }

  console.log("📦 ITEMS FROM DIRECT QUERY:", items);

  /* ---------------- EMAIL ---------------- */
  const { data: authUser } =
    await supabase.auth.admin.getUserById(order.user_id_uuid);

  const userEmail = authUser?.user?.email;

  if (!userEmail) {
    console.error("❌ No email found");
    return;
  }

  /* -----------------------------------------------------
     EVENT DETECTION
  ----------------------------------------------------- */
  const hasEvent = items?.some((i) => i.kind === "event") ?? false;

  console.log("🎯 HAS EVENT:", hasEvent);

  const firstEventItem = items?.find((i) => i.kind === "event" && i.event_id);

  let eventDateLine = "";

  if (firstEventItem?.event_id) {
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("title, date")
      .eq("id", firstEventItem.event_id)
      .maybeSingle();

    if (eventError) {
      console.error("❌ Event fetch failed", eventError);
    }

    if (eventData?.date) {
      const formattedEventDate = new Date(eventData.date).toLocaleDateString(
        "en-GB",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );

      eventDateLine = `
        <p><strong>Event date:</strong> ${formattedEventDate}</p>
      `;
    }
  }

  /* -----------------------------------------------------
     Formatting
  ----------------------------------------------------- */
  const formattedTotal = Number(order.total).toFixed(2);

  const paymentDate = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const LOGO_URL =
    "https://res.cloudinary.com/dadinnds6/image/upload/v1763726107/Logo_new_update_in_green_no_background_mk3ptz.png";

  const FOOD_FORM_URL = "https://tally.so/r/Med4gl";

  const itemsHtml =
    items
      ?.map(
        (item) => `
        <tr>
          <td style="padding:8px 0;font-size:15px">
            ${item.name ?? "Item"} × ${item.quantity}
          </td>
          <td style="padding:8px 0;text-align:right;font-size:15px">
            £${(Number(item.price) * Number(item.quantity)).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("") ?? "";

  const paymentLine =
    order.stripe_card_brand && order.stripe_last4
      ? `<p style="font-size:14px;color:#555">
          Paid with ${order.stripe_card_brand.toUpperCase()} •••• ${order.stripe_last4}
        </p>`
      : "";

  const subject = hasEvent
    ? "Your Pages & Peace event booking is confirmed"
    : "Your Pages & Peace order is confirmed";

  /* -----------------------------------------------------
     🍽️ FOOD SECTION
  ----------------------------------------------------- */
  const foodPreorderSection = hasEvent
    ? `
    <div style="margin-top:32px;padding:24px;border-radius:12px;background:#F4EFEA;text-align:center">
      
      <h3 style="margin-bottom:12px">
        🍽️ Pre-order food for your event
      </h3>

      <p style="font-size:15px;color:#555;margin-bottom:20px">
        Want everything ready when you arrive?  
        Skip the wait and pre-order your food in advance.
      </p>

      <a href="${FOOD_FORM_URL}" target="_blank"
         style="
           display:inline-block;
           padding:12px 24px;
           background:#1E3D34;
           color:#fff;
           text-decoration:none;
           border-radius:8px;
           font-weight:600;
         ">
         Pre-order now
      </a>

      <p style="font-size:13px;color:#777;margin-top:12px">
        You can do this anytime before the event.
      </p>

    </div>
  `
    : "";

  /* -----------------------------------------------------
     EMAIL HTML
  ----------------------------------------------------- */
  const html = `
    <div style="background:#FAF6F1;padding:40px 0;font-family:Montserrat,sans-serif">
      <div style="max-width:640px;margin:0 auto;background:#fff;padding:32px 40px;border-radius:12px">
        
        <div style="text-align:center;margin-bottom:24px">
          <img src="${LOGO_URL}" style="max-width:200px" />
        </div>

        <h2 style="text-align:center">
          Thank you for your ${hasEvent ? "booking" : "order"}
        </h2>

        <p style="text-align:center">
          Your Pages & Peace ${hasEvent ? "event booking" : "order"} has been confirmed.
        </p>

        <hr />

        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Payment date:</strong> ${paymentDate}</p>
        ${eventDateLine}

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

        ${foodPreorderSection}

      </div>
    </div>
  `;

  /* -----------------------------------------------------
     SEND EMAIL
  ----------------------------------------------------- */
  try {
    const resend = getResendClient();

    await resend.emails.send({
      from: FROM,
      to: userEmail,
      subject,
      html,
    });

    console.log("✅ Email sent");
  } catch (err) {
    console.error("❌ Email failed", err);
  }
}