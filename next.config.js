/** @type {import('next').NextConfig} */
const nextConfig = {
    // Prevent Next.js from trying to bundle native addons for server routes
    serverExternalPackages: ['bcrypt'],

    // In Next.js 16, if you have a webpack config, you should also acknowledge Turbopack
    // An empty object silences the "webpack config and no turbopack config" error
    turbopack: {
        resolveAlias: {
            bcrypt: 'bcryptjs',
        },
    },

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
