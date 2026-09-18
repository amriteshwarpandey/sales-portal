import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = process.env.API_URL || 'http://localhost:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image.
  output: 'standalone',
  // Pin the workspace root to this folder (a stray lockfile higher up confuses detection).
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  // Proxy API calls to the Express server so the auth cookie is first-party.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
