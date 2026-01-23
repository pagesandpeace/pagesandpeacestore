import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await supabaseServer();

  /* --------------------------------------------
     FETCH PRODUCT
  -------------------------------------------- */
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      author_rel:authors(id, name),
      genre:genres(name),
      vibe:vibes(name),
      theme:themes(name)
    `)
    .eq("id", id)
    .neq("product_type", "event")
    .single();

  if (error || !product) {
    return (
      <main className="max-w-5xl mx-auto py-12 space-y-6">
        <h1 className="text-2xl font-bold">Product not accessible</h1>
        <Link href="/admin/products">
          <Button variant="neutral">Back to products</Button>
        </Link>
      </main>
    );
  }

  /* --------------------------------------------
     FETCH SUPPLIER LINK
  -------------------------------------------- */
  const { data: supplierLink } = await supabase
    .from("product_supplier_links")
    .select("supplier, supplier_ref")
    .eq("product_id", id)
    .maybeSingle();

  /* --------------------------------------------
     FETCH PENDING SUPPLIER CHANGES (RRP)
  -------------------------------------------- */
  const { data: pendingChange } = await supabase
    .from("supplier_changes")
    .select("id, field, old_value, new_value, detected_at")
    .eq("product_id", id)
    .eq("status", "pending")
    .maybeSingle();

  /* --------------------------------------------
     DERIVED VALUES
  -------------------------------------------- */
  const title = product.display_title || product.name;
  const sellingPrice = Number(product.price);

  const displayAuthor =
    product.author_rel?.name ?? product.author ?? null;

  const isSupplierAuthor =
    !product.author_rel?.name && Boolean(product.author);

  /* --------------------------------------------
     RENDER
  -------------------------------------------- */
  return (
    <main className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-neutral-600">
            Internal name: {product.name}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/admin/products/${product.id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Link href="/admin/products">
            <Button variant="neutral">Back</Button>
          </Link>
        </div>
      </div>

      {/* SUPPLIER ALERT */}
      {pendingChange && pendingChange.field === "supplier_price" && (
        <Alert
          type="warning"
          message={
            `Supplier reference update detected.\n\n` +
            `Previous RRP: £${Number(pendingChange.old_value).toFixed(2)}\n` +
            `New RRP: £${Number(pendingChange.new_value).toFixed(2)}\n\n` +
            `This does NOT change your selling price automatically. ` +
            `Review and update pricing manually if required.`
          }
        />
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRODUCT DETAILS */}
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Type" value={product.product_type} />

            <div>
              <span className="block text-xs uppercase text-muted-foreground">
                Author
              </span>
              <div className="flex items-center gap-2">
                <span>{displayAuthor ?? "—"}</span>
                {isSupplierAuthor && (
                  <Badge color="yellow">supplier</Badge>
                )}
              </div>
            </div>

            <Row label="Format" value={product.format} />
            <Row label="Language" value={product.language} />
            <Row label="ISBN" value={product.isbn_13} />
            <Row label="Slug" value={product.slug} small />
          </CardContent>
        </Card>

        {/* SUPPLIER */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Supplier" value={supplierLink?.supplier} />
            <Row label="Supplier ref" value={supplierLink?.supplier_ref} />

            <div>
              <span className="block text-xs uppercase text-muted-foreground">
                Link status
              </span>
              {supplierLink ? (
                <Badge color="green">linked</Badge>
              ) : (
                <span>—</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PRICING */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row
              label="Selling price"
              value={`£${sellingPrice.toFixed(2)}`}
              strong
            />

            <Row
              label="Supplier RRP"
              value={
                product.rrp != null
                  ? `£${Number(product.rrp).toFixed(2)}`
                  : "—"
              }
            />

            <p className="text-xs text-muted-foreground">
              Supplier RRPs are reference-only. Actual purchase
              cost is determined at order time.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DESCRIPTION */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-line">
          {product.description || "No description provided."}
        </CardContent>
      </Card>

      {/* IMAGE */}
      {product.image_url && (
        <Card>
          <CardHeader>
            <CardTitle>Product image</CardTitle>
          </CardHeader>
          <CardContent>
            <Image
              src={product.image_url}
              alt={title}
              width={300}
              height={300}
              className="rounded border object-cover"
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}

/* --------------------------------------------
   HELPER
-------------------------------------------- */
function Row({
  label,
  value,
  small,
  strong,
}: {
  label: string;
  value?: string | null;
  small?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <span className="block text-xs uppercase text-muted-foreground">
        {label}
      </span>
      <p
        className={[
          small ? "text-xs break-all" : "",
          strong ? "font-semibold" : "",
        ].join(" ")}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
