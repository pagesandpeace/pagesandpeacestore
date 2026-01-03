"use client";

import { Input } from "@/components/ui/Input";

type PricingAssistantProps = {
  supplierPrice: number;
  markupPercent: number;
  price: number;
  onSupplierPriceChange: (value: number) => void;
  onMarkupChange: (value: number) => void;
  onPriceChange: (value: number) => void;
};

export default function PricingAssistant({
  supplierPrice,
  markupPercent,
  price,
  onSupplierPriceChange,
  onMarkupChange,
  onPriceChange,
}: PricingAssistantProps) {
  return (
    <div className="p-4 rounded-lg border bg-gray-50 space-y-3">
      <h3 className="font-semibold">Pricing Assistant</h3>

      <div>
        <label className="block mb-1 text-sm">Purchase price (£)</label>
        <Input
          type="number"
          step="0.01"
          value={supplierPrice}
          onChange={(e) => onSupplierPriceChange(Number(e.target.value))}
        />
      </div>

      <div>
        <label className="block mb-1 text-sm">Markup (%)</label>
        <Input
          type="number"
          value={markupPercent}
          onChange={(e) => onMarkupChange(Number(e.target.value))}
        />
      </div>

      <div>
        <label className="block mb-1 text-sm">Retail price (£)</label>
        <Input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => onPriceChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
