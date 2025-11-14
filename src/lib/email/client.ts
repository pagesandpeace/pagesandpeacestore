// src/lib/email/client.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

// Single place to tweak your sender. No new env var required.
export const FROM = "Pages & Peace <hello@pagesandpeace.co.uk>";

// Useful base URL helper
export const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000";
