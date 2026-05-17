/** @type {import('next').NextConfig} */
const gitCommitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
const nextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOYMENT_VERSION: gitCommitSha ? `deploy ${gitCommitSha.slice(0, 7)}` : 'local-dev',
  },
};

export default nextConfig;
