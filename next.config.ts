import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
    qualities: [75, 85],
  },
  async redirects() {
    return [
      {
        source: '/hiring/instagram-expert',
        destination: '/hiring/social-media-manager',
        permanent: true,
      },
      {
        source: '/apply/instagram-expert',
        destination: '/apply/social-media-manager',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
