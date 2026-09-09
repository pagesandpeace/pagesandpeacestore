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
  description,
  items,
}: {
  title: string;
  description: string | null;
  items: MenuItem[];
}) {
  return (
    <section>
      <h2 className="mb-1 text-2xl font-semibold text-[#111]">{title}</h2>
      {description ? (
        <p className="mb-3 max-w-2xl text-sm leading-relaxed text-[#111]/65">{description}</p>
      ) : null}

      <div className="divide-y divide-[#111]/10 border-t border-[#111]/20 pt-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-6 py-3">
            <div className="flex-1">
              <p className="text-lg font-medium leading-snug text-[#111]">
                {item.name}
              </p>

              {item.note && (
                <p className="mt-1 text-sm leading-relaxed text-[#111]/60">
                  {item.note}
                </p>
              )}
            </div>

            <span className="shrink-0 text-lg font-medium text-[#5DA865]">
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
