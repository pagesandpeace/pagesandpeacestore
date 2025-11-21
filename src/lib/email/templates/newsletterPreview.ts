// src/lib/email/templates/newsletterPreview.ts
// CLIENT SAFE – NO SERVER IMPORTS, NO ENV, NO RESEND

export default function newsletterPreview(html: string) {
  const logoUrl =
    "https://res.cloudinary.com/dadinnds6/image/upload/f_auto,q_auto,w_200/Logo_new_update_in_green_no_background_mk3ptz";

  return `
    <html>
      <body style="background:#fcf8f3;padding:20px;margin:0">
        <div style="max-width:580px;margin:0 auto;background:white;padding:32px;border-radius:14px;border:1px solid #e5dfd6;">
          ${html}

          <img src="${logoUrl}" width="150" style="display:block;margin:40px auto" />

          <div style="text-align:center;color:#998d7c;font-size:13px;margin-top:20px">
            Pages & Peace · Cosy book café<br/>
            (Preview only — no tracking enabled)
          </div>
        </div>
      </body>
    </html>
  `;
}
