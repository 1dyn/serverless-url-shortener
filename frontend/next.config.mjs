/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  async rewrites() {
    return [
      // 단축 URL → API Gateway redirect Lambda로 전달
      {
        source: "/:shortId",
        destination: "https://api.linkive.cloud/:shortId",
      },
    ];
  },
};

export default nextConfig;