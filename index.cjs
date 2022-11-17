"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _ignore = _interopRequireDefault(require("ignore"));

var _fs = _interopRequireDefault(require("fs"));

var _util = require("util");

var _path = _interopRequireDefault(require("path"));

var _child_process = require("child_process");

var _promisifyChildProcess = require("promisify-child-process");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var defaultFs = {
  stat: (0, _util.promisify)(_fs["default"].stat),
  statSync: _fs["default"].statSync,
  readFile: (0, _util.promisify)(_fs["default"].readFile),
  readFileSync: _fs["default"].readFileSync
};
var defaultGit = {
  getCoreExcludesFile: function getCoreExcludesFile(_ref) {
    return (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var cwd, _stdout$toString, _yield$spawn, stdout;

      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              cwd = _ref.cwd;
              _context.prev = 1;
              _context.next = 4;
              return (0, _promisifyChildProcess.spawn)('git', ['config', '--get', 'core.excludesFile'], {
                cwd: cwd,
                maxBuffer: 1024 * 1024
              });

            case 4:
              _yield$spawn = _context.sent;
              stdout = _yield$spawn.stdout;
              return _context.abrupt("return", stdout === null || stdout === void 0 ? void 0 : (_stdout$toString = stdout.toString()) === null || _stdout$toString === void 0 ? void 0 : _stdout$toString.trim());

            case 9:
              _context.prev = 9;
              _context.t0 = _context["catch"](1);
              return _context.abrupt("return", undefined);

            case 12:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, null, [[1, 9]]);
    }))();
  },
  getCoreExcludesFileSync: function getCoreExcludesFileSync(_ref2) {
    var cwd = _ref2.cwd;

    try {
      var _spawnSync$stdout, _spawnSync$stdout$toS;

      return (_spawnSync$stdout = (0, _child_process.spawnSync)('git', ['config', '--get', 'core.excludesFile'], {
        cwd: cwd,
        maxBuffer: 1024 * 1024
      }).stdout) === null || _spawnSync$stdout === void 0 ? void 0 : (_spawnSync$stdout$toS = _spawnSync$stdout.toString()) === null || _spawnSync$stdout$toS === void 0 ? void 0 : _spawnSync$stdout$toS.trim();
    } catch (error) {
      return undefined;
    }
  }
};

function normalizeInputPath(path) {
  var result = _path["default"].normalize(_path["default"].resolve(path));

  return path.endsWith('/') ? result + '/' : result;
}

function relativePath(from, to) {
  return to.endsWith('/') ? _path["default"].relative(from, to) + '/' : _path["default"].relative(from, to);
}

var DirectoryEntry = /*#__PURE__*/function () {
  function DirectoryEntry(rootDir) {
    (0, _classCallCheck2["default"])(this, DirectoryEntry);
    (0, _defineProperty2["default"])(this, "ignore", void 0);
    (0, _defineProperty2["default"])(this, "rootDir", void 0);
    (0, _defineProperty2["default"])(this, "loadedRules", []);
    this.rootDir = rootDir;
    this.ignore = (0, _ignore["default"])();
  }

  (0, _createClass2["default"])(DirectoryEntry, [{
    key: "ignores",
    value: function ignores(path) {
      return path !== this.rootDir && this.ignore.ignores(relativePath(this.rootDir, path));
    }
  }, {
    key: "add",
    value: function add(rules, options) {
      if (rules instanceof DirectoryEntry) {
        this.add(rules.loadedRules, options);
      } else {
        if ((options === null || options === void 0 ? void 0 : options.addToLoadedRules) !== false) {
          var _iterator = _createForOfIteratorHelper(rules),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var rule = _step.value;
              this.loadedRules.push(rule);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        }

        this.ignore.add(rules);
      }
    }
  }]);
  return DirectoryEntry;
}();

function prefixGitignoreRules(rules, rulesDir, rootDir) {
  var prefix = _path["default"].relative(rootDir, rulesDir).replace(/\\/g, '/');

  return rules.map(function prefixRule(rule) {
    if (rule.startsWith('#') || !/\S/.test(rule)) return rule;
    if (rule.startsWith('!')) return '!' + prefixRule(rule.substring(1));
    return /\/\S/.test(rule) ? "".concat(prefix, "/").concat(rule.replace(/^\//, '')) : "".concat(prefix, "/**/").concat(rule);
  });
}

var Gitignore = /*#__PURE__*/function () {
  function Gitignore() {
    var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref3$fs = _ref3.fs,
        fs = _ref3$fs === void 0 ? defaultFs : _ref3$fs,
        _ref3$git = _ref3.git,
        git = _ref3$git === void 0 ? defaultGit : _ref3$git,
        _ref3$env = _ref3.env,
        env = _ref3$env === void 0 ? process.env : _ref3$env,
        initialRules = _ref3.initialRules,
        finalRules = _ref3.finalRules;

    (0, _classCallCheck2["default"])(this, Gitignore);
    (0, _defineProperty2["default"])(this, "fs", void 0);
    (0, _defineProperty2["default"])(this, "git", void 0);
    (0, _defineProperty2["default"])(this, "env", void 0);
    (0, _defineProperty2["default"])(this, "directories", {});
    (0, _defineProperty2["default"])(this, "directoriesAsync", {});
    (0, _defineProperty2["default"])(this, "initialRules", void 0);
    (0, _defineProperty2["default"])(this, "finalRules", void 0);
    this.fs = fs;
    this.git = git;
    this.env = env;
    this.initialRules = initialRules;
    this.finalRules = finalRules;
  }

  (0, _createClass2["default"])(Gitignore, [{
    key: "clearCache",
    value: function clearCache() {
      this.directories = {};
      this.directoriesAsync = {};
    }
  }, {
    key: "ignores",
    value: function () {
      var _ignores = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(path) {
        var dirEntry;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                path = normalizeInputPath(path);
                _context2.next = 3;
                return this.getDirectoryEntry(path.endsWith('/') ? _path["default"].dirname(path) : path);

              case 3:
                dirEntry = _context2.sent;
                return _context2.abrupt("return", dirEntry.ignores(path));

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function ignores(_x) {
        return _ignores.apply(this, arguments);
      }

      return ignores;
    }()
  }, {
    key: "ignoresSync",
    value: function ignoresSync(path) {
      path = normalizeInputPath(path);
      var dirEntry = this.getDirectoryEntrySync(path.endsWith('/') ? _path["default"].dirname(path) : path);
      return dirEntry.ignores(path);
    }
  }, {
    key: "getDirectoryEntrySync",
    value: function getDirectoryEntrySync(dir) {
      var cached = this.directories[dir];

      if (!cached) {
        cached = this.createDirectoryEntrySync(dir);
        this.directories[dir] = cached;
        this.directoriesAsync[dir] = Promise.resolve(cached);
      }

      return cached;
    }
  }, {
    key: "getDirectoryEntry",
    value: function () {
      var _getDirectoryEntry = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(dir) {
        var _this = this;

        var cached;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                cached = this.directoriesAsync[dir];

                if (!cached) {
                  cached = this.createDirectoryEntry(dir);
                  this.directoriesAsync[dir] = cached;
                  cached.then(function (entry) {
                    if (_this.directoriesAsync[dir] === cached) _this.directories[dir] = entry;
                  });
                }

                return _context3.abrupt("return", cached);

              case 3:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function getDirectoryEntry(_x2) {
        return _getDirectoryEntry.apply(this, arguments);
      }

      return getDirectoryEntry;
    }()
  }, {
    key: "createDirectoryEntrySync",
    value: function createDirectoryEntrySync(dir) {
      if (this.isRoot(dir) || this.isGitRootSync(dir)) {
        return this.createRootDirectoryEntrySync(dir);
      }

      var parentEntry = this.getDirectoryEntrySync(_path["default"].dirname(dir));

      var gitignore = _path["default"].join(dir, '.gitignore');

      if (parentEntry.ignores(dir + '/') || !this.isFileSync(gitignore)) return parentEntry;
      var rootDir = parentEntry.rootDir;
      var entry = new DirectoryEntry(rootDir);
      if (this.initialRules) entry.add(this.initialRules, {
        addToLoadedRules: false
      });
      entry.add(parentEntry);
      var gitignoreRules = this.parseGitignoreSync(gitignore);
      entry.add(prefixGitignoreRules(gitignoreRules, dir, rootDir));
      if (this.finalRules) entry.add(this.finalRules, {
        addToLoadedRules: false
      });
      return entry;
    }
  }, {
    key: "createDirectoryEntry",
    value: function () {
      var _createDirectoryEntry = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(dir) {
        var parentEntry, gitignore, rootDir, entry, gitignoreRules;
        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.t0 = this.isRoot(dir);

                if (_context4.t0) {
                  _context4.next = 5;
                  break;
                }

                _context4.next = 4;
                return this.isGitRoot(dir);

              case 4:
                _context4.t0 = _context4.sent;

              case 5:
                if (!_context4.t0) {
                  _context4.next = 9;
                  break;
                }

                _context4.next = 8;
                return this.createRootDirectoryEntry(dir);

              case 8:
                return _context4.abrupt("return", _context4.sent);

              case 9:
                _context4.next = 11;
                return this.getDirectoryEntry(_path["default"].dirname(dir));

              case 11:
                parentEntry = _context4.sent;
                gitignore = _path["default"].join(dir, '.gitignore');
                _context4.t1 = parentEntry.ignores(dir + '/');

                if (_context4.t1) {
                  _context4.next = 18;
                  break;
                }

                _context4.next = 17;
                return this.isFile(gitignore);

              case 17:
                _context4.t1 = !_context4.sent;

              case 18:
                if (!_context4.t1) {
                  _context4.next = 20;
                  break;
                }

                return _context4.abrupt("return", parentEntry);

              case 20:
                rootDir = parentEntry.rootDir;
                entry = new DirectoryEntry(rootDir);
                if (this.initialRules) entry.add(this.initialRules, {
                  addToLoadedRules: false
                });
                entry.add(parentEntry);
                _context4.next = 26;
                return this.parseGitignore(gitignore);

              case 26:
                gitignoreRules = _context4.sent;
                entry.add(prefixGitignoreRules(gitignoreRules, dir, rootDir));
                if (this.finalRules) entry.add(this.finalRules, {
                  addToLoadedRules: false
                });
                return _context4.abrupt("return", entry);

              case 30:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function createDirectoryEntry(_x3) {
        return _createDirectoryEntry.apply(this, arguments);
      }

      return createDirectoryEntry;
    }()
  }, {
    key: "getGitDir",
    value: function getGitDir() {
      var GIT_DIR = this.env.GIT_DIR;
      return GIT_DIR ? _path["default"].resolve(GIT_DIR) : undefined;
    }
  }, {
    key: "createRootDirectoryEntrySync",
    value: function createRootDirectoryEntrySync(dir) {
      var _this2 = this;

      var entry = new DirectoryEntry(dir);
      if (this.initialRules) entry.add(this.initialRules, {
        addToLoadedRules: false
      });
      entry.add(['.git']);

      var addGitignoreRules = function addGitignoreRules(file) {
        var rules;

        try {
          rules = _this2.parseGitignoreSync(file);
        } catch (error) {
          return;
        }

        entry.add(rules);
      };

      var coreExcludesFile = this.git.getCoreExcludesFileSync({
        cwd: dir
      });
      if (coreExcludesFile) addGitignoreRules(coreExcludesFile);
      var GIT_DIR = this.getGitDir();

      if (GIT_DIR && dir === _path["default"].dirname(GIT_DIR)) {
        addGitignoreRules(_path["default"].join(GIT_DIR, 'info', 'exclude'));
      } else {
        addGitignoreRules(_path["default"].join(dir, '.git', 'info', 'exclude'));
      }

      addGitignoreRules(_path["default"].join(dir, '.gitignore'));
      if (this.finalRules) entry.add(this.finalRules, {
        addToLoadedRules: false
      });
      return entry;
    }
  }, {
    key: "createRootDirectoryEntry",
    value: function () {
      var _createRootDirectoryEntry = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(dir) {
        var _this3 = this;

        var entry, addGitignoreRules, coreExcludesFile, GIT_DIR;
        return _regenerator["default"].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                entry = new DirectoryEntry(dir);
                if (this.initialRules) entry.add(this.initialRules, {
                  addToLoadedRules: false
                });
                entry.add(['.git']);

                addGitignoreRules = /*#__PURE__*/function () {
                  var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(file) {
                    var rules;
                    return _regenerator["default"].wrap(function _callee5$(_context5) {
                      while (1) {
                        switch (_context5.prev = _context5.next) {
                          case 0:
                            _context5.prev = 0;
                            _context5.next = 3;
                            return _this3.parseGitignore(file);

                          case 3:
                            rules = _context5.sent;
                            _context5.next = 9;
                            break;

                          case 6:
                            _context5.prev = 6;
                            _context5.t0 = _context5["catch"](0);
                            return _context5.abrupt("return");

                          case 9:
                            entry.add(rules);

                          case 10:
                          case "end":
                            return _context5.stop();
                        }
                      }
                    }, _callee5, null, [[0, 6]]);
                  }));

                  return function addGitignoreRules(_x5) {
                    return _ref4.apply(this, arguments);
                  };
                }();

                _context6.next = 6;
                return this.git.getCoreExcludesFile({
                  cwd: dir
                });

              case 6:
                coreExcludesFile = _context6.sent;

                if (!coreExcludesFile) {
                  _context6.next = 10;
                  break;
                }

                _context6.next = 10;
                return addGitignoreRules(coreExcludesFile);

              case 10:
                GIT_DIR = this.getGitDir();

                if (!(GIT_DIR && dir === _path["default"].dirname(GIT_DIR))) {
                  _context6.next = 16;
                  break;
                }

                _context6.next = 14;
                return addGitignoreRules(_path["default"].join(GIT_DIR, 'info', 'exclude'));

              case 14:
                _context6.next = 18;
                break;

              case 16:
                _context6.next = 18;
                return addGitignoreRules(_path["default"].join(dir, '.git', 'info', 'exclude'));

              case 18:
                _context6.next = 20;
                return addGitignoreRules(_path["default"].join(dir, '.gitignore'));

              case 20:
                if (this.finalRules) entry.add(this.finalRules, {
                  addToLoadedRules: false
                });
                return _context6.abrupt("return", entry);

              case 22:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function createRootDirectoryEntry(_x4) {
        return _createRootDirectoryEntry.apply(this, arguments);
      }

      return createRootDirectoryEntry;
    }()
  }, {
    key: "parseGitignoreSync",
    value: function parseGitignoreSync(path) {
      return this.fs.readFileSync(path, 'utf8').split(/\r\n?|\n/gm);
    }
  }, {
    key: "parseGitignore",
    value: function () {
      var _parseGitignore = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(path) {
        return _regenerator["default"].wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.next = 2;
                return this.fs.readFile(path, 'utf8');

              case 2:
                return _context7.abrupt("return", _context7.sent.split(/\r\n?|\n/gm));

              case 3:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function parseGitignore(_x6) {
        return _parseGitignore.apply(this, arguments);
      }

      return parseGitignore;
    }()
  }, {
    key: "isFileSync",
    value: function isFileSync(path) {
      try {
        var stats = this.fs.statSync(path);
        return stats.isFile();
      } catch (error) {
        return false;
      }
    }
  }, {
    key: "isFile",
    value: function () {
      var _isFile = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(path) {
        var stats;
        return _regenerator["default"].wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.prev = 0;
                _context8.next = 3;
                return this.fs.stat(path);

              case 3:
                stats = _context8.sent;
                return _context8.abrupt("return", stats.isFile());

              case 7:
                _context8.prev = 7;
                _context8.t0 = _context8["catch"](0);
                return _context8.abrupt("return", false);

              case 10:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this, [[0, 7]]);
      }));

      function isFile(_x7) {
        return _isFile.apply(this, arguments);
      }

      return isFile;
    }()
  }, {
    key: "isDirectorySync",
    value: function isDirectorySync(path) {
      try {
        var stats = this.fs.statSync(path);
        return stats.isDirectory();
      } catch (error) {
        return false;
      }
    }
  }, {
    key: "isDirectory",
    value: function () {
      var _isDirectory = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(path) {
        var stats;
        return _regenerator["default"].wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.prev = 0;
                _context9.next = 3;
                return this.fs.stat(path);

              case 3:
                stats = _context9.sent;
                return _context9.abrupt("return", stats.isDirectory());

              case 7:
                _context9.prev = 7;
                _context9.t0 = _context9["catch"](0);
                return _context9.abrupt("return", false);

              case 10:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this, [[0, 7]]);
      }));

      function isDirectory(_x8) {
        return _isDirectory.apply(this, arguments);
      }

      return isDirectory;
    }()
  }, {
    key: "isRoot",
    value: function isRoot(dir) {
      return dir === _path["default"].parse(dir).root;
    }
  }, {
    key: "isGitRootSync",
    value: function isGitRootSync(dir) {
      var GIT_DIR = this.getGitDir();
      return GIT_DIR ? dir === _path["default"].dirname(GIT_DIR) : this.isDirectorySync(_path["default"].join(dir, '.git'));
    }
  }, {
    key: "isGitRoot",
    value: function () {
      var _isGitRoot = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10(dir) {
        var GIT_DIR;
        return _regenerator["default"].wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                GIT_DIR = this.getGitDir();

                if (!GIT_DIR) {
                  _context10.next = 5;
                  break;
                }

                _context10.t0 = dir === _path["default"].dirname(GIT_DIR);
                _context10.next = 8;
                break;

              case 5:
                _context10.next = 7;
                return this.isDirectory(_path["default"].join(dir, '.git'));

              case 7:
                _context10.t0 = _context10.sent;

              case 8:
                return _context10.abrupt("return", _context10.t0);

              case 9:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function isGitRoot(_x9) {
        return _isGitRoot.apply(this, arguments);
      }

      return isGitRoot;
    }()
  }]);
  return Gitignore;
}();

exports["default"] = Gitignore;
module.exports = exports.default;