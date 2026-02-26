/** @type {import('next').NextConfig} */
const nextConfig = {
    // Prevent Next.js from trying to bundle native addons for server routes
    serverExternalPackages: ['bcrypt'],

    webpack: (config) => {
        // Alias every require('bcrypt') → bcryptjs (pure JS, works on all platforms)
        config.resolve.alias = {
            ...config.resolve.alias,
            bcrypt: require.resolve('bcryptjs'),
        };
        return config;
    },
};

module.exports = nextConfig;
