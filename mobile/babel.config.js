module.exports = function apiConfig(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      ["@babel/plugin-transform-class-properties", { loose: true }]
    ]
  };
};
