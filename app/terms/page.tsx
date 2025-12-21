import BackLink from "@/components/Backlink";

export const metadata = {
  title: "Terms of Service | Pages & Peace",
  description:
    "Our terms of service outline the rules and responsibilities for using the Pages & Peace website and loyalty program.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[Montserrat] text-[var(--foreground)] leading-relaxed">
      <BackLink href="/" label="Back" />

      <h1 className="text-4xl font-semibold mb-6 text-[var(--accent)]">
        Terms of Service
      </h1>

      <p className="text-sm text-[var(--foreground)]/70 mb-8">
        <strong>Last updated:</strong> November 2025
      </p>

      <p>
        Welcome to <strong>Pages & Peace</strong>. By accessing or using our
        website and services, you agree to these Terms of Service. Please read
        them carefully before using our platform.
      </p>
      <p className="mt-6">
        These terms govern your use of our website, loyalty programme, and any
        purchases made through our store. We may update them from time to time,
        and continued use of the site constitutes acceptance of the latest
        version.
      </p>
      <p className="mt-6">
        If you have any questions, contact us at{" "}
        <a
          href="mailto:admin@pagesandpeace.co.uk"
          className="underline text-[var(--accent)]"
        >
          admin@pagesandpeace.co.uk
        </a>
        .
      </p>
    </main>
  );
}
