import ProductCard, { Product } from "@/components/ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products || products.length === 0) {
    return (
      <p className="text-center text-gray-600 mt-10">
        No products found.
      </p>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 mt-10">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
