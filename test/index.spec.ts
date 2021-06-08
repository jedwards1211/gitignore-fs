/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env mocha */

import Gitignore from '../src/index'
import Path from 'path'
import { expect } from 'chai'
import { describe, it } from 'mocha'

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
