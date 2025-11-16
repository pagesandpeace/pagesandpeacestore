// src/app/chapters-club-terms/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import BackLink from "@/components/BackLink";

export const metadata: Metadata = {
  title: "Chapters Club Terms v1.0 | Pages & Peace",
  description:
    "Terms for joining and using the Pages & Peace Chapters Club loyalty programme.",
  robots: { index: true, follow: true },
};

export default function ChaptersClubTermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[Montserrat] text-[var(--foreground)] leading-relaxed">
      {/* Back link needs Suspense because it uses useSearchParams in a client component */}
      <Suspense fallback={null}>
  <BackLink href="/dashboard" label="Back" />
</Suspense>


      <h1 className="text-4xl font-semibold mb-6 text-[var(--accent)]">
        Pages & Peace Chapters Club Terms (v1.0)
      </h1>

      <p className="text-sm text-[var(--foreground)]/70 mb-8">
        <strong>Last updated:</strong> November 2025
      </p>

      <p className="mb-6">
        <strong>Operator:</strong> Pages & Peace, 8 Eva Building, Rossington,
        Doncaster, United Kingdom, DN10PF
        <br />
        <strong>Contact:</strong>{" "}
        <a href="mailto:admin@pagesandpeace.co.uk" className="underline text-[var(--accent)]">
          admin@pagesandpeace.co.uk
        </a>
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">1. About these terms</h2>
      <p>
        These terms set the rules for joining and using the Pages & Peace Chapters Club loyalty
        programme. By joining or using the programme, you agree to these terms.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">2. Definitions</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Programme</strong> means the Pages & Peace Chapters Club.</li>
        <li><strong>Member</strong> means a person who has joined the Programme.</li>
        <li><strong>Points</strong> means the loyalty points issued under the Programme.</li>
        <li><strong>Rewards</strong> means discounts, benefits, or redemptions available to Members.</li>
        <li><strong>Qualifying Purchase</strong> means an eligible purchase that earns Points.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-2">3. Eligibility</h2>
      <p>
        You must be at least 16 years old, have a valid email address, and create an account with
        Pages & Peace. We may refuse or cancel membership if you provide false details or misuse
        the Programme.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">4. Joining</h2>
      <p>
        Join through our website or in store by creating an account. We may run early access or beta
        periods. During these periods features may be limited, and benefits may change while we finish
        building the experience.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">5. Earning Points</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Points are earned on Qualifying Purchases only. Some items do not earn Points, such as gift cards, event tickets, tips, or delivery fees.</li>
        <li>Points are calculated on the amount paid after discounts and before taxes and fees unless stated otherwise.</li>
        <li>Present your account email or scannable ID at the time of purchase to earn Points.</li>
        <li>Online orders must be placed while signed in to your account.</li>
        <li>We may set a minimum spend to earn Points. We may round to the nearest point and cap the maximum daily accrual.</li>
      </ul>
      <p className="mt-3">
        <strong>Example rate:</strong> 1 point per £1 spent.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">6. Posting of Points</h2>
      <p>
        Points usually appear within 48 hours. Keep your receipts until posted. If Points do not
        appear after 7 days contact us with proof of purchase. We may refuse manual adjustments if
        the claim is incomplete or late.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">7. Redemptions and Rewards</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>You can redeem Points for Rewards listed on our website or in store.</li>
        <li>Rewards are subject to availability and may change at any time.</li>
        <li>Rewards have no cash value. Points cannot be sold, transferred, or exchanged for cash.</li>
        <li>We may limit redemptions per day or per visit and may require a minimum Points balance.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-2">8. Expiry and Inactivity</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Points expire 12 months after the date they are earned if not redeemed.</li>
        <li>Accounts with no earning or redemption activity for 12 months may be closed and Points forfeited.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-2">9. Returns, Refunds, and Cancellations</h2>
      <p>
        If you receive a refund for a purchase that earned Points, we will deduct the corresponding
        Points. If a refund would result in a negative balance we may reduce future Points or decline
        redemptions until the balance is positive.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">10. Tiers and Promotions</h2>
      <p>
        We may offer tiers, boosters, or limited time promotions. Specific rules and dates will be
        shown with the offer. If rules conflict, the offer rules apply for that promotion.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">11. Exclusions</h2>
      <p>
        Points are not earned on purchases made with gift cards, on purchases of gift cards, on
        service charges, delivery or shipping, third party marketplace orders, or where prohibited
        by law. We may add or remove exclusions as needed.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">12. Fair Use and Misuse</h2>
      <p>
        You agree to use the Programme fairly. We may suspend or cancel membership and forfeit
        Points if we find abuse, fraud, multiple accounts, account sharing, resale, or any attempt
        to manipulate the Programme.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">13. Communications</h2>
      <p>
        Transactional emails about your membership are part of the Programme. Marketing emails are
        optional and require consent. You can change preferences in your account or by using the
        unsubscribe link.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">14. Privacy and Cookies</h2>
      <p>
        We process your personal data in line with our Privacy Policy and use cookies as explained
        in our Cookie Policy. See the Privacy and Cookie pages on our website for details about data,
        legal bases, and your rights.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">15. Changes and Termination</h2>
      <p>
        We may change these terms, Points rates, Rewards, and eligibility rules. We will post updates
        on our website. If we end the Programme, we will give reasonable notice where possible and
        provide a window to redeem remaining Points.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">16. Liability</h2>
      <p>
        Nothing in these terms excludes liability for death or personal injury caused by negligence,
        fraud, or any liability that cannot be excluded under law. Subject to that, we are not liable
        for indirect or consequential loss, and our total liability related to the Programme is
        limited to £50 per Member.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">17. Governing law</h2>
      <p>
        These terms are governed by the laws of England and Wales. Courts of England and Wales have
        non-exclusive jurisdiction.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-2">18. Contact</h2>
      <p>
        Questions about the Programme:
        <br />
        <strong>Email:</strong>{" "}
        <a href="mailto:admin@pagesandpeace.co.uk" className="underline text-[var(--accent)]">
          admin@pagesandpeace.co.uk
        </a>
        <br />
        <strong>Address:</strong> Pages & Peace, 8 Eva Building, Rossington, Doncaster, United
        Kingdom, DN10PF
      </p>
    </main>
  );
}
