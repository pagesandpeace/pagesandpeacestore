import { resend, FROM, BASE_URL } from "@/lib/email/client";

export type EventConfirmationEmailInput = {
  to: string;
  event: {
    id: string;
    title: string;
    date: string;
    storeName: string;
    storeAddress: string;
    storeChapter: number | null;
    imageUrl: string | null;
  };
  booking: {
    id: string;
    name: string | null;
    email: string | null;
  };
  order: {
    id: string;
    paidAt: string | null;
    amount: string; // already £10.00 style
    receiptUrl: string | null;
    cardBrand: string | null;
    last4: string | null;
  };
};

export async function sendEventConfirmationEmail(
  params: EventConfirmationEmailInput
) {
  const { to, event, booking, order } = params;

  const formattedDate = new Date(event.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const previewUrl = `${BASE_URL}/events/${event.id}`;

  const LOGO_URL =
    "https://res.cloudinary.com/dadinnds6/image/upload/v1763726107/Logo_new_update_in_green_no_background_mk3ptz.png";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">

      <!-- Logo -->
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

      <h2 style="margin-bottom: 4px;">Your Pages & Peace Event Booking is Confirmed 📚</h2>
      <p style="margin-top: 0;">Thank you for booking with us!</p>

      <hr style="margin: 20px 0;" />

      <h3 style="margin: 0 0 8px;">${event.title}</h3>

      <p><strong>Date & Time:</strong> ${formattedDate}</p>

      <p>
        <strong>Location:</strong><br />
        ${event.storeName}<br />
        ${event.storeAddress}<br />
        ${event.storeChapter ? `Chapter ${event.storeChapter}` : ""}
      </p>

      <hr style="margin: 20px 0;" />

      <h3>Your Booking</h3>

      <p><strong>Booking ID:</strong> ${booking.id}</p>
      ${booking.name ? `<p><strong>Name:</strong> ${booking.name}</p>` : ""}
      <p><strong>Email:</strong> ${booking.email || to}</p>

      <hr style="margin: 20px 0;" />

      <h3>Your Payment</h3>

      <p><strong>Order ID:</strong> ${order.id}</p>

      ${
        order.paidAt
          ? `<p><strong>Paid At:</strong> ${new Date(order.paidAt).toLocaleString(
              "en-GB"
            )}</p>`
          : ""
      }

      <p><strong>Amount Paid:</strong> £${order.amount}</p>

      ${
        order.cardBrand && order.last4
          ? `<p><strong>Card:</strong> ${order.cardBrand.toUpperCase()} •••• ${
              order.last4
            }</p>`
          : ""
      }

      ${
        order.receiptUrl
          ? `<p><a href="${order.receiptUrl}" target="_blank">View Stripe Receipt</a></p>`
          : ""
      }

      <hr style="margin: 20px 0;" />

      <p>
        You can view the event details anytime:<br/>
        <a href="${previewUrl}">${previewUrl}</a>
      </p>

      <p>See you soon!<br />
      <strong>Pages & Peace Team</strong></p>
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Booking Confirmed — ${event.title}`,
    html,
  });
}
