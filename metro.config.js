const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    ...defaultConfig.resolver,
    unstable_enablePackageExports: true, // ✅ critical to make "exports" field work
    unstable_conditionNames: [
      'require',        // ✅ CJS
      'react-native',   // ✅ RN-specific
      'default'         // ✅ final fallback
    ],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs', 'mjs', 'ts', 'tsx'],
    assetExts: [...defaultConfig.resolver.assetExts, 'png', 'jpg', 'jpeg', 'gif'],
    extraNodeModules: {
      crypto: require.resolve('react-native-crypto'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      fs: require.resolve('react-native-fs'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
