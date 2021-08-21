import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('nested repo with .git/info/exclude', {
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
      subdir: {
        'test.js': '',
        'test.json': '',
      },
    },
    lib: {
      'index.js': '',
    },
    submodule: {
      '.git': {
        HEAD: '',
        info: {
          exclude: dedent`
            myfile.txt
          `,
        },
      },
      '.gitignore': dedent`
        **/*.js
      `,
      'myfile.txt': '',
      'index.txt': '',
      node_modules: {
        foo: {
          'package.json': '',
          'index.js': '',
        },
      },
    },
  },
  expectIncludes: [
    '/.gitignore',
    '/lib/',
    '/src/.gitignore',
    '/src/test.js',
    '/src/test.json',
    '/src/subdir/test.js',
    '/submodule/.gitignore',
    '/submodule/index.txt',
    '/submodule/node_modules/foo/package.json',
  ],
  expectIgnoreFiles: [
    '/.gitignore',
    '/.git/info/exclude',
    '/lib/.gitignore',
    '/src/.gitignore',
    '/src/subdir/.gitignore',
    '/submodule/.gitignore',
    '/submodule/.git/info/exclude',
    '/submodule/node_modules/.gitignore',
    '/submodule/node_modules/foo/.gitignore',
  ],
})
