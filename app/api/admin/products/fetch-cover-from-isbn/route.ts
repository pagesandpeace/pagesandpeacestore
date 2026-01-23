export const runtime = "nodejs";

import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

/* ------------------------------------------
   Fetch Gardners jacket → Cloudinary
------------------------------------------ */
async function fetchGardnersJacketToCloudinary(isbn13: string) {
  console.log("🟢 [FETCH ISBN COVER] isbn:", isbn13);

  const clean = isbn13.replace(/-/g, "");

  const candidates = [
    `https://jackets.dmmserver.com/media/640/${clean.slice(0, 8)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/640/${clean.slice(0, 7)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/640/${clean.slice(0, 6)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/356/${clean.slice(0, 8)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/356/${clean.slice(0, 7)}/${clean}.jpg`,
    `https://jackets.dmmserver.com/media/356/${clean.slice(0, 6)}/${clean}.jpg`,
  ];

  for (const url of candidates) {
    console.log("🟡 [FETCH ISBN COVER] trying:", url);

    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());

      const upload = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString("base64")}`,
        {
          folder: "products/books",
          public_id: `isbn_${clean}`,
          overwrite: false,
          resource_type: "image",
        }
      );

      if (upload?.secure_url) {
        console.log("🟢 [FETCH ISBN COVER] success:", upload.secure_url);
        return upload.secure_url;
      }
    } catch (err) {
      console.log("🔴 [FETCH ISBN COVER] error:", err);
    }
  }

  return null;
}

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🟢 [FETCH ISBN COVER] route hit");

  const { isbn } = await req.json();

  if (!isbn) {
    console.log("🔴 [FETCH ISBN COVER] missing ISBN");
    return NextResponse.json({ error: "ISBN required" }, { status: 400 });
  }

  const imageUrl = await fetchGardnersJacketToCloudinary(isbn);

  if (!imageUrl) {
    console.log("🔴 [FETCH ISBN COVER] no cover found");
    return NextResponse.json({ error: "No cover found" }, { status: 404 });
  }

  return NextResponse.json({ image_url: imageUrl });
}
