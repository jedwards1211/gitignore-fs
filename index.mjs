import _defineProperty from "@babel/runtime/helpers/defineProperty";
import createIgnore from 'ignore';
import fs from 'fs';
import { promisify } from 'util';
import Path from 'path';
import { spawnSync } from 'child_process';
import { spawn } from 'promisify-child-process';
const defaultFs = {
  stat: promisify(fs.stat),
  statSync: fs.statSync,
  readFile: promisify(fs.readFile),
  readFileSync: fs.readFileSync
};
const defaultGit = {
  async getCoreExcludesFile({
    cwd
  }) {
    try {
      var _stdout$toString;

      const {
        stdout
      } = await spawn('git', ['config', '--get', 'core.excludesFile'], {
        cwd,
        maxBuffer: 1024 * 1024
      });
      return stdout === null || stdout === void 0 ? void 0 : (_stdout$toString = stdout.toString()) === null || _stdout$toString === void 0 ? void 0 : _stdout$toString.trim();
    } catch (error) {
      return undefined;
    }
  },

  getCoreExcludesFileSync({
    cwd
  }) {
    try {
      var _spawnSync$stdout, _spawnSync$stdout$toS;

      return (_spawnSync$stdout = spawnSync('git', ['config', '--get', 'core.excludesFile'], {
        cwd,
        maxBuffer: 1024 * 1024
      }).stdout) === null || _spawnSync$stdout === void 0 ? void 0 : (_spawnSync$stdout$toS = _spawnSync$stdout.toString()) === null || _spawnSync$stdout$toS === void 0 ? void 0 : _spawnSync$stdout$toS.trim();
    } catch (error) {
      return undefined;
    }
  }

};

function normalizeInputPath(path) {
  const result = Path.normalize(Path.resolve(path));
  return path.endsWith('/') ? result + '/' : result;
}

function relativePath(from, to) {
  return to.endsWith('/') ? Path.relative(from, to) + '/' : Path.relative(from, to);
}

class DirectoryEntry {
  constructor(rootDir) {
    _defineProperty(this, "ignore", void 0);

    _defineProperty(this, "rootDir", void 0);

    _defineProperty(this, "loadedRules", []);

    this.rootDir = rootDir;
    this.ignore = createIgnore();
  }

  ignores(path) {
    return path !== this.rootDir && this.ignore.ignores(relativePath(this.rootDir, path));
  }

  add(rules, options) {
    if (rules instanceof DirectoryEntry) {
      this.add(rules.loadedRules, options);
    } else {
      if ((options === null || options === void 0 ? void 0 : options.addToLoadedRules) !== false) for (const rule of rules) this.loadedRules.push(rule);
      this.ignore.add(rules);
    }
  }

}

function prefixGitignoreRules(rules, rulesDir, rootDir) {
  const prefix = Path.relative(rootDir, rulesDir).replace(/\\/g, '/');
  return rules.map(function prefixRule(rule) {
    if (rule.startsWith('#') || !/\S/.test(rule)) return rule;
    if (rule.startsWith('!')) return '!' + prefixRule(rule.substring(1));
    return /\/\S/.test(rule) ? `${prefix}/${rule.replace(/^\//, '')}` : `${prefix}/**/${rule}`;
  });
}

export default class Gitignore {
  constructor({
    fs = defaultFs,
    git = defaultGit,
    env = process.env,
    initialRules,
    finalRules
  } = {}) {
    _defineProperty(this, "fs", void 0);

    _defineProperty(this, "git", void 0);

    _defineProperty(this, "env", void 0);

    _defineProperty(this, "directories", {});

    _defineProperty(this, "directoriesAsync", {});

    _defineProperty(this, "initialRules", void 0);

    _defineProperty(this, "finalRules", void 0);

    this.fs = fs;
    this.git = git;
    this.env = env;
    this.initialRules = initialRules;
    this.finalRules = finalRules;
  }

  clearCache() {
    this.directories = {};
    this.directoriesAsync = {};
  }

  async ignores(path) {
    path = normalizeInputPath(path);
    const dirEntry = await this.getDirectoryEntry(path.endsWith('/') ? Path.dirname(path) : path);
    return dirEntry.ignores(path);
  }

  ignoresSync(path) {
    path = normalizeInputPath(path);
    const dirEntry = this.getDirectoryEntrySync(path.endsWith('/') ? Path.dirname(path) : path);
    return dirEntry.ignores(path);
  }

  getDirectoryEntrySync(dir) {
    let cached = this.directories[dir];

    if (!cached) {
      cached = this.createDirectoryEntrySync(dir);
      this.directories[dir] = cached;
      this.directoriesAsync[dir] = Promise.resolve(cached);
    }

    return cached;
  }

  async getDirectoryEntry(dir) {
    let cached = this.directoriesAsync[dir];

    if (!cached) {
      cached = this.createDirectoryEntry(dir);
      this.directoriesAsync[dir] = cached;
      cached.then(entry => {
        if (this.directoriesAsync[dir] === cached) this.directories[dir] = entry;
      });
    }

    return cached;
  }

  createDirectoryEntrySync(dir) {
    if (this.isRoot(dir) || this.isGitRootSync(dir)) {
      return this.createRootDirectoryEntrySync(dir);
    }

    const parentEntry = this.getDirectoryEntrySync(Path.dirname(dir));
    const gitignore = Path.join(dir, '.gitignore');
    if (parentEntry.ignores(dir + '/') || !this.isFileSync(gitignore)) return parentEntry;
    const {
      rootDir
    } = parentEntry;
    const entry = new DirectoryEntry(rootDir);
    if (this.initialRules) entry.add(this.initialRules, {
      addToLoadedRules: false
    });
    entry.add(parentEntry);
    const gitignoreRules = this.parseGitignoreSync(gitignore);
    entry.add(prefixGitignoreRules(gitignoreRules, dir, rootDir));
    if (this.finalRules) entry.add(this.finalRules, {
      addToLoadedRules: false
    });
    return entry;
  }

  async createDirectoryEntry(dir) {
    if (this.isRoot(dir) || (await this.isGitRoot(dir))) {
      return await this.createRootDirectoryEntry(dir);
    }

    const parentEntry = await this.getDirectoryEntry(Path.dirname(dir));
    const gitignore = Path.join(dir, '.gitignore');
    if (parentEntry.ignores(dir + '/') || !(await this.isFile(gitignore))) return parentEntry;
    const {
      rootDir
    } = parentEntry;
    const entry = new DirectoryEntry(rootDir);
    if (this.initialRules) entry.add(this.initialRules, {
      addToLoadedRules: false
    });
    entry.add(parentEntry);
    const gitignoreRules = await this.parseGitignore(gitignore);
    entry.add(prefixGitignoreRules(gitignoreRules, dir, rootDir));
    if (this.finalRules) entry.add(this.finalRules, {
      addToLoadedRules: false
    });
    return entry;
  }

  getGitDir() {
    const {
      GIT_DIR
    } = this.env;
    return GIT_DIR ? Path.resolve(GIT_DIR) : undefined;
  }

  createRootDirectoryEntrySync(dir) {
    const entry = new DirectoryEntry(dir);
    if (this.initialRules) entry.add(this.initialRules, {
      addToLoadedRules: false
    });
    entry.add(['.git']);

    const addGitignoreRules = file => {
      let rules;

      try {
        rules = this.parseGitignoreSync(file);
      } catch (error) {
        return;
      }

      entry.add(rules);
    };

    const coreExcludesFile = this.git.getCoreExcludesFileSync({
      cwd: dir
    });
    if (coreExcludesFile) addGitignoreRules(coreExcludesFile);
    const GIT_DIR = this.getGitDir();

    if (GIT_DIR && dir === Path.dirname(GIT_DIR)) {
      addGitignoreRules(Path.join(GIT_DIR, 'info', 'exclude'));
    } else {
      addGitignoreRules(Path.join(dir, '.git', 'info', 'exclude'));
    }

    addGitignoreRules(Path.join(dir, '.gitignore'));
    if (this.finalRules) entry.add(this.finalRules, {
      addToLoadedRules: false
    });
    return entry;
  }

  async createRootDirectoryEntry(dir) {
    const entry = new DirectoryEntry(dir);
    if (this.initialRules) entry.add(this.initialRules, {
      addToLoadedRules: false
    });
    entry.add(['.git']);

    const addGitignoreRules = async file => {
      let rules;

      try {
        rules = await this.parseGitignore(file);
      } catch (error) {
        return;
      }

      entry.add(rules);
    };

    const coreExcludesFile = await this.git.getCoreExcludesFile({
      cwd: dir
    });
    if (coreExcludesFile) await addGitignoreRules(coreExcludesFile);
    const GIT_DIR = this.getGitDir();

    if (GIT_DIR && dir === Path.dirname(GIT_DIR)) {
      await addGitignoreRules(Path.join(GIT_DIR, 'info', 'exclude'));
    } else {
      await addGitignoreRules(Path.join(dir, '.git', 'info', 'exclude'));
    }

    await addGitignoreRules(Path.join(dir, '.gitignore'));
    if (this.finalRules) entry.add(this.finalRules, {
      addToLoadedRules: false
    });
    return entry;
  }

  parseGitignoreSync(path) {
    return this.fs.readFileSync(path, 'utf8').split(/\r\n?|\n/gm);
  }

  async parseGitignore(path) {
    return (await this.fs.readFile(path, 'utf8')).split(/\r\n?|\n/gm);
  }

  isFileSync(path) {
    try {
      const stats = this.fs.statSync(path);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  async isFile(path) {
    try {
      const stats = await this.fs.stat(path);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  isDirectorySync(path) {
    try {
      const stats = this.fs.statSync(path);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  async isDirectory(path) {
    try {
      const stats = await this.fs.stat(path);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  isRoot(dir) {
    return dir === Path.parse(dir).root;
  }

  isGitRootSync(dir) {
    const GIT_DIR = this.getGitDir();
    return GIT_DIR ? dir === Path.dirname(GIT_DIR) : this.isDirectorySync(Path.join(dir, '.git'));
  }

  async isGitRoot(dir) {
    const GIT_DIR = this.getGitDir();
    return GIT_DIR ? dir === Path.dirname(GIT_DIR) : await this.isDirectory(Path.join(dir, '.git'));
  }

}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJjcmVhdGVJZ25vcmUiLCJmcyIsInByb21pc2lmeSIsIlBhdGgiLCJzcGF3blN5bmMiLCJzcGF3biIsImRlZmF1bHRGcyIsInN0YXQiLCJzdGF0U3luYyIsInJlYWRGaWxlIiwicmVhZEZpbGVTeW5jIiwiZGVmYXVsdEdpdCIsImdldENvcmVFeGNsdWRlc0ZpbGUiLCJjd2QiLCJzdGRvdXQiLCJtYXhCdWZmZXIiLCJ0b1N0cmluZyIsInRyaW0iLCJlcnJvciIsInVuZGVmaW5lZCIsImdldENvcmVFeGNsdWRlc0ZpbGVTeW5jIiwibm9ybWFsaXplSW5wdXRQYXRoIiwicGF0aCIsInJlc3VsdCIsIm5vcm1hbGl6ZSIsInJlc29sdmUiLCJlbmRzV2l0aCIsInJlbGF0aXZlUGF0aCIsImZyb20iLCJ0byIsInJlbGF0aXZlIiwiRGlyZWN0b3J5RW50cnkiLCJjb25zdHJ1Y3RvciIsInJvb3REaXIiLCJpZ25vcmUiLCJpZ25vcmVzIiwiYWRkIiwicnVsZXMiLCJvcHRpb25zIiwibG9hZGVkUnVsZXMiLCJhZGRUb0xvYWRlZFJ1bGVzIiwicnVsZSIsInB1c2giLCJwcmVmaXhHaXRpZ25vcmVSdWxlcyIsInJ1bGVzRGlyIiwicHJlZml4IiwicmVwbGFjZSIsIm1hcCIsInByZWZpeFJ1bGUiLCJzdGFydHNXaXRoIiwidGVzdCIsInN1YnN0cmluZyIsIkdpdGlnbm9yZSIsImdpdCIsImVudiIsInByb2Nlc3MiLCJpbml0aWFsUnVsZXMiLCJmaW5hbFJ1bGVzIiwiY2xlYXJDYWNoZSIsImRpcmVjdG9yaWVzIiwiZGlyZWN0b3JpZXNBc3luYyIsImRpckVudHJ5IiwiZ2V0RGlyZWN0b3J5RW50cnkiLCJkaXJuYW1lIiwiaWdub3Jlc1N5bmMiLCJnZXREaXJlY3RvcnlFbnRyeVN5bmMiLCJkaXIiLCJjYWNoZWQiLCJjcmVhdGVEaXJlY3RvcnlFbnRyeVN5bmMiLCJQcm9taXNlIiwiY3JlYXRlRGlyZWN0b3J5RW50cnkiLCJ0aGVuIiwiZW50cnkiLCJpc1Jvb3QiLCJpc0dpdFJvb3RTeW5jIiwiY3JlYXRlUm9vdERpcmVjdG9yeUVudHJ5U3luYyIsInBhcmVudEVudHJ5IiwiZ2l0aWdub3JlIiwiam9pbiIsImlzRmlsZVN5bmMiLCJnaXRpZ25vcmVSdWxlcyIsInBhcnNlR2l0aWdub3JlU3luYyIsImlzR2l0Um9vdCIsImNyZWF0ZVJvb3REaXJlY3RvcnlFbnRyeSIsImlzRmlsZSIsInBhcnNlR2l0aWdub3JlIiwiZ2V0R2l0RGlyIiwiR0lUX0RJUiIsImFkZEdpdGlnbm9yZVJ1bGVzIiwiZmlsZSIsImNvcmVFeGNsdWRlc0ZpbGUiLCJzcGxpdCIsInN0YXRzIiwiaXNEaXJlY3RvcnlTeW5jIiwiaXNEaXJlY3RvcnkiLCJwYXJzZSIsInJvb3QiXSwic291cmNlcyI6WyJzcmMvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUlnbm9yZSwgeyBJZ25vcmUgfSBmcm9tICdpZ25vcmUnXG5pbXBvcnQgZnMgZnJvbSAnZnMnXG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICd1dGlsJ1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ3Byb21pc2lmeS1jaGlsZC1wcm9jZXNzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIEZzU3RhdHMge1xuICBpc0ZpbGUoKTogYm9vbGVhblxuICBpc0RpcmVjdG9yeSgpOiBib29sZWFuXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnMge1xuICBzdGF0KHBhdGg6IHN0cmluZyk6IFByb21pc2U8RnNTdGF0cz5cbiAgcmVhZEZpbGUoXG4gICAgcGF0aDogc3RyaW5nLFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgb3B0aW9ucz86IHN0cmluZyB8IHsgZW5jb2Rpbmc/OiBzdHJpbmc7IGZsYWc/OiBzdHJpbmc7IHNpZ25hbD86IGFueSB9XG4gICk6IFByb21pc2U8c3RyaW5nPlxuICBzdGF0U3luYyhwYXRoOiBzdHJpbmcpOiBGc1N0YXRzXG4gIHJlYWRGaWxlU3luYyhcbiAgICBwYXRoOiBzdHJpbmcsXG4gICAgb3B0aW9ucz86IHN0cmluZyB8IHsgZW5jb2Rpbmc/OiBzdHJpbmc7IGZsYWc/OiBzdHJpbmcgfVxuICApOiBzdHJpbmdcbn1cblxuY29uc3QgZGVmYXVsdEZzOiBGcyA9IHtcbiAgc3RhdDogcHJvbWlzaWZ5KGZzLnN0YXQpLFxuICBzdGF0U3luYzogZnMuc3RhdFN5bmMsXG4gIHJlYWRGaWxlOiBwcm9taXNpZnkoZnMucmVhZEZpbGUpLFxuICByZWFkRmlsZVN5bmM6IGZzLnJlYWRGaWxlU3luYyxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGc1Byb21pc2VzIHtcbiAgc3RhdChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPEZzU3RhdHM+XG4gIHJlYWRGaWxlKFxuICAgIHBhdGg6IHN0cmluZyxcbiAgICBvcHRpb25zPzogc3RyaW5nIHwgeyBlbmNvZGluZz86IHN0cmluZzsgZmxhZz86IHN0cmluZyB9XG4gICk6IFByb21pc2U8c3RyaW5nPlxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdpdCB7XG4gIGdldENvcmVFeGNsdWRlc0ZpbGUob3B0aW9uczogeyBjd2Q6IHN0cmluZyB9KTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+XG4gIGdldENvcmVFeGNsdWRlc0ZpbGVTeW5jKG9wdGlvbnM6IHsgY3dkOiBzdHJpbmcgfSk6IHN0cmluZyB8IHVuZGVmaW5lZFxufVxuXG5jb25zdCBkZWZhdWx0R2l0OiBHaXQgPSB7XG4gIGFzeW5jIGdldENvcmVFeGNsdWRlc0ZpbGUoe1xuICAgIGN3ZCxcbiAgfToge1xuICAgIGN3ZDogc3RyaW5nXG4gIH0pOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgc3Bhd24oXG4gICAgICAgICdnaXQnLFxuICAgICAgICBbJ2NvbmZpZycsICctLWdldCcsICdjb3JlLmV4Y2x1ZGVzRmlsZSddLFxuICAgICAgICB7XG4gICAgICAgICAgY3dkLFxuICAgICAgICAgIG1heEJ1ZmZlcjogMTAyNCAqIDEwMjQsXG4gICAgICAgIH1cbiAgICAgIClcbiAgICAgIHJldHVybiBzdGRvdXQ/LnRvU3RyaW5nKCk/LnRyaW0oKVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgfVxuICB9LFxuICBnZXRDb3JlRXhjbHVkZXNGaWxlU3luYyh7IGN3ZCB9OiB7IGN3ZDogc3RyaW5nIH0pIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHNwYXduU3luYygnZ2l0JywgWydjb25maWcnLCAnLS1nZXQnLCAnY29yZS5leGNsdWRlc0ZpbGUnXSwge1xuICAgICAgICBjd2QsXG4gICAgICAgIG1heEJ1ZmZlcjogMTAyNCAqIDEwMjQsXG4gICAgICB9KVxuICAgICAgICAuc3Rkb3V0Py50b1N0cmluZygpXG4gICAgICAgID8udHJpbSgpXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG4gIH0sXG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUlucHV0UGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByZXN1bHQgPSBQYXRoLm5vcm1hbGl6ZShQYXRoLnJlc29sdmUocGF0aCkpXG4gIHJldHVybiBwYXRoLmVuZHNXaXRoKCcvJykgPyByZXN1bHQgKyAnLycgOiByZXN1bHRcbn1cblxuZnVuY3Rpb24gcmVsYXRpdmVQYXRoKGZyb206IHN0cmluZywgdG86IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0by5lbmRzV2l0aCgnLycpXG4gICAgPyBQYXRoLnJlbGF0aXZlKGZyb20sIHRvKSArICcvJ1xuICAgIDogUGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbn1cblxuY2xhc3MgRGlyZWN0b3J5RW50cnkge1xuICBpZ25vcmU6IElnbm9yZVxuICByb290RGlyOiBzdHJpbmdcbiAgbG9hZGVkUnVsZXM6IHN0cmluZ1tdID0gW11cblxuICBjb25zdHJ1Y3Rvcihyb290RGlyOiBzdHJpbmcpIHtcbiAgICB0aGlzLnJvb3REaXIgPSByb290RGlyXG4gICAgdGhpcy5pZ25vcmUgPSBjcmVhdGVJZ25vcmUoKVxuICB9XG5cbiAgaWdub3JlcyhwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgcGF0aCAhPT0gdGhpcy5yb290RGlyICYmXG4gICAgICB0aGlzLmlnbm9yZS5pZ25vcmVzKHJlbGF0aXZlUGF0aCh0aGlzLnJvb3REaXIsIHBhdGgpKVxuICAgIClcbiAgfVxuXG4gIGFkZChcbiAgICBydWxlczogRGlyZWN0b3J5RW50cnkgfCBzdHJpbmdbXSxcbiAgICBvcHRpb25zPzogeyBhZGRUb0xvYWRlZFJ1bGVzPzogYm9vbGVhbiB9XG4gICk6IHZvaWQge1xuICAgIGlmIChydWxlcyBpbnN0YW5jZW9mIERpcmVjdG9yeUVudHJ5KSB7XG4gICAgICB0aGlzLmFkZChydWxlcy5sb2FkZWRSdWxlcywgb3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnM/LmFkZFRvTG9hZGVkUnVsZXMgIT09IGZhbHNlKVxuICAgICAgICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHRoaXMubG9hZGVkUnVsZXMucHVzaChydWxlKVxuICAgICAgdGhpcy5pZ25vcmUuYWRkKHJ1bGVzKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwcmVmaXhHaXRpZ25vcmVSdWxlcyhcbiAgcnVsZXM6IHN0cmluZ1tdLFxuICBydWxlc0Rpcjogc3RyaW5nLFxuICByb290RGlyOiBzdHJpbmdcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcHJlZml4ID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBydWxlc0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gIHJldHVybiBydWxlcy5tYXAoZnVuY3Rpb24gcHJlZml4UnVsZShydWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChydWxlLnN0YXJ0c1dpdGgoJyMnKSB8fCAhL1xcUy8udGVzdChydWxlKSkgcmV0dXJuIHJ1bGVcbiAgICBpZiAocnVsZS5zdGFydHNXaXRoKCchJykpIHJldHVybiAnIScgKyBwcmVmaXhSdWxlKHJ1bGUuc3Vic3RyaW5nKDEpKVxuICAgIHJldHVybiAvXFwvXFxTLy50ZXN0KHJ1bGUpXG4gICAgICA/IGAke3ByZWZpeH0vJHtydWxlLnJlcGxhY2UoL15cXC8vLCAnJyl9YFxuICAgICAgOiBgJHtwcmVmaXh9LyoqLyR7cnVsZX1gXG4gIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdpdGlnbm9yZSB7XG4gIHByaXZhdGUgZnM6IEZzXG4gIHByaXZhdGUgZ2l0OiBHaXRcbiAgcHJpdmF0ZSBlbnY6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZD5cbiAgcHJpdmF0ZSBkaXJlY3RvcmllczogUmVjb3JkPHN0cmluZywgRGlyZWN0b3J5RW50cnk+ID0ge31cbiAgcHJpdmF0ZSBkaXJlY3Rvcmllc0FzeW5jOiBSZWNvcmQ8c3RyaW5nLCBQcm9taXNlPERpcmVjdG9yeUVudHJ5Pj4gPSB7fVxuICBwcml2YXRlIGluaXRpYWxSdWxlczogc3RyaW5nW10gfCB1bmRlZmluZWRcbiAgcHJpdmF0ZSBmaW5hbFJ1bGVzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZFxuXG4gIGNvbnN0cnVjdG9yKHtcbiAgICBmcyA9IGRlZmF1bHRGcyxcbiAgICBnaXQgPSBkZWZhdWx0R2l0LFxuICAgIGVudiA9IHByb2Nlc3MuZW52LFxuICAgIGluaXRpYWxSdWxlcyxcbiAgICBmaW5hbFJ1bGVzLFxuICB9OiB7XG4gICAgZnM/OiBGc1xuICAgIGZzUHJvbWlzZXM/OiBGc1Byb21pc2VzXG4gICAgZ2l0PzogR2l0XG4gICAgZW52PzogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgdW5kZWZpbmVkPlxuICAgIGluaXRpYWxSdWxlcz86IHN0cmluZ1tdXG4gICAgZmluYWxSdWxlcz86IHN0cmluZ1tdXG4gIH0gPSB7fSkge1xuICAgIHRoaXMuZnMgPSBmc1xuICAgIHRoaXMuZ2l0ID0gZ2l0XG4gICAgdGhpcy5lbnYgPSBlbnZcbiAgICB0aGlzLmluaXRpYWxSdWxlcyA9IGluaXRpYWxSdWxlc1xuICAgIHRoaXMuZmluYWxSdWxlcyA9IGZpbmFsUnVsZXNcbiAgfVxuXG4gIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgdGhpcy5kaXJlY3RvcmllcyA9IHt9XG4gICAgdGhpcy5kaXJlY3Rvcmllc0FzeW5jID0ge31cbiAgfVxuXG4gIGFzeW5jIGlnbm9yZXMocGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcGF0aCA9IG5vcm1hbGl6ZUlucHV0UGF0aChwYXRoKVxuICAgIGNvbnN0IGRpckVudHJ5ID0gYXdhaXQgdGhpcy5nZXREaXJlY3RvcnlFbnRyeShcbiAgICAgIHBhdGguZW5kc1dpdGgoJy8nKSA/IFBhdGguZGlybmFtZShwYXRoKSA6IHBhdGhcbiAgICApXG4gICAgcmV0dXJuIGRpckVudHJ5Lmlnbm9yZXMocGF0aClcbiAgfVxuXG4gIGlnbm9yZXNTeW5jKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHBhdGggPSBub3JtYWxpemVJbnB1dFBhdGgocGF0aClcbiAgICBjb25zdCBkaXJFbnRyeSA9IHRoaXMuZ2V0RGlyZWN0b3J5RW50cnlTeW5jKFxuICAgICAgcGF0aC5lbmRzV2l0aCgnLycpID8gUGF0aC5kaXJuYW1lKHBhdGgpIDogcGF0aFxuICAgIClcbiAgICByZXR1cm4gZGlyRW50cnkuaWdub3JlcyhwYXRoKVxuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RvcnlFbnRyeVN5bmMoZGlyOiBzdHJpbmcpOiBEaXJlY3RvcnlFbnRyeSB7XG4gICAgbGV0IGNhY2hlZCA9IHRoaXMuZGlyZWN0b3JpZXNbZGlyXVxuICAgIGlmICghY2FjaGVkKSB7XG4gICAgICBjYWNoZWQgPSB0aGlzLmNyZWF0ZURpcmVjdG9yeUVudHJ5U3luYyhkaXIpXG4gICAgICB0aGlzLmRpcmVjdG9yaWVzW2Rpcl0gPSBjYWNoZWRcbiAgICAgIHRoaXMuZGlyZWN0b3JpZXNBc3luY1tkaXJdID0gUHJvbWlzZS5yZXNvbHZlKGNhY2hlZClcbiAgICB9XG4gICAgcmV0dXJuIGNhY2hlZFxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXREaXJlY3RvcnlFbnRyeShkaXI6IHN0cmluZyk6IFByb21pc2U8RGlyZWN0b3J5RW50cnk+IHtcbiAgICBsZXQgY2FjaGVkID0gdGhpcy5kaXJlY3Rvcmllc0FzeW5jW2Rpcl1cbiAgICBpZiAoIWNhY2hlZCkge1xuICAgICAgY2FjaGVkID0gdGhpcy5jcmVhdGVEaXJlY3RvcnlFbnRyeShkaXIpXG4gICAgICB0aGlzLmRpcmVjdG9yaWVzQXN5bmNbZGlyXSA9IGNhY2hlZFxuICAgICAgY2FjaGVkLnRoZW4oKGVudHJ5KSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmRpcmVjdG9yaWVzQXN5bmNbZGlyXSA9PT0gY2FjaGVkKVxuICAgICAgICAgIHRoaXMuZGlyZWN0b3JpZXNbZGlyXSA9IGVudHJ5XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY2FjaGVkXG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZURpcmVjdG9yeUVudHJ5U3luYyhkaXI6IHN0cmluZyk6IERpcmVjdG9yeUVudHJ5IHtcbiAgICBpZiAodGhpcy5pc1Jvb3QoZGlyKSB8fCB0aGlzLmlzR2l0Um9vdFN5bmMoZGlyKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlUm9vdERpcmVjdG9yeUVudHJ5U3luYyhkaXIpXG4gICAgfVxuICAgIGNvbnN0IHBhcmVudEVudHJ5ID0gdGhpcy5nZXREaXJlY3RvcnlFbnRyeVN5bmMoUGF0aC5kaXJuYW1lKGRpcikpXG4gICAgY29uc3QgZ2l0aWdub3JlID0gUGF0aC5qb2luKGRpciwgJy5naXRpZ25vcmUnKVxuICAgIGlmIChwYXJlbnRFbnRyeS5pZ25vcmVzKGRpciArICcvJykgfHwgIXRoaXMuaXNGaWxlU3luYyhnaXRpZ25vcmUpKVxuICAgICAgcmV0dXJuIHBhcmVudEVudHJ5XG4gICAgY29uc3QgeyByb290RGlyIH0gPSBwYXJlbnRFbnRyeVxuICAgIGNvbnN0IGVudHJ5ID0gbmV3IERpcmVjdG9yeUVudHJ5KHJvb3REaXIpXG4gICAgaWYgKHRoaXMuaW5pdGlhbFJ1bGVzKVxuICAgICAgZW50cnkuYWRkKHRoaXMuaW5pdGlhbFJ1bGVzLCB7IGFkZFRvTG9hZGVkUnVsZXM6IGZhbHNlIH0pXG4gICAgZW50cnkuYWRkKHBhcmVudEVudHJ5KVxuICAgIGNvbnN0IGdpdGlnbm9yZVJ1bGVzID0gdGhpcy5wYXJzZUdpdGlnbm9yZVN5bmMoZ2l0aWdub3JlKVxuICAgIGVudHJ5LmFkZChwcmVmaXhHaXRpZ25vcmVSdWxlcyhnaXRpZ25vcmVSdWxlcywgZGlyLCByb290RGlyKSlcbiAgICBpZiAodGhpcy5maW5hbFJ1bGVzKSBlbnRyeS5hZGQodGhpcy5maW5hbFJ1bGVzLCB7IGFkZFRvTG9hZGVkUnVsZXM6IGZhbHNlIH0pXG4gICAgcmV0dXJuIGVudHJ5XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZURpcmVjdG9yeUVudHJ5KGRpcjogc3RyaW5nKTogUHJvbWlzZTxEaXJlY3RvcnlFbnRyeT4ge1xuICAgIGlmICh0aGlzLmlzUm9vdChkaXIpIHx8IChhd2FpdCB0aGlzLmlzR2l0Um9vdChkaXIpKSkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlUm9vdERpcmVjdG9yeUVudHJ5KGRpcilcbiAgICB9XG4gICAgY29uc3QgcGFyZW50RW50cnkgPSBhd2FpdCB0aGlzLmdldERpcmVjdG9yeUVudHJ5KFBhdGguZGlybmFtZShkaXIpKVxuICAgIGNvbnN0IGdpdGlnbm9yZSA9IFBhdGguam9pbihkaXIsICcuZ2l0aWdub3JlJylcbiAgICBpZiAocGFyZW50RW50cnkuaWdub3JlcyhkaXIgKyAnLycpIHx8ICEoYXdhaXQgdGhpcy5pc0ZpbGUoZ2l0aWdub3JlKSkpXG4gICAgICByZXR1cm4gcGFyZW50RW50cnlcbiAgICBjb25zdCB7IHJvb3REaXIgfSA9IHBhcmVudEVudHJ5XG4gICAgY29uc3QgZW50cnkgPSBuZXcgRGlyZWN0b3J5RW50cnkocm9vdERpcilcbiAgICBpZiAodGhpcy5pbml0aWFsUnVsZXMpXG4gICAgICBlbnRyeS5hZGQodGhpcy5pbml0aWFsUnVsZXMsIHsgYWRkVG9Mb2FkZWRSdWxlczogZmFsc2UgfSlcbiAgICBlbnRyeS5hZGQocGFyZW50RW50cnkpXG4gICAgY29uc3QgZ2l0aWdub3JlUnVsZXMgPSBhd2FpdCB0aGlzLnBhcnNlR2l0aWdub3JlKGdpdGlnbm9yZSlcbiAgICBlbnRyeS5hZGQocHJlZml4R2l0aWdub3JlUnVsZXMoZ2l0aWdub3JlUnVsZXMsIGRpciwgcm9vdERpcikpXG4gICAgaWYgKHRoaXMuZmluYWxSdWxlcykgZW50cnkuYWRkKHRoaXMuZmluYWxSdWxlcywgeyBhZGRUb0xvYWRlZFJ1bGVzOiBmYWxzZSB9KVxuICAgIHJldHVybiBlbnRyeVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRHaXREaXIoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IEdJVF9ESVIgfSA9IHRoaXMuZW52XG4gICAgcmV0dXJuIEdJVF9ESVIgPyBQYXRoLnJlc29sdmUoR0lUX0RJUikgOiB1bmRlZmluZWRcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUm9vdERpcmVjdG9yeUVudHJ5U3luYyhkaXI6IHN0cmluZyk6IERpcmVjdG9yeUVudHJ5IHtcbiAgICBjb25zdCBlbnRyeSA9IG5ldyBEaXJlY3RvcnlFbnRyeShkaXIpXG4gICAgaWYgKHRoaXMuaW5pdGlhbFJ1bGVzKVxuICAgICAgZW50cnkuYWRkKHRoaXMuaW5pdGlhbFJ1bGVzLCB7IGFkZFRvTG9hZGVkUnVsZXM6IGZhbHNlIH0pXG4gICAgZW50cnkuYWRkKFsnLmdpdCddKVxuICAgIGNvbnN0IGFkZEdpdGlnbm9yZVJ1bGVzID0gKGZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IHJ1bGVzXG4gICAgICB0cnkge1xuICAgICAgICBydWxlcyA9IHRoaXMucGFyc2VHaXRpZ25vcmVTeW5jKGZpbGUpXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGVudHJ5LmFkZChydWxlcylcbiAgICB9XG4gICAgY29uc3QgY29yZUV4Y2x1ZGVzRmlsZSA9IHRoaXMuZ2l0LmdldENvcmVFeGNsdWRlc0ZpbGVTeW5jKHsgY3dkOiBkaXIgfSlcbiAgICBpZiAoY29yZUV4Y2x1ZGVzRmlsZSkgYWRkR2l0aWdub3JlUnVsZXMoY29yZUV4Y2x1ZGVzRmlsZSlcbiAgICBjb25zdCBHSVRfRElSID0gdGhpcy5nZXRHaXREaXIoKVxuICAgIGlmIChHSVRfRElSICYmIGRpciA9PT0gUGF0aC5kaXJuYW1lKEdJVF9ESVIpKSB7XG4gICAgICBhZGRHaXRpZ25vcmVSdWxlcyhQYXRoLmpvaW4oR0lUX0RJUiwgJ2luZm8nLCAnZXhjbHVkZScpKVxuICAgIH0gZWxzZSB7XG4gICAgICBhZGRHaXRpZ25vcmVSdWxlcyhQYXRoLmpvaW4oZGlyLCAnLmdpdCcsICdpbmZvJywgJ2V4Y2x1ZGUnKSlcbiAgICB9XG4gICAgYWRkR2l0aWdub3JlUnVsZXMoUGF0aC5qb2luKGRpciwgJy5naXRpZ25vcmUnKSlcbiAgICBpZiAodGhpcy5maW5hbFJ1bGVzKSBlbnRyeS5hZGQodGhpcy5maW5hbFJ1bGVzLCB7IGFkZFRvTG9hZGVkUnVsZXM6IGZhbHNlIH0pXG4gICAgcmV0dXJuIGVudHJ5XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZVJvb3REaXJlY3RvcnlFbnRyeShkaXI6IHN0cmluZyk6IFByb21pc2U8RGlyZWN0b3J5RW50cnk+IHtcbiAgICBjb25zdCBlbnRyeSA9IG5ldyBEaXJlY3RvcnlFbnRyeShkaXIpXG4gICAgaWYgKHRoaXMuaW5pdGlhbFJ1bGVzKVxuICAgICAgZW50cnkuYWRkKHRoaXMuaW5pdGlhbFJ1bGVzLCB7IGFkZFRvTG9hZGVkUnVsZXM6IGZhbHNlIH0pXG4gICAgZW50cnkuYWRkKFsnLmdpdCddKVxuICAgIGNvbnN0IGFkZEdpdGlnbm9yZVJ1bGVzID0gYXN5bmMgKGZpbGU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgbGV0IHJ1bGVzXG4gICAgICB0cnkge1xuICAgICAgICBydWxlcyA9IGF3YWl0IHRoaXMucGFyc2VHaXRpZ25vcmUoZmlsZSlcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZW50cnkuYWRkKHJ1bGVzKVxuICAgIH1cbiAgICBjb25zdCBjb3JlRXhjbHVkZXNGaWxlID0gYXdhaXQgdGhpcy5naXQuZ2V0Q29yZUV4Y2x1ZGVzRmlsZSh7IGN3ZDogZGlyIH0pXG4gICAgaWYgKGNvcmVFeGNsdWRlc0ZpbGUpIGF3YWl0IGFkZEdpdGlnbm9yZVJ1bGVzKGNvcmVFeGNsdWRlc0ZpbGUpXG4gICAgY29uc3QgR0lUX0RJUiA9IHRoaXMuZ2V0R2l0RGlyKClcbiAgICBpZiAoR0lUX0RJUiAmJiBkaXIgPT09IFBhdGguZGlybmFtZShHSVRfRElSKSkge1xuICAgICAgYXdhaXQgYWRkR2l0aWdub3JlUnVsZXMoUGF0aC5qb2luKEdJVF9ESVIsICdpbmZvJywgJ2V4Y2x1ZGUnKSlcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgYWRkR2l0aWdub3JlUnVsZXMoUGF0aC5qb2luKGRpciwgJy5naXQnLCAnaW5mbycsICdleGNsdWRlJykpXG4gICAgfVxuICAgIGF3YWl0IGFkZEdpdGlnbm9yZVJ1bGVzKFBhdGguam9pbihkaXIsICcuZ2l0aWdub3JlJykpXG4gICAgaWYgKHRoaXMuZmluYWxSdWxlcykgZW50cnkuYWRkKHRoaXMuZmluYWxSdWxlcywgeyBhZGRUb0xvYWRlZFJ1bGVzOiBmYWxzZSB9KVxuICAgIHJldHVybiBlbnRyeVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUdpdGlnbm9yZVN5bmMocGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLmZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpLnNwbGl0KC9cXHJcXG4/fFxcbi9nbSlcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcGFyc2VHaXRpZ25vcmUocGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIHJldHVybiAoYXdhaXQgdGhpcy5mcy5yZWFkRmlsZShwYXRoLCAndXRmOCcpKS5zcGxpdCgvXFxyXFxuP3xcXG4vZ20pXG4gIH1cblxuICBwcml2YXRlIGlzRmlsZVN5bmMocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5mcy5zdGF0U3luYyhwYXRoKVxuICAgICAgcmV0dXJuIHN0YXRzLmlzRmlsZSgpXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuICBwcml2YXRlIGFzeW5jIGlzRmlsZShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmZzLnN0YXQocGF0aClcbiAgICAgIHJldHVybiBzdGF0cy5pc0ZpbGUoKVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGlzRGlyZWN0b3J5U3luYyhwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLmZzLnN0YXRTeW5jKHBhdGgpXG4gICAgICByZXR1cm4gc3RhdHMuaXNEaXJlY3RvcnkoKVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGlzRGlyZWN0b3J5KHBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuZnMuc3RhdChwYXRoKVxuICAgICAgcmV0dXJuIHN0YXRzLmlzRGlyZWN0b3J5KClcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBpc1Jvb3QoZGlyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZGlyID09PSBQYXRoLnBhcnNlKGRpcikucm9vdFxuICB9XG5cbiAgcHJpdmF0ZSBpc0dpdFJvb3RTeW5jKGRpcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgR0lUX0RJUiA9IHRoaXMuZ2V0R2l0RGlyKClcbiAgICByZXR1cm4gR0lUX0RJUlxuICAgICAgPyBkaXIgPT09IFBhdGguZGlybmFtZShHSVRfRElSKVxuICAgICAgOiB0aGlzLmlzRGlyZWN0b3J5U3luYyhQYXRoLmpvaW4oZGlyLCAnLmdpdCcpKVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBpc0dpdFJvb3QoZGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBHSVRfRElSID0gdGhpcy5nZXRHaXREaXIoKVxuICAgIHJldHVybiBHSVRfRElSXG4gICAgICA/IGRpciA9PT0gUGF0aC5kaXJuYW1lKEdJVF9ESVIpXG4gICAgICA6IGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoUGF0aC5qb2luKGRpciwgJy5naXQnKSlcbiAgfVxufVxuIl0sIm1hcHBpbmdzIjoiO0FBQUEsT0FBT0EsWUFBUCxNQUFxQyxRQUFyQztBQUNBLE9BQU9DLEVBQVAsTUFBZSxJQUFmO0FBQ0EsU0FBU0MsU0FBVCxRQUEwQixNQUExQjtBQUNBLE9BQU9DLElBQVAsTUFBaUIsTUFBakI7QUFDQSxTQUFTQyxTQUFULFFBQTBCLGVBQTFCO0FBQ0EsU0FBU0MsS0FBVCxRQUFzQix5QkFBdEI7QUFxQkEsTUFBTUMsU0FBYSxHQUFHO0VBQ3BCQyxJQUFJLEVBQUVMLFNBQVMsQ0FBQ0QsRUFBRSxDQUFDTSxJQUFKLENBREs7RUFFcEJDLFFBQVEsRUFB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