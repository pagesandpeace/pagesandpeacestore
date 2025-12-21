"use client";

import { useState } from "react";
import MenuSection from "./MenuSection";

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  position: number;
  note: string | null;
};

type CategoryWithItems = {
  id: string;
  name: string;
  position: number;
  items: MenuItem[];
};

export default function Tabs({
  drinks,
  food,
}: {
  drinks: CategoryWithItems[];
  food: CategoryWithItems[];
}) {
  const [activeTab, setActiveTab] = useState<"drinks" | "food">("drinks");

  return (
    <>
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

      {activeTab === "drinks" && (
        <div className="max-w-3xl mx-auto space-y-10">
          {drinks.map((cat) => (
            <MenuSection key={cat.id} title={cat.name} items={cat.items} />
          ))}
        </div>
      )}

      {activeTab === "food" && (
        <div className="max-w-3xl mx-auto space-y-10">
          {food.map((cat) => (
            <MenuSection key={cat.id} title={cat.name} items={cat.items} />
          ))}
        </div>
      )}
    </>
  );
}
