import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('core.excludesFile and initialRules', {
  files: {
    project: {
      '.git': {
        HEAD: '',
      },
      lib: {
        'test.js': '',
      },
      src: {
        'test.js': '',
      },
      'dwmm.js': '',
    },
    '.gitignore_global': dedent`
      !dwmm.js
    `,
  },
  initialRules: ['**/*.js'],
  coreExcludesFile: '/.gitignore_global',
  expectIncludes: [
    '/.gitignore_global',
    '/project/lib/',
    '/project/src/',
    '/project/dwmm.js',
  ],
  expectIgnoreFiles: [
    '/.gitignore_global',
    '/.git/info/exclude',
    '/.gitignore',
    '/project/.gitignore',
    '/project/.git/info/exclude',
    '/project/lib/.gitignore',
    '/project/src/.gitignore',
  ],
})
