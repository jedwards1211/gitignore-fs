import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('nested repo with .git/info/exclude but $GIT_DIR set', {
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
  env: { GIT_DIR: '.git' },
  expectIncludes: [
    '.gitignore',
    'lib',
    'src/.gitignore',
    'src/test.js',
    'src/test.json',
    'src/subdir/test.js',
    'submodule/.gitignore',
    'submodule/index.txt',
    'submodule/myfile.txt',
  ],
})
