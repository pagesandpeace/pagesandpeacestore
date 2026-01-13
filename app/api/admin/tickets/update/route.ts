import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎟️ [TICKET UPDATE] route hit");

  try {
    const supabase = await supabaseServer();

    /* -----------------------------------------
       AUTH + ROLE CHECK (SERVER-SIDE ONLY)
    ----------------------------------------- */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("❌ [TICKET UPDATE] unauthenticated");
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("❌ [TICKET UPDATE] failed to load user profile", profileError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const isAdmin = profile.role === "admin";

    console.log("👤 Authenticated user:", {
      user_id: profile.id,
      role: profile.role,
      isAdmin,
    });

    /* -----------------------------------------
       PARSE BODY
    ----------------------------------------- */
    const body = await req.json();

    console.log("📥 [TICKET UPDATE] raw payload:", body);

    const { id, name, price_pence, is_active } = body;

    console.log("🔍 Parsed fields:", {
      id,
      name,
      price_pence,
      is_active,
      price_type: typeof price_pence,
    });

    if (!id) {
      console.error("❌ [TICKET UPDATE] missing ticket id");
      return NextResponse.json({ error: "Missing ticket id" }, { status: 400 });
    }

    /* -----------------------------------------
       LOAD TICKET
    ----------------------------------------- */
    console.log("📡 Loading ticket row…");

    const { data: ticket, error: ticketError } = await supabase
      .from("event_ticket_types")
      .select("id, is_default, product_id, event_id, price_pence")
      .eq("id", id)
      .single();

    console.log("📄 Ticket load result:", {
      ticket,
      ticketError,
    });

    if (ticketError || !ticket) {
      console.error("❌ [TICKET UPDATE] ticket not found");
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    /* -----------------------------------------
       🔒 BOOKING GUARD (ADMIN AWARE)
    ----------------------------------------- */
    if (price_pence !== undefined) {
      console.log("🔐 Price edit requested — checking event bookings…");

      const { count, error: bookingError } = await supabase
        .from("event_bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", ticket.event_id);

      console.log("📊 Booking check result:", {
        event_id: ticket.event_id,
        count,
        bookingError,
      });

      if ((count ?? 0) > 0 && !isAdmin) {
        console.warn(
          "⛔ Price update blocked — non-admin, event has bookings:",
          count
        );

        return NextResponse.json(
          {
            error:
              "Ticket prices cannot be changed once bookings exist for this event",
          },
          { status: 400 }
        );
      }

      if ((count ?? 0) > 0 && isAdmin) {
        console.log(
          "⚠️ Admin price override — bookings exist:",
          count
        );
      } else {
        console.log("✅ No bookings — price edit allowed");
      }
    }

    /* -----------------------------------------
       BUILD UPDATE PAYLOAD
    ----------------------------------------- */
    const ticketUpdates: Record<string, unknown> = {};

    if (name !== undefined) ticketUpdates.name = name;
    if (price_pence !== undefined) ticketUpdates.price_pence = price_pence;
    if (is_active !== undefined) ticketUpdates.is_active = is_active;

    console.log("🧱 Ticket update payload:", ticketUpdates);

    /* -----------------------------------------
       UPDATE TICKET
    ----------------------------------------- */
    if (Object.keys(ticketUpdates).length > 0) {
      console.log("🛠 Updating event_ticket_types…");

      const { data: updatedTicket, error } = await supabase
        .from("event_ticket_types")
        .update(ticketUpdates)
        .eq("id", id)
        .select()
        .single();

      console.log("🧾 Ticket update result:", {
        updatedTicket,
        error,
      });

      if (error) {
        console.error("❌ Ticket update failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      console.warn("⚠️ No ticket fields changed — skipping ticket update");
    }

    /* -----------------------------------------
       🔁 SYNC PRODUCT PRICE (FOR FUTURE SALES)
    ----------------------------------------- */
    if (price_pence !== undefined) {
      const priceString = (price_pence / 100).toFixed(2);

      console.log("🔁 Syncing product price…", {
        product_id: ticket.product_id,
        price_pence,
        priceString,
      });

      const { data: productUpdate, error: productError } = await supabase
        .from("products")
        .update({ price: priceString })
        .eq("id", ticket.product_id)
        .select()
        .single();

      console.log("🧾 Product update result:", {
        productUpdate,
        productError,
      });

      if (productError) {
        console.error("❌ Product price sync failed:", productError);
        return NextResponse.json({ error: productError.message }, { status: 500 });
      }
    } else {
      console.log("ℹ️ price_pence not provided — skipping product sync");
    }

    console.log("✅ [TICKET UPDATE] completed successfully");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("💥 [TICKET UPDATE] route crashed:", err);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
