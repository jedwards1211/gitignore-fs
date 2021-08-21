import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('basic test', {
  files: {
    '.git': {
      HEAD: '',
    },
    '.gitignore': dedent`
      node_modules
      **/*.js
      !src/**/*.js
    `,
    node_modules: {
      foo: {
        'package.json': '',
      },
    },
    'test.js': '',
    src: {
      'test.js': '',
    },
  },
  expectIncludes: ['/src/test.js', '/.gitignore'],
  expectIgnoreFiles: ['/.gitignore', '/.git/info/exclude', '/src/.gitignore'],
})
