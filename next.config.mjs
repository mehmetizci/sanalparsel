/** @type {import('next').NextConfig} */
const nextConfig = {
  // MapLibre requires transpilation
  transpilePackages: ["maplibre-gl"],
  
  // Handle edge-tts module
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Treat edge-tts as external for server bundle
      config.externals.push("edge-tts");
    }
    return config;
  },
};

export default nextConfig;
