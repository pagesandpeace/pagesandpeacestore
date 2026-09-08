import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import MenuSection from "@/app/(marketing)/menu/MenuSection";

type Category = { id: string; name: string; position: number };
type Item = { id: string; category_id: string; name: string; price: number; position: number; note: string | null };

export const dynamic = "force-dynamic";

export default async function MerchPage() {
  const supabase = await supabaseServer();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("menu_categories").select("id, name, position").eq("website_area", "merch").order("position"),
    supabase.from("menu_items").select("id, category_id, name, price, position, note").eq("is_visible", true).order("position"),
  ]);

  const cats = (categories ?? []) as Category[];
  const its = (items ?? []) as Item[];
  const groups = cats
    .map((category) => ({ ...category, items: its.filter((item) => item.category_id === category.id) }))
    .filter((category) => category.items.length > 0);

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 font-[Montserrat] text-[#111]">
      <section className="mb-10 flex flex-col items-center text-center">
        <Image src="/p&p_logo_cream.svg" alt="Pages & Peace logo" width={140} height={140} className="mb-4" />
        <h1 className="text-4xl font-semibold tracking-widest text-[#5DA865] sm:text-5xl">Merchandise</h1>
        <p className="mt-2 text-[#111]/70">Pages &amp; Peace things to take home.</p>
        <Link href="/menu" className="mt-4 text-sm font-semibold text-[#5DA865] hover:underline">← Back to food &amp; drinks</Link>
      </section>

      <div className="mx-auto max-w-3xl space-y-10">
        {groups.map((category) => <MenuSection key={category.id} title={category.name} items={category.items} />)}
        {!groups.length ? <div className="rounded-2xl border bg-white p-8 text-center text-[#666]">Merchandise coming soon.</div> : null}
      </div>
    </main>
  );
}
