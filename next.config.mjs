/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    typedEnv: false,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    domains: [
      "res.cloudinary.com",
      "lh3.googleusercontent.com",
      "pagesandpeace.supabase.co", // Supabase public bucket
      "utfs.io", // Vercel Blob / UploadThing
      "imgs.search.brave.com", // If fallback URLs ever come from Brave CDN
    ],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pagesandpeace.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
