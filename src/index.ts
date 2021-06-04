import createIgnore, { Ignore } from 'ignore'
import fs from 'fs'
import { promisify } from 'util'
import Path from 'path'
import { spawnSync } from 'child_process'
import { spawn } from 'promisify-child-process'

export interface FsStats {
  isFile(): boolean
  isDirectory(): boolean
}

export interface Fs {
  stat(path: string): Promise<FsStats>
  readFile(
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: string | { encoding?: string; flag?: string; signal?: any }
  ): Promise<string>
  statSync(path: string): FsStats
  readFileSync(
    path: string,
    options?: string | { encoding?: string; flag?: string }
  ): string
}

const defaultFs: Fs = {
  stat: promisify(fs.stat),
  statSync: fs.statSync,
  readFile: promisify(fs.readFile),
  readFileSync: fs.readFileSync,
}

export interface FsPromises {
  stat(path: string): Promise<FsStats>
  readFile(
    path: string,
    options?: string | { encoding?: string; flag?: string }
  ): Promise<string>
}

export interface Git {
  getCoreExcludesFile(options: { cwd: string }): Promise<string | undefined>
  getCoreExcludesFileSync(options: { cwd: string }): string | undefined
}

const defaultGit: Git = {
  async getCoreExcludesFile({
    cwd,
  }: {
    cwd: string
  }): Promise<string | undefined> {
    try {
      const { stdout } = await spawn(
        'git',
        ['config', '--get', 'core.excludesFile'],
        {
          cwd,
          maxBuffer: 1024 * 1024,
        }
      )
      return stdout?.toString()?.trim()
    } catch (error) {
      return undefined
    }
  },
  getCoreExcludesFileSync({ cwd }: { cwd: string }) {
    try {
      return spawnSync('git', ['config', '--get', 'core.excludesFile'], {
        cwd,
        maxBuffer: 1024 * 1024,
      })
        .stdout?.toString()
        ?.trim()
    } catch (error) {
      return undefined
    }
  },
}

class DirectoryEntry {
  ignore: Ignore
  rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
    this.ignore = createIgnore()
  }

  ignores(path: string): boolean {
    return (
      path !== this.rootDir &&
      this.ignore.ignores(Path.relative(this.rootDir, path))
    )
  }
}

function prefixGitignoreRules(
  rules: string[],
  rulesDir: string,
  rootDir: string
): string[] {
  const prefix = Path.relative(rootDir, rulesDir).replace(/\\/g, '/')
  return rules.map(function prefixRule(rule: string): string {
    if (rule.startsWith('#') || !/\S/.test(rule)) return rule
    if (rule.startsWith('!')) return '!' + prefixRule(rule.substring(1))
    return /\/\S/.test(rule)
      ? `${prefix}/${rule.replace(/^\//, '')}`
      : `${prefix}/**/${rule}`
  })
}

export default class Gitignore {
  fs: Fs
  git: Git
  env: Record<string, string | undefined>
  directories: Record<string, DirectoryEntry> = {}
  directoriesAsync: Record<string, Promise<DirectoryEntry>> = {}

  constructor({
    fs = defaultFs,
    git = defaultGit,
    env = process.env,
  }: {
    fs?: Fs
    fsPromises?: FsPromises
    git?: Git
    env?: Record<string, string | undefined>
  } = {}) {
    this.fs = fs
    this.git = git
    this.env = env
  }

  clearCache(): void {
    this.directories = {}
    this.directoriesAsync = {}
  }

  async ignores(path: string, stats?: FsStats): Promise<boolean> {
    path = Path.resolve(path)
    if (!stats) {
      try {
        stats = await this.fs.stat(path)
      } catch (error) {
        // ignore
      }
    }
    const dirEntry = await this.getDirectoryEntry(
      stats?.isDirectory() ? Path.dirname(path) : path
    )
    return dirEntry.ignores(path)
  }

  ignoresSync(path: string, stats?: FsStats): boolean {
    path = Path.resolve(path)
    if (!stats) {
      try {
        stats = this.fs.statSync(path)
      } catch (error) {
        // ignore
      }
    }
    const dirEntry = this.getDirectoryEntrySync(
      stats?.isDirectory() ? Path.dirname(path) : path
    )
    return dirEntry.ignores(path)
  }

  private getDirectoryEntrySync(dir: string): DirectoryEntry {
    let cached = this.directories[dir]
    if (!cached) {
      cached = this.createDirectoryEntrySync(dir)
      this.directories[dir] = cached
      this.directoriesAsync[dir] = Promise.resolve(cached)
    }
    return cached
  }

  private async getDirectoryEntry(dir: string): Promise<DirectoryEntry> {
    let cached = this.directoriesAsync[dir]
    if (!cached) {
      cached = this.createDirectoryEntry(dir)
      this.directoriesAsync[dir] = cached
      cached.then((entry) => (this.directories[dir] = entry))
    }
    return cached
  }

  private createDirectoryEntrySync(dir: string): DirectoryEntry {
    if (this.isRoot(dir) || this.isGitRootSync(dir)) {
      return this.createRootDirectoryEntrySync(dir)
    }
    const gitignore = Path.join(dir, '.gitignore')
    if (this.isFileSync(gitignore)) {
      const parentEntry = this.getDirectoryEntrySync(Path.dirname(dir))
      const { rootDir } = parentEntry
      const entry = new DirectoryEntry(rootDir)
      entry.ignore.add(parentEntry.ignore)
      const gitignoreRules = this.parseGitignoreSync(gitignore)
      entry.ignore.add(prefixGitignoreRules(gitignoreRules, dir, rootDir))
      return entry
    } else {
      return this.getDirectoryEntrySync(Path.dirname(dir))
    }
  }

  private async createDirectoryEntry(dir: string): Promise<DirectoryEntry> {
    if (this.isRoot(dir) || (await this.isGitRoot(dir))) {
      return await this.createRootDirectoryEntry(dir)
    }
    const gitignore = Path.join(dir, '.gitignore')
    if (await this.isFile(gitignore)) {
      const parentEntry = await this.getDirectoryEntry(Path.dirname(dir))
      const { rootDir } = parentEntry
      const entry = new DirectoryEntry(rootDir)
      entry.ignore.add(parentEntry.ignore)
      const gitignoreRules = await this.parseGitignore(gitignore)
      entry.ignore.add(prefixGitignoreRules(gitignoreRules, dir, rootDir))
      return entry
    } else {
      return await this.getDirectoryEntry(Path.dirname(dir))
    }
  }

  private getGitDir(): string | undefined {
    const { GIT_DIR } = this.env
    return GIT_DIR ? Path.resolve(GIT_DIR) : undefined
  }

  private createRootDirectoryEntrySync(dir: string): DirectoryEntry {
    const entry = new DirectoryEntry(dir)
    const addGitignoreRules = (file: string) => {
      let rules
      try {
        rules = this.parseGitignoreSync(file)
      } catch (error) {
        return
      }
      entry.ignore.add(rules)
    }
    const coreExcludesFile = this.git.getCoreExcludesFileSync({ cwd: dir })
    if (coreExcludesFile) addGitignoreRules(coreExcludesFile)
    const GIT_DIR = this.getGitDir()
    if (GIT_DIR && dir === Path.dirname(GIT_DIR)) {
      addGitignoreRules(Path.join(GIT_DIR, 'info', 'exclude'))
    } else {
      addGitignoreRules(Path.join(dir, '.git', 'info', 'exclude'))
    }
    addGitignoreRules(Path.join(dir, '.gitignore'))
    return entry
  }

  private async createRootDirectoryEntry(dir: string): Promise<DirectoryEntry> {
    const entry = new DirectoryEntry(dir)
    const addGitignoreRules = async (file: string): Promise<void> => {
      let rules
      try {
        rules = await this.parseGitignore(file)
      } catch (error) {
        return
      }
      entry.ignore.add(rules)
    }
    const coreExcludesFile = await this.git.getCoreExcludesFile({ cwd: dir })
    if (coreExcludesFile) await addGitignoreRules(coreExcludesFile)
    const GIT_DIR = this.getGitDir()
    if (GIT_DIR && dir === Path.dirname(GIT_DIR)) {
      await addGitignoreRules(Path.join(GIT_DIR, 'info', 'exclude'))
    } else {
      await addGitignoreRules(Path.join(dir, '.git', 'info', 'exclude'))
    }
    await addGitignoreRules(Path.join(dir, '.gitignore'))
    return entry
  }

  private parseGitignoreSync(path: string): string[] {
    return this.fs.readFileSync(path, 'utf8').split(/\r\n?|\n/gm)
  }

  private async parseGitignore(path: string): Promise<string[]> {
    return (await this.fs.readFile(path, 'utf8')).split(/\r\n?|\n/gm)
  }

  private isFileSync(path: string): boolean {
    try {
      const stats = this.fs.statSync(path)
      return stats.isFile()
    } catch (error) {
      return false
    }
  }
  private async isFile(path: string): Promise<boolean> {
    try {
      const stats = await this.fs.stat(path)
      return stats.isFile()
    } catch (error) {
      return false
    }
  }

  private isDirectorySync(path: string): boolean {
    try {
      const stats = this.fs.statSync(path)
      return stats.isDirectory()
    } catch (error) {
      return false
    }
  }

  private async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await this.fs.stat(path)
      return stats.isDirectory()
    } catch (error) {
      return false
    }
  }

  private isRoot(dir: string): boolean {
    return dir === Path.parse(dir).root
  }

  private isGitRootSync(dir: string): boolean {
    const GIT_DIR = this.getGitDir()
    return GIT_DIR
      ? dir === Path.dirname(GIT_DIR)
      : this.isDirectorySync(Path.join(dir, '.git'))
  }

  private async isGitRoot(dir: string): Promise<boolean> {
    const GIT_DIR = this.getGitDir()
    return GIT_DIR
      ? dir === Path.dirname(GIT_DIR)
      : await this.isDirectory(Path.join(dir, '.git'))
  }
}
