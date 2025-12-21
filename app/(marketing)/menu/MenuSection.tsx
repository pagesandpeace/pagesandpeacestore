type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  position: number;
  note: string | null;
};

export default function MenuSection({
  title,
  items,
}: {
  title: string;
  items: MenuItem[];
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#111] mb-1">{title}</h2>

      <div className="border-t border-[#111]/20 pt-3 divide-y divide-[#111]/10">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between py-2 text-lg leading-snug"
          >
            <span className="font-medium">{item.name}</span>

            <span className="text-[#5DA865] font-medium ml-8 shrink-0">
              {item.price === 0
                ? "Included"
                : `£${Number(item.price).toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
