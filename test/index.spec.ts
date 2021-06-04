/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env mocha */

import Gitignore, { Fs, FsPromises, FsStats, Git } from '../src/index'
import Path from 'path'
import dedent from 'dedent-js'
import { expect } from 'chai'
import { describe, it } from 'mocha'

class TestFs implements Fs, FsPromises {
  entries: Record<string, any>

  constructor(entries: Record<string, any>) {
    this.entries = entries
  }

  getEntry(path: string): string | Record<string, any> | void {
    path = Path.relative(process.cwd(), Path.resolve(path))
    const parent = Path.dirname(path)
    if (parent && parent !== path && parent !== '.') {
      const parentEntry = this.getEntry(parent)
      return parentEntry instanceof Object
        ? parentEntry[Path.basename(path)]
        : undefined
    }
    return this.entries[path]
  }

  statSync(path: string): FsStats {
    const entry = this.getEntry(path)
    if (entry == null)
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    return {
      isFile: () => typeof entry === 'string',
      isDirectory: () => typeof entry !== 'string',
    }
  }

  async stat(path: string): Promise<FsStats> {
    return this.statSync(path)
  }

  readFileSync(path: string): string {
    const entry = this.getEntry(path)
    if (entry == null)
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    if (typeof entry !== 'string')
      throw new Error(`EISDIR: illegal operation on a directory, read`)
    return entry
  }

  async readFile(path: string): Promise<string> {
    return this.readFileSync(path)
  }
}

class TestGit implements Git {
  coreExcludesFile: string | undefined

  constructor({ coreExcludesFile }: { coreExcludesFile?: string } = {}) {
    this.coreExcludesFile = coreExcludesFile
  }

  async getCoreExcludesFile(): Promise<string | undefined> {
    return this.coreExcludesFile
  }
  getCoreExcludesFileSync(): string | undefined {
    return this.coreExcludesFile
  }
}

for (const clearCache of [true, false]) {
  const expectIncludes = async (gitignore: Gitignore, paths: string[]) => {
    for (const path of paths) {
      if (clearCache) gitignore.clearCache()
      expect(gitignore.ignoresSync(path), `expected ${path} not to be ignored`)
        .to.be.false
      if (clearCache) gitignore.clearCache()
      expect(
        await gitignore.ignores(path),
        `expected ${path} not to be ignored`
      ).to.be.false
    }
  }

  const expectIgnores = async (gitignore: Gitignore, paths: string[]) => {
    for (const path of paths) {
      if (clearCache) gitignore.clearCache()
      expect(gitignore.ignoresSync(path), `expected ${path} to be ignored`).to
        .be.true
      if (clearCache) gitignore.clearCache()
      expect(await gitignore.ignores(path), `expected ${path} to be ignored`).to
        .be.true
    }
  }

  describe(
    clearCache ? 'clearing cache every time' : 'not clearing cache',
    () => {
      it('basic test', async () => {
        const gitignore = new Gitignore({
          fs: new TestFs({
            '.git': {
              HEAD: dedent`
          ref: refs/heads/master
        `,
            },
            '.gitignore': dedent`
          node_modules
          **/*.js
          !src/**/*.js
        `,
            node_modules: {
              foo: {
                'package.json': dedent`
              {
                "name": "foo",
                "version": "0.0.0"
              }
            `,
              },
            },
            'test.js': dedent`
          console.log('test')
        `,
            src: {
              'test.js': dedent`
            console.log('test')
          `,
            },
          }),
          git: new TestGit(),
        })
        await expectIgnores(gitignore, [
          'test.js',
          'node_modules',
          'node_modules/foo',
          'node_modules/foo/package.json',
        ])
        await expectIncludes(gitignore, ['src/test.js'])
      })
      it('core.excludesFile', async () => {
        const gitignore = new Gitignore({
          fs: new TestFs({
            project: {
              '.git': {
                HEAD: 'ref: refs/heads/master',
              },
              '.gitignore': dedent`
            **/*.js
            !src/**/*.js
            !node_modules/foo
            !*.txt
          `,
              node_modules: {
                foo: {
                  'package.json': dedent`
                {
                  "name": "foo",
                  "version": "0.0.0"
                }
              `,
                },
              },
              'test.js': dedent`
            console.log('test')
          `,
              'test.txt': '',
              src: {
                'test.js': dedent`
              console.log('test')
            `,
              },
            },
            '.gitignore_global': dedent`
          node_modules
          *.txt
        `,
          }),
          git: new TestGit({ coreExcludesFile: '.gitignore_global' }),
        })
        await expectIgnores(gitignore, [
          'project/test.js',
          'project/node_modules',
          'project/node_modules/foo',
          'project/node_modules/foo/package.json',
        ])
        await expectIncludes(gitignore, [
          'project/src/test.js',
          'project/test.txt',
        ])
      })
      it(`nested .gitignore`, async function () {
        const gitignore = new Gitignore({
          fs: new TestFs({
            '.git': {
              HEAD: `ref: refs/heads/master`,
            },
            '.gitignore': dedent`
          node_modules
          **/*.js
          **/*.json
        `,
            node_modules: {
              foo: {
                'package.json': dedent`
              {
                "name": "foo",
                "version": "0.0.0"
              }
            `,
              },
            },
            'test.js': dedent`
          console.log('test')
        `,
            src: {
              '.gitignore': dedent`
            !*.js
            !/*.json
            stuff/**/*.js
          `,
              'test.js': `console.log('test')`,
              'test.json': '{}',
              stuff: {
                'index.js': '',
              },
              foo: {
                stuff: {
                  'index.js': '',
                },
              },
              subdir: {
                'test.js': `console.log('test')`,
                'test.json': '{}',
              },
            },
            lib: {
              'index.js': `console.log('test')`,
            },
          }),
          git: new TestGit(),
        })
        await expectIgnores(gitignore, [
          'test.js',
          'lib/index.js',
          'src/subdir/test.json',
          'src/stuff/index.js',
          'node_modules',
          'node_modules/foo',
          'node_modules/foo/package.json',
        ])
        await expectIncludes(gitignore, [
          'src/test.js',
          'src/test.json',
          'src/subdir/test.js',
          'src/foo/stuff/index.js',
        ])
      })
      it(`nested repo with .git/info/exclude`, async function () {
        const gitignore = new Gitignore({
          fs: new TestFs({
            '.git': {
              HEAD: `ref: refs/heads/master`,
            },
            '.gitignore': dedent`
          node_modules
          **/*.js
          **/*.json
        `,
            node_modules: {
              foo: {
                'package.json': dedent`
              {
                "name": "foo",
                "version": "0.0.0"
              }
            `,
              },
            },
            'test.js': dedent`
          console.log('test')
        `,
            src: {
              '.gitignore': dedent`
            !*.js
            !/*.json
          `,
              'test.js': `console.log('test')`,
              'test.json': '{}',
              subdir: {
                'test.js': `console.log('test')`,
                'test.json': '{}',
              },
            },
            lib: {
              'index.js': `console.log('test')`,
            },
            submodule: {
              '.git': {
                HEAD: `ref: refs/heads/master`,
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
                  'package.json': dedent`
                {
                  "name": "foo",
                  "version": "0.0.0"
                }
              `,
                  'index.js': '',
                },
              },
            },
          }),
          git: new TestGit(),
        })
        await expectIgnores(gitignore, [
          'test.js',
          'lib/index.js',
          'src/subdir/test.json',
          'node_modules',
          'node_modules/foo',
          'node_modules/foo/package.json',
          'submodule/node_modules/foo/index.js',
          'submodule/myfile.txt',
        ])
        await expectIncludes(gitignore, [
          'src/test.js',
          'src/test.json',
          'src/subdir/test.js',
          'submodule/index.txt',
          'submodule/node_modules/foo/package.json',
        ])
      })
      it(`nested repo with .git/info/exclude but $GIT_DIR set`, async function () {
        const gitignore = new Gitignore({
          fs: new TestFs({
            '.git': {
              HEAD: `ref: refs/heads/master`,
            },
            '.gitignore': dedent`
          node_modules
          **/*.js
          **/*.json
        `,
            node_modules: {
              foo: {
                'package.json': dedent`
              {
                "name": "foo",
                "version": "0.0.0"
              }
            `,
              },
            },
            'test.js': dedent`
          console.log('test')
        `,
            src: {
              '.gitignore': dedent`
            !*.js
            !/*.json
          `,
              'test.js': `console.log('test')`,
              'test.json': '{}',
              subdir: {
                'test.js': `console.log('test')`,
                'test.json': '{}',
              },
            },
            lib: {
              'index.js': `console.log('test')`,
            },
            submodule: {
              '.git': {
                HEAD: `ref: refs/heads/master`,
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
                  'package.json': dedent`
                {
                  "name": "foo",
                  "version": "0.0.0"
                }
              `,
                  'index.js': '',
                },
              },
            },
          }),
          git: new TestGit(),
          env: { GIT_DIR: '.git' },
        })
        await expectIgnores(gitignore, [
          'test.js',
          'lib/index.js',
          'src/subdir/test.json',
          'node_modules',
          'node_modules/foo',
          'node_modules/foo/package.json',
          'submodule/node_modules/foo/package.json',
          'submodule/node_modules/foo/index.js',
        ])
        await expectIncludes(gitignore, [
          'src/test.js',
          'src/test.json',
          'src/subdir/test.js',
          'submodule/index.txt',
          'submodule/myfile.txt',
        ])
      })
      it(`integration test`, async function () {
        const gitignore = new Gitignore()
        await expectIgnores(
          gitignore,
          [
            'node_modules',
            'node_modules/ignore',
            'node_modules/ignore/package.json',
            'index.js',
            'index.d.ts',
          ].map((path) => Path.resolve(__dirname, '..', path))
        )
        await expectIncludes(
          gitignore,
          ['src/index.ts', 'package.json', '.gitignore'].map((path) =>
            Path.resolve(__dirname, '..', path)
          )
        )
      })
    }
  )
}
