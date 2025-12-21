export default function PriceDisplay({ price }: { price: number }) {
  return (
    <p className="text-3xl font-extrabold text-[var(--accent)] tracking-tight">
      £{price.toFixed(2)}
    </p>
  );
}
