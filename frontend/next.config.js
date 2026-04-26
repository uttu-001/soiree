/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API calls to FastAPI backend in development.
  // /api/v1/... in the browser → http://localhost:8000/api/v1/... on the server.
  // This avoids CORS issues during local development.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
