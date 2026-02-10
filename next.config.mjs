/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  allowedDevOrigins: ['*'],
};

export default nextConfig;
