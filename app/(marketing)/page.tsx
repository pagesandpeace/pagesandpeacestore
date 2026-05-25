"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

const giftBoxes = [
  {
    name: "Smells Like Peace",
    tag: "Candle & atmosphere box",
    description:
      "A cosy mix of candlelight, wax melts, tea, a bookmark and a curated book.",
    href: "/shop",
  },
  {
    name: "Feels Like Peace",
    tag: "Self-care & reading box",
    description:
      "Bath salts, lip balm, tea, a bookmark and a book for a proper quiet night in.",
    href: "/shop",
  },
  {
    name: "The Big Box of Peace",
    tag: "The full experience",
    description:
      "The complete Pages & Peace gift box with books, calm, scent and self-care.",
    href: "/shop",
  },
];

const events = [
  {
    title: "Hope & Healing",
    date: "Every Sunday, 4pm to 6pm",
    description:
      "A weekly support group for families who have lost loved ones to suicide.",
  },
  {
    title: "Silent Reading Night",
    date: "Coming soon",
    description:
      "Bring a book, settle in, and enjoy a quiet evening of shared calm.",
  },
  {
    title: "Chess Night",
    date: "Every Wednesday",
    description:
      "A relaxed community evening for beginners, regulars and curious minds.",
  },
];

const news = [
  {
    title: "Quiet Night In Boxes are coming",
    description:
      "Our new gift range is being shaped around books, calm evenings and thoughtful gifting.",
  },
  {
    title: "More local author features",
    description:
      "We’re continuing to create space for independent writers and local stories.",
  },
  {
    title: "New community events",
    description:
      "From support groups to reading nights, Pages & Peace is slowly becoming a community chapter.",
  },
];

export default function Home() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let mounted = true;

    async function syncSession() {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setIsSignedIn(!!data.session);
        setLoading(false);
      }
    }

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsSignedIn(!!session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Montserrat]">
      {/* HERO */}
      <section className="px-6 py-10 sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace logo"
            width={150}
            height={150}
            priority
            className="mb-5"
          />

          <p className="mb-4 rounded-full border border-[var(--accent)]/30 px-4 py-2 text-sm text-[var(--accent)]">
            New gift boxes launching soon
          </p>

          <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-wide sm:text-6xl">
            Every community needs a chapter.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--foreground)]/75 sm:text-lg">
            Books, coffee, calm, events and little boxes of peace from our cosy
            corner in Rossington.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/shop"
              className="rounded-full bg-[var(--accent)] px-7 py-3 font-semibold text-[var(--background)] transition hover:bg-[var(--secondary)]"
            >
              Shop Gift Boxes
            </Link>

            <Link
              href="/events"
              className="rounded-full border-2 border-[var(--accent)] px-7 py-3 font-semibold text-[var(--accent)] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
            >
              See What’s On
            </Link>
          </div>

          {!loading && isSignedIn === false && (
            <div className="mt-6 text-sm text-[var(--foreground)]/70">
              <Link href="/sign-in" className="font-semibold text-[var(--accent)]">
                Sign in
              </Link>{" "}
              or{" "}
              <Link href="/sign-up" className="font-semibold text-[var(--accent)]">
                create an account
              </Link>{" "}
              for a more personal experience.
            </div>
          )}
        </div>
      </section>

      {/* GIFT BOXES */}
      <section className="px-6 py-12 bg-[var(--foreground)]/[0.04]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              Quiet Night In Collection
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              A little box of calm.
            </h2>
            <p className="mt-3 text-[var(--foreground)]/70">
              Thoughtful gift boxes built around reading, comfort, scent and
              slow evenings.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {giftBoxes.map((box) => (
              <article
                key={box.name}
                className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--background)] p-6 shadow-sm"
              >
                <p className="mb-3 text-sm text-[var(--accent)]">{box.tag}</p>
                <h3 className="text-2xl font-semibold">{box.name}</h3>
                <p className="mt-3 min-h-[72px] text-sm leading-relaxed text-[var(--foreground)]/70">
                  {box.description}
                </p>

                <Link
                  href={box.href}
                  className="mt-6 inline-block font-semibold text-[var(--accent)] hover:text-[var(--secondary)]"
                >
                  View box →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
                What’s On
              </p>
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Latest events and community nights.
              </h2>
            </div>

            <Link
              href="/events"
              className="font-semibold text-[var(--accent)] hover:text-[var(--secondary)]"
            >
              View all events →
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {events.map((event) => (
              <article
                key={event.title}
                className="rounded-2xl border border-[var(--accent)]/20 p-6"
              >
                <p className="mb-3 text-sm text-[var(--accent)]">{event.date}</p>
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]/70">
                  {event.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* NEWS */}
      <section className="px-6 py-12 bg-[var(--foreground)]/[0.04]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              Latest Chapter
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Notes from Pages & Peace.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {news.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl bg-[var(--background)] p-6"
              >
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]/70">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Books, coffee, calm and community.
          </h2>

          <p className="mt-4 text-[var(--foreground)]/70">
            Browse the shop, check the menu, or see what’s happening this week.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/shop"
              className="rounded-full border-2 border-[var(--accent)] px-6 py-3 font-semibold text-[var(--accent)] hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
            >
              Browse the Shop
            </Link>

            <Link
              href="/menu"
              className="rounded-full border-2 border-[var(--accent)] px-6 py-3 font-semibold text-[var(--accent)] hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
            >
              View the Menu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}