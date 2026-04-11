import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      allowedOrigins: ["vomni.io", "www.vomni.io", "localhost:3000", "localhost:3001", "vomni-app-git-booking-platform-wesleyagents-projects.vercel.app"],
    },
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes except the embeddable widget
        source: "/((?!widget).*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",         value: "DENY" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "geolocation=(), microphone=(), camera=()" },
          { key: "X-DNS-Prefetch-Control",   value: "on" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
