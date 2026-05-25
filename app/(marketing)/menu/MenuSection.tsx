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
          <div key={item.id} className="flex justify-between gap-6 py-3">
            <div className="flex-1">
              <p className="text-lg font-medium leading-snug text-[#111]">
                {item.name}
              </p>

              {item.note && (
                <p className="text-sm text-[#111]/60 mt-1 leading-relaxed">
                  {item.note}
                </p>
              )}
            </div>

            <span className="text-[#5DA865] font-medium text-lg shrink-0">
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