// Import getResendClient instead of resend
import { getResendClient, FROM } from "@/lib/email/client"; 

export async function sendTestEmail() {
  try {
    // Get the Resend client dynamically
    const resend = getResendClient();

    const response = await resend.emails.send({
      from: FROM,
      to: "mattymclauchlan@gmail.com", // Replace with your email
      subject: "Test Email from Resend",
      html: "<p>This is a test email sent using Resend!</p>",
    });

    console.log("✅ Test email sent successfully:", response);
  } catch (error) {
    console.error("❌ Test email sending failed:", error);
  }
}
