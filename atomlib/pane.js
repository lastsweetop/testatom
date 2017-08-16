(function() {
  var CompositeDisposable, Emitter, Grim, Pane, PaneAxis, PaneElement, SaveCancelledError, TextEditor, compact, extend, find, last, nextInstanceId, promisify, ref, ref1,
    extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Grim = require('grim');

  ref = require('underscore-plus'), find = ref.find, compact = ref.compact, extend = ref.extend, last = ref.last;

  ref1 = require('event-kit'), CompositeDisposable = ref1.CompositeDisposable, Emitter = ref1.Emitter;

  PaneAxis = require('./pane-axis');

  TextEditor = require('./text-editor');

  PaneElement = require('./pane-element');

  nextInstanceId = 1;

  SaveCancelledError = (function(superClass) {
    extend1(SaveCancelledError, superClass);

    function SaveCancelledError() {
      SaveCancelledError.__super__.constructor.apply(this, arguments);
    }

    return SaveCancelledError;

  })(Error);

  module.exports = Pane = (function() {
    Pane.prototype.inspect = function() {
      return "Pane " + this.id;
    };

    Pane.deserialize = function(state, arg) {
      var activeItemIndex, activeItemURI, activeItemUri, applicationDelegate, config, deserializers, items, notifications, views;
      deserializers = arg.deserializers, applicationDelegate = arg.applicationDelegate, config = arg.config, notifications = arg.notifications, views = arg.views;
      items = state.items, activeItemIndex = state.activeItemIndex, activeItemURI = state.activeItemURI, activeItemUri = state.activeItemUri;
      if (activeItemURI == null) {
        activeItemURI = activeItemUri;
      }
      items = items.map(function(itemState) {
        return deserializers.deserialize(itemState);
      });
      state.activeItem = items[activeItemIndex];
      state.items = compact(items);
      if (activeItemURI != null) {
        if (state.activeItem == null) {
          state.activeItem = find(state.items, function(item) {
            var itemURI;
            if (typeof item.getURI === 'function') {
              itemURI = item.getURI();
            }
            return itemURI === activeItemURI;
          });
        }
      }
      return new Pane(extend(state, {
        deserializerManager: deserializers,
        notificationManager: notifications,
        viewRegistry: views,
        config: config,
        applicationDelegate: applicationDelegate
      }));
    };

    function Pane(params) {
      this.saveItemAs = bind(this.saveItemAs, this);
      this.saveItem = bind(this.saveItem, this);
      this.onItemDidTerminatePendingState = bind(this.onItemDidTerminatePendingState, this);
      this.clearPendingItem = bind(this.clearPendingItem, this);
      this.getPendingItem = bind(this.getPendingItem, this);
      this.setPendingItem = bind(this.setPendingItem, this);
      var ref2, ref3, ref4;
      this.id = params.id, this.activeItem = params.activeItem, this.focused = params.focused, this.applicationDelegate = params.applicationDelegate, this.notificationManager = params.notificationManager, this.config = params.config, this.deserializerManager = params.deserializerManager, this.viewRegistry = params.viewRegistry;
      if (this.id != null) {
        nextInstanceId = Math.max(nextInstanceId, this.id + 1);
      } else {
        this.id = nextInstanceId++;
      }
      this.emitter = new Emitter;
      this.alive = true;
      this.subscriptionsPerItem = new WeakMap;
      this.items = [];
      this.itemStack = [];
      this.container = null;
      if (this.activeItem == null) {
        this.activeItem = void 0;
      }
      if (this.focused == null) {
        this.focused = false;
      }
      this.addItems(compact((ref2 = params != null ? params.items : void 0) != null ? ref2 : []));
      if (this.getActiveItem() == null) {
        this.setActiveItem(this.items[0]);
      }
      this.addItemsToStack((ref3 = params != null ? params.itemStackIndices : void 0) != null ? ref3 : []);
      this.setFlexScale((ref4 = params != null ? params.flexScale : void 0) != null ? ref4 : 1);
    }

    Pane.prototype.getElement = function() {
      return this.element != null ? this.element : this.element = new PaneElement().initialize(this, {
        views: this.viewRegistry,
        applicationDelegate: this.applicationDelegate
      });
    };

    Pane.prototype.serialize = function() {
      var activeItemIndex, item, itemStackIndices, itemsToBeSerialized;
      itemsToBeSerialized = compact(this.items.map(function(item) {
        if (typeof item.serialize === 'function') {
          return item;
        }
      }));
      itemStackIndices = (function() {
        var j, len, ref2, results1;
        ref2 = this.itemStack;
        results1 = [];
        for (j = 0, len = ref2.length; j < len; j++) {
          item = ref2[j];
          if (typeof item.serialize === 'function') {
            results1.push(itemsToBeSerialized.indexOf(item));
          }
        }
        return results1;
      }).call(this);
      activeItemIndex = itemsToBeSerialized.indexOf(this.activeItem);
      return {
        deserializer: 'Pane',
        id: this.id,
        items: itemsToBeSerialized.map(function(item) {
          return item.serialize();
        }),
        itemStackIndices: itemStackIndices,
        activeItemIndex: activeItemIndex,
        focused: this.focused,
        flexScale: this.flexScale
      };
    };

    Pane.prototype.getParent = function() {
      return this.parent;
    };

    Pane.prototype.setParent = function(parent) {
      this.parent = parent;
      return this.parent;
    };

    Pane.prototype.getContainer = function() {
      return this.container;
    };

    Pane.prototype.setContainer = function(container) {
      if (container && container !== this.container) {
        this.container = container;
        return container.didAddPane({
          pane: this
        });
      }
    };

    Pane.prototype.isItemAllowed = function(item) {
      if (typeof item.getAllowedLocations !== 'function') {
        return true;
      } else {
        return item.getAllowedLocations().includes(this.getContainer().getLocation());
      }
    };

    Pane.prototype.setFlexScale = function(flexScale) {
      this.flexScale = flexScale;
      this.emitter.emit('did-change-flex-scale', this.flexScale);
      return this.flexScale;
    };

    Pane.prototype.getFlexScale = function() {
      return this.flexScale;
    };

    Pane.prototype.increaseSize = function() {
      return this.setFlexScale(this.getFlexScale() * 1.1);
    };

    Pane.prototype.decreaseSize = function() {
      return this.setFlexScale(this.getFlexScale() / 1.1);
    };


    /*
    Section: Event Subscription
     */

    Pane.prototype.onDidChangeFlexScale = function(callback) {
      return this.emitter.on('did-change-flex-scale', callback);
    };

    Pane.prototype.observeFlexScale = function(callback) {
      callback(this.flexScale);
      return this.onDidChangeFlexScale(callback);
    };

    Pane.prototype.onDidActivate = function(callback) {
      return this.emitter.on('did-activate', callback);
    };

    Pane.prototype.onWillDestroy = function(callback) {
      return this.emitter.on('will-destroy', callback);
    };

    Pane.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    Pane.prototype.onDidChangeActive = function(callback) {
      return this.container.onDidChangeActivePane((function(_this) {
        return function(activePane) {
          return callback(_this === activePane);
        };
      })(this));
    };

    Pane.prototype.observeActive = function(callback) {
      callback(this.isActive());
      return this.onDidChangeActive(callback);
    };

    Pane.prototype.onDidAddItem = function(callback) {
      return this.emitter.on('did-add-item', callback);
    };

    Pane.prototype.onDidRemoveItem = function(callback) {
      return this.emitter.on('did-remove-item', callback);
    };

    Pane.prototype.onWillRemoveItem = function(callback) {
      return this.emitter.on('will-remove-item', callback);
    };

    Pane.prototype.onDidMoveItem = function(callback) {
      return this.emitter.on('did-move-item', callback);
    };

    Pane.prototype.observeItems = function(callback) {
      var item, j, len, ref2;
      ref2 = this.getItems();
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        callback(item);
      }
      return this.onDidAddItem(function(arg) {
        var item;
        item = arg.item;
        return callback(item);
      });
    };

    Pane.prototype.onDidChangeActiveItem = function(callback) {
      return this.emitter.on('did-change-active-item', callback);
    };

    Pane.prototype.onChooseNextMRUItem = function(callback) {
      return this.emitter.on('choose-next-mru-item', callback);
    };

    Pane.prototype.onChooseLastMRUItem = function(callback) {
      return this.emitter.on('choose-last-mru-item', callback);
    };

    Pane.prototype.onDoneChoosingMRUItem = function(callback) {
      return this.emitter.on('done-choosing-mru-item', callback);
    };

    Pane.prototype.observeActiveItem = function(callback) {
      callback(this.getActiveItem());
      return this.onDidChangeActiveItem(callback);
    };

    Pane.prototype.onWillDestroyItem = function(callback) {
      return this.emitter.on('will-destroy-item', callback);
    };

    Pane.prototype.focus = function() {
      this.focused = true;
      return this.activate();
    };

    Pane.prototype.blur = function() {
      this.focused = false;
      return true;
    };

    Pane.prototype.isFocused = function() {
      return this.focused;
    };

    Pane.prototype.getPanes = function() {
      return [this];
    };

    Pane.prototype.unsubscribeFromItem = function(item) {
      var ref2;
      if ((ref2 = this.subscriptionsPerItem.get(item)) != null) {
        ref2.dispose();
      }
      return this.subscriptionsPerItem["delete"](item);
    };


    /*
    Section: Items
     */

    Pane.prototype.getItems = function() {
      return this.items.slice();
    };

    Pane.prototype.getActiveItem = function() {
      return this.activeItem;
    };

    Pane.prototype.setActiveItem = function(activeItem, options) {
      var modifyStack, ref2;
      if (options != null) {
        modifyStack = options.modifyStack;
      }
      if (activeItem !== this.activeItem) {
        if (modifyStack !== false) {
          this.addItemToStack(activeItem);
        }
        this.activeItem = activeItem;
        this.emitter.emit('did-change-active-item', this.activeItem);
        if ((ref2 = this.container) != null) {
          ref2.didChangeActiveItemOnPane(this, this.activeItem);
        }
      }
      return this.activeItem;
    };

    Pane.prototype.addItemsToStack = function(itemStackIndices) {
      var i, itemIndex, j, len;
      if (this.items.length > 0) {
        if (itemStackIndices.length === 0 || itemStackIndices.length !== this.items.length || itemStackIndices.indexOf(-1) >= 0) {
          itemStackIndices = (function() {
            var j, ref2, results1;
            results1 = [];
            for (i = j = 0, ref2 = this.items.length - 1; 0 <= ref2 ? j <= ref2 : j >= ref2; i = 0 <= ref2 ? ++j : --j) {
              results1.push(i);
            }
            return results1;
          }).call(this);
        }
        for (j = 0, len = itemStackIndices.length; j < len; j++) {
          itemIndex = itemStackIndices[j];
          this.addItemToStack(this.items[itemIndex]);
        }
      }
    };

    Pane.prototype.addItemToStack = function(newItem) {
      var index;
      if (newItem == null) {
        return;
      }
      index = this.itemStack.indexOf(newItem);
      if (index !== -1) {
        this.itemStack.splice(index, 1);
      }
      return this.itemStack.push(newItem);
    };

    Pane.prototype.getActiveEditor = function() {
      if (this.activeItem instanceof TextEditor) {
        return this.activeItem;
      }
    };

    Pane.prototype.itemAtIndex = function(index) {
      return this.items[index];
    };

    Pane.prototype.activateNextRecentlyUsedItem = function() {
      var nextRecentlyUsedItem;
      if (this.items.length > 1) {
        if (this.itemStackIndex == null) {
          this.itemStackIndex = this.itemStack.length - 1;
        }
        if (this.itemStackIndex === 0) {
          this.itemStackIndex = this.itemStack.length;
        }
        this.itemStackIndex = this.itemStackIndex - 1;
        nextRecentlyUsedItem = this.itemStack[this.itemStackIndex];
        this.emitter.emit('choose-next-mru-item', nextRecentlyUsedItem);
        return this.setActiveItem(nextRecentlyUsedItem, {
          modifyStack: false
        });
      }
    };

    Pane.prototype.activatePreviousRecentlyUsedItem = function() {
      var previousRecentlyUsedItem;
      if (this.items.length > 1) {
        if (this.itemStackIndex + 1 === this.itemStack.length || (this.itemStackIndex == null)) {
          this.itemStackIndex = -1;
        }
        this.itemStackIndex = this.itemStackIndex + 1;
        previousRecentlyUsedItem = this.itemStack[this.itemStackIndex];
        this.emitter.emit('choose-last-mru-item', previousRecentlyUsedItem);
        return this.setActiveItem(previousRecentlyUsedItem, {
          modifyStack: false
        });
      }
    };

    Pane.prototype.moveActiveItemToTopOfStack = function() {
      delete this.itemStackIndex;
      this.addItemToStack(this.activeItem);
      return this.emitter.emit('done-choosing-mru-item');
    };

    Pane.prototype.activateNextItem = function() {
      var index;
      index = this.getActiveItemIndex();
      if (index < this.items.length - 1) {
        return this.activateItemAtIndex(index + 1);
      } else {
        return this.activateItemAtIndex(0);
      }
    };

    Pane.prototype.activatePreviousItem = function() {
      var index;
      index = this.getActiveItemIndex();
      if (index > 0) {
        return this.activateItemAtIndex(index - 1);
      } else {
        return this.activateItemAtIndex(this.items.length - 1);
      }
    };

    Pane.prototype.activateLastItem = function() {
      return this.activateItemAtIndex(this.items.length - 1);
    };

    Pane.prototype.moveItemRight = function() {
      var index, rightItemIndex;
      index = this.getActiveItemIndex();
      rightItemIndex = index + 1;
      if (!(rightItemIndex > this.items.length - 1)) {
        return this.moveItem(this.getActiveItem(), rightItemIndex);
      }
    };

    Pane.prototype.moveItemLeft = function() {
      var index, leftItemIndex;
      index = this.getActiveItemIndex();
      leftItemIndex = index - 1;
      if (!(leftItemIndex < 0)) {
        return this.moveItem(this.getActiveItem(), leftItemIndex);
      }
    };

    Pane.prototype.getActiveItemIndex = function() {
      return this.items.indexOf(this.activeItem);
    };

    Pane.prototype.activateItemAtIndex = function(index) {
      var item;
      item = this.itemAtIndex(index) || this.getActiveItem();
      return this.setActiveItem(item);
    };

    Pane.prototype.activateItem = function(item, options) {
      var index;
      if (options == null) {
        options = {};
      }
      if (item != null) {
        if (this.getPendingItem() === this.activeItem) {
          index = this.getActiveItemIndex();
        } else {
          index = this.getActiveItemIndex() + 1;
        }
        this.addItem(item, extend({}, options, {
          index: index
        }));
        return this.setActiveItem(item);
      }
    };

    Pane.prototype.addItem = function(item, options) {
      var index, itemSubscriptions, lastPendingItem, moved, pending, ref2, ref3, ref4, ref5, replacingPendingItem;
      if (options == null) {
        options = {};
      }
      if (typeof options === "number") {
        Grim.deprecate("Pane::addItem(item, " + options + ") is deprecated in favor of Pane::addItem(item, {index: " + options + "})");
        options = {
          index: options
        };
      }
      index = (ref2 = options.index) != null ? ref2 : this.getActiveItemIndex() + 1;
      moved = (ref3 = options.moved) != null ? ref3 : false;
      pending = (ref4 = options.pending) != null ? ref4 : false;
      if (!((item != null) && typeof item === 'object')) {
        throw new Error("Pane items must be objects. Attempted to add item " + item + ".");
      }
      if (typeof item.isDestroyed === "function" ? item.isDestroyed() : void 0) {
        throw new Error("Adding a pane item with URI '" + (typeof item.getURI === "function" ? item.getURI() : void 0) + "' that has already been destroyed");
      }
      if (indexOf.call(this.items, item) >= 0) {
        return;
      }
      if (typeof item.onDidDestroy === 'function') {
        itemSubscriptions = new CompositeDisposable;
        itemSubscriptions.add(item.onDidDestroy((function(_this) {
          return function() {
            return _this.removeItem(item, false);
          };
        })(this)));
        if (typeof item.onDidTerminatePendingState === "function") {
          itemSubscriptions.add(item.onDidTerminatePendingState((function(_this) {
            return function() {
              if (_this.getPendingItem() === item) {
                return _this.clearPendingItem();
              }
            };
          })(this)));
        }
        this.subscriptionsPerItem.set(item, itemSubscriptions);
      }
      this.items.splice(index, 0, item);
      lastPendingItem = this.getPendingItem();
      replacingPendingItem = (lastPendingItem != null) && !moved;
      if (replacingPendingItem) {
        this.pendingItem = null;
      }
      if (pending) {
        this.setPendingItem(item);
      }
      this.emitter.emit('did-add-item', {
        item: item,
        index: index,
        moved: moved
      });
      if (!moved) {
        if ((ref5 = this.container) != null) {
          ref5.didAddPaneItem(item, this, index);
        }
      }
      if (replacingPendingItem) {
        this.destroyItem(lastPendingItem);
      }
      if (this.getActiveItem() == null) {
        this.setActiveItem(item);
      }
      return item;
    };

    Pane.prototype.setPendingItem = function(item) {
      var mostRecentPendingItem;
      if (this.pendingItem !== item) {
        mostRecentPendingItem = this.pendingItem;
        this.pendingItem = item;
        if (mostRecentPendingItem != null) {
          return this.emitter.emit('item-did-terminate-pending-state', mostRecentPendingItem);
        }
      }
    };

    Pane.prototype.getPendingItem = function() {
      return this.pendingItem || null;
    };

    Pane.prototype.clearPendingItem = function() {
      return this.setPendingItem(null);
    };

    Pane.prototype.onItemDidTerminatePendingState = function(callback) {
      return this.emitter.on('item-did-terminate-pending-state', callback);
    };

    Pane.prototype.addItems = function(items, index) {
      var i, item, j, len;
      if (index == null) {
        index = this.getActiveItemIndex() + 1;
      }
      items = items.filter((function(_this) {
        return function(item) {
          return !(indexOf.call(_this.items, item) >= 0);
        };
      })(this));
      for (i = j = 0, len = items.length; j < len; i = ++j) {
        item = items[i];
        this.addItem(item, {
          index: index + i
        });
      }
      return items;
    };

    Pane.prototype.removeItem = function(item, moved) {
      var index, ref2;
      index = this.items.indexOf(item);
      if (index === -1) {
        return;
      }
      if (this.getPendingItem() === item) {
        this.pendingItem = null;
      }
      this.removeItemFromStack(item);
      this.emitter.emit('will-remove-item', {
        item: item,
        index: index,
        destroyed: !moved,
        moved: moved
      });
      this.unsubscribeFromItem(item);
      if (item === this.activeItem) {
        if (this.items.length === 1) {
          this.setActiveItem(void 0);
        } else if (index === 0) {
          this.activateNextItem();
        } else {
          this.activatePreviousItem();
        }
      }
      this.items.splice(index, 1);
      this.emitter.emit('did-remove-item', {
        item: item,
        index: index,
        destroyed: !moved,
        moved: moved
      });
      if (!moved) {
        if ((ref2 = this.container) != null) {
          ref2.didDestroyPaneItem({
            item: item,
            index: index,
            pane: this
          });
        }
      }
      if (this.items.length === 0 && this.config.get('core.destroyEmptyPanes')) {
        return this.destroy();
      }
    };

    Pane.prototype.removeItemFromStack = function(item) {
      var index;
      index = this.itemStack.indexOf(item);
      if (index !== -1) {
        return this.itemStack.splice(index, 1);
      }
    };

    Pane.prototype.moveItem = function(item, newIndex) {
      var oldIndex;
      oldIndex = this.items.indexOf(item);
      this.items.splice(oldIndex, 1);
      this.items.splice(newIndex, 0, item);
      return this.emitter.emit('did-move-item', {
        item: item,
        oldIndex: oldIndex,
        newIndex: newIndex
      });
    };

    Pane.prototype.moveItemToPane = function(item, pane, index) {
      this.removeItem(item, true);
      return pane.addItem(item, {
        index: index,
        moved: true
      });
    };

    Pane.prototype.destroyActiveItem = function() {
      this.destroyItem(this.activeItem);
      return false;
    };

    Pane.prototype.destroyItem = function(item, force) {
      var index, ref2, ref3;
      index = this.items.indexOf(item);
      if (index !== -1) {
        if (!force && ((ref2 = this.getContainer()) != null ? ref2.getLocation() : void 0) !== 'center' && (typeof item.isPermanentDockItem === "function" ? item.isPermanentDockItem() : void 0)) {
          return false;
        }
        this.emitter.emit('will-destroy-item', {
          item: item,
          index: index
        });
        if ((ref3 = this.container) != null) {
          ref3.willDestroyPaneItem({
            item: item,
            index: index,
            pane: this
          });
        }
        if (force || !(item != null ? typeof item.shouldPromptToSave === "function" ? item.shouldPromptToSave() : void 0 : void 0)) {
          this.removeItem(item, false);
          return typeof item.destroy === "function" ? item.destroy() : void 0;
        } else {
          return this.promptToSaveItem(item).then((function(_this) {
            return function(result) {
              if (result) {
                _this.removeItem(item, false);
                if (typeof item.destroy === "function") {
                  item.destroy();
                }
              }
              return result;
            };
          })(this));
        }
      }
    };

    Pane.prototype.destroyItems = function() {
      return Promise.all(this.getItems().map(this.destroyItem.bind(this)));
    };

    Pane.prototype.destroyInactiveItems = function() {
      return Promise.all(this.getItems().filter((function(_this) {
        return function(item) {
          return item !== _this.activeItem;
        };
      })(this)).map(this.destroyItem.bind(this)));
    };

    Pane.prototype.promptToSaveItem = function(item, options) {
      var ref2, saveDialog, saveError, uri;
      if (options == null) {
        options = {};
      }
      if (!(typeof item.shouldPromptToSave === "function" ? item.shouldPromptToSave(options) : void 0)) {
        return Promise.resolve(true);
      }
      if (typeof item.getURI === 'function') {
        uri = item.getURI();
      } else if (typeof item.getUri === 'function') {
        uri = item.getUri();
      } else {
        return Promise.resolve(true);
      }
      saveDialog = (function(_this) {
        return function(saveButtonText, saveFn, message) {
          var chosen;
          chosen = _this.applicationDelegate.confirm({
            message: message,
            detailedMessage: "Your changes will be lost if you close this item without saving.",
            buttons: [saveButtonText, "Cancel", "Don't Save"]
          });
          switch (chosen) {
            case 0:
              return new Promise(function(resolve) {
                return saveFn(item, function(error) {
                  if (error instanceof SaveCancelledError) {
                    return resolve(false);
                  } else {
                    return saveError(error).then(resolve);
                  }
                });
              });
            case 1:
              return Promise.resolve(false);
            case 2:
              return Promise.resolve(true);
          }
        };
      })(this);
      saveError = (function(_this) {
        return function(error) {
          var ref2;
          if (error) {
            return saveDialog("Save as", _this.saveItemAs, "'" + ((ref2 = typeof item.getTitle === "function" ? item.getTitle() : void 0) != null ? ref2 : uri) + "' could not be saved.\nError: " + (_this.getMessageForErrorCode(error.code)));
          } else {
            return Promise.resolve(true);
          }
        };
      })(this);
      return saveDialog("Save", this.saveItem, "'" + ((ref2 = typeof item.getTitle === "function" ? item.getTitle() : void 0) != null ? ref2 : uri) + "' has changes, do you want to save them?");
    };

    Pane.prototype.saveActiveItem = function(nextAction) {
      return this.saveItem(this.getActiveItem(), nextAction);
    };

    Pane.prototype.saveActiveItemAs = function(nextAction) {
      return this.saveItemAs(this.getActiveItem(), nextAction);
    };

    Pane.prototype.saveItem = function(item, nextAction) {
      var itemURI;
      if (typeof (item != null ? item.getURI : void 0) === 'function') {
        itemURI = item.getURI();
      } else if (typeof (item != null ? item.getUri : void 0) === 'function') {
        itemURI = item.getUri();
      }
      if (itemURI != null) {
        if (item.save != null) {
          return promisify(function() {
            return item.save();
          }).then(function() {
            return typeof nextAction === "function" ? nextAction() : void 0;
          })["catch"]((function(_this) {
            return function(error) {
              if (nextAction) {
                return nextAction(error);
              } else {
                return _this.handleSaveError(error, item);
              }
            };
          })(this));
        } else {
          return typeof nextAction === "function" ? nextAction() : void 0;
        }
      } else {
        return this.saveItemAs(item, nextAction);
      }
    };

    Pane.prototype.saveItemAs = function(item, nextAction) {
      var newItemPath, ref2, saveOptions;
      if ((item != null ? item.saveAs : void 0) == null) {
        return;
      }
      saveOptions = (ref2 = typeof item.getSaveDialogOptions === "function" ? item.getSaveDialogOptions() : void 0) != null ? ref2 : {};
      if (saveOptions.defaultPath == null) {
        saveOptions.defaultPath = item.getPath();
      }
      newItemPath = this.applicationDelegate.showSaveDialog(saveOptions);
      if (newItemPath) {
        return promisify(function() {
          return item.saveAs(newItemPath);
        }).then(function() {
          return typeof nextAction === "function" ? nextAction() : void 0;
        })["catch"]((function(_this) {
          return function(error) {
            if (nextAction != null) {
              return nextAction(error);
            } else {
              return _this.handleSaveError(error, item);
            }
          };
        })(this));
      } else if (nextAction != null) {
        return nextAction(new SaveCancelledError('Save Cancelled'));
      }
    };

    Pane.prototype.saveItems = function() {
      var item, j, len, ref2;
      ref2 = this.getItems();
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        if (typeof item.isModified === "function" ? item.isModified() : void 0) {
          this.saveItem(item);
        }
      }
    };

    Pane.prototype.itemForURI = function(uri) {
      return find(this.items, function(item) {
        var itemUri;
        if (typeof item.getURI === 'function') {
          itemUri = item.getURI();
        } else if (typeof item.getUri === 'function') {
          itemUri = item.getUri();
        }
        return itemUri === uri;
      });
    };

    Pane.prototype.activateItemForURI = function(uri) {
      var item;
      if (item = this.itemForURI(uri)) {
        this.activateItem(item);
        return true;
      } else {
        return false;
      }
    };

    Pane.prototype.copyActiveItem = function() {
      var ref2;
      return (ref2 = this.activeItem) != null ? typeof ref2.copy === "function" ? ref2.copy() : void 0 : void 0;
    };


    /*
    Section: Lifecycle
     */

    Pane.prototype.isActive = function() {
      var ref2;
      return ((ref2 = this.container) != null ? ref2.getActivePane() : void 0) === this;
    };

    Pane.prototype.activate = function() {
      var ref2;
      if (this.isDestroyed()) {
        throw new Error("Pane has been destroyed");
      }
      if ((ref2 = this.container) != null) {
        ref2.didActivatePane(this);
      }
      return this.emitter.emit('did-activate');
    };

    Pane.prototype.destroy = function() {
      var item, j, len, ref2, ref3, ref4, ref5;
      if (((ref2 = this.container) != null ? ref2.isAlive() : void 0) && this.container.getPanes().length === 1) {
        return this.destroyItems();
      } else {
        this.emitter.emit('will-destroy');
        this.alive = false;
        if ((ref3 = this.container) != null) {
          ref3.willDestroyPane({
            pane: this
          });
        }
        if (this.isActive()) {
          this.container.activateNextPane();
        }
        this.emitter.emit('did-destroy');
        this.emitter.dispose();
        ref4 = this.items.slice();
        for (j = 0, len = ref4.length; j < len; j++) {
          item = ref4[j];
          if (typeof item.destroy === "function") {
            item.destroy();
          }
        }
        return (ref5 = this.container) != null ? ref5.didDestroyPane({
          pane: this
        }) : void 0;
      }
    };

    Pane.prototype.isAlive = function() {
      return this.alive;
    };

    Pane.prototype.isDestroyed = function() {
      return !this.isAlive();
    };


    /*
    Section: Splitting
     */

    Pane.prototype.splitLeft = function(params) {
      return this.split('horizontal', 'before', params);
    };

    Pane.prototype.splitRight = function(params) {
      return this.split('horizontal', 'after', params);
    };

    Pane.prototype.splitUp = function(params) {
      return this.split('vertical', 'before', params);
    };

    Pane.prototype.splitDown = function(params) {
      return this.split('vertical', 'after', params);
    };

    Pane.prototype.split = function(orientation, side, params) {
      var newPane;
      if (params != null ? params.copyActiveItem : void 0) {
        if (params.items == null) {
          params.items = [];
        }
        params.items.push(this.copyActiveItem());
      }
      if (this.parent.orientation !== orientation) {
        this.parent.replaceChild(this, new PaneAxis({
          container: this.container,
          orientation: orientation,
          children: [this],
          flexScale: this.flexScale
        }, this.viewRegistry));
        this.setFlexScale(1);
      }
      newPane = new Pane(extend({
        applicationDelegate: this.applicationDelegate,
        notificationManager: this.notificationManager,
        deserializerManager: this.deserializerManager,
        config: this.config,
        viewRegistry: this.viewRegistry
      }, params));
      switch (side) {
        case 'before':
          this.parent.insertChildBefore(this, newPane);
          break;
        case 'after':
          this.parent.insertChildAfter(this, newPane);
      }
      if (params != null ? params.moveActiveItem : void 0) {
        this.moveItemToPane(this.activeItem, newPane);
      }
      newPane.activate();
      return newPane;
    };

    Pane.prototype.findLeftmostSibling = function() {
      var leftmostSibling;
      if (this.parent.orientation === 'horizontal') {
        leftmostSibling = this.parent.children[0];
        if (leftmostSibling instanceof PaneAxis) {
          return this;
        } else {
          return leftmostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findRightmostSibling = function() {
      var rightmostSibling;
      if (this.parent.orientation === 'horizontal') {
        rightmostSibling = last(this.parent.children);
        if (rightmostSibling instanceof PaneAxis) {
          return this;
        } else {
          return rightmostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findOrCreateRightmostSibling = function() {
      var rightmostSibling;
      rightmostSibling = this.findRightmostSibling();
      if (rightmostSibling === this) {
        return this.splitRight();
      } else {
        return rightmostSibling;
      }
    };

    Pane.prototype.findTopmostSibling = function() {
      var topmostSibling;
      if (this.parent.orientation === 'vertical') {
        topmostSibling = this.parent.children[0];
        if (topmostSibling instanceof PaneAxis) {
          return this;
        } else {
          return topmostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findBottommostSibling = function() {
      var bottommostSibling;
      if (this.parent.orientation === 'vertical') {
        bottommostSibling = last(this.parent.children);
        if (bottommostSibling instanceof PaneAxis) {
          return this;
        } else {
          return bottommostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findOrCreateBottommostSibling = function() {
      var bottommostSibling;
      bottommostSibling = this.findBottommostSibling();
      if (bottommostSibling === this) {
        return this.splitDown();
      } else {
        return bottommostSibling;
      }
    };

    Pane.prototype.close = function() {
      return Promise.all(this.getItems().map(this.promptToSaveItem.bind(this))).then((function(_this) {
        return function(results) {
          if (!results.includes(false)) {
            return _this.destroy();
          }
        };
      })(this));
    };

    Pane.prototype.handleSaveError = function(error, item) {
      var addWarningWithPath, customMessage, errorMatch, fileName, itemPath, ref2, ref3, ref4;
      itemPath = (ref2 = error.path) != null ? ref2 : item != null ? typeof item.getPath === "function" ? item.getPath() : void 0 : void 0;
      addWarningWithPath = (function(_this) {
        return function(message, options) {
          if (itemPath) {
            message = message + " '" + itemPath + "'";
          }
          return _this.notificationManager.addWarning(message, options);
        };
      })(this);
      customMessage = this.getMessageForErrorCode(error.code);
      if (customMessage != null) {
        return addWarningWithPath("Unable to save file: " + customMessage);
      } else if (error.code === 'EISDIR' || ((ref3 = error.message) != null ? typeof ref3.endsWith === "function" ? ref3.endsWith('is a directory') : void 0 : void 0)) {
        return this.notificationManager.addWarning("Unable to save file: " + error.message);
      } else if ((ref4 = error.code) === 'EPERM' || ref4 === 'EBUSY' || ref4 === 'UNKNOWN' || ref4 === 'EEXIST' || ref4 === 'ELOOP' || ref4 === 'EAGAIN') {
        return addWarningWithPath('Unable to save file', {
          detail: error.message
        });
      } else if (errorMatch = /ENOTDIR, not a directory '([^']+)'/.exec(error.message)) {
        fileName = errorMatch[1];
        return this.notificationManager.addWarning("Unable to save file: A directory in the path '" + fileName + "' could not be written to");
      } else {
        throw error;
      }
    };

    Pane.prototype.getMessageForErrorCode = function(errorCode) {
      switch (errorCode) {
        case 'EACCES':
          return 'Permission denied';
        case 'ECONNRESET':
          return 'Connection reset';
        case 'EINTR':
          return 'Interrupted system call';
        case 'EIO':
          return 'I/O error writing file';
        case 'ENOSPC':
          return 'No space left on device';
        case 'ENOTSUP':
          return 'Operation not supported on socket';
        case 'ENXIO':
          return 'No such device or address';
        case 'EROFS':
          return 'Read-only file system';
        case 'ESPIPE':
          return 'Invalid seek';
        case 'ETIMEDOUT':
          return 'Connection timed out';
      }
    };

    return Pane;

  })();

  promisify = function(callback) {
    var error;
    try {
      return Promise.resolve(callback());
    } catch (error1) {
      error = error1;
      return Promise.reject(error);
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3BhbmUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxrS0FBQTtJQUFBOzs7OztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxNQUFnQyxPQUFBLENBQVEsaUJBQVIsQ0FBaEMsRUFBQyxlQUFELEVBQU8scUJBQVAsRUFBZ0IsbUJBQWhCLEVBQXdCOztFQUN4QixPQUFpQyxPQUFBLENBQVEsV0FBUixDQUFqQyxFQUFDLDhDQUFELEVBQXNCOztFQUN0QixRQUFBLEdBQVcsT0FBQSxDQUFRLGFBQVI7O0VBQ1gsVUFBQSxHQUFhLE9BQUEsQ0FBUSxlQUFSOztFQUNiLFdBQUEsR0FBYyxPQUFBLENBQVEsZ0JBQVI7O0VBRWQsY0FBQSxHQUFpQjs7RUFFWDs7O0lBQ1MsNEJBQUE7TUFBRyxxREFBQSxTQUFBO0lBQUg7Ozs7S0FEa0I7O0VBWWpDLE1BQU0sQ0FBQyxPQUFQLEdBQ007bUJBQ0osT0FBQSxHQUFTLFNBQUE7YUFBRyxPQUFBLEdBQVEsSUFBQyxDQUFBO0lBQVo7O0lBRVQsSUFBQyxDQUFBLFdBQUQsR0FBYyxTQUFDLEtBQUQsRUFBUSxHQUFSO0FBQ1osVUFBQTtNQURxQixtQ0FBZSwrQ0FBcUIscUJBQVEsbUNBQWU7TUFDL0UsbUJBQUQsRUFBUSx1Q0FBUixFQUF5QixtQ0FBekIsRUFBd0M7O1FBQ3hDLGdCQUFpQjs7TUFDakIsS0FBQSxHQUFRLEtBQUssQ0FBQyxHQUFOLENBQVUsU0FBQyxTQUFEO2VBQWUsYUFBYSxDQUFDLFdBQWQsQ0FBMEIsU0FBMUI7TUFBZixDQUFWO01BQ1IsS0FBSyxDQUFDLFVBQU4sR0FBbUIsS0FBTSxDQUFBLGVBQUE7TUFDekIsS0FBSyxDQUFDLEtBQU4sR0FBYyxPQUFBLENBQVEsS0FBUjtNQUNkLElBQUcscUJBQUg7O1VBQ0UsS0FBSyxDQUFDLGFBQWMsSUFB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QjtBQU50QixhQU9PLE9BUFA7aUJBT29CO0FBUHBCLGFBUU8sT0FSUDtpQkFRb0I7QUFScEIsYUFTTyxRQVRQO2lCQVNxQjtBQVRyQixhQVVPLFdBVlA7aUJBVXdCO0FBVnhCO0lBRHNCOzs7Ozs7RUFhMUIsU0FBQSxHQUFZLFNBQUMsUUFBRDtBQUNWLFFBQUE7QUFBQTthQUNFLE9BQU8sQ0FBQyxPQUFSLENBQWdCLFFBQUEsQ0FBQSxDQUFoQixFQURGO0tBQUEsY0FBQTtNQUVNO2FBQ0osT0FBTyxDQUFDLE1BQVIsQ0FBZSxLQUFmLEVBSEY7O0VBRFU7QUEzOUJaIiwic291cmNlc0NvbnRlbnQiOlsiR3JpbSA9IHJlcXVpcmUgJ2dyaW0nXG57ZmluZCwgY29tcGFjdCwgZXh0ZW5kLCBsYXN0fSA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbntDb21wb3NpdGVEaXNwb3NhYmxlLCBFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcblBhbmVBeGlzID0gcmVxdWlyZSAnLi9wYW5lLWF4aXMnXG5UZXh0RWRpdG9yID0gcmVxdWlyZSAnLi90ZXh0LWVkaXRvcidcblBhbmVFbGVtZW50ID0gcmVxdWlyZSAnLi9wYW5lLWVsZW1lbnQnXG5cbm5leHRJbnN0YW5jZUlkID0gMVxuXG5jbGFzcyBTYXZlQ2FuY2VsbGVkRXJyb3IgZXh0ZW5kcyBFcnJvclxuICBjb25zdHJ1Y3RvcjogLT4gc3VwZXJcblxuIyBFeHRlbmRlZDogQSBjb250YWluZXIgZm9yIHByZXNlbnRpbmcgY29udGVudCBpbiB0aGUgY2VudGVyIG9mIHRoZSB3b3Jrc3BhY2UuXG4jIFBhbmVzIGNhbiBjb250YWluIG11bHRpcGxlIGl0ZW1zLCBvbmUgb2Ygd2hpY2ggaXMgKmFjdGl2ZSogYXQgYSBnaXZlbiB0aW1lLlxuIyBUaGUgdmlldyBjb3JyZXNwb25kaW5nIHRvIHRoZSBhY3RpdmUgaXRlbSBpcyBkaXNwbGF5ZWQgaW4gdGhlIGludGVyZmFjZS4gSW5cbiMgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiwgdGFicyBhcmUgYWxzbyBkaXNwbGF5ZWQgZm9yIGVhY2ggaXRlbS5cbiNcbiMgRWFjaCBwYW5lIG1heSBhbHNvIGNvbnRhaW4gb25lICpwZW5kaW5nKiBpdGVtLiBXaGVuIGEgcGVuZGluZyBpdGVtIGlzIGFkZGVkXG4jIHRvIGEgcGFuZSwgaXQgd2lsbCByZXBsYWNlIHRoZSBjdXJyZW50bHkgcGVuZGluZyBpdGVtLCBpZiBhbnksIGluc3RlYWQgb2ZcbiMgc2ltcGx5IGJlaW5nIGFkZGVkLiBJbiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uLCB0aGUgdGV4dCBpbiB0aGUgdGFiIGZvclxuIyBwZW5kaW5nIGl0ZW1zIGlzIHNob3duIGluIGl0YWxpY3MuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBQYW5lXG4gIGluc3BlY3Q6IC0+IFwiUGFuZSAje0BpZH1cIlxuXG4gIEBkZXNlcmlhbGl6ZTogKHN0YXRlLCB7ZGVzZXJpYWxpemVycywgYXBwbGljYXRpb25EZWxlZ2F0ZSwgY29uZmlnLCBub3RpZmljYXRpb25zLCB2aWV3c30pIC0+XG4gICAge2l0ZW1zLCBhY3RpdmVJdGVtSW5kZXgsIGFjdGl2ZUl0ZW1VUkksIGFjdGl2ZUl0ZW1Vcml9ID0gc3RhdGVcbiAgICBhY3RpdmVJdGVtVVJJID89IGFjdGl2ZUl0ZW1VcmlcbiAgICBpdGVtcyA9IGl0ZW1zLm1hcCAoaXRlbVN0YXRlKSAtPiBkZXNlcmlhbGl6ZXJzLmRlc2VyaWFsaXplKGl0ZW1TdGF0ZSlcbiAgICBzdGF0ZS5hY3RpdmVJdGVtID0gaXRlbXNbYWN0aXZlSXRlbUluZGV4XVxuICAgIHN0YXRlLml0ZW1zID0gY29tcGFjdChpdGVtcylcbiAgICBpZiBhY3RpdmVJdGVtVVJJP1xuICAgICAgc3RhdGUuYWN0aXZlSXRlbSA/PSBmaW5kIHN0YXRlLml0ZW1zLCAoaXRlbSkgLT5cbiAgICAgICAgaWYgdHlwZW9mIGl0ZW0uZ2V0VVJJIGlzICdmdW5jdGlvbidcbiAgICAgICAgICBpdGVtVVJJID0gaXRlbS5nZXRVUkkoKVxuICAgICAgICBpdGVtVVJJIGlzIGFjdGl2ZUl0ZW1VUklcbiAgICBuZXcgUGFuZShleHRlbmQoc3RhdGUsIHtcbiAgICAgIGRlc2VyaWFsaXplck1hbmFnZXI6IGRlc2VyaWFsaXplcnMsXG4gICAgICBub3RpZmljYXRpb25NYW5hZ2VyOiBub3RpZmljYXRpb25zLFxuICAgICAgdmlld1JlZ2lzdHJ5OiB2aWV3cyxcbiAgICAgIGNvbmZpZywgYXBwbGljYXRpb25EZWxlZ2F0ZVxuICAgIH0pKVxuXG4gIGNvbnN0cnVjdG9yOiAocGFyYW1zKSAtPlxuICAgIHtcbiAgICAgIEBpZCwgQGFjdGl2ZUl0ZW0sIEBmb2N1c2VkLCBAYXBwbGljYXRpb25EZWxlZ2F0ZSwgQG5vdGlmaWNhdGlvbk1hbmFnZXIsIEBjb25maWcsXG4gICAgICBAZGVzZXJpYWxpemVyTWFuYWdlciwgQHZpZXdSZWdpc3RyeVxuICAgIH0gPSBwYXJhbXNcblxuICAgIGlmIEBpZD9cbiAgICAgIG5leHRJbnN0YW5jZUlkID0gTWF0aC5tYXgobmV4dEluc3RhbmNlSWQsIEBpZCArIDEpXG4gICAgZWxzZVxuICAgICAgQGlkID0gbmV4dEluc3RhbmNlSWQrK1xuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAYWxpdmUgPSB0cnVlXG4gICAgQHN1YnNjcmlwdGlvbnNQZXJJdGVtID0gbmV3IFdlYWtNYXBcbiAgICBAaXRlbXMgPSBbXVxuICAgIEBpdGVtU3RhY2sgPSBbXVxuICAgIEBjb250YWluZXIgPSBudWxsXG4gICAgQGFjdGl2ZUl0ZW0gPz0gdW5kZWZpbmVkXG4gICAgQGZvY3VzZWQgPz0gZmFsc2VcblxuICAgIEBhZGRJdGVtcyhjb21wYWN0KHBhcmFtcz8uaXRlbXMgPyBbXSkpXG4gICAgQHNldEFjdGl2ZUl0ZW0oQGl0ZW1zWzBdKSB1bmxlc3MgQGdldEFjdGl2ZUl0ZW0oKT9cbiAgICBAYWRkSXRlbXNUb1N0YWNrKHBhcmFtcz8uaXRlbVN0YWNrSW5kaWNlcyA/IFtdKVxuICAgIEBzZXRGbGV4U2NhbGUocGFyYW1zPy5mbGV4U2NhbGUgPyAxKVxuXG4gIGdldEVsZW1lbnQ6IC0+XG4gICAgQGVsZW1lbnQgPz0gbmV3IFBhbmVFbGVtZW50KCkuaW5pdGlhbGl6ZSh0aGlzLCB7dmlld3M6IEB2aWV3UmVnaXN0cnksIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSlcblxuICBzZXJpYWxpemU6IC0+XG4gICAgaXRlbXNUb0JlU2VyaWFsaXplZCA9IGNvbXBhY3QoQGl0ZW1zLm1hcCgoaXRlbSkgLT4gaXRlbSBpZiB0eXBlb2YgaXRlbS5zZXJpYWxpemUgaXMgJ2Z1bmN0aW9uJykpXG4gICAgaXRlbVN0YWNrSW5kaWNlcyA9IChpdGVtc1RvQmVTZXJpYWxpemVkLmluZGV4T2YoaXRlbSkgZm9yIGl0ZW0gaW4gQGl0ZW1TdGFjayB3aGVuIHR5cGVvZiBpdGVtLnNlcmlhbGl6ZSBpcyAnZnVuY3Rpb24nKVxuICAgIGFjdGl2ZUl0ZW1JbmRleCA9IGl0ZW1zVG9CZVNlcmlhbGl6ZWQuaW5kZXhPZihAYWN0aXZlSXRlbSlcblxuICAgIHtcbiAgICAgIGRlc2VyaWFsaXplcjogJ1BhbmUnLFxuICAgICAgaWQ6IEBpZCxcbiAgICAgIGl0ZW1zOiBpdGVtc1RvQmVTZXJpYWxpemVkLm1hcCgoaXRlbSkgLT4gaXRlbS5zZXJpYWxpemUoKSlcbiAgICAgIGl0ZW1TdGFja0luZGljZXM6IGl0ZW1TdGFja0luZGljZXNcbiAgICAgIGFjdGl2ZUl0ZW1JbmRleDogYWN0aXZlSXRlbUluZGV4XG4gICAgICBmb2N1c2VkOiBAZm9jdXNlZFxuICAgICAgZmxleFNjYWxlOiBAZmxleFNjYWxlXG4gICAgfVxuXG4gIGdldFBhcmVudDogLT4gQHBhcmVudFxuXG4gIHNldFBhcmVudDogKEBwYXJlbnQpIC0+IEBwYXJlbnRcblxuICBnZXRDb250YWluZXI6IC0+IEBjb250YWluZXJcblxuICBzZXRDb250YWluZXI6IChjb250YWluZXIpIC0+XG4gICAgaWYgY29udGFpbmVyIGFuZCBjb250YWluZXIgaXNudCBAY29udGFpbmVyXG4gICAgICBAY29udGFpbmVyID0gY29udGFpbmVyXG4gICAgICBjb250YWluZXIuZGlkQWRkUGFuZSh7cGFuZTogdGhpc30pXG5cbiAgIyBQcml2YXRlOiBEZXRlcm1pbmUgd2hldGhlciB0aGUgZ2l2ZW4gaXRlbSBpcyBhbGxvd2VkIHRvIGV4aXN0IGluIHRoaXMgcGFuZS5cbiAgI1xuICAjICogYGl0ZW1gIHRoZSBJdGVtXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0l0ZW1BbGxvd2VkOiAoaXRlbSkgLT5cbiAgICBpZiAodHlwZW9mIGl0ZW0uZ2V0QWxsb3dlZExvY2F0aW9ucyBpc250ICdmdW5jdGlvbicpXG4gICAgICB0cnVlXG4gICAgZWxzZVxuICAgICAgaXRlbS5nZXRBbGxvd2VkTG9jYXRpb25zKCkuaW5jbHVkZXMoQGdldENvbnRhaW5lcigpLmdldExvY2F0aW9uKCkpXG5cbiAgc2V0RmxleFNjYWxlOiAoQGZsZXhTY2FsZSkgLT5cbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLWZsZXgtc2NhbGUnLCBAZmxleFNjYWxlXG4gICAgQGZsZXhTY2FsZVxuXG4gIGdldEZsZXhTY2FsZTogLT4gQGZsZXhTY2FsZVxuXG4gIGluY3JlYXNlU2l6ZTogLT4gQHNldEZsZXhTY2FsZShAZ2V0RmxleFNjYWxlKCkgKiAxLjEpXG5cbiAgZGVjcmVhc2VTaXplOiAtPiBAc2V0RmxleFNjYWxlKEBnZXRGbGV4U2NhbGUoKSAvIDEuMSlcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlIHBhbmUgcmVzaXplc1xuICAjXG4gICMgVGhlIGNhbGxiYWNrIHdpbGwgYmUgaW52b2tlZCB3aGVuIHBhbmUncyBmbGV4U2NhbGUgcHJvcGVydHkgY2hhbmdlcy5cbiAgIyBVc2Ugezo6Z2V0RmxleFNjYWxlfSB0byBnZXQgdGhlIGN1cnJlbnQgdmFsdWUuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgcGFuZSBpcyByZXNpemVkXG4gICMgICAqIGBmbGV4U2NhbGVgIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgcGFuZXMgYGZsZXgtZ3Jvd2A7IGFiaWxpdHkgZm9yIGFcbiAgIyAgICAgZmxleCBpdGVtIHRvIGdyb3cgaWYgbmVjZXNzYXJ5LlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCAnLmRpc3Bvc2UoKScgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VGbGV4U2NhbGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1mbGV4LXNjYWxlJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgezo6Z2V0RmxleFNjYWxlfS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgICB0aGUgezo6Z2V0RmxleFNjYWxlfSBwcm9wZXJ0eS5cbiAgIyAgICogYGZsZXhTY2FsZWAge051bWJlcn0gcmVwcmVzZW50aW5nIHRoZSBwYW5lcyBgZmxleC1ncm93YDsgYWJpbGl0eSBmb3IgYVxuICAjICAgICBmbGV4IGl0ZW0gdG8gZ3JvdyBpZiBuZWNlc3NhcnkuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlRmxleFNjYWxlOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soQGZsZXhTY2FsZSlcbiAgICBAb25EaWRDaGFuZ2VGbGV4U2NhbGUoY2FsbGJhY2spXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgcGFuZSBpcyBhY3RpdmF0ZWQuXG4gICNcbiAgIyBUaGUgZ2l2ZW4gY2FsbGJhY2sgd2lsbCBiZSBpbnZva2VkIHdoZW5ldmVyIHs6OmFjdGl2YXRlfSBpcyBjYWxsZWQgb24gdGhlXG4gICMgcGFuZSwgZXZlbiBpZiBpdCBpcyBhbHJlYWR5IGFjdGl2ZSBhdCB0aGUgdGltZS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBwYW5lIGlzIGFjdGl2YXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWN0aXZhdGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFjdGl2YXRlJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayBiZWZvcmUgdGhlIHBhbmUgaXMgZGVzdHJveWVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgcGFuZSBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbldpbGxEZXN0cm95OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ3dpbGwtZGVzdHJveScsIGNhbGxiYWNrXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgcGFuZSBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgcGFuZSBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERlc3Ryb3k6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWRlc3Ryb3knLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlIHZhbHVlIG9mIHRoZSB7Ojppc0FjdGl2ZX1cbiAgIyBwcm9wZXJ0eSBjaGFuZ2VzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIHZhbHVlIG9mIHRoZSB7Ojppc0FjdGl2ZX1cbiAgIyAgIHByb3BlcnR5IGNoYW5nZXMuXG4gICMgICAqIGBhY3RpdmVgIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIHBhbmUgaXMgYWN0aXZlLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VBY3RpdmU6IChjYWxsYmFjaykgLT5cbiAgICBAY29udGFpbmVyLm9uRGlkQ2hhbmdlQWN0aXZlUGFuZSAoYWN0aXZlUGFuZSkgPT5cbiAgICAgIGNhbGxiYWNrKHRoaXMgaXMgYWN0aXZlUGFuZSlcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mIHRoZVxuICAjIHs6OmlzQWN0aXZlfSBwcm9wZXJ0eS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgICB0aGUgezo6aXNBY3RpdmV9IHByb3BlcnR5LlxuICAjICAgKiBgYWN0aXZlYCB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBwYW5lIGlzIGFjdGl2ZS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVBY3RpdmU6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayhAaXNBY3RpdmUoKSlcbiAgICBAb25EaWRDaGFuZ2VBY3RpdmUoY2FsbGJhY2spXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhbiBpdGVtIGlzIGFkZGVkIHRvIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiBpdGVtcyBhcmUgYWRkZWQuXG4gICMgICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAgICogYGl0ZW1gIFRoZSBhZGRlZCBwYW5lIGl0ZW0uXG4gICMgICAgICogYGluZGV4YCB7TnVtYmVyfSBpbmRpY2F0aW5nIHdoZXJlIHRoZSBpdGVtIGlzIGxvY2F0ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEFkZEl0ZW06IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGFuIGl0ZW0gaXMgcmVtb3ZlZCBmcm9tIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiBpdGVtcyBhcmUgcmVtb3ZlZC5cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICAgKiBgaXRlbWAgVGhlIHJlbW92ZWQgcGFuZSBpdGVtLlxuICAjICAgICAqIGBpbmRleGAge051bWJlcn0gaW5kaWNhdGluZyB3aGVyZSB0aGUgaXRlbSB3YXMgbG9jYXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkUmVtb3ZlSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtcmVtb3ZlLWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIGJlZm9yZSBhbiBpdGVtIGlzIHJlbW92ZWQgZnJvbSB0aGUgcGFuZS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHdoZW4gaXRlbXMgYXJlIHJlbW92ZWQuXG4gICMgICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAgICogYGl0ZW1gIFRoZSBwYW5lIGl0ZW0gdG8gYmUgcmVtb3ZlZC5cbiAgIyAgICAgKiBgaW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgd2hlcmUgdGhlIGl0ZW0gaXMgbG9jYXRlZC5cbiAgb25XaWxsUmVtb3ZlSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICd3aWxsLXJlbW92ZS1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGFuIGl0ZW0gaXMgbW92ZWQgd2l0aGluIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiBpdGVtcyBhcmUgbW92ZWQuXG4gICMgICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAgICogYGl0ZW1gIFRoZSByZW1vdmVkIHBhbmUgaXRlbS5cbiAgIyAgICAgKiBgb2xkSW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgd2hlcmUgdGhlIGl0ZW0gd2FzIGxvY2F0ZWQuXG4gICMgICAgICogYG5ld0luZGV4YCB7TnVtYmVyfSBpbmRpY2F0aW5nIHdoZXJlIHRoZSBpdGVtIGlzIG5vdyBsb2NhdGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRNb3ZlSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtbW92ZS1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIGFsbCBjdXJyZW50IGFuZCBmdXR1cmUgaXRlbXMuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2l0aCBjdXJyZW50IGFuZCBmdXR1cmUgaXRlbXMuXG4gICMgICAqIGBpdGVtYCBBbiBpdGVtIHRoYXQgaXMgcHJlc2VudCBpbiB7OjpnZXRJdGVtc30gYXQgdGhlIHRpbWUgb2ZcbiAgIyAgICAgc3Vic2NyaXB0aW9uIG9yIHRoYXQgaXMgYWRkZWQgYXQgc29tZSBsYXRlciB0aW1lLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb2JzZXJ2ZUl0ZW1zOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soaXRlbSkgZm9yIGl0ZW0gaW4gQGdldEl0ZW1zKClcbiAgICBAb25EaWRBZGRJdGVtICh7aXRlbX0pIC0+IGNhbGxiYWNrKGl0ZW0pXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgdmFsdWUgb2Ygezo6Z2V0QWN0aXZlSXRlbX1cbiAgIyBjaGFuZ2VzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiB0aGUgYWN0aXZlIGl0ZW0gY2hhbmdlcy5cbiAgIyAgICogYGFjdGl2ZUl0ZW1gIFRoZSBjdXJyZW50IGFjdGl2ZSBpdGVtLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VBY3RpdmVJdGVtOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtYWN0aXZlLWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gezo6YWN0aXZhdGVOZXh0UmVjZW50bHlVc2VkSXRlbX1cbiAgIyBoYXMgYmVlbiBjYWxsZWQsIGVpdGhlciBpbml0aWF0aW5nIG9yIGNvbnRpbnVpbmcgYSBmb3J3YXJkIE1SVSB0cmF2ZXJzYWwgb2ZcbiAgIyBwYW5lIGl0ZW1zLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiB0aGUgYWN0aXZlIGl0ZW0gY2hhbmdlcy5cbiAgIyAgICogYG5leHRSZWNlbnRseVVzZWRJdGVtYCBUaGUgbmV4dCBNUlUgaXRlbSwgbm93IGJlaW5nIHNldCBhY3RpdmVcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uQ2hvb3NlTmV4dE1SVUl0ZW06IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnY2hvb3NlLW5leHQtbXJ1LWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gezo6YWN0aXZhdGVQcmV2aW91c1JlY2VudGx5VXNlZEl0ZW19XG4gICMgaGFzIGJlZW4gY2FsbGVkLCBlaXRoZXIgaW5pdGlhdGluZyBvciBjb250aW51aW5nIGEgcmV2ZXJzZSBNUlUgdHJhdmVyc2FsIG9mXG4gICMgcGFuZSBpdGVtcy5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHdoZW4gdGhlIGFjdGl2ZSBpdGVtIGNoYW5nZXMuXG4gICMgICAqIGBwcmV2aW91c1JlY2VudGx5VXNlZEl0ZW1gIFRoZSBwcmV2aW91cyBNUlUgaXRlbSwgbm93IGJlaW5nIHNldCBhY3RpdmVcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uQ2hvb3NlTGFzdE1SVUl0ZW06IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnY2hvb3NlLWxhc3QtbXJ1LWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gezo6bW92ZUFjdGl2ZUl0ZW1Ub1RvcE9mU3RhY2t9XG4gICMgaGFzIGJlZW4gY2FsbGVkLCB0ZXJtaW5hdGluZyBhbiBNUlUgdHJhdmVyc2FsIG9mIHBhbmUgaXRlbXMgYW5kIG1vdmluZyB0aGVcbiAgIyBjdXJyZW50IGFjdGl2ZSBpdGVtIHRvIHRoZSB0b3Agb2YgdGhlIHN0YWNrLiBUeXBpY2FsbHkgYm91bmQgdG8gYSBtb2RpZmllclxuICAjIChlLmcuIENUUkwpIGtleSB1cCBldmVudC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHdoZW4gdGhlIE1SVSB0cmF2ZXJzYWwgaXMgZG9uZS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRG9uZUNob29zaW5nTVJVSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkb25lLWNob29zaW5nLW1ydS1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgezo6Z2V0QWN0aXZlSXRlbX0uXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2l0aCB0aGUgY3VycmVudCBhbmQgZnV0dXJlIGFjdGl2ZVxuICAjICAgaXRlbXMuXG4gICMgICAqIGBhY3RpdmVJdGVtYCBUaGUgY3VycmVudCBhY3RpdmUgaXRlbS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVBY3RpdmVJdGVtOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soQGdldEFjdGl2ZUl0ZW0oKSlcbiAgICBAb25EaWRDaGFuZ2VBY3RpdmVJdGVtKGNhbGxiYWNrKVxuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIGJlZm9yZSBpdGVtcyBhcmUgZGVzdHJveWVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIGJlZm9yZSBpdGVtcyBhcmUgZGVzdHJveWVkLlxuICAjICAgKiBgZXZlbnRgIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgICAqIGBpdGVtYCBUaGUgaXRlbSB0aGF0IHdpbGwgYmUgZGVzdHJveWVkLlxuICAjICAgICAqIGBpbmRleGAgVGhlIGxvY2F0aW9uIG9mIHRoZSBpdGVtLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0b1xuICAjIHVuc3Vic2NyaWJlLlxuICBvbldpbGxEZXN0cm95SXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICd3aWxsLWRlc3Ryb3ktaXRlbScsIGNhbGxiYWNrXG5cbiAgIyBDYWxsZWQgYnkgdGhlIHZpZXcgbGF5ZXIgdG8gaW5kaWNhdGUgdGhhdCB0aGUgcGFuZSBoYXMgZ2FpbmVkIGZvY3VzLlxuICBmb2N1czogLT5cbiAgICBAZm9jdXNlZCA9IHRydWVcbiAgICBAYWN0aXZhdGUoKVxuXG4gICMgQ2FsbGVkIGJ5IHRoZSB2aWV3IGxheWVyIHRvIGluZGljYXRlIHRoYXQgdGhlIHBhbmUgaGFzIGxvc3QgZm9jdXMuXG4gIGJsdXI6IC0+XG4gICAgQGZvY3VzZWQgPSBmYWxzZVxuICAgIHRydWUgIyBpZiB0aGlzIGlzIGNhbGxlZCBmcm9tIGFuIGV2ZW50IGhhbmRsZXIsIGRvbid0IGNhbmNlbCBpdFxuXG4gIGlzRm9jdXNlZDogLT4gQGZvY3VzZWRcblxuICBnZXRQYW5lczogLT4gW3RoaXNdXG5cbiAgdW5zdWJzY3JpYmVGcm9tSXRlbTogKGl0ZW0pIC0+XG4gICAgQHN1YnNjcmlwdGlvbnNQZXJJdGVtLmdldChpdGVtKT8uZGlzcG9zZSgpXG4gICAgQHN1YnNjcmlwdGlvbnNQZXJJdGVtLmRlbGV0ZShpdGVtKVxuXG4gICMjI1xuICBTZWN0aW9uOiBJdGVtc1xuICAjIyNcblxuICAjIFB1YmxpYzogR2V0IHRoZSBpdGVtcyBpbiB0aGlzIHBhbmUuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgaXRlbXMuXG4gIGdldEl0ZW1zOiAtPlxuICAgIEBpdGVtcy5zbGljZSgpXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgYWN0aXZlIHBhbmUgaXRlbSBpbiB0aGlzIHBhbmUuXG4gICNcbiAgIyBSZXR1cm5zIGEgcGFuZSBpdGVtLlxuICBnZXRBY3RpdmVJdGVtOiAtPiBAYWN0aXZlSXRlbVxuXG4gIHNldEFjdGl2ZUl0ZW06IChhY3RpdmVJdGVtLCBvcHRpb25zKSAtPlxuICAgIHttb2RpZnlTdGFja30gPSBvcHRpb25zIGlmIG9wdGlvbnM/XG4gICAgdW5sZXNzIGFjdGl2ZUl0ZW0gaXMgQGFjdGl2ZUl0ZW1cbiAgICAgIEBhZGRJdGVtVG9TdGFjayhhY3RpdmVJdGVtKSB1bmxlc3MgbW9kaWZ5U3RhY2sgaXMgZmFsc2VcbiAgICAgIEBhY3RpdmVJdGVtID0gYWN0aXZlSXRlbVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1hY3RpdmUtaXRlbScsIEBhY3RpdmVJdGVtXG4gICAgICBAY29udGFpbmVyPy5kaWRDaGFuZ2VBY3RpdmVJdGVtT25QYW5lKHRoaXMsIEBhY3RpdmVJdGVtKVxuICAgIEBhY3RpdmVJdGVtXG5cbiAgIyBCdWlsZCB0aGUgaXRlbVN0YWNrIGFmdGVyIGRlc2VyaWFsaXppbmdcbiAgYWRkSXRlbXNUb1N0YWNrOiAoaXRlbVN0YWNrSW5kaWNlcykgLT5cbiAgICBpZiBAaXRlbXMubGVuZ3RoID4gMFxuICAgICAgaWYgaXRlbVN0YWNrSW5kaWNlcy5sZW5ndGggaXMgMCBvciBpdGVtU3RhY2tJbmRpY2VzLmxlbmd0aCBpc250IEBpdGVtcy5sZW5ndGggb3IgaXRlbVN0YWNrSW5kaWNlcy5pbmRleE9mKC0xKSA+PSAwXG4gICAgICAgIGl0ZW1TdGFja0luZGljZXMgPSAoaSBmb3IgaSBpbiBbMC4uQGl0ZW1zLmxlbmd0aC0xXSlcbiAgICAgIGZvciBpdGVtSW5kZXggaW4gaXRlbVN0YWNrSW5kaWNlc1xuICAgICAgICBAYWRkSXRlbVRvU3RhY2soQGl0ZW1zW2l0ZW1JbmRleF0pXG4gICAgICByZXR1cm5cblxuICAjIEFkZCBpdGVtIChvciBtb3ZlIGl0ZW0pIHRvIHRoZSBlbmQgb2YgdGhlIGl0ZW1TdGFja1xuICBhZGRJdGVtVG9TdGFjazogKG5ld0l0ZW0pIC0+XG4gICAgcmV0dXJuIHVubGVzcyBuZXdJdGVtP1xuICAgIGluZGV4ID0gQGl0ZW1TdGFjay5pbmRleE9mKG5ld0l0ZW0pXG4gICAgQGl0ZW1TdGFjay5zcGxpY2UoaW5kZXgsIDEpIHVubGVzcyBpbmRleCBpcyAtMVxuICAgIEBpdGVtU3RhY2sucHVzaChuZXdJdGVtKVxuXG4gICMgUmV0dXJuIGFuIHtUZXh0RWRpdG9yfSBpZiB0aGUgcGFuZSBpdGVtIGlzIGFuIHtUZXh0RWRpdG9yfSwgb3IgbnVsbCBvdGhlcndpc2UuXG4gIGdldEFjdGl2ZUVkaXRvcjogLT5cbiAgICBAYWN0aXZlSXRlbSBpZiBAYWN0aXZlSXRlbSBpbnN0YW5jZW9mIFRleHRFZGl0b3JcblxuICAjIFB1YmxpYzogUmV0dXJuIHRoZSBpdGVtIGF0IHRoZSBnaXZlbiBpbmRleC5cbiAgI1xuICAjICogYGluZGV4YCB7TnVtYmVyfVxuICAjXG4gICMgUmV0dXJucyBhbiBpdGVtIG9yIGBudWxsYCBpZiBubyBpdGVtIGV4aXN0cyBhdCB0aGUgZ2l2ZW4gaW5kZXguXG4gIGl0ZW1BdEluZGV4OiAoaW5kZXgpIC0+XG4gICAgQGl0ZW1zW2luZGV4XVxuXG4gICMgTWFrZXMgdGhlIG5leHQgaXRlbSBpbiB0aGUgaXRlbVN0YWNrIGFjdGl2ZS5cbiAgYWN0aXZhdGVOZXh0UmVjZW50bHlVc2VkSXRlbTogLT5cbiAgICBpZiBAaXRlbXMubGVuZ3RoID4gMVxuICAgICAgQGl0ZW1TdGFja0luZGV4ID0gQGl0ZW1TdGFjay5sZW5ndGggLSAxIHVubGVzcyBAaXRlbVN0YWNrSW5kZXg/XG4gICAgICBAaXRlbVN0YWNrSW5kZXggPSBAaXRlbVN0YWNrLmxlbmd0aCBpZiBAaXRlbVN0YWNrSW5kZXggaXMgMFxuICAgICAgQGl0ZW1TdGFja0luZGV4ID0gQGl0ZW1TdGFja0luZGV4IC0gMVxuICAgICAgbmV4dFJlY2VudGx5VXNlZEl0ZW0gPSBAaXRlbVN0YWNrW0BpdGVtU3RhY2tJbmRleF1cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2Nob29zZS1uZXh0LW1ydS1pdGVtJywgbmV4dFJlY2VudGx5VXNlZEl0ZW1cbiAgICAgIEBzZXRBY3RpdmVJdGVtKG5leHRSZWNlbnRseVVzZWRJdGVtLCBtb2RpZnlTdGFjazogZmFsc2UpXG5cbiAgIyBNYWtlcyB0aGUgcHJldmlvdXMgaXRlbSBpbiB0aGUgaXRlbVN0YWNrIGFjdGl2ZS5cbiAgYWN0aXZhdGVQcmV2aW91c1JlY2VudGx5VXNlZEl0ZW06IC0+XG4gICAgaWYgQGl0ZW1zLmxlbmd0aCA+IDFcbiAgICAgIGlmIEBpdGVtU3RhY2tJbmRleCArIDEgaXMgQGl0ZW1TdGFjay5sZW5ndGggb3Igbm90IEBpdGVtU3RhY2tJbmRleD9cbiAgICAgICAgQGl0ZW1TdGFja0luZGV4ID0gLTFcbiAgICAgIEBpdGVtU3RhY2tJbmRleCA9IEBpdGVtU3RhY2tJbmRleCArIDFcbiAgICAgIHByZXZpb3VzUmVjZW50bHlVc2VkSXRlbSA9IEBpdGVtU3RhY2tbQGl0ZW1TdGFja0luZGV4XVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnY2hvb3NlLWxhc3QtbXJ1LWl0ZW0nLCBwcmV2aW91c1JlY2VudGx5VXNlZEl0ZW1cbiAgICAgIEBzZXRBY3RpdmVJdGVtKHByZXZpb3VzUmVjZW50bHlVc2VkSXRlbSwgbW9kaWZ5U3RhY2s6IGZhbHNlKVxuXG4gICMgTW92ZXMgdGhlIGFjdGl2ZSBpdGVtIHRvIHRoZSBlbmQgb2YgdGhlIGl0ZW1TdGFjayBvbmNlIHRoZSBjdHJsIGtleSBpcyBsaWZ0ZWRcbiAgbW92ZUFjdGl2ZUl0ZW1Ub1RvcE9mU3RhY2s6IC0+XG4gICAgZGVsZXRlIEBpdGVtU3RhY2tJbmRleFxuICAgIEBhZGRJdGVtVG9TdGFjayhAYWN0aXZlSXRlbSlcbiAgICBAZW1pdHRlci5lbWl0ICdkb25lLWNob29zaW5nLW1ydS1pdGVtJ1xuXG4gICMgUHVibGljOiBNYWtlcyB0aGUgbmV4dCBpdGVtIGFjdGl2ZS5cbiAgYWN0aXZhdGVOZXh0SXRlbTogLT5cbiAgICBpbmRleCA9IEBnZXRBY3RpdmVJdGVtSW5kZXgoKVxuICAgIGlmIGluZGV4IDwgQGl0ZW1zLmxlbmd0aCAtIDFcbiAgICAgIEBhY3RpdmF0ZUl0ZW1BdEluZGV4KGluZGV4ICsgMSlcbiAgICBlbHNlXG4gICAgICBAYWN0aXZhdGVJdGVtQXRJbmRleCgwKVxuXG4gICMgUHVibGljOiBNYWtlcyB0aGUgcHJldmlvdXMgaXRlbSBhY3RpdmUuXG4gIGFjdGl2YXRlUHJldmlvdXNJdGVtOiAtPlxuICAgIGluZGV4ID0gQGdldEFjdGl2ZUl0ZW1JbmRleCgpXG4gICAgaWYgaW5kZXggPiAwXG4gICAgICBAYWN0aXZhdGVJdGVtQXRJbmRleChpbmRleCAtIDEpXG4gICAgZWxzZVxuICAgICAgQGFjdGl2YXRlSXRlbUF0SW5kZXgoQGl0ZW1zLmxlbmd0aCAtIDEpXG5cbiAgYWN0aXZhdGVMYXN0SXRlbTogLT5cbiAgICBAYWN0aXZhdGVJdGVtQXRJbmRleChAaXRlbXMubGVuZ3RoIC0gMSlcblxuICAjIFB1YmxpYzogTW92ZSB0aGUgYWN0aXZlIHRhYiB0byB0aGUgcmlnaHQuXG4gIG1vdmVJdGVtUmlnaHQ6IC0+XG4gICAgaW5kZXggPSBAZ2V0QWN0aXZlSXRlbUluZGV4KClcbiAgICByaWdodEl0ZW1JbmRleCA9IGluZGV4ICsgMVxuICAgIEBtb3ZlSXRlbShAZ2V0QWN0aXZlSXRlbSgpLCByaWdodEl0ZW1JbmRleCkgdW5sZXNzIHJpZ2h0SXRlbUluZGV4ID4gQGl0ZW1zLmxlbmd0aCAtIDFcblxuICAjIFB1YmxpYzogTW92ZSB0aGUgYWN0aXZlIHRhYiB0byB0aGUgbGVmdFxuICBtb3ZlSXRlbUxlZnQ6IC0+XG4gICAgaW5kZXggPSBAZ2V0QWN0aXZlSXRlbUluZGV4KClcbiAgICBsZWZ0SXRlbUluZGV4ID0gaW5kZXggLSAxXG4gICAgQG1vdmVJdGVtKEBnZXRBY3RpdmVJdGVtKCksIGxlZnRJdGVtSW5kZXgpIHVubGVzcyBsZWZ0SXRlbUluZGV4IDwgMFxuXG4gICMgUHVibGljOiBHZXQgdGhlIGluZGV4IG9mIHRoZSBhY3RpdmUgaXRlbS5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfS5cbiAgZ2V0QWN0aXZlSXRlbUluZGV4OiAtPlxuICAgIEBpdGVtcy5pbmRleE9mKEBhY3RpdmVJdGVtKVxuXG4gICMgUHVibGljOiBBY3RpdmF0ZSB0aGUgaXRlbSBhdCB0aGUgZ2l2ZW4gaW5kZXguXG4gICNcbiAgIyAqIGBpbmRleGAge051bWJlcn1cbiAgYWN0aXZhdGVJdGVtQXRJbmRleDogKGluZGV4KSAtPlxuICAgIGl0ZW0gPSBAaXRlbUF0SW5kZXgoaW5kZXgpIG9yIEBnZXRBY3RpdmVJdGVtKClcbiAgICBAc2V0QWN0aXZlSXRlbShpdGVtKVxuXG4gICMgUHVibGljOiBNYWtlIHRoZSBnaXZlbiBpdGVtICphY3RpdmUqLCBjYXVzaW5nIGl0IHRvIGJlIGRpc3BsYXllZCBieVxuICAjIHRoZSBwYW5lJ3Mgdmlldy5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIGFjdGl2YXRlXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgcGVuZGluZ2AgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB0aGF0IHRoZSBpdGVtIHNob3VsZCBiZSBhZGRlZFxuICAjICAgICBpbiBhIHBlbmRpbmcgc3RhdGUgaWYgaXQgZG9lcyBub3QgeWV0IGV4aXN0IGluIHRoZSBwYW5lLiBFeGlzdGluZyBwZW5kaW5nXG4gICMgICAgIGl0ZW1zIGluIGEgcGFuZSBhcmUgcmVwbGFjZWQgd2l0aCBuZXcgcGVuZGluZyBpdGVtcyB3aGVuIHRoZXkgYXJlIG9wZW5lZC5cbiAgYWN0aXZhdGVJdGVtOiAoaXRlbSwgb3B0aW9ucz17fSkgLT5cbiAgICBpZiBpdGVtP1xuICAgICAgaWYgQGdldFBlbmRpbmdJdGVtKCkgaXMgQGFjdGl2ZUl0ZW1cbiAgICAgICAgaW5kZXggPSBAZ2V0QWN0aXZlSXRlbUluZGV4KClcbiAgICAgIGVsc2VcbiAgICAgICAgaW5kZXggPSBAZ2V0QWN0aXZlSXRlbUluZGV4KCkgKyAxXG4gICAgICBAYWRkSXRlbShpdGVtLCBleHRlbmQoe30sIG9wdGlvbnMsIHtpbmRleDogaW5kZXh9KSlcbiAgICAgIEBzZXRBY3RpdmVJdGVtKGl0ZW0pXG5cbiAgIyBQdWJsaWM6IEFkZCB0aGUgZ2l2ZW4gaXRlbSB0byB0aGUgcGFuZS5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIGFkZC4gSXQgY2FuIGJlIGEgbW9kZWwgd2l0aCBhbiBhc3NvY2lhdGVkIHZpZXcgb3IgYVxuICAjICAgdmlldy5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBpbmRleGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBpbmRleCBhdCB3aGljaCB0byBhZGQgdGhlIGl0ZW0uXG4gICMgICAgIElmIG9taXR0ZWQsIHRoZSBpdGVtIGlzIGFkZGVkIGFmdGVyIHRoZSBjdXJyZW50IGFjdGl2ZSBpdGVtLlxuICAjICAgKiBgcGVuZGluZ2AgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB0aGF0IHRoZSBpdGVtIHNob3VsZCBiZVxuICAjICAgICBhZGRlZCBpbiBhIHBlbmRpbmcgc3RhdGUuIEV4aXN0aW5nIHBlbmRpbmcgaXRlbXMgaW4gYSBwYW5lIGFyZSByZXBsYWNlZCB3aXRoXG4gICMgICAgIG5ldyBwZW5kaW5nIGl0ZW1zIHdoZW4gdGhleSBhcmUgb3BlbmVkLlxuICAjXG4gICMgUmV0dXJucyB0aGUgYWRkZWQgaXRlbS5cbiAgYWRkSXRlbTogKGl0ZW0sIG9wdGlvbnM9e30pIC0+XG4gICAgIyBCYWNrd2FyZCBjb21wYXQgd2l0aCBvbGQgQVBJOlxuICAgICMgICBhZGRJdGVtKGl0ZW0sIGluZGV4PUBnZXRBY3RpdmVJdGVtSW5kZXgoKSArIDEpXG4gICAgaWYgdHlwZW9mIG9wdGlvbnMgaXMgXCJudW1iZXJcIlxuICAgICAgR3JpbS5kZXByZWNhdGUoXCJQYW5lOjphZGRJdGVtKGl0ZW0sICN7b3B0aW9uc30pIGlzIGRlcHJlY2F0ZWQgaW4gZmF2b3Igb2YgUGFuZTo6YWRkSXRlbShpdGVtLCB7aW5kZXg6ICN7b3B0aW9uc319KVwiKVxuICAgICAgb3B0aW9ucyA9IGluZGV4OiBvcHRpb25zXG5cbiAgICBpbmRleCA9IG9wdGlvbnMuaW5kZXggPyBAZ2V0QWN0aXZlSXRlbUluZGV4KCkgKyAxXG4gICAgbW92ZWQgPSBvcHRpb25zLm1vdmVkID8gZmFsc2VcbiAgICBwZW5kaW5nID0gb3B0aW9ucy5wZW5kaW5nID8gZmFsc2VcblxuICAgIHRocm93IG5ldyBFcnJvcihcIlBhbmUgaXRlbXMgbXVzdCBiZSBvYmplY3RzLiBBdHRlbXB0ZWQgdG8gYWRkIGl0ZW0gI3tpdGVtfS5cIikgdW5sZXNzIGl0ZW0/IGFuZCB0eXBlb2YgaXRlbSBpcyAnb2JqZWN0J1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFkZGluZyBhIHBhbmUgaXRlbSB3aXRoIFVSSSAnI3tpdGVtLmdldFVSST8oKX0nIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBkZXN0cm95ZWRcIikgaWYgaXRlbS5pc0Rlc3Ryb3llZD8oKVxuXG4gICAgcmV0dXJuIGlmIGl0ZW0gaW4gQGl0ZW1zXG5cbiAgICBpZiB0eXBlb2YgaXRlbS5vbkRpZERlc3Ryb3kgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgaXRlbVN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgICAgaXRlbVN1YnNjcmlwdGlvbnMuYWRkIGl0ZW0ub25EaWREZXN0cm95ID0+IEByZW1vdmVJdGVtKGl0ZW0sIGZhbHNlKVxuICAgICAgaWYgdHlwZW9mIGl0ZW0ub25EaWRUZXJtaW5hdGVQZW5kaW5nU3RhdGUgaXMgXCJmdW5jdGlvblwiXG4gICAgICAgIGl0ZW1TdWJzY3JpcHRpb25zLmFkZCBpdGVtLm9uRGlkVGVybWluYXRlUGVuZGluZ1N0YXRlID0+XG4gICAgICAgICAgQGNsZWFyUGVuZGluZ0l0ZW0oKSBpZiBAZ2V0UGVuZGluZ0l0ZW0oKSBpcyBpdGVtXG4gICAgICBAc3Vic2NyaXB0aW9uc1Blckl0ZW0uc2V0IGl0ZW0sIGl0ZW1TdWJzY3JpcHRpb25zXG5cbiAgICBAaXRlbXMuc3BsaWNlKGluZGV4LCAwLCBpdGVtKVxuICAgIGxhc3RQZW5kaW5nSXRlbSA9IEBnZXRQZW5kaW5nSXRlbSgpXG4gICAgcmVwbGFjaW5nUGVuZGluZ0l0ZW0gPSBsYXN0UGVuZGluZ0l0ZW0/IGFuZCBub3QgbW92ZWRcbiAgICBAcGVuZGluZ0l0ZW0gPSBudWxsIGlmIHJlcGxhY2luZ1BlbmRpbmdJdGVtXG4gICAgQHNldFBlbmRpbmdJdGVtKGl0ZW0pIGlmIHBlbmRpbmdcblxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1hZGQtaXRlbScsIHtpdGVtLCBpbmRleCwgbW92ZWR9XG4gICAgQGNvbnRhaW5lcj8uZGlkQWRkUGFuZUl0ZW0oaXRlbSwgdGhpcywgaW5kZXgpIHVubGVzcyBtb3ZlZFxuXG4gICAgQGRlc3Ryb3lJdGVtKGxhc3RQZW5kaW5nSXRlbSkgaWYgcmVwbGFjaW5nUGVuZGluZ0l0ZW1cbiAgICBAc2V0QWN0aXZlSXRlbShpdGVtKSB1bmxlc3MgQGdldEFjdGl2ZUl0ZW0oKT9cbiAgICBpdGVtXG5cbiAgc2V0UGVuZGluZ0l0ZW06IChpdGVtKSA9PlxuICAgIGlmIEBwZW5kaW5nSXRlbSBpc250IGl0ZW1cbiAgICAgIG1vc3RSZWNlbnRQZW5kaW5nSXRlbSA9IEBwZW5kaW5nSXRlbVxuICAgICAgQHBlbmRpbmdJdGVtID0gaXRlbVxuICAgICAgaWYgbW9zdFJlY2VudFBlbmRpbmdJdGVtP1xuICAgICAgICBAZW1pdHRlci5lbWl0ICdpdGVtLWRpZC10ZXJtaW5hdGUtcGVuZGluZy1zdGF0ZScsIG1vc3RSZWNlbnRQZW5kaW5nSXRlbVxuXG4gIGdldFBlbmRpbmdJdGVtOiA9PlxuICAgIEBwZW5kaW5nSXRlbSBvciBudWxsXG5cbiAgY2xlYXJQZW5kaW5nSXRlbTogPT5cbiAgICBAc2V0UGVuZGluZ0l0ZW0obnVsbClcblxuICBvbkl0ZW1EaWRUZXJtaW5hdGVQZW5kaW5nU3RhdGU6IChjYWxsYmFjaykgPT5cbiAgICBAZW1pdHRlci5vbiAnaXRlbS1kaWQtdGVybWluYXRlLXBlbmRpbmctc3RhdGUnLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBBZGQgdGhlIGdpdmVuIGl0ZW1zIHRvIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgaXRlbXNgIEFuIHtBcnJheX0gb2YgaXRlbXMgdG8gYWRkLiBJdGVtcyBjYW4gYmUgdmlld3Mgb3IgbW9kZWxzIHdpdGhcbiAgIyAgIGFzc29jaWF0ZWQgdmlld3MuIEFueSBvYmplY3RzIHRoYXQgYXJlIGFscmVhZHkgcHJlc2VudCBpbiB0aGUgcGFuZSdzXG4gICMgICBjdXJyZW50IGl0ZW1zIHdpbGwgbm90IGJlIGFkZGVkIGFnYWluLlxuICAjICogYGluZGV4YCAob3B0aW9uYWwpIHtOdW1iZXJ9IGluZGV4IGF0IHdoaWNoIHRvIGFkZCB0aGUgaXRlbXMuIElmIG9taXR0ZWQsXG4gICMgICB0aGUgaXRlbSBpcyAjICAgYWRkZWQgYWZ0ZXIgdGhlIGN1cnJlbnQgYWN0aXZlIGl0ZW0uXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgYWRkZWQgaXRlbXMuXG4gIGFkZEl0ZW1zOiAoaXRlbXMsIGluZGV4PUBnZXRBY3RpdmVJdGVtSW5kZXgoKSArIDEpIC0+XG4gICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIgKGl0ZW0pID0+IG5vdCAoaXRlbSBpbiBAaXRlbXMpXG4gICAgQGFkZEl0ZW0oaXRlbSwge2luZGV4OiBpbmRleCArIGl9KSBmb3IgaXRlbSwgaSBpbiBpdGVtc1xuICAgIGl0ZW1zXG5cbiAgcmVtb3ZlSXRlbTogKGl0ZW0sIG1vdmVkKSAtPlxuICAgIGluZGV4ID0gQGl0ZW1zLmluZGV4T2YoaXRlbSlcbiAgICByZXR1cm4gaWYgaW5kZXggaXMgLTFcbiAgICBAcGVuZGluZ0l0ZW0gPSBudWxsIGlmIEBnZXRQZW5kaW5nSXRlbSgpIGlzIGl0ZW1cbiAgICBAcmVtb3ZlSXRlbUZyb21TdGFjayhpdGVtKVxuICAgIEBlbWl0dGVyLmVtaXQgJ3dpbGwtcmVtb3ZlLWl0ZW0nLCB7aXRlbSwgaW5kZXgsIGRlc3Ryb3llZDogbm90IG1vdmVkLCBtb3ZlZH1cbiAgICBAdW5zdWJzY3JpYmVGcm9tSXRlbShpdGVtKVxuXG4gICAgaWYgaXRlbSBpcyBAYWN0aXZlSXRlbVxuICAgICAgaWYgQGl0ZW1zLmxlbmd0aCBpcyAxXG4gICAgICAgIEBzZXRBY3RpdmVJdGVtKHVuZGVmaW5lZClcbiAgICAgIGVsc2UgaWYgaW5kZXggaXMgMFxuICAgICAgICBAYWN0aXZhdGVOZXh0SXRlbSgpXG4gICAgICBlbHNlXG4gICAgICAgIEBhY3RpdmF0ZVByZXZpb3VzSXRlbSgpXG4gICAgQGl0ZW1zLnNwbGljZShpbmRleCwgMSlcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtcmVtb3ZlLWl0ZW0nLCB7aXRlbSwgaW5kZXgsIGRlc3Ryb3llZDogbm90IG1vdmVkLCBtb3ZlZH1cbiAgICBAY29udGFpbmVyPy5kaWREZXN0cm95UGFuZUl0ZW0oe2l0ZW0sIGluZGV4LCBwYW5lOiB0aGlzfSkgdW5sZXNzIG1vdmVkXG4gICAgQGRlc3Ryb3koKSBpZiBAaXRlbXMubGVuZ3RoIGlzIDAgYW5kIEBjb25maWcuZ2V0KCdjb3JlLmRlc3Ryb3lFbXB0eVBhbmVzJylcblxuICAjIFJlbW92ZSB0aGUgZ2l2ZW4gaXRlbSBmcm9tIHRoZSBpdGVtU3RhY2suXG4gICNcbiAgIyAqIGBpdGVtYCBUaGUgaXRlbSB0byByZW1vdmUuXG4gICMgKiBgaW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGluZGV4IHRvIHdoaWNoIHRvIHJlbW92ZSB0aGUgaXRlbSBmcm9tIHRoZSBpdGVtU3RhY2suXG4gIHJlbW92ZUl0ZW1Gcm9tU3RhY2s6IChpdGVtKSAtPlxuICAgIGluZGV4ID0gQGl0ZW1TdGFjay5pbmRleE9mKGl0ZW0pXG4gICAgQGl0ZW1TdGFjay5zcGxpY2UoaW5kZXgsIDEpIHVubGVzcyBpbmRleCBpcyAtMVxuXG4gICMgUHVibGljOiBNb3ZlIHRoZSBnaXZlbiBpdGVtIHRvIHRoZSBnaXZlbiBpbmRleC5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIG1vdmUuXG4gICMgKiBgaW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGluZGV4IHRvIHdoaWNoIHRvIG1vdmUgdGhlIGl0ZW0uXG4gIG1vdmVJdGVtOiAoaXRlbSwgbmV3SW5kZXgpIC0+XG4gICAgb2xkSW5kZXggPSBAaXRlbXMuaW5kZXhPZihpdGVtKVxuICAgIEBpdGVtcy5zcGxpY2Uob2xkSW5kZXgsIDEpXG4gICAgQGl0ZW1zLnNwbGljZShuZXdJbmRleCwgMCwgaXRlbSlcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtbW92ZS1pdGVtJywge2l0ZW0sIG9sZEluZGV4LCBuZXdJbmRleH1cblxuICAjIFB1YmxpYzogTW92ZSB0aGUgZ2l2ZW4gaXRlbSB0byB0aGUgZ2l2ZW4gaW5kZXggb24gYW5vdGhlciBwYW5lLlxuICAjXG4gICMgKiBgaXRlbWAgVGhlIGl0ZW0gdG8gbW92ZS5cbiAgIyAqIGBwYW5lYCB7UGFuZX0gdG8gd2hpY2ggdG8gbW92ZSB0aGUgaXRlbS5cbiAgIyAqIGBpbmRleGAge051bWJlcn0gaW5kaWNhdGluZyB0aGUgaW5kZXggdG8gd2hpY2ggdG8gbW92ZSB0aGUgaXRlbSBpbiB0aGVcbiAgIyAgIGdpdmVuIHBhbmUuXG4gIG1vdmVJdGVtVG9QYW5lOiAoaXRlbSwgcGFuZSwgaW5kZXgpIC0+XG4gICAgQHJlbW92ZUl0ZW0oaXRlbSwgdHJ1ZSlcbiAgICBwYW5lLmFkZEl0ZW0oaXRlbSwge2luZGV4OiBpbmRleCwgbW92ZWQ6IHRydWV9KVxuXG4gICMgUHVibGljOiBEZXN0cm95IHRoZSBhY3RpdmUgaXRlbSBhbmQgYWN0aXZhdGUgdGhlIG5leHQgaXRlbS5cbiAgZGVzdHJveUFjdGl2ZUl0ZW06IC0+XG4gICAgQGRlc3Ryb3lJdGVtKEBhY3RpdmVJdGVtKVxuICAgIGZhbHNlXG5cbiAgIyBQdWJsaWM6IERlc3Ryb3kgdGhlIGdpdmVuIGl0ZW0uXG4gICNcbiAgIyBJZiB0aGUgaXRlbSBpcyBhY3RpdmUsIHRoZSBuZXh0IGl0ZW0gd2lsbCBiZSBhY3RpdmF0ZWQuIElmIHRoZSBpdGVtIGlzIHRoZVxuICAjIGxhc3QgaXRlbSwgdGhlIHBhbmUgd2lsbCBiZSBkZXN0cm95ZWQgaWYgdGhlIGBjb3JlLmRlc3Ryb3lFbXB0eVBhbmVzYCBjb25maWdcbiAgIyBzZXR0aW5nIGlzIGB0cnVlYC5cbiAgI1xuICAjICogYGl0ZW1gIEl0ZW0gdG8gZGVzdHJveVxuICAjICogYGZvcmNlYCAob3B0aW9uYWwpIHtCb29sZWFufSBEZXN0cm95IHRoZSBpdGVtIHdpdGhvdXQgcHJvbXB0aW5nIHRvIHNhdmVcbiAgIyAgICBpdCwgZXZlbiBpZiB0aGUgaXRlbSdzIGBpc1Blcm1hbmVudERvY2tJdGVtYCBtZXRob2QgcmV0dXJucyB0cnVlLlxuICAjXG4gICMgUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IHJlc29sdmVzIHdpdGggYSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIG9yIG5vdFxuICAjIHRoZSBpdGVtIHdhcyBkZXN0cm95ZWQuXG4gIGRlc3Ryb3lJdGVtOiAoaXRlbSwgZm9yY2UpIC0+XG4gICAgaW5kZXggPSBAaXRlbXMuaW5kZXhPZihpdGVtKVxuICAgIGlmIGluZGV4IGlzbnQgLTFcbiAgICAgIHJldHVybiBmYWxzZSBpZiBub3QgZm9yY2UgYW5kIEBnZXRDb250YWluZXIoKT8uZ2V0TG9jYXRpb24oKSBpc250ICdjZW50ZXInIGFuZCBpdGVtLmlzUGVybWFuZW50RG9ja0l0ZW0/KClcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ3dpbGwtZGVzdHJveS1pdGVtJywge2l0ZW0sIGluZGV4fVxuICAgICAgQGNvbnRhaW5lcj8ud2lsbERlc3Ryb3lQYW5lSXRlbSh7aXRlbSwgaW5kZXgsIHBhbmU6IHRoaXN9KVxuICAgICAgaWYgZm9yY2Ugb3Igbm90IGl0ZW0/LnNob3VsZFByb21wdFRvU2F2ZT8oKVxuICAgICAgICBAcmVtb3ZlSXRlbShpdGVtLCBmYWxzZSlcbiAgICAgICAgaXRlbS5kZXN0cm95PygpXG4gICAgICBlbHNlXG4gICAgICAgIEBwcm9tcHRUb1NhdmVJdGVtKGl0ZW0pLnRoZW4gKHJlc3VsdCkgPT5cbiAgICAgICAgICBpZiByZXN1bHRcbiAgICAgICAgICAgIEByZW1vdmVJdGVtKGl0ZW0sIGZhbHNlKVxuICAgICAgICAgICAgaXRlbS5kZXN0cm95PygpXG4gICAgICAgICAgcmVzdWx0XG5cbiAgIyBQdWJsaWM6IERlc3Ryb3kgYWxsIGl0ZW1zLlxuICBkZXN0cm95SXRlbXM6IC0+XG4gICAgUHJvbWlzZS5hbGwoXG4gICAgICBAZ2V0SXRlbXMoKS5tYXAoQGRlc3Ryb3lJdGVtLmJpbmQodGhpcykpXG4gICAgKVxuXG4gICMgUHVibGljOiBEZXN0cm95IGFsbCBpdGVtcyBleGNlcHQgZm9yIHRoZSBhY3RpdmUgaXRlbS5cbiAgZGVzdHJveUluYWN0aXZlSXRlbXM6IC0+XG4gICAgUHJvbWlzZS5hbGwoXG4gICAgICBAZ2V0SXRlbXMoKVxuICAgICAgICAuZmlsdGVyKChpdGVtKSA9PiBpdGVtIGlzbnQgQGFjdGl2ZUl0ZW0pXG4gICAgICAgIC5tYXAoQGRlc3Ryb3lJdGVtLmJpbmQodGhpcykpXG4gICAgKVxuXG4gIHByb21wdFRvU2F2ZUl0ZW06IChpdGVtLCBvcHRpb25zPXt9KSAtPlxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSkgdW5sZXNzIGl0ZW0uc2hvdWxkUHJvbXB0VG9TYXZlPyhvcHRpb25zKVxuXG4gICAgaWYgdHlwZW9mIGl0ZW0uZ2V0VVJJIGlzICdmdW5jdGlvbidcbiAgICAgIHVyaSA9IGl0ZW0uZ2V0VVJJKClcbiAgICBlbHNlIGlmIHR5cGVvZiBpdGVtLmdldFVyaSBpcyAnZnVuY3Rpb24nXG4gICAgICB1cmkgPSBpdGVtLmdldFVyaSgpXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKVxuXG4gICAgc2F2ZURpYWxvZyA9IChzYXZlQnV0dG9uVGV4dCwgc2F2ZUZuLCBtZXNzYWdlKSA9PlxuICAgICAgY2hvc2VuID0gQGFwcGxpY2F0aW9uRGVsZWdhdGUuY29uZmlybVxuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgIGRldGFpbGVkTWVzc2FnZTogXCJZb3VyIGNoYW5nZXMgd2lsbCBiZSBsb3N0IGlmIHlvdSBjbG9zZSB0aGlzIGl0ZW0gd2l0aG91dCBzYXZpbmcuXCJcbiAgICAgICAgYnV0dG9uczogW3NhdmVCdXR0b25UZXh0LCBcIkNhbmNlbFwiLCBcIkRvbid0IFNhdmVcIl1cbiAgICAgIHN3aXRjaCBjaG9zZW5cbiAgICAgICAgd2hlbiAwXG4gICAgICAgICAgbmV3IFByb21pc2UgKHJlc29sdmUpIC0+XG4gICAgICAgICAgICBzYXZlRm4gaXRlbSwgKGVycm9yKSAtPlxuICAgICAgICAgICAgICBpZiBlcnJvciBpbnN0YW5jZW9mIFNhdmVDYW5jZWxsZWRFcnJvclxuICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBzYXZlRXJyb3IoZXJyb3IpLnRoZW4ocmVzb2x2ZSlcbiAgICAgICAgd2hlbiAxXG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKGZhbHNlKVxuICAgICAgICB3aGVuIDJcbiAgICAgICAgICBQcm9taXNlLnJlc29sdmUodHJ1ZSlcblxuICAgIHNhdmVFcnJvciA9IChlcnJvcikgPT5cbiAgICAgIGlmIGVycm9yXG4gICAgICAgIHNhdmVEaWFsb2coXCJTYXZlIGFzXCIsIEBzYXZlSXRlbUFzLCBcIicje2l0ZW0uZ2V0VGl0bGU/KCkgPyB1cml9JyBjb3VsZCBub3QgYmUgc2F2ZWQuXFxuRXJyb3I6ICN7QGdldE1lc3NhZ2VGb3JFcnJvckNvZGUoZXJyb3IuY29kZSl9XCIpXG4gICAgICBlbHNlXG4gICAgICAgIFByb21pc2UucmVzb2x2ZSh0cnVlKVxuXG4gICAgc2F2ZURpYWxvZyhcIlNhdmVcIiwgQHNhdmVJdGVtLCBcIicje2l0ZW0uZ2V0VGl0bGU/KCkgPyB1cml9JyBoYXMgY2hhbmdlcywgZG8geW91IHdhbnQgdG8gc2F2ZSB0aGVtP1wiKVxuXG4gICMgUHVibGljOiBTYXZlIHRoZSBhY3RpdmUgaXRlbS5cbiAgc2F2ZUFjdGl2ZUl0ZW06IChuZXh0QWN0aW9uKSAtPlxuICAgIEBzYXZlSXRlbShAZ2V0QWN0aXZlSXRlbSgpLCBuZXh0QWN0aW9uKVxuXG4gICMgUHVibGljOiBQcm9tcHQgdGhlIHVzZXIgZm9yIGEgbG9jYXRpb24gYW5kIHNhdmUgdGhlIGFjdGl2ZSBpdGVtIHdpdGggdGhlXG4gICMgcGF0aCB0aGV5IHNlbGVjdC5cbiAgI1xuICAjICogYG5leHRBY3Rpb25gIChvcHRpb25hbCkge0Z1bmN0aW9ufSB3aGljaCB3aWxsIGJlIGNhbGxlZCBhZnRlciB0aGUgaXRlbSBpc1xuICAjICAgc3VjY2Vzc2Z1bGx5IHNhdmVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIHNhdmUgaXMgY29tcGxldGVcbiAgc2F2ZUFjdGl2ZUl0ZW1BczogKG5leHRBY3Rpb24pIC0+XG4gICAgQHNhdmVJdGVtQXMoQGdldEFjdGl2ZUl0ZW0oKSwgbmV4dEFjdGlvbilcblxuICAjIFB1YmxpYzogU2F2ZSB0aGUgZ2l2ZW4gaXRlbS5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIHNhdmUuXG4gICMgKiBgbmV4dEFjdGlvbmAgKG9wdGlvbmFsKSB7RnVuY3Rpb259IHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggbm8gYXJndW1lbnRcbiAgIyAgIGFmdGVyIHRoZSBpdGVtIGlzIHN1Y2Nlc3NmdWxseSBzYXZlZCwgb3Igd2l0aCB0aGUgZXJyb3IgaWYgaXQgZmFpbGVkLlxuICAjICAgVGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIHRoYXQgb2YgYG5leHRBY3Rpb25gIG9yIGB1bmRlZmluZWRgIGlmIGl0IHdhcyBub3RcbiAgIyAgIHByb3ZpZGVkXG4gICNcbiAgIyBSZXR1cm5zIGEge1Byb21pc2V9IHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgc2F2ZSBpcyBjb21wbGV0ZVxuICBzYXZlSXRlbTogKGl0ZW0sIG5leHRBY3Rpb24pID0+XG4gICAgaWYgdHlwZW9mIGl0ZW0/LmdldFVSSSBpcyAnZnVuY3Rpb24nXG4gICAgICBpdGVtVVJJID0gaXRlbS5nZXRVUkkoKVxuICAgIGVsc2UgaWYgdHlwZW9mIGl0ZW0/LmdldFVyaSBpcyAnZnVuY3Rpb24nXG4gICAgICBpdGVtVVJJID0gaXRlbS5nZXRVcmkoKVxuXG4gICAgaWYgaXRlbVVSST9cbiAgICAgIGlmIGl0ZW0uc2F2ZT9cbiAgICAgICAgcHJvbWlzaWZ5IC0+IGl0ZW0uc2F2ZSgpXG4gICAgICAgICAgLnRoZW4gLT4gbmV4dEFjdGlvbj8oKVxuICAgICAgICAgIC5jYXRjaCAoZXJyb3IpID0+XG4gICAgICAgICAgICBpZiBuZXh0QWN0aW9uXG4gICAgICAgICAgICAgIG5leHRBY3Rpb24oZXJyb3IpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIEBoYW5kbGVTYXZlRXJyb3IoZXJyb3IsIGl0ZW0pXG4gICAgICBlbHNlXG4gICAgICAgIG5leHRBY3Rpb24/KClcbiAgICBlbHNlXG4gICAgICBAc2F2ZUl0ZW1BcyhpdGVtLCBuZXh0QWN0aW9uKVxuXG4gICMgUHVibGljOiBQcm9tcHQgdGhlIHVzZXIgZm9yIGEgbG9jYXRpb24gYW5kIHNhdmUgdGhlIGFjdGl2ZSBpdGVtIHdpdGggdGhlXG4gICMgcGF0aCB0aGV5IHNlbGVjdC5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIHNhdmUuXG4gICMgKiBgbmV4dEFjdGlvbmAgKG9wdGlvbmFsKSB7RnVuY3Rpb259IHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggbm8gYXJndW1lbnRcbiAgIyAgIGFmdGVyIHRoZSBpdGVtIGlzIHN1Y2Nlc3NmdWxseSBzYXZlZCwgb3Igd2l0aCB0aGUgZXJyb3IgaWYgaXQgZmFpbGVkLlxuICAjICAgVGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIHRoYXQgb2YgYG5leHRBY3Rpb25gIG9yIGB1bmRlZmluZWRgIGlmIGl0IHdhcyBub3RcbiAgIyAgIHByb3ZpZGVkXG4gIHNhdmVJdGVtQXM6IChpdGVtLCBuZXh0QWN0aW9uKSA9PlxuICAgIHJldHVybiB1bmxlc3MgaXRlbT8uc2F2ZUFzP1xuXG4gICAgc2F2ZU9wdGlvbnMgPSBpdGVtLmdldFNhdmVEaWFsb2dPcHRpb25zPygpID8ge31cbiAgICBzYXZlT3B0aW9ucy5kZWZhdWx0UGF0aCA/PSBpdGVtLmdldFBhdGgoKVxuICAgIG5ld0l0ZW1QYXRoID0gQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2hvd1NhdmVEaWFsb2coc2F2ZU9wdGlvbnMpXG4gICAgaWYgbmV3SXRlbVBhdGhcbiAgICAgIHByb21pc2lmeSAtPiBpdGVtLnNhdmVBcyhuZXdJdGVtUGF0aClcbiAgICAgICAgLnRoZW4gLT4gbmV4dEFjdGlvbj8oKVxuICAgICAgICAuY2F0Y2ggKGVycm9yKSA9PlxuICAgICAgICAgIGlmIG5leHRBY3Rpb24/XG4gICAgICAgICAgICBuZXh0QWN0aW9uKGVycm9yKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBoYW5kbGVTYXZlRXJyb3IoZXJyb3IsIGl0ZW0pXG4gICAgZWxzZSBpZiBuZXh0QWN0aW9uP1xuICAgICAgbmV4dEFjdGlvbihuZXcgU2F2ZUNhbmNlbGxlZEVycm9yKCdTYXZlIENhbmNlbGxlZCcpKVxuXG4gICMgUHVibGljOiBTYXZlIGFsbCBpdGVtcy5cbiAgc2F2ZUl0ZW1zOiAtPlxuICAgIGZvciBpdGVtIGluIEBnZXRJdGVtcygpXG4gICAgICBAc2F2ZUl0ZW0oaXRlbSkgaWYgaXRlbS5pc01vZGlmaWVkPygpXG4gICAgcmV0dXJuXG5cbiAgIyBQdWJsaWM6IFJldHVybiB0aGUgZmlyc3QgaXRlbSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIFVSSSBvciB1bmRlZmluZWQgaWZcbiAgIyBub25lIGV4aXN0cy5cbiAgI1xuICAjICogYHVyaWAge1N0cmluZ30gY29udGFpbmluZyBhIFVSSS5cbiAgaXRlbUZvclVSSTogKHVyaSkgLT5cbiAgICBmaW5kIEBpdGVtcywgKGl0ZW0pIC0+XG4gICAgICBpZiB0eXBlb2YgaXRlbS5nZXRVUkkgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBpdGVtVXJpID0gaXRlbS5nZXRVUkkoKVxuICAgICAgZWxzZSBpZiB0eXBlb2YgaXRlbS5nZXRVcmkgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBpdGVtVXJpID0gaXRlbS5nZXRVcmkoKVxuXG4gICAgICBpdGVtVXJpIGlzIHVyaVxuXG4gICMgUHVibGljOiBBY3RpdmF0ZSB0aGUgZmlyc3QgaXRlbSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIFVSSS5cbiAgI1xuICAjICogYHVyaWAge1N0cmluZ30gY29udGFpbmluZyBhIFVSSS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIGFuIGl0ZW0gbWF0Y2hpbmcgdGhlIFVSSSB3YXMgZm91bmQuXG4gIGFjdGl2YXRlSXRlbUZvclVSSTogKHVyaSkgLT5cbiAgICBpZiBpdGVtID0gQGl0ZW1Gb3JVUkkodXJpKVxuICAgICAgQGFjdGl2YXRlSXRlbShpdGVtKVxuICAgICAgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGZhbHNlXG5cbiAgY29weUFjdGl2ZUl0ZW06IC0+XG4gICAgQGFjdGl2ZUl0ZW0/LmNvcHk/KClcblxuICAjIyNcbiAgU2VjdGlvbjogTGlmZWN5Y2xlXG4gICMjI1xuXG4gICMgUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGUgcGFuZSBpcyBhY3RpdmUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0FjdGl2ZTogLT5cbiAgICBAY29udGFpbmVyPy5nZXRBY3RpdmVQYW5lKCkgaXMgdGhpc1xuXG4gICMgUHVibGljOiBNYWtlcyB0aGlzIHBhbmUgdGhlICphY3RpdmUqIHBhbmUsIGNhdXNpbmcgaXQgdG8gZ2FpbiBmb2N1cy5cbiAgYWN0aXZhdGU6IC0+XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUGFuZSBoYXMgYmVlbiBkZXN0cm95ZWRcIikgaWYgQGlzRGVzdHJveWVkKClcbiAgICBAY29udGFpbmVyPy5kaWRBY3RpdmF0ZVBhbmUodGhpcylcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtYWN0aXZhdGUnXG5cbiAgIyBQdWJsaWM6IENsb3NlIHRoZSBwYW5lIGFuZCBkZXN0cm95IGFsbCBpdHMgaXRlbXMuXG4gICNcbiAgIyBJZiB0aGlzIGlzIHRoZSBsYXN0IHBhbmUsIGFsbCB0aGUgaXRlbXMgd2lsbCBiZSBkZXN0cm95ZWQgYnV0IHRoZSBwYW5lXG4gICMgaXRzZWxmIHdpbGwgbm90IGJlIGRlc3Ryb3llZC5cbiAgZGVzdHJveTogLT5cbiAgICBpZiBAY29udGFpbmVyPy5pc0FsaXZlKCkgYW5kIEBjb250YWluZXIuZ2V0UGFuZXMoKS5sZW5ndGggaXMgMVxuICAgICAgQGRlc3Ryb3lJdGVtcygpXG4gICAgZWxzZVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnd2lsbC1kZXN0cm95J1xuICAgICAgQGFsaXZlID0gZmFsc2VcbiAgICAgIEBjb250YWluZXI/LndpbGxEZXN0cm95UGFuZShwYW5lOiB0aGlzKVxuICAgICAgQGNvbnRhaW5lci5hY3RpdmF0ZU5leHRQYW5lKCkgaWYgQGlzQWN0aXZlKClcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZXN0cm95J1xuICAgICAgQGVtaXR0ZXIuZGlzcG9zZSgpXG4gICAgICBpdGVtLmRlc3Ryb3k/KCkgZm9yIGl0ZW0gaW4gQGl0ZW1zLnNsaWNlKClcbiAgICAgIEBjb250YWluZXI/LmRpZERlc3Ryb3lQYW5lKHBhbmU6IHRoaXMpXG5cbiAgaXNBbGl2ZTogLT4gQGFsaXZlXG5cbiAgIyBQdWJsaWM6IERldGVybWluZSB3aGV0aGVyIHRoaXMgcGFuZSBoYXMgYmVlbiBkZXN0cm95ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0Rlc3Ryb3llZDogLT4gbm90IEBpc0FsaXZlKClcblxuICAjIyNcbiAgU2VjdGlvbjogU3BsaXR0aW5nXG4gICMjI1xuXG4gICMgUHVibGljOiBDcmVhdGUgYSBuZXcgcGFuZSB0byB0aGUgbGVmdCBvZiB0aGlzIHBhbmUuXG4gICNcbiAgIyAqIGBwYXJhbXNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBpdGVtc2AgKG9wdGlvbmFsKSB7QXJyYXl9IG9mIGl0ZW1zIHRvIGFkZCB0byB0aGUgbmV3IHBhbmUuXG4gICMgICAqIGBjb3B5QWN0aXZlSXRlbWAgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gdHJ1ZSB3aWxsIGNvcHkgdGhlIGFjdGl2ZSBpdGVtIGludG8gdGhlIG5ldyBzcGxpdCBwYW5lXG4gICNcbiAgIyBSZXR1cm5zIHRoZSBuZXcge1BhbmV9LlxuICBzcGxpdExlZnQ6IChwYXJhbXMpIC0+XG4gICAgQHNwbGl0KCdob3Jpem9udGFsJywgJ2JlZm9yZScsIHBhcmFtcylcblxuICAjIFB1YmxpYzogQ3JlYXRlIGEgbmV3IHBhbmUgdG8gdGhlIHJpZ2h0IG9mIHRoaXMgcGFuZS5cbiAgI1xuICAjICogYHBhcmFtc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGl0ZW1zYCAob3B0aW9uYWwpIHtBcnJheX0gb2YgaXRlbXMgdG8gYWRkIHRvIHRoZSBuZXcgcGFuZS5cbiAgIyAgICogYGNvcHlBY3RpdmVJdGVtYCAob3B0aW9uYWwpIHtCb29sZWFufSB0cnVlIHdpbGwgY29weSB0aGUgYWN0aXZlIGl0ZW0gaW50byB0aGUgbmV3IHNwbGl0IHBhbmVcbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7UGFuZX0uXG4gIHNwbGl0UmlnaHQ6IChwYXJhbXMpIC0+XG4gICAgQHNwbGl0KCdob3Jpem9udGFsJywgJ2FmdGVyJywgcGFyYW1zKVxuXG4gICMgUHVibGljOiBDcmVhdGVzIGEgbmV3IHBhbmUgYWJvdmUgdGhlIHJlY2VpdmVyLlxuICAjXG4gICMgKiBgcGFyYW1zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgaXRlbXNgIChvcHRpb25hbCkge0FycmF5fSBvZiBpdGVtcyB0byBhZGQgdG8gdGhlIG5ldyBwYW5lLlxuICAjICAgKiBgY29weUFjdGl2ZUl0ZW1gIChvcHRpb25hbCkge0Jvb2xlYW59IHRydWUgd2lsbCBjb3B5IHRoZSBhY3RpdmUgaXRlbSBpbnRvIHRoZSBuZXcgc3BsaXQgcGFuZVxuICAjXG4gICMgUmV0dXJucyB0aGUgbmV3IHtQYW5lfS5cbiAgc3BsaXRVcDogKHBhcmFtcykgLT5cbiAgICBAc3BsaXQoJ3ZlcnRpY2FsJywgJ2JlZm9yZScsIHBhcmFtcylcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIG5ldyBwYW5lIGJlbG93IHRoZSByZWNlaXZlci5cbiAgI1xuICAjICogYHBhcmFtc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGl0ZW1zYCAob3B0aW9uYWwpIHtBcnJheX0gb2YgaXRlbXMgdG8gYWRkIHRvIHRoZSBuZXcgcGFuZS5cbiAgIyAgICogYGNvcHlBY3RpdmVJdGVtYCAob3B0aW9uYWwpIHtCb29sZWFufSB0cnVlIHdpbGwgY29weSB0aGUgYWN0aXZlIGl0ZW0gaW50byB0aGUgbmV3IHNwbGl0IHBhbmVcbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7UGFuZX0uXG4gIHNwbGl0RG93bjogKHBhcmFtcykgLT5cbiAgICBAc3BsaXQoJ3ZlcnRpY2FsJywgJ2FmdGVyJywgcGFyYW1zKVxuXG4gIHNwbGl0OiAob3JpZW50YXRpb24sIHNpZGUsIHBhcmFtcykgLT5cbiAgICBpZiBwYXJhbXM/LmNvcHlBY3RpdmVJdGVtXG4gICAgICBwYXJhbXMuaXRlbXMgPz0gW11cbiAgICAgIHBhcmFtcy5pdGVtcy5wdXNoKEBjb3B5QWN0aXZlSXRlbSgpKVxuXG4gICAgaWYgQHBhcmVudC5vcmllbnRhdGlvbiBpc250IG9yaWVudGF0aW9uXG4gICAgICBAcGFyZW50LnJlcGxhY2VDaGlsZCh0aGlzLCBuZXcgUGFuZUF4aXMoe0Bjb250YWluZXIsIG9yaWVudGF0aW9uLCBjaGlsZHJlbjogW3RoaXNdLCBAZmxleFNjYWxlfSwgQHZpZXdSZWdpc3RyeSkpXG4gICAgICBAc2V0RmxleFNjYWxlKDEpXG5cbiAgICBuZXdQYW5lID0gbmV3IFBhbmUoZXh0ZW5kKHtAYXBwbGljYXRpb25EZWxlZ2F0ZSwgQG5vdGlmaWNhdGlvbk1hbmFnZXIsIEBkZXNlcmlhbGl6ZXJNYW5hZ2VyLCBAY29uZmlnLCBAdmlld1JlZ2lzdHJ5fSwgcGFyYW1zKSlcbiAgICBzd2l0Y2ggc2lkZVxuICAgICAgd2hlbiAnYmVmb3JlJyB0aGVuIEBwYXJlbnQuaW5zZXJ0Q2hpbGRCZWZvcmUodGhpcywgbmV3UGFuZSlcbiAgICAgIHdoZW4gJ2FmdGVyJyB0aGVuIEBwYXJlbnQuaW5zZXJ0Q2hpbGRBZnRlcih0aGlzLCBuZXdQYW5lKVxuXG4gICAgQG1vdmVJdGVtVG9QYW5lKEBhY3RpdmVJdGVtLCBuZXdQYW5lKSBpZiBwYXJhbXM/Lm1vdmVBY3RpdmVJdGVtXG5cbiAgICBuZXdQYW5lLmFjdGl2YXRlKClcbiAgICBuZXdQYW5lXG5cbiAgIyBJZiB0aGUgcGFyZW50IGlzIGEgaG9yaXpvbnRhbCBheGlzLCByZXR1cm5zIGl0cyBmaXJzdCBjaGlsZCBpZiBpdCBpcyBhIHBhbmU7XG4gICMgb3RoZXJ3aXNlIHJldHVybnMgdGhpcyBwYW5lLlxuICBmaW5kTGVmdG1vc3RTaWJsaW5nOiAtPlxuICAgIGlmIEBwYXJlbnQub3JpZW50YXRpb24gaXMgJ2hvcml6b250YWwnXG4gICAgICBbbGVmdG1vc3RTaWJsaW5nXSA9IEBwYXJlbnQuY2hpbGRyZW5cbiAgICAgIGlmIGxlZnRtb3N0U2libGluZyBpbnN0YW5jZW9mIFBhbmVBeGlzXG4gICAgICAgIHRoaXNcbiAgICAgIGVsc2VcbiAgICAgICAgbGVmdG1vc3RTaWJsaW5nXG4gICAgZWxzZVxuICAgICAgdGhpc1xuXG4gIGZpbmRSaWdodG1vc3RTaWJsaW5nOiAtPlxuICAgIGlmIEBwYXJlbnQub3JpZW50YXRpb24gaXMgJ2hvcml6b250YWwnXG4gICAgICByaWdodG1vc3RTaWJsaW5nID0gbGFzdChAcGFyZW50LmNoaWxkcmVuKVxuICAgICAgaWYgcmlnaHRtb3N0U2libGluZyBpbnN0YW5jZW9mIFBhbmVBeGlzXG4gICAgICAgIHRoaXNcbiAgICAgIGVsc2VcbiAgICAgICAgcmlnaHRtb3N0U2libGluZ1xuICAgIGVsc2VcbiAgICAgIHRoaXNcblxuICAjIElmIHRoZSBwYXJlbnQgaXMgYSBob3Jpem9udGFsIGF4aXMsIHJldHVybnMgaXRzIGxhc3QgY2hpbGQgaWYgaXQgaXMgYSBwYW5lO1xuICAjIG90aGVyd2lzZSByZXR1cm5zIGEgbmV3IHBhbmUgY3JlYXRlZCBieSBzcGxpdHRpbmcgdGhpcyBwYW5lIHJpZ2h0d2FyZC5cbiAgZmluZE9yQ3JlYXRlUmlnaHRtb3N0U2libGluZzogLT5cbiAgICByaWdodG1vc3RTaWJsaW5nID0gQGZpbmRSaWdodG1vc3RTaWJsaW5nKClcbiAgICBpZiByaWdodG1vc3RTaWJsaW5nIGlzIHRoaXMgdGhlbiBAc3BsaXRSaWdodCgpIGVsc2UgcmlnaHRtb3N0U2libGluZ1xuXG4gICMgSWYgdGhlIHBhcmVudCBpcyBhIHZlcnRpY2FsIGF4aXMsIHJldHVybnMgaXRzIGZpcnN0IGNoaWxkIGlmIGl0IGlzIGEgcGFuZTtcbiAgIyBvdGhlcndpc2UgcmV0dXJucyB0aGlzIHBhbmUuXG4gIGZpbmRUb3Btb3N0U2libGluZzogLT5cbiAgICBpZiBAcGFyZW50Lm9yaWVudGF0aW9uIGlzICd2ZXJ0aWNhbCdcbiAgICAgIFt0b3Btb3N0U2libGluZ10gPSBAcGFyZW50LmNoaWxkcmVuXG4gICAgICBpZiB0b3Btb3N0U2libGluZyBpbnN0YW5jZW9mIFBhbmVBeGlzXG4gICAgICAgIHRoaXNcbiAgICAgIGVsc2VcbiAgICAgICAgdG9wbW9zdFNpYmxpbmdcbiAgICBlbHNlXG4gICAgICB0aGlzXG5cbiAgZmluZEJvdHRvbW1vc3RTaWJsaW5nOiAtPlxuICAgIGlmIEBwYXJlbnQub3JpZW50YXRpb24gaXMgJ3ZlcnRpY2FsJ1xuICAgICAgYm90dG9tbW9zdFNpYmxpbmcgPSBsYXN0KEBwYXJlbnQuY2hpbGRyZW4pXG4gICAgICBpZiBib3R0b21tb3N0U2libGluZyBpbnN0YW5jZW9mIFBhbmVBeGlzXG4gICAgICAgIHRoaXNcbiAgICAgIGVsc2VcbiAgICAgICAgYm90dG9tbW9zdFNpYmxpbmdcbiAgICBlbHNlXG4gICAgICB0aGlzXG5cbiAgIyBJZiB0aGUgcGFyZW50IGlzIGEgdmVydGljYWwgYXhpcywgcmV0dXJucyBpdHMgbGFzdCBjaGlsZCBpZiBpdCBpcyBhIHBhbmU7XG4gICMgb3RoZXJ3aXNlIHJldHVybnMgYSBuZXcgcGFuZSBjcmVhdGVkIGJ5IHNwbGl0dGluZyB0aGlzIHBhbmUgYm90dG9td2FyZC5cbiAgZmluZE9yQ3JlYXRlQm90dG9tbW9zdFNpYmxpbmc6IC0+XG4gICAgYm90dG9tbW9zdFNpYmxpbmcgPSBAZmluZEJvdHRvbW1vc3RTaWJsaW5nKClcbiAgICBpZiBib3R0b21tb3N0U2libGluZyBpcyB0aGlzIHRoZW4gQHNwbGl0RG93bigpIGVsc2UgYm90dG9tbW9zdFNpYmxpbmdcblxuICAjIFByaXZhdGU6IENsb3NlIHRoZSBwYW5lIHVubGVzcyB0aGUgdXNlciBjYW5jZWxzIHRoZSBhY3Rpb24gdmlhIGEgZGlhbG9nLlxuICAjXG4gICMgUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IHJlc29sdmVzIG9uY2UgdGhlIHBhbmUgaXMgZWl0aGVyIGNsb3NlZCwgb3IgdGhlXG4gICMgY2xvc2luZyBoYXMgYmVlbiBjYW5jZWxsZWQuXG4gIGNsb3NlOiAtPlxuICAgIFByb21pc2UuYWxsKEBnZXRJdGVtcygpLm1hcChAcHJvbXB0VG9TYXZlSXRlbS5iaW5kKHRoaXMpKSkudGhlbiAocmVzdWx0cykgPT5cbiAgICAgIEBkZXN0cm95KCkgdW5sZXNzIHJlc3VsdHMuaW5jbHVkZXMoZmFsc2UpXG5cbiAgaGFuZGxlU2F2ZUVycm9yOiAoZXJyb3IsIGl0ZW0pIC0+XG4gICAgaXRlbVBhdGggPSBlcnJvci5wYXRoID8gaXRlbT8uZ2V0UGF0aD8oKVxuICAgIGFkZFdhcm5pbmdXaXRoUGF0aCA9IChtZXNzYWdlLCBvcHRpb25zKSA9PlxuICAgICAgbWVzc2FnZSA9IFwiI3ttZXNzYWdlfSAnI3tpdGVtUGF0aH0nXCIgaWYgaXRlbVBhdGhcbiAgICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLmFkZFdhcm5pbmcobWVzc2FnZSwgb3B0aW9ucylcblxuICAgIGN1c3RvbU1lc3NhZ2UgPSBAZ2V0TWVzc2FnZUZvckVycm9yQ29kZShlcnJvci5jb2RlKVxuICAgIGlmIGN1c3RvbU1lc3NhZ2U/XG4gICAgICBhZGRXYXJuaW5nV2l0aFBhdGgoXCJVbmFibGUgdG8gc2F2ZSBmaWxlOiAje2N1c3RvbU1lc3NhZ2V9XCIpXG4gICAgZWxzZSBpZiBlcnJvci5jb2RlIGlzICdFSVNESVInIG9yIGVycm9yLm1lc3NhZ2U/LmVuZHNXaXRoPygnaXMgYSBkaXJlY3RvcnknKVxuICAgICAgQG5vdGlmaWNhdGlvbk1hbmFnZXIuYWRkV2FybmluZyhcIlVuYWJsZSB0byBzYXZlIGZpbGU6ICN7ZXJyb3IubWVzc2FnZX1cIilcbiAgICBlbHNlIGlmIGVycm9yLmNvZGUgaW4gWydFUEVSTScsICdFQlVTWScsICdVTktOT1dOJywgJ0VFWElTVCcsICdFTE9PUCcsICdFQUdBSU4nXVxuICAgICAgYWRkV2FybmluZ1dpdGhQYXRoKCdVbmFibGUgdG8gc2F2ZSBmaWxlJywgZGV0YWlsOiBlcnJvci5tZXNzYWdlKVxuICAgIGVsc2UgaWYgZXJyb3JNYXRjaCA9IC9FTk9URElSLCBub3QgYSBkaXJlY3RvcnkgJyhbXiddKyknLy5leGVjKGVycm9yLm1lc3NhZ2UpXG4gICAgICBmaWxlTmFtZSA9IGVycm9yTWF0Y2hbMV1cbiAgICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLmFkZFdhcm5pbmcoXCJVbmFibGUgdG8gc2F2ZSBmaWxlOiBBIGRpcmVjdG9yeSBpbiB0aGUgcGF0aCAnI3tmaWxlTmFtZX0nIGNvdWxkIG5vdCBiZSB3cml0dGVuIHRvXCIpXG4gICAgZWxzZVxuICAgICAgdGhyb3cgZXJyb3JcblxuICBnZXRNZXNzYWdlRm9yRXJyb3JDb2RlOiAoZXJyb3JDb2RlKSAtPlxuICAgIHN3aXRjaCBlcnJvckNvZGVcbiAgICAgIHdoZW4gJ0VBQ0NFUycgdGhlbiAnUGVybWlzc2lvbiBkZW5pZWQnXG4gICAgICB3aGVuICdFQ09OTlJFU0VUJyB0aGVuICdDb25uZWN0aW9uIHJlc2V0J1xuICAgICAgd2hlbiAnRUlOVFInIHRoZW4gJ0ludGVycnVwdGVkIHN5c3RlbSBjYWxsJ1xuICAgICAgd2hlbiAnRUlPJyB0aGVuICdJL08gZXJyb3Igd3JpdGluZyBmaWxlJ1xuICAgICAgd2hlbiAnRU5PU1BDJyB0aGVuICdObyBzcGFjZSBsZWZ0IG9uIGRldmljZSdcbiAgICAgIHdoZW4gJ0VOT1RTVVAnIHRoZW4gJ09wZXJhdGlvbiBub3Qgc3VwcG9ydGVkIG9uIHNvY2tldCdcbiAgICAgIHdoZW4gJ0VOWElPJyB0aGVuICdObyBzdWNoIGRldmljZSBvciBhZGRyZXNzJ1xuICAgICAgd2hlbiAnRVJPRlMnIHRoZW4gJ1JlYWQtb25seSBmaWxlIHN5c3RlbSdcbiAgICAgIHdoZW4gJ0VTUElQRScgdGhlbiAnSW52YWxpZCBzZWVrJ1xuICAgICAgd2hlbiAnRVRJTUVET1VUJyB0aGVuICdDb25uZWN0aW9uIHRpbWVkIG91dCdcblxucHJvbWlzaWZ5ID0gKGNhbGxiYWNrKSAtPlxuICB0cnlcbiAgICBQcm9taXNlLnJlc29sdmUoY2FsbGJhY2soKSlcbiAgY2F0Y2ggZXJyb3JcbiAgICBQcm9taXNlLnJlamVjdChlcnJvcikiXX0=
