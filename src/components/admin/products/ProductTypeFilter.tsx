"use client";

export default function ProductTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="border p-2 rounded"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">All Types</option>
      <option value="book">Books</option>
      <option value="blind-date">Blind-Date</option>
      <option value="coffee">Coffee</option>
      <option value="merch">Merch</option>
      <option value="physical">General</option>
    </select>
  );
}
