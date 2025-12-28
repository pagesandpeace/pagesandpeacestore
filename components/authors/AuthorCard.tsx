import Link from "next/link";
import Image from "next/image";

type AuthorCardProps = {
  author: {
    id: string;
    name: string;
    slug: string;
    short_bio?: string | null;
    profile_image_url?: string | null;
  };
};

export default function AuthorCard({ author }: AuthorCardProps) {
  return (
    <Link
      href={`/authors/${author.slug}`}
      className="group block border rounded-xl bg-white hover:shadow-sm transition p-4"
    >
      <div className="flex items-center gap-4">
        {/* IMAGE */}
        {author.profile_image_url ? (
          <Image
            src={author.profile_image_url}
            alt={author.name}
            width={56}
            height={56}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gray-200" />
        )}

        {/* TEXT */}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {author.name}
          </p>

          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {author.short_bio ??
              "Discover more books by this author."}
          </p>

          <span className="inline-block text-xs mt-2 text-[#189458] font-medium group-hover:underline">
            Discover more →
          </span>
        </div>
      </div>
    </Link>
  );
}
