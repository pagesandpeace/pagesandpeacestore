"use client";

import { useState } from "react";
import MenuSection from "./MenuSection";

type MenuItem = { id: string; category_id: string; name: string; price: number; position: number; note: string | null };
type CategoryWithItems = { id: string; name: string; position: number; items: MenuItem[] };
type SectionWithCategories = { id: string; name: string; slug: string; position: number; categories: CategoryWithItems[] };

export default function Tabs({ sections }: { sections: SectionWithCategories[] }) {
  const [activeTab, setActiveTab] = useState(sections[0]?.id ?? "");

  if (!sections.length) return <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 text-center text-[#666]">Menu coming soon.</div>;

  const active = sections.find((section) => section.id === activeTab) ?? sections[0];

  return <>
    <div className="mb-10 flex flex-wrap justify-center gap-6">
      {sections.map((section) => <button key={section.id} onClick={() => setActiveTab(section.id)} className={`pb-2 text-xl font-medium ${active.id === section.id ? "border-b-4 border-[#5DA865] text-[#5DA865]" : "text-[#111]/70 hover:text-[#5DA865]"}`}>{section.name}</button>)}
    </div>
    <div className="mx-auto max-w-3xl space-y-10">
      {active.categories.map((category) => <MenuSection key={category.id} title={category.name} items={category.items} />)}
    </div>
  </>;
}
