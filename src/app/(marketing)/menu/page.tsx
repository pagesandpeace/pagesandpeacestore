"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState("drinks");

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 py-12">
      {/* --- Header --- */}
      <section className="flex flex-col items-center mb-10 text-center">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={140}
          height={140}
          className="mb-4"
        />
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-widest text-[#5DA865]">
          Pages & Peace Menu
        </h1>
        <p className="text-[#111]/70 mt-2">
          Every community needs a chapter.
        </p>
      </section>

      {/* --- Tabs --- */}
      <div className="flex justify-center mb-10 space-x-6">
        <button
          onClick={() => setActiveTab("drinks")}
          className={`pb-2 text-xl font-medium ${
            activeTab === "drinks"
              ? "border-b-4 border-[#5DA865] text-[#5DA865]"
              : "text-[#111]/70 hover:text-[#5DA865]"
          }`}
        >
          Drinks
        </button>
        <button
          onClick={() => setActiveTab("food")}
          className={`pb-2 text-xl font-medium ${
            activeTab === "food"
              ? "border-b-4 border-[#5DA865] text-[#5DA865]"
              : "text-[#111]/70 hover:text-[#5DA865]"
          }`}
        >
          Food
        </button>
      </div>

      {/* --- Drinks Tab --- */}
      {activeTab === "drinks" && (
        <div className="max-w-3xl mx-auto space-y-10">
          <MenuSection
            title="Drinks"
            items={[
              ["Espresso", "£2.00"],
              ["Cappuccino", "£3.50"],
              ["Latte", "£3.00"],
              ["Americano", "£3.00"],
              ["Flat White", "£3.20"],
              ["Mocha", "£3.20"],
              ["Hot Chocolate", "£2.60"],
              ["Luxury Hot Chocolate", "£4.20"],
              ["Yorkshire Tea", "£2.50"],
            ]}
            note={
              <>
                <strong>Our Coffee:</strong> Fairtrade Brazilian Smooth 100%
                Arabica Beans. A captivating blend of dried cherry sweetness,
                earthy notes, and hints of cedar and spice.{" "}
                <em>Country of origin: Brazil.</em>
              </>
            }
          />

          <MenuSection
            title="Alternative Milk"
            items={[["Oatly", "£0.50"]]}
          />

          <MenuSection
            title="Syrups"
            items={[
              ["Vanilla", "£0.50"],
              ["Hazelnut", "£0.50"],
              ["Caramel", "£0.50"],
            ]}
            note={
              <>
                <strong>Our Syrups:</strong> Established in the French Alps in
                1883, Maison Routin crafts premium syrups inspired by nature and
                refined through over a century of French expertise.
              </>
            }
          />

          <MenuSection
            title="Extras"
            items={[
              ["Extra Shot", "£0.50"],
              ["Marshmallows", "£0.50"],
              ["Cream", "Just ask for a squirt"],
            ]}
          />
        </div>
      )}

      {/* --- Food Tab --- */}
      {activeTab === "food" && (
        <div className="max-w-3xl mx-auto space-y-10">
          <MenuSection
            title="Traybakes & Cookie Bars"
            items={[
              ["Rocky Road", "£3.60"],
              ["Salted Caramel Brownie", "£3.40"],
              ["Banoffee Cookie Bar", "£3.90"],
              ["Brownie", "£3.70"],
              ["Bakewell Slice", "£2.90"],
            ]}
            note={
              <>
                <strong>Our Food:</strong> Proudly supplied by 4 Eyes Bakery &
                Patisserie, renowned for handcrafted artisan bread, pastries,
                and viennoiserie. Every bite at Pages & Peace is fresh,
                indulgent, and made with care.
              </>
            }
          />

          <MenuSection
            title="Cakes"
            items={[
              ["Chocolate Fudge", "£3.40"],
              ["Lemon & Almond", "£3.40"],
              ["Pistachio & Blueberry", "£3.40"],
              ["Carrot with Frosting & Walnuts", "£3.40"],
              ["Fruit & Almond Bakewell Tart", "£4.00"],
            ]}
          />

          <MenuSection
            title="Savoury"
            items={[
              ["Pork, Apple & Red Onion Chutney Sausage Roll", "£3.50"],
              ["Curried Jackfruit, Aloo Gobi Bubble & Squeak", "£3.25"],
              [
                "Ploughman’s Roll with Cheddar, Onion & Tomato Relish",
                "£3.25",
              ],
            ]}
          />

          <MenuSection
            title="Viennoiserie"
            subtitle="(Pronounced vee-en-wah-zuh-ree) — French baked goods made from enriched doughs."
            items={[
              ["Plain Croissant", "£2.30"],
              ["Pain au Chocolat", "£2.70"],
              ["Cinnamon Swirl", "£2.70"],
              ["Seasonal Danish", "£3.20"],
              ["Almond Pain Suisse", "£3.30"],
              ["Kronuts", "£3.50"],
              ["Patas Cro Nata", "£2.50"],
            ]}
          />

          <MenuSection
            title="Toasted"
            items={[
              ["Toast", "£1.50"],
              ["Tea Cakes", "£2.50"],
              ["Butter & Jam", "Included"],
            ]}
          />
        </div>
      )}

      {/* --- Footer --- */}
      <div className="text-center mt-16">
        <Link
          href="/"
          className="inline-block text-[#5DA865] font-medium hover:underline"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}

/* ------------------ COMPONENT ------------------ */

function MenuSection({
  title,
  subtitle,
  items,
  note,
}: {
  title: string;
  subtitle?: string;
  items: [string, string][];
  note?: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#111] mb-1">{title}</h2>
      {subtitle && <p className="italic text-[#111]/70 mb-3">{subtitle}</p>}

      {/* Two-column list for items */}
      <div className="border-t border-[#111]/20 pt-3 divide-y divide-[#111]/10">
        {items.map(([name, price]) => (
          <div
            key={name}
            className="flex justify-between py-2 text-lg leading-snug"
          >
            <span className="font-medium">{name}</span>
            <span className="text-[#5DA865] font-medium ml-8 shrink-0">
              {price}
            </span>
          </div>
        ))}
      </div>

      {/* Note placed below the section */}
      {note && (
        <p className="text-sm text-[#111]/80 mt-3 leading-relaxed italic border-t border-[#111]/10 pt-2">
          {note}
        </p>
      )}
    </section>
  );
}
