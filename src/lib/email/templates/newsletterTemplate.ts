export default function newsletterTemplate(contentHtml: string) {
  const logoUrl =
    "https://res.cloudinary.com/dadinnds6/image/upload/f_auto,q_auto,w_200/Logo_new_update_in_green_no_background_mk3ptz";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Pages & Peace</title>

    <style>
      body {
        background: #fcf8f3;
        font-family: 'Montserrat', Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 580px;
        margin: 0 auto;
        background: white;
        padding: 32px 26px;
        border-radius: 14px;
        border: 1px solid #e5dfd6;
      }
      .footer {
        text-align: center;
        margin-top: 40px;
        font-size: 13px;
        color: #998d7c;
      }
    </style>
  </head>

  <body>
    <div class="container">
      ${contentHtml}

      <img src="${logoUrl}" width="150" style="display:block;margin:40px auto" />

      <div class="footer">
        Pages & Peace · Cosy book café
      </div>
    </div>
  </body>
  </html>
  `;
}
