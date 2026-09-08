import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Tabs from "./Tabs";

type WebsiteArea = "drinks" | "food" | "snacks" | "merch";

type MenuCategory = {
  id: string;
  name: string;
  position: number;
  website_area: WebsiteArea;
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
    .select("id, name, position, website_area")
    .in("website_area", ["drinks", "food", "snacks"])
    .order("position", { ascending: true });

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, category_id, name, price, position, note")
    .eq("is_visible", true)
    .order("position", { ascending: true });

  const cats = (categories ?? []) as MenuCategory[];
  const its = (items ?? []) as MenuItem[];

  const uniqueItems = Array.from(
    new Map(its.map((item) => [`${item.category_id}-${item.name}-${item.price}`, item])).values()
  );

  const categoriesWithItems = cats
    .map((cat) => ({ ...cat, items: uniqueItems.filter((i) => i.category_id === cat.id) }))
    .filter((category) => category.items.length > 0);

  const drinks = categoriesWithItems.filter((c) => c.website_area === "drinks");
  const food = categoriesWithItems.filter((c) => c.website_area === "food");
  const snacks = categoriesWithItems.filter((c) => c.website_area === "snacks");

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 py-12">
      <section className="flex flex-col items-center mb-10 text-center">
        <Image src="/p&p_logo_cream.svg" alt="Pages & Peace logo" width={140} height={140} className="mb-4" />
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-widest text-[#5DA865]">Our Menu</h1>
        <p className="text-[#111]/70 mt-2">Every community needs a chapter.</p>
        <Link href="/merch" className="mt-4 text-sm font-semibold text-[#5DA865] hover:underline">Browse merchandise →</Link>
      </section>

      <Tabs drinks={drinks} food={food} snacks={snacks} />

      <div className="text-center mt-16">
        <Link href="/" className="inline-block text-[#5DA865] font-medium hover:underline">← Back to Home</Link>
      </div>
    </main>
  );
}
