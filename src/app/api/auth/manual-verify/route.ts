import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Custom verify-email endpoint
 * Handles manually-created UUID tokens in your verifications table.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ code: "MISSING_TOKEN", message: "Token not provided." }),
        { status: 400 }
      );
    }

    // 🔍 Find matching token in verifications table
    const [record] = await db
      .select()
      .from(schema.verifications)
      .where(eq(schema.verifications.value, token))
      .limit(1);

    if (!record) {
      return new Response(
        JSON.stringify({ code: "INVALID_TOKEN", message: "Token not found." }),
        { status: 400 }
      );
    }

    // 🕓 Check expiry
    if (new Date(record.expiresAt) < new Date()) {
      return new Response(
        JSON.stringify({
          code: "EXPIRED_TOKEN",
          message: "This verification link has expired.",
        }),
        { status: 400 }
      );
    }

    // ✅ Look up corresponding user
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, record.identifier))
      .limit(1);

    if (!user) {
      return new Response(
        JSON.stringify({
          code: "USER_NOT_FOUND",
          message: "No user associated with this token.",
        }),
        { status: 404 }
      );
    }

    // ✅ Mark verified
    await db
  .update(schema.users)
  .set({
    emailVerified: true,
    updatedAt: new Date().toISOString(), // ✅ FIXED
  })
  .where(eq(schema.users.id, user.id));


    // 🧹 Delete used token
    await db
      .delete(schema.verifications)
      .where(eq(schema.verifications.id, record.id));

    // 🎉 Redirect to success page
    const baseUrl =
  process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000";

return Response.redirect(`${baseUrl}/verify-success`, 302);

  } catch (err) {
    console.error("❌ [verify-email] Internal Error:", err);
    return new Response(
      JSON.stringify({
        code: "SERVER_ERROR",
        message: "Internal error while verifying email.",
      }),
      { status: 500 }
    );
  }
}
