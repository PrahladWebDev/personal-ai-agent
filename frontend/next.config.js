/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Avoid an interactive ESLint setup prompt breaking non-interactive
  // Docker builds; lint separately in CI/local dev instead.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
