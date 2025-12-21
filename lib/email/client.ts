// src/lib/email/client.ts
import { Resend } from "resend";

// Create a function that initializes Resend when it's needed
export const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  // Initialize and return Resend client
  return new Resend(process.env.RESEND_API_KEY);
};

// Reusable sender email
export const FROM = "Pages & Peace <hello@pagesandpeace.co.uk>";
