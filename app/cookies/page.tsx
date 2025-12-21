import BackLink from "@/components/Backlink";

export const metadata = {
  title: "Cookie Policy | Pages & Peace",
  description:
    "Learn how Pages & Peace uses cookies to enhance your browsing experience and keep our website running smoothly.",
};

export default function CookiePolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[Montserrat] text-[var(--foreground)] leading-relaxed">
      <BackLink href="/" label="Back" />

      <h1 className="text-4xl font-semibold mb-6 text-[var(--accent)]">
        Cookie Policy
      </h1>

      <p className="text-sm text-[var(--foreground)]/70 mb-8">
        <strong>Last updated:</strong> November 2025
      </p>

      <section className="space-y-6">
        <p>
          At <strong>Pages & Peace</strong>, we use cookies and similar
          technologies to make our website work properly, improve your
          experience, and understand how our visitors use it. This Cookie Policy
          explains what cookies are, how we use them, and how you can control
          your preferences.
        </p>

        <p>
          By clicking <strong>Accept</strong> on our cookie banner, you agree to
          the use of cookies described here. You can withdraw or change your
          consent at any time.
        </p>

        <h2 className="text-2xl font-semibold mt-8">1. What Are Cookies?</h2>
        <p>
          Cookies are small text files that are placed on your device when you
          visit a website. They help remember your preferences, log-in sessions,
          and improve performance.
        </p>

        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Essential cookies</strong> – required for the website to
            function (e.g. keeping you signed in, remembering your basket).
          </li>
          <li>
            <strong>Non-essential cookies</strong> – used for analytics,
            marketing, and improving content.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">2. How We Use Cookies</h2>
        <table className="w-full border border-[#ddd] text-sm mt-4">
          <thead className="bg-[var(--accent)] text-[var(--background)]">
            <tr>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Purpose</th>
              <th className="p-3 text-left">Example</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#ddd]">
              <td className="p-3 font-medium">Essential</td>
              <td className="p-3">Enable login, session management, security</td>
              <td className="p-3">Better Auth session cookies</td>
            </tr>
            <tr className="border-t border-[#ddd]">
              <td className="p-3 font-medium">Analytics</td>
              <td className="p-3">Help us understand traffic and improve site</td>
              <td className="p-3">Google Analytics (only after consent)</td>
            </tr>
            <tr className="border-t border-[#ddd]">
              <td className="p-3 font-medium">Functional</td>
              <td className="p-3">Remember preferences or loyalty status</td>
              <td className="p-3">Local storage keys</td>
            </tr>
            <tr className="border-t border-[#ddd]">
              <td className="p-3 font-medium">Marketing</td>
              <td className="p-3">
                Personalise promotions and measure effectiveness
              </td>
              <td className="p-3">Meta Pixel (if consented)</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-2xl font-semibold mt-8">3. Third-Party Cookies</h2>
        <p>
          Some cookies are set by trusted third parties that help us operate the
          site or measure performance:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Google Analytics – anonymised usage statistics</li>
          <li>Resend – for email delivery tracking (after signup)</li>
          <li>Stripe – for secure payment processing</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">4. Managing Cookies</h2>
        <p>
          You can control and delete cookies through our banner or your browser
          settings. Blocking essential cookies may affect site functionality.
        </p>

        <h2 className="text-2xl font-semibold mt-8">5. Updates</h2>
        <p>
          We may update this policy occasionally. The latest version will always
          be available on this page.
        </p>

        <h2 className="text-2xl font-semibold mt-8">6. Contact Us</h2>
        <p>
          For any questions about cookies or data usage, please contact:
          <br />
          <strong>Pages & Peace</strong>
          <br />
          8 Eva Building, Rossington, Doncaster, United Kingdom, DN10PF
          <br />
          📧 <a href="mailto:admin@pagesandpeace.co.uk">admin@pagesandpeace.co.uk</a>
        </p>
      </section>
    </main>
  );
}
