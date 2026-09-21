import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
    domains: [
      // Social Media Platforms
      "scontent.cdninstagram.com",
      "instagram.com",
      "www.instagram.com",
      "cdninstagram.com",
      "scontent-*.cdninstagram.com",
      "p16-sign-sg.tiktokcdn.com",
      "p16-sign.tiktokcdn-us.com",
      "p77-sign.tiktokcdn-us.com",
      "tiktokcdn.com",
      "www.tiktok.com",
      "scontent.facebook.com",
      "scontent.*.fna.fbcdn.net",
      "scontent-*.fna.fbcdn.net",
      "external.*.fna.fbcdn.net",
      "graph.facebook.com",
      "www.facebook.com",
      "facebook.com",
      "fbcdn.net",
      "pbs.twimg.com",
      "abs.twimg.com",
      "twitter.com",
      "x.com",
      
      // Image Hosting Services
      "images.unsplash.com",
      "upload.wikimedia.org",
      "i.imgur.com",
      "imgur.com",
      "cdn.shopify.com",
      "images.pexels.com",
      "firebasestorage.googleapis.com",
      "storage.googleapis.com",
      "drive.google.com",
      "lh3.googleusercontent.com",
      "cdn.pixabay.com",
      "images.squarespace-cdn.com",
      
      // News & Media
      "hips.hearstapps.com",
      "static01.nyt.com",
      "media.cnn.com",
      "cdn.cnn.com",
      
      // General CDNs
      "cloudinary.com",
      "res.cloudinary.com",
      "cloudflare.com",
      "cdnjs.cloudflare.com",
      "amazonaws.com",
      "s3.amazonaws.com",
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24 hours
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',
    unoptimized: false,
    loader: 'default',
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "react-hot-toast", "zustand"],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  reactStrictMode: true,
};

export default nextConfig;
