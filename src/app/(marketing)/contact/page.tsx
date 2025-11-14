"use client";

import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    // In future we can wire this to an API route or Resend
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Montserrat] py-16 px-6">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-4xl font-bold mb-6 tracking-wide">
          Contact Us
        </h1>

        <p className="text-[var(--foreground)]/80 mb-10">
          We’d love to hear from you. Whether it’s a question, feedback, or
          something else entirely, feel free to reach out using the details
          below — or send us a message directly.
        </p>

        {/* Contact Details */}
        <div className="bg-white rounded-xl border border-[#e5e2dc] p-6 mb-12 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 tracking-wide">
            Pages & Peace Coffee + Bookshop
          </h2>

          <ul className="space-y-3 text-[var(--foreground)]/80">
            <li>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:admin@pagesandpeace.co.uk"
                className="text-[var(--accent)] font-medium hover:underline"
              >
                admin@pagesandpeace.co.uk
              </a>
            </li>

            <li>
              <strong>Phone:</strong>{" "}
              <a
                href="tel:07486313261"
                className="text-[var(--accent)] font-medium hover:underline"
              >
                07486 313261
              </a>
            </li>

            <li>
              <strong>Address:</strong><br />
              8 Eva Building<br />
              Kings Avenue<br />
              Doncaster<br />
              DN11 0PF
            </li>

            <li className="pt-2">
              <strong>Opening Hours:</strong>
              <ul className="mt-2 space-y-1">
                <li>Tue – Sat: 9am – 9pm</li>
                <li>Sun: 9am – 4pm</li>
                <li>Mon: Closed</li>
              </ul>
            </li>
          </ul>
        </div>

        {/* Simple Contact Form */}
<div className="bg-white rounded-xl border border-[#e5e2dc] p-6 shadow-sm">
  <h2 className="text-xl font-semibold mb-4 tracking-wide">
    Send Us a Message
  </h2>

  {submitted ? (
    <div className="bg-[#E5F7E4] border border-[#5DA865]/30 text-[#2f6b3a] rounded-lg p-4 mt-4">
      Thank you! Your message has been sent.
    </div>
  ) : (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);

        const body = {
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        };

        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) setSubmitted(true);
      }}
      className="space-y-5"
    >
      <div>
        <label className="block text-sm font-medium">Your Name</label>
        <input
          name="name"
          type="text"
          required
          className="
            mt-1 w-full rounded-md border border-[#ccc] px-3 py-2
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
          "
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Your Email</label>
        <input
          name="email"
          type="email"
          required
          className="
            mt-1 w-full rounded-md border border-[#ccc] px-3 py-2
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
          "
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Message</label>
        <textarea
          name="message"
          required
          rows={4}
          className="
            mt-1 w-full rounded-md border border-[#ccc] px-3 py-2
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
          "
        ></textarea>
      </div>

      <button
        type="submit"
        className="
          w-full rounded-full px-6 py-3 bg-[var(--accent)]
          text-black font-semibold text-sm
          hover:bg-[var(--secondary)] transition-all
        "
      >
        Send Message
      </button>
    </form>
  )}
</div>

      </div>
    </div>
  );
}
