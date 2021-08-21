import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('core.excludesFile not found', {
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
  coreExcludesFile: '/.gitignore_global',
  expectIncludes: ['/src/test.js', '/.gitignore'],
  expectIgnoreFiles: [
    '/.gitignore_global',
    '/.git/info/exclude',
    '/.gitignore',
    '/src/.gitignore',
  ],
})
