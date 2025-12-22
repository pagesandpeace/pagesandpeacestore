import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Tabs from "./Tabs"; // <-- import client component

type MenuCategory = {
  id: string;
  name: string;
  position: number;
};

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  position: number;
  note: string | null;
};

export default async function MenuPage() {
  const supabase = await supabaseServer();

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("*")
    .order("position", { ascending: true });

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .order("position", { ascending: true });

  const cats = (categories ?? []) as MenuCategory[];
  const its = (items ?? []) as MenuItem[];

  // Attach items
  const categoriesWithItems = cats.map((cat) => ({
    ...cat,
    items: its.filter((i) => i.category_id === cat.id),
  }));

  const drinks = categoriesWithItems.filter((c) =>
    ["Hot Drinks", "Cold Drinks", "Alt Milk", "Syrups", "Extras"].includes(c.name)
  );

  const food = categoriesWithItems.filter((c) =>
    ["Traybakes", "Cakes", "Savoury", "Viennoiserie", "Toasted", "DBF"].includes(
      c.name
    )
  );

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 py-12">
      <section className="flex flex-col items-center mb-10 text-center">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={140}
          height={140}
          className="mb-4"
        />
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-widest text-[#5DA865]">
          Our Menu
        </h1>
        <p className="text-[#111]/70 mt-2">Every community needs a chapter.</p>
      </section>

      {/* TABS CLIENT COMPONENT */}
      <Tabs drinks={drinks} food={food} />

      <div className="text-center mt-16">
        <Link href="/" className="inline-block text-[#5DA865] font-medium hover:underline">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
