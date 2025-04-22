module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['module:@react-native/babel-preset', {
        unstable_transformImportMeta: true,  
      }],
    ],
    plugins: [
      '@babel/plugin-transform-class-static-block',
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.js', '.ts', '.tsx', '.json'],
        alias: {
          '@backend': './src/backend',
        },
      }],
    ],
  };
};
