"use client";

import { Input } from "@/components/ui/Input";

type FulfilmentMode = "made_to_order" | "physical";
type OutOfStockBehavior = "stop_selling" | "switch_to_made_to_order";

type Props = {
  fulfilmentMode: FulfilmentMode;
  onFulfilmentModeChange: (v: FulfilmentMode) => void;

  inventoryCount: number;
  onInventoryCountChange: (v: number) => void;

  outOfStockBehavior: OutOfStockBehavior;
  onOutOfStockBehaviorChange: (v: OutOfStockBehavior) => void;
};

export default function FulfilmentSettings({
  fulfilmentMode,
  onFulfilmentModeChange,
  inventoryCount,
  onInventoryCountChange,
  outOfStockBehavior,
  onOutOfStockBehaviorChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 text-sm">Fulfilment</label>
        <select
          value={fulfilmentMode}
          onChange={(e) =>
            onFulfilmentModeChange(
              e.target.value as FulfilmentMode
            )
          }
          className="border p-2 rounded w-full"
        >
          <option value="made_to_order">
            Made to order (supplier fulfilment)
          </option>
          <option value="physical">
            Physical stock (in store)
          </option>
        </select>
      </div>

      {fulfilmentMode === "physical" && (
        <>
          <div>
            <label className="block mb-1 text-sm">Stock</label>
            <Input
              type="number"
              min={0}
              value={inventoryCount}
              onChange={(e) =>
                onInventoryCountChange(Number(e.target.value))
              }
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">
              When stock reaches zero
            </label>
            <select
              value={outOfStockBehavior}
              onChange={(e) =>
                onOutOfStockBehaviorChange(
                  e.target.value as OutOfStockBehavior
                )
              }
              className="border p-2 rounded w-full"
            >
              <option value="stop_selling">
                Stop selling
              </option>
              <option value="switch_to_made_to_order">
                Switch to made-to-order
              </option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
