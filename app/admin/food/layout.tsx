import FoodNav from "@/components/admin/food/FoodNav";

export default function FoodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4">
      <FoodNav />
      {children}
    </div>
  );
}
