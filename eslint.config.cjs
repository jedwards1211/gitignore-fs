const { defineConfig } = require('eslint/config')
const globals = require('globals')

module.exports = defineConfig([
  ...require('@jcoreio/toolchain/eslintConfig.cjs'),
  {
    files: ['test/**'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
])
