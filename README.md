# gitignore-fs

[![CircleCI](https://circleci.com/gh/jedwards1211/gitignore-fs.svg?style=svg)](https://circleci.com/gh/jedwards1211/gitignore-fs)
[![Coverage Status](https://codecov.io/gh/jedwards1211/gitignore-fs/branch/master/graph/badge.svg)](https://codecov.io/gh/jedwards1211/gitignore-fs)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/gitignore-fs.svg)](https://badge.fury.io/js/gitignore-fs)

Determine if any file is gitignored. This is intended to be a complete implementation of the gitignore spec, including `$GIT_DIR`, `$GIT_DIR/info/excludes`, and the `core.excludesFile` configuration variable.

**Requires Node >= 8.**

# Getting started

```
npm install --save gitignore-fs
```

```js
const Gitignore = require('gitignore-fs')

const gitignore = new Gitignore()

console.log(gitignore.ignoresSync('node_modules')) // true or false depending on your config
```

# API

## `class Gitignore`

Each instance of this class keeps a separate cache of gitignore rules.

### `new Gitignore([options])`

Creates a new Gitignore instance.

#### `options.initialRules` (`string[]`, _optional_)

These rules will be applied at lowest precedence (lower than rules from `core.excludesFile`).
Paths with a slash in the beginning or middle are relative to the closest enclosing git directory.

#### `options.finalRules` (`string[]`, _optional_)

These rules will be applied at highest precedence (higher than `.gitignore` files).
Paths with a slash in the beginning or middle are relative to the closest enclosing git directory.

### `.ignores(path)`

Determines if the given `path` is gitignored asynchronously.

#### `path` (`string`, **required**)

The path to test. **Must end with / if it is a directory!**

#### Returns (`Promise<boolean>`)

A promise that will resolve to `true` if `path` is gitignored, `false` otherwise

### `.ignoresSync(path)`

Determines if the given `path` is gitignored synchronously.

#### `path` (`string`, **required**)

The path to test. **Must end with / if it is a directory!**

#### Returns (`boolean`)

`true` if `path` is gitignored, `false` otherwise

### `.clearCache()`

Clears the entire gitignore rule cache.
