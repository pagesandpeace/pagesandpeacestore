"use client";

import { useState } from "react";
import ProductSearchSelect from "@/components/admin/ProductSearchSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type ExistingItem = {
  kind: "existing";
  product_id: string;
  product_name: string;
  quantity: number;
  requested_quantity: number;
  notes: string;
};

type NewItem = {
  kind: "new";
  title: string;
  author?: string;
  supplier?: string;
  isbn?: string;
  quantity: number;
  requested_quantity: number;
  notes: string;
};


type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (item: ExistingItem | NewItem) => void;
};

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function AddOrderItemModal({
  open,
  onClose,
  onAdd,
}: Props) {
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // shared
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // existing
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>("");

  // new
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [supplier, setSupplier] = useState("");
  const [isbn, setIsbn] = useState("");

  if (!open) return null;

  function reset() {
    setQuantity(1);
    setNotes("");
    setProductId(null);
    setProductName("");
    setTitle("");
    setAuthor("");
    setSupplier("");
    setIsbn("");
    setMode("existing");
  }

  function submit() {
  if (mode === "existing") {
    if (!productId) return;

    onAdd({
      kind: "existing",
      product_id: productId,
      product_name: productName,
      quantity,
      requested_quantity: quantity, // ✅ IMPORTANT
      notes,
    });
  } else {
    if (!title.trim()) return;

    onAdd({
      kind: "new",
      title,
      author: author || undefined,
      supplier: supplier || undefined,
      isbn: isbn || undefined,
      quantity,
      requested_quantity: quantity, // ✅ IMPORTANT
      notes,
    });
  }

  reset();
  onClose();
}


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-lg p-6 space-y-5">
        <h2 className="text-lg font-medium">Add order item</h2>

        {/* MODE */}
        <div className="flex gap-2">
          <Button
            variant={mode === "existing" ? "primary" : "neutral"}
            onClick={() => setMode("existing")}
          >
            Existing product
          </Button>
          <Button
            variant={mode === "new" ? "primary" : "neutral"}
            onClick={() => setMode("new")}
          >
            New title
          </Button>
        </div>

        {/* EXISTING */}
        {mode === "existing" && (
          <div className="space-y-3">
            <ProductSearchSelect
              onAdd={(product) => {
                setProductId(product.id);
                setProductName(product.name);
              }}
            />

            {productId && (
              <div className="border rounded p-3 bg-gray-50 text-sm">
                <p className="font-medium">Selected product</p>
                <p>{productName}</p>
              </div>
            )}
          </div>
        )}

        {/* NEW */}
        {mode === "new" && (
          <div className="space-y-3">
            <Input
              placeholder="Book title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <Input
              placeholder="Publisher / Supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
            <Input
              placeholder="ISBN"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
          </div>
        )}

        {/* SHARED */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <Input
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              mode === "existing"
                ? !productId
                : !title.trim()
            }
          >
            Add item
          </Button>
        </div>
      </div>
    </div>
  );
}
