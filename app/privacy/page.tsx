import BackLink from "@/components/Backlink";

export const metadata = {
  title: "Privacy Policy | Pages & Peace",
  description:
    "How Pages & Peace collects, uses, and protects your personal data in compliance with UK GDPR.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[Montserrat] text-[var(--foreground)] leading-relaxed">
      <BackLink href="/" label="Back" />

      <h1 className="text-4xl font-semibold mb-6 text-[var(--accent)]">
        Privacy Policy
      </h1>

      <p className="text-sm text-[var(--foreground)]/70 mb-8">
        <strong>Last updated:</strong> November 2025
      </p>

      <section className="space-y-6">
        <p>
          Your privacy matters to us. This Privacy Policy explains how{" "}
          <strong>Pages & Peace</strong> collects, uses, and protects your
          personal information when you visit our website, sign up for an
          account, or join our loyalty programme.
        </p>

        <h2 className="text-2xl font-semibold mt-8">1. Who We Are</h2>
        <p>
          Pages & Peace is a UK-based independent café and bookshop.
          <br />
          <strong>Address:</strong> Rossington, Doncaster, United Kingdom
          <br />
          <strong>Email:</strong>{" "}
          <a
            href="mailto:admin@pagesandpeace.co.uk"
            className="underline text-[var(--accent)]"
          >
            admin@pagesandpeace.co.uk
          </a>
        </p>

        <h2 className="text-2xl font-semibold mt-8">2. What Information We Collect</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Account details (name, email, encrypted password)</li>
          <li>Loyalty programme data (points earned, history)</li>
          <li>Orders and payments (via Stripe, never stored locally)</li>
          <li>Analytics data (only after consent)</li>
          <li>Newsletter and contact form submissions</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">3. How We Use Your Information</h2>
        <table className="w-full border border-[#ddd] text-sm mt-4">
          <thead className="bg-[var(--accent)] text-[var(--background)]">
            <tr>
              <th className="p-3 text-left">Purpose</th>
              <th className="p-3 text-left">Legal Basis</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#ddd]">
              <td className="p-3">Providing account and loyalty services</td>
              <td className="p-3">Contractual necessity</td>
            </tr>
            <tr className="border-t border-[#ddd]">
              <td className="p-3">
                Sending confirmations or essential account emails
              </td>
              <td className="p-3">Legitimate interest</td>
            </tr>
            <tr className="border-t border-[#ddd]">
              <td className="p-3">Marketing newsletters and offers</td>
              <td className="p-3">Consent (opt-in only)</td>
            </tr>
            <tr className="border-t border-[#ddd]">
              <td className="p-3">Analytics to improve site experience</td>
              <td className="p-3">Consent (cookies)</td>
            </tr>
            <tr className="border-t border-[#ddd]">
              <td className="p-3">Compliance with tax or legal obligations</td>
              <td className="p-3">Legal requirement</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-2xl font-semibold mt-8">4. Data Storage and Security</h2>
        <p>
          Your personal data is stored securely in the UK or EEA using encrypted
          connections (HTTPS) and trusted providers such as Supabase, Resend,
          and Stripe. We never store card details.
        </p>

        <h2 className="text-2xl font-semibold mt-8">5. Sharing Your Data</h2>
        <p>
          We do not sell your personal data. We only share it with trusted
          partners that help operate the site:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Stripe – payment processing</li>
          <li>Resend – transactional emails</li>
          <li>Supabase – database and authentication</li>
          <li>Analytics providers – if consented</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">6. Your Rights</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Access or request a copy of your data</li>
          <li>Request correction or deletion</li>
          <li>Withdraw consent at any time</li>
          <li>Complain to the UK ICO if you believe misuse occurred</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">7. Marketing Preferences</h2>
        <p>
          You can manage your preferences in your account or unsubscribe from
          any email. We’ll only contact you about loyalty rewards or promotions
          if you opted in.
        </p>

        <h2 className="text-2xl font-semibold mt-8">8. Policy Updates</h2>
        <p>
          This policy may be updated periodically. The most recent version will
          always appear on this page.
        </p>
      </section>
    </main>
  );
}
