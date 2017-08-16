(function() {
  var AtomEnvironment, AutoUpdateManager, CommandInstaller, CommandRegistry, CompositeDisposable, Config, ConfigSchema, ContextMenuManager, DeserializerManager, Disposable, Dock, Emitter, GrammarRegistry, Gutter, HistoryManager, HistoryProject, KeymapManager, MenuManager, Model, NotificationManager, PackageManager, Pane, PaneAxis, PaneContainer, Panel, PanelContainer, Project, ReopenProjectMenuManager, StateStore, StorageFolder, StyleManager, TextBuffer, TextEditor, TextEditorRegistry, ThemeManager, TitleBar, TooltipManager, ViewRegistry, WindowEventHandler, Workspace, _, crypto, deprecate, fs, ipcRenderer, mapSourcePosition, path, ref, ref1, registerDefaultCommands, updateProcessEnv,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  crypto = require('crypto');

  path = require('path');

  ipcRenderer = require('electron').ipcRenderer;

  _ = require('underscore-plus');

  deprecate = require('grim').deprecate;

  ref = require('event-kit'), CompositeDisposable = ref.CompositeDisposable, Disposable = ref.Disposable, Emitter = ref.Emitter;

  fs = require('fs-plus');

  mapSourcePosition = require('@atom/source-map-support').mapSourcePosition;

  Model = require('./model');

  WindowEventHandler = require('./window-event-handler');

  StateStore = require('./state-store');

  StorageFolder = require('./storage-folder');

  registerDefaultCommands = require('./register-default-commands');

  updateProcessEnv = require('./update-process-env').updateProcessEnv;

  ConfigSchema = require('./config-schema');

  DeserializerManager = require('./deserializer-manager');

  ViewRegistry = require('./view-registry');

  NotificationManager = require('./notification-manager');

  Config = require('./config');

  KeymapManager = require('./keymap-extensions');

  TooltipManager = require('./tooltip-manager');

  CommandRegistry = require('./command-registry');

  GrammarRegistry = require('./grammar-registry');

  ref1 = require('./history-manager'), HistoryManager = ref1.HistoryManager, HistoryProject = ref1.HistoryProject;

  ReopenProjectMenuManager = require('./reopen-project-menu-manager');

  StyleManager = require('./style-manager');

  PackageManager = require('./package-manager');

  ThemeManager = require('./theme-manager');

  MenuManager = require('./menu-manager');

  ContextMenuManager = require('./context-menu-manager');

  CommandInstaller = require('./command-installer');

  Project = require('./project');

  TitleBar = require('./title-bar');

  Workspace = require('./workspace');

  PanelContainer = require('./panel-container');

  Panel = require('./panel');

  PaneContainer = require('./pane-container');

  PaneAxis = require('./pane-axis');

  Pane = require('./pane');

  Dock = require('./dock');

  Project = require('./project');

  TextEditor = require('./text-editor');

  TextBuffer = require('text-buffer');

  Gutter = require('./gutter');

  TextEditorRegistry = require('./text-editor-registry');

  AutoUpdateManager = require('./auto-update-manager');

  module.exports = AtomEnvironment = (function(superClass) {
    extend(AtomEnvironment, superClass);

    AtomEnvironment.version = 1;

    AtomEnvironment.prototype.lastUncaughtError = null;


    /*
    Section: Properties
     */

    AtomEnvironment.prototype.commands = null;

    AtomEnvironment.prototype.config = null;

    AtomEnvironment.prototype.clipboard = null;

    AtomEnvironment.prototype.contextMenu = null;

    AtomEnvironment.prototype.menu = null;

    AtomEnvironment.prototype.keymaps = null;

    AtomEnvironment.prototype.tooltips = null;

    AtomEnvironment.prototype.notifications = null;

    AtomEnvironment.prototype.project = null;

    AtomEnvironment.prototype.grammars = null;

    AtomEnvironment.prototype.history = null;

    AtomEnvironment.prototype.packages = null;

    AtomEnvironment.prototype.themes = null;

    AtomEnvironment.prototype.styles = null;

    AtomEnvironment.prototype.deserializers = null;

    AtomEnvironment.prototype.views = null;

    AtomEnvironment.prototype.workspace = null;

    AtomEnvironment.prototype.textEditors = null;

    AtomEnvironment.prototype.autoUpdater = null;

    AtomEnvironment.prototype.saveStateDebounceInterval = 1000;


    /*
    Section: Construction and Destruction
     */

    function AtomEnvironment(params) {
      var onlyLoadBaseStyleSheets;
      if (params == null) {
        params = {};
      }
      this.applicationDelegate = params.applicationDelegate, this.clipboard = params.clipboard, this.enablePersistence = params.enablePersistence, onlyLoadBaseStyleSheets = params.onlyLoadBaseStyleSheets, this.updateProcessEnv = params.updateProcessEnv;
      this.nextProxyRequestId = 0;
      this.unloaded = false;
      this.loadTime = null;
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.deserializers = new DeserializerManager(this);
      this.deserializeTimings = {};
      this.views = new ViewRegistry(this);
      TextEditor.setScheduler(this.views);
      this.notifications = new NotificationManager;
      if (this.updateProcessEnv == null) {
        this.updateProcessEnv = updateProcessEnv;
      }
      this.stateStore = new StateStore('AtomEnvironments', 1);
      this.config = new Config({
        notificationManager: this.notifications,
        enablePersistence: this.enablePersistence
      });
      this.config.setSchema(null, {
        type: 'object',
        properties: _.clone(ConfigSchema)
      });
      this.keymaps = new KeymapManager({
        notificationManager: this.notifications
      });
      this.tooltips = new TooltipManager({
        keymapManager: this.keymaps,
        viewRegistry: this.views
      });
      this.commands = new CommandRegistry;
      this.grammars = new GrammarRegistry({
        config: this.config
      });
      this.styles = new StyleManager();
      this.packages = new PackageManager({
        config: this.config,
        styleManager: this.styles,
        commandRegistry: this.commands,
        keymapManager: this.keymaps,
        notificationManager: this.notifications,
        grammarRegistry: this.grammars,
        deserializerManager: this.deserializers,
        viewRegistry: this.views
      });
      this.themes = new ThemeManager({
        packageManager: this.packages,
        config: this.config,
        styleManager: this.styles,
        notificationManager: this.notifications,
        viewRegistry: this.views
      });
      this.menu = new MenuManager({
        keymapManager: this.keymaps,
        packageManager: this.packages
      });
      this.contextMenu = new ContextMenuManager({
        keymapManager: this.keymaps
      });
      this.packages.setMenuManager(this.menu);
      this.packages.setContextMenuManager(this.contextMenu);
      this.packages.setThemeManager(this.themes);
      this.project = new Project({
        notificationManager: this.notifications,
        packageManager: this.packages,
        config: this.config,
        applicationDelegate: this.applicationDelegate
      });
      this.commandInstaller = new CommandInstaller(this.applicationDelegate);
      this.textEditors = new TextEditorRegistry({
        config: this.config,
        grammarRegistry: this.grammars,
        assert: this.assert.bind(this),
        packageManager: this.packages
      });
      this.workspace = new Workspace({
        config: this.config,
        project: this.project,
        packageManager: this.packages,
        grammarRegistry: this.grammars,
        deserializerManager: this.deserializers,
        notificationManager: this.notifications,
        applicationDelegate: this.applicationDelegate,
        viewRegistry: this.views,
        assert: this.assert.bind(this),
        textEditorRegistry: this.textEditors,
        styleManager: this.styles,
        enablePersistence: this.enablePersistence
      });
      this.themes.workspace = this.workspace;
      this.autoUpdater = new AutoUpdateManager({
        applicationDelegate: this.applicationDelegate
      });
      if (this.keymaps.canLoadBundledKeymapsFromMemory()) {
        this.keymaps.loadBundledKeymaps();
      }
      this.registerDefaultCommands();
      this.registerDefaultOpeners();
      this.registerDefaultDeserializers();
      this.windowEventHandler = new WindowEventHandler({
        atomEnvironment: this,
        applicationDelegate: this.applicationDelegate
      });
      this.history = new HistoryManager({
        project: this.project,
        commands: this.commands,
        stateStore: this.stateStore
      });
      this.disposables.add(this.history.onDidChangeProjects((function(_this) {
        return function(e) {
          if (!e.reloaded) {
            return _this.applicationDelegate.didChangeHistoryManager();
          }
        };
      })(this)));
    }

    AtomEnvironment.prototype.initialize = function(params) {
      var clearWindowState, devMode, didChangeStyles, onlyLoadBaseStyleSheets, ref2, resourcePath, safeMode;
      if (params == null) {
        params = {};
      }
      require('./text-editor-element');
      this.window = params.window, this.document = params.document, this.blobStore = params.blobStore, this.configDirPath = params.configDirPath, onlyLoadBaseStyleSheets = params.onlyLoadBaseStyleSheets;
      ref2 = this.getLoadSettings(), devMode = ref2.devMode, safeMode = ref2.safeMode, resourcePath = ref2.resourcePath, clearWindowState = ref2.clearWindowState;
      if (clearWindowState) {
        this.getStorageFolder().clear();
        this.stateStore.clear();
      }
      ConfigSchema.projectHome = {
        type: 'string',
        "default": path.join(fs.getHomeDirectory(), 'github'),
        description: 'The directory where projects are assumed to be located. Packages created using the Package Generator will be stored here by default.'
      };
      this.config.initialize({
        configDirPath: this.configDirPath,
        resourcePath: resourcePath,
        projectHomeSchema: ConfigSchema.projectHome
      });
      this.menu.initialize({
        resourcePath: resourcePath
      });
      this.contextMenu.initialize({
        resourcePath: resourcePath,
        devMode: devMode
      });
      this.keymaps.configDirPath = this.configDirPath;
      this.keymaps.resourcePath = resourcePath;
      this.keymaps.devMode = devMode;
      if (!this.keymaps.canLoadBundledKeymapsFromMemory()) {
        this.keymaps.loadBundledKeymaps();
      }
      this.commands.attach(this.window);
      this.styles.initialize({
        configDirPath: this.configDirPath
      });
      this.packages.initialize({
        devMode: devMode,
        configDirPath: this.configDirPath,
        resourcePath: resourcePath,
        safeMode: safeMode
      });
      this.themes.initialize({
        configDirPath: this.configDirPath,
        resourcePath: resourcePath,
        safeMode: safeMode,
        devMode: devMode
      });
      this.commandInstaller.initialize(this.getVersion());
      this.autoUpdater.initialize();
      this.config.load();
      this.themes.loadBaseStylesheets();
      this.initialStyleElements = this.styles.getSnapshot();
      if (onlyLoadBaseStyleSheets) {
        this.themes.initialLoadComplete = true;
      }
      this.setBodyPlatformClass();
      this.stylesElement = this.styles.buildStylesElement();
      this.document.head.appendChild(this.stylesElement);
      this.keymaps.subscribeToFileReadFailure();
      this.installUncaughtErrorHandler();
      this.attachSaveStateListeners();
      this.windowEventHandler.initialize(this.window, this.document);
      didChangeStyles = this.didChangeStyles.bind(this);
      this.disposables.add(this.styles.onDidAddStyleElement(didChangeStyles));
      this.disposables.add(this.styles.onDidUpdateStyleElement(didChangeStyles));
      this.disposables.add(this.styles.onDidRemoveStyleElement(didChangeStyles));
      this.observeAutoHideMenuBar();
      return this.disposables.add(this.applicationDelegate.onDidChangeHistoryManager((function(_this) {
        return function() {
          return _this.history.loadState();
        };
      })(this)));
    };

    AtomEnvironment.prototype.preloadPackages = function() {
      return this.packages.preloadPackages();
    };

    AtomEnvironment.prototype.attachSaveStateListeners = function() {
      var saveState;
      saveState = _.debounce(((function(_this) {
        return function() {
          return _this.window.requestIdleCallback(function() {
            if (!_this.unloaded) {
              return _this.saveState({
                isUnloading: false
              });
            }
          });
        };
      })(this)), this.saveStateDebounceInterval);
      this.document.addEventListener('mousedown', saveState, true);
      this.document.addEventListener('keydown', saveState, true);
      return this.disposables.add(new Disposable((function(_this) {
        return function() {
          _this.document.removeEventListener('mousedown', saveState, true);
          return _this.document.removeEventListener('keydown', saveState, true);
        };
      })(this)));
    };

    AtomEnvironment.prototype.registerDefaultDeserializers = function() {
      this.deserializers.add(Workspace);
      this.deserializers.add(PaneContainer);
      this.deserializers.add(PaneAxis);
      this.deserializers.add(Pane);
      this.deserializers.add(Dock);
      this.deserializers.add(Project);
      this.deserializers.add(TextEditor);
      return this.deserializers.add(TextBuffer);
    };

    AtomEnvironment.prototype.registerDefaultCommands = function() {
      return registerDefaultCommands({
        commandRegistry: this.commands,
        config: this.config,
        commandInstaller: this.commandInstaller,
        notificationManager: this.notifications,
        project: this.project,
        clipboard: this.clipboard
      });
    };

    AtomEnvironment.prototype.registerDefaultOpeners = function() {
      return this.workspace.addOpener((function(_this) {
        return function(uri) {
          switch (uri) {
            case 'atom://.atom/stylesheet':
              return _this.workspace.openTextFile(_this.styles.getUserStyleSheetPath());
            case 'atom://.atom/keymap':
              return _this.workspace.openTextFile(_this.keymaps.getUserKeymapPath());
            case 'atom://.atom/config':
              return _this.workspace.openTextFile(_this.config.getUserConfigPath());
            case 'atom://.atom/init-script':
              return _this.workspace.openTextFile(_this.getUserInitScriptPath());
          }
        };
      })(this));
    };

    AtomEnvironment.prototype.registerDefaultTargetForKeymaps = function() {
      return this.keymaps.defaultTarget = this.workspace.getElement();
    };

    AtomEnvironment.prototype.observeAutoHideMenuBar = function() {
      this.disposables.add(this.config.onDidChange('core.autoHideMenuBar', (function(_this) {
        return function(arg1) {
          var newValue;
          newValue = arg1.newValue;
          return _this.setAutoHideMenuBar(newValue);
        };
      })(this)));
      if (this.config.get('core.autoHideMenuBar')) {
        return this.setAutoHideMenuBar(true);
      }
    };

    AtomEnvironment.prototype.reset = function() {
      this.deserializers.clear();
      this.registerDefaultDeserializers();
      this.config.clear();
      this.config.setSchema(null, {
        type: 'object',
        properties: _.clone(ConfigSchema)
      });
      this.keymaps.clear();
      this.keymaps.loadBundledKeymaps();
      this.commands.clear();
      this.registerDefaultCommands();
      this.styles.restoreSnapshot(this.initialStyleElements);
      this.menu.clear();
      this.clipboard.reset();
      this.notifications.clear();
      this.contextMenu.clear();
      this.packages.reset();
      this.workspace.reset(this.packages);
      this.registerDefaultOpeners();
      this.project.reset(this.packages);
      this.workspace.subscribeToEvents();
      this.grammars.clear();
      this.textEditors.clear();
      return this.views.clear();
    };

    AtomEnvironment.prototype.destroy = function() {
      var ref2, ref3;
      if (!this.project) {
        return;
      }
      this.disposables.dispose();
      if ((ref2 = this.workspace) != null) {
        ref2.destroy();
      }
      this.workspace = null;
      this.themes.workspace = null;
      if ((ref3 = this.project) != null) {
        ref3.destroy();
      }
      this.project = null;
      this.commands.clear();
      this.stylesElement.remove();
      this.config.unobserveUserConfig();
      this.autoUpdater.destroy();
      return this.uninstallWindowEventHandler();
    };


    /*
    Section: Event Subscription
     */

    AtomEnvironment.prototype.onDidBeep = function(callback) {
      return this.emitter.on('did-beep', callback);
    };

    AtomEnvironment.prototype.onWillThrowError = function(callback) {
      return this.emitter.on('will-throw-error', callback);
    };

    AtomEnvironment.prototype.onDidThrowError = function(callback) {
      return this.emitter.on('did-throw-error', callback);
    };

    AtomEnvironment.prototype.onDidFailAssertion = function(callback) {
      return this.emitter.on('did-fail-assertion', callback);
    };

    AtomEnvironment.prototype.whenShellEnvironmentLoaded = function(callback) {
      if (this.shellEnvironmentLoaded) {
        callback();
        return new Disposable();
      } else {
        return this.emitter.once('loaded-shell-environment', callback);
      }
    };


    /*
    Section: Atom Details
     */

    AtomEnvironment.prototype.inDevMode = function() {
      return this.devMode != null ? this.devMode : this.devMode = this.getLoadSettings().devMode;
    };

    AtomEnvironment.prototype.inSafeMode = function() {
      return this.safeMode != null ? this.safeMode : this.safeMode = this.getLoadSettings().safeMode;
    };

    AtomEnvironment.prototype.inSpecMode = function() {
      return this.specMode != null ? this.specMode : this.specMode = this.getLoadSettings().isSpec;
    };

    AtomEnvironment.prototype.isFirstLoad = function() {
      return this.firstLoad != null ? this.firstLoad : this.firstLoad = this.getLoadSettings().firstLoad;
    };

    AtomEnvironment.prototype.getVersion = function() {
      return this.appVersion != null ? this.appVersion : this.appVersion = this.getLoadSettings().appVersion;
    };

    AtomEnvironment.prototype.getReleaseChannel = function() {
      var version;
      version = this.getVersion();
      if (version.indexOf('beta') > -1) {
        return 'beta';
      } else if (version.indexOf('dev') > -1) {
        return 'dev';
      } else {
        return 'stable';
      }
    };

    AtomEnvironment.prototype.isReleasedVersion = function() {
      return !/\w{7}/.test(this.getVersion());
    };

    AtomEnvironment.prototype.getWindowLoadTime = function() {
      return this.loadTime;
    };

    AtomEnvironment.prototype.getLoadSettings = function() {
      return this.applicationDelegate.getWindowLoadSettings();
    };


    /*
    Section: Managing The Atom Window
     */

    AtomEnvironment.prototype.open = function(params) {
      return this.applicationDelegate.open(params);
    };

    AtomEnvironment.prototype.pickFolder = function(callback) {
      return this.applicationDelegate.pickFolder(callback);
    };

    AtomEnvironment.prototype.close = function() {
      return this.applicationDelegate.closeWindow();
    };

    AtomEnvironment.prototype.getSize = function() {
      return this.applicationDelegate.getWindowSize();
    };

    AtomEnvironment.prototype.setSize = function(width, height) {
      return this.applicationDelegate.setWindowSize(width, height);
    };

    AtomEnvironment.prototype.getPosition = function() {
      return this.applicationDelegate.getWindowPosition();
    };

    AtomEnvironment.prototype.setPosition = function(x, y) {
      return this.applicationDelegate.setWindowPosition(x, y);
    };

    AtomEnvironment.prototype.getCurrentWindow = function() {
      return this.applicationDelegate.getCurrentWindow();
    };

    AtomEnvironment.prototype.center = function() {
      return this.applicationDelegate.centerWindow();
    };

    AtomEnvironment.prototype.focus = function() {
      this.applicationDelegate.focusWindow();
      return this.window.focus();
    };

    AtomEnvironment.prototype.show = function() {
      return this.applicationDelegate.showWindow();
    };

    AtomEnvironment.prototype.hide = function() {
      return this.applicationDelegate.hideWindow();
    };

    AtomEnvironment.prototype.reload = function() {
      return this.applicationDelegate.reloadWindow();
    };

    AtomEnvironment.prototype.restartApplication = function() {
      return this.applicationDelegate.restartApplication();
    };

    AtomEnvironment.prototype.isMaximized = function() {
      return this.applicationDelegate.isWindowMaximized();
    };

    AtomEnvironment.prototype.maximize = function() {
      return this.applicationDelegate.maximizeWindow();
    };

    AtomEnvironment.prototype.isFullScreen = function() {
      return this.applicationDelegate.isWindowFullScreen();
    };

    AtomEnvironment.prototype.setFullScreen = function(fullScreen) {
      if (fullScreen == null) {
        fullScreen = false;
      }
      return this.applicationDelegate.setWindowFullScreen(fullScreen);
    };

    AtomEnvironment.prototype.toggleFullScreen = function() {
      return this.setFullScreen(!this.isFullScreen());
    };

    AtomEnvironment.prototype.displayWindow = function() {
      return this.restoreWindowDimensions().then((function(_this) {
        return function() {
          var ref2, ref3, steps;
          steps = [_this.restoreWindowBackground(), _this.show(), _this.focus()];
          if ((ref2 = _this.windowDimensions) != null ? ref2.fullScreen : void 0) {
            steps.push(_this.setFullScreen(true));
          }
          if (((ref3 = _this.windowDimensions) != null ? ref3.maximized : void 0) && process.platform !== 'darwin') {
            steps.push(_this.maximize());
          }
          return Promise.all(steps);
        };
      })(this));
    };

    AtomEnvironment.prototype.getWindowDimensions = function() {
      var browserWindow, height, maximized, ref2, ref3, width, x, y;
      browserWindow = this.getCurrentWindow();
      ref2 = browserWindow.getPosition(), x = ref2[0], y = ref2[1];
      ref3 = browserWindow.getSize(), width = ref3[0], height = ref3[1];
      maximized = browserWindow.isMaximized();
      return {
        x: x,
        y: y,
        width: width,
        height: height,
        maximized: maximized
      };
    };

    AtomEnvironment.prototype.setWindowDimensions = function(arg1) {
      var height, steps, width, x, y;
      x = arg1.x, y = arg1.y, width = arg1.width, height = arg1.height;
      steps = [];
      if ((width != null) && (height != null)) {
        steps.push(this.setSize(width, height));
      }
      if ((x != null) && (y != null)) {
        steps.push(this.setPosition(x, y));
      } else {
        steps.push(this.center());
      }
      return Promise.all(steps);
    };

    AtomEnvironment.prototype.isValidDimensions = function(arg1) {
      var height, ref2, width, x, y;
      ref2 = arg1 != null ? arg1 : {}, x = ref2.x, y = ref2.y, width = ref2.width, height = ref2.height;
      return width > 0 && height > 0 && x + width > 0 && y + height > 0;
    };

    AtomEnvironment.prototype.storeWindowDimensions = function() {
      this.windowDimensions = this.getWindowDimensions();
      if (this.isValidDimensions(this.windowDimensions)) {
        return localStorage.setItem("defaultWindowDimensions", JSON.stringify(this.windowDimensions));
      }
    };

    AtomEnvironment.prototype.getDefaultWindowDimensions = function() {
      var dimensions, error, height, ref2, width, windowDimensions;
      windowDimensions = this.getLoadSettings().windowDimensions;
      if (windowDimensions != null) {
        return windowDimensions;
      }
      dimensions = null;
      try {
        dimensions = JSON.parse(localStorage.getItem("defaultWindowDimensions"));
      } catch (error1) {
        error = error1;
        console.warn("Error parsing default window dimensions", error);
        localStorage.removeItem("defaultWindowDimensions");
      }
      if (this.isValidDimensions(dimensions)) {
        return dimensions;
      } else {
        ref2 = this.applicationDelegate.getPrimaryDisplayWorkAreaSize(), width = ref2.width, height = ref2.height;
        return {
          x: 0,
          y: 0,
          width: Math.min(1024, width),
          height: height
        };
      }
    };

    AtomEnvironment.prototype.restoreWindowDimensions = function() {
      if (!((this.windowDimensions != null) && this.isValidDimensions(this.windowDimensions))) {
        this.windowDimensions = this.getDefaultWindowDimensions();
      }
      return this.setWindowDimensions(this.windowDimensions).then((function(_this) {
        return function() {
          return _this.windowDimensions;
        };
      })(this));
    };

    AtomEnvironment.prototype.restoreWindowBackground = function() {
      var backgroundColor;
      if (backgroundColor = window.localStorage.getItem('atom:window-background-color')) {
        this.backgroundStylesheet = document.createElement('style');
        this.backgroundStylesheet.type = 'text/css';
        this.backgroundStylesheet.innerText = 'html, body { background: ' + backgroundColor + ' !important; }';
        return document.head.appendChild(this.backgroundStylesheet);
      }
    };

    AtomEnvironment.prototype.storeWindowBackground = function() {
      var backgroundColor;
      if (this.inSpecMode()) {
        return;
      }
      backgroundColor = this.window.getComputedStyle(this.workspace.getElement())['background-color'];
      return this.window.localStorage.setItem('atom:window-background-color', backgroundColor);
    };

    AtomEnvironment.prototype.startEditorWindow = function() {
      var loadHistoryPromise, loadStatePromise, updateProcessEnvPromise;
      this.unloaded = false;
      updateProcessEnvPromise = this.updateProcessEnvAndTriggerHooks();
      loadStatePromise = this.loadState().then((function(_this) {
        return function(state) {
          _this.windowDimensions = state != null ? state.windowDimensions : void 0;
          return _this.displayWindow().then(function() {
            var startTime;
            _this.commandInstaller.installAtomCommand(false, function(error) {
              if (error != null) {
                return console.warn(error.message);
              }
            });
            _this.commandInstaller.installApmCommand(false, function(error) {
              if (error != null) {
                return console.warn(error.message);
              }
            });
            _this.disposables.add(_this.applicationDelegate.onDidOpenLocations(_this.openLocations.bind(_this)));
            _this.disposables.add(_this.applicationDelegate.onApplicationMenuCommand(_this.dispatchApplicationMenuCommand.bind(_this)));
            _this.disposables.add(_this.applicationDelegate.onContextMenuCommand(_this.dispatchContextMenuCommand.bind(_this)));
            _this.disposables.add(_this.applicationDelegate.onDidRequestUnload(function() {
              return _this.saveState({
                isUnloading: true
              })["catch"](console.error).then(function() {
                var ref2;
                return (ref2 = _this.workspace) != null ? ref2.confirmClose({
                  windowCloseRequested: true,
                  projectHasPaths: _this.project.getPaths().length > 0
                }) : void 0;
              });
            }));
            _this.listenForUpdates();
            _this.registerDefaultTargetForKeymaps();
            _this.packages.loadPackages();
            startTime = Date.now();
            return _this.deserialize(state).then(function() {
              var ref2;
              _this.deserializeTimings.atom = Date.now() - startTime;
              if (process.platform === 'darwin' && _this.config.get('core.titleBar') === 'custom') {
                _this.workspace.addHeaderPanel({
                  item: new TitleBar({
                    workspace: _this.workspace,
                    themes: _this.themes,
                    applicationDelegate: _this.applicationDelegate
                  })
                });
                _this.document.body.classList.add('custom-title-bar');
              }
              if (process.platform === 'darwin' && _this.config.get('core.titleBar') === 'custom-inset') {
                _this.workspace.addHeaderPanel({
                  item: new TitleBar({
                    workspace: _this.workspace,
                    themes: _this.themes,
                    applicationDelegate: _this.applicationDelegate
                  })
                });
                _this.document.body.classList.add('custom-inset-title-bar');
              }
              if (process.platform === 'darwin' && _this.config.get('core.titleBar') === 'hidden') {
                _this.document.body.classList.add('hidden-title-bar');
              }
              _this.document.body.appendChild(_this.workspace.getElement());
              if ((ref2 = _this.backgroundStylesheet) != null) {
                ref2.remove();
              }
              _this.watchProjectPaths();
              _this.packages.activate();
              _this.keymaps.loadUserKeymap();
              if (!_this.getLoadSettings().safeMode) {
                _this.requireUserInitScript();
              }
              _this.menu.update();
              return _this.openInitialEmptyEditorIfNecessary();
            });
          });
        };
      })(this));
      loadHistoryPromise = this.history.loadState().then((function(_this) {
        return function() {
          _this.reopenProjectMenuManager = new ReopenProjectMenuManager({
            menu: _this.menu,
            commands: _this.commands,
            history: _this.history,
            config: _this.config,
            open: function(paths) {
              return _this.open({
                pathsToOpen: paths
              });
            }
          });
          return _this.reopenProjectMenuManager.update();
        };
      })(this));
      return Promise.all([loadStatePromise, loadHistoryPromise, updateProcessEnvPromise]);
    };

    AtomEnvironment.prototype.serialize = function(options) {
      return {
        version: this.constructor.version,
        project: this.project.serialize(options),
        workspace: this.workspace.serialize(),
        packageStates: this.packages.serialize(),
        grammars: {
          grammarOverridesByPath: this.grammars.grammarOverridesByPath
        },
        fullScreen: this.isFullScreen(),
        windowDimensions: this.windowDimensions,
        textEditors: this.textEditors.serialize()
      };
    };

    AtomEnvironment.prototype.unloadEditorWindow = function() {
      if (!this.project) {
        return;
      }
      this.storeWindowBackground();
      this.packages.deactivatePackages();
      this.saveBlobStoreSync();
      return this.unloaded = true;
    };

    AtomEnvironment.prototype.saveBlobStoreSync = function() {
      if (this.enablePersistence) {
        return this.blobStore.save();
      }
    };

    AtomEnvironment.prototype.openInitialEmptyEditorIfNecessary = function() {
      var ref2;
      if (!this.config.get('core.openEmptyEditorOnStart')) {
        return;
      }
      if (((ref2 = this.getLoadSettings().initialPaths) != null ? ref2.length : void 0) === 0 && this.workspace.getPaneItems().length === 0) {
        return this.workspace.open(null);
      }
    };

    AtomEnvironment.prototype.installUncaughtErrorHandler = function() {
      this.previousWindowErrorHandler = this.window.onerror;
      return this.window.onerror = (function(_this) {
        return function() {
          var column, eventObject, line, message, openDevTools, originalError, ref2, ref3, source, url;
          _this.lastUncaughtError = Array.prototype.slice.call(arguments);
          ref2 = _this.lastUncaughtError, message = ref2[0], url = ref2[1], line = ref2[2], column = ref2[3], originalError = ref2[4];
          ref3 = mapSourcePosition({
            source: url,
            line: line,
            column: column
          }), line = ref3.line, column = ref3.column, source = ref3.source;
          if (url === '<embedded>') {
            url = source;
          }
          eventObject = {
            message: message,
            url: url,
            line: line,
            column: column,
            originalError: originalError
          };
          openDevTools = true;
          eventObject.preventDefault = function() {
            return openDevTools = false;
          };
          _this.emitter.emit('will-throw-error', eventObject);
          if (openDevTools) {
            _this.openDevTools().then(function() {
              return _this.executeJavaScriptInDevTools('DevToolsAPI.showPanel("console")');
            });
          }
          return _this.emitter.emit('did-throw-error', {
            message: message,
            url: url,
            line: line,
            column: column,
            originalError: originalError
          });
        };
      })(this);
    };

    AtomEnvironment.prototype.uninstallUncaughtErrorHandler = function() {
      return this.window.onerror = this.previousWindowErrorHandler;
    };

    AtomEnvironment.prototype.installWindowEventHandler = function() {
      this.windowEventHandler = new WindowEventHandler({
        atomEnvironment: this,
        applicationDelegate: this.applicationDelegate
      });
      return this.windowEventHandler.initialize(this.window, this.document);
    };

    AtomEnvironment.prototype.uninstallWindowEventHandler = function() {
      var ref2;
      if ((ref2 = this.windowEventHandler) != null) {
        ref2.unsubscribe();
      }
      return this.windowEventHandler = null;
    };

    AtomEnvironment.prototype.didChangeStyles = function(styleElement) {
      TextEditor.didUpdateStyles();
      if (styleElement.textContent.indexOf('scrollbar') >= 0) {
        return TextEditor.didUpdateScrollbarStyles();
      }
    };

    AtomEnvironment.prototype.updateProcessEnvAndTriggerHooks = function() {
      return this.updateProcessEnv(this.getLoadSettings().env).then((function(_this) {
        return function() {
          _this.shellEnvironmentLoaded = true;
          _this.emitter.emit('loaded-shell-environment');
          return _this.packages.triggerActivationHook('core:loaded-shell-environment');
        };
      })(this));
    };


    /*
    Section: Messaging the User
     */

    AtomEnvironment.prototype.beep = function() {
      if (this.config.get('core.audioBeep')) {
        this.applicationDelegate.playBeepSound();
      }
      return this.emitter.emit('did-beep');
    };

    AtomEnvironment.prototype.confirm = function(params) {
      if (params == null) {
        params = {};
      }
      return this.applicationDelegate.confirm(params);
    };


    /*
    Section: Managing the Dev Tools
     */

    AtomEnvironment.prototype.openDevTools = function() {
      return this.applicationDelegate.openWindowDevTools();
    };

    AtomEnvironment.prototype.toggleDevTools = function() {
      return this.applicationDelegate.toggleWindowDevTools();
    };

    AtomEnvironment.prototype.executeJavaScriptInDevTools = function(code) {
      return this.applicationDelegate.executeJavaScriptInWindowDevTools(code);
    };


    /*
    Section: Private
     */

    AtomEnvironment.prototype.assert = function(condition, message, callbackOrMetadata) {
      var error;
      if (condition) {
        return true;
      }
      error = new Error("Assertion failed: " + message);
      Error.captureStackTrace(error, this.assert);
      if (callbackOrMetadata != null) {
        if (typeof callbackOrMetadata === 'function') {
          if (typeof callbackOrMetadata === "function") {
            callbackOrMetadata(error);
          }
        } else {
          error.metadata = callbackOrMetadata;
        }
      }
      this.emitter.emit('did-fail-assertion', error);
      if (!this.isReleasedVersion()) {
        throw error;
      }
      return false;
    };

    AtomEnvironment.prototype.loadThemes = function() {
      return this.themes.load();
    };

    AtomEnvironment.prototype.watchProjectPaths = function() {
      return this.disposables.add(this.project.onDidChangePaths((function(_this) {
        return function() {
          return _this.applicationDelegate.setRepresentedDirectoryPaths(_this.project.getPaths());
        };
      })(this)));
    };

    AtomEnvironment.prototype.setDocumentEdited = function(edited) {
      var base;
      return typeof (base = this.applicationDelegate).setWindowDocumentEdited === "function" ? base.setWindowDocumentEdited(edited) : void 0;
    };

    AtomEnvironment.prototype.setRepresentedFilename = function(filename) {
      var base;
      return typeof (base = this.applicationDelegate).setWindowRepresentedFilename === "function" ? base.setWindowRepresentedFilename(filename) : void 0;
    };

    AtomEnvironment.prototype.addProjectFolder = function() {
      return this.pickFolder((function(_this) {
        return function(selectedPaths) {
          if (selectedPaths == null) {
            selectedPaths = [];
          }
          return _this.addToProject(selectedPaths);
        };
      })(this));
    };

    AtomEnvironment.prototype.addToProject = function(projectPaths) {
      return this.loadState(this.getStateKey(projectPaths)).then((function(_this) {
        return function(state) {
          var folder, i, len, results;
          if (state && _this.project.getPaths().length === 0) {
            return _this.attemptRestoreProjectStateForPaths(state, projectPaths);
          } else {
            results = [];
            for (i = 0, len = projectPaths.length; i < len; i++) {
              folder = projectPaths[i];
              results.push(_this.project.addPath(folder));
            }
            return results;
          }
        };
      })(this));
    };

    AtomEnvironment.prototype.attemptRestoreProjectStateForPaths = function(state, projectPaths, filesToOpen) {
      var btn, center, file, i, len, nouns, selectedPath, windowIsUnused;
      if (filesToOpen == null) {
        filesToOpen = [];
      }
      center = this.workspace.getCenter();
      windowIsUnused = (function(_this) {
        return function() {
          var container, i, item, j, len, len1, ref2, ref3;
          ref2 = _this.workspace.getPaneContainers();
          for (i = 0, len = ref2.length; i < len; i++) {
            container = ref2[i];
            ref3 = container.getPaneItems();
            for (j = 0, len1 = ref3.length; j < len1; j++) {
              item = ref3[j];
              if (item instanceof TextEditor) {
                if (item.getPath() || item.isModified()) {
                  return false;
                }
              } else {
                if (container === center) {
                  return false;
                }
              }
            }
          }
          return true;
        };
      })(this);
      if (windowIsUnused()) {
        this.restoreStateIntoThisEnvironment(state);
        return Promise.all((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = filesToOpen.length; i < len; i++) {
            file = filesToOpen[i];
            results.push(this.workspace.open(file));
          }
          return results;
        }).call(this));
      } else {
        nouns = projectPaths.length === 1 ? 'folder' : 'folders';
        btn = this.confirm({
          message: 'Previous automatically-saved project state detected',
          detailedMessage: ("There is previously saved state for the selected " + nouns + ". ") + ("Would you like to add the " + nouns + " to this window, permanently discarding the saved state, ") + ("or open the " + nouns + " in a new window, restoring the saved state?"),
          buttons: ['Open in new window and recover state', 'Add to this window and discard state']
        });
        if (btn === 0) {
          this.open({
            pathsToOpen: projectPaths.concat(filesToOpen),
            newWindow: true,
            devMode: this.inDevMode(),
            safeMode: this.inSafeMode()
          });
          return Promise.resolve(null);
        } else if (btn === 1) {
          for (i = 0, len = projectPaths.length; i < len; i++) {
            selectedPath = projectPaths[i];
            this.project.addPath(selectedPath);
          }
          return Promise.all((function() {
            var j, len1, results;
            results = [];
            for (j = 0, len1 = filesToOpen.length; j < len1; j++) {
              file = filesToOpen[j];
              results.push(this.workspace.open(file));
            }
            return results;
          }).call(this));
        }
      }
    };

    AtomEnvironment.prototype.restoreStateIntoThisEnvironment = function(state) {
      var i, len, pane, ref2;
      state.fullScreen = this.isFullScreen();
      ref2 = this.workspace.getPanes();
      for (i = 0, len = ref2.length; i < len; i++) {
        pane = ref2[i];
        pane.destroy();
      }
      return this.deserialize(state);
    };

    AtomEnvironment.prototype.showSaveDialog = function(callback) {
      return callback(this.showSaveDialogSync());
    };

    AtomEnvironment.prototype.showSaveDialogSync = function(options) {
      if (options == null) {
        options = {};
      }
      return this.applicationDelegate.showSaveDialog(options);
    };

    AtomEnvironment.prototype.saveState = function(options, storageKey) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var ref2, savePromise, state;
          if (_this.enablePersistence && _this.project) {
            state = _this.serialize(options);
            savePromise = (storageKey != null ? storageKey : storageKey = _this.getStateKey((ref2 = _this.project) != null ? ref2.getPaths() : void 0)) ? _this.stateStore.save(storageKey, state) : _this.applicationDelegate.setTemporaryWindowState(state);
            return savePromise["catch"](reject).then(resolve);
          } else {
            return resolve();
          }
        };
      })(this));
    };

    AtomEnvironment.prototype.loadState = function(stateKey) {
      if (this.enablePersistence) {
        if (stateKey != null ? stateKey : stateKey = this.getStateKey(this.getLoadSettings().initialPaths)) {
          return this.stateStore.load(stateKey).then((function(_this) {
            return function(state) {
              if (state) {
                return state;
              } else {
                return _this.getStorageFolder().load(stateKey);
              }
            };
          })(this));
        } else {
          return this.applicationDelegate.getTemporaryWindowState();
        }
      } else {
        return Promise.resolve(null);
      }
    };

    AtomEnvironment.prototype.deserialize = function(state) {
      var grammarOverridesByPath, projectPromise, ref2, ref3, startTime;
      if (state == null) {
        return Promise.resolve();
      }
      if (grammarOverridesByPath = (ref2 = state.grammars) != null ? ref2.grammarOverridesByPath : void 0) {
        this.grammars.grammarOverridesByPath = grammarOverridesByPath;
      }
      this.setFullScreen(state.fullScreen);
      this.packages.packageStates = (ref3 = state.packageStates) != null ? ref3 : {};
      startTime = Date.now();
      if (state.project != null) {
        projectPromise = this.project.deserialize(state.project, this.deserializers);
      } else {
        projectPromise = Promise.resolve();
      }
      return projectPromise.then((function(_this) {
        return function() {
          _this.deserializeTimings.project = Date.now() - startTime;
          if (state.textEditors) {
            _this.textEditors.deserialize(state.textEditors);
          }
          startTime = Date.now();
          if (state.workspace != null) {
            _this.workspace.deserialize(state.workspace, _this.deserializers);
          }
          return _this.deserializeTimings.workspace = Date.now() - startTime;
        };
      })(this));
    };

    AtomEnvironment.prototype.getStateKey = function(paths) {
      var sha1;
      if ((paths != null ? paths.length : void 0) > 0) {
        sha1 = crypto.createHash('sha1').update(paths.slice().sort().join("\n")).digest('hex');
        return "editor-" + sha1;
      } else {
        return null;
      }
    };

    AtomEnvironment.prototype.getStorageFolder = function() {
      return this.storageFolder != null ? this.storageFolder : this.storageFolder = new StorageFolder(this.getConfigDirPath());
    };

    AtomEnvironment.prototype.getConfigDirPath = function() {
      return this.configDirPath != null ? this.configDirPath : this.configDirPath = process.env.ATOM_HOME;
    };

    AtomEnvironment.prototype.getUserInitScriptPath = function() {
      var initScriptPath;
      initScriptPath = fs.resolve(this.getConfigDirPath(), 'init', ['js', 'coffee']);
      return initScriptPath != null ? initScriptPath : path.join(this.getConfigDirPath(), 'init.coffee');
    };

    AtomEnvironment.prototype.requireUserInitScript = function() {
      var error, userInitScriptPath;
      if (userInitScriptPath = this.getUserInitScriptPath()) {
        try {
          if (fs.isFileSync(userInitScriptPath)) {
            return require(userInitScriptPath);
          }
        } catch (error1) {
          error = error1;
          return this.notifications.addError("Failed to load `" + userInitScriptPath + "`", {
            detail: error.message,
            dismissable: true
          });
        }
      }
    };

    AtomEnvironment.prototype.onUpdateAvailable = function(callback) {
      return this.emitter.on('update-available', callback);
    };

    AtomEnvironment.prototype.updateAvailable = function(details) {
      return this.emitter.emit('update-available', details);
    };

    AtomEnvironment.prototype.listenForUpdates = function() {
      return this.disposables.add(this.autoUpdater.onDidCompleteDownloadingUpdate(this.updateAvailable.bind(this)));
    };

    AtomEnvironment.prototype.setBodyPlatformClass = function() {
      return this.document.body.classList.add("platform-" + process.platform);
    };

    AtomEnvironment.prototype.setAutoHideMenuBar = function(autoHide) {
      this.applicationDelegate.setAutoHideWindowMenuBar(autoHide);
      return this.applicationDelegate.setWindowMenuBarVisibility(!autoHide);
    };

    AtomEnvironment.prototype.dispatchApplicationMenuCommand = function(command, arg) {
      var activeElement;
      activeElement = this.document.activeElement;
      if (activeElement === this.document.body) {
        activeElement = this.workspace.getElement();
      }
      return this.commands.dispatch(activeElement, command, arg);
    };

    AtomEnvironment.prototype.dispatchContextMenuCommand = function() {
      var args, command;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return this.commands.dispatch(this.contextMenu.activeElement, command, args);
    };

    AtomEnvironment.prototype.openLocations = function(locations) {
      var fileLocationsToOpen, foldersToAddToProject, forceAddToWindow, i, initialColumn, initialLine, j, len, len1, needsProjectPaths, pathToOpen, promise, promises, pushFolderToOpen, ref2, ref3, ref4, ref5;
      needsProjectPaths = ((ref2 = this.project) != null ? ref2.getPaths().length : void 0) === 0;
      foldersToAddToProject = [];
      fileLocationsToOpen = [];
      pushFolderToOpen = function(folder) {
        if (indexOf.call(foldersToAddToProject, folder) < 0) {
          return foldersToAddToProject.push(folder);
        }
      };
      for (i = 0, len = locations.length; i < len; i++) {
        ref3 = locations[i], pathToOpen = ref3.pathToOpen, initialLine = ref3.initialLine, initialColumn = ref3.initialColumn, forceAddToWindow = ref3.forceAddToWindow;
        if ((pathToOpen != null) && (needsProjectPaths || forceAddToWindow)) {
          if (fs.existsSync(pathToOpen)) {
            pushFolderToOpen(this.project.getDirectoryForProjectPath(pathToOpen).getPath());
          } else if (fs.existsSync(path.dirname(pathToOpen))) {
            pushFolderToOpen(this.project.getDirectoryForProjectPath(path.dirname(pathToOpen)).getPath());
          } else {
            pushFolderToOpen(this.project.getDirectoryForProjectPath(pathToOpen).getPath());
          }
        }
        if (!fs.isDirectorySync(pathToOpen)) {
          fileLocationsToOpen.push({
            pathToOpen: pathToOpen,
            initialLine: initialLine,
            initialColumn: initialColumn
          });
        }
      }
      promise = Promise.resolve(null);
      if (foldersToAddToProject.length > 0) {
        promise = this.loadState(this.getStateKey(foldersToAddToProject)).then((function(_this) {
          return function(state) {
            var files, folder, j, k, len1, len2, location, promises, ref4, ref5;
            if (state && needsProjectPaths) {
              files = (function() {
                var j, len1, results;
                results = [];
                for (j = 0, len1 = fileLocationsToOpen.length; j < len1; j++) {
                  location = fileLocationsToOpen[j];
                  results.push(location.pathToOpen);
                }
                return results;
              })();
              return _this.attemptRestoreProjectStateForPaths(state, foldersToAddToProject, files);
            } else {
              promises = [];
              for (j = 0, len1 = foldersToAddToProject.length; j < len1; j++) {
                folder = foldersToAddToProject[j];
                _this.project.addPath(folder);
              }
              for (k = 0, len2 = fileLocationsToOpen.length; k < len2; k++) {
                ref4 = fileLocationsToOpen[k], pathToOpen = ref4.pathToOpen, initialLine = ref4.initialLine, initialColumn = ref4.initialColumn;
                promises.push((ref5 = _this.workspace) != null ? ref5.open(pathToOpen, {
                  initialLine: initialLine,
                  initialColumn: initialColumn
                }) : void 0);
              }
              return Promise.all(promises);
            }
          };
        })(this));
      } else {
        promises = [];
        for (j = 0, len1 = fileLocationsToOpen.length; j < len1; j++) {
          ref4 = fileLocationsToOpen[j], pathToOpen = ref4.pathToOpen, initialLine = ref4.initialLine, initialColumn = ref4.initialColumn;
          promises.push((ref5 = this.workspace) != null ? ref5.open(pathToOpen, {
            initialLine: initialLine,
            initialColumn: initialColumn
          }) : void 0);
        }
        promise = Promise.all(promises);
      }
      return promise.then(function() {
        return ipcRenderer.send('window-command', 'window:locations-opened');
      });
    };

    AtomEnvironment.prototype.resolveProxy = function(url) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var disposable, requestId;
          requestId = _this.nextProxyRequestId++;
          disposable = _this.applicationDelegate.onDidResolveProxy(function(id, proxy) {
            if (id === requestId) {
              disposable.dispose();
              return resolve(proxy);
            }
          });
          return _this.applicationDelegate.resolveProxy(requestId, url);
        };
      })(this));
    };

    return AtomEnvironment;

  })(Model);

  Promise.prototype.done = function(callback) {
    deprecate("Atom now uses ES6 Promises instead of Q. Call promise.then instead of promise.done");
    return this.then(callback);
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2F0b20tZW52aXJvbm1lbnQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSw4cUJBQUE7SUFBQTs7Ozs7RUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBQ1QsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNOLGNBQWUsT0FBQSxDQUFRLFVBQVI7O0VBRWhCLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0gsWUFBYSxPQUFBLENBQVEsTUFBUjs7RUFDZCxNQUE2QyxPQUFBLENBQVEsV0FBUixDQUE3QyxFQUFDLDZDQUFELEVBQXNCLDJCQUF0QixFQUFrQzs7RUFDbEMsRUFBQSxHQUFLLE9BQUEsQ0FBUSxTQUFSOztFQUNKLG9CQUFxQixPQUFBLENBQVEsMEJBQVI7O0VBQ3RCLEtBQUEsR0FBUSxPQUFBLENBQVEsU0FBUjs7RUFDUixrQkFBQSxHQUFxQixPQUFBLENBQVEsd0JBQVI7O0VBQ3JCLFVBQUEsR0FBYSxPQUFBLENBQVEsZUFBUjs7RUFDYixhQUFBLEdBQWdCLE9BQUEsQ0FBUSxrQkFBUjs7RUFDaEIsdUJBQUEsR0FBMEIsT0FBQSxDQUFRLDZCQUFSOztFQUN6QixtQkFBb0IsT0FBQSxDQUFRLHNCQUFSOztFQUNyQixZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSOztFQUVmLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx3QkFBUjs7RUFDdEIsWUFBQSxHQUFlLE9BQUEsQ0FBUSxpQkFBUjs7RUFDZixtQkFBQSxHQUFzQixPQUFBLENBQVEsd0JBQVI7O0VBQ3RCLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUjs7RUFDVCxhQUFBLEdBQWdCLE9BQUEsQ0FBUSxxQkFBUjs7RUFDaEIsY0FBQSxHQUFpQixPQUFBLENBQVEsbUJBQVI7O0VBQ2pCLGVBQUEsR0FBa0IsT0FBQSxDQUFRLG9CQUFSOztF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QUFZLEtBQUMsQ0FBQSxrQkFBRDtVQUNaLFVBQUEsR0FBYSxLQUFDLENBQUEsbUJBQW1CLENBQUMsaUJBQXJCLENBQXVDLFNBQUMsRUFBRCxFQUFLLEtBQUw7WUFDbEQsSUFBRyxFQUFBLEtBQU0sU0FBVDtjQUNFLFVBQVUsQ0FBQyxPQUFYLENBQUE7cUJBQ0EsT0FBQSxDQUFRLEtBQVIsRUFGRjs7VUFEa0QsQ0FBdkM7aUJBS2IsS0FBQyxDQUFBLG1CQUFtQixDQUFDLFlBQXJCLENBQWtDLFNBQWxDLEVBQTZDLEdBQTdDO1FBUGlCO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFSO0lBREM7Ozs7S0FyaUNjOztFQWdqQzlCLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBbEIsR0FBeUIsU0FBQyxRQUFEO0lBQ3ZCLFNBQUEsQ0FBVSxvRkFBVjtXQUNBLElBQUMsQ0FBQSxJQUFELENBQU0sUUFBTjtFQUZ1QjtBQXJtQ3pCIiwic291cmNlc0NvbnRlbnQiOlsiY3J5cHRvID0gcmVxdWlyZSAnY3J5cHRvJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG57aXBjUmVuZGVyZXJ9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG57ZGVwcmVjYXRlfSA9IHJlcXVpcmUgJ2dyaW0nXG57Q29tcG9zaXRlRGlzcG9zYWJsZSwgRGlzcG9zYWJsZSwgRW1pdHRlcn0gPSByZXF1aXJlICdldmVudC1raXQnXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG57bWFwU291cmNlUG9zaXRpb259ID0gcmVxdWlyZSAnQGF0b20vc291cmNlLW1hcC1zdXBwb3J0J1xuTW9kZWwgPSByZXF1aXJlICcuL21vZGVsJ1xuV2luZG93RXZlbnRIYW5kbGVyID0gcmVxdWlyZSAnLi93aW5kb3ctZXZlbnQtaGFuZGxlcidcblN0YXRlU3RvcmUgPSByZXF1aXJlICcuL3N0YXRlLXN0b3JlJ1xuU3RvcmFnZUZvbGRlciA9IHJlcXVpcmUgJy4vc3RvcmFnZS1mb2xkZXInXG5yZWdpc3RlckRlZmF1bHRDb21tYW5kcyA9IHJlcXVpcmUgJy4vcmVnaXN0ZXItZGVmYXVsdC1jb21tYW5kcydcbnt1cGRhdGVQcm9jZXNzRW52fSA9IHJlcXVpcmUgJy4vdXBkYXRlLXByb2Nlc3MtZW52J1xuQ29uZmlnU2NoZW1hID0gcmVxdWlyZSAnLi9jb25maWctc2NoZW1hJ1xuXG5EZXNlcmlhbGl6ZXJNYW5hZ2VyID0gcmVxdWlyZSAnLi9kZXNlcmlhbGl6ZXItbWFuYWdlcidcblZpZXdSZWdpc3RyeSA9IHJlcXVpcmUgJy4vdmlldy1yZWdpc3RyeSdcbk5vdGlmaWNhdGlvbk1hbmFnZXIgPSByZXF1aXJlICcuL25vdGlmaWNhdGlvbi1tYW5hZ2VyJ1xuQ29uZmlnID0gcmVxdWlyZSAnLi9jb25maWcnXG5LZXltYXBNYW5hZ2VyID0gcmVxdWlyZSAnLi9rZXltYXAtZXh0ZW5zaW9ucydcblRvb2x0aXBNYW5hZ2VyID0gcmVxdWlyZSAnLi90b29sdGlwLW1hbmFnZXInXG5Db21tYW5kUmVnaXN0cnkgPSByZXF1aXJlICcuL2NvbW1hbmQtcmVnaXN0cnknXG5HcmFtbWFyUmVnaXN0cnkgPSByZXF1aXJlICcuL2dyYW1tYXItcmVnaXN0cnknXG57SGlzdG9yeU1hbmFnZXIsIEhpc3RvcnlQcm9qZWN0fSA9IHJlcXVpcmUgJy4vaGlzdG9yeS1tYW5hZ2VyJ1xuUmVvcGVuUHJvamVjdE1lbnVNYW5hZ2VyID0gcmVxdWlyZSAnLi9yZW9wZW4tcHJvamVjdC1tZW51LW1hbmFnZXInXG5TdHlsZU1hbmFnZXIgPSByZXF1aXJlICcuL3N0eWxlLW1hbmFnZXInXG5QYWNrYWdlTWFuYWdlciA9IHJlcXVpcmUgJy4vcGFja2FnZS1tYW5hZ2VyJ1xuVGhlbWVNYW5hZ2VyID0gcmVxdWlyZSAnLi90aGVtZS1tYW5hZ2VyJ1xuTWVudU1hbmFnZXIgPSByZXF1aXJlICcuL21lbnUtbWFuYWdlcidcbkNvbnRleHRNZW51TWFuYWdlciA9IHJlcXVpcmUgJy4vY29udGV4dC1tZW51LW1hbmFnZXInXG5Db21tYW5kSW5zdGFsbGVyID0gcmVxdWlyZSAnLi9jb21tYW5kLWluc3RhbGxlcidcblByb2plY3QgPSByZXF1aXJlICcuL3Byb2plY3QnXG5UaXRsZUJhciA9IHJlcXVpcmUgJy4vdGl0bGUtYmFyJ1xuV29ya3NwYWNlID0gcmVxdWlyZSAnLi93b3Jrc3BhY2UnXG5QYW5lbENvbnRhaW5lciA9IHJlcXVpcmUgJy4vcGFuZWwtY29udGFpbmVyJ1xuUGFuZWwgPSByZXF1aXJlICcuL3BhbmVsJ1xuUGFuZUNvbnRhaW5lciA9IHJlcXVpcmUgJy4vcGFuZS1jb250YWluZXInXG5QYW5lQXhpcyA9IHJlcXVpcmUgJy4vcGFuZS1heGlzJ1xuUGFuZSA9IHJlcXVpcmUgJy4vcGFuZSdcbkRvY2sgPSByZXF1aXJlICcuL2RvY2snXG5Qcm9qZWN0ID0gcmVxdWlyZSAnLi9wcm9qZWN0J1xuVGV4dEVkaXRvciA9IHJlcXVpcmUgJy4vdGV4dC1lZGl0b3InXG5UZXh0QnVmZmVyID0gcmVxdWlyZSAndGV4dC1idWZmZXInXG5HdXR0ZXIgPSByZXF1aXJlICcuL2d1dHRlcidcblRleHRFZGl0b3JSZWdpc3RyeSA9IHJlcXVpcmUgJy4vdGV4dC1lZGl0b3ItcmVnaXN0cnknXG5BdXRvVXBkYXRlTWFuYWdlciA9IHJlcXVpcmUgJy4vYXV0by11cGRhdGUtbWFuYWdlcidcblxuIyBFc3NlbnRpYWw6IEF0b20gZ2xvYmFsIGZvciBkZWFsaW5nIHdpdGggcGFja2FnZXMsIHRoZW1lcywgbWVudXMsIGFuZCB0aGUgd2luZG93LlxuI1xuIyBBbiBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzIGlzIGFsd2F5cyBhdmFpbGFibGUgYXMgdGhlIGBhdG9tYCBnbG9iYWwuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBBdG9tRW52aXJvbm1lbnQgZXh0ZW5kcyBNb2RlbFxuICBAdmVyc2lvbjogMSAgIyBJbmNyZW1lbnQgdGhpcyB3aGVuIHRoZSBzZXJpYWxpemF0aW9uIGZvcm1hdCBjaGFuZ2VzXG5cbiAgbGFzdFVuY2F1Z2h0RXJyb3I6IG51bGxcblxuICAjIyNcbiAgU2VjdGlvbjogUHJvcGVydGllc1xuICAjIyNcblxuICAjIFB1YmxpYzogQSB7Q29tbWFuZFJlZ2lzdHJ5fSBpbnN0YW5jZVxuICBjb21tYW5kczogbnVsbFxuXG4gICMgUHVibGljOiBBIHtDb25maWd9IGluc3RhbmNlXG4gIGNvbmZpZzogbnVsbFxuXG4gICMgUHVibGljOiBBIHtDbGlwYm9hcmR9IGluc3RhbmNlXG4gIGNsaXBib2FyZDogbnVsbFxuXG4gICMgUHVibGljOiBBIHtDb250ZXh0TWVudU1hbmFnZXJ9IGluc3RhbmNlXG4gIGNvbnRleHRNZW51OiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge01lbnVNYW5hZ2VyfSBpbnN0YW5jZVxuICBtZW51OiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge0tleW1hcE1hbmFnZXJ9IGluc3RhbmNlXG4gIGtleW1hcHM6IG51bGxcblxuICAjIFB1YmxpYzogQSB7VG9vbHRpcE1hbmFnZXJ9IGluc3RhbmNlXG4gIHRvb2x0aXBzOiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge05vdGlmaWNhdGlvbk1hbmFnZXJ9IGluc3RhbmNlXG4gIG5vdGlmaWNhdGlvbnM6IG51bGxcblxuICAjIFB1YmxpYzogQSB7UHJvamVjdH0gaW5zdGFuY2VcbiAgcHJvamVjdDogbnVsbFxuXG4gICMgUHVibGljOiBBIHtHcmFtbWFyUmVnaXN0cnl9IGluc3RhbmNlXG4gIGdyYW1tYXJzOiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge0hpc3RvcnlNYW5hZ2VyfSBpbnN0YW5jZVxuICBoaXN0b3J5OiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge1BhY2thZ2VNYW5hZ2VyfSBpbnN0YW5jZVxuICBwYWNrYWdlczogbnVsbFxuXG4gICMgUHVibGljOiBBIHtUaGVtZU1hbmFnZXJ9IGluc3RhbmNlXG4gIHRoZW1lczogbnVsbFxuXG4gICMgUHVibGljOiBBIHtTdHlsZU1hbmFnZXJ9IGluc3RhbmNlXG4gIHN0eWxlczogbnVsbFxuXG4gICMgUHVibGljOiBBIHtEZXNlcmlhbGl6ZXJNYW5hZ2VyfSBpbnN0YW5jZVxuICBkZXNlcmlhbGl6ZXJzOiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge1ZpZXdSZWdpc3RyeX0gaW5zdGFuY2VcbiAgdmlld3M6IG51bGxcblxuICAjIFB1YmxpYzogQSB7V29ya3NwYWNlfSBpbnN0YW5jZVxuICB3b3Jrc3BhY2U6IG51bGxcblxuICAjIFB1YmxpYzogQSB7VGV4dEVkaXRvclJlZ2lzdHJ5fSBpbnN0YW5jZVxuICB0ZXh0RWRpdG9yczogbnVsbFxuXG4gICMgUHJpdmF0ZTogQW4ge0F1dG9VcGRhdGVNYW5hZ2VyfSBpbnN0YW5jZVxuICBhdXRvVXBkYXRlcjogbnVsbFxuXG4gIHNhdmVTdGF0ZURlYm91bmNlSW50ZXJ2YWw6IDEwMDBcblxuICAjIyNcbiAgU2VjdGlvbjogQ29uc3RydWN0aW9uIGFuZCBEZXN0cnVjdGlvblxuICAjIyNcblxuICAjIENhbGwgLmxvYWRPckNyZWF0ZSBpbnN0ZWFkXG4gIGNvbnN0cnVjdG9yOiAocGFyYW1zPXt9KSAtPlxuICAgIHtAYXBwbGljYXRpb25EZWxlZ2F0ZSwgQGNsaXBib2FyZCwgQGVuYWJsZVBlcnNpc3RlbmNlLCBvbmx5TG9hZEJhc2VTdHlsZVNoZWV0cywgQHVwZGF0ZVByb2Nlc3NFbnZ9ID0gcGFyYW1zXG5cbiAgICBAbmV4dFByb3h5UmVxdWVzdElkID0gMFxuICAgIEB1bmxvYWRlZCA9IGZhbHNlXG4gICAgQGxvYWRUaW1lID0gbnVsbFxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAZGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIEBkZXNlcmlhbGl6ZXJzID0gbmV3IERlc2VyaWFsaXplck1hbmFnZXIodGhpcylcbiAgICBAZGVzZXJpYWxpemVUaW1pbmdzID0ge31cbiAgICBAdmlld3MgPSBuZXcgVmlld1JlZ2lzdHJ5KHRoaXMpXG4gICAgVGV4dEVkaXRvci5zZXRTY2hlZHVsZXIoQHZpZXdzKVxuICAgIEBub3RpZmljYXRpb25zID0gbmV3IE5vdGlmaWNhdGlvbk1hbmFnZXJcbiAgICBAdXBkYXRlUHJvY2Vzc0VudiA/PSB1cGRhdGVQcm9jZXNzRW52ICMgRm9yIHRlc3RpbmdcblxuICAgIEBzdGF0ZVN0b3JlID0gbmV3IFN0YXRlU3RvcmUoJ0F0b21FbnZpcm9ubWVudHMnLCAxKVxuXG4gICAgQGNvbmZpZyA9IG5ldyBDb25maWcoe25vdGlmaWNhdGlvbk1hbmFnZXI6IEBub3RpZmljYXRpb25zLCBAZW5hYmxlUGVyc2lzdGVuY2V9KVxuICAgIEBjb25maWcuc2V0U2NoZW1hIG51bGwsIHt0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczogXy5jbG9uZShDb25maWdTY2hlbWEpfVxuXG4gICAgQGtleW1hcHMgPSBuZXcgS2V5bWFwTWFuYWdlcih7bm90aWZpY2F0aW9uTWFuYWdlcjogQG5vdGlmaWNhdGlvbnN9KVxuICAgIEB0b29sdGlwcyA9IG5ldyBUb29sdGlwTWFuYWdlcihrZXltYXBNYW5hZ2VyOiBAa2V5bWFwcywgdmlld1JlZ2lzdHJ5OiBAdmlld3MpXG4gICAgQGNvbW1hbmRzID0gbmV3IENvbW1hbmRSZWdpc3RyeVxuICAgIEBncmFtbWFycyA9IG5ldyBHcmFtbWFyUmVnaXN0cnkoe0Bjb25maWd9KVxuICAgIEBzdHlsZXMgPSBuZXcgU3R5bGVNYW5hZ2VyKClcbiAgICBAcGFja2FnZXMgPSBuZXcgUGFja2FnZU1hbmFnZXIoe1xuICAgICAgQGNvbmZpZywgc3R5bGVNYW5hZ2VyOiBAc3R5bGVzLFxuICAgICAgY29tbWFuZFJlZ2lzdHJ5OiBAY29tbWFuZHMsIGtleW1hcE1hbmFnZXI6IEBrZXltYXBzLCBub3RpZmljYXRpb25NYW5hZ2VyOiBAbm90aWZpY2F0aW9ucyxcbiAgICAgIGdyYW1tYXJSZWdpc3RyeTogQGdyYW1tYXJzLCBkZXNlcmlhbGl6ZXJNYW5hZ2VyOiBAZGVzZXJpYWxpemVycywgdmlld1JlZ2lzdHJ5OiBAdmlld3NcbiAgICB9KVxuICAgIEB0aGVtZXMgPSBuZXcgVGhlbWVNYW5hZ2VyKHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBAcGFja2FnZXMsIEBjb25maWcsIHN0eWxlTWFuYWdlcjogQHN0eWxlcyxcbiAgICAgIG5vdGlmaWNhdGlvbk1hbmFnZXI6IEBub3RpZmljYXRpb25zLCB2aWV3UmVnaXN0cnk6IEB2aWV3c1xuICAgIH0pXG4gICAgQG1lbnUgPSBuZXcgTWVudU1hbmFnZXIoe2tleW1hcE1hbmFnZXI6IEBrZXltYXBzLCBwYWNrYWdlTWFuYWdlcjogQHBhY2thZ2VzfSlcbiAgICBAY29udGV4dE1lbnUgPSBuZXcgQ29udGV4dE1lbnVNYW5hZ2VyKHtrZXltYXBNYW5hZ2VyOiBAa2V5bWFwc30pXG4gICAgQHBhY2thZ2VzLnNldE1lbnVNYW5hZ2VyKEBtZW51KVxuICAgIEBwYWNrYWdlcy5zZXRDb250ZXh0TWVudU1hbmFnZXIoQGNvbnRleHRNZW51KVxuICAgIEBwYWNrYWdlcy5zZXRUaGVtZU1hbmFnZXIoQHRoZW1lcylcblxuICAgIEBwcm9qZWN0ID0gbmV3IFByb2plY3Qoe25vdGlmaWNhdGlvbk1hbmFnZXI6IEBub3RpZmljYXRpb25zLCBwYWNrYWdlTWFuYWdlcjogQHBhY2thZ2VzLCBAY29uZmlnLCBAYXBwbGljYXRpb25EZWxlZ2F0ZX0pXG4gICAgQGNvbW1hbmRJbnN0YWxsZXIgPSBuZXcgQ29tbWFuZEluc3RhbGxlcihAYXBwbGljYXRpb25EZWxlZ2F0ZSlcblxuICAgIEB0ZXh0RWRpdG9ycyA9IG5ldyBUZXh0RWRpdG9yUmVnaXN0cnkoe1xuICAgICAgQGNvbmZpZywgZ3JhbW1hclJlZ2lzdHJ5OiBAZ3JhbW1hcnMsIGFzc2VydDogQGFzc2VydC5iaW5kKHRoaXMpLFxuICAgICAgcGFja2FnZU1hbmFnZXI6IEBwYWNrYWdlc1xuICAgIH0pXG5cbiAgICBAd29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZSh7XG4gICAgICBAY29uZmlnLCBAcHJvamVjdCwgcGFja2FnZU1hbmFnZXI6IEBwYWNrYWdlcywgZ3JhbW1hclJlZ2lzdHJ5OiBAZ3JhbW1hcnMsIGRlc2VyaWFsaXplck1hbmFnZXI6IEBkZXNlcmlhbGl6ZXJzLFxuICAgICAgbm90aWZpY2F0aW9uTWFuYWdlcjogQG5vdGlmaWNhdGlvbnMsIEBhcHBsaWNhdGlvbkRlbGVnYXRlLCB2aWV3UmVnaXN0cnk6IEB2aWV3cywgYXNzZXJ0OiBAYXNzZXJ0LmJpbmQodGhpcyksXG4gICAgICB0ZXh0RWRpdG9yUmVnaXN0cnk6IEB0ZXh0RWRpdG9ycywgc3R5bGVNYW5hZ2VyOiBAc3R5bGVzLCBAZW5hYmxlUGVyc2lzdGVuY2VcbiAgICB9KVxuXG4gICAgQHRoZW1lcy53b3Jrc3BhY2UgPSBAd29ya3NwYWNlXG5cbiAgICBAYXV0b1VwZGF0ZXIgPSBuZXcgQXV0b1VwZGF0ZU1hbmFnZXIoe0BhcHBsaWNhdGlvbkRlbGVnYXRlfSlcblxuICAgIGlmIEBrZXltYXBzLmNhbkxvYWRCdW5kbGVkS2V5bWFwc0Zyb21NZW1vcnkoKVxuICAgICAgQGtleW1hcHMubG9hZEJ1bmRsZWRLZXltYXBzKClcblxuICAgIEByZWdpc3RlckRlZmF1bHRDb21tYW5kcygpXG4gICAgQHJlZ2lzdGVyRGVmYXVsdE9wZW5lcnMoKVxuICAgIEByZWdpc3RlckRlZmF1bHREZXNlcmlhbGl6ZXJzKClcblxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXIgPSBuZXcgV2luZG93RXZlbnRIYW5kbGVyKHthdG9tRW52aXJvbm1lbnQ6IHRoaXMsIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSlcblxuICAgIEBoaXN0b3J5ID0gbmV3IEhpc3RvcnlNYW5hZ2VyKHtAcHJvamVjdCwgQGNvbW1hbmRzLCBAc3RhdGVTdG9yZX0pXG4gICAgIyBLZWVwIGluc3RhbmNlcyBvZiBIaXN0b3J5TWFuYWdlciBpbiBzeW5jXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAaGlzdG9yeS5vbkRpZENoYW5nZVByb2plY3RzIChlKSA9PlxuICAgICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuZGlkQ2hhbmdlSGlzdG9yeU1hbmFnZXIoKSB1bmxlc3MgZS5yZWxvYWRlZFxuXG4gIGluaXRpYWxpemU6IChwYXJhbXM9e30pIC0+XG4gICAgIyBUaGlzIHdpbGwgZm9yY2UgVGV4dEVkaXRvckVsZW1lbnQgdG8gcmVnaXN0ZXIgdGhlIGN1c3RvbSBlbGVtZW50LCBzbyB0aGF0XG4gICAgIyB1c2luZyBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXRvbS10ZXh0LWVkaXRvcicpYCB3b3JrcyBpZiBpdCdzIGNhbGxlZFxuICAgICMgYmVmb3JlIG9wZW5pbmcgYSBidWZmZXIuXG4gICAgcmVxdWlyZSAnLi90ZXh0LWVkaXRvci1lbGVtZW50J1xuXG4gICAge0B3aW5kb3csIEBkb2N1bWVudCwgQGJsb2JTdG9yZSwgQGNvbmZpZ0RpclBhdGgsIG9ubHlMb2FkQmFzZVN0eWxlU2hlZXRzfSA9IHBhcmFtc1xuICAgIHtkZXZNb2RlLCBzYWZlTW9kZSwgcmVzb3VyY2VQYXRoLCBjbGVhcldpbmRvd1N0YXRlfSA9IEBnZXRMb2FkU2V0dGluZ3MoKVxuXG4gICAgaWYgY2xlYXJXaW5kb3dTdGF0ZVxuICAgICAgQGdldFN0b3JhZ2VGb2xkZXIoKS5jbGVhcigpXG4gICAgICBAc3RhdGVTdG9yZS5jbGVhcigpXG5cbiAgICBDb25maWdTY2hlbWEucHJvamVjdEhvbWUgPSB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6IHBhdGguam9pbihmcy5nZXRIb21lRGlyZWN0b3J5KCksICdnaXRodWInKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGRpcmVjdG9yeSB3aGVyZSBwcm9qZWN0cyBhcmUgYXNzdW1lZCB0byBiZSBsb2NhdGVkLiBQYWNrYWdlcyBjcmVhdGVkIHVzaW5nIHRoZSBQYWNrYWdlIEdlbmVyYXRvciB3aWxsIGJlIHN0b3JlZCBoZXJlIGJ5IGRlZmF1bHQuJ1xuICAgIH1cbiAgICBAY29uZmlnLmluaXRpYWxpemUoe0Bjb25maWdEaXJQYXRoLCByZXNvdXJjZVBhdGgsIHByb2plY3RIb21lU2NoZW1hOiBDb25maWdTY2hlbWEucHJvamVjdEhvbWV9KVxuXG4gICAgQG1lbnUuaW5pdGlhbGl6ZSh7cmVzb3VyY2VQYXRofSlcbiAgICBAY29udGV4dE1lbnUuaW5pdGlhbGl6ZSh7cmVzb3VyY2VQYXRoLCBkZXZNb2RlfSlcblxuICAgIEBrZXltYXBzLmNvbmZpZ0RpclBhdGggPSBAY29uZmlnRGlyUGF0aFxuICAgIEBrZXltYXBzLnJlc291cmNlUGF0aCA9IHJlc291cmNlUGF0aFxuICAgIEBrZXltYXBzLmRldk1vZGUgPSBkZXZNb2RlXG4gICAgdW5sZXNzIEBrZXltYXBzLmNhbkxvYWRCdW5kbGVkS2V5bWFwc0Zyb21NZW1vcnkoKVxuICAgICAgQGtleW1hcHMubG9hZEJ1bmRsZWRLZXltYXBzKClcblxuICAgIEBjb21tYW5kcy5hdHRhY2goQHdpbmRvdylcblxuICAgIEBzdHlsZXMuaW5pdGlhbGl6ZSh7QGNvbmZpZ0RpclBhdGh9KVxuICAgIEBwYWNrYWdlcy5pbml0aWFsaXplKHtkZXZNb2RlLCBAY29uZmlnRGlyUGF0aCwgcmVzb3VyY2VQYXRoLCBzYWZlTW9kZX0pXG4gICAgQHRoZW1lcy5pbml0aWFsaXplKHtAY29uZmlnRGlyUGF0aCwgcmVzb3VyY2VQYXRoLCBzYWZlTW9kZSwgZGV2TW9kZX0pXG5cbiAgICBAY29tbWFuZEluc3RhbGxlci5pbml0aWFsaXplKEBnZXRWZXJzaW9uKCkpXG4gICAgQGF1dG9VcGRhdGVyLmluaXRpYWxpemUoKVxuXG4gICAgQGNvbmZpZy5sb2FkKClcblxuICAgIEB0aGVtZXMubG9hZEJhc2VTdHlsZXNoZWV0cygpXG4gICAgQGluaXRpYWxTdHlsZUVsZW1lbnRzID0gQHN0eWxlcy5nZXRTbmFwc2hvdCgpXG4gICAgQHRoZW1lcy5pbml0aWFsTG9hZENvbXBsZXRlID0gdHJ1ZSBpZiBvbmx5TG9hZEJhc2VTdHlsZVNoZWV0c1xuICAgIEBzZXRCb2R5UGxhdGZvcm1DbGFzcygpXG5cbiAgICBAc3R5bGVzRWxlbWVudCA9IEBzdHlsZXMuYnVpbGRTdHlsZXNFbGVtZW50KClcbiAgICBAZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChAc3R5bGVzRWxlbWVudClcblxuICAgIEBrZXltYXBzLnN1YnNjcmliZVRvRmlsZVJlYWRGYWlsdXJlKClcblxuICAgIEBpbnN0YWxsVW5jYXVnaHRFcnJvckhhbmRsZXIoKVxuICAgIEBhdHRhY2hTYXZlU3RhdGVMaXN0ZW5lcnMoKVxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXIuaW5pdGlhbGl6ZShAd2luZG93LCBAZG9jdW1lbnQpXG5cbiAgICBkaWRDaGFuZ2VTdHlsZXMgPSBAZGlkQ2hhbmdlU3R5bGVzLmJpbmQodGhpcylcbiAgICBAZGlzcG9zYWJsZXMuYWRkKEBzdHlsZXMub25EaWRBZGRTdHlsZUVsZW1lbnQoZGlkQ2hhbmdlU3R5bGVzKSlcbiAgICBAZGlzcG9zYWJsZXMuYWRkKEBzdHlsZXMub25EaWRVcGRhdGVTdHlsZUVsZW1lbnQoZGlkQ2hhbmdlU3R5bGVzKSlcbiAgICBAZGlzcG9zYWJsZXMuYWRkKEBzdHlsZXMub25EaWRSZW1vdmVTdHlsZUVsZW1lbnQoZGlkQ2hhbmdlU3R5bGVzKSlcblxuICAgIEBvYnNlcnZlQXV0b0hpZGVNZW51QmFyKClcblxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRDaGFuZ2VIaXN0b3J5TWFuYWdlcig9PiBAaGlzdG9yeS5sb2FkU3RhdGUoKSlcblxuICBwcmVsb2FkUGFja2FnZXM6IC0+XG4gICAgQHBhY2thZ2VzLnByZWxvYWRQYWNrYWdlcygpXG5cbiAgYXR0YWNoU2F2ZVN0YXRlTGlzdGVuZXJzOiAtPlxuICAgIHNhdmVTdGF0ZSA9IF8uZGVib3VuY2UoKD0+XG4gICAgICBAd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2sgPT4gQHNhdmVTdGF0ZSh7aXNVbmxvYWRpbmc6IGZhbHNlfSkgdW5sZXNzIEB1bmxvYWRlZFxuICAgICksIEBzYXZlU3RhdGVEZWJvdW5jZUludGVydmFsKVxuICAgIEBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBzYXZlU3RhdGUsIHRydWUpXG4gICAgQGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBzYXZlU3RhdGUsIHRydWUpXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBuZXcgRGlzcG9zYWJsZSA9PlxuICAgICAgQGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHNhdmVTdGF0ZSwgdHJ1ZSlcbiAgICAgIEBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgc2F2ZVN0YXRlLCB0cnVlKVxuXG4gIHJlZ2lzdGVyRGVmYXVsdERlc2VyaWFsaXplcnM6IC0+XG4gICAgQGRlc2VyaWFsaXplcnMuYWRkKFdvcmtzcGFjZSlcbiAgICBAZGVzZXJpYWxpemVycy5hZGQoUGFuZUNvbnRhaW5lcilcbiAgICBAZGVzZXJpYWxpemVycy5hZGQoUGFuZUF4aXMpXG4gICAgQGRlc2VyaWFsaXplcnMuYWRkKFBhbmUpXG4gICAgQGRlc2VyaWFsaXplcnMuYWRkKERvY2spXG4gICAgQGRlc2VyaWFsaXplcnMuYWRkKFByb2plY3QpXG4gICAgQGRlc2VyaWFsaXplcnMuYWRkKFRleHRFZGl0b3IpXG4gICAgQGRlc2VyaWFsaXplcnMuYWRkKFRleHRCdWZmZXIpXG5cbiAgcmVnaXN0ZXJEZWZhdWx0Q29tbWFuZHM6IC0+XG4gICAgcmVnaXN0ZXJEZWZhdWx0Q29tbWFuZHMoe2NvbW1hbmRSZWdpc3RyeTogQGNvbW1hbmRzLCBAY29uZmlnLCBAY29tbWFuZEluc3RhbGxlciwgbm90aWZpY2F0aW9uTWFuYWdlcjogQG5vdGlmaWNhdGlvbnMsIEBwcm9qZWN0LCBAY2xpcGJvYXJkfSlcblxuICByZWdpc3RlckRlZmF1bHRPcGVuZXJzOiAtPlxuICAgIEB3b3Jrc3BhY2UuYWRkT3BlbmVyICh1cmkpID0+XG4gICAgICBzd2l0Y2ggdXJpXG4gICAgICAgIHdoZW4gJ2F0b206Ly8uYXRvbS9zdHlsZXNoZWV0J1xuICAgICAgICAgIEB3b3Jrc3BhY2Uub3BlblRleHRGaWxlKEBzdHlsZXMuZ2V0VXNlclN0eWxlU2hlZXRQYXRoKCkpXG4gICAgICAgIHdoZW4gJ2F0b206Ly8uYXRvbS9rZXltYXAnXG4gICAgICAgICAgQHdvcmtzcGFjZS5vcGVuVGV4dEZpbGUoQGtleW1hcHMuZ2V0VXNlcktleW1hcFBhdGgoKSlcbiAgICAgICAgd2hlbiAnYXRvbTovLy5hdG9tL2NvbmZpZydcbiAgICAgICAgICBAd29ya3NwYWNlLm9wZW5UZXh0RmlsZShAY29uZmlnLmdldFVzZXJDb25maWdQYXRoKCkpXG4gICAgICAgIHdoZW4gJ2F0b206Ly8uYXRvbS9pbml0LXNjcmlwdCdcbiAgICAgICAgICBAd29ya3NwYWNlLm9wZW5UZXh0RmlsZShAZ2V0VXNlckluaXRTY3JpcHRQYXRoKCkpXG5cbiAgcmVnaXN0ZXJEZWZhdWx0VGFyZ2V0Rm9yS2V5bWFwczogLT5cbiAgICBAa2V5bWFwcy5kZWZhdWx0VGFyZ2V0ID0gQHdvcmtzcGFjZS5nZXRFbGVtZW50KClcblxuICBvYnNlcnZlQXV0b0hpZGVNZW51QmFyOiAtPlxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGNvbmZpZy5vbkRpZENoYW5nZSAnY29yZS5hdXRvSGlkZU1lbnVCYXInLCAoe25ld1ZhbHVlfSkgPT5cbiAgICAgIEBzZXRBdXRvSGlkZU1lbnVCYXIobmV3VmFsdWUpXG4gICAgQHNldEF1dG9IaWRlTWVudUJhcih0cnVlKSBpZiBAY29uZmlnLmdldCgnY29yZS5hdXRvSGlkZU1lbnVCYXInKVxuXG4gIHJlc2V0OiAtPlxuICAgIEBkZXNlcmlhbGl6ZXJzLmNsZWFyKClcbiAgICBAcmVnaXN0ZXJEZWZhdWx0RGVzZXJpYWxpemVycygpXG5cbiAgICBAY29uZmlnLmNsZWFyKClcbiAgICBAY29uZmlnLnNldFNjaGVtYSBudWxsLCB7dHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IF8uY2xvbmUoQ29uZmlnU2NoZW1hKX1cblxuICAgIEBrZXltYXBzLmNsZWFyKClcbiAgICBAa2V5bWFwcy5sb2FkQnVuZGxlZEtleW1hcHMoKVxuXG4gICAgQGNvbW1hbmRzLmNsZWFyKClcbiAgICBAcmVnaXN0ZXJEZWZhdWx0Q29tbWFuZHMoKVxuXG4gICAgQHN0eWxlcy5yZXN0b3JlU25hcHNob3QoQGluaXRpYWxTdHlsZUVsZW1lbnRzKVxuXG4gICAgQG1lbnUuY2xlYXIoKVxuXG4gICAgQGNsaXBib2FyZC5yZXNldCgpXG5cbiAgICBAbm90aWZpY2F0aW9ucy5jbGVhcigpXG5cbiAgICBAY29udGV4dE1lbnUuY2xlYXIoKVxuXG4gICAgQHBhY2thZ2VzLnJlc2V0KClcblxuICAgIEB3b3Jrc3BhY2UucmVzZXQoQHBhY2thZ2VzKVxuICAgIEByZWdpc3RlckRlZmF1bHRPcGVuZXJzKClcblxuICAgIEBwcm9qZWN0LnJlc2V0KEBwYWNrYWdlcylcblxuICAgIEB3b3Jrc3BhY2Uuc3Vic2NyaWJlVG9FdmVudHMoKVxuXG4gICAgQGdyYW1tYXJzLmNsZWFyKClcblxuICAgIEB0ZXh0RWRpdG9ycy5jbGVhcigpXG5cbiAgICBAdmlld3MuY2xlYXIoKVxuXG4gIGRlc3Ryb3k6IC0+XG4gICAgcmV0dXJuIGlmIG5vdCBAcHJvamVjdFxuXG4gICAgQGRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICAgIEB3b3Jrc3BhY2U/LmRlc3Ryb3koKVxuICAgIEB3b3Jrc3BhY2UgPSBudWxsXG4gICAgQHRoZW1lcy53b3Jrc3BhY2UgPSBudWxsXG4gICAgQHByb2plY3Q/LmRlc3Ryb3koKVxuICAgIEBwcm9qZWN0ID0gbnVsbFxuICAgIEBjb21tYW5kcy5jbGVhcigpXG4gICAgQHN0eWxlc0VsZW1lbnQucmVtb3ZlKClcbiAgICBAY29uZmlnLnVub2JzZXJ2ZVVzZXJDb25maWcoKVxuICAgIEBhdXRvVXBkYXRlci5kZXN0cm95KClcblxuICAgIEB1bmluc3RhbGxXaW5kb3dFdmVudEhhbmRsZXIoKVxuXG4gICMjI1xuICBTZWN0aW9uOiBFdmVudCBTdWJzY3JpcHRpb25cbiAgIyMjXG5cbiAgIyBFeHRlbmRlZDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuZXZlciB7OjpiZWVwfSBpcyBjYWxsZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbmV2ZXIgezo6YmVlcH0gaXMgY2FsbGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRCZWVwOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1iZWVwJywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlcmUgaXMgYW4gdW5oYW5kbGVkIGVycm9yLCBidXRcbiAgIyBiZWZvcmUgdGhlIGRldnRvb2xzIHBvcCBvcGVuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbmV2ZXIgdGhlcmUgaXMgYW4gdW5oYW5kbGVkIGVycm9yXG4gICMgICAqIGBldmVudGAge09iamVjdH1cbiAgIyAgICAgKiBgb3JpZ2luYWxFcnJvcmAge09iamVjdH0gdGhlIG9yaWdpbmFsIGVycm9yIG9iamVjdFxuICAjICAgICAqIGBtZXNzYWdlYCB7U3RyaW5nfSB0aGUgb3JpZ2luYWwgZXJyb3Igb2JqZWN0XG4gICMgICAgICogYHVybGAge1N0cmluZ30gVXJsIHRvIHRoZSBmaWxlIHdoZXJlIHRoZSBlcnJvciBvcmlnaW5hdGVkLlxuICAjICAgICAqIGBsaW5lYCB7TnVtYmVyfVxuICAjICAgICAqIGBjb2x1bW5gIHtOdW1iZXJ9XG4gICMgICAgICogYHByZXZlbnREZWZhdWx0YCB7RnVuY3Rpb259IGNhbGwgdGhpcyB0byBhdm9pZCBwb3BwaW5nIHVwIHRoZSBkZXYgdG9vbHMuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbldpbGxUaHJvd0Vycm9yOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ3dpbGwtdGhyb3ctZXJyb3InLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbmV2ZXIgdGhlcmUgaXMgYW4gdW5oYW5kbGVkIGVycm9yLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdoZW5ldmVyIHRoZXJlIGlzIGFuIHVuaGFuZGxlZCBlcnJvclxuICAjICAgKiBgZXZlbnRgIHtPYmplY3R9XG4gICMgICAgICogYG9yaWdpbmFsRXJyb3JgIHtPYmplY3R9IHRoZSBvcmlnaW5hbCBlcnJvciBvYmplY3RcbiAgIyAgICAgKiBgbWVzc2FnZWAge1N0cmluZ30gdGhlIG9yaWdpbmFsIGVycm9yIG9iamVjdFxuICAjICAgICAqIGB1cmxgIHtTdHJpbmd9IFVybCB0byB0aGUgZmlsZSB3aGVyZSB0aGUgZXJyb3Igb3JpZ2luYXRlZC5cbiAgIyAgICAgKiBgbGluZWAge051bWJlcn1cbiAgIyAgICAgKiBgY29sdW1uYCB7TnVtYmVyfVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRUaHJvd0Vycm9yOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC10aHJvdy1lcnJvcicsIGNhbGxiYWNrXG5cbiAgIyBUT0RPOiBNYWtlIHRoaXMgcGFydCBvZiB0aGUgcHVibGljIEFQSS4gV2Ugc2hvdWxkIG1ha2Ugb25EaWRUaHJvd0Vycm9yXG4gICMgbWF0Y2ggdGhlIGludGVyZmFjZSBieSBvbmx5IHlpZWxkaW5nIGFuIGV4Y2VwdGlvbiBvYmplY3QgdG8gdGhlIGhhbmRsZXJcbiAgIyBhbmQgZGVwcmVjYXRpbmcgdGhlIG9sZCBiZWhhdmlvci5cbiAgb25EaWRGYWlsQXNzZXJ0aW9uOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1mYWlsLWFzc2VydGlvbicsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayBhcyBzb29uIGFzIHRoZSBzaGVsbCBlbnZpcm9ubWVudCBpc1xuICAjIGxvYWRlZCAob3IgaW1tZWRpYXRlbHkgaWYgaXQgd2FzIGFscmVhZHkgbG9hZGVkKS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuZXZlciB0aGVyZSBpcyBhbiB1bmhhbmRsZWQgZXJyb3JcbiAgd2hlblNoZWxsRW52aXJvbm1lbnRMb2FkZWQ6IChjYWxsYmFjaykgLT5cbiAgICBpZiBAc2hlbGxFbnZpcm9ubWVudExvYWRlZFxuICAgICAgY2FsbGJhY2soKVxuICAgICAgbmV3IERpc3Bvc2FibGUoKVxuICAgIGVsc2VcbiAgICAgIEBlbWl0dGVyLm9uY2UgJ2xvYWRlZC1zaGVsbC1lbnZpcm9ubWVudCcsIGNhbGxiYWNrXG5cbiAgIyMjXG4gIFNlY3Rpb246IEF0b20gRGV0YWlsc1xuICAjIyNcblxuICAjIFB1YmxpYzogUmV0dXJucyBhIHtCb29sZWFufSB0aGF0IGlzIGB0cnVlYCBpZiB0aGUgY3VycmVudCB3aW5kb3cgaXMgaW4gZGV2ZWxvcG1lbnQgbW9kZS5cbiAgaW5EZXZNb2RlOiAtPlxuICAgIEBkZXZNb2RlID89IEBnZXRMb2FkU2V0dGluZ3MoKS5kZXZNb2RlXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgYSB7Qm9vbGVhbn0gdGhhdCBpcyBgdHJ1ZWAgaWYgdGhlIGN1cnJlbnQgd2luZG93IGlzIGluIHNhZmUgbW9kZS5cbiAgaW5TYWZlTW9kZTogLT5cbiAgICBAc2FmZU1vZGUgPz0gQGdldExvYWRTZXR0aW5ncygpLnNhZmVNb2RlXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgYSB7Qm9vbGVhbn0gdGhhdCBpcyBgdHJ1ZWAgaWYgdGhlIGN1cnJlbnQgd2luZG93IGlzIHJ1bm5pbmcgc3BlY3MuXG4gIGluU3BlY01vZGU6IC0+XG4gICAgQHNwZWNNb2RlID89IEBnZXRMb2FkU2V0dGluZ3MoKS5pc1NwZWNcblxuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRoaXMgdGhlIGZpcnN0IHRpbWUgdGhlIHdpbmRvdydzIGJlZW5cbiAgIyBsb2FkZWQuXG4gIGlzRmlyc3RMb2FkOiAtPlxuICAgIEBmaXJzdExvYWQgPz0gQGdldExvYWRTZXR0aW5ncygpLmZpcnN0TG9hZFxuXG4gICMgUHVibGljOiBHZXQgdGhlIHZlcnNpb24gb2YgdGhlIEF0b20gYXBwbGljYXRpb24uXG4gICNcbiAgIyBSZXR1cm5zIHRoZSB2ZXJzaW9uIHRleHQge1N0cmluZ30uXG4gIGdldFZlcnNpb246IC0+XG4gICAgQGFwcFZlcnNpb24gPz0gQGdldExvYWRTZXR0aW5ncygpLmFwcFZlcnNpb25cblxuICAjIFJldHVybnMgdGhlIHJlbGVhc2UgY2hhbm5lbCBhcyBhIHtTdHJpbmd9LiBXaWxsIHJldHVybiBvbmUgb2YgYCdkZXYnLCAnYmV0YScsICdzdGFibGUnYFxuICBnZXRSZWxlYXNlQ2hhbm5lbDogLT5cbiAgICB2ZXJzaW9uID0gQGdldFZlcnNpb24oKVxuICAgIGlmIHZlcnNpb24uaW5kZXhPZignYmV0YScpID4gLTFcbiAgICAgICdiZXRhJ1xuICAgIGVsc2UgaWYgdmVyc2lvbi5pbmRleE9mKCdkZXYnKSA+IC0xXG4gICAgICAnZGV2J1xuICAgIGVsc2VcbiAgICAgICdzdGFibGUnXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgYSB7Qm9vbGVhbn0gdGhhdCBpcyBgdHJ1ZWAgaWYgdGhlIGN1cnJlbnQgdmVyc2lvbiBpcyBhbiBvZmZpY2lhbCByZWxlYXNlLlxuICBpc1JlbGVhc2VkVmVyc2lvbjogLT5cbiAgICBub3QgL1xcd3s3fS8udGVzdChAZ2V0VmVyc2lvbigpKSAjIENoZWNrIGlmIHRoZSByZWxlYXNlIGlzIGEgNy1jaGFyYWN0ZXIgU0hBIHByZWZpeFxuXG4gICMgUHVibGljOiBHZXQgdGhlIHRpbWUgdGFrZW4gdG8gY29tcGxldGVseSBsb2FkIHRoZSBjdXJyZW50IHdpbmRvdy5cbiAgI1xuICAjIFRoaXMgdGltZSBpbmNsdWRlIHRoaW5ncyBsaWtlIGxvYWRpbmcgYW5kIGFjdGl2YXRpbmcgcGFja2FnZXMsIGNyZWF0aW5nXG4gICMgRE9NIGVsZW1lbnRzIGZvciB0aGUgZWRpdG9yLCBhbmQgcmVhZGluZyB0aGUgY29uZmlnLlxuICAjXG4gICMgUmV0dXJucyB0aGUge051bWJlcn0gb2YgbWlsbGlzZWNvbmRzIHRha2VuIHRvIGxvYWQgdGhlIHdpbmRvdyBvciBudWxsXG4gICMgaWYgdGhlIHdpbmRvdyBoYXNuJ3QgZmluaXNoZWQgbG9hZGluZyB5ZXQuXG4gIGdldFdpbmRvd0xvYWRUaW1lOiAtPlxuICAgIEBsb2FkVGltZVxuXG4gICMgUHVibGljOiBHZXQgdGhlIGxvYWQgc2V0dGluZ3MgZm9yIHRoZSBjdXJyZW50IHdpbmRvdy5cbiAgI1xuICAjIFJldHVybnMgYW4ge09iamVjdH0gY29udGFpbmluZyBhbGwgdGhlIGxvYWQgc2V0dGluZyBrZXkvdmFsdWUgcGFpcnMuXG4gIGdldExvYWRTZXR0aW5nczogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRXaW5kb3dMb2FkU2V0dGluZ3MoKVxuXG4gICMjI1xuICBTZWN0aW9uOiBNYW5hZ2luZyBUaGUgQXRvbSBXaW5kb3dcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IE9wZW4gYSBuZXcgQXRvbSB3aW5kb3cgdXNpbmcgdGhlIGdpdmVuIG9wdGlvbnMuXG4gICNcbiAgIyBDYWxsaW5nIHRoaXMgbWV0aG9kIHdpdGhvdXQgYW4gb3B0aW9ucyBwYXJhbWV0ZXIgd2lsbCBvcGVuIGEgcHJvbXB0IHRvIHBpY2tcbiAgIyBhIGZpbGUvZm9sZGVyIHRvIG9wZW4gaW4gdGhlIG5ldyB3aW5kb3cuXG4gICNcbiAgIyAqIGBwYXJhbXNgIEFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgcGF0aHNUb09wZW5gICBBbiB7QXJyYXl9IG9mIHtTdHJpbmd9IHBhdGhzIHRvIG9wZW4uXG4gICMgICAqIGBuZXdXaW5kb3dgIEEge0Jvb2xlYW59LCB0cnVlIHRvIGFsd2F5cyBvcGVuIGEgbmV3IHdpbmRvdyBpbnN0ZWFkIG9mXG4gICMgICAgIHJldXNpbmcgZXhpc3Rpbmcgd2luZG93cyBkZXBlbmRpbmcgb24gdGhlIHBhdGhzIHRvIG9wZW4uXG4gICMgICAqIGBkZXZNb2RlYCBBIHtCb29sZWFufSwgdHJ1ZSB0byBvcGVuIHRoZSB3aW5kb3cgaW4gZGV2ZWxvcG1lbnQgbW9kZS5cbiAgIyAgICAgRGV2ZWxvcG1lbnQgbW9kZSBsb2FkcyB0aGUgQXRvbSBzb3VyY2UgZnJvbSB0aGUgbG9jYWxseSBjbG9uZWRcbiAgIyAgICAgcmVwb3NpdG9yeSBhbmQgYWxzbyBsb2FkcyBhbGwgdGhlIHBhY2thZ2VzIGluIH4vLmF0b20vZGV2L3BhY2thZ2VzXG4gICMgICAqIGBzYWZlTW9kZWAgQSB7Qm9vbGVhbn0sIHRydWUgdG8gb3BlbiB0aGUgd2luZG93IGluIHNhZmUgbW9kZS4gU2FmZVxuICAjICAgICBtb2RlIHByZXZlbnRzIGFsbCBwYWNrYWdlcyBpbnN0YWxsZWQgdG8gfi8uYXRvbS9wYWNrYWdlcyBmcm9tIGxvYWRpbmcuXG4gIG9wZW46IChwYXJhbXMpIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUub3BlbihwYXJhbXMpXG5cbiAgIyBFeHRlbmRlZDogUHJvbXB0IHRoZSB1c2VyIHRvIHNlbGVjdCBvbmUgb3IgbW9yZSBmb2xkZXJzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIEEge0Z1bmN0aW9ufSB0byBjYWxsIG9uY2UgdGhlIHVzZXIgaGFzIGNvbmZpcm1lZCB0aGUgc2VsZWN0aW9uLlxuICAjICAgKiBgcGF0aHNgIEFuIHtBcnJheX0gb2Yge1N0cmluZ30gcGF0aHMgdGhhdCB0aGUgdXNlciBzZWxlY3RlZCwgb3IgYG51bGxgXG4gICMgICAgIGlmIHRoZSB1c2VyIGRpc21pc3NlZCB0aGUgZGlhbG9nLlxuICBwaWNrRm9sZGVyOiAoY2FsbGJhY2spIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUucGlja0ZvbGRlcihjYWxsYmFjaylcblxuICAjIEVzc2VudGlhbDogQ2xvc2UgdGhlIGN1cnJlbnQgd2luZG93LlxuICBjbG9zZTogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5jbG9zZVdpbmRvdygpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgc2l6ZSBvZiBjdXJyZW50IHdpbmRvdy5cbiAgI1xuICAjIFJldHVybnMgYW4ge09iamVjdH0gaW4gdGhlIGZvcm1hdCBge3dpZHRoOiAxMDAwLCBoZWlnaHQ6IDcwMH1gXG4gIGdldFNpemU6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuZ2V0V2luZG93U2l6ZSgpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgc2l6ZSBvZiBjdXJyZW50IHdpbmRvdy5cbiAgI1xuICAjICogYHdpZHRoYCBUaGUge051bWJlcn0gb2YgcGl4ZWxzLlxuICAjICogYGhlaWdodGAgVGhlIHtOdW1iZXJ9IG9mIHBpeGVscy5cbiAgc2V0U2l6ZTogKHdpZHRoLCBoZWlnaHQpIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0V2luZG93U2l6ZSh3aWR0aCwgaGVpZ2h0KVxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIHBvc2l0aW9uIG9mIGN1cnJlbnQgd2luZG93LlxuICAjXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSBpbiB0aGUgZm9ybWF0IGB7eDogMTAsIHk6IDIwfWBcbiAgZ2V0UG9zaXRpb246IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuZ2V0V2luZG93UG9zaXRpb24oKVxuXG4gICMgRXNzZW50aWFsOiBTZXQgdGhlIHBvc2l0aW9uIG9mIGN1cnJlbnQgd2luZG93LlxuICAjXG4gICMgKiBgeGAgVGhlIHtOdW1iZXJ9IG9mIHBpeGVscy5cbiAgIyAqIGB5YCBUaGUge051bWJlcn0gb2YgcGl4ZWxzLlxuICBzZXRQb3NpdGlvbjogKHgsIHkpIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0V2luZG93UG9zaXRpb24oeCwgeSlcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIGN1cnJlbnQgd2luZG93XG4gIGdldEN1cnJlbnRXaW5kb3c6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuZ2V0Q3VycmVudFdpbmRvdygpXG5cbiAgIyBFeHRlbmRlZDogTW92ZSBjdXJyZW50IHdpbmRvdyB0byB0aGUgY2VudGVyIG9mIHRoZSBzY3JlZW4uXG4gIGNlbnRlcjogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5jZW50ZXJXaW5kb3coKVxuXG4gICMgRXh0ZW5kZWQ6IEZvY3VzIHRoZSBjdXJyZW50IHdpbmRvdy5cbiAgZm9jdXM6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuZm9jdXNXaW5kb3coKVxuICAgIEB3aW5kb3cuZm9jdXMoKVxuXG4gICMgRXh0ZW5kZWQ6IFNob3cgdGhlIGN1cnJlbnQgd2luZG93LlxuICBzaG93OiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnNob3dXaW5kb3coKVxuXG4gICMgRXh0ZW5kZWQ6IEhpZGUgdGhlIGN1cnJlbnQgd2luZG93LlxuICBoaWRlOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLmhpZGVXaW5kb3coKVxuXG4gICMgRXh0ZW5kZWQ6IFJlbG9hZCB0aGUgY3VycmVudCB3aW5kb3cuXG4gIHJlbG9hZDogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5yZWxvYWRXaW5kb3coKVxuXG4gICMgRXh0ZW5kZWQ6IFJlbGF1bmNoIHRoZSBlbnRpcmUgYXBwbGljYXRpb24uXG4gIHJlc3RhcnRBcHBsaWNhdGlvbjogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5yZXN0YXJ0QXBwbGljYXRpb24oKVxuXG4gICMgRXh0ZW5kZWQ6IFJldHVybnMgYSB7Qm9vbGVhbn0gdGhhdCBpcyBgdHJ1ZWAgaWYgdGhlIGN1cnJlbnQgd2luZG93IGlzIG1heGltaXplZC5cbiAgaXNNYXhpbWl6ZWQ6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuaXNXaW5kb3dNYXhpbWl6ZWQoKVxuXG4gIG1heGltaXplOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLm1heGltaXplV2luZG93KClcblxuICAjIEV4dGVuZGVkOiBSZXR1cm5zIGEge0Jvb2xlYW59IHRoYXQgaXMgYHRydWVgIGlmIHRoZSBjdXJyZW50IHdpbmRvdyBpcyBpbiBmdWxsIHNjcmVlbiBtb2RlLlxuICBpc0Z1bGxTY3JlZW46IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuaXNXaW5kb3dGdWxsU2NyZWVuKClcblxuICAjIEV4dGVuZGVkOiBTZXQgdGhlIGZ1bGwgc2NyZWVuIHN0YXRlIG9mIHRoZSBjdXJyZW50IHdpbmRvdy5cbiAgc2V0RnVsbFNjcmVlbjogKGZ1bGxTY3JlZW49ZmFsc2UpIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0V2luZG93RnVsbFNjcmVlbihmdWxsU2NyZWVuKVxuXG4gICMgRXh0ZW5kZWQ6IFRvZ2dsZSB0aGUgZnVsbCBzY3JlZW4gc3RhdGUgb2YgdGhlIGN1cnJlbnQgd2luZG93LlxuICB0b2dnbGVGdWxsU2NyZWVuOiAtPlxuICAgIEBzZXRGdWxsU2NyZWVuKG5vdCBAaXNGdWxsU2NyZWVuKCkpXG5cbiAgIyBSZXN0b3JlIHRoZSB3aW5kb3cgdG8gaXRzIHByZXZpb3VzIGRpbWVuc2lvbnMgYW5kIHNob3cgaXQuXG4gICNcbiAgIyBSZXN0b3JlcyB0aGUgZnVsbCBzY3JlZW4gYW5kIG1heGltaXplZCBzdGF0ZSBhZnRlciB0aGUgd2luZG93IGhhcyByZXNpemVkIHRvXG4gICMgcHJldmVudCByZXNpemUgZ2xpdGNoZXMuXG4gIGRpc3BsYXlXaW5kb3c6IC0+XG4gICAgQHJlc3RvcmVXaW5kb3dEaW1lbnNpb25zKCkudGhlbiA9PlxuICAgICAgc3RlcHMgPSBbXG4gICAgICAgIEByZXN0b3JlV2luZG93QmFja2dyb3VuZCgpLFxuICAgICAgICBAc2hvdygpLFxuICAgICAgICBAZm9jdXMoKVxuICAgICAgXVxuICAgICAgc3RlcHMucHVzaChAc2V0RnVsbFNjcmVlbih0cnVlKSkgaWYgQHdpbmRvd0RpbWVuc2lvbnM/LmZ1bGxTY3JlZW5cbiAgICAgIHN0ZXBzLnB1c2goQG1heGltaXplKCkpIGlmIEB3aW5kb3dEaW1lbnNpb25zPy5tYXhpbWl6ZWQgYW5kIHByb2Nlc3MucGxhdGZvcm0gaXNudCAnZGFyd2luJ1xuICAgICAgUHJvbWlzZS5hbGwoc3RlcHMpXG5cbiAgIyBHZXQgdGhlIGRpbWVuc2lvbnMgb2YgdGhpcyB3aW5kb3cuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgeGAgICAgICBUaGUgd2luZG93J3MgeC1wb3NpdGlvbiB7TnVtYmVyfS5cbiAgIyAgICogYHlgICAgICAgVGhlIHdpbmRvdydzIHktcG9zaXRpb24ge051bWJlcn0uXG4gICMgICAqIGB3aWR0aGAgIFRoZSB3aW5kb3cncyB3aWR0aCB7TnVtYmVyfS5cbiAgIyAgICogYGhlaWdodGAgVGhlIHdpbmRvdydzIGhlaWdodCB7TnVtYmVyfS5cbiAgZ2V0V2luZG93RGltZW5zaW9uczogLT5cbiAgICBicm93c2VyV2luZG93ID0gQGdldEN1cnJlbnRXaW5kb3coKVxuICAgIFt4LCB5XSA9IGJyb3dzZXJXaW5kb3cuZ2V0UG9zaXRpb24oKVxuICAgIFt3aWR0aCwgaGVpZ2h0XSA9IGJyb3dzZXJXaW5kb3cuZ2V0U2l6ZSgpXG4gICAgbWF4aW1pemVkID0gYnJvd3NlcldpbmRvdy5pc01heGltaXplZCgpXG4gICAge3gsIHksIHdpZHRoLCBoZWlnaHQsIG1heGltaXplZH1cblxuICAjIFNldCB0aGUgZGltZW5zaW9ucyBvZiB0aGUgd2luZG93LlxuICAjXG4gICMgVGhlIHdpbmRvdyB3aWxsIGJlIGNlbnRlcmVkIGlmIGVpdGhlciB0aGUgeCBvciB5IGNvb3JkaW5hdGUgaXMgbm90IHNldFxuICAjIGluIHRoZSBkaW1lbnNpb25zIHBhcmFtZXRlci4gSWYgeCBvciB5IGFyZSBvbWl0dGVkIHRoZSB3aW5kb3cgd2lsbCBiZVxuICAjIGNlbnRlcmVkLiBJZiBoZWlnaHQgb3Igd2lkdGggYXJlIG9taXR0ZWQgb25seSB0aGUgcG9zaXRpb24gd2lsbCBiZSBjaGFuZ2VkLlxuICAjXG4gICMgKiBgZGltZW5zaW9uc2AgQW4ge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGB4YCBUaGUgbmV3IHggY29vcmRpbmF0ZS5cbiAgIyAgICogYHlgIFRoZSBuZXcgeSBjb29yZGluYXRlLlxuICAjICAgKiBgd2lkdGhgIFRoZSBuZXcgd2lkdGguXG4gICMgICAqIGBoZWlnaHRgIFRoZSBuZXcgaGVpZ2h0LlxuICBzZXRXaW5kb3dEaW1lbnNpb25zOiAoe3gsIHksIHdpZHRoLCBoZWlnaHR9KSAtPlxuICAgIHN0ZXBzID0gW11cbiAgICBpZiB3aWR0aD8gYW5kIGhlaWdodD9cbiAgICAgIHN0ZXBzLnB1c2goQHNldFNpemUod2lkdGgsIGhlaWdodCkpXG4gICAgaWYgeD8gYW5kIHk/XG4gICAgICBzdGVwcy5wdXNoKEBzZXRQb3NpdGlvbih4LCB5KSlcbiAgICBlbHNlXG4gICAgICBzdGVwcy5wdXNoKEBjZW50ZXIoKSlcbiAgICBQcm9taXNlLmFsbChzdGVwcylcblxuICAjIFJldHVybnMgdHJ1ZSBpZiB0aGUgZGltZW5zaW9ucyBhcmUgdXNlYWJsZSwgZmFsc2UgaWYgdGhleSBzaG91bGQgYmUgaWdub3JlZC5cbiAgIyBXb3JrIGFyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS1zaGVsbC9pc3N1ZXMvNDczXG4gIGlzVmFsaWREaW1lbnNpb25zOiAoe3gsIHksIHdpZHRoLCBoZWlnaHR9PXt9KSAtPlxuICAgIHdpZHRoID4gMCBhbmQgaGVpZ2h0ID4gMCBhbmQgeCArIHdpZHRoID4gMCBhbmQgeSArIGhlaWdodCA+IDBcblxuICBzdG9yZVdpbmRvd0RpbWVuc2lvbnM6IC0+XG4gICAgQHdpbmRvd0RpbWVuc2lvbnMgPSBAZ2V0V2luZG93RGltZW5zaW9ucygpXG4gICAgaWYgQGlzVmFsaWREaW1lbnNpb25zKEB3aW5kb3dEaW1lbnNpb25zKVxuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJkZWZhdWx0V2luZG93RGltZW5zaW9uc1wiLCBKU09OLnN0cmluZ2lmeShAd2luZG93RGltZW5zaW9ucykpXG5cbiAgZ2V0RGVmYXVsdFdpbmRvd0RpbWVuc2lvbnM6IC0+XG4gICAge3dpbmRvd0RpbWVuc2lvbnN9ID0gQGdldExvYWRTZXR0aW5ncygpXG4gICAgcmV0dXJuIHdpbmRvd0RpbWVuc2lvbnMgaWYgd2luZG93RGltZW5zaW9ucz9cblxuICAgIGRpbWVuc2lvbnMgPSBudWxsXG4gICAgdHJ5XG4gICAgICBkaW1lbnNpb25zID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImRlZmF1bHRXaW5kb3dEaW1lbnNpb25zXCIpKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICBjb25zb2xlLndhcm4gXCJFcnJvciBwYXJzaW5nIGRlZmF1bHQgd2luZG93IGRpbWVuc2lvbnNcIiwgZXJyb3JcbiAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFwiZGVmYXVsdFdpbmRvd0RpbWVuc2lvbnNcIilcblxuICAgIGlmIEBpc1ZhbGlkRGltZW5zaW9ucyhkaW1lbnNpb25zKVxuICAgICAgZGltZW5zaW9uc1xuICAgIGVsc2VcbiAgICAgIHt3aWR0aCwgaGVpZ2h0fSA9IEBhcHBsaWNhdGlvbkRlbGVnYXRlLmdldFByaW1hcnlEaXNwbGF5V29ya0FyZWFTaXplKClcbiAgICAgIHt4OiAwLCB5OiAwLCB3aWR0aDogTWF0aC5taW4oMTAyNCwgd2lkdGgpLCBoZWlnaHR9XG5cbiAgcmVzdG9yZVdpbmRvd0RpbWVuc2lvbnM6IC0+XG4gICAgdW5sZXNzIEB3aW5kb3dEaW1lbnNpb25zPyBhbmQgQGlzVmFsaWREaW1lbnNpb25zKEB3aW5kb3dEaW1lbnNpb25zKVxuICAgICAgQHdpbmRvd0RpbWVuc2lvbnMgPSBAZ2V0RGVmYXVsdFdpbmRvd0RpbWVuc2lvbnMoKVxuICAgIEBzZXRXaW5kb3dEaW1lbnNpb25zKEB3aW5kb3dEaW1lbnNpb25zKS50aGVuID0+IEB3aW5kb3dEaW1lbnNpb25zXG5cbiAgcmVzdG9yZVdpbmRvd0JhY2tncm91bmQ6IC0+XG4gICAgaWYgYmFja2dyb3VuZENvbG9yID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdhdG9tOndpbmRvdy1iYWNrZ3JvdW5kLWNvbG9yJylcbiAgICAgIEBiYWNrZ3JvdW5kU3R5bGVzaGVldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJylcbiAgICAgIEBiYWNrZ3JvdW5kU3R5bGVzaGVldC50eXBlID0gJ3RleHQvY3NzJ1xuICAgICAgQGJhY2tncm91bmRTdHlsZXNoZWV0LmlubmVyVGV4dCA9ICdodG1sLCBib2R5IHsgYmFja2dyb3VuZDogJyArIGJhY2tncm91bmRDb2xvciArICcgIWltcG9ydGFudDsgfSdcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoQGJhY2tncm91bmRTdHlsZXNoZWV0KVxuXG4gIHN0b3JlV2luZG93QmFja2dyb3VuZDogLT5cbiAgICByZXR1cm4gaWYgQGluU3BlY01vZGUoKVxuXG4gICAgYmFja2dyb3VuZENvbG9yID0gQHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKEB3b3Jrc3BhY2UuZ2V0RWxlbWVudCgpKVsnYmFja2dyb3VuZC1jb2xvciddXG4gICAgQHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnYXRvbTp3aW5kb3ctYmFja2dyb3VuZC1jb2xvcicsIGJhY2tncm91bmRDb2xvcilcblxuICAjIENhbGwgdGhpcyBtZXRob2Qgd2hlbiBlc3RhYmxpc2hpbmcgYSByZWFsIGFwcGxpY2F0aW9uIHdpbmRvdy5cbiAgc3RhcnRFZGl0b3JXaW5kb3c6IC0+XG4gICAgQHVubG9hZGVkID0gZmFsc2VcblxuICAgIHVwZGF0ZVByb2Nlc3NFbnZQcm9taXNlID0gQHVwZGF0ZVByb2Nlc3NFbnZBbmRUcmlnZ2VySG9va3MoKVxuXG4gICAgbG9hZFN0YXRlUHJvbWlzZSA9IEBsb2FkU3RhdGUoKS50aGVuIChzdGF0ZSkgPT5cbiAgICAgIEB3aW5kb3dEaW1lbnNpb25zID0gc3RhdGU/LndpbmRvd0RpbWVuc2lvbnNcbiAgICAgIEBkaXNwbGF5V2luZG93KCkudGhlbiA9PlxuICAgICAgICBAY29tbWFuZEluc3RhbGxlci5pbnN0YWxsQXRvbUNvbW1hbmQgZmFsc2UsIChlcnJvcikgLT5cbiAgICAgICAgICBjb25zb2xlLndhcm4gZXJyb3IubWVzc2FnZSBpZiBlcnJvcj9cbiAgICAgICAgQGNvbW1hbmRJbnN0YWxsZXIuaW5zdGFsbEFwbUNvbW1hbmQgZmFsc2UsIChlcnJvcikgLT5cbiAgICAgICAgICBjb25zb2xlLndhcm4gZXJyb3IubWVzc2FnZSBpZiBlcnJvcj9cblxuICAgICAgICBAZGlzcG9zYWJsZXMuYWRkKEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9uRGlkT3BlbkxvY2F0aW9ucyhAb3BlbkxvY2F0aW9ucy5iaW5kKHRoaXMpKSlcbiAgICAgICAgQGRpc3Bvc2FibGVzLmFkZChAYXBwbGljYXRpb25EZWxlZ2F0ZS5vbkFwcGxpY2F0aW9uTWVudUNvbW1hbmQoQGRpc3BhdGNoQXBwbGljYXRpb25NZW51Q29tbWFuZC5iaW5kKHRoaXMpKSlcbiAgICAgICAgQGRpc3Bvc2FibGVzLmFkZChAYXBwbGljYXRpb25EZWxlZ2F0ZS5vbkNvbnRleHRNZW51Q29tbWFuZChAZGlzcGF0Y2hDb250ZXh0TWVudUNvbW1hbmQuYmluZCh0aGlzKSkpXG4gICAgICAgIEBkaXNwb3NhYmxlcy5hZGQgQGFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRSZXF1ZXN0VW5sb2FkID0+XG4gICAgICAgICAgQHNhdmVTdGF0ZSh7aXNVbmxvYWRpbmc6IHRydWV9KVxuICAgICAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpXG4gICAgICAgICAgICAudGhlbiA9PlxuICAgICAgICAgICAgICBAd29ya3NwYWNlPy5jb25maXJtQ2xvc2Uoe1xuICAgICAgICAgICAgICAgIHdpbmRvd0Nsb3NlUmVxdWVzdGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHByb2plY3RIYXNQYXRoczogQHByb2plY3QuZ2V0UGF0aHMoKS5sZW5ndGggPiAwXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgQGxpc3RlbkZvclVwZGF0ZXMoKVxuXG4gICAgICAgIEByZWdpc3RlckRlZmF1bHRUYXJnZXRGb3JLZXltYXBzKClcblxuICAgICAgICBAcGFja2FnZXMubG9hZFBhY2thZ2VzKClcblxuICAgICAgICBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG4gICAgICAgIEBkZXNlcmlhbGl6ZShzdGF0ZSkudGhlbiA9PlxuICAgICAgICAgIEBkZXNlcmlhbGl6ZVRpbWluZ3MuYXRvbSA9IERhdGUubm93KCkgLSBzdGFydFRpbWVcblxuICAgICAgICAgIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbicgYW5kIEBjb25maWcuZ2V0KCdjb3JlLnRpdGxlQmFyJykgaXMgJ2N1c3RvbSdcbiAgICAgICAgICAgIEB3b3Jrc3BhY2UuYWRkSGVhZGVyUGFuZWwoe2l0ZW06IG5ldyBUaXRsZUJhcih7QHdvcmtzcGFjZSwgQHRoZW1lcywgQGFwcGxpY2F0aW9uRGVsZWdhdGV9KX0pXG4gICAgICAgICAgICBAZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdjdXN0b20tdGl0bGUtYmFyJylcbiAgICAgICAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nIGFuZCBAY29uZmlnLmdldCgnY29yZS50aXRsZUJhcicpIGlzICdjdXN0b20taW5zZXQnXG4gICAgICAgICAgICBAd29ya3NwYWNlLmFkZEhlYWRlclBhbmVsKHtpdGVtOiBuZXcgVGl0bGVCYXIoe0B3b3Jrc3BhY2UsIEB0aGVtZXMsIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSl9KVxuICAgICAgICAgICAgQGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnY3VzdG9tLWluc2V0LXRpdGxlLWJhcicpXG4gICAgICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJyBhbmQgQGNvbmZpZy5nZXQoJ2NvcmUudGl0bGVCYXInKSBpcyAnaGlkZGVuJ1xuICAgICAgICAgICAgQGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnaGlkZGVuLXRpdGxlLWJhcicpXG5cbiAgICAgICAgICBAZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChAd29ya3NwYWNlLmdldEVsZW1lbnQoKSlcbiAgICAgICAgICBAYmFja2dyb3VuZFN0eWxlc2hlZXQ/LnJlbW92ZSgpXG5cbiAgICAgICAgICBAd2F0Y2hQcm9qZWN0UGF0aHMoKVxuXG4gICAgICAgICAgQHBhY2thZ2VzLmFjdGl2YXRlKClcbiAgICAgICAgICBAa2V5bWFwcy5sb2FkVXNlcktleW1hcCgpXG4gICAgICAgICAgQHJlcXVpcmVVc2VySW5pdFNjcmlwdCgpIHVubGVzcyBAZ2V0TG9hZFNldHRpbmdzKCkuc2FmZU1vZGVcblxuICAgICAgICAgIEBtZW51LnVwZGF0ZSgpXG5cbiAgICAgICAgICBAb3BlbkluaXRpYWxFbXB0eUVkaXRvcklmTmVjZXNzYXJ5KClcblxuICAgIGxvYWRIaXN0b3J5UHJvbWlzZSA9IEBoaXN0b3J5LmxvYWRTdGF0ZSgpLnRoZW4gPT5cbiAgICAgIEByZW9wZW5Qcm9qZWN0TWVudU1hbmFnZXIgPSBuZXcgUmVvcGVuUHJvamVjdE1lbnVNYW5hZ2VyKHtcbiAgICAgICAgQG1lbnUsIEBjb21tYW5kcywgQGhpc3RvcnksIEBjb25maWcsXG4gICAgICAgIG9wZW46IChwYXRocykgPT4gQG9wZW4ocGF0aHNUb09wZW46IHBhdGhzKVxuICAgICAgfSlcbiAgICAgIEByZW9wZW5Qcm9qZWN0TWVudU1hbmFnZXIudXBkYXRlKClcblxuICAgIFByb21pc2UuYWxsKFtsb2FkU3RhdGVQcm9taXNlLCBsb2FkSGlzdG9yeVByb21pc2UsIHVwZGF0ZVByb2Nlc3NFbnZQcm9taXNlXSlcblxuICBzZXJpYWxpemU6IChvcHRpb25zKSAtPlxuICAgIHZlcnNpb246IEBjb25zdHJ1Y3Rvci52ZXJzaW9uXG4gICAgcHJvamVjdDogQHByb2plY3Quc2VyaWFsaXplKG9wdGlvbnMpXG4gICAgd29ya3NwYWNlOiBAd29ya3NwYWNlLnNlcmlhbGl6ZSgpXG4gICAgcGFja2FnZVN0YXRlczogQHBhY2thZ2VzLnNlcmlhbGl6ZSgpXG4gICAgZ3JhbW1hcnM6IHtncmFtbWFyT3ZlcnJpZGVzQnlQYXRoOiBAZ3JhbW1hcnMuZ3JhbW1hck92ZXJyaWRlc0J5UGF0aH1cbiAgICBmdWxsU2NyZWVuOiBAaXNGdWxsU2NyZWVuKClcbiAgICB3aW5kb3dEaW1lbnNpb25zOiBAd2luZG93RGltZW5zaW9uc1xuICAgIHRleHRFZGl0b3JzOiBAdGV4dEVkaXRvcnMuc2VyaWFsaXplKClcblxuICB1bmxvYWRFZGl0b3JXaW5kb3c6IC0+XG4gICAgcmV0dXJuIGlmIG5vdCBAcHJvamVjdFxuXG4gICAgQHN0b3JlV2luZG93QmFja2dyb3VuZCgpXG4gICAgQHBhY2thZ2VzLmRlYWN0aXZhdGVQYWNrYWdlcygpXG4gICAgQHNhdmVCbG9iU3RvcmVTeW5jKClcbiAgICBAdW5sb2FkZWQgPSB0cnVlXG5cbiAgc2F2ZUJsb2JTdG9yZVN5bmM6IC0+XG4gICAgaWYgQGVuYWJsZVBlcnNpc3RlbmNlXG4gICAgICBAYmxvYlN0b3JlLnNhdmUoKVxuXG4gIG9wZW5Jbml0aWFsRW1wdHlFZGl0b3JJZk5lY2Vzc2FyeTogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBjb25maWcuZ2V0KCdjb3JlLm9wZW5FbXB0eUVkaXRvck9uU3RhcnQnKVxuICAgIGlmIEBnZXRMb2FkU2V0dGluZ3MoKS5pbml0aWFsUGF0aHM/Lmxlbmd0aCBpcyAwIGFuZCBAd29ya3NwYWNlLmdldFBhbmVJdGVtcygpLmxlbmd0aCBpcyAwXG4gICAgICBAd29ya3NwYWNlLm9wZW4obnVsbClcblxuICBpbnN0YWxsVW5jYXVnaHRFcnJvckhhbmRsZXI6IC0+XG4gICAgQHByZXZpb3VzV2luZG93RXJyb3JIYW5kbGVyID0gQHdpbmRvdy5vbmVycm9yXG4gICAgQHdpbmRvdy5vbmVycm9yID0gPT5cbiAgICAgIEBsYXN0VW5jYXVnaHRFcnJvciA9IEFycmF5OjpzbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgIFttZXNzYWdlLCB1cmwsIGxpbmUsIGNvbHVtbiwgb3JpZ2luYWxFcnJvcl0gPSBAbGFzdFVuY2F1Z2h0RXJyb3JcblxuICAgICAge2xpbmUsIGNvbHVtbiwgc291cmNlfSA9IG1hcFNvdXJjZVBvc2l0aW9uKHtzb3VyY2U6IHVybCwgbGluZSwgY29sdW1ufSlcblxuICAgICAgaWYgdXJsIGlzICc8ZW1iZWRkZWQ+J1xuICAgICAgICB1cmwgPSBzb3VyY2VcblxuICAgICAgZXZlbnRPYmplY3QgPSB7bWVzc2FnZSwgdXJsLCBsaW5lLCBjb2x1bW4sIG9yaWdpbmFsRXJyb3J9XG5cbiAgICAgIG9wZW5EZXZUb29scyA9IHRydWVcbiAgICAgIGV2ZW50T2JqZWN0LnByZXZlbnREZWZhdWx0ID0gLT4gb3BlbkRldlRvb2xzID0gZmFsc2VcblxuICAgICAgQGVtaXR0ZXIuZW1pdCAnd2lsbC10aHJvdy1lcnJvcicsIGV2ZW50T2JqZWN0XG5cbiAgICAgIGlmIG9wZW5EZXZUb29sc1xuICAgICAgICBAb3BlbkRldlRvb2xzKCkudGhlbiA9PiBAZXhlY3V0ZUphdmFTY3JpcHRJbkRldlRvb2xzKCdEZXZUb29sc0FQSS5zaG93UGFuZWwoXCJjb25zb2xlXCIpJylcblxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXRocm93LWVycm9yJywge21lc3NhZ2UsIHVybCwgbGluZSwgY29sdW1uLCBvcmlnaW5hbEVycm9yfVxuXG4gIHVuaW5zdGFsbFVuY2F1Z2h0RXJyb3JIYW5kbGVyOiAtPlxuICAgIEB3aW5kb3cub25lcnJvciA9IEBwcmV2aW91c1dpbmRvd0Vycm9ySGFuZGxlclxuXG4gIGluc3RhbGxXaW5kb3dFdmVudEhhbmRsZXI6IC0+XG4gICAgQHdpbmRvd0V2ZW50SGFuZGxlciA9IG5ldyBXaW5kb3dFdmVudEhhbmRsZXIoe2F0b21FbnZpcm9ubWVudDogdGhpcywgQGFwcGxpY2F0aW9uRGVsZWdhdGV9KVxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXIuaW5pdGlhbGl6ZShAd2luZG93LCBAZG9jdW1lbnQpXG5cbiAgdW5pbnN0YWxsV2luZG93RXZlbnRIYW5kbGVyOiAtPlxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXI/LnVuc3Vic2NyaWJlKClcbiAgICBAd2luZG93RXZlbnRIYW5kbGVyID0gbnVsbFxuXG4gIGRpZENoYW5nZVN0eWxlczogKHN0eWxlRWxlbWVudCkgLT5cbiAgICBUZXh0RWRpdG9yLmRpZFVwZGF0ZVN0eWxlcygpXG4gICAgaWYgc3R5bGVFbGVtZW50LnRleHRDb250ZW50LmluZGV4T2YoJ3Njcm9sbGJhcicpID49IDBcbiAgICAgIFRleHRFZGl0b3IuZGlkVXBkYXRlU2Nyb2xsYmFyU3R5bGVzKClcblxuICB1cGRhdGVQcm9jZXNzRW52QW5kVHJpZ2dlckhvb2tzOiAtPlxuICAgIEB1cGRhdGVQcm9jZXNzRW52KEBnZXRMb2FkU2V0dGluZ3MoKS5lbnYpLnRoZW4gPT5cbiAgICAgIEBzaGVsbEVudmlyb25tZW50TG9hZGVkID0gdHJ1ZVxuICAgICAgQGVtaXR0ZXIuZW1pdCgnbG9hZGVkLXNoZWxsLWVudmlyb25tZW50JylcbiAgICAgIEBwYWNrYWdlcy50cmlnZ2VyQWN0aXZhdGlvbkhvb2soJ2NvcmU6bG9hZGVkLXNoZWxsLWVudmlyb25tZW50JylcblxuICAjIyNcbiAgU2VjdGlvbjogTWVzc2FnaW5nIHRoZSBVc2VyXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBWaXN1YWxseSBhbmQgYXVkaWJseSB0cmlnZ2VyIGEgYmVlcC5cbiAgYmVlcDogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5wbGF5QmVlcFNvdW5kKCkgaWYgQGNvbmZpZy5nZXQoJ2NvcmUuYXVkaW9CZWVwJylcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtYmVlcCdcblxuICAjIEVzc2VudGlhbDogQSBmbGV4aWJsZSB3YXkgdG8gb3BlbiBhIGRpYWxvZyBha2luIHRvIGFuIGFsZXJ0IGRpYWxvZy5cbiAgI1xuICAjICMjIEV4YW1wbGVzXG4gICNcbiAgIyBgYGBjb2ZmZWVcbiAgIyBhdG9tLmNvbmZpcm1cbiAgIyAgIG1lc3NhZ2U6ICdIb3cgeW91IGZlZWxpbmc/J1xuICAjICAgZGV0YWlsZWRNZXNzYWdlOiAnQmUgaG9uZXN0LidcbiAgIyAgIGJ1dHRvbnM6XG4gICMgICAgIEdvb2Q6IC0+IHdpbmRvdy5hbGVydCgnZ29vZCB0byBoZWFyJylcbiAgIyAgICAgQmFkOiAtPiB3aW5kb3cuYWxlcnQoJ2J1bW1lcicpXG4gICMgYGBgXG4gICNcbiAgIyAqIGBvcHRpb25zYCBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYG1lc3NhZ2VgIFRoZSB7U3RyaW5nfSBtZXNzYWdlIHRvIGRpc3BsYXkuXG4gICMgICAqIGBkZXRhaWxlZE1lc3NhZ2VgIChvcHRpb25hbCkgVGhlIHtTdHJpbmd9IGRldGFpbGVkIG1lc3NhZ2UgdG8gZGlzcGxheS5cbiAgIyAgICogYGJ1dHRvbnNgIChvcHRpb25hbCkgRWl0aGVyIGFuIGFycmF5IG9mIHN0cmluZ3Mgb3IgYW4gb2JqZWN0IHdoZXJlIGtleXMgYXJlXG4gICMgICAgIGJ1dHRvbiBuYW1lcyBhbmQgdGhlIHZhbHVlcyBhcmUgY2FsbGJhY2tzIHRvIGludm9rZSB3aGVuIGNsaWNrZWQuXG4gICNcbiAgIyBSZXR1cm5zIHRoZSBjaG9zZW4gYnV0dG9uIGluZGV4IHtOdW1iZXJ9IGlmIHRoZSBidXR0b25zIG9wdGlvbiB3YXMgYW4gYXJyYXkuXG4gIGNvbmZpcm06IChwYXJhbXM9e30pIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuY29uZmlybShwYXJhbXMpXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1hbmFnaW5nIHRoZSBEZXYgVG9vbHNcbiAgIyMjXG5cbiAgIyBFeHRlbmRlZDogT3BlbiB0aGUgZGV2IHRvb2xzIGZvciB0aGUgY3VycmVudCB3aW5kb3cuXG4gICNcbiAgIyBSZXR1cm5zIGEge1Byb21pc2V9IHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgRGV2VG9vbHMgaGF2ZSBiZWVuIG9wZW5lZC5cbiAgb3BlbkRldlRvb2xzOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9wZW5XaW5kb3dEZXZUb29scygpXG5cbiAgIyBFeHRlbmRlZDogVG9nZ2xlIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSBkZXYgdG9vbHMgZm9yIHRoZSBjdXJyZW50IHdpbmRvdy5cbiAgI1xuICAjIFJldHVybnMgYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBEZXZUb29scyBoYXZlIGJlZW4gb3BlbmVkIG9yXG4gICMgY2xvc2VkLlxuICB0b2dnbGVEZXZUb29sczogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS50b2dnbGVXaW5kb3dEZXZUb29scygpXG5cbiAgIyBFeHRlbmRlZDogRXhlY3V0ZSBjb2RlIGluIGRldiB0b29scy5cbiAgZXhlY3V0ZUphdmFTY3JpcHRJbkRldlRvb2xzOiAoY29kZSkgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5leGVjdXRlSmF2YVNjcmlwdEluV2luZG93RGV2VG9vbHMoY29kZSlcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZVxuICAjIyNcblxuICBhc3NlcnQ6IChjb25kaXRpb24sIG1lc3NhZ2UsIGNhbGxiYWNrT3JNZXRhZGF0YSkgLT5cbiAgICByZXR1cm4gdHJ1ZSBpZiBjb25kaXRpb25cblxuICAgIGVycm9yID0gbmV3IEVycm9yKFwiQXNzZXJ0aW9uIGZhaWxlZDogI3ttZXNzYWdlfVwiKVxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKGVycm9yLCBAYXNzZXJ0KVxuXG4gICAgaWYgY2FsbGJhY2tPck1ldGFkYXRhP1xuICAgICAgaWYgdHlwZW9mIGNhbGxiYWNrT3JNZXRhZGF0YSBpcyAnZnVuY3Rpb24nXG4gICAgICAgIGNhbGxiYWNrT3JNZXRhZGF0YT8oZXJyb3IpXG4gICAgICBlbHNlXG4gICAgICAgIGVycm9yLm1ldGFkYXRhID0gY2FsbGJhY2tPck1ldGFkYXRhXG5cbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtZmFpbC1hc3NlcnRpb24nLCBlcnJvclxuICAgIHVubGVzcyBAaXNSZWxlYXNlZFZlcnNpb24oKVxuICAgICAgdGhyb3cgZXJyb3JcblxuICAgIGZhbHNlXG5cbiAgbG9hZFRoZW1lczogLT5cbiAgICBAdGhlbWVzLmxvYWQoKVxuXG4gICMgTm90aWZ5IHRoZSBicm93c2VyIHByb2plY3Qgb2YgdGhlIHdpbmRvdydzIGN1cnJlbnQgcHJvamVjdCBwYXRoXG4gIHdhdGNoUHJvamVjdFBhdGhzOiAtPlxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQHByb2plY3Qub25EaWRDaGFuZ2VQYXRocyA9PlxuICAgICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0UmVwcmVzZW50ZWREaXJlY3RvcnlQYXRocyhAcHJvamVjdC5nZXRQYXRocygpKVxuXG4gIHNldERvY3VtZW50RWRpdGVkOiAoZWRpdGVkKSAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnNldFdpbmRvd0RvY3VtZW50RWRpdGVkPyhlZGl0ZWQpXG5cbiAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZTogKGZpbGVuYW1lKSAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnNldFdpbmRvd1JlcHJlc2VudGVkRmlsZW5hbWU/KGZpbGVuYW1lKVxuXG4gIGFkZFByb2plY3RGb2xkZXI6IC0+XG4gICAgQHBpY2tGb2xkZXIgKHNlbGVjdGVkUGF0aHMgPSBbXSkgPT5cbiAgICAgIEBhZGRUb1Byb2plY3Qoc2VsZWN0ZWRQYXRocylcblxuICBhZGRUb1Byb2plY3Q6IChwcm9qZWN0UGF0aHMpIC0+XG4gICAgQGxvYWRTdGF0ZShAZ2V0U3RhdGVLZXkocHJvamVjdFBhdGhzKSkudGhlbiAoc3RhdGUpID0+XG4gICAgICBpZiBzdGF0ZSBhbmQgQHByb2plY3QuZ2V0UGF0aHMoKS5sZW5ndGggaXMgMFxuICAgICAgICBAYXR0ZW1wdFJlc3RvcmVQcm9qZWN0U3RhdGVGb3JQYXRocyhzdGF0ZSwgcHJvamVjdFBhdGhzKVxuICAgICAgZWxzZVxuICAgICAgICBAcHJvamVjdC5hZGRQYXRoKGZvbGRlcikgZm9yIGZvbGRlciBpbiBwcm9qZWN0UGF0aHNcblxuICBhdHRlbXB0UmVzdG9yZVByb2plY3RTdGF0ZUZvclBhdGhzOiAoc3RhdGUsIHByb2plY3RQYXRocywgZmlsZXNUb09wZW4gPSBbXSkgLT5cbiAgICBjZW50ZXIgPSBAd29ya3NwYWNlLmdldENlbnRlcigpXG4gICAgd2luZG93SXNVbnVzZWQgPSA9PlxuICAgICAgZm9yIGNvbnRhaW5lciBpbiBAd29ya3NwYWNlLmdldFBhbmVDb250YWluZXJzKClcbiAgICAgICAgZm9yIGl0ZW0gaW4gY29udGFpbmVyLmdldFBhbmVJdGVtcygpXG4gICAgICAgICAgaWYgaXRlbSBpbnN0YW5jZW9mIFRleHRFZGl0b3JcbiAgICAgICAgICAgIHJldHVybiBmYWxzZSBpZiBpdGVtLmdldFBhdGgoKSBvciBpdGVtLmlzTW9kaWZpZWQoKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBmYWxzZSBpZiBjb250YWluZXIgaXMgY2VudGVyXG4gICAgICB0cnVlXG5cbiAgICBpZiB3aW5kb3dJc1VudXNlZCgpXG4gICAgICBAcmVzdG9yZVN0YXRlSW50b1RoaXNFbnZpcm9ubWVudChzdGF0ZSlcbiAgICAgIFByb21pc2UuYWxsIChAd29ya3NwYWNlLm9wZW4oZmlsZSkgZm9yIGZpbGUgaW4gZmlsZXNUb09wZW4pXG4gICAgZWxzZVxuICAgICAgbm91bnMgPSBpZiBwcm9qZWN0UGF0aHMubGVuZ3RoIGlzIDEgdGhlbiAnZm9sZGVyJyBlbHNlICdmb2xkZXJzJ1xuICAgICAgYnRuID0gQGNvbmZpcm1cbiAgICAgICAgbWVzc2FnZTogJ1ByZXZpb3VzIGF1dG9tYXRpY2FsbHktc2F2ZWQgcHJvamVjdCBzdGF0ZSBkZXRlY3RlZCdcbiAgICAgICAgZGV0YWlsZWRNZXNzYWdlOiBcIlRoZXJlIGlzIHByZXZpb3VzbHkgc2F2ZWQgc3RhdGUgZm9yIHRoZSBzZWxlY3RlZCAje25vdW5zfS4gXCIgK1xuICAgICAgICAgIFwiV291bGQgeW91IGxpa2UgdG8gYWRkIHRoZSAje25vdW5zfSB0byB0aGlzIHdpbmRvdywgcGVybWFuZW50bHkgZGlzY2FyZGluZyB0aGUgc2F2ZWQgc3RhdGUsIFwiICtcbiAgICAgICAgICBcIm9yIG9wZW4gdGhlICN7bm91bnN9IGluIGEgbmV3IHdpbmRvdywgcmVzdG9yaW5nIHRoZSBzYXZlZCBzdGF0ZT9cIlxuICAgICAgICBidXR0b25zOiBbXG4gICAgICAgICAgJ09wZW4gaW4gbmV3IHdpbmRvdyBhbmQgcmVjb3ZlciBzdGF0ZSdcbiAgICAgICAgICAnQWRkIHRvIHRoaXMgd2luZG93IGFuZCBkaXNjYXJkIHN0YXRlJ1xuICAgICAgICBdXG4gICAgICBpZiBidG4gaXMgMFxuICAgICAgICBAb3BlblxuICAgICAgICAgIHBhdGhzVG9PcGVuOiBwcm9qZWN0UGF0aHMuY29uY2F0KGZpbGVzVG9PcGVuKVxuICAgICAgICAgIG5ld1dpbmRvdzogdHJ1ZVxuICAgICAgICAgIGRldk1vZGU6IEBpbkRldk1vZGUoKVxuICAgICAgICAgIHNhZmVNb2RlOiBAaW5TYWZlTW9kZSgpXG4gICAgICAgIFByb21pc2UucmVzb2x2ZShudWxsKVxuICAgICAgZWxzZSBpZiBidG4gaXMgMVxuICAgICAgICBAcHJvamVjdC5hZGRQYXRoKHNlbGVjdGVkUGF0aCkgZm9yIHNlbGVjdGVkUGF0aCBpbiBwcm9qZWN0UGF0aHNcbiAgICAgICAgUHJvbWlzZS5hbGwgKEB3b3Jrc3BhY2Uub3BlbihmaWxlKSBmb3IgZmlsZSBpbiBmaWxlc1RvT3BlbilcblxuICByZXN0b3JlU3RhdGVJbnRvVGhpc0Vudmlyb25tZW50OiAoc3RhdGUpIC0+XG4gICAgc3RhdGUuZnVsbFNjcmVlbiA9IEBpc0Z1bGxTY3JlZW4oKVxuICAgIHBhbmUuZGVzdHJveSgpIGZvciBwYW5lIGluIEB3b3Jrc3BhY2UuZ2V0UGFuZXMoKVxuICAgIEBkZXNlcmlhbGl6ZShzdGF0ZSlcblxuICBzaG93U2F2ZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKEBzaG93U2F2ZURpYWxvZ1N5bmMoKSlcblxuICBzaG93U2F2ZURpYWxvZ1N5bmM6IChvcHRpb25zPXt9KSAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnNob3dTYXZlRGlhbG9nKG9wdGlvbnMpXG5cbiAgc2F2ZVN0YXRlOiAob3B0aW9ucywgc3RvcmFnZUtleSkgLT5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgaWYgQGVuYWJsZVBlcnNpc3RlbmNlIGFuZCBAcHJvamVjdFxuICAgICAgICBzdGF0ZSA9IEBzZXJpYWxpemUob3B0aW9ucylcbiAgICAgICAgc2F2ZVByb21pc2UgPVxuICAgICAgICAgIGlmIHN0b3JhZ2VLZXkgPz0gQGdldFN0YXRlS2V5KEBwcm9qZWN0Py5nZXRQYXRocygpKVxuICAgICAgICAgICAgQHN0YXRlU3RvcmUuc2F2ZShzdG9yYWdlS2V5LCBzdGF0ZSlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5zZXRUZW1wb3JhcnlXaW5kb3dTdGF0ZShzdGF0ZSlcbiAgICAgICAgc2F2ZVByb21pc2UuY2F0Y2gocmVqZWN0KS50aGVuKHJlc29sdmUpXG4gICAgICBlbHNlXG4gICAgICAgIHJlc29sdmUoKVxuXG4gIGxvYWRTdGF0ZTogKHN0YXRlS2V5KSAtPlxuICAgIGlmIEBlbmFibGVQZXJzaXN0ZW5jZVxuICAgICAgaWYgc3RhdGVLZXkgPz0gQGdldFN0YXRlS2V5KEBnZXRMb2FkU2V0dGluZ3MoKS5pbml0aWFsUGF0aHMpXG4gICAgICAgIEBzdGF0ZVN0b3JlLmxvYWQoc3RhdGVLZXkpLnRoZW4gKHN0YXRlKSA9PlxuICAgICAgICAgIGlmIHN0YXRlXG4gICAgICAgICAgICBzdGF0ZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICMgVE9ETzogcmVtb3ZlIHRoaXMgd2hlbiBldmVyeSB1c2VyIGhhcyBtaWdyYXRlZCB0byB0aGUgSW5kZXhlZERiIHN0YXRlIHN0b3JlLlxuICAgICAgICAgICAgQGdldFN0b3JhZ2VGb2xkZXIoKS5sb2FkKHN0YXRlS2V5KVxuICAgICAgZWxzZVxuICAgICAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRUZW1wb3JhcnlXaW5kb3dTdGF0ZSgpXG4gICAgZWxzZVxuICAgICAgUHJvbWlzZS5yZXNvbHZlKG51bGwpXG5cbiAgZGVzZXJpYWxpemU6IChzdGF0ZSkgLT5cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkgdW5sZXNzIHN0YXRlP1xuXG4gICAgaWYgZ3JhbW1hck92ZXJyaWRlc0J5UGF0aCA9IHN0YXRlLmdyYW1tYXJzPy5ncmFtbWFyT3ZlcnJpZGVzQnlQYXRoXG4gICAgICBAZ3JhbW1hcnMuZ3JhbW1hck92ZXJyaWRlc0J5UGF0aCA9IGdyYW1tYXJPdmVycmlkZXNCeVBhdGhcblxuICAgIEBzZXRGdWxsU2NyZWVuKHN0YXRlLmZ1bGxTY3JlZW4pXG5cbiAgICBAcGFja2FnZXMucGFja2FnZVN0YXRlcyA9IHN0YXRlLnBhY2thZ2VTdGF0ZXMgPyB7fVxuXG4gICAgc3RhcnRUaW1lID0gRGF0ZS5ub3coKVxuICAgIGlmIHN0YXRlLnByb2plY3Q/XG4gICAgICBwcm9qZWN0UHJvbWlzZSA9IEBwcm9qZWN0LmRlc2VyaWFsaXplKHN0YXRlLnByb2plY3QsIEBkZXNlcmlhbGl6ZXJzKVxuICAgIGVsc2VcbiAgICAgIHByb2plY3RQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKClcblxuICAgIHByb2plY3RQcm9taXNlLnRoZW4gPT5cbiAgICAgIEBkZXNlcmlhbGl6ZVRpbWluZ3MucHJvamVjdCA9IERhdGUubm93KCkgLSBzdGFydFRpbWVcblxuICAgICAgQHRleHRFZGl0b3JzLmRlc2VyaWFsaXplKHN0YXRlLnRleHRFZGl0b3JzKSBpZiBzdGF0ZS50ZXh0RWRpdG9yc1xuXG4gICAgICBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG4gICAgICBAd29ya3NwYWNlLmRlc2VyaWFsaXplKHN0YXRlLndvcmtzcGFjZSwgQGRlc2VyaWFsaXplcnMpIGlmIHN0YXRlLndvcmtzcGFjZT9cbiAgICAgIEBkZXNlcmlhbGl6ZVRpbWluZ3Mud29ya3NwYWNlID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxuXG4gIGdldFN0YXRlS2V5OiAocGF0aHMpIC0+XG4gICAgaWYgcGF0aHM/Lmxlbmd0aCA+IDBcbiAgICAgIHNoYTEgPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShwYXRocy5zbGljZSgpLnNvcnQoKS5qb2luKFwiXFxuXCIpKS5kaWdlc3QoJ2hleCcpXG4gICAgICBcImVkaXRvci0je3NoYTF9XCJcbiAgICBlbHNlXG4gICAgICBudWxsXG5cbiAgZ2V0U3RvcmFnZUZvbGRlcjogLT5cbiAgICBAc3RvcmFnZUZvbGRlciA/PSBuZXcgU3RvcmFnZUZvbGRlcihAZ2V0Q29uZmlnRGlyUGF0aCgpKVxuXG4gIGdldENvbmZpZ0RpclBhdGg6IC0+XG4gICAgQGNvbmZpZ0RpclBhdGggPz0gcHJvY2Vzcy5lbnYuQVRPTV9IT01FXG5cbiAgZ2V0VXNlckluaXRTY3JpcHRQYXRoOiAtPlxuICAgIGluaXRTY3JpcHRQYXRoID0gZnMucmVzb2x2ZShAZ2V0Q29uZmlnRGlyUGF0aCgpLCAnaW5pdCcsIFsnanMnLCAnY29mZmVlJ10pXG4gICAgaW5pdFNjcmlwdFBhdGggPyBwYXRoLmpvaW4oQGdldENvbmZpZ0RpclBhdGgoKSwgJ2luaXQuY29mZmVlJylcblxuICByZXF1aXJlVXNlckluaXRTY3JpcHQ6IC0+XG4gICAgaWYgdXNlckluaXRTY3JpcHRQYXRoID0gQGdldFVzZXJJbml0U2NyaXB0UGF0aCgpXG4gICAgICB0cnlcbiAgICAgICAgcmVxdWlyZSh1c2VySW5pdFNjcmlwdFBhdGgpIGlmIGZzLmlzRmlsZVN5bmModXNlckluaXRTY3JpcHRQYXRoKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgQG5vdGlmaWNhdGlvbnMuYWRkRXJyb3IgXCJGYWlsZWQgdG8gbG9hZCBgI3t1c2VySW5pdFNjcmlwdFBhdGh9YFwiLFxuICAgICAgICAgIGRldGFpbDogZXJyb3IubWVzc2FnZVxuICAgICAgICAgIGRpc21pc3NhYmxlOiB0cnVlXG5cbiAgIyBUT0RPOiBXZSBzaG91bGQgZGVwcmVjYXRlIHRoZSB1cGRhdGUgZXZlbnRzIGhlcmUsIGFuZCB1c2UgYGF0b20uYXV0b1VwZGF0ZXJgIGluc3RlYWRcbiAgb25VcGRhdGVBdmFpbGFibGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAndXBkYXRlLWF2YWlsYWJsZScsIGNhbGxiYWNrXG5cbiAgdXBkYXRlQXZhaWxhYmxlOiAoZGV0YWlscykgLT5cbiAgICBAZW1pdHRlci5lbWl0ICd1cGRhdGUtYXZhaWxhYmxlJywgZGV0YWlsc1xuXG4gIGxpc3RlbkZvclVwZGF0ZXM6IC0+XG4gICAgIyBsaXN0ZW4gZm9yIHVwZGF0ZXMgYXZhaWxhYmxlIGxvY2FsbHkgKHRoYXQgaGF2ZSBiZWVuIHN1Y2Nlc3NmdWxseSBkb3dubG9hZGVkKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQoQGF1dG9VcGRhdGVyLm9uRGlkQ29tcGxldGVEb3dubG9hZGluZ1VwZGF0ZShAdXBkYXRlQXZhaWxhYmxlLmJpbmQodGhpcykpKVxuXG4gIHNldEJvZHlQbGF0Zm9ybUNsYXNzOiAtPlxuICAgIEBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoXCJwbGF0Zm9ybS0je3Byb2Nlc3MucGxhdGZvcm19XCIpXG5cbiAgc2V0QXV0b0hpZGVNZW51QmFyOiAoYXV0b0hpZGUpIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0QXV0b0hpZGVXaW5kb3dNZW51QmFyKGF1dG9IaWRlKVxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnNldFdpbmRvd01lbnVCYXJWaXNpYmlsaXR5KG5vdCBhdXRvSGlkZSlcblxuICBkaXNwYXRjaEFwcGxpY2F0aW9uTWVudUNvbW1hbmQ6IChjb21tYW5kLCBhcmcpIC0+XG4gICAgYWN0aXZlRWxlbWVudCA9IEBkb2N1bWVudC5hY3RpdmVFbGVtZW50XG4gICAgIyBVc2UgdGhlIHdvcmtzcGFjZSBlbGVtZW50IGlmIGJvZHkgaGFzIGZvY3VzXG4gICAgaWYgYWN0aXZlRWxlbWVudCBpcyBAZG9jdW1lbnQuYm9keVxuICAgICAgYWN0aXZlRWxlbWVudCA9IEB3b3Jrc3BhY2UuZ2V0RWxlbWVudCgpXG4gICAgQGNvbW1hbmRzLmRpc3BhdGNoKGFjdGl2ZUVsZW1lbnQsIGNvbW1hbmQsIGFyZylcblxuICBkaXNwYXRjaENvbnRleHRNZW51Q29tbWFuZDogKGNvbW1hbmQsIGFyZ3MuLi4pIC0+XG4gICAgQGNvbW1hbmRzLmRpc3BhdGNoKEBjb250ZXh0TWVudS5hY3RpdmVFbGVtZW50LCBjb21tYW5kLCBhcmdzKVxuXG4gIG9wZW5Mb2NhdGlvbnM6IChsb2NhdGlvbnMpIC0+XG4gICAgbmVlZHNQcm9qZWN0UGF0aHMgPSBAcHJvamVjdD8uZ2V0UGF0aHMoKS5sZW5ndGggaXMgMFxuXG4gICAgZm9sZGVyc1RvQWRkVG9Qcm9qZWN0ID0gW11cbiAgICBmaWxlTG9jYXRpb25zVG9PcGVuID0gW11cblxuICAgIHB1c2hGb2xkZXJUb09wZW4gPSAoZm9sZGVyKSAtPlxuICAgICAgaWYgZm9sZGVyIG5vdCBpbiBmb2xkZXJzVG9BZGRUb1Byb2plY3RcbiAgICAgICAgZm9sZGVyc1RvQWRkVG9Qcm9qZWN0LnB1c2goZm9sZGVyKVxuXG4gICAgZm9yIHtwYXRoVG9PcGVuLCBpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbiwgZm9yY2VBZGRUb1dpbmRvd30gaW4gbG9jYXRpb25zXG4gICAgICBpZiBwYXRoVG9PcGVuPyBhbmQgKG5lZWRzUHJvamVjdFBhdGhzIG9yIGZvcmNlQWRkVG9XaW5kb3cpXG4gICAgICAgIGlmIGZzLmV4aXN0c1N5bmMocGF0aFRvT3BlbilcbiAgICAgICAgICBwdXNoRm9sZGVyVG9PcGVuIEBwcm9qZWN0LmdldERpcmVjdG9yeUZvclByb2plY3RQYXRoKHBhdGhUb09wZW4pLmdldFBhdGgoKVxuICAgICAgICBlbHNlIGlmIGZzLmV4aXN0c1N5bmMocGF0aC5kaXJuYW1lKHBhdGhUb09wZW4pKVxuICAgICAgICAgIHB1c2hGb2xkZXJUb09wZW4gQHByb2plY3QuZ2V0RGlyZWN0b3J5Rm9yUHJvamVjdFBhdGgocGF0aC5kaXJuYW1lKHBhdGhUb09wZW4pKS5nZXRQYXRoKClcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHB1c2hGb2xkZXJUb09wZW4gQHByb2plY3QuZ2V0RGlyZWN0b3J5Rm9yUHJvamVjdFBhdGgocGF0aFRvT3BlbikuZ2V0UGF0aCgpXG5cbiAgICAgIHVubGVzcyBmcy5pc0RpcmVjdG9yeVN5bmMocGF0aFRvT3BlbilcbiAgICAgICAgZmlsZUxvY2F0aW9uc1RvT3Blbi5wdXNoKHtwYXRoVG9PcGVuLCBpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbn0pXG5cbiAgICBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKG51bGwpXG4gICAgaWYgZm9sZGVyc1RvQWRkVG9Qcm9qZWN0Lmxlbmd0aCA+IDBcbiAgICAgIHByb21pc2UgPSBAbG9hZFN0YXRlKEBnZXRTdGF0ZUtleShmb2xkZXJzVG9BZGRUb1Byb2plY3QpKS50aGVuIChzdGF0ZSkgPT5cbiAgICAgICAgaWYgc3RhdGUgYW5kIG5lZWRzUHJvamVjdFBhdGhzICMgb25seSBsb2FkIHN0YXRlIGlmIHRoaXMgaXMgdGhlIGZpcnN0IHBhdGggYWRkZWQgdG8gdGhlIHByb2plY3RcbiAgICAgICAgICBmaWxlcyA9IChsb2NhdGlvbi5wYXRoVG9PcGVuIGZvciBsb2NhdGlvbiBpbiBmaWxlTG9jYXRpb25zVG9PcGVuKVxuICAgICAgICAgIEBhdHRlbXB0UmVzdG9yZVByb2plY3RTdGF0ZUZvclBhdGhzKHN0YXRlLCBmb2xkZXJzVG9BZGRUb1Byb2plY3QsIGZpbGVzKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgcHJvbWlzZXMgPSBbXVxuICAgICAgICAgIEBwcm9qZWN0LmFkZFBhdGgoZm9sZGVyKSBmb3IgZm9sZGVyIGluIGZvbGRlcnNUb0FkZFRvUHJvamVjdFxuICAgICAgICAgIGZvciB7cGF0aFRvT3BlbiwgaW5pdGlhbExpbmUsIGluaXRpYWxDb2x1bW59IGluIGZpbGVMb2NhdGlvbnNUb09wZW5cbiAgICAgICAgICAgIHByb21pc2VzLnB1c2ggQHdvcmtzcGFjZT8ub3BlbihwYXRoVG9PcGVuLCB7aW5pdGlhbExpbmUsIGluaXRpYWxDb2x1bW59KVxuICAgICAgICAgIFByb21pc2UuYWxsKHByb21pc2VzKVxuICAgIGVsc2VcbiAgICAgIHByb21pc2VzID0gW11cbiAgICAgIGZvciB7cGF0aFRvT3BlbiwgaW5pdGlhbExpbmUsIGluaXRpYWxDb2x1bW59IGluIGZpbGVMb2NhdGlvbnNUb09wZW5cbiAgICAgICAgcHJvbWlzZXMucHVzaCBAd29ya3NwYWNlPy5vcGVuKHBhdGhUb09wZW4sIHtpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbn0pXG4gICAgICBwcm9taXNlID0gUHJvbWlzZS5hbGwocHJvbWlzZXMpXG5cbiAgICBwcm9taXNlLnRoZW4gLT5cbiAgICAgIGlwY1JlbmRlcmVyLnNlbmQgJ3dpbmRvdy1jb21tYW5kJywgJ3dpbmRvdzpsb2NhdGlvbnMtb3BlbmVkJ1xuXG4gIHJlc29sdmVQcm94eTogKHVybCkgLT5cbiAgICByZXR1cm4gbmV3IFByb21pc2UgKHJlc29sdmUsIHJlamVjdCkgPT5cbiAgICAgIHJlcXVlc3RJZCA9IEBuZXh0UHJveHlSZXF1ZXN0SWQrK1xuICAgICAgZGlzcG9zYWJsZSA9IEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9uRGlkUmVzb2x2ZVByb3h5IChpZCwgcHJveHkpIC0+XG4gICAgICAgIGlmIGlkIGlzIHJlcXVlc3RJZFxuICAgICAgICAgIGRpc3Bvc2FibGUuZGlzcG9zZSgpXG4gICAgICAgICAgcmVzb2x2ZShwcm94eSlcblxuICAgICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUucmVzb2x2ZVByb3h5KHJlcXVlc3RJZCwgdXJsKVxuXG4jIFByZXNlcnZlIHRoaXMgZGVwcmVjYXRpb24gdW50aWwgMi4wLiBTb3JyeS4gU2hvdWxkIGhhdmUgcmVtb3ZlZCBRIHNvb25lci5cblByb21pc2UucHJvdG90eXBlLmRvbmUgPSAoY2FsbGJhY2spIC0+XG4gIGRlcHJlY2F0ZShcIkF0b20gbm93IHVzZXMgRVM2IFByb21pc2VzIGluc3RlYWQgb2YgUS4gQ2FsbCBwcm9taXNlLnRoZW4gaW5zdGVhZCBvZiBwcm9taXNlLmRvbmVcIilcbiAgQHRoZW4oY2FsbGJhY2spXG4iXX0=
