/** @type {import('next').NextConfig} */
const nextConfig = {
  // MapLibre requires transpilation
  transpilePackages: ["maplibre-gl", "node-edge-tts"],
};

export default nextConfig;
