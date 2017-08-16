'use babel';

var _bind = Function.prototype.bind;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x6, _x7, _x8) { var _again = true; _function: while (_again) { var object = _x6, property = _x7, receiver = _x8; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x6 = parent; _x7 = property; _x8 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('underscore-plus');
var url = require('url');
var path = require('path');

var _require = require('event-kit');

var Emitter = _require.Emitter;
var Disposable = _require.Disposable;
var CompositeDisposable = _require.CompositeDisposable;

var fs = require('fs-plus');

var _require2 = require('pathwatcher');

var Directory = _require2.Directory;

var Grim = require('grim');
var DefaultDirectorySearcher = require('./default-directory-searcher');
var Dock = require('./dock');
var Model = require('./model');
var StateStore = require('./state-store');
var TextEditor = require('./text-editor');
var Panel = require('./panel');
var PanelContainer = require('./panel-container');
var Task = require('./task');
var WorkspaceCenter = require('./workspace-center');
var WorkspaceElement = require('./workspace-element');

var STOPPED_CHANGING_ACTIVE_PANE_ITEM_DELAY = 100;
var ALL_LOCATIONS = ['center', 'left', 'right', 'bottom'];

// Essential: Represents the state of the user interface for the entire window.
// An instance of this class is available via the `atom.workspace` global.
//
// Interact with this object to open files, be notified of current and future
// editors, and manipulate panes. To add panels, use {Workspace::addTopPanel}
// and friends.
//
// ## Workspace Items
//
// The term "item" refers to anything that can be displayed
// in a pane within the workspace, either in the {WorkspaceCenter} or in one
// of the three {Dock}s. The workspace expects items to conform to the
// following interface:
//
// ### Required Methods
//
// #### `getTitle()`
//
// Returns a {String} containing the title of the item to display on its
// associated tab.
//
// ### Optional Methods
//
// #### `getElement()`
//
// If your item already *is* a DOM element, you do not need to implement this
// method. Otherwise it should return the element you want to display to
// represent this item.
//
// #### `destroy()`
//
// Destroys the item. This will be called when the item is removed from its
// parent pane.
//
// #### `onDidDestroy(callback)`
//
// Called by the workspace so it can be notified when the item is destroyed.
// Must return a {Disposable}.
//
// #### `serialize()`
//
// Serialize the state of the item. Must return an object that can be passed to
// `JSON.stringify`. The state should include a field called `deserializer`,
// which names a deserializer declared in your `package.json`. This method is
// invoked on items when serializing the workspace so they can be restored to
// the same location later.
//
// #### `getURI()`
//
// Returns the URI associated with the item.
//
// #### `getLongTitle()`
//
// Returns a {String} containing a longer version of the title to display in
// places like the window title or on tabs their short titles are ambiguous.
//
// #### `onDidChangeTitle`
//
// Called by the workspace so it can be notified when the item's title changes.
// Must return a {Disposable}.
//
// #### `getIconName()`
//
// Return a {String} with the name of an icon. If this method is defined and
// returns a string, the item's tab element will be rendered with the `icon` and
// `icon-${iconName}` CSS classes.
//
// ### `onDidChangeIcon(callback)`
//
// Called by the workspace so it can be notified when the item's icon changes.
// Must return a {Disposable}.
//
// #### `getDefaultLocation()`
//
// Tells the workspace where your item should be opened in absence of a user
// override. Items can appear in the center or in a dock on the left, right, or
// bottom of the workspace.
//
// Returns a {String} with one of the following values: `'center'`, `'left'`,
// `'right'`, `'bottom'`. If this method is not defined, `'center'` is the
// default.
//
// #### `getAllowedLocations()`
//
// Tells the workspace where this item can be moved. Returns an {Array} of one
// or more of the following values: `'center'`, `'left'`, `'right'`, or
// `'bottom'`.
//
// #### `isPermanentDockItem()`
//
// Tells the workspace whether or not this item can be closed by the user by
// clicking an `x` on its tab. Use of this feature is discouraged unless there's
// a very good reason not to allow users to close your item. Items can be made
// permanent *only* when they are contained in docks. Center pane items can
// always be removed. Note that it is currently still possible to close dock
// items via the `Close Pane` option in the context menu and via Atom APIs, so
// you should still be prepared to handle your dock items being destroyed by the
// user even if you implement this method.
//
// #### `save()`
//
// Saves the item.
//
// #### `saveAs(path)`
//
// Saves the item to the specified path.
//
// #### `getPath()`
//
// Returns the local path associated with this item. This is only used to set
// the initial location of the "save as" dialog.
//
// #### `isModified()`
//
// Returns whether or not the item is modified to reflect modification in the
// UI.
//
// #### `onDidChangeModified()`
//
// Called by the workspace so it can be notified when item's modified status
// changes. Must return a {Disposable}.
//
// #### `copy()`
//
// Create a copy of the item. If defined, the workspace will call this method to
// duplicate the item when splitting panes via certain split commands.
//
// #### `getPreferredHeight()`
//
// If this item is displayed in the bottom {Dock}, called by the workspace when
// initially displaying the dock to set its height. Once the dock has been
// resized by the user, their height will override this value.
//
// Returns a {Number}.
//
// #### `getPreferredWidth()`
//
// If this item is displayed in the left or right {Dock}, called by the
// workspace when initially displaying the dock to set its width. Once the dock
// has been resized by the user, their width will override this value.
//
// Returns a {Number}.
//
// #### `onDidTerminatePendingState(callback)`
//
// If the workspace is configured to use *pending pane items*, the workspace
// will subscribe to this method to terminate the pending state of the item.
// Must return a {Disposable}.
//
// #### `shouldPromptToSave()`
//
// This method indicates whether Atom should prompt the user to save this item
// when the user closes or reloads the window. Returns a boolean.
module.exports = (function (_Model) {
  _inherits(Workspace, _Model);

  function Workspace(params) {
    _classCallCheck(this, Workspace);

    _get(Object.getPrototypeOf(Workspace.prototype), 'constructor', this).apply(this, arguments);

    this.updateWindowTitle = this.updateWindowTitle.bind(this);
    this.updateDocumentEdited = this.updateDocumentEdited.bind(this);
    this.didDestroyPaneItem = this.didDestroyPaneItem.bind(this);
    this.didChangeActivePaneOnPaneContainer = this.didChangeActivePaneOnPaneContainer.bind(this);
    this.didChangeActivePaneItemOnPaneContainer = this.didChangeActivePaneItemOnPaneContainer.bind(this);
    this.didActivatePaneContainer = this.didActivatePaneContainer.bind(this);
    this.didHideDock = this.didHideDock.bind(this);

    this.enablePersistence = params.enablePersistence;
    this.packageManager = params.packageManager;
    this.config = params.config;
    this.project = params.project;
    this.notificationManager = params.notificationManager;
    this.viewRegistry = params.viewRegistry;
    this.grammarRegistry = params.grammarRegistry;
    this.applicationDelegate = params.applicationDelegate;
    this.assert = params.assert;
    this.deserializerManager = params.deserializerManager;
    this.textEditorRegistry = params.textEditorRegistry;
    this.styleManager = params.styleManager;
    this.draggingItem = false;
    this.itemLocationStore = new StateStore('AtomPreviousItemLocations', 1);

    this.emitter = new Emitter();
    this.openers = [];
    this.destroyedItemURIs = [];
    this.stoppedChangingActivePaneItemTimeout = null;

    this.defaultDirectorySearcher = new DefaultDirectorySearcher();
    this.consumeServices(this.packageManager);

    this.paneContainers = {
      center: this.createCenter(),
      left: this.createDock('left'),
      right: this.createDock('right'),
      bottom: this.createDock('bottom')
    };
    this.activePaneContainer = this.paneContainers.center;
    this.hasActiveTextEditor = false;

    this.panelContainers = {
      top: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'top' }),
      left: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'left', dock: this.paneContainers.left }),
      right: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'right', dock: this.paneContainers.right }),
      bottom: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'bottom', dock: this.paneContainers.bottom }),
      header: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'header' }),
      footer: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'footer' }),
      modal: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'modal' })
    };

    this.subscribeToEvents();
  }

  _createClass(Workspace, [{
    key: 'getElement',
    value: function getElement() {
      if (!this.element) {
        this.element = new WorkspaceElement().initialize(this, {
          config: this.config,
          project: this.project,
          viewRegistry: this.viewRegistry,
          styleManager: this.styleManager
        });
      }
      return this.element;
    }
  }, {
    key: 'createCenter',
    value: function createCenter() {
      return new WorkspaceCenter({
        config: this.config,
        applicationDelegate: this.applicationDelegate,
        notificationManager: this.notificationManager,
        deserializerManager: this.deserializerManager,
        viewRegistry: this.viewRegistry,
        didActivate: this.didActivatePaneContainer,
        didChangeActivePane: this.didChangeActivePaneOnPaneContainer,
        didChangeActivePaneItem: this.didChangeActivePaneItemOnPaneContainer,
        didDestroyPaneItem: this.didDestroyPaneItem
      });
    }
  }, {
    key: 'createDock',
    value: function createDock(location) {
      return new Dock({
        location: location,
        config: this.config,
        applicationDelegate: this.applicationDelegate,
        deserializerManager: this.deserializerManager,
        notificationManager: this.notificationManager,
        viewRegistry: this.viewRegistry,
        didHide: this.didHideDock,
        didActivate: this.didActivatePaneContainer,
        didChangeActivePane: this.didChangeActivePaneOnPaneContainer,
        didChangeActivePaneItem: this.didChangeActivePaneItemOnPaneContainer,
        didDestroyPaneItem: this.didDestroyPaneItem
      });
    }
  }, {
    key: 'reset',
    value: function reset(packageManager) {
      this.packageManager = packageManager;
      this.emitter.dispose();
      this.emitter = new Emitter();

      this.paneContainers.center.destroy();
      this.paneContainers.left.destroy();
      this.paneContainers.right.destroy();
      this.paneContainers.bottom.destroy();

      _.values(this.panelContainers).forEach(function (panelContainer) {
        panelContainer.destroy();
      });

      this.paneContainers = {
        center: this.createCenter(),
        left: this.createDock('left'),
        right: this.createDock('right'),
        bottom: this.createDock('bottom')
      };
      this.activePaneContainer = this.paneContainers.center;
      this.hasActiveTextEditor = false;

      this.panelContainers = {
        top: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'top' }),
        left: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'left', dock: this.paneContainers.left }),
        right: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'right', dock: this.paneContainers.right }),
        bottom: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'bottom', dock: this.paneContainers.bottom }),
        header: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'header' }),
        footer: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'footer' }),
        modal: new PanelContainer({ viewRegistry: this.viewRegistry, location: 'modal' })
      };

      this.originalFontSize = null;
      this.openers = [];
      this.destroyedItemURIs = [];
      this.element = null;
      this.consumeServices(this.packageManager);
    }
  }, {
    key: 'subscribeToEvents',
    value: function subscribeToEvents() {
      this.project.onDidChangePaths(this.updateWindowTitle);
      this.subscribeToFontSize();
      this.subscribeToAddedItems();
      this.subscribeToMovedItems();
    }
  }, {
    key: 'consumeServices',
    value: function consumeServices(_ref) {
      var _this = this;

      var serviceHub = _ref.serviceHub;

      this.directorySearchers = [];
      serviceHub.consume('atom.directory-searcher', '^0.1.0', function (provider) {
        return _this.directorySearchers.unshift(provider);
      });
    }

    // Called by the Serializable mixin during serialization.
  }, {
    key: 'serialize',
    value: function serialize() {
      return {
        deserializer: 'Workspace',
        packagesWithActiveGrammars: this.getPackageNamesWithActiveGrammars(),
        destroyedItemURIs: this.destroyedItemURIs.slice(),
        // Ensure deserializing 1.17 state with pre 1.17 Atom does not error
        // TODO: Remove after 1.17 has been on stable for a while
        paneContainer: { version: 2 },
        paneContainers: {
          center: this.paneContainers.center.serialize(),
          left: this.paneContainers.left.serialize(),
          right: this.paneContainers.right.serialize(),
          bottom: this.paneContainers.bottom.serialize()
        }
      };
    }
  }, {
    key: 'deserialize',
    value: function deserialize(state, deserializerManager) {
      var packagesWithActiveGrammars = state.packagesWithActiveGrammars != null ? state.packagesWithActiveGrammars : [];
      for (var packageName of packagesWithActiveGrammars) {
        var pkg = this.packageManager.getLoadedPackage(packageName);
        if (pkg != null) {
          pkg.loadGrammarsSync();
        }
      }
      if (state.destroyedItemURIs != null) {
        this.destroyedItemURIs = state.destroyedItemURIs;
      }

      if (state.paneContainers) {
        this.paneContainers.center.deserialize(state.paneContainers.center, deserializerManager);
        this.paneContainers.left.deserialize(state.paneContainers.left, deserializerManager);
        this.paneContainers.right.deserialize(state.paneContainers.right, deserializerManager);
        this.paneContainers.bottom.deserialize(state.paneContainers.bottom, deserializerManager);
      } else if (state.paneContainer) {
        // TODO: Remove this fallback once a lot of time has passed since 1.17 was released
        this.paneContainers.center.deserialize(state.paneContainer, deserializerManager);
      }

      this.hasActiveTextEditor = this.getActiveTextEditor() != null;

      this.updateWindowTitle();
    }
  }, {
    key: 'getPackageNamesWithActiveGrammars',
    value: function getPackageNamesWithActiveGrammars() {
      var _this2 = this;

      var packageNames = [];
      var addGrammar = function addGrammar() {
        var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var includedGrammarScopes = _ref2.includedGrammarScopes;
        var packageName = _ref2.packageName;

        if (!packageName) {
          return;
        }
        // Prevent cycles
        if (packageNames.indexOf(packageName) !== -1) {
          return;
        }

        packageNames.push(packageName);
        for (var scopeName of includedGrammarScopes != null ? includedGrammarScopes : []) {
          addGrammar(_this2.grammarRegistry.grammarForScopeName(scopeName));
        }
      };

      var editors = this.getTextEditors();
      for (var editor of editors) {
        addGrammar(editor.getGrammar());
      }

      if (editors.length > 0) {
        for (var grammar of this.grammarRegistry.getGrammars()) {
          if (grammar.injectionSelector) {
            addGrammar(grammar);
          }
        }
      }

      return _.uniq(packageNames);
    }
  }, {
    key: 'didActivatePaneContainer',
    value: function didActivatePaneContainer(paneContainer) {
      if (paneContainer !== this.getActivePaneContainer()) {
        this.activePaneContainer = paneContainer;
        this.didChangeActivePaneItem(this.activePaneContainer.getActivePaneItem());
        this.emitter.emit('did-change-active-pane-container', this.activePaneContainer);
        this.emitter.emit('did-change-active-pane', this.activePaneContainer.getActivePane());
        this.emitter.emit('did-change-active-pane-item', this.activePaneContainer.getActivePaneItem());
      }
    }
  }, {
    key: 'didChangeActivePaneOnPaneContainer',
    value: function didChangeActivePaneOnPaneContainer(paneContainer, pane) {
      if (paneContainer === this.getActivePaneContainer()) {
        this.emitter.emit('did-change-active-pane', pane);
      }
    }
  }, {
    key: 'didChangeActivePaneItemOnPaneContainer',
    value: function didChangeActivePaneItemOnPaneContainer(paneContainer, item) {
      if (paneContainer === this.getActivePaneContainer()) {
        this.didChangeActivePaneItem(item);
        this.emitter.emit('did-change-active-pane-item', item);
      }

      if (paneContainer === this.getCenter()) {
        var hadActiveTextEditor = this.hasActiveTextEditor;
        this.hasActiveTextEditor = item instanceof TextEditor;

        if (this.hasActiveTextEditor || hadActiveTextEditor) {
          var itemValue = this.hasActiveTextEditor ? item : undefined;
          this.emitter.emit('did-change-active-text-editor', itemValue);
        }
      }
    }
  }, {
    key: 'didChangeActivePaneItem',
    value: function didChangeActivePaneItem(item) {
      var _this3 = this;

      this.updateWindowTitle();
      this.updateDocumentEdited();
      if (this.activeItemSubscriptions) this.activeItemSubscriptions.dispose();
      this.activeItemSubscriptions = new CompositeDisposable();

      var modifiedSubscription = undefined,
          titleSubscription = undefined;

      if (item != null && typeof item.onDidChangeTitle === 'function') {
        titleSubscription = item.onDidChangeTitle(this.updateWindowTitle);
      } else if (item != null && typeof item.on === 'function') {
        titleSubscription = item.on('title-changed', this.updateWindowTitle);
        if (titleSubscription == null || typeof titleSubscription.dispose !== 'function') {
          titleSubscription = new Disposable(function () {
            item.off('title-changed', _this3.updateWindowTitle);
          });
        }
      }

      if (item != null && typeof item.onDidChangeModified === 'function') {
        modifiedSubscription = item.onDidChangeModified(this.updateDocumentEdited);
      } else if (item != null && typeof item.on === 'function') {
        modifiedSubscription = item.on('modified-status-changed', this.updateDocumentEdited);
        if (modifiedSubscription == null || typeof modifiedSubscription.dispose !== 'function') {
          modifiedSubscription = new Disposable(function () {
            item.off('modified-status-changed', _this3.updateDocumentEdited);
          });
        }
      }

      if (titleSubscription != null) {
        this.activeItemSubscriptions.add(titleSubscription);
      }
      if (modifiedSubscription != null) {
        this.activeItemSubscriptions.add(modifiedSubscription);
      }

      this.cancelStoppedChangingActivePaneItemTimeout();
      this.stoppedChangingActivePaneItemTimeout = setTimeout(function () {
        _this3.stoppedChangingActivePaneItemTimeout = null;
        _this3.emitter.emit('did-stop-changing-active-pane-item', item);
      }, STOPPED_CHANGING_ACTIVE_PANE_ITEM_DELAY);
    }
  }, {
    key: 'cancelStoppedChangingActivePaneItemTimeout',
    value: function cancelStoppedChangingActivePaneItemTimeout() {
      if (this.stoppedChangingActivePaneItemTimeout != null) {
        clearTimeout(this.stoppedChangingActivePaneItemTimeout);
      }
    }
  }, {
    key: 'didHideDock',
    value: function didHideDock(dock) {
      var activeElement = document.activeElement;

      var dockElement = dock.getElement();
      if (dockElement === activeElement || dockElement.contains(activeElement)) {
        this.getCenter().activate();
      }
    }
  }, {
    key: 'setDraggingItem',
    value: function setDraggingItem(draggingItem) {
      _.values(this.paneContainers).forEach(function (dock) {
        dock.setDraggingItem(draggingItem);
      });
    }
  }, {
    key: 'subscribeToAddedItems',
    value: function subscribeToAddedItems() {
      var _this4 = this;

      this.onDidAddPaneItem(function (_ref3) {
        var item = _ref3.item;
        var pane = _ref3.pane;
        var index = _ref3.index;

        if (item instanceof TextEditor) {
          (function () {
            var subscriptions = new CompositeDisposable(_this4.textEditorRegistry.add(item), _this4.textEditorRegistry.maintainGrammar(item), _this4.textEditorRegistry.maintainConfig(item), item.observeGrammar(_this4.handleGrammarUsed.bind(_this4)));
            item.onDidDestroy(function () {
              subscriptions.dispose();
            });
            _this4.emitter.emit('did-add-text-editor', { textEditor: item, pane: pane, index: index });
          })();
        }
      });
    }
  }, {
    key: 'subscribeToMovedItems',
    value: function subscribeToMovedItems() {
      var _this5 = this;

      var _loop = function (paneContainer) {
        paneContainer.observePanes(function (pane) {
          pane.onDidAddItem(function (_ref4) {
            var item = _ref4.item;

            if (typeof item.getURI === 'function' && _this5.enablePersistence) {
              var uri = item.getURI();
              if (uri) {
                var _location = paneContainer.getLocation();
                var defaultLocation = undefined;
                if (typeof item.getDefaultLocation === 'function') {
                  defaultLocation = item.getDefaultLocation();
                }
                defaultLocation = defaultLocation || 'center';
                if (_location === defaultLocation) {
                  _this5.itemLocationStore['delete'](item.getURI());
                } else {
                  _this5.itemLocationStore.save(item.getURI(), _location);
                }
              }
            }
          });
        });
      };

      for (var paneContainer of this.getPaneContainers()) {
        _loop(paneContainer);
      }
    }

    // Updates the application's title and proxy icon based on whichever file is
    // open.
  }, {
    key: 'updateWindowTitle',
    value: function updateWindowTitle() {
      var itemPath = undefined,
          itemTitle = undefined,
          projectPath = undefined,
          representedPath = undefined;
      var appName = 'Atom';
      var left = this.project.getPaths();
      var projectPaths = left != null ? left : [];
      var item = this.getActivePaneItem();
      if (item) {
        itemPath = typeof item.getPath === 'function' ? item.getPath() : undefined;
        var longTitle = typeof item.getLongTitle === 'function' ? item.getLongTitle() : undefined;
        itemTitle = longTitle == null ? typeof item.getTitle === 'function' ? item.getTitle() : undefined : longTitle;
        projectPath = _.find(projectPaths, function (projectPath) {
          return itemPath === projectPath || (itemPath != null ? itemPath.startsWith(projectPath + path.sep) : undefined);
        });
      }
      if (itemTitle == null) {
        itemTitle = 'untitled';
      }
      if (projectPath == null) {
        projectPath = itemPath ? path.dirname(itemPath) : projectPaths[0];
      }
      if (projectPath != null) {
        projectPath = fs.tildify(projectPath);
      }

      var titleParts = [];
      if (item != null && projectPath != null) {
        titleParts.push(itemTitle, projectPath);
        representedPath = itemPath != null ? itemPath : projectPath;
      } else if (projectPath != null) {
        titleParts.push(projectPath);
        representedPath = projectPath;
      } else {
        titleParts.push(itemTitle);
        representedPath = '';
      }

      if (process.platform !== 'darwin') {
        titleParts.push(appName);
      }

      document.title = titleParts.join(' — ');
      this.applicationDelegate.setRepresentedFilename(representedPath);
    }

    // On macOS, fades the application window's proxy icon when the current file
    // has been modified.
  }, {
    key: 'updateDocumentEdited',
    value: function updateDocumentEdited() {
      var activePaneItem = this.getActivePaneItem();
      var modified = activePaneItem != null && typeof activePaneItem.isModified === 'function' ? activePaneItem.isModified() || false : false;
      this.applicationDelegate.setWindowDocumentEdited(modified);
    }

    /*
    Section: Event Subscription
    */

  }, {
    key: 'onDidChangeActivePaneContainer',
    value: function onDidChangeActivePaneContainer(callback) {
      return this.emitter.on('did-change-active-pane-container', callback);
    }

    // Essential: Invoke the given callback with all current and future text
    // editors in the workspace.
    //
    // * `callback` {Function} to be called with current and future text editors.
    //   * `editor` An {TextEditor} that is present in {::getTextEditors} at the time
    //     of subscription or that is added at some later time.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'observeTextEditors',
    value: function observeTextEditors(callback) {
      for (var textEditor of this.getTextEditors()) {
        callback(textEditor);
      }
      return this.onDidAddTextEditor(function (_ref5) {
        var textEditor = _ref5.textEditor;
        return callback(textEditor);
      });
    }

    // Essential: Invoke the given callback with all current and future panes items
    // in the workspace.
    //
    // * `callback` {Function} to be called with current and future pane items.
    //   * `item` An item that is present in {::getPaneItems} at the time of
    //      subscription or that is added at some later time.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'observePaneItems',
    value: function observePaneItems(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.observePaneItems(callback);
      })))))();
    }

    // Essential: Invoke the given callback when the active pane item changes.
    //
    // Because observers are invoked synchronously, it's important not to perform
    // any expensive operations via this method. Consider
    // {::onDidStopChangingActivePaneItem} to delay operations until after changes
    // stop occurring.
    //
    // * `callback` {Function} to be called when the active pane item changes.
    //   * `item` The active pane item.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidChangeActivePaneItem',
    value: function onDidChangeActivePaneItem(callback) {
      return this.emitter.on('did-change-active-pane-item', callback);
    }

    // Essential: Invoke the given callback when the active pane item stops
    // changing.
    //
    // Observers are called asynchronously 100ms after the last active pane item
    // change. Handling changes here rather than in the synchronous
    // {::onDidChangeActivePaneItem} prevents unneeded work if the user is quickly
    // changing or closing tabs and ensures critical UI feedback, like changing the
    // highlighted tab, gets priority over work that can be done asynchronously.
    //
    // * `callback` {Function} to be called when the active pane item stopts
    //   changing.
    //   * `item` The active pane item.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidStopChangingActivePaneItem',
    value: function onDidStopChangingActivePaneItem(callback) {
      return this.emitter.on('did-stop-changing-active-pane-item', callback);
    }

    // Essential: Invoke the given callback when a text editor becomes the active
    // text editor and when there is no longer an active text editor.
    //
    // * `callback` {Function} to be called when the active text editor changes.
    //   * `editor` The active {TextEditor} or undefined if there is no longer an
    //      active text editor.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidChangeActiveTextEditor',
    value: function onDidChangeActiveTextEditor(callback) {
      return this.emitter.on('did-change-active-text-editor', callback);
    }

    // Essential: Invoke the given callback with the current active pane item and
    // with all future active pane items in the workspace.
    //
    // * `callback` {Function} to be called when the active pane item changes.
    //   * `item` The current active pane item.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'observeActivePaneItem',
    value: function observeActivePaneItem(callback) {
      callback(this.getActivePaneItem());
      return this.onDidChangeActivePaneItem(callback);
    }

    // Essential: Invoke the given callback with the current active text editor
    // (if any), with all future active text editors, and when there is no longer
    // an active text editor.
    //
    // * `callback` {Function} to be called when the active text editor changes.
    //   * `editor` The active {TextEditor} or undefined if there is not an
    //      active text editor.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'observeActiveTextEditor',
    value: function observeActiveTextEditor(callback) {
      callback(this.getActiveTextEditor());

      return this.onDidChangeActiveTextEditor(callback);
    }

    // Essential: Invoke the given callback whenever an item is opened. Unlike
    // {::onDidAddPaneItem}, observers will be notified for items that are already
    // present in the workspace when they are reopened.
    //
    // * `callback` {Function} to be called whenever an item is opened.
    //   * `event` {Object} with the following keys:
    //     * `uri` {String} representing the opened URI. Could be `undefined`.
    //     * `item` The opened item.
    //     * `pane` The pane in which the item was opened.
    //     * `index` The index of the opened item on its pane.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidOpen',
    value: function onDidOpen(callback) {
      return this.emitter.on('did-open', callback);
    }

    // Extended: Invoke the given callback when a pane is added to the workspace.
    //
    // * `callback` {Function} to be called panes are added.
    //   * `event` {Object} with the following keys:
    //     * `pane` The added pane.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidAddPane',
    value: function onDidAddPane(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.onDidAddPane(callback);
      })))))();
    }

    // Extended: Invoke the given callback before a pane is destroyed in the
    // workspace.
    //
    // * `callback` {Function} to be called before panes are destroyed.
    //   * `event` {Object} with the following keys:
    //     * `pane` The pane to be destroyed.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onWillDestroyPane',
    value: function onWillDestroyPane(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.onWillDestroyPane(callback);
      })))))();
    }

    // Extended: Invoke the given callback when a pane is destroyed in the
    // workspace.
    //
    // * `callback` {Function} to be called panes are destroyed.
    //   * `event` {Object} with the following keys:
    //     * `pane` The destroyed pane.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidDestroyPane',
    value: function onDidDestroyPane(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.onDidDestroyPane(callback);
      })))))();
    }

    // Extended: Invoke the given callback with all current and future panes in the
    // workspace.
    //
    // * `callback` {Function} to be called with current and future panes.
    //   * `pane` A {Pane} that is present in {::getPanes} at the time of
    //      subscription or that is added at some later time.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'observePanes',
    value: function observePanes(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.observePanes(callback);
      })))))();
    }

    // Extended: Invoke the given callback when the active pane changes.
    //
    // * `callback` {Function} to be called when the active pane changes.
    //   * `pane` A {Pane} that is the current return value of {::getActivePane}.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidChangeActivePane',
    value: function onDidChangeActivePane(callback) {
      return this.emitter.on('did-change-active-pane', callback);
    }

    // Extended: Invoke the given callback with the current active pane and when
    // the active pane changes.
    //
    // * `callback` {Function} to be called with the current and future active#
    //   panes.
    //   * `pane` A {Pane} that is the current return value of {::getActivePane}.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'observeActivePane',
    value: function observeActivePane(callback) {
      callback(this.getActivePane());
      return this.onDidChangeActivePane(callback);
    }

    // Extended: Invoke the given callback when a pane item is added to the
    // workspace.
    //
    // * `callback` {Function} to be called when pane items are added.
    //   * `event` {Object} with the following keys:
    //     * `item` The added pane item.
    //     * `pane` {Pane} containing the added item.
    //     * `index` {Number} indicating the index of the added item in its pane.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidAddPaneItem',
    value: function onDidAddPaneItem(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.onDidAddPaneItem(callback);
      })))))();
    }

    // Extended: Invoke the given callback when a pane item is about to be
    // destroyed, before the user is prompted to save it.
    //
    // * `callback` {Function} to be called before pane items are destroyed.
    //   * `event` {Object} with the following keys:
    //     * `item` The item to be destroyed.
    //     * `pane` {Pane} containing the item to be destroyed.
    //     * `index` {Number} indicating the index of the item to be destroyed in
    //       its pane.
    //
    // Returns a {Disposable} on which `.dispose` can be called to unsubscribe.
  }, {
    key: 'onWillDestroyPaneItem',
    value: function onWillDestroyPaneItem(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.onWillDestroyPaneItem(callback);
      })))))();
    }

    // Extended: Invoke the given callback when a pane item is destroyed.
    //
    // * `callback` {Function} to be called when pane items are destroyed.
    //   * `event` {Object} with the following keys:
    //     * `item` The destroyed item.
    //     * `pane` {Pane} containing the destroyed item.
    //     * `index` {Number} indicating the index of the destroyed item in its
    //       pane.
    //
    // Returns a {Disposable} on which `.dispose` can be called to unsubscribe.
  }, {
    key: 'onDidDestroyPaneItem',
    value: function onDidDestroyPaneItem(callback) {
      return new (_bind.apply(CompositeDisposable, [null].concat(_toConsumableArray(this.getPaneContainers().map(function (container) {
        return container.onDidDestroyPaneItem(callback);
      })))))();
    }

    // Extended: Invoke the given callback when a text editor is added to the
    // workspace.
    //
    // * `callback` {Function} to be called panes are added.
    //   * `event` {Object} with the following keys:
    //     * `textEditor` {TextEditor} that was added.
    //     * `pane` {Pane} containing the added text editor.
    //     * `index` {Number} indicating the index of the added text editor in its
    //        pane.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidAddTextEditor',
    value: function onDidAddTextEditor(callback) {
      return this.emitter.on('did-add-text-editor', callback);
    }

    /*
    Section: Opening
    */

    // Essential: Opens the given URI in Atom asynchronously.
    // If the URI is already open, the existing item for that URI will be
    // activated. If no URI is given, or no registered opener can open
    // the URI, a new empty {TextEditor} will be created.
    //
    // * `uri` (optional) A {String} containing a URI.
    // * `options` (optional) {Object}
    //   * `initialLine` A {Number} indicating which row to move the cursor to
    //     initially. Defaults to `0`.
    //   * `initialColumn` A {Number} indicating which column to move the cursor to
    //     initially. Defaults to `0`.
    //   * `split` Either 'left', 'right', 'up' or 'down'.
    //     If 'left', the item will be opened in leftmost pane of the current active pane's row.
    //     If 'right', the item will be opened in the rightmost pane of the current active pane's row. If only one pane exists in the row, a new pane will be created.
    //     If 'up', the item will be opened in topmost pane of the current active pane's column.
    //     If 'down', the item will be opened in the bottommost pane of the current active pane's column. If only one pane exists in the column, a new pane will be created.
    //   * `activatePane` A {Boolean} indicating whether to call {Pane::activate} on
    //     containing pane. Defaults to `true`.
    //   * `activateItem` A {Boolean} indicating whether to call {Pane::activateItem}
    //     on containing pane. Defaults to `true`.
    //   * `pending` A {Boolean} indicating whether or not the item should be opened
    //     in a pending state. Existing pending items in a pane are replaced with
    //     new pending items when they are opened.
    //   * `searchAllPanes` A {Boolean}. If `true`, the workspace will attempt to
    //     activate an existing item for the given URI on any pane.
    //     If `false`, only the active pane will be searched for
    //     an existing item for the same URI. Defaults to `false`.
    //   * `location` (optional) A {String} containing the name of the location
    //     in which this item should be opened (one of "left", "right", "bottom",
    //     or "center"). If omitted, Atom will fall back to the last location in
    //     which a user has placed an item with the same URI or, if this is a new
    //     URI, the default location specified by the item. NOTE: This option
    //     should almost always be omitted to honor user preference.
    //
    // Returns a {Promise} that resolves to the {TextEditor} for the file URI.
  }, {
    key: 'open',
    value: _asyncToGenerator(function* (itemOrURI) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var uri = undefined,
          item = undefined;
      if (typeof itemOrURI === 'string') {
        uri = this.project.resolvePath(itemOrURI);
      } else if (itemOrURI) {
        item = itemOrURI;
        if (typeof item.getURI === 'function') uri = item.getURI();
      }

      if (!atom.config.get('core.allowPendingPaneItems')) {
        options.pending = false;
      }

      // Avoid adding URLs as recent documents to work-around this Spotlight crash:
      // https://github.com/atom/atom/issues/10071
      if (uri && (!url.parse(uri).protocol || process.platform === 'win32')) {
        this.applicationDelegate.addRecentDocument(uri);
      }

      var pane = undefined,
          itemExistsInWorkspace = undefined;

      // Try to find an existing item in the workspace.
      if (item || uri) {
        if (options.pane) {
          pane = options.pane;
        } else if (options.searchAllPanes) {
          pane = item ? this.paneForItem(item) : this.paneForURI(uri);
        } else {
          // If an item with the given URI is already in the workspace, assume
          // that item's pane container is the preferred location for that URI.
          var container = undefined;
          if (uri) container = this.paneContainerForURI(uri);
          if (!container) container = this.getActivePaneContainer();

          // The `split` option affects where we search for the item.
          pane = container.getActivePane();
          switch (options.split) {
            case 'left':
              pane = pane.findLeftmostSibling();
              break;
            case 'right':
              pane = pane.findRightmostSibling();
              break;
            case 'up':
              pane = pane.findTopmostSibling();
              break;
            case 'down':
              pane = pane.findBottommostSibling();
              break;
          }
        }

        if (pane) {
          if (item) {
            itemExistsInWorkspace = pane.getItems().includes(item);
          } else {
            item = pane.itemForURI(uri);
            itemExistsInWorkspace = item != null;
          }
        }
      }

      // If we already have an item at this stage, we won't need to do an async
      // lookup of the URI, so we yield the event loop to ensure this method
      // is consistently asynchronous.
      if (item) yield Promise.resolve();

      if (!itemExistsInWorkspace) {
        item = item || (yield this.createItemForURI(uri, options));
        if (!item) return;

        if (options.pane) {
          pane = options.pane;
        } else {
          var _location2 = options.location;
          if (!_location2 && !options.split && uri && this.enablePersistence) {
            _location2 = yield this.itemLocationStore.load(uri);
          }
          if (!_location2 && typeof item.getDefaultLocation === 'function') {
            _location2 = item.getDefaultLocation();
          }

          var allowedLocations = typeof item.getAllowedLocations === 'function' ? item.getAllowedLocations() : ALL_LOCATIONS;
          _location2 = allowedLocations.includes(_location2) ? _location2 : allowedLocations[0];

          var container = this.paneContainers[_location2] || this.getCenter();
          pane = container.getActivePane();
          switch (options.split) {
            case 'left':
              pane = pane.findLeftmostSibling();
              break;
            case 'right':
              pane = pane.findOrCreateRightmostSibling();
              break;
            case 'up':
              pane = pane.findTopmostSibling();
              break;
            case 'down':
              pane = pane.findOrCreateBottommostSibling();
              break;
          }
        }
      }

      if (!options.pending && pane.getPendingItem() === item) {
        pane.clearPendingItem();
      }

      this.itemOpened(item);

      if (options.activateItem === false) {
        pane.addItem(item, { pending: options.pending });
      } else {
        pane.activateItem(item, { pending: options.pending });
      }

      if (options.activatePane !== false) {
        pane.activate();
      }

      var initialColumn = 0;
      var initialLine = 0;
      if (!Number.isNaN(options.initialLine)) {
        initialLine = options.initialLine;
      }
      if (!Number.isNaN(options.initialColumn)) {
        initialColumn = options.initialColumn;
      }
      if (initialLine >= 0 || initialColumn >= 0) {
        if (typeof item.setCursorBufferPosition === 'function') {
          item.setCursorBufferPosition([initialLine, initialColumn]);
        }
      }

      var index = pane.getActiveItemIndex();
      this.emitter.emit('did-open', { uri: uri, pane: pane, item: item, index: index });
      return item;
    })

    // Essential: Search the workspace for items matching the given URI and hide them.
    //
    // * `itemOrURI` (optional) The item to hide or a {String} containing the URI
    //   of the item to hide.
    //
    // Returns a {boolean} indicating whether any items were found (and hidden).
  }, {
    key: 'hide',
    value: function hide(itemOrURI) {
      var foundItems = false;

      // If any visible item has the given URI, hide it
      for (var container of this.getPaneContainers()) {
        var isCenter = container === this.getCenter();
        if (isCenter || container.isVisible()) {
          for (var pane of container.getPanes()) {
            var activeItem = pane.getActiveItem();
            var foundItem = activeItem != null && (activeItem === itemOrURI || typeof activeItem.getURI === 'function' && activeItem.getURI() === itemOrURI);
            if (foundItem) {
              foundItems = true;
              // We can't really hide the center so we just destroy the item.
              if (isCenter) {
                pane.destroyItem(activeItem);
              } else {
                container.hide();
              }
            }
          }
        }
      }

      return foundItems;
    }

    // Essential: Search the workspace for items matching the given URI. If any are found, hide them.
    // Otherwise, open the URL.
    //
    // * `itemOrURI` (optional) The item to toggle or a {String} containing the URI
    //   of the item to toggle.
    //
    // Returns a Promise that resolves when the item is shown or hidden.
  }, {
    key: 'toggle',
    value: function toggle(itemOrURI) {
      if (this.hide(itemOrURI)) {
        return Promise.resolve();
      } else {
        return this.open(itemOrURI, { searchAllPanes: true });
      }
    }

    // Open Atom's license in the active pane.
  }, {
    key: 'openLicense',
    value: function openLicense() {
      return this.open(path.join(process.resourcesPath, 'LICENSE.md'));
    }

    // Synchronously open the given URI in the active pane. **Only use this method
    // in specs. Calling this in production code will block the UI thread and
    // everyone will be mad at you.**
    //
    // * `uri` A {String} containing a URI.
    // * `options` An optional options {Object}
    //   * `initialLine` A {Number} indicating which row to move the cursor to
    //     initially. Defaults to `0`.
    //   * `initialColumn` A {Number} indicating which column to move the cursor to
    //     initially. Defaults to `0`.
    //   * `activatePane` A {Boolean} indicating whether to call {Pane::activate} on
    //     the containing pane. Defaults to `true`.
    //   * `activateItem` A {Boolean} indicating whether to call {Pane::activateItem}
    //     on containing pane. Defaults to `true`.
  }, {
    key: 'openSync',
    value: function openSync() {
      var uri_ = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var initialLine = options.initialLine;
      var initialColumn = options.initialColumn;

      var activatePane = options.activatePane != null ? options.activatePane : true;
      var activateItem = options.activateItem != null ? options.activateItem : true;

      var uri = this.project.resolvePath(uri_);
      var item = this.getActivePane().itemForURI(uri);
      if (uri && item == null) {
        for (var _opener of this.getOpeners()) {
          item = _opener(uri, options);
          if (item) break;
        }
      }
      if (item == null) {
        item = this.project.openSync(uri, { initialLine: initialLine, initialColumn: initialColumn });
      }

      if (activateItem) {
        this.getActivePane().activateItem(item);
      }
      this.itemOpened(item);
      if (activatePane) {
        this.getActivePane().activate();
      }
      return item;
    }
  }, {
    key: 'openURIInPane',
    value: function openURIInPane(uri, pane) {
      return this.open(uri, { pane: pane });
    }

    // Public: Creates a new item that corresponds to the provided URI.
    //
    // If no URI is given, or no registered opener can open the URI, a new empty
    // {TextEditor} will be created.
    //
    // * `uri` A {String} containing a URI.
    //
    // Returns a {Promise} that resolves to the {TextEditor} (or other item) for the given URI.
  }, {
    key: 'createItemForURI',
    value: function createItemForURI(uri, options) {
      if (uri != null) {
        for (var _opener2 of this.getOpeners()) {
          var item = _opener2(uri, options);
          if (item != null) return Promise.resolve(item);
        }
      }

      try {
        return this.openTextFile(uri, options);
      } catch (error) {
        switch (error.code) {
          case 'CANCELLED':
            return Promise.resolve();
          case 'EACCES':
            this.notificationManager.addWarning('Permission denied \'' + error.path + '\'');
            return Promise.resolve();
          case 'EPERM':
          case 'EBUSY':
          case 'ENXIO':
          case 'EIO':
          case 'ENOTCONN':
          case 'UNKNOWN':
          case 'ECONNRESET':
          case 'EINVAL':
          case 'EMFILE':
          case 'ENOTDIR':
          case 'EAGAIN':
            this.notificationManager.addWarning('Unable to open \'' + (error.path != null ? error.path : uri) + '\'', { detail: error.message });
            return Promise.resolve();
          default:
            throw error;
        }
      }
    }
  }, {
    key: 'openTextFile',
    value: function openTextFile(uri, options) {
      var _this6 = this;

      var filePath = this.project.resolvePath(uri);

      if (filePath != null) {
        try {
          fs.closeSync(fs.openSync(filePath, 'r'));
        } catch (error) {
          // allow ENOENT errors to create an editor for paths that dont exist
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      var fileSize = fs.getSizeSync(filePath);

      var largeFileMode = fileSize >= 2 * 1048576; // 2MB
      if (fileSize >= this.config.get('core.warnOnLargeFileLimit') * 1048576) {
        // 20MB by default
        var choice = this.applicationDelegate.confirm({
          message: 'Atom will be unresponsive during the loading of very large files.',
          detailedMessage: 'Do you still want to load this file?',
          buttons: ['Proceed', 'Cancel']
        });
        if (choice === 1) {
          var error = new Error();
          error.code = 'CANCELLED';
          throw error;
        }
      }

      return this.project.bufferForPath(filePath, options).then(function (buffer) {
        return _this6.textEditorRegistry.build(Object.assign({ buffer: buffer, largeFileMode: largeFileMode, autoHeight: false }, options));
      });
    }
  }, {
    key: 'handleGrammarUsed',
    value: function handleGrammarUsed(grammar) {
      if (grammar == null) {
        return;
      }
      return this.packageManager.triggerActivationHook(grammar.packageName + ':grammar-used');
    }

    // Public: Returns a {Boolean} that is `true` if `object` is a `TextEditor`.
    //
    // * `object` An {Object} you want to perform the check against.
  }, {
    key: 'isTextEditor',
    value: function isTextEditor(object) {
      return object instanceof TextEditor;
    }

    // Extended: Create a new text editor.
    //
    // Returns a {TextEditor}.
  }, {
    key: 'buildTextEditor',
    value: function buildTextEditor(params) {
      var editor = this.textEditorRegistry.build(params);
      var subscriptions = new CompositeDisposable(this.textEditorRegistry.maintainGrammar(editor), this.textEditorRegistry.maintainConfig(editor));
      editor.onDidDestroy(function () {
        subscriptions.dispose();
      });
      return editor;
    }

    // Public: Asynchronously reopens the last-closed item's URI if it hasn't already been
    // reopened.
    //
    // Returns a {Promise} that is resolved when the item is opened
  }, {
    key: 'reopenItem',
    value: function reopenItem() {
      var uri = this.destroyedItemURIs.pop();
      if (uri) {
        return this.open(uri);
      } else {
        return Promise.resolve();
      }
    }

    // Public: Register an opener for a uri.
    //
    // When a URI is opened via {Workspace::open}, Atom loops through its registered
    // opener functions until one returns a value for the given uri.
    // Openers are expected to return an object that inherits from HTMLElement or
    // a model which has an associated view in the {ViewRegistry}.
    // A {TextEditor} will be used if no opener returns a value.
    //
    // ## Examples
    //
    // ```coffee
    // atom.workspace.addOpener (uri) ->
    //   if path.extname(uri) is '.toml'
    //     return new TomlEditor(uri)
    // ```
    //
    // * `opener` A {Function} to be called when a path is being opened.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to remove the
    // opener.
    //
    // Note that the opener will be called if and only if the URI is not already open
    // in the current pane. The searchAllPanes flag expands the search from the
    // current pane to all panes. If you wish to open a view of a different type for
    // a file that is already open, consider changing the protocol of the URI. For
    // example, perhaps you wish to preview a rendered version of the file `/foo/bar/baz.quux`
    // that is already open in a text editor view. You could signal this by calling
    // {Workspace::open} on the URI `quux-preview://foo/bar/baz.quux`. Then your opener
    // can check the protocol for quux-preview and only handle those URIs that match.
  }, {
    key: 'addOpener',
    value: function addOpener(opener) {
      var _this7 = this;

      this.openers.push(opener);
      return new Disposable(function () {
        _.remove(_this7.openers, opener);
      });
    }
  }, {
    key: 'getOpeners',
    value: function getOpeners() {
      return this.openers;
    }

    /*
    Section: Pane Items
    */

    // Essential: Get all pane items in the workspace.
    //
    // Returns an {Array} of items.
  }, {
    key: 'getPaneItems',
    value: function getPaneItems() {
      return _.flatten(this.getPaneContainers().map(function (container) {
        return container.getPaneItems();
      }));
    }

    // Essential: Get the active {Pane}'s active item.
    //
    // Returns an pane item {Object}.
  }, {
    key: 'getActivePaneItem',
    value: function getActivePaneItem() {
      return this.getActivePaneContainer().getActivePaneItem();
    }

    // Essential: Get all text editors in the workspace.
    //
    // Returns an {Array} of {TextEditor}s.
  }, {
    key: 'getTextEditors',
    value: function getTextEditors() {
      return this.getPaneItems().filter(function (item) {
        return item instanceof TextEditor;
      });
    }

    // Essential: Get the workspace center's active item if it is a {TextEditor}.
    //
    // Returns a {TextEditor} or `undefined` if the workspace center's current
    // active item is not a {TextEditor}.
  }, {
    key: 'getActiveTextEditor',
    value: function getActiveTextEditor() {
      var activeItem = this.getCenter().getActivePaneItem();
      if (activeItem instanceof TextEditor) {
        return activeItem;
      }
    }

    // Save all pane items.
  }, {
    key: 'saveAll',
    value: function saveAll() {
      this.getPaneContainers().forEach(function (container) {
        container.saveAll();
      });
    }
  }, {
    key: 'confirmClose',
    value: function confirmClose(options) {
      return Promise.all(this.getPaneContainers().map(function (container) {
        return container.confirmClose(options);
      })).then(function (results) {
        return !results.includes(false);
      });
    }

    // Save the active pane item.
    //
    // If the active pane item currently has a URI according to the item's
    // `.getURI` method, calls `.save` on the item. Otherwise
    // {::saveActivePaneItemAs} # will be called instead. This method does nothing
    // if the active item does not implement a `.save` method.
  }, {
    key: 'saveActivePaneItem',
    value: function saveActivePaneItem() {
      return this.getCenter().getActivePane().saveActiveItem();
    }

    // Prompt the user for a path and save the active pane item to it.
    //
    // Opens a native dialog where the user selects a path on disk, then calls
    // `.saveAs` on the item with the selected path. This method does nothing if
    // the active item does not implement a `.saveAs` method.
  }, {
    key: 'saveActivePaneItemAs',
    value: function saveActivePaneItemAs() {
      this.getCenter().getActivePane().saveActiveItemAs();
    }

    // Destroy (close) the active pane item.
    //
    // Removes the active pane item and calls the `.destroy` method on it if one is
    // defined.
  }, {
    key: 'destroyActivePaneItem',
    value: function destroyActivePaneItem() {
      return this.getActivePane().destroyActiveItem();
    }

    /*
    Section: Panes
    */

    // Extended: Get the most recently focused pane container.
    //
    // Returns a {Dock} or the {WorkspaceCenter}.
  }, {
    key: 'getActivePaneContainer',
    value: function getActivePaneContainer() {
      return this.activePaneContainer;
    }

    // Extended: Get all panes in the workspace.
    //
    // Returns an {Array} of {Pane}s.
  }, {
    key: 'getPanes',
    value: function getPanes() {
      return _.flatten(this.getPaneContainers().map(function (container) {
        return container.getPanes();
      }));
    }
  }, {
    key: 'getVisiblePanes',
    value: function getVisiblePanes() {
      return _.flatten(this.getVisiblePaneContainers().map(function (container) {
        return container.getPanes();
      }));
    }

    // Extended: Get the active {Pane}.
    //
    // Returns a {Pane}.
  }, {
    key: 'getActivePane',
    value: function getActivePane() {
      return this.getActivePaneContainer().getActivePane();
    }

    // Extended: Make the next pane active.
  }, {
    key: 'activateNextPane',
    value: function activateNextPane() {
      return this.getActivePaneContainer().activateNextPane();
    }

    // Extended: Make the previous pane active.
  }, {
    key: 'activatePreviousPane',
    value: function activatePreviousPane() {
      return this.getActivePaneContainer().activatePreviousPane();
    }

    // Extended: Get the first pane container that contains an item with the given
    // URI.
    //
    // * `uri` {String} uri
    //
    // Returns a {Dock}, the {WorkspaceCenter}, or `undefined` if no item exists
    // with the given URI.
  }, {
    key: 'paneContainerForURI',
    value: function paneContainerForURI(uri) {
      return this.getPaneContainers().find(function (container) {
        return container.paneForURI(uri);
      });
    }

    // Extended: Get the first pane container that contains the given item.
    //
    // * `item` the Item that the returned pane container must contain.
    //
    // Returns a {Dock}, the {WorkspaceCenter}, or `undefined` if no item exists
    // with the given URI.
  }, {
    key: 'paneContainerForItem',
    value: function paneContainerForItem(uri) {
      return this.getPaneContainers().find(function (container) {
        return container.paneForItem(uri);
      });
    }

    // Extended: Get the first {Pane} that contains an item with the given URI.
    //
    // * `uri` {String} uri
    //
    // Returns a {Pane} or `undefined` if no item exists with the given URI.
  }, {
    key: 'paneForURI',
    value: function paneForURI(uri) {
      for (var _location3 of this.getPaneContainers()) {
        var pane = _location3.paneForURI(uri);
        if (pane != null) {
          return pane;
        }
      }
    }

    // Extended: Get the {Pane} containing the given item.
    //
    // * `item` the Item that the returned pane must contain.
    //
    // Returns a {Pane} or `undefined` if no pane exists for the given item.
  }, {
    key: 'paneForItem',
    value: function paneForItem(item) {
      for (var _location4 of this.getPaneContainers()) {
        var pane = _location4.paneForItem(item);
        if (pane != null) {
          return pane;
        }
      }
    }

    // Destroy (close) the active pane.
  }, {
    key: 'destroyActivePane',
    value: function destroyActivePane() {
      var activePane = this.getActivePane();
      if (activePane != null) {
        activePane.destroy();
      }
    }

    // Close the active center pane item, or the active center pane if it is
    // empty, or the current window if there is only the empty root pane.
  }, {
    key: 'closeActivePaneItemOrEmptyPaneOrWindow',
    value: function closeActivePaneItemOrEmptyPaneOrWindow() {
      if (this.getCenter().getActivePaneItem() != null) {
        this.getCenter().getActivePane().destroyActiveItem();
      } else if (this.getCenter().getPanes().length > 1) {
        this.getCenter().destroyActivePane();
      } else if (this.config.get('core.closeEmptyWindows')) {
        atom.close();
      }
    }

    // Increase the editor font size by 1px.
  }, {
    key: 'increaseFontSize',
    value: function increaseFontSize() {
      this.config.set('editor.fontSize', this.config.get('editor.fontSize') + 1);
    }

    // Decrease the editor font size by 1px.
  }, {
    key: 'decreaseFontSize',
    value: function decreaseFontSize() {
      var fontSize = this.config.get('editor.fontSize');
      if (fontSize > 1) {
        this.config.set('editor.fontSize', fontSize - 1);
      }
    }

    // Restore to the window's original editor font size.
  }, {
    key: 'resetFontSize',
    value: function resetFontSize() {
      if (this.originalFontSize) {
        this.config.set('editor.fontSize', this.originalFontSize);
      }
    }
  }, {
    key: 'subscribeToFontSize',
    value: function subscribeToFontSize() {
      var _this8 = this;

      return this.config.onDidChange('editor.fontSize', function (_ref6) {
        var oldValue = _ref6.oldValue;

        if (_this8.originalFontSize == null) {
          _this8.originalFontSize = oldValue;
        }
      });
    }

    // Removes the item's uri from the list of potential items to reopen.
  }, {
    key: 'itemOpened',
    value: function itemOpened(item) {
      var uri = undefined;
      if (typeof item.getURI === 'function') {
        uri = item.getURI();
      } else if (typeof item.getUri === 'function') {
        uri = item.getUri();
      }

      if (uri != null) {
        _.remove(this.destroyedItemURIs, uri);
      }
    }

    // Adds the destroyed item's uri to the list of items to reopen.
  }, {
    key: 'didDestroyPaneItem',
    value: function didDestroyPaneItem(_ref7) {
      var item = _ref7.item;

      var uri = undefined;
      if (typeof item.getURI === 'function') {
        uri = item.getURI();
      } else if (typeof item.getUri === 'function') {
        uri = item.getUri();
      }

      if (uri != null) {
        this.destroyedItemURIs.push(uri);
      }
    }

    // Called by Model superclass when destroyed
  }, {
    key: 'destroyed',
    value: function destroyed() {
      this.paneContainers.center.destroy();
      this.paneContainers.left.destroy();
      this.paneContainers.right.destroy();
      this.paneContainers.bottom.destroy();
      this.cancelStoppedChangingActivePaneItemTimeout();
      if (this.activeItemSubscriptions != null) {
        this.activeItemSubscriptions.dispose();
      }
    }

    /*
    Section: Pane Locations
    */

    // Essential: Get the {WorkspaceCenter} at the center of the editor window.
  }, {
    key: 'getCenter',
    value: function getCenter() {
      return this.paneContainers.center;
    }

    // Essential: Get the {Dock} to the left of the editor window.
  }, {
    key: 'getLeftDock',
    value: function getLeftDock() {
      return this.paneContainers.left;
    }

    // Essential: Get the {Dock} to the right of the editor window.
  }, {
    key: 'getRightDock',
    value: function getRightDock() {
      return this.paneContainers.right;
    }

    // Essential: Get the {Dock} below the editor window.
  }, {
    key: 'getBottomDock',
    value: function getBottomDock() {
      return this.paneContainers.bottom;
    }
  }, {
    key: 'getPaneContainers',
    value: function getPaneContainers() {
      return [this.paneContainers.center, this.paneContainers.left, this.paneContainers.right, this.paneContainers.bottom];
    }
  }, {
    key: 'getVisiblePaneContainers',
    value: function getVisiblePaneContainers() {
      var center = this.getCenter();
      return atom.workspace.getPaneContainers().filter(function (container) {
        return container === center || container.isVisible();
      });
    }

    /*
    Section: Panels
     Panels are used to display UI related to an editor window. They are placed at one of the four
    edges of the window: left, right, top or bottom. If there are multiple panels on the same window
    edge they are stacked in order of priority: higher priority is closer to the center, lower
    priority towards the edge.
     *Note:* If your panel changes its size throughout its lifetime, consider giving it a higher
    priority, allowing fixed size panels to be closer to the edge. This allows control targets to
    remain more static for easier targeting by users that employ mice or trackpads. (See
    [atom/atom#4834](https://github.com/atom/atom/issues/4834) for discussion.)
    */

    // Essential: Get an {Array} of all the panel items at the bottom of the editor window.
  }, {
    key: 'getBottomPanels',
    value: function getBottomPanels() {
      return this.getPanels('bottom');
    }

    // Essential: Adds a panel item to the bottom of the editor window.
    //
    // * `options` {Object}
    //   * `item` Your panel content. It can be DOM element, a jQuery element, or
    //     a model with a view registered via {ViewRegistry::addViewProvider}. We recommend the
    //     latter. See {ViewRegistry::addViewProvider} for more information.
    //   * `visible` (optional) {Boolean} false if you want the panel to initially be hidden
    //     (default: true)
    //   * `priority` (optional) {Number} Determines stacking order. Lower priority items are
    //     forced closer to the edges of the window. (default: 100)
    //
    // Returns a {Panel}
  }, {
    key: 'addBottomPanel',
    value: function addBottomPanel(options) {
      return this.addPanel('bottom', options);
    }

    // Essential: Get an {Array} of all the panel items to the left of the editor window.
  }, {
    key: 'getLeftPanels',
    value: function getLeftPanels() {
      return this.getPanels('left');
    }

    // Essential: Adds a panel item to the left of the editor window.
    //
    // * `options` {Object}
    //   * `item` Your panel content. It can be DOM element, a jQuery element, or
    //     a model with a view registered via {ViewRegistry::addViewProvider}. We recommend the
    //     latter. See {ViewRegistry::addViewProvider} for more information.
    //   * `visible` (optional) {Boolean} false if you want the panel to initially be hidden
    //     (default: true)
    //   * `priority` (optional) {Number} Determines stacking order. Lower priority items are
    //     forced closer to the edges of the window. (default: 100)
    //
    // Returns a {Panel}
  }, {
    key: 'addLeftPanel',
    value: function addLeftPanel(options) {
      return this.addPanel('left', options);
    }

    // Essential: Get an {Array} of all the panel items to the right of the editor window.
  }, {
    key: 'getRightPanels',
    value: function getRightPanels() {
      return this.getPanels('right');
    }

    // Essential: Adds a panel item to the right of the editor window.
    //
    // * `options` {Object}
    //   * `item` Your panel content. It can be DOM element, a jQuery element, or
    //     a model with a view registered via {ViewRegistry::addViewProvider}. We recommend the
    //     latter. See {ViewRegistry::addViewProvider} for more information.
    //   * `visible` (optional) {Boolean} false if you want the panel to initially be hidden
    //     (default: true)
    //   * `priority` (optional) {Number} Determines stacking order. Lower priority items are
    //     forced closer to the edges of the window. (default: 100)
    //
    // Returns a {Panel}
  }, {
    key: 'addRightPanel',
    value: function addRightPanel(options) {
      return this.addPanel('right', options);
    }

    // Essential: Get an {Array} of all the panel items at the top of the editor window.
  }, {
    key: 'getTopPanels',
    value: function getTopPanels() {
      return this.getPanels('top');
    }

    // Essential: Adds a panel item to the top of the editor window above the tabs.
    //
    // * `options` {Object}
    //   * `item` Your panel content. It can be DOM element, a jQuery element, or
    //     a model with a view registered via {ViewRegistry::addViewProvider}. We recommend the
    //     latter. See {ViewRegistry::addViewProvider} for more information.
    //   * `visible` (optional) {Boolean} false if you want the panel to initially be hidden
    //     (default: true)
    //   * `priority` (optional) {Number} Determines stacking order. Lower priority items are
    //     forced closer to the edges of the window. (default: 100)
    //
    // Returns a {Panel}
  }, {
    key: 'addTopPanel',
    value: function addTopPanel(options) {
      return this.addPanel('top', options);
    }

    // Essential: Get an {Array} of all the panel items in the header.
  }, {
    key: 'getHeaderPanels',
    value: function getHeaderPanels() {
      return this.getPanels('header');
    }

    // Essential: Adds a panel item to the header.
    //
    // * `options` {Object}
    //   * `item` Your panel content. It can be DOM element, a jQuery element, or
    //     a model with a view registered via {ViewRegistry::addViewProvider}. We recommend the
    //     latter. See {ViewRegistry::addViewProvider} for more information.
    //   * `visible` (optional) {Boolean} false if you want the panel to initially be hidden
    //     (default: true)
    //   * `priority` (optional) {Number} Determines stacking order. Lower priority items are
    //     forced closer to the edges of the window. (default: 100)
    //
    // Returns a {Panel}
  }, {
    key: 'addHeaderPanel',
    value: function addHeaderPanel(options) {
      return this.addPanel('header', options);
    }

    // Essential: Get an {Array} of all the panel items in the footer.
  }, {
    key: 'getFooterPanels',
    value: function getFooterPanels() {
      return this.getPanels('footer');
    }

    // Essential: Adds a panel item to the footer.
    //
    // * `options` {Object}
    //   * `item` Your panel content. It can be DOM element, a jQuery element, or
    //     a model with a view registered via {ViewRegistry::addViewProvider}. We recommend the
    //     latter. See {ViewRegistry::addViewProvider} for more information.
    //   * `visible` (optional) {Boolean} false if you want the panel to initially be hidden
    //     (default: true)
    //   * `priority` (optional) {Number} Determines stacking order. Lower priority items are
    //     forced closer to the edges of the window. (default: 100)
    //
    // Returns a {Panel}
  }, {
    key: 'addFooterPanel',
    value: function addFooterPanel(options) {
      return this.addPanel('footer', options);
    }

    // Essential: Get an {Array} of all the modal panel items
  }, {
    key: 'getModalPanels',
    value: function getModalPanels() {
      return this.getPanels('modal');
    }

    // Essential: Adds a panel item as a modal dialog.
    //
    // * `options` {Object}
    //   * `item` Your panel content. It can be a DOM element, a jQuery element, or
    //     a model with a view registered via {ViewRegistry::addViewProvider}. We recommend the
    //     model option. See {ViewRegistry::addViewProvider} for more information.
    //   * `visible` (optional) {Boolean} false if you want the panel to initially be hidden
    //     (default: true)
    //   * `priority` (optional) {Number} Determines stacking order. Lower priority items are
    //     forced closer to the edges of the window. (default: 100)
    //
    // Returns a {Panel}
  }, {
    key: 'addModalPanel',
    value: function addModalPanel() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this.addPanel('modal', options);
    }

    // Essential: Returns the {Panel} associated with the given item. Returns
    // `null` when the item has no panel.
    //
    // * `item` Item the panel contains
  }, {
    key: 'panelForItem',
    value: function panelForItem(item) {
      for (var _location5 in this.panelContainers) {
        var container = this.panelContainers[_location5];
        var panel = container.panelForItem(item);
        if (panel != null) {
          return panel;
        }
      }
      return null;
    }
  }, {
    key: 'getPanels',
    value: function getPanels(location) {
      return this.panelContainers[location].getPanels();
    }
  }, {
    key: 'addPanel',
    value: function addPanel(location, options) {
      if (options == null) {
        options = {};
      }
      return this.panelContainers[location].addPanel(new Panel(options, this.viewRegistry));
    }

    /*
    Section: Searching and Replacing
    */

    // Public: Performs a search across all files in the workspace.
    //
    // * `regex` {RegExp} to search with.
    // * `options` (optional) {Object}
    //   * `paths` An {Array} of glob patterns to search within.
    //   * `onPathsSearched` (optional) {Function} to be periodically called
    //     with number of paths searched.
    //   * `leadingContextLineCount` {Number} default `0`; The number of lines
    //      before the matched line to include in the results object.
    //   * `trailingContextLineCount` {Number} default `0`; The number of lines
    //      after the matched line to include in the results object.
    // * `iterator` {Function} callback on each file found.
    //
    // Returns a {Promise} with a `cancel()` method that will cancel all
    // of the underlying searches that were started as part of this scan.
  }, {
    key: 'scan',
    value: function scan(regex, options, iterator) {
      var _this9 = this;

      if (options === undefined) options = {};

      if (_.isFunction(options)) {
        iterator = options;
        options = {};
      }

      // Find a searcher for every Directory in the project. Each searcher that is matched
      // will be associated with an Array of Directory objects in the Map.
      var directoriesForSearcher = new Map();
      for (var directory of this.project.getDirectories()) {
        var searcher = this.defaultDirectorySearcher;
        for (var directorySearcher of this.directorySearchers) {
          if (directorySearcher.canSearchDirectory(directory)) {
            searcher = directorySearcher;
            break;
          }
        }
        var directories = directoriesForSearcher.get(searcher);
        if (!directories) {
          directories = [];
          directoriesForSearcher.set(searcher, directories);
        }
        directories.push(directory);
      }

      // Define the onPathsSearched callback.
      var onPathsSearched = undefined;
      if (_.isFunction(options.onPathsSearched)) {
        (function () {
          // Maintain a map of directories to the number of search results. When notified of a new count,
          // replace the entry in the map and update the total.
          var onPathsSearchedOption = options.onPathsSearched;
          var totalNumberOfPathsSearched = 0;
          var numberOfPathsSearchedForSearcher = new Map();
          onPathsSearched = function (searcher, numberOfPathsSearched) {
            var oldValue = numberOfPathsSearchedForSearcher.get(searcher);
            if (oldValue) {
              totalNumberOfPathsSearched -= oldValue;
            }
            numberOfPathsSearchedForSearcher.set(searcher, numberOfPathsSearched);
            totalNumberOfPathsSearched += numberOfPathsSearched;
            return onPathsSearchedOption(totalNumberOfPathsSearched);
          };
        })();
      } else {
        onPathsSearched = function () {};
      }

      // Kick off all of the searches and unify them into one Promise.
      var allSearches = [];
      directoriesForSearcher.forEach(function (directories, searcher) {
        var searchOptions = {
          inclusions: options.paths || [],
          includeHidden: true,
          excludeVcsIgnores: _this9.config.get('core.excludeVcsIgnoredPaths'),
          exclusions: _this9.config.get('core.ignoredNames'),
          follow: _this9.config.get('core.followSymlinks'),
          leadingContextLineCount: options.leadingContextLineCount || 0,
          trailingContextLineCount: options.trailingContextLineCount || 0,
          didMatch: function didMatch(result) {
            if (!_this9.project.isPathModified(result.filePath)) {
              return iterator(result);
            }
          },
          didError: function didError(error) {
            return iterator(null, error);
          },
          didSearchPaths: function didSearchPaths(count) {
            return onPathsSearched(searcher, count);
          }
        };
        var directorySearcher = searcher.search(directories, regex, searchOptions);
        allSearches.push(directorySearcher);
      });
      var searchPromise = Promise.all(allSearches);

      for (var buffer of this.project.getBuffers()) {
        if (buffer.isModified()) {
          var filePath = buffer.getPath();
          if (!this.project.contains(filePath)) {
            continue;
          }
          var matches = [];
          buffer.scan(regex, function (match) {
            return matches.push(match);
          });
          if (matches.length > 0) {
            iterator({ filePath: filePath, matches: matches });
          }
        }
      }

      // Make sure the Promise that is returned to the client is cancelable. To be consistent
      // with the existing behavior, instead of cancel() rejecting the promise, it should
      // resolve it with the special value 'cancelled'. At least the built-in find-and-replace
      // package relies on this behavior.
      var isCancelled = false;
      var cancellablePromise = new Promise(function (resolve, reject) {
        var onSuccess = function onSuccess() {
          if (isCancelled) {
            resolve('cancelled');
          } else {
            resolve(null);
          }
        };

        var onFailure = function onFailure() {
          for (var promise of allSearches) {
            promise.cancel();
          }
          reject();
        };

        searchPromise.then(onSuccess, onFailure);
      });
      cancellablePromise.cancel = function () {
        isCancelled = true;
        // Note that cancelling all of the members of allSearches will cause all of the searches
        // to resolve, which causes searchPromise to resolve, which is ultimately what causes
        // cancellablePromise to resolve.
        allSearches.map(function (promise) {
          return promise.cancel();
        });
      };

      // Although this method claims to return a `Promise`, the `ResultsPaneView.onSearch()`
      // method in the find-and-replace package expects the object returned by this method to have a
      // `done()` method. Include a done() method until find-and-replace can be updated.
      cancellablePromise.done = function (onSuccessOrFailure) {
        cancellablePromise.then(onSuccessOrFailure, onSuccessOrFailure);
      };
      return cancellablePromise;
    }

    // Public: Performs a replace across all the specified files in the project.
    //
    // * `regex` A {RegExp} to search with.
    // * `replacementText` {String} to replace all matches of regex with.
    // * `filePaths` An {Array} of file path strings to run the replace on.
    // * `iterator` A {Function} callback on each file with replacements:
    //   * `options` {Object} with keys `filePath` and `replacements`.
    //
    // Returns a {Promise}.
  }, {
    key: 'replace',
    value: function replace(regex, replacementText, filePaths, iterator) {
      var _this10 = this;

      return new Promise(function (resolve, reject) {
        var buffer = undefined;
        var openPaths = _this10.project.getBuffers().map(function (buffer) {
          return buffer.getPath();
        });
        var outOfProcessPaths = _.difference(filePaths, openPaths);

        var inProcessFinished = !openPaths.length;
        var outOfProcessFinished = !outOfProcessPaths.length;
        var checkFinished = function checkFinished() {
          if (outOfProcessFinished && inProcessFinished) {
            resolve();
          }
        };

        if (!outOfProcessFinished.length) {
          var flags = 'g';
          if (regex.ignoreCase) {
            flags += 'i';
          }

          var task = Task.once(require.resolve('./replace-handler'), outOfProcessPaths, regex.source, flags, replacementText, function () {
            outOfProcessFinished = true;
            checkFinished();
          });

          task.on('replace:path-replaced', iterator);
          task.on('replace:file-error', function (error) {
            iterator(null, error);
          });
        }

        for (buffer of _this10.project.getBuffers()) {
          if (!filePaths.includes(buffer.getPath())) {
            continue;
          }
          var replacements = buffer.replace(regex, replacementText, iterator);
          if (replacements) {
            iterator({ filePath: buffer.getPath(), replacements: replacements });
          }
        }

        inProcessFinished = true;
        checkFinished();
      });
    }
  }, {
    key: 'checkoutHeadRevision',
    value: function checkoutHeadRevision(editor) {
      var _this11 = this;

      if (editor.getPath()) {
        var checkoutHead = function checkoutHead() {
          return _this11.project.repositoryForDirectory(new Directory(editor.getDirectoryPath())).then(function (repository) {
            return repository && repository.checkoutHeadForEditor(editor);
          });
        };

        if (this.config.get('editor.confirmCheckoutHeadRevision')) {
          this.applicationDelegate.confirm({
            message: 'Confirm Checkout HEAD Revision',
            detailedMessage: 'Are you sure you want to discard all changes to "' + editor.getFileName() + '" since the last Git commit?',
            buttons: {
              OK: checkoutHead,
              Cancel: null
            }
          });
        } else {
          return checkoutHead();
        }
      } else {
        return Promise.resolve(false);
      }
    }
  }, {
    key: 'paneContainer',
    get: function get() {
      Grim.deprecate('`atom.workspace.paneContainer` has always been private, but it is now gone. Please use `atom.workspace.getCenter()` instead and consult the workspace API docs for public methods.');
      return this.paneContainers.center.paneContainer;
    }
  }]);

  return Workspace;
})(Model);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9kaXN0aWxsZXIvYXRvbS9vdXQvYXBwL3NyYy93b3Jrc3BhY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsV0FBVyxDQUFBOzs7Ozs7Ozs7Ozs7Ozs7O0FBRVgsSUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFDcEMsSUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQzFCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTs7ZUFDdUIsT0FBTyxDQUFDLFdBQVcsQ0FBQzs7SUFBaEUsT0FBTyxZQUFQLE9BQU87SUFBRSxVQUFVLFlBQVYsVUFBVTtJQUFFLG1CQUFtQixZQUFuQixtQkFBbUI7O0FBQy9DLElBQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTs7Z0JBQ1QsT0FBTyxDQUFDLGFBQWEsQ0FBQzs7SUFBbkMsU0FBUyxhQUFULFNBQVM7O0FBQ2hCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUM1QixJQUFNLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0FBQ3hFLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUM5QixJQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDaEMsSUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQzNDLElBQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUMzQyxJQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDaEMsSUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7QUFDbkQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQzlCLElBQU0sZUFBZSxHQUFHLE9B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QUNMLGVBQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtPQUM5QjtLQUNGOzs7U0FsdURpQixlQUFHO0FBQ25CLFVBQUksQ0FBQyxTQUFTLENBQUMsb0xBQW9MLENBQUMsQ0FBQTtBQUNwTSxhQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQTtLQUNoRDs7O1NBNURvQixTQUFTO0dBQVMsS0FBSyxDQTR4RDdDLENBQUEiLCJmaWxlIjoiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3dvcmtzcGFjZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2UgYmFiZWwnXG5cbmNvbnN0IF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlLXBsdXMnKVxuY29uc3QgdXJsID0gcmVxdWlyZSgndXJsJylcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IHtFbWl0dGVyLCBEaXNwb3NhYmxlLCBDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUoJ2V2ZW50LWtpdCcpXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzLXBsdXMnKVxuY29uc3Qge0RpcmVjdG9yeX0gPSByZXF1aXJlKCdwYXRod2F0Y2hlcicpXG5jb25zdCBHcmltID0gcmVxdWlyZSgnZ3JpbScpXG5jb25zdCBEZWZhdWx0RGlyZWN0b3J5U2VhcmNoZXIgPSByZXF1aXJlKCcuL2RlZmF1bHQtZGlyZWN0b3J5LXNlYXJjaGVyJylcbmNvbnN0IERvY2sgPSByZXF1aXJlKCcuL2RvY2snKVxuY29uc3QgTW9kZWwgPSByZXF1aXJlKCcuL21vZGVsJylcbmNvbnN0IFN0YXRlU3RvcmUgPSByZXF1aXJlKCcuL3N0YXRlLXN0b3JlJylcbmNvbnN0IFRleHRFZGl0b3IgPSByZXF1aXJlKCcuL3RleHQtZWRpdG9yJylcbmNvbnN0IFBhbmVsID0gcmVxdWlyZSgnLi9wYW5lbCcpXG5jb25zdCBQYW5lbENvbnRhaW5lciA9IHJlcXVpcmUoJy4vcGFuZWwtY29udGFpbmVyJylcbmNvbnN0IFRhc2sgPSByZXF1aXJlKCcuL3Rhc2snKVxuY29uc3QgV29ya3NwYWNlQ2VudGVyID0gcmVxdWlyZSgnLi93b3Jrc3BhY2UtY2VudGVyJylcbmNvbnN0IFdvcmtzcGFjZUVsZW1lbnQgPSByZXF1aXJlKCcuL3dvcmtzcGFjZS1lbGVtZW50JylcblxuY29uc3QgU1RPUFBFRF9DSEFOR0lOR19BQ1RJVkVfUEFORV9JVEVNX0RFTEFZID0gMTAwXG5jb25zdCBBTExfTE9DQVRJT05TID0gWydjZW50ZXInLCAnbGVmdCcsICdyaWdodCcsICdib3R0b20nXVxuXG4vLyBFc3NlbnRpYWw6IFJlcHJlc2VudHMgdGhlIHN0YXRlIG9mIHRoZSB1c2VyIGludGVyZmFjZSBmb3IgdGhlIGVudGlyZSB3aW5kb3cuXG4vLyBBbiBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzIGlzIGF2YWlsYWJsZSB2aWEgdGhlIGBhdG9tLndvcmtzcGFjZWAgZ2xvYmFsLlxuLy9cbi8vIEludGVyYWN0IHdpdGggdGhpcyBvYmplY3QgdG8gb3BlbiBmaWxlcywgYmUgbm90aWZpZWQgb2YgY3VycmVudCBhbmQgZnV0dXJlXG4vLyBlZGl0b3JzLCBhbmQgbWFuaXB1bGF0ZSBwYW5lcy4gVG8gYWRkIHBhbmVscywgdXNlIHtXb3Jrc3BhY2U6OmFkZFRvcFBhbmVsfVxuLy8gYW5kIGZyaWVuZHMuXG4vL1xuLy8gIyMgV29ya3NwYWNlIEl0ZW1zXG4vL1xuLy8gVGhlIHRlcm0gXCJpdGVtXCIgcmVmZXJzIHRvIGFueXRoaW5nIHRoYXQgY2FuIGJlIGRpc3BsYXllZFxuLy8gaW4gYSBwYW5lIHdpdGhpbiB0aGUgd29ya3NwYWNlLCBlaXRoZXIgaW4gdGhlIHtXb3Jrc3BhY2VDZW50ZXJ9IG9yIGluIG9uZVxuLy8gb2YgdGhlIHRocmVlIHtEb2NrfXMuIFRoZSB3b3Jrc3BhY2UgZXhwZWN0cyBpdGVtcyB0byBjb25mb3JtIHRvIHRoZVxuLy8gZm9sbG93aW5nIGludGVyZmFjZTpcbi8vXG4vLyAjIyMgUmVxdWlyZWQgTWV0aG9kc1xuLy9cbi8vICMjIyMgYGdldFRpdGxlKClgXG4vL1xuLy8gUmV0dXJucyBhIHtTdHJpbmd9IGNvbnRhaW5pbmcgdGhlIHRpdGxlIG9mIHRoZSBpdGVtIHRvIGRpc3BsYXkgb24gaXRzXG4vLyBhc3NvY2lhdGVkIHRhYi5cbi8vXG4vLyAjIyMgT3B0aW9uYWwgTWV0aG9kc1xuLy9cbi8vICMjIyMgYGdldEVsZW1lbnQoKWBcbi8vXG4vLyBJZiB5b3VyIGl0ZW0gYWxyZWFkeSAqaXMqIGEgRE9NIGVsZW1lbnQsIHlvdSBkbyBub3QgbmVlZCB0byBpbXBsZW1lbnQgdGhpc1xuLy8gbWV0aG9kLiBPdGhlcndpc2UgaXQgc2hvdWxkIHJldHVybiB0aGUgZWxlbWVudCB5b3Ugd2FudCB0byBkaXNwbGF5IHRvXG4vLyByZXByZXNlbnQgdGhpcyBpdGVtLlxuLy9cbi8vICMjIyMgYGRlc3Ryb3koKWBcbi8vXG4vLyBEZXN0cm95cyB0aGUgaXRlbS4gVGhpcyB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBpdGVtIGlzIHJlbW92ZWQgZnJvbSBpdHNcbi8vIHBhcmVudCBwYW5lLlxuLy9cbi8vICMjIyMgYG9uRGlkRGVzdHJveShjYWxsYmFjaylgXG4vL1xuLy8gQ2FsbGVkIGJ5IHRoZSB3b3Jrc3BhY2Ugc28gaXQgY2FuIGJlIG5vdGlmaWVkIHdoZW4gdGhlIGl0ZW0gaXMgZGVzdHJveWVkLlxuLy8gTXVzdCByZXR1cm4gYSB7RGlzcG9zYWJsZX0uXG4vL1xuLy8gIyMjIyBgc2VyaWFsaXplKClgXG4vL1xuLy8gU2VyaWFsaXplIHRoZSBzdGF0ZSBvZiB0aGUgaXRlbS4gTXVzdCByZXR1cm4gYW4gb2JqZWN0IHRoYXQgY2FuIGJlIHBhc3NlZCB0b1xuLy8gYEpTT04uc3RyaW5naWZ5YC4gVGhlIHN0YXRlIHNob3VsZCBpbmNsdWRlIGEgZmllbGQgY2FsbGVkIGBkZXNlcmlhbGl6ZXJgLFxuLy8gd2hpY2ggbmFtZXMgYSBkZXNlcmlhbGl6ZXIgZGVjbGFyZWQgaW4geW91ciBgcGFja2FnZS5qc29uYC4gVGhpcyBtZXRob2QgaXNcbi8vIGludm9rZWQgb24gaXRlbXMgd2hlbiBzZXJpYWxpemluZyB0aGUgd29ya3NwYWNlIHNvIHRoZXkgY2FuIGJlIHJlc3RvcmVkIHRvXG4vLyB0aGUgc2FtZSBsb2NhdGlvbiBsYXRlci5cbi8vXG4vLyAjIyMjIGBnZXRVUkkoKWBcbi8vXG4vLyBSZXR1cm5zIHRoZSBVUkkgYXNzb2NpYXRlZCB3aXRoIHRoZSBpdGVtLlxuLy9cbi8vICMjIyMgYGdldExvbmdUaXRsZSgpYFxuLy9cbi8vIFJldHVybnMgYSB7U3RyaW5nfSBjb250YWluaW5nIGEgbG9uZ2VyIHZlcnNpb24gb2YgdGhlIHRpdGxlIHRvIGRpc3BsYXkgaW5cbi8vIHBsYWNlcyBsaWtlIHRoZSB3aW5kb3cgdGl0bGUgb3Igb24gdGFicyB0aGVpciBzaG9ydCB0aXRsZXMgYXJlIGFtYmlndW91cy5cbi8vXG4vLyAjIyMjIGBvbkRpZENoYW5nZVRpdGxlYFxuLy9cbi8vIENhbGxlZCBieSB0aGUgd29ya3NwYWNlIHNvIGl0IGNhbiBiZSBub3RpZmllZCB3aGVuIHRoZSBpdGVtJ3MgdGl0bGUgY2hhbmdlcy5cbi8vIE11c3QgcmV0dXJuIGEge0Rpc3Bvc2FibGV9LlxuLy9cbi8vICMjIyMgYGdldEljb25OYW1lKClgXG4vL1xuLy8gUmV0dXJuIGEge1N0cmluZ30gd2l0aCB0aGUgbmFtZSBvZiBhbiBpY29uLiBJZiB0aGlzIG1ldGhvZCBpcyBkZWZpbmVkIGFuZFxuLy8gcmV0dXJucyBhIHN0cmluZywgdGhlIGl0ZW0ncyB0YWIgZWxlbWVudCB3aWxsIGJlIHJlbmRlcmVkIHdpdGggdGhlIGBpY29uYCBhbmRcbi8vIGBpY29uLSR7aWNvbk5hbWV9YCBDU1MgY2xhc3Nlcy5cbi8vXG4vLyAjIyMgYG9uRGlkQ2hhbmdlSWNvbihjYWxsYmFjaylgXG4vL1xuLy8gQ2FsbGVkIGJ5IHRoZSB3b3Jrc3BhY2Ugc28gaXQgY2FuIGJlIG5vdGlmaWVkIHdoZW4gdGhlIGl0ZW0ncyBpY29uIGNoYW5nZXMuXG4vLyBNdXN0IHJldHVybiBhIHtEaXNwb3NhYmxlfS5cbi8vXG4vLyAjIyMjIGBnZXREZWZhdWx0TG9jYXRpb24oKWBcbi8vXG4vLyBUZWxscyB0aGUgd29ya3NwYWNlIHdoZXJlIHlvdXIgaXRlbSBzaG91bGQgYmUgb3BlbmVkIGluIGFic2VuY2Ugb2YgYSB1c2VyXG4vLyBvdmVycmlkZS4gSXRlbXMgY2FuIGFwcGVhciBpbiB0aGUgY2VudGVyIG9yIGluIGEgZG9jayBvbiB0aGUgbGVmdCwgcmlnaHQsIG9yXG4vLyBib3R0b20gb2YgdGhlIHdvcmtzcGFjZS5cbi8vXG4vLyBSZXR1cm5zIGEge1N0cmluZ30gd2l0aCBvbmUgb2YgdGhlIGZvbGxvd2luZyB2YWx1ZXM6IGAnY2VudGVyJ2AsIGAnbGVmdCdgLFxuLy8gYCdyaWdodCdgLCBgJ2JvdHRvbSdgLiBJZiB0aGlzIG1ldGhvZCBpcyBub3QgZGVmaW5lZCwgYCdjZW50ZXInYCBpcyB0aGVcbi8vIGRlZmF1bHQuXG4vL1xuLy8gIyMjIyBgZ2V0QWxsb3dlZExvY2F0aW9ucygpYFxuLy9cbi8vIFRlbGxzIHRoZSB3b3Jrc3BhY2Ugd2hlcmUgdGhpcyBpdGVtIGNhbiBiZSBtb3ZlZC4gUmV0dXJucyBhbiB7QXJyYXl9IG9mIG9uZVxuLy8gb3IgbW9yZSBvZiB0aGUgZm9sbG93aW5nIHZhbHVlczogYCdjZW50ZXInYCwgYCdsZWZ0J2AsIGAncmlnaHQnYCwgb3Jcbi8vIGAnYm90dG9tJ2AuXG4vL1xuLy8gIyMjIyBgaXNQZXJtYW5lbnREb2NrSXRlbSgpYFxuLy9cbi8vIFRlbGxzIHRoZSB3b3Jrc3BhY2Ugd2hldGhlciBvciBub3QgdGhpcyBpdGVtIGNhbiBiZSBjbG9zZWQgYnkgdGhlIHVzZXIgYnlcbi8vIGNsaWNraW5nIGFuIGB4YCBvbiBpdHMgdGFiLiBVc2Ugb2YgdGhpcyBmZWF0dXJlIGlzIGRpc2NvdXJhZ2VkIHVubGVzcyB0aGVyZSdzXG4vLyBhIHZlcnkgZ29vZCByZWFzb24gbm90IHRvIGFsbG93IHVzZXJzIHRvIGNsb3NlIHlvdXIgaXRlbS4gSXRlbXMgY2FuIGJlIG1hZGVcbi8vIHBlcm1hbmVudCAqb25seSogd2hlbiB0aGV5IGFyZSBjb250YWluZWQgaW4gZG9ja3MuIENlbnRlciBwYW5lIGl0ZW1zIGNhblxuLy8gYWx3YXlzIGJlIHJlbW92ZWQuIE5vdGUgdGhhdCBpdCBpcyBjdXJyZW50bHkgc3RpbGwgcG9zc2libGUgdG8gY2xvc2UgZG9ja1xuLy8gaXRlbXMgdmlhIHRoZSBgQ2xvc2UgUGFuZWAgb3B0aW9uIGluIHRoZSBjb250ZXh0IG1lbnUgYW5kIHZpYSBBdG9tIEFQSXMsIHNvXG4vLyB5b3Ugc2hvdWxkIHN0aWxsIGJlIHByZXBhcmVkIHRvIGhhbmRsZSB5b3VyIGRvY2sgaXRlbXMgYmVpbmcgZGVzdHJveWVkIGJ5IHRoZVxuLy8gdXNlciBldmVuIGlmIHlvdSBpbXBsZW1lbnQgdGhpcyBtZXRob2QuXG4vL1xuLy8gIyMjIyBgc2F2ZSgpYFxuLy9cbi8vIFNhdmVzIHRoZSBpdGVtLlxuLy9cbi8vICMjIyMgYHNhdmVBcyhwYXRoKWBcbi8vXG4vLyBTYXZlcyB0aGUgaXRlbSB0byB0aGUgc3BlY2lmaWVkIHBhdGguXG4vL1xuLy8gIyMjIyBgZ2V0UGF0aCgpYFxuLy9cbi8vIFJldHVybnMgdGhlIGxvY2FsIHBhdGggYXNzb2NpYXRlZCB3aXRoIHRoaXMgaXRlbS4gVGhpcyBpcyBvbmx5IHVzZWQgdG8gc2V0XG4vLyB0aGUgaW5pdGlhbCBsb2NhdGlvbiBvZiB0aGUgXCJzYXZlIGFzXCIgZGlhbG9nLlxuLy9cbi8vICMjIyMgYGlzTW9kaWZpZWQoKWBcbi8vXG4vLyBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBpdGVtIGlzIG1vZGlmaWVkIHRvIHJlZmxlY3QgbW9kaWZpY2F0aW9uIGluIHRoZVxuLy8gVUkuXG4vL1xuLy8gIyMjIyBgb25EaWRDaGFuZ2VNb2RpZmllZCgpYFxuLy9cbi8vIENhbGxlZCBieSB0aGUgd29ya3NwYWNlIHNvIGl0IGNhbiBiZSBub3RpZmllZCB3aGVuIGl0ZW0ncyBtb2RpZmllZCBzdGF0dXNcbi8vIGNoYW5nZXMuIE11c3QgcmV0dXJuIGEge0Rpc3Bvc2FibGV9LlxuLy9cbi8vICMjIyMgYGNvcHkoKWBcbi8vXG4vLyBDcmVhdGUgYSBjb3B5IG9mIHRoZSBpdGVtLiBJZiBkZWZpbmVkLCB0aGUgd29ya3NwYWNlIHdpbGwgY2FsbCB0aGlzIG1ldGhvZCB0b1xuLy8gZHVwbGljYXRlIHRoZSBpdGVtIHdoZW4gc3BsaXR0aW5nIHBhbmVzIHZpYSBjZXJ0YWluIHNwbGl0IGNvbW1hbmRzLlxuLy9cbi8vICMjIyMgYGdldFByZWZlcnJlZEhlaWdodCgpYFxuLy9cbi8vIElmIHRoaXMgaXRlbSBpcyBkaXNwbGF5ZWQgaW4gdGhlIGJvdHRvbSB7RG9ja30sIGNhbGxlZCBieSB0aGUgd29ya3NwYWNlIHdoZW5cbi8vIGluaXRpYWxseSBkaXNwbGF5aW5nIHRoZSBkb2NrIHRvIHNldCBpdHMgaGVpZ2h0LiBPbmNlIHRoZSBkb2NrIGhhcyBiZWVuXG4vLyByZXNpemVkIGJ5IHRoZSB1c2VyLCB0aGVpciBoZWlnaHQgd2lsbCBvdmVycmlkZSB0aGlzIHZhbHVlLlxuLy9cbi8vIFJldHVybnMgYSB7TnVtYmVyfS5cbi8vXG4vLyAjIyMjIGBnZXRQcmVmZXJyZWRXaWR0aCgpYFxuLy9cbi8vIElmIHRoaXMgaXRlbSBpcyBkaXNwbGF5ZWQgaW4gdGhlIGxlZnQgb3IgcmlnaHQge0RvY2t9LCBjYWxsZWQgYnkgdGhlXG4vLyB3b3Jrc3BhY2Ugd2hlbiBpbml0aWFsbHkgZGlzcGxheWluZyB0aGUgZG9jayB0byBzZXQgaXRzIHdpZHRoLiBPbmNlIHRoZSBkb2NrXG4vLyBoYXMgYmVlbiByZXNpemVkIGJ5IHRoZSB1c2VyLCB0aGVpciB3aWR0aCB3aWxsIG92ZXJyaWRlIHRoaXMgdmFsdWUuXG4vL1xuLy8gUmV0dXJucyBhIHtOdW1iZXJ9LlxuLy9cbi8vICMjIyMgYG9uRGlkVGVybWluYXRlUGVuZGluZ1N0YXRlKGNhbGxiYWNrKWBcbi8vXG4vLyBJZiB0aGUgd29ya3NwYWNlIGlzIGNvbmZpZ3VyZWQgdG8gdXNlICpwZW5kaW5nIHBhbmUgaXRlbXMqLCB0aGUgd29ya3NwYWNlXG4vLyB3aWxsIHN1YnNjcmliZSB0byB0aGlzIG1ldGhvZCB0byB0ZXJtaW5hdGUgdGhlIHBlbmRpbmcgc3RhdGUgb2YgdGhlIGl0ZW0uXG4vLyBNdXN0IHJldHVybiBhIHtEaXNwb3NhYmxlfS5cbi8vXG4vLyAjIyMjIGBzaG91bGRQcm9tcHRUb1NhdmUoKWBcbi8vXG4vLyBUaGlzIG1ldGhvZCBpbmRpY2F0ZXMgd2hldGhlciBBdG9tIHNob3VsZCBwcm9tcHQgdGhlIHVzZXIgdG8gc2F2ZSB0aGlzIGl0ZW1cbi8vIHdoZW4gdGhlIHVzZXIgY2xvc2VzIG9yIHJlbG9hZHMgdGhlIHdpbmRvdy4gUmV0dXJucyBhIGJvb2xlYW4uXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFdvcmtzcGFjZSBleHRlbmRzIE1vZGVsIHtcbiAgY29uc3RydWN0b3IgKHBhcmFtcykge1xuICAgIHN1cGVyKC4uLmFyZ3VtZW50cylcblxuICAgIHRoaXMudXBkYXRlV2luZG93VGl0bGUgPSB0aGlzLnVwZGF0ZVdpbmRvd1RpdGxlLmJpbmQodGhpcylcbiAgICB0aGlzLnVwZGF0ZURvY3VtZW50RWRpdGVkID0gdGhpcy51cGRhdGVEb2N1bWVudEVkaXRlZC5iaW5kKHRoaXMpXG4gICAgdGhpcy5kaWREZXN0cm95UGFuZUl0ZW0gPSB0aGlzLmRpZERlc3Ryb3lQYW5lSXRlbS5iaW5kKHRoaXMpXG4gICAgdGhpcy5kaWRDaGFuZ2VBY3RpdmVQYW5lT25QYW5lQ29udGFpbmVyID0gdGhpcy5kaWRDaGFuZ2VBY3RpdmVQYW5lT25QYW5lQ29udGFpbmVyLmJpbmQodGhpcylcbiAgICB0aGlzLmRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtT25QYW5lQ29udGFpbmVyID0gdGhpcy5kaWRDaGFuZ2VBY3RpdmVQYW5lSXRlbU9uUGFuZUNvbnRhaW5lci5iaW5kKHRoaXMpXG4gICAgdGhpcy5kaWRBY3RpdmF0ZVBhbmVDb250YWluZXIgPSB0aGlzLmRpZEFjdGl2YXRlUGFuZUNvbnRhaW5lci5iaW5kKHRoaXMpXG4gICAgdGhpcy5kaWRIaWRlRG9jayA9IHRoaXMuZGlkSGlkZURvY2suYmluZCh0aGlzKVxuXG4gICAgdGhpcy5lbmFibGVQZXJzaXN0ZW5jZSA9IHBhcmFtcy5lbmFibGVQZXJzaXN0ZW5jZVxuICAgIHRoaXMucGFja2FnZU1hbmFnZXIgPSBwYXJhbXMucGFja2FnZU1hbmFnZXJcbiAgICB0aGlzLmNvbmZpZyA9IHBhcmFtcy5jb25maWdcbiAgICB0aGlzLnByb2plY3QgPSBwYXJhbXMucHJvamVjdFxuICAgIHRoaXMubm90aWZpY2F0aW9uTWFuYWdlciA9IHBhcmFtcy5ub3RpZmljYXRpb25NYW5hZ2VyXG4gICAgdGhpcy52aWV3UmVnaXN0cnkgPSBwYXJhbXMudmlld1JlZ2lzdHJ5XG4gICAgdGhpcy5ncmFtbWFyUmVnaXN0cnkgPSBwYXJhbXMuZ3JhbW1hclJlZ2lzdHJ5XG4gICAgdGhpcy5hcHBsaWNhdGlvbkRlbGVnYXRlID0gcGFyYW1zLmFwcGxpY2F0aW9uRGVsZWdhdGVcbiAgICB0aGlzLmFzc2VydCA9IHBhcmFtcy5hc3NlcnRcbiAgICB0aGlzLmRlc2VyaWFsaXplck1hbmFnZXIgPSBwYXJhbXMuZGVzZXJpYWxpemVyTWFuYWdlclxuICAgIHRoaXMudGV4dEVkaXRvclJlZ2lzdHJ5ID0gcGFyYW1zLnRleHRFZGl0b3JSZWdpc3RyeVxuICAgIHRoaXMuc3R5bGVNYW5hZ2VyID0gcGFyYW1zLnN0eWxlTWFuYWdlclxuICAgIHRoaXMuZHJhZ2dpbmdJdGVtID0gZmFsc2VcbiAgICB0aGlzLml0ZW1Mb2NhdGlvblN0b3JlID0gbmV3IFN0YXRlU3RvcmUoJ0F0b21QcmV2aW91c0l0ZW1Mb2NhdGlvbnMnLCAxKVxuXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IEVtaXR0ZXIoKVxuICAgIHRoaXMub3BlbmVycyA9IFtdXG4gICAgdGhpcy5kZXN0cm95ZWRJdGVtVVJJcyA9IFtdXG4gICAgdGhpcy5zdG9wcGVkQ2hhbmdpbmdBY3RpdmVQYW5lSXRlbVRpbWVvdXQgPSBudWxsXG5cbiAgICB0aGlzLmRlZmF1bHREaXJlY3RvcnlTZWFyY2hlciA9IG5ldyBEZWZhdWx0RGlyZWN0b3J5U2VhcmNoZXIoKVxuICAgIHRoaXMuY29uc3VtZVNlcnZpY2VzKHRoaXMucGFja2FnZU1hbmFnZXIpXG5cbiAgICB0aGlzLnBhbmVDb250YWluZXJzID0ge1xuICAgICAgY2VudGVyOiB0aGlzLmNyZWF0ZUNlbnRlcigpLFxuICAgICAgbGVmdDogdGhpcy5jcmVhdGVEb2NrKCdsZWZ0JyksXG4gICAgICByaWdodDogdGhpcy5jcmVhdGVEb2NrKCdyaWdodCcpLFxuICAgICAgYm90dG9tOiB0aGlzLmNyZWF0ZURvY2soJ2JvdHRvbScpXG4gICAgfVxuICAgIHRoaXMuYWN0aXZlUGFuZUNvbnRhaW5lciA9IHRoaXMucGFuZUNvbnRhaW5lcnMuY2VudGVyXG4gICAgdGhpcy5oYXNBY3RpdmVUZXh0RWRpdG9yID0gZmFsc2VcblxuICAgIHRoaXMucGFuZWxDb250YWluZXJzID0ge1xuICAgICAgdG9wOiBuZXcgUGFuZWxDb250YWluZXIoe3ZpZXdSZWdpc3RyeTogdGhpcy52aWV3UmVnaXN0cnksIGxvY2F0aW9uOiAndG9wJ30pLFxuICAgICAgbGVmdDogbmV3IFBhbmVsQ29udGFpbmVyKHt2aWV3UmVnaXN0cnk6IHRoaXMudmlld1JlZ2lzdHJ5LCBsb2NhdGlvbjogJ2xlZnQnLCBkb2NrOiB0aGlzLnBhbmVDb250YWluZXJzLmxlZnR9KSxcbiAgICAgIHJpZ2h0OiBuZXcgUGFuZWxDb250YWluZXIoe3ZpZXdSZWdpc3RyeTogdGhpcy52aWV3UmVnaXN0cnksIGxvY2F0aW9uOiAncmlnaHQnLCBkb2NrOiB0aGlzLnBhbmVDb250YWluZXJzLnJpZ2h0fSksXG4gICAgICBib3R0b206IG5ldyBQYW5lbENvbnRhaW5lcih7dmlld1JlZ2lzdHJ5OiB0aGlzLnZpZXdSZWdpc3RyeSwgbG9jYXRpb246ICdib3R0b20nLCBkb2NrOiB0aGlzLnBhbmVDb250YWluZXJzLmJvdHRvbX0pLFxuICAgICAgaGVhZGVyOiBuZXcgUGFuZWxDb250YWluZXIoe3ZpZXdSZWdpc3RyeTogdGhpcy52aWV3UmVnaXN0cnksIGxvY2F0aW9uOiAnaGVhZGVyJ30pLFxuICAgICAgZm9vdGVyOiBuZXcgUGFuZWxDb250YWluZXIoe3ZpZXdSZWdpc3RyeTogdGhpcy52aWV3UmVnaXN0cnksIGxvY2F0aW9uOiAnZm9vdGVyJ30pLFxuICAgICAgbW9kYWw6IG5ldyBQYW5lbENvbnRhaW5lcih7dmlld1JlZ2lzdHJ5OiB0aGlzLnZpZXdSZWdpc3RyeSwgbG9jYXRpb246ICdtb2RhbCd9KVxuICAgIH1cblxuICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKVxuICB9XG5cbiAgZ2V0IHBhbmVDb250YWluZXIgKCkge1xuICAgIEdyaW0uZGVwcmVjYXRlKCdgYXRvbS53b3Jrc3BhY2UucGFuZUNvbnRhaW5lcmAgaGFzIGFsd2F5cyBiZWVuIHByaXZhdGUsIGJ1dCBpdCBpcyBub3cgZ29uZS4gUGxlYXNlIHVzZSBgYXRvbS53b3Jrc3BhY2UuZ2V0Q2VudGVyKClgIGluc3RlYWQgYW5kIGNvbnN1bHQgdGhlIHdvcmtzcGFjZSBBUEkgZG9jcyBmb3IgcHVibGljIG1ldGhvZHMuJylcbiAgICByZXR1cm4gdGhpcy5wYW5lQ29udGFpbmVycy5jZW50ZXIucGFuZUNvbnRhaW5lclxuICB9XG5cbiAgZ2V0RWxlbWVudCAoKSB7XG4gICAgaWYgKCF0aGlzLmVsZW1lbnQpIHtcbiAgICAgIHRoaXMuZWxlbWVudCA9IG5ldyBXb3Jrc3BhY2VFbGVtZW50KCkuaW5pdGlhbGl6ZSh0aGlzLCB7XG4gICAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICAgIHByb2plY3Q6IHRoaXMucHJvamVjdCxcbiAgICAgICAgdmlld1JlZ2lzdHJ5OiB0aGlzLnZpZXdSZWdpc3RyeSxcbiAgICAgICAgc3R5bGVNYW5hZ2VyOiB0aGlzLnN0eWxlTWFuYWdlclxuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudFxuICB9XG5cbiAgY3JlYXRlQ2VudGVyICgpIHtcbiAgICByZXR1cm4gbmV3IFdvcmtzcGFjZUNlbnRlcih7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgYXBwbGljYXRpb25EZWxlZ2F0ZTogdGhpcy5hcHBsaWNhdGlvbkRlbGVnYXRlLFxuICAgICAgbm90aWZpY2F0aW9uTWFuYWdlcjogdGhpcy5ub3RpZmljYXRpb25NYW5hZ2VyLFxuICAgICAgZGVzZXJpYWxpemVyTWFuYWdlcjogdGhpcy5kZXNlcmlhbGl6ZXJNYW5hZ2VyLFxuICAgICAgdmlld1JlZ2lzdHJ5OiB0aGlzLnZpZXdSZWdpc3RyeSxcbiAgICAgIGRpZEFjdGl2YXRlOiB0aGlzLmRpZEFjdGl2YXRlUGFuZUNvbnRhaW5lcixcbiAgICAgIGRpZENoYW5nZUFjdGl2ZVBhbmU6IHRoaXMuZGlkQ2hhbmdlQWN0aXZlUGFuZU9uUGFuZUNvbnRhaW5lcixcbiAgICAgIGRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtOiB0aGlzLmRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtT25QYW5lQ29udGFpbmVyLFxuICAgICAgZGlkRGVzdHJveVBhbmVJdGVtOiB0aGlzLmRpZERlc3Ryb3lQYW5lSXRlbVxuICAgIH0pXG4gIH1cblxuICBjcmVhdGVEb2NrIChsb2NhdGlvbikge1xuICAgIHJldHVybiBuZXcgRG9jayh7XG4gICAgICBsb2NhdGlvbixcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBhcHBsaWNhdGlvbkRlbGVnYXRlOiB0aGlzLmFwcGxpY2F0aW9uRGVsZWdhdGUsXG4gICAgICBkZXNlcmlhbGl6ZXJNYW5hZ2VyOiB0aGlzLmRlc2VyaWFsaXplck1hbmFnZXIsXG4gICAgICBub3RpZmljYXRpb25NYW5hZ2VyOiB0aGlzLm5vdGlmaWNhdGlvbk1hbmFnZXIsXG4gICAgICB2aWV3UmVnaXN0cnk6IHRoaXMudmlld1JlZ2lzdHJ5LFxuICAgICAgZGlkSGlkZTogdGhpcy5kaWRIaWRlRG9jayxcbiAgICAgIGRpZEFjdGl2YXRlOiB0aGlzLmRpZEFjdGl2YXRlUGFuZUNvbnRhaW5lcixcbiAgICAgIGRpZENoYW5nZUFjdGl2ZVBhbmU6IHRoaXMuZGlkQ2hhbmdlQWN0aXZlUGFuZU9uUGFuZUNvbnRhaW5lcixcbiAgICAgIGRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtOiB0aGlzLmRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtT25QYW5lQ29udGFpbmVyLFxuICAgICAgZGlkRGVzdHJveVBhbmVJdGVtOiB0aGlzLmRpZERlc3Ryb3lQYW5lSXRlbVxuICAgIH0pXG4gIH1cblxuICByZXNldCAocGFja2FnZU1hbmFnZXIpIHtcbiAgICB0aGlzLnBhY2thZ2VNYW5hZ2VyID0gcGFja2FnZU1hbmFnZXJcbiAgICB0aGlzLmVtaXR0ZXIuZGlzcG9zZSgpXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IEVtaXR0ZXIoKVxuXG4gICAgdGhpcy5wYW5lQ29udGFpbmVycy5jZW50ZXIuZGVzdHJveSgpXG4gICAgdGhpcy5wYW5lQ29udGFpbmVycy5sZWZ0LmRlc3Ryb3koKVxuICAgIHRoaXMucGFuZUNvbnRhaW5lcnMucmlnaHQuZGVzdHJveSgpXG4gICAgdGhpcy5wYW5lQ29udGFpbmVycy5ib3R0b20uZGVzdHJveSgpXG5cbiAgICBfLnZhbHVlcyh0aGlzLnBhbmVsQ29udGFpbmVycykuZm9yRWFjaChwYW5lbENvbnRhaW5lciA9PiB7IHBhbmVsQ29udGFpbmVyLmRlc3Ryb3koKSB9KVxuXG4gICAgdGhpcy5wYW5lQ29udGFpbmVycyA9IHtcbiAgICAgIGNlbnRlcjogdGhpcy5jcmVhdGVDZW50ZXIoKSxcbiAgICAgIGxlZnQ6IHRoaXMuY3JlYXRlRG9jaygnbGVmdCcpLFxuICAgICAgcmlnaHQ6IHRoaXMuY3JlYXRlRG9jaygncmlnaHQnKSxcbiAgICAgIGJvdHRvbTogdGhpcy5jcmVhdGVEb2NrKCdib3R0b20nKVxuICAgIH1cbiAgICB0aGlzLmFjdGl2ZVBhbmVDb250YWluZXIgPSB0aGlzLnBhbmVDb250YWluZXJzLmNlbnRlclxuICAgIHRoaXMuaGFzQWN0aXZlVGV4dEVkaXRvciA9IGZhbHNlXG5cbiAgICB0aGlzLnBhbmVsQ29udGFpbmVycyA9IHtcbiAgICAgIHRvcDogbmV3IFBhbmVsQ29udGFpbmVyKHt2aWV3UmVnaXN0cnk6IHRoaXMudmlld1JlZ2lzdHJ5LCBsb2NhdGlvbjogJ3RvcCd9KSxcbiAgICAgIGxlZnQ6IG5ldyBQYW5lbENvbnRhaW5lcih7dmlld1JlZ2lzdHJ5OiB0aGlzLnZpZXdSZWdpc3RyeSwgbG9jYXRpb246ICdsZWZ0JywgZG9jazogdGhpcy5wYW5lQ29udGFpbmVycy5sZWZ0fSksXG4gICAgICByaWdodDogbmV3IFBhbmVsQ29udGFpbmVyKHt2aWV3UmVnaXN0cnk6IHRoaXMudmlld1JlZ2lzdHJ5LCBsb2NhdGlvbjogJ3JpZ2h0JywgZG9jazogdGhpcy5wYW5lQ29udGFpbmVycy5yaWdodH0pLFxuICAgICAgYm90dG9tOiBuZXcgUGFuZWxDb250YWluZXIoe3ZpZXdSZWdpc3RyeTogdGhpcy52aWV3UmVnaXN0cnksIGxvY2F0aW9uOiAnYm90dG9tJywgZG9jazogdGhpcy5wYW5lQ29udGFpbmVycy5ib3R0b219KSxcbiAgICAgIGhlYWRlcjogbmV3IFBhbmVsQ29udGFpbmVyKHt2aWV3UmVnaXN0cnk6IHRoaXMudmlld1JlZ2lzdHJ5LCBsb2NhdGlvbjogJ2hlYWRlcid9KSxcbiAgICAgIGZvb3RlcjogbmV3IFBhbmVsQ29udGFpbmVyKHt2aWV3UmVnaXN0cnk6IHRoaXMudmlld1JlZ2lzdHJ5LCBsb2NhdGlvbjogJ2Zvb3Rlcid9KSxcbiAgICAgIG1vZGFsOiBuZXcgUGFuZWxDb250YWluZXIoe3ZpZXdSZWdpc3RyeTogdGhpcy52aWV3UmVnaXN0cnksIGxvY2F0aW9uOiAnbW9kYWwnfSlcbiAgICB9XG5cbiAgICB0aGlzLm9yaWdpbmFsRm9udFNpemUgPSBudWxsXG4gICAgdGhpcy5vcGVuZXJzID0gW11cbiAgICB0aGlzLmRlc3Ryb3llZEl0ZW1VUklzID0gW11cbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsXG4gICAgdGhpcy5jb25zdW1lU2VydmljZXModGhpcy5wYWNrYWdlTWFuYWdlcilcbiAgfVxuXG4gIHN1YnNjcmliZVRvRXZlbnRzICgpIHtcbiAgICB0aGlzLnByb2plY3Qub25EaWRDaGFuZ2VQYXRocyh0aGlzLnVwZGF0ZVdpbmRvd1RpdGxlKVxuICAgIHRoaXMuc3Vic2NyaWJlVG9Gb250U2l6ZSgpXG4gICAgdGhpcy5zdWJzY3JpYmVUb0FkZGVkSXRlbXMoKVxuICAgIHRoaXMuc3Vic2NyaWJlVG9Nb3ZlZEl0ZW1zKClcbiAgfVxuXG4gIGNvbnN1bWVTZXJ2aWNlcyAoe3NlcnZpY2VIdWJ9KSB7XG4gICAgdGhpcy5kaXJlY3RvcnlTZWFyY2hlcnMgPSBbXVxuICAgIHNlcnZpY2VIdWIuY29uc3VtZShcbiAgICAgICdhdG9tLmRpcmVjdG9yeS1zZWFyY2hlcicsXG4gICAgICAnXjAuMS4wJyxcbiAgICAgIHByb3ZpZGVyID0+IHRoaXMuZGlyZWN0b3J5U2VhcmNoZXJzLnVuc2hpZnQocHJvdmlkZXIpXG4gICAgKVxuICB9XG5cbiAgLy8gQ2FsbGVkIGJ5IHRoZSBTZXJpYWxpemFibGUgbWl4aW4gZHVyaW5nIHNlcmlhbGl6YXRpb24uXG4gIHNlcmlhbGl6ZSAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRlc2VyaWFsaXplcjogJ1dvcmtzcGFjZScsXG4gICAgICBwYWNrYWdlc1dpdGhBY3RpdmVHcmFtbWFyczogdGhpcy5nZXRQYWNrYWdlTmFtZXNXaXRoQWN0aXZlR3JhbW1hcnMoKSxcbiAgICAgIGRlc3Ryb3llZEl0ZW1VUklzOiB0aGlzLmRlc3Ryb3llZEl0ZW1VUklzLnNsaWNlKCksXG4gICAgICAvLyBFbnN1cmUgZGVzZXJpYWxpemluZyAxLjE3IHN0YXRlIHdpdGggcHJlIDEuMTcgQXRvbSBkb2VzIG5vdCBlcnJvclxuICAgICAgLy8gVE9ETzogUmVtb3ZlIGFmdGVyIDEuMTcgaGFzIGJlZW4gb24gc3RhYmxlIGZvciBhIHdoaWxlXG4gICAgICBwYW5lQ29udGFpbmVyOiB7dmVyc2lvbjogMn0sXG4gICAgICBwYW5lQ29udGFpbmVyczoge1xuICAgICAgICBjZW50ZXI6IHRoaXMucGFuZUNvbnRhaW5lcnMuY2VudGVyLnNlcmlhbGl6ZSgpLFxuICAgICAgICBsZWZ0OiB0aGlzLnBhbmVDb250YWluZXJzLmxlZnQuc2VyaWFsaXplKCksXG4gICAgICAgIHJpZ2h0OiB0aGlzLnBhbmVDb250YWluZXJzLnJpZ2h0LnNlcmlhbGl6ZSgpLFxuICAgICAgICBib3R0b206IHRoaXMucGFuZUNvbnRhaW5lcnMuYm90dG9tLnNlcmlhbGl6ZSgpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZGVzZXJpYWxpemUgKHN0YXRlLCBkZXNlcmlhbGl6ZXJNYW5hZ2VyKSB7XG4gICAgY29uc3QgcGFja2FnZXNXaXRoQWN0aXZlR3JhbW1hcnMgPVxuICAgICAgc3RhdGUucGFja2FnZXNXaXRoQWN0aXZlR3JhbW1hcnMgIT0gbnVsbCA/IHN0YXRlLnBhY2thZ2VzV2l0aEFjdGl2ZUdyYW1tYXJzIDogW11cbiAgICBmb3IgKGxldCBwYWNrYWdlTmFtZSBvZiBwYWNrYWdlc1dpdGhBY3RpdmVHcmFtbWFycykge1xuICAgICAgY29uc3QgcGtnID0gdGhpcy5wYWNrYWdlTWFuYWdlci5nZXRMb2FkZWRQYWNrYWdlKHBhY2thZ2VOYW1lKVxuICAgICAgaWYgKHBrZyAhPSBudWxsKSB7XG4gICAgICAgIHBrZy5sb2FkR3JhbW1hcnNTeW5jKClcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHN0YXRlLmRlc3Ryb3llZEl0ZW1VUklzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuZGVzdHJveWVkSXRlbVVSSXMgPSBzdGF0ZS5kZXN0cm95ZWRJdGVtVVJJc1xuICAgIH1cblxuICAgIGlmIChzdGF0ZS5wYW5lQ29udGFpbmVycykge1xuICAgICAgdGhpcy5wYW5lQ29udGFpbmVycy5jZW50ZXIuZGVzZXJpYWxpemUoc3RhdGUucGFuZUNvbnRhaW5lcnMuY2VudGVyLCBkZXNlcmlhbGl6ZXJNYW5hZ2VyKVxuICAgICAgdGhpcy5wYW5lQ29udGFpbmVycy5sZWZ0LmRlc2VyaWFsaXplKHN0YXRlLnBhbmVDb250YWluZXJzLmxlZnQsIGRlc2VyaWFsaXplck1hbmFnZXIpXG4gICAgICB0aGlzLnBhbmVDb250YWluZXJzLnJpZ2h0LmRlc2VyaWFsaXplKHN0YXRlLnBhbmVDb250YWluZXJzLnJpZ2h0LCBkZXNlcmlhbGl6ZXJNYW5hZ2VyKVxuICAgICAgdGhpcy5wYW5lQ29udGFpbmVycy5ib3R0b20uZGVzZXJpYWxpemUoc3RhdGUucGFuZUNvbnRhaW5lcnMuYm90dG9tLCBkZXNlcmlhbGl6ZXJNYW5hZ2VyKVxuICAgIH0gZWxzZSBpZiAoc3RhdGUucGFuZUNvbnRhaW5lcikge1xuICAgICAgLy8gVE9ETzogUmVtb3ZlIHRoaXMgZmFsbGJhY2sgb25jZSBhIGxvdCBvZiB0aW1lIGhhcyBwYXNzZWQgc2luY2UgMS4xNyB3YXMgcmVsZWFzZWRcbiAgICAgIHRoaXMucGFuZUNvbnRhaW5lcnMuY2VudGVyLmRlc2VyaWFsaXplKHN0YXRlLnBhbmVDb250YWluZXIsIGRlc2VyaWFsaXplck1hbmFnZXIpXG4gICAgfVxuXG4gICAgdGhpcy5oYXNBY3RpdmVUZXh0RWRpdG9yID0gdGhpcy5nZXRBY3RpdmVUZXh0RWRpdG9yKCkgIT0gbnVsbFxuXG4gICAgdGhpcy51cGRhdGVXaW5kb3dUaXRsZSgpXG4gIH1cblxuICBnZXRQYWNrYWdlTmFtZXNXaXRoQWN0aXZlR3JhbW1hcnMgKCkge1xuICAgIGNvbnN0IHBhY2thZ2VOYW1lcyA9IFtdXG4gICAgY29uc3QgYWRkR3JhbW1hciA9ICh7aW5jbHVkZWRHcmFtbWFyU2NvcGVzLCBwYWNrYWdlTmFtZX0gPSB7fSkgPT4ge1xuICAgICAgaWYgKCFwYWNrYWdlTmFtZSkgeyByZXR1cm4gfVxuICAgICAgLy8gUHJldmVudCBjeWNsZXNcbiAgICAgIGlmIChwYWNrYWdlTmFtZXMuaW5kZXhPZihwYWNrYWdlTmFtZSkgIT09IC0xKSB7IHJldHVybiB9XG5cbiAgICAgIHBhY2thZ2VOYW1lcy5wdXNoKHBhY2thZ2VOYW1lKVxuICAgICAgZm9yIChsZXQgc2NvcGVOYW1lIG9mIGluY2x1ZGVkR3JhbW1hclNjb3BlcyAhPSBudWxsID8gaW5jbHVkZWRHcmFtbWFyU2NvcGVzIDogW10pIHtcbiAgICAgICAgYWRkR3JhbW1hcih0aGlzLmdyYW1tYXJSZWdpc3RyeS5ncmFtbWFyRm9yU2NvcGVOYW1lKHNjb3BlTmFtZSkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZWRpdG9ycyA9IHRoaXMuZ2V0VGV4dEVkaXRvcnMoKVxuICAgIGZvciAobGV0IGVkaXRvciBvZiBlZGl0b3JzKSB7IGFkZEdyYW1tYXIoZWRpdG9yLmdldEdyYW1tYXIoKSkgfVxuXG4gICAgaWYgKGVkaXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChsZXQgZ3JhbW1hciBvZiB0aGlzLmdyYW1tYXJSZWdpc3RyeS5nZXRHcmFtbWFycygpKSB7XG4gICAgICAgIGlmIChncmFtbWFyLmluamVjdGlvblNlbGVjdG9yKSB7XG4gICAgICAgICAgYWRkR3JhbW1hcihncmFtbWFyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF8udW5pcShwYWNrYWdlTmFtZXMpXG4gIH1cblxuICBkaWRBY3RpdmF0ZVBhbmVDb250YWluZXIgKHBhbmVDb250YWluZXIpIHtcbiAgICBpZiAocGFuZUNvbnRhaW5lciAhPT0gdGhpcy5nZXRBY3RpdmVQYW5lQ29udGFpbmVyKCkpIHtcbiAgICAgIHRoaXMuYWN0aXZlUGFuZUNvbnRhaW5lciA9IHBhbmVDb250YWluZXJcbiAgICAgIHRoaXMuZGlkQ2hhbmdlQWN0aXZlUGFuZUl0ZW0odGhpcy5hY3RpdmVQYW5lQ29udGFpbmVyLmdldEFjdGl2ZVBhbmVJdGVtKCkpXG4gICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWNoYW5nZS1hY3RpdmUtcGFuZS1jb250YWluZXInLCB0aGlzLmFjdGl2ZVBhbmVDb250YWluZXIpXG4gICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWNoYW5nZS1hY3RpdmUtcGFuZScsIHRoaXMuYWN0aXZlUGFuZUNvbnRhaW5lci5nZXRBY3RpdmVQYW5lKCkpXG4gICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWNoYW5nZS1hY3RpdmUtcGFuZS1pdGVtJywgdGhpcy5hY3RpdmVQYW5lQ29udGFpbmVyLmdldEFjdGl2ZVBhbmVJdGVtKCkpXG4gICAgfVxuICB9XG5cbiAgZGlkQ2hhbmdlQWN0aXZlUGFuZU9uUGFuZUNvbnRhaW5lciAocGFuZUNvbnRhaW5lciwgcGFuZSkge1xuICAgIGlmIChwYW5lQ29udGFpbmVyID09PSB0aGlzLmdldEFjdGl2ZVBhbmVDb250YWluZXIoKSkge1xuICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1jaGFuZ2UtYWN0aXZlLXBhbmUnLCBwYW5lKVxuICAgIH1cbiAgfVxuXG4gIGRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtT25QYW5lQ29udGFpbmVyIChwYW5lQ29udGFpbmVyLCBpdGVtKSB7XG4gICAgaWYgKHBhbmVDb250YWluZXIgPT09IHRoaXMuZ2V0QWN0aXZlUGFuZUNvbnRhaW5lcigpKSB7XG4gICAgICB0aGlzLmRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtKGl0ZW0pXG4gICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWNoYW5nZS1hY3RpdmUtcGFuZS1pdGVtJywgaXRlbSlcbiAgICB9XG5cbiAgICBpZiAocGFuZUNvbnRhaW5lciA9PT0gdGhpcy5nZXRDZW50ZXIoKSkge1xuICAgICAgY29uc3QgaGFkQWN0aXZlVGV4dEVkaXRvciA9IHRoaXMuaGFzQWN0aXZlVGV4dEVkaXRvclxuICAgICAgdGhpcy5oYXNBY3RpdmVUZXh0RWRpdG9yID0gaXRlbSBpbnN0YW5jZW9mIFRleHRFZGl0b3JcblxuICAgICAgaWYgKHRoaXMuaGFzQWN0aXZlVGV4dEVkaXRvciB8fCBoYWRBY3RpdmVUZXh0RWRpdG9yKSB7XG4gICAgICAgIGNvbnN0IGl0ZW1WYWx1ZSA9IHRoaXMuaGFzQWN0aXZlVGV4dEVkaXRvciA/IGl0ZW0gOiB1bmRlZmluZWRcbiAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1jaGFuZ2UtYWN0aXZlLXRleHQtZWRpdG9yJywgaXRlbVZhbHVlKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtIChpdGVtKSB7XG4gICAgdGhpcy51cGRhdGVXaW5kb3dUaXRsZSgpXG4gICAgdGhpcy51cGRhdGVEb2N1bWVudEVkaXRlZCgpXG4gICAgaWYgKHRoaXMuYWN0aXZlSXRlbVN1YnNjcmlwdGlvbnMpIHRoaXMuYWN0aXZlSXRlbVN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG4gICAgdGhpcy5hY3RpdmVJdGVtU3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcblxuICAgIGxldCBtb2RpZmllZFN1YnNjcmlwdGlvbiwgdGl0bGVTdWJzY3JpcHRpb25cblxuICAgIGlmIChpdGVtICE9IG51bGwgJiYgdHlwZW9mIGl0ZW0ub25EaWRDaGFuZ2VUaXRsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGl0bGVTdWJzY3JpcHRpb24gPSBpdGVtLm9uRGlkQ2hhbmdlVGl0bGUodGhpcy51cGRhdGVXaW5kb3dUaXRsZSlcbiAgICB9IGVsc2UgaWYgKGl0ZW0gIT0gbnVsbCAmJiB0eXBlb2YgaXRlbS5vbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGl0bGVTdWJzY3JpcHRpb24gPSBpdGVtLm9uKCd0aXRsZS1jaGFuZ2VkJywgdGhpcy51cGRhdGVXaW5kb3dUaXRsZSlcbiAgICAgIGlmICh0aXRsZVN1YnNjcmlwdGlvbiA9PSBudWxsIHx8IHR5cGVvZiB0aXRsZVN1YnNjcmlwdGlvbi5kaXNwb3NlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRpdGxlU3Vic2NyaXB0aW9uID0gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgICAgIGl0ZW0ub2ZmKCd0aXRsZS1jaGFuZ2VkJywgdGhpcy51cGRhdGVXaW5kb3dUaXRsZSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXRlbSAhPSBudWxsICYmIHR5cGVvZiBpdGVtLm9uRGlkQ2hhbmdlTW9kaWZpZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG1vZGlmaWVkU3Vic2NyaXB0aW9uID0gaXRlbS5vbkRpZENoYW5nZU1vZGlmaWVkKHRoaXMudXBkYXRlRG9jdW1lbnRFZGl0ZWQpXG4gICAgfSBlbHNlIGlmIChpdGVtICE9IG51bGwgJiYgdHlwZW9mIGl0ZW0ub24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG1vZGlmaWVkU3Vic2NyaXB0aW9uID0gaXRlbS5vbignbW9kaWZpZWQtc3RhdHVzLWNoYW5nZWQnLCB0aGlzLnVwZGF0ZURvY3VtZW50RWRpdGVkKVxuICAgICAgaWYgKG1vZGlmaWVkU3Vic2NyaXB0aW9uID09IG51bGwgfHwgdHlwZW9mIG1vZGlmaWVkU3Vic2NyaXB0aW9uLmRpc3Bvc2UgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbW9kaWZpZWRTdWJzY3JpcHRpb24gPSBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgICAgaXRlbS5vZmYoJ21vZGlmaWVkLXN0YXR1cy1jaGFuZ2VkJywgdGhpcy51cGRhdGVEb2N1bWVudEVkaXRlZClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGl0bGVTdWJzY3JpcHRpb24gIT0gbnVsbCkgeyB0aGlzLmFjdGl2ZUl0ZW1TdWJzY3JpcHRpb25zLmFkZCh0aXRsZVN1YnNjcmlwdGlvbikgfVxuICAgIGlmIChtb2RpZmllZFN1YnNjcmlwdGlvbiAhPSBudWxsKSB7IHRoaXMuYWN0aXZlSXRlbVN1YnNjcmlwdGlvbnMuYWRkKG1vZGlmaWVkU3Vic2NyaXB0aW9uKSB9XG5cbiAgICB0aGlzLmNhbmNlbFN0b3BwZWRDaGFuZ2luZ0FjdGl2ZVBhbmVJdGVtVGltZW91dCgpXG4gICAgdGhpcy5zdG9wcGVkQ2hhbmdpbmdBY3RpdmVQYW5lSXRlbVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuc3RvcHBlZENoYW5naW5nQWN0aXZlUGFuZUl0ZW1UaW1lb3V0ID0gbnVsbFxuICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1zdG9wLWNoYW5naW5nLWFjdGl2ZS1wYW5lLWl0ZW0nLCBpdGVtKVxuICAgIH0sIFNUT1BQRURfQ0hBTkdJTkdfQUNUSVZFX1BBTkVfSVRFTV9ERUxBWSlcbiAgfVxuXG4gIGNhbmNlbFN0b3BwZWRDaGFuZ2luZ0FjdGl2ZVBhbmVJdGVtVGltZW91dCAoKSB7XG4gICAgaWYgKHRoaXMuc3RvcHBlZENoYW5naW5nQWN0aXZlUGFuZUl0ZW1UaW1lb3V0ICE9IG51bGwpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnN0b3BwZWRDaGFuZ2luZ0FjdGl2ZVBhbmVJdGVtVGltZW91dClcbiAgICB9XG4gIH1cblxuICBkaWRIaWRlRG9jayAoZG9jaykge1xuICAgIGNvbnN0IHthY3RpdmVFbGVtZW50fSA9IGRvY3VtZW50XG4gICAgY29uc3QgZG9ja0VsZW1lbnQgPSBkb2NrLmdldEVsZW1lbnQoKVxuICAgIGlmIChkb2NrRWxlbWVudCA9PT0gYWN0aXZlRWxlbWVudCB8fCBkb2NrRWxlbWVudC5jb250YWlucyhhY3RpdmVFbGVtZW50KSkge1xuICAgICAgdGhpcy5nZXRDZW50ZXIoKS5hY3RpdmF0ZSgpXG4gICAgfVxuICB9XG5cbiAgc2V0RHJhZ2dpbmdJdGVtIChkcmFnZ2luZ0l0ZW0pIHtcbiAgICBfLnZhbHVlcyh0aGlzLnBhbmVDb250YWluZXJzKS5mb3JFYWNoKGRvY2sgPT4ge1xuICAgICAgZG9jay5zZXREcmFnZ2luZ0l0ZW0oZHJhZ2dpbmdJdGVtKVxuICAgIH0pXG4gIH1cblxuICBzdWJzY3JpYmVUb0FkZGVkSXRlbXMgKCkge1xuICAgIHRoaXMub25EaWRBZGRQYW5lSXRlbSgoe2l0ZW0sIHBhbmUsIGluZGV4fSkgPT4ge1xuICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBUZXh0RWRpdG9yKSB7XG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZShcbiAgICAgICAgICB0aGlzLnRleHRFZGl0b3JSZWdpc3RyeS5hZGQoaXRlbSksXG4gICAgICAgICAgdGhpcy50ZXh0RWRpdG9yUmVnaXN0cnkubWFpbnRhaW5HcmFtbWFyKGl0ZW0pLFxuICAgICAgICAgIHRoaXMudGV4dEVkaXRvclJlZ2lzdHJ5Lm1haW50YWluQ29uZmlnKGl0ZW0pLFxuICAgICAgICAgIGl0ZW0ub2JzZXJ2ZUdyYW1tYXIodGhpcy5oYW5kbGVHcmFtbWFyVXNlZC5iaW5kKHRoaXMpKVxuICAgICAgICApXG4gICAgICAgIGl0ZW0ub25EaWREZXN0cm95KCgpID0+IHsgc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCkgfSlcbiAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1hZGQtdGV4dC1lZGl0b3InLCB7dGV4dEVkaXRvcjogaXRlbSwgcGFuZSwgaW5kZXh9KVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBzdWJzY3JpYmVUb01vdmVkSXRlbXMgKCkge1xuICAgIGZvciAoY29uc3QgcGFuZUNvbnRhaW5lciBvZiB0aGlzLmdldFBhbmVDb250YWluZXJzKCkpIHtcbiAgICAgIHBhbmVDb250YWluZXIub2JzZXJ2ZVBhbmVzKHBhbmUgPT4ge1xuICAgICAgICBwYW5lLm9uRGlkQWRkSXRlbSgoe2l0ZW19KSA9PiB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBpdGVtLmdldFVSSSA9PT0gJ2Z1bmN0aW9uJyAmJiB0aGlzLmVuYWJsZVBlcnNpc3RlbmNlKSB7XG4gICAgICAgICAgICBjb25zdCB1cmkgPSBpdGVtLmdldFVSSSgpXG4gICAgICAgICAgICBpZiAodXJpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uID0gcGFuZUNvbnRhaW5lci5nZXRMb2NhdGlvbigpXG4gICAgICAgICAgICAgIGxldCBkZWZhdWx0TG9jYXRpb25cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtLmdldERlZmF1bHRMb2NhdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGRlZmF1bHRMb2NhdGlvbiA9IGl0ZW0uZ2V0RGVmYXVsdExvY2F0aW9uKClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBkZWZhdWx0TG9jYXRpb24gPSBkZWZhdWx0TG9jYXRpb24gfHwgJ2NlbnRlcidcbiAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uID09PSBkZWZhdWx0TG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1Mb2NhdGlvblN0b3JlLmRlbGV0ZShpdGVtLmdldFVSSSgpKVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbUxvY2F0aW9uU3RvcmUuc2F2ZShpdGVtLmdldFVSSSgpLCBsb2NhdGlvbilcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLy8gVXBkYXRlcyB0aGUgYXBwbGljYXRpb24ncyB0aXRsZSBhbmQgcHJveHkgaWNvbiBiYXNlZCBvbiB3aGljaGV2ZXIgZmlsZSBpc1xuICAvLyBvcGVuLlxuICB1cGRhdGVXaW5kb3dUaXRsZSAoKSB7XG4gICAgbGV0IGl0ZW1QYXRoLCBpdGVtVGl0bGUsIHByb2plY3RQYXRoLCByZXByZXNlbnRlZFBhdGhcbiAgICBjb25zdCBhcHBOYW1lID0gJ0F0b20nXG4gICAgY29uc3QgbGVmdCA9IHRoaXMucHJvamVjdC5nZXRQYXRocygpXG4gICAgY29uc3QgcHJvamVjdFBhdGhzID0gbGVmdCAhPSBudWxsID8gbGVmdCA6IFtdXG4gICAgY29uc3QgaXRlbSA9IHRoaXMuZ2V0QWN0aXZlUGFuZUl0ZW0oKVxuICAgIGlmIChpdGVtKSB7XG4gICAgICBpdGVtUGF0aCA9IHR5cGVvZiBpdGVtLmdldFBhdGggPT09ICdmdW5jdGlvbicgPyBpdGVtLmdldFBhdGgoKSA6IHVuZGVmaW5lZFxuICAgICAgY29uc3QgbG9uZ1RpdGxlID0gdHlwZW9mIGl0ZW0uZ2V0TG9uZ1RpdGxlID09PSAnZnVuY3Rpb24nID8gaXRlbS5nZXRMb25nVGl0bGUoKSA6IHVuZGVmaW5lZFxuICAgICAgaXRlbVRpdGxlID0gbG9uZ1RpdGxlID09IG51bGxcbiAgICAgICAgPyAodHlwZW9mIGl0ZW0uZ2V0VGl0bGUgPT09ICdmdW5jdGlvbicgPyBpdGVtLmdldFRpdGxlKCkgOiB1bmRlZmluZWQpXG4gICAgICAgIDogbG9uZ1RpdGxlXG4gICAgICBwcm9qZWN0UGF0aCA9IF8uZmluZChcbiAgICAgICAgcHJvamVjdFBhdGhzLFxuICAgICAgICBwcm9qZWN0UGF0aCA9PlxuICAgICAgICAgIChpdGVtUGF0aCA9PT0gcHJvamVjdFBhdGgpIHx8IChpdGVtUGF0aCAhPSBudWxsID8gaXRlbVBhdGguc3RhcnRzV2l0aChwcm9qZWN0UGF0aCArIHBhdGguc2VwKSA6IHVuZGVmaW5lZClcbiAgICAgIClcbiAgICB9XG4gICAgaWYgKGl0ZW1UaXRsZSA9PSBudWxsKSB7IGl0ZW1UaXRsZSA9ICd1bnRpdGxlZCcgfVxuICAgIGlmIChwcm9qZWN0UGF0aCA9PSBudWxsKSB7IHByb2plY3RQYXRoID0gaXRlbVBhdGggPyBwYXRoLmRpcm5hbWUoaXRlbVBhdGgpIDogcHJvamVjdFBhdGhzWzBdIH1cbiAgICBpZiAocHJvamVjdFBhdGggIT0gbnVsbCkge1xuICAgICAgcHJvamVjdFBhdGggPSBmcy50aWxkaWZ5KHByb2plY3RQYXRoKVxuICAgIH1cblxuICAgIGNvbnN0IHRpdGxlUGFydHMgPSBbXVxuICAgIGlmICgoaXRlbSAhPSBudWxsKSAmJiAocHJvamVjdFBhdGggIT0gbnVsbCkpIHtcbiAgICAgIHRpdGxlUGFydHMucHVzaChpdGVtVGl0bGUsIHByb2plY3RQYXRoKVxuICAgICAgcmVwcmVzZW50ZWRQYXRoID0gaXRlbVBhdGggIT0gbnVsbCA/IGl0ZW1QYXRoIDogcHJvamVjdFBhdGhcbiAgICB9IGVsc2UgaWYgKHByb2plY3RQYXRoICE9IG51bGwpIHtcbiAgICAgIHRpdGxlUGFydHMucHVzaChwcm9qZWN0UGF0aClcbiAgICAgIHJlcHJlc2VudGVkUGF0aCA9IHByb2plY3RQYXRoXG4gICAgfSBlbHNlIHtcbiAgICAgIHRpdGxlUGFydHMucHVzaChpdGVtVGl0bGUpXG4gICAgICByZXByZXNlbnRlZFBhdGggPSAnJ1xuICAgIH1cblxuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSAnZGFyd2luJykge1xuICAgICAgdGl0bGVQYXJ0cy5wdXNoKGFwcE5hbWUpXG4gICAgfVxuXG4gICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZVBhcnRzLmpvaW4oJyBcXHUyMDE0ICcpXG4gICAgdGhpcy5hcHBsaWNhdGlvbkRlbGVnYXRlLnNldFJlcHJlc2VudGVkRmlsZW5hbWUocmVwcmVzZW50ZWRQYXRoKVxuICB9XG5cbiAgLy8gT24gbWFjT1MsIGZhZGVzIHRoZSBhcHBsaWNhdGlvbiB3aW5kb3cncyBwcm94eSBpY29uIHdoZW4gdGhlIGN1cnJlbnQgZmlsZVxuICAvLyBoYXMgYmVlbiBtb2RpZmllZC5cbiAgdXBkYXRlRG9jdW1lbnRFZGl0ZWQgKCkge1xuICAgIGNvbnN0IGFjdGl2ZVBhbmVJdGVtID0gdGhpcy5nZXRBY3RpdmVQYW5lSXRlbSgpXG4gICAgY29uc3QgbW9kaWZpZWQgPSBhY3RpdmVQYW5lSXRlbSAhPSBudWxsICYmIHR5cGVvZiBhY3RpdmVQYW5lSXRlbS5pc01vZGlmaWVkID09PSAnZnVuY3Rpb24nXG4gICAgICA/IGFjdGl2ZVBhbmVJdGVtLmlzTW9kaWZpZWQoKSB8fCBmYWxzZVxuICAgICAgOiBmYWxzZVxuICAgIHRoaXMuYXBwbGljYXRpb25EZWxlZ2F0ZS5zZXRXaW5kb3dEb2N1bWVudEVkaXRlZChtb2RpZmllZClcbiAgfVxuXG4gIC8qXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAqL1xuXG4gIG9uRGlkQ2hhbmdlQWN0aXZlUGFuZUNvbnRhaW5lciAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCdkaWQtY2hhbmdlLWFjdGl2ZS1wYW5lLWNvbnRhaW5lcicsIGNhbGxiYWNrKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdpdGggYWxsIGN1cnJlbnQgYW5kIGZ1dHVyZSB0ZXh0XG4gIC8vIGVkaXRvcnMgaW4gdGhlIHdvcmtzcGFjZS5cbiAgLy9cbiAgLy8gKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggY3VycmVudCBhbmQgZnV0dXJlIHRleHQgZWRpdG9ycy5cbiAgLy8gICAqIGBlZGl0b3JgIEFuIHtUZXh0RWRpdG9yfSB0aGF0IGlzIHByZXNlbnQgaW4gezo6Z2V0VGV4dEVkaXRvcnN9IGF0IHRoZSB0aW1lXG4gIC8vICAgICBvZiBzdWJzY3JpcHRpb24gb3IgdGhhdCBpcyBhZGRlZCBhdCBzb21lIGxhdGVyIHRpbWUuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVUZXh0RWRpdG9ycyAoY2FsbGJhY2spIHtcbiAgICBmb3IgKGxldCB0ZXh0RWRpdG9yIG9mIHRoaXMuZ2V0VGV4dEVkaXRvcnMoKSkgeyBjYWxsYmFjayh0ZXh0RWRpdG9yKSB9XG4gICAgcmV0dXJuIHRoaXMub25EaWRBZGRUZXh0RWRpdG9yKCh7dGV4dEVkaXRvcn0pID0+IGNhbGxiYWNrKHRleHRFZGl0b3IpKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdpdGggYWxsIGN1cnJlbnQgYW5kIGZ1dHVyZSBwYW5lcyBpdGVtc1xuICAvLyBpbiB0aGUgd29ya3NwYWNlLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2l0aCBjdXJyZW50IGFuZCBmdXR1cmUgcGFuZSBpdGVtcy5cbiAgLy8gICAqIGBpdGVtYCBBbiBpdGVtIHRoYXQgaXMgcHJlc2VudCBpbiB7OjpnZXRQYW5lSXRlbXN9IGF0IHRoZSB0aW1lIG9mXG4gIC8vICAgICAgc3Vic2NyaXB0aW9uIG9yIHRoYXQgaXMgYWRkZWQgYXQgc29tZSBsYXRlciB0aW1lLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlUGFuZUl0ZW1zIChjYWxsYmFjaykge1xuICAgIHJldHVybiBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZShcbiAgICAgIC4uLnRoaXMuZ2V0UGFuZUNvbnRhaW5lcnMoKS5tYXAoY29udGFpbmVyID0+IGNvbnRhaW5lci5vYnNlcnZlUGFuZUl0ZW1zKGNhbGxiYWNrKSlcbiAgICApXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgYWN0aXZlIHBhbmUgaXRlbSBjaGFuZ2VzLlxuICAvL1xuICAvLyBCZWNhdXNlIG9ic2VydmVycyBhcmUgaW52b2tlZCBzeW5jaHJvbm91c2x5LCBpdCdzIGltcG9ydGFudCBub3QgdG8gcGVyZm9ybVxuICAvLyBhbnkgZXhwZW5zaXZlIG9wZXJhdGlvbnMgdmlhIHRoaXMgbWV0aG9kLiBDb25zaWRlclxuICAvLyB7OjpvbkRpZFN0b3BDaGFuZ2luZ0FjdGl2ZVBhbmVJdGVtfSB0byBkZWxheSBvcGVyYXRpb25zIHVudGlsIGFmdGVyIGNoYW5nZXNcbiAgLy8gc3RvcCBvY2N1cnJpbmcuXG4gIC8vXG4gIC8vICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBhY3RpdmUgcGFuZSBpdGVtIGNoYW5nZXMuXG4gIC8vICAgKiBgaXRlbWAgVGhlIGFjdGl2ZSBwYW5lIGl0ZW0uXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlQWN0aXZlUGFuZUl0ZW0gKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWNoYW5nZS1hY3RpdmUtcGFuZS1pdGVtJywgY2FsbGJhY2spXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgYWN0aXZlIHBhbmUgaXRlbSBzdG9wc1xuICAvLyBjaGFuZ2luZy5cbiAgLy9cbiAgLy8gT2JzZXJ2ZXJzIGFyZSBjYWxsZWQgYXN5bmNocm9ub3VzbHkgMTAwbXMgYWZ0ZXIgdGhlIGxhc3QgYWN0aXZlIHBhbmUgaXRlbVxuICAvLyBjaGFuZ2UuIEhhbmRsaW5nIGNoYW5nZXMgaGVyZSByYXRoZXIgdGhhbiBpbiB0aGUgc3luY2hyb25vdXNcbiAgLy8gezo6b25EaWRDaGFuZ2VBY3RpdmVQYW5lSXRlbX0gcHJldmVudHMgdW5uZWVkZWQgd29yayBpZiB0aGUgdXNlciBpcyBxdWlja2x5XG4gIC8vIGNoYW5naW5nIG9yIGNsb3NpbmcgdGFicyBhbmQgZW5zdXJlcyBjcml0aWNhbCBVSSBmZWVkYmFjaywgbGlrZSBjaGFuZ2luZyB0aGVcbiAgLy8gaGlnaGxpZ2h0ZWQgdGFiLCBnZXRzIHByaW9yaXR5IG92ZXIgd29yayB0aGF0IGNhbiBiZSBkb25lIGFzeW5jaHJvbm91c2x5LlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYWN0aXZlIHBhbmUgaXRlbSBzdG9wdHNcbiAgLy8gICBjaGFuZ2luZy5cbiAgLy8gICAqIGBpdGVtYCBUaGUgYWN0aXZlIHBhbmUgaXRlbS5cbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRTdG9wQ2hhbmdpbmdBY3RpdmVQYW5lSXRlbSAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCdkaWQtc3RvcC1jaGFuZ2luZy1hY3RpdmUtcGFuZS1pdGVtJywgY2FsbGJhY2spXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhIHRleHQgZWRpdG9yIGJlY29tZXMgdGhlIGFjdGl2ZVxuICAvLyB0ZXh0IGVkaXRvciBhbmQgd2hlbiB0aGVyZSBpcyBubyBsb25nZXIgYW4gYWN0aXZlIHRleHQgZWRpdG9yLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYWN0aXZlIHRleHQgZWRpdG9yIGNoYW5nZXMuXG4gIC8vICAgKiBgZWRpdG9yYCBUaGUgYWN0aXZlIHtUZXh0RWRpdG9yfSBvciB1bmRlZmluZWQgaWYgdGhlcmUgaXMgbm8gbG9uZ2VyIGFuXG4gIC8vICAgICAgYWN0aXZlIHRleHQgZWRpdG9yLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZUFjdGl2ZVRleHRFZGl0b3IgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWNoYW5nZS1hY3RpdmUtdGV4dC1lZGl0b3InLCBjYWxsYmFjaylcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFjdGl2ZSBwYW5lIGl0ZW0gYW5kXG4gIC8vIHdpdGggYWxsIGZ1dHVyZSBhY3RpdmUgcGFuZSBpdGVtcyBpbiB0aGUgd29ya3NwYWNlLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYWN0aXZlIHBhbmUgaXRlbSBjaGFuZ2VzLlxuICAvLyAgICogYGl0ZW1gIFRoZSBjdXJyZW50IGFjdGl2ZSBwYW5lIGl0ZW0uXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVBY3RpdmVQYW5lSXRlbSAoY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayh0aGlzLmdldEFjdGl2ZVBhbmVJdGVtKCkpXG4gICAgcmV0dXJuIHRoaXMub25EaWRDaGFuZ2VBY3RpdmVQYW5lSXRlbShjYWxsYmFjaylcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFjdGl2ZSB0ZXh0IGVkaXRvclxuICAvLyAoaWYgYW55KSwgd2l0aCBhbGwgZnV0dXJlIGFjdGl2ZSB0ZXh0IGVkaXRvcnMsIGFuZCB3aGVuIHRoZXJlIGlzIG5vIGxvbmdlclxuICAvLyBhbiBhY3RpdmUgdGV4dCBlZGl0b3IuXG4gIC8vXG4gIC8vICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBhY3RpdmUgdGV4dCBlZGl0b3IgY2hhbmdlcy5cbiAgLy8gICAqIGBlZGl0b3JgIFRoZSBhY3RpdmUge1RleHRFZGl0b3J9IG9yIHVuZGVmaW5lZCBpZiB0aGVyZSBpcyBub3QgYW5cbiAgLy8gICAgICBhY3RpdmUgdGV4dCBlZGl0b3IuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVBY3RpdmVUZXh0RWRpdG9yIChjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrKHRoaXMuZ2V0QWN0aXZlVGV4dEVkaXRvcigpKVxuXG4gICAgcmV0dXJuIHRoaXMub25EaWRDaGFuZ2VBY3RpdmVUZXh0RWRpdG9yKGNhbGxiYWNrKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW5ldmVyIGFuIGl0ZW0gaXMgb3BlbmVkLiBVbmxpa2VcbiAgLy8gezo6b25EaWRBZGRQYW5lSXRlbX0sIG9ic2VydmVycyB3aWxsIGJlIG5vdGlmaWVkIGZvciBpdGVtcyB0aGF0IGFyZSBhbHJlYWR5XG4gIC8vIHByZXNlbnQgaW4gdGhlIHdvcmtzcGFjZSB3aGVuIHRoZXkgYXJlIHJlb3BlbmVkLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbmV2ZXIgYW4gaXRlbSBpcyBvcGVuZWQuXG4gIC8vICAgKiBgZXZlbnRgIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAvLyAgICAgKiBgdXJpYCB7U3RyaW5nfSByZXByZXNlbnRpbmcgdGhlIG9wZW5lZCBVUkkuIENvdWxkIGJlIGB1bmRlZmluZWRgLlxuICAvLyAgICAgKiBgaXRlbWAgVGhlIG9wZW5lZCBpdGVtLlxuICAvLyAgICAgKiBgcGFuZWAgVGhlIHBhbmUgaW4gd2hpY2ggdGhlIGl0ZW0gd2FzIG9wZW5lZC5cbiAgLy8gICAgICogYGluZGV4YCBUaGUgaW5kZXggb2YgdGhlIG9wZW5lZCBpdGVtIG9uIGl0cyBwYW5lLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZE9wZW4gKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLW9wZW4nLCBjYWxsYmFjaylcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gYSBwYW5lIGlzIGFkZGVkIHRvIHRoZSB3b3Jrc3BhY2UuXG4gIC8vXG4gIC8vICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCBwYW5lcyBhcmUgYWRkZWQuXG4gIC8vICAgKiBgZXZlbnRgIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAvLyAgICAgKiBgcGFuZWAgVGhlIGFkZGVkIHBhbmUuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWRkUGFuZSAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoXG4gICAgICAuLi50aGlzLmdldFBhbmVDb250YWluZXJzKCkubWFwKGNvbnRhaW5lciA9PiBjb250YWluZXIub25EaWRBZGRQYW5lKGNhbGxiYWNrKSlcbiAgICApXG4gIH1cblxuICAvLyBFeHRlbmRlZDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayBiZWZvcmUgYSBwYW5lIGlzIGRlc3Ryb3llZCBpbiB0aGVcbiAgLy8gd29ya3NwYWNlLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgYmVmb3JlIHBhbmVzIGFyZSBkZXN0cm95ZWQuXG4gIC8vICAgKiBgZXZlbnRgIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAvLyAgICAgKiBgcGFuZWAgVGhlIHBhbmUgdG8gYmUgZGVzdHJveWVkLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbldpbGxEZXN0cm95UGFuZSAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoXG4gICAgICAuLi50aGlzLmdldFBhbmVDb250YWluZXJzKCkubWFwKGNvbnRhaW5lciA9PiBjb250YWluZXIub25XaWxsRGVzdHJveVBhbmUoY2FsbGJhY2spKVxuICAgIClcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gYSBwYW5lIGlzIGRlc3Ryb3llZCBpbiB0aGVcbiAgLy8gd29ya3NwYWNlLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgcGFuZXMgYXJlIGRlc3Ryb3llZC5cbiAgLy8gICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gIC8vICAgICAqIGBwYW5lYCBUaGUgZGVzdHJveWVkIHBhbmUuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkRGVzdHJveVBhbmUgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKFxuICAgICAgLi4udGhpcy5nZXRQYW5lQ29udGFpbmVycygpLm1hcChjb250YWluZXIgPT4gY29udGFpbmVyLm9uRGlkRGVzdHJveVBhbmUoY2FsbGJhY2spKVxuICAgIClcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdpdGggYWxsIGN1cnJlbnQgYW5kIGZ1dHVyZSBwYW5lcyBpbiB0aGVcbiAgLy8gd29ya3NwYWNlLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2l0aCBjdXJyZW50IGFuZCBmdXR1cmUgcGFuZXMuXG4gIC8vICAgKiBgcGFuZWAgQSB7UGFuZX0gdGhhdCBpcyBwcmVzZW50IGluIHs6OmdldFBhbmVzfSBhdCB0aGUgdGltZSBvZlxuICAvLyAgICAgIHN1YnNjcmlwdGlvbiBvciB0aGF0IGlzIGFkZGVkIGF0IHNvbWUgbGF0ZXIgdGltZS5cbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb2JzZXJ2ZVBhbmVzIChjYWxsYmFjaykge1xuICAgIHJldHVybiBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZShcbiAgICAgIC4uLnRoaXMuZ2V0UGFuZUNvbnRhaW5lcnMoKS5tYXAoY29udGFpbmVyID0+IGNvbnRhaW5lci5vYnNlcnZlUGFuZXMoY2FsbGJhY2spKVxuICAgIClcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlIGFjdGl2ZSBwYW5lIGNoYW5nZXMuXG4gIC8vXG4gIC8vICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBhY3RpdmUgcGFuZSBjaGFuZ2VzLlxuICAvLyAgICogYHBhbmVgIEEge1BhbmV9IHRoYXQgaXMgdGhlIGN1cnJlbnQgcmV0dXJuIHZhbHVlIG9mIHs6OmdldEFjdGl2ZVBhbmV9LlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZUFjdGl2ZVBhbmUgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWNoYW5nZS1hY3RpdmUtcGFuZScsIGNhbGxiYWNrKVxuICB9XG5cbiAgLy8gRXh0ZW5kZWQ6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2l0aCB0aGUgY3VycmVudCBhY3RpdmUgcGFuZSBhbmQgd2hlblxuICAvLyB0aGUgYWN0aXZlIHBhbmUgY2hhbmdlcy5cbiAgLy9cbiAgLy8gKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggdGhlIGN1cnJlbnQgYW5kIGZ1dHVyZSBhY3RpdmUjXG4gIC8vICAgcGFuZXMuXG4gIC8vICAgKiBgcGFuZWAgQSB7UGFuZX0gdGhhdCBpcyB0aGUgY3VycmVudCByZXR1cm4gdmFsdWUgb2Ygezo6Z2V0QWN0aXZlUGFuZX0uXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVBY3RpdmVQYW5lIChjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrKHRoaXMuZ2V0QWN0aXZlUGFuZSgpKVxuICAgIHJldHVybiB0aGlzLm9uRGlkQ2hhbmdlQWN0aXZlUGFuZShjYWxsYmFjaylcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gYSBwYW5lIGl0ZW0gaXMgYWRkZWQgdG8gdGhlXG4gIC8vIHdvcmtzcGFjZS5cbiAgLy9cbiAgLy8gKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdoZW4gcGFuZSBpdGVtcyBhcmUgYWRkZWQuXG4gIC8vICAgKiBgZXZlbnRgIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAvLyAgICAgKiBgaXRlbWAgVGhlIGFkZGVkIHBhbmUgaXRlbS5cbiAgLy8gICAgICogYHBhbmVgIHtQYW5lfSBjb250YWluaW5nIHRoZSBhZGRlZCBpdGVtLlxuICAvLyAgICAgKiBgaW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGluZGV4IG9mIHRoZSBhZGRlZCBpdGVtIGluIGl0cyBwYW5lLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEFkZFBhbmVJdGVtIChjYWxsYmFjaykge1xuICAgIHJldHVybiBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZShcbiAgICAgIC4uLnRoaXMuZ2V0UGFuZUNvbnRhaW5lcnMoKS5tYXAoY29udGFpbmVyID0+IGNvbnRhaW5lci5vbkRpZEFkZFBhbmVJdGVtKGNhbGxiYWNrKSlcbiAgICApXG4gIH1cblxuICAvLyBFeHRlbmRlZDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGEgcGFuZSBpdGVtIGlzIGFib3V0IHRvIGJlXG4gIC8vIGRlc3Ryb3llZCwgYmVmb3JlIHRoZSB1c2VyIGlzIHByb21wdGVkIHRvIHNhdmUgaXQuXG4gIC8vXG4gIC8vICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCBiZWZvcmUgcGFuZSBpdGVtcyBhcmUgZGVzdHJveWVkLlxuICAvLyAgICogYGV2ZW50YCB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgLy8gICAgICogYGl0ZW1gIFRoZSBpdGVtIHRvIGJlIGRlc3Ryb3llZC5cbiAgLy8gICAgICogYHBhbmVgIHtQYW5lfSBjb250YWluaW5nIHRoZSBpdGVtIHRvIGJlIGRlc3Ryb3llZC5cbiAgLy8gICAgICogYGluZGV4YCB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBpbmRleCBvZiB0aGUgaXRlbSB0byBiZSBkZXN0cm95ZWQgaW5cbiAgLy8gICAgICAgaXRzIHBhbmUuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbldpbGxEZXN0cm95UGFuZUl0ZW0gKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKFxuICAgICAgLi4udGhpcy5nZXRQYW5lQ29udGFpbmVycygpLm1hcChjb250YWluZXIgPT4gY29udGFpbmVyLm9uV2lsbERlc3Ryb3lQYW5lSXRlbShjYWxsYmFjaykpXG4gICAgKVxuICB9XG5cbiAgLy8gRXh0ZW5kZWQ6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhIHBhbmUgaXRlbSBpcyBkZXN0cm95ZWQuXG4gIC8vXG4gIC8vICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIHBhbmUgaXRlbXMgYXJlIGRlc3Ryb3llZC5cbiAgLy8gICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gIC8vICAgICAqIGBpdGVtYCBUaGUgZGVzdHJveWVkIGl0ZW0uXG4gIC8vICAgICAqIGBwYW5lYCB7UGFuZX0gY29udGFpbmluZyB0aGUgZGVzdHJveWVkIGl0ZW0uXG4gIC8vICAgICAqIGBpbmRleGAge051bWJlcn0gaW5kaWNhdGluZyB0aGUgaW5kZXggb2YgdGhlIGRlc3Ryb3llZCBpdGVtIGluIGl0c1xuICAvLyAgICAgICBwYW5lLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWREZXN0cm95UGFuZUl0ZW0gKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKFxuICAgICAgLi4udGhpcy5nZXRQYW5lQ29udGFpbmVycygpLm1hcChjb250YWluZXIgPT4gY29udGFpbmVyLm9uRGlkRGVzdHJveVBhbmVJdGVtKGNhbGxiYWNrKSlcbiAgICApXG4gIH1cblxuICAvLyBFeHRlbmRlZDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGEgdGV4dCBlZGl0b3IgaXMgYWRkZWQgdG8gdGhlXG4gIC8vIHdvcmtzcGFjZS5cbiAgLy9cbiAgLy8gKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHBhbmVzIGFyZSBhZGRlZC5cbiAgLy8gICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gIC8vICAgICAqIGB0ZXh0RWRpdG9yYCB7VGV4dEVkaXRvcn0gdGhhdCB3YXMgYWRkZWQuXG4gIC8vICAgICAqIGBwYW5lYCB7UGFuZX0gY29udGFpbmluZyB0aGUgYWRkZWQgdGV4dCBlZGl0b3IuXG4gIC8vICAgICAqIGBpbmRleGAge051bWJlcn0gaW5kaWNhdGluZyB0aGUgaW5kZXggb2YgdGhlIGFkZGVkIHRleHQgZWRpdG9yIGluIGl0c1xuICAvLyAgICAgICAgcGFuZS5cbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRBZGRUZXh0RWRpdG9yIChjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmVtaXR0ZXIub24oJ2RpZC1hZGQtdGV4dC1lZGl0b3InLCBjYWxsYmFjaylcbiAgfVxuXG4gIC8qXG4gIFNlY3Rpb246IE9wZW5pbmdcbiAgKi9cblxuICAvLyBFc3NlbnRpYWw6IE9wZW5zIHRoZSBnaXZlbiBVUkkgaW4gQXRvbSBhc3luY2hyb25vdXNseS5cbiAgLy8gSWYgdGhlIFVSSSBpcyBhbHJlYWR5IG9wZW4sIHRoZSBleGlzdGluZyBpdGVtIGZvciB0aGF0IFVSSSB3aWxsIGJlXG4gIC8vIGFjdGl2YXRlZC4gSWYgbm8gVVJJIGlzIGdpdmVuLCBvciBubyByZWdpc3RlcmVkIG9wZW5lciBjYW4gb3BlblxuICAvLyB0aGUgVVJJLCBhIG5ldyBlbXB0eSB7VGV4dEVkaXRvcn0gd2lsbCBiZSBjcmVhdGVkLlxuICAvL1xuICAvLyAqIGB1cmlgIChvcHRpb25hbCkgQSB7U3RyaW5nfSBjb250YWluaW5nIGEgVVJJLlxuICAvLyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gIC8vICAgKiBgaW5pdGlhbExpbmVgIEEge051bWJlcn0gaW5kaWNhdGluZyB3aGljaCByb3cgdG8gbW92ZSB0aGUgY3Vyc29yIHRvXG4gIC8vICAgICBpbml0aWFsbHkuIERlZmF1bHRzIHRvIGAwYC5cbiAgLy8gICAqIGBpbml0aWFsQ29sdW1uYCBBIHtOdW1iZXJ9IGluZGljYXRpbmcgd2hpY2ggY29sdW1uIHRvIG1vdmUgdGhlIGN1cnNvciB0b1xuICAvLyAgICAgaW5pdGlhbGx5LiBEZWZhdWx0cyB0byBgMGAuXG4gIC8vICAgKiBgc3BsaXRgIEVpdGhlciAnbGVmdCcsICdyaWdodCcsICd1cCcgb3IgJ2Rvd24nLlxuICAvLyAgICAgSWYgJ2xlZnQnLCB0aGUgaXRlbSB3aWxsIGJlIG9wZW5lZCBpbiBsZWZ0bW9zdCBwYW5lIG9mIHRoZSBjdXJyZW50IGFjdGl2ZSBwYW5lJ3Mgcm93LlxuICAvLyAgICAgSWYgJ3JpZ2h0JywgdGhlIGl0ZW0gd2lsbCBiZSBvcGVuZWQgaW4gdGhlIHJpZ2h0bW9zdCBwYW5lIG9mIHRoZSBjdXJyZW50IGFjdGl2ZSBwYW5lJ3Mgcm93LiBJZiBvbmx5IG9uZSBwYW5lIGV4aXN0cyBpbiB0aGUgcm93LCBhIG5ldyBwYW5lIHdpbGwgYmUgY3JlYXRlZC5cbiAgLy8gICAgIElmICd1cCcsIHRoZSBpdGVtIHdpbGwgYmUgb3BlbmVkIGluIHRvcG1vc3QgcGFuZSBvZiB0aGUgY3VycmVudCBhY3RpdmUgcGFuZSdzIGNvbHVtbi5cbiAgLy8gICAgIElmICdkb3duJywgdGhlIGl0ZW0gd2lsbCBiZSBvcGVuZWQgaW4gdGhlIGJvdHRvbW1vc3QgcGFuZSBvZiB0aGUgY3VycmVudCBhY3RpdmUgcGFuZSdzIGNvbHVtbi4gSWYgb25seSBvbmUgcGFuZSBleGlzdHMgaW4gdGhlIGNvbHVtbiwgYSBuZXcgcGFuZSB3aWxsIGJlIGNyZWF0ZWQuXG4gIC8vICAgKiBgYWN0aXZhdGVQYW5lYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gY2FsbCB7UGFuZTo6YWN0aXZhdGV9IG9uXG4gIC8vICAgICBjb250YWluaW5nIHBhbmUuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgLy8gICAqIGBhY3RpdmF0ZUl0ZW1gIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBjYWxsIHtQYW5lOjphY3RpdmF0ZUl0ZW19XG4gIC8vICAgICBvbiBjb250YWluaW5nIHBhbmUuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgLy8gICAqIGBwZW5kaW5nYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSBpdGVtIHNob3VsZCBiZSBvcGVuZWRcbiAgLy8gICAgIGluIGEgcGVuZGluZyBzdGF0ZS4gRXhpc3RpbmcgcGVuZGluZyBpdGVtcyBpbiBhIHBhbmUgYXJlIHJlcGxhY2VkIHdpdGhcbiAgLy8gICAgIG5ldyBwZW5kaW5nIGl0ZW1zIHdoZW4gdGhleSBhcmUgb3BlbmVkLlxuICAvLyAgICogYHNlYXJjaEFsbFBhbmVzYCBBIHtCb29sZWFufS4gSWYgYHRydWVgLCB0aGUgd29ya3NwYWNlIHdpbGwgYXR0ZW1wdCB0b1xuICAvLyAgICAgYWN0aXZhdGUgYW4gZXhpc3RpbmcgaXRlbSBmb3IgdGhlIGdpdmVuIFVSSSBvbiBhbnkgcGFuZS5cbiAgLy8gICAgIElmIGBmYWxzZWAsIG9ubHkgdGhlIGFjdGl2ZSBwYW5lIHdpbGwgYmUgc2VhcmNoZWQgZm9yXG4gIC8vICAgICBhbiBleGlzdGluZyBpdGVtIGZvciB0aGUgc2FtZSBVUkkuIERlZmF1bHRzIHRvIGBmYWxzZWAuXG4gIC8vICAgKiBgbG9jYXRpb25gIChvcHRpb25hbCkgQSB7U3RyaW5nfSBjb250YWluaW5nIHRoZSBuYW1lIG9mIHRoZSBsb2NhdGlvblxuICAvLyAgICAgaW4gd2hpY2ggdGhpcyBpdGVtIHNob3VsZCBiZSBvcGVuZWQgKG9uZSBvZiBcImxlZnRcIiwgXCJyaWdodFwiLCBcImJvdHRvbVwiLFxuICAvLyAgICAgb3IgXCJjZW50ZXJcIikuIElmIG9taXR0ZWQsIEF0b20gd2lsbCBmYWxsIGJhY2sgdG8gdGhlIGxhc3QgbG9jYXRpb24gaW5cbiAgLy8gICAgIHdoaWNoIGEgdXNlciBoYXMgcGxhY2VkIGFuIGl0ZW0gd2l0aCB0aGUgc2FtZSBVUkkgb3IsIGlmIHRoaXMgaXMgYSBuZXdcbiAgLy8gICAgIFVSSSwgdGhlIGRlZmF1bHQgbG9jYXRpb24gc3BlY2lmaWVkIGJ5IHRoZSBpdGVtLiBOT1RFOiBUaGlzIG9wdGlvblxuICAvLyAgICAgc2hvdWxkIGFsbW9zdCBhbHdheXMgYmUgb21pdHRlZCB0byBob25vciB1c2VyIHByZWZlcmVuY2UuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB0byB0aGUge1RleHRFZGl0b3J9IGZvciB0aGUgZmlsZSBVUkkuXG4gIGFzeW5jIG9wZW4gKGl0ZW1PclVSSSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IHVyaSwgaXRlbVxuICAgIGlmICh0eXBlb2YgaXRlbU9yVVJJID09PSAnc3RyaW5nJykge1xuICAgICAgdXJpID0gdGhpcy5wcm9qZWN0LnJlc29sdmVQYXRoKGl0ZW1PclVSSSlcbiAgICB9IGVsc2UgaWYgKGl0ZW1PclVSSSkge1xuICAgICAgaXRlbSA9IGl0ZW1PclVSSVxuICAgICAgaWYgKHR5cGVvZiBpdGVtLmdldFVSSSA9PT0gJ2Z1bmN0aW9uJykgdXJpID0gaXRlbS5nZXRVUkkoKVxuICAgIH1cblxuICAgIGlmICghYXRvbS5jb25maWcuZ2V0KCdjb3JlLmFsbG93UGVuZGluZ1BhbmVJdGVtcycpKSB7XG4gICAgICBvcHRpb25zLnBlbmRpbmcgPSBmYWxzZVxuICAgIH1cblxuICAgIC8vIEF2b2lkIGFkZGluZyBVUkxzIGFzIHJlY2VudCBkb2N1bWVudHMgdG8gd29yay1hcm91bmQgdGhpcyBTcG90bGlnaHQgY3Jhc2g6XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9pc3N1ZXMvMTAwNzFcbiAgICBpZiAodXJpICYmICghdXJsLnBhcnNlKHVyaSkucHJvdG9jb2wgfHwgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykpIHtcbiAgICAgIHRoaXMuYXBwbGljYXRpb25EZWxlZ2F0ZS5hZGRSZWNlbnREb2N1bWVudCh1cmkpXG4gICAgfVxuXG4gICAgbGV0IHBhbmUsIGl0ZW1FeGlzdHNJbldvcmtzcGFjZVxuXG4gICAgLy8gVHJ5IHRvIGZpbmQgYW4gZXhpc3RpbmcgaXRlbSBpbiB0aGUgd29ya3NwYWNlLlxuICAgIGlmIChpdGVtIHx8IHVyaSkge1xuICAgICAgaWYgKG9wdGlvbnMucGFuZSkge1xuICAgICAgICBwYW5lID0gb3B0aW9ucy5wYW5lXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuc2VhcmNoQWxsUGFuZXMpIHtcbiAgICAgICAgcGFuZSA9IGl0ZW0gPyB0aGlzLnBhbmVGb3JJdGVtKGl0ZW0pIDogdGhpcy5wYW5lRm9yVVJJKHVyaSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIGFuIGl0ZW0gd2l0aCB0aGUgZ2l2ZW4gVVJJIGlzIGFscmVhZHkgaW4gdGhlIHdvcmtzcGFjZSwgYXNzdW1lXG4gICAgICAgIC8vIHRoYXQgaXRlbSdzIHBhbmUgY29udGFpbmVyIGlzIHRoZSBwcmVmZXJyZWQgbG9jYXRpb24gZm9yIHRoYXQgVVJJLlxuICAgICAgICBsZXQgY29udGFpbmVyXG4gICAgICAgIGlmICh1cmkpIGNvbnRhaW5lciA9IHRoaXMucGFuZUNvbnRhaW5lckZvclVSSSh1cmkpXG4gICAgICAgIGlmICghY29udGFpbmVyKSBjb250YWluZXIgPSB0aGlzLmdldEFjdGl2ZVBhbmVDb250YWluZXIoKVxuXG4gICAgICAgIC8vIFRoZSBgc3BsaXRgIG9wdGlvbiBhZmZlY3RzIHdoZXJlIHdlIHNlYXJjaCBmb3IgdGhlIGl0ZW0uXG4gICAgICAgIHBhbmUgPSBjb250YWluZXIuZ2V0QWN0aXZlUGFuZSgpXG4gICAgICAgIHN3aXRjaCAob3B0aW9ucy5zcGxpdCkge1xuICAgICAgICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgICAgICAgcGFuZSA9IHBhbmUuZmluZExlZnRtb3N0U2libGluZygpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgICAgICAgIHBhbmUgPSBwYW5lLmZpbmRSaWdodG1vc3RTaWJsaW5nKClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAndXAnOlxuICAgICAgICAgICAgcGFuZSA9IHBhbmUuZmluZFRvcG1vc3RTaWJsaW5nKClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAnZG93bic6XG4gICAgICAgICAgICBwYW5lID0gcGFuZS5maW5kQm90dG9tbW9zdFNpYmxpbmcoKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAocGFuZSkge1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGl0ZW1FeGlzdHNJbldvcmtzcGFjZSA9IHBhbmUuZ2V0SXRlbXMoKS5pbmNsdWRlcyhpdGVtKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW0gPSBwYW5lLml0ZW1Gb3JVUkkodXJpKVxuICAgICAgICAgIGl0ZW1FeGlzdHNJbldvcmtzcGFjZSA9IGl0ZW0gIT0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgYWxyZWFkeSBoYXZlIGFuIGl0ZW0gYXQgdGhpcyBzdGFnZSwgd2Ugd29uJ3QgbmVlZCB0byBkbyBhbiBhc3luY1xuICAgIC8vIGxvb2t1cCBvZiB0aGUgVVJJLCBzbyB3ZSB5aWVsZCB0aGUgZXZlbnQgbG9vcCB0byBlbnN1cmUgdGhpcyBtZXRob2RcbiAgICAvLyBpcyBjb25zaXN0ZW50bHkgYXN5bmNocm9ub3VzLlxuICAgIGlmIChpdGVtKSBhd2FpdCBQcm9taXNlLnJlc29sdmUoKVxuXG4gICAgaWYgKCFpdGVtRXhpc3RzSW5Xb3Jrc3BhY2UpIHtcbiAgICAgIGl0ZW0gPSBpdGVtIHx8IGF3YWl0IHRoaXMuY3JlYXRlSXRlbUZvclVSSSh1cmksIG9wdGlvbnMpXG4gICAgICBpZiAoIWl0ZW0pIHJldHVyblxuXG4gICAgICBpZiAob3B0aW9ucy5wYW5lKSB7XG4gICAgICAgIHBhbmUgPSBvcHRpb25zLnBhbmVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBsb2NhdGlvbiA9IG9wdGlvbnMubG9jYXRpb25cbiAgICAgICAgaWYgKCFsb2NhdGlvbiAmJiAhb3B0aW9ucy5zcGxpdCAmJiB1cmkgJiYgdGhpcy5lbmFibGVQZXJzaXN0ZW5jZSkge1xuICAgICAgICAgIGxvY2F0aW9uID0gYXdhaXQgdGhpcy5pdGVtTG9jYXRpb25TdG9yZS5sb2FkKHVyaSlcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWxvY2F0aW9uICYmIHR5cGVvZiBpdGVtLmdldERlZmF1bHRMb2NhdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGxvY2F0aW9uID0gaXRlbS5nZXREZWZhdWx0TG9jYXRpb24oKVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWxsb3dlZExvY2F0aW9ucyA9IHR5cGVvZiBpdGVtLmdldEFsbG93ZWRMb2NhdGlvbnMgPT09ICdmdW5jdGlvbicgPyBpdGVtLmdldEFsbG93ZWRMb2NhdGlvbnMoKSA6IEFMTF9MT0NBVElPTlNcbiAgICAgICAgbG9jYXRpb24gPSBhbGxvd2VkTG9jYXRpb25zLmluY2x1ZGVzKGxvY2F0aW9uKSA/IGxvY2F0aW9uIDogYWxsb3dlZExvY2F0aW9uc1swXVxuXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucGFuZUNvbnRhaW5lcnNbbG9jYXRpb25dIHx8IHRoaXMuZ2V0Q2VudGVyKClcbiAgICAgICAgcGFuZSA9IGNvbnRhaW5lci5nZXRBY3RpdmVQYW5lKClcbiAgICAgICAgc3dpdGNoIChvcHRpb25zLnNwbGl0KSB7XG4gICAgICAgICAgY2FzZSAnbGVmdCc6XG4gICAgICAgICAgICBwYW5lID0gcGFuZS5maW5kTGVmdG1vc3RTaWJsaW5nKClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICAgICAgcGFuZSA9IHBhbmUuZmluZE9yQ3JlYXRlUmlnaHRtb3N0U2libGluZygpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3VwJzpcbiAgICAgICAgICAgIHBhbmUgPSBwYW5lLmZpbmRUb3Btb3N0U2libGluZygpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2Rvd24nOlxuICAgICAgICAgICAgcGFuZSA9IHBhbmUuZmluZE9yQ3JlYXRlQm90dG9tbW9zdFNpYmxpbmcoKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5wZW5kaW5nICYmIChwYW5lLmdldFBlbmRpbmdJdGVtKCkgPT09IGl0ZW0pKSB7XG4gICAgICBwYW5lLmNsZWFyUGVuZGluZ0l0ZW0oKVxuICAgIH1cblxuICAgIHRoaXMuaXRlbU9wZW5lZChpdGVtKVxuXG4gICAgaWYgKG9wdGlvbnMuYWN0aXZhdGVJdGVtID09PSBmYWxzZSkge1xuICAgICAgcGFuZS5hZGRJdGVtKGl0ZW0sIHtwZW5kaW5nOiBvcHRpb25zLnBlbmRpbmd9KVxuICAgIH0gZWxzZSB7XG4gICAgICBwYW5lLmFjdGl2YXRlSXRlbShpdGVtLCB7cGVuZGluZzogb3B0aW9ucy5wZW5kaW5nfSlcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5hY3RpdmF0ZVBhbmUgIT09IGZhbHNlKSB7XG4gICAgICBwYW5lLmFjdGl2YXRlKClcbiAgICB9XG5cbiAgICBsZXQgaW5pdGlhbENvbHVtbiA9IDBcbiAgICBsZXQgaW5pdGlhbExpbmUgPSAwXG4gICAgaWYgKCFOdW1iZXIuaXNOYU4ob3B0aW9ucy5pbml0aWFsTGluZSkpIHtcbiAgICAgIGluaXRpYWxMaW5lID0gb3B0aW9ucy5pbml0aWFsTGluZVxuICAgIH1cbiAgICBpZiAoIU51bWJlci5pc05hTihvcHRpb25zLmluaXRpYWxDb2x1bW4pKSB7XG4gICAgICBpbml0aWFsQ29sdW1uID0gb3B0aW9ucy5pbml0aWFsQ29sdW1uXG4gICAgfVxuICAgIGlmIChpbml0aWFsTGluZSA+PSAwIHx8IGluaXRpYWxDb2x1bW4gPj0gMCkge1xuICAgICAgaWYgKHR5cGVvZiBpdGVtLnNldEN1cnNvckJ1ZmZlclBvc2l0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGl0ZW0uc2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oW2luaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1uXSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbmRleCA9IHBhbmUuZ2V0QWN0aXZlSXRlbUluZGV4KClcbiAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLW9wZW4nLCB7dXJpLCBwYW5lLCBpdGVtLCBpbmRleH0pXG4gICAgcmV0dXJuIGl0ZW1cbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogU2VhcmNoIHRoZSB3b3Jrc3BhY2UgZm9yIGl0ZW1zIG1hdGNoaW5nIHRoZSBnaXZlbiBVUkkgYW5kIGhpZGUgdGhlbS5cbiAgLy9cbiAgLy8gKiBgaXRlbU9yVVJJYCAob3B0aW9uYWwpIFRoZSBpdGVtIHRvIGhpZGUgb3IgYSB7U3RyaW5nfSBjb250YWluaW5nIHRoZSBVUklcbiAgLy8gICBvZiB0aGUgaXRlbSB0byBoaWRlLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge2Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciBhbnkgaXRlbXMgd2VyZSBmb3VuZCAoYW5kIGhpZGRlbikuXG4gIGhpZGUgKGl0ZW1PclVSSSkge1xuICAgIGxldCBmb3VuZEl0ZW1zID0gZmFsc2VcblxuICAgIC8vIElmIGFueSB2aXNpYmxlIGl0ZW0gaGFzIHRoZSBnaXZlbiBVUkksIGhpZGUgaXRcbiAgICBmb3IgKGNvbnN0IGNvbnRhaW5lciBvZiB0aGlzLmdldFBhbmVDb250YWluZXJzKCkpIHtcbiAgICAgIGNvbnN0IGlzQ2VudGVyID0gY29udGFpbmVyID09PSB0aGlzLmdldENlbnRlcigpXG4gICAgICBpZiAoaXNDZW50ZXIgfHwgY29udGFpbmVyLmlzVmlzaWJsZSgpKSB7XG4gICAgICAgIGZvciAoY29uc3QgcGFuZSBvZiBjb250YWluZXIuZ2V0UGFuZXMoKSkge1xuICAgICAgICAgIGNvbnN0IGFjdGl2ZUl0ZW0gPSBwYW5lLmdldEFjdGl2ZUl0ZW0oKVxuICAgICAgICAgIGNvbnN0IGZvdW5kSXRlbSA9IChcbiAgICAgICAgICAgIGFjdGl2ZUl0ZW0gIT0gbnVsbCAmJiAoXG4gICAgICAgICAgICAgIGFjdGl2ZUl0ZW0gPT09IGl0ZW1PclVSSSB8fFxuICAgICAgICAgICAgICB0eXBlb2YgYWN0aXZlSXRlbS5nZXRVUkkgPT09ICdmdW5jdGlvbicgJiYgYWN0aXZlSXRlbS5nZXRVUkkoKSA9PT0gaXRlbU9yVVJJXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgICAgIGlmIChmb3VuZEl0ZW0pIHtcbiAgICAgICAgICAgIGZvdW5kSXRlbXMgPSB0cnVlXG4gICAgICAgICAgICAvLyBXZSBjYW4ndCByZWFsbHkgaGlkZSB0aGUgY2VudGVyIHNvIHdlIGp1c3QgZGVzdHJveSB0aGUgaXRlbS5cbiAgICAgICAgICAgIGlmIChpc0NlbnRlcikge1xuICAgICAgICAgICAgICBwYW5lLmRlc3Ryb3lJdGVtKGFjdGl2ZUl0ZW0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250YWluZXIuaGlkZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvdW5kSXRlbXNcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogU2VhcmNoIHRoZSB3b3Jrc3BhY2UgZm9yIGl0ZW1zIG1hdGNoaW5nIHRoZSBnaXZlbiBVUkkuIElmIGFueSBhcmUgZm91bmQsIGhpZGUgdGhlbS5cbiAgLy8gT3RoZXJ3aXNlLCBvcGVuIHRoZSBVUkwuXG4gIC8vXG4gIC8vICogYGl0ZW1PclVSSWAgKG9wdGlvbmFsKSBUaGUgaXRlbSB0byB0b2dnbGUgb3IgYSB7U3RyaW5nfSBjb250YWluaW5nIHRoZSBVUklcbiAgLy8gICBvZiB0aGUgaXRlbSB0byB0b2dnbGUuXG4gIC8vXG4gIC8vIFJldHVybnMgYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgaXRlbSBpcyBzaG93biBvciBoaWRkZW4uXG4gIHRvZ2dsZSAoaXRlbU9yVVJJKSB7XG4gICAgaWYgKHRoaXMuaGlkZShpdGVtT3JVUkkpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMub3BlbihpdGVtT3JVUkksIHtzZWFyY2hBbGxQYW5lczogdHJ1ZX0pXG4gICAgfVxuICB9XG5cbiAgLy8gT3BlbiBBdG9tJ3MgbGljZW5zZSBpbiB0aGUgYWN0aXZlIHBhbmUuXG4gIG9wZW5MaWNlbnNlICgpIHtcbiAgICByZXR1cm4gdGhpcy5vcGVuKHBhdGguam9pbihwcm9jZXNzLnJlc291cmNlc1BhdGgsICdMSUNFTlNFLm1kJykpXG4gIH1cblxuICAvLyBTeW5jaHJvbm91c2x5IG9wZW4gdGhlIGdpdmVuIFVSSSBpbiB0aGUgYWN0aXZlIHBhbmUuICoqT25seSB1c2UgdGhpcyBtZXRob2RcbiAgLy8gaW4gc3BlY3MuIENhbGxpbmcgdGhpcyBpbiBwcm9kdWN0aW9uIGNvZGUgd2lsbCBibG9jayB0aGUgVUkgdGhyZWFkIGFuZFxuICAvLyBldmVyeW9uZSB3aWxsIGJlIG1hZCBhdCB5b3UuKipcbiAgLy9cbiAgLy8gKiBgdXJpYCBBIHtTdHJpbmd9IGNvbnRhaW5pbmcgYSBVUkkuXG4gIC8vICogYG9wdGlvbnNgIEFuIG9wdGlvbmFsIG9wdGlvbnMge09iamVjdH1cbiAgLy8gICAqIGBpbml0aWFsTGluZWAgQSB7TnVtYmVyfSBpbmRpY2F0aW5nIHdoaWNoIHJvdyB0byBtb3ZlIHRoZSBjdXJzb3IgdG9cbiAgLy8gICAgIGluaXRpYWxseS4gRGVmYXVsdHMgdG8gYDBgLlxuICAvLyAgICogYGluaXRpYWxDb2x1bW5gIEEge051bWJlcn0gaW5kaWNhdGluZyB3aGljaCBjb2x1bW4gdG8gbW92ZSB0aGUgY3Vyc29yIHRvXG4gIC8vICAgICBpbml0aWFsbHkuIERlZmF1bHRzIHRvIGAwYC5cbiAgLy8gICAqIGBhY3RpdmF0ZVBhbmVgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBjYWxsIHtQYW5lOjphY3RpdmF0ZX0gb25cbiAgLy8gICAgIHRoZSBjb250YWluaW5nIHBhbmUuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgLy8gICAqIGBhY3RpdmF0ZUl0ZW1gIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBjYWxsIHtQYW5lOjphY3RpdmF0ZUl0ZW19XG4gIC8vICAgICBvbiBjb250YWluaW5nIHBhbmUuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgb3BlblN5bmMgKHVyaV8gPSAnJywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qge2luaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1ufSA9IG9wdGlvbnNcbiAgICBjb25zdCBhY3RpdmF0ZVBhbmUgPSBvcHRpb25zLmFjdGl2YXRlUGFuZSAhPSBudWxsID8gb3B0aW9ucy5hY3RpdmF0ZVBhbmUgOiB0cnVlXG4gICAgY29uc3QgYWN0aXZhdGVJdGVtID0gb3B0aW9ucy5hY3RpdmF0ZUl0ZW0gIT0gbnVsbCA/IG9wdGlvbnMuYWN0aXZhdGVJdGVtIDogdHJ1ZVxuXG4gICAgY29uc3QgdXJpID0gdGhpcy5wcm9qZWN0LnJlc29sdmVQYXRoKHVyaV8pXG4gICAgbGV0IGl0ZW0gPSB0aGlzLmdldEFjdGl2ZVBhbmUoKS5pdGVtRm9yVVJJKHVyaSlcbiAgICBpZiAodXJpICYmIChpdGVtID09IG51bGwpKSB7XG4gICAgICBmb3IgKGNvbnN0IG9wZW5lciBvZiB0aGlzLmdldE9wZW5lcnMoKSkge1xuICAgICAgICBpdGVtID0gb3BlbmVyKHVyaSwgb3B0aW9ucylcbiAgICAgICAgaWYgKGl0ZW0pIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgIGl0ZW0gPSB0aGlzLnByb2plY3Qub3BlblN5bmModXJpLCB7aW5pdGlhbExpbmUsIGluaXRpYWxDb2x1bW59KVxuICAgIH1cblxuICAgIGlmIChhY3RpdmF0ZUl0ZW0pIHtcbiAgICAgIHRoaXMuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbShpdGVtKVxuICAgIH1cbiAgICB0aGlzLml0ZW1PcGVuZWQoaXRlbSlcbiAgICBpZiAoYWN0aXZhdGVQYW5lKSB7XG4gICAgICB0aGlzLmdldEFjdGl2ZVBhbmUoKS5hY3RpdmF0ZSgpXG4gICAgfVxuICAgIHJldHVybiBpdGVtXG4gIH1cblxuICBvcGVuVVJJSW5QYW5lICh1cmksIHBhbmUpIHtcbiAgICByZXR1cm4gdGhpcy5vcGVuKHVyaSwge3BhbmV9KVxuICB9XG5cbiAgLy8gUHVibGljOiBDcmVhdGVzIGEgbmV3IGl0ZW0gdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgcHJvdmlkZWQgVVJJLlxuICAvL1xuICAvLyBJZiBubyBVUkkgaXMgZ2l2ZW4sIG9yIG5vIHJlZ2lzdGVyZWQgb3BlbmVyIGNhbiBvcGVuIHRoZSBVUkksIGEgbmV3IGVtcHR5XG4gIC8vIHtUZXh0RWRpdG9yfSB3aWxsIGJlIGNyZWF0ZWQuXG4gIC8vXG4gIC8vICogYHVyaWAgQSB7U3RyaW5nfSBjb250YWluaW5nIGEgVVJJLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge1Byb21pc2V9IHRoYXQgcmVzb2x2ZXMgdG8gdGhlIHtUZXh0RWRpdG9yfSAob3Igb3RoZXIgaXRlbSkgZm9yIHRoZSBnaXZlbiBVUkkuXG4gIGNyZWF0ZUl0ZW1Gb3JVUkkgKHVyaSwgb3B0aW9ucykge1xuICAgIGlmICh1cmkgIT0gbnVsbCkge1xuICAgICAgZm9yIChsZXQgb3BlbmVyIG9mIHRoaXMuZ2V0T3BlbmVycygpKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBvcGVuZXIodXJpLCBvcHRpb25zKVxuICAgICAgICBpZiAoaXRlbSAhPSBudWxsKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGl0ZW0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0aGlzLm9wZW5UZXh0RmlsZSh1cmksIG9wdGlvbnMpXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHN3aXRjaCAoZXJyb3IuY29kZSkge1xuICAgICAgICBjYXNlICdDQU5DRUxMRUQnOlxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICBjYXNlICdFQUNDRVMnOlxuICAgICAgICAgIHRoaXMubm90aWZpY2F0aW9uTWFuYWdlci5hZGRXYXJuaW5nKGBQZXJtaXNzaW9uIGRlbmllZCAnJHtlcnJvci5wYXRofSdgKVxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICBjYXNlICdFUEVSTSc6XG4gICAgICAgIGNhc2UgJ0VCVVNZJzpcbiAgICAgICAgY2FzZSAnRU5YSU8nOlxuICAgICAgICBjYXNlICdFSU8nOlxuICAgICAgICBjYXNlICdFTk9UQ09OTic6XG4gICAgICAgIGNhc2UgJ1VOS05PV04nOlxuICAgICAgICBjYXNlICdFQ09OTlJFU0VUJzpcbiAgICAgICAgY2FzZSAnRUlOVkFMJzpcbiAgICAgICAgY2FzZSAnRU1GSUxFJzpcbiAgICAgICAgY2FzZSAnRU5PVERJUic6XG4gICAgICAgIGNhc2UgJ0VBR0FJTic6XG4gICAgICAgICAgdGhpcy5ub3RpZmljYXRpb25NYW5hZ2VyLmFkZFdhcm5pbmcoXG4gICAgICAgICAgICBgVW5hYmxlIHRvIG9wZW4gJyR7ZXJyb3IucGF0aCAhPSBudWxsID8gZXJyb3IucGF0aCA6IHVyaX0nYCxcbiAgICAgICAgICAgIHtkZXRhaWw6IGVycm9yLm1lc3NhZ2V9XG4gICAgICAgICAgKVxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IGVycm9yXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgb3BlblRleHRGaWxlICh1cmksIG9wdGlvbnMpIHtcbiAgICBjb25zdCBmaWxlUGF0aCA9IHRoaXMucHJvamVjdC5yZXNvbHZlUGF0aCh1cmkpXG5cbiAgICBpZiAoZmlsZVBhdGggIT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZnMuY2xvc2VTeW5jKGZzLm9wZW5TeW5jKGZpbGVQYXRoLCAncicpKVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgLy8gYWxsb3cgRU5PRU5UIGVycm9ycyB0byBjcmVhdGUgYW4gZWRpdG9yIGZvciBwYXRocyB0aGF0IGRvbnQgZXhpc3RcbiAgICAgICAgaWYgKGVycm9yLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGZpbGVTaXplID0gZnMuZ2V0U2l6ZVN5bmMoZmlsZVBhdGgpXG5cbiAgICBjb25zdCBsYXJnZUZpbGVNb2RlID0gZmlsZVNpemUgPj0gKDIgKiAxMDQ4NTc2KSAvLyAyTUJcbiAgICBpZiAoZmlsZVNpemUgPj0gKHRoaXMuY29uZmlnLmdldCgnY29yZS53YXJuT25MYXJnZUZpbGVMaW1pdCcpICogMTA0ODU3NikpIHsgLy8gMjBNQiBieSBkZWZhdWx0XG4gICAgICBjb25zdCBjaG9pY2UgPSB0aGlzLmFwcGxpY2F0aW9uRGVsZWdhdGUuY29uZmlybSh7XG4gICAgICAgIG1lc3NhZ2U6ICdBdG9tIHdpbGwgYmUgdW5yZXNwb25zaXZlIGR1cmluZyB0aGUgbG9hZGluZyBvZiB2ZXJ5IGxhcmdlIGZpbGVzLicsXG4gICAgICAgIGRldGFpbGVkTWVzc2FnZTogJ0RvIHlvdSBzdGlsbCB3YW50IHRvIGxvYWQgdGhpcyBmaWxlPycsXG4gICAgICAgIGJ1dHRvbnM6IFsnUHJvY2VlZCcsICdDYW5jZWwnXVxuICAgICAgfSlcbiAgICAgIGlmIChjaG9pY2UgPT09IDEpIHtcbiAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoKVxuICAgICAgICBlcnJvci5jb2RlID0gJ0NBTkNFTExFRCdcbiAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0LmJ1ZmZlckZvclBhdGgoZmlsZVBhdGgsIG9wdGlvbnMpXG4gICAgICAudGhlbihidWZmZXIgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0RWRpdG9yUmVnaXN0cnkuYnVpbGQoT2JqZWN0LmFzc2lnbih7YnVmZmVyLCBsYXJnZUZpbGVNb2RlLCBhdXRvSGVpZ2h0OiBmYWxzZX0sIG9wdGlvbnMpKVxuICAgICAgfSlcbiAgfVxuXG4gIGhhbmRsZUdyYW1tYXJVc2VkIChncmFtbWFyKSB7XG4gICAgaWYgKGdyYW1tYXIgPT0gbnVsbCkgeyByZXR1cm4gfVxuICAgIHJldHVybiB0aGlzLnBhY2thZ2VNYW5hZ2VyLnRyaWdnZXJBY3RpdmF0aW9uSG9vayhgJHtncmFtbWFyLnBhY2thZ2VOYW1lfTpncmFtbWFyLXVzZWRgKVxuICB9XG5cbiAgLy8gUHVibGljOiBSZXR1cm5zIGEge0Jvb2xlYW59IHRoYXQgaXMgYHRydWVgIGlmIGBvYmplY3RgIGlzIGEgYFRleHRFZGl0b3JgLlxuICAvL1xuICAvLyAqIGBvYmplY3RgIEFuIHtPYmplY3R9IHlvdSB3YW50IHRvIHBlcmZvcm0gdGhlIGNoZWNrIGFnYWluc3QuXG4gIGlzVGV4dEVkaXRvciAob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdCBpbnN0YW5jZW9mIFRleHRFZGl0b3JcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBDcmVhdGUgYSBuZXcgdGV4dCBlZGl0b3IuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7VGV4dEVkaXRvcn0uXG4gIGJ1aWxkVGV4dEVkaXRvciAocGFyYW1zKSB7XG4gICAgY29uc3QgZWRpdG9yID0gdGhpcy50ZXh0RWRpdG9yUmVnaXN0cnkuYnVpbGQocGFyYW1zKVxuICAgIGNvbnN0IHN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZShcbiAgICAgIHRoaXMudGV4dEVkaXRvclJlZ2lzdHJ5Lm1haW50YWluR3JhbW1hcihlZGl0b3IpLFxuICAgICAgdGhpcy50ZXh0RWRpdG9yUmVnaXN0cnkubWFpbnRhaW5Db25maWcoZWRpdG9yKVxuICAgIClcbiAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IHsgc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCkgfSlcbiAgICByZXR1cm4gZWRpdG9yXG4gIH1cblxuICAvLyBQdWJsaWM6IEFzeW5jaHJvbm91c2x5IHJlb3BlbnMgdGhlIGxhc3QtY2xvc2VkIGl0ZW0ncyBVUkkgaWYgaXQgaGFzbid0IGFscmVhZHkgYmVlblxuICAvLyByZW9wZW5lZC5cbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IGlzIHJlc29sdmVkIHdoZW4gdGhlIGl0ZW0gaXMgb3BlbmVkXG4gIHJlb3Blbkl0ZW0gKCkge1xuICAgIGNvbnN0IHVyaSA9IHRoaXMuZGVzdHJveWVkSXRlbVVSSXMucG9wKClcbiAgICBpZiAodXJpKSB7XG4gICAgICByZXR1cm4gdGhpcy5vcGVuKHVyaSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgfVxuICB9XG5cbiAgLy8gUHVibGljOiBSZWdpc3RlciBhbiBvcGVuZXIgZm9yIGEgdXJpLlxuICAvL1xuICAvLyBXaGVuIGEgVVJJIGlzIG9wZW5lZCB2aWEge1dvcmtzcGFjZTo6b3Blbn0sIEF0b20gbG9vcHMgdGhyb3VnaCBpdHMgcmVnaXN0ZXJlZFxuICAvLyBvcGVuZXIgZnVuY3Rpb25zIHVudGlsIG9uZSByZXR1cm5zIGEgdmFsdWUgZm9yIHRoZSBnaXZlbiB1cmkuXG4gIC8vIE9wZW5lcnMgYXJlIGV4cGVjdGVkIHRvIHJldHVybiBhbiBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIEhUTUxFbGVtZW50IG9yXG4gIC8vIGEgbW9kZWwgd2hpY2ggaGFzIGFuIGFzc29jaWF0ZWQgdmlldyBpbiB0aGUge1ZpZXdSZWdpc3RyeX0uXG4gIC8vIEEge1RleHRFZGl0b3J9IHdpbGwgYmUgdXNlZCBpZiBubyBvcGVuZXIgcmV0dXJucyBhIHZhbHVlLlxuICAvL1xuICAvLyAjIyBFeGFtcGxlc1xuICAvL1xuICAvLyBgYGBjb2ZmZWVcbiAgLy8gYXRvbS53b3Jrc3BhY2UuYWRkT3BlbmVyICh1cmkpIC0+XG4gIC8vICAgaWYgcGF0aC5leHRuYW1lKHVyaSkgaXMgJy50b21sJ1xuICAvLyAgICAgcmV0dXJuIG5ldyBUb21sRWRpdG9yKHVyaSlcbiAgLy8gYGBgXG4gIC8vXG4gIC8vICogYG9wZW5lcmAgQSB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIGEgcGF0aCBpcyBiZWluZyBvcGVuZWQuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gcmVtb3ZlIHRoZVxuICAvLyBvcGVuZXIuXG4gIC8vXG4gIC8vIE5vdGUgdGhhdCB0aGUgb3BlbmVyIHdpbGwgYmUgY2FsbGVkIGlmIGFuZCBvbmx5IGlmIHRoZSBVUkkgaXMgbm90IGFscmVhZHkgb3BlblxuICAvLyBpbiB0aGUgY3VycmVudCBwYW5lLiBUaGUgc2VhcmNoQWxsUGFuZXMgZmxhZyBleHBhbmRzIHRoZSBzZWFyY2ggZnJvbSB0aGVcbiAgLy8gY3VycmVudCBwYW5lIHRvIGFsbCBwYW5lcy4gSWYgeW91IHdpc2ggdG8gb3BlbiBhIHZpZXcgb2YgYSBkaWZmZXJlbnQgdHlwZSBmb3JcbiAgLy8gYSBmaWxlIHRoYXQgaXMgYWxyZWFkeSBvcGVuLCBjb25zaWRlciBjaGFuZ2luZyB0aGUgcHJvdG9jb2wgb2YgdGhlIFVSSS4gRm9yXG4gIC8vIGV4YW1wbGUsIHBlcmhhcHMgeW91IHdpc2ggdG8gcHJldmlldyBhIHJlbmRlcmVkIHZlcnNpb24gb2YgdGhlIGZpbGUgYC9mb28vYmFyL2Jhei5xdXV4YFxuICAvLyB0aGF0IGlzIGFscmVhZHkgb3BlbiBpbiBhIHRleHQgZWRpdG9yIHZpZXcuIFlvdSBjb3VsZCBzaWduYWwgdGhpcyBieSBjYWxsaW5nXG4gIC8vIHtXb3Jrc3BhY2U6Om9wZW59IG9uIHRoZSBVUkkgYHF1dXgtcHJldmlldzovL2Zvby9iYXIvYmF6LnF1dXhgLiBUaGVuIHlvdXIgb3BlbmVyXG4gIC8vIGNhbiBjaGVjayB0aGUgcHJvdG9jb2wgZm9yIHF1dXgtcHJldmlldyBhbmQgb25seSBoYW5kbGUgdGhvc2UgVVJJcyB0aGF0IG1hdGNoLlxuICBhZGRPcGVuZXIgKG9wZW5lcikge1xuICAgIHRoaXMub3BlbmVycy5wdXNoKG9wZW5lcilcbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4geyBfLnJlbW92ZSh0aGlzLm9wZW5lcnMsIG9wZW5lcikgfSlcbiAgfVxuXG4gIGdldE9wZW5lcnMgKCkge1xuICAgIHJldHVybiB0aGlzLm9wZW5lcnNcbiAgfVxuXG4gIC8qXG4gIFNlY3Rpb246IFBhbmUgSXRlbXNcbiAgKi9cblxuICAvLyBFc3NlbnRpYWw6IEdldCBhbGwgcGFuZSBpdGVtcyBpbiB0aGUgd29ya3NwYWNlLlxuICAvL1xuICAvLyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgaXRlbXMuXG4gIGdldFBhbmVJdGVtcyAoKSB7XG4gICAgcmV0dXJuIF8uZmxhdHRlbih0aGlzLmdldFBhbmVDb250YWluZXJzKCkubWFwKGNvbnRhaW5lciA9PiBjb250YWluZXIuZ2V0UGFuZUl0ZW1zKCkpKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBHZXQgdGhlIGFjdGl2ZSB7UGFuZX0ncyBhY3RpdmUgaXRlbS5cbiAgLy9cbiAgLy8gUmV0dXJucyBhbiBwYW5lIGl0ZW0ge09iamVjdH0uXG4gIGdldEFjdGl2ZVBhbmVJdGVtICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBY3RpdmVQYW5lQ29udGFpbmVyKCkuZ2V0QWN0aXZlUGFuZUl0ZW0oKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBHZXQgYWxsIHRleHQgZWRpdG9ycyBpbiB0aGUgd29ya3NwYWNlLlxuICAvL1xuICAvLyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0b3J9cy5cbiAgZ2V0VGV4dEVkaXRvcnMgKCkge1xuICAgIHJldHVybiB0aGlzLmdldFBhbmVJdGVtcygpLmZpbHRlcihpdGVtID0+IGl0ZW0gaW5zdGFuY2VvZiBUZXh0RWRpdG9yKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBHZXQgdGhlIHdvcmtzcGFjZSBjZW50ZXIncyBhY3RpdmUgaXRlbSBpZiBpdCBpcyBhIHtUZXh0RWRpdG9yfS5cbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtUZXh0RWRpdG9yfSBvciBgdW5kZWZpbmVkYCBpZiB0aGUgd29ya3NwYWNlIGNlbnRlcidzIGN1cnJlbnRcbiAgLy8gYWN0aXZlIGl0ZW0gaXMgbm90IGEge1RleHRFZGl0b3J9LlxuICBnZXRBY3RpdmVUZXh0RWRpdG9yICgpIHtcbiAgICBjb25zdCBhY3RpdmVJdGVtID0gdGhpcy5nZXRDZW50ZXIoKS5nZXRBY3RpdmVQYW5lSXRlbSgpXG4gICAgaWYgKGFjdGl2ZUl0ZW0gaW5zdGFuY2VvZiBUZXh0RWRpdG9yKSB7IHJldHVybiBhY3RpdmVJdGVtIH1cbiAgfVxuXG4gIC8vIFNhdmUgYWxsIHBhbmUgaXRlbXMuXG4gIHNhdmVBbGwgKCkge1xuICAgIHRoaXMuZ2V0UGFuZUNvbnRhaW5lcnMoKS5mb3JFYWNoKGNvbnRhaW5lciA9PiB7XG4gICAgICBjb250YWluZXIuc2F2ZUFsbCgpXG4gICAgfSlcbiAgfVxuXG4gIGNvbmZpcm1DbG9zZSAob3B0aW9ucykge1xuICAgIHJldHVybiBQcm9taXNlLmFsbCh0aGlzLmdldFBhbmVDb250YWluZXJzKCkubWFwKGNvbnRhaW5lciA9PlxuICAgICAgY29udGFpbmVyLmNvbmZpcm1DbG9zZShvcHRpb25zKVxuICAgICkpLnRoZW4oKHJlc3VsdHMpID0+ICFyZXN1bHRzLmluY2x1ZGVzKGZhbHNlKSlcbiAgfVxuXG4gIC8vIFNhdmUgdGhlIGFjdGl2ZSBwYW5lIGl0ZW0uXG4gIC8vXG4gIC8vIElmIHRoZSBhY3RpdmUgcGFuZSBpdGVtIGN1cnJlbnRseSBoYXMgYSBVUkkgYWNjb3JkaW5nIHRvIHRoZSBpdGVtJ3NcbiAgLy8gYC5nZXRVUklgIG1ldGhvZCwgY2FsbHMgYC5zYXZlYCBvbiB0aGUgaXRlbS4gT3RoZXJ3aXNlXG4gIC8vIHs6OnNhdmVBY3RpdmVQYW5lSXRlbUFzfSAjIHdpbGwgYmUgY2FsbGVkIGluc3RlYWQuIFRoaXMgbWV0aG9kIGRvZXMgbm90aGluZ1xuICAvLyBpZiB0aGUgYWN0aXZlIGl0ZW0gZG9lcyBub3QgaW1wbGVtZW50IGEgYC5zYXZlYCBtZXRob2QuXG4gIHNhdmVBY3RpdmVQYW5lSXRlbSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2VudGVyKCkuZ2V0QWN0aXZlUGFuZSgpLnNhdmVBY3RpdmVJdGVtKClcbiAgfVxuXG4gIC8vIFByb21wdCB0aGUgdXNlciBmb3IgYSBwYXRoIGFuZCBzYXZlIHRoZSBhY3RpdmUgcGFuZSBpdGVtIHRvIGl0LlxuICAvL1xuICAvLyBPcGVucyBhIG5hdGl2ZSBkaWFsb2cgd2hlcmUgdGhlIHVzZXIgc2VsZWN0cyBhIHBhdGggb24gZGlzaywgdGhlbiBjYWxsc1xuICAvLyBgLnNhdmVBc2Agb24gdGhlIGl0ZW0gd2l0aCB0aGUgc2VsZWN0ZWQgcGF0aC4gVGhpcyBtZXRob2QgZG9lcyBub3RoaW5nIGlmXG4gIC8vIHRoZSBhY3RpdmUgaXRlbSBkb2VzIG5vdCBpbXBsZW1lbnQgYSBgLnNhdmVBc2AgbWV0aG9kLlxuICBzYXZlQWN0aXZlUGFuZUl0ZW1BcyAoKSB7XG4gICAgdGhpcy5nZXRDZW50ZXIoKS5nZXRBY3RpdmVQYW5lKCkuc2F2ZUFjdGl2ZUl0ZW1BcygpXG4gIH1cblxuICAvLyBEZXN0cm95IChjbG9zZSkgdGhlIGFjdGl2ZSBwYW5lIGl0ZW0uXG4gIC8vXG4gIC8vIFJlbW92ZXMgdGhlIGFjdGl2ZSBwYW5lIGl0ZW0gYW5kIGNhbGxzIHRoZSBgLmRlc3Ryb3lgIG1ldGhvZCBvbiBpdCBpZiBvbmUgaXNcbiAgLy8gZGVmaW5lZC5cbiAgZGVzdHJveUFjdGl2ZVBhbmVJdGVtICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBY3RpdmVQYW5lKCkuZGVzdHJveUFjdGl2ZUl0ZW0oKVxuICB9XG5cbiAgLypcbiAgU2VjdGlvbjogUGFuZXNcbiAgKi9cblxuICAvLyBFeHRlbmRlZDogR2V0IHRoZSBtb3N0IHJlY2VudGx5IGZvY3VzZWQgcGFuZSBjb250YWluZXIuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RG9ja30gb3IgdGhlIHtXb3Jrc3BhY2VDZW50ZXJ9LlxuICBnZXRBY3RpdmVQYW5lQ29udGFpbmVyICgpIHtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmVQYW5lQ29udGFpbmVyXG4gIH1cblxuICAvLyBFeHRlbmRlZDogR2V0IGFsbCBwYW5lcyBpbiB0aGUgd29ya3NwYWNlLlxuICAvL1xuICAvLyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge1BhbmV9cy5cbiAgZ2V0UGFuZXMgKCkge1xuICAgIHJldHVybiBfLmZsYXR0ZW4odGhpcy5nZXRQYW5lQ29udGFpbmVycygpLm1hcChjb250YWluZXIgPT4gY29udGFpbmVyLmdldFBhbmVzKCkpKVxuICB9XG5cbiAgZ2V0VmlzaWJsZVBhbmVzICgpIHtcbiAgICByZXR1cm4gXy5mbGF0dGVuKHRoaXMuZ2V0VmlzaWJsZVBhbmVDb250YWluZXJzKCkubWFwKGNvbnRhaW5lciA9PiBjb250YWluZXIuZ2V0UGFuZXMoKSkpXG4gIH1cblxuICAvLyBFeHRlbmRlZDogR2V0IHRoZSBhY3RpdmUge1BhbmV9LlxuICAvL1xuICAvLyBSZXR1cm5zIGEge1BhbmV9LlxuICBnZXRBY3RpdmVQYW5lICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBY3RpdmVQYW5lQ29udGFpbmVyKCkuZ2V0QWN0aXZlUGFuZSgpXG4gIH1cblxuICAvLyBFeHRlbmRlZDogTWFrZSB0aGUgbmV4dCBwYW5lIGFjdGl2ZS5cbiAgYWN0aXZhdGVOZXh0UGFuZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QWN0aXZlUGFuZUNvbnRhaW5lcigpLmFjdGl2YXRlTmV4dFBhbmUoKVxuICB9XG5cbiAgLy8gRXh0ZW5kZWQ6IE1ha2UgdGhlIHByZXZpb3VzIHBhbmUgYWN0aXZlLlxuICBhY3RpdmF0ZVByZXZpb3VzUGFuZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QWN0aXZlUGFuZUNvbnRhaW5lcigpLmFjdGl2YXRlUHJldmlvdXNQYW5lKClcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBHZXQgdGhlIGZpcnN0IHBhbmUgY29udGFpbmVyIHRoYXQgY29udGFpbnMgYW4gaXRlbSB3aXRoIHRoZSBnaXZlblxuICAvLyBVUkkuXG4gIC8vXG4gIC8vICogYHVyaWAge1N0cmluZ30gdXJpXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RG9ja30sIHRoZSB7V29ya3NwYWNlQ2VudGVyfSwgb3IgYHVuZGVmaW5lZGAgaWYgbm8gaXRlbSBleGlzdHNcbiAgLy8gd2l0aCB0aGUgZ2l2ZW4gVVJJLlxuICBwYW5lQ29udGFpbmVyRm9yVVJJICh1cmkpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRQYW5lQ29udGFpbmVycygpLmZpbmQoY29udGFpbmVyID0+IGNvbnRhaW5lci5wYW5lRm9yVVJJKHVyaSkpXG4gIH1cblxuICAvLyBFeHRlbmRlZDogR2V0IHRoZSBmaXJzdCBwYW5lIGNvbnRhaW5lciB0aGF0IGNvbnRhaW5zIHRoZSBnaXZlbiBpdGVtLlxuICAvL1xuICAvLyAqIGBpdGVtYCB0aGUgSXRlbSB0aGF0IHRoZSByZXR1cm5lZCBwYW5lIGNvbnRhaW5lciBtdXN0IGNvbnRhaW4uXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RG9ja30sIHRoZSB7V29ya3NwYWNlQ2VudGVyfSwgb3IgYHVuZGVmaW5lZGAgaWYgbm8gaXRlbSBleGlzdHNcbiAgLy8gd2l0aCB0aGUgZ2l2ZW4gVVJJLlxuICBwYW5lQ29udGFpbmVyRm9ySXRlbSAodXJpKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UGFuZUNvbnRhaW5lcnMoKS5maW5kKGNvbnRhaW5lciA9PiBjb250YWluZXIucGFuZUZvckl0ZW0odXJpKSlcbiAgfVxuXG4gIC8vIEV4dGVuZGVkOiBHZXQgdGhlIGZpcnN0IHtQYW5lfSB0aGF0IGNvbnRhaW5zIGFuIGl0ZW0gd2l0aCB0aGUgZ2l2ZW4gVVJJLlxuICAvL1xuICAvLyAqIGB1cmlgIHtTdHJpbmd9IHVyaVxuICAvL1xuICAvLyBSZXR1cm5zIGEge1BhbmV9IG9yIGB1bmRlZmluZWRgIGlmIG5vIGl0ZW0gZXhpc3RzIHdpdGggdGhlIGdpdmVuIFVSSS5cbiAgcGFuZUZvclVSSSAodXJpKSB7XG4gICAgZm9yIChsZXQgbG9jYXRpb24gb2YgdGhpcy5nZXRQYW5lQ29udGFpbmVycygpKSB7XG4gICAgICBjb25zdCBwYW5lID0gbG9jYXRpb24ucGFuZUZvclVSSSh1cmkpXG4gICAgICBpZiAocGFuZSAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBwYW5lXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gRXh0ZW5kZWQ6IEdldCB0aGUge1BhbmV9IGNvbnRhaW5pbmcgdGhlIGdpdmVuIGl0ZW0uXG4gIC8vXG4gIC8vICogYGl0ZW1gIHRoZSBJdGVtIHRoYXQgdGhlIHJldHVybmVkIHBhbmUgbXVzdCBjb250YWluLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge1BhbmV9IG9yIGB1bmRlZmluZWRgIGlmIG5vIHBhbmUgZXhpc3RzIGZvciB0aGUgZ2l2ZW4gaXRlbS5cbiAgcGFuZUZvckl0ZW0gKGl0ZW0pIHtcbiAgICBmb3IgKGxldCBsb2NhdGlvbiBvZiB0aGlzLmdldFBhbmVDb250YWluZXJzKCkpIHtcbiAgICAgIGNvbnN0IHBhbmUgPSBsb2NhdGlvbi5wYW5lRm9ySXRlbShpdGVtKVxuICAgICAgaWYgKHBhbmUgIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcGFuZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIERlc3Ryb3kgKGNsb3NlKSB0aGUgYWN0aXZlIHBhbmUuXG4gIGRlc3Ryb3lBY3RpdmVQYW5lICgpIHtcbiAgICBjb25zdCBhY3RpdmVQYW5lID0gdGhpcy5nZXRBY3RpdmVQYW5lKClcbiAgICBpZiAoYWN0aXZlUGFuZSAhPSBudWxsKSB7XG4gICAgICBhY3RpdmVQYW5lLmRlc3Ryb3koKVxuICAgIH1cbiAgfVxuXG4gIC8vIENsb3NlIHRoZSBhY3RpdmUgY2VudGVyIHBhbmUgaXRlbSwgb3IgdGhlIGFjdGl2ZSBjZW50ZXIgcGFuZSBpZiBpdCBpc1xuICAvLyBlbXB0eSwgb3IgdGhlIGN1cnJlbnQgd2luZG93IGlmIHRoZXJlIGlzIG9ubHkgdGhlIGVtcHR5IHJvb3QgcGFuZS5cbiAgY2xvc2VBY3RpdmVQYW5lSXRlbU9yRW1wdHlQYW5lT3JXaW5kb3cgKCkge1xuICAgIGlmICh0aGlzLmdldENlbnRlcigpLmdldEFjdGl2ZVBhbmVJdGVtKCkgIT0gbnVsbCkge1xuICAgICAgdGhpcy5nZXRDZW50ZXIoKS5nZXRBY3RpdmVQYW5lKCkuZGVzdHJveUFjdGl2ZUl0ZW0oKVxuICAgIH0gZWxzZSBpZiAodGhpcy5nZXRDZW50ZXIoKS5nZXRQYW5lcygpLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMuZ2V0Q2VudGVyKCkuZGVzdHJveUFjdGl2ZVBhbmUoKVxuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcuZ2V0KCdjb3JlLmNsb3NlRW1wdHlXaW5kb3dzJykpIHtcbiAgICAgIGF0b20uY2xvc2UoKVxuICAgIH1cbiAgfVxuXG4gIC8vIEluY3JlYXNlIHRoZSBlZGl0b3IgZm9udCBzaXplIGJ5IDFweC5cbiAgaW5jcmVhc2VGb250U2l6ZSAoKSB7XG4gICAgdGhpcy5jb25maWcuc2V0KCdlZGl0b3IuZm9udFNpemUnLCB0aGlzLmNvbmZpZy5nZXQoJ2VkaXRvci5mb250U2l6ZScpICsgMSlcbiAgfVxuXG4gIC8vIERlY3JlYXNlIHRoZSBlZGl0b3IgZm9udCBzaXplIGJ5IDFweC5cbiAgZGVjcmVhc2VGb250U2l6ZSAoKSB7XG4gICAgY29uc3QgZm9udFNpemUgPSB0aGlzLmNvbmZpZy5nZXQoJ2VkaXRvci5mb250U2l6ZScpXG4gICAgaWYgKGZvbnRTaXplID4gMSkge1xuICAgICAgdGhpcy5jb25maWcuc2V0KCdlZGl0b3IuZm9udFNpemUnLCBmb250U2l6ZSAtIDEpXG4gICAgfVxuICB9XG5cbiAgLy8gUmVzdG9yZSB0byB0aGUgd2luZG93J3Mgb3JpZ2luYWwgZWRpdG9yIGZvbnQgc2l6ZS5cbiAgcmVzZXRGb250U2l6ZSAoKSB7XG4gICAgaWYgKHRoaXMub3JpZ2luYWxGb250U2l6ZSkge1xuICAgICAgdGhpcy5jb25maWcuc2V0KCdlZGl0b3IuZm9udFNpemUnLCB0aGlzLm9yaWdpbmFsRm9udFNpemUpXG4gICAgfVxuICB9XG5cbiAgc3Vic2NyaWJlVG9Gb250U2l6ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLm9uRGlkQ2hhbmdlKCdlZGl0b3IuZm9udFNpemUnLCAoe29sZFZhbHVlfSkgPT4ge1xuICAgICAgaWYgKHRoaXMub3JpZ2luYWxGb250U2l6ZSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMub3JpZ2luYWxGb250U2l6ZSA9IG9sZFZhbHVlXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8vIFJlbW92ZXMgdGhlIGl0ZW0ncyB1cmkgZnJvbSB0aGUgbGlzdCBvZiBwb3RlbnRpYWwgaXRlbXMgdG8gcmVvcGVuLlxuICBpdGVtT3BlbmVkIChpdGVtKSB7XG4gICAgbGV0IHVyaVxuICAgIGlmICh0eXBlb2YgaXRlbS5nZXRVUkkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHVyaSA9IGl0ZW0uZ2V0VVJJKClcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtLmdldFVyaSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdXJpID0gaXRlbS5nZXRVcmkoKVxuICAgIH1cblxuICAgIGlmICh1cmkgIT0gbnVsbCkge1xuICAgICAgXy5yZW1vdmUodGhpcy5kZXN0cm95ZWRJdGVtVVJJcywgdXJpKVxuICAgIH1cbiAgfVxuXG4gIC8vIEFkZHMgdGhlIGRlc3Ryb3llZCBpdGVtJ3MgdXJpIHRvIHRoZSBsaXN0IG9mIGl0ZW1zIHRvIHJlb3Blbi5cbiAgZGlkRGVzdHJveVBhbmVJdGVtICh7aXRlbX0pIHtcbiAgICBsZXQgdXJpXG4gICAgaWYgKHR5cGVvZiBpdGVtLmdldFVSSSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdXJpID0gaXRlbS5nZXRVUkkoKVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0uZ2V0VXJpID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB1cmkgPSBpdGVtLmdldFVyaSgpXG4gICAgfVxuXG4gICAgaWYgKHVyaSAhPSBudWxsKSB7XG4gICAgICB0aGlzLmRlc3Ryb3llZEl0ZW1VUklzLnB1c2godXJpKVxuICAgIH1cbiAgfVxuXG4gIC8vIENhbGxlZCBieSBNb2RlbCBzdXBlcmNsYXNzIHdoZW4gZGVzdHJveWVkXG4gIGRlc3Ryb3llZCAoKSB7XG4gICAgdGhpcy5wYW5lQ29udGFpbmVycy5jZW50ZXIuZGVzdHJveSgpXG4gICAgdGhpcy5wYW5lQ29udGFpbmVycy5sZWZ0LmRlc3Ryb3koKVxuICAgIHRoaXMucGFuZUNvbnRhaW5lcnMucmlnaHQuZGVzdHJveSgpXG4gICAgdGhpcy5wYW5lQ29udGFpbmVycy5ib3R0b20uZGVzdHJveSgpXG4gICAgdGhpcy5jYW5jZWxTdG9wcGVkQ2hhbmdpbmdBY3RpdmVQYW5lSXRlbVRpbWVvdXQoKVxuICAgIGlmICh0aGlzLmFjdGl2ZUl0ZW1TdWJzY3JpcHRpb25zICE9IG51bGwpIHtcbiAgICAgIHRoaXMuYWN0aXZlSXRlbVN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG4gICAgfVxuICB9XG5cbiAgLypcbiAgU2VjdGlvbjogUGFuZSBMb2NhdGlvbnNcbiAgKi9cblxuICAvLyBFc3NlbnRpYWw6IEdldCB0aGUge1dvcmtzcGFjZUNlbnRlcn0gYXQgdGhlIGNlbnRlciBvZiB0aGUgZWRpdG9yIHdpbmRvdy5cbiAgZ2V0Q2VudGVyICgpIHtcbiAgICByZXR1cm4gdGhpcy5wYW5lQ29udGFpbmVycy5jZW50ZXJcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogR2V0IHRoZSB7RG9ja30gdG8gdGhlIGxlZnQgb2YgdGhlIGVkaXRvciB3aW5kb3cuXG4gIGdldExlZnREb2NrICgpIHtcbiAgICByZXR1cm4gdGhpcy5wYW5lQ29udGFpbmVycy5sZWZ0XG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEdldCB0aGUge0RvY2t9IHRvIHRoZSByaWdodCBvZiB0aGUgZWRpdG9yIHdpbmRvdy5cbiAgZ2V0UmlnaHREb2NrICgpIHtcbiAgICByZXR1cm4gdGhpcy5wYW5lQ29udGFpbmVycy5yaWdodFxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBHZXQgdGhlIHtEb2NrfSBiZWxvdyB0aGUgZWRpdG9yIHdpbmRvdy5cbiAgZ2V0Qm90dG9tRG9jayAoKSB7XG4gICAgcmV0dXJuIHRoaXMucGFuZUNvbnRhaW5lcnMuYm90dG9tXG4gIH1cblxuICBnZXRQYW5lQ29udGFpbmVycyAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHRoaXMucGFuZUNvbnRhaW5lcnMuY2VudGVyLFxuICAgICAgdGhpcy5wYW5lQ29udGFpbmVycy5sZWZ0LFxuICAgICAgdGhpcy5wYW5lQ29udGFpbmVycy5yaWdodCxcbiAgICAgIHRoaXMucGFuZUNvbnRhaW5lcnMuYm90dG9tXG4gICAgXVxuICB9XG5cbiAgZ2V0VmlzaWJsZVBhbmVDb250YWluZXJzICgpIHtcbiAgICBjb25zdCBjZW50ZXIgPSB0aGlzLmdldENlbnRlcigpXG4gICAgcmV0dXJuIGF0b20ud29ya3NwYWNlLmdldFBhbmVDb250YWluZXJzKClcbiAgICAgIC5maWx0ZXIoY29udGFpbmVyID0+IGNvbnRhaW5lciA9PT0gY2VudGVyIHx8IGNvbnRhaW5lci5pc1Zpc2libGUoKSlcbiAgfVxuXG4gIC8qXG4gIFNlY3Rpb246IFBhbmVsc1xuXG4gIFBhbmVscyBhcmUgdXNlZCB0byBkaXNwbGF5IFVJIHJlbGF0ZWQgdG8gYW4gZWRpdG9yIHdpbmRvdy4gVGhleSBhcmUgcGxhY2VkIGF0IG9uZSBvZiB0aGUgZm91clxuICBlZGdlcyBvZiB0aGUgd2luZG93OiBsZWZ0LCByaWdodCwgdG9wIG9yIGJvdHRvbS4gSWYgdGhlcmUgYXJlIG11bHRpcGxlIHBhbmVscyBvbiB0aGUgc2FtZSB3aW5kb3dcbiAgZWRnZSB0aGV5IGFyZSBzdGFja2VkIGluIG9yZGVyIG9mIHByaW9yaXR5OiBoaWdoZXIgcHJpb3JpdHkgaXMgY2xvc2VyIHRvIHRoZSBjZW50ZXIsIGxvd2VyXG4gIHByaW9yaXR5IHRvd2FyZHMgdGhlIGVkZ2UuXG5cbiAgKk5vdGU6KiBJZiB5b3VyIHBhbmVsIGNoYW5nZXMgaXRzIHNpemUgdGhyb3VnaG91dCBpdHMgbGlmZXRpbWUsIGNvbnNpZGVyIGdpdmluZyBpdCBhIGhpZ2hlclxuICBwcmlvcml0eSwgYWxsb3dpbmcgZml4ZWQgc2l6ZSBwYW5lbHMgdG8gYmUgY2xvc2VyIHRvIHRoZSBlZGdlLiBUaGlzIGFsbG93cyBjb250cm9sIHRhcmdldHMgdG9cbiAgcmVtYWluIG1vcmUgc3RhdGljIGZvciBlYXNpZXIgdGFyZ2V0aW5nIGJ5IHVzZXJzIHRoYXQgZW1wbG95IG1pY2Ugb3IgdHJhY2twYWRzLiAoU2VlXG4gIFthdG9tL2F0b20jNDgzNF0oaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9pc3N1ZXMvNDgzNCkgZm9yIGRpc2N1c3Npb24uKVxuICAqL1xuXG4gIC8vIEVzc2VudGlhbDogR2V0IGFuIHtBcnJheX0gb2YgYWxsIHRoZSBwYW5lbCBpdGVtcyBhdCB0aGUgYm90dG9tIG9mIHRoZSBlZGl0b3Igd2luZG93LlxuICBnZXRCb3R0b21QYW5lbHMgKCkge1xuICAgIHJldHVybiB0aGlzLmdldFBhbmVscygnYm90dG9tJylcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogQWRkcyBhIHBhbmVsIGl0ZW0gdG8gdGhlIGJvdHRvbSBvZiB0aGUgZWRpdG9yIHdpbmRvdy5cbiAgLy9cbiAgLy8gKiBgb3B0aW9uc2Age09iamVjdH1cbiAgLy8gICAqIGBpdGVtYCBZb3VyIHBhbmVsIGNvbnRlbnQuIEl0IGNhbiBiZSBET00gZWxlbWVudCwgYSBqUXVlcnkgZWxlbWVudCwgb3JcbiAgLy8gICAgIGEgbW9kZWwgd2l0aCBhIHZpZXcgcmVnaXN0ZXJlZCB2aWEge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfS4gV2UgcmVjb21tZW5kIHRoZVxuICAvLyAgICAgbGF0dGVyLiBTZWUge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgLy8gICAqIGB2aXNpYmxlYCAob3B0aW9uYWwpIHtCb29sZWFufSBmYWxzZSBpZiB5b3Ugd2FudCB0aGUgcGFuZWwgdG8gaW5pdGlhbGx5IGJlIGhpZGRlblxuICAvLyAgICAgKGRlZmF1bHQ6IHRydWUpXG4gIC8vICAgKiBgcHJpb3JpdHlgIChvcHRpb25hbCkge051bWJlcn0gRGV0ZXJtaW5lcyBzdGFja2luZyBvcmRlci4gTG93ZXIgcHJpb3JpdHkgaXRlbXMgYXJlXG4gIC8vICAgICBmb3JjZWQgY2xvc2VyIHRvIHRoZSBlZGdlcyBvZiB0aGUgd2luZG93LiAoZGVmYXVsdDogMTAwKVxuICAvL1xuICAvLyBSZXR1cm5zIGEge1BhbmVsfVxuICBhZGRCb3R0b21QYW5lbCAob3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLmFkZFBhbmVsKCdib3R0b20nLCBvcHRpb25zKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBHZXQgYW4ge0FycmF5fSBvZiBhbGwgdGhlIHBhbmVsIGl0ZW1zIHRvIHRoZSBsZWZ0IG9mIHRoZSBlZGl0b3Igd2luZG93LlxuICBnZXRMZWZ0UGFuZWxzICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRQYW5lbHMoJ2xlZnQnKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBBZGRzIGEgcGFuZWwgaXRlbSB0byB0aGUgbGVmdCBvZiB0aGUgZWRpdG9yIHdpbmRvdy5cbiAgLy9cbiAgLy8gKiBgb3B0aW9uc2Age09iamVjdH1cbiAgLy8gICAqIGBpdGVtYCBZb3VyIHBhbmVsIGNvbnRlbnQuIEl0IGNhbiBiZSBET00gZWxlbWVudCwgYSBqUXVlcnkgZWxlbWVudCwgb3JcbiAgLy8gICAgIGEgbW9kZWwgd2l0aCBhIHZpZXcgcmVnaXN0ZXJlZCB2aWEge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfS4gV2UgcmVjb21tZW5kIHRoZVxuICAvLyAgICAgbGF0dGVyLiBTZWUge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgLy8gICAqIGB2aXNpYmxlYCAob3B0aW9uYWwpIHtCb29sZWFufSBmYWxzZSBpZiB5b3Ugd2FudCB0aGUgcGFuZWwgdG8gaW5pdGlhbGx5IGJlIGhpZGRlblxuICAvLyAgICAgKGRlZmF1bHQ6IHRydWUpXG4gIC8vICAgKiBgcHJpb3JpdHlgIChvcHRpb25hbCkge051bWJlcn0gRGV0ZXJtaW5lcyBzdGFja2luZyBvcmRlci4gTG93ZXIgcHJpb3JpdHkgaXRlbXMgYXJlXG4gIC8vICAgICBmb3JjZWQgY2xvc2VyIHRvIHRoZSBlZGdlcyBvZiB0aGUgd2luZG93LiAoZGVmYXVsdDogMTAwKVxuICAvL1xuICAvLyBSZXR1cm5zIGEge1BhbmVsfVxuICBhZGRMZWZ0UGFuZWwgKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5hZGRQYW5lbCgnbGVmdCcsIG9wdGlvbnMpXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEdldCBhbiB7QXJyYXl9IG9mIGFsbCB0aGUgcGFuZWwgaXRlbXMgdG8gdGhlIHJpZ2h0IG9mIHRoZSBlZGl0b3Igd2luZG93LlxuICBnZXRSaWdodFBhbmVscyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UGFuZWxzKCdyaWdodCcpXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEFkZHMgYSBwYW5lbCBpdGVtIHRvIHRoZSByaWdodCBvZiB0aGUgZWRpdG9yIHdpbmRvdy5cbiAgLy9cbiAgLy8gKiBgb3B0aW9uc2Age09iamVjdH1cbiAgLy8gICAqIGBpdGVtYCBZb3VyIHBhbmVsIGNvbnRlbnQuIEl0IGNhbiBiZSBET00gZWxlbWVudCwgYSBqUXVlcnkgZWxlbWVudCwgb3JcbiAgLy8gICAgIGEgbW9kZWwgd2l0aCBhIHZpZXcgcmVnaXN0ZXJlZCB2aWEge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfS4gV2UgcmVjb21tZW5kIHRoZVxuICAvLyAgICAgbGF0dGVyLiBTZWUge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgLy8gICAqIGB2aXNpYmxlYCAob3B0aW9uYWwpIHtCb29sZWFufSBmYWxzZSBpZiB5b3Ugd2FudCB0aGUgcGFuZWwgdG8gaW5pdGlhbGx5IGJlIGhpZGRlblxuICAvLyAgICAgKGRlZmF1bHQ6IHRydWUpXG4gIC8vICAgKiBgcHJpb3JpdHlgIChvcHRpb25hbCkge051bWJlcn0gRGV0ZXJtaW5lcyBzdGFja2luZyBvcmRlci4gTG93ZXIgcHJpb3JpdHkgaXRlbXMgYXJlXG4gIC8vICAgICBmb3JjZWQgY2xvc2VyIHRvIHRoZSBlZGdlcyBvZiB0aGUgd2luZG93LiAoZGVmYXVsdDogMTAwKVxuICAvL1xuICAvLyBSZXR1cm5zIGEge1BhbmVsfVxuICBhZGRSaWdodFBhbmVsIChvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkUGFuZWwoJ3JpZ2h0Jywgb3B0aW9ucylcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogR2V0IGFuIHtBcnJheX0gb2YgYWxsIHRoZSBwYW5lbCBpdGVtcyBhdCB0aGUgdG9wIG9mIHRoZSBlZGl0b3Igd2luZG93LlxuICBnZXRUb3BQYW5lbHMgKCkge1xuICAgIHJldHVybiB0aGlzLmdldFBhbmVscygndG9wJylcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogQWRkcyBhIHBhbmVsIGl0ZW0gdG8gdGhlIHRvcCBvZiB0aGUgZWRpdG9yIHdpbmRvdyBhYm92ZSB0aGUgdGFicy5cbiAgLy9cbiAgLy8gKiBgb3B0aW9uc2Age09iamVjdH1cbiAgLy8gICAqIGBpdGVtYCBZb3VyIHBhbmVsIGNvbnRlbnQuIEl0IGNhbiBiZSBET00gZWxlbWVudCwgYSBqUXVlcnkgZWxlbWVudCwgb3JcbiAgLy8gICAgIGEgbW9kZWwgd2l0aCBhIHZpZXcgcmVnaXN0ZXJlZCB2aWEge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfS4gV2UgcmVjb21tZW5kIHRoZVxuICAvLyAgICAgbGF0dGVyLiBTZWUge1ZpZXdSZWdpc3RyeTo6YWRkVmlld1Byb3ZpZGVyfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgLy8gICAqIGB2aXNpYmxlYCAob3B0aW9uYWwpIHtCb29sZWFufSBmYWxzZSBpZiB5b3Ugd2FudCB0aGUgcGFuZWwgdG8gaW5pdGlhbGx5IGJlIGhpZGRlblxuICAvLyAgICAgKGRlZmF1bHQ6IHRydWUpXG4gIC8vICAgKiBgcHJpb3JpdHlgIChvcHRpb25hbCkge051bWJlcn0gRGV0ZXJtaW5lcyBzdGFja2luZyBvcmRlci4gTG93ZXIgcHJpb3JpdHkgaXRlbXMgYXJlXG4gIC8vICAgICBmb3JjZWQgY2xvc2VyIHRvIHRoZSBlZGdlcyBvZiB0aGUgd2luZG93LiAoZGVmYXVsdDogMTAwKVxuICAvL1xuICAvLyBSZXR1cm5zIGEge1BhbmVsfVxuICBhZGRUb3BQYW5lbCAob3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLmFkZFBhbmVsKCd0b3AnLCBvcHRpb25zKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBHZXQgYW4ge0FycmF5fSBvZiBhbGwgdGhlIHBhbmVsIGl0ZW1zIGluIHRoZSBoZWFkZXIuXG4gIGdldEhlYWRlclBhbmVscyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UGFuZWxzKCdoZWFkZXInKVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBBZGRzIGEgcGFuZWwgaXRlbSB0byB0aGUgaGVhZGVyLlxuICAvL1xuICAvLyAqIGBvcHRpb25zYCB7T2JqZWN0fVxuICAvLyAgICogYGl0ZW1gIFlvdXIgcGFuZWwgY29udGVudC4gSXQgY2FuIGJlIERPTSBlbGVtZW50LCBhIGpRdWVyeSBlbGVtZW50LCBvclxuICAvLyAgICAgYSBtb2RlbCB3aXRoIGEgdmlldyByZWdpc3RlcmVkIHZpYSB7Vmlld1JlZ2lzdHJ5OjphZGRWaWV3UHJvdmlkZXJ9LiBXZSByZWNvbW1lbmQgdGhlXG4gIC8vICAgICBsYXR0ZXIuIFNlZSB7Vmlld1JlZ2lzdHJ5OjphZGRWaWV3UHJvdmlkZXJ9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAvLyAgICogYHZpc2libGVgIChvcHRpb25hbCkge0Jvb2xlYW59IGZhbHNlIGlmIHlvdSB3YW50IHRoZSBwYW5lbCB0byBpbml0aWFsbHkgYmUgaGlkZGVuXG4gIC8vICAgICAoZGVmYXVsdDogdHJ1ZSlcbiAgLy8gICAqIGBwcmlvcml0eWAgKG9wdGlvbmFsKSB7TnVtYmVyfSBEZXRlcm1pbmVzIHN0YWNraW5nIG9yZGVyLiBMb3dlciBwcmlvcml0eSBpdGVtcyBhcmVcbiAgLy8gICAgIGZvcmNlZCBjbG9zZXIgdG8gdGhlIGVkZ2VzIG9mIHRoZSB3aW5kb3cuIChkZWZhdWx0OiAxMDApXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7UGFuZWx9XG4gIGFkZEhlYWRlclBhbmVsIChvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkUGFuZWwoJ2hlYWRlcicsIG9wdGlvbnMpXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEdldCBhbiB7QXJyYXl9IG9mIGFsbCB0aGUgcGFuZWwgaXRlbXMgaW4gdGhlIGZvb3Rlci5cbiAgZ2V0Rm9vdGVyUGFuZWxzICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRQYW5lbHMoJ2Zvb3RlcicpXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEFkZHMgYSBwYW5lbCBpdGVtIHRvIHRoZSBmb290ZXIuXG4gIC8vXG4gIC8vICogYG9wdGlvbnNgIHtPYmplY3R9XG4gIC8vICAgKiBgaXRlbWAgWW91ciBwYW5lbCBjb250ZW50LiBJdCBjYW4gYmUgRE9NIGVsZW1lbnQsIGEgalF1ZXJ5IGVsZW1lbnQsIG9yXG4gIC8vICAgICBhIG1vZGVsIHdpdGggYSB2aWV3IHJlZ2lzdGVyZWQgdmlhIHtWaWV3UmVnaXN0cnk6OmFkZFZpZXdQcm92aWRlcn0uIFdlIHJlY29tbWVuZCB0aGVcbiAgLy8gICAgIGxhdHRlci4gU2VlIHtWaWV3UmVnaXN0cnk6OmFkZFZpZXdQcm92aWRlcn0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gIC8vICAgKiBgdmlzaWJsZWAgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gZmFsc2UgaWYgeW91IHdhbnQgdGhlIHBhbmVsIHRvIGluaXRpYWxseSBiZSBoaWRkZW5cbiAgLy8gICAgIChkZWZhdWx0OiB0cnVlKVxuICAvLyAgICogYHByaW9yaXR5YCAob3B0aW9uYWwpIHtOdW1iZXJ9IERldGVybWluZXMgc3RhY2tpbmcgb3JkZXIuIExvd2VyIHByaW9yaXR5IGl0ZW1zIGFyZVxuICAvLyAgICAgZm9yY2VkIGNsb3NlciB0byB0aGUgZWRnZXMgb2YgdGhlIHdpbmRvdy4gKGRlZmF1bHQ6IDEwMClcbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtQYW5lbH1cbiAgYWRkRm9vdGVyUGFuZWwgKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5hZGRQYW5lbCgnZm9vdGVyJywgb3B0aW9ucylcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogR2V0IGFuIHtBcnJheX0gb2YgYWxsIHRoZSBtb2RhbCBwYW5lbCBpdGVtc1xuICBnZXRNb2RhbFBhbmVscyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UGFuZWxzKCdtb2RhbCcpXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IEFkZHMgYSBwYW5lbCBpdGVtIGFzIGEgbW9kYWwgZGlhbG9nLlxuICAvL1xuICAvLyAqIGBvcHRpb25zYCB7T2JqZWN0fVxuICAvLyAgICogYGl0ZW1gIFlvdXIgcGFuZWwgY29udGVudC4gSXQgY2FuIGJlIGEgRE9NIGVsZW1lbnQsIGEgalF1ZXJ5IGVsZW1lbnQsIG9yXG4gIC8vICAgICBhIG1vZGVsIHdpdGggYSB2aWV3IHJlZ2lzdGVyZWQgdmlhIHtWaWV3UmVnaXN0cnk6OmFkZFZpZXdQcm92aWRlcn0uIFdlIHJlY29tbWVuZCB0aGVcbiAgLy8gICAgIG1vZGVsIG9wdGlvbi4gU2VlIHtWaWV3UmVnaXN0cnk6OmFkZFZpZXdQcm92aWRlcn0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gIC8vICAgKiBgdmlzaWJsZWAgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gZmFsc2UgaWYgeW91IHdhbnQgdGhlIHBhbmVsIHRvIGluaXRpYWxseSBiZSBoaWRkZW5cbiAgLy8gICAgIChkZWZhdWx0OiB0cnVlKVxuICAvLyAgICogYHByaW9yaXR5YCAob3B0aW9uYWwpIHtOdW1iZXJ9IERldGVybWluZXMgc3RhY2tpbmcgb3JkZXIuIExvd2VyIHByaW9yaXR5IGl0ZW1zIGFyZVxuICAvLyAgICAgZm9yY2VkIGNsb3NlciB0byB0aGUgZWRnZXMgb2YgdGhlIHdpbmRvdy4gKGRlZmF1bHQ6IDEwMClcbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtQYW5lbH1cbiAgYWRkTW9kYWxQYW5lbCAob3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkUGFuZWwoJ21vZGFsJywgb3B0aW9ucylcbiAgfVxuXG4gIC8vIEVzc2VudGlhbDogUmV0dXJucyB0aGUge1BhbmVsfSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGl0ZW0uIFJldHVybnNcbiAgLy8gYG51bGxgIHdoZW4gdGhlIGl0ZW0gaGFzIG5vIHBhbmVsLlxuICAvL1xuICAvLyAqIGBpdGVtYCBJdGVtIHRoZSBwYW5lbCBjb250YWluc1xuICBwYW5lbEZvckl0ZW0gKGl0ZW0pIHtcbiAgICBmb3IgKGxldCBsb2NhdGlvbiBpbiB0aGlzLnBhbmVsQ29udGFpbmVycykge1xuICAgICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5wYW5lbENvbnRhaW5lcnNbbG9jYXRpb25dXG4gICAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5wYW5lbEZvckl0ZW0oaXRlbSlcbiAgICAgIGlmIChwYW5lbCAhPSBudWxsKSB7IHJldHVybiBwYW5lbCB9XG4gICAgfVxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBnZXRQYW5lbHMgKGxvY2F0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMucGFuZWxDb250YWluZXJzW2xvY2F0aW9uXS5nZXRQYW5lbHMoKVxuICB9XG5cbiAgYWRkUGFuZWwgKGxvY2F0aW9uLCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkgeyBvcHRpb25zID0ge30gfVxuICAgIHJldHVybiB0aGlzLnBhbmVsQ29udGFpbmVyc1tsb2NhdGlvbl0uYWRkUGFuZWwobmV3IFBhbmVsKG9wdGlvbnMsIHRoaXMudmlld1JlZ2lzdHJ5KSlcbiAgfVxuXG4gIC8qXG4gIFNlY3Rpb246IFNlYXJjaGluZyBhbmQgUmVwbGFjaW5nXG4gICovXG5cbiAgLy8gUHVibGljOiBQZXJmb3JtcyBhIHNlYXJjaCBhY3Jvc3MgYWxsIGZpbGVzIGluIHRoZSB3b3Jrc3BhY2UuXG4gIC8vXG4gIC8vICogYHJlZ2V4YCB7UmVnRXhwfSB0byBzZWFyY2ggd2l0aC5cbiAgLy8gKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAvLyAgICogYHBhdGhzYCBBbiB7QXJyYXl9IG9mIGdsb2IgcGF0dGVybnMgdG8gc2VhcmNoIHdpdGhpbi5cbiAgLy8gICAqIGBvblBhdGhzU2VhcmNoZWRgIChvcHRpb25hbCkge0Z1bmN0aW9ufSB0byBiZSBwZXJpb2RpY2FsbHkgY2FsbGVkXG4gIC8vICAgICB3aXRoIG51bWJlciBvZiBwYXRocyBzZWFyY2hlZC5cbiAgLy8gICAqIGBsZWFkaW5nQ29udGV4dExpbmVDb3VudGAge051bWJlcn0gZGVmYXVsdCBgMGA7IFRoZSBudW1iZXIgb2YgbGluZXNcbiAgLy8gICAgICBiZWZvcmUgdGhlIG1hdGNoZWQgbGluZSB0byBpbmNsdWRlIGluIHRoZSByZXN1bHRzIG9iamVjdC5cbiAgLy8gICAqIGB0cmFpbGluZ0NvbnRleHRMaW5lQ291bnRgIHtOdW1iZXJ9IGRlZmF1bHQgYDBgOyBUaGUgbnVtYmVyIG9mIGxpbmVzXG4gIC8vICAgICAgYWZ0ZXIgdGhlIG1hdGNoZWQgbGluZSB0byBpbmNsdWRlIGluIHRoZSByZXN1bHRzIG9iamVjdC5cbiAgLy8gKiBgaXRlcmF0b3JgIHtGdW5jdGlvbn0gY2FsbGJhY2sgb24gZWFjaCBmaWxlIGZvdW5kLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge1Byb21pc2V9IHdpdGggYSBgY2FuY2VsKClgIG1ldGhvZCB0aGF0IHdpbGwgY2FuY2VsIGFsbFxuICAvLyBvZiB0aGUgdW5kZXJseWluZyBzZWFyY2hlcyB0aGF0IHdlcmUgc3RhcnRlZCBhcyBwYXJ0IG9mIHRoaXMgc2Nhbi5cbiAgc2NhbiAocmVnZXgsIG9wdGlvbnMgPSB7fSwgaXRlcmF0b3IpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICBpdGVyYXRvciA9IG9wdGlvbnNcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIC8vIEZpbmQgYSBzZWFyY2hlciBmb3IgZXZlcnkgRGlyZWN0b3J5IGluIHRoZSBwcm9qZWN0LiBFYWNoIHNlYXJjaGVyIHRoYXQgaXMgbWF0Y2hlZFxuICAgIC8vIHdpbGwgYmUgYXNzb2NpYXRlZCB3aXRoIGFuIEFycmF5IG9mIERpcmVjdG9yeSBvYmplY3RzIGluIHRoZSBNYXAuXG4gICAgY29uc3QgZGlyZWN0b3JpZXNGb3JTZWFyY2hlciA9IG5ldyBNYXAoKVxuICAgIGZvciAoY29uc3QgZGlyZWN0b3J5IG9mIHRoaXMucHJvamVjdC5nZXREaXJlY3RvcmllcygpKSB7XG4gICAgICBsZXQgc2VhcmNoZXIgPSB0aGlzLmRlZmF1bHREaXJlY3RvcnlTZWFyY2hlclxuICAgICAgZm9yIChjb25zdCBkaXJlY3RvcnlTZWFyY2hlciBvZiB0aGlzLmRpcmVjdG9yeVNlYXJjaGVycykge1xuICAgICAgICBpZiAoZGlyZWN0b3J5U2VhcmNoZXIuY2FuU2VhcmNoRGlyZWN0b3J5KGRpcmVjdG9yeSkpIHtcbiAgICAgICAgICBzZWFyY2hlciA9IGRpcmVjdG9yeVNlYXJjaGVyXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGV0IGRpcmVjdG9yaWVzID0gZGlyZWN0b3JpZXNGb3JTZWFyY2hlci5nZXQoc2VhcmNoZXIpXG4gICAgICBpZiAoIWRpcmVjdG9yaWVzKSB7XG4gICAgICAgIGRpcmVjdG9yaWVzID0gW11cbiAgICAgICAgZGlyZWN0b3JpZXNGb3JTZWFyY2hlci5zZXQoc2VhcmNoZXIsIGRpcmVjdG9yaWVzKVxuICAgICAgfVxuICAgICAgZGlyZWN0b3JpZXMucHVzaChkaXJlY3RvcnkpXG4gICAgfVxuXG4gICAgLy8gRGVmaW5lIHRoZSBvblBhdGhzU2VhcmNoZWQgY2FsbGJhY2suXG4gICAgbGV0IG9uUGF0aHNTZWFyY2hlZFxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0aW9ucy5vblBhdGhzU2VhcmNoZWQpKSB7XG4gICAgICAvLyBNYWludGFpbiBhIG1hcCBvZiBkaXJlY3RvcmllcyB0byB0aGUgbnVtYmVyIG9mIHNlYXJjaCByZXN1bHRzLiBXaGVuIG5vdGlmaWVkIG9mIGEgbmV3IGNvdW50LFxuICAgICAgLy8gcmVwbGFjZSB0aGUgZW50cnkgaW4gdGhlIG1hcCBhbmQgdXBkYXRlIHRoZSB0b3RhbC5cbiAgICAgIGNvbnN0IG9uUGF0aHNTZWFyY2hlZE9wdGlvbiA9IG9wdGlvbnMub25QYXRoc1NlYXJjaGVkXG4gICAgICBsZXQgdG90YWxOdW1iZXJPZlBhdGhzU2VhcmNoZWQgPSAwXG4gICAgICBjb25zdCBudW1iZXJPZlBhdGhzU2VhcmNoZWRGb3JTZWFyY2hlciA9IG5ldyBNYXAoKVxuICAgICAgb25QYXRoc1NlYXJjaGVkID0gZnVuY3Rpb24gKHNlYXJjaGVyLCBudW1iZXJPZlBhdGhzU2VhcmNoZWQpIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBudW1iZXJPZlBhdGhzU2VhcmNoZWRGb3JTZWFyY2hlci5nZXQoc2VhcmNoZXIpXG4gICAgICAgIGlmIChvbGRWYWx1ZSkge1xuICAgICAgICAgIHRvdGFsTnVtYmVyT2ZQYXRoc1NlYXJjaGVkIC09IG9sZFZhbHVlXG4gICAgICAgIH1cbiAgICAgICAgbnVtYmVyT2ZQYXRoc1NlYXJjaGVkRm9yU2VhcmNoZXIuc2V0KHNlYXJjaGVyLCBudW1iZXJPZlBhdGhzU2VhcmNoZWQpXG4gICAgICAgIHRvdGFsTnVtYmVyT2ZQYXRoc1NlYXJjaGVkICs9IG51bWJlck9mUGF0aHNTZWFyY2hlZFxuICAgICAgICByZXR1cm4gb25QYXRoc1NlYXJjaGVkT3B0aW9uKHRvdGFsTnVtYmVyT2ZQYXRoc1NlYXJjaGVkKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvblBhdGhzU2VhcmNoZWQgPSBmdW5jdGlvbiAoKSB7fVxuICAgIH1cblxuICAgIC8vIEtpY2sgb2ZmIGFsbCBvZiB0aGUgc2VhcmNoZXMgYW5kIHVuaWZ5IHRoZW0gaW50byBvbmUgUHJvbWlzZS5cbiAgICBjb25zdCBhbGxTZWFyY2hlcyA9IFtdXG4gICAgZGlyZWN0b3JpZXNGb3JTZWFyY2hlci5mb3JFYWNoKChkaXJlY3Rvcmllcywgc2VhcmNoZXIpID0+IHtcbiAgICAgIGNvbnN0IHNlYXJjaE9wdGlvbnMgPSB7XG4gICAgICAgIGluY2x1c2lvbnM6IG9wdGlvbnMucGF0aHMgfHwgW10sXG4gICAgICAgIGluY2x1ZGVIaWRkZW46IHRydWUsXG4gICAgICAgIGV4Y2x1ZGVWY3NJZ25vcmVzOiB0aGlzLmNvbmZpZy5nZXQoJ2NvcmUuZXhjbHVkZVZjc0lnbm9yZWRQYXRocycpLFxuICAgICAgICBleGNsdXNpb25zOiB0aGlzLmNvbmZpZy5nZXQoJ2NvcmUuaWdub3JlZE5hbWVzJyksXG4gICAgICAgIGZvbGxvdzogdGhpcy5jb25maWcuZ2V0KCdjb3JlLmZvbGxvd1N5bWxpbmtzJyksXG4gICAgICAgIGxlYWRpbmdDb250ZXh0TGluZUNvdW50OiBvcHRpb25zLmxlYWRpbmdDb250ZXh0TGluZUNvdW50IHx8IDAsXG4gICAgICAgIHRyYWlsaW5nQ29udGV4dExpbmVDb3VudDogb3B0aW9ucy50cmFpbGluZ0NvbnRleHRMaW5lQ291bnQgfHwgMCxcbiAgICAgICAgZGlkTWF0Y2g6IHJlc3VsdCA9PiB7XG4gICAgICAgICAgaWYgKCF0aGlzLnByb2plY3QuaXNQYXRoTW9kaWZpZWQocmVzdWx0LmZpbGVQYXRoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yKHJlc3VsdClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRpZEVycm9yIChlcnJvcikge1xuICAgICAgICAgIHJldHVybiBpdGVyYXRvcihudWxsLCBlcnJvcilcbiAgICAgICAgfSxcbiAgICAgICAgZGlkU2VhcmNoUGF0aHMgKGNvdW50KSB7XG4gICAgICAgICAgcmV0dXJuIG9uUGF0aHNTZWFyY2hlZChzZWFyY2hlciwgY291bnQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpcmVjdG9yeVNlYXJjaGVyID0gc2VhcmNoZXIuc2VhcmNoKGRpcmVjdG9yaWVzLCByZWdleCwgc2VhcmNoT3B0aW9ucylcbiAgICAgIGFsbFNlYXJjaGVzLnB1c2goZGlyZWN0b3J5U2VhcmNoZXIpXG4gICAgfSlcbiAgICBjb25zdCBzZWFyY2hQcm9taXNlID0gUHJvbWlzZS5hbGwoYWxsU2VhcmNoZXMpXG5cbiAgICBmb3IgKGxldCBidWZmZXIgb2YgdGhpcy5wcm9qZWN0LmdldEJ1ZmZlcnMoKSkge1xuICAgICAgaWYgKGJ1ZmZlci5pc01vZGlmaWVkKCkpIHtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBidWZmZXIuZ2V0UGF0aCgpXG4gICAgICAgIGlmICghdGhpcy5wcm9qZWN0LmNvbnRhaW5zKGZpbGVQYXRoKSkge1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoZXMgPSBbXVxuICAgICAgICBidWZmZXIuc2NhbihyZWdleCwgbWF0Y2ggPT4gbWF0Y2hlcy5wdXNoKG1hdGNoKSlcbiAgICAgICAgaWYgKG1hdGNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGl0ZXJhdG9yKHtmaWxlUGF0aCwgbWF0Y2hlc30pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIFByb21pc2UgdGhhdCBpcyByZXR1cm5lZCB0byB0aGUgY2xpZW50IGlzIGNhbmNlbGFibGUuIFRvIGJlIGNvbnNpc3RlbnRcbiAgICAvLyB3aXRoIHRoZSBleGlzdGluZyBiZWhhdmlvciwgaW5zdGVhZCBvZiBjYW5jZWwoKSByZWplY3RpbmcgdGhlIHByb21pc2UsIGl0IHNob3VsZFxuICAgIC8vIHJlc29sdmUgaXQgd2l0aCB0aGUgc3BlY2lhbCB2YWx1ZSAnY2FuY2VsbGVkJy4gQXQgbGVhc3QgdGhlIGJ1aWx0LWluIGZpbmQtYW5kLXJlcGxhY2VcbiAgICAvLyBwYWNrYWdlIHJlbGllcyBvbiB0aGlzIGJlaGF2aW9yLlxuICAgIGxldCBpc0NhbmNlbGxlZCA9IGZhbHNlXG4gICAgY29uc3QgY2FuY2VsbGFibGVQcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgb25TdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaXNDYW5jZWxsZWQpIHtcbiAgICAgICAgICByZXNvbHZlKCdjYW5jZWxsZWQnKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUobnVsbClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBvbkZhaWx1cmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAobGV0IHByb21pc2Ugb2YgYWxsU2VhcmNoZXMpIHsgcHJvbWlzZS5jYW5jZWwoKSB9XG4gICAgICAgIHJlamVjdCgpXG4gICAgICB9XG5cbiAgICAgIHNlYXJjaFByb21pc2UudGhlbihvblN1Y2Nlc3MsIG9uRmFpbHVyZSlcbiAgICB9KVxuICAgIGNhbmNlbGxhYmxlUHJvbWlzZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBpc0NhbmNlbGxlZCA9IHRydWVcbiAgICAgIC8vIE5vdGUgdGhhdCBjYW5jZWxsaW5nIGFsbCBvZiB0aGUgbWVtYmVycyBvZiBhbGxTZWFyY2hlcyB3aWxsIGNhdXNlIGFsbCBvZiB0aGUgc2VhcmNoZXNcbiAgICAgIC8vIHRvIHJlc29sdmUsIHdoaWNoIGNhdXNlcyBzZWFyY2hQcm9taXNlIHRvIHJlc29sdmUsIHdoaWNoIGlzIHVsdGltYXRlbHkgd2hhdCBjYXVzZXNcbiAgICAgIC8vIGNhbmNlbGxhYmxlUHJvbWlzZSB0byByZXNvbHZlLlxuICAgICAgYWxsU2VhcmNoZXMubWFwKChwcm9taXNlKSA9PiBwcm9taXNlLmNhbmNlbCgpKVxuICAgIH1cblxuICAgIC8vIEFsdGhvdWdoIHRoaXMgbWV0aG9kIGNsYWltcyB0byByZXR1cm4gYSBgUHJvbWlzZWAsIHRoZSBgUmVzdWx0c1BhbmVWaWV3Lm9uU2VhcmNoKClgXG4gICAgLy8gbWV0aG9kIGluIHRoZSBmaW5kLWFuZC1yZXBsYWNlIHBhY2thZ2UgZXhwZWN0cyB0aGUgb2JqZWN0IHJldHVybmVkIGJ5IHRoaXMgbWV0aG9kIHRvIGhhdmUgYVxuICAgIC8vIGBkb25lKClgIG1ldGhvZC4gSW5jbHVkZSBhIGRvbmUoKSBtZXRob2QgdW50aWwgZmluZC1hbmQtcmVwbGFjZSBjYW4gYmUgdXBkYXRlZC5cbiAgICBjYW5jZWxsYWJsZVByb21pc2UuZG9uZSA9IG9uU3VjY2Vzc09yRmFpbHVyZSA9PiB7XG4gICAgICBjYW5jZWxsYWJsZVByb21pc2UudGhlbihvblN1Y2Nlc3NPckZhaWx1cmUsIG9uU3VjY2Vzc09yRmFpbHVyZSlcbiAgICB9XG4gICAgcmV0dXJuIGNhbmNlbGxhYmxlUHJvbWlzZVxuICB9XG5cbiAgLy8gUHVibGljOiBQZXJmb3JtcyBhIHJlcGxhY2UgYWNyb3NzIGFsbCB0aGUgc3BlY2lmaWVkIGZpbGVzIGluIHRoZSBwcm9qZWN0LlxuICAvL1xuICAvLyAqIGByZWdleGAgQSB7UmVnRXhwfSB0byBzZWFyY2ggd2l0aC5cbiAgLy8gKiBgcmVwbGFjZW1lbnRUZXh0YCB7U3RyaW5nfSB0byByZXBsYWNlIGFsbCBtYXRjaGVzIG9mIHJlZ2V4IHdpdGguXG4gIC8vICogYGZpbGVQYXRoc2AgQW4ge0FycmF5fSBvZiBmaWxlIHBhdGggc3RyaW5ncyB0byBydW4gdGhlIHJlcGxhY2Ugb24uXG4gIC8vICogYGl0ZXJhdG9yYCBBIHtGdW5jdGlvbn0gY2FsbGJhY2sgb24gZWFjaCBmaWxlIHdpdGggcmVwbGFjZW1lbnRzOlxuICAvLyAgICogYG9wdGlvbnNgIHtPYmplY3R9IHdpdGgga2V5cyBgZmlsZVBhdGhgIGFuZCBgcmVwbGFjZW1lbnRzYC5cbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtQcm9taXNlfS5cbiAgcmVwbGFjZSAocmVnZXgsIHJlcGxhY2VtZW50VGV4dCwgZmlsZVBhdGhzLCBpdGVyYXRvcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBsZXQgYnVmZmVyXG4gICAgICBjb25zdCBvcGVuUGF0aHMgPSB0aGlzLnByb2plY3QuZ2V0QnVmZmVycygpLm1hcChidWZmZXIgPT4gYnVmZmVyLmdldFBhdGgoKSlcbiAgICAgIGNvbnN0IG91dE9mUHJvY2Vzc1BhdGhzID0gXy5kaWZmZXJlbmNlKGZpbGVQYXRocywgb3BlblBhdGhzKVxuXG4gICAgICBsZXQgaW5Qcm9jZXNzRmluaXNoZWQgPSAhb3BlblBhdGhzLmxlbmd0aFxuICAgICAgbGV0IG91dE9mUHJvY2Vzc0ZpbmlzaGVkID0gIW91dE9mUHJvY2Vzc1BhdGhzLmxlbmd0aFxuICAgICAgY29uc3QgY2hlY2tGaW5pc2hlZCA9ICgpID0+IHtcbiAgICAgICAgaWYgKG91dE9mUHJvY2Vzc0ZpbmlzaGVkICYmIGluUHJvY2Vzc0ZpbmlzaGVkKSB7XG4gICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFvdXRPZlByb2Nlc3NGaW5pc2hlZC5sZW5ndGgpIHtcbiAgICAgICAgbGV0IGZsYWdzID0gJ2cnXG4gICAgICAgIGlmIChyZWdleC5pZ25vcmVDYXNlKSB7IGZsYWdzICs9ICdpJyB9XG5cbiAgICAgICAgY29uc3QgdGFzayA9IFRhc2sub25jZShcbiAgICAgICAgICByZXF1aXJlLnJlc29sdmUoJy4vcmVwbGFjZS1oYW5kbGVyJyksXG4gICAgICAgICAgb3V0T2ZQcm9jZXNzUGF0aHMsXG4gICAgICAgICAgcmVnZXguc291cmNlLFxuICAgICAgICAgIGZsYWdzLFxuICAgICAgICAgIHJlcGxhY2VtZW50VGV4dCxcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZlByb2Nlc3NGaW5pc2hlZCA9IHRydWVcbiAgICAgICAgICAgIGNoZWNrRmluaXNoZWQoKVxuICAgICAgICAgIH1cbiAgICAgICAgKVxuXG4gICAgICAgIHRhc2sub24oJ3JlcGxhY2U6cGF0aC1yZXBsYWNlZCcsIGl0ZXJhdG9yKVxuICAgICAgICB0YXNrLm9uKCdyZXBsYWNlOmZpbGUtZXJyb3InLCBlcnJvciA9PiB7IGl0ZXJhdG9yKG51bGwsIGVycm9yKSB9KVxuICAgICAgfVxuXG4gICAgICBmb3IgKGJ1ZmZlciBvZiB0aGlzLnByb2plY3QuZ2V0QnVmZmVycygpKSB7XG4gICAgICAgIGlmICghZmlsZVBhdGhzLmluY2x1ZGVzKGJ1ZmZlci5nZXRQYXRoKCkpKSB7IGNvbnRpbnVlIH1cbiAgICAgICAgY29uc3QgcmVwbGFjZW1lbnRzID0gYnVmZmVyLnJlcGxhY2UocmVnZXgsIHJlcGxhY2VtZW50VGV4dCwgaXRlcmF0b3IpXG4gICAgICAgIGlmIChyZXBsYWNlbWVudHMpIHtcbiAgICAgICAgICBpdGVyYXRvcih7ZmlsZVBhdGg6IGJ1ZmZlci5nZXRQYXRoKCksIHJlcGxhY2VtZW50c30pXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaW5Qcm9jZXNzRmluaXNoZWQgPSB0cnVlXG4gICAgICBjaGVja0ZpbmlzaGVkKClcbiAgICB9KVxuICB9XG5cbiAgY2hlY2tvdXRIZWFkUmV2aXNpb24gKGVkaXRvcikge1xuICAgIGlmIChlZGl0b3IuZ2V0UGF0aCgpKSB7XG4gICAgICBjb25zdCBjaGVja291dEhlYWQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2plY3QucmVwb3NpdG9yeUZvckRpcmVjdG9yeShuZXcgRGlyZWN0b3J5KGVkaXRvci5nZXREaXJlY3RvcnlQYXRoKCkpKVxuICAgICAgICAgIC50aGVuKHJlcG9zaXRvcnkgPT4gcmVwb3NpdG9yeSAmJiByZXBvc2l0b3J5LmNoZWNrb3V0SGVhZEZvckVkaXRvcihlZGl0b3IpKVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb25maWcuZ2V0KCdlZGl0b3IuY29uZmlybUNoZWNrb3V0SGVhZFJldmlzaW9uJykpIHtcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkRlbGVnYXRlLmNvbmZpcm0oe1xuICAgICAgICAgIG1lc3NhZ2U6ICdDb25maXJtIENoZWNrb3V0IEhFQUQgUmV2aXNpb24nLFxuICAgICAgICAgIGRldGFpbGVkTWVzc2FnZTogYEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkaXNjYXJkIGFsbCBjaGFuZ2VzIHRvIFwiJHtlZGl0b3IuZ2V0RmlsZU5hbWUoKX1cIiBzaW5jZSB0aGUgbGFzdCBHaXQgY29tbWl0P2AsXG4gICAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgICAgT0s6IGNoZWNrb3V0SGVhZCxcbiAgICAgICAgICAgIENhbmNlbDogbnVsbFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjaGVja291dEhlYWQoKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKVxuICAgIH1cbiAgfVxufVxuIl19