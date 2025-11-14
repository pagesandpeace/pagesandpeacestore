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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
