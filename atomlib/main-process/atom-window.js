(function() {
  var AtomWindow, BrowserWindow, EventEmitter, app, dialog, fs, ipcMain, path, ref, url,
    slice = [].slice;

  ref = require('electron'), BrowserWindow = ref.BrowserWindow, app = ref.app, dialog = ref.dialog, ipcMain = ref.ipcMain;

  path = require('path');

  fs = require('fs');

  url = require('url');

  EventEmitter = require('events').EventEmitter;

  module.exports = AtomWindow = (function() {
    Object.assign(AtomWindow.prototype, EventEmitter.prototype);

    AtomWindow.iconPath = path.resolve(__dirname, '..', '..', 'resources', 'atom.png');

    AtomWindow.includeShellLoadTime = true;

    AtomWindow.prototype.browserWindow = null;

    AtomWindow.prototype.loaded = null;

    AtomWindow.prototype.isSpec = null;

    function AtomWindow(atomApplication, fileRecoveryService, settings) {
      var hasPathToOpen, loadSettings, locationsToOpen, options, parentDirectory, pathToOpen, stat;
      this.atomApplication = atomApplication;
      this.fileRecoveryService = fileRecoveryService;
      if (settings == null) {
        settings = {};
      }
      this.resourcePath = settings.resourcePath, pathToOpen = settings.pathToOpen, locationsToOpen = settings.locationsToOpen, this.isSpec = settings.isSpec, this.headless = settings.headless, this.safeMode = settings.safeMode, this.devMode = settings.devMode;
      if (pathToOpen) {
        if (locationsToOpen == null) {
          locationsToOpen = [
            {
              pathToOpen: pathToOpen
            }
          ];
        }
      }
      if (locationsToOpen == null) {
        locationsToOpen = [];
      }
      this.loadedPromise = new Promise((function(_this) {
        return function(resolveLoadedPromise) {
          _this.resolveLoadedPromise = resolveLoadedPromise;
        };
      })(this));
      this.closedPromise = new Promise((function(_this) {
        return function(resolveClosedPromise) {
          _this.resolveClosedPromise = resolveClosedPromise;
        };
      })(this));
      options = {
        show: false,
        title: 'Atom',
        webPreferences: {
          backgroundThrottling: !this.isSpec,
          disableBlinkFeatures: 'Auxclick'
        }
      };
      if (process.platform === 'linux') {
        options.icon = this.constructor.iconPath;
      }
      if (this.shouldAddCustomTitleBar()) {
        options.titleBarStyle = 'hidden';
      }
      if (this.shouldAddCustomInsetTitleBar()) {
        options.titleBarStyle = 'hidden-inset';
      }
      if (this.shouldHideTitleBar()) {
        options.frame = false;
      }
      this.browserWindow = new BrowserWindow(options);
      this.handleEvents();
      loadSettings = Object.assign({}, settings);
      loadSettings.appVersion = app.getVersion();
      loadSettings.resourcePath = this.resourcePath;
      if (loadSettings.devMode == null) {
        loadSettings.devMode = false;
      }
      if (loadSettings.safeMode == null) {
        loadSettings.safeMode = false;
      }
      loadSettings.atomHome = process.env.ATOM_HOME;
      if (loadSettings.clearWindowState == null) {
        loadSettings.clearWindowState = false;
      }
      if (loadSettings.initialPaths == null) {
        loadSettings.initialPaths = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = locationsToOpen.length; i < len; i++) {
            pathToOpen = locationsToOpen[i].pathToOpen;
            if (!(pathToOpen)) {
              continue;
            }
            stat = fs.statSyncNoException(pathToOpen) || null;
            if (stat != null ? stat.isDirectory() : void 0) {
              results.push(pathToOpen);
            } else {
              parentDirectory = path.dirname(pathToOpen);
              if ((stat != null ? stat.isFile() : void 0) || fs.existsSync(parentDirectory)) {
                results.push(parentDirectory);
              } else {
                results.push(pathToOpen);
              }
            }
          }
          return results;
        })();
      }
      loadSettings.initialPaths.sort();
      if (this.constructor.includeShellLoadTime && !this.isSpec) {
        this.constructor.includeShellLoadTime = false;
        if (loadSettings.shellLoadTime == null) {
          loadSettings.shellLoadTime = Date.now() - global.shellStartTime;
        }
      }
      this.representedDirectoryPaths = loadSettings.initialPaths;
      if (loadSettings.env != null) {
        this.env = loadSettings.env;
      }
      this.browserWindow.loadSettingsJSON = JSON.stringify(loadSettings);
      this.browserWindow.on('window:loaded', (function(_this) {
        return function() {
          _this.disableZoom();
          _this.emit('window:loaded');
          return _this.resolveLoadedPromise();
        };
      })(this));
      this.browserWindow.on('window:locations-opened', (function(_this) {
        return function() {
          return _this.emit('window:locations-opened');
        };
      })(this));
      this.browserWindow.on('enter-full-screen', (function(_this) {
        return function() {
          return _this.browserWindow.webContents.send('did-enter-full-screen');
        };
      })(this));
      this.browserWindow.on('leave-full-screen', (function(_this) {
        return function() {
          return _this.browserWindow.webContents.send('did-leave-full-screen');
        };
      })(this));
      this.browserWindow.loadURL(url.format({
        protocol: 'file',
        pathname: this.resourcePath + "/static/index.html",
        slashes: true
      }));
      this.browserWindow.showSaveDialog = this.showSaveDialog.bind(this);
      if (this.isSpec) {
        this.browserWindow.focusOnWebView();
      }
      if (typeof windowDimensions !== "undefined" && windowDimensions !== null) {
        this.browserWindow.temporaryState = {
          windowDimensions: windowDimensions
        };
      }
      hasPathToOpen = !(locationsToOpen.length === 1 && (locationsToOpen[0].pathToOpen == null));
      if (hasPathToOpen && !this.isSpecWindow()) {
        this.openLocations(locationsToOpen);
      }
      this.atomApplication.addWindow(this);
    }

    AtomWindow.prototype.hasProjectPath = function() {
      return this.representedDirectoryPaths.length > 0;
    };

    AtomWindow.prototype.setupContextMenu = function() {
      var ContextMenu;
      ContextMenu = require('./context-menu');
      return this.browserWindow.on('context-menu', (function(_this) {
        return function(menuTemplate) {
          return new ContextMenu(menuTemplate, _this);
        };
      })(this));
    };

    AtomWindow.prototype.containsPaths = function(paths) {
      var i, len, pathToCheck;
      for (i = 0, len = paths.length; i < len; i++) {
        pathToCheck = paths[i];
        if (!this.containsPath(pathToCheck)) {
          return false;
        }
      }
      return true;
    };

    AtomWindow.prototype.containsPath = function(pathToCheck) {
      return this.representedDirectoryPaths.some(function(projectPath) {
        var base;
        if (!projectPath) {
          return false;
        } else if (!pathToCheck) {
          return false;
        } else if (pathToCheck === projectPath) {
          return true;
        } else if (typeof (base = fs.statSyncNoException(pathToCheck)).isDirectory === "function" ? base.isDirectory() : void 0) {
          return false;
        } else if (pathToCheck.indexOf(path.join(projectPath, path.sep)) === 0) {
          return true;
        } else {
          return false;
        }
      });
    };

    AtomWindow.prototype.handleEvents = function() {
      this.browserWindow.on('close', (function(_this) {
        return function(event) {
          if (!(_this.atomApplication.quitting || _this.unloading)) {
            event.preventDefault();
            _this.unloading = true;
            _this.atomApplication.saveState(false);
            return _this.prepareToUnload().then(function(result) {
              if (result) {
                return _this.close();
              }
            });
          }
        };
      })(this));
      this.browserWindow.on('closed', (function(_this) {
        return function() {
          _this.fileRecoveryService.didCloseWindow(_this);
          _this.atomApplication.removeWindow(_this);
          return _this.resolveClosedPromise();
        };
      })(this));
      this.browserWindow.on('unresponsive', (function(_this) {
        return function() {
          var chosen;
          if (_this.isSpec) {
            return;
          }
          chosen = dialog.showMessageBox(_this.browserWindow, {
            type: 'warning',
            buttons: ['Force Close', 'Keep Waiting'],
            message: 'Editor is not responding',
            detail: 'The editor is not responding. Would you like to force close it or just keep waiting?'
          });
          if (chosen === 0) {
            return _this.browserWindow.destroy();
          }
        };
      })(this));
      this.browserWindow.webContents.on('crashed', (function(_this) {
        return function() {
          var chosen;
          if (_this.headless) {
            console.log("Renderer process crashed, exiting");
            _this.atomApplication.exit(100);
            return;
          }
          _this.fileRecoveryService.didCrashWindow(_this);
          chosen = dialog.showMessageBox(_this.browserWindow, {
            type: 'warning',
            buttons: ['Close Window', 'Reload', 'Keep It Open'],
            message: 'The editor has crashed',
            detail: 'Please report this issue to https://github.com/atom/atom'
          });
          switch (chosen) {
            case 0:
              return _this.browserWindow.destroy();
            case 1:
              return _this.browserWindow.reload();
          }
        };
      })(this));
      this.browserWindow.webContents.on('will-navigate', (function(_this) {
        return function(event, url) {
          if (url !== _this.browserWindow.webContents.getURL()) {
            return event.preventDefault();
          }
        };
      })(this));
      this.setupContextMenu();
      if (this.isSpec) {
        return this.browserWindow.on('blur', (function(_this) {
          return function() {
            return _this.browserWindow.focusOnWebView();
          };
        })(this));
      }
    };

    AtomWindow.prototype.prepareToUnload = function() {
      if (this.isSpecWindow()) {
        return Promise.resolve(true);
      }
      return this.lastPrepareToUnloadPromise = new Promise((function(_this) {
        return function(resolve) {
          var callback;
          callback = function(event, result) {
            if (BrowserWindow.fromWebContents(event.sender) === _this.browserWindow) {
              ipcMain.removeListener('did-prepare-to-unload', callback);
              if (!result) {
                _this.unloading = false;
                _this.atomApplication.quitting = false;
              }
              return resolve(result);
            }
          };
          ipcMain.on('did-prepare-to-unload', callback);
          return _this.browserWindow.webContents.send('prepare-to-unload');
        };
      })(this));
    };

    AtomWindow.prototype.openPath = function(pathToOpen, initialLine, initialColumn) {
      return this.openLocations([
        {
          pathToOpen: pathToOpen,
          initialLine: initialLine,
          initialColumn: initialColumn
        }
      ]);
    };

    AtomWindow.prototype.openLocations = function(locationsToOpen) {
      return this.loadedPromise.then((function(_this) {
        return function() {
          return _this.sendMessage('open-locations', locationsToOpen);
        };
      })(this));
    };

    AtomWindow.prototype.replaceEnvironment = function(env) {
      return this.browserWindow.webContents.send('environment', env);
    };

    AtomWindow.prototype.sendMessage = function(message, detail) {
      return this.browserWindow.webContents.send('message', message, detail);
    };

    AtomWindow.prototype.sendCommand = function() {
      var args, command;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      if (this.isSpecWindow()) {
        if (!this.atomApplication.sendCommandToFirstResponder(command)) {
          switch (command) {
            case 'window:reload':
              return this.reload();
            case 'window:toggle-dev-tools':
              return this.toggleDevTools();
            case 'window:close':
              return this.close();
          }
        }
      } else if (this.isWebViewFocused()) {
        return this.sendCommandToBrowserWindow.apply(this, [command].concat(slice.call(args)));
      } else {
        if (!this.atomApplication.sendCommandToFirstResponder(command)) {
          return this.sendCommandToBrowserWindow.apply(this, [command].concat(slice.call(args)));
        }
      }
    };

    AtomWindow.prototype.sendCommandToBrowserWindow = function() {
      var action, args, command, ref1, ref2;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      action = ((ref1 = args[0]) != null ? ref1.contextCommand : void 0) ? 'context-command' : 'command';
      return (ref2 = this.browserWindow.webContents).send.apply(ref2, [action, command].concat(slice.call(args)));
    };

    AtomWindow.prototype.getDimensions = function() {
      var height, ref1, ref2, width, x, y;
      ref1 = this.browserWindow.getPosition(), x = ref1[0], y = ref1[1];
      ref2 = this.browserWindow.getSize(), width = ref2[0], height = ref2[1];
      return {
        x: x,
        y: y,
        width: width,
        height: height
      };
    };

    AtomWindow.prototype.shouldAddCustomTitleBar = function() {
      return !this.isSpec && process.platform === 'darwin' && this.atomApplication.config.get('core.titleBar') === 'custom';
    };

    AtomWindow.prototype.shouldAddCustomInsetTitleBar = function() {
      return !this.isSpec && process.platform === 'darwin' && this.atomApplication.config.get('core.titleBar') === 'custom-inset';
    };

    AtomWindow.prototype.shouldHideTitleBar = function() {
      return !this.isSpec && process.platform === 'darwin' && this.atomApplication.config.get('core.titleBar') === 'hidden';
    };

    AtomWindow.prototype.close = function() {
      return this.browserWindow.close();
    };

    AtomWindow.prototype.focus = function() {
      return this.browserWindow.focus();
    };

    AtomWindow.prototype.minimize = function() {
      return this.browserWindow.minimize();
    };

    AtomWindow.prototype.maximize = function() {
      return this.browserWindow.maximize();
    };

    AtomWindow.prototype.unmaximize = function() {
      return this.browserWindow.unmaximize();
    };

    AtomWindow.prototype.restore = function() {
      return this.browserWindow.restore();
    };

    AtomWindow.prototype.setFullScreen = function(fullScreen) {
      return this.browserWindow.setFullScreen(fullScreen);
    };

    AtomWindow.prototype.setAutoHideMenuBar = function(autoHideMenuBar) {
      return this.browserWindow.setAutoHideMenuBar(autoHideMenuBar);
    };

    AtomWindow.prototype.handlesAtomCommands = function() {
      return !this.isSpecWindow() && this.isWebViewFocused();
    };

    AtomWindow.prototype.isFocused = function() {
      return this.browserWindow.isFocused();
    };

    AtomWindow.prototype.isMaximized = function() {
      return this.browserWindow.isMaximized();
    };

    AtomWindow.prototype.isMinimized = function() {
      return this.browserWindow.isMinimized();
    };

    AtomWindow.prototype.isWebViewFocused = function() {
      return this.browserWindow.isWebViewFocused();
    };

    AtomWindow.prototype.isSpecWindow = function() {
      return this.isSpec;
    };

    AtomWindow.prototype.reload = function() {
      this.loadedPromise = new Promise((function(_this) {
        return function(resolveLoadedPromise) {
          _this.resolveLoadedPromise = resolveLoadedPromise;
        };
      })(this));
      this.prepareToUnload().then((function(_this) {
        return function(result) {
          if (result) {
            return _this.browserWindow.reload();
          }
        };
      })(this));
      return this.loadedPromise;
    };

    AtomWindow.prototype.showSaveDialog = function(params) {
      params = Object.assign({
        title: 'Save File',
        defaultPath: this.representedDirectoryPaths[0]
      }, params);
      return dialog.showSaveDialog(this.browserWindow, params);
    };

    AtomWindow.prototype.toggleDevTools = function() {
      return this.browserWindow.toggleDevTools();
    };

    AtomWindow.prototype.openDevTools = function() {
      return this.browserWindow.openDevTools();
    };

    AtomWindow.prototype.closeDevTools = function() {
      return this.browserWindow.closeDevTools();
    };

    AtomWindow.prototype.setDocumentEdited = function(documentEdited) {
      return this.browserWindow.setDocumentEdited(documentEdited);
    };

    AtomWindow.prototype.setRepresentedFilename = function(representedFilename) {
      return this.browserWindow.setRepresentedFilename(representedFilename);
    };

    AtomWindow.prototype.setRepresentedDirectoryPaths = function(representedDirectoryPaths) {
      this.representedDirectoryPaths = representedDirectoryPaths;
      this.representedDirectoryPaths.sort();
      return this.atomApplication.saveState();
    };

    AtomWindow.prototype.copy = function() {
      return this.browserWindow.copy();
    };

    AtomWindow.prototype.disableZoom = function() {
      return this.browserWindow.webContents.setVisualZoomLevelLimits(1, 1);
    };

    return AtomWindow;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hdG9tLXdpbmRvdy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLGlGQUFBO0lBQUE7O0VBQUEsTUFBd0MsT0FBQSxDQUFRLFVBQVIsQ0FBeEMsRUFBQyxpQ0FBRCxFQUFnQixhQUFoQixFQUFxQixtQkFBckIsRUFBNkI7O0VBQzdCLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0VBQ0wsR0FBQSxHQUFNLE9BQUEsQ0FBUSxLQUFSOztFQUNMLGVBQWdCLE9BQUEsQ0FBUSxRQUFSOztFQUVqQixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ0osTUFBTSxDQUFDLE1BQVAsQ0FBYyxVQUFDLENBQUEsU0FBZixFQUEwQixZQUFZLENBQUMsU0FBdkM7O0lBRUEsVUFBQyxDQUFBLFFBQUQsR0FBVyxJQUFJLENBQUMsT0FBTCxDQUFhLFNBQWIsRUFBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0MsV0FBcEMsRUFBaUQsVUFBakQ7O0lBQ1gsVUFBQyxDQUFBLG9CQUFELEdBQXVCOzt5QkFFdkIsYUFBQSxHQUFlOzt5QkFDZixNQUFBLEdBQVE7O3lCQUNSLE1BQUEsR0FBUTs7SUFFSyxvQkFBQyxlQUFELEVBQW1CLG1CQUFuQixFQUF5QyxRQUF6QztBQUNYLFVBQUE7TUFEWSxJQUFDLENBQUEsa0JBQUQ7TUFBa0IsSUFBQyxDQUFBLHNCQUFEOztRQUFzQixXQUFTOztNQUM1RCxJQUFDLENBQUEsd0JBQUEsWUFBRixFQUFnQixnQ0FBaEIsRUFBNEIsMENBQTVCLEVBQTZDLElBQUMsQ0FBQSxrQkFBQSxNQUE5QyxFQUFzRCxJQUFDLENBQUEsb0JBQUEsUUFBdkQsRUFBaUUsSUFBQyxDQUFBLG9CQUFBLFFBQWxFLEVBQTRFLElBQUMsQ0FBQSxtQkFBQTtN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QSx5QkFBMEIsQ0FBQSxDQUFBLENBRm5CO09BQWQsRUFHTixNQUhNO2FBSVQsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsSUFBQyxDQUFBLGFBQXZCLEVBQXNDLE1BQXRDO0lBTGM7O3lCQU9oQixjQUFBLEdBQWdCLFNBQUE7YUFBRyxJQUFDLENBQUEsYUFBYSxDQUFDLGNBQWYsQ0FBQTtJQUFIOzt5QkFFaEIsWUFBQSxHQUFjLFNBQUE7YUFBRyxJQUFDLENBQUEsYUFBYSxDQUFDLFlBQWYsQ0FBQTtJQUFIOzt5QkFFZCxhQUFBLEdBQWUsU0FBQTthQUFHLElBQUMsQ0FBQSxhQUFhLENBQUMsYUFBZixDQUFBO0lBQUg7O3lCQUVmLGlCQUFBLEdBQW1CLFNBQUMsY0FBRDthQUFvQixJQUFDLENBQUEsYUFBYSxDQUFDLGlCQUFmLENBQWlDLGNBQWpDO0lBQXBCOzt5QkFFbkIsc0JBQUEsR0FBd0IsU0FBQyxtQkFBRDthQUF5QixJQUFDLENBQUEsYUFBYSxDQUFDLHNCQUFmLENBQXNDLG1CQUF0QztJQUF6Qjs7eUJBRXhCLDRCQUFBLEdBQThCLFNBQUMseUJBQUQ7TUFBQyxJQUFDLENBQUEsNEJBQUQ7TUFDN0IsSUFBQyxDQUFBLHlCQUF5QixDQUFDLElBQTNCLENBQUE7YUFDQSxJQUFDLENBQUEsZUFBZSxDQUFDLFNBQWpCLENBQUE7SUFGNEI7O3lCQUk5QixJQUFBLEdBQU0sU0FBQTthQUFHLElBQUMsQ0FBQSxhQUFhLENBQUMsSUFBZixDQUFBO0lBQUg7O3lCQUVOLFdBQUEsR0FBYSxTQUFBO2FBQ1gsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQUFXLENBQUMsd0JBQTNCLENBQW9ELENBQXBELEVBQXVELENBQXZEO0lBRFc7Ozs7O0FBM1RmIiwic291cmNlc0NvbnRlbnQiOlsie0Jyb3dzZXJXaW5kb3csIGFwcCwgZGlhbG9nLCBpcGNNYWlufSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5mcyA9IHJlcXVpcmUgJ2ZzJ1xudXJsID0gcmVxdWlyZSAndXJsJ1xue0V2ZW50RW1pdHRlcn0gPSByZXF1aXJlICdldmVudHMnXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEF0b21XaW5kb3dcbiAgT2JqZWN0LmFzc2lnbiBAcHJvdG90eXBlLCBFdmVudEVtaXR0ZXIucHJvdG90eXBlXG5cbiAgQGljb25QYXRoOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncmVzb3VyY2VzJywgJ2F0b20ucG5nJylcbiAgQGluY2x1ZGVTaGVsbExvYWRUaW1lOiB0cnVlXG5cbiAgYnJvd3NlcldpbmRvdzogbnVsbFxuICBsb2FkZWQ6IG51bGxcbiAgaXNTcGVjOiBudWxsXG5cbiAgY29uc3RydWN0b3I6IChAYXRvbUFwcGxpY2F0aW9uLCBAZmlsZVJlY292ZXJ5U2VydmljZSwgc2V0dGluZ3M9e30pIC0+XG4gICAge0ByZXNvdXJjZVBhdGgsIHBhdGhUb09wZW4sIGxvY2F0aW9uc1RvT3BlbiwgQGlzU3BlYywgQGhlYWRsZXNzLCBAc2FmZU1vZGUsIEBkZXZNb2RlfSA9IHNldHRpbmdzXG4gICAgbG9jYXRpb25zVG9PcGVuID89IFt7cGF0aFRvT3Blbn1dIGlmIHBhdGhUb09wZW5cbiAgICBsb2NhdGlvbnNUb09wZW4gPz0gW11cblxuICAgIEBsb2FkZWRQcm9taXNlID0gbmV3IFByb21pc2UoKEByZXNvbHZlTG9hZGVkUHJvbWlzZSkgPT4pXG4gICAgQGNsb3NlZFByb21pc2UgPSBuZXcgUHJvbWlzZSgoQHJlc29sdmVDbG9zZWRQcm9taXNlKSA9PilcblxuICAgIG9wdGlvbnMgPVxuICAgICAgc2hvdzogZmFsc2VcbiAgICAgIHRpdGxlOiAnQXRvbSdcbiAgICAgIHdlYlByZWZlcmVuY2VzOlxuICAgICAgICAjIFByZXZlbnQgc3BlY3MgZnJvbSB0aHJvdHRsaW5nIHdoZW4gdGhlIHdpbmRvdyBpcyBpbiB0aGUgYmFja2dyb3VuZDpcbiAgICAgICAgIyB0aGlzIHNob3VsZCByZXN1bHQgaW4gZmFzdGVyIENJIGJ1aWxkcywgYW5kIGFuIGltcHJvdmVtZW50IGluIHRoZVxuICAgICAgICAjIGxvY2FsIGRldmVsb3BtZW50IGV4cGVyaWVuY2Ugd2hlbiBydW5uaW5nIHNwZWNzIHRocm91Z2ggdGhlIFVJICh3aGljaFxuICAgICAgICAjIG5vdyB3b24ndCBwYXVzZSB3aGVuIGUuZy4gbWluaW1pemluZyB0aGUgd2luZG93KS5cbiAgICAgICAgYmFja2dyb3VuZFRocm90dGxpbmc6IG5vdCBAaXNTcGVjXG4gICAgICAgICMgRGlzYWJsZSB0aGUgYGF1eGNsaWNrYCBmZWF0dXJlIHNvIHRoYXQgYGNsaWNrYCBldmVudHMgYXJlIHRyaWdnZXJlZCBpblxuICAgICAgICAjIHJlc3BvbnNlIHRvIGEgbWlkZGxlLWNsaWNrLlxuICAgICAgICAjIChSZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9hdG9tL2F0b20vcHVsbC8xMjY5NiNpc3N1ZWNvbW1lbnQtMjkwNDk2OTYwKVxuICAgICAgICBkaXNhYmxlQmxpbmtGZWF0dXJlczogJ0F1eGNsaWNrJ1xuXG4gICAgIyBEb24ndCBzZXQgaWNvbiBvbiBXaW5kb3dzIHNvIHRoZSBleGUncyBpY28gd2lsbCBiZSB1c2VkIGFzIHdpbmRvdyBhbmRcbiAgICAjIHRhc2tiYXIncyBpY29uLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9pc3N1ZXMvNDgxMSBmb3IgbW9yZS5cbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdsaW51eCdcbiAgICAgIG9wdGlvbnMuaWNvbiA9IEBjb25zdHJ1Y3Rvci5pY29uUGF0aFxuXG4gICAgaWYgQHNob3VsZEFkZEN1c3RvbVRpdGxlQmFyKClcbiAgICAgIG9wdGlvbnMudGl0bGVCYXJTdHlsZSA9ICdoaWRkZW4nXG5cbiAgICBpZiBAc2hvdWxkQWRkQ3VzdG9tSW5zZXRUaXRsZUJhcigpXG4gICAgICBvcHRpb25zLnRpdGxlQmFyU3R5bGUgPSAnaGlkZGVuLWluc2V0J1xuXG4gICAgaWYgQHNob3VsZEhpZGVUaXRsZUJhcigpXG4gICAgICBvcHRpb25zLmZyYW1lID0gZmFsc2VcblxuICAgIEBicm93c2VyV2luZG93ID0gbmV3IEJyb3dzZXJXaW5kb3cob3B0aW9ucylcbiAgICBAaGFuZGxlRXZlbnRzKClcblxuICAgIGxvYWRTZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzKVxuICAgIGxvYWRTZXR0aW5ncy5hcHBWZXJzaW9uID0gYXBwLmdldFZlcnNpb24oKVxuICAgIGxvYWRTZXR0aW5ncy5yZXNvdXJjZVBhdGggPSBAcmVzb3VyY2VQYXRoXG4gICAgbG9hZFNldHRpbmdzLmRldk1vZGUgPz0gZmFsc2VcbiAgICBsb2FkU2V0dGluZ3Muc2FmZU1vZGUgPz0gZmFsc2VcbiAgICBsb2FkU2V0dGluZ3MuYXRvbUhvbWUgPSBwcm9jZXNzLmVudi5BVE9NX0hPTUVcbiAgICBsb2FkU2V0dGluZ3MuY2xlYXJXaW5kb3dTdGF0ZSA/PSBmYWxzZVxuICAgIGxvYWRTZXR0aW5ncy5pbml0aWFsUGF0aHMgPz1cbiAgICAgIGZvciB7cGF0aFRvT3Blbn0gaW4gbG9jYXRpb25zVG9PcGVuIHdoZW4gcGF0aFRvT3BlblxuICAgICAgICBzdGF0ID0gZnMuc3RhdFN5bmNOb0V4Y2VwdGlvbihwYXRoVG9PcGVuKSBvciBudWxsXG4gICAgICAgIGlmIHN0YXQ/LmlzRGlyZWN0b3J5KClcbiAgICAgICAgICBwYXRoVG9PcGVuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwYXJlbnREaXJlY3RvcnkgPSBwYXRoLmRpcm5hbWUocGF0aFRvT3BlbilcbiAgICAgICAgICBpZiBzdGF0Py5pc0ZpbGUoKSBvciBmcy5leGlzdHNTeW5jKHBhcmVudERpcmVjdG9yeSlcbiAgICAgICAgICAgIHBhcmVudERpcmVjdG9yeVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHBhdGhUb09wZW5cbiAgICBsb2FkU2V0dGluZ3MuaW5pdGlhbFBhdGhzLnNvcnQoKVxuXG4gICAgIyBPbmx5IHNlbmQgdG8gdGhlIGZpcnN0IG5vbi1zcGVjIHdpbmRvdyBjcmVhdGVkXG4gICAgaWYgQGNvbnN0cnVjdG9yLmluY2x1ZGVTaGVsbExvYWRUaW1lIGFuZCBub3QgQGlzU3BlY1xuICAgICAgQGNvbnN0cnVjdG9yLmluY2x1ZGVTaGVsbExvYWRUaW1lID0gZmFsc2VcbiAgICAgIGxvYWRTZXR0aW5ncy5zaGVsbExvYWRUaW1lID89IERhdGUubm93KCkgLSBnbG9iYWwuc2hlbGxTdGFydFRpbWVcblxuICAgIEByZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzID0gbG9hZFNldHRpbmdzLmluaXRpYWxQYXRoc1xuICAgIEBlbnYgPSBsb2FkU2V0dGluZ3MuZW52IGlmIGxvYWRTZXR0aW5ncy5lbnY/XG5cbiAgICBAYnJvd3NlcldpbmRvdy5sb2FkU2V0dGluZ3NKU09OID0gSlNPTi5zdHJpbmdpZnkobG9hZFNldHRpbmdzKVxuXG4gICAgQGJyb3dzZXJXaW5kb3cub24gJ3dpbmRvdzpsb2FkZWQnLCA9PlxuICAgICAgQGRpc2FibGVab29tKClcbiAgICAgIEBlbWl0ICd3aW5kb3c6bG9hZGVkJ1xuICAgICAgQHJlc29sdmVMb2FkZWRQcm9taXNlKClcblxuICAgIEBicm93c2VyV2luZG93Lm9uICd3aW5kb3c6bG9jYXRpb25zLW9wZW5lZCcsID0+XG4gICAgICBAZW1pdCAnd2luZG93OmxvY2F0aW9ucy1vcGVuZWQnXG5cbiAgICBAYnJvd3NlcldpbmRvdy5vbiAnZW50ZXItZnVsbC1zY3JlZW4nLCA9PlxuICAgICAgQGJyb3dzZXJXaW5kb3cud2ViQ29udGVudHMuc2VuZCgnZGlkLWVudGVyLWZ1bGwtc2NyZWVuJylcblxuICAgIEBicm93c2VyV2luZG93Lm9uICdsZWF2ZS1mdWxsLXNjcmVlbicsID0+XG4gICAgICBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kKCdkaWQtbGVhdmUtZnVsbC1zY3JlZW4nKVxuXG4gICAgQGJyb3dzZXJXaW5kb3cubG9hZFVSTCB1cmwuZm9ybWF0XG4gICAgICBwcm90b2NvbDogJ2ZpbGUnXG4gICAgICBwYXRobmFtZTogXCIje0ByZXNvdXJjZVBhdGh9L3N0YXRpYy9pbmRleC5odG1sXCJcbiAgICAgIHNsYXNoZXM6IHRydWVcblxuICAgIEBicm93c2VyV2luZG93LnNob3dTYXZlRGlhbG9nID0gQHNob3dTYXZlRGlhbG9nLmJpbmQodGhpcylcblxuICAgIEBicm93c2VyV2luZG93LmZvY3VzT25XZWJWaWV3KCkgaWYgQGlzU3BlY1xuICAgIEBicm93c2VyV2luZG93LnRlbXBvcmFyeVN0YXRlID0ge3dpbmRvd0RpbWVuc2lvbnN9IGlmIHdpbmRvd0RpbWVuc2lvbnM/XG5cbiAgICBoYXNQYXRoVG9PcGVuID0gbm90IChsb2NhdGlvbnNUb09wZW4ubGVuZ3RoIGlzIDEgYW5kIG5vdCBsb2NhdGlvbnNUb09wZW5bMF0ucGF0aFRvT3Blbj8pXG4gICAgQG9wZW5Mb2NhdGlvbnMobG9jYXRpb25zVG9PcGVuKSBpZiBoYXNQYXRoVG9PcGVuIGFuZCBub3QgQGlzU3BlY1dpbmRvdygpXG5cbiAgICBAYXRvbUFwcGxpY2F0aW9uLmFkZFdpbmRvdyh0aGlzKVxuXG4gIGhhc1Byb2plY3RQYXRoOiAtPiBAcmVwcmVzZW50ZWREaXJlY3RvcnlQYXRocy5sZW5ndGggPiAwXG5cbiAgc2V0dXBDb250ZXh0TWVudTogLT5cbiAgICBDb250ZXh0TWVudSA9IHJlcXVpcmUgJy4vY29udGV4dC1tZW51J1xuXG4gICAgQGJyb3dzZXJXaW5kb3cub24gJ2NvbnRleHQtbWVudScsIChtZW51VGVtcGxhdGUpID0+XG4gICAgICBuZXcgQ29udGV4dE1lbnUobWVudVRlbXBsYXRlLCB0aGlzKVxuXG4gIGNvbnRhaW5zUGF0aHM6IChwYXRocykgLT5cbiAgICBmb3IgcGF0aFRvQ2hlY2sgaW4gcGF0aHNcbiAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQGNvbnRhaW5zUGF0aChwYXRoVG9DaGVjaylcbiAgICB0cnVlXG5cbiAgY29udGFpbnNQYXRoOiAocGF0aFRvQ2hlY2spIC0+XG4gICAgQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHMuc29tZSAocHJvamVjdFBhdGgpIC0+XG4gICAgICBpZiBub3QgcHJvamVjdFBhdGhcbiAgICAgICAgZmFsc2VcbiAgICAgIGVsc2UgaWYgbm90IHBhdGhUb0NoZWNrXG4gICAgICAgIGZhbHNlXG4gICAgICBlbHNlIGlmIHBhdGhUb0NoZWNrIGlzIHByb2plY3RQYXRoXG4gICAgICAgIHRydWVcbiAgICAgIGVsc2UgaWYgZnMuc3RhdFN5bmNOb0V4Y2VwdGlvbihwYXRoVG9DaGVjaykuaXNEaXJlY3Rvcnk/KClcbiAgICAgICAgZmFsc2VcbiAgICAgIGVsc2UgaWYgcGF0aFRvQ2hlY2suaW5kZXhPZihwYXRoLmpvaW4ocHJvamVjdFBhdGgsIHBhdGguc2VwKSkgaXMgMFxuICAgICAgICB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIGZhbHNlXG5cbiAgaGFuZGxlRXZlbnRzOiAtPlxuICAgIEBicm93c2VyV2luZG93Lm9uICdjbG9zZScsIChldmVudCkgPT5cbiAgICAgIHVubGVzcyBAYXRvbUFwcGxpY2F0aW9uLnF1aXR0aW5nIG9yIEB1bmxvYWRpbmdcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAdW5sb2FkaW5nID0gdHJ1ZVxuICAgICAgICBAYXRvbUFwcGxpY2F0aW9uLnNhdmVTdGF0ZShmYWxzZSlcbiAgICAgICAgQHByZXBhcmVUb1VubG9hZCgpLnRoZW4gKHJlc3VsdCkgPT5cbiAgICAgICAgICBAY2xvc2UoKSBpZiByZXN1bHRcblxuICAgIEBicm93c2VyV2luZG93Lm9uICdjbG9zZWQnLCA9PlxuICAgICAgQGZpbGVSZWNvdmVyeVNlcnZpY2UuZGlkQ2xvc2VXaW5kb3codGhpcylcbiAgICAgIEBhdG9tQXBwbGljYXRpb24ucmVtb3ZlV2luZG93KHRoaXMpXG4gICAgICBAcmVzb2x2ZUNsb3NlZFByb21pc2UoKVxuXG4gICAgQGJyb3dzZXJXaW5kb3cub24gJ3VucmVzcG9uc2l2ZScsID0+XG4gICAgICByZXR1cm4gaWYgQGlzU3BlY1xuXG4gICAgICBjaG9zZW4gPSBkaWFsb2cuc2hvd01lc3NhZ2VCb3ggQGJyb3dzZXJXaW5kb3csXG4gICAgICAgIHR5cGU6ICd3YXJuaW5nJ1xuICAgICAgICBidXR0b25zOiBbJ0ZvcmNlIENsb3NlJywgJ0tlZXAgV2FpdGluZyddXG4gICAgICAgIG1lc3NhZ2U6ICdFZGl0b3IgaXMgbm90IHJlc3BvbmRpbmcnXG4gICAgICAgIGRldGFpbDogJ1RoZSBlZGl0b3IgaXMgbm90IHJlc3BvbmRpbmcuIFdvdWxkIHlvdSBsaWtlIHRvIGZvcmNlIGNsb3NlIGl0IG9yIGp1c3Qga2VlcCB3YWl0aW5nPydcbiAgICAgIEBicm93c2VyV2luZG93LmRlc3Ryb3koKSBpZiBjaG9zZW4gaXMgMFxuXG4gICAgQGJyb3dzZXJXaW5kb3cud2ViQ29udGVudHMub24gJ2NyYXNoZWQnLCA9PlxuICAgICAgaWYgQGhlYWRsZXNzXG4gICAgICAgIGNvbnNvbGUubG9nIFwiUmVuZGVyZXIgcHJvY2VzcyBjcmFzaGVkLCBleGl0aW5nXCJcbiAgICAgICAgQGF0b21BcHBsaWNhdGlvbi5leGl0KDEwMClcbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIEBmaWxlUmVjb3ZlcnlTZXJ2aWNlLmRpZENyYXNoV2luZG93KHRoaXMpXG4gICAgICBjaG9zZW4gPSBkaWFsb2cuc2hvd01lc3NhZ2VCb3ggQGJyb3dzZXJXaW5kb3csXG4gICAgICAgIHR5cGU6ICd3YXJuaW5nJ1xuICAgICAgICBidXR0b25zOiBbJ0Nsb3NlIFdpbmRvdycsICdSZWxvYWQnLCAnS2VlcCBJdCBPcGVuJ11cbiAgICAgICAgbWVzc2FnZTogJ1RoZSBlZGl0b3IgaGFzIGNyYXNoZWQnXG4gICAgICAgIGRldGFpbDogJ1BsZWFzZSByZXBvcnQgdGhpcyBpc3N1ZSB0byBodHRwczovL2dpdGh1Yi5jb20vYXRvbS9hdG9tJ1xuICAgICAgc3dpdGNoIGNob3NlblxuICAgICAgICB3aGVuIDAgdGhlbiBAYnJvd3NlcldpbmRvdy5kZXN0cm95KClcbiAgICAgICAgd2hlbiAxIHRoZW4gQGJyb3dzZXJXaW5kb3cucmVsb2FkKClcblxuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLm9uICd3aWxsLW5hdmlnYXRlJywgKGV2ZW50LCB1cmwpID0+XG4gICAgICB1bmxlc3MgdXJsIGlzIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLmdldFVSTCgpXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICAgIEBzZXR1cENvbnRleHRNZW51KClcblxuICAgIGlmIEBpc1NwZWNcbiAgICAgICMgU3BlYyB3aW5kb3cncyB3ZWIgdmlldyBzaG91bGQgYWx3YXlzIGhhdmUgZm9jdXNcbiAgICAgIEBicm93c2VyV2luZG93Lm9uICdibHVyJywgPT5cbiAgICAgICAgQGJyb3dzZXJXaW5kb3cuZm9jdXNPbldlYlZpZXcoKVxuXG4gIHByZXBhcmVUb1VubG9hZDogLT5cbiAgICBpZiBAaXNTcGVjV2luZG93KClcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSlcbiAgICBAbGFzdFByZXBhcmVUb1VubG9hZFByb21pc2UgPSBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIGNhbGxiYWNrID0gKGV2ZW50LCByZXN1bHQpID0+XG4gICAgICAgIGlmIEJyb3dzZXJXaW5kb3cuZnJvbVdlYkNvbnRlbnRzKGV2ZW50LnNlbmRlcikgaXMgQGJyb3dzZXJXaW5kb3dcbiAgICAgICAgICBpcGNNYWluLnJlbW92ZUxpc3RlbmVyKCdkaWQtcHJlcGFyZS10by11bmxvYWQnLCBjYWxsYmFjaylcbiAgICAgICAgICB1bmxlc3MgcmVzdWx0XG4gICAgICAgICAgICBAdW5sb2FkaW5nID0gZmFsc2VcbiAgICAgICAgICAgIEBhdG9tQXBwbGljYXRpb24ucXVpdHRpbmcgPSBmYWxzZVxuICAgICAgICAgIHJlc29sdmUocmVzdWx0KVxuICAgICAgaXBjTWFpbi5vbignZGlkLXByZXBhcmUtdG8tdW5sb2FkJywgY2FsbGJhY2spXG4gICAgICBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kKCdwcmVwYXJlLXRvLXVubG9hZCcpXG5cbiAgb3BlblBhdGg6IChwYXRoVG9PcGVuLCBpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbikgLT5cbiAgICBAb3BlbkxvY2F0aW9ucyhbe3BhdGhUb09wZW4sIGluaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1ufV0pXG5cbiAgb3BlbkxvY2F0aW9uczogKGxvY2F0aW9uc1RvT3BlbikgLT5cbiAgICBAbG9hZGVkUHJvbWlzZS50aGVuID0+IEBzZW5kTWVzc2FnZSAnb3Blbi1sb2NhdGlvbnMnLCBsb2NhdGlvbnNUb09wZW5cblxuICByZXBsYWNlRW52aXJvbm1lbnQ6IChlbnYpIC0+XG4gICAgQGJyb3dzZXJXaW5kb3cud2ViQ29udGVudHMuc2VuZCAnZW52aXJvbm1lbnQnLCBlbnZcblxuICBzZW5kTWVzc2FnZTogKG1lc3NhZ2UsIGRldGFpbCkgLT5cbiAgICBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kICdtZXNzYWdlJywgbWVzc2FnZSwgZGV0YWlsXG5cbiAgc2VuZENvbW1hbmQ6IChjb21tYW5kLCBhcmdzLi4uKSAtPlxuICAgIGlmIEBpc1NwZWNXaW5kb3coKVxuICAgICAgdW5sZXNzIEBhdG9tQXBwbGljYXRpb24uc2VuZENvbW1hbmRUb0ZpcnN0UmVzcG9uZGVyKGNvbW1hbmQpXG4gICAgICAgIHN3aXRjaCBjb21tYW5kXG4gICAgICAgICAgd2hlbiAnd2luZG93OnJlbG9hZCcgdGhlbiBAcmVsb2FkKClcbiAgICAgICAgICB3aGVuICd3aW5kb3c6dG9nZ2xlLWRldi10b29scycgdGhlbiBAdG9nZ2xlRGV2VG9vbHMoKVxuICAgICAgICAgIHdoZW4gJ3dpbmRvdzpjbG9zZScgdGhlbiBAY2xvc2UoKVxuICAgIGVsc2UgaWYgQGlzV2ViVmlld0ZvY3VzZWQoKVxuICAgICAgQHNlbmRDb21tYW5kVG9Ccm93c2VyV2luZG93KGNvbW1hbmQsIGFyZ3MuLi4pXG4gICAgZWxzZVxuICAgICAgdW5sZXNzIEBhdG9tQXBwbGljYXRpb24uc2VuZENvbW1hbmRUb0ZpcnN0UmVzcG9uZGVyKGNvbW1hbmQpXG4gICAgICAgIEBzZW5kQ29tbWFuZFRvQnJvd3NlcldpbmRvdyhjb21tYW5kLCBhcmdzLi4uKVxuXG4gIHNlbmRDb21tYW5kVG9Ccm93c2VyV2luZG93OiAoY29tbWFuZCwgYXJncy4uLikgLT5cbiAgICBhY3Rpb24gPSBpZiBhcmdzWzBdPy5jb250ZXh0Q29tbWFuZCB0aGVuICdjb250ZXh0LWNvbW1hbmQnIGVsc2UgJ2NvbW1hbmQnXG4gICAgQGJyb3dzZXJXaW5kb3cud2ViQ29udGVudHMuc2VuZCBhY3Rpb24sIGNvbW1hbmQsIGFyZ3MuLi5cblxuICBnZXREaW1lbnNpb25zOiAtPlxuICAgIFt4LCB5XSA9IEBicm93c2VyV2luZG93LmdldFBvc2l0aW9uKClcbiAgICBbd2lkdGgsIGhlaWdodF0gPSBAYnJvd3NlcldpbmRvdy5nZXRTaXplKClcbiAgICB7eCwgeSwgd2lkdGgsIGhlaWdodH1cblxuICBzaG91bGRBZGRDdXN0b21UaXRsZUJhcjogLT5cbiAgICBub3QgQGlzU3BlYyBhbmRcbiAgICBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nIGFuZFxuICAgIEBhdG9tQXBwbGljYXRpb24uY29uZmlnLmdldCgnY29yZS50aXRsZUJhcicpIGlzICdjdXN0b20nXG5cbiAgc2hvdWxkQWRkQ3VzdG9tSW5zZXRUaXRsZUJhcjogLT5cbiAgICBub3QgQGlzU3BlYyBhbmRcbiAgICBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nIGFuZFxuICAgIEBhdG9tQXBwbGljYXRpb24uY29uZmlnLmdldCgnY29yZS50aXRsZUJhcicpIGlzICdjdXN0b20taW5zZXQnXG5cbiAgc2hvdWxkSGlkZVRpdGxlQmFyOiAtPlxuICAgIG5vdCBAaXNTcGVjIGFuZFxuICAgIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbicgYW5kXG4gICAgQGF0b21BcHBsaWNhdGlvbi5jb25maWcuZ2V0KCdjb3JlLnRpdGxlQmFyJykgaXMgJ2hpZGRlbidcblxuICBjbG9zZTogLT4gQGJyb3dzZXJXaW5kb3cuY2xvc2UoKVxuXG4gIGZvY3VzOiAtPiBAYnJvd3NlcldpbmRvdy5mb2N1cygpXG5cbiAgbWluaW1pemU6IC0+IEBicm93c2VyV2luZG93Lm1pbmltaXplKClcblxuICBtYXhpbWl6ZTogLT4gQGJyb3dzZXJXaW5kb3cubWF4aW1pemUoKVxuXG4gIHVubWF4aW1pemU6IC0+IEBicm93c2VyV2luZG93LnVubWF4aW1pemUoKVxuXG4gIHJlc3RvcmU6IC0+IEBicm93c2VyV2luZG93LnJlc3RvcmUoKVxuXG4gIHNldEZ1bGxTY3JlZW46IChmdWxsU2NyZWVuKSAtPiBAYnJvd3NlcldpbmRvdy5zZXRGdWxsU2NyZWVuKGZ1bGxTY3JlZW4pXG5cbiAgc2V0QXV0b0hpZGVNZW51QmFyOiAoYXV0b0hpZGVNZW51QmFyKSAtPiBAYnJvd3NlcldpbmRvdy5zZXRBdXRvSGlkZU1lbnVCYXIoYXV0b0hpZGVNZW51QmFyKVxuXG4gIGhhbmRsZXNBdG9tQ29tbWFuZHM6IC0+XG4gICAgbm90IEBpc1NwZWNXaW5kb3coKSBhbmQgQGlzV2ViVmlld0ZvY3VzZWQoKVxuXG4gIGlzRm9jdXNlZDogLT4gQGJyb3dzZXJXaW5kb3cuaXNGb2N1c2VkKClcblxuICBpc01heGltaXplZDogLT4gQGJyb3dzZXJXaW5kb3cuaXNNYXhpbWl6ZWQoKVxuXG4gIGlzTWluaW1pemVkOiAtPiBAYnJvd3NlcldpbmRvdy5pc01pbmltaXplZCgpXG5cbiAgaXNXZWJWaWV3Rm9jdXNlZDogLT4gQGJyb3dzZXJXaW5kb3cuaXNXZWJWaWV3Rm9jdXNlZCgpXG5cbiAgaXNTcGVjV2luZG93OiAtPiBAaXNTcGVjXG5cbiAgcmVsb2FkOiAtPlxuICAgIEBsb2FkZWRQcm9taXNlID0gbmV3IFByb21pc2UoKEByZXNvbHZlTG9hZGVkUHJvbWlzZSkgPT4pXG4gICAgQHByZXBhcmVUb1VubG9hZCgpLnRoZW4gKHJlc3VsdCkgPT5cbiAgICAgIEBicm93c2VyV2luZG93LnJlbG9hZCgpIGlmIHJlc3VsdFxuICAgIEBsb2FkZWRQcm9taXNlXG5cbiAgc2hvd1NhdmVEaWFsb2c6IChwYXJhbXMpIC0+XG4gICAgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICB0aXRsZTogJ1NhdmUgRmlsZScsXG4gICAgICBkZWZhdWx0UGF0aDogQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHNbMF1cbiAgICB9LCBwYXJhbXMpXG4gICAgZGlhbG9nLnNob3dTYXZlRGlhbG9nKEBicm93c2VyV2luZG93LCBwYXJhbXMpXG5cbiAgdG9nZ2xlRGV2VG9vbHM6IC0+IEBicm93c2VyV2luZG93LnRvZ2dsZURldlRvb2xzKClcblxuICBvcGVuRGV2VG9vbHM6IC0+IEBicm93c2VyV2luZG93Lm9wZW5EZXZUb29scygpXG5cbiAgY2xvc2VEZXZUb29sczogLT4gQGJyb3dzZXJXaW5kb3cuY2xvc2VEZXZUb29scygpXG5cbiAgc2V0RG9jdW1lbnRFZGl0ZWQ6IChkb2N1bWVudEVkaXRlZCkgLT4gQGJyb3dzZXJXaW5kb3cuc2V0RG9jdW1lbnRFZGl0ZWQoZG9jdW1lbnRFZGl0ZWQpXG5cbiAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZTogKHJlcHJlc2VudGVkRmlsZW5hbWUpIC0+IEBicm93c2VyV2luZG93LnNldFJlcHJlc2VudGVkRmlsZW5hbWUocmVwcmVzZW50ZWRGaWxlbmFtZSlcblxuICBzZXRSZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzOiAoQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHMpIC0+XG4gICAgQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHMuc29ydCgpXG4gICAgQGF0b21BcHBsaWNhdGlvbi5zYXZlU3RhdGUoKVxuXG4gIGNvcHk6IC0+IEBicm93c2VyV2luZG93LmNvcHkoKVxuXG4gIGRpc2FibGVab29tOiAtPlxuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNldFZpc3VhbFpvb21MZXZlbExpbWl0cygxLCAxKVxuIl19
