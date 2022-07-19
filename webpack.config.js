const path = require("path");

module.exports = {
  entry: "./src/bakery.js",
  mode: "production",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bakery.js",
    library: {
      name: "bakery",
      type: "umd",
    },
  },
  resolve: {
    fallback: {
      buffer: require.resolve("buffer/"),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
    },
  },
  module: {
    noParse: [/sjcl\.js$/],
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
