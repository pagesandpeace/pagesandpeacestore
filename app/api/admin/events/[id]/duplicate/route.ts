import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";
import slugify from "slugify";

type SupabaseServiceClient = ReturnType<typeof supabaseService>;

async function cleanupPartialDuplicate({
  supabase,
  createdEventId,
  createdProductIds,
}: {
  supabase: SupabaseServiceClient;
  createdEventId: string | null;
  createdProductIds: string[];
}) {
  console.warn("🧹 [DUPLICATE EVENT] cleaning up partial duplicate:", {
    createdEventId,
    createdProductIds,
  });

  if (createdEventId) {
    await supabase
      .from("event_ticket_types")
      .delete()
      .eq("event_id", createdEventId);

    await supabase.from("events").delete().eq("id", createdEventId);
  }

  if (createdProductIds.length > 0) {
    await supabase.from("products").delete().in("id", createdProductIds);
  }
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const createdProductIds: string[] = [];
  let createdEventId: string | null = null;

  try {
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing event id" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       1. Require admin first
    -------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /*
      Use service role only AFTER admin check.
      This avoids RLS blocking admin-only inserts.
    */
    const supabase = supabaseService();

    /* --------------------------------------------------
       2. Load original event
    -------------------------------------------------- */
    const { data: originalEvent, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (eventError || !originalEvent) {
      console.error("❌ [DUPLICATE EVENT] original event error:", eventError);

      return NextResponse.json(
        { error: "Original event not found" },
        { status: 404 }
      );
    }

    /* --------------------------------------------------
       3. Load original ticket types
    -------------------------------------------------- */
    const { data: originalTickets, error: ticketsError } = await supabase
      .from("event_ticket_types")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    if (ticketsError) {
      console.error("❌ [DUPLICATE EVENT] ticket load error:", ticketsError);

      return NextResponse.json(
        { error: ticketsError.message },
        { status: 500 }
      );
    }

    const newTitle = `${originalEvent.title} Copy`;

    const newSlug =
      slugify(newTitle, { lower: true, strict: true }) +
      "-" +
      Date.now().toString().slice(-6);

    let defaultProductId: string | null = null;

    /* --------------------------------------------------
       4. Create default product for ticketed event
    -------------------------------------------------- */
    if (originalEvent.booking_type === "ticketed") {
      const defaultTicket = originalTickets?.find((ticket) => ticket.is_default);

      const defaultPricePence =
        defaultTicket?.price_pence ?? originalEvent.price_pence ?? 0;

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: `${newTitle} – General Admission`,
          slug: `${newSlug}-general`,
          description:
            originalEvent.subtitle || originalEvent.short_description || "",
          price: (defaultPricePence / 100).toFixed(2),
          image_url: originalEvent.image_url,
          product_type: "event",
          inventory_count: originalEvent.capacity,
        })
        .select()
        .single();

      if (productError || !product) {
        console.error("❌ [DUPLICATE EVENT] product insert error:", productError);

        return NextResponse.json(
          { error: productError?.message || "Failed to create product" },
          { status: 500 }
        );
      }

      defaultProductId = product.id;
      createdProductIds.push(product.id);
    }

    /* --------------------------------------------------
       5. Create duplicated event
    -------------------------------------------------- */
    const { data: newEvent, error: newEventError } = await supabase
      .from("events")
      .insert({
        title: newTitle,
        subtitle: originalEvent.subtitle,
        short_description: originalEvent.short_description,
        description: originalEvent.description,
        date: originalEvent.date,
        capacity: originalEvent.capacity,
        price_pence: originalEvent.price_pence,
        image_url: originalEvent.image_url,
        store_id: originalEvent.store_id,
        published: false,
        slug: newSlug,
        product_id: defaultProductId,
        booking_type: originalEvent.booking_type,
      })
      .select()
      .single();

    if (newEventError || !newEvent) {
      console.error("❌ [DUPLICATE EVENT] event insert error:", newEventError);

      await cleanupPartialDuplicate({
        supabase,
        createdEventId,
        createdProductIds,
      });

      return NextResponse.json(
        { error: newEventError?.message || "Failed to duplicate event" },
        { status: 500 }
      );
    }

    createdEventId = newEvent.id;

    /* --------------------------------------------------
       6. Duplicate ticket types

       If the original ticketed event has no ticket rows,
       create a fallback default ticket so the duplicate is usable.
    -------------------------------------------------- */
    if (originalEvent.booking_type === "ticketed") {
      const ticketsToCopy =
        originalTickets && originalTickets.length > 0
          ? originalTickets
          : [
              {
                name: "General Admission",
                description: null,
                price_pence: originalEvent.price_pence ?? 0,
                inventory_count: originalEvent.capacity ?? 0,
                is_default: true,
                is_active: true,
              },
            ];

      for (const ticket of ticketsToCopy) {
        let ticketProductId = defaultProductId;

        if (!ticket.is_default) {
          const ticketProductSlug = slugify(
            `${newTitle}-${ticket.name}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            { lower: true, strict: true }
          );

          const { data: product, error: productError } = await supabase
            .from("products")
            .insert({
              name: `${newTitle} – ${ticket.name}`,
              slug: ticketProductSlug,
              description: ticket.description || ticket.name,
              price: (ticket.price_pence / 100).toFixed(2),
              image_url: originalEvent.image_url,
              product_type: "event",
              inventory_count: ticket.inventory_count ?? 0,
            })
            .select()
            .single();

          if (productError || !product) {
            console.error(
              "❌ [DUPLICATE EVENT] extra ticket product insert error:",
              productError
            );

            await cleanupPartialDuplicate({
              supabase,
              createdEventId,
              createdProductIds,
            });

            return NextResponse.json(
              {
                error:
                  productError?.message ||
                  `Failed to create product for ticket ${ticket.name}`,
              },
              { status: 500 }
            );
          }

          ticketProductId = product.id;
          createdProductIds.push(product.id);
        }

        if (!ticketProductId) {
          await cleanupPartialDuplicate({
            supabase,
            createdEventId,
            createdProductIds,
          });

          return NextResponse.json(
            { error: "Missing product for default ticket" },
            { status: 500 }
          );
        }

        const { error: ticketInsertError } = await supabase
          .from("event_ticket_types")
          .insert({
            event_id: newEvent.id,
            name: ticket.name,
            description: ticket.description,
            price_pence: ticket.price_pence,
            inventory_count: ticket.inventory_count ?? 0,
            sold_count: 0,
            product_id: ticketProductId,
            is_default: ticket.is_default,
            is_active: ticket.is_active,
          });

        if (ticketInsertError) {
          console.error(
            "❌ [DUPLICATE EVENT] ticket insert error:",
            ticketInsertError
          );

          await cleanupPartialDuplicate({
            supabase,
            createdEventId,
            createdProductIds,
          });

          return NextResponse.json(
            { error: ticketInsertError.message },
            { status: 500 }
          );
        }
      }
    }

    console.log("✅ [DUPLICATE EVENT] created:", newEvent.id);

    return NextResponse.json({
      success: true,
      event: newEvent,
    });
  } catch (err) {
    console.error("💥 [DUPLICATE EVENT] crashed:", err);

    return NextResponse.json(
      { error: "Failed to duplicate event" },
      { status: 500 }
    );
  }
}