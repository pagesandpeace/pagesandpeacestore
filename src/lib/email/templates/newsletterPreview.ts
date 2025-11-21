// Safe preview helper – NO server imports allowed!
export default function newsletterPreviewWrapper(html: string) {
  return `
    <div style="max-width: 580px; margin: 0 auto; padding: 20px;">
      ${html}
    </div>
  `;
}
