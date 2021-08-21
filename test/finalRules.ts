import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('finalRules', {
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
        '.gitignore': dedent`
          *.js
          dwmm.js
        `,
        subdir: {
          'dwmm.js': '',
          'stuff.txt': '',
        },
      },
      '.DS_Store': '',
      'stuff.txt': '',
      '.gitignore': dedent`
        **/*.js
      `,
    },
    '.gitignore_global': dedent`
      .DS_Store
      stuff.txt
    `,
  },
  finalRules: ['!.DS_Store', '!dwmm.js'],
  coreExcludesFile: '/.gitignore_global',
  expectIncludes: [
    '/.gitignore_global',
    '/project/.DS_Store',
    '/project/.gitignore',
    '/project/lib/',
    '/project/src/',
    '/project/src/.gitignore',
    '/project/src/subdir/dwmm.js',
  ],
  expectIgnoreFiles: [
    '/.gitignore_global',
    '/.gitignore',
    '/.git/info/exclude',
    '/project/.gitignore',
    '/project/.git/info/exclude',
    '/project/lib/.gitignore',
    '/project/src/.gitignore',
    '/project/src/subdir/.gitignore',
  ],
})
