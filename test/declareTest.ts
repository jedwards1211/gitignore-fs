/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env mocha */

import Gitignore, { Fs, FsPromises, FsStats, Git } from '../src/index'
import Path from 'path'
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

function getAllEntries(files: Record<string, any>): string[] {
  const result: string[] = []
  function helper(dir: string, entries: Record<string, any>) {
    for (const key in entries) {
      const resolved = dir ? `${dir}/${key}` : key
      result.push(resolved)
      const value = entries[key]
      if (value instanceof Object) {
        helper(resolved, value)
      }
    }
  }
  helper('', files)
  return result.sort()
}

function addParentDirs(files: string[]): string[] {
  const result: string[] = [...files]
  for (const file of files) {
    let parent = Path.dirname(file)
    while (parent && parent !== '.' && parent !== '/') {
      result.push(parent)
      parent = Path.dirname(parent)
    }
  }
  return result
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

export default function declareTest(
  description: string,
  options: {
    files: Record<string, any>
    coreExcludesFile?: string
    env?: Record<string, string | undefined>
    expectIncludes: string[]
  }
): void {
  describe(description, () => {
    for (const clearCache of [true, false]) {
      const { files, coreExcludesFile, env } = options

      it(
        clearCache ? 'clearing cache every time' : 'not clearing cache',
        async () => {
          const gitignore = new Gitignore({
            fs: new TestFs(files),
            git: new TestGit({ coreExcludesFile }),
            env,
          })

          const actualSync = {}
          const actualAsync = {}

          for (const file of getAllEntries(files)) {
            if (clearCache) gitignore.clearCache()
            actualSync[file] = gitignore.ignoresSync(file)
          }
          gitignore.clearCache()
          for (const file of getAllEntries(files)) {
            if (clearCache) gitignore.clearCache()
            actualAsync[file] = await gitignore.ignores(file)
          }

          let expected = {}
          const allIncluded = new Set(addParentDirs(options.expectIncludes))
          expected = Object.fromEntries(
            getAllEntries(files).map((path) => [path, !allIncluded.has(path)])
          )

          expect(actualSync, 'ignoresSync results').to.deep.equal(expected)
          expect(actualAsync, 'ignores results').to.deep.equal(expected)
        }
      )
    }
  })
}
