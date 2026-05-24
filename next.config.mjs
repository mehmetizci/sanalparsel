/** @type {import('next').NextConfig} */
const nextConfig = {
  // MapLibre requires transpilation
  transpilePackages: ["maplibre-gl"],
};

export default nextConfig;
