/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Support large manuscript uploads
    },
  },
  // Increase API body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
}

module.exports = nextConfig
