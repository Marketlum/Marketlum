import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@marketlum/shared', '@marketlum/ui', '@marketlum/plugin-nbp'],
  experimental: {
    optimizePackageImports: ['@marketlum/ui'],
  },
};

export default withNextIntl(nextConfig);
