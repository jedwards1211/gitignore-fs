import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('core.excludesFile', {
  files: {
    project: {
      '.git': {
        HEAD: '',
      },
      '.gitignore': dedent`
        **/*.js
        !src/**/*.js
        !node_modules/foo
        !*.txt
      `,
      node_modules: {
        foo: {
          'package.json': '',
        },
      },
      'test.js': '',
      'test.txt': '',
      src: {
        'test.js': '',
      },
    },
    '.gitignore_global': dedent`
      node_modules
      *.txt
    `,
  },
  coreExcludesFile: '.gitignore_global',
  expectIncludes: [
    'project/src/test.js',
    'project/test.txt',
    'project/.gitignore',
    '.gitignore_global',
  ],
})
