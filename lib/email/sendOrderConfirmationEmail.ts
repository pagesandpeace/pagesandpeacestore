// lib/email/sendOrderConfirmationEmail.ts
import { createClient } from "@supabase/supabase-js";
import { getResendClient, FROM } from "@/lib/email/client";

// ✅ SERVICE ROLE Supabase client – same as webhook
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type OrderItem = {
  kind: "product" | "event";
  name: string;
  quantity: number;
  price: number; // pounds
};

export async function sendOrderConfirmationEmail(orderId: string) {
  console.log("🔍 Fetching order details for Order ID:", orderId);

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      email,
      total,
      created_at,
      stripe_receipt_url,
      stripe_card_brand,
      stripe_last4,
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

  if (error || !order || !order.email) {
    console.error(
      `❌ Order not found or inaccessible for orderId: ${orderId}.`,
      error
    );
    // Throw so the webhook logs this as a failure
    throw new Error(`Order ${orderId} not found when sending email`);
  }

  console.log("📧 Order found:", order);

  const items = (order.order_items ?? []) as OrderItem[];

  if (items.length === 0) {
    console.log("⚠️ No items found for this order.");
  } else {
    console.log("📦 Order contains items:", items);
  }

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
        <td style="padding: 8px 0; font-size: 15px;">
          ${item.name} × ${item.quantity}
        </td>
        <td style="padding: 8px 0; text-align: right; font-size: 15px;">
          £${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  const paymentLine =
    order.stripe_card_brand && order.stripe_last4
      ? `<p style="font-size: 14px; color: #555;">
          Paid with ${order.stripe_card_brand.toUpperCase()} •••• ${
          order.stripe_last4
        }
        </p>`
      : "";

  // 🔎 Work out subject: event booking vs normal order
  const isEventOnly =
    items.length > 0 && items.every((item) => item.kind === "event");

  const subject = isEventOnly
    ? "Your Pages & Peace event booking is confirmed"
    : "Your Pages & Peace order is confirmed";

  const html = `
    <div style="background: #FAF6F1; padding: 40px 0; width: 100%; font-family: 'Montserrat', sans-serif;">
      <div style="max-width: 640px; margin: 0 auto; background: white; padding: 32px 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${LOGO_URL}" alt="Pages & Peace" style="max-width: 200px; width: 100%; height: auto;" />
        </div>

        <h2 style="text-align: center; font-size: 26px; margin-bottom: 8px; font-weight: 700;">
          Thank you for your ${isEventOnly ? "booking" : "order"}
        </h2>

        <p style="text-align: center; color: #444; font-size: 15px; margin-bottom: 32px;">
          Your Pages & Peace ${isEventOnly ? "event booking" : "order"} has been confirmed.
        </p>

        <hr style="border: none; border-top: 1px solid #DDD; margin: 32px 0;" />

        <h3 style="font-size: 20px; margin-bottom: 12px;">Order Summary</h3>

        <p style="margin: 4px 0; font-size: 15px;">
          <strong>Order ID:</strong> ${order.id}
        </p>
        <p style="margin: 4px 0; font-size: 15px;">
          <strong>Order Date:</strong> ${date}
        </p>

        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
          ${itemsHtml}
        </table>

        <hr style="border: none; border-top: 1px solid #DDD; margin: 32px 0;" />

        <p style="font-size: 18px; font-weight: 600; margin-bottom: 24px;">
          Total: £${formattedTotal}
        </p>

        ${paymentLine}

        ${
          order.stripe_receipt_url
            ? `<p><a href="${order.stripe_receipt_url}" target="_blank">View Stripe receipt</a></p>`
            : ""
        }

        <p style="font-size: 14px; color: #666; margin-top: 32px;">
          If you have any questions about your ${
            isEventOnly ? "booking" : "order"
          }, simply reply to this email.
        </p>
      </div>
    </div>
  `;

  console.log("📧 Preparing to send order confirmation email to:", order.email);

  const resend = getResendClient();

  const response = await resend.emails.send({
    from: FROM,
    to: order.email,
    subject,
    html,
  });

  console.log("✅ Order confirmation email sent:", response);
}
