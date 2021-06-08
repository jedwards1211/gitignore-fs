import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('nested .gitignore', {
  files: {
    '.git': {
      HEAD: '',
    },
    '.gitignore': dedent`
      node_modules
      **/*.js
      **/*.json
    `,
    node_modules: {
      foo: {
        'package.json': '',
      },
    },
    'test.js': '',
    src: {
      '.gitignore': dedent`
        !*.js
        !/*.json
        stuff/**/*.js
      `,
      'test.js': '',
      'test.json': '',
      stuff: {
        'index.js': '',
      },
      foo: {
        stuff: {
          'index.js': '',
        },
      },
      subdir: {
        'test.js': '',
        'test.json': '',
      },
    },
    lib: {
      'index.js': '',
    },
  },
  expectIncludes: [
    '.gitignore',
    'lib',
    'src/.gitignore',
    'src/test.js',
    'src/test.json',
    'src/stuff',
    'src/subdir/test.js',
    'src/foo/stuff/index.js',
  ],
})
