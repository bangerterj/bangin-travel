/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Ensure sql.js is not bundled by webpack on the server
    experimental: {
        serverComponentsExternalPackages: ['sql.js'],
    },
    // Keep static files served alongside API
    async rewrites() {
        return [
            {
                source: '/',
                destination: '/index.html',
            },
        ];
    },
    // Webpack configuration for sql.js
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;
