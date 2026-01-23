export const runtime = "nodejs";

import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

/* ------------------------------------------
   Helper: fetch Gardners jacket → Cloudinary
------------------------------------------ */
async function fetchGardnersJacketToCloudinary(isbn13: string) {
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
        return upload.secure_url;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function POST(req: Request) {
  const { isbn } = await req.json();

  if (!isbn) {
    return NextResponse.json(
      { error: "ISBN required" },
      { status: 400 }
    );
  }

  const url = await fetchGardnersJacketToCloudinary(isbn);

  if (!url) {
    return NextResponse.json(
      { error: "No cover found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ image_url: url });
}
