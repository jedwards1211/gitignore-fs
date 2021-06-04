# gitignore-fs

[![CircleCI](https://circleci.com/gh/jedwards1211/gitignore-fs.svg?style=svg)](https://circleci.com/gh/jedwards1211/gitignore-fs)
[![Coverage Status](https://codecov.io/gh/jedwards1211/gitignore-fs/branch/master/graph/badge.svg)](https://codecov.io/gh/jedwards1211/gitignore-fs)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/gitignore-fs.svg)](https://badge.fury.io/js/gitignore-fs)

Determine if any file is gitignored. This is intended to be a complete implementation of the gitignore spec, including `$GIT_DIR`, `$GIT_DIR/info/excludes`, and the `core.excludesFile` configuration variable.

# Getting started

```
npm install --save gitignore-fs
```

```js
const Gitignore = require('gitignore-fs')

const gitignore = new Gitignore()

console.log(gitignore.ignores('node_modules')) // true or false depending on your config
```

# API

## `class Gitignore`

Each instance of this class keeps a separate cache of gitignore rules.

### `.ignores(path, [stats])`

Determines if the given `path` is gitignored. This method may do sync fs operations, right now there is no async method.

#### `path` (`string`, **required**)

The path to test

#### `stats` (`fs.Stats`, _optional_)

The stats for `path`. Pass them if you already have them to speed things up.

#### Returns (`boolean`)

`true` if `path` is gitignored, `false` otherwise
