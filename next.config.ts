import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// The dev server only trusts "localhost" by default. Your phone will load the
// app using your laptop's Wi-Fi address instead (e.g. http://192.168.1.23:3000),
// so we look up this computer's own network addresses and allow those.
const localAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4")
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [...localAddresses, "*.local"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
