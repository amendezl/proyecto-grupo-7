
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: '.next',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: [
      // Prefer a CloudFront domain if provided (NEXT_PUBLIC_FRONTEND_URL), otherwise
      // fall back to the S3 REST endpoint constructed from bucket + region.
      (process.env.NEXT_PUBLIC_FRONTEND_URL
        ? new URL(process.env.NEXT_PUBLIC_FRONTEND_URL).hostname
        : `${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com`)
    ]
  },
  env: {
    // Optional runtime override for frontend public URL (CloudFront)
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STAGE: process.env.NEXT_PUBLIC_STAGE || 'dev',
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
