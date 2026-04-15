/** @type {import('next').NextConfig} */
// next.config.mjs runs in Node.js, so we read the env var directly here.
// The canonical default ("http://localhost:8000") is kept in sync with
// src/lib/config.ts — change it in both places if you move the backend port.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig = {
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${API_URL}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
