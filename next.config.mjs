/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/My-Meeting2Slides',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
