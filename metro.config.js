const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();
  
  return {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      sourceExts: [...sourceExts, 'cjs', 'mjs', 'ts', 'tsx'],
      assetExts: [...assetExts, 'png', 'jpg', 'jpeg', 'gif'],
      extraNodeModules: {
        'crypto': require.resolve('react-native-crypto'),
        'stream': require.resolve('stream-browserify'),
        'buffer': require.resolve('buffer'),
        'http': require.resolve('stream-http'),
        'https': require.resolve('https-browserify'),
        'os': require.resolve('os-browserify/browser'),
        'path': require.resolve('path-browserify'),
        'fs': require.resolve('react-native-fs'),
      },
    },
  };
})();
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
// metro.config.js
