module.exports = {
  presets: ['module:@react-native/babel-preset'],
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
