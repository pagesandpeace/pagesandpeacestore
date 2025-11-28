// src/lib/email/sendOrderConfirmationEmail.ts
import { resend, FROM, BASE_URL } from "./client";

type OrderLineItem = {
  name: string;
  quantity: number;
  price: number; // in pence
};

type SendOrderEmailParams = {
  email: string;
  orderId: string;
  total: number;
  lineItems: OrderLineItem[];
  createdAt: string;
};

export async function sendOrderConfirmationEmail({
  email,
  orderId,
  total,
  lineItems,
  createdAt,
}: SendOrderEmailParams) {
  const formattedTotal = (total / 100).toFixed(2);

  const date = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const LOGO_URL =
    "https://res.cloudinary.com/dadinnds6/image/upload/v1763726107/Logo_new_update_in_green_no_background_mk3ptz.png";

  const itemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; font-size: 15px;">
          ${item.name} × ${item.quantity}
        </td>
        <td style="padding: 8px 0; text-align: right; font-size: 15px;">
          £${(item.price / 100).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  const html = `
  <div style="background: #FAF6F1; padding: 40px 0; width: 100%; font-family: 'Montserrat', sans-serif;">
    <div style="max-width: 640px; margin: 0 auto; background: white; padding: 32px 40px; border-radius: 12px;">

      <!-- LOGO -->
      <div style="text-align: center; margin-bottom: 24px;">
      <img 
  src="${LOGO_URL}" 
  alt="Pages & Peace"
  style="
    width: 100%;
    max-width: 200px;
    height: auto;
    display: block;
    margin: 0 auto;
  "
/>

      </div>

      <!-- HEADER -->
      <h2 style="text-align: center; font-size: 26px; margin-bottom: 8px; font-weight: 700;">
        Thank you for your order!
      </h2>

      <p style="text-align: center; color: #444; font-size: 15px; margin-bottom: 32px;">
        Your Pages & Peace order has now been confirmed.
      </p>

      <hr style="border: none; border-top: 1px solid #DDD; margin: 32px 0;" />

      <!-- ORDER DETAILS -->
      <h3 style="font-size: 20px; margin-bottom: 12px;">Order Summary</h3>

      <p style="margin: 4px 0; font-size: 15px;">
        <strong>Order ID:</strong> ${orderId}
      </p>

      <p style="margin: 4px 0; font-size: 15px;">
        <strong>Order Date:</strong> ${date}
      </p>

      <!-- ITEMS -->
      <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
        ${itemsHtml}
      </table>

      <hr style="border: none; border-top: 1px solid #DDD; margin: 32px 0;" />

      <!-- TOTAL -->
      <p style="font-size: 18px; font-weight: 600; margin-bottom: 24px;">
        Total: £${formattedTotal}
      </p>

      <!-- CLICK & COLLECT NOTICE -->
<div style="background: #F4F1EA; padding: 16px; border-radius: 8px; margin-bottom: 32px; border-left: 4px solid #5DA865;">
  <p style="margin: 0; font-size: 15px; color: #444;">
    <strong>Please note:</strong> All orders are currently <strong>Click & Collect</strong> only.
    <br/><br/>
    Your order will be ready to collect from:
    <br/>
    <strong>Pages & Peace – Chapter 1</strong><br/>
    8 Eva Building<br/>
    Kings Avenue<br/>
    Rossington<br/>
    Doncaster<br/>
    DN11 0PF
    <br/><br/>
    Please bring your order confirmation email and present your order number to a staff member when collecting.
  </p>
</div>


      <!-- CTA BUTTON -->
      <div style="text-align: center;">
        <a 
          href="${BASE_URL}/dashboard/orders/${orderId}"
          style="
            display: inline-block;
            background: #5DA865;
            color: white;
            text-decoration: none;
            padding: 14px 22px;
            font-size: 15px;
            border-radius: 8px;
            font-weight: 600;
          "
        >
          View Your Order
        </a>
      </div>

      <!-- FOOTER -->
      <p style="text-align: center; font-size: 12px; color: #777; margin-top: 40px;">
        Pages & Peace · 1a West End Lane, Rossington, Doncaster DN11 0PQ · United Kingdom
      </p>
    </div>
  </div>
`;

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your Pages & Peace Order is Confirmed",
    html,
  });
}
