import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('directory only exclusion', {
  files: {
    '.git': {
      HEAD: '',
    },
    '.gitignore': dedent`
      lib/
    `,
    lib: {
      foo: '',
      bar: {
        baz: '',
      },
    },
    src: {
      'test.js': '',
      lib: '',
    },
  },
  expectIncludes: ['.gitignore', 'src/test.js', 'src/lib'],
})
