

import { BASE_URL } from "@/lib/email/client";

export default function newsletterTemplate(
  contentHtml: string,
  blastId: string,
  recipient: string
) {
  const logoUrl =
    "https://res.cloudinary.com/dadinnds6/image/upload/f_auto,q_auto,w_200/Logo_new_update_in_green_no_background_mk3ptz";

  // Tracking pixel (fires an "open" event)
  const trackingPixel = `
    <img 
      src="${BASE_URL}/api/newsletter/track/open?blastId=${blastId}&recipient=${encodeURIComponent(
        recipient
      )}"
      width="1"
      height="1"
      style="display:none;"
      alt=""
    />
  `;

  // Unsubscribe link
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(
    recipient
  )}`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pages & Peace</title>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">

    <style>
      body {
        background: #fcf8f3;
        margin: 0;
        padding: 0;
        font-family: 'Montserrat', Arial, sans-serif;
        color: #3b342e;
        width: 100%;
      }

      .container {
        max-width: 580px;
        margin: 0 auto;
        background: #ffffff;
        padding: 32px 26px;
        border-radius: 14px;
        border: 1px solid #e5dfd6;
      }

      h1, h2, h3 {
        font-family: 'Montserrat', Arial, sans-serif;
        color: #5da865;
        margin-top: 0;
      }

      p {
        font-size: 16px;
        line-height: 1.7;
        color: #3b342e;
      }

      img.logo {
        display: block;
        margin: 40px auto 10px auto;
      }

      a {
        color: #5da865;
        text-decoration: underline;
      }

      .footer {
        margin-top: 40px;
        text-align: center;
        font-size: 13px;
        color: #998d7c;
      }

      @media only screen and (max-width: 600px) {
        .container {
          padding: 18px 16px;
        }
      }
    </style>
  </head>

  <body>
    <div class="container">

      ${contentHtml}

      <!-- Tracking Pixel -->
      ${trackingPixel}

      <!-- Logo -->
      <img src="${logoUrl}" width="150" class="logo" alt="Pages & Peace" />

      <!-- Footer -->
      <div class="footer">
        Pages & Peace · Cosy book café<br/>
        You're receiving this because you're part of our community.<br/>
        <a href="${unsubscribeUrl}">Unsubscribe</a>
      </div>
    </div>
  </body>
  </html>
  `;
}
