import { resend, FROM, BASE_URL } from "./client";

type Delivery = "email_now" | "schedule" | "print";

export type SendVoucherEmailArgs = {
  delivery: Delivery;
  buyerEmail: string;
  recipientEmail?: string | null;
  toName?: string | null;
  fromName?: string | null;
  message?: string | null;
  code: string;
  amountPence: number;
  currency: string;   // "gbp" | "eur" | ...
  voucherUrl: string; 
  sendDateISO?: string | null;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendVoucherEmails(args: SendVoucherEmailArgs) {
  const {
    delivery, buyerEmail, recipientEmail,
    toName, fromName, message,
    code, amountPence, currency,
    voucherUrl, sendDateISO,
  } = args;

  const amountText =
    (currency.toLowerCase() === "gbp" ? "£" : currency.toUpperCase() + " ") +
    (amountPence / 100).toFixed(2);

  // Get QR PNG as data URL
  const qrRes = await fetch(
    `${BASE_URL}/api/vouchers/qr?code=${encodeURIComponent(code)}&s=480`
  );
  const qrArrayBuffer = await qrRes.arrayBuffer();
  const qrBase64 = Buffer.from(qrArrayBuffer).toString("base64");
  const qrDataUrl = `data:image/png;base64,${qrBase64}`;

  const voucherHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5">
      <h2 style="margin:0 0 8px">Your Pages & Peace Gift Voucher</h2>
      <p style="margin:0 0 12px">Amount: <strong>${amountText}</strong></p>
      <p style="margin:0 0 12px">
        To: <strong>${escapeHtml(toName || "Recipient")}</strong><br/>
        From: <strong>${escapeHtml(fromName || "You")}</strong>
      </p>
      ${message ? `<blockquote style="margin:8px 0;padding-left:10px;border-left:3px solid #e5e5e5">${escapeHtml(message)}</blockquote>` : ""}
      <p style="margin:12px 0">Show this QR at the counter to redeem.</p>
      <p style="margin:12px 0"><a href="${voucherUrl}" style="color:#5DA865">View voucher online</a></p>
      <div style="margin-top:16px">
        <img src="${qrDataUrl}" alt="Voucher QR" style="width:200px;height:200px;border-radius:8px"/>
      </div>
      <p style="margin-top:16px;font-size:12px;color:#555">
        Valid for 24 months. Can be used over multiple visits until the balance is used.
      </p>
    </div>
  `;

  // If gifting to a different recipient, don't reveal code/link in the buyer's receipt.
  const isGiftingToOther =
    delivery === "email_now" &&
    recipientEmail &&
    recipientEmail.length > 3 &&
    recipientEmail.toLowerCase() !== buyerEmail.toLowerCase();

  const receiptHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5">
      <h2 style="margin:0 0 8px">Receipt – Gift Voucher</h2>
      <p style="margin:0 0 12px">Amount: <strong>${amountText}</strong></p>
      <p style="margin:0 0 12px">
        ${
          isGiftingToOther
            ? `Voucher has been emailed to <strong>${escapeHtml(recipientEmail!)}</strong>.`
            : `Voucher code: <code>${escapeHtml(code)}</code><br/>
               Voucher link: <a href="${voucherUrl}" style="color:#5DA865">${voucherUrl}</a>`
        }
      </p>
      ${
        delivery === "schedule" && sendDateISO
          ? `<p style="margin:0 0 12px">Delivery scheduled for: <strong>${new Date(sendDateISO).toLocaleString()}</strong></p>`
          : ""
      }
      <p style="margin-top:16px;font-size:12px;color:#555">Thanks for supporting Pages & Peace.</p>
    </div>
  `;

  // 1) Buyer receipt (never embeds QR)
  await resend.emails.send({
    from: FROM,
    to: buyerEmail,
    subject: "Pages & Peace – Receipt for your Gift Voucher",
    html: receiptHtml,
  });

  // 2) Voucher email (with inline QR) goes to the right person
  if (delivery === "print") {
    // Buyer prints the voucher
    await resend.emails.send({
      from: FROM,
      to: buyerEmail,
      subject: "Your Pages & Peace Gift Voucher (Print at home)",
      html: voucherHtml,
    });
    return;
  }

  if (delivery === "email_now") {
    const target =
      recipientEmail && recipientEmail.length > 3 ? recipientEmail : buyerEmail;

    await resend.emails.send({
      from: FROM,
      to: target,
      subject: "Your Pages & Peace Gift Voucher",
      html: voucherHtml,
    });
    return;
  }

  if (delivery === "schedule") {
    // Receipt already sent to buyer; a future job will send the voucher.
    return;
  }
}
