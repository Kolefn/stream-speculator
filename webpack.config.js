const path = require('path');

const isDev = process.env.NODE_ENV === 'dev';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/client/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    // fallback: {
    //   buffer: false,
    //   url: false,
    //   fs: false,
    //   path: false,
    //   crypto: false,
    //   stream: false,
    //   querystring: false,
    //   zlib: false,
    //   util: false,
    //   http: false,
    //   string_decoder: false,
    //   net: false,
    // },
  },
  output: {
    filename: 'client.bundle.js',
    path: path.resolve(__dirname, 'src/public'),
  },
  devtool: 'inline-source-map',
};
