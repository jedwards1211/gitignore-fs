import createIgnore, { Ignore } from 'ignore'
import fs from 'fs'
import { promisify } from 'util'
import Path from 'path'
import { spawnSync } from 'child_process'
import { spawn } from 'promisify-child-process'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'

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

function normalizeInputPath(path: string): string {
  const result = Path.normalize(Path.resolve(path))
  return path.endsWith('/') ? result + '/' : result
}

function relativePath(from: string, to: string): string {
  return to.endsWith('/')
    ? Path.relative(from, to) + '/'
    : Path.relative(from, to)
}

class DirectoryEntry {
  ignore: Ignore
  rootDir: string
  loadedRules: string[] = []

  constructor(rootDir: string) {
    this.rootDir = rootDir
    this.ignore = createIgnore()
  }

  ignores(path: string): boolean {
    return (
      path !== this.rootDir &&
      this.ignore.ignores(relativePath(this.rootDir, path))
    )
  }

  add(
    rules: DirectoryEntry | string[],
    options?: { addToLoadedRules?: boolean }
  ): void {
    if (rules instanceof DirectoryEntry) {
      this.add(rules.loadedRules, options)
    } else {
      if (options?.addToLoadedRules !== false)
        for (const rule of rules) this.loadedRules.push(rule)
      this.ignore.add(rules)
    }
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

export interface GitignoreEvents {
  ignoreFile: (file: string) => void
}

export default class Gitignore extends (EventEmitter as new () => TypedEmitter<GitignoreEvents>) {
  private fs: Fs
  private git: Git
  private env: Record<string, string | undefined>
  private directories: Map<string, DirectoryEntry> = new Map()
  private directoriesAsync: Map<string, Promise<DirectoryEntry>> = new Map()
  private initialRules: string[] | undefined
  private finalRules: string[] | undefined
  private ignoreFiles: Set<string> = new Set()

  constructor({
    fs = defaultFs,
    git = defaultGit,
    env = process.env,
    initialRules,
    finalRules,
  }: {
    fs?: Fs
    fsPromises?: FsPromises
    git?: Git
    env?: Record<string, string | undefined>
    initialRules?: string[]
    finalRules?: string[]
  } = {}) {
    super()
    this.fs = fs
    this.git = git
    this.env = env
    this.initialRules = initialRules
    this.finalRules = finalRules
  }

  clearCache(): void {
    this.directories.clear()
    this.directoriesAsync.clear()
    this.ignoreFiles.clear()
  }

  async ignores(path: string): Promise<boolean> {
    path = normalizeInputPath(path)
    const dirEntry = await this.getDirectoryEntry(
      path.endsWith('/') ? Path.dirname(path) : path
    )
    return dirEntry.ignores(path)
  }

  ignoresSync(path: string): boolean {
    path = normalizeInputPath(path)
    const dirEntry = this.getDirectoryEntrySync(
      path.endsWith('/') ? Path.dirname(path) : path
    )
    return dirEntry.ignores(path)
  }

  private getDirectoryEntrySync(dir: string): DirectoryEntry {
    let cached = this.directories.get(dir)
    if (!cached) {
      cached = this.createDirectoryEntrySync(dir)
      this.directories.set(dir, cached)
      this.directoriesAsync.set(dir, Promise.resolve(cached))
    }
    return cached
  }

  private async getDirectoryEntry(dir: string): Promise<DirectoryEntry> {
    let cached = this.directoriesAsync.get(dir)
    if (!cached) {
      cached = this.createDirectoryEntry(dir)
      this.directoriesAsync.set(dir, cached)
      cached.then((entry) => this.directories.set(dir, entry))
    }
    return cached
  }

  private createDirectoryEntrySync(dir: string): DirectoryEntry {
    if (this.isRoot(dir) || this.isGitRootSync(dir)) {
      return this.createRootDirectoryEntrySync(dir)
    }
    const parentEntry = this.getDirectoryEntrySync(Path.dirname(dir))
    const gitignore = Path.join(dir, '.gitignore')
    if (parentEntry.ignores(dir + '/')) return parentEntry
    if (this.isDirectorySync(dir)) this.emitIgnoreFile(gitignore)
    if (!this.isFileSync(gitignore)) return parentEntry
    const { rootDir } = parentEntry
    const entry = new DirectoryEntry(rootDir)
    if (this.initialRules)
      entry.add(this.initialRules, { addToLoadedRules: false })
    entry.add(parentEntry)
    const gitignoreRules = this.parseGitignoreSync(gitignore)
    entry.add(prefixGitignoreRules(gitignoreRules, dir, rootDir))
    if (this.finalRules) entry.add(this.finalRules, { addToLoadedRules: false })
    return entry
  }

  private async createDirectoryEntry(dir: string): Promise<DirectoryEntry> {
    if (this.isRoot(dir) || (await this.isGitRoot(dir))) {
      return await this.createRootDirectoryEntry(dir)
    }
    const parentEntry = await this.getDirectoryEntry(Path.dirname(dir))
    const gitignore = Path.join(dir, '.gitignore')
    if (parentEntry.ignores(dir + '/')) return parentEntry
    if (await this.isDirectory(dir)) this.emitIgnoreFile(gitignore)
    if (!(await this.isFile(gitignore))) return parentEntry
    const { rootDir } = parentEntry
    const entry = new DirectoryEntry(rootDir)
    if (this.initialRules)
      entry.add(this.initialRules, { addToLoadedRules: false })
    entry.add(parentEntry)
    const gitignoreRules = await this.parseGitignore(gitignore)
    entry.add(prefixGitignoreRules(gitignoreRules, dir, rootDir))
    if (this.finalRules) entry.add(this.finalRules, { addToLoadedRules: false })
    return entry
  }

  private getGitDir(): string | undefined {
    const { GIT_DIR } = this.env
    return GIT_DIR ? Path.resolve(GIT_DIR) : undefined
  }

  private createRootDirectoryEntrySync(dir: string): DirectoryEntry {
    const entry = new DirectoryEntry(dir)
    if (this.initialRules)
      entry.add(this.initialRules, { addToLoadedRules: false })
    entry.add(['.git'])
    const addGitignoreRules = (file: string) => {
      let rules
      try {
        rules = this.parseGitignoreSync(file)
      } catch (error) {
        return
      }
      entry.add(rules)
    }
    const coreExcludesFile = this.git.getCoreExcludesFileSync({ cwd: dir })
    if (coreExcludesFile)
      addGitignoreRules(normalizeInputPath(coreExcludesFile))
    const GIT_DIR = this.getGitDir()
    if (GIT_DIR && dir === Path.dirname(GIT_DIR)) {
      addGitignoreRules(Path.join(GIT_DIR, 'info', 'exclude'))
    } else {
      addGitignoreRules(Path.join(dir, '.git', 'info', 'exclude'))
    }
    addGitignoreRules(Path.join(dir, '.gitignore'))
    if (this.finalRules) entry.add(this.finalRules, { addToLoadedRules: false })
    return entry
  }

  private async createRootDirectoryEntry(dir: string): Promise<DirectoryEntry> {
    const entry = new DirectoryEntry(dir)
    if (this.initialRules)
      entry.add(this.initialRules, { addToLoadedRules: false })
    entry.add(['.git'])
    const addGitignoreRules = async (file: string): Promise<void> => {
      let rules
      try {
        rules = await this.parseGitignore(file)
      } catch (error) {
        return
      }
      entry.add(rules)
    }
    const coreExcludesFile = await this.git.getCoreExcludesFile({ cwd: dir })
    if (coreExcludesFile)
      await addGitignoreRules(normalizeInputPath(coreExcludesFile))
    const GIT_DIR = this.getGitDir()
    if (GIT_DIR && dir === Path.dirname(GIT_DIR)) {
      await addGitignoreRules(Path.join(GIT_DIR, 'info', 'exclude'))
    } else {
      await addGitignoreRules(Path.join(dir, '.git', 'info', 'exclude'))
    }
    await addGitignoreRules(Path.join(dir, '.gitignore'))
    if (this.finalRules) entry.add(this.finalRules, { addToLoadedRules: false })
    return entry
  }

  private emitIgnoreFile(path: string) {
    if (!this.ignoreFiles.has(path)) {
      this.ignoreFiles.add(path)
      this.emit('ignoreFile', path)
    }
  }

  private parseGitignoreSync(path: string): string[] {
    this.emitIgnoreFile(path)
    return this.fs.readFileSync(path, 'utf8').split(/\r\n?|\n/gm)
  }

  private async parseGitignore(path: string): Promise<string[]> {
    this.emitIgnoreFile(path)
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
