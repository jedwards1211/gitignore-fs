import createIgnore, { Ignore } from 'ignore'
import nodeFs from 'fs'
import Path from 'path'
import { spawnSync } from 'child_process'

export interface FsStats {
  isFile(): boolean
  isDirectory(): boolean
}

export interface Fs {
  statSync(path: string): FsStats
  readFileSync(
    path: string,
    options?: string | { encoding?: string; flag?: string }
  ): string
}

export interface Git {
  getCoreExcludesFile(options: { cwd: string }): string | undefined
}

const defaultGit: Git = {
  getCoreExcludesFile({ cwd }: { cwd: string }) {
    return spawnSync('git', ['config', '--get', 'core.excludesFile'], {
      cwd,
    })
      .stdout.toString()
      .trim()
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

  constructor({
    fs = nodeFs,
    git = defaultGit,
    env = process.env,
  }: {
    fs?: Fs
    git?: Git
    env?: Record<string, string | undefined>
  } = {}) {
    this.fs = fs
    this.git = git
    this.env = env
  }

  ignores(path: string, stats?: FsStats): boolean {
    path = Path.resolve(path)
    if (!stats) {
      try {
        stats = this.fs.statSync(path)
      } catch (error) {
        // ignore
      }
    }
    const dirEntry = this.getDirectoryEntry(
      stats?.isDirectory() ? Path.dirname(path) : path
    )
    return dirEntry.ignores(path)
  }

  private getDirectoryEntry(dir: string): DirectoryEntry {
    let cached = this.directories[dir]
    if (!cached) {
      cached = this.createDirectoryEntry(dir)
      this.directories[dir] = cached
    }
    return cached
  }

  private createDirectoryEntry(dir: string): DirectoryEntry {
    if (this.isRoot(dir) || this.isGitRoot(dir)) {
      return this.createRootDirectoryEntry(dir)
    }
    const gitignore = Path.join(dir, '.gitignore')
    if (this.isFile(gitignore)) {
      const parentEntry = this.getDirectoryEntry(Path.dirname(dir))
      const { rootDir } = parentEntry
      const entry = new DirectoryEntry(rootDir)
      entry.ignore.add(parentEntry.ignore)
      const gitignoreRules = this.parseGitignore(gitignore)
      entry.ignore.add(prefixGitignoreRules(gitignoreRules, dir, rootDir))
      return entry
    } else {
      return this.getDirectoryEntry(Path.dirname(dir))
    }
  }

  private getGitDir(): string | undefined {
    const { GIT_DIR } = this.env
    return GIT_DIR ? Path.resolve(GIT_DIR) : undefined
  }

  private createRootDirectoryEntry(dir: string): DirectoryEntry {
    const entry = new DirectoryEntry(dir)
    const addGitignoreRules = (file: string) => {
      let rules
      try {
        rules = this.parseGitignore(file)
      } catch (error) {
        return
      }
      entry.ignore.add(rules)
    }
    const coreExcludesFile = this.git.getCoreExcludesFile({ cwd: dir })
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

  private parseGitignore(path: string): string[] {
    return this.fs.readFileSync(path, 'utf8').split(/\r\n?|\n/gm)
  }

  private isFile(path: string): boolean {
    try {
      const stats = this.fs.statSync(path)
      return stats.isFile()
    } catch (error) {
      return false
    }
  }

  private isDirectory(path: string): boolean {
    try {
      const stats = this.fs.statSync(path)
      return stats.isDirectory()
    } catch (error) {
      return false
    }
  }

  private isRoot(dir: string): boolean {
    return dir === Path.parse(dir).root
  }

  private isGitRoot(dir: string): boolean {
    const GIT_DIR = this.getGitDir()
    return GIT_DIR
      ? dir === Path.dirname(GIT_DIR)
      : this.isDirectory(Path.join(dir, '.git'))
  }
}
