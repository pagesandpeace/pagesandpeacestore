import Image from "next/image";
import Link from "next/link";

/* ------------------------------------------
   TYPES
------------------------------------------ */

type ShopHeroBlock = {
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
};

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

export default function ShopHero({
  block,
}: {
  block: ShopHeroBlock | null;
}) {
  if (!block) return null;

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden mb-10 shadow-lg">
      {block.image_url && (
        <Image
          src={block.image_url}
          alt={block.title}
          fill
          className="object-cover"
        />
      )}

      <div className="absolute inset-0 bg-black/40 flex flex-col justify-center px-10">
        <h2 className="text-4xl font-bold text-white drop-shadow mb-2">
          {block.title}
        </h2>

        {block.subtitle && (
          <p className="text-white/90 text-lg mb-4">
            {block.subtitle}
          </p>
        )}

        {block.cta_text && block.cta_link && (
          <Link
            href={block.cta_link}
            className="inline-block px-5 py-2 bg-white text-black rounded-lg font-semibold shadow"
          >
            {block.cta_text}
          </Link>
        )}
      </div>
    </div>
  );
}
