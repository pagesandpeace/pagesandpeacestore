import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Tabs from "./Tabs";

type MenuSectionRow = { id: string; name: string; slug: string; position: number };
type MenuCategory = { id: string; name: string; position: number; section_id: string | null };
type MenuItem = { id: string; category_id: string; name: string; price: number; position: number; note: string | null };

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await supabaseServer();

  const [{ data: sections }, { data: categories }, { data: items }] = await Promise.all([
    supabase.from("menu_sections").select("id, name, slug, position").eq("is_visible", true).order("position"),
    supabase.from("menu_categories").select("id, name, position, section_id").order("position"),
    supabase.from("menu_items").select("id, category_id, name, price, position, note").eq("is_visible", true).order("position"),
  ]);

  const sectionRows = (sections ?? []) as MenuSectionRow[];
  const categoryRows = (categories ?? []) as MenuCategory[];
  const itemRows = (items ?? []) as MenuItem[];

  const sectionTree = sectionRows
    .map((section) => ({
      ...section,
      categories: categoryRows
        .filter((category) => category.section_id === section.id)
        .map((category) => ({ ...category, items: itemRows.filter((item) => item.category_id === category.id) }))
        .filter((category) => category.items.length > 0),
    }))
    .filter((section) => section.categories.length > 0);

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 font-[Montserrat] text-[#111]">
      <section className="mb-10 flex flex-col items-center text-center">
        <Image src="/p&p_logo_cream.svg" alt="Pages & Peace logo" width={140} height={140} className="mb-4" />
        <h1 className="text-4xl font-semibold tracking-widest text-[#5DA865] sm:text-5xl">Our Menu</h1>
        <p className="mt-2 text-[#111]/70">Every community needs a chapter.</p>
      </section>

      <Tabs sections={sectionTree} />

      <div className="mt-16 text-center">
        <Link href="/" className="inline-block font-medium text-[#5DA865] hover:underline">← Back to Home</Link>
      </div>
    </main>
  );
}
