(function() {
  var ApplicationMenu, AtomApplication, AtomProtocolHandler, AtomWindow, AutoUpdateManager, BrowserWindow, CompositeDisposable, Config, ConfigSchema, Disposable, EventEmitter, FileRecoveryService, FindParentDir, LocationSuffixRegExp, Menu, Resolve, StorageFolder, _, app, dialog, fs, ipcHelpers, ipcMain, net, os, path, ref, ref1, screen, shell, url,
    slice = [].slice;

  AtomWindow = require('./atom-window');

  ApplicationMenu = require('./application-menu');

  AtomProtocolHandler = require('./atom-protocol-handler');

  AutoUpdateManager = require('./auto-update-manager');

  StorageFolder = require('../storage-folder');

  Config = require('../config');

  FileRecoveryService = require('./file-recovery-service');

  ipcHelpers = require('../ipc-helpers');

  ref = require('electron'), BrowserWindow = ref.BrowserWindow, Menu = ref.Menu, app = ref.app, dialog = ref.dialog, ipcMain = ref.ipcMain, shell = ref.shell, screen = ref.screen;

  ref1 = require('event-kit'), CompositeDisposable = ref1.CompositeDisposable, Disposable = ref1.Disposable;

  fs = require('fs-plus');

  path = require('path');

  os = require('os');

  net = require('net');

  url = require('url');

  EventEmitter = require('events').EventEmitter;

  _ = require('underscore-plus');

  FindParentDir = null;

  Resolve = null;

  ConfigSchema = require('../config-schema');

  LocationSuffixRegExp = /(:\d+)(:\d+)?$/;

  module.exports = AtomApplication = (function() {
    Object.assign(AtomApplication.prototype, EventEmitter.prototype);

    AtomApplication.open = function(options) {
      var client, userNameSafe;
      if (options.socketPath == null) {
        if (process.platform === 'win32') {
          userNameSafe = new Buffer(process.env.USERNAME).toString('base64');
          options.socketPath = "\\\\.\\pipe\\atom-" + options.version + "-" + userNameSafe + "-" + process.arch + "-sock";
        } else {
          options.socketPath = path.join(os.tmpdir(), "atom-" + options.version + "-" + process.env.USER + ".sock");
        }
      }
      if ((process.platform !== 'win32' && !fs.existsSync(options.socketPath)) || options.test || options.benchmark || options.benchmarkTest) {
        new AtomApplication(options).initialize(options);
        return;
      }
      client = net.connect({
        path: options.socketPath
      }, function() {
        return client.write(JSON.stringify(options), function() {
          client.end();
          return app.quit();
        });
      });
      return client.on('error', function() {
        return new AtomApplication(options).initialize(options);
      });
    };

    AtomApplication.prototype.windows = null;

    AtomApplication.prototype.applicationMenu = null;

    AtomApplication.prototype.atomProtocolHandler = null;

    AtomApplication.prototype.resourcePath = null;

    AtomApplication.prototype.version = null;

    AtomApplication.prototype.quitting = false;

    AtomApplication.prototype.exit = function(status) {
      return app.exit(status);
    };

    function AtomApplication(options) {
      this.resourcePath = options.resourcePath, this.devResourcePath = options.devResourcePath, this.version = options.version, this.devMode = options.devMode, this.safeMode = options.safeMode, this.socketPath = options.socketPath, this.logFile = options.logFile, this.userDataDir = options.userDataDir;
      if (options.test || options.benchmark || options.benchmarkTest) {
        this.socketPath = null;
      }
      this.pidsToOpenWindows = {};
      this.windows = [];
      this.config = new Config({
        enablePersistence: true
      });
      this.config.setSchema(null, {
        type: 'object',
        properties: _.clone(ConfigSchema)
      });
      ConfigSchema.projectHome = {
        type: 'string',
        "default": path.join(fs.getHomeDirectory(), 'github'),
        description: 'The directory where projects are assumed to be located. Packages created using the Package Generator will be stored here by default.'
      };
      this.config.initialize({
        configDirPath: process.env.ATOM_HOME,
        resourcePath: this.resourcePath,
        projectHomeSchema: ConfigSchema.projectHome
      });
      this.config.load();
      this.fileRecoveryService = new FileRecoveryService(path.join(process.env.ATOM_HOME, "recovery"));
      this.storageFolder = new StorageFolder(process.env.ATOM_HOME);
      this.autoUpdateManager = new AutoUpdateManager(this.version, options.test || options.benchmark || options.benchmarkTest, this.config);
      this.disposable = new CompositeDisposable;
      this.handleEvents();
    }

    AtomApplication.prototype.initialize = function(options) {
      global.atomApplication = this;
      if (process.platform === 'darwin' && this.config.get('core.useCustomTitleBar')) {
        this.config.unset('core.useCustomTitleBar');
        this.config.set('core.titleBar', 'custom');
      }
      this.config.onDidChange('core.titleBar', this.promptForRestart.bind(this));
      process.nextTick((function(_this) {
        return function() {
          return _this.autoUpdateManager.initialize();
        };
      })(this));
      this.applicationMenu = new ApplicationMenu(this.version, this.autoUpdateManager);
      this.atomProtocolHandler = new AtomProtocolHandler(this.resourcePath, this.safeMode);
      this.listenForArgumentsFromNewProcess();
      this.setupDockMenu();
      return this.launch(options);
    };

    AtomApplication.prototype.destroy = function() {
      var windowsClosePromises;
      windowsClosePromises = this.windows.map(function(window) {
        window.close();
        return window.closedPromise;
      });
      return Promise.all(windowsClosePromises).then((function(_this) {
        return function() {
          return _this.disposable.dispose();
        };
      })(this));
    };

    AtomApplication.prototype.launch = function(options) {
      var ref2, ref3;
      if (((ref2 = options.pathsToOpen) != null ? ref2.length : void 0) > 0 || ((ref3 = options.urlsToOpen) != null ? ref3.length : void 0) > 0 || options.test || options.benchmark || options.benchmarkTest) {
        if (this.config.get('core.restorePreviousWindowsOnStart') === 'always') {
          this.loadState(_.deepClone(options));
        }
        return this.openWithOptions(options);
      } else {
        return this.loadState(options) || this.openPath(options);
      }
    };

    AtomApplication.prototype.openWithOptions = function(options) {
      var addToLastWindow, benchmark, benchmarkTest, clearWindowState, devMode, env, executedFrom, i, initialPaths, len, logFile, newWindow, pathsToOpen, pidToKillWhenClosed, profileStartup, results, safeMode, test, timeout, urlToOpen, urlsToOpen;
      initialPaths = options.initialPaths, pathsToOpen = options.pathsToOpen, executedFrom = options.executedFrom, urlsToOpen = options.urlsToOpen, benchmark = options.benchmark, benchmarkTest = options.benchmarkTest, test = options.test, pidToKillWhenClosed = options.pidToKillWhenClosed, devMode = options.devMode, safeMode = options.safeMode, newWindow = options.newWindow, logFile = options.logFile, profileStartup = options.profileStartup, timeout = options.timeout, clearWindowState = options.clearWindowState, addToLastWindow = options.addToLastWindow, env = options.env;
      app.focus();
      if (test) {
        return this.runTests({
          headless: true,
          devMode: devMode,
          resourcePath: this.resourcePath,
          executedFrom: executedFrom,
          pathsToOpen: pathsToOpen,
          logFile: logFile,
          timeout: timeout,
          env: env
        });
      } else if (benchmark || benchmarkTest) {
        return this.runBenchmarks({
          headless: true,
          test: benchmarkTest,
          resourcePath: this.resourcePath,
          executedFrom: executedFrom,
          pathsToOpen: pathsToOpen,
          timeout: timeout,
          env: env
        });
      } else if (pathsToOpen.length > 0) {
        return this.openPaths({
          initialPaths: initialPaths,
          pathsToOpen: pathsToOpen,
          executedFrom: executedFrom,
          pidToKillWhenClosed: pidToKillWhenClosed,
          newWindow: newWindow,
          devMode: devMode,
          safeMode: safeMode,
          profileStartup: profileStartup,
          clearWindowState: clearWindowState,
          addToLastWindow: addToLastWindow,
          env: env
        });
      } else if (urlsToOpen.length > 0) {
        results = [];
        for (i = 0, len = urlsToOpen.length; i < len; i++) {
          urlToOpen = urlsToOpen[i];
          results.push(this.openUrl({
            urlToOpen: urlToOpen,
            devMode: devMode,
            safeMode: safeMode,
            env: env
          }));
        }
        return results;
      } else {
        return this.openPath({
          initialPaths: initialPaths,
          pidToKillWhenClosed: pidToKillWhenClosed,
          newWindow: newWindow,
          devMode: devMode,
          safeMode: safeMode,
          profileStartup: profileStartup,
          clearWindowState: clearWindowState,
          addToLastWindow: addToLastWindow,
          env: env
        });
      }
    };

    AtomApplication.prototype.removeWindow = function(window) {
      var ref2, ref3;
      this.windows.splice(this.windows.indexOf(window), 1);
      if (this.windows.length === 0) {
        if ((ref2 = this.applicationMenu) != null) {
          ref2.enableWindowSpecificItems(false);
        }
        if ((ref3 = process.platform) === 'win32' || ref3 === 'linux') {
          app.quit();
          return;
        }
      }
      if (!window.isSpec) {
        return this.saveState(true);
      }
    };

    AtomApplication.prototype.addWindow = function(window) {
      var blurHandler, focusHandler, ref2;
      this.windows.push(window);
      if ((ref2 = this.applicationMenu) != null) {
        ref2.addWindow(window.browserWindow);
      }
      window.once('window:loaded', (function(_this) {
        return function() {
          var ref3;
          return (ref3 = _this.autoUpdateManager) != null ? ref3.emitUpdateAvailableEvent(window) : void 0;
        };
      })(this));
      if (!window.isSpec) {
        focusHandler = (function(_this) {
          return function() {
            return _this.lastFocusedWindow = window;
          };
        })(this);
        blurHandler = (function(_this) {
          return function() {
            return _this.saveState(false);
          };
        })(this);
        window.browserWindow.on('focus', focusHandler);
        window.browserWindow.on('blur', blurHandler);
        window.browserWindow.once('closed', (function(_this) {
          return function() {
            if (window === _this.lastFocusedWindow) {
              _this.lastFocusedWindow = null;
            }
            window.browserWindow.removeListener('focus', focusHandler);
            return window.browserWindow.removeListener('blur', blurHandler);
          };
        })(this));
        return window.browserWindow.webContents.once('did-finish-load', (function(_this) {
          return function() {
            return _this.saveState(false);
          };
        })(this));
      }
    };

    AtomApplication.prototype.listenForArgumentsFromNewProcess = function() {
      var server;
      if (this.socketPath == null) {
        return;
      }
      this.deleteSocketFile();
      server = net.createServer((function(_this) {
        return function(connection) {
          var data;
          data = '';
          connection.on('data', function(chunk) {
            return data = data + chunk;
          });
          return connection.on('end', function() {
            var options;
            options = JSON.parse(data);
            return _this.openWithOptions(options);
          });
        };
      })(this));
      server.listen(this.socketPath);
      return server.on('error', function(error) {
        return console.error('Application server failed', error);
      });
    };

    AtomApplication.prototype.deleteSocketFile = function() {
      var error;
      if (process.platform === 'win32' || (this.socketPath == null)) {
        return;
      }
      if (fs.existsSync(this.socketPath)) {
        try {
          return fs.unlinkSync(this.socketPath);
        } catch (error1) {
          error = error1;
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }
    };

    AtomApplication.prototype.handleEvents = function() {
      var clipboard, getLoadSettings;
      getLoadSettings = (function(_this) {
        return function() {
          var ref2, ref3;
          return {
            devMode: (ref2 = _this.focusedWindow()) != null ? ref2.devMode : void 0,
            safeMode: (ref3 = _this.focusedWindow()) != null ? ref3.safeMode : void 0
          };
        };
      })(this);
      this.on('application:quit', function() {
        return app.quit();
      });
      this.on('application:new-window', function() {
        return this.openPath(getLoadSettings());
      });
      this.on('application:new-file', function() {
        var ref2;
        return ((ref2 = this.focusedWindow()) != null ? ref2 : this).openPath();
      });
      this.on('application:open-dev', function() {
        return this.promptForPathToOpen('all', {
          devMode: true
        });
      });
      this.on('application:open-safe', function() {
        return this.promptForPathToOpen('all', {
          safeMode: true
        });
      });
      this.on('application:inspect', function(arg) {
        var atomWindow, x, y;
        x = arg.x, y = arg.y, atomWindow = arg.atomWindow;
        if (atomWindow == null) {
          atomWindow = this.focusedWindow();
        }
        return atomWindow != null ? atomWindow.browserWindow.inspectElement(x, y) : void 0;
      });
      this.on('application:open-documentation', function() {
        return shell.openExternal('http://flight-manual.atom.io/');
      });
      this.on('application:open-discussions', function() {
        return shell.openExternal('https://discuss.atom.io');
      });
      this.on('application:open-faq', function() {
        return shell.openExternal('https://atom.io/faq');
      });
      this.on('application:open-terms-of-use', function() {
        return shell.openExternal('https://atom.io/terms');
      });
      this.on('application:report-issue', function() {
        return shell.openExternal('https://github.com/atom/atom/blob/master/CONTRIBUTING.md#reporting-bugs');
      });
      this.on('application:search-issues', function() {
        return shell.openExternal('https://github.com/search?q=+is%3Aissue+user%3Aatom');
      });
      this.on('application:install-update', (function(_this) {
        return function() {
          _this.quitting = true;
          return _this.autoUpdateManager.install();
        };
      })(this));
      this.on('application:check-for-update', (function(_this) {
        return function() {
          return _this.autoUpdateManager.check();
        };
      })(this));
      if (process.platform === 'darwin') {
        this.on('application:bring-all-windows-to-front', function() {
          return Menu.sendActionToFirstResponder('arrangeInFront:');
        });
        this.on('application:hide', function() {
          return Menu.sendActionToFirstResponder('hide:');
        });
        this.on('application:hide-other-applications', function() {
          return Menu.sendActionToFirstResponder('hideOtherApplications:');
        });
        this.on('application:minimize', function() {
          return Menu.sendActionToFirstResponder('performMiniaturize:');
        });
        this.on('application:unhide-all-applications', function() {
          return Menu.sendActionToFirstResponder('unhideAllApplications:');
        });
        this.on('application:zoom', function() {
          return Menu.sendActionToFirstResponder('zoom:');
        });
      } else {
        this.on('application:minimize', function() {
          var ref2;
          return (ref2 = this.focusedWindow()) != null ? ref2.minimize() : void 0;
        });
        this.on('application:zoom', function() {
          var ref2;
          return (ref2 = this.focusedWindow()) != null ? ref2.maximize() : void 0;
        });
      }
      this.openPathOnEvent('application:about', 'atom://about');
      this.openPathOnEvent('application:show-settings', 'atom://config');
      this.openPathOnEvent('application:open-your-config', 'atom://.atom/config');
      this.openPathOnEvent('application:open-your-init-script', 'atom://.atom/init-script');
      this.openPathOnEvent('application:open-your-keymap', 'atom://.atom/keymap');
      this.openPathOnEvent('application:open-your-snippets', 'atom://.atom/snippets');
      this.openPathOnEvent('application:open-your-stylesheet', 'atom://.atom/stylesheet');
      this.openPathOnEvent('application:open-license', path.join(process.resourcesPath, 'LICENSE.md'));
      this.disposable.add(ipcHelpers.on(app, 'before-quit', (function(_this) {
        return function(event) {
          if (!_this.quitting) {
            event.preventDefault();
            _this.quitting = true;
            return Promise.all(_this.windows.map(function(window) {
              return window.prepareToUnload();
            })).then(function() {
              return app.quit();
            });
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'will-quit', (function(_this) {
        return function() {
          _this.killAllProcesses();
          return _this.deleteSocketFile();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'open-file', (function(_this) {
        return function(event, pathToOpen) {
          event.preventDefault();
          return _this.openPath({
            pathToOpen: pathToOpen
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'open-url', (function(_this) {
        return function(event, urlToOpen) {
          event.preventDefault();
          return _this.openUrl({
            urlToOpen: urlToOpen,
            devMode: _this.devMode,
            safeMode: _this.safeMode
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'activate', (function(_this) {
        return function(event, hasVisibleWindows) {
          if (!hasVisibleWindows) {
            if (event != null) {
              event.preventDefault();
            }
            return _this.emit('application:new-window');
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'restart-application', (function(_this) {
        return function() {
          return _this.restart();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'resolve-proxy', function(event, requestId, url) {
        return event.sender.session.resolveProxy(url, function(proxy) {
          if (!event.sender.isDestroyed()) {
            return event.sender.send('did-resolve-proxy', requestId, proxy);
          }
        });
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'did-change-history-manager', (function(_this) {
        return function(event) {
          var atomWindow, i, len, ref2, results, webContents;
          ref2 = _this.windows;
          results = [];
          for (i = 0, len = ref2.length; i < len; i++) {
            atomWindow = ref2[i];
            webContents = atomWindow.browserWindow.webContents;
            if (webContents !== event.sender) {
              results.push(webContents.send('did-change-history-manager'));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'open', (function(_this) {
        return function(event, options) {
          var ref2, window;
          window = _this.atomWindowForEvent(event);
          if (options != null) {
            if (typeof options.pathsToOpen === 'string') {
              options.pathsToOpen = [options.pathsToOpen];
            }
            if (((ref2 = options.pathsToOpen) != null ? ref2.length : void 0) > 0) {
              options.window = window;
              return _this.openPaths(options);
            } else {
              return new AtomWindow(_this, _this.fileRecoveryService, options);
            }
          } else {
            return _this.promptForPathToOpen('all', {
              window: window
            });
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'update-application-menu', (function(_this) {
        return function(event, template, keystrokesByCommand) {
          var ref2, win;
          win = BrowserWindow.fromWebContents(event.sender);
          return (ref2 = _this.applicationMenu) != null ? ref2.update(win, template, keystrokesByCommand) : void 0;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'run-package-specs', (function(_this) {
        return function(event, packageSpecPath) {
          return _this.runTests({
            resourcePath: _this.devResourcePath,
            pathsToOpen: [packageSpecPath],
            headless: false
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'run-benchmarks', (function(_this) {
        return function(event, benchmarksPath) {
          return _this.runBenchmarks({
            resourcePath: _this.devResourcePath,
            pathsToOpen: [benchmarksPath],
            headless: false,
            test: false
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'command', (function(_this) {
        return function(event, command) {
          return _this.emit(command);
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'open-command', (function(_this) {
        return function() {
          var args, command, defaultPath, event;
          event = arguments[0], command = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
          if (args.length > 0) {
            defaultPath = args[0];
          }
          switch (command) {
            case 'application:open':
              return _this.promptForPathToOpen('all', getLoadSettings(), defaultPath);
            case 'application:open-file':
              return _this.promptForPathToOpen('file', getLoadSettings(), defaultPath);
            case 'application:open-folder':
              return _this.promptForPathToOpen('folder', getLoadSettings(), defaultPath);
            default:
              return console.log("Invalid open-command received: " + command);
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'window-command', function() {
        var args, command, event, win;
        event = arguments[0], command = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
        win = BrowserWindow.fromWebContents(event.sender);
        return win.emit.apply(win, [command].concat(slice.call(args)));
      }));
      this.disposable.add(ipcHelpers.respondTo('window-method', (function(_this) {
        return function() {
          var args, browserWindow, method, ref2;
          browserWindow = arguments[0], method = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
          return (ref2 = _this.atomWindowForBrowserWindow(browserWindow)) != null ? ref2[method].apply(ref2, args) : void 0;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'pick-folder', (function(_this) {
        return function(event, responseChannel) {
          return _this.promptForPath("folder", function(selectedPaths) {
            return event.sender.send(responseChannel, selectedPaths);
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.respondTo('set-window-size', function(win, width, height) {
        return win.setSize(width, height);
      }));
      this.disposable.add(ipcHelpers.respondTo('set-window-position', function(win, x, y) {
        return win.setPosition(x, y);
      }));
      this.disposable.add(ipcHelpers.respondTo('center-window', function(win) {
        return win.center();
      }));
      this.disposable.add(ipcHelpers.respondTo('focus-window', function(win) {
        return win.focus();
      }));
      this.disposable.add(ipcHelpers.respondTo('show-window', function(win) {
        return win.show();
      }));
      this.disposable.add(ipcHelpers.respondTo('hide-window', function(win) {
        return win.hide();
      }));
      this.disposable.add(ipcHelpers.respondTo('get-temporary-window-state', function(win) {
        return win.temporaryState;
      }));
      this.disposable.add(ipcHelpers.respondTo('set-temporary-window-state', function(win, state) {
        return win.temporaryState = state;
      }));
      clipboard = require('../safe-clipboard');
      this.disposable.add(ipcHelpers.on(ipcMain, 'write-text-to-selection-clipboard', function(event, selectedText) {
        return clipboard.writeText(selectedText, 'selection');
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'write-to-stdout', function(event, output) {
        return process.stdout.write(output);
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'write-to-stderr', function(event, output) {
        return process.stderr.write(output);
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'add-recent-document', function(event, filename) {
        return app.addRecentDocument(filename);
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'execute-javascript-in-dev-tools', function(event, code) {
        var ref2;
        return (ref2 = event.sender.devToolsWebContents) != null ? ref2.executeJavaScript(code) : void 0;
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'get-auto-update-manager-state', (function(_this) {
        return function(event) {
          return event.returnValue = _this.autoUpdateManager.getState();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'get-auto-update-manager-error', (function(_this) {
        return function(event) {
          return event.returnValue = _this.autoUpdateManager.getErrorMessage();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'will-save-path', (function(_this) {
        return function(event, path) {
          _this.fileRecoveryService.willSavePath(_this.atomWindowForEvent(event), path);
          return event.returnValue = true;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'did-save-path', (function(_this) {
        return function(event, path) {
          _this.fileRecoveryService.didSavePath(_this.atomWindowForEvent(event), path);
          return event.returnValue = true;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'did-change-paths', (function(_this) {
        return function() {
          return _this.saveState(false);
        };
      })(this)));
      return this.disposable.add(this.disableZoomOnDisplayChange());
    };

    AtomApplication.prototype.setupDockMenu = function() {
      var dockMenu;
      if (process.platform === 'darwin') {
        dockMenu = Menu.buildFromTemplate([
          {
            label: 'New Window',
            click: (function(_this) {
              return function() {
                return _this.emit('application:new-window');
              };
            })(this)
          }
        ]);
        return app.dock.setMenu(dockMenu);
      }
    };

    AtomApplication.prototype.sendCommand = function() {
      var args, command, focusedWindow;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      if (!this.emit.apply(this, [command].concat(slice.call(args)))) {
        focusedWindow = this.focusedWindow();
        if (focusedWindow != null) {
          return focusedWindow.sendCommand.apply(focusedWindow, [command].concat(slice.call(args)));
        } else {
          return this.sendCommandToFirstResponder(command);
        }
      }
    };

    AtomApplication.prototype.sendCommandToWindow = function() {
      var args, atomWindow, command;
      command = arguments[0], atomWindow = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
      if (!this.emit.apply(this, [command].concat(slice.call(args)))) {
        if (atomWindow != null) {
          return atomWindow.sendCommand.apply(atomWindow, [command].concat(slice.call(args)));
        } else {
          return this.sendCommandToFirstResponder(command);
        }
      }
    };

    AtomApplication.prototype.sendCommandToFirstResponder = function(command) {
      if (process.platform !== 'darwin') {
        return false;
      }
      switch (command) {
        case 'core:undo':
          Menu.sendActionToFirstResponder('undo:');
          break;
        case 'core:redo':
          Menu.sendActionToFirstResponder('redo:');
          break;
        case 'core:copy':
          Menu.sendActionToFirstResponder('copy:');
          break;
        case 'core:cut':
          Menu.sendActionToFirstResponder('cut:');
          break;
        case 'core:paste':
          Menu.sendActionToFirstResponder('paste:');
          break;
        case 'core:select-all':
          Menu.sendActionToFirstResponder('selectAll:');
          break;
        default:
          return false;
      }
      return true;
    };

    AtomApplication.prototype.openPathOnEvent = function(eventName, pathToOpen) {
      return this.on(eventName, function() {
        var window;
        if (window = this.focusedWindow()) {
          return window.openPath(pathToOpen);
        } else {
          return this.openPath({
            pathToOpen: pathToOpen
          });
        }
      });
    };

    AtomApplication.prototype.windowForPaths = function(pathsToOpen, devMode) {
      return _.find(this.windows, function(atomWindow) {
        return atomWindow.devMode === devMode && atomWindow.containsPaths(pathsToOpen);
      });
    };

    AtomApplication.prototype.atomWindowForEvent = function(arg) {
      var sender;
      sender = arg.sender;
      return this.atomWindowForBrowserWindow(BrowserWindow.fromWebContents(sender));
    };

    AtomApplication.prototype.atomWindowForBrowserWindow = function(browserWindow) {
      return this.windows.find(function(atomWindow) {
        return atomWindow.browserWindow === browserWindow;
      });
    };

    AtomApplication.prototype.focusedWindow = function() {
      return _.find(this.windows, function(atomWindow) {
        return atomWindow.isFocused();
      });
    };

    AtomApplication.prototype.getWindowOffsetForCurrentPlatform = function() {
      var offsetByPlatform, ref2;
      offsetByPlatform = {
        darwin: 22,
        win32: 26
      };
      return (ref2 = offsetByPlatform[process.platform]) != null ? ref2 : 0;
    };

    AtomApplication.prototype.getDimensionsForNewWindow = function() {
      var dimensions, offset, ref2, ref3, ref4, ref5;
      if ((ref2 = (ref3 = this.focusedWindow()) != null ? ref3 : this.lastFocusedWindow) != null ? ref2.isMaximized() : void 0) {
        return;
      }
      dimensions = (ref4 = (ref5 = this.focusedWindow()) != null ? ref5 : this.lastFocusedWindow) != null ? ref4.getDimensions() : void 0;
      offset = this.getWindowOffsetForCurrentPlatform();
      if ((dimensions != null) && (offset != null)) {
        dimensions.x += offset;
        dimensions.y += offset;
      }
      return dimensions;
    };

    AtomApplication.prototype.openPath = function(arg) {
      var addToLastWindow, clearWindowState, devMode, env, initialPaths, newWindow, pathToOpen, pidToKillWhenClosed, profileStartup, ref2, safeMode, window;
      ref2 = arg != null ? arg : {}, initialPaths = ref2.initialPaths, pathToOpen = ref2.pathToOpen, pidToKillWhenClosed = ref2.pidToKillWhenClosed, newWindow = ref2.newWindow, devMode = ref2.devMode, safeMode = ref2.safeMode, profileStartup = ref2.profileStartup, window = ref2.window, clearWindowState = ref2.clearWindowState, addToLastWindow = ref2.addToLastWindow, env = ref2.env;
      return this.openPaths({
        initialPaths: initialPaths,
        pathsToOpen: [pathToOpen],
        pidToKillWhenClosed: pidToKillWhenClosed,
        newWindow: newWindow,
        devMode: devMode,
        safeMode: safeMode,
        profileStartup: profileStartup,
        window: window,
        clearWindowState: clearWindowState,
        addToLastWindow: addToLastWindow,
        env: env
      });
    };

    AtomApplication.prototype.openPaths = function(arg) {
      var addToLastWindow, clearWindowState, currentWindow, devMode, env, executedFrom, existingWindow, initialPaths, locationToOpen, locationsToOpen, newWindow, openedWindow, pathToOpen, pathsToOpen, pidToKillWhenClosed, profileStartup, ref2, resourcePath, safeMode, stats, window, windowDimensions, windowInitializationScript;
      ref2 = arg != null ? arg : {}, initialPaths = ref2.initialPaths, pathsToOpen = ref2.pathsToOpen, executedFrom = ref2.executedFrom, pidToKillWhenClosed = ref2.pidToKillWhenClosed, newWindow = ref2.newWindow, devMode = ref2.devMode, safeMode = ref2.safeMode, windowDimensions = ref2.windowDimensions, profileStartup = ref2.profileStartup, window = ref2.window, clearWindowState = ref2.clearWindowState, addToLastWindow = ref2.addToLastWindow, env = ref2.env;
      if ((pathsToOpen == null) || pathsToOpen.length === 0) {
        return;
      }
      if (env == null) {
        env = process.env;
      }
      devMode = Boolean(devMode);
      safeMode = Boolean(safeMode);
      clearWindowState = Boolean(clearWindowState);
      locationsToOpen = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = pathsToOpen.length; i < len; i++) {
          pathToOpen = pathsToOpen[i];
          results.push(this.locationForPathToOpen(pathToOpen, executedFrom, addToLastWindow));
        }
        return results;
      }).call(this);
      pathsToOpen = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = locationsToOpen.length; i < len; i++) {
          locationToOpen = locationsToOpen[i];
          results.push(locationToOpen.pathToOpen);
        }
        return results;
      })();
      if (!(pidToKillWhenClosed || newWindow)) {
        existingWindow = this.windowForPaths(pathsToOpen, devMode);
        stats = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = pathsToOpen.length; i < len; i++) {
            pathToOpen = pathsToOpen[i];
            results.push(fs.statSyncNoException(pathToOpen));
          }
          return results;
        })();
        if (existingWindow == null) {
          if (currentWindow = window != null ? window : this.lastFocusedWindow) {
            if (addToLastWindow || currentWindow.devMode === devMode && (stats.every(function(stat) {
              return typeof stat.isFile === "function" ? stat.isFile() : void 0;
            }) || stats.some(function(stat) {
              return (typeof stat.isDirectory === "function" ? stat.isDirectory() : void 0) && !currentWindow.hasProjectPath();
            }))) {
              existingWindow = currentWindow;
            }
          }
        }
      }
      if (existingWindow != null) {
        openedWindow = existingWindow;
        openedWindow.openLocations(locationsToOpen);
        if (openedWindow.isMinimized()) {
          openedWindow.restore();
        } else {
          openedWindow.focus();
        }
        openedWindow.replaceEnvironment(env);
      } else {
        if (devMode) {
          try {
            windowInitializationScript = require.resolve(path.join(this.devResourcePath, 'src', 'initialize-application-window'));
            resourcePath = this.devResourcePath;
          } catch (error1) {}
        }
        if (windowInitializationScript == null) {
          windowInitializationScript = require.resolve('../initialize-application-window');
        }
        if (resourcePath == null) {
          resourcePath = this.resourcePath;
        }
        if (windowDimensions == null) {
          windowDimensions = this.getDimensionsForNewWindow();
        }
        openedWindow = new AtomWindow(this, this.fileRecoveryService, {
          initialPaths: initialPaths,
          locationsToOpen: locationsToOpen,
          windowInitializationScript: windowInitializationScript,
          resourcePath: resourcePath,
          devMode: devMode,
          safeMode: safeMode,
          windowDimensions: windowDimensions,
          profileStartup: profileStartup,
          clearWindowState: clearWindowState,
          env: env
        });
        openedWindow.focus();
        this.lastFocusedWindow = openedWindow;
      }
      if (pidToKillWhenClosed != null) {
        this.pidsToOpenWindows[pidToKillWhenClosed] = openedWindow;
      }
      openedWindow.browserWindow.once('closed', (function(_this) {
        return function() {
          return _this.killProcessForWindow(openedWindow);
        };
      })(this));
      return openedWindow;
    };

    AtomApplication.prototype.killAllProcesses = function() {
      var pid;
      for (pid in this.pidsToOpenWindows) {
        this.killProcess(pid);
      }
    };

    AtomApplication.prototype.killProcessForWindow = function(openedWindow) {
      var pid, ref2, trackedWindow;
      ref2 = this.pidsToOpenWindows;
      for (pid in ref2) {
        trackedWindow = ref2[pid];
        if (trackedWindow === openedWindow) {
          this.killProcess(pid);
        }
      }
    };

    AtomApplication.prototype.killProcess = function(pid) {
      var error, parsedPid, ref2;
      try {
        parsedPid = parseInt(pid);
        if (isFinite(parsedPid)) {
          process.kill(parsedPid);
        }
      } catch (error1) {
        error = error1;
        if (error.code !== 'ESRCH') {
          console.log("Killing process " + pid + " failed: " + ((ref2 = error.code) != null ? ref2 : error.message));
        }
      }
      return delete this.pidsToOpenWindows[pid];
    };

    AtomApplication.prototype.saveState = function(allowEmpty) {
      var i, len, ref2, states, window;
      if (allowEmpty == null) {
        allowEmpty = false;
      }
      if (this.quitting) {
        return;
      }
      states = [];
      ref2 = this.windows;
      for (i = 0, len = ref2.length; i < len; i++) {
        window = ref2[i];
        if (!window.isSpec) {
          states.push({
            initialPaths: window.representedDirectoryPaths
          });
        }
      }
      if (states.length > 0 || allowEmpty) {
        this.storageFolder.storeSync('application.json', states);
        return this.emit('application:did-save-state');
      }
    };

    AtomApplication.prototype.loadState = function(options) {
      var i, len, ref2, ref3, results, state, states;
      if (((ref2 = this.config.get('core.restorePreviousWindowsOnStart')) === 'yes' || ref2 === 'always') && ((ref3 = (states = this.storageFolder.load('application.json'))) != null ? ref3.length : void 0) > 0) {
        results = [];
        for (i = 0, len = states.length; i < len; i++) {
          state = states[i];
          results.push(this.openWithOptions(Object.assign(options, {
            initialPaths: state.initialPaths,
            pathsToOpen: state.initialPaths.filter(function(directoryPath) {
              return fs.isDirectorySync(directoryPath);
            }),
            urlsToOpen: [],
            devMode: this.devMode,
            safeMode: this.safeMode
          })));
        }
        return results;
      } else {
        return null;
      }
    };

    AtomApplication.prototype.openUrl = function(arg) {
      var PackageManager, devMode, env, pack, packageName, packagePath, safeMode, urlToOpen, windowDimensions, windowInitializationScript;
      urlToOpen = arg.urlToOpen, devMode = arg.devMode, safeMode = arg.safeMode, env = arg.env;
      if (this.packages == null) {
        PackageManager = require('../package-manager');
        this.packages = new PackageManager({});
        this.packages.initialize({
          configDirPath: process.env.ATOM_HOME,
          devMode: devMode,
          resourcePath: this.resourcePath
        });
      }
      packageName = url.parse(urlToOpen).host;
      pack = _.find(this.packages.getAvailablePackageMetadata(), function(arg1) {
        var name;
        name = arg1.name;
        return name === packageName;
      });
      if (pack != null) {
        if (pack.urlMain) {
          packagePath = this.packages.resolvePackagePath(packageName);
          windowInitializationScript = path.resolve(packagePath, pack.urlMain);
          windowDimensions = this.getDimensionsForNewWindow();
          return new AtomWindow(this, this.fileRecoveryService, {
            windowInitializationScript: windowInitializationScript,
            resourcePath: this.resourcePath,
            devMode: devMode,
            safeMode: safeMode,
            urlToOpen: urlToOpen,
            windowDimensions: windowDimensions,
            env: env
          });
        } else {
          return console.log("Package '" + pack.name + "' does not have a url main: " + urlToOpen);
        }
      } else {
        return console.log("Opening unknown url: " + urlToOpen);
      }
    };

    AtomApplication.prototype.runTests = function(arg) {
      var devMode, env, error, executedFrom, headless, i, isSpec, legacyTestRunnerPath, len, logFile, pathToOpen, pathsToOpen, resourcePath, safeMode, testPaths, testRunnerPath, timeout, timeoutHandler, timeoutInSeconds, windowInitializationScript;
      headless = arg.headless, resourcePath = arg.resourcePath, executedFrom = arg.executedFrom, pathsToOpen = arg.pathsToOpen, logFile = arg.logFile, safeMode = arg.safeMode, timeout = arg.timeout, env = arg.env;
      if (resourcePath !== this.resourcePath && !fs.existsSync(resourcePath)) {
        resourcePath = this.resourcePath;
      }
      timeoutInSeconds = Number.parseFloat(timeout);
      if (!Number.isNaN(timeoutInSeconds)) {
        timeoutHandler = function() {
          console.log("The test suite has timed out because it has been running for more than " + timeoutInSeconds + " seconds.");
          return process.exit(124);
        };
        setTimeout(timeoutHandler, timeoutInSeconds * 1000);
      }
      try {
        windowInitializationScript = require.resolve(path.resolve(this.devResourcePath, 'src', 'initialize-test-window'));
      } catch (error1) {
        error = error1;
        windowInitializationScript = require.resolve(path.resolve(__dirname, '..', '..', 'src', 'initialize-test-window'));
      }
      testPaths = [];
      if (pathsToOpen != null) {
        for (i = 0, len = pathsToOpen.length; i < len; i++) {
          pathToOpen = pathsToOpen[i];
          testPaths.push(path.resolve(executedFrom, fs.normalize(pathToOpen)));
        }
      }
      if (testPaths.length === 0) {
        process.stderr.write('Error: Specify at least one test path\n\n');
        process.exit(1);
      }
      legacyTestRunnerPath = this.resolveLegacyTestRunnerPath();
      testRunnerPath = this.resolveTestRunnerPath(testPaths[0]);
      devMode = true;
      isSpec = true;
      if (safeMode == null) {
        safeMode = false;
      }
      return new AtomWindow(this, this.fileRecoveryService, {
        windowInitializationScript: windowInitializationScript,
        resourcePath: resourcePath,
        headless: headless,
        isSpec: isSpec,
        devMode: devMode,
        testRunnerPath: testRunnerPath,
        legacyTestRunnerPath: legacyTestRunnerPath,
        testPaths: testPaths,
        logFile: logFile,
        safeMode: safeMode,
        env: env
      });
    };

    AtomApplication.prototype.runBenchmarks = function(arg) {
      var benchmarkPaths, devMode, env, error, executedFrom, headless, i, isSpec, len, pathToOpen, pathsToOpen, resourcePath, safeMode, test, windowInitializationScript;
      headless = arg.headless, test = arg.test, resourcePath = arg.resourcePath, executedFrom = arg.executedFrom, pathsToOpen = arg.pathsToOpen, env = arg.env;
      if (resourcePath !== this.resourcePath && !fs.existsSync(resourcePath)) {
        resourcePath = this.resourcePath;
      }
      try {
        windowInitializationScript = require.resolve(path.resolve(this.devResourcePath, 'src', 'initialize-benchmark-window'));
      } catch (error1) {
        error = error1;
        windowInitializationScript = require.resolve(path.resolve(__dirname, '..', '..', 'src', 'initialize-benchmark-window'));
      }
      benchmarkPaths = [];
      if (pathsToOpen != null) {
        for (i = 0, len = pathsToOpen.length; i < len; i++) {
          pathToOpen = pathsToOpen[i];
          benchmarkPaths.push(path.resolve(executedFrom, fs.normalize(pathToOpen)));
        }
      }
      if (benchmarkPaths.length === 0) {
        process.stderr.write('Error: Specify at least one benchmark path.\n\n');
        process.exit(1);
      }
      devMode = true;
      isSpec = true;
      safeMode = false;
      return new AtomWindow(this, this.fileRecoveryService, {
        windowInitializationScript: windowInitializationScript,
        resourcePath: resourcePath,
        headless: headless,
        test: test,
        isSpec: isSpec,
        devMode: devMode,
        benchmarkPaths: benchmarkPaths,
        safeMode: safeMode,
        env: env
      });
    };

    AtomApplication.prototype.resolveTestRunnerPath = function(testPath) {
      var packageMetadata, packageRoot, testRunnerPath;
      if (FindParentDir == null) {
        FindParentDir = require('find-parent-dir');
      }
      if (packageRoot = FindParentDir.sync(testPath, 'package.json')) {
        packageMetadata = require(path.join(packageRoot, 'package.json'));
        if (packageMetadata.atomTestRunner) {
          if (Resolve == null) {
            Resolve = require('resolve');
          }
          if (testRunnerPath = Resolve.sync(packageMetadata.atomTestRunner, {
            basedir: packageRoot,
            extensions: Object.keys(require.extensions)
          })) {
            return testRunnerPath;
          } else {
            process.stderr.write("Error: Could not resolve test runner path '" + packageMetadata.atomTestRunner + "'");
            process.exit(1);
          }
        }
      }
      return this.resolveLegacyTestRunnerPath();
    };

    AtomApplication.prototype.resolveLegacyTestRunnerPath = function() {
      var error;
      try {
        return require.resolve(path.resolve(this.devResourcePath, 'spec', 'jasmine-test-runner'));
      } catch (error1) {
        error = error1;
        return require.resolve(path.resolve(__dirname, '..', '..', 'spec', 'jasmine-test-runner'));
      }
    };

    AtomApplication.prototype.locationForPathToOpen = function(pathToOpen, executedFrom, forceAddToWindow) {
      var initialColumn, initialLine, match;
      if (executedFrom == null) {
        executedFrom = '';
      }
      if (!pathToOpen) {
        return {
          pathToOpen: pathToOpen
        };
      }
      pathToOpen = pathToOpen.replace(/[:\s]+$/, '');
      match = pathToOpen.match(LocationSuffixRegExp);
      if (match != null) {
        pathToOpen = pathToOpen.slice(0, -match[0].length);
        if (match[1]) {
          initialLine = Math.max(0, parseInt(match[1].slice(1)) - 1);
        }
        if (match[2]) {
          initialColumn = Math.max(0, parseInt(match[2].slice(1)) - 1);
        }
      } else {
        initialLine = initialColumn = null;
      }
      if (url.parse(pathToOpen).protocol == null) {
        pathToOpen = path.resolve(executedFrom, fs.normalize(pathToOpen));
      }
      return {
        pathToOpen: pathToOpen,
        initialLine: initialLine,
        initialColumn: initialColumn,
        forceAddToWindow: forceAddToWindow
      };
    };

    AtomApplication.prototype.promptForPathToOpen = function(type, arg, path) {
      var devMode, safeMode, window;
      devMode = arg.devMode, safeMode = arg.safeMode, window = arg.window;
      if (path == null) {
        path = null;
      }
      return this.promptForPath(type, ((function(_this) {
        return function(pathsToOpen) {
          return _this.openPaths({
            pathsToOpen: pathsToOpen,
            devMode: devMode,
            safeMode: safeMode,
            window: window
          });
        };
      })(this)), path);
    };

    AtomApplication.prototype.promptForPath = function(type, callback, path) {
      var openOptions, parentWindow, properties;
      properties = (function() {
        switch (type) {
          case 'file':
            return ['openFile'];
          case 'folder':
            return ['openDirectory'];
          case 'all':
            return ['openFile', 'openDirectory'];
          default:
            throw new Error(type + " is an invalid type for promptForPath");
        }
      })();
      parentWindow = process.platform === 'darwin' ? null : BrowserWindow.getFocusedWindow();
      openOptions = {
        properties: properties.concat(['multiSelections', 'createDirectory']),
        title: (function() {
          switch (type) {
            case 'file':
              return 'Open File';
            case 'folder':
              return 'Open Folder';
            default:
              return 'Open';
          }
        })()
      };
      if (path != null) {
        openOptions.defaultPath = path;
      }
      return dialog.showOpenDialog(parentWindow, openOptions, callback);
    };

    AtomApplication.prototype.promptForRestart = function() {
      var chosen;
      chosen = dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'warning',
        title: 'Restart required',
        message: "You will need to restart Atom for this change to take effect.",
        buttons: ['Restart Atom', 'Cancel']
      });
      if (chosen === 0) {
        return this.restart();
      }
    };

    AtomApplication.prototype.restart = function() {
      var args;
      args = [];
      if (this.safeMode) {
        args.push("--safe");
      }
      if (this.logFile != null) {
        args.push("--log-file=" + this.logFile);
      }
      if (this.socketPath != null) {
        args.push("--socket-path=" + this.socketPath);
      }
      if (this.userDataDir != null) {
        args.push("--user-data-dir=" + this.userDataDir);
      }
      if (this.devMode) {
        args.push('--dev');
        args.push("--resource-path=" + this.resourcePath);
      }
      app.relaunch({
        args: args
      });
      return app.quit();
    };

    AtomApplication.prototype.disableZoomOnDisplayChange = function() {
      var outerCallback;
      outerCallback = (function(_this) {
        return function() {
          var i, len, ref2, results, window;
          ref2 = _this.windows;
          results = [];
          for (i = 0, len = ref2.length; i < len; i++) {
            window = ref2[i];
            results.push(window.disableZoom());
          }
          return results;
        };
      })(this);
      screen.on('display-added', outerCallback);
      screen.on('display-removed', outerCallback);
      return new Disposable(function() {
        screen.removeListener('display-added', outerCallback);
        return screen.removeListener('display-removed', outerCallback);
      });
    };

    return AtomApplication;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hdG9tLWFwcGxpY2F0aW9uLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsdVZBQUE7SUFBQTs7RUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLGVBQVI7O0VBQ2IsZUFBQSxHQUFrQixPQUFBLENBQVEsb0JBQVI7O0VBQ2xCLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx5QkFBUjs7RUFDdEIsaUJBQUEsR0FBb0IsT0FBQSxDQUFRLHVCQUFSOztFQUNwQixhQUFBLEdBQWdCLE9BQUEsQ0FBUSxtQkFBUjs7RUFDaEIsTUFBQSxHQUFTLE9BQUEsQ0FBUSxXQUFSOztFQUNULG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx5QkFBUjs7RUFDdEIsVUFBQSxHQUFhLE9BQUEsQ0FBUSxnQkFBUjs7RUFDYixNQUE2RCxPQUFBLENBQVEsVUFBUixDQUE3RCxFQUFDLGlDQUFELEVBQWdCLGVBQWhCLEVBQXNCLGFBQXRCLEVBQTJCLG1CQUEzQixFQUFtQyxxQkFBbkMsRUFBNEMsaUJBQTVDLEVBQW1EOztFQUNuRCxPQUFvQyxPQUFBLENBQVEsV0FBUixDQUFwQyxFQUFDLDhDQUFELEVBQXNCOztFQUN0QixFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEVBQUEsR0FBSyxPQUFBLENBQVEsSUFBUjs7RUFDTCxHQUFBLEdBQU0sT0FBQSxDQUFRLEtBQVI7O0VBQ04sR0FBQSxHQUFNLE9BQUEsQ0FBUSxLQUFSOztFQUNMLGVBQWdCLE9BQUEsQ0FBUSxRQUFSOztFQUNqQixDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLGFBQUEsR0FBZ0I7O0VBQ2hCLE9BQUEsR0FBVTs7RUFDVixZQUFBLEdBQWUsT0FBQSxDQUFRLGtCQUFSOztFQUVmLG9CQUFBLEdBQXVCOztFQU92QixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ0osTUFBTSxDQUFDLE1BQVAsQ0FBYyxlQUFDLENBQUEsU0FBZixFQUEwQixZQUFZLENBQUMsU0FBdkM7O0lBR0EsZUFBQyxDQUFBLElBQUQsR0FBTyxTQUFDLE9BQUQ7QUFDTCxVQUFBO01BQUEsSUFBTywwQkFBUDtRQUNFLElBQUcsT0FBTyxDQUFDLFFBQVIsS0FBb0IsT0FBdkI7VUFDRSxZQUFBLEdBQW1CLElBQUEsTUFBQSxDQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBbkIsQ0FBNEIsQ0FBQyxRQUE3QixDQUFzQyxRQUF0QztVQUNuQixPQUFPLENBQUMsVUFBUixHQUFxQixvQkFBQSxHQUFxQixPQUFPLENBQUMsT0FBN0IsR0FBcUMsR0FBckMsR0FBd0MsWUFBeEMsR0FBcUQsR0FBckQsR0FBd0QsT0FBTyxDQUFDLElBQWhFLEdBQXFFLFFBRjVGO1NBQUEsTUFBQTtVQUlFLE9BQU8sQ0FBQyxVQUFSLEdBQXFCLElBQUksQ0FBQyxJQUFMLENBQVUsRUFBRSxDQUFDLE1BQUgsQ0FBQSxDQUFWLEVBQXVCLE9BQUEsR0FBUSxPQUFPLENBQUMsT0FBaEIsR0FBd0IsR0FBeEIsR0FBMkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUF2QyxHQUE0QyxPQUFuRSxFQUp2QjtTQURGOztNQVdBLElBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUixLQUFzQixPQUF0QixJQUFrQyxDQUFJLEVBQUUsQ0FBQyxVQUFILENBQWMsT0FBTyxDQUFDLFVBQXRCLENBQXZDLENBQUEsSUFBNEUsT0FBTyxDQUFDLElBQXBGLElBQTRGLE9BQU8sQ0FBQyxTQUFwRyxJQUFpSCxPQUFPLENBQUMsYUFBNUg7UUFDTSxJQUFBLGVBQUEsQ0FBZ0IsT0FBaEIsQ0FBd0IsQ0FBQyxVQUF6QixDQUFvQyxPQUFwQztBQUNKLGVBRkY7O01BSUEsTUFBQSxHQUFTLEdBQUcsQ0FBQyxPQUFKLENBQVk7UUFBQyxJQUFBLEVBQU0sT0FBTyxDQUFDLFVBQWY7T0FBWixFQUF3QyxTQUFBO2VBQy9DLE1BQU0sQ0FBQyxLQUFQLENBQWEsSUFBSSxDQUFDLFNBQUwsQ0FBZSxPQUFmLENBQWIsRUFBc0MsU0FBQTtVQUNwQyxNQUFNLENBQUMsR0FBUCxDQUFBO2lCQUNBLEdBQUcsQ0FBQyxJQUFKLENBQUE7UUFGb0MsQ0FBdEM7TUFEK0MsQ0FBeEM7YUFLVCxNQUFNLENBQUMsRUFBUCxDQUFVLE9BQVYsRUFBbUIsU0FBQTtlQUFPLElBQUEsZUFBQSxDQUFnQixPQUFoQixDQUF3QixDQUFDLFVBQXpCLENBQW9DLE9BQXBDO01BQVAsQ0FBbkI7SUFyQks7OzhCQXVCUCxPQUFBLEdBQVM7OzhCQUNULGVBQUEsR0FBaUI7OzhCQUNqQixtQkFBQSxHQUFxQjs7OEJBQ3JCLFlBQUEsR0FBYzs7OEJBQ2QsT0FBQSxHQUFTOzs4QkFDVCxRQUFBLEdBQVU7OzhCQUVWLElBQUEsR0FBTSxTQUFDLE1BQUQ7YUFBWSxHQUFHLENBQUMsSUFBSixDQUFTLE1BQVQ7SUFBWjs7SUFFTyx5QkFBQyxPQUFEO01BQ1YsSUFBQyxDQUFBLHVCQUFBLFlBQUYsRUFBZ0IsSUFBQyxDQUFBLDBCQUFBLGVBQWpCLEVBQWtDLElBQUMsQ0FBQSxrQkFBQSxPQUFuQyxFQUE0QyxJQUFDLENBQUEsa0JBQUEsT0FBN0MsRUFBc0QsSUFBQyxDQUFBLG1CQUFBLFFBQXZELEVBQWlFLElBQUMsQ0FBQSxxQkFBQSxVQUFsRSxFQUE4RSxJQUFDLENBQUEsa0JBQUEsT0FBL0UsRUFBd0YsSUFBQyxDQUFBLHNCQUFBO01BQ3pGLElBQXNCLE9BQU8sQ0FBQyxJQUFSLElBQWdCLE9BQU8sQ0FBQyxTQUF4QixJQUFxQyxPQUFPLENBQUMsYUFBbkU7UUFBQSxJQUFDLENBQUEsVUFBRCxHQUFjLEtBQWQ7O01BQ0EsSUFBQyxDQUFBLGlCQUFELEdBQXFCO01BQ3JCLElBQUMsQ0FBQSxPQUFELEdBQVc7TUFFWCxJQUFDLENBQUEsTUFBRCxHQUFjLElBQUEsTUFBQSxDQUFPO1FBQUMsaUJBQUEsRUFBbUIsSUFBcEI7T0FBUDtNQUNkLElBQUMsQ0FBQSxNQUFNLENBQUMsU0FBUixDQUFrQixJQUFsQixFQUF3QjtRQUFDLElBQUEsRUFBTSxRQUFQO1FBQWlCLFVBQUEsRUFBWSxDQUFDLENBQUMsS0FBRixDQUFRLFlBQVIsQ0FBN0I7T0FBeEI7TUFDQSxZQUFZLENBQUMsV0FBYixHQUEyQjtRQUN6QixJQUFBLEVBQU0sUUFEbUI7UUFFekIsQ0FBQSxPQUFBLENBQUEsRUFBUyxJQUFJLENBQUMsSUFBTCxDQUFVLEVBQUUsQ0FBQyxnQkFBSCxDQUFBLENBQVYsRUFBaUMsUUFBakMsQ0FGZ0I7UUFHekIsV0FBQSxFQUFhLHNJQUhZOztNQUszQixJQUFDLENBQUEsTUFBTSxDQUFDLFVBQVIsQ0FBbUI7UUFBQyxhQUFBLEVBQWUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUE1QjtRQUF3QyxjQUFELElBQUMsQ0FBQSxZQUF4QztRQUFzRCxpQkFBQSxFQUFtQixZQUFZLENBQUMsV0FBdEY7T0FBbkI7TUFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBQTtNQUNBLElBQUMsQ0FBQSxtQkFBRCxHQUEyQixJQUFBLG1CQUFBLENBQW9CLElBQUksQ0FBQyxJQUFMLENBQVUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUF0QixFQUFpQyxVQUFqQyxDQUFwQjtNQUMzQixJQUFDLENBQUEsYUFBRCxHQUFxQixJQUFBLGFBQUEsQ0FBYyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQTFCO01BQ3JCLElBQUMsQ0FBQSxpQkFBRCxHQUF5QixJQUFBLGlCQUFBLENBQ3ZCLElBQUMsQ0FBQSxPQURzQixFQUV2QixPQUFPLENBQUMsSUFBUixJQUFnQixPQUFPLENBQUMsU0FBeEIsSUFBcUMsT0FBTyxDQUFDLGFBRnRCLEVBR3ZCLElBQUMsQ0FBQSxNQUhzQjtNQU16QixJQUFDLENBQUEsVUFBRCxHQUFjLElBQUk7TUFDbEIsSUFBQyxDQUFBLFlBQUQsQ0FBQTtJQXhCVzs7OEJBOEJiLFVBQUEsR0FBWSxTQUFDLE9BQUQ7TUFDVixNQUFNLENBQUMsZUFBUCxHQUF5QjtNQUl6QixJQUFHLE9BQU8sQ0FBQyxRQUFSLEtBQW9CLFFBQXBCLElBQWlDLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBUixDQUFZLHdCQUFaLENBQXBDO1FBQ0UsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLENBQWMsd0JBQWQ7UUFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxlQUFaLEVBQTZCLFFBQTdCLEVBRkY7O01BSUEsSUFBQyxDQUFBLE1BQU0sQ0FBQyxXQUFSLENBQW9CLGVBQXBCLEVBQXFDLElBQUMsQ0FBQSxnQkFBZ0IsQ0FBQyxJQUFsQixDQUF1QixJQUF2QixDQUFyQztNQUVBLE9BQU8sQ0FBQyxRQUFSLENBQWlCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsaUJBQWlCLENBQUMsVUFBbkIsQ0FBQTtRQUFIO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqQjtNQUNBLElBQUMsQ0FBQSxlQUFELEdBQXVCLElBQUEsZUFBQSxDQUFnQixJQUFDLENBQUEsT0FBakIsRUFBMEIsSUFBQyxDQUFBLGlCQUEzQjtNQUN2QixJQUFDLENBQUEsbUJBQUQsR0FBMkIsSUFBQSxtQkFBQSxDQUFvQixJQUFDLENBQUEsWUFBckIsRUFBbUMsSUFBQyxDQUFBLFFBQXBDO01BRTNCLElBQUMsQ0FBQSxnQ0FBRCxDQUFBO01BQ0EsSUFBQyxDQUFBLGFBQUQsQ0FBQTthQUVBLElBQUMsQ0FBQSxNQUFELENBQVEsT0FBUjtJQWxCVTs7OEJBb0JaLE9BQUEsR0FBUyxTQUFBO0FBQ1AsVUFBQTtNQUFBLG9CQUFBLEdBQXVCLElBQUMsQ0FBQSxPQUFPLENBQUMsR0FBVCxDQUFhLFNBQUMsTUFBRDtRQUNsQyxNQUFNLENBQUMsS0FBUCxDQUFBO2VBQ0EsTUFBTSxDQUFDO01BRjJCLENBQWI7YUFHdkIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxvQkFBWixDQUFpQyxDQUFDLElBQWxDLENBQXVDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsVUFBVSxDQUFDLE9BQVosQ0FBQTtRQUFIO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF2QztJQUpPOzs4QkFNVCxNQUFBLEdBQVEsU0FBQyxPQUFEO0FBQ04sVUFBQTtNQUFBLGdEQUFzQixDQUFFLGdCQUFyQixHQUE4QixDQUE5QiwrQ0FBcUQsQ0FBRSxnQkFBcEIsR0FBNkIsQ0FBaEUsSUFBcUUsT0FBTyxDQUFDLElBQTdFLElBQXFGLE9BQU8sQ0FBQyxTQUE3RixJQUEwRyxPQUFPLENBQUMsYUFBckg7UUFDRSxJQUFHLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBUixDQUFZLG9DQUFaLENBQUEsS0FBcUQsUUFBeEQ7VUFDRSxJQUFDLENBQUEsU0FBRCxDQUFXLENBQUMsQ0FBQyxTQUFGLENBQVksT0FBWixDQUFYLEVBREY7O2VBRUEsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsT0FBakIsRUFIRjtPQUFBLE1BQUE7ZUFLRSxJQUFDLENBQUEsU0FBRCxDQUFXLE9BQVgsQ0FBQSxJQUF1QixJQUFDLENBQUEsUUFBRCxDQUFVLE9BQVYsRUFMekI7O0lBRE07OzhCQVFSLGVBQUEsR0FBaUIsU0FBQyxPQUFEO0FBQ2YsVUFBQTtNQUNFLG1DQURGLEVBQ2dCLGlDQURoQixFQUM2QixtQ0FEN0IsRUFDMkMsK0JBRDNDLEVBQ3VELDZCQUR2RCxFQUVFLHFDQUZGLEVBRWlCLG1CQUZqQixFQUV1QixpREFGdkIsRUFFNEMseUJBRjVDLEVBRXFELDJCQUZyRCxFQUUrRCw2QkFGL0QsRUFHRSx5QkFIRixFQUdXLHVDQUhYLEVBRzJCLHlCQUgzQixFQUdvQywyQ0FIcEMsRUFHc0QseUNBSHRELEVBR3VFO01BR3ZFLEdBQUcsQ0FBQyxLQUFKLENBQUE7TUFFQSxJQUFHLElBQUg7ZUFDRSxJQUFDLENBQUEsUUFBRCxDQUFVO1VBQ1IsUUFBQSxFQUFVLElBREY7VUFDUSxTQUFBLE9BRFI7VUFDa0IsY0FBRCxJQUFDLENBQUEsWUFEbEI7VUFDZ0MsY0FBQSxZQURoQztVQUM4QyxhQUFBLFdBRDlDO1VBRVIsU0FBQSxPQUZRO1VBRUMsU0FBQSxPQUZEO1VBRVUsS0FBQSxHQUZWO1NBQVYsRUFERjtPQUFBLE1BS0ssSUFBRyxTQUFBLElBQWEsYUFBaEI7ZUFDSCxJQUFDLENBQUEsYUFBRCxDQUFlO1VBQUMsUUFBQSxFQUFVLElBQVg7VUFBaUIsSUFBQSxFQUFNLGFBQXZCO1VBQXVDLGNBQUQsSUFBQyxDQUFBLFlBQXZDO1VBQXFELGNBQUEsWUFBckQ7VUFBbUUsYUFBQSxXQUFuRTtVQUFnRixTQUFBLE9BQWhGO1VBQXlGLEtBQUEsR0FBekY7U0FBZixFQURHO09BQUEsTUFFQSxJQUFHLFdBQVcsQ0FBQyxNQUFaLEdBQXFCLENBQXhCO2VBQ0gsSUFBQyxDQUFBLFNBQUQsQ0FBVztVQUNULGNBQUEsWUFEUztVQUNLLGFBQUEsV0FETDtVQUNrQixjQUFBLFlBRGxCO1VBQ2dDLHFCQUFBLG1CQURoQztVQUNxRCxXQUFBLFNBRHJEO1VBRVQsU0FBQSxPQUZTO1VBRUEsVUFBQSxRQUZBO1VBRVUsZ0JBQUEsY0FGVjtVQUUwQixrQkFBQSxnQkFGMUI7VUFFNEMsaUJBQUEsZUFGNUM7VUFFNkQsS0FBQSxHQUY3RDtTQUFYLEVBREc7T0FBQSxNQUtBLElBQUcsVUFBVSxDQUFDLE1BQVgsR0FBb0IsQ0FBdkI7QUFDSDthQUFBLDRDQUFBOzt1QkFDRSxJQUFDLENBQUEsT0FBRCxDQUFTO1lBQUMsV0FBQSxTQUFEO1lBQVksU0FBQSxPQUFaO1lBQXFCLFVBQUEsUUFBckI7WUFBK0IsS0FBQSxHQUEvQjtXQUFUO0FBREY7dUJBREc7T0FBQSxNQUFBO2VBS0gsSUFBQyxDQUFBLFFBQUQsQ0FBVTtVQUNSLGNBQUEsWUFEUTtVQUNNLHFCQUFBLG1CQUROO1VBQzJCLFdBQUEsU0FEM0I7VUFDc0MsU0FBQSxPQUR0QztVQUMrQyxVQUFBLFFBRC9DO1VBQ3lELGdCQUFBLGNBRHpEO1VBRVIsa0JBQUEsZ0JBRlE7VUFFVSxpQkFBQSxlQUZWO1VBRTJCLEtBQUEsR0FGM0I7U0FBVixFQUxHOztJQXJCVTs7OEJBZ0NqQixZQUFBLEdBQWMsU0FBQyxNQUFEO0FBQ1osVUFBQTtNQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsTUFBVCxDQUFnQixJQUFDLENBQUEsT0FBTyxDQUFDLE9BQVQsQ0FBaUIsTUFBakIsQ0FBaEIsRUFBMEMsQ0FBMUM7TUFDQSxJQUFHLElBQUMsQ0FBQSxPQUFPLENBQUMsTUFBVCxLQUFtQixDQUF0Qjs7Y0FDa0IsQ0FBRSx5QkFBbEIsQ0FBNEMsS0FBNUM7O1FBQ0EsWUFBRyxPQUFPLENBQUMsU0FBUixLQUFxQixPQUFyQixJQUFBLElBQUEsS0FBOEIsT0FBakM7VUFDRSxHQUFHLENBQUMsSUFBSixDQUFBO0FBQ0EsaUJBRkY7U0FGRjs7TUFLQSxJQUFBLENBQXdCLE1BQU0sQ0FBQyxNQUEvQjtlQUFBLElBQUMsQ0FBQSxTQUFELENBQVcsSUFBWCxFQUFBOztJQVBZOzs4QkFVZCxTQUFBLEdBQVcsU0FBQyxNQUFEO0FBQ1QsVUFBQTtNQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLE1BQWQ7O1lBQ2dCLENBQUUsU0FBbEIsQ0FBNEIsTUFBTSxDQUFDLGFBQW5DOztNQUNBLE1BQU0sQ0FBQyxJQUFQLENBQVksZUFBWixFQUE2QixDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7QUFDM0IsY0FBQTtnRUFBa0IsQ0FBRSx3QkFBcEIsQ0FBNkMsTUFBN0M7UUFEMkI7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTdCO01BR0EsSUFBQSxDQUFPLE1BQU0sQ0FBQyxNQUFkO1FBQ0UsWUFBQSxHQUFlLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUE7bUJBQUcsS0FBQyxDQUFBLGlCQUFELEdBQXFCO1VBQXhCO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtRQUNmLFdBQUEsR0FBYyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFBO21CQUFHLEtBQUMsQ0FBQSxTQUFELENBQVcsS0FBWDtVQUFIO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtRQUNkLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBckIsQ0FBd0IsT0FBeEIsRUFBaUMsWUFBakM7UUFDQSxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQXJCLENBQXdCLE1BQXhCLEVBQWdDLFdBQWhDO1FBQ0EsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFyQixDQUEwQixRQUExQixFQUFvQyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFBO1lBQ2xDLElBQTZCLE1BQUEsS0FBVSxLQUFDLENBQUEsaUJBQXhDO2NBQUEsS0FBQyxDQUFBLGlCQUFELEdBQXFCLEtBQXJCOztZQUNBLE1BQU0sQ0FBQyxhQUFhLENBQUMsY0FBckIsQ0FBb0MsT0FBcEMsRUFBNkMsWUFBN0M7bUJBQ0EsTUFBTSxDQUFDLGFBQWEsQ0FBQyxjQUFyQixDQUFvQyxNQUFwQyxFQUE0QyxXQUE1QztVQUhrQztRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBcEM7ZUFJQSxNQUFNLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFqQyxDQUFzQyxpQkFBdEMsRUFBeUQsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTttQkFBRyxLQUFDLENBQUEsU0FBRCxDQUFXLEtBQVg7VUFBSDtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekQsRUFURjs7SUFOUzs7OEJBc0JYLGdDQUFBLEdBQWtDLFNBQUE7QUFDaEMsVUFBQTtNQUFBLElBQWMsdUJBQWQ7QUFBQSxlQUFBOztNQUNBLElBQUMsQ0FBQSxnQkFBRCxDQUFBO01BQ0EsTUFBQSxHQUFTLEdBQUcsQ0FBQyxZQUFKLENBQWlCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxVQUFEO0FBQ3hCLGNBQUE7VUFBQSxJQUFBLEdBQU87VUFDUCxVQUFVLENBQUMsRUFBWCxDQUFjLE1BQWQsRUFBc0IsU0FBQyxLQUFEO21CQUNwQixJQUFBLEdBQU8sSUFBQSxHQUFPO1VBRE0sQ0FBdEI7aUJBR0EsVUFBVSxDQUFDLEVBQVgsQ0FBYyxLQUFkLEVBQXFCLFNBQUE7QUFDbkIsZ0JBQUE7WUFBQSxPQUFBLEdBQVUsSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFYO21CQUNWLEtBQUMsQ0FBQSxlQUFELENBQWlCLE9BQWpCO1VBRm1CLENBQXJCO1FBTHdCO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqQjtNQVNULE1BQU0sQ0FBQyxNQUFQLENBQWMsSUFBQyxDQUFBLFVBQWY7YUFDQSxNQUFNLENBQUMsRUFBUCxDQUFVLE9BQVYsRUFBbUIsU0FBQyxLQUFEO2VBQVcsT0FBTyxDQUFDLEtBQVIsQ0FBYywyQkFBZCxFQUEyQyxLQUEzQztNQUFYLENBQW5CO0lBYmdDOzs4QkFlbEMsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixVQUFBO01BQUEsSUFBVSxPQUFPLENBQUMsUUFBUixLQUFvQixPQUFwQixJQUFtQyx5QkFBN0M7QUFBQSxlQUFBOztNQUVBLElBQUcsRUFBRSxDQUFDLFVBQUgsQ0FBYyxJQUFDLENBQUEsVUFBZixDQUFIO0FBQ0U7aUJBQ0UsRUFBRSxDQUFDLFVBQUgsQ0FBYyxJQUFDLENBQUEsVUFBZixFQURGO1NBQUEsY0FBQTtVQUVNO1VBSUosSUFBbUIsS0FBSyxDQUFDLElBQU4sS0FBYyxRQUFqQztBQUFBLGtCQUFNLE1BQU47V0FORjtTQURGOztJQUhnQjs7OEJBYWxCLFlBQUEsR0FBYyxTQUFBO0FBQ1osVUFBQTtNQUFBLGVBQUEsR0FBa0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO0FBQ2hCLGNBQUE7aUJBQUE7WUFBQSxPQUFBLCtDQUF5QixDQUFFLGdCQUEzQjtZQUNBLFFBQUEsK0NBQTBCLENBQUUsaUJBRDVCOztRQURnQjtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7TUFJbEIsSUFBQyxDQUFBLEVBQUQsQ0FBSSxrQkFBSixFQUF3QixTQUFBO2VBQUcsR0FBRyxDQUFDLElBQUosQ0FBQTtNQUFILENBQXhCO01BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSx3QkFBSixFQUE4QixTQUFBO2VBQUcsSUFBQyxDQUFBLFFBQUQsQ0FBVSxlQUFBLENBQUEsQ0FBVjtNQUFILENBQTlCO01BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSxzQkFBSixFQUE0QixTQUFBO0FBQUcsWUFBQTtlQUFBLGdEQUFvQixJQUFwQixDQUF5QixDQUFDLFFBQTFCLENBQUE7TUFBSCxDQUE1QjtNQUNBLElBQUMsQ0FBQSxFQUFELENBQUksc0JBQUosRUFBNEIsU0FBQTtlQUFHLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixLQUFyQixFQUE0QjtVQUFBLE9BQUEsRUFBUyxJQUFUO1NBQTVCO01BQUgsQ0FBNUI7TUFDQSxJQUFDLENBQUEsRUFBRCxDQUFJLHVCQUFKLEVBQTZCLFNBQUE7ZUFBRyxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsS0FBckIsRUFBNEI7VUFBQSxRQUFBLEVBQVUsSUFBVjtTQUE1QjtNQUFILENBQTdCO01BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSxxQkFBSixFQUEyQixTQUFDLEdBQUQ7QUFDekIsWUFBQTtRQUQyQixXQUFHLFdBQUc7O1VBQ2pDLGFBQWMsSUFBQyxDQUFBLGFBQUQsQ0FBQTs7b0NBQ2QsVUFBVSxDQUFFLGFBQWEsQ0FBQyxjQUExQixDQUF5QyxDQUF6QyxFQUE0QyxDQUE1QztNQUZ5QixDQUEzQjtNQUlBLElBQUMsQ0FBQSxFQUFELENBQUksZ0NBQUosRUFBc0MsU0FBQTtlQUFHLEtBQUssQ0FBQyxZQUFOLENBQW1CLCtCQUFuQjtNQUFILENBQXRDO01BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSw4QkFBSixFQUFvQyxTQUFBO2VBQUcsS0FBSyxDQUFDLFlBQU4sQ0FBbUIseUJBQW5CO01BQUgsQ0FBcEM7TUFDQSxJQUFDLENBQUEsRUFBRCxDQUFJLHNCQUFKLEVBQTRCLFNBQUE7ZUFBRyxLQUFLLENBQUMsWUFBTixDQUFtQixxQkFBbkI7TUFBSCxDQUE1QjtNQUNBLElBQUMsQ0FBQSxFQUFELENBQUksK0JBQUosRUFBcUMsU0FBQTtlQUFHLEtBQUssQ0FBQyxZQUFOLENBQW1CLHVCQUFuQjtNQUFILENBQXJDO01BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSwwQkFBSixFQUFnQyxTQUFBO2VBQUcsS0FBSyxDQUFDLFlBQU4sQ0FBbUIseUVBQW5CO01BQUgsQ0FBaEM7TUFDQSxJQUFDLENBQUEsRUFBRCxDQUFJLDJCQUFKLEVBQWlDLFNBQUE7ZUFBRyxLQUFLLENBQUMsWUFBTixDQUFtQixxREFBbkI7TUFBSCxDQUFqQztNQUVBLElBQUMsQ0FBQSxFQUFELENBQUksNEJBQUosRUFBa0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO1VBQ2hDLEtBQUMsQ0FBQSxRQUFELEdBQVk7aUJBQ1osS0FBQyxDQUFBLGlCQUFpQixDQUFDLE9BQW5CLENBQUE7UUFGZ0M7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWxDO01BSUEsSUFBQyxDQUFBLEVBQUQsQ0FBSSw4QkFBSixFQUFvQyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7aUJBQUcsS0FBQyxDQUFBLGlCQUFpQixDQUFDLEtBQW5CLENBQUE7UUFBSDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBcEM7TUFFQSxJQUFHLE9BQU8sQ0FBQyxRQUFSLEtBQW9CLFFBQXZCO1FBQ0UsSUFBQyxDQUFBLEVBQUQsQ0FBSSx3Q0FBSixFQUE4QyxTQUFBO2lCQUFHLElBQUksQ0FBQywwQkFBTCxDQUFnQyxpQkFBaEM7UUFBSCxDQUE5QztRQUNBLElBQUMsQ0FBQSxFQUFELENBQUksa0JBQUosRUFBd0IsU0FBQTtpQkFBRyxJQUFJLENBQUMsMEJBQUwsQ0FBZ0MsT0FBaEM7UUFBSCxDQUF4QjtRQUNBLElBQUMsQ0FBQSxFQUFELENBQUkscUNBQUosRUFBMkMsU0FBQTtpQkFBRyxJQUFJLENBQUMsMEJBQUwsQ0FBZ0Msd0JBQWhDO1FBQUgsQ0FBM0M7UUFDQSxJQUFDLENBQUEsRUFBRCxDQUFJLHNCQUFKLEVBQTRCLFNBQUE7aUJBQUcsSUFBSSxDQUFDLDBCQUFMLENBQWdDLHFCQUFoQztRQUFILENBQTVCO1FBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSxxQ0FBSixFQUEyQyxTQUFBO2lCQUFHLElBQUksQ0FBQywwQkFBTCxDQUFnQyx3QkFBaEM7UUFBSCxDQUEzQztRQUNBLElBQUMsQ0FBQSxFQUFELENBQUksa0JBQUosRUFBd0IsU0FBQTtpQkFBRyxJQUFJLENBQUMsMEJBQUwsQ0FBZ0MsT0FBaEM7UUFBSCxDQUF4QixFQU5GO09BQUEsTUFBQTtRQVFFLElBQUMsQ0FBQSxFQUFELENBQUksc0JBQUosRUFBNEIsU0FBQTtBQUFHLGNBQUE7NkRBQWdCLENBQUUsUUFBbEIsQ0FBQTtRQUFILENBQTVCO1FBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSxrQkFBSixFQUF3QixTQUFBO0FBQUcsY0FBQTs2REFBZ0IsQ0FBRSxRQUFsQixDQUFBO1FBQUgsQ0FBeEIsRUFURjs7TUFXQSxJQUFDLENBQUEsZUFBRCxDQUFpQixtQkFBakIsRUFBc0MsY0FBdEM7TUFDQSxJQUFDLENBQUEsZUFBRCxDQUFpQiwyQkFBakIsRUFBOEMsZUFBOUM7TUFDQSxJQUFDLENBQUEsZUFBRCxDQUFpQiw4QkFBakIsRUFBaUQscUJBQWpEO01BQ0EsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsbUNBQWpCLEVBQXNELDBCQUF0RDtNQUNBLElBQUMsQ0FBQSxlQUFELENBQWlCLDhCQUFqQixFQUFpRCxxQkFBakQ7TUFDQSxJQUFDLENBQUEsZUFBRCxDQUFpQixnQ0FBakIsRUFBbUQsdUJBQW5EO01BQ0EsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsa0NBQWpCLEVBQXFELHlCQUFyRDtNQUNBLElBQUMsQ0FBQSxlQUFELENBQWlCLDBCQUFqQixFQUE2QyxJQUFJLENBQUMsSUFBTCxDQUFVLE9BQU8sQ0FBQyxhQUFsQixFQUFpQyxZQUFqQyxDQUE3QztNQUVBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLEdBQWQsRUFBbUIsYUFBbkIsRUFBa0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEtBQUQ7VUFDaEQsSUFBQSxDQUFPLEtBQUMsQ0FBQSxRQUFSO1lBQ0UsS0FBSyxDQUFDLGNBQU4sQ0FBQTtZQUNBLEtBQUMsQ0FBQSxRQUFELEdBQVk7bUJBQ1osT0FBTyxDQUFDLEdBQVIsQ0FBWSxLQUFDLENBQUEsT0FBTyxDQUFDLEdBQVQsQ0FBYSxTQUFDLE1BQUQ7cUJBQVksTUFBTSxDQUFDLGVBQVAsQ0FBQTtZQUFaLENBQWIsQ0FBWixDQUErRCxDQUFDLElBQWhFLENBQXFFLFNBQUE7cUJBQUcsR0FBRyxDQUFDLElBQUosQ0FBQTtZQUFILENBQXJFLEVBSEY7O1FBRGdEO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFsQyxDQUFoQjtNQU1BLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLEdBQWQsRUFBbUIsV0FBbkIsRUFBZ0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO1VBQzlDLEtBQUMsQ0FBQSxnQkFBRCxDQUFBO2lCQUNBLEtBQUMsQ0FBQSxnQkFBRCxDQUFBO1FBRjhDO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFoQyxDQUFoQjtNQUlBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLEdBQWQsRUFBbUIsV0FBbkIsRUFBZ0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEtBQUQsRUFBUSxVQUFSO1VBQzlDLEtBQUssQ0FBQyxjQUFOLENBQUE7aUJBQ0EsS0FBQyxDQUFBLFFBQUQsQ0FBVTtZQUFDLFlBQUEsVUFBRDtXQUFWO1FBRjhDO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFoQyxDQUFoQjtNQUlBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLEdBQWQsRUFBbUIsVUFBbkIsRUFBK0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEtBQUQsRUFBUSxTQUFSO1VBQzdDLEtBQUssQ0FBQyxjQUFOLENBQUE7aUJBQ0EsS0FBQyxDQUFBLE9BQUQsQ0FBUztZQUFDLFdBQUEsU0FBRDtZQUFhLFNBQUQsS0FBQyxDQUFBLE9BQWI7WUFBdUIsVUFBRCxLQUFDLENBQUEsUUFBdkI7V0FBVDtRQUY2QztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0IsQ0FBaEI7TUFJQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLEVBQVgsQ0FBYyxHQUFkLEVBQW1CLFVBQW5CLEVBQStCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxLQUFELEVBQVEsaUJBQVI7VUFDN0MsSUFBQSxDQUFPLGlCQUFQOztjQUNFLEtBQUssQ0FBRSxjQUFQLENBQUE7O21CQUNBLEtBQUMsQ0FBQSxJQUFELENBQU0sd0JBQU4sRUFGRjs7UUFENkM7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQS9CLENBQWhCO01BS0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QixxQkFBdkIsRUFBOEMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUM1RCxLQUFDLENBQUEsT0FBRCxDQUFBO1FBRDREO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QyxDQUFoQjtNQUdBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsZUFBdkIsRUFBd0MsU0FBQyxLQUFELEVBQVEsU0FBUixFQUFtQixHQUFuQjtlQUN0RCxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFyQixDQUFrQyxHQUFsQyxFQUF1QyxTQUFDLEtBQUQ7VUFDckMsSUFBQSxDQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBYixDQUFBLENBQVA7bUJBQ0UsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFiLENBQWtCLG1CQUFsQixFQUF1QyxTQUF2QyxFQUFrRCxLQUFsRCxFQURGOztRQURxQyxDQUF2QztNQURzRCxDQUF4QyxDQUFoQjtNQUtBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsNEJBQXZCLEVBQXFELENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxLQUFEO0FBQ25FLGNBQUE7QUFBQTtBQUFBO2VBQUEsc0NBQUE7O1lBQ0UsV0FBQSxHQUFjLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDdkMsSUFBRyxXQUFBLEtBQWlCLEtBQUssQ0FBQyxNQUExQjsyQkFDRSxXQUFXLENBQUMsSUFBWixDQUFpQiw0QkFBakIsR0FERjthQUFBLE1BQUE7bUNBQUE7O0FBRkY7O1FBRG1FO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFyRCxDQUFoQjtNQU9BLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsTUFBdkIsRUFBK0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEtBQUQsRUFBUSxPQUFSO0FBQzdDLGNBQUE7VUFBQSxNQUFBLEdBQVMsS0FBQyxDQUFBLGtCQUFELENBQW9CLEtBQXBCO1VBQ1QsSUFBRyxlQUFIO1lBQ0UsSUFBRyxPQUFPLE9BQU8sQ0FBQyxXQUFmLEtBQThCLFFBQWpDO2NBQ0UsT0FBTyxDQUFDLFdBQVIsR0FBc0IsQ0FBQyxPQUFPLENBQUMsV0FBVCxFQUR4Qjs7WUFFQSxnREFBc0IsQ0FBRSxnQkFBckIsR0FBOEIsQ0FBakM7Y0FDRSxPQUFPLENBQUMsTUFBUixHQUFpQjtxQkFDakIsS0FBQyxDQUFBLFNBQUQsQ0FBVyxPQUFYLEVBRkY7YUFBQSxNQUFBO3FCQUlNLElBQUEsVUFBQSxDQUFXLEtBQVgsRUFBaUIsS0FBQyxDQUFBLG1CQUFsQixFQUF1QyxPQUF2QyxFQUpOO2FBSEY7V0FBQSxNQUFBO21CQVNFLEtBQUMsQ0FBQSxtQkFBRCxDQUFxQixLQUFyQixFQUE0QjtjQUFDLFFBQUEsTUFBRDthQUE1QixFQVRGOztRQUY2QztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0IsQ0FBaEI7TUFhQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLEVBQVgsQ0FBYyxPQUFkLEVBQXVCLHlCQUF2QixFQUFrRCxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsS0FBRCxFQUFRLFFBQVIsRUFBa0IsbUJBQWxCO0FBQ2hFLGNBQUE7VUFBQSxHQUFBLEdBQU0sYUFBYSxDQUFDLGVBQWQsQ0FBOEIsS0FBSyxDQUFDLE1BQXBDOzhEQUNVLENBQUUsTUFBbEIsQ0FBeUIsR0FBekIsRUFBOEIsUUFBOUIsRUFBd0MsbUJBQXhDO1FBRmdFO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFsRCxDQUFoQjtNQUlBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsbUJBQXZCLEVBQTRDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxLQUFELEVBQVEsZUFBUjtpQkFDMUQsS0FBQyxDQUFBLFFBQUQsQ0FBVTtZQUFDLFlBQUEsRUFBYyxLQUFDLENBQUEsZUFBaEI7WUFBaUMsV0FBQSxFQUFhLENBQUMsZUFBRCxDQUE5QztZQUFpRSxRQUFBLEVBQVUsS0FBM0U7V0FBVjtRQUQwRDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBNUMsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLEVBQVgsQ0FBYyxPQUFkLEVBQXVCLGdCQUF2QixFQUF5QyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsS0FBRCxFQUFRLGNBQVI7aUJBQ3ZELEtBQUMsQ0FBQSxhQUFELENBQWU7WUFBQyxZQUFBLEVBQWMsS0FBQyxDQUFBLGVBQWhCO1lBQWlDLFdBQUEsRUFBYSxDQUFDLGNBQUQsQ0FBOUM7WUFBZ0UsUUFBQSxFQUFVLEtBQTFFO1lBQWlGLElBQUEsRUFBTSxLQUF2RjtXQUFmO1FBRHVEO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF6QyxDQUFoQjtNQUdBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsU0FBdkIsRUFBa0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEtBQUQsRUFBUSxPQUFSO2lCQUNoRCxLQUFDLENBQUEsSUFBRCxDQUFNLE9BQU47UUFEZ0Q7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWxDLENBQWhCO01BR0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QixjQUF2QixFQUF1QyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7QUFDckQsY0FBQTtVQURzRCxzQkFBTyx3QkFBUztVQUN0RSxJQUF5QixJQUFJLENBQUMsTUFBTCxHQUFjLENBQXZDO1lBQUEsV0FBQSxHQUFjLElBQUssQ0FBQSxDQUFBLEVBQW5COztBQUNBLGtCQUFPLE9BQVA7QUFBQSxpQkFDTyxrQkFEUDtxQkFDK0IsS0FBQyxDQUFBLG1CQUFELENBQXFCLEtBQXJCLEVBQTRCLGVBQUEsQ0FBQSxDQUE1QixFQUErQyxXQUEvQztBQUQvQixpQkFFTyx1QkFGUDtxQkFFb0MsS0FBQyxDQUFBLG1CQUFELENBQXFCLE1BQXJCLEVBQTZCLGVBQUEsQ0FBQSxDQUE3QixFQUFnRCxXQUFoRDtBQUZwQyxpQkFHTyx5QkFIUDtxQkFHc0MsS0FBQyxDQUFBLG1CQUFELENBQXFCLFFBQXJCLEVBQStCLGVBQUEsQ0FBQSxDQUEvQixFQUFrRCxXQUFsRDtBQUh0QztxQkFJTyxPQUFPLENBQUMsR0FBUixDQUFZLGlDQUFBLEdBQW9DLE9BQWhEO0FBSlA7UUFGcUQ7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZDLENBQWhCO01BUUEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QixnQkFBdkIsRUFBeUMsU0FBQTtBQUN2RCxZQUFBO1FBRHdELHNCQUFPLHdCQUFTO1FBQ3hFLEdBQUEsR0FBTSxhQUFhLENBQUMsZUFBZCxDQUE4QixLQUFLLENBQUMsTUFBcEM7ZUFDTixHQUFHLENBQUMsSUFBSixZQUFTLENBQUEsT0FBUyxTQUFBLFdBQUEsSUFBQSxDQUFBLENBQWxCO01BRnVELENBQXpDLENBQWhCO01BSUEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxTQUFYLENBQXFCLGVBQXJCLEVBQXNDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtBQUNwRCxjQUFBO1VBRHFELDhCQUFlLHVCQUFRO3dGQUNoQyxDQUFBLE1BQUEsQ0FBNUMsYUFBb0QsSUFBcEQ7UUFEb0Q7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRDLENBQWhCO01BR0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QixhQUF2QixFQUFzQyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsS0FBRCxFQUFRLGVBQVI7aUJBQ3BELEtBQUMsQ0FBQSxhQUFELENBQWUsUUFBZixFQUF5QixTQUFDLGFBQUQ7bUJBQ3ZCLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBYixDQUFrQixlQUFsQixFQUFtQyxhQUFuQztVQUR1QixDQUF6QjtRQURvRDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdEMsQ0FBaEI7TUFJQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLFNBQVgsQ0FBcUIsaUJBQXJCLEVBQXdDLFNBQUMsR0FBRCxFQUFNLEtBQU4sRUFBYSxNQUFiO2VBQ3RELEdBQUcsQ0FBQyxPQUFKLENBQVksS0FBWixFQUFtQixNQUFuQjtNQURzRCxDQUF4QyxDQUFoQjtNQUdBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsU0FBWCxDQUFxQixxQkFBckIsRUFBNEMsU0FBQyxHQUFELEVBQU0sQ0FBTixFQUFTLENBQVQ7ZUFDMUQsR0FBRyxDQUFDLFdBQUosQ0FBZ0IsQ0FBaEIsRUFBbUIsQ0FBbkI7TUFEMEQsQ0FBNUMsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLFNBQVgsQ0FBcUIsZUFBckIsRUFBc0MsU0FBQyxHQUFEO2VBQ3BELEdBQUcsQ0FBQyxNQUFKLENBQUE7TUFEb0QsQ0FBdEMsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLFNBQVgsQ0FBcUIsY0FBckIsRUFBcUMsU0FBQyxHQUFEO2VBQ25ELEdBQUcsQ0FBQyxLQUFKLENBQUE7TUFEbUQsQ0FBckMsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLFNBQVgsQ0FBcUIsYUFBckIsRUFBb0MsU0FBQyxHQUFEO2VBQ2xELEdBQUcsQ0FBQyxJQUFKLENBQUE7TUFEa0QsQ0FBcEMsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLFNBQVgsQ0FBcUIsYUFBckIsRUFBb0MsU0FBQyxHQUFEO2VBQ2xELEdBQUcsQ0FBQyxJQUFKLENBQUE7TUFEa0QsQ0FBcEMsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLFNBQVgsQ0FBcUIsNEJBQXJCLEVBQW1ELFNBQUMsR0FBRDtlQUNqRSxHQUFHLENBQUM7TUFENkQsQ0FBbkQsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLFNBQVgsQ0FBcUIsNEJBQXJCLEVBQW1ELFNBQUMsR0FBRCxFQUFNLEtBQU47ZUFDakUsR0FBRyxDQUFDLGNBQUosR0FBcUI7TUFENEMsQ0FBbkQsQ0FBaEI7TUFHQSxTQUFBLEdBQVksT0FBQSxDQUFRLG1CQUFSO01BQ1osSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QixtQ0FBdkIsRUFBNEQsU0FBQyxLQUFELEVBQVEsWUFBUjtlQUMxRSxTQUFTLENBQUMsU0FBVixDQUFvQixZQUFwQixFQUFrQyxXQUFsQztNQUQwRSxDQUE1RCxDQUFoQjtNQUdBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsaUJBQXZCLEVBQTBDLFNBQUMsS0FBRCxFQUFRLE1BQVI7ZUFDeEQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFmLENBQXFCLE1BQXJCO01BRHdELENBQTFDLENBQWhCO01BR0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QixpQkFBdkIsRUFBMEMsU0FBQyxLQUFELEVBQVEsTUFBUjtlQUN4RCxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQWYsQ0FBcUIsTUFBckI7TUFEd0QsQ0FBMUMsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLEVBQVgsQ0FBYyxPQUFkLEVBQXVCLHFCQUF2QixFQUE4QyxTQUFDLEtBQUQsRUFBUSxRQUFSO2VBQzVELEdBQUcsQ0FBQyxpQkFBSixDQUFzQixRQUF0QjtNQUQ0RCxDQUE5QyxDQUFoQjtNQUdBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsaUNBQXZCLEVBQTBELFNBQUMsS0FBRCxFQUFRLElBQVI7QUFDeEUsWUFBQTt1RUFBZ0MsQ0FBRSxpQkFBbEMsQ0FBb0QsSUFBcEQ7TUFEd0UsQ0FBMUQsQ0FBaEI7TUFHQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0IsVUFBVSxDQUFDLEVBQVgsQ0FBYyxPQUFkLEVBQXVCLCtCQUF2QixFQUF3RCxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsS0FBRDtpQkFDdEUsS0FBSyxDQUFDLFdBQU4sR0FBb0IsS0FBQyxDQUFBLGlCQUFpQixDQUFDLFFBQW5CLENBQUE7UUFEa0Q7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXhELENBQWhCO01BR0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QiwrQkFBdkIsRUFBd0QsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEtBQUQ7aUJBQ3RFLEtBQUssQ0FBQyxXQUFOLEdBQW9CLEtBQUMsQ0FBQSxpQkFBaUIsQ0FBQyxlQUFuQixDQUFBO1FBRGtEO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF4RCxDQUFoQjtNQUdBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsZ0JBQXZCLEVBQXlDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxLQUFELEVBQVEsSUFBUjtVQUN2RCxLQUFDLENBQUEsbUJBQW1CLENBQUMsWUFBckIsQ0FBa0MsS0FBQyxDQUFBLGtCQUFELENBQW9CLEtBQXBCLENBQWxDLEVBQThELElBQTlEO2lCQUNBLEtBQUssQ0FBQyxXQUFOLEdBQW9CO1FBRm1DO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF6QyxDQUFoQjtNQUlBLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBWixDQUFnQixVQUFVLENBQUMsRUFBWCxDQUFjLE9BQWQsRUFBdUIsZUFBdkIsRUFBd0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEtBQUQsRUFBUSxJQUFSO1VBQ3RELEtBQUMsQ0FBQSxtQkFBbUIsQ0FBQyxXQUFyQixDQUFpQyxLQUFDLENBQUEsa0JBQUQsQ0FBb0IsS0FBcEIsQ0FBakMsRUFBNkQsSUFBN0Q7aUJBQ0EsS0FBSyxDQUFDLFdBQU4sR0FBb0I7UUFGa0M7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXhDLENBQWhCO01BSUEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLFVBQVUsQ0FBQyxFQUFYLENBQWMsT0FBZCxFQUF1QixrQkFBdkIsRUFBMkMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUN6RCxLQUFDLENBQUEsU0FBRCxDQUFXLEtBQVg7UUFEeUQ7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTNDLENBQWhCO2FBR0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLElBQUMsQ0FBQSwwQkFBRCxDQUFBLENBQWhCO0lBM0xZOzs4QkE2TGQsYUFBQSxHQUFlLFNBQUE7QUFDYixVQUFBO01BQUEsSUFBRyxPQUFPLENBQUMsUUFBUixLQUFvQixRQUF2QjtRQUNFLFFBQUEsR0FBVyxJQUFJLENBQUMsaUJBQUwsQ0FBdUI7VUFDaEM7WUFBQyxLQUFBLEVBQU8sWUFBUjtZQUF1QixLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7cUJBQUEsU0FBQTt1QkFBRyxLQUFDLENBQUEsSUFBRCxDQUFNLHdCQUFOO2NBQUg7WUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCO1dBRGdDO1NBQXZCO2VBR1gsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFULENBQWlCLFFBQWpCLEVBSkY7O0lBRGE7OzhCQWFmLFdBQUEsR0FBYSxTQUFBO0FBQ1gsVUFBQTtNQURZLHdCQUFTO01BQ3JCLElBQUEsQ0FBTyxJQUFDLENBQUEsSUFBRCxhQUFNLENBQUEsT0FBUyxTQUFBLFdBQUEsSUFBQSxDQUFBLENBQWYsQ0FBUDtRQUNFLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLGFBQUQsQ0FBQTtRQUNoQixJQUFHLHFCQUFIO2lCQUNFLGFBQWEsQ0FBQyxXQUFkLHNCQUEwQixDQUFBLE9BQVMsU0FBQSxXQUFBLElBQUEsQ0FBQSxDQUFuQyxFQURGO1NBQUEsTUFBQTtpQkFHRSxJQUFDLENBQUEsMkJBQUQsQ0FBNkIsT0FBN0IsRUFIRjtTQUZGOztJQURXOzs4QkFhYixtQkFBQSxHQUFxQixTQUFBO0FBQ25CLFVBQUE7TUFEb0Isd0JBQVMsMkJBQVk7TUFDekMsSUFBQSxDQUFPLElBQUMsQ0FBQSxJQUFELGFBQU0sQ0FBQSxPQUFTLFNBQUEsV0FBQSxJQUFBLENBQUEsQ0FBZixDQUFQO1FBQ0UsSUFBRyxrQkFBSDtpQkFDRSxVQUFVLENBQUMsV0FBWCxtQkFBdUIsQ0FBQSxPQUFTLFNBQUEsV0FBQSxJQUFBLENBQUEsQ0FBaEMsRUFERjtTQUFBLE1BQUE7aUJBR0UsSUFBQyxDQUFBLDJCQUFELENBQTZCLE9BQTdCLEVBSEY7U0FERjs7SUFEbUI7OzhCQVNyQiwyQkFBQSxHQUE2QixTQUFDLE9BQUQ7TUFDM0IsSUFBb0IsT0FBTyxDQUFDLFFBQVIsS0FBb0IsUUFBeEM7QUFBQSxlQUFPLE1BQVA7O0FBRUEsY0FBTyxPQUFQO0FBQUEsYUFDTyxXQURQO1VBQ3dCLElBQUksQ0FBQywwQkFBTCxDQUFnQyxPQUFoQztBQUFqQjtBQURQLGFBRU8sV0FGUDtVQUV3QixJQUFJLENBQUMsMEJBQUwsQ0FBZ0MsT0FBaEM7QUFBakI7QUFGUCxhQUdPLFdBSFA7VUFHd0IsSUFBSSxDQUFDLDBCQUFMLENBQWdDLE9BQWhDO0FBQWpCO0FBSFAsYUFJTyxVQUpQO1VBSXVCLElBQUksQ0FBQywwQkFBTCxDQUFnQyxNQUFoQztBQUFoQjtBQUpQLGFBS08sWUFMUDtVQUt5QixJQUFJLENBQUMsMEJBQUwsQ0FBZ0MsUUFBaEM7QUFBbEI7QUFMUCxhQU1PLGlCQU5QO1VBTThCLElBQUksQ0FBQywwQkFBTCxDQUFnQyxZQUFoQztBQUF2QjtBQU5QO0FBT08saUJBQU87QUFQZDthQVFBO0lBWDJCOzs4QkFvQjdCLGVBQUEsR0FBaUIsU0FBQyxTQUFELEVBQVksVUFBWjthQUNmLElBQUMsQ0FBQSxFQUFELENBQUksU0FBSixFQUFlLFNBQUE7QUFDYixZQUFBO1FBQUEsSUFBRyxNQUFBLEdBQVMsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQUFaO2lCQUNFLE1BQU0sQ0FBQyxRQUFQLENBQWdCLFVBQWhCLEVBREY7U0FBQSxNQUFBO2lCQUdFLElBQUMsQ0FBQSxRQUFELENBQVU7WUFBQyxZQUFBLFVBQUQ7V0FBVixFQUhGOztNQURhLENBQWY7SUFEZTs7OEJBUWpCLGNBQUEsR0FBZ0IsU0FBQyxXQUFELEVBQWMsT0FBZDthQUNkLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLE9BQVIsRUFBaUIsU0FBQyxVQUFEO2VBQ2YsVUFBVSxDQUFDLE9BQVgsS0FBc0IsT0FBdEIsSUFBa0MsVUFBVSxDQUFDLGFBQVgsQ0FBeUIsV0FBekI7TUFEbkIsQ0FBakI7SUFEYzs7OEJBS2hCLGtCQUFBLEdBQW9CLFNBQUMsR0FBRDtBQUNsQixVQUFBO01BRG9CLFNBQUQ7YUFDbkIsSUFBQyxDQUFBLDBCQUFELENBQTRCLGFBQWEsQ0FBQyxlQUFkLENBQThCLE1BQTlCLENBQTVCO0lBRGtCOzs4QkFHcEIsMEJBQUEsR0FBNEIsU0FBQyxhQUFEO2FBQzFCLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLFNBQUMsVUFBRDtlQUFnQixVQUFVLENBQUMsYUFBWCxLQUE0QjtNQUE1QyxDQUFkO0lBRDBCOzs4QkFJNUIsYUFBQSxHQUFlLFNBQUE7YUFDYixDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxPQUFSLEVBQWlCLFNBQUMsVUFBRDtlQUFnQixVQUFVLENBQUMsU0FBWCxDQUFBO01BQWhCLENBQWpCO0lBRGE7OzhCQUlmLGlDQUFBLEdBQW1DLFNBQUE7QUFDakMsVUFBQTtNQUFBLGdCQUFBLEdBQ0U7UUFBQSxNQUFBLEVBQVEsRUFBUjtRQUNBLEtBQUEsRUFBTyxFQURQOzswRUFFbUM7SUFKSjs7OEJBUW5DLHlCQUFBLEdBQTJCLFNBQUE7QUFDekIsVUFBQTtNQUFBLGlHQUFpRCxDQUFFLFdBQXpDLENBQUEsVUFBVjtBQUFBLGVBQUE7O01BQ0EsVUFBQSxnR0FBb0QsQ0FBRSxhQUF6QyxDQUFBO01BQ2IsTUFBQSxHQUFTLElBQUMsQ0FBQSxpQ0FBRCxDQUFBO01BQ1QsSUFBRyxvQkFBQSxJQUFnQixnQkFBbkI7UUFDRSxVQUFVLENBQUMsQ0FBWCxJQUFnQjtRQUNoQixVQUFVLENBQUMsQ0FBWCxJQUFnQixPQUZsQjs7YUFHQTtJQVB5Qjs7OEJBb0IzQixRQUFBLEdBQVUsU0FBQyxHQUFEO0FBQ1IsVUFBQTsyQkFEUyxNQUFnSixJQUEvSSxrQ0FBYyw4QkFBWSxnREFBcUIsNEJBQVcsd0JBQVMsMEJBQVUsc0NBQWdCLHNCQUFRLDBDQUFrQix3Q0FBaUI7YUFDbEosSUFBQyxDQUFBLFNBQUQsQ0FBVztRQUFDLGNBQUEsWUFBRDtRQUFlLFdBQUEsRUFBYSxDQUFDLFVBQUQsQ0FBNUI7UUFBMEMscUJBQUEsbUJBQTFDO1FBQStELFdBQUEsU0FBL0Q7UUFBMEUsU0FBQSxPQUExRTtRQUFtRixVQUFBLFFBQW5GO1FBQTZGLGdCQUFBLGNBQTdGO1FBQTZHLFFBQUEsTUFBN0c7UUFBcUgsa0JBQUEsZ0JBQXJIO1FBQXVJLGlCQUFBLGVBQXZJO1FBQXdKLEtBQUEsR0FBeEo7T0FBWDtJQURROzs4QkFjVixTQUFBLEdBQVcsU0FBQyxHQUFEO0FBQ1QsVUFBQTsyQkFEVSxNQUErSyxJQUE5SyxrQ0FBYyxnQ0FBYSxrQ0FBYyxnREFBcUIsNEJBQVcsd0JBQVMsMEJBQVUsMENBQWtCLHNDQUFnQixzQkFBUSwwQ0FBa0Isd0NBQWlCO01BQ3BMLElBQU8scUJBQUosSUFBb0IsV0FBVyxDQUFDLE1BQVosS0FBc0IsQ0FBN0M7QUFDRSxlQURGOztNQUVBLElBQXlCLFdBQXpCO1FBQUEsR0FBQSxHQUFNLE9BQU8sQ0FBQyxJQUFkOztNQUNBLE9BQUEsR0FBVSxPQUFBLENBQVEsT0FBUjtNQUNWLFFBQUEsR0FBVyxPQUFBLENBQVEsUUFBUjtNQUNYLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxnQkFBUjtNQUNuQixlQUFBOztBQUFtQjthQUFBLDZDQUFBOzt1QkFBQSxJQUFDLENBQUEscUJBQUQsQ0FBdUIsVUFBdkIsRUFBbUMsWUFBbkMsRUFBaUQsZUFBakQ7QUFBQTs7O01BQ25CLFdBQUE7O0FBQWU7YUFBQSxpREFBQTs7dUJBQUEsY0FBYyxDQUFDO0FBQWY7OztNQUVmLElBQUEsQ0FBQSxDQUFPLG1CQUFBLElBQXVCLFNBQTlCLENBQUE7UUFDRSxjQUFBLEdBQWlCLElBQUMsQ0FBQSxjQUFELENBQWdCLFdBQWhCLEVBQTZCLE9BQTdCO1FBQ2pCLEtBQUE7O0FBQVM7ZUFBQSw2Q0FBQTs7eUJBQUEsRUFBRSxDQUFDLG1CQUFILENBQXVCLFVBQXZCO0FBQUE7OztRQUNULElBQU8sc0JBQVA7VUFDRSxJQUFHLGFBQUEsb0JBQWdCLFNBQVMsSUFBQyxDQUFBLGlCQUE3QjtZQUNFLElBQ0UsZUFBQSxJQUNBLGFBQWEsQ0FBQyxPQUFkLEtBQXlCLE9BRHpCLElBRUEsQ0FDRSxLQUFLLENBQUMsS0FBTixDQUFZLFNBQUMsSUFBRDt5REFBVSxJQUFJLENBQUM7WUFBZixDQUFaLENBQUEsSUFDQSxLQUFLLENBQUMsSUFBTixDQUFXLFNBQUMsSUFBRDsrREFBVSxJQUFJLENBQUMsdUJBQUwsSUFBd0IsQ0FBSSxhQUFhLENBQUMsY0FBZCxDQUFBO1lBQXRDLENBQVgsQ0FGRixDQUhGO2NBQUEsY0FBQSxHQUFpQixjQUFqQjthQURGO1dBREY7U0FIRjs7TUFjQSxJQUFHLHNCQUFIO1FBQ0UsWUFBQSxHQUFlO1FBQ2YsWUFBWSxDQUFDLGFBQWIsQ0FBMkIsZUFBM0I7UUFDQSxJQUFHLFlBQVksQ0FBQyxXQUFiLENBQUEsQ0FBSDtVQUNFLFlBQVksQ0FBQyxPQUFiLENBQUEsRUFERjtTQUFBLE1BQUE7VUFHRSxZQUFZLENBQUMsS0FBYixDQUFBLEVBSEY7O1FBSUEsWUFBWSxDQUFDLGtCQUFiLENBQWdDLEdBQWhDLEVBUEY7T0FBQSxNQUFBO1FBU0UsSUFBRyxPQUFIO0FBQ0U7WUFDRSwwQkFBQSxHQUE2QixPQUFPLENBQUMsT0FBUixDQUFnQixJQUFJLENBQUMsSUFBTCxDQUFVLElBQUMsQ0FBQSxlQUFYLEVBQTRCLEtBQTVCLEVBQW1DLCtCQUFuQyxDQUFoQjtZQUM3QixZQUFBLEdBQWUsSUFBQyxDQUFBLGdCQUZsQjtXQUFBLGtCQURGOzs7VUFLQSw2QkFBOEIsT0FBTyxDQUFDLE9BQVIsQ0FBZ0Isa0NBQWhCOzs7VUFDOUIsZUFBZ0IsSUFBQyxDQUFBOzs7VUFDakIsbUJBQW9CLElBQUMsQ0FBQSx5QkFBRCxDQUFBOztRQUNwQixZQUFBLEdBQW1CLElBQUEsVUFBQSxDQUFXLElBQVgsRUFBaUIsSUFBQyxDQUFBLG1CQUFsQixFQUF1QztVQUFDLGNBQUEsWUFBRDtVQUFlLGlCQUFBLGVBQWY7VUFBZ0MsNEJBQUEsMEJBQWhDO1VBQTRELGNBQUEsWUFBNUQ7VUFBMEUsU0FBQSxPQUExRTtVQUFtRixVQUFBLFFBQW5GO1VBQTZGLGtCQUFBLGdCQUE3RjtVQUErRyxnQkFBQSxjQUEvRztVQUErSCxrQkFBQSxnQkFBL0g7VUFBaUosS0FBQSxHQUFqSjtTQUF2QztRQUNuQixZQUFZLENBQUMsS0FBYixDQUFBO1FBQ0EsSUFBQyxDQUFBLGlCQUFELEdBQXFCLGFBbkJ2Qjs7TUFxQkEsSUFBRywyQkFBSDtRQUNFLElBQUMsQ0FBQSxpQkFBa0IsQ0FBQSxtQkFBQSxDQUFuQixHQUEwQyxhQUQ1Qzs7TUFHQSxZQUFZLENBQUMsYUFBYSxDQUFDLElBQTNCLENBQWdDLFFBQWhDLEVBQTBDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFDeEMsS0FBQyxDQUFBLG9CQUFELENBQXNCLFlBQXRCO1FBRHdDO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQzthQUdBO0lBbkRTOzs4QkFzRFgsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixVQUFBO0FBQUEsV0FBQSw2QkFBQTtRQUFBLElBQUMsQ0FBQSxXQUFELENBQWEsR0FBYjtBQUFBO0lBRGdCOzs4QkFLbEIsb0JBQUEsR0FBc0IsU0FBQyxZQUFEO0FBQ3BCLFVBQUE7QUFBQTtBQUFBLFdBQUEsV0FBQTs7UUFDRSxJQUFxQixhQUFBLEtBQWlCLFlBQXRDO1VBQUEsSUFBQyxDQUFBLFdBQUQsQ0FBYSxHQUFiLEVBQUE7O0FBREY7SUFEb0I7OzhCQU10QixXQUFBLEdBQWEsU0FBQyxHQUFEO0FBQ1gsVUFBQTtBQUFBO1FBQ0UsU0FBQSxHQUFZLFFBQUEsQ0FBUyxHQUFUO1FBQ1osSUFBMkIsUUFBQSxDQUFTLFNBQVQsQ0FBM0I7VUFBQSxPQUFPLENBQUMsSUFBUixDQUFhLFNBQWIsRUFBQTtTQUZGO09BQUEsY0FBQTtRQUdNO1FBQ0osSUFBRyxLQUFLLENBQUMsSUFBTixLQUFnQixPQUFuQjtVQUNFLE9BQU8sQ0FBQyxHQUFSLENBQVksa0JBQUEsR0FBbUIsR0FBbkIsR0FBdUIsV0FBdkIsR0FBaUMsc0NBQWMsS0FBSyxDQUFDLE9BQXBCLENBQTdDLEVBREY7U0FKRjs7YUFNQSxPQUFPLElBQUMsQ0FBQSxpQkFBa0IsQ0FBQSxHQUFBO0lBUGY7OzhCQVNiLFNBQUEsR0FBVyxTQUFDLFVBQUQ7QUFDVCxVQUFBOztRQURVLGFBQVc7O01BQ3JCLElBQVUsSUFBQyxDQUFBLFFBQVg7QUFBQSxlQUFBOztNQUNBLE1BQUEsR0FBUztBQUNUO0FBQUEsV0FBQSxzQ0FBQTs7UUFDRSxJQUFBLENBQU8sTUFBTSxDQUFDLE1BQWQ7VUFDRSxNQUFNLENBQUMsSUFBUCxDQUFZO1lBQUMsWUFBQSxFQUFjLE1BQU0sQ0FBQyx5QkFBdEI7V0FBWixFQURGOztBQURGO01BR0EsSUFBRyxNQUFNLENBQUMsTUFBUCxHQUFnQixDQUFoQixJQUFxQixVQUF4QjtRQUNFLElBQUMsQ0FBQSxhQUFhLENBQUMsU0FBZixDQUF5QixrQkFBekIsRUFBNkMsTUFBN0M7ZUFDQSxJQUFDLENBQUEsSUFBRCxDQUFNLDRCQUFOLEVBRkY7O0lBTlM7OzhCQVVYLFNBQUEsR0FBVyxTQUFDLE9BQUQ7QUFDVCxVQUFBO01BQUEsSUFBRyxTQUFDLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBUixDQUFZLG9DQUFaLEVBQUEsS0FBc0QsS0FBdEQsSUFBQSxJQUFBLEtBQTZELFFBQTlELENBQUEsbUZBQStILENBQUUsZ0JBQXBELEdBQTZELENBQTdJO0FBQ0U7YUFBQSx3Q0FBQTs7dUJBQ0UsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsTUFBTSxDQUFDLE1BQVAsQ0FBYyxPQUFkLEVBQXVCO1lBQ3RDLFlBQUEsRUFBYyxLQUFLLENBQUMsWUFEa0I7WUFFdEMsV0FBQSxFQUFhLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBbkIsQ0FBMEIsU0FBQyxhQUFEO3FCQUFtQixFQUFFLENBQUMsZUFBSCxDQUFtQixhQUFuQjtZQUFuQixDQUExQixDQUZ5QjtZQUd0QyxVQUFBLEVBQVksRUFIMEI7WUFJdEMsT0FBQSxFQUFTLElBQUMsQ0FBQSxPQUo0QjtZQUt0QyxRQUFBLEVBQVUsSUFBQyxDQUFBLFFBTDJCO1dBQXZCLENBQWpCO0FBREY7dUJBREY7T0FBQSxNQUFBO2VBVUUsS0FWRjs7SUFEUzs7OEJBdUJYLE9BQUEsR0FBUyxTQUFDLEdBQUQ7QUFDUCxVQUFBO01BRFMsMkJBQVcsdUJBQVMseUJBQVU7TUFDdkMsSUFBTyxxQkFBUDtRQUNFLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSO1FBQ2pCLElBQUMsQ0FBQSxRQUFELEdBQWdCLElBQUEsY0FBQSxDQUFlLEVBQWY7UUFDaEIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxVQUFWLENBQ0U7VUFBQSxhQUFBLEVBQWUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUEzQjtVQUNBLE9BQUEsRUFBUyxPQURUO1VBRUEsWUFBQSxFQUFjLElBQUMsQ0FBQSxZQUZmO1NBREYsRUFIRjs7TUFRQSxXQUFBLEdBQWMsR0FBRyxDQUFDLEtBQUosQ0FBVSxTQUFWLENBQW9CLENBQUM7TUFDbkMsSUFBQSxHQUFPLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLFFBQVEsQ0FBQywyQkFBVixDQUFBLENBQVAsRUFBZ0QsU0FBQyxJQUFEO0FBQVksWUFBQTtRQUFWLE9BQUQ7ZUFBVyxJQUFBLEtBQVE7TUFBcEIsQ0FBaEQ7TUFDUCxJQUFHLFlBQUg7UUFDRSxJQUFHLElBQUksQ0FBQyxPQUFSO1VBQ0UsV0FBQSxHQUFjLElBQUMsQ0FBQSxRQUFRLENBQUMsa0JBQVYsQ0FBNkIsV0FBN0I7VUFDZCwwQkFBQSxHQUE2QixJQUFJLENBQUMsT0FBTCxDQUFhLFdBQWIsRUFBMEIsSUFBSSxDQUFDLE9BQS9CO1VBQzdCLGdCQUFBLEdBQW1CLElBQUMsQ0FBQSx5QkFBRCxDQUFBO2lCQUNmLElBQUEsVUFBQSxDQUFXLElBQVgsRUFBaUIsSUFBQyxDQUFBLG1CQUFsQixFQUF1QztZQUFDLDRCQUFBLDBCQUFEO1lBQThCLGNBQUQsSUFBQyxDQUFBLFlBQTlCO1lBQTRDLFNBQUEsT0FBNUM7WUFBcUQsVUFBQSxRQUFyRDtZQUErRCxXQUFBLFNBQS9EO1lBQTBFLGtCQUFBLGdCQUExRTtZQUE0RixLQUFBLEdBQTVGO1dBQXZDLEVBSk47U0FBQSxNQUFBO2lCQU1FLE9BQU8sQ0FBQyxHQUFSLENBQVksV0FBQSxHQUFZLElBQUksQ0FBQyxJQUFqQixHQUFzQiw4QkFBdEIsR0FBb0QsU0FBaEUsRUFORjtTQURGO09BQUEsTUFBQTtlQVNFLE9BQU8sQ0FBQyxHQUFSLENBQVksdUJBQUEsR0FBd0IsU0FBcEMsRUFURjs7SUFYTzs7OEJBK0JULFFBQUEsR0FBVSxTQUFDLEdBQUQ7QUFDUixVQUFBO01BRFUseUJBQVUsaUNBQWMsaUNBQWMsK0JBQWEsdUJBQVMseUJBQVUsdUJBQVM7TUFDekYsSUFBRyxZQUFBLEtBQWtCLElBQUMsQ0FBQSxZQUFuQixJQUFvQyxDQUFJLEVBQUUsQ0FBQyxVQUFILENBQWMsWUFBZCxDQUEzQztRQUNFLFlBQUEsR0FBZSxJQUFDLENBQUEsYUFEbEI7O01BR0EsZ0JBQUEsR0FBbUIsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsT0FBbEI7TUFDbkIsSUFBQSxDQUFPLE1BQU0sQ0FBQyxLQUFQLENBQWEsZ0JBQWIsQ0FBUDtRQUNFLGNBQUEsR0FBaUIsU0FBQTtVQUNmLE9BQU8sQ0FBQyxHQUFSLENBQVkseUVBQUEsR0FBMEUsZ0JBQTFFLEdBQTJGLFdBQXZHO2lCQUNBLE9BQU8sQ0FBQyxJQUFSLENBQWEsR0FBYjtRQUZlO1FBR2pCLFVBQUEsQ0FBVyxjQUFYLEVBQTJCLGdCQUFBLEdBQW1CLElBQTlDLEVBSkY7O0FBTUE7UUFDRSwwQkFBQSxHQUE2QixPQUFPLENBQUMsT0FBUixDQUFnQixJQUFJLENBQUMsT0FBTCxDQUFhLElBQUMsQ0FBQSxlQUFkLEVBQStCLEtBQS9CLEVBQXNDLHdCQUF0QyxDQUFoQixFQUQvQjtPQUFBLGNBQUE7UUFFTTtRQUNKLDBCQUFBLEdBQTZCLE9BQU8sQ0FBQyxPQUFSLENBQWdCLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixJQUF4QixFQUE4QixJQUE5QixFQUFvQyxLQUFwQyxFQUEyQyx3QkFBM0MsQ0FBaEIsRUFIL0I7O01BS0EsU0FBQSxHQUFZO01BQ1osSUFBRyxtQkFBSDtBQUNFLGFBQUEsNkNBQUE7O1VBQ0UsU0FBUyxDQUFDLElBQVYsQ0FBZSxJQUFJLENBQUMsT0FBTCxDQUFhLFlBQWIsRUFBMkIsRUFBRSxDQUFDLFNBQUgsQ0FBYSxVQUFiLENBQTNCLENBQWY7QUFERixTQURGOztNQUlBLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBb0IsQ0FBdkI7UUFDRSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQWYsQ0FBcUIsMkNBQXJCO1FBQ0EsT0FBTyxDQUFDLElBQVIsQ0FBYSxDQUFiLEVBRkY7O01BSUEsb0JBQUEsR0FBdUIsSUFBQyxDQUFBLDJCQUFELENBQUE7TUFDdkIsY0FBQSxHQUFpQixJQUFDLENBQUEscUJBQUQsQ0FBdUIsU0FBVSxDQUFBLENBQUEsQ0FBakM7TUFDakIsT0FBQSxHQUFVO01BQ1YsTUFBQSxHQUFTOztRQUNULFdBQVk7O2FBQ1IsSUFBQSxVQUFBLENBQVcsSUFBWCxFQUFpQixJQUFDLENBQUEsbUJBQWxCLEVBQXVDO1FBQUMsNEJBQUEsMEJBQUQ7UUFBNkIsY0FBQSxZQUE3QjtRQUEyQyxVQUFBLFFBQTNDO1FBQXFELFFBQUEsTUFBckQ7UUFBNkQsU0FBQSxPQUE3RDtRQUFzRSxnQkFBQSxjQUF0RTtRQUFzRixzQkFBQSxvQkFBdEY7UUFBNEcsV0FBQSxTQUE1RztRQUF1SCxTQUFBLE9BQXZIO1FBQWdJLFVBQUEsUUFBaEk7UUFBMEksS0FBQSxHQUExSTtPQUF2QztJQTlCSTs7OEJBZ0NWLGFBQUEsR0FBZSxTQUFDLEdBQUQ7QUFDYixVQUFBO01BRGUseUJBQVUsaUJBQU0saUNBQWMsaUNBQWMsK0JBQWE7TUFDeEUsSUFBRyxZQUFBLEtBQWtCLElBQUMsQ0FBQSxZQUFuQixJQUFvQyxDQUFJLEVBQUUsQ0FBQyxVQUFILENBQWMsWUFBZCxDQUEzQztRQUNFLFlBQUEsR0FBZSxJQUFDLENBQUEsYUFEbEI7O0FBR0E7UUFDRSwwQkFBQSxHQUE2QixPQUFPLENBQUMsT0FBUixDQUFnQixJQUFJLENBQUMsT0FBTCxDQUFhLElBQUMsQ0FBQSxlQUFkLEVBQStCLEtBQS9CLEVBQXNDLDZCQUF0QyxDQUFoQixFQUQvQjtPQUFBLGNBQUE7UUFFTTtRQUNKLDBCQUFBLEdBQTZCLE9BQU8sQ0FBQyxPQUFSLENBQWdCLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixJQUF4QixFQUE4QixJQUE5QixFQUFvQyxLQUFwQyxFQUEyQyw2QkFBM0MsQ0FBaEIsRUFIL0I7O01BS0EsY0FBQSxHQUFpQjtNQUNqQixJQUFHLG1CQUFIO0FBQ0UsYUFBQSw2Q0FBQTs7VUFDRSxjQUFjLENBQUMsSUFBZixDQUFvQixJQUFJLENBQUMsT0FBTCxDQUFhLFlBQWIsRUFBMkIsRUFBRSxDQUFDLFNBQUgsQ0FBYSxVQUFiLENBQTNCLENBQXBCO0FBREYsU0FERjs7TUFJQSxJQUFHLGNBQWMsQ0FBQyxNQUFmLEtBQXlCLENBQTVCO1FBQ0UsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFmLENBQXFCLGlEQUFyQjtRQUNBLE9BQU8sQ0FBQyxJQUFSLENBQWEsQ0FBYixFQUZGOztNQUlBLE9BQUEsR0FBVTtNQUNWLE1BQUEsR0FBUztNQUNULFFBQUEsR0FBVzthQUNQLElBQUEsVUFBQSxDQUFXLElBQVgsRUFBaUIsSUFBQyxDQUFBLG1CQUFsQixFQUF1QztRQUFDLDRCQUFBLDBCQUFEO1FBQTZCLGNBQUEsWUFBN0I7UUFBMkMsVUFBQSxRQUEzQztRQUFxRCxNQUFBLElBQXJEO1FBQTJELFFBQUEsTUFBM0Q7UUFBbUUsU0FBQSxPQUFuRTtRQUE0RSxnQkFBQSxjQUE1RTtRQUE0RixVQUFBLFFBQTVGO1FBQXNHLEtBQUEsR0FBdEc7T0FBdkM7SUFyQlM7OzhCQXVCZixxQkFBQSxHQUF1QixTQUFDLFFBQUQ7QUFDckIsVUFBQTs7UUFBQSxnQkFBaUIsT0FBQSxDQUFRLGlCQUFSOztNQUVqQixJQUFHLFdBQUEsR0FBYyxhQUFhLENBQUMsSUFBZCxDQUFtQixRQUFuQixFQUE2QixjQUE3QixDQUFqQjtRQUNFLGVBQUEsR0FBa0IsT0FBQSxDQUFRLElBQUksQ0FBQyxJQUFMLENBQVUsV0FBVixFQUF1QixjQUF2QixDQUFSO1FBQ2xCLElBQUcsZUFBZSxDQUFDLGNBQW5COztZQUNFLFVBQVcsT0FBQSxDQUFRLFNBQVI7O1VBQ1gsSUFBRyxjQUFBLEdBQWlCLE9BQU8sQ0FBQyxJQUFSLENBQWEsZUFBZSxDQUFDLGNBQTdCLEVBQTZDO1lBQUEsT0FBQSxFQUFTLFdBQVQ7WUFBc0IsVUFBQSxFQUFZLE1BQU0sQ0FBQyxJQUFQLENBQVksT0FBTyxDQUFDLFVBQXBCLENBQWxDO1dBQTdDLENBQXBCO0FBQ0UsbUJBQU8sZUFEVDtXQUFBLE1BQUE7WUFHRSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQWYsQ0FBcUIsNkNBQUEsR0FBOEMsZUFBZSxDQUFDLGNBQTlELEdBQTZFLEdBQWxHO1lBQ0EsT0FBTyxDQUFDLElBQVIsQ0FBYSxDQUFiLEVBSkY7V0FGRjtTQUZGOzthQVVBLElBQUMsQ0FBQSwyQkFBRCxDQUFBO0lBYnFCOzs4QkFldkIsMkJBQUEsR0FBNkIsU0FBQTtBQUMzQixVQUFBO0FBQUE7ZUFDRSxPQUFPLENBQUMsT0FBUixDQUFnQixJQUFJLENBQUMsT0FBTCxDQUFhLElBQUMsQ0FBQSxlQUFkLEVBQStCLE1BQS9CLEVBQXVDLHFCQUF2QyxDQUFoQixFQURGO09BQUEsY0FBQTtRQUVNO2VBQ0osT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsSUFBSSxDQUFDLE9BQUwsQ0FBYSxTQUFiLEVBQXdCLElBQXhCLEVBQThCLElBQTlCLEVBQW9DLE1BQXBDLEVBQTRDLHFCQUE1QyxDQUFoQixFQUhGOztJQUQyQjs7OEJBTTdCLHFCQUFBLEdBQXVCLFNBQUMsVUFBRCxFQUFhLFlBQWIsRUFBOEIsZ0JBQTlCO0FBQ3JCLFVBQUE7O1FBRGtDLGVBQWE7O01BQy9DLElBQUEsQ0FBMkIsVUFBM0I7QUFBQSxlQUFPO1VBQUMsWUFBQSxVQUFEO1VBQVA7O01BRUEsVUFBQSxHQUFhLFVBQVUsQ0FBQyxPQUFYLENBQW1CLFNBQW5CLEVBQThCLEVBQTlCO01BQ2IsS0FBQSxHQUFRLFVBQVUsQ0FBQyxLQUFYLENBQWlCLG9CQUFqQjtNQUVSLElBQUcsYUFBSDtRQUNFLFVBQUEsR0FBYSxVQUFVLENBQUMsS0FBWCxDQUFpQixDQUFqQixFQUFvQixDQUFDLEtBQU0sQ0FBQSxDQUFBLENBQUUsQ0FBQyxNQUE5QjtRQUNiLElBQThELEtBQU0sQ0FBQSxDQUFBLENBQXBFO1VBQUEsV0FBQSxHQUFjLElBQUksQ0FBQyxHQUFMLENBQVMsQ0FBVCxFQUFZLFFBQUEsQ0FBUyxLQUFNLENBQUEsQ0FBQSxDQUFFLENBQUMsS0FBVCxDQUFlLENBQWYsQ0FBVCxDQUFBLEdBQThCLENBQTFDLEVBQWQ7O1FBQ0EsSUFBZ0UsS0FBTSxDQUFBLENBQUEsQ0FBdEU7VUFBQSxhQUFBLEdBQWdCLElBQUksQ0FBQyxHQUFMLENBQVMsQ0FBVCxFQUFZLFFBQUEsQ0FBUyxLQUFNLENBQUEsQ0FBQSxDQUFFLENBQUMsS0FBVCxDQUFlLENBQWYsQ0FBVCxDQUFBLEdBQThCLENBQTFDLEVBQWhCO1NBSEY7T0FBQSxNQUFBO1FBS0UsV0FBQSxHQUFjLGFBQUEsR0FBZ0IsS0FMaEM7O01BT0EsSUFBTyxzQ0FBUDtRQUNFLFVBQUEsR0FBYSxJQUFJLENBQUMsT0FBTCxDQUFhLFlBQWIsRUFBMkIsRUFBRSxDQUFDLFNBQUgsQ0FBYSxVQUFiLENBQTNCLEVBRGY7O2FBR0E7UUFBQyxZQUFBLFVBQUQ7UUFBYSxhQUFBLFdBQWI7UUFBMEIsZUFBQSxhQUExQjtRQUF5QyxrQkFBQSxnQkFBekM7O0lBaEJxQjs7OEJBZ0N2QixtQkFBQSxHQUFxQixTQUFDLElBQUQsRUFBTyxHQUFQLEVBQW9DLElBQXBDO0FBQ25CLFVBQUE7TUFEMkIsdUJBQVMseUJBQVU7O1FBQVMsT0FBSzs7YUFDNUQsSUFBQyxDQUFBLGFBQUQsQ0FBZSxJQUFmLEVBQXFCLENBQUMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLFdBQUQ7aUJBQ3BCLEtBQUMsQ0FBQSxTQUFELENBQVc7WUFBQyxhQUFBLFdBQUQ7WUFBYyxTQUFBLE9BQWQ7WUFBdUIsVUFBQSxRQUF2QjtZQUFpQyxRQUFBLE1BQWpDO1dBQVg7UUFEb0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUQsQ0FBckIsRUFDeUQsSUFEekQ7SUFEbUI7OzhCQUlyQixhQUFBLEdBQWUsU0FBQyxJQUFELEVBQU8sUUFBUCxFQUFpQixJQUFqQjtBQUNiLFVBQUE7TUFBQSxVQUFBO0FBQ0UsZ0JBQU8sSUFBUDtBQUFBLGVBQ08sTUFEUDttQkFDbUIsQ0FBQyxVQUFEO0FBRG5CLGVBRU8sUUFGUDttQkFFcUIsQ0FBQyxlQUFEO0FBRnJCLGVBR08sS0FIUDttQkFHa0IsQ0FBQyxVQUFELEVBQWEsZUFBYjtBQUhsQjtBQUlPLGtCQUFVLElBQUEsS0FBQSxDQUFTLElBQUQsR0FBTSx1Q0FBZDtBQUpqQjs7TUFRRixZQUFBLEdBQ0ssT0FBTyxDQUFDLFFBQVIsS0FBb0IsUUFBdkIsR0FDRSxJQURGLEdBR0UsYUFBYSxDQUFDLGdCQUFkLENBQUE7TUFFSixXQUFBLEdBQ0U7UUFBQSxVQUFBLEVBQVksVUFBVSxDQUFDLE1BQVgsQ0FBa0IsQ0FBQyxpQkFBRCxFQUFvQixpQkFBcEIsQ0FBbEIsQ0FBWjtRQUNBLEtBQUE7QUFBTyxrQkFBTyxJQUFQO0FBQUEsaUJBQ0EsTUFEQTtxQkFDWTtBQURaLGlCQUVBLFFBRkE7cUJBRWM7QUFGZDtxQkFHQTtBQUhBO1lBRFA7O01BT0YsSUFBRyxZQUFIO1FBQ0UsV0FBVyxDQUFDLFdBQVosR0FBMEIsS0FENUI7O2FBR0EsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsWUFBdEIsRUFBb0MsV0FBcEMsRUFBaUQsUUFBakQ7SUEzQmE7OzhCQTZCZixnQkFBQSxHQUFrQixTQUFBO0FBQ2hCLFVBQUE7TUFBQSxNQUFBLEdBQVMsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsYUFBYSxDQUFDLGdCQUFkLENBQUEsQ0FBdEIsRUFDUDtRQUFBLElBQUEsRUFBTSxTQUFOO1FBQ0EsS0FBQSxFQUFPLGtCQURQO1FBRUEsT0FBQSxFQUFTLCtEQUZUO1FBR0EsT0FBQSxFQUFTLENBQUMsY0FBRCxFQUFpQixRQUFqQixDQUhUO09BRE87TUFLVCxJQUFHLE1BQUEsS0FBVSxDQUFiO2VBQ0UsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQURGOztJQU5nQjs7OEJBU2xCLE9BQUEsR0FBUyxTQUFBO0FBQ1AsVUFBQTtNQUFBLElBQUEsR0FBTztNQUNQLElBQXVCLElBQUMsQ0FBQSxRQUF4QjtRQUFBLElBQUksQ0FBQyxJQUFMLENBQVUsUUFBVixFQUFBOztNQUNBLElBQXVDLG9CQUF2QztRQUFBLElBQUksQ0FBQyxJQUFMLENBQVUsYUFBQSxHQUFjLElBQUMsQ0FBQSxPQUF6QixFQUFBOztNQUNBLElBQTZDLHVCQUE3QztRQUFBLElBQUksQ0FBQyxJQUFMLENBQVUsZ0JBQUEsR0FBaUIsSUFBQyxDQUFBLFVBQTVCLEVBQUE7O01BQ0EsSUFBZ0Qsd0JBQWhEO1FBQUEsSUFBSSxDQUFDLElBQUwsQ0FBVSxrQkFBQSxHQUFtQixJQUFDLENBQUEsV0FBOUIsRUFBQTs7TUFDQSxJQUFHLElBQUMsQ0FBQSxPQUFKO1FBQ0UsSUFBSSxDQUFDLElBQUwsQ0FBVSxPQUFWO1FBQ0EsSUFBSSxDQUFDLElBQUwsQ0FBVSxrQkFBQSxHQUFtQixJQUFDLENBQUEsWUFBOUIsRUFGRjs7TUFHQSxHQUFHLENBQUMsUUFBSixDQUFhO1FBQUMsTUFBQSxJQUFEO09BQWI7YUFDQSxHQUFHLENBQUMsSUFBSixDQUFBO0lBVk87OzhCQVlULDBCQUFBLEdBQTRCLFNBQUE7QUFDMUIsVUFBQTtNQUFBLGFBQUEsR0FBZ0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO0FBQ2QsY0FBQTtBQUFBO0FBQUE7ZUFBQSxzQ0FBQTs7eUJBQ0UsTUFBTSxDQUFDLFdBQVAsQ0FBQTtBQURGOztRQURjO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtNQU9oQixNQUFNLENBQUMsRUFBUCxDQUFVLGVBQVYsRUFBMkIsYUFBM0I7TUFDQSxNQUFNLENBQUMsRUFBUCxDQUFVLGlCQUFWLEVBQTZCLGFBQTdCO2FBQ0ksSUFBQSxVQUFBLENBQVcsU0FBQTtRQUNiLE1BQU0sQ0FBQyxjQUFQLENBQXNCLGVBQXRCLEVBQXVDLGFBQXZDO2VBQ0EsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsaUJBQXRCLEVBQXlDLGFBQXpDO01BRmEsQ0FBWDtJQVZzQjs7Ozs7QUEvekI5QiIsInNvdXJjZXNDb250ZW50IjpbIkF0b21XaW5kb3cgPSByZXF1aXJlICcuL2F0b20td2luZG93J1xuQXBwbGljYXRpb25NZW51ID0gcmVxdWlyZSAnLi9hcHBsaWNhdGlvbi1tZW51J1xuQXRvbVByb3RvY29sSGFuZGxlciA9IHJlcXVpcmUgJy4vYXRvbS1wcm90b2NvbC1oYW5kbGVyJ1xuQXV0b1VwZGF0ZU1hbmFnZXIgPSByZXF1aXJlICcuL2F1dG8tdXBkYXRlLW1hbmFnZXInXG5TdG9yYWdlRm9sZGVyID0gcmVxdWlyZSAnLi4vc3RvcmFnZS1mb2xkZXInXG5Db25maWcgPSByZXF1aXJlICcuLi9jb25maWcnXG5GaWxlUmVjb3ZlcnlTZXJ2aWNlID0gcmVxdWlyZSAnLi9maWxlLXJlY292ZXJ5LXNlcnZpY2UnXG5pcGNIZWxwZXJzID0gcmVxdWlyZSAnLi4vaXBjLWhlbHBlcnMnXG57QnJvd3NlcldpbmRvdywgTWVudSwgYXBwLCBkaWFsb2csIGlwY01haW4sIHNoZWxsLCBzY3JlZW59ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG57Q29tcG9zaXRlRGlzcG9zYWJsZSwgRGlzcG9zYWJsZX0gPSByZXF1aXJlICdldmVudC1raXQnXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG5wYXRoID0gcmVxdWlyZSAncGF0aCdcbm9zID0gcmVxdWlyZSAnb3MnXG5uZXQgPSByZXF1aXJlICduZXQnXG51cmwgPSByZXF1aXJlICd1cmwnXG57RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50cydcbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG5GaW5kUGFyZW50RGlyID0gbnVsbFxuUmVzb2x2ZSA9IG51bGxcbkNvbmZpZ1NjaGVtYSA9IHJlcXVpcmUgJy4uL2NvbmZpZy1zY2hlbWEnXG5cbkxvY2F0aW9uU3VmZml4UmVnRXhwID0gLyg6XFxkKykoOlxcZCspPyQvXG5cbiMgVGhlIGFwcGxpY2F0aW9uJ3Mgc2luZ2xldG9uIGNsYXNzLlxuI1xuIyBJdCdzIHRoZSBlbnRyeSBwb2ludCBpbnRvIHRoZSBBdG9tIGFwcGxpY2F0aW9uIGFuZCBtYWludGFpbnMgdGhlIGdsb2JhbCBzdGF0ZVxuIyBvZiB0aGUgYXBwbGljYXRpb24uXG4jXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBBdG9tQXBwbGljYXRpb25cbiAgT2JqZWN0LmFzc2lnbiBAcHJvdG90eXBlLCBFdmVudEVtaXR0ZXIucHJvdG90eXBlXG5cbiAgIyBQdWJsaWM6IFRoZSBlbnRyeSBwb2ludCBpbnRvIHRoZSBBdG9tIGFwcGxpY2F0aW9uLlxuICBAb3BlbjogKG9wdGlvbnMpIC0+XG4gICAgdW5sZXNzIG9wdGlvbnMuc29ja2V0UGF0aD9cbiAgICAgIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJ1xuICAgICAgICB1c2VyTmFtZVNhZmUgPSBuZXcgQnVmZmVyKHByb2Nlc3MuZW52LlVTRVJOQU1FKS50b1N0cmluZygnYmFzZTY0JylcbiAgICAgICAgb3B0aW9ucy5zb2NrZXRQYXRoID0gXCJcXFxcXFxcXC5cXFxccGlwZVxcXFxhdG9tLSN7b3B0aW9ucy52ZXJzaW9ufS0je3VzZXJOYW1lU2FmZX0tI3twcm9jZXNzLmFyY2h9LXNvY2tcIlxuICAgICAgZWxzZVxuICAgICAgICBvcHRpb25zLnNvY2tldFBhdGggPSBwYXRoLmpvaW4ob3MudG1wZGlyKCksIFwiYXRvbS0je29wdGlvbnMudmVyc2lvbn0tI3twcm9jZXNzLmVudi5VU0VSfS5zb2NrXCIpXG5cbiAgICAjIEZJWE1FOiBTb21ldGltZXMgd2hlbiBzb2NrZXRQYXRoIGRvZXNuJ3QgZXhpc3QsIG5ldC5jb25uZWN0IHdvdWxkIHN0cmFuZ2VseVxuICAgICMgdGFrZSBhIGZldyBzZWNvbmRzIHRvIHRyaWdnZXIgJ2Vycm9yJyBldmVudCwgaXQgY291bGQgYmUgYSBidWcgb2Ygbm9kZVxuICAgICMgb3IgYXRvbS1zaGVsbCwgYmVmb3JlIGl0J3MgZml4ZWQgd2UgY2hlY2sgdGhlIGV4aXN0ZW5jZSBvZiBzb2NrZXRQYXRoIHRvXG4gICAgIyBzcGVlZHVwIHN0YXJ0dXAuXG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gaXNudCAnd2luMzInIGFuZCBub3QgZnMuZXhpc3RzU3luYyBvcHRpb25zLnNvY2tldFBhdGgpIG9yIG9wdGlvbnMudGVzdCBvciBvcHRpb25zLmJlbmNobWFyayBvciBvcHRpb25zLmJlbmNobWFya1Rlc3RcbiAgICAgIG5ldyBBdG9tQXBwbGljYXRpb24ob3B0aW9ucykuaW5pdGlhbGl6ZShvcHRpb25zKVxuICAgICAgcmV0dXJuXG5cbiAgICBjbGllbnQgPSBuZXQuY29ubmVjdCB7cGF0aDogb3B0aW9ucy5zb2NrZXRQYXRofSwgLT5cbiAgICAgIGNsaWVudC53cml0ZSBKU09OLnN0cmluZ2lmeShvcHRpb25zKSwgLT5cbiAgICAgICAgY2xpZW50LmVuZCgpXG4gICAgICAgIGFwcC5xdWl0KClcblxuICAgIGNsaWVudC5vbiAnZXJyb3InLCAtPiBuZXcgQXRvbUFwcGxpY2F0aW9uKG9wdGlvbnMpLmluaXRpYWxpemUob3B0aW9ucylcblxuICB3aW5kb3dzOiBudWxsXG4gIGFwcGxpY2F0aW9uTWVudTogbnVsbFxuICBhdG9tUHJvdG9jb2xIYW5kbGVyOiBudWxsXG4gIHJlc291cmNlUGF0aDogbnVsbFxuICB2ZXJzaW9uOiBudWxsXG4gIHF1aXR0aW5nOiBmYWxzZVxuXG4gIGV4aXQ6IChzdGF0dXMpIC0+IGFwcC5leGl0KHN0YXR1cylcblxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAge0ByZXNvdXJjZVBhdGgsIEBkZXZSZXNvdXJjZVBhdGgsIEB2ZXJzaW9uLCBAZGV2TW9kZSwgQHNhZmVNb2RlLCBAc29ja2V0UGF0aCwgQGxvZ0ZpbGUsIEB1c2VyRGF0YURpcn0gPSBvcHRpb25zXG4gICAgQHNvY2tldFBhdGggPSBudWxsIGlmIG9wdGlvbnMudGVzdCBvciBvcHRpb25zLmJlbmNobWFyayBvciBvcHRpb25zLmJlbmNobWFya1Rlc3RcbiAgICBAcGlkc1RvT3BlbldpbmRvd3MgPSB7fVxuICAgIEB3aW5kb3dzID0gW11cblxuICAgIEBjb25maWcgPSBuZXcgQ29uZmlnKHtlbmFibGVQZXJzaXN0ZW5jZTogdHJ1ZX0pXG4gICAgQGNvbmZpZy5zZXRTY2hlbWEgbnVsbCwge3R5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiBfLmNsb25lKENvbmZpZ1NjaGVtYSl9XG4gICAgQ29uZmlnU2NoZW1hLnByb2plY3RIb21lID0ge1xuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZWZhdWx0OiBwYXRoLmpvaW4oZnMuZ2V0SG9tZURpcmVjdG9yeSgpLCAnZ2l0aHViJyksXG4gICAgICBkZXNjcmlwdGlvbjogJ1RoZSBkaXJlY3Rvcnkgd2hlcmUgcHJvamVjdHMgYXJlIGFzc3VtZWQgdG8gYmUgbG9jYXRlZC4gUGFja2FnZXMgY3JlYXRlZCB1c2luZyB0aGUgUGFja2FnZSBHZW5lcmF0b3Igd2lsbCBiZSBzdG9yZWQgaGVyZSBieSBkZWZhdWx0LidcbiAgICB9XG4gICAgQGNvbmZpZy5pbml0aWFsaXplKHtjb25maWdEaXJQYXRoOiBwcm9jZXNzLmVudi5BVE9NX0hPTUUsIEByZXNvdXJjZVBhdGgsIHByb2plY3RIb21lU2NoZW1hOiBDb25maWdTY2hlbWEucHJvamVjdEhvbWV9KVxuICAgIEBjb25maWcubG9hZCgpXG4gICAgQGZpbGVSZWNvdmVyeVNlcnZpY2UgPSBuZXcgRmlsZVJlY292ZXJ5U2VydmljZShwYXRoLmpvaW4ocHJvY2Vzcy5lbnYuQVRPTV9IT01FLCBcInJlY292ZXJ5XCIpKVxuICAgIEBzdG9yYWdlRm9sZGVyID0gbmV3IFN0b3JhZ2VGb2xkZXIocHJvY2Vzcy5lbnYuQVRPTV9IT01FKVxuICAgIEBhdXRvVXBkYXRlTWFuYWdlciA9IG5ldyBBdXRvVXBkYXRlTWFuYWdlcihcbiAgICAgIEB2ZXJzaW9uLFxuICAgICAgb3B0aW9ucy50ZXN0IG9yIG9wdGlvbnMuYmVuY2htYXJrIG9yIG9wdGlvbnMuYmVuY2htYXJrVGVzdCxcbiAgICAgIEBjb25maWdcbiAgICApXG5cbiAgICBAZGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgQGhhbmRsZUV2ZW50cygpXG5cbiAgIyBUaGlzIHN0dWZmIHdhcyBwcmV2aW91c2x5IGRvbmUgaW4gdGhlIGNvbnN0cnVjdG9yLCBidXQgd2Ugd2FudCB0byBiZSBhYmxlIHRvIGNvbnN0cnVjdCB0aGlzIG9iamVjdFxuICAjIGZvciB0ZXN0aW5nIHB1cnBvc2VzIHdpdGhvdXQgYm9vdGluZyB1cCB0aGUgd29ybGQuIEFzIHlvdSBhZGQgdGVzdHMsIGZlZWwgZnJlZSB0byBtb3ZlIGluc3RhbnRpYXRpb25cbiAgIyBvZiB0aGVzZSB2YXJpb3VzIHN1Yi1vYmplY3RzIGludG8gdGhlIGNvbnN0cnVjdG9yLCBidXQgeW91J2xsIG5lZWQgdG8gcmVtb3ZlIHRoZSBzaWRlLWVmZmVjdHMgdGhleVxuICAjIHBlcmZvcm0gZHVyaW5nIHRoZWlyIGNvbnN0cnVjdGlvbiwgYWRkaW5nIGFuIGluaXRpYWxpemUgbWV0aG9kIHRoYXQgeW91IGNhbGwgaGVyZS5cbiAgaW5pdGlhbGl6ZTogKG9wdGlvbnMpIC0+XG4gICAgZ2xvYmFsLmF0b21BcHBsaWNhdGlvbiA9IHRoaXNcblxuICAgICMgREVQUkVDQVRFRDogVGhpcyBjYW4gYmUgcmVtb3ZlZCBhdCBzb21lIHBvaW50IChhZGRlZCBpbiAxLjEzKVxuICAgICMgSXQgY29udmVydHMgYHVzZUN1c3RvbVRpdGxlQmFyOiB0cnVlYCB0byBgdGl0bGVCYXI6IFwiY3VzdG9tXCJgXG4gICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJyBhbmQgQGNvbmZpZy5nZXQoJ2NvcmUudXNlQ3VzdG9tVGl0bGVCYXInKVxuICAgICAgQGNvbmZpZy51bnNldCgnY29yZS51c2VDdXN0b21UaXRsZUJhcicpXG4gICAgICBAY29uZmlnLnNldCgnY29yZS50aXRsZUJhcicsICdjdXN0b20nKVxuXG4gICAgQGNvbmZpZy5vbkRpZENoYW5nZSAnY29yZS50aXRsZUJhcicsIEBwcm9tcHRGb3JSZXN0YXJ0LmJpbmQodGhpcylcblxuICAgIHByb2Nlc3MubmV4dFRpY2sgPT4gQGF1dG9VcGRhdGVNYW5hZ2VyLmluaXRpYWxpemUoKVxuICAgIEBhcHBsaWNhdGlvbk1lbnUgPSBuZXcgQXBwbGljYXRpb25NZW51KEB2ZXJzaW9uLCBAYXV0b1VwZGF0ZU1hbmFnZXIpXG4gICAgQGF0b21Qcm90b2NvbEhhbmRsZXIgPSBuZXcgQXRvbVByb3RvY29sSGFuZGxlcihAcmVzb3VyY2VQYXRoLCBAc2FmZU1vZGUpXG5cbiAgICBAbGlzdGVuRm9yQXJndW1lbnRzRnJvbU5ld1Byb2Nlc3MoKVxuICAgIEBzZXR1cERvY2tNZW51KClcblxuICAgIEBsYXVuY2gob3B0aW9ucylcblxuICBkZXN0cm95OiAtPlxuICAgIHdpbmRvd3NDbG9zZVByb21pc2VzID0gQHdpbmRvd3MubWFwICh3aW5kb3cpIC0+XG4gICAgICB3aW5kb3cuY2xvc2UoKVxuICAgICAgd2luZG93LmNsb3NlZFByb21pc2VcbiAgICBQcm9taXNlLmFsbCh3aW5kb3dzQ2xvc2VQcm9taXNlcykudGhlbig9PiBAZGlzcG9zYWJsZS5kaXNwb3NlKCkpXG5cbiAgbGF1bmNoOiAob3B0aW9ucykgLT5cbiAgICBpZiBvcHRpb25zLnBhdGhzVG9PcGVuPy5sZW5ndGggPiAwIG9yIG9wdGlvbnMudXJsc1RvT3Blbj8ubGVuZ3RoID4gMCBvciBvcHRpb25zLnRlc3Qgb3Igb3B0aW9ucy5iZW5jaG1hcmsgb3Igb3B0aW9ucy5iZW5jaG1hcmtUZXN0XG4gICAgICBpZiBAY29uZmlnLmdldCgnY29yZS5yZXN0b3JlUHJldmlvdXNXaW5kb3dzT25TdGFydCcpIGlzICdhbHdheXMnXG4gICAgICAgIEBsb2FkU3RhdGUoXy5kZWVwQ2xvbmUob3B0aW9ucykpXG4gICAgICBAb3BlbldpdGhPcHRpb25zKG9wdGlvbnMpXG4gICAgZWxzZVxuICAgICAgQGxvYWRTdGF0ZShvcHRpb25zKSBvciBAb3BlblBhdGgob3B0aW9ucylcblxuICBvcGVuV2l0aE9wdGlvbnM6IChvcHRpb25zKSAtPlxuICAgIHtcbiAgICAgIGluaXRpYWxQYXRocywgcGF0aHNUb09wZW4sIGV4ZWN1dGVkRnJvbSwgdXJsc1RvT3BlbiwgYmVuY2htYXJrLFxuICAgICAgYmVuY2htYXJrVGVzdCwgdGVzdCwgcGlkVG9LaWxsV2hlbkNsb3NlZCwgZGV2TW9kZSwgc2FmZU1vZGUsIG5ld1dpbmRvdyxcbiAgICAgIGxvZ0ZpbGUsIHByb2ZpbGVTdGFydHVwLCB0aW1lb3V0LCBjbGVhcldpbmRvd1N0YXRlLCBhZGRUb0xhc3RXaW5kb3csIGVudlxuICAgIH0gPSBvcHRpb25zXG5cbiAgICBhcHAuZm9jdXMoKVxuXG4gICAgaWYgdGVzdFxuICAgICAgQHJ1blRlc3RzKHtcbiAgICAgICAgaGVhZGxlc3M6IHRydWUsIGRldk1vZGUsIEByZXNvdXJjZVBhdGgsIGV4ZWN1dGVkRnJvbSwgcGF0aHNUb09wZW4sXG4gICAgICAgIGxvZ0ZpbGUsIHRpbWVvdXQsIGVudlxuICAgICAgfSlcbiAgICBlbHNlIGlmIGJlbmNobWFyayBvciBiZW5jaG1hcmtUZXN0XG4gICAgICBAcnVuQmVuY2htYXJrcyh7aGVhZGxlc3M6IHRydWUsIHRlc3Q6IGJlbmNobWFya1Rlc3QsIEByZXNvdXJjZVBhdGgsIGV4ZWN1dGVkRnJvbSwgcGF0aHNUb09wZW4sIHRpbWVvdXQsIGVudn0pXG4gICAgZWxzZSBpZiBwYXRoc1RvT3Blbi5sZW5ndGggPiAwXG4gICAgICBAb3BlblBhdGhzKHtcbiAgICAgICAgaW5pdGlhbFBhdGhzLCBwYXRoc1RvT3BlbiwgZXhlY3V0ZWRGcm9tLCBwaWRUb0tpbGxXaGVuQ2xvc2VkLCBuZXdXaW5kb3csXG4gICAgICAgIGRldk1vZGUsIHNhZmVNb2RlLCBwcm9maWxlU3RhcnR1cCwgY2xlYXJXaW5kb3dTdGF0ZSwgYWRkVG9MYXN0V2luZG93LCBlbnZcbiAgICAgIH0pXG4gICAgZWxzZSBpZiB1cmxzVG9PcGVuLmxlbmd0aCA+IDBcbiAgICAgIGZvciB1cmxUb09wZW4gaW4gdXJsc1RvT3BlblxuICAgICAgICBAb3BlblVybCh7dXJsVG9PcGVuLCBkZXZNb2RlLCBzYWZlTW9kZSwgZW52fSlcbiAgICBlbHNlXG4gICAgICAjIEFsd2F5cyBvcGVuIGEgZWRpdG9yIHdpbmRvdyBpZiB0aGlzIGlzIHRoZSBmaXJzdCBpbnN0YW5jZSBvZiBBdG9tLlxuICAgICAgQG9wZW5QYXRoKHtcbiAgICAgICAgaW5pdGlhbFBhdGhzLCBwaWRUb0tpbGxXaGVuQ2xvc2VkLCBuZXdXaW5kb3csIGRldk1vZGUsIHNhZmVNb2RlLCBwcm9maWxlU3RhcnR1cCxcbiAgICAgICAgY2xlYXJXaW5kb3dTdGF0ZSwgYWRkVG9MYXN0V2luZG93LCBlbnZcbiAgICAgIH0pXG5cbiAgIyBQdWJsaWM6IFJlbW92ZXMgdGhlIHtBdG9tV2luZG93fSBmcm9tIHRoZSBnbG9iYWwgd2luZG93IGxpc3QuXG4gIHJlbW92ZVdpbmRvdzogKHdpbmRvdykgLT5cbiAgICBAd2luZG93cy5zcGxpY2UoQHdpbmRvd3MuaW5kZXhPZih3aW5kb3cpLCAxKVxuICAgIGlmIEB3aW5kb3dzLmxlbmd0aCBpcyAwXG4gICAgICBAYXBwbGljYXRpb25NZW51Py5lbmFibGVXaW5kb3dTcGVjaWZpY0l0ZW1zKGZhbHNlKVxuICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpbiBbJ3dpbjMyJywgJ2xpbnV4J11cbiAgICAgICAgYXBwLnF1aXQoKVxuICAgICAgICByZXR1cm5cbiAgICBAc2F2ZVN0YXRlKHRydWUpIHVubGVzcyB3aW5kb3cuaXNTcGVjXG5cbiAgIyBQdWJsaWM6IEFkZHMgdGhlIHtBdG9tV2luZG93fSB0byB0aGUgZ2xvYmFsIHdpbmRvdyBsaXN0LlxuICBhZGRXaW5kb3c6ICh3aW5kb3cpIC0+XG4gICAgQHdpbmRvd3MucHVzaCB3aW5kb3dcbiAgICBAYXBwbGljYXRpb25NZW51Py5hZGRXaW5kb3cod2luZG93LmJyb3dzZXJXaW5kb3cpXG4gICAgd2luZG93Lm9uY2UgJ3dpbmRvdzpsb2FkZWQnLCA9PlxuICAgICAgQGF1dG9VcGRhdGVNYW5hZ2VyPy5lbWl0VXBkYXRlQXZhaWxhYmxlRXZlbnQod2luZG93KVxuXG4gICAgdW5sZXNzIHdpbmRvdy5pc1NwZWNcbiAgICAgIGZvY3VzSGFuZGxlciA9ID0+IEBsYXN0Rm9jdXNlZFdpbmRvdyA9IHdpbmRvd1xuICAgICAgYmx1ckhhbmRsZXIgPSA9PiBAc2F2ZVN0YXRlKGZhbHNlKVxuICAgICAgd2luZG93LmJyb3dzZXJXaW5kb3cub24gJ2ZvY3VzJywgZm9jdXNIYW5kbGVyXG4gICAgICB3aW5kb3cuYnJvd3NlcldpbmRvdy5vbiAnYmx1cicsIGJsdXJIYW5kbGVyXG4gICAgICB3aW5kb3cuYnJvd3NlcldpbmRvdy5vbmNlICdjbG9zZWQnLCA9PlxuICAgICAgICBAbGFzdEZvY3VzZWRXaW5kb3cgPSBudWxsIGlmIHdpbmRvdyBpcyBAbGFzdEZvY3VzZWRXaW5kb3dcbiAgICAgICAgd2luZG93LmJyb3dzZXJXaW5kb3cucmVtb3ZlTGlzdGVuZXIgJ2ZvY3VzJywgZm9jdXNIYW5kbGVyXG4gICAgICAgIHdpbmRvdy5icm93c2VyV2luZG93LnJlbW92ZUxpc3RlbmVyICdibHVyJywgYmx1ckhhbmRsZXJcbiAgICAgIHdpbmRvdy5icm93c2VyV2luZG93LndlYkNvbnRlbnRzLm9uY2UgJ2RpZC1maW5pc2gtbG9hZCcsID0+IEBzYXZlU3RhdGUoZmFsc2UpXG5cbiAgIyBDcmVhdGVzIHNlcnZlciB0byBsaXN0ZW4gZm9yIGFkZGl0aW9uYWwgYXRvbSBhcHBsaWNhdGlvbiBsYXVuY2hlcy5cbiAgI1xuICAjIFlvdSBjYW4gcnVuIHRoZSBhdG9tIGNvbW1hbmQgbXVsdGlwbGUgdGltZXMsIGJ1dCBhZnRlciB0aGUgZmlyc3QgbGF1bmNoXG4gICMgdGhlIG90aGVyIGxhdW5jaGVzIHdpbGwganVzdCBwYXNzIHRoZWlyIGluZm9ybWF0aW9uIHRvIHRoaXMgc2VydmVyIGFuZCB0aGVuXG4gICMgY2xvc2UgaW1tZWRpYXRlbHkuXG4gIGxpc3RlbkZvckFyZ3VtZW50c0Zyb21OZXdQcm9jZXNzOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQHNvY2tldFBhdGg/XG4gICAgQGRlbGV0ZVNvY2tldEZpbGUoKVxuICAgIHNlcnZlciA9IG5ldC5jcmVhdGVTZXJ2ZXIgKGNvbm5lY3Rpb24pID0+XG4gICAgICBkYXRhID0gJydcbiAgICAgIGNvbm5lY3Rpb24ub24gJ2RhdGEnLCAoY2h1bmspIC0+XG4gICAgICAgIGRhdGEgPSBkYXRhICsgY2h1bmtcblxuICAgICAgY29ubmVjdGlvbi5vbiAnZW5kJywgPT5cbiAgICAgICAgb3B0aW9ucyA9IEpTT04ucGFyc2UoZGF0YSlcbiAgICAgICAgQG9wZW5XaXRoT3B0aW9ucyhvcHRpb25zKVxuXG4gICAgc2VydmVyLmxpc3RlbiBAc29ja2V0UGF0aFxuICAgIHNlcnZlci5vbiAnZXJyb3InLCAoZXJyb3IpIC0+IGNvbnNvbGUuZXJyb3IgJ0FwcGxpY2F0aW9uIHNlcnZlciBmYWlsZWQnLCBlcnJvclxuXG4gIGRlbGV0ZVNvY2tldEZpbGU6IC0+XG4gICAgcmV0dXJuIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJyBvciBub3QgQHNvY2tldFBhdGg/XG5cbiAgICBpZiBmcy5leGlzdHNTeW5jKEBzb2NrZXRQYXRoKVxuICAgICAgdHJ5XG4gICAgICAgIGZzLnVubGlua1N5bmMoQHNvY2tldFBhdGgpXG4gICAgICBjYXRjaCBlcnJvclxuICAgICAgICAjIElnbm9yZSBFTk9FTlQgZXJyb3JzIGluIGNhc2UgdGhlIGZpbGUgd2FzIGRlbGV0ZWQgYmV0d2VlbiB0aGUgZXhpc3RzXG4gICAgICAgICMgY2hlY2sgYW5kIHRoZSBjYWxsIHRvIHVubGluayBzeW5jLiBUaGlzIG9jY3VycmVkIG9jY2FzaW9uYWxseSBvbiBDSVxuICAgICAgICAjIHdoaWNoIGlzIHdoeSB0aGlzIGNoZWNrIGlzIGhlcmUuXG4gICAgICAgIHRocm93IGVycm9yIHVubGVzcyBlcnJvci5jb2RlIGlzICdFTk9FTlQnXG5cbiAgIyBSZWdpc3RlcnMgYmFzaWMgYXBwbGljYXRpb24gY29tbWFuZHMsIG5vbi1pZGVtcG90ZW50LlxuICBoYW5kbGVFdmVudHM6IC0+XG4gICAgZ2V0TG9hZFNldHRpbmdzID0gPT5cbiAgICAgIGRldk1vZGU6IEBmb2N1c2VkV2luZG93KCk/LmRldk1vZGVcbiAgICAgIHNhZmVNb2RlOiBAZm9jdXNlZFdpbmRvdygpPy5zYWZlTW9kZVxuXG4gICAgQG9uICdhcHBsaWNhdGlvbjpxdWl0JywgLT4gYXBwLnF1aXQoKVxuICAgIEBvbiAnYXBwbGljYXRpb246bmV3LXdpbmRvdycsIC0+IEBvcGVuUGF0aChnZXRMb2FkU2V0dGluZ3MoKSlcbiAgICBAb24gJ2FwcGxpY2F0aW9uOm5ldy1maWxlJywgLT4gKEBmb2N1c2VkV2luZG93KCkgPyB0aGlzKS5vcGVuUGF0aCgpXG4gICAgQG9uICdhcHBsaWNhdGlvbjpvcGVuLWRldicsIC0+IEBwcm9tcHRGb3JQYXRoVG9PcGVuKCdhbGwnLCBkZXZNb2RlOiB0cnVlKVxuICAgIEBvbiAnYXBwbGljYXRpb246b3Blbi1zYWZlJywgLT4gQHByb21wdEZvclBhdGhUb09wZW4oJ2FsbCcsIHNhZmVNb2RlOiB0cnVlKVxuICAgIEBvbiAnYXBwbGljYXRpb246aW5zcGVjdCcsICh7eCwgeSwgYXRvbVdpbmRvd30pIC0+XG4gICAgICBhdG9tV2luZG93ID89IEBmb2N1c2VkV2luZG93KClcbiAgICAgIGF0b21XaW5kb3c/LmJyb3dzZXJXaW5kb3cuaW5zcGVjdEVsZW1lbnQoeCwgeSlcblxuICAgIEBvbiAnYXBwbGljYXRpb246b3Blbi1kb2N1bWVudGF0aW9uJywgLT4gc2hlbGwub3BlbkV4dGVybmFsKCdodHRwOi8vZmxpZ2h0LW1hbnVhbC5hdG9tLmlvLycpXG4gICAgQG9uICdhcHBsaWNhdGlvbjpvcGVuLWRpc2N1c3Npb25zJywgLT4gc2hlbGwub3BlbkV4dGVybmFsKCdodHRwczovL2Rpc2N1c3MuYXRvbS5pbycpXG4gICAgQG9uICdhcHBsaWNhdGlvbjpvcGVuLWZhcScsIC0+IHNoZWxsLm9wZW5FeHRlcm5hbCgnaHR0cHM6Ly9hdG9tLmlvL2ZhcScpXG4gICAgQG9uICdhcHBsaWNhdGlvbjpvcGVuLXRlcm1zLW9mLXVzZScsIC0+IHNoZWxsLm9wZW5FeHRlcm5hbCgnaHR0cHM6Ly9hdG9tLmlvL3Rlcm1zJylcbiAgICBAb24gJ2FwcGxpY2F0aW9uOnJlcG9ydC1pc3N1ZScsIC0+IHNoZWxsLm9wZW5FeHRlcm5hbCgnaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9ibG9iL21hc3Rlci9DT05UUklCVVRJTkcubWQjcmVwb3J0aW5nLWJ1Z3MnKVxuICAgIEBvbiAnYXBwbGljYXRpb246c2VhcmNoLWlzc3VlcycsIC0+IHNoZWxsLm9wZW5FeHRlcm5hbCgnaHR0cHM6Ly9naXRodWIuY29tL3NlYXJjaD9xPStpcyUzQWlzc3VlK3VzZXIlM0FhdG9tJylcblxuICAgIEBvbiAnYXBwbGljYXRpb246aW5zdGFsbC11cGRhdGUnLCA9PlxuICAgICAgQHF1aXR0aW5nID0gdHJ1ZVxuICAgICAgQGF1dG9VcGRhdGVNYW5hZ2VyLmluc3RhbGwoKVxuXG4gICAgQG9uICdhcHBsaWNhdGlvbjpjaGVjay1mb3ItdXBkYXRlJywgPT4gQGF1dG9VcGRhdGVNYW5hZ2VyLmNoZWNrKClcblxuICAgIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbidcbiAgICAgIEBvbiAnYXBwbGljYXRpb246YnJpbmctYWxsLXdpbmRvd3MtdG8tZnJvbnQnLCAtPiBNZW51LnNlbmRBY3Rpb25Ub0ZpcnN0UmVzcG9uZGVyKCdhcnJhbmdlSW5Gcm9udDonKVxuICAgICAgQG9uICdhcHBsaWNhdGlvbjpoaWRlJywgLT4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignaGlkZTonKVxuICAgICAgQG9uICdhcHBsaWNhdGlvbjpoaWRlLW90aGVyLWFwcGxpY2F0aW9ucycsIC0+IE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ2hpZGVPdGhlckFwcGxpY2F0aW9uczonKVxuICAgICAgQG9uICdhcHBsaWNhdGlvbjptaW5pbWl6ZScsIC0+IE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ3BlcmZvcm1NaW5pYXR1cml6ZTonKVxuICAgICAgQG9uICdhcHBsaWNhdGlvbjp1bmhpZGUtYWxsLWFwcGxpY2F0aW9ucycsIC0+IE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ3VuaGlkZUFsbEFwcGxpY2F0aW9uczonKVxuICAgICAgQG9uICdhcHBsaWNhdGlvbjp6b29tJywgLT4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignem9vbTonKVxuICAgIGVsc2VcbiAgICAgIEBvbiAnYXBwbGljYXRpb246bWluaW1pemUnLCAtPiBAZm9jdXNlZFdpbmRvdygpPy5taW5pbWl6ZSgpXG4gICAgICBAb24gJ2FwcGxpY2F0aW9uOnpvb20nLCAtPiBAZm9jdXNlZFdpbmRvdygpPy5tYXhpbWl6ZSgpXG5cbiAgICBAb3BlblBhdGhPbkV2ZW50KCdhcHBsaWNhdGlvbjphYm91dCcsICdhdG9tOi8vYWJvdXQnKVxuICAgIEBvcGVuUGF0aE9uRXZlbnQoJ2FwcGxpY2F0aW9uOnNob3ctc2V0dGluZ3MnLCAnYXRvbTovL2NvbmZpZycpXG4gICAgQG9wZW5QYXRoT25FdmVudCgnYXBwbGljYXRpb246b3Blbi15b3VyLWNvbmZpZycsICdhdG9tOi8vLmF0b20vY29uZmlnJylcbiAgICBAb3BlblBhdGhPbkV2ZW50KCdhcHBsaWNhdGlvbjpvcGVuLXlvdXItaW5pdC1zY3JpcHQnLCAnYXRvbTovLy5hdG9tL2luaXQtc2NyaXB0JylcbiAgICBAb3BlblBhdGhPbkV2ZW50KCdhcHBsaWNhdGlvbjpvcGVuLXlvdXIta2V5bWFwJywgJ2F0b206Ly8uYXRvbS9rZXltYXAnKVxuICAgIEBvcGVuUGF0aE9uRXZlbnQoJ2FwcGxpY2F0aW9uOm9wZW4teW91ci1zbmlwcGV0cycsICdhdG9tOi8vLmF0b20vc25pcHBldHMnKVxuICAgIEBvcGVuUGF0aE9uRXZlbnQoJ2FwcGxpY2F0aW9uOm9wZW4teW91ci1zdHlsZXNoZWV0JywgJ2F0b206Ly8uYXRvbS9zdHlsZXNoZWV0JylcbiAgICBAb3BlblBhdGhPbkV2ZW50KCdhcHBsaWNhdGlvbjpvcGVuLWxpY2Vuc2UnLCBwYXRoLmpvaW4ocHJvY2Vzcy5yZXNvdXJjZXNQYXRoLCAnTElDRU5TRS5tZCcpKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gYXBwLCAnYmVmb3JlLXF1aXQnLCAoZXZlbnQpID0+XG4gICAgICB1bmxlc3MgQHF1aXR0aW5nXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgQHF1aXR0aW5nID0gdHJ1ZVxuICAgICAgICBQcm9taXNlLmFsbChAd2luZG93cy5tYXAoKHdpbmRvdykgLT4gd2luZG93LnByZXBhcmVUb1VubG9hZCgpKSkudGhlbigtPiBhcHAucXVpdCgpKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gYXBwLCAnd2lsbC1xdWl0JywgPT5cbiAgICAgIEBraWxsQWxsUHJvY2Vzc2VzKClcbiAgICAgIEBkZWxldGVTb2NrZXRGaWxlKClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGFwcCwgJ29wZW4tZmlsZScsIChldmVudCwgcGF0aFRvT3BlbikgPT5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAgIEBvcGVuUGF0aCh7cGF0aFRvT3Blbn0pXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBhcHAsICdvcGVuLXVybCcsIChldmVudCwgdXJsVG9PcGVuKSA9PlxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgQG9wZW5Vcmwoe3VybFRvT3BlbiwgQGRldk1vZGUsIEBzYWZlTW9kZX0pXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBhcHAsICdhY3RpdmF0ZScsIChldmVudCwgaGFzVmlzaWJsZVdpbmRvd3MpID0+XG4gICAgICB1bmxlc3MgaGFzVmlzaWJsZVdpbmRvd3NcbiAgICAgICAgZXZlbnQ/LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgQGVtaXQoJ2FwcGxpY2F0aW9uOm5ldy13aW5kb3cnKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3Jlc3RhcnQtYXBwbGljYXRpb24nLCA9PlxuICAgICAgQHJlc3RhcnQoKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3Jlc29sdmUtcHJveHknLCAoZXZlbnQsIHJlcXVlc3RJZCwgdXJsKSAtPlxuICAgICAgZXZlbnQuc2VuZGVyLnNlc3Npb24ucmVzb2x2ZVByb3h5IHVybCwgKHByb3h5KSAtPlxuICAgICAgICB1bmxlc3MgZXZlbnQuc2VuZGVyLmlzRGVzdHJveWVkKClcbiAgICAgICAgICBldmVudC5zZW5kZXIuc2VuZCgnZGlkLXJlc29sdmUtcHJveHknLCByZXF1ZXN0SWQsIHByb3h5KVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ2RpZC1jaGFuZ2UtaGlzdG9yeS1tYW5hZ2VyJywgKGV2ZW50KSA9PlxuICAgICAgZm9yIGF0b21XaW5kb3cgaW4gQHdpbmRvd3NcbiAgICAgICAgd2ViQ29udGVudHMgPSBhdG9tV2luZG93LmJyb3dzZXJXaW5kb3cud2ViQ29udGVudHNcbiAgICAgICAgaWYgd2ViQ29udGVudHMgaXNudCBldmVudC5zZW5kZXJcbiAgICAgICAgICB3ZWJDb250ZW50cy5zZW5kKCdkaWQtY2hhbmdlLWhpc3RvcnktbWFuYWdlcicpXG5cbiAgICAjIEEgcmVxdWVzdCBmcm9tIHRoZSBhc3NvY2lhdGVkIHJlbmRlciBwcm9jZXNzIHRvIG9wZW4gYSBuZXcgcmVuZGVyIHByb2Nlc3MuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ29wZW4nLCAoZXZlbnQsIG9wdGlvbnMpID0+XG4gICAgICB3aW5kb3cgPSBAYXRvbVdpbmRvd0ZvckV2ZW50KGV2ZW50KVxuICAgICAgaWYgb3B0aW9ucz9cbiAgICAgICAgaWYgdHlwZW9mIG9wdGlvbnMucGF0aHNUb09wZW4gaXMgJ3N0cmluZydcbiAgICAgICAgICBvcHRpb25zLnBhdGhzVG9PcGVuID0gW29wdGlvbnMucGF0aHNUb09wZW5dXG4gICAgICAgIGlmIG9wdGlvbnMucGF0aHNUb09wZW4/Lmxlbmd0aCA+IDBcbiAgICAgICAgICBvcHRpb25zLndpbmRvdyA9IHdpbmRvd1xuICAgICAgICAgIEBvcGVuUGF0aHMob3B0aW9ucylcbiAgICAgICAgZWxzZVxuICAgICAgICAgIG5ldyBBdG9tV2luZG93KHRoaXMsIEBmaWxlUmVjb3ZlcnlTZXJ2aWNlLCBvcHRpb25zKVxuICAgICAgZWxzZVxuICAgICAgICBAcHJvbXB0Rm9yUGF0aFRvT3BlbignYWxsJywge3dpbmRvd30pXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAndXBkYXRlLWFwcGxpY2F0aW9uLW1lbnUnLCAoZXZlbnQsIHRlbXBsYXRlLCBrZXlzdHJva2VzQnlDb21tYW5kKSA9PlxuICAgICAgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMoZXZlbnQuc2VuZGVyKVxuICAgICAgQGFwcGxpY2F0aW9uTWVudT8udXBkYXRlKHdpbiwgdGVtcGxhdGUsIGtleXN0cm9rZXNCeUNvbW1hbmQpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAncnVuLXBhY2thZ2Utc3BlY3MnLCAoZXZlbnQsIHBhY2thZ2VTcGVjUGF0aCkgPT5cbiAgICAgIEBydW5UZXN0cyh7cmVzb3VyY2VQYXRoOiBAZGV2UmVzb3VyY2VQYXRoLCBwYXRoc1RvT3BlbjogW3BhY2thZ2VTcGVjUGF0aF0sIGhlYWRsZXNzOiBmYWxzZX0pXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAncnVuLWJlbmNobWFya3MnLCAoZXZlbnQsIGJlbmNobWFya3NQYXRoKSA9PlxuICAgICAgQHJ1bkJlbmNobWFya3Moe3Jlc291cmNlUGF0aDogQGRldlJlc291cmNlUGF0aCwgcGF0aHNUb09wZW46IFtiZW5jaG1hcmtzUGF0aF0sIGhlYWRsZXNzOiBmYWxzZSwgdGVzdDogZmFsc2V9KVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ2NvbW1hbmQnLCAoZXZlbnQsIGNvbW1hbmQpID0+XG4gICAgICBAZW1pdChjb21tYW5kKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ29wZW4tY29tbWFuZCcsIChldmVudCwgY29tbWFuZCwgYXJncy4uLikgPT5cbiAgICAgIGRlZmF1bHRQYXRoID0gYXJnc1swXSBpZiBhcmdzLmxlbmd0aCA+IDBcbiAgICAgIHN3aXRjaCBjb21tYW5kXG4gICAgICAgIHdoZW4gJ2FwcGxpY2F0aW9uOm9wZW4nIHRoZW4gQHByb21wdEZvclBhdGhUb09wZW4oJ2FsbCcsIGdldExvYWRTZXR0aW5ncygpLCBkZWZhdWx0UGF0aClcbiAgICAgICAgd2hlbiAnYXBwbGljYXRpb246b3Blbi1maWxlJyB0aGVuIEBwcm9tcHRGb3JQYXRoVG9PcGVuKCdmaWxlJywgZ2V0TG9hZFNldHRpbmdzKCksIGRlZmF1bHRQYXRoKVxuICAgICAgICB3aGVuICdhcHBsaWNhdGlvbjpvcGVuLWZvbGRlcicgdGhlbiBAcHJvbXB0Rm9yUGF0aFRvT3BlbignZm9sZGVyJywgZ2V0TG9hZFNldHRpbmdzKCksIGRlZmF1bHRQYXRoKVxuICAgICAgICBlbHNlIGNvbnNvbGUubG9nIFwiSW52YWxpZCBvcGVuLWNvbW1hbmQgcmVjZWl2ZWQ6IFwiICsgY29tbWFuZFxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3dpbmRvdy1jb21tYW5kJywgKGV2ZW50LCBjb21tYW5kLCBhcmdzLi4uKSAtPlxuICAgICAgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMoZXZlbnQuc2VuZGVyKVxuICAgICAgd2luLmVtaXQoY29tbWFuZCwgYXJncy4uLilcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnd2luZG93LW1ldGhvZCcsIChicm93c2VyV2luZG93LCBtZXRob2QsIGFyZ3MuLi4pID0+XG4gICAgICBAYXRvbVdpbmRvd0ZvckJyb3dzZXJXaW5kb3coYnJvd3NlcldpbmRvdyk/W21ldGhvZF0oYXJncy4uLilcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdwaWNrLWZvbGRlcicsIChldmVudCwgcmVzcG9uc2VDaGFubmVsKSA9PlxuICAgICAgQHByb21wdEZvclBhdGggXCJmb2xkZXJcIiwgKHNlbGVjdGVkUGF0aHMpIC0+XG4gICAgICAgIGV2ZW50LnNlbmRlci5zZW5kKHJlc3BvbnNlQ2hhbm5lbCwgc2VsZWN0ZWRQYXRocylcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnc2V0LXdpbmRvdy1zaXplJywgKHdpbiwgd2lkdGgsIGhlaWdodCkgLT5cbiAgICAgIHdpbi5zZXRTaXplKHdpZHRoLCBoZWlnaHQpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5yZXNwb25kVG8gJ3NldC13aW5kb3ctcG9zaXRpb24nLCAod2luLCB4LCB5KSAtPlxuICAgICAgd2luLnNldFBvc2l0aW9uKHgsIHkpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5yZXNwb25kVG8gJ2NlbnRlci13aW5kb3cnLCAod2luKSAtPlxuICAgICAgd2luLmNlbnRlcigpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5yZXNwb25kVG8gJ2ZvY3VzLXdpbmRvdycsICh3aW4pIC0+XG4gICAgICB3aW4uZm9jdXMoKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMucmVzcG9uZFRvICdzaG93LXdpbmRvdycsICh3aW4pIC0+XG4gICAgICB3aW4uc2hvdygpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5yZXNwb25kVG8gJ2hpZGUtd2luZG93JywgKHdpbikgLT5cbiAgICAgIHdpbi5oaWRlKClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnZ2V0LXRlbXBvcmFyeS13aW5kb3ctc3RhdGUnLCAod2luKSAtPlxuICAgICAgd2luLnRlbXBvcmFyeVN0YXRlXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5yZXNwb25kVG8gJ3NldC10ZW1wb3Jhcnktd2luZG93LXN0YXRlJywgKHdpbiwgc3RhdGUpIC0+XG4gICAgICB3aW4udGVtcG9yYXJ5U3RhdGUgPSBzdGF0ZVxuXG4gICAgY2xpcGJvYXJkID0gcmVxdWlyZSAnLi4vc2FmZS1jbGlwYm9hcmQnXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3dyaXRlLXRleHQtdG8tc2VsZWN0aW9uLWNsaXBib2FyZCcsIChldmVudCwgc2VsZWN0ZWRUZXh0KSAtPlxuICAgICAgY2xpcGJvYXJkLndyaXRlVGV4dChzZWxlY3RlZFRleHQsICdzZWxlY3Rpb24nKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3dyaXRlLXRvLXN0ZG91dCcsIChldmVudCwgb3V0cHV0KSAtPlxuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUob3V0cHV0KVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3dyaXRlLXRvLXN0ZGVycicsIChldmVudCwgb3V0cHV0KSAtPlxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUob3V0cHV0KVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ2FkZC1yZWNlbnQtZG9jdW1lbnQnLCAoZXZlbnQsIGZpbGVuYW1lKSAtPlxuICAgICAgYXBwLmFkZFJlY2VudERvY3VtZW50KGZpbGVuYW1lKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ2V4ZWN1dGUtamF2YXNjcmlwdC1pbi1kZXYtdG9vbHMnLCAoZXZlbnQsIGNvZGUpIC0+XG4gICAgICBldmVudC5zZW5kZXIuZGV2VG9vbHNXZWJDb250ZW50cz8uZXhlY3V0ZUphdmFTY3JpcHQoY29kZSlcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdnZXQtYXV0by11cGRhdGUtbWFuYWdlci1zdGF0ZScsIChldmVudCkgPT5cbiAgICAgIGV2ZW50LnJldHVyblZhbHVlID0gQGF1dG9VcGRhdGVNYW5hZ2VyLmdldFN0YXRlKClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdnZXQtYXV0by11cGRhdGUtbWFuYWdlci1lcnJvcicsIChldmVudCkgPT5cbiAgICAgIGV2ZW50LnJldHVyblZhbHVlID0gQGF1dG9VcGRhdGVNYW5hZ2VyLmdldEVycm9yTWVzc2FnZSgpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnd2lsbC1zYXZlLXBhdGgnLCAoZXZlbnQsIHBhdGgpID0+XG4gICAgICBAZmlsZVJlY292ZXJ5U2VydmljZS53aWxsU2F2ZVBhdGgoQGF0b21XaW5kb3dGb3JFdmVudChldmVudCksIHBhdGgpXG4gICAgICBldmVudC5yZXR1cm5WYWx1ZSA9IHRydWVcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdkaWQtc2F2ZS1wYXRoJywgKGV2ZW50LCBwYXRoKSA9PlxuICAgICAgQGZpbGVSZWNvdmVyeVNlcnZpY2UuZGlkU2F2ZVBhdGgoQGF0b21XaW5kb3dGb3JFdmVudChldmVudCksIHBhdGgpXG4gICAgICBldmVudC5yZXR1cm5WYWx1ZSA9IHRydWVcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdkaWQtY2hhbmdlLXBhdGhzJywgPT5cbiAgICAgIEBzYXZlU3RhdGUoZmFsc2UpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQoQGRpc2FibGVab29tT25EaXNwbGF5Q2hhbmdlKCkpXG5cbiAgc2V0dXBEb2NrTWVudTogLT5cbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nXG4gICAgICBkb2NrTWVudSA9IE1lbnUuYnVpbGRGcm9tVGVtcGxhdGUgW1xuICAgICAgICB7bGFiZWw6ICdOZXcgV2luZG93JywgIGNsaWNrOiA9PiBAZW1pdCgnYXBwbGljYXRpb246bmV3LXdpbmRvdycpfVxuICAgICAgXVxuICAgICAgYXBwLmRvY2suc2V0TWVudSBkb2NrTWVudVxuXG4gICMgUHVibGljOiBFeGVjdXRlcyB0aGUgZ2l2ZW4gY29tbWFuZC5cbiAgI1xuICAjIElmIGl0IGlzbid0IGhhbmRsZWQgZ2xvYmFsbHksIGRlbGVnYXRlIHRvIHRoZSBjdXJyZW50bHkgZm9jdXNlZCB3aW5kb3cuXG4gICNcbiAgIyBjb21tYW5kIC0gVGhlIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGNvbW1hbmQuXG4gICMgYXJncyAtIFRoZSBvcHRpb25hbCBhcmd1bWVudHMgdG8gcGFzcyBhbG9uZy5cbiAgc2VuZENvbW1hbmQ6IChjb21tYW5kLCBhcmdzLi4uKSAtPlxuICAgIHVubGVzcyBAZW1pdChjb21tYW5kLCBhcmdzLi4uKVxuICAgICAgZm9jdXNlZFdpbmRvdyA9IEBmb2N1c2VkV2luZG93KClcbiAgICAgIGlmIGZvY3VzZWRXaW5kb3c/XG4gICAgICAgIGZvY3VzZWRXaW5kb3cuc2VuZENvbW1hbmQoY29tbWFuZCwgYXJncy4uLilcbiAgICAgIGVsc2VcbiAgICAgICAgQHNlbmRDb21tYW5kVG9GaXJzdFJlc3BvbmRlcihjb21tYW5kKVxuXG4gICMgUHVibGljOiBFeGVjdXRlcyB0aGUgZ2l2ZW4gY29tbWFuZCBvbiB0aGUgZ2l2ZW4gd2luZG93LlxuICAjXG4gICMgY29tbWFuZCAtIFRoZSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjb21tYW5kLlxuICAjIGF0b21XaW5kb3cgLSBUaGUge0F0b21XaW5kb3d9IHRvIHNlbmQgdGhlIGNvbW1hbmQgdG8uXG4gICMgYXJncyAtIFRoZSBvcHRpb25hbCBhcmd1bWVudHMgdG8gcGFzcyBhbG9uZy5cbiAgc2VuZENvbW1hbmRUb1dpbmRvdzogKGNvbW1hbmQsIGF0b21XaW5kb3csIGFyZ3MuLi4pIC0+XG4gICAgdW5sZXNzIEBlbWl0KGNvbW1hbmQsIGFyZ3MuLi4pXG4gICAgICBpZiBhdG9tV2luZG93P1xuICAgICAgICBhdG9tV2luZG93LnNlbmRDb21tYW5kKGNvbW1hbmQsIGFyZ3MuLi4pXG4gICAgICBlbHNlXG4gICAgICAgIEBzZW5kQ29tbWFuZFRvRmlyc3RSZXNwb25kZXIoY29tbWFuZClcblxuICAjIFRyYW5zbGF0ZXMgdGhlIGNvbW1hbmQgaW50byBtYWNPUyBhY3Rpb24gYW5kIHNlbmRzIGl0IHRvIGFwcGxpY2F0aW9uJ3MgZmlyc3RcbiAgIyByZXNwb25kZXIuXG4gIHNlbmRDb21tYW5kVG9GaXJzdFJlc3BvbmRlcjogKGNvbW1hbmQpIC0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nXG5cbiAgICBzd2l0Y2ggY29tbWFuZFxuICAgICAgd2hlbiAnY29yZTp1bmRvJyB0aGVuIE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ3VuZG86JylcbiAgICAgIHdoZW4gJ2NvcmU6cmVkbycgdGhlbiBNZW51LnNlbmRBY3Rpb25Ub0ZpcnN0UmVzcG9uZGVyKCdyZWRvOicpXG4gICAgICB3aGVuICdjb3JlOmNvcHknIHRoZW4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignY29weTonKVxuICAgICAgd2hlbiAnY29yZTpjdXQnIHRoZW4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignY3V0OicpXG4gICAgICB3aGVuICdjb3JlOnBhc3RlJyB0aGVuIE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ3Bhc3RlOicpXG4gICAgICB3aGVuICdjb3JlOnNlbGVjdC1hbGwnIHRoZW4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignc2VsZWN0QWxsOicpXG4gICAgICBlbHNlIHJldHVybiBmYWxzZVxuICAgIHRydWVcblxuICAjIFB1YmxpYzogT3BlbiB0aGUgZ2l2ZW4gcGF0aCBpbiB0aGUgZm9jdXNlZCB3aW5kb3cgd2hlbiB0aGUgZXZlbnQgaXNcbiAgIyB0cmlnZ2VyZWQuXG4gICNcbiAgIyBBIG5ldyB3aW5kb3cgd2lsbCBiZSBjcmVhdGVkIGlmIHRoZXJlIGlzIG5vIGN1cnJlbnRseSBmb2N1c2VkIHdpbmRvdy5cbiAgI1xuICAjIGV2ZW50TmFtZSAtIFRoZSBldmVudCB0byBsaXN0ZW4gZm9yLlxuICAjIHBhdGhUb09wZW4gLSBUaGUgcGF0aCB0byBvcGVuIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgb3BlblBhdGhPbkV2ZW50OiAoZXZlbnROYW1lLCBwYXRoVG9PcGVuKSAtPlxuICAgIEBvbiBldmVudE5hbWUsIC0+XG4gICAgICBpZiB3aW5kb3cgPSBAZm9jdXNlZFdpbmRvdygpXG4gICAgICAgIHdpbmRvdy5vcGVuUGF0aChwYXRoVG9PcGVuKVxuICAgICAgZWxzZVxuICAgICAgICBAb3BlblBhdGgoe3BhdGhUb09wZW59KVxuXG4gICMgUmV0dXJucyB0aGUge0F0b21XaW5kb3d9IGZvciB0aGUgZ2l2ZW4gcGF0aHMuXG4gIHdpbmRvd0ZvclBhdGhzOiAocGF0aHNUb09wZW4sIGRldk1vZGUpIC0+XG4gICAgXy5maW5kIEB3aW5kb3dzLCAoYXRvbVdpbmRvdykgLT5cbiAgICAgIGF0b21XaW5kb3cuZGV2TW9kZSBpcyBkZXZNb2RlIGFuZCBhdG9tV2luZG93LmNvbnRhaW5zUGF0aHMocGF0aHNUb09wZW4pXG5cbiAgIyBSZXR1cm5zIHRoZSB7QXRvbVdpbmRvd30gZm9yIHRoZSBnaXZlbiBpcGNNYWluIGV2ZW50LlxuICBhdG9tV2luZG93Rm9yRXZlbnQ6ICh7c2VuZGVyfSkgLT5cbiAgICBAYXRvbVdpbmRvd0ZvckJyb3dzZXJXaW5kb3coQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMoc2VuZGVyKSlcblxuICBhdG9tV2luZG93Rm9yQnJvd3NlcldpbmRvdzogKGJyb3dzZXJXaW5kb3cpIC0+XG4gICAgQHdpbmRvd3MuZmluZCgoYXRvbVdpbmRvdykgLT4gYXRvbVdpbmRvdy5icm93c2VyV2luZG93IGlzIGJyb3dzZXJXaW5kb3cpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGN1cnJlbnRseSBmb2N1c2VkIHtBdG9tV2luZG93fSBvciB1bmRlZmluZWQgaWYgbm9uZS5cbiAgZm9jdXNlZFdpbmRvdzogLT5cbiAgICBfLmZpbmQgQHdpbmRvd3MsIChhdG9tV2luZG93KSAtPiBhdG9tV2luZG93LmlzRm9jdXNlZCgpXG5cbiAgIyBHZXQgdGhlIHBsYXRmb3JtLXNwZWNpZmljIHdpbmRvdyBvZmZzZXQgZm9yIG5ldyB3aW5kb3dzLlxuICBnZXRXaW5kb3dPZmZzZXRGb3JDdXJyZW50UGxhdGZvcm06IC0+XG4gICAgb2Zmc2V0QnlQbGF0Zm9ybSA9XG4gICAgICBkYXJ3aW46IDIyXG4gICAgICB3aW4zMjogMjZcbiAgICBvZmZzZXRCeVBsYXRmb3JtW3Byb2Nlc3MucGxhdGZvcm1dID8gMFxuXG4gICMgR2V0IHRoZSBkaW1lbnNpb25zIGZvciBvcGVuaW5nIGEgbmV3IHdpbmRvdyBieSBjYXNjYWRpbmcgYXMgYXBwcm9wcmlhdGUgdG9cbiAgIyB0aGUgcGxhdGZvcm0uXG4gIGdldERpbWVuc2lvbnNGb3JOZXdXaW5kb3c6IC0+XG4gICAgcmV0dXJuIGlmIChAZm9jdXNlZFdpbmRvdygpID8gQGxhc3RGb2N1c2VkV2luZG93KT8uaXNNYXhpbWl6ZWQoKVxuICAgIGRpbWVuc2lvbnMgPSAoQGZvY3VzZWRXaW5kb3coKSA/IEBsYXN0Rm9jdXNlZFdpbmRvdyk/LmdldERpbWVuc2lvbnMoKVxuICAgIG9mZnNldCA9IEBnZXRXaW5kb3dPZmZzZXRGb3JDdXJyZW50UGxhdGZvcm0oKVxuICAgIGlmIGRpbWVuc2lvbnM/IGFuZCBvZmZzZXQ/XG4gICAgICBkaW1lbnNpb25zLnggKz0gb2Zmc2V0XG4gICAgICBkaW1lbnNpb25zLnkgKz0gb2Zmc2V0XG4gICAgZGltZW5zaW9uc1xuXG4gICMgUHVibGljOiBPcGVucyBhIHNpbmdsZSBwYXRoLCBpbiBhbiBleGlzdGluZyB3aW5kb3cgaWYgcG9zc2libGUuXG4gICNcbiAgIyBvcHRpb25zIC1cbiAgIyAgIDpwYXRoVG9PcGVuIC0gVGhlIGZpbGUgcGF0aCB0byBvcGVuXG4gICMgICA6cGlkVG9LaWxsV2hlbkNsb3NlZCAtIFRoZSBpbnRlZ2VyIG9mIHRoZSBwaWQgdG8ga2lsbFxuICAjICAgOm5ld1dpbmRvdyAtIEJvb2xlYW4gb2Ygd2hldGhlciB0aGlzIHNob3VsZCBiZSBvcGVuZWQgaW4gYSBuZXcgd2luZG93LlxuICAjICAgOmRldk1vZGUgLSBCb29sZWFuIHRvIGNvbnRyb2wgdGhlIG9wZW5lZCB3aW5kb3cncyBkZXYgbW9kZS5cbiAgIyAgIDpzYWZlTW9kZSAtIEJvb2xlYW4gdG8gY29udHJvbCB0aGUgb3BlbmVkIHdpbmRvdydzIHNhZmUgbW9kZS5cbiAgIyAgIDpwcm9maWxlU3RhcnR1cCAtIEJvb2xlYW4gdG8gY29udHJvbCBjcmVhdGluZyBhIHByb2ZpbGUgb2YgdGhlIHN0YXJ0dXAgdGltZS5cbiAgIyAgIDp3aW5kb3cgLSB7QXRvbVdpbmRvd30gdG8gb3BlbiBmaWxlIHBhdGhzIGluLlxuICAjICAgOmFkZFRvTGFzdFdpbmRvdyAtIEJvb2xlYW4gb2Ygd2hldGhlciB0aGlzIHNob3VsZCBiZSBvcGVuZWQgaW4gbGFzdCBmb2N1c2VkIHdpbmRvdy5cbiAgb3BlblBhdGg6ICh7aW5pdGlhbFBhdGhzLCBwYXRoVG9PcGVuLCBwaWRUb0tpbGxXaGVuQ2xvc2VkLCBuZXdXaW5kb3csIGRldk1vZGUsIHNhZmVNb2RlLCBwcm9maWxlU3RhcnR1cCwgd2luZG93LCBjbGVhcldpbmRvd1N0YXRlLCBhZGRUb0xhc3RXaW5kb3csIGVudn0gPSB7fSkgLT5cbiAgICBAb3BlblBhdGhzKHtpbml0aWFsUGF0aHMsIHBhdGhzVG9PcGVuOiBbcGF0aFRvT3Blbl0sIHBpZFRvS2lsbFdoZW5DbG9zZWQsIG5ld1dpbmRvdywgZGV2TW9kZSwgc2FmZU1vZGUsIHByb2ZpbGVTdGFydHVwLCB3aW5kb3csIGNsZWFyV2luZG93U3RhdGUsIGFkZFRvTGFzdFdpbmRvdywgZW52fSlcblxuICAjIFB1YmxpYzogT3BlbnMgbXVsdGlwbGUgcGF0aHMsIGluIGV4aXN0aW5nIHdpbmRvd3MgaWYgcG9zc2libGUuXG4gICNcbiAgIyBvcHRpb25zIC1cbiAgIyAgIDpwYXRoc1RvT3BlbiAtIFRoZSBhcnJheSBvZiBmaWxlIHBhdGhzIHRvIG9wZW5cbiAgIyAgIDpwaWRUb0tpbGxXaGVuQ2xvc2VkIC0gVGhlIGludGVnZXIgb2YgdGhlIHBpZCB0byBraWxsXG4gICMgICA6bmV3V2luZG93IC0gQm9vbGVhbiBvZiB3aGV0aGVyIHRoaXMgc2hvdWxkIGJlIG9wZW5lZCBpbiBhIG5ldyB3aW5kb3cuXG4gICMgICA6ZGV2TW9kZSAtIEJvb2xlYW4gdG8gY29udHJvbCB0aGUgb3BlbmVkIHdpbmRvdydzIGRldiBtb2RlLlxuICAjICAgOnNhZmVNb2RlIC0gQm9vbGVhbiB0byBjb250cm9sIHRoZSBvcGVuZWQgd2luZG93J3Mgc2FmZSBtb2RlLlxuICAjICAgOndpbmRvd0RpbWVuc2lvbnMgLSBPYmplY3Qgd2l0aCBoZWlnaHQgYW5kIHdpZHRoIGtleXMuXG4gICMgICA6d2luZG93IC0ge0F0b21XaW5kb3d9IHRvIG9wZW4gZmlsZSBwYXRocyBpbi5cbiAgIyAgIDphZGRUb0xhc3RXaW5kb3cgLSBCb29sZWFuIG9mIHdoZXRoZXIgdGhpcyBzaG91bGQgYmUgb3BlbmVkIGluIGxhc3QgZm9jdXNlZCB3aW5kb3cuXG4gIG9wZW5QYXRoczogKHtpbml0aWFsUGF0aHMsIHBhdGhzVG9PcGVuLCBleGVjdXRlZEZyb20sIHBpZFRvS2lsbFdoZW5DbG9zZWQsIG5ld1dpbmRvdywgZGV2TW9kZSwgc2FmZU1vZGUsIHdpbmRvd0RpbWVuc2lvbnMsIHByb2ZpbGVTdGFydHVwLCB3aW5kb3csIGNsZWFyV2luZG93U3RhdGUsIGFkZFRvTGFzdFdpbmRvdywgZW52fT17fSkgLT5cbiAgICBpZiBub3QgcGF0aHNUb09wZW4/IG9yIHBhdGhzVG9PcGVuLmxlbmd0aCBpcyAwXG4gICAgICByZXR1cm5cbiAgICBlbnYgPSBwcm9jZXNzLmVudiB1bmxlc3MgZW52P1xuICAgIGRldk1vZGUgPSBCb29sZWFuKGRldk1vZGUpXG4gICAgc2FmZU1vZGUgPSBCb29sZWFuKHNhZmVNb2RlKVxuICAgIGNsZWFyV2luZG93U3RhdGUgPSBCb29sZWFuKGNsZWFyV2luZG93U3RhdGUpXG4gICAgbG9jYXRpb25zVG9PcGVuID0gKEBsb2NhdGlvbkZvclBhdGhUb09wZW4ocGF0aFRvT3BlbiwgZXhlY3V0ZWRGcm9tLCBhZGRUb0xhc3RXaW5kb3cpIGZvciBwYXRoVG9PcGVuIGluIHBhdGhzVG9PcGVuKVxuICAgIHBhdGhzVG9PcGVuID0gKGxvY2F0aW9uVG9PcGVuLnBhdGhUb09wZW4gZm9yIGxvY2F0aW9uVG9PcGVuIGluIGxvY2F0aW9uc1RvT3BlbilcblxuICAgIHVubGVzcyBwaWRUb0tpbGxXaGVuQ2xvc2VkIG9yIG5ld1dpbmRvd1xuICAgICAgZXhpc3RpbmdXaW5kb3cgPSBAd2luZG93Rm9yUGF0aHMocGF0aHNUb09wZW4sIGRldk1vZGUpXG4gICAgICBzdGF0cyA9IChmcy5zdGF0U3luY05vRXhjZXB0aW9uKHBhdGhUb09wZW4pIGZvciBwYXRoVG9PcGVuIGluIHBhdGhzVG9PcGVuKVxuICAgICAgdW5sZXNzIGV4aXN0aW5nV2luZG93P1xuICAgICAgICBpZiBjdXJyZW50V2luZG93ID0gd2luZG93ID8gQGxhc3RGb2N1c2VkV2luZG93XG4gICAgICAgICAgZXhpc3RpbmdXaW5kb3cgPSBjdXJyZW50V2luZG93IGlmIChcbiAgICAgICAgICAgIGFkZFRvTGFzdFdpbmRvdyBvclxuICAgICAgICAgICAgY3VycmVudFdpbmRvdy5kZXZNb2RlIGlzIGRldk1vZGUgYW5kXG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIHN0YXRzLmV2ZXJ5KChzdGF0KSAtPiBzdGF0LmlzRmlsZT8oKSkgb3JcbiAgICAgICAgICAgICAgc3RhdHMuc29tZSgoc3RhdCkgLT4gc3RhdC5pc0RpcmVjdG9yeT8oKSBhbmQgbm90IGN1cnJlbnRXaW5kb3cuaGFzUHJvamVjdFBhdGgoKSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG5cbiAgICBpZiBleGlzdGluZ1dpbmRvdz9cbiAgICAgIG9wZW5lZFdpbmRvdyA9IGV4aXN0aW5nV2luZG93XG4gICAgICBvcGVuZWRXaW5kb3cub3BlbkxvY2F0aW9ucyhsb2NhdGlvbnNUb09wZW4pXG4gICAgICBpZiBvcGVuZWRXaW5kb3cuaXNNaW5pbWl6ZWQoKVxuICAgICAgICBvcGVuZWRXaW5kb3cucmVzdG9yZSgpXG4gICAgICBlbHNlXG4gICAgICAgIG9wZW5lZFdpbmRvdy5mb2N1cygpXG4gICAgICBvcGVuZWRXaW5kb3cucmVwbGFjZUVudmlyb25tZW50KGVudilcbiAgICBlbHNlXG4gICAgICBpZiBkZXZNb2RlXG4gICAgICAgIHRyeVxuICAgICAgICAgIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0ID0gcmVxdWlyZS5yZXNvbHZlKHBhdGguam9pbihAZGV2UmVzb3VyY2VQYXRoLCAnc3JjJywgJ2luaXRpYWxpemUtYXBwbGljYXRpb24td2luZG93JykpXG4gICAgICAgICAgcmVzb3VyY2VQYXRoID0gQGRldlJlc291cmNlUGF0aFxuXG4gICAgICB3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCA/PSByZXF1aXJlLnJlc29sdmUoJy4uL2luaXRpYWxpemUtYXBwbGljYXRpb24td2luZG93JylcbiAgICAgIHJlc291cmNlUGF0aCA/PSBAcmVzb3VyY2VQYXRoXG4gICAgICB3aW5kb3dEaW1lbnNpb25zID89IEBnZXREaW1lbnNpb25zRm9yTmV3V2luZG93KClcbiAgICAgIG9wZW5lZFdpbmRvdyA9IG5ldyBBdG9tV2luZG93KHRoaXMsIEBmaWxlUmVjb3ZlcnlTZXJ2aWNlLCB7aW5pdGlhbFBhdGhzLCBsb2NhdGlvbnNUb09wZW4sIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0LCByZXNvdXJjZVBhdGgsIGRldk1vZGUsIHNhZmVNb2RlLCB3aW5kb3dEaW1lbnNpb25zLCBwcm9maWxlU3RhcnR1cCwgY2xlYXJXaW5kb3dTdGF0ZSwgZW52fSlcbiAgICAgIG9wZW5lZFdpbmRvdy5mb2N1cygpXG4gICAgICBAbGFzdEZvY3VzZWRXaW5kb3cgPSBvcGVuZWRXaW5kb3dcblxuICAgIGlmIHBpZFRvS2lsbFdoZW5DbG9zZWQ/XG4gICAgICBAcGlkc1RvT3BlbldpbmRvd3NbcGlkVG9LaWxsV2hlbkNsb3NlZF0gPSBvcGVuZWRXaW5kb3dcblxuICAgIG9wZW5lZFdpbmRvdy5icm93c2VyV2luZG93Lm9uY2UgJ2Nsb3NlZCcsID0+XG4gICAgICBAa2lsbFByb2Nlc3NGb3JXaW5kb3cob3BlbmVkV2luZG93KVxuXG4gICAgb3BlbmVkV2luZG93XG5cbiAgIyBLaWxsIGFsbCBwcm9jZXNzZXMgYXNzb2NpYXRlZCB3aXRoIG9wZW5lZCB3aW5kb3dzLlxuICBraWxsQWxsUHJvY2Vzc2VzOiAtPlxuICAgIEBraWxsUHJvY2VzcyhwaWQpIGZvciBwaWQgb2YgQHBpZHNUb09wZW5XaW5kb3dzXG4gICAgcmV0dXJuXG5cbiAgIyBLaWxsIHByb2Nlc3MgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBvcGVuZWQgd2luZG93LlxuICBraWxsUHJvY2Vzc0ZvcldpbmRvdzogKG9wZW5lZFdpbmRvdykgLT5cbiAgICBmb3IgcGlkLCB0cmFja2VkV2luZG93IG9mIEBwaWRzVG9PcGVuV2luZG93c1xuICAgICAgQGtpbGxQcm9jZXNzKHBpZCkgaWYgdHJhY2tlZFdpbmRvdyBpcyBvcGVuZWRXaW5kb3dcbiAgICByZXR1cm5cblxuICAjIEtpbGwgdGhlIHByb2Nlc3Mgd2l0aCB0aGUgZ2l2ZW4gcGlkLlxuICBraWxsUHJvY2VzczogKHBpZCkgLT5cbiAgICB0cnlcbiAgICAgIHBhcnNlZFBpZCA9IHBhcnNlSW50KHBpZClcbiAgICAgIHByb2Nlc3Mua2lsbChwYXJzZWRQaWQpIGlmIGlzRmluaXRlKHBhcnNlZFBpZClcbiAgICBjYXRjaCBlcnJvclxuICAgICAgaWYgZXJyb3IuY29kZSBpc250ICdFU1JDSCdcbiAgICAgICAgY29uc29sZS5sb2coXCJLaWxsaW5nIHByb2Nlc3MgI3twaWR9IGZhaWxlZDogI3tlcnJvci5jb2RlID8gZXJyb3IubWVzc2FnZX1cIilcbiAgICBkZWxldGUgQHBpZHNUb09wZW5XaW5kb3dzW3BpZF1cblxuICBzYXZlU3RhdGU6IChhbGxvd0VtcHR5PWZhbHNlKSAtPlxuICAgIHJldHVybiBpZiBAcXVpdHRpbmdcbiAgICBzdGF0ZXMgPSBbXVxuICAgIGZvciB3aW5kb3cgaW4gQHdpbmRvd3NcbiAgICAgIHVubGVzcyB3aW5kb3cuaXNTcGVjXG4gICAgICAgIHN0YXRlcy5wdXNoKHtpbml0aWFsUGF0aHM6IHdpbmRvdy5yZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzfSlcbiAgICBpZiBzdGF0ZXMubGVuZ3RoID4gMCBvciBhbGxvd0VtcHR5XG4gICAgICBAc3RvcmFnZUZvbGRlci5zdG9yZVN5bmMoJ2FwcGxpY2F0aW9uLmpzb24nLCBzdGF0ZXMpXG4gICAgICBAZW1pdCgnYXBwbGljYXRpb246ZGlkLXNhdmUtc3RhdGUnKVxuXG4gIGxvYWRTdGF0ZTogKG9wdGlvbnMpIC0+XG4gICAgaWYgKEBjb25maWcuZ2V0KCdjb3JlLnJlc3RvcmVQcmV2aW91c1dpbmRvd3NPblN0YXJ0JykgaW4gWyd5ZXMnLCAnYWx3YXlzJ10pIGFuZCAoc3RhdGVzID0gQHN0b3JhZ2VGb2xkZXIubG9hZCgnYXBwbGljYXRpb24uanNvbicpKT8ubGVuZ3RoID4gMFxuICAgICAgZm9yIHN0YXRlIGluIHN0YXRlc1xuICAgICAgICBAb3BlbldpdGhPcHRpb25zKE9iamVjdC5hc3NpZ24ob3B0aW9ucywge1xuICAgICAgICAgIGluaXRpYWxQYXRoczogc3RhdGUuaW5pdGlhbFBhdGhzXG4gICAgICAgICAgcGF0aHNUb09wZW46IHN0YXRlLmluaXRpYWxQYXRocy5maWx0ZXIgKGRpcmVjdG9yeVBhdGgpIC0+IGZzLmlzRGlyZWN0b3J5U3luYyhkaXJlY3RvcnlQYXRoKVxuICAgICAgICAgIHVybHNUb09wZW46IFtdXG4gICAgICAgICAgZGV2TW9kZTogQGRldk1vZGVcbiAgICAgICAgICBzYWZlTW9kZTogQHNhZmVNb2RlXG4gICAgICAgIH0pKVxuICAgIGVsc2VcbiAgICAgIG51bGxcblxuICAjIE9wZW4gYW4gYXRvbTovLyB1cmwuXG4gICNcbiAgIyBUaGUgaG9zdCBvZiB0aGUgVVJMIGJlaW5nIG9wZW5lZCBpcyBhc3N1bWVkIHRvIGJlIHRoZSBwYWNrYWdlIG5hbWVcbiAgIyByZXNwb25zaWJsZSBmb3Igb3BlbmluZyB0aGUgVVJMLiAgQSBuZXcgd2luZG93IHdpbGwgYmUgY3JlYXRlZCB3aXRoXG4gICMgdGhhdCBwYWNrYWdlJ3MgYHVybE1haW5gIGFzIHRoZSBib290c3RyYXAgc2NyaXB0LlxuICAjXG4gICMgb3B0aW9ucyAtXG4gICMgICA6dXJsVG9PcGVuIC0gVGhlIGF0b206Ly8gdXJsIHRvIG9wZW4uXG4gICMgICA6ZGV2TW9kZSAtIEJvb2xlYW4gdG8gY29udHJvbCB0aGUgb3BlbmVkIHdpbmRvdydzIGRldiBtb2RlLlxuICAjICAgOnNhZmVNb2RlIC0gQm9vbGVhbiB0byBjb250cm9sIHRoZSBvcGVuZWQgd2luZG93J3Mgc2FmZSBtb2RlLlxuICBvcGVuVXJsOiAoe3VybFRvT3BlbiwgZGV2TW9kZSwgc2FmZU1vZGUsIGVudn0pIC0+XG4gICAgdW5sZXNzIEBwYWNrYWdlcz9cbiAgICAgIFBhY2thZ2VNYW5hZ2VyID0gcmVxdWlyZSAnLi4vcGFja2FnZS1tYW5hZ2VyJ1xuICAgICAgQHBhY2thZ2VzID0gbmV3IFBhY2thZ2VNYW5hZ2VyKHt9KVxuICAgICAgQHBhY2thZ2VzLmluaXRpYWxpemVcbiAgICAgICAgY29uZmlnRGlyUGF0aDogcHJvY2Vzcy5lbnYuQVRPTV9IT01FXG4gICAgICAgIGRldk1vZGU6IGRldk1vZGVcbiAgICAgICAgcmVzb3VyY2VQYXRoOiBAcmVzb3VyY2VQYXRoXG5cbiAgICBwYWNrYWdlTmFtZSA9IHVybC5wYXJzZSh1cmxUb09wZW4pLmhvc3RcbiAgICBwYWNrID0gXy5maW5kIEBwYWNrYWdlcy5nZXRBdmFpbGFibGVQYWNrYWdlTWV0YWRhdGEoKSwgKHtuYW1lfSkgLT4gbmFtZSBpcyBwYWNrYWdlTmFtZVxuICAgIGlmIHBhY2s/XG4gICAgICBpZiBwYWNrLnVybE1haW5cbiAgICAgICAgcGFja2FnZVBhdGggPSBAcGFja2FnZXMucmVzb2x2ZVBhY2thZ2VQYXRoKHBhY2thZ2VOYW1lKVxuICAgICAgICB3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCA9IHBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgcGFjay51cmxNYWluKVxuICAgICAgICB3aW5kb3dEaW1lbnNpb25zID0gQGdldERpbWVuc2lvbnNGb3JOZXdXaW5kb3coKVxuICAgICAgICBuZXcgQXRvbVdpbmRvdyh0aGlzLCBAZmlsZVJlY292ZXJ5U2VydmljZSwge3dpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0LCBAcmVzb3VyY2VQYXRoLCBkZXZNb2RlLCBzYWZlTW9kZSwgdXJsVG9PcGVuLCB3aW5kb3dEaW1lbnNpb25zLCBlbnZ9KVxuICAgICAgZWxzZVxuICAgICAgICBjb25zb2xlLmxvZyBcIlBhY2thZ2UgJyN7cGFjay5uYW1lfScgZG9lcyBub3QgaGF2ZSBhIHVybCBtYWluOiAje3VybFRvT3Blbn1cIlxuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUubG9nIFwiT3BlbmluZyB1bmtub3duIHVybDogI3t1cmxUb09wZW59XCJcblxuICAjIE9wZW5zIHVwIGEgbmV3IHtBdG9tV2luZG93fSB0byBydW4gc3BlY3Mgd2l0aGluLlxuICAjXG4gICMgb3B0aW9ucyAtXG4gICMgICA6aGVhZGxlc3MgLSBBIEJvb2xlYW4gdGhhdCwgaWYgdHJ1ZSwgd2lsbCBjbG9zZSB0aGUgd2luZG93IHVwb25cbiAgIyAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uLlxuICAjICAgOnJlc291cmNlUGF0aCAtIFRoZSBwYXRoIHRvIGluY2x1ZGUgc3BlY3MgZnJvbS5cbiAgIyAgIDpzcGVjUGF0aCAtIFRoZSBkaXJlY3RvcnkgdG8gbG9hZCBzcGVjcyBmcm9tLlxuICAjICAgOnNhZmVNb2RlIC0gQSBCb29sZWFuIHRoYXQsIGlmIHRydWUsIHdvbid0IHJ1biBzcGVjcyBmcm9tIH4vLmF0b20vcGFja2FnZXNcbiAgIyAgICAgICAgICAgICAgIGFuZCB+Ly5hdG9tL2Rldi9wYWNrYWdlcywgZGVmYXVsdHMgdG8gZmFsc2UuXG4gIHJ1blRlc3RzOiAoe2hlYWRsZXNzLCByZXNvdXJjZVBhdGgsIGV4ZWN1dGVkRnJvbSwgcGF0aHNUb09wZW4sIGxvZ0ZpbGUsIHNhZmVNb2RlLCB0aW1lb3V0LCBlbnZ9KSAtPlxuICAgIGlmIHJlc291cmNlUGF0aCBpc250IEByZXNvdXJjZVBhdGggYW5kIG5vdCBmcy5leGlzdHNTeW5jKHJlc291cmNlUGF0aClcbiAgICAgIHJlc291cmNlUGF0aCA9IEByZXNvdXJjZVBhdGhcblxuICAgIHRpbWVvdXRJblNlY29uZHMgPSBOdW1iZXIucGFyc2VGbG9hdCh0aW1lb3V0KVxuICAgIHVubGVzcyBOdW1iZXIuaXNOYU4odGltZW91dEluU2Vjb25kcylcbiAgICAgIHRpbWVvdXRIYW5kbGVyID0gLT5cbiAgICAgICAgY29uc29sZS5sb2cgXCJUaGUgdGVzdCBzdWl0ZSBoYXMgdGltZWQgb3V0IGJlY2F1c2UgaXQgaGFzIGJlZW4gcnVubmluZyBmb3IgbW9yZSB0aGFuICN7dGltZW91dEluU2Vjb25kc30gc2Vjb25kcy5cIlxuICAgICAgICBwcm9jZXNzLmV4aXQoMTI0KSAjIFVzZSB0aGUgc2FtZSBleGl0IGNvZGUgYXMgdGhlIFVOSVggdGltZW91dCB1dGlsLlxuICAgICAgc2V0VGltZW91dCh0aW1lb3V0SGFuZGxlciwgdGltZW91dEluU2Vjb25kcyAqIDEwMDApXG5cbiAgICB0cnlcbiAgICAgIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0ID0gcmVxdWlyZS5yZXNvbHZlKHBhdGgucmVzb2x2ZShAZGV2UmVzb3VyY2VQYXRoLCAnc3JjJywgJ2luaXRpYWxpemUtdGVzdC13aW5kb3cnKSlcbiAgICBjYXRjaCBlcnJvclxuICAgICAgd2luZG93SW5pdGlhbGl6YXRpb25TY3JpcHQgPSByZXF1aXJlLnJlc29sdmUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3NyYycsICdpbml0aWFsaXplLXRlc3Qtd2luZG93JykpXG5cbiAgICB0ZXN0UGF0aHMgPSBbXVxuICAgIGlmIHBhdGhzVG9PcGVuP1xuICAgICAgZm9yIHBhdGhUb09wZW4gaW4gcGF0aHNUb09wZW5cbiAgICAgICAgdGVzdFBhdGhzLnB1c2gocGF0aC5yZXNvbHZlKGV4ZWN1dGVkRnJvbSwgZnMubm9ybWFsaXplKHBhdGhUb09wZW4pKSlcblxuICAgIGlmIHRlc3RQYXRocy5sZW5ndGggaXMgMFxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUgJ0Vycm9yOiBTcGVjaWZ5IGF0IGxlYXN0IG9uZSB0ZXN0IHBhdGhcXG5cXG4nXG4gICAgICBwcm9jZXNzLmV4aXQoMSlcblxuICAgIGxlZ2FjeVRlc3RSdW5uZXJQYXRoID0gQHJlc29sdmVMZWdhY3lUZXN0UnVubmVyUGF0aCgpXG4gICAgdGVzdFJ1bm5lclBhdGggPSBAcmVzb2x2ZVRlc3RSdW5uZXJQYXRoKHRlc3RQYXRoc1swXSlcbiAgICBkZXZNb2RlID0gdHJ1ZVxuICAgIGlzU3BlYyA9IHRydWVcbiAgICBzYWZlTW9kZSA/PSBmYWxzZVxuICAgIG5ldyBBdG9tV2luZG93KHRoaXMsIEBmaWxlUmVjb3ZlcnlTZXJ2aWNlLCB7d2luZG93SW5pdGlhbGl6YXRpb25TY3JpcHQsIHJlc291cmNlUGF0aCwgaGVhZGxlc3MsIGlzU3BlYywgZGV2TW9kZSwgdGVzdFJ1bm5lclBhdGgsIGxlZ2FjeVRlc3RSdW5uZXJQYXRoLCB0ZXN0UGF0aHMsIGxvZ0ZpbGUsIHNhZmVNb2RlLCBlbnZ9KVxuXG4gIHJ1bkJlbmNobWFya3M6ICh7aGVhZGxlc3MsIHRlc3QsIHJlc291cmNlUGF0aCwgZXhlY3V0ZWRGcm9tLCBwYXRoc1RvT3BlbiwgZW52fSkgLT5cbiAgICBpZiByZXNvdXJjZVBhdGggaXNudCBAcmVzb3VyY2VQYXRoIGFuZCBub3QgZnMuZXhpc3RzU3luYyhyZXNvdXJjZVBhdGgpXG4gICAgICByZXNvdXJjZVBhdGggPSBAcmVzb3VyY2VQYXRoXG5cbiAgICB0cnlcbiAgICAgIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0ID0gcmVxdWlyZS5yZXNvbHZlKHBhdGgucmVzb2x2ZShAZGV2UmVzb3VyY2VQYXRoLCAnc3JjJywgJ2luaXRpYWxpemUtYmVuY2htYXJrLXdpbmRvdycpKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICB3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCA9IHJlcXVpcmUucmVzb2x2ZShwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnc3JjJywgJ2luaXRpYWxpemUtYmVuY2htYXJrLXdpbmRvdycpKVxuXG4gICAgYmVuY2htYXJrUGF0aHMgPSBbXVxuICAgIGlmIHBhdGhzVG9PcGVuP1xuICAgICAgZm9yIHBhdGhUb09wZW4gaW4gcGF0aHNUb09wZW5cbiAgICAgICAgYmVuY2htYXJrUGF0aHMucHVzaChwYXRoLnJlc29sdmUoZXhlY3V0ZWRGcm9tLCBmcy5ub3JtYWxpemUocGF0aFRvT3BlbikpKVxuXG4gICAgaWYgYmVuY2htYXJrUGF0aHMubGVuZ3RoIGlzIDBcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlICdFcnJvcjogU3BlY2lmeSBhdCBsZWFzdCBvbmUgYmVuY2htYXJrIHBhdGguXFxuXFxuJ1xuICAgICAgcHJvY2Vzcy5leGl0KDEpXG5cbiAgICBkZXZNb2RlID0gdHJ1ZVxuICAgIGlzU3BlYyA9IHRydWVcbiAgICBzYWZlTW9kZSA9IGZhbHNlXG4gICAgbmV3IEF0b21XaW5kb3codGhpcywgQGZpbGVSZWNvdmVyeVNlcnZpY2UsIHt3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCwgcmVzb3VyY2VQYXRoLCBoZWFkbGVzcywgdGVzdCwgaXNTcGVjLCBkZXZNb2RlLCBiZW5jaG1hcmtQYXRocywgc2FmZU1vZGUsIGVudn0pXG5cbiAgcmVzb2x2ZVRlc3RSdW5uZXJQYXRoOiAodGVzdFBhdGgpIC0+XG4gICAgRmluZFBhcmVudERpciA/PSByZXF1aXJlICdmaW5kLXBhcmVudC1kaXInXG5cbiAgICBpZiBwYWNrYWdlUm9vdCA9IEZpbmRQYXJlbnREaXIuc3luYyh0ZXN0UGF0aCwgJ3BhY2thZ2UuanNvbicpXG4gICAgICBwYWNrYWdlTWV0YWRhdGEgPSByZXF1aXJlKHBhdGguam9pbihwYWNrYWdlUm9vdCwgJ3BhY2thZ2UuanNvbicpKVxuICAgICAgaWYgcGFja2FnZU1ldGFkYXRhLmF0b21UZXN0UnVubmVyXG4gICAgICAgIFJlc29sdmUgPz0gcmVxdWlyZSgncmVzb2x2ZScpXG4gICAgICAgIGlmIHRlc3RSdW5uZXJQYXRoID0gUmVzb2x2ZS5zeW5jKHBhY2thZ2VNZXRhZGF0YS5hdG9tVGVzdFJ1bm5lciwgYmFzZWRpcjogcGFja2FnZVJvb3QsIGV4dGVuc2lvbnM6IE9iamVjdC5rZXlzKHJlcXVpcmUuZXh0ZW5zaW9ucykpXG4gICAgICAgICAgcmV0dXJuIHRlc3RSdW5uZXJQYXRoXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZSBcIkVycm9yOiBDb3VsZCBub3QgcmVzb2x2ZSB0ZXN0IHJ1bm5lciBwYXRoICcje3BhY2thZ2VNZXRhZGF0YS5hdG9tVGVzdFJ1bm5lcn0nXCJcbiAgICAgICAgICBwcm9jZXNzLmV4aXQoMSlcblxuICAgIEByZXNvbHZlTGVnYWN5VGVzdFJ1bm5lclBhdGgoKVxuXG4gIHJlc29sdmVMZWdhY3lUZXN0UnVubmVyUGF0aDogLT5cbiAgICB0cnlcbiAgICAgIHJlcXVpcmUucmVzb2x2ZShwYXRoLnJlc29sdmUoQGRldlJlc291cmNlUGF0aCwgJ3NwZWMnLCAnamFzbWluZS10ZXN0LXJ1bm5lcicpKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICByZXF1aXJlLnJlc29sdmUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3NwZWMnLCAnamFzbWluZS10ZXN0LXJ1bm5lcicpKVxuXG4gIGxvY2F0aW9uRm9yUGF0aFRvT3BlbjogKHBhdGhUb09wZW4sIGV4ZWN1dGVkRnJvbT0nJywgZm9yY2VBZGRUb1dpbmRvdykgLT5cbiAgICByZXR1cm4ge3BhdGhUb09wZW59IHVubGVzcyBwYXRoVG9PcGVuXG5cbiAgICBwYXRoVG9PcGVuID0gcGF0aFRvT3Blbi5yZXBsYWNlKC9bOlxcc10rJC8sICcnKVxuICAgIG1hdGNoID0gcGF0aFRvT3Blbi5tYXRjaChMb2NhdGlvblN1ZmZpeFJlZ0V4cClcblxuICAgIGlmIG1hdGNoP1xuICAgICAgcGF0aFRvT3BlbiA9IHBhdGhUb09wZW4uc2xpY2UoMCwgLW1hdGNoWzBdLmxlbmd0aClcbiAgICAgIGluaXRpYWxMaW5lID0gTWF0aC5tYXgoMCwgcGFyc2VJbnQobWF0Y2hbMV0uc2xpY2UoMSkpIC0gMSkgaWYgbWF0Y2hbMV1cbiAgICAgIGluaXRpYWxDb2x1bW4gPSBNYXRoLm1heCgwLCBwYXJzZUludChtYXRjaFsyXS5zbGljZSgxKSkgLSAxKSBpZiBtYXRjaFsyXVxuICAgIGVsc2VcbiAgICAgIGluaXRpYWxMaW5lID0gaW5pdGlhbENvbHVtbiA9IG51bGxcblxuICAgIHVubGVzcyB1cmwucGFyc2UocGF0aFRvT3BlbikucHJvdG9jb2w/XG4gICAgICBwYXRoVG9PcGVuID0gcGF0aC5yZXNvbHZlKGV4ZWN1dGVkRnJvbSwgZnMubm9ybWFsaXplKHBhdGhUb09wZW4pKVxuXG4gICAge3BhdGhUb09wZW4sIGluaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1uLCBmb3JjZUFkZFRvV2luZG93fVxuXG4gICMgT3BlbnMgYSBuYXRpdmUgZGlhbG9nIHRvIHByb21wdCB0aGUgdXNlciBmb3IgYSBwYXRoLlxuICAjXG4gICMgT25jZSBwYXRocyBhcmUgc2VsZWN0ZWQsIHRoZXkncmUgb3BlbmVkIGluIGEgbmV3IG9yIGV4aXN0aW5nIHtBdG9tV2luZG93fXMuXG4gICNcbiAgIyBvcHRpb25zIC1cbiAgIyAgIDp0eXBlIC0gQSBTdHJpbmcgd2hpY2ggc3BlY2lmaWVzIHRoZSB0eXBlIG9mIHRoZSBkaWFsb2csIGNvdWxkIGJlICdmaWxlJyxcbiAgIyAgICAgICAgICAgJ2ZvbGRlcicgb3IgJ2FsbCcuIFRoZSAnYWxsJyBpcyBvbmx5IGF2YWlsYWJsZSBvbiBtYWNPUy5cbiAgIyAgIDpkZXZNb2RlIC0gQSBCb29sZWFuIHdoaWNoIGNvbnRyb2xzIHdoZXRoZXIgYW55IG5ld2x5IG9wZW5lZCB3aW5kb3dzXG4gICMgICAgICAgICAgICAgIHNob3VsZCBiZSBpbiBkZXYgbW9kZSBvciBub3QuXG4gICMgICA6c2FmZU1vZGUgLSBBIEJvb2xlYW4gd2hpY2ggY29udHJvbHMgd2hldGhlciBhbnkgbmV3bHkgb3BlbmVkIHdpbmRvd3NcbiAgIyAgICAgICAgICAgICAgIHNob3VsZCBiZSBpbiBzYWZlIG1vZGUgb3Igbm90LlxuICAjICAgOndpbmRvdyAtIEFuIHtBdG9tV2luZG93fSB0byB1c2UgZm9yIG9wZW5pbmcgYSBzZWxlY3RlZCBmaWxlIHBhdGguXG4gICMgICA6cGF0aCAtIEFuIG9wdGlvbmFsIFN0cmluZyB3aGljaCBjb250cm9scyB0aGUgZGVmYXVsdCBwYXRoIHRvIHdoaWNoIHRoZVxuICAjICAgICAgICAgICBmaWxlIGRpYWxvZyBvcGVucy5cbiAgcHJvbXB0Rm9yUGF0aFRvT3BlbjogKHR5cGUsIHtkZXZNb2RlLCBzYWZlTW9kZSwgd2luZG93fSwgcGF0aD1udWxsKSAtPlxuICAgIEBwcm9tcHRGb3JQYXRoIHR5cGUsICgocGF0aHNUb09wZW4pID0+XG4gICAgICBAb3BlblBhdGhzKHtwYXRoc1RvT3BlbiwgZGV2TW9kZSwgc2FmZU1vZGUsIHdpbmRvd30pKSwgcGF0aFxuXG4gIHByb21wdEZvclBhdGg6ICh0eXBlLCBjYWxsYmFjaywgcGF0aCkgLT5cbiAgICBwcm9wZXJ0aWVzID1cbiAgICAgIHN3aXRjaCB0eXBlXG4gICAgICAgIHdoZW4gJ2ZpbGUnIHRoZW4gWydvcGVuRmlsZSddXG4gICAgICAgIHdoZW4gJ2ZvbGRlcicgdGhlbiBbJ29wZW5EaXJlY3RvcnknXVxuICAgICAgICB3aGVuICdhbGwnIHRoZW4gWydvcGVuRmlsZScsICdvcGVuRGlyZWN0b3J5J11cbiAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoXCIje3R5cGV9IGlzIGFuIGludmFsaWQgdHlwZSBmb3IgcHJvbXB0Rm9yUGF0aFwiKVxuXG4gICAgIyBTaG93IHRoZSBvcGVuIGRpYWxvZyBhcyBjaGlsZCB3aW5kb3cgb24gV2luZG93cyBhbmQgTGludXgsIGFuZCBhc1xuICAgICMgaW5kZXBlbmRlbnQgZGlhbG9nIG9uIG1hY09TLiBUaGlzIG1hdGNoZXMgbW9zdCBuYXRpdmUgYXBwcy5cbiAgICBwYXJlbnRXaW5kb3cgPVxuICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJ1xuICAgICAgICBudWxsXG4gICAgICBlbHNlXG4gICAgICAgIEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpXG5cbiAgICBvcGVuT3B0aW9ucyA9XG4gICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzLmNvbmNhdChbJ211bHRpU2VsZWN0aW9ucycsICdjcmVhdGVEaXJlY3RvcnknXSlcbiAgICAgIHRpdGxlOiBzd2l0Y2ggdHlwZVxuICAgICAgICB3aGVuICdmaWxlJyB0aGVuICdPcGVuIEZpbGUnXG4gICAgICAgIHdoZW4gJ2ZvbGRlcicgdGhlbiAnT3BlbiBGb2xkZXInXG4gICAgICAgIGVsc2UgJ09wZW4nXG5cbiAgICAjIEZpbGUgZGlhbG9nIGRlZmF1bHRzIHRvIHByb2plY3QgZGlyZWN0b3J5IG9mIGN1cnJlbnRseSBhY3RpdmUgZWRpdG9yXG4gICAgaWYgcGF0aD9cbiAgICAgIG9wZW5PcHRpb25zLmRlZmF1bHRQYXRoID0gcGF0aFxuXG4gICAgZGlhbG9nLnNob3dPcGVuRGlhbG9nKHBhcmVudFdpbmRvdywgb3Blbk9wdGlvbnMsIGNhbGxiYWNrKVxuXG4gIHByb21wdEZvclJlc3RhcnQ6IC0+XG4gICAgY2hvc2VuID0gZGlhbG9nLnNob3dNZXNzYWdlQm94IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpLFxuICAgICAgdHlwZTogJ3dhcm5pbmcnXG4gICAgICB0aXRsZTogJ1Jlc3RhcnQgcmVxdWlyZWQnXG4gICAgICBtZXNzYWdlOiBcIllvdSB3aWxsIG5lZWQgdG8gcmVzdGFydCBBdG9tIGZvciB0aGlzIGNoYW5nZSB0byB0YWtlIGVmZmVjdC5cIlxuICAgICAgYnV0dG9uczogWydSZXN0YXJ0IEF0b20nLCAnQ2FuY2VsJ11cbiAgICBpZiBjaG9zZW4gaXMgMFxuICAgICAgQHJlc3RhcnQoKVxuXG4gIHJlc3RhcnQ6IC0+XG4gICAgYXJncyA9IFtdXG4gICAgYXJncy5wdXNoKFwiLS1zYWZlXCIpIGlmIEBzYWZlTW9kZVxuICAgIGFyZ3MucHVzaChcIi0tbG9nLWZpbGU9I3tAbG9nRmlsZX1cIikgaWYgQGxvZ0ZpbGU/XG4gICAgYXJncy5wdXNoKFwiLS1zb2NrZXQtcGF0aD0je0Bzb2NrZXRQYXRofVwiKSBpZiBAc29ja2V0UGF0aD9cbiAgICBhcmdzLnB1c2goXCItLXVzZXItZGF0YS1kaXI9I3tAdXNlckRhdGFEaXJ9XCIpIGlmIEB1c2VyRGF0YURpcj9cbiAgICBpZiBAZGV2TW9kZVxuICAgICAgYXJncy5wdXNoKCctLWRldicpXG4gICAgICBhcmdzLnB1c2goXCItLXJlc291cmNlLXBhdGg9I3tAcmVzb3VyY2VQYXRofVwiKVxuICAgIGFwcC5yZWxhdW5jaCh7YXJnc30pXG4gICAgYXBwLnF1aXQoKVxuXG4gIGRpc2FibGVab29tT25EaXNwbGF5Q2hhbmdlOiAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSA9PlxuICAgICAgZm9yIHdpbmRvdyBpbiBAd2luZG93c1xuICAgICAgICB3aW5kb3cuZGlzYWJsZVpvb20oKVxuXG4gICAgIyBTZXQgdGhlIGxpbWl0cyBldmVyeSB0aW1lIGEgZGlzcGxheSBpcyBhZGRlZCBvciByZW1vdmVkLCBvdGhlcndpc2UgdGhlXG4gICAgIyBjb25maWd1cmF0aW9uIGdldHMgcmVzZXQgdG8gdGhlIGRlZmF1bHQsIHdoaWNoIGFsbG93cyB6b29taW5nIHRoZVxuICAgICMgd2ViZnJhbWUuXG4gICAgc2NyZWVuLm9uKCdkaXNwbGF5LWFkZGVkJywgb3V0ZXJDYWxsYmFjaylcbiAgICBzY3JlZW4ub24oJ2Rpc3BsYXktcmVtb3ZlZCcsIG91dGVyQ2FsbGJhY2spXG4gICAgbmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIHNjcmVlbi5yZW1vdmVMaXN0ZW5lcignZGlzcGxheS1hZGRlZCcsIG91dGVyQ2FsbGJhY2spXG4gICAgICBzY3JlZW4ucmVtb3ZlTGlzdGVuZXIoJ2Rpc3BsYXktcmVtb3ZlZCcsIG91dGVyQ2FsbGJhY2spXG4iXX0=
