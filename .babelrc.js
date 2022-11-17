module.exports = function (api) {
  api.cache.using(() => process.env.OUTPUT_ESM)
  const plugins = ['@babel/plugin-proposal-class-properties']
  const presets = [
    [
      '@babel/preset-env',
      api.env('es5')
        ? { forceAllTransforms: true }
        : {
            modules: process.env.OUTPUT_ESM ? false : undefined,
            targets: { node: '12' },
          },
    ],
    ['@babel/preset-typescript', { allowDeclareFields: true }],
  ]

  plugins.push('@babel/plugin-transform-runtime')
  if (api.env('coverage')) {
    plugins.push('babel-plugin-istanbul')
  }
  plugins.push('babel-plugin-add-module-exports')

  return { plugins, presets }
}
