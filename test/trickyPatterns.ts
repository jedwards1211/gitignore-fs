import declareTest from './declareTest'
import dedent from 'dedent-js'

declareTest('tricky patterns - **[!te]', {
  files: {
    '.git': {
      HEAD: '',
    },
    'ten': '',
    '.gitignore': dedent`
      **[!te]
    `,
  },
  expectIncludes: [
    '.gitignore',
  ],
})
declareTest('tricky patterns - foo[/]bar', {
  files: {
    '.git': {
      HEAD: '',
    },
    foo: {
      bar: '',
    },
    '.gitignore': dedent`
      foo[/]bar
    `,
  },
  expectIncludes: [
    '.gitignore',
    'foo/bar'
  ],
})
declareTest('tricky patterns - \\??\\?b', {
  files: {
    '.git': {
      HEAD: '',
    },
    '?a?b': '',
    '.gitignore': dedent`
      \\??\\?b
    `,
  },
  expectIncludes: [
    '.gitignore',
  ],
})
declareTest('tricky patterns - \\a\\b\\c', {
  files: {
    '.git': {
      HEAD: '',
    },
    'abc': '',
    '.gitignore': dedent`
      \\a\\b\\c
    `,
  },
  expectIncludes: [
    '.gitignore',
  ],
})