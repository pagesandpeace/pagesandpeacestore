"use client";

type Store = { id: string; name: string };

type Props = {
  stores: Store[];
  selectedStore: string;
  onChange: (id: string) => void;
};

export default function StoreSelector({ stores, selectedStore, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Store / Chapter</p>

      <select
        className="w-full border rounded-md px-3 py-2"
        value={selectedStore}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a store…</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
