import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('gitignore and final rules', {
  files: {
    '.git': {
      HEAD: '',
    },
    lib: {
      'test.js': '',
    },
    src: {
      'test.js': '',
    },
    '.DS_Store': '',
    '.gitignore': dedent`
      .DS_Store
      **/*.js
    `,
  },
  finalRules: ['!.DS_Store', '!src/**/*.js'],
  expectIncludes: ['.DS_Store', '.gitignore', 'lib/', 'src/test.js'],
})
