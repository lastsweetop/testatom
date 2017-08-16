(function() {
  var CompositeDisposable, Cursor, DecorationManager, Disposable, Emitter, Grim, GutterContainer, LanguageMode, MAX_SCREEN_LINE_LENGTH, Model, Point, Range, Selection, TextBuffer, TextEditor, TextEditorComponent, TextEditorElement, TextMateScopeSelector, TokenizedBuffer, ZERO_WIDTH_NBSP, _, fs, isDoubleWidthCharacter, isHalfWidthCharacter, isKoreanCharacter, isWrapBoundary, path, ref, ref1, ref2,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice;

  _ = require('underscore-plus');

  path = require('path');

  fs = require('fs-plus');

  Grim = require('grim');

  ref = require('event-kit'), CompositeDisposable = ref.CompositeDisposable, Disposable = ref.Disposable, Emitter = ref.Emitter;

  ref1 = TextBuffer = require('text-buffer'), Point = ref1.Point, Range = ref1.Range;

  LanguageMode = require('./language-mode');

  DecorationManager = require('./decoration-manager');

  TokenizedBuffer = require('./tokenized-buffer');

  Cursor = require('./cursor');

  Model = require('./model');

  Selection = require('./selection');

  TextMateScopeSelector = require('first-mate').ScopeSelector;

  GutterContainer = require('./gutter-container');

  TextEditorComponent = null;

  TextEditorElement = null;

  ref2 = require('./text-utils'), isDoubleWidthCharacter = ref2.isDoubleWidthCharacter, isHalfWidthCharacter = ref2.isHalfWidthCharacter, isKoreanCharacter = ref2.isKoreanCharacter, isWrapBoundary = ref2.isWrapBoundary;

  ZERO_WIDTH_NBSP = '\ufeff';

  MAX_SCREEN_LINE_LENGTH = 500;

  module.exports = TextEditor = (function(superClass) {
    extend(TextEditor, superClass);

    TextEditor.setClipboard = function(clipboard) {
      return this.clipboard = clipboard;
    };

    TextEditor.setScheduler = function(scheduler) {
      if (TextEditorComponent == null) {
        TextEditorComponent = require('./text-editor-component');
      }
      return TextEditorComponent.setScheduler(scheduler);
    };

    TextEditor.didUpdateStyles = function() {
      if (TextEditorComponent == null) {
        TextEditorComponent = require('./text-editor-component');
      }
      return TextEditorComponent.didUpdateStyles();
    };

    TextEditor.didUpdateScrollbarStyles = function() {
      if (TextEditorComponent == null) {
        TextEditorComponent = require('./text-editor-component');
      }
      return TextEditorComponent.didUpdateScrollbarStyles();
    };

    TextEditor.viewForItem = function(item) {
      var ref3;
      return (ref3 = item.element) != null ? ref3 : item;
    };

    TextEditor.prototype.serializationVersion = 1;

    TextEditor.prototype.buffer = null;

    TextEditor.prototype.languageMode = null;

    TextEditor.prototype.cursors = null;

    TextEditor.prototype.showCursorOnSelection = null;

    TextEditor.prototype.selections = null;

    TextEditor.prototype.suppressSelectionMerging = false;

    TextEditor.prototype.selectionFlashDuration = 500;

    TextEditor.prototype.gutterContainer = null;

    TextEditor.prototype.editorElement = null;

    TextEditor.prototype.verticalScrollMargin = 2;

    TextEditor.prototype.horizontalScrollMargin = 6;

    TextEditor.prototype.softWrapped = null;

    TextEditor.prototype.editorWidthInChars = null;

    TextEditor.prototype.lineHeightInPixels = null;

    TextEditor.prototype.defaultCharWidth = null;

    TextEditor.prototype.height = null;

    TextEditor.prototype.width = null;

    TextEditor.prototype.registered = false;

    TextEditor.prototype.atomicSoftTabs = true;

    TextEditor.prototype.invisibles = null;

    TextEditor.prototype.scrollSensitivity = 40;

    Object.defineProperty(TextEditor.prototype, "element", {
      get: function() {
        return this.getElement();
      }
    });

    Object.defineProperty(TextEditor.prototype, "editorElement", {
      get: function() {
        Grim.deprecate("`TextEditor.prototype.editorElement` has always been private, but now\nit is gone. Reading the `editorElement` property still returns a\nreference to the editor element but this field will be removed in a\nlater version of Atom, so we recommend using the `element` property instead.");
        return this.getElement();
      }
    });

    Object.defineProperty(TextEditor.prototype, 'displayBuffer', {
      get: function() {
        Grim.deprecate("`TextEditor.prototype.displayBuffer` has always been private, but now\nit is gone. Reading the `displayBuffer` property now returns a reference\nto the containing `TextEditor`, which now provides *some* of the API of\nthe defunct `DisplayBuffer` class.");
        return this;
      }
    });

    TextEditor.deserialize = function(state, atomEnvironment) {
      var disposable, editor, error;
      if (state.version !== this.prototype.serializationVersion && (state.displayBuffer != null)) {
        state.tokenizedBuffer = state.displayBuffer.tokenizedBuffer;
      }
      try {
        state.tokenizedBuffer = TokenizedBuffer.deserialize(state.tokenizedBuffer, atomEnvironment);
        state.tabLength = state.tokenizedBuffer.getTabLength();
      } catch (error1) {
        error = error1;
        if (error.syscall === 'read') {
          return;
        } else {
          throw error;
        }
      }
      state.buffer = state.tokenizedBuffer.buffer;
      state.assert = atomEnvironment.assert.bind(atomEnvironment);
      editor = new this(state);
      if (state.registered) {
        disposable = atomEnvironment.textEditors.add(editor);
        editor.onDidDestroy(function() {
          return disposable.dispose();
        });
      }
      return editor;
    };

    function TextEditor(params) {
      var displayLayerParams, grammar, initialColumn, initialLine, l, len, lineNumberGutterVisible, marker, ref3, ref4, ref5, suppressCursorCreation, tabLength;
      if (params == null) {
        params = {};
      }
      this.doBackgroundWork = bind(this.doBackgroundWork, this);
      if (this.constructor.clipboard == null) {
        throw new Error("Must call TextEditor.setClipboard at least once before creating TextEditor instances");
      }
      TextEditor.__super__.constructor.apply(this, arguments);
      this.softTabs = params.softTabs, this.initialScrollTopRow = params.initialScrollTopRow, this.initialScrollLeftColumn = params.initialScrollLeftColumn, initialLine = params.initialLine, initialColumn = params.initialColumn, tabLength = params.tabLength, this.softWrapped = params.softWrapped, this.decorationManager = params.decorationManager, this.selectionsMarkerLayer = params.selectionsMarkerLayer, this.buffer = params.buffer, suppressCursorCreation = params.suppressCursorCreation, this.mini = params.mini, this.placeholderText = params.placeholderText, lineNumberGutterVisible = params.lineNumberGutterVisible, this.showLineNumbers = params.showLineNumbers, this.largeFileMode = params.largeFileMode, this.assert = params.assert, grammar = params.grammar, this.showInvisibles = params.showInvisibles, this.autoHeight = params.autoHeight, this.autoWidth = params.autoWidth, this.scrollPastEnd = params.scrollPastEnd, this.editorWidthInChars = params.editorWidthInChars, this.tokenizedBuffer = params.tokenizedBuffer, this.displayLayer = params.displayLayer, this.invisibles = params.invisibles, this.showIndentGuide = params.showIndentGuide, this.softWrapped = params.softWrapped, this.softWrapAtPreferredLineLength = params.softWrapAtPreferredLineLength, this.preferredLineLength = params.preferredLineLength, this.showCursorOnSelection = params.showCursorOnSelection;
      if (this.assert == null) {
        this.assert = function(condition) {
          return condition;
        };
      }
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.cursors = [];
      this.cursorsByMarkerId = new Map;
      this.selections = [];
      this.hasTerminatedPendingState = false;
      if (this.mini == null) {
        this.mini = false;
      }
      if (this.scrollPastEnd == null) {
        this.scrollPastEnd = false;
      }
      if (this.showInvisibles == null) {
        this.showInvisibles = true;
      }
      if (this.softTabs == null) {
        this.softTabs = true;
      }
      if (tabLength == null) {
        tabLength = 2;
      }
      if (this.autoIndent == null) {
        this.autoIndent = true;
      }
      if (this.autoIndentOnPaste == null) {
        this.autoIndentOnPaste = true;
      }
      if (this.showCursorOnSelection == null) {
        this.showCursorOnSelection = true;
      }
      if (this.undoGroupingInterval == null) {
        this.undoGroupingInterval = 300;
      }
      if (this.nonWordCharacters == null) {
        this.nonWordCharacters = "/\\()\"':,.;<>~!@#$%^&*|+=[]{}`?-…";
      }
      if (this.softWrapped == null) {
        this.softWrapped = false;
      }
      if (this.softWrapAtPreferredLineLength == null) {
        this.softWrapAtPreferredLineLength = false;
      }
      if (this.preferredLineLength == null) {
        this.preferredLineLength = 80;
      }
      if (this.showLineNumbers == null) {
        this.showLineNumbers = true;
      }
      if (this.buffer == null) {
        this.buffer = new TextBuffer({
          shouldDestroyOnFileDelete: function() {
            return atom.config.get('core.closeDeletedFileTabs');
          }
        });
      }
      if (this.tokenizedBuffer == null) {
        this.tokenizedBuffer = new TokenizedBuffer({
          grammar: grammar,
          tabLength: tabLength,
          buffer: this.buffer,
          largeFileMode: this.largeFileMode,
          assert: this.assert
        });
      }
      if (this.displayLayer == null) {
        displayLayerParams = {
          invisibles: this.getInvisibles(),
          softWrapColumn: this.getSoftWrapColumn(),
          showIndentGuides: this.doesShowIndentGuide(),
          atomicSoftTabs: (ref3 = params.atomicSoftTabs) != null ? ref3 : true,
          tabLength: tabLength,
          ratioForCharacter: this.ratioForCharacter.bind(this),
          isWrapBoundary: isWrapBoundary,
          foldCharacter: ZERO_WIDTH_NBSP,
          softWrapHangingIndent: (ref4 = params.softWrapHangingIndentLength) != null ? ref4 : 0
        };
        if (this.displayLayer = this.buffer.getDisplayLayer(params.displayLayerId)) {
          this.displayLayer.reset(displayLayerParams);
          this.selectionsMarkerLayer = this.displayLayer.getMarkerLayer(params.selectionsMarkerLayerId);
        } else {
          this.displayLayer = this.buffer.addDisplayLayer(displayLayerParams);
        }
      }
      this.backgroundWorkHandle = requestIdleCallback(this.doBackgroundWork);
      this.disposables.add(new Disposable((function(_this) {
        return function() {
          if (_this.backgroundWorkHandle != null) {
            return cancelIdleCallback(_this.backgroundWorkHandle);
          }
        };
      })(this)));
      this.displayLayer.setTextDecorationLayer(this.tokenizedBuffer);
      this.defaultMarkerLayer = this.displayLayer.addMarkerLayer();
      this.disposables.add(this.defaultMarkerLayer.onDidDestroy((function(_this) {
        return function() {
          return _this.assert(false, "defaultMarkerLayer destroyed at an unexpected time");
        };
      })(this)));
      if (this.selectionsMarkerLayer == null) {
        this.selectionsMarkerLayer = this.addMarkerLayer({
          maintainHistory: true,
          persistent: true
        });
      }
      this.selectionsMarkerLayer.trackDestructionInOnDidCreateMarkerCallbacks = true;
      this.decorationManager = new DecorationManager(this);
      this.decorateMarkerLayer(this.selectionsMarkerLayer, {
        type: 'cursor'
      });
      if (!this.isMini()) {
        this.decorateCursorLine();
      }
      this.decorateMarkerLayer(this.displayLayer.foldsMarkerLayer, {
        type: 'line-number',
        "class": 'folded'
      });
      ref5 = this.selectionsMarkerLayer.getMarkers();
      for (l = 0, len = ref5.length; l < len; l++) {
        marker = ref5[l];
        this.addSelection(marker);
      }
      this.subscribeToBuffer();
      this.subscribeToDisplayLayer();
      if (this.cursors.length === 0 && !suppressCursorCreation) {
        initialLine = Math.max(parseInt(initialLine) || 0, 0);
        initialColumn = Math.max(parseInt(initialColumn) || 0, 0);
        this.addCursorAtBufferPosition([initialLine, initialColumn]);
      }
      this.languageMode = new LanguageMode(this);
      this.gutterContainer = new GutterContainer(this);
      this.lineNumberGutter = this.gutterContainer.addGutter({
        name: 'line-number',
        priority: 0,
        visible: lineNumberGutterVisible
      });
    }

    TextEditor.prototype.decorateCursorLine = function() {
      return this.cursorLineDecorations = [
        this.decorateMarkerLayer(this.selectionsMarkerLayer, {
          type: 'line',
          "class": 'cursor-line',
          onlyEmpty: true
        }), this.decorateMarkerLayer(this.selectionsMarkerLayer, {
          type: 'line-number',
          "class": 'cursor-line'
        }), this.decorateMarkerLayer(this.selectionsMarkerLayer, {
          type: 'line-number',
          "class": 'cursor-line-no-selection',
          onlyHead: true,
          onlyEmpty: true
        })
      ];
    };

    TextEditor.prototype.doBackgroundWork = function(deadline) {
      var previousLongestRow, ref3;
      previousLongestRow = this.getApproximateLongestScreenRow();
      if (this.displayLayer.doBackgroundWork(deadline)) {
        this.backgroundWorkHandle = requestIdleCallback(this.doBackgroundWork);
      } else {
        this.backgroundWorkHandle = null;
      }
      if (this.getApproximateLongestScreenRow() !== previousLongestRow) {
        return (ref3 = this.component) != null ? ref3.scheduleUpdate() : void 0;
      }
    };

    TextEditor.prototype.update = function(params) {
      var decoration, displayLayerParams, l, len, len1, m, param, ref3, ref4, ref5, ref6, ref7, ref8, value;
      displayLayerParams = {};
      ref3 = Object.keys(params);
      for (l = 0, len = ref3.length; l < len; l++) {
        param = ref3[l];
        value = params[param];
        switch (param) {
          case 'autoIndent':
            this.autoIndent = value;
            break;
          case 'autoIndentOnPaste':
            this.autoIndentOnPaste = value;
            break;
          case 'undoGroupingInterval':
            this.undoGroupingInterval = value;
            break;
          case 'nonWordCharacters':
            this.nonWordCharacters = value;
            break;
          case 'scrollSensitivity':
            this.scrollSensitivity = value;
            break;
          case 'encoding':
            this.buffer.setEncoding(value);
            break;
          case 'softTabs':
            if (value !== this.softTabs) {
              this.softTabs = value;
            }
            break;
          case 'atomicSoftTabs':
            if (value !== this.displayLayer.atomicSoftTabs) {
              displayLayerParams.atomicSoftTabs = value;
            }
            break;
          case 'tabLength':
            if ((value != null) && value !== this.tokenizedBuffer.getTabLength()) {
              this.tokenizedBuffer.setTabLength(value);
              displayLayerParams.tabLength = value;
            }
            break;
          case 'softWrapped':
            if (value !== this.softWrapped) {
              this.softWrapped = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
              this.emitter.emit('did-change-soft-wrapped', this.isSoftWrapped());
            }
            break;
          case 'softWrapHangingIndentLength':
            if (value !== this.displayLayer.softWrapHangingIndent) {
              displayLayerParams.softWrapHangingIndent = value;
            }
            break;
          case 'softWrapAtPreferredLineLength':
            if (value !== this.softWrapAtPreferredLineLength) {
              this.softWrapAtPreferredLineLength = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'preferredLineLength':
            if (value !== this.preferredLineLength) {
              this.preferredLineLength = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'mini':
            if (value !== this.mini) {
              this.mini = value;
              this.emitter.emit('did-change-mini', value);
              displayLayerParams.invisibles = this.getInvisibles();
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
              displayLayerParams.showIndentGuides = this.doesShowIndentGuide();
              if (this.mini) {
                ref4 = this.cursorLineDecorations;
                for (m = 0, len1 = ref4.length; m < len1; m++) {
                  decoration = ref4[m];
                  decoration.destroy();
                }
                this.cursorLineDecorations = null;
              } else {
                this.decorateCursorLine();
              }
              if ((ref5 = this.component) != null) {
                ref5.scheduleUpdate();
              }
            }
            break;
          case 'placeholderText':
            if (value !== this.placeholderText) {
              this.placeholderText = value;
              this.emitter.emit('did-change-placeholder-text', value);
            }
            break;
          case 'lineNumberGutterVisible':
            if (value !== this.lineNumberGutterVisible) {
              if (value) {
                this.lineNumberGutter.show();
              } else {
                this.lineNumberGutter.hide();
              }
              this.emitter.emit('did-change-line-number-gutter-visible', this.lineNumberGutter.isVisible());
            }
            break;
          case 'showIndentGuide':
            if (value !== this.showIndentGuide) {
              this.showIndentGuide = value;
              displayLayerParams.showIndentGuides = this.doesShowIndentGuide();
            }
            break;
          case 'showLineNumbers':
            if (value !== this.showLineNumbers) {
              this.showLineNumbers = value;
              if ((ref6 = this.component) != null) {
                ref6.scheduleUpdate();
              }
            }
            break;
          case 'showInvisibles':
            if (value !== this.showInvisibles) {
              this.showInvisibles = value;
              displayLayerParams.invisibles = this.getInvisibles();
            }
            break;
          case 'invisibles':
            if (!_.isEqual(value, this.invisibles)) {
              this.invisibles = value;
              displayLayerParams.invisibles = this.getInvisibles();
            }
            break;
          case 'editorWidthInChars':
            if (value > 0 && value !== this.editorWidthInChars) {
              this.editorWidthInChars = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'width':
            if (value !== this.width) {
              this.width = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'scrollPastEnd':
            if (value !== this.scrollPastEnd) {
              this.scrollPastEnd = value;
              if ((ref7 = this.component) != null) {
                ref7.scheduleUpdate();
              }
            }
            break;
          case 'autoHeight':
            if (value !== this.autoHeight) {
              this.autoHeight = value;
            }
            break;
          case 'autoWidth':
            if (value !== this.autoWidth) {
              this.autoWidth = value;
            }
            break;
          case 'showCursorOnSelection':
            if (value !== this.showCursorOnSelection) {
              this.showCursorOnSelection = value;
              if ((ref8 = this.component) != null) {
                ref8.scheduleUpdate();
              }
            }
            break;
          default:
            if (param !== 'ref' && param !== 'key') {
              throw new TypeError("Invalid TextEditor parameter: '" + param + "'");
            }
        }
      }
      this.displayLayer.reset(displayLayerParams);
      if (this.component != null) {
        return this.component.getNextUpdatePromise();
      } else {
        return Promise.resolve();
      }
    };

    TextEditor.prototype.scheduleComponentUpdate = function() {
      var ref3;
      return (ref3 = this.component) != null ? ref3.scheduleUpdate() : void 0;
    };

    TextEditor.prototype.serialize = function() {
      var tokenizedBufferState;
      tokenizedBufferState = this.tokenizedBuffer.serialize();
      return {
        deserializer: 'TextEditor',
        version: this.serializationVersion,
        displayBuffer: {
          tokenizedBuffer: tokenizedBufferState
        },
        tokenizedBuffer: tokenizedBufferState,
        displayLayerId: this.displayLayer.id,
        selectionsMarkerLayerId: this.selectionsMarkerLayer.id,
        initialScrollTopRow: this.getScrollTopRow(),
        initialScrollLeftColumn: this.getScrollLeftColumn(),
        atomicSoftTabs: this.displayLayer.atomicSoftTabs,
        softWrapHangingIndentLength: this.displayLayer.softWrapHangingIndent,
        id: this.id,
        softTabs: this.softTabs,
        softWrapped: this.softWrapped,
        softWrapAtPreferredLineLength: this.softWrapAtPreferredLineLength,
        preferredLineLength: this.preferredLineLength,
        mini: this.mini,
        editorWidthInChars: this.editorWidthInChars,
        width: this.width,
        largeFileMode: this.largeFileMode,
        registered: this.registered,
        invisibles: this.invisibles,
        showInvisibles: this.showInvisibles,
        showIndentGuide: this.showIndentGuide,
        autoHeight: this.autoHeight,
        autoWidth: this.autoWidth
      };
    };

    TextEditor.prototype.subscribeToBuffer = function() {
      this.buffer.retain();
      this.disposables.add(this.buffer.onDidChangePath((function(_this) {
        return function() {
          _this.emitter.emit('did-change-title', _this.getTitle());
          return _this.emitter.emit('did-change-path', _this.getPath());
        };
      })(this)));
      this.disposables.add(this.buffer.onDidChangeEncoding((function(_this) {
        return function() {
          return _this.emitter.emit('did-change-encoding', _this.getEncoding());
        };
      })(this)));
      this.disposables.add(this.buffer.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this)));
      return this.disposables.add(this.buffer.onDidChangeModified((function(_this) {
        return function() {
          if (!_this.hasTerminatedPendingState && _this.buffer.isModified()) {
            return _this.terminatePendingState();
          }
        };
      })(this)));
    };

    TextEditor.prototype.terminatePendingState = function() {
      if (!this.hasTerminatedPendingState) {
        this.emitter.emit('did-terminate-pending-state');
      }
      return this.hasTerminatedPendingState = true;
    };

    TextEditor.prototype.onDidTerminatePendingState = function(callback) {
      return this.emitter.on('did-terminate-pending-state', callback);
    };

    TextEditor.prototype.subscribeToDisplayLayer = function() {
      this.disposables.add(this.tokenizedBuffer.onDidChangeGrammar(this.handleGrammarChange.bind(this)));
      this.disposables.add(this.displayLayer.onDidChangeSync((function(_this) {
        return function(e) {
          var ref3;
          _this.mergeIntersectingSelections();
          if ((ref3 = _this.component) != null) {
            ref3.didChangeDisplayLayer(e);
          }
          return _this.emitter.emit('did-change', e);
        };
      })(this)));
      this.disposables.add(this.displayLayer.onDidReset((function(_this) {
        return function() {
          var ref3;
          _this.mergeIntersectingSelections();
          if ((ref3 = _this.component) != null) {
            ref3.didResetDisplayLayer();
          }
          return _this.emitter.emit('did-change', {});
        };
      })(this)));
      this.disposables.add(this.selectionsMarkerLayer.onDidCreateMarker(this.addSelection.bind(this)));
      return this.disposables.add(this.selectionsMarkerLayer.onDidUpdate((function(_this) {
        return function() {
          var ref3;
          return (ref3 = _this.component) != null ? ref3.didUpdateSelections() : void 0;
        };
      })(this)));
    };

    TextEditor.prototype.destroyed = function() {
      var l, len, ref3, ref4, selection;
      this.disposables.dispose();
      this.displayLayer.destroy();
      this.tokenizedBuffer.destroy();
      ref3 = this.selections.slice();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.destroy();
      }
      this.buffer.release();
      this.languageMode.destroy();
      this.gutterContainer.destroy();
      this.emitter.emit('did-destroy');
      this.emitter.clear();
      if ((ref4 = this.component) != null) {
        ref4.element.component = null;
      }
      this.component = null;
      return this.lineNumberGutter.element = null;
    };


    /*
    Section: Event Subscription
     */

    TextEditor.prototype.onDidChangeTitle = function(callback) {
      return this.emitter.on('did-change-title', callback);
    };

    TextEditor.prototype.onDidChangePath = function(callback) {
      return this.emitter.on('did-change-path', callback);
    };

    TextEditor.prototype.onDidChange = function(callback) {
      return this.emitter.on('did-change', callback);
    };

    TextEditor.prototype.onDidStopChanging = function(callback) {
      return this.getBuffer().onDidStopChanging(callback);
    };

    TextEditor.prototype.onDidChangeCursorPosition = function(callback) {
      return this.emitter.on('did-change-cursor-position', callback);
    };

    TextEditor.prototype.onDidChangeSelectionRange = function(callback) {
      return this.emitter.on('did-change-selection-range', callback);
    };

    TextEditor.prototype.onDidChangeSoftWrapped = function(callback) {
      return this.emitter.on('did-change-soft-wrapped', callback);
    };

    TextEditor.prototype.onDidChangeEncoding = function(callback) {
      return this.emitter.on('did-change-encoding', callback);
    };

    TextEditor.prototype.observeGrammar = function(callback) {
      callback(this.getGrammar());
      return this.onDidChangeGrammar(callback);
    };

    TextEditor.prototype.onDidChangeGrammar = function(callback) {
      return this.emitter.on('did-change-grammar', callback);
    };

    TextEditor.prototype.onDidChangeModified = function(callback) {
      return this.getBuffer().onDidChangeModified(callback);
    };

    TextEditor.prototype.onDidConflict = function(callback) {
      return this.getBuffer().onDidConflict(callback);
    };

    TextEditor.prototype.onWillInsertText = function(callback) {
      return this.emitter.on('will-insert-text', callback);
    };

    TextEditor.prototype.onDidInsertText = function(callback) {
      return this.emitter.on('did-insert-text', callback);
    };

    TextEditor.prototype.onDidSave = function(callback) {
      return this.getBuffer().onDidSave(callback);
    };

    TextEditor.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    TextEditor.prototype.observeCursors = function(callback) {
      var cursor, l, len, ref3;
      ref3 = this.getCursors();
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        callback(cursor);
      }
      return this.onDidAddCursor(callback);
    };

    TextEditor.prototype.onDidAddCursor = function(callback) {
      return this.emitter.on('did-add-cursor', callback);
    };

    TextEditor.prototype.onDidRemoveCursor = function(callback) {
      return this.emitter.on('did-remove-cursor', callback);
    };

    TextEditor.prototype.observeSelections = function(callback) {
      var l, len, ref3, selection;
      ref3 = this.getSelections();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        callback(selection);
      }
      return this.onDidAddSelection(callback);
    };

    TextEditor.prototype.onDidAddSelection = function(callback) {
      return this.emitter.on('did-add-selection', callback);
    };

    TextEditor.prototype.onDidRemoveSelection = function(callback) {
      return this.emitter.on('did-remove-selection', callback);
    };

    TextEditor.prototype.observeDecorations = function(callback) {
      return this.decorationManager.observeDecorations(callback);
    };

    TextEditor.prototype.onDidAddDecoration = function(callback) {
      return this.decorationManager.onDidAddDecoration(callback);
    };

    TextEditor.prototype.onDidRemoveDecoration = function(callback) {
      return this.decorationManager.onDidRemoveDecoration(callback);
    };

    TextEditor.prototype.didAddDecoration = function(decoration) {
      var ref3;
      if (decoration.isType('block')) {
        return (ref3 = this.component) != null ? ref3.didAddBlockDecoration(decoration) : void 0;
      }
    };

    TextEditor.prototype.onDidChangePlaceholderText = function(callback) {
      return this.emitter.on('did-change-placeholder-text', callback);
    };

    TextEditor.prototype.onDidChangeScrollTop = function(callback) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::onDidChangeScrollTop instead.");
      return this.getElement().onDidChangeScrollTop(callback);
    };

    TextEditor.prototype.onDidChangeScrollLeft = function(callback) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::onDidChangeScrollLeft instead.");
      return this.getElement().onDidChangeScrollLeft(callback);
    };

    TextEditor.prototype.onDidRequestAutoscroll = function(callback) {
      return this.emitter.on('did-request-autoscroll', callback);
    };

    TextEditor.prototype.onDidChangeIcon = function(callback) {
      return this.emitter.on('did-change-icon', callback);
    };

    TextEditor.prototype.onDidUpdateDecorations = function(callback) {
      return this.decorationManager.onDidUpdateDecorations(callback);
    };

    TextEditor.prototype.getBuffer = function() {
      return this.buffer;
    };

    TextEditor.prototype.getURI = function() {
      return this.buffer.getUri();
    };

    TextEditor.prototype.copy = function() {
      var displayLayer, selectionsMarkerLayer, softTabs;
      displayLayer = this.displayLayer.copy();
      selectionsMarkerLayer = displayLayer.getMarkerLayer(this.buffer.getMarkerLayer(this.selectionsMarkerLayer.id).copy().id);
      softTabs = this.getSoftTabs();
      return new TextEditor({
        buffer: this.buffer,
        selectionsMarkerLayer: selectionsMarkerLayer,
        softTabs: softTabs,
        suppressCursorCreation: true,
        tabLength: this.tokenizedBuffer.getTabLength(),
        initialScrollTopRow: this.getScrollTopRow(),
        initialScrollLeftColumn: this.getScrollLeftColumn(),
        assert: this.assert,
        displayLayer: displayLayer,
        grammar: this.getGrammar(),
        autoWidth: this.autoWidth,
        autoHeight: this.autoHeight,
        showCursorOnSelection: this.showCursorOnSelection
      });
    };

    TextEditor.prototype.setVisible = function(visible) {
      return this.tokenizedBuffer.setVisible(visible);
    };

    TextEditor.prototype.setMini = function(mini) {
      this.update({
        mini: mini
      });
      return this.mini;
    };

    TextEditor.prototype.isMini = function() {
      return this.mini;
    };

    TextEditor.prototype.onDidChangeMini = function(callback) {
      return this.emitter.on('did-change-mini', callback);
    };

    TextEditor.prototype.setLineNumberGutterVisible = function(lineNumberGutterVisible) {
      return this.update({
        lineNumberGutterVisible: lineNumberGutterVisible
      });
    };

    TextEditor.prototype.isLineNumberGutterVisible = function() {
      return this.lineNumberGutter.isVisible();
    };

    TextEditor.prototype.onDidChangeLineNumberGutterVisible = function(callback) {
      return this.emitter.on('did-change-line-number-gutter-visible', callback);
    };

    TextEditor.prototype.observeGutters = function(callback) {
      return this.gutterContainer.observeGutters(callback);
    };

    TextEditor.prototype.onDidAddGutter = function(callback) {
      return this.gutterContainer.onDidAddGutter(callback);
    };

    TextEditor.prototype.onDidRemoveGutter = function(callback) {
      return this.gutterContainer.onDidRemoveGutter(callback);
    };

    TextEditor.prototype.setEditorWidthInChars = function(editorWidthInChars) {
      return this.update({
        editorWidthInChars: editorWidthInChars
      });
    };

    TextEditor.prototype.getEditorWidthInChars = function() {
      if ((this.width != null) && this.defaultCharWidth > 0) {
        return Math.max(0, Math.floor(this.width / this.defaultCharWidth));
      } else {
        return this.editorWidthInChars;
      }
    };


    /*
    Section: File Details
     */

    TextEditor.prototype.getTitle = function() {
      var ref3;
      return (ref3 = this.getFileName()) != null ? ref3 : 'untitled';
    };

    TextEditor.prototype.getLongTitle = function() {
      var allPathSegments, commonBase, directoryPath, fileName, firstSegment, l, len, len1, m, ourPathSegments, pathSegments, ref3, textEditor;
      if (this.getPath()) {
        fileName = this.getFileName();
        allPathSegments = [];
        ref3 = atom.workspace.getTextEditors();
        for (l = 0, len = ref3.length; l < len; l++) {
          textEditor = ref3[l];
          if (textEditor !== this) {
            if (textEditor.getFileName() === fileName) {
              directoryPath = fs.tildify(textEditor.getDirectoryPath());
              allPathSegments.push(directoryPath.split(path.sep));
            }
          }
        }
        if (allPathSegments.length === 0) {
          return fileName;
        }
        ourPathSegments = fs.tildify(this.getDirectoryPath()).split(path.sep);
        allPathSegments.push(ourPathSegments);
        while (true) {
          firstSegment = ourPathSegments[0];
          commonBase = _.all(allPathSegments, function(pathSegments) {
            return pathSegments.length > 1 && pathSegments[0] === firstSegment;
          });
          if (commonBase) {
            for (m = 0, len1 = allPathSegments.length; m < len1; m++) {
              pathSegments = allPathSegments[m];
              pathSegments.shift();
            }
          } else {
            break;
          }
        }
        return fileName + " \u2014 " + (path.join.apply(path, pathSegments));
      } else {
        return 'untitled';
      }
    };

    TextEditor.prototype.getPath = function() {
      return this.buffer.getPath();
    };

    TextEditor.prototype.getFileName = function() {
      var fullPath;
      if (fullPath = this.getPath()) {
        return path.basename(fullPath);
      } else {
        return null;
      }
    };

    TextEditor.prototype.getDirectoryPath = function() {
      var fullPath;
      if (fullPath = this.getPath()) {
        return path.dirname(fullPath);
      } else {
        return null;
      }
    };

    TextEditor.prototype.getEncoding = function() {
      return this.buffer.getEncoding();
    };

    TextEditor.prototype.setEncoding = function(encoding) {
      return this.buffer.setEncoding(encoding);
    };

    TextEditor.prototype.isModified = function() {
      return this.buffer.isModified();
    };

    TextEditor.prototype.isEmpty = function() {
      return this.buffer.isEmpty();
    };


    /*
    Section: File Operations
     */

    TextEditor.prototype.save = function() {
      return this.buffer.save();
    };

    TextEditor.prototype.saveAs = function(filePath) {
      return this.buffer.saveAs(filePath);
    };

    TextEditor.prototype.shouldPromptToSave = function(arg) {
      var projectHasPaths, ref3, windowCloseRequested;
      ref3 = arg != null ? arg : {}, windowCloseRequested = ref3.windowCloseRequested, projectHasPaths = ref3.projectHasPaths;
      if (windowCloseRequested && projectHasPaths && atom.stateStore.isConnected()) {
        return false;
      } else {
        return this.isModified() && !this.buffer.hasMultipleEditors();
      }
    };

    TextEditor.prototype.getSaveDialogOptions = function() {
      return {};
    };


    /*
    Section: Reading Text
     */

    TextEditor.prototype.getText = function() {
      return this.buffer.getText();
    };

    TextEditor.prototype.getTextInBufferRange = function(range) {
      return this.buffer.getTextInRange(range);
    };

    TextEditor.prototype.getLineCount = function() {
      return this.buffer.getLineCount();
    };

    TextEditor.prototype.getScreenLineCount = function() {
      return this.displayLayer.getScreenLineCount();
    };

    TextEditor.prototype.getApproximateScreenLineCount = function() {
      return this.displayLayer.getApproximateScreenLineCount();
    };

    TextEditor.prototype.getLastBufferRow = function() {
      return this.buffer.getLastRow();
    };

    TextEditor.prototype.getLastScreenRow = function() {
      return this.getScreenLineCount() - 1;
    };

    TextEditor.prototype.lineTextForBufferRow = function(bufferRow) {
      return this.buffer.lineForRow(bufferRow);
    };

    TextEditor.prototype.lineTextForScreenRow = function(screenRow) {
      var ref3;
      return (ref3 = this.screenLineForScreenRow(screenRow)) != null ? ref3.lineText : void 0;
    };

    TextEditor.prototype.logScreenLines = function(start, end) {
      var l, line, ref3, ref4, row;
      if (start == null) {
        start = 0;
      }
      if (end == null) {
        end = this.getLastScreenRow();
      }
      for (row = l = ref3 = start, ref4 = end; ref3 <= ref4 ? l <= ref4 : l >= ref4; row = ref3 <= ref4 ? ++l : --l) {
        line = this.lineTextForScreenRow(row);
        console.log(row, this.bufferRowForScreenRow(row), line, line.length);
      }
    };

    TextEditor.prototype.tokensForScreenRow = function(screenRow) {
      var currentTokenScopes, l, len, lineText, lineTextIndex, ref3, tag, tags, tokens;
      tokens = [];
      lineTextIndex = 0;
      currentTokenScopes = [];
      ref3 = this.screenLineForScreenRow(screenRow), lineText = ref3.lineText, tags = ref3.tags;
      for (l = 0, len = tags.length; l < len; l++) {
        tag = tags[l];
        if (this.displayLayer.isOpenTag(tag)) {
          currentTokenScopes.push(this.displayLayer.classNameForTag(tag));
        } else if (this.displayLayer.isCloseTag(tag)) {
          currentTokenScopes.pop();
        } else {
          tokens.push({
            text: lineText.substr(lineTextIndex, tag),
            scopes: currentTokenScopes.slice()
          });
          lineTextIndex += tag;
        }
      }
      return tokens;
    };

    TextEditor.prototype.screenLineForScreenRow = function(screenRow) {
      return this.displayLayer.getScreenLine(screenRow);
    };

    TextEditor.prototype.bufferRowForScreenRow = function(screenRow) {
      return this.displayLayer.translateScreenPosition(Point(screenRow, 0)).row;
    };

    TextEditor.prototype.bufferRowsForScreenRows = function(startScreenRow, endScreenRow) {
      return this.displayLayer.bufferRowsForScreenRows(startScreenRow, endScreenRow + 1);
    };

    TextEditor.prototype.screenRowForBufferRow = function(row) {
      return this.displayLayer.translateBufferPosition(Point(row, 0)).row;
    };

    TextEditor.prototype.getRightmostScreenPosition = function() {
      return this.displayLayer.getRightmostScreenPosition();
    };

    TextEditor.prototype.getApproximateRightmostScreenPosition = function() {
      return this.displayLayer.getApproximateRightmostScreenPosition();
    };

    TextEditor.prototype.getMaxScreenLineLength = function() {
      return this.getRightmostScreenPosition().column;
    };

    TextEditor.prototype.getLongestScreenRow = function() {
      return this.getRightmostScreenPosition().row;
    };

    TextEditor.prototype.getApproximateLongestScreenRow = function() {
      return this.getApproximateRightmostScreenPosition().row;
    };

    TextEditor.prototype.lineLengthForScreenRow = function(screenRow) {
      return this.displayLayer.lineLengthForScreenRow(screenRow);
    };

    TextEditor.prototype.bufferRangeForBufferRow = function(row, arg) {
      var includeNewline;
      includeNewline = (arg != null ? arg : {}).includeNewline;
      return this.buffer.rangeForRow(row, includeNewline);
    };

    TextEditor.prototype.getTextInRange = function(range) {
      return this.buffer.getTextInRange(range);
    };

    TextEditor.prototype.isBufferRowBlank = function(bufferRow) {
      return this.buffer.isRowBlank(bufferRow);
    };

    TextEditor.prototype.nextNonBlankBufferRow = function(bufferRow) {
      return this.buffer.nextNonBlankRow(bufferRow);
    };

    TextEditor.prototype.getEofBufferPosition = function() {
      return this.buffer.getEndPosition();
    };

    TextEditor.prototype.getCurrentParagraphBufferRange = function() {
      return this.getLastCursor().getCurrentParagraphBufferRange();
    };


    /*
    Section: Mutating Text
     */

    TextEditor.prototype.setText = function(text) {
      return this.buffer.setText(text);
    };

    TextEditor.prototype.setTextInBufferRange = function(range, text, options) {
      return this.getBuffer().setTextInRange(range, text, options);
    };

    TextEditor.prototype.insertText = function(text, options) {
      var groupingInterval;
      if (options == null) {
        options = {};
      }
      if (!this.emitWillInsertTextEvent(text)) {
        return false;
      }
      groupingInterval = options.groupUndo ? this.undoGroupingInterval : 0;
      if (options.autoIndentNewline == null) {
        options.autoIndentNewline = this.shouldAutoIndent();
      }
      if (options.autoDecreaseIndent == null) {
        options.autoDecreaseIndent = this.shouldAutoIndent();
      }
      return this.mutateSelectedText((function(_this) {
        return function(selection) {
          var didInsertEvent, range;
          range = selection.insertText(text, options);
          didInsertEvent = {
            text: text,
            range: range
          };
          _this.emitter.emit('did-insert-text', didInsertEvent);
          return range;
        };
      })(this), groupingInterval);
    };

    TextEditor.prototype.insertNewline = function(options) {
      return this.insertText('\n', options);
    };

    TextEditor.prototype["delete"] = function() {
      return this.mutateSelectedText(function(selection) {
        return selection["delete"]();
      });
    };

    TextEditor.prototype.backspace = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.backspace();
      });
    };

    TextEditor.prototype.mutateSelectedText = function(fn, groupingInterval) {
      if (groupingInterval == null) {
        groupingInterval = 0;
      }
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          return _this.transact(groupingInterval, function() {
            var index, l, len, ref3, results, selection;
            ref3 = _this.getSelectionsOrderedByBufferPosition();
            results = [];
            for (index = l = 0, len = ref3.length; l < len; index = ++l) {
              selection = ref3[index];
              results.push(fn(selection, index));
            }
            return results;
          });
        };
      })(this));
    };

    TextEditor.prototype.moveLineUp = function() {
      var selections;
      selections = this.getSelectedBufferRanges().sort(function(a, b) {
        return a.compare(b);
      });
      if (selections[0].start.row === 0) {
        return;
      }
      if (selections[selections.length - 1].start.row === this.getLastBufferRow() && this.buffer.getLastLine() === '') {
        return;
      }
      return this.transact((function(_this) {
        return function() {
          var endRow, insertDelta, l, len, len1, lines, linesRange, m, newSelectionRanges, precedingRow, rangeToRefold, rangesToRefold, ref3, selection, selectionsToMove, startRow;
          newSelectionRanges = [];
          while (selections.length > 0) {
            selection = selections.shift();
            selectionsToMove = [selection];
            while (selection.end.row === ((ref3 = selections[0]) != null ? ref3.start.row : void 0)) {
              selectionsToMove.push(selections[0]);
              selection.end.row = selections[0].end.row;
              selections.shift();
            }
            startRow = selection.start.row;
            endRow = selection.end.row;
            if (selection.end.row > selection.start.row && selection.end.column === 0) {
              endRow--;
            }
            startRow = _this.displayLayer.findBoundaryPrecedingBufferRow(startRow);
            endRow = _this.displayLayer.findBoundaryFollowingBufferRow(endRow + 1);
            linesRange = new Range(Point(startRow, 0), Point(endRow, 0));
            precedingRow = _this.displayLayer.findBoundaryPrecedingBufferRow(startRow - 1);
            insertDelta = linesRange.start.row - precedingRow;
            rangesToRefold = _this.displayLayer.destroyFoldsIntersectingBufferRange(linesRange).map(function(range) {
              return range.translate([-insertDelta, 0]);
            });
            lines = _this.buffer.getTextInRange(linesRange);
            if (lines[lines.length - 1] !== '\n') {
              lines += _this.buffer.lineEndingForRow(linesRange.end.row - 2);
            }
            _this.buffer["delete"](linesRange);
            _this.buffer.insert([precedingRow, 0], lines);
            for (l = 0, len = rangesToRefold.length; l < len; l++) {
              rangeToRefold = rangesToRefold[l];
              _this.displayLayer.foldBufferRange(rangeToRefold);
            }
            for (m = 0, len1 = selectionsToMove.length; m < len1; m++) {
              selection = selectionsToMove[m];
              newSelectionRanges.push(selection.translate([-insertDelta, 0]));
            }
          }
          _this.setSelectedBufferRanges(newSelectionRanges, {
            autoscroll: false,
            preserveFolds: true
          });
          if (_this.shouldAutoIndent()) {
            _this.autoIndentSelectedRows();
          }
          return _this.scrollToBufferPosition([newSelectionRanges[0].start.row, 0]);
        };
      })(this));
    };

    TextEditor.prototype.moveLineDown = function() {
      var selections;
      selections = this.getSelectedBufferRanges();
      selections.sort(function(a, b) {
        return a.compare(b);
      });
      selections = selections.reverse();
      return this.transact((function(_this) {
        return function() {
          var endRow, followingRow, insertDelta, l, len, len1, lines, linesRange, m, newSelectionRanges, rangeToRefold, rangesToRefold, ref3, selection, selectionsToMove, startRow;
          _this.consolidateSelections();
          newSelectionRanges = [];
          while (selections.length > 0) {
            selection = selections.shift();
            selectionsToMove = [selection];
            while (selection.start.row === ((ref3 = selections[0]) != null ? ref3.end.row : void 0)) {
              selectionsToMove.push(selections[0]);
              selection.start.row = selections[0].start.row;
              selections.shift();
            }
            startRow = selection.start.row;
            endRow = selection.end.row;
            if (selection.end.row > selection.start.row && selection.end.column === 0) {
              endRow--;
            }
            startRow = _this.displayLayer.findBoundaryPrecedingBufferRow(startRow);
            endRow = _this.displayLayer.findBoundaryFollowingBufferRow(endRow + 1);
            linesRange = new Range(Point(startRow, 0), Point(endRow, 0));
            followingRow = Math.min(_this.buffer.getLineCount(), _this.displayLayer.findBoundaryFollowingBufferRow(endRow + 1));
            insertDelta = followingRow - linesRange.end.row;
            rangesToRefold = _this.displayLayer.destroyFoldsIntersectingBufferRange(linesRange).map(function(range) {
              return range.translate([insertDelta, 0]);
            });
            lines = _this.buffer.getTextInRange(linesRange);
            if (followingRow - 1 === _this.buffer.getLastRow()) {
              lines = "\n" + lines;
            }
            _this.buffer.insert([followingRow, 0], lines);
            _this.buffer["delete"](linesRange);
            for (l = 0, len = rangesToRefold.length; l < len; l++) {
              rangeToRefold = rangesToRefold[l];
              _this.displayLayer.foldBufferRange(rangeToRefold);
            }
            for (m = 0, len1 = selectionsToMove.length; m < len1; m++) {
              selection = selectionsToMove[m];
              newSelectionRanges.push(selection.translate([insertDelta, 0]));
            }
          }
          _this.setSelectedBufferRanges(newSelectionRanges, {
            autoscroll: false,
            preserveFolds: true
          });
          if (_this.shouldAutoIndent()) {
            _this.autoIndentSelectedRows();
          }
          return _this.scrollToBufferPosition([newSelectionRanges[0].start.row - 1, 0]);
        };
      })(this));
    };

    TextEditor.prototype.moveSelectionLeft = function() {
      var noSelectionAtStartOfLine, selections, translatedRanges, translationDelta;
      selections = this.getSelectedBufferRanges();
      noSelectionAtStartOfLine = selections.every(function(selection) {
        return selection.start.column !== 0;
      });
      translationDelta = [0, -1];
      translatedRanges = [];
      if (noSelectionAtStartOfLine) {
        return this.transact((function(_this) {
          return function() {
            var charTextToLeftOfSelection, charToLeftOfSelection, l, len, selection;
            for (l = 0, len = selections.length; l < len; l++) {
              selection = selections[l];
              charToLeftOfSelection = new Range(selection.start.translate(translationDelta), selection.start);
              charTextToLeftOfSelection = _this.buffer.getTextInRange(charToLeftOfSelection);
              _this.buffer.insert(selection.end, charTextToLeftOfSelection);
              _this.buffer["delete"](charToLeftOfSelection);
              translatedRanges.push(selection.translate(translationDelta));
            }
            return _this.setSelectedBufferRanges(translatedRanges);
          };
        })(this));
      }
    };

    TextEditor.prototype.moveSelectionRight = function() {
      var noSelectionAtEndOfLine, selections, translatedRanges, translationDelta;
      selections = this.getSelectedBufferRanges();
      noSelectionAtEndOfLine = selections.every((function(_this) {
        return function(selection) {
          return selection.end.column !== _this.buffer.lineLengthForRow(selection.end.row);
        };
      })(this));
      translationDelta = [0, 1];
      translatedRanges = [];
      if (noSelectionAtEndOfLine) {
        return this.transact((function(_this) {
          return function() {
            var charTextToRightOfSelection, charToRightOfSelection, l, len, selection;
            for (l = 0, len = selections.length; l < len; l++) {
              selection = selections[l];
              charToRightOfSelection = new Range(selection.end, selection.end.translate(translationDelta));
              charTextToRightOfSelection = _this.buffer.getTextInRange(charToRightOfSelection);
              _this.buffer["delete"](charToRightOfSelection);
              _this.buffer.insert(selection.start, charTextToRightOfSelection);
              translatedRanges.push(selection.translate(translationDelta));
            }
            return _this.setSelectedBufferRanges(translatedRanges);
          };
        })(this));
      }
    };

    TextEditor.prototype.duplicateLines = function() {
      return this.transact((function(_this) {
        return function() {
          var endRow, fold, foldRange, i, insertedRowCount, intersectingFolds, j, k, l, len, m, previousSelectionEndRow, previousSelectionRanges, previousSelectionStartRow, ref3, ref4, ref5, ref6, results, selections, start, startRow, textToDuplicate;
          selections = _this.getSelectionsOrderedByBufferPosition();
          previousSelectionRanges = [];
          i = selections.length - 1;
          results = [];
          while (i >= 0) {
            j = i;
            previousSelectionRanges[i] = selections[i].getBufferRange();
            if (selections[i].isEmpty()) {
              start = selections[i].getScreenRange().start;
              selections[i].setScreenRange([[start.row, 0], [start.row + 1, 0]], {
                preserveFolds: true
              });
            }
            ref3 = selections[i].getBufferRowRange(), startRow = ref3[0], endRow = ref3[1];
            endRow++;
            while (i > 0) {
              ref4 = selections[i - 1].getBufferRowRange(), previousSelectionStartRow = ref4[0], previousSelectionEndRow = ref4[1];
              if (previousSelectionEndRow === startRow) {
                startRow = previousSelectionStartRow;
                previousSelectionRanges[i - 1] = selections[i - 1].getBufferRange();
                i--;
              } else {
                break;
              }
            }
            intersectingFolds = _this.displayLayer.foldsIntersectingBufferRange([[startRow, 0], [endRow, 0]]);
            textToDuplicate = _this.getTextInBufferRange([[startRow, 0], [endRow, 0]]);
            if (endRow > _this.getLastBufferRow()) {
              textToDuplicate = '\n' + textToDuplicate;
            }
            _this.buffer.insert([endRow, 0], textToDuplicate);
            insertedRowCount = endRow - startRow;
            for (k = l = ref5 = i, ref6 = j; l <= ref6; k = l += 1) {
              selections[k].setBufferRange(previousSelectionRanges[k].translate([insertedRowCount, 0]));
            }
            for (m = 0, len = intersectingFolds.length; m < len; m++) {
              fold = intersectingFolds[m];
              foldRange = _this.displayLayer.bufferRangeForFold(fold);
              _this.displayLayer.foldBufferRange(foldRange.translate([insertedRowCount, 0]));
            }
            results.push(i--);
          }
          return results;
        };
      })(this));
    };

    TextEditor.prototype.replaceSelectedText = function(options, fn) {
      var selectWordIfEmpty;
      if (options == null) {
        options = {};
      }
      selectWordIfEmpty = options.selectWordIfEmpty;
      return this.mutateSelectedText(function(selection) {
        var range, text;
        selection.getBufferRange();
        if (selectWordIfEmpty && selection.isEmpty()) {
          selection.selectWord();
        }
        text = selection.getText();
        selection.deleteSelectedText();
        range = selection.insertText(fn(text));
        return selection.setBufferRange(range);
      });
    };

    TextEditor.prototype.splitSelectionsIntoLines = function() {
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          var end, l, len, range, ref3, row, selection, start;
          ref3 = _this.getSelections();
          for (l = 0, len = ref3.length; l < len; l++) {
            selection = ref3[l];
            range = selection.getBufferRange();
            if (range.isSingleLine()) {
              continue;
            }
            start = range.start, end = range.end;
            _this.addSelectionForBufferRange([start, [start.row, 2e308]]);
            row = start.row;
            while (++row < end.row) {
              _this.addSelectionForBufferRange([[row, 0], [row, 2e308]]);
            }
            if (end.column !== 0) {
              _this.addSelectionForBufferRange([[end.row, 0], [end.row, end.column]]);
            }
            selection.destroy();
          }
        };
      })(this));
    };

    TextEditor.prototype.transpose = function() {
      return this.mutateSelectedText(function(selection) {
        var text;
        if (selection.isEmpty()) {
          selection.selectRight();
          text = selection.getText();
          selection["delete"]();
          selection.cursor.moveLeft();
          return selection.insertText(text);
        } else {
          return selection.insertText(selection.getText().split('').reverse().join(''));
        }
      });
    };

    TextEditor.prototype.upperCase = function() {
      return this.replaceSelectedText({
        selectWordIfEmpty: true
      }, function(text) {
        return text.toUpperCase();
      });
    };

    TextEditor.prototype.lowerCase = function() {
      return this.replaceSelectedText({
        selectWordIfEmpty: true
      }, function(text) {
        return text.toLowerCase();
      });
    };

    TextEditor.prototype.toggleLineCommentsInSelection = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.toggleLineComments();
      });
    };

    TextEditor.prototype.joinLines = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.joinLines();
      });
    };

    TextEditor.prototype.insertNewlineBelow = function() {
      return this.transact((function(_this) {
        return function() {
          _this.moveToEndOfLine();
          return _this.insertNewline();
        };
      })(this));
    };

    TextEditor.prototype.insertNewlineAbove = function() {
      return this.transact((function(_this) {
        return function() {
          var bufferRow, indentLevel, onFirstLine;
          bufferRow = _this.getCursorBufferPosition().row;
          indentLevel = _this.indentationForBufferRow(bufferRow);
          onFirstLine = bufferRow === 0;
          _this.moveToBeginningOfLine();
          _this.moveLeft();
          _this.insertNewline();
          if (_this.shouldAutoIndent() && _this.indentationForBufferRow(bufferRow) < indentLevel) {
            _this.setIndentationForBufferRow(bufferRow, indentLevel);
          }
          if (onFirstLine) {
            _this.moveUp();
            return _this.moveToEndOfLine();
          }
        };
      })(this));
    };

    TextEditor.prototype.deleteToBeginningOfWord = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfWord();
      });
    };

    TextEditor.prototype.deleteToPreviousWordBoundary = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.deleteToNextWordBoundary = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToNextWordBoundary();
      });
    };

    TextEditor.prototype.deleteToBeginningOfSubword = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfSubword();
      });
    };

    TextEditor.prototype.deleteToEndOfSubword = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfSubword();
      });
    };

    TextEditor.prototype.deleteToBeginningOfLine = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfLine();
      });
    };

    TextEditor.prototype.deleteToEndOfLine = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfLine();
      });
    };

    TextEditor.prototype.deleteToEndOfWord = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfWord();
      });
    };

    TextEditor.prototype.deleteLine = function() {
      this.mergeSelectionsOnSameRows();
      return this.mutateSelectedText(function(selection) {
        return selection.deleteLine();
      });
    };


    /*
    Section: History
     */

    TextEditor.prototype.undo = function() {
      this.avoidMergingSelections((function(_this) {
        return function() {
          return _this.buffer.undo();
        };
      })(this));
      return this.getLastSelection().autoscroll();
    };

    TextEditor.prototype.redo = function() {
      this.avoidMergingSelections((function(_this) {
        return function() {
          return _this.buffer.redo();
        };
      })(this));
      return this.getLastSelection().autoscroll();
    };

    TextEditor.prototype.transact = function(groupingInterval, fn) {
      return this.buffer.transact(groupingInterval, fn);
    };

    TextEditor.prototype.beginTransaction = function(groupingInterval) {
      Grim.deprecate('Transactions should be performed via TextEditor::transact only');
      return this.buffer.beginTransaction(groupingInterval);
    };

    TextEditor.prototype.commitTransaction = function() {
      Grim.deprecate('Transactions should be performed via TextEditor::transact only');
      return this.buffer.commitTransaction();
    };

    TextEditor.prototype.abortTransaction = function() {
      return this.buffer.abortTransaction();
    };

    TextEditor.prototype.createCheckpoint = function() {
      return this.buffer.createCheckpoint();
    };

    TextEditor.prototype.revertToCheckpoint = function(checkpoint) {
      return this.buffer.revertToCheckpoint(checkpoint);
    };

    TextEditor.prototype.groupChangesSinceCheckpoint = function(checkpoint) {
      return this.buffer.groupChangesSinceCheckpoint(checkpoint);
    };


    /*
    Section: TextEditor Coordinates
     */

    TextEditor.prototype.screenPositionForBufferPosition = function(bufferPosition, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.displayLayer.translateBufferPosition(bufferPosition, options);
    };

    TextEditor.prototype.bufferPositionForScreenPosition = function(screenPosition, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.displayLayer.translateScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.screenRangeForBufferRange = function(bufferRange, options) {
      var end, start;
      bufferRange = Range.fromObject(bufferRange);
      start = this.screenPositionForBufferPosition(bufferRange.start, options);
      end = this.screenPositionForBufferPosition(bufferRange.end, options);
      return new Range(start, end);
    };

    TextEditor.prototype.bufferRangeForScreenRange = function(screenRange) {
      var end, start;
      screenRange = Range.fromObject(screenRange);
      start = this.bufferPositionForScreenPosition(screenRange.start);
      end = this.bufferPositionForScreenPosition(screenRange.end);
      return new Range(start, end);
    };

    TextEditor.prototype.clipBufferPosition = function(bufferPosition) {
      return this.buffer.clipPosition(bufferPosition);
    };

    TextEditor.prototype.clipBufferRange = function(range) {
      return this.buffer.clipRange(range);
    };

    TextEditor.prototype.clipScreenPosition = function(screenPosition, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.displayLayer.clipScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.clipScreenRange = function(screenRange, options) {
      var end, start;
      screenRange = Range.fromObject(screenRange);
      start = this.displayLayer.clipScreenPosition(screenRange.start, options);
      end = this.displayLayer.clipScreenPosition(screenRange.end, options);
      return Range(start, end);
    };


    /*
    Section: Decorations
     */

    TextEditor.prototype.decorateMarker = function(marker, decorationParams) {
      return this.decorationManager.decorateMarker(marker, decorationParams);
    };

    TextEditor.prototype.decorateMarkerLayer = function(markerLayer, decorationParams) {
      return this.decorationManager.decorateMarkerLayer(markerLayer, decorationParams);
    };

    TextEditor.prototype.decorationsForScreenRowRange = function(startScreenRow, endScreenRow) {
      return this.decorationManager.decorationsForScreenRowRange(startScreenRow, endScreenRow);
    };

    TextEditor.prototype.decorationsStateForScreenRowRange = function(startScreenRow, endScreenRow) {
      return this.decorationManager.decorationsStateForScreenRowRange(startScreenRow, endScreenRow);
    };

    TextEditor.prototype.getDecorations = function(propertyFilter) {
      return this.decorationManager.getDecorations(propertyFilter);
    };

    TextEditor.prototype.getLineDecorations = function(propertyFilter) {
      return this.decorationManager.getLineDecorations(propertyFilter);
    };

    TextEditor.prototype.getLineNumberDecorations = function(propertyFilter) {
      return this.decorationManager.getLineNumberDecorations(propertyFilter);
    };

    TextEditor.prototype.getHighlightDecorations = function(propertyFilter) {
      return this.decorationManager.getHighlightDecorations(propertyFilter);
    };

    TextEditor.prototype.getOverlayDecorations = function(propertyFilter) {
      return this.decorationManager.getOverlayDecorations(propertyFilter);
    };


    /*
    Section: Markers
     */

    TextEditor.prototype.markBufferRange = function(bufferRange, options) {
      return this.defaultMarkerLayer.markBufferRange(bufferRange, options);
    };

    TextEditor.prototype.markScreenRange = function(screenRange, options) {
      return this.defaultMarkerLayer.markScreenRange(screenRange, options);
    };

    TextEditor.prototype.markBufferPosition = function(bufferPosition, options) {
      return this.defaultMarkerLayer.markBufferPosition(bufferPosition, options);
    };

    TextEditor.prototype.markScreenPosition = function(screenPosition, options) {
      return this.defaultMarkerLayer.markScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.findMarkers = function(params) {
      return this.defaultMarkerLayer.findMarkers(params);
    };

    TextEditor.prototype.getMarker = function(id) {
      return this.defaultMarkerLayer.getMarker(id);
    };

    TextEditor.prototype.getMarkers = function() {
      return this.defaultMarkerLayer.getMarkers();
    };

    TextEditor.prototype.getMarkerCount = function() {
      return this.defaultMarkerLayer.getMarkerCount();
    };

    TextEditor.prototype.destroyMarker = function(id) {
      var ref3;
      return (ref3 = this.getMarker(id)) != null ? ref3.destroy() : void 0;
    };

    TextEditor.prototype.addMarkerLayer = function(options) {
      return this.displayLayer.addMarkerLayer(options);
    };

    TextEditor.prototype.getMarkerLayer = function(id) {
      return this.displayLayer.getMarkerLayer(id);
    };

    TextEditor.prototype.getDefaultMarkerLayer = function() {
      return this.defaultMarkerLayer;
    };


    /*
    Section: Cursors
     */

    TextEditor.prototype.getCursorBufferPosition = function() {
      return this.getLastCursor().getBufferPosition();
    };

    TextEditor.prototype.getCursorBufferPositions = function() {
      var cursor, l, len, ref3, results;
      ref3 = this.getCursors();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        results.push(cursor.getBufferPosition());
      }
      return results;
    };

    TextEditor.prototype.setCursorBufferPosition = function(position, options) {
      return this.moveCursors(function(cursor) {
        return cursor.setBufferPosition(position, options);
      });
    };

    TextEditor.prototype.getCursorAtScreenPosition = function(position) {
      var selection;
      if (selection = this.getSelectionAtScreenPosition(position)) {
        if (selection.getHeadScreenPosition().isEqual(position)) {
          return selection.cursor;
        }
      }
    };

    TextEditor.prototype.getCursorScreenPosition = function() {
      return this.getLastCursor().getScreenPosition();
    };

    TextEditor.prototype.getCursorScreenPositions = function() {
      var cursor, l, len, ref3, results;
      ref3 = this.getCursors();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        results.push(cursor.getScreenPosition());
      }
      return results;
    };

    TextEditor.prototype.setCursorScreenPosition = function(position, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.moveCursors(function(cursor) {
        return cursor.setScreenPosition(position, options);
      });
    };

    TextEditor.prototype.addCursorAtBufferPosition = function(bufferPosition, options) {
      this.selectionsMarkerLayer.markBufferPosition(bufferPosition, Object.assign({
        invalidate: 'never'
      }, options));
      if ((options != null ? options.autoscroll : void 0) !== false) {
        this.getLastSelection().cursor.autoscroll();
      }
      return this.getLastSelection().cursor;
    };

    TextEditor.prototype.addCursorAtScreenPosition = function(screenPosition, options) {
      this.selectionsMarkerLayer.markScreenPosition(screenPosition, {
        invalidate: 'never'
      });
      if ((options != null ? options.autoscroll : void 0) !== false) {
        this.getLastSelection().cursor.autoscroll();
      }
      return this.getLastSelection().cursor;
    };

    TextEditor.prototype.hasMultipleCursors = function() {
      return this.getCursors().length > 1;
    };

    TextEditor.prototype.moveUp = function(lineCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveUp(lineCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveDown = function(lineCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveDown(lineCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveLeft = function(columnCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveLeft(columnCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveRight = function(columnCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveRight(columnCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveToBeginningOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfLine();
      });
    };

    TextEditor.prototype.moveToBeginningOfScreenLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfScreenLine();
      });
    };

    TextEditor.prototype.moveToFirstCharacterOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToFirstCharacterOfLine();
      });
    };

    TextEditor.prototype.moveToEndOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfLine();
      });
    };

    TextEditor.prototype.moveToEndOfScreenLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfScreenLine();
      });
    };

    TextEditor.prototype.moveToBeginningOfWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfWord();
      });
    };

    TextEditor.prototype.moveToEndOfWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfWord();
      });
    };

    TextEditor.prototype.moveToTop = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToTop();
      });
    };

    TextEditor.prototype.moveToBottom = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBottom();
      });
    };

    TextEditor.prototype.moveToBeginningOfNextWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfNextWord();
      });
    };

    TextEditor.prototype.moveToPreviousWordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.moveToNextWordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToNextWordBoundary();
      });
    };

    TextEditor.prototype.moveToPreviousSubwordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToPreviousSubwordBoundary();
      });
    };

    TextEditor.prototype.moveToNextSubwordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToNextSubwordBoundary();
      });
    };

    TextEditor.prototype.moveToBeginningOfNextParagraph = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfNextParagraph();
      });
    };

    TextEditor.prototype.moveToBeginningOfPreviousParagraph = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfPreviousParagraph();
      });
    };

    TextEditor.prototype.getLastCursor = function() {
      this.createLastSelectionIfNeeded();
      return _.last(this.cursors);
    };

    TextEditor.prototype.getWordUnderCursor = function(options) {
      return this.getTextInBufferRange(this.getLastCursor().getCurrentWordBufferRange(options));
    };

    TextEditor.prototype.getCursors = function() {
      this.createLastSelectionIfNeeded();
      return this.cursors.slice();
    };

    TextEditor.prototype.getCursorsOrderedByBufferPosition = function() {
      return this.getCursors().sort(function(a, b) {
        return a.compare(b);
      });
    };

    TextEditor.prototype.cursorsForScreenRowRange = function(startScreenRow, endScreenRow) {
      var cursor, cursors, l, len, marker, ref3;
      cursors = [];
      ref3 = this.selectionsMarkerLayer.findMarkers({
        intersectsScreenRowRange: [startScreenRow, endScreenRow]
      });
      for (l = 0, len = ref3.length; l < len; l++) {
        marker = ref3[l];
        if (cursor = this.cursorsByMarkerId.get(marker.id)) {
          cursors.push(cursor);
        }
      }
      return cursors;
    };

    TextEditor.prototype.addCursor = function(marker) {
      var cursor;
      cursor = new Cursor({
        editor: this,
        marker: marker,
        showCursorOnSelection: this.showCursorOnSelection
      });
      this.cursors.push(cursor);
      this.cursorsByMarkerId.set(marker.id, cursor);
      return cursor;
    };

    TextEditor.prototype.moveCursors = function(fn) {
      return this.transact((function(_this) {
        return function() {
          var cursor, l, len, ref3;
          ref3 = _this.getCursors();
          for (l = 0, len = ref3.length; l < len; l++) {
            cursor = ref3[l];
            fn(cursor);
          }
          return _this.mergeCursors();
        };
      })(this));
    };

    TextEditor.prototype.cursorMoved = function(event) {
      return this.emitter.emit('did-change-cursor-position', event);
    };

    TextEditor.prototype.mergeCursors = function() {
      var cursor, l, len, position, positions, ref3;
      positions = {};
      ref3 = this.getCursors();
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        position = cursor.getBufferPosition().toString();
        if (positions.hasOwnProperty(position)) {
          cursor.destroy();
        } else {
          positions[position] = true;
        }
      }
    };


    /*
    Section: Selections
     */

    TextEditor.prototype.getSelectedText = function() {
      return this.getLastSelection().getText();
    };

    TextEditor.prototype.getSelectedBufferRange = function() {
      return this.getLastSelection().getBufferRange();
    };

    TextEditor.prototype.getSelectedBufferRanges = function() {
      var l, len, ref3, results, selection;
      ref3 = this.getSelections();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        results.push(selection.getBufferRange());
      }
      return results;
    };

    TextEditor.prototype.setSelectedBufferRange = function(bufferRange, options) {
      return this.setSelectedBufferRanges([bufferRange], options);
    };

    TextEditor.prototype.setSelectedBufferRanges = function(bufferRanges, options) {
      var l, len, ref3, selection, selections;
      if (options == null) {
        options = {};
      }
      if (!bufferRanges.length) {
        throw new Error("Passed an empty array to setSelectedBufferRanges");
      }
      selections = this.getSelections();
      ref3 = selections.slice(bufferRanges.length);
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.destroy();
      }
      return this.mergeIntersectingSelections(options, (function(_this) {
        return function() {
          var bufferRange, i, len1, m;
          for (i = m = 0, len1 = bufferRanges.length; m < len1; i = ++m) {
            bufferRange = bufferRanges[i];
            bufferRange = Range.fromObject(bufferRange);
            if (selections[i]) {
              selections[i].setBufferRange(bufferRange, options);
            } else {
              _this.addSelectionForBufferRange(bufferRange, options);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.getSelectedScreenRange = function() {
      return this.getLastSelection().getScreenRange();
    };

    TextEditor.prototype.getSelectedScreenRanges = function() {
      var l, len, ref3, results, selection;
      ref3 = this.getSelections();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        results.push(selection.getScreenRange());
      }
      return results;
    };

    TextEditor.prototype.setSelectedScreenRange = function(screenRange, options) {
      return this.setSelectedBufferRange(this.bufferRangeForScreenRange(screenRange, options), options);
    };

    TextEditor.prototype.setSelectedScreenRanges = function(screenRanges, options) {
      var l, len, ref3, selection, selections;
      if (options == null) {
        options = {};
      }
      if (!screenRanges.length) {
        throw new Error("Passed an empty array to setSelectedScreenRanges");
      }
      selections = this.getSelections();
      ref3 = selections.slice(screenRanges.length);
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.destroy();
      }
      return this.mergeIntersectingSelections(options, (function(_this) {
        return function() {
          var i, len1, m, screenRange;
          for (i = m = 0, len1 = screenRanges.length; m < len1; i = ++m) {
            screenRange = screenRanges[i];
            screenRange = Range.fromObject(screenRange);
            if (selections[i]) {
              selections[i].setScreenRange(screenRange, options);
            } else {
              _this.addSelectionForScreenRange(screenRange, options);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.addSelectionForBufferRange = function(bufferRange, options) {
      var ref3;
      if (options == null) {
        options = {};
      }
      if (!options.preserveFolds) {
        this.destroyFoldsIntersectingBufferRange(bufferRange);
      }
      this.selectionsMarkerLayer.markBufferRange(bufferRange, {
        invalidate: 'never',
        reversed: (ref3 = options.reversed) != null ? ref3 : false
      });
      if (options.autoscroll !== false) {
        this.getLastSelection().autoscroll();
      }
      return this.getLastSelection();
    };

    TextEditor.prototype.addSelectionForScreenRange = function(screenRange, options) {
      if (options == null) {
        options = {};
      }
      return this.addSelectionForBufferRange(this.bufferRangeForScreenRange(screenRange), options);
    };

    TextEditor.prototype.selectToBufferPosition = function(position) {
      var lastSelection;
      lastSelection = this.getLastSelection();
      lastSelection.selectToBufferPosition(position);
      return this.mergeIntersectingSelections({
        reversed: lastSelection.isReversed()
      });
    };

    TextEditor.prototype.selectToScreenPosition = function(position, options) {
      var lastSelection;
      lastSelection = this.getLastSelection();
      lastSelection.selectToScreenPosition(position, options);
      if (!(options != null ? options.suppressSelectionMerge : void 0)) {
        return this.mergeIntersectingSelections({
          reversed: lastSelection.isReversed()
        });
      }
    };

    TextEditor.prototype.selectUp = function(rowCount) {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectUp(rowCount);
      });
    };

    TextEditor.prototype.selectDown = function(rowCount) {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectDown(rowCount);
      });
    };

    TextEditor.prototype.selectLeft = function(columnCount) {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectLeft(columnCount);
      });
    };

    TextEditor.prototype.selectRight = function(columnCount) {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectRight(columnCount);
      });
    };

    TextEditor.prototype.selectToTop = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToTop();
      });
    };

    TextEditor.prototype.selectToBottom = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBottom();
      });
    };

    TextEditor.prototype.selectAll = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectAll();
      });
    };

    TextEditor.prototype.selectToBeginningOfLine = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfLine();
      });
    };

    TextEditor.prototype.selectToFirstCharacterOfLine = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToFirstCharacterOfLine();
      });
    };

    TextEditor.prototype.selectToEndOfLine = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToEndOfLine();
      });
    };

    TextEditor.prototype.selectToBeginningOfWord = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfWord();
      });
    };

    TextEditor.prototype.selectToEndOfWord = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToEndOfWord();
      });
    };

    TextEditor.prototype.selectToPreviousSubwordBoundary = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToPreviousSubwordBoundary();
      });
    };

    TextEditor.prototype.selectToNextSubwordBoundary = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToNextSubwordBoundary();
      });
    };

    TextEditor.prototype.selectLinesContainingCursors = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectLine();
      });
    };

    TextEditor.prototype.selectWordsContainingCursors = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectWord();
      });
    };

    TextEditor.prototype.selectToPreviousWordBoundary = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.selectToNextWordBoundary = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToNextWordBoundary();
      });
    };

    TextEditor.prototype.selectToBeginningOfNextWord = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBeginningOfNextWord();
      });
    };

    TextEditor.prototype.selectToBeginningOfNextParagraph = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBeginningOfNextParagraph();
      });
    };

    TextEditor.prototype.selectToBeginningOfPreviousParagraph = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfPreviousParagraph();
      });
    };

    TextEditor.prototype.selectMarker = function(marker) {
      var range;
      if (marker.isValid()) {
        range = marker.getBufferRange();
        this.setSelectedBufferRange(range);
        return range;
      }
    };

    TextEditor.prototype.getLastSelection = function() {
      this.createLastSelectionIfNeeded();
      return _.last(this.selections);
    };

    TextEditor.prototype.getSelectionAtScreenPosition = function(position) {
      var markers;
      markers = this.selectionsMarkerLayer.findMarkers({
        containsScreenPosition: position
      });
      if (markers.length > 0) {
        return this.cursorsByMarkerId.get(markers[0].id).selection;
      }
    };

    TextEditor.prototype.getSelections = function() {
      this.createLastSelectionIfNeeded();
      return this.selections.slice();
    };

    TextEditor.prototype.getSelectionsOrderedByBufferPosition = function() {
      return this.getSelections().sort(function(a, b) {
        return a.compare(b);
      });
    };

    TextEditor.prototype.selectionIntersectsBufferRange = function(bufferRange) {
      return _.any(this.getSelections(), function(selection) {
        return selection.intersectsBufferRange(bufferRange);
      });
    };

    TextEditor.prototype.addSelectionBelow = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.addSelectionBelow();
      });
    };

    TextEditor.prototype.addSelectionAbove = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.addSelectionAbove();
      });
    };

    TextEditor.prototype.expandSelectionsForward = function(fn) {
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          var l, len, ref3, selection;
          ref3 = _this.getSelections();
          for (l = 0, len = ref3.length; l < len; l++) {
            selection = ref3[l];
            fn(selection);
          }
        };
      })(this));
    };

    TextEditor.prototype.expandSelectionsBackward = function(fn) {
      return this.mergeIntersectingSelections({
        reversed: true
      }, (function(_this) {
        return function() {
          var l, len, ref3, selection;
          ref3 = _this.getSelections();
          for (l = 0, len = ref3.length; l < len; l++) {
            selection = ref3[l];
            fn(selection);
          }
        };
      })(this));
    };

    TextEditor.prototype.finalizeSelections = function() {
      var l, len, ref3, selection;
      ref3 = this.getSelections();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.finalize();
      }
    };

    TextEditor.prototype.selectionsForScreenRows = function(startRow, endRow) {
      return this.getSelections().filter(function(selection) {
        return selection.intersectsScreenRowRange(startRow, endRow);
      });
    };

    TextEditor.prototype.mergeIntersectingSelections = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, slice.call(args).concat([function(previousSelection, currentSelection) {
        var exclusive;
        exclusive = !currentSelection.isEmpty() && !previousSelection.isEmpty();
        return previousSelection.intersectsWith(currentSelection, exclusive);
      }]));
    };

    TextEditor.prototype.mergeSelectionsOnSameRows = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, slice.call(args).concat([function(previousSelection, currentSelection) {
        var screenRange;
        screenRange = currentSelection.getScreenRange();
        return previousSelection.intersectsScreenRowRange(screenRange.start.row, screenRange.end.row);
      }]));
    };

    TextEditor.prototype.avoidMergingSelections = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, slice.call(args).concat([function() {
        return false;
      }]));
    };

    TextEditor.prototype.mergeSelections = function() {
      var args, fn, head, mergePredicate, options, reducer, ref3, ref4, result, tail;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      mergePredicate = args.pop();
      if (_.isFunction(_.last(args))) {
        fn = args.pop();
      }
      options = (ref3 = args.pop()) != null ? ref3 : {};
      if (this.suppressSelectionMerging) {
        return typeof fn === "function" ? fn() : void 0;
      }
      if (fn != null) {
        this.suppressSelectionMerging = true;
        result = fn();
        this.suppressSelectionMerging = false;
      }
      reducer = function(disjointSelections, selection) {
        var adjacentSelection;
        adjacentSelection = _.last(disjointSelections);
        if (mergePredicate(adjacentSelection, selection)) {
          adjacentSelection.merge(selection, options);
          return disjointSelections;
        } else {
          return disjointSelections.concat([selection]);
        }
      };
      ref4 = this.getSelectionsOrderedByBufferPosition(), head = ref4[0], tail = 2 <= ref4.length ? slice.call(ref4, 1) : [];
      _.reduce(tail, reducer, [head]);
      if (fn != null) {
        return result;
      }
    };

    TextEditor.prototype.addSelection = function(marker, options) {
      var cursor, l, len, ref3, selection, selectionBufferRange;
      if (options == null) {
        options = {};
      }
      cursor = this.addCursor(marker);
      selection = new Selection(Object.assign({
        editor: this,
        marker: marker,
        cursor: cursor
      }, options));
      this.selections.push(selection);
      selectionBufferRange = selection.getBufferRange();
      this.mergeIntersectingSelections({
        preserveFolds: options.preserveFolds
      });
      if (selection.destroyed) {
        ref3 = this.getSelections();
        for (l = 0, len = ref3.length; l < len; l++) {
          selection = ref3[l];
          if (selection.intersectsBufferRange(selectionBufferRange)) {
            return selection;
          }
        }
      } else {
        this.emitter.emit('did-add-cursor', cursor);
        this.emitter.emit('did-add-selection', selection);
        return selection;
      }
    };

    TextEditor.prototype.removeSelection = function(selection) {
      _.remove(this.cursors, selection.cursor);
      _.remove(this.selections, selection);
      this.cursorsByMarkerId["delete"](selection.cursor.marker.id);
      this.emitter.emit('did-remove-cursor', selection.cursor);
      return this.emitter.emit('did-remove-selection', selection);
    };

    TextEditor.prototype.clearSelections = function(options) {
      this.consolidateSelections();
      return this.getLastSelection().clear(options);
    };

    TextEditor.prototype.consolidateSelections = function() {
      var l, len, ref3, selection, selections;
      selections = this.getSelections();
      if (selections.length > 1) {
        ref3 = selections.slice(1, selections.length);
        for (l = 0, len = ref3.length; l < len; l++) {
          selection = ref3[l];
          selection.destroy();
        }
        selections[0].autoscroll({
          center: true
        });
        return true;
      } else {
        return false;
      }
    };

    TextEditor.prototype.selectionRangeChanged = function(event) {
      var ref3;
      if ((ref3 = this.component) != null) {
        ref3.didChangeSelectionRange();
      }
      return this.emitter.emit('did-change-selection-range', event);
    };

    TextEditor.prototype.createLastSelectionIfNeeded = function() {
      if (this.selections.length === 0) {
        return this.addSelectionForBufferRange([[0, 0], [0, 0]], {
          autoscroll: false,
          preserveFolds: true
        });
      }
    };


    /*
    Section: Searching and Replacing
     */

    TextEditor.prototype.scan = function(regex, options, iterator) {
      if (options == null) {
        options = {};
      }
      if (_.isFunction(options)) {
        iterator = options;
        options = {};
      }
      return this.buffer.scan(regex, options, iterator);
    };

    TextEditor.prototype.scanInBufferRange = function(regex, range, iterator) {
      return this.buffer.scanInRange(regex, range, iterator);
    };

    TextEditor.prototype.backwardsScanInBufferRange = function(regex, range, iterator) {
      return this.buffer.backwardsScanInRange(regex, range, iterator);
    };


    /*
    Section: Tab Behavior
     */

    TextEditor.prototype.getSoftTabs = function() {
      return this.softTabs;
    };

    TextEditor.prototype.setSoftTabs = function(softTabs1) {
      this.softTabs = softTabs1;
      return this.update({
        softTabs: this.softTabs
      });
    };

    TextEditor.prototype.hasAtomicSoftTabs = function() {
      return this.displayLayer.atomicSoftTabs;
    };

    TextEditor.prototype.toggleSoftTabs = function() {
      return this.setSoftTabs(!this.getSoftTabs());
    };

    TextEditor.prototype.getTabLength = function() {
      return this.tokenizedBuffer.getTabLength();
    };

    TextEditor.prototype.setTabLength = function(tabLength) {
      return this.update({
        tabLength: tabLength
      });
    };

    TextEditor.prototype.getInvisibles = function() {
      if (!this.mini && this.showInvisibles && (this.invisibles != null)) {
        return this.invisibles;
      } else {
        return {};
      }
    };

    TextEditor.prototype.doesShowIndentGuide = function() {
      return this.showIndentGuide && !this.mini;
    };

    TextEditor.prototype.getSoftWrapHangingIndentLength = function() {
      return this.displayLayer.softWrapHangingIndent;
    };

    TextEditor.prototype.usesSoftTabs = function() {
      var bufferRow, l, line, ref3, ref4;
      for (bufferRow = l = 0, ref3 = Math.min(1000, this.buffer.getLastRow()); 0 <= ref3 ? l <= ref3 : l >= ref3; bufferRow = 0 <= ref3 ? ++l : --l) {
        if ((ref4 = this.tokenizedBuffer.tokenizedLines[bufferRow]) != null ? ref4.isComment() : void 0) {
          continue;
        }
        line = this.buffer.lineForRow(bufferRow);
        if (line[0] === ' ') {
          return true;
        }
        if (line[0] === '\t') {
          return false;
        }
      }
      return void 0;
    };

    TextEditor.prototype.getTabText = function() {
      return this.buildIndentString(1);
    };

    TextEditor.prototype.normalizeTabsInBufferRange = function(bufferRange) {
      if (!this.getSoftTabs()) {
        return;
      }
      return this.scanInBufferRange(/\t/g, bufferRange, (function(_this) {
        return function(arg) {
          var replace;
          replace = arg.replace;
          return replace(_this.getTabText());
        };
      })(this));
    };


    /*
    Section: Soft Wrap Behavior
     */

    TextEditor.prototype.isSoftWrapped = function() {
      return this.softWrapped;
    };

    TextEditor.prototype.setSoftWrapped = function(softWrapped) {
      this.update({
        softWrapped: softWrapped
      });
      return this.isSoftWrapped();
    };

    TextEditor.prototype.getPreferredLineLength = function() {
      return this.preferredLineLength;
    };

    TextEditor.prototype.toggleSoftWrapped = function() {
      return this.setSoftWrapped(!this.isSoftWrapped());
    };

    TextEditor.prototype.getSoftWrapColumn = function() {
      if (this.isSoftWrapped() && !this.mini) {
        if (this.softWrapAtPreferredLineLength) {
          return Math.min(this.getEditorWidthInChars(), this.preferredLineLength);
        } else {
          return this.getEditorWidthInChars();
        }
      } else {
        return MAX_SCREEN_LINE_LENGTH;
      }
    };


    /*
    Section: Indentation
     */

    TextEditor.prototype.indentationForBufferRow = function(bufferRow) {
      return this.indentLevelForLine(this.lineTextForBufferRow(bufferRow));
    };

    TextEditor.prototype.setIndentationForBufferRow = function(bufferRow, newLevel, arg) {
      var endColumn, newIndentString, preserveLeadingWhitespace;
      preserveLeadingWhitespace = (arg != null ? arg : {}).preserveLeadingWhitespace;
      if (preserveLeadingWhitespace) {
        endColumn = 0;
      } else {
        endColumn = this.lineTextForBufferRow(bufferRow).match(/^\s*/)[0].length;
      }
      newIndentString = this.buildIndentString(newLevel);
      return this.buffer.setTextInRange([[bufferRow, 0], [bufferRow, endColumn]], newIndentString);
    };

    TextEditor.prototype.indentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.indentSelectedRows();
      });
    };

    TextEditor.prototype.outdentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.outdentSelectedRows();
      });
    };

    TextEditor.prototype.indentLevelForLine = function(line) {
      return this.tokenizedBuffer.indentLevelForLine(line);
    };

    TextEditor.prototype.autoIndentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.autoIndentSelectedRows();
      });
    };

    TextEditor.prototype.indent = function(options) {
      if (options == null) {
        options = {};
      }
      if (options.autoIndent == null) {
        options.autoIndent = this.shouldAutoIndent();
      }
      return this.mutateSelectedText(function(selection) {
        return selection.indent(options);
      });
    };

    TextEditor.prototype.buildIndentString = function(level, column) {
      var excessWhitespace, tabStopViolation;
      if (column == null) {
        column = 0;
      }
      if (this.getSoftTabs()) {
        tabStopViolation = column % this.getTabLength();
        return _.multiplyString(" ", Math.floor(level * this.getTabLength()) - tabStopViolation);
      } else {
        excessWhitespace = _.multiplyString(' ', Math.round((level - Math.floor(level)) * this.getTabLength()));
        return _.multiplyString("\t", Math.floor(level)) + excessWhitespace;
      }
    };


    /*
    Section: Grammars
     */

    TextEditor.prototype.getGrammar = function() {
      return this.tokenizedBuffer.grammar;
    };

    TextEditor.prototype.setGrammar = function(grammar) {
      return this.tokenizedBuffer.setGrammar(grammar);
    };

    TextEditor.prototype.reloadGrammar = function() {
      return this.tokenizedBuffer.reloadGrammar();
    };

    TextEditor.prototype.onDidTokenize = function(callback) {
      return this.tokenizedBuffer.onDidTokenize(callback);
    };


    /*
    Section: Managing Syntax Scopes
     */

    TextEditor.prototype.getRootScopeDescriptor = function() {
      return this.tokenizedBuffer.rootScopeDescriptor;
    };

    TextEditor.prototype.scopeDescriptorForBufferPosition = function(bufferPosition) {
      return this.tokenizedBuffer.scopeDescriptorForPosition(bufferPosition);
    };

    TextEditor.prototype.bufferRangeForScopeAtCursor = function(scopeSelector) {
      return this.bufferRangeForScopeAtPosition(scopeSelector, this.getCursorBufferPosition());
    };

    TextEditor.prototype.bufferRangeForScopeAtPosition = function(scopeSelector, position) {
      return this.tokenizedBuffer.bufferRangeForScopeAtPosition(scopeSelector, position);
    };

    TextEditor.prototype.isBufferRowCommented = function(bufferRow) {
      var match;
      if (match = this.lineTextForBufferRow(bufferRow).match(/\S/)) {
        if (this.commentScopeSelector == null) {
          this.commentScopeSelector = new TextMateScopeSelector('comment.*');
        }
        return this.commentScopeSelector.matches(this.scopeDescriptorForBufferPosition([bufferRow, match.index]).scopes);
      }
    };

    TextEditor.prototype.getCursorScope = function() {
      return this.getLastCursor().getScopeDescriptor();
    };

    TextEditor.prototype.tokenForBufferPosition = function(bufferPosition) {
      return this.tokenizedBuffer.tokenForPosition(bufferPosition);
    };


    /*
    Section: Clipboard Operations
     */

    TextEditor.prototype.copySelectedText = function() {
      var l, len, maintainClipboard, previousRange, ref3, selection;
      maintainClipboard = false;
      ref3 = this.getSelectionsOrderedByBufferPosition();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        if (selection.isEmpty()) {
          previousRange = selection.getBufferRange();
          selection.selectLine();
          selection.copy(maintainClipboard, true);
          selection.setBufferRange(previousRange);
        } else {
          selection.copy(maintainClipboard, false);
        }
        maintainClipboard = true;
      }
    };

    TextEditor.prototype.copyOnlySelectedText = function() {
      var l, len, maintainClipboard, ref3, selection;
      maintainClipboard = false;
      ref3 = this.getSelectionsOrderedByBufferPosition();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        if (!selection.isEmpty()) {
          selection.copy(maintainClipboard, false);
          maintainClipboard = true;
        }
      }
    };

    TextEditor.prototype.cutSelectedText = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        if (selection.isEmpty()) {
          selection.selectLine();
          selection.cut(maintainClipboard, true);
        } else {
          selection.cut(maintainClipboard, false);
        }
        return maintainClipboard = true;
      });
    };

    TextEditor.prototype.pasteText = function(options) {
      var clipboardText, metadata, ref3;
      if (options == null) {
        options = {};
      }
      ref3 = this.constructor.clipboard.readWithMetadata(), clipboardText = ref3.text, metadata = ref3.metadata;
      if (!this.emitWillInsertTextEvent(clipboardText)) {
        return false;
      }
      if (metadata == null) {
        metadata = {};
      }
      options.autoIndent = this.shouldAutoIndentOnPaste();
      return this.mutateSelectedText((function(_this) {
        return function(selection, index) {
          var containsNewlines, cursor, didInsertEvent, fullLine, indentBasis, newPosition, oldPosition, range, ref4, ref5, text;
          if (((ref4 = metadata.selections) != null ? ref4.length : void 0) === _this.getSelections().length) {
            ref5 = metadata.selections[index], text = ref5.text, indentBasis = ref5.indentBasis, fullLine = ref5.fullLine;
          } else {
            indentBasis = metadata.indentBasis, fullLine = metadata.fullLine;
            text = clipboardText;
          }
          delete options.indentBasis;
          cursor = selection.cursor;
          if (indentBasis != null) {
            containsNewlines = text.indexOf('\n') !== -1;
            if (containsNewlines || !cursor.hasPrecedingCharactersOnLine()) {
              if (options.indentBasis == null) {
                options.indentBasis = indentBasis;
              }
            }
          }
          range = null;
          if (fullLine && selection.isEmpty()) {
            oldPosition = selection.getBufferRange().start;
            selection.setBufferRange([[oldPosition.row, 0], [oldPosition.row, 0]]);
            range = selection.insertText(text, options);
            newPosition = oldPosition.translate([1, 0]);
            selection.setBufferRange([newPosition, newPosition]);
          } else {
            range = selection.insertText(text, options);
          }
          didInsertEvent = {
            text: text,
            range: range
          };
          return _this.emitter.emit('did-insert-text', didInsertEvent);
        };
      })(this));
    };

    TextEditor.prototype.cutToEndOfLine = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        selection.cutToEndOfLine(maintainClipboard);
        return maintainClipboard = true;
      });
    };

    TextEditor.prototype.cutToEndOfBufferLine = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        selection.cutToEndOfBufferLine(maintainClipboard);
        return maintainClipboard = true;
      });
    };


    /*
    Section: Folds
     */

    TextEditor.prototype.foldCurrentRow = function() {
      var bufferRow;
      bufferRow = this.bufferPositionForScreenPosition(this.getCursorScreenPosition()).row;
      return this.foldBufferRow(bufferRow);
    };

    TextEditor.prototype.unfoldCurrentRow = function() {
      var bufferRow;
      bufferRow = this.bufferPositionForScreenPosition(this.getCursorScreenPosition()).row;
      return this.unfoldBufferRow(bufferRow);
    };

    TextEditor.prototype.foldBufferRow = function(bufferRow) {
      return this.languageMode.foldBufferRow(bufferRow);
    };

    TextEditor.prototype.unfoldBufferRow = function(bufferRow) {
      return this.displayLayer.destroyFoldsIntersectingBufferRange(Range(Point(bufferRow, 0), Point(bufferRow, 2e308)));
    };

    TextEditor.prototype.foldSelectedLines = function() {
      var l, len, ref3, selection;
      ref3 = this.getSelections();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.fold();
      }
    };

    TextEditor.prototype.foldAll = function() {
      return this.languageMode.foldAll();
    };

    TextEditor.prototype.unfoldAll = function() {
      this.languageMode.unfoldAll();
      return this.scrollToCursorPosition();
    };

    TextEditor.prototype.foldAllAtIndentLevel = function(level) {
      return this.languageMode.foldAllAtIndentLevel(level);
    };

    TextEditor.prototype.isFoldableAtBufferRow = function(bufferRow) {
      return this.tokenizedBuffer.isFoldableAtRow(bufferRow);
    };

    TextEditor.prototype.isFoldableAtScreenRow = function(screenRow) {
      return this.isFoldableAtBufferRow(this.bufferRowForScreenRow(screenRow));
    };

    TextEditor.prototype.toggleFoldAtBufferRow = function(bufferRow) {
      if (this.isFoldedAtBufferRow(bufferRow)) {
        return this.unfoldBufferRow(bufferRow);
      } else {
        return this.foldBufferRow(bufferRow);
      }
    };

    TextEditor.prototype.isFoldedAtCursorRow = function() {
      return this.isFoldedAtBufferRow(this.getCursorBufferPosition().row);
    };

    TextEditor.prototype.isFoldedAtBufferRow = function(bufferRow) {
      var range;
      range = Range(Point(bufferRow, 0), Point(bufferRow, this.buffer.lineLengthForRow(bufferRow)));
      return this.displayLayer.foldsIntersectingBufferRange(range).length > 0;
    };

    TextEditor.prototype.isFoldedAtScreenRow = function(screenRow) {
      return this.isFoldedAtBufferRow(this.bufferRowForScreenRow(screenRow));
    };

    TextEditor.prototype.foldBufferRowRange = function(startRow, endRow) {
      return this.foldBufferRange(Range(Point(startRow, 2e308), Point(endRow, 2e308)));
    };

    TextEditor.prototype.foldBufferRange = function(range) {
      return this.displayLayer.foldBufferRange(range);
    };

    TextEditor.prototype.destroyFoldsIntersectingBufferRange = function(bufferRange) {
      return this.displayLayer.destroyFoldsIntersectingBufferRange(bufferRange);
    };


    /*
    Section: Gutters
     */

    TextEditor.prototype.addGutter = function(options) {
      return this.gutterContainer.addGutter(options);
    };

    TextEditor.prototype.getGutters = function() {
      return this.gutterContainer.getGutters();
    };

    TextEditor.prototype.getLineNumberGutter = function() {
      return this.lineNumberGutter;
    };

    TextEditor.prototype.gutterWithName = function(name) {
      return this.gutterContainer.gutterWithName(name);
    };


    /*
    Section: Scrolling the TextEditor
     */

    TextEditor.prototype.scrollToCursorPosition = function(options) {
      var ref3;
      return this.getLastCursor().autoscroll({
        center: (ref3 = options != null ? options.center : void 0) != null ? ref3 : true
      });
    };

    TextEditor.prototype.scrollToBufferPosition = function(bufferPosition, options) {
      return this.scrollToScreenPosition(this.screenPositionForBufferPosition(bufferPosition), options);
    };

    TextEditor.prototype.scrollToScreenPosition = function(screenPosition, options) {
      return this.scrollToScreenRange(new Range(screenPosition, screenPosition), options);
    };

    TextEditor.prototype.scrollToTop = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::scrollToTop instead.");
      return this.getElement().scrollToTop();
    };

    TextEditor.prototype.scrollToBottom = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::scrollToTop instead.");
      return this.getElement().scrollToBottom();
    };

    TextEditor.prototype.scrollToScreenRange = function(screenRange, options) {
      var ref3, scrollEvent;
      if (options == null) {
        options = {};
      }
      if (options.clip !== false) {
        screenRange = this.clipScreenRange(screenRange);
      }
      scrollEvent = {
        screenRange: screenRange,
        options: options
      };
      if ((ref3 = this.component) != null) {
        ref3.didRequestAutoscroll(scrollEvent);
      }
      return this.emitter.emit("did-request-autoscroll", scrollEvent);
    };

    TextEditor.prototype.getHorizontalScrollbarHeight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getHorizontalScrollbarHeight instead.");
      return this.getElement().getHorizontalScrollbarHeight();
    };

    TextEditor.prototype.getVerticalScrollbarWidth = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getVerticalScrollbarWidth instead.");
      return this.getElement().getVerticalScrollbarWidth();
    };

    TextEditor.prototype.pageUp = function() {
      return this.moveUp(this.getRowsPerPage());
    };

    TextEditor.prototype.pageDown = function() {
      return this.moveDown(this.getRowsPerPage());
    };

    TextEditor.prototype.selectPageUp = function() {
      return this.selectUp(this.getRowsPerPage());
    };

    TextEditor.prototype.selectPageDown = function() {
      return this.selectDown(this.getRowsPerPage());
    };

    TextEditor.prototype.getRowsPerPage = function() {
      var clientHeight, lineHeight;
      if (this.component != null) {
        clientHeight = this.component.getScrollContainerClientHeight();
        lineHeight = this.component.getLineHeight();
        return Math.max(1, Math.ceil(clientHeight / lineHeight));
      } else {
        return 1;
      }
    };


    /*
    Section: Config
     */

    TextEditor.prototype.setScopedSettingsDelegate = function(scopedSettingsDelegate) {
      this.scopedSettingsDelegate = scopedSettingsDelegate;
    };

    TextEditor.prototype.getScopedSettingsDelegate = function() {
      return this.scopedSettingsDelegate;
    };

    TextEditor.prototype.shouldAutoIndent = function() {
      return this.autoIndent;
    };

    TextEditor.prototype.shouldAutoIndentOnPaste = function() {
      return this.autoIndentOnPaste;
    };

    TextEditor.prototype.getScrollPastEnd = function() {
      if (this.getAutoHeight()) {
        return false;
      } else {
        return this.scrollPastEnd;
      }
    };

    TextEditor.prototype.getScrollSensitivity = function() {
      return this.scrollSensitivity;
    };

    TextEditor.prototype.getShowCursorOnSelection = function() {
      return this.showCursorOnSelection;
    };

    TextEditor.prototype.doesShowLineNumbers = function() {
      return this.showLineNumbers;
    };

    TextEditor.prototype.getUndoGroupingInterval = function() {
      return this.undoGroupingInterval;
    };

    TextEditor.prototype.getNonWordCharacters = function(scopes) {
      var ref3, ref4;
      return (ref3 = (ref4 = this.scopedSettingsDelegate) != null ? typeof ref4.getNonWordCharacters === "function" ? ref4.getNonWordCharacters(scopes) : void 0 : void 0) != null ? ref3 : this.nonWordCharacters;
    };

    TextEditor.prototype.getCommentStrings = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getCommentStrings === "function" ? ref3.getCommentStrings(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getIncreaseIndentPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getIncreaseIndentPattern === "function" ? ref3.getIncreaseIndentPattern(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getDecreaseIndentPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getDecreaseIndentPattern === "function" ? ref3.getDecreaseIndentPattern(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getDecreaseNextIndentPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getDecreaseNextIndentPattern === "function" ? ref3.getDecreaseNextIndentPattern(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getFoldEndPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getFoldEndPattern === "function" ? ref3.getFoldEndPattern(scopes) : void 0 : void 0;
    };


    /*
    Section: Event Handlers
     */

    TextEditor.prototype.handleGrammarChange = function() {
      this.unfoldAll();
      return this.emitter.emit('did-change-grammar', this.getGrammar());
    };


    /*
    Section: TextEditor Rendering
     */

    TextEditor.prototype.getElement = function() {
      if (this.component != null) {
        return this.component.element;
      } else {
        if (TextEditorComponent == null) {
          TextEditorComponent = require('./text-editor-component');
        }
        if (TextEditorElement == null) {
          TextEditorElement = require('./text-editor-element');
        }
        new TextEditorComponent({
          model: this,
          updatedSynchronously: TextEditorElement.prototype.updatedSynchronously,
          initialScrollTopRow: this.initialScrollTopRow,
          initialScrollLeftColumn: this.initialScrollLeftColumn
        });
        return this.component.element;
      }
    };

    TextEditor.prototype.getAllowedLocations = function() {
      return ['center'];
    };

    TextEditor.prototype.getPlaceholderText = function() {
      return this.placeholderText;
    };

    TextEditor.prototype.setPlaceholderText = function(placeholderText) {
      return this.update({
        placeholderText: placeholderText
      });
    };

    TextEditor.prototype.pixelPositionForBufferPosition = function(bufferPosition) {
      Grim.deprecate("This method is deprecated on the model layer. Use `TextEditorElement::pixelPositionForBufferPosition` instead");
      return this.getElement().pixelPositionForBufferPosition(bufferPosition);
    };

    TextEditor.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      Grim.deprecate("This method is deprecated on the model layer. Use `TextEditorElement::pixelPositionForScreenPosition` instead");
      return this.getElement().pixelPositionForScreenPosition(screenPosition);
    };

    TextEditor.prototype.getVerticalScrollMargin = function() {
      var maxScrollMargin;
      maxScrollMargin = Math.floor(((this.height / this.getLineHeightInPixels()) - 1) / 2);
      return Math.min(this.verticalScrollMargin, maxScrollMargin);
    };

    TextEditor.prototype.setVerticalScrollMargin = function(verticalScrollMargin) {
      this.verticalScrollMargin = verticalScrollMargin;
      return this.verticalScrollMargin;
    };

    TextEditor.prototype.getHorizontalScrollMargin = function() {
      return Math.min(this.horizontalScrollMargin, Math.floor(((this.width / this.getDefaultCharWidth()) - 1) / 2));
    };

    TextEditor.prototype.setHorizontalScrollMargin = function(horizontalScrollMargin) {
      this.horizontalScrollMargin = horizontalScrollMargin;
      return this.horizontalScrollMargin;
    };

    TextEditor.prototype.getLineHeightInPixels = function() {
      return this.lineHeightInPixels;
    };

    TextEditor.prototype.setLineHeightInPixels = function(lineHeightInPixels) {
      this.lineHeightInPixels = lineHeightInPixels;
      return this.lineHeightInPixels;
    };

    TextEditor.prototype.getKoreanCharWidth = function() {
      return this.koreanCharWidth;
    };

    TextEditor.prototype.getHalfWidthCharWidth = function() {
      return this.halfWidthCharWidth;
    };

    TextEditor.prototype.getDoubleWidthCharWidth = function() {
      return this.doubleWidthCharWidth;
    };

    TextEditor.prototype.getDefaultCharWidth = function() {
      return this.defaultCharWidth;
    };

    TextEditor.prototype.ratioForCharacter = function(character) {
      if (isKoreanCharacter(character)) {
        return this.getKoreanCharWidth() / this.getDefaultCharWidth();
      } else if (isHalfWidthCharacter(character)) {
        return this.getHalfWidthCharWidth() / this.getDefaultCharWidth();
      } else if (isDoubleWidthCharacter(character)) {
        return this.getDoubleWidthCharWidth() / this.getDefaultCharWidth();
      } else {
        return 1;
      }
    };

    TextEditor.prototype.setDefaultCharWidth = function(defaultCharWidth, doubleWidthCharWidth, halfWidthCharWidth, koreanCharWidth) {
      if (doubleWidthCharWidth == null) {
        doubleWidthCharWidth = defaultCharWidth;
      }
      if (halfWidthCharWidth == null) {
        halfWidthCharWidth = defaultCharWidth;
      }
      if (koreanCharWidth == null) {
        koreanCharWidth = defaultCharWidth;
      }
      if (defaultCharWidth !== this.defaultCharWidth || doubleWidthCharWidth !== this.doubleWidthCharWidth && halfWidthCharWidth !== this.halfWidthCharWidth && koreanCharWidth !== this.koreanCharWidth) {
        this.defaultCharWidth = defaultCharWidth;
        this.doubleWidthCharWidth = doubleWidthCharWidth;
        this.halfWidthCharWidth = halfWidthCharWidth;
        this.koreanCharWidth = koreanCharWidth;
        if (this.isSoftWrapped()) {
          this.displayLayer.reset({
            softWrapColumn: this.getSoftWrapColumn()
          });
        }
      }
      return defaultCharWidth;
    };

    TextEditor.prototype.setHeight = function(height) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setHeight instead.");
      return this.getElement().setHeight(height);
    };

    TextEditor.prototype.getHeight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getHeight instead.");
      return this.getElement().getHeight();
    };

    TextEditor.prototype.getAutoHeight = function() {
      var ref3;
      return (ref3 = this.autoHeight) != null ? ref3 : true;
    };

    TextEditor.prototype.getAutoWidth = function() {
      var ref3;
      return (ref3 = this.autoWidth) != null ? ref3 : false;
    };

    TextEditor.prototype.setWidth = function(width) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setWidth instead.");
      return this.getElement().setWidth(width);
    };

    TextEditor.prototype.getWidth = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getWidth instead.");
      return this.getElement().getWidth();
    };

    TextEditor.prototype.setFirstVisibleScreenRow = function(screenRow) {
      return this.setScrollTopRow(screenRow);
    };

    TextEditor.prototype.getFirstVisibleScreenRow = function() {
      return this.getElement().component.getFirstVisibleRow();
    };

    TextEditor.prototype.getLastVisibleScreenRow = function() {
      return this.getElement().component.getLastVisibleRow();
    };

    TextEditor.prototype.getVisibleRowRange = function() {
      return [this.getFirstVisibleScreenRow(), this.getLastVisibleScreenRow()];
    };

    TextEditor.prototype.setFirstVisibleScreenColumn = function(column) {
      return this.setScrollLeftColumn(column);
    };

    TextEditor.prototype.getFirstVisibleScreenColumn = function() {
      return this.getElement().component.getFirstVisibleColumn();
    };

    TextEditor.prototype.getScrollTop = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollTop instead.");
      return this.getElement().getScrollTop();
    };

    TextEditor.prototype.setScrollTop = function(scrollTop) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollTop instead.");
      return this.getElement().setScrollTop(scrollTop);
    };

    TextEditor.prototype.getScrollBottom = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollBottom instead.");
      return this.getElement().getScrollBottom();
    };

    TextEditor.prototype.setScrollBottom = function(scrollBottom) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollBottom instead.");
      return this.getElement().setScrollBottom(scrollBottom);
    };

    TextEditor.prototype.getScrollLeft = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollLeft instead.");
      return this.getElement().getScrollLeft();
    };

    TextEditor.prototype.setScrollLeft = function(scrollLeft) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollLeft instead.");
      return this.getElement().setScrollLeft(scrollLeft);
    };

    TextEditor.prototype.getScrollRight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollRight instead.");
      return this.getElement().getScrollRight();
    };

    TextEditor.prototype.setScrollRight = function(scrollRight) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollRight instead.");
      return this.getElement().setScrollRight(scrollRight);
    };

    TextEditor.prototype.getScrollHeight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollHeight instead.");
      return this.getElement().getScrollHeight();
    };

    TextEditor.prototype.getScrollWidth = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollWidth instead.");
      return this.getElement().getScrollWidth();
    };

    TextEditor.prototype.getMaxScrollTop = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getMaxScrollTop instead.");
      return this.getElement().getMaxScrollTop();
    };

    TextEditor.prototype.getScrollTopRow = function() {
      return this.getElement().component.getScrollTopRow();
    };

    TextEditor.prototype.setScrollTopRow = function(scrollTopRow) {
      return this.getElement().component.setScrollTopRow(scrollTopRow);
    };

    TextEditor.prototype.getScrollLeftColumn = function() {
      return this.getElement().component.getScrollLeftColumn();
    };

    TextEditor.prototype.setScrollLeftColumn = function(scrollLeftColumn) {
      return this.getElement().component.setScrollLeftColumn(scrollLeftColumn);
    };

    TextEditor.prototype.intersectsVisibleRowRange = function(startRow, endRow) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::intersectsVisibleRowRange instead.");
      return this.getElement().intersectsVisibleRowRange(startRow, endRow);
    };

    TextEditor.prototype.selectionIntersectsVisibleRowRange = function(selection) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::selectionIntersectsVisibleRowRange instead.");
      return this.getElement().selectionIntersectsVisibleRowRange(selection);
    };

    TextEditor.prototype.screenPositionForPixelPosition = function(pixelPosition) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::screenPositionForPixelPosition instead.");
      return this.getElement().screenPositionForPixelPosition(pixelPosition);
    };

    TextEditor.prototype.pixelRectForScreenRange = function(screenRange) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::pixelRectForScreenRange instead.");
      return this.getElement().pixelRectForScreenRange(screenRange);
    };


    /*
    Section: Utility
     */

    TextEditor.prototype.inspect = function() {
      return "<TextEditor " + this.id + ">";
    };

    TextEditor.prototype.emitWillInsertTextEvent = function(text) {
      var cancel, result, willInsertEvent;
      result = true;
      cancel = function() {
        return result = false;
      };
      willInsertEvent = {
        cancel: cancel,
        text: text
      };
      this.emitter.emit('will-insert-text', willInsertEvent);
      return result;
    };


    /*
    Section: Language Mode Delegated Methods
     */

    TextEditor.prototype.suggestedIndentForBufferRow = function(bufferRow, options) {
      return this.languageMode.suggestedIndentForBufferRow(bufferRow, options);
    };

    TextEditor.prototype.autoIndentBufferRow = function(bufferRow, options) {
      return this.languageMode.autoIndentBufferRow(bufferRow, options);
    };

    TextEditor.prototype.autoIndentBufferRows = function(startRow, endRow) {
      return this.languageMode.autoIndentBufferRows(startRow, endRow);
    };

    TextEditor.prototype.autoDecreaseIndentForBufferRow = function(bufferRow) {
      return this.languageMode.autoDecreaseIndentForBufferRow(bufferRow);
    };

    TextEditor.prototype.toggleLineCommentForBufferRow = function(row) {
      return this.languageMode.toggleLineCommentsForBufferRow(row);
    };

    TextEditor.prototype.toggleLineCommentsForBufferRows = function(start, end) {
      return this.languageMode.toggleLineCommentsForBufferRows(start, end);
    };

    return TextEditor;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3RleHQtZWRpdG9yLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsd1lBQUE7SUFBQTs7Ozs7RUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLE1BQTZDLE9BQUEsQ0FBUSxXQUFSLENBQTdDLEVBQUMsNkNBQUQsRUFBc0IsMkJBQXRCLEVBQWtDOztFQUNsQyxPQUFpQixVQUFBLEdBQWEsT0FBQSxDQUFRLGFBQVIsQ0FBOUIsRUFBQyxrQkFBRCxFQUFROztFQUNSLFlBQUEsR0FBZSxPQUFBLENBQVEsaUJBQVI7O0VBQ2YsaUJBQUEsR0FBb0IsT0FBQSxDQUFRLHNCQUFSOztFQUNwQixlQUFBLEdBQWtCLE9BQUEsQ0FBUSxvQkFBUjs7RUFDbEIsTUFBQSxHQUFTLE9BQUEsQ0FBUSxVQUFSOztFQUNULEtBQUEsR0FBUSxPQUFBLENBQVEsU0FBUjs7RUFDUixTQUFBLEdBQVksT0FBQSxDQUFRLGFBQVI7O0VBQ1oscUJBQUEsR0FBd0IsT0FBQSxDQUFRLFlBQVIsQ0FBcUIsQ0FBQzs7RUFDOUMsZUFBQSxHQUFrQixPQUFBLENBQVEsb0JBQVI7O0VBQ2xCLG1CQUFBLEdBQXNCOztFQUN0QixpQkFBQSxHQUFvQjs7RUFDcEIsT0FBb0YsT0FBQSxDQUFRLGNBQVIsQ0FBcEYsRUFBQyxvREFBRCxFQUF5QixnREFBekIsRUFBK0MsMENBQS9DLEVBQWtFOztFQUVsRSxlQUFBLEdBQWtCOztFQUNsQixzQkFBQSxHQUF5Qjs7RUF3Q3pCLE1BQU0sQ0FBQyxPQUFQLEdBQ007OztJQUNKLFVBQUMsQ0FBQSxZQUFELEdBQWUsU0FBQyxTQUFEO2FBQ2Is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cmNlc0NvbnRlbnQiOlsiXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbnBhdGggPSByZXF1aXJlICdwYXRoJ1xuZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuR3JpbSA9IHJlcXVpcmUgJ2dyaW0nXG57Q29tcG9zaXRlRGlzcG9zYWJsZSwgRGlzcG9zYWJsZSwgRW1pdHRlcn0gPSByZXF1aXJlICdldmVudC1raXQnXG57UG9pbnQsIFJhbmdlfSA9IFRleHRCdWZmZXIgPSByZXF1aXJlICd0ZXh0LWJ1ZmZlcidcbkxhbmd1YWdlTW9kZSA9IHJlcXVpcmUgJy4vbGFuZ3VhZ2UtbW9kZSdcbkRlY29yYXRpb25NYW5hZ2VyID0gcmVxdWlyZSAnLi9kZWNvcmF0aW9uLW1hbmFnZXInXG5Ub2tlbml6ZWRCdWZmZXIgPSByZXF1aXJlICcuL3Rva2VuaXplZC1idWZmZXInXG5DdXJzb3IgPSByZXF1aXJlICcuL2N1cnNvcidcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcblNlbGVjdGlvbiA9IHJlcXVpcmUgJy4vc2VsZWN0aW9uJ1xuVGV4dE1hdGVTY29wZVNlbGVjdG9yID0gcmVxdWlyZSgnZmlyc3QtbWF0ZScpLlNjb3BlU2VsZWN0b3Jcbkd1dHRlckNvbnRhaW5lciA9IHJlcXVpcmUgJy4vZ3V0dGVyLWNvbnRhaW5lcidcblRleHRFZGl0b3JDb21wb25lbnQgPSBudWxsXG5UZXh0RWRpdG9yRWxlbWVudCA9IG51bGxcbntpc0RvdWJsZVdpZHRoQ2hhcmFjdGVyLCBpc0hhbGZXaWR0aENoYXJhY3RlciwgaXNLb3JlYW5DaGFyYWN0ZXIsIGlzV3JhcEJvdW5kYXJ5fSA9IHJlcXVpcmUgJy4vdGV4dC11dGlscydcblxuWkVST19XSURUSF9OQlNQID0gJ1xcdWZlZmYnXG5NQVhfU0NSRUVOX0xJTkVfTEVOR1RIID0gNTAwXG5cbiMgRXNzZW50aWFsOiBUaGlzIGNsYXNzIHJlcHJlc2VudHMgYWxsIGVzc2VudGlhbCBlZGl0aW5nIHN0YXRlIGZvciBhIHNpbmdsZVxuIyB7VGV4dEJ1ZmZlcn0sIGluY2x1ZGluZyBjdXJzb3IgYW5kIHNlbGVjdGlvbiBwb3NpdGlvbnMsIGZvbGRzLCBhbmQgc29mdCB3cmFwcy5cbiMgSWYgeW91J3JlIG1hbmlwdWxhdGluZyB0aGUgc3RhdGUgb2YgYW4gZWRpdG9yLCB1c2UgdGhpcyBjbGFzcy5cbiNcbiMgQSBzaW5nbGUge1RleHRCdWZmZXJ9IGNhbiBiZWxvbmcgdG8gbXVsdGlwbGUgZWRpdG9ycy4gRm9yIGV4YW1wbGUsIGlmIHRoZVxuIyBzYW1lIGZpbGUgaXMgb3BlbiBpbiB0d28gZGlmZmVyZW50IHBhbmVzLCBBdG9tIGNyZWF0ZXMgYSBzZXBhcmF0ZSBlZGl0b3IgZm9yXG4jIGVhY2ggcGFuZS4gSWYgdGhlIGJ1ZmZlciBpcyBtYW5pcHVsYXRlZCB0aGUgY2hhbmdlcyBhcmUgcmVmbGVjdGVkIGluIGJvdGhcbiMgZWRpdG9ycywgYnV0IGVhY2ggbWFpbnRhaW5zIGl0cyBvd24gY3Vyc29yIHBvc2l0aW9uLCBmb2xkZWQgbGluZXMsIGV0Yy5cbiNcbiMgIyMgQWNjZXNzaW5nIFRleHRFZGl0b3IgSW5zdGFuY2VzXG4jXG4jIFRoZSBlYXNpZXN0IHdheSB0byBnZXQgaG9sZCBvZiBgVGV4dEVkaXRvcmAgb2JqZWN0cyBpcyBieSByZWdpc3RlcmluZyBhIGNhbGxiYWNrXG4jIHdpdGggYDo6b2JzZXJ2ZVRleHRFZGl0b3JzYCBvbiB0aGUgYGF0b20ud29ya3NwYWNlYCBnbG9iYWwuIFlvdXIgY2FsbGJhY2sgd2lsbFxuIyB0aGVuIGJlIGNhbGxlZCB3aXRoIGFsbCBjdXJyZW50IGVkaXRvciBpbnN0YW5jZXMgYW5kIGFsc28gd2hlbiBhbnkgZWRpdG9yIGlzXG4jIGNyZWF0ZWQgaW4gdGhlIGZ1dHVyZS5cbiNcbiMgYGBgY29mZmVlXG4jIGF0b20ud29ya3NwYWNlLm9ic2VydmVUZXh0RWRpdG9ycyAoZWRpdG9yKSAtPlxuIyAgIGVkaXRvci5pbnNlcnRUZXh0KCdIZWxsbyBXb3JsZCcpXG4jIGBgYFxuI1xuIyAjIyBCdWZmZXIgdnMuIFNjcmVlbiBDb29yZGluYXRlc1xuI1xuIyBCZWNhdXNlIGVkaXRvcnMgc3VwcG9ydCBmb2xkcyBhbmQgc29mdC13cmFwcGluZywgdGhlIGxpbmVzIG9uIHNjcmVlbiBkb24ndFxuIyBhbHdheXMgbWF0Y2ggdGhlIGxpbmVzIGluIHRoZSBidWZmZXIuIEZvciBleGFtcGxlLCBhIGxvbmcgbGluZSB0aGF0IHNvZnQgd3JhcHNcbiMgdHdpY2UgcmVuZGVycyBhcyB0aHJlZSBsaW5lcyBvbiBzY3JlZW4sIGJ1dCBvbmx5IHJlcHJlc2VudHMgb25lIGxpbmUgaW4gdGhlXG4jIGJ1ZmZlci4gU2ltaWxhcmx5LCBpZiByb3dzIDUtMTAgYXJlIGZvbGRlZCwgdGhlbiByb3cgNiBvbiBzY3JlZW4gY29ycmVzcG9uZHNcbiMgdG8gcm93IDExIGluIHRoZSBidWZmZXIuXG4jXG4jIFlvdXIgY2hvaWNlIG9mIGNvb3JkaW5hdGVzIHN5c3RlbXMgd2lsbCBkZXBlbmQgb24gd2hhdCB5b3UncmUgdHJ5aW5nIHRvXG4jIGFjaGlldmUuIEZvciBleGFtcGxlLCBpZiB5b3UncmUgd3JpdGluZyBhIGNvbW1hbmQgdGhhdCBqdW1wcyB0aGUgY3Vyc29yIHVwIG9yXG4jIGRvd24gYnkgMTAgbGluZXMsIHlvdSdsbCB3YW50IHRvIHVzZSBzY3JlZW4gY29vcmRpbmF0ZXMgYmVjYXVzZSB0aGUgdXNlclxuIyBwcm9iYWJseSB3YW50cyB0byBza2lwIGxpbmVzICpvbiBzY3JlZW4qLiBIb3dldmVyLCBpZiB5b3UncmUgd3JpdGluZyBhIHBhY2thZ2VcbiMgdGhhdCBqdW1wcyBiZXR3ZWVuIG1ldGhvZCBkZWZpbml0aW9ucywgeW91J2xsIHdhbnQgdG8gd29yayBpbiBidWZmZXJcbiMgY29vcmRpbmF0ZXMuXG4jXG4jICoqV2hlbiBpbiBkb3VidCwganVzdCBkZWZhdWx0IHRvIGJ1ZmZlciBjb29yZGluYXRlcyoqLCB0aGVuIGV4cGVyaW1lbnQgd2l0aFxuIyBzb2Z0IHdyYXBzIGFuZCBmb2xkcyB0byBlbnN1cmUgeW91ciBjb2RlIGludGVyYWN0cyB3aXRoIHRoZW0gY29ycmVjdGx5LlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVGV4dEVkaXRvciBleHRlbmRzIE1vZGVsXG4gIEBzZXRDbGlwYm9hcmQ6IChjbGlwYm9hcmQpIC0+XG4gICAgQGNsaXBib2FyZCA9IGNsaXBib2FyZFxuXG4gIEBzZXRTY2hlZHVsZXI6IChzY2hlZHVsZXIpIC0+XG4gICAgVGV4dEVkaXRvckNvbXBvbmVudCA/PSByZXF1aXJlICcuL3RleHQtZWRpdG9yLWNvbXBvbmVudCdcbiAgICBUZXh0RWRpdG9yQ29tcG9uZW50LnNldFNjaGVkdWxlcihzY2hlZHVsZXIpXG5cbiAgQGRpZFVwZGF0ZVN0eWxlczogLT5cbiAgICBUZXh0RWRpdG9yQ29tcG9uZW50ID89IHJlcXVpcmUgJy4vdGV4dC1lZGl0b3ItY29tcG9uZW50J1xuICAgIFRleHRFZGl0b3JDb21wb25lbnQuZGlkVXBkYXRlU3R5bGVzKClcblxuICBAZGlkVXBkYXRlU2Nyb2xsYmFyU3R5bGVzOiAtPlxuICAgIFRleHRFZGl0b3JDb21wb25lbnQgPz0gcmVxdWlyZSAnLi90ZXh0LWVkaXRvci1jb21wb25lbnQnXG4gICAgVGV4dEVkaXRvckNvbXBvbmVudC5kaWRVcGRhdGVTY3JvbGxiYXJTdHlsZXMoKVxuXG4gIEB2aWV3Rm9ySXRlbTogKGl0ZW0pIC0+IGl0ZW0uZWxlbWVudCA/IGl0ZW1cblxuICBzZXJpYWxpemF0aW9uVmVyc2lvbjogMVxuXG4gIGJ1ZmZlcjogbnVsbFxuICBsYW5ndWFnZU1vZGU6IG51bGxcbiAgY3Vyc29yczogbnVsbFxuICBzaG93Q3Vyc29yT25TZWxlY3Rpb246IG51bGxcbiAgc2VsZWN0aW9uczogbnVsbFxuICBzdXBwcmVzc1NlbGVjdGlvbk1lcmdpbmc6IGZhbHNlXG4gIHNlbGVjdGlvbkZsYXNoRHVyYXRpb246IDUwMFxuICBndXR0ZXJDb250YWluZXI6IG51bGxcbiAgZWRpdG9yRWxlbWVudDogbnVsbFxuICB2ZXJ0aWNhbFNjcm9sbE1hcmdpbjogMlxuICBob3Jpem9udGFsU2Nyb2xsTWFyZ2luOiA2XG4gIHNvZnRXcmFwcGVkOiBudWxsXG4gIGVkaXRvcldpZHRoSW5DaGFyczogbnVsbFxuICBsaW5lSGVpZ2h0SW5QaXhlbHM6IG51bGxcbiAgZGVmYXVsdENoYXJXaWR0aDogbnVsbFxuICBoZWlnaHQ6IG51bGxcbiAgd2lkdGg6IG51bGxcbiAgcmVnaXN0ZXJlZDogZmFsc2VcbiAgYXRvbWljU29mdFRhYnM6IHRydWVcbiAgaW52aXNpYmxlczogbnVsbFxuICBzY3JvbGxTZW5zaXRpdml0eTogNDBcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkgQHByb3RvdHlwZSwgXCJlbGVtZW50XCIsXG4gICAgZ2V0OiAtPiBAZ2V0RWxlbWVudCgpXG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5IEBwcm90b3R5cGUsIFwiZWRpdG9yRWxlbWVudFwiLFxuICAgIGdldDogLT5cbiAgICAgIEdyaW0uZGVwcmVjYXRlKFwiXCJcIlxuICAgICAgICBgVGV4dEVkaXRvci5wcm90b3R5cGUuZWRpdG9yRWxlbWVudGAgaGFzIGFsd2F5cyBiZWVuIHByaXZhdGUsIGJ1dCBub3dcbiAgICAgICAgaXQgaXMgZ29uZS4gUmVhZGluZyB0aGUgYGVkaXRvckVsZW1lbnRgIHByb3BlcnR5IHN0aWxsIHJldHVybnMgYVxuICAgICAgICByZWZlcmVuY2UgdG8gdGhlIGVkaXRvciBlbGVtZW50IGJ1dCB0aGlzIGZpZWxkIHdpbGwgYmUgcmVtb3ZlZCBpbiBhXG4gICAgICAgIGxhdGVyIHZlcnNpb24gb2YgQXRvbSwgc28gd2UgcmVjb21tZW5kIHVzaW5nIHRoZSBgZWxlbWVudGAgcHJvcGVydHkgaW5zdGVhZC5cbiAgICAgIFwiXCJcIilcblxuICAgICAgQGdldEVsZW1lbnQoKVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShAcHJvdG90eXBlLCAnZGlzcGxheUJ1ZmZlcicsIGdldDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlwiXCJcbiAgICAgIGBUZXh0RWRpdG9yLnByb3RvdHlwZS5kaXNwbGF5QnVmZmVyYCBoYXMgYWx3YXlzIGJlZW4gcHJpdmF0ZSwgYnV0IG5vd1xuICAgICAgaXQgaXMgZ29uZS4gUmVhZGluZyB0aGUgYGRpc3BsYXlCdWZmZXJgIHByb3BlcnR5IG5vdyByZXR1cm5zIGEgcmVmZXJlbmNlXG4gICAgICB0byB0aGUgY29udGFpbmluZyBgVGV4dEVkaXRvcmAsIHdoaWNoIG5vdyBwcm92aWRlcyAqc29tZSogb2YgdGhlIEFQSSBvZlxuICAgICAgdGhlIGRlZnVuY3QgYERpc3BsYXlCdWZmZXJgIGNsYXNzLlxuICAgIFwiXCJcIilcbiAgICB0aGlzXG4gIClcblxuICBAZGVzZXJpYWxpemU6IChzdGF0ZSwgYXRvbUVudmlyb25tZW50KSAtPlxuICAgICMgVE9ETzogUmV0dXJuIG51bGwgb24gdmVyc2lvbiBtaXNtYXRjaCB3aGVuIDEuOC4wIGhhcyBiZWVuIG91dCBmb3IgYSB3aGlsZVxuICAgIGlmIHN0YXRlLnZlcnNpb24gaXNudCBAcHJvdG90eXBlLnNlcmlhbGl6YXRpb25WZXJzaW9uIGFuZCBzdGF0ZS5kaXNwbGF5QnVmZmVyP1xuICAgICAgc3RhdGUudG9rZW5pemVkQnVmZmVyID0gc3RhdGUuZGlzcGxheUJ1ZmZlci50b2tlbml6ZWRCdWZmZXJcblxuICAgIHRyeVxuICAgICAgc3RhdGUudG9rZW5pemVkQnVmZmVyID0gVG9rZW5pemVkQnVmZmVyLmRlc2VyaWFsaXplKHN0YXRlLnRva2VuaXplZEJ1ZmZlciwgYXRvbUVudmlyb25tZW50KVxuICAgICAgc3RhdGUudGFiTGVuZ3RoID0gc3RhdGUudG9rZW5pemVkQnVmZmVyLmdldFRhYkxlbmd0aCgpXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgIGlmIGVycm9yLnN5c2NhbGwgaXMgJ3JlYWQnXG4gICAgICAgIHJldHVybiAjIEVycm9yIHJlYWRpbmcgdGhlIGZpbGUsIGRvbid0IGRlc2VyaWFsaXplIGFuIGVkaXRvciBmb3IgaXRcbiAgICAgIGVsc2VcbiAgICAgICAgdGhyb3cgZXJyb3JcblxuICAgIHN0YXRlLmJ1ZmZlciA9IHN0YXRlLnRva2VuaXplZEJ1ZmZlci5idWZmZXJcbiAgICBzdGF0ZS5hc3NlcnQgPSBhdG9tRW52aXJvbm1lbnQuYXNzZXJ0LmJpbmQoYXRvbUVudmlyb25tZW50KVxuICAgIGVkaXRvciA9IG5ldyB0aGlzKHN0YXRlKVxuICAgIGlmIHN0YXRlLnJlZ2lzdGVyZWRcbiAgICAgIGRpc3Bvc2FibGUgPSBhdG9tRW52aXJvbm1lbnQudGV4dEVkaXRvcnMuYWRkKGVkaXRvcilcbiAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3kgLT4gZGlzcG9zYWJsZS5kaXNwb3NlKClcbiAgICBlZGl0b3JcblxuICBjb25zdHJ1Y3RvcjogKHBhcmFtcz17fSkgLT5cbiAgICB1bmxlc3MgQGNvbnN0cnVjdG9yLmNsaXBib2FyZD9cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgY2FsbCBUZXh0RWRpdG9yLnNldENsaXBib2FyZCBhdCBsZWFzdCBvbmNlIGJlZm9yZSBjcmVhdGluZyBUZXh0RWRpdG9yIGluc3RhbmNlc1wiKVxuXG4gICAgc3VwZXJcblxuICAgIHtcbiAgICAgIEBzb2Z0VGFicywgQGluaXRpYWxTY3JvbGxUb3BSb3csIEBpbml0aWFsU2Nyb2xsTGVmdENvbHVtbiwgaW5pdGlhbExpbmUsIGluaXRpYWxDb2x1bW4sIHRhYkxlbmd0aCxcbiAgICAgIEBzb2Z0V3JhcHBlZCwgQGRlY29yYXRpb25NYW5hZ2VyLCBAc2VsZWN0aW9uc01hcmtlckxheWVyLCBAYnVmZmVyLCBzdXBwcmVzc0N1cnNvckNyZWF0aW9uLFxuICAgICAgQG1pbmksIEBwbGFjZWhvbGRlclRleHQsIGxpbmVOdW1iZXJHdXR0ZXJWaXNpYmxlLCBAc2hvd0xpbmVOdW1iZXJzLCBAbGFyZ2VGaWxlTW9kZSxcbiAgICAgIEBhc3NlcnQsIGdyYW1tYXIsIEBzaG93SW52aXNpYmxlcywgQGF1dG9IZWlnaHQsIEBhdXRvV2lkdGgsIEBzY3JvbGxQYXN0RW5kLCBAZWRpdG9yV2lkdGhJbkNoYXJzLFxuICAgICAgQHRva2VuaXplZEJ1ZmZlciwgQGRpc3BsYXlMYXllciwgQGludmlzaWJsZXMsIEBzaG93SW5kZW50R3VpZGUsXG4gICAgICBAc29mdFdyYXBwZWQsIEBzb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aCwgQHByZWZlcnJlZExpbmVMZW5ndGgsXG4gICAgICBAc2hvd0N1cnNvck9uU2VsZWN0aW9uXG4gICAgfSA9IHBhcmFtc1xuXG4gICAgQGFzc2VydCA/PSAoY29uZGl0aW9uKSAtPiBjb25kaXRpb25cbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG4gICAgQGRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAY3Vyc29ycyA9IFtdXG4gICAgQGN1cnNvcnNCeU1hcmtlcklkID0gbmV3IE1hcFxuICAgIEBzZWxlY3Rpb25zID0gW11cbiAgICBAaGFzVGVybWluYXRlZFBlbmRpbmdTdGF0ZSA9IGZhbHNlXG5cbiAgICBAbWluaSA/PSBmYWxzZVxuICAgIEBzY3JvbGxQYXN0RW5kID89IGZhbHNlXG4gICAgQHNob3dJbnZpc2libGVzID89IHRydWVcbiAgICBAc29mdFRhYnMgPz0gdHJ1ZVxuICAgIHRhYkxlbmd0aCA/PSAyXG4gICAgQGF1dG9JbmRlbnQgPz0gdHJ1ZVxuICAgIEBhdXRvSW5kZW50T25QYXN0ZSA/PSB0cnVlXG4gICAgQHNob3dDdXJzb3JPblNlbGVjdGlvbiA/PSB0cnVlXG4gICAgQHVuZG9Hcm91cGluZ0ludGVydmFsID89IDMwMFxuICAgIEBub25Xb3JkQ2hhcmFjdGVycyA/PSBcIi9cXFxcKClcXFwiJzosLjs8Pn4hQCMkJV4mKnwrPVtde31gPy3igKZcIlxuICAgIEBzb2Z0V3JhcHBlZCA/PSBmYWxzZVxuICAgIEBzb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aCA/PSBmYWxzZVxuICAgIEBwcmVmZXJyZWRMaW5lTGVuZ3RoID89IDgwXG4gICAgQHNob3dMaW5lTnVtYmVycyA/PSB0cnVlXG5cbiAgICBAYnVmZmVyID89IG5ldyBUZXh0QnVmZmVyKHtcbiAgICAgIHNob3VsZERlc3Ryb3lPbkZpbGVEZWxldGU6IC0+IGF0b20uY29uZmlnLmdldCgnY29yZS5jbG9zZURlbGV0ZWRGaWxlVGFicycpXG4gICAgfSlcbiAgICBAdG9rZW5pemVkQnVmZmVyID89IG5ldyBUb2tlbml6ZWRCdWZmZXIoe1xuICAgICAgZ3JhbW1hciwgdGFiTGVuZ3RoLCBAYnVmZmVyLCBAbGFyZ2VGaWxlTW9kZSwgQGFzc2VydFxuICAgIH0pXG5cbiAgICB1bmxlc3MgQGRpc3BsYXlMYXllcj9cbiAgICAgIGRpc3BsYXlMYXllclBhcmFtcyA9IHtcbiAgICAgICAgaW52aXNpYmxlczogQGdldEludmlzaWJsZXMoKSxcbiAgICAgICAgc29mdFdyYXBDb2x1bW46IEBnZXRTb2Z0V3JhcENvbHVtbigpLFxuICAgICAgICBzaG93SW5kZW50R3VpZGVzOiBAZG9lc1Nob3dJbmRlbnRHdWlkZSgpLFxuICAgICAgICBhdG9taWNTb2Z0VGFiczogcGFyYW1zLmF0b21pY1NvZnRUYWJzID8gdHJ1ZSxcbiAgICAgICAgdGFiTGVuZ3RoOiB0YWJMZW5ndGgsXG4gICAgICAgIHJhdGlvRm9yQ2hhcmFjdGVyOiBAcmF0aW9Gb3JDaGFyYWN0ZXIuYmluZCh0aGlzKSxcbiAgICAgICAgaXNXcmFwQm91bmRhcnk6IGlzV3JhcEJvdW5kYXJ5LFxuICAgICAgICBmb2xkQ2hhcmFjdGVyOiBaRVJPX1dJRFRIX05CU1AsXG4gICAgICAgIHNvZnRXcmFwSGFuZ2luZ0luZGVudDogcGFyYW1zLnNvZnRXcmFwSGFuZ2luZ0luZGVudExlbmd0aCA/IDBcbiAgICAgIH1cblxuICAgICAgaWYgQGRpc3BsYXlMYXllciA9IEBidWZmZXIuZ2V0RGlzcGxheUxheWVyKHBhcmFtcy5kaXNwbGF5TGF5ZXJJZClcbiAgICAgICAgQGRpc3BsYXlMYXllci5yZXNldChkaXNwbGF5TGF5ZXJQYXJhbXMpXG4gICAgICAgIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIgPSBAZGlzcGxheUxheWVyLmdldE1hcmtlckxheWVyKHBhcmFtcy5zZWxlY3Rpb25zTWFya2VyTGF5ZXJJZClcbiAgICAgIGVsc2VcbiAgICAgICAgQGRpc3BsYXlMYXllciA9IEBidWZmZXIuYWRkRGlzcGxheUxheWVyKGRpc3BsYXlMYXllclBhcmFtcylcblxuICAgIEBiYWNrZ3JvdW5kV29ya0hhbmRsZSA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soQGRvQmFja2dyb3VuZFdvcmspXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBuZXcgRGlzcG9zYWJsZSA9PlxuICAgICAgY2FuY2VsSWRsZUNhbGxiYWNrKEBiYWNrZ3JvdW5kV29ya0hhbmRsZSkgaWYgQGJhY2tncm91bmRXb3JrSGFuZGxlP1xuXG4gICAgQGRpc3BsYXlMYXllci5zZXRUZXh0RGVjb3JhdGlvbkxheWVyKEB0b2tlbml6ZWRCdWZmZXIpXG4gICAgQGRlZmF1bHRNYXJrZXJMYXllciA9IEBkaXNwbGF5TGF5ZXIuYWRkTWFya2VyTGF5ZXIoKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQoQGRlZmF1bHRNYXJrZXJMYXllci5vbkRpZERlc3Ryb3kgPT5cbiAgICAgIEBhc3NlcnQoZmFsc2UsIFwiZGVmYXVsdE1hcmtlckxheWVyIGRlc3Ryb3llZCBhdCBhbiB1bmV4cGVjdGVkIHRpbWVcIilcbiAgICApXG4gICAgQHNlbGVjdGlvbnNNYXJrZXJMYXllciA/PSBAYWRkTWFya2VyTGF5ZXIobWFpbnRhaW5IaXN0b3J5OiB0cnVlLCBwZXJzaXN0ZW50OiB0cnVlKVxuICAgIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIudHJhY2tEZXN0cnVjdGlvbkluT25EaWRDcmVhdGVNYXJrZXJDYWxsYmFja3MgPSB0cnVlXG5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIgPSBuZXcgRGVjb3JhdGlvbk1hbmFnZXIodGhpcylcbiAgICBAZGVjb3JhdGVNYXJrZXJMYXllcihAc2VsZWN0aW9uc01hcmtlckxheWVyLCB0eXBlOiAnY3Vyc29yJylcbiAgICBAZGVjb3JhdGVDdXJzb3JMaW5lKCkgdW5sZXNzIEBpc01pbmkoKVxuXG4gICAgQGRlY29yYXRlTWFya2VyTGF5ZXIoQGRpc3BsYXlMYXllci5mb2xkc01hcmtlckxheWVyLCB7dHlwZTogJ2xpbmUtbnVtYmVyJywgY2xhc3M6ICdmb2xkZWQnfSlcblxuICAgIGZvciBtYXJrZXIgaW4gQHNlbGVjdGlvbnNNYXJrZXJMYXllci5nZXRNYXJrZXJzKClcbiAgICAgIEBhZGRTZWxlY3Rpb24obWFya2VyKVxuXG4gICAgQHN1YnNjcmliZVRvQnVmZmVyKClcbiAgICBAc3Vic2NyaWJlVG9EaXNwbGF5TGF5ZXIoKVxuXG4gICAgaWYgQGN1cnNvcnMubGVuZ3RoIGlzIDAgYW5kIG5vdCBzdXBwcmVzc0N1cnNvckNyZWF0aW9uXG4gICAgICBpbml0aWFsTGluZSA9IE1hdGgubWF4KHBhcnNlSW50KGluaXRpYWxMaW5lKSBvciAwLCAwKVxuICAgICAgaW5pdGlhbENvbHVtbiA9IE1hdGgubWF4KHBhcnNlSW50KGluaXRpYWxDb2x1bW4pIG9yIDAsIDApXG4gICAgICBAYWRkQ3Vyc29yQXRCdWZmZXJQb3NpdGlvbihbaW5pdGlhbExpbmUsIGluaXRpYWxDb2x1bW5dKVxuXG4gICAgQGxhbmd1YWdlTW9kZSA9IG5ldyBMYW5ndWFnZU1vZGUodGhpcylcblxuICAgIEBndXR0ZXJDb250YWluZXIgPSBuZXcgR3V0dGVyQ29udGFpbmVyKHRoaXMpXG4gICAgQGxpbmVOdW1iZXJHdXR0ZXIgPSBAZ3V0dGVyQ29udGFpbmVyLmFkZEd1dHRlclxuICAgICAgbmFtZTogJ2xpbmUtbnVtYmVyJ1xuICAgICAgcHJpb3JpdHk6IDBcbiAgICAgIHZpc2libGU6IGxpbmVOdW1iZXJHdXR0ZXJWaXNpYmxlXG5cbiAgZGVjb3JhdGVDdXJzb3JMaW5lOiAtPlxuICAgIEBjdXJzb3JMaW5lRGVjb3JhdGlvbnMgPSBbXG4gICAgICBAZGVjb3JhdGVNYXJrZXJMYXllcihAc2VsZWN0aW9uc01hcmtlckxheWVyLCB0eXBlOiAnbGluZScsIGNsYXNzOiAnY3Vyc29yLWxpbmUnLCBvbmx5RW1wdHk6IHRydWUpLFxuICAgICAgQGRlY29yYXRlTWFya2VyTGF5ZXIoQHNlbGVjdGlvbnNNYXJrZXJMYXllciwgdHlwZTogJ2xpbmUtbnVtYmVyJywgY2xhc3M6ICdjdXJzb3ItbGluZScpLFxuICAgICAgQGRlY29yYXRlTWFya2VyTGF5ZXIoQHNlbGVjdGlvbnNNYXJrZXJMYXllciwgdHlwZTogJ2xpbmUtbnVtYmVyJywgY2xhc3M6ICdjdXJzb3ItbGluZS1uby1zZWxlY3Rpb24nLCBvbmx5SGVhZDogdHJ1ZSwgb25seUVtcHR5OiB0cnVlKVxuICAgIF1cblxuICBkb0JhY2tncm91bmRXb3JrOiAoZGVhZGxpbmUpID0+XG4gICAgcHJldmlvdXNMb25nZXN0Um93ID0gQGdldEFwcHJveGltYXRlTG9uZ2VzdFNjcmVlblJvdygpXG4gICAgaWYgQGRpc3BsYXlMYXllci5kb0JhY2tncm91bmRXb3JrKGRlYWRsaW5lKVxuICAgICAgQGJhY2tncm91bmRXb3JrSGFuZGxlID0gcmVxdWVzdElkbGVDYWxsYmFjayhAZG9CYWNrZ3JvdW5kV29yaylcbiAgICBlbHNlXG4gICAgICBAYmFja2dyb3VuZFdvcmtIYW5kbGUgPSBudWxsXG5cbiAgICBpZiBAZ2V0QXBwcm94aW1hdGVMb25nZXN0U2NyZWVuUm93KCkgaXNudCBwcmV2aW91c0xvbmdlc3RSb3dcbiAgICAgIEBjb21wb25lbnQ/LnNjaGVkdWxlVXBkYXRlKClcblxuICB1cGRhdGU6IChwYXJhbXMpIC0+XG4gICAgZGlzcGxheUxheWVyUGFyYW1zID0ge31cblxuICAgIGZvciBwYXJhbSBpbiBPYmplY3Qua2V5cyhwYXJhbXMpXG4gICAgICB2YWx1ZSA9IHBhcmFtc1twYXJhbV1cblxuICAgICAgc3dpdGNoIHBhcmFtXG4gICAgICAgIHdoZW4gJ2F1dG9JbmRlbnQnXG4gICAgICAgICAgQGF1dG9JbmRlbnQgPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ2F1dG9JbmRlbnRPblBhc3RlJ1xuICAgICAgICAgIEBhdXRvSW5kZW50T25QYXN0ZSA9IHZhbHVlXG5cbiAgICAgICAgd2hlbiAndW5kb0dyb3VwaW5nSW50ZXJ2YWwnXG4gICAgICAgICAgQHVuZG9Hcm91cGluZ0ludGVydmFsID0gdmFsdWVcblxuICAgICAgICB3aGVuICdub25Xb3JkQ2hhcmFjdGVycydcbiAgICAgICAgICBAbm9uV29yZENoYXJhY3RlcnMgPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ3Njcm9sbFNlbnNpdGl2aXR5J1xuICAgICAgICAgIEBzY3JvbGxTZW5zaXRpdml0eSA9IHZhbHVlXG5cbiAgICAgICAgd2hlbiAnZW5jb2RpbmcnXG4gICAgICAgICAgQGJ1ZmZlci5zZXRFbmNvZGluZyh2YWx1ZSlcblxuICAgICAgICB3aGVuICdzb2Z0VGFicydcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzb2Z0VGFic1xuICAgICAgICAgICAgQHNvZnRUYWJzID0gdmFsdWVcblxuICAgICAgICB3aGVuICdhdG9taWNTb2Z0VGFicydcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBkaXNwbGF5TGF5ZXIuYXRvbWljU29mdFRhYnNcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5hdG9taWNTb2Z0VGFicyA9IHZhbHVlXG5cbiAgICAgICAgd2hlbiAndGFiTGVuZ3RoJ1xuICAgICAgICAgIGlmIHZhbHVlPyBhbmQgdmFsdWUgaXNudCBAdG9rZW5pemVkQnVmZmVyLmdldFRhYkxlbmd0aCgpXG4gICAgICAgICAgICBAdG9rZW5pemVkQnVmZmVyLnNldFRhYkxlbmd0aCh2YWx1ZSlcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy50YWJMZW5ndGggPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ3NvZnRXcmFwcGVkJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQHNvZnRXcmFwcGVkXG4gICAgICAgICAgICBAc29mdFdyYXBwZWQgPSB2YWx1ZVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLnNvZnRXcmFwQ29sdW1uID0gQGdldFNvZnRXcmFwQ29sdW1uKClcbiAgICAgICAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2Utc29mdC13cmFwcGVkJywgQGlzU29mdFdyYXBwZWQoKVxuXG4gICAgICAgIHdoZW4gJ3NvZnRXcmFwSGFuZ2luZ0luZGVudExlbmd0aCdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBkaXNwbGF5TGF5ZXIuc29mdFdyYXBIYW5naW5nSW5kZW50XG4gICAgICAgICAgICBkaXNwbGF5TGF5ZXJQYXJhbXMuc29mdFdyYXBIYW5naW5nSW5kZW50ID0gdmFsdWVcblxuICAgICAgICB3aGVuICdzb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aCdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aFxuICAgICAgICAgICAgQHNvZnRXcmFwQXRQcmVmZXJyZWRMaW5lTGVuZ3RoID0gdmFsdWVcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5zb2Z0V3JhcENvbHVtbiA9IEBnZXRTb2Z0V3JhcENvbHVtbigpXG5cbiAgICAgICAgd2hlbiAncHJlZmVycmVkTGluZUxlbmd0aCdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBwcmVmZXJyZWRMaW5lTGVuZ3RoXG4gICAgICAgICAgICBAcHJlZmVycmVkTGluZUxlbmd0aCA9IHZhbHVlXG4gICAgICAgICAgICBkaXNwbGF5TGF5ZXJQYXJhbXMuc29mdFdyYXBDb2x1bW4gPSBAZ2V0U29mdFdyYXBDb2x1bW4oKVxuXG4gICAgICAgIHdoZW4gJ21pbmknXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAbWluaVxuICAgICAgICAgICAgQG1pbmkgPSB2YWx1ZVxuICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1taW5pJywgdmFsdWVcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5pbnZpc2libGVzID0gQGdldEludmlzaWJsZXMoKVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLnNvZnRXcmFwQ29sdW1uID0gQGdldFNvZnRXcmFwQ29sdW1uKClcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5zaG93SW5kZW50R3VpZGVzID0gQGRvZXNTaG93SW5kZW50R3VpZGUoKVxuICAgICAgICAgICAgaWYgQG1pbmlcbiAgICAgICAgICAgICAgZGVjb3JhdGlvbi5kZXN0cm95KCkgZm9yIGRlY29yYXRpb24gaW4gQGN1cnNvckxpbmVEZWNvcmF0aW9uc1xuICAgICAgICAgICAgICBAY3Vyc29yTGluZURlY29yYXRpb25zID0gbnVsbFxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBAZGVjb3JhdGVDdXJzb3JMaW5lKClcbiAgICAgICAgICAgIEBjb21wb25lbnQ/LnNjaGVkdWxlVXBkYXRlKClcblxuICAgICAgICB3aGVuICdwbGFjZWhvbGRlclRleHQnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAcGxhY2Vob2xkZXJUZXh0XG4gICAgICAgICAgICBAcGxhY2Vob2xkZXJUZXh0ID0gdmFsdWVcbiAgICAgICAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtcGxhY2Vob2xkZXItdGV4dCcsIHZhbHVlXG5cbiAgICAgICAgd2hlbiAnbGluZU51bWJlckd1dHRlclZpc2libGUnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAbGluZU51bWJlckd1dHRlclZpc2libGVcbiAgICAgICAgICAgIGlmIHZhbHVlXG4gICAgICAgICAgICAgIEBsaW5lTnVtYmVyR3V0dGVyLnNob3coKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBAbGluZU51bWJlckd1dHRlci5oaWRlKClcbiAgICAgICAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtbGluZS1udW1iZXItZ3V0dGVyLXZpc2libGUnLCBAbGluZU51bWJlckd1dHRlci5pc1Zpc2libGUoKVxuXG4gICAgICAgIHdoZW4gJ3Nob3dJbmRlbnRHdWlkZSdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzaG93SW5kZW50R3VpZGVcbiAgICAgICAgICAgIEBzaG93SW5kZW50R3VpZGUgPSB2YWx1ZVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLnNob3dJbmRlbnRHdWlkZXMgPSBAZG9lc1Nob3dJbmRlbnRHdWlkZSgpXG5cbiAgICAgICAgd2hlbiAnc2hvd0xpbmVOdW1iZXJzJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQHNob3dMaW5lTnVtYmVyc1xuICAgICAgICAgICAgQHNob3dMaW5lTnVtYmVycyA9IHZhbHVlXG4gICAgICAgICAgICBAY29tcG9uZW50Py5zY2hlZHVsZVVwZGF0ZSgpXG5cbiAgICAgICAgd2hlbiAnc2hvd0ludmlzaWJsZXMnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAc2hvd0ludmlzaWJsZXNcbiAgICAgICAgICAgIEBzaG93SW52aXNpYmxlcyA9IHZhbHVlXG4gICAgICAgICAgICBkaXNwbGF5TGF5ZXJQYXJhbXMuaW52aXNpYmxlcyA9IEBnZXRJbnZpc2libGVzKClcblxuICAgICAgICB3aGVuICdpbnZpc2libGVzJ1xuICAgICAgICAgIGlmIG5vdCBfLmlzRXF1YWwodmFsdWUsIEBpbnZpc2libGVzKVxuICAgICAgICAgICAgQGludmlzaWJsZXMgPSB2YWx1ZVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLmludmlzaWJsZXMgPSBAZ2V0SW52aXNpYmxlcygpXG5cbiAgICAgICAgd2hlbiAnZWRpdG9yV2lkdGhJbkNoYXJzJ1xuICAgICAgICAgIGlmIHZhbHVlID4gMCBhbmQgdmFsdWUgaXNudCBAZWRpdG9yV2lkdGhJbkNoYXJzXG4gICAgICAgICAgICBAZWRpdG9yV2lkdGhJbkNoYXJzID0gdmFsdWVcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5zb2Z0V3JhcENvbHVtbiA9IEBnZXRTb2Z0V3JhcENvbHVtbigpXG5cbiAgICAgICAgd2hlbiAnd2lkdGgnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAd2lkdGhcbiAgICAgICAgICAgIEB3aWR0aCA9IHZhbHVlXG4gICAgICAgICAgICBkaXNwbGF5TGF5ZXJQYXJhbXMuc29mdFdyYXBDb2x1bW4gPSBAZ2V0U29mdFdyYXBDb2x1bW4oKVxuXG4gICAgICAgIHdoZW4gJ3Njcm9sbFBhc3RFbmQnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAc2Nyb2xsUGFzdEVuZFxuICAgICAgICAgICAgQHNjcm9sbFBhc3RFbmQgPSB2YWx1ZVxuICAgICAgICAgICAgQGNvbXBvbmVudD8uc2NoZWR1bGVVcGRhdGUoKVxuXG4gICAgICAgIHdoZW4gJ2F1dG9IZWlnaHQnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAYXV0b0hlaWdodFxuICAgICAgICAgICAgQGF1dG9IZWlnaHQgPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ2F1dG9XaWR0aCdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBhdXRvV2lkdGhcbiAgICAgICAgICAgIEBhdXRvV2lkdGggPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ3Nob3dDdXJzb3JPblNlbGVjdGlvbidcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzaG93Q3Vyc29yT25TZWxlY3Rpb25cbiAgICAgICAgICAgIEBzaG93Q3Vyc29yT25TZWxlY3Rpb24gPSB2YWx1ZVxuICAgICAgICAgICAgQGNvbXBvbmVudD8uc2NoZWR1bGVVcGRhdGUoKVxuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpZiBwYXJhbSBpc250ICdyZWYnIGFuZCBwYXJhbSBpc250ICdrZXknXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBUZXh0RWRpdG9yIHBhcmFtZXRlcjogJyN7cGFyYW19J1wiKVxuXG4gICAgQGRpc3BsYXlMYXllci5yZXNldChkaXNwbGF5TGF5ZXJQYXJhbXMpXG5cbiAgICBpZiBAY29tcG9uZW50P1xuICAgICAgQGNvbXBvbmVudC5nZXROZXh0VXBkYXRlUHJvbWlzZSgpXG4gICAgZWxzZVxuICAgICAgUHJvbWlzZS5yZXNvbHZlKClcblxuICBzY2hlZHVsZUNvbXBvbmVudFVwZGF0ZTogLT5cbiAgICBAY29tcG9uZW50Py5zY2hlZHVsZVVwZGF0ZSgpXG5cbiAgc2VyaWFsaXplOiAtPlxuICAgIHRva2VuaXplZEJ1ZmZlclN0YXRlID0gQHRva2VuaXplZEJ1ZmZlci5zZXJpYWxpemUoKVxuXG4gICAge1xuICAgICAgZGVzZXJpYWxpemVyOiAnVGV4dEVkaXRvcidcbiAgICAgIHZlcnNpb246IEBzZXJpYWxpemF0aW9uVmVyc2lvblxuXG4gICAgICAjIFRPRE86IFJlbW92ZSB0aGlzIGZvcndhcmQtY29tcGF0aWJsZSBmYWxsYmFjayBvbmNlIDEuOCByZWFjaGVzIHN0YWJsZS5cbiAgICAgIGRpc3BsYXlCdWZmZXI6IHt0b2tlbml6ZWRCdWZmZXI6IHRva2VuaXplZEJ1ZmZlclN0YXRlfVxuXG4gICAgICB0b2tlbml6ZWRCdWZmZXI6IHRva2VuaXplZEJ1ZmZlclN0YXRlXG4gICAgICBkaXNwbGF5TGF5ZXJJZDogQGRpc3BsYXlMYXllci5pZFxuICAgICAgc2VsZWN0aW9uc01hcmtlckxheWVySWQ6IEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIuaWRcblxuICAgICAgaW5pdGlhbFNjcm9sbFRvcFJvdzogQGdldFNjcm9sbFRvcFJvdygpXG4gICAgICBpbml0aWFsU2Nyb2xsTGVmdENvbHVtbjogQGdldFNjcm9sbExlZnRDb2x1bW4oKVxuXG4gICAgICBhdG9taWNTb2Z0VGFiczogQGRpc3BsYXlMYXllci5hdG9taWNTb2Z0VGFic1xuICAgICAgc29mdFdyYXBIYW5naW5nSW5kZW50TGVuZ3RoOiBAZGlzcGxheUxheWVyLnNvZnRXcmFwSGFuZ2luZ0luZGVudFxuXG4gICAgICBAaWQsIEBzb2Z0VGFicywgQHNvZnRXcmFwcGVkLCBAc29mdFdyYXBBdFByZWZlcnJlZExpbmVMZW5ndGgsXG4gICAgICBAcHJlZmVycmVkTGluZUxlbmd0aCwgQG1pbmksIEBlZGl0b3JXaWR0aEluQ2hhcnMsIEB3aWR0aCwgQGxhcmdlRmlsZU1vZGUsXG4gICAgICBAcmVnaXN0ZXJlZCwgQGludmlzaWJsZXMsIEBzaG93SW52aXNpYmxlcywgQHNob3dJbmRlbnRHdWlkZSwgQGF1dG9IZWlnaHQsIEBhdXRvV2lkdGhcbiAgICB9XG5cbiAgc3Vic2NyaWJlVG9CdWZmZXI6IC0+XG4gICAgQGJ1ZmZlci5yZXRhaW4oKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGJ1ZmZlci5vbkRpZENoYW5nZVBhdGggPT5cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtdGl0bGUnLCBAZ2V0VGl0bGUoKVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1wYXRoJywgQGdldFBhdGgoKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGJ1ZmZlci5vbkRpZENoYW5nZUVuY29kaW5nID0+XG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLWVuY29kaW5nJywgQGdldEVuY29kaW5nKClcbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBidWZmZXIub25EaWREZXN0cm95ID0+IEBkZXN0cm95KClcbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBidWZmZXIub25EaWRDaGFuZ2VNb2RpZmllZCA9PlxuICAgICAgQHRlcm1pbmF0ZVBlbmRpbmdTdGF0ZSgpIGlmIG5vdCBAaGFzVGVybWluYXRlZFBlbmRpbmdTdGF0ZSBhbmQgQGJ1ZmZlci5pc01vZGlmaWVkKClcblxuICB0ZXJtaW5hdGVQZW5kaW5nU3RhdGU6IC0+XG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXRlcm1pbmF0ZS1wZW5kaW5nLXN0YXRlJyBpZiBub3QgQGhhc1Rlcm1pbmF0ZWRQZW5kaW5nU3RhdGVcbiAgICBAaGFzVGVybWluYXRlZFBlbmRpbmdTdGF0ZSA9IHRydWVcblxuICBvbkRpZFRlcm1pbmF0ZVBlbmRpbmdTdGF0ZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtdGVybWluYXRlLXBlbmRpbmctc3RhdGUnLCBjYWxsYmFja1xuXG4gIHN1YnNjcmliZVRvRGlzcGxheUxheWVyOiAtPlxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQHRva2VuaXplZEJ1ZmZlci5vbkRpZENoYW5nZUdyYW1tYXIgQGhhbmRsZUdyYW1tYXJDaGFuZ2UuYmluZCh0aGlzKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGRpc3BsYXlMYXllci5vbkRpZENoYW5nZVN5bmMgKGUpID0+XG4gICAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zKClcbiAgICAgIEBjb21wb25lbnQ/LmRpZENoYW5nZURpc3BsYXlMYXllcihlKVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZScsIGVcbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBkaXNwbGF5TGF5ZXIub25EaWRSZXNldCA9PlxuICAgICAgQG1lcmdlSW50ZXJzZWN0aW5nU2VsZWN0aW9ucygpXG4gICAgICBAY29tcG9uZW50Py5kaWRSZXNldERpc3BsYXlMYXllcigpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlJywge31cbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIub25EaWRDcmVhdGVNYXJrZXIgQGFkZFNlbGVjdGlvbi5iaW5kKHRoaXMpXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAc2VsZWN0aW9uc01hcmtlckxheWVyLm9uRGlkVXBkYXRlID0+IEBjb21wb25lbnQ/LmRpZFVwZGF0ZVNlbGVjdGlvbnMoKVxuXG4gIGRlc3Ryb3llZDogLT5cbiAgICBAZGlzcG9zYWJsZXMuZGlzcG9zZSgpXG4gICAgQGRpc3BsYXlMYXllci5kZXN0cm95KClcbiAgICBAdG9rZW5pemVkQnVmZmVyLmRlc3Ryb3koKVxuICAgIHNlbGVjdGlvbi5kZXN0cm95KCkgZm9yIHNlbGVjdGlvbiBpbiBAc2VsZWN0aW9ucy5zbGljZSgpXG4gICAgQGJ1ZmZlci5yZWxlYXNlKClcbiAgICBAbGFuZ3VhZ2VNb2RlLmRlc3Ryb3koKVxuICAgIEBndXR0ZXJDb250YWluZXIuZGVzdHJveSgpXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWRlc3Ryb3knXG4gICAgQGVtaXR0ZXIuY2xlYXIoKVxuICAgIEBjb21wb25lbnQ/LmVsZW1lbnQuY29tcG9uZW50ID0gbnVsbFxuICAgIEBjb21wb25lbnQgPSBudWxsXG4gICAgQGxpbmVOdW1iZXJHdXR0ZXIuZWxlbWVudCA9IG51bGxcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgYnVmZmVyJ3MgdGl0bGUgaGFzIGNoYW5nZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VUaXRsZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXRpdGxlJywgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGJ1ZmZlcidzIHBhdGgsIGFuZCB0aGVyZWZvcmUgdGl0bGUsIGhhcyBjaGFuZ2VkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlUGF0aDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXBhdGgnLCBjYWxsYmFja1xuXG4gICMgRXNzZW50aWFsOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHN5bmNocm9ub3VzbHkgd2hlbiB0aGUgY29udGVudCBvZiB0aGVcbiAgIyBidWZmZXIgY2hhbmdlcy5cbiAgI1xuICAjIEJlY2F1c2Ugb2JzZXJ2ZXJzIGFyZSBpbnZva2VkIHN5bmNocm9ub3VzbHksIGl0J3MgaW1wb3J0YW50IG5vdCB0byBwZXJmb3JtXG4gICMgYW55IGV4cGVuc2l2ZSBvcGVyYXRpb25zIHZpYSB0aGlzIG1ldGhvZC4gQ29uc2lkZXIgezo6b25EaWRTdG9wQ2hhbmdpbmd9IHRvXG4gICMgZGVsYXkgZXhwZW5zaXZlIG9wZXJhdGlvbnMgdW50aWwgYWZ0ZXIgY2hhbmdlcyBzdG9wIG9jY3VycmluZy5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlJywgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogSW52b2tlIGBjYWxsYmFja2Agd2hlbiB0aGUgYnVmZmVyJ3MgY29udGVudHMgY2hhbmdlLiBJdCBpc1xuICAjIGVtaXQgYXN5bmNocm9ub3VzbHkgMzAwbXMgYWZ0ZXIgdGhlIGxhc3QgYnVmZmVyIGNoYW5nZS4gVGhpcyBpcyBhIGdvb2QgcGxhY2VcbiAgIyB0byBoYW5kbGUgY2hhbmdlcyB0byB0aGUgYnVmZmVyIHdpdGhvdXQgY29tcHJvbWlzaW5nIHR5cGluZyBwZXJmb3JtYW5jZS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZFN0b3BDaGFuZ2luZzogKGNhbGxiYWNrKSAtPlxuICAgIEBnZXRCdWZmZXIoKS5vbkRpZFN0b3BDaGFuZ2luZyhjYWxsYmFjaylcblxuICAjIEVzc2VudGlhbDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7Q3Vyc29yfSBpcyBtb3ZlZC4gSWYgdGhlcmUgYXJlXG4gICMgbXVsdGlwbGUgY3Vyc29ycywgeW91ciBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBmb3IgZWFjaCBjdXJzb3IuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgZXZlbnRgIHtPYmplY3R9XG4gICMgICAgICogYG9sZEJ1ZmZlclBvc2l0aW9uYCB7UG9pbnR9XG4gICMgICAgICogYG9sZFNjcmVlblBvc2l0aW9uYCB7UG9pbnR9XG4gICMgICAgICogYG5ld0J1ZmZlclBvc2l0aW9uYCB7UG9pbnR9XG4gICMgICAgICogYG5ld1NjcmVlblBvc2l0aW9uYCB7UG9pbnR9XG4gICMgICAgICogYHRleHRDaGFuZ2VkYCB7Qm9vbGVhbn1cbiAgIyAgICAgKiBgY3Vyc29yYCB7Q3Vyc29yfSB0aGF0IHRyaWdnZXJlZCB0aGUgZXZlbnRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlQ3Vyc29yUG9zaXRpb246IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1jdXJzb3ItcG9zaXRpb24nLCBjYWxsYmFja1xuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHNlbGVjdGlvbidzIHNjcmVlbiByYW5nZSBjaGFuZ2VzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fVxuICAjICAgICAqIGBvbGRCdWZmZXJSYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBvbGRTY3JlZW5SYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBuZXdCdWZmZXJSYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBuZXdTY3JlZW5SYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBzZWxlY3Rpb25gIHtTZWxlY3Rpb259IHRoYXQgdHJpZ2dlcmVkIHRoZSBldmVudFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VTZWxlY3Rpb25SYW5nZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXNlbGVjdGlvbi1yYW5nZScsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gc29mdCB3cmFwIHdhcyBlbmFibGVkIG9yIGRpc2FibGVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlU29mdFdyYXBwZWQ6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1zb2Z0LXdyYXBwZWQnLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIHRoZSBidWZmZXIncyBlbmNvZGluZyBoYXMgY2hhbmdlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZUVuY29kaW5nOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtZW5jb2RpbmcnLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIHRoZSBncmFtbWFyIHRoYXQgaW50ZXJwcmV0cyBhbmRcbiAgIyBjb2xvcml6ZXMgdGhlIHRleHQgaGFzIGJlZW4gY2hhbmdlZC4gSW1tZWRpYXRlbHkgY2FsbHMgeW91ciBjYWxsYmFjayB3aXRoXG4gICMgdGhlIGN1cnJlbnQgZ3JhbW1hci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBncmFtbWFyYCB7R3JhbW1hcn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVHcmFtbWFyOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soQGdldEdyYW1tYXIoKSlcbiAgICBAb25EaWRDaGFuZ2VHcmFtbWFyKGNhbGxiYWNrKVxuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIHRoZSBncmFtbWFyIHRoYXQgaW50ZXJwcmV0cyBhbmRcbiAgIyBjb2xvcml6ZXMgdGhlIHRleHQgaGFzIGJlZW4gY2hhbmdlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBncmFtbWFyYCB7R3JhbW1hcn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlR3JhbW1hcjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLWdyYW1tYXInLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIHRoZSByZXN1bHQgb2Ygezo6aXNNb2RpZmllZH0gY2hhbmdlcy5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZU1vZGlmaWVkOiAoY2FsbGJhY2spIC0+XG4gICAgQGdldEJ1ZmZlcigpLm9uRGlkQ2hhbmdlTW9kaWZpZWQoY2FsbGJhY2spXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGJ1ZmZlcidzIHVuZGVybHlpbmcgZmlsZSBjaGFuZ2VzIG9uXG4gICMgZGlzayBhdCBhIG1vbWVudCB3aGVuIHRoZSByZXN1bHQgb2Ygezo6aXNNb2RpZmllZH0gaXMgdHJ1ZS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENvbmZsaWN0OiAoY2FsbGJhY2spIC0+XG4gICAgQGdldEJ1ZmZlcigpLm9uRGlkQ29uZmxpY3QoY2FsbGJhY2spXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIGJlZm9yZSB0ZXh0IGhhcyBiZWVuIGluc2VydGVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGV2ZW50YCBldmVudCB7T2JqZWN0fVxuICAjICAgICAqIGB0ZXh0YCB7U3RyaW5nfSB0ZXh0IHRvIGJlIGluc2VydGVkXG4gICMgICAgICogYGNhbmNlbGAge0Z1bmN0aW9ufSBDYWxsIHRvIHByZXZlbnQgdGhlIHRleHQgZnJvbSBiZWluZyBpbnNlcnRlZFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25XaWxsSW5zZXJ0VGV4dDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICd3aWxsLWluc2VydC10ZXh0JywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2AgYWZ0ZXIgdGV4dCBoYXMgYmVlbiBpbnNlcnRlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBldmVudGAgZXZlbnQge09iamVjdH1cbiAgIyAgICAgKiBgdGV4dGAge1N0cmluZ30gdGV4dCB0byBiZSBpbnNlcnRlZFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRJbnNlcnRUZXh0OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1pbnNlcnQtdGV4dCcsIGNhbGxiYWNrXG5cbiAgIyBFc3NlbnRpYWw6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgYWZ0ZXIgdGhlIGJ1ZmZlciBpcyBzYXZlZCB0byBkaXNrLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBidWZmZXIgaXMgc2F2ZWQuXG4gICMgICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAgICogYHBhdGhgIFRoZSBwYXRoIHRvIHdoaWNoIHRoZSBidWZmZXIgd2FzIHNhdmVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRTYXZlOiAoY2FsbGJhY2spIC0+XG4gICAgQGdldEJ1ZmZlcigpLm9uRGlkU2F2ZShjYWxsYmFjaylcblxuICAjIEVzc2VudGlhbDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIHRoZSBlZGl0b3IgaXMgZGVzdHJveWVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGVkaXRvciBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERlc3Ryb3k6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWRlc3Ryb3knLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIGEge0N1cnNvcn0gaXMgYWRkZWQgdG8gdGhlIGVkaXRvci5cbiAgIyBJbW1lZGlhdGVseSBjYWxscyB5b3VyIGNhbGxiYWNrIGZvciBlYWNoIGV4aXN0aW5nIGN1cnNvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBjdXJzb3JgIHtDdXJzb3J9IHRoYXQgd2FzIGFkZGVkXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlQ3Vyc29yczogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKGN1cnNvcikgZm9yIGN1cnNvciBpbiBAZ2V0Q3Vyc29ycygpXG4gICAgQG9uRGlkQWRkQ3Vyc29yKGNhbGxiYWNrKVxuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIGEge0N1cnNvcn0gaXMgYWRkZWQgdG8gdGhlIGVkaXRvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBjdXJzb3JgIHtDdXJzb3J9IHRoYXQgd2FzIGFkZGVkXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEFkZEN1cnNvcjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtYWRkLWN1cnNvcicsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7Q3Vyc29yfSBpcyByZW1vdmVkIGZyb20gdGhlIGVkaXRvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBjdXJzb3JgIHtDdXJzb3J9IHRoYXQgd2FzIHJlbW92ZWRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkUmVtb3ZlQ3Vyc29yOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1yZW1vdmUtY3Vyc29yJywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtTZWxlY3Rpb259IGlzIGFkZGVkIHRvIHRoZSBlZGl0b3IuXG4gICMgSW1tZWRpYXRlbHkgY2FsbHMgeW91ciBjYWxsYmFjayBmb3IgZWFjaCBleGlzdGluZyBzZWxlY3Rpb24uXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgc2VsZWN0aW9uYCB7U2VsZWN0aW9ufSB0aGF0IHdhcyBhZGRlZFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb2JzZXJ2ZVNlbGVjdGlvbnM6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayhzZWxlY3Rpb24pIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnMoKVxuICAgIEBvbkRpZEFkZFNlbGVjdGlvbihjYWxsYmFjaylcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtTZWxlY3Rpb259IGlzIGFkZGVkIHRvIHRoZSBlZGl0b3IuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgc2VsZWN0aW9uYCB7U2VsZWN0aW9ufSB0aGF0IHdhcyBhZGRlZFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRBZGRTZWxlY3Rpb246IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1zZWxlY3Rpb24nLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIGEge1NlbGVjdGlvbn0gaXMgcmVtb3ZlZCBmcm9tIHRoZSBlZGl0b3IuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgc2VsZWN0aW9uYCB7U2VsZWN0aW9ufSB0aGF0IHdhcyByZW1vdmVkXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZFJlbW92ZVNlbGVjdGlvbjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtcmVtb3ZlLXNlbGVjdGlvbicsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdpdGggZWFjaCB7RGVjb3JhdGlvbn0gYWRkZWQgdG8gdGhlIGVkaXRvci5cbiAgIyBDYWxscyB5b3VyIGBjYWxsYmFja2AgaW1tZWRpYXRlbHkgZm9yIGFueSBleGlzdGluZyBkZWNvcmF0aW9ucy5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBkZWNvcmF0aW9uYCB7RGVjb3JhdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVEZWNvcmF0aW9uczogKGNhbGxiYWNrKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5vYnNlcnZlRGVjb3JhdGlvbnMoY2FsbGJhY2spXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7RGVjb3JhdGlvbn0gaXMgYWRkZWQgdG8gdGhlIGVkaXRvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBkZWNvcmF0aW9uYCB7RGVjb3JhdGlvbn0gdGhhdCB3YXMgYWRkZWRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWRkRGVjb3JhdGlvbjogKGNhbGxiYWNrKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5vbkRpZEFkZERlY29yYXRpb24oY2FsbGJhY2spXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7RGVjb3JhdGlvbn0gaXMgcmVtb3ZlZCBmcm9tIHRoZSBlZGl0b3IuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgZGVjb3JhdGlvbmAge0RlY29yYXRpb259IHRoYXQgd2FzIHJlbW92ZWRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkUmVtb3ZlRGVjb3JhdGlvbjogKGNhbGxiYWNrKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5vbkRpZFJlbW92ZURlY29yYXRpb24oY2FsbGJhY2spXG5cbiAgIyBDYWxsZWQgYnkgRGVjb3JhdGlvbk1hbmFnZXIgd2hlbiBhIGRlY29yYXRpb24gaXMgYWRkZWQuXG4gIGRpZEFkZERlY29yYXRpb246IChkZWNvcmF0aW9uKSAtPlxuICAgIGlmIGRlY29yYXRpb24uaXNUeXBlKCdibG9jaycpXG4gICAgICBAY29tcG9uZW50Py5kaWRBZGRCbG9ja0RlY29yYXRpb24oZGVjb3JhdGlvbilcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgcGxhY2Vob2xkZXIgdGV4dCBpcyBjaGFuZ2VkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYHBsYWNlaG9sZGVyVGV4dGAge1N0cmluZ30gbmV3IHRleHRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlUGxhY2Vob2xkZXJUZXh0OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtcGxhY2Vob2xkZXItdGV4dCcsIGNhbGxiYWNrXG5cbiAgb25EaWRDaGFuZ2VTY3JvbGxUb3A6IChjYWxsYmFjaykgLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6Om9uRGlkQ2hhbmdlU2Nyb2xsVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLm9uRGlkQ2hhbmdlU2Nyb2xsVG9wKGNhbGxiYWNrKVxuXG4gIG9uRGlkQ2hhbmdlU2Nyb2xsTGVmdDogKGNhbGxiYWNrKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6b25EaWRDaGFuZ2VTY3JvbGxMZWZ0IGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLm9uRGlkQ2hhbmdlU2Nyb2xsTGVmdChjYWxsYmFjaylcblxuICBvbkRpZFJlcXVlc3RBdXRvc2Nyb2xsOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1yZXF1ZXN0LWF1dG9zY3JvbGwnLCBjYWxsYmFja1xuXG4gICMgVE9ETyBSZW1vdmUgb25jZSB0aGUgdGFicyBwYWNrYWdlIG5vIGxvbmdlciB1c2VzIC5vbiBzdWJzY3JpcHRpb25zXG4gIG9uRGlkQ2hhbmdlSWNvbjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLWljb24nLCBjYWxsYmFja1xuXG4gIG9uRGlkVXBkYXRlRGVjb3JhdGlvbnM6IChjYWxsYmFjaykgLT5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIub25EaWRVcGRhdGVEZWNvcmF0aW9ucyhjYWxsYmFjaylcblxuICAjIEVzc2VudGlhbDogUmV0cmlldmVzIHRoZSBjdXJyZW50IHtUZXh0QnVmZmVyfS5cbiAgZ2V0QnVmZmVyOiAtPiBAYnVmZmVyXG5cbiAgIyBSZXRyaWV2ZXMgdGhlIGN1cnJlbnQgYnVmZmVyJ3MgVVJJLlxuICBnZXRVUkk6IC0+IEBidWZmZXIuZ2V0VXJpKClcblxuICAjIENyZWF0ZSBhbiB7VGV4dEVkaXRvcn0gd2l0aCBpdHMgaW5pdGlhbCBzdGF0ZSBiYXNlZCBvbiB0aGlzIG9iamVjdFxuICBjb3B5OiAtPlxuICAgIGRpc3BsYXlMYXllciA9IEBkaXNwbGF5TGF5ZXIuY29weSgpXG4gICAgc2VsZWN0aW9uc01hcmtlckxheWVyID0gZGlzcGxheUxheWVyLmdldE1hcmtlckxheWVyKEBidWZmZXIuZ2V0TWFya2VyTGF5ZXIoQHNlbGVjdGlvbnNNYXJrZXJMYXllci5pZCkuY29weSgpLmlkKVxuICAgIHNvZnRUYWJzID0gQGdldFNvZnRUYWJzKClcbiAgICBuZXcgVGV4dEVkaXRvcih7XG4gICAgICBAYnVmZmVyLCBzZWxlY3Rpb25zTWFya2VyTGF5ZXIsIHNvZnRUYWJzLFxuICAgICAgc3VwcHJlc3NDdXJzb3JDcmVhdGlvbjogdHJ1ZSxcbiAgICAgIHRhYkxlbmd0aDogQHRva2VuaXplZEJ1ZmZlci5nZXRUYWJMZW5ndGgoKSxcbiAgICAgIGluaXRpYWxTY3JvbGxUb3BSb3c6IEBnZXRTY3JvbGxUb3BSb3coKSxcbiAgICAgIGluaXRpYWxTY3JvbGxMZWZ0Q29sdW1uOiBAZ2V0U2Nyb2xsTGVmdENvbHVtbigpLFxuICAgICAgQGFzc2VydCwgZGlzcGxheUxheWVyLCBncmFtbWFyOiBAZ2V0R3JhbW1hcigpLFxuICAgICAgQGF1dG9XaWR0aCwgQGF1dG9IZWlnaHQsIEBzaG93Q3Vyc29yT25TZWxlY3Rpb25cbiAgICB9KVxuXG4gICMgQ29udHJvbHMgdmlzaWJpbGl0eSBiYXNlZCBvbiB0aGUgZ2l2ZW4ge0Jvb2xlYW59LlxuICBzZXRWaXNpYmxlOiAodmlzaWJsZSkgLT4gQHRva2VuaXplZEJ1ZmZlci5zZXRWaXNpYmxlKHZpc2libGUpXG5cbiAgc2V0TWluaTogKG1pbmkpIC0+XG4gICAgQHVwZGF0ZSh7bWluaX0pXG4gICAgQG1pbmlcblxuICBpc01pbmk6IC0+IEBtaW5pXG5cbiAgb25EaWRDaGFuZ2VNaW5pOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtbWluaScsIGNhbGxiYWNrXG5cbiAgc2V0TGluZU51bWJlckd1dHRlclZpc2libGU6IChsaW5lTnVtYmVyR3V0dGVyVmlzaWJsZSkgLT4gQHVwZGF0ZSh7bGluZU51bWJlckd1dHRlclZpc2libGV9KVxuXG4gIGlzTGluZU51bWJlckd1dHRlclZpc2libGU6IC0+IEBsaW5lTnVtYmVyR3V0dGVyLmlzVmlzaWJsZSgpXG5cbiAgb25EaWRDaGFuZ2VMaW5lTnVtYmVyR3V0dGVyVmlzaWJsZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLWxpbmUtbnVtYmVyLWd1dHRlci12aXNpYmxlJywgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7R3V0dGVyfSBpcyBhZGRlZCB0byB0aGUgZWRpdG9yLlxuICAjIEltbWVkaWF0ZWx5IGNhbGxzIHlvdXIgY2FsbGJhY2sgZm9yIGVhY2ggZXhpc3RpbmcgZ3V0dGVyLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGd1dHRlcmAge0d1dHRlcn0gdGhhdCBjdXJyZW50bHkgZXhpc3RzL3dhcyBhZGRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVHdXR0ZXJzOiAoY2FsbGJhY2spIC0+XG4gICAgQGd1dHRlckNvbnRhaW5lci5vYnNlcnZlR3V0dGVycyBjYWxsYmFja1xuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtHdXR0ZXJ9IGlzIGFkZGVkIHRvIHRoZSBlZGl0b3IuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgZ3V0dGVyYCB7R3V0dGVyfSB0aGF0IHdhcyBhZGRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWRkR3V0dGVyOiAoY2FsbGJhY2spIC0+XG4gICAgQGd1dHRlckNvbnRhaW5lci5vbkRpZEFkZEd1dHRlciBjYWxsYmFja1xuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtHdXR0ZXJ9IGlzIHJlbW92ZWQgZnJvbSB0aGUgZWRpdG9yLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYG5hbWVgIFRoZSBuYW1lIG9mIHRoZSB7R3V0dGVyfSB0aGF0IHdhcyByZW1vdmVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRSZW1vdmVHdXR0ZXI6IChjYWxsYmFjaykgLT5cbiAgICBAZ3V0dGVyQ29udGFpbmVyLm9uRGlkUmVtb3ZlR3V0dGVyIGNhbGxiYWNrXG5cbiAgIyBTZXQgdGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRoYXQgY2FuIGJlIGRpc3BsYXllZCBob3Jpem9udGFsbHkgaW4gdGhlXG4gICMgZWRpdG9yLlxuICAjXG4gICMgKiBgZWRpdG9yV2lkdGhJbkNoYXJzYCBBIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgd2lkdGggb2YgdGhlXG4gICMge1RleHRFZGl0b3JFbGVtZW50fSBpbiBjaGFyYWN0ZXJzLlxuICBzZXRFZGl0b3JXaWR0aEluQ2hhcnM6IChlZGl0b3JXaWR0aEluQ2hhcnMpIC0+IEB1cGRhdGUoe2VkaXRvcldpZHRoSW5DaGFyc30pXG5cbiAgIyBSZXR1cm5zIHRoZSBlZGl0b3Igd2lkdGggaW4gY2hhcmFjdGVycy5cbiAgZ2V0RWRpdG9yV2lkdGhJbkNoYXJzOiAtPlxuICAgIGlmIEB3aWR0aD8gYW5kIEBkZWZhdWx0Q2hhcldpZHRoID4gMFxuICAgICAgTWF0aC5tYXgoMCwgTWF0aC5mbG9vcihAd2lkdGggLyBAZGVmYXVsdENoYXJXaWR0aCkpXG4gICAgZWxzZVxuICAgICAgQGVkaXRvcldpZHRoSW5DaGFyc1xuXG4gICMjI1xuICBTZWN0aW9uOiBGaWxlIERldGFpbHNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgZWRpdG9yJ3MgdGl0bGUgZm9yIGRpc3BsYXkgaW4gb3RoZXIgcGFydHMgb2YgdGhlXG4gICMgVUkgc3VjaCBhcyB0aGUgdGFicy5cbiAgI1xuICAjIElmIHRoZSBlZGl0b3IncyBidWZmZXIgaXMgc2F2ZWQsIGl0cyB0aXRsZSBpcyB0aGUgZmlsZSBuYW1lLiBJZiBpdCBpc1xuICAjIHVuc2F2ZWQsIGl0cyB0aXRsZSBpcyBcInVudGl0bGVkXCIuXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ30uXG4gIGdldFRpdGxlOiAtPlxuICAgIEBnZXRGaWxlTmFtZSgpID8gJ3VudGl0bGVkJ1xuXG4gICMgRXNzZW50aWFsOiBHZXQgdW5pcXVlIHRpdGxlIGZvciBkaXNwbGF5IGluIG90aGVyIHBhcnRzIG9mIHRoZSBVSSwgc3VjaCBhc1xuICAjIHRoZSB3aW5kb3cgdGl0bGUuXG4gICNcbiAgIyBJZiB0aGUgZWRpdG9yJ3MgYnVmZmVyIGlzIHVuc2F2ZWQsIGl0cyB0aXRsZSBpcyBcInVudGl0bGVkXCJcbiAgIyBJZiB0aGUgZWRpdG9yJ3MgYnVmZmVyIGlzIHNhdmVkLCBpdHMgdW5pcXVlIHRpdGxlIGlzIGZvcm1hdHRlZCBhcyBvbmVcbiAgIyBvZiB0aGUgZm9sbG93aW5nLFxuICAjICogXCI8ZmlsZW5hbWU+XCIgd2hlbiBpdCBpcyB0aGUgb25seSBlZGl0aW5nIGJ1ZmZlciB3aXRoIHRoaXMgZmlsZSBuYW1lLlxuICAjICogXCI8ZmlsZW5hbWU+IOKAlCA8dW5pcXVlLWRpci1wcmVmaXg+XCIgd2hlbiBvdGhlciBidWZmZXJzIGhhdmUgdGhpcyBmaWxlIG5hbWUuXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ31cbiAgZ2V0TG9uZ1RpdGxlOiAtPlxuICAgIGlmIEBnZXRQYXRoKClcbiAgICAgIGZpbGVOYW1lID0gQGdldEZpbGVOYW1lKClcblxuICAgICAgYWxsUGF0aFNlZ21lbnRzID0gW11cbiAgICAgIGZvciB0ZXh0RWRpdG9yIGluIGF0b20ud29ya3NwYWNlLmdldFRleHRFZGl0b3JzKCkgd2hlbiB0ZXh0RWRpdG9yIGlzbnQgdGhpc1xuICAgICAgICBpZiB0ZXh0RWRpdG9yLmdldEZpbGVOYW1lKCkgaXMgZmlsZU5hbWVcbiAgICAgICAgICBkaXJlY3RvcnlQYXRoID0gZnMudGlsZGlmeSh0ZXh0RWRpdG9yLmdldERpcmVjdG9yeVBhdGgoKSlcbiAgICAgICAgICBhbGxQYXRoU2VnbWVudHMucHVzaChkaXJlY3RvcnlQYXRoLnNwbGl0KHBhdGguc2VwKSlcblxuICAgICAgaWYgYWxsUGF0aFNlZ21lbnRzLmxlbmd0aCBpcyAwXG4gICAgICAgIHJldHVybiBmaWxlTmFtZVxuXG4gICAgICBvdXJQYXRoU2VnbWVudHMgPSBmcy50aWxkaWZ5KEBnZXREaXJlY3RvcnlQYXRoKCkpLnNwbGl0KHBhdGguc2VwKVxuICAgICAgYWxsUGF0aFNlZ21lbnRzLnB1c2ggb3VyUGF0aFNlZ21lbnRzXG5cbiAgICAgIGxvb3BcbiAgICAgICAgZmlyc3RTZWdtZW50ID0gb3VyUGF0aFNlZ21lbnRzWzBdXG5cbiAgICAgICAgY29tbW9uQmFzZSA9IF8uYWxsKGFsbFBhdGhTZWdtZW50cywgKHBhdGhTZWdtZW50cykgLT4gcGF0aFNlZ21lbnRzLmxlbmd0aCA+IDEgYW5kIHBhdGhTZWdtZW50c1swXSBpcyBmaXJzdFNlZ21lbnQpXG4gICAgICAgIGlmIGNvbW1vbkJhc2VcbiAgICAgICAgICBwYXRoU2VnbWVudHMuc2hpZnQoKSBmb3IgcGF0aFNlZ21lbnRzIGluIGFsbFBhdGhTZWdtZW50c1xuICAgICAgICBlbHNlXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgXCIje2ZpbGVOYW1lfSBcXHUyMDE0ICN7cGF0aC5qb2luKHBhdGhTZWdtZW50cy4uLil9XCJcbiAgICBlbHNlXG4gICAgICAndW50aXRsZWQnXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgdGhlIHtTdHJpbmd9IHBhdGggb2YgdGhpcyBlZGl0b3IncyB0ZXh0IGJ1ZmZlci5cbiAgZ2V0UGF0aDogLT4gQGJ1ZmZlci5nZXRQYXRoKClcblxuICBnZXRGaWxlTmFtZTogLT5cbiAgICBpZiBmdWxsUGF0aCA9IEBnZXRQYXRoKClcbiAgICAgIHBhdGguYmFzZW5hbWUoZnVsbFBhdGgpXG4gICAgZWxzZVxuICAgICAgbnVsbFxuXG4gIGdldERpcmVjdG9yeVBhdGg6IC0+XG4gICAgaWYgZnVsbFBhdGggPSBAZ2V0UGF0aCgpXG4gICAgICBwYXRoLmRpcm5hbWUoZnVsbFBhdGgpXG4gICAgZWxzZVxuICAgICAgbnVsbFxuXG4gICMgRXh0ZW5kZWQ6IFJldHVybnMgdGhlIHtTdHJpbmd9IGNoYXJhY3RlciBzZXQgZW5jb2Rpbmcgb2YgdGhpcyBlZGl0b3IncyB0ZXh0XG4gICMgYnVmZmVyLlxuICBnZXRFbmNvZGluZzogLT4gQGJ1ZmZlci5nZXRFbmNvZGluZygpXG5cbiAgIyBFeHRlbmRlZDogU2V0IHRoZSBjaGFyYWN0ZXIgc2V0IGVuY29kaW5nIHRvIHVzZSBpbiB0aGlzIGVkaXRvcidzIHRleHRcbiAgIyBidWZmZXIuXG4gICNcbiAgIyAqIGBlbmNvZGluZ2AgVGhlIHtTdHJpbmd9IGNoYXJhY3RlciBzZXQgZW5jb2RpbmcgbmFtZSBzdWNoIGFzICd1dGY4J1xuICBzZXRFbmNvZGluZzogKGVuY29kaW5nKSAtPiBAYnVmZmVyLnNldEVuY29kaW5nKGVuY29kaW5nKVxuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhpcyBlZGl0b3IgaGFzIGJlZW4gbW9kaWZpZWQuXG4gIGlzTW9kaWZpZWQ6IC0+IEBidWZmZXIuaXNNb2RpZmllZCgpXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGlzIGVkaXRvciBoYXMgbm8gY29udGVudC5cbiAgaXNFbXB0eTogLT4gQGJ1ZmZlci5pc0VtcHR5KClcblxuICAjIyNcbiAgU2VjdGlvbjogRmlsZSBPcGVyYXRpb25zXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBTYXZlcyB0aGUgZWRpdG9yJ3MgdGV4dCBidWZmZXIuXG4gICNcbiAgIyBTZWUge1RleHRCdWZmZXI6OnNhdmV9IGZvciBtb3JlIGRldGFpbHMuXG4gIHNhdmU6IC0+IEBidWZmZXIuc2F2ZSgpXG5cbiAgIyBFc3NlbnRpYWw6IFNhdmVzIHRoZSBlZGl0b3IncyB0ZXh0IGJ1ZmZlciBhcyB0aGUgZ2l2ZW4gcGF0aC5cbiAgI1xuICAjIFNlZSB7VGV4dEJ1ZmZlcjo6c2F2ZUFzfSBmb3IgbW9yZSBkZXRhaWxzLlxuICAjXG4gICMgKiBgZmlsZVBhdGhgIEEge1N0cmluZ30gcGF0aC5cbiAgc2F2ZUFzOiAoZmlsZVBhdGgpIC0+IEBidWZmZXIuc2F2ZUFzKGZpbGVQYXRoKVxuXG4gICMgRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIHVzZXIgc2hvdWxkIGJlIHByb21wdGVkIHRvIHNhdmUgYmVmb3JlIGNsb3NpbmdcbiAgIyB0aGlzIGVkaXRvci5cbiAgc2hvdWxkUHJvbXB0VG9TYXZlOiAoe3dpbmRvd0Nsb3NlUmVxdWVzdGVkLCBwcm9qZWN0SGFzUGF0aHN9PXt9KSAtPlxuICAgIGlmIHdpbmRvd0Nsb3NlUmVxdWVzdGVkIGFuZCBwcm9qZWN0SGFzUGF0aHMgYW5kIGF0b20uc3RhdGVTdG9yZS5pc0Nvbm5lY3RlZCgpXG4gICAgICBmYWxzZVxuICAgIGVsc2VcbiAgICAgIEBpc01vZGlmaWVkKCkgYW5kIG5vdCBAYnVmZmVyLmhhc011bHRpcGxlRWRpdG9ycygpXG5cbiAgIyBSZXR1cm5zIGFuIHtPYmplY3R9IHRvIGNvbmZpZ3VyZSBkaWFsb2cgc2hvd24gd2hlbiB0aGlzIGVkaXRvciBpcyBzYXZlZFxuICAjIHZpYSB7UGFuZTo6c2F2ZUl0ZW1Bc30uXG4gIGdldFNhdmVEaWFsb2dPcHRpb25zOiAtPiB7fVxuXG4gICMjI1xuICBTZWN0aW9uOiBSZWFkaW5nIFRleHRcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgYSB7U3RyaW5nfSByZXByZXNlbnRpbmcgdGhlIGVudGlyZSBjb250ZW50cyBvZiB0aGUgZWRpdG9yLlxuICBnZXRUZXh0OiAtPiBAYnVmZmVyLmdldFRleHQoKVxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIHRleHQgaW4gdGhlIGdpdmVuIHtSYW5nZX0gaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgcmFuZ2VgIEEge1JhbmdlfSBvciByYW5nZS1jb21wYXRpYmxlIHtBcnJheX0uXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ30uXG4gIGdldFRleHRJbkJ1ZmZlclJhbmdlOiAocmFuZ2UpIC0+XG4gICAgQGJ1ZmZlci5nZXRUZXh0SW5SYW5nZShyYW5nZSlcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyBhIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIGxpbmVzIGluIHRoZSBidWZmZXIuXG4gIGdldExpbmVDb3VudDogLT4gQGJ1ZmZlci5nZXRMaW5lQ291bnQoKVxuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIGEge051bWJlcn0gcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2Ygc2NyZWVuIGxpbmVzIGluIHRoZVxuICAjIGVkaXRvci4gVGhpcyBhY2NvdW50cyBmb3IgZm9sZHMuXG4gIGdldFNjcmVlbkxpbmVDb3VudDogLT4gQGRpc3BsYXlMYXllci5nZXRTY3JlZW5MaW5lQ291bnQoKVxuXG4gIGdldEFwcHJveGltYXRlU2NyZWVuTGluZUNvdW50OiAtPiBAZGlzcGxheUxheWVyLmdldEFwcHJveGltYXRlU2NyZWVuTGluZUNvdW50KClcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyBhIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgbGFzdCB6ZXJvLWluZGV4ZWQgYnVmZmVyIHJvd1xuICAjIG51bWJlciBvZiB0aGUgZWRpdG9yLlxuICBnZXRMYXN0QnVmZmVyUm93OiAtPiBAYnVmZmVyLmdldExhc3RSb3coKVxuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIGEge051bWJlcn0gcmVwcmVzZW50aW5nIHRoZSBsYXN0IHplcm8taW5kZXhlZCBzY3JlZW4gcm93XG4gICMgbnVtYmVyIG9mIHRoZSBlZGl0b3IuXG4gIGdldExhc3RTY3JlZW5Sb3c6IC0+IEBnZXRTY3JlZW5MaW5lQ291bnQoKSAtIDFcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyBhIHtTdHJpbmd9IHJlcHJlc2VudGluZyB0aGUgY29udGVudHMgb2YgdGhlIGxpbmUgYXQgdGhlXG4gICMgZ2l2ZW4gYnVmZmVyIHJvdy5cbiAgI1xuICAjICogYGJ1ZmZlclJvd2AgQSB7TnVtYmVyfSByZXByZXNlbnRpbmcgYSB6ZXJvLWluZGV4ZWQgYnVmZmVyIHJvdy5cbiAgbGluZVRleHRGb3JCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+IEBidWZmZXIubGluZUZvclJvdyhidWZmZXJSb3cpXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgYSB7U3RyaW5nfSByZXByZXNlbnRpbmcgdGhlIGNvbnRlbnRzIG9mIHRoZSBsaW5lIGF0IHRoZVxuICAjIGdpdmVuIHNjcmVlbiByb3cuXG4gICNcbiAgIyAqIGBzY3JlZW5Sb3dgIEEge051bWJlcn0gcmVwcmVzZW50aW5nIGEgemVyby1pbmRleGVkIHNjcmVlbiByb3cuXG4gIGxpbmVUZXh0Rm9yU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBzY3JlZW5MaW5lRm9yU2NyZWVuUm93KHNjcmVlblJvdyk/LmxpbmVUZXh0XG5cbiAgbG9nU2NyZWVuTGluZXM6IChzdGFydD0wLCBlbmQ9QGdldExhc3RTY3JlZW5Sb3coKSkgLT5cbiAgICBmb3Igcm93IGluIFtzdGFydC4uZW5kXVxuICAgICAgbGluZSA9IEBsaW5lVGV4dEZvclNjcmVlblJvdyhyb3cpXG4gICAgICBjb25zb2xlLmxvZyByb3csIEBidWZmZXJSb3dGb3JTY3JlZW5Sb3cocm93KSwgbGluZSwgbGluZS5sZW5ndGhcbiAgICByZXR1cm5cblxuICB0b2tlbnNGb3JTY3JlZW5Sb3c6IChzY3JlZW5Sb3cpIC0+XG4gICAgdG9rZW5zID0gW11cbiAgICBsaW5lVGV4dEluZGV4ID0gMFxuICAgIGN1cnJlbnRUb2tlblNjb3BlcyA9IFtdXG4gICAge2xpbmVUZXh0LCB0YWdzfSA9IEBzY3JlZW5MaW5lRm9yU2NyZWVuUm93KHNjcmVlblJvdylcbiAgICBmb3IgdGFnIGluIHRhZ3NcbiAgICAgIGlmIEBkaXNwbGF5TGF5ZXIuaXNPcGVuVGFnKHRhZylcbiAgICAgICAgY3VycmVudFRva2VuU2NvcGVzLnB1c2goQGRpc3BsYXlMYXllci5jbGFzc05hbWVGb3JUYWcodGFnKSlcbiAgICAgIGVsc2UgaWYgQGRpc3BsYXlMYXllci5pc0Nsb3NlVGFnKHRhZylcbiAgICAgICAgY3VycmVudFRva2VuU2NvcGVzLnBvcCgpXG4gICAgICBlbHNlXG4gICAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgICB0ZXh0OiBsaW5lVGV4dC5zdWJzdHIobGluZVRleHRJbmRleCwgdGFnKVxuICAgICAgICAgIHNjb3BlczogY3VycmVudFRva2VuU2NvcGVzLnNsaWNlKClcbiAgICAgICAgfSlcbiAgICAgICAgbGluZVRleHRJbmRleCArPSB0YWdcbiAgICB0b2tlbnNcblxuICBzY3JlZW5MaW5lRm9yU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIuZ2V0U2NyZWVuTGluZShzY3JlZW5Sb3cpXG5cbiAgYnVmZmVyUm93Rm9yU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIudHJhbnNsYXRlU2NyZWVuUG9zaXRpb24oUG9pbnQoc2NyZWVuUm93LCAwKSkucm93XG5cbiAgYnVmZmVyUm93c0ZvclNjcmVlblJvd3M6IChzdGFydFNjcmVlblJvdywgZW5kU2NyZWVuUm93KSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIuYnVmZmVyUm93c0ZvclNjcmVlblJvd3Moc3RhcnRTY3JlZW5Sb3csIGVuZFNjcmVlblJvdyArIDEpXG5cbiAgc2NyZWVuUm93Rm9yQnVmZmVyUm93OiAocm93KSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIudHJhbnNsYXRlQnVmZmVyUG9zaXRpb24oUG9pbnQocm93LCAwKSkucm93XG5cbiAgZ2V0UmlnaHRtb3N0U2NyZWVuUG9zaXRpb246IC0+IEBkaXNwbGF5TGF5ZXIuZ2V0UmlnaHRtb3N0U2NyZWVuUG9zaXRpb24oKVxuXG4gIGdldEFwcHJveGltYXRlUmlnaHRtb3N0U2NyZWVuUG9zaXRpb246IC0+IEBkaXNwbGF5TGF5ZXIuZ2V0QXBwcm94aW1hdGVSaWdodG1vc3RTY3JlZW5Qb3NpdGlvbigpXG5cbiAgZ2V0TWF4U2NyZWVuTGluZUxlbmd0aDogLT4gQGdldFJpZ2h0bW9zdFNjcmVlblBvc2l0aW9uKCkuY29sdW1uXG5cbiAgZ2V0TG9uZ2VzdFNjcmVlblJvdzogLT4gQGdldFJpZ2h0bW9zdFNjcmVlblBvc2l0aW9uKCkucm93XG5cbiAgZ2V0QXBwcm94aW1hdGVMb25nZXN0U2NyZWVuUm93OiAtPiBAZ2V0QXBwcm94aW1hdGVSaWdodG1vc3RTY3JlZW5Qb3NpdGlvbigpLnJvd1xuXG4gIGxpbmVMZW5ndGhGb3JTY3JlZW5Sb3c6IChzY3JlZW5Sb3cpIC0+IEBkaXNwbGF5TGF5ZXIubGluZUxlbmd0aEZvclNjcmVlblJvdyhzY3JlZW5Sb3cpXG5cbiAgIyBSZXR1cm5zIHRoZSByYW5nZSBmb3IgdGhlIGdpdmVuIGJ1ZmZlciByb3cuXG4gICNcbiAgIyAqIGByb3dgIEEgcm93IHtOdW1iZXJ9LlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyBoYXNoIHdpdGggYW4gYGluY2x1ZGVOZXdsaW5lYCBrZXkuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgYnVmZmVyUmFuZ2VGb3JCdWZmZXJSb3c6IChyb3csIHtpbmNsdWRlTmV3bGluZX09e30pIC0+IEBidWZmZXIucmFuZ2VGb3JSb3cocm93LCBpbmNsdWRlTmV3bGluZSlcblxuICAjIEdldCB0aGUgdGV4dCBpbiB0aGUgZ2l2ZW4ge1JhbmdlfS5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfS5cbiAgZ2V0VGV4dEluUmFuZ2U6IChyYW5nZSkgLT4gQGJ1ZmZlci5nZXRUZXh0SW5SYW5nZShyYW5nZSlcblxuICAjIHtEZWxlZ2F0ZXMgdG86IFRleHRCdWZmZXIuaXNSb3dCbGFua31cbiAgaXNCdWZmZXJSb3dCbGFuazogKGJ1ZmZlclJvdykgLT4gQGJ1ZmZlci5pc1Jvd0JsYW5rKGJ1ZmZlclJvdylcblxuICAjIHtEZWxlZ2F0ZXMgdG86IFRleHRCdWZmZXIubmV4dE5vbkJsYW5rUm93fVxuICBuZXh0Tm9uQmxhbmtCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+IEBidWZmZXIubmV4dE5vbkJsYW5rUm93KGJ1ZmZlclJvdylcblxuICAjIHtEZWxlZ2F0ZXMgdG86IFRleHRCdWZmZXIuZ2V0RW5kUG9zaXRpb259XG4gIGdldEVvZkJ1ZmZlclBvc2l0aW9uOiAtPiBAYnVmZmVyLmdldEVuZFBvc2l0aW9uKClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSB7UmFuZ2V9IG9mIHRoZSBwYXJhZ3JhcGggc3Vycm91bmRpbmcgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWRcbiAgIyBjdXJzb3IuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgZ2V0Q3VycmVudFBhcmFncmFwaEJ1ZmZlclJhbmdlOiAtPlxuICAgIEBnZXRMYXN0Q3Vyc29yKCkuZ2V0Q3VycmVudFBhcmFncmFwaEJ1ZmZlclJhbmdlKClcblxuXG4gICMjI1xuICBTZWN0aW9uOiBNdXRhdGluZyBUZXh0XG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBSZXBsYWNlcyB0aGUgZW50aXJlIGNvbnRlbnRzIG9mIHRoZSBidWZmZXIgd2l0aCB0aGUgZ2l2ZW4ge1N0cmluZ30uXG4gICNcbiAgIyAqIGB0ZXh0YCBBIHtTdHJpbmd9IHRvIHJlcGxhY2Ugd2l0aFxuICBzZXRUZXh0OiAodGV4dCkgLT4gQGJ1ZmZlci5zZXRUZXh0KHRleHQpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgdGV4dCBpbiB0aGUgZ2l2ZW4ge1JhbmdlfSBpbiBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyAqIGByYW5nZWAgQSB7UmFuZ2V9IG9yIHJhbmdlLWNvbXBhdGlibGUge0FycmF5fS5cbiAgIyAqIGB0ZXh0YCBBIHtTdHJpbmd9XG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgbm9ybWFsaXplTGluZUVuZGluZ3NgIChvcHRpb25hbCkge0Jvb2xlYW59IChkZWZhdWx0OiB0cnVlKVxuICAjICAgKiBgdW5kb2AgKG9wdGlvbmFsKSB7U3RyaW5nfSAnc2tpcCcgd2lsbCBza2lwIHRoZSB1bmRvIHN5c3RlbVxuICAjXG4gICMgUmV0dXJucyB0aGUge1JhbmdlfSBvZiB0aGUgbmV3bHktaW5zZXJ0ZWQgdGV4dC5cbiAgc2V0VGV4dEluQnVmZmVyUmFuZ2U6IChyYW5nZSwgdGV4dCwgb3B0aW9ucykgLT4gQGdldEJ1ZmZlcigpLnNldFRleHRJblJhbmdlKHJhbmdlLCB0ZXh0LCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBGb3IgZWFjaCBzZWxlY3Rpb24sIHJlcGxhY2UgdGhlIHNlbGVjdGVkIHRleHQgd2l0aCB0aGUgZ2l2ZW4gdGV4dC5cbiAgI1xuICAjICogYHRleHRgIEEge1N0cmluZ30gcmVwcmVzZW50aW5nIHRoZSB0ZXh0IHRvIGluc2VydC5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIFNlZSB7U2VsZWN0aW9uOjppbnNlcnRUZXh0fS5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9IHdoZW4gdGhlIHRleHQgaGFzIGJlZW4gaW5zZXJ0ZWRcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IGZhbHNlIHdoZW4gdGhlIHRleHQgaGFzIG5vdCBiZWVuIGluc2VydGVkXG4gIGluc2VydFRleHQ6ICh0ZXh0LCBvcHRpb25zPXt9KSAtPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQGVtaXRXaWxsSW5zZXJ0VGV4dEV2ZW50KHRleHQpXG5cbiAgICBncm91cGluZ0ludGVydmFsID0gaWYgb3B0aW9ucy5ncm91cFVuZG9cbiAgICAgIEB1bmRvR3JvdXBpbmdJbnRlcnZhbFxuICAgIGVsc2VcbiAgICAgIDBcblxuICAgIG9wdGlvbnMuYXV0b0luZGVudE5ld2xpbmUgPz0gQHNob3VsZEF1dG9JbmRlbnQoKVxuICAgIG9wdGlvbnMuYXV0b0RlY3JlYXNlSW5kZW50ID89IEBzaG91bGRBdXRvSW5kZW50KClcbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0KFxuICAgICAgKHNlbGVjdGlvbikgPT5cbiAgICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uaW5zZXJ0VGV4dCh0ZXh0LCBvcHRpb25zKVxuICAgICAgICBkaWRJbnNlcnRFdmVudCA9IHt0ZXh0LCByYW5nZX1cbiAgICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWluc2VydC10ZXh0JywgZGlkSW5zZXJ0RXZlbnRcbiAgICAgICAgcmFuZ2VcbiAgICAgICwgZ3JvdXBpbmdJbnRlcnZhbFxuICAgIClcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCByZXBsYWNlIHRoZSBzZWxlY3RlZCB0ZXh0IHdpdGggYSBuZXdsaW5lLlxuICBpbnNlcnROZXdsaW5lOiAob3B0aW9ucykgLT5cbiAgICBAaW5zZXJ0VGV4dCgnXFxuJywgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBkZWxldGUgdGhlIGNoYXJhY3RlclxuICAjIGZvbGxvd2luZyB0aGUgY3Vyc29yLiBPdGhlcndpc2UgZGVsZXRlIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICBkZWxldGU6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlKClcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBkZWxldGUgdGhlIGNoYXJhY3RlclxuICAjIHByZWNlZGluZyB0aGUgY3Vyc29yLiBPdGhlcndpc2UgZGVsZXRlIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICBiYWNrc3BhY2U6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uYmFja3NwYWNlKClcblxuICAjIEV4dGVuZGVkOiBNdXRhdGUgdGhlIHRleHQgb2YgYWxsIHRoZSBzZWxlY3Rpb25zIGluIGEgc2luZ2xlIHRyYW5zYWN0aW9uLlxuICAjXG4gICMgQWxsIHRoZSBjaGFuZ2VzIG1hZGUgaW5zaWRlIHRoZSBnaXZlbiB7RnVuY3Rpb259IGNhbiBiZSByZXZlcnRlZCB3aXRoIGFcbiAgIyBzaW5nbGUgY2FsbCB0byB7Ojp1bmRvfS5cbiAgI1xuICAjICogYGZuYCBBIHtGdW5jdGlvbn0gdGhhdCB3aWxsIGJlIGNhbGxlZCBvbmNlIGZvciBlYWNoIHtTZWxlY3Rpb259LiBUaGUgZmlyc3RcbiAgIyAgICAgIGFyZ3VtZW50IHdpbGwgYmUgYSB7U2VsZWN0aW9ufSBhbmQgdGhlIHNlY29uZCBhcmd1bWVudCB3aWxsIGJlIHRoZVxuICAjICAgICAge051bWJlcn0gaW5kZXggb2YgdGhhdCBzZWxlY3Rpb24uXG4gIG11dGF0ZVNlbGVjdGVkVGV4dDogKGZuLCBncm91cGluZ0ludGVydmFsPTApIC0+XG4gICAgQG1lcmdlSW50ZXJzZWN0aW5nU2VsZWN0aW9ucyA9PlxuICAgICAgQHRyYW5zYWN0IGdyb3VwaW5nSW50ZXJ2YWwsID0+XG4gICAgICAgIGZuKHNlbGVjdGlvbiwgaW5kZXgpIGZvciBzZWxlY3Rpb24sIGluZGV4IGluIEBnZXRTZWxlY3Rpb25zT3JkZXJlZEJ5QnVmZmVyUG9zaXRpb24oKVxuXG4gICMgTW92ZSBsaW5lcyBpbnRlcnNlY3RpbmcgdGhlIG1vc3QgcmVjZW50IHNlbGVjdGlvbiBvciBtdWx0aXBsZSBzZWxlY3Rpb25zXG4gICMgdXAgYnkgb25lIHJvdyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMuXG4gIG1vdmVMaW5lVXA6IC0+XG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcygpLnNvcnQoKGEsIGIpIC0+IGEuY29tcGFyZShiKSlcblxuICAgIGlmIHNlbGVjdGlvbnNbMF0uc3RhcnQucm93IGlzIDBcbiAgICAgIHJldHVyblxuXG4gICAgaWYgc2VsZWN0aW9uc1tzZWxlY3Rpb25zLmxlbmd0aCAtIDFdLnN0YXJ0LnJvdyBpcyBAZ2V0TGFzdEJ1ZmZlclJvdygpIGFuZCBAYnVmZmVyLmdldExhc3RMaW5lKCkgaXMgJydcbiAgICAgIHJldHVyblxuXG4gICAgQHRyYW5zYWN0ID0+XG4gICAgICBuZXdTZWxlY3Rpb25SYW5nZXMgPSBbXVxuXG4gICAgICB3aGlsZSBzZWxlY3Rpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgIyBGaW5kIHNlbGVjdGlvbnMgc3Bhbm5pbmcgYSBjb250aWd1b3VzIHNldCBvZiBsaW5lc1xuICAgICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb25zLnNoaWZ0KClcbiAgICAgICAgc2VsZWN0aW9uc1RvTW92ZSA9IFtzZWxlY3Rpb25dXG5cbiAgICAgICAgd2hpbGUgc2VsZWN0aW9uLmVuZC5yb3cgaXMgc2VsZWN0aW9uc1swXT8uc3RhcnQucm93XG4gICAgICAgICAgc2VsZWN0aW9uc1RvTW92ZS5wdXNoKHNlbGVjdGlvbnNbMF0pXG4gICAgICAgICAgc2VsZWN0aW9uLmVuZC5yb3cgPSBzZWxlY3Rpb25zWzBdLmVuZC5yb3dcbiAgICAgICAgICBzZWxlY3Rpb25zLnNoaWZ0KClcblxuICAgICAgICAjIENvbXB1dGUgdGhlIGJ1ZmZlciByYW5nZSBzcGFubmVkIGJ5IGFsbCB0aGVzZSBzZWxlY3Rpb25zLCBleHBhbmRpbmcgaXRcbiAgICAgICAgIyBzbyB0aGF0IGl0IGluY2x1ZGVzIGFueSBmb2xkZWQgcmVnaW9uIHRoYXQgaW50ZXJzZWN0cyB0aGVtLlxuICAgICAgICBzdGFydFJvdyA9IHNlbGVjdGlvbi5zdGFydC5yb3dcbiAgICAgICAgZW5kUm93ID0gc2VsZWN0aW9uLmVuZC5yb3dcbiAgICAgICAgaWYgc2VsZWN0aW9uLmVuZC5yb3cgPiBzZWxlY3Rpb24uc3RhcnQucm93IGFuZCBzZWxlY3Rpb24uZW5kLmNvbHVtbiBpcyAwXG4gICAgICAgICAgIyBEb24ndCBtb3ZlIHRoZSBsYXN0IGxpbmUgb2YgYSBtdWx0aS1saW5lIHNlbGVjdGlvbiBpZiB0aGUgc2VsZWN0aW9uIGVuZHMgYXQgY29sdW1uIDBcbiAgICAgICAgICBlbmRSb3ctLVxuXG4gICAgICAgIHN0YXJ0Um93ID0gQGRpc3BsYXlMYXllci5maW5kQm91bmRhcnlQcmVjZWRpbmdCdWZmZXJSb3coc3RhcnRSb3cpXG4gICAgICAgIGVuZFJvdyA9IEBkaXNwbGF5TGF5ZXIuZmluZEJvdW5kYXJ5Rm9sbG93aW5nQnVmZmVyUm93KGVuZFJvdyArIDEpXG4gICAgICAgIGxpbmVzUmFuZ2UgPSBuZXcgUmFuZ2UoUG9pbnQoc3RhcnRSb3csIDApLCBQb2ludChlbmRSb3csIDApKVxuXG4gICAgICAgICMgSWYgc2VsZWN0ZWQgbGluZSByYW5nZSBpcyBwcmVjZWRlZCBieSBhIGZvbGQsIG9uZSBsaW5lIGFib3ZlIG9uIHNjcmVlblxuICAgICAgICAjIGNvdWxkIGJlIG11bHRpcGxlIGxpbmVzIGluIHRoZSBidWZmZXIuXG4gICAgICAgIHByZWNlZGluZ1JvdyA9IEBkaXNwbGF5TGF5ZXIuZmluZEJvdW5kYXJ5UHJlY2VkaW5nQnVmZmVyUm93KHN0YXJ0Um93IC0gMSlcbiAgICAgICAgaW5zZXJ0RGVsdGEgPSBsaW5lc1JhbmdlLnN0YXJ0LnJvdyAtIHByZWNlZGluZ1Jvd1xuXG4gICAgICAgICMgQW55IGZvbGRzIGluIHRoZSB0ZXh0IHRoYXQgaXMgbW92ZWQgd2lsbCBuZWVkIHRvIGJlIHJlLWNyZWF0ZWQuXG4gICAgICAgICMgSXQgaW5jbHVkZXMgdGhlIGZvbGRzIHRoYXQgd2VyZSBpbnRlcnNlY3Rpbmcgd2l0aCB0aGUgc2VsZWN0aW9uLlxuICAgICAgICByYW5nZXNUb1JlZm9sZCA9IEBkaXNwbGF5TGF5ZXJcbiAgICAgICAgICAuZGVzdHJveUZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2UobGluZXNSYW5nZSlcbiAgICAgICAgICAubWFwKChyYW5nZSkgLT4gcmFuZ2UudHJhbnNsYXRlKFstaW5zZXJ0RGVsdGEsIDBdKSlcblxuICAgICAgICAjIERlbGV0ZSBsaW5lcyBzcGFubmVkIGJ5IHNlbGVjdGlvbiBhbmQgaW5zZXJ0IHRoZW0gb24gdGhlIHByZWNlZGluZyBidWZmZXIgcm93XG4gICAgICAgIGxpbmVzID0gQGJ1ZmZlci5nZXRUZXh0SW5SYW5nZShsaW5lc1JhbmdlKVxuICAgICAgICBsaW5lcyArPSBAYnVmZmVyLmxpbmVFbmRpbmdGb3JSb3cobGluZXNSYW5nZS5lbmQucm93IC0gMikgdW5sZXNzIGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdIGlzICdcXG4nXG4gICAgICAgIEBidWZmZXIuZGVsZXRlKGxpbmVzUmFuZ2UpXG4gICAgICAgIEBidWZmZXIuaW5zZXJ0KFtwcmVjZWRpbmdSb3csIDBdLCBsaW5lcylcblxuICAgICAgICAjIFJlc3RvcmUgZm9sZHMgdGhhdCBleGlzdGVkIGJlZm9yZSB0aGUgbGluZXMgd2VyZSBtb3ZlZFxuICAgICAgICBmb3IgcmFuZ2VUb1JlZm9sZCBpbiByYW5nZXNUb1JlZm9sZFxuICAgICAgICAgIEBkaXNwbGF5TGF5ZXIuZm9sZEJ1ZmZlclJhbmdlKHJhbmdlVG9SZWZvbGQpXG5cbiAgICAgICAgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zVG9Nb3ZlXG4gICAgICAgICAgbmV3U2VsZWN0aW9uUmFuZ2VzLnB1c2goc2VsZWN0aW9uLnRyYW5zbGF0ZShbLWluc2VydERlbHRhLCAwXSkpXG5cbiAgICAgIEBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcyhuZXdTZWxlY3Rpb25SYW5nZXMsIHthdXRvc2Nyb2xsOiBmYWxzZSwgcHJlc2VydmVGb2xkczogdHJ1ZX0pXG4gICAgICBAYXV0b0luZGVudFNlbGVjdGVkUm93cygpIGlmIEBzaG91bGRBdXRvSW5kZW50KClcbiAgICAgIEBzY3JvbGxUb0J1ZmZlclBvc2l0aW9uKFtuZXdTZWxlY3Rpb25SYW5nZXNbMF0uc3RhcnQucm93LCAwXSlcblxuICAjIE1vdmUgbGluZXMgaW50ZXJzZWN0aW5nIHRoZSBtb3N0IHJlY2VudCBzZWxlY3Rpb24gb3IgbXVpbHRpcGxlIHNlbGVjdGlvbnNcbiAgIyBkb3duIGJ5IG9uZSByb3cgaW4gc2NyZWVuIGNvb3JkaW5hdGVzLlxuICBtb3ZlTGluZURvd246IC0+XG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcygpXG4gICAgc2VsZWN0aW9ucy5zb3J0IChhLCBiKSAtPiBhLmNvbXBhcmUoYilcbiAgICBzZWxlY3Rpb25zID0gc2VsZWN0aW9ucy5yZXZlcnNlKClcblxuICAgIEB0cmFuc2FjdCA9PlxuICAgICAgQGNvbnNvbGlkYXRlU2VsZWN0aW9ucygpXG4gICAgICBuZXdTZWxlY3Rpb25SYW5nZXMgPSBbXVxuXG4gICAgICB3aGlsZSBzZWxlY3Rpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgIyBGaW5kIHNlbGVjdGlvbnMgc3Bhbm5pbmcgYSBjb250aWd1b3VzIHNldCBvZiBsaW5lc1xuICAgICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb25zLnNoaWZ0KClcbiAgICAgICAgc2VsZWN0aW9uc1RvTW92ZSA9IFtzZWxlY3Rpb25dXG5cbiAgICAgICAgIyBpZiB0aGUgY3VycmVudCBzZWxlY3Rpb24gc3RhcnQgcm93IG1hdGNoZXMgdGhlIG5leHQgc2VsZWN0aW9ucycgZW5kIHJvdyAtIG1ha2UgdGhlbSBvbmUgc2VsZWN0aW9uXG4gICAgICAgIHdoaWxlIHNlbGVjdGlvbi5zdGFydC5yb3cgaXMgc2VsZWN0aW9uc1swXT8uZW5kLnJvd1xuICAgICAgICAgIHNlbGVjdGlvbnNUb01vdmUucHVzaChzZWxlY3Rpb25zWzBdKVxuICAgICAgICAgIHNlbGVjdGlvbi5zdGFydC5yb3cgPSBzZWxlY3Rpb25zWzBdLnN0YXJ0LnJvd1xuICAgICAgICAgIHNlbGVjdGlvbnMuc2hpZnQoKVxuXG4gICAgICAgICMgQ29tcHV0ZSB0aGUgYnVmZmVyIHJhbmdlIHNwYW5uZWQgYnkgYWxsIHRoZXNlIHNlbGVjdGlvbnMsIGV4cGFuZGluZyBpdFxuICAgICAgICAjIHNvIHRoYXQgaXQgaW5jbHVkZXMgYW55IGZvbGRlZCByZWdpb24gdGhhdCBpbnRlcnNlY3RzIHRoZW0uXG4gICAgICAgIHN0YXJ0Um93ID0gc2VsZWN0aW9uLnN0YXJ0LnJvd1xuICAgICAgICBlbmRSb3cgPSBzZWxlY3Rpb24uZW5kLnJvd1xuICAgICAgICBpZiBzZWxlY3Rpb24uZW5kLnJvdyA+IHNlbGVjdGlvbi5zdGFydC5yb3cgYW5kIHNlbGVjdGlvbi5lbmQuY29sdW1uIGlzIDBcbiAgICAgICAgICAjIERvbid0IG1vdmUgdGhlIGxhc3QgbGluZSBvZiBhIG11bHRpLWxpbmUgc2VsZWN0aW9uIGlmIHRoZSBzZWxlY3Rpb24gZW5kcyBhdCBjb2x1bW4gMFxuICAgICAgICAgIGVuZFJvdy0tXG5cbiAgICAgICAgc3RhcnRSb3cgPSBAZGlzcGxheUxheWVyLmZpbmRCb3VuZGFyeVByZWNlZGluZ0J1ZmZlclJvdyhzdGFydFJvdylcbiAgICAgICAgZW5kUm93ID0gQGRpc3BsYXlMYXllci5maW5kQm91bmRhcnlGb2xsb3dpbmdCdWZmZXJSb3coZW5kUm93ICsgMSlcbiAgICAgICAgbGluZXNSYW5nZSA9IG5ldyBSYW5nZShQb2ludChzdGFydFJvdywgMCksIFBvaW50KGVuZFJvdywgMCkpXG5cbiAgICAgICAgIyBJZiBzZWxlY3RlZCBsaW5lIHJhbmdlIGlzIGZvbGxvd2VkIGJ5IGEgZm9sZCwgb25lIGxpbmUgYmVsb3cgb24gc2NyZWVuXG4gICAgICAgICMgY291bGQgYmUgbXVsdGlwbGUgbGluZXMgaW4gdGhlIGJ1ZmZlci4gQnV0IGF0IHRoZSBzYW1lIHRpbWUsIGlmIHRoZVxuICAgICAgICAjIG5leHQgYnVmZmVyIHJvdyBpcyB3cmFwcGVkLCBvbmUgbGluZSBpbiB0aGUgYnVmZmVyIGNhbiByZXByZXNlbnQgbWFueVxuICAgICAgICAjIHNjcmVlbiByb3dzLlxuICAgICAgICBmb2xsb3dpbmdSb3cgPSBNYXRoLm1pbihAYnVmZmVyLmdldExpbmVDb3VudCgpLCBAZGlzcGxheUxheWVyLmZpbmRCb3VuZGFyeUZvbGxvd2luZ0J1ZmZlclJvdyhlbmRSb3cgKyAxKSlcbiAgICAgICAgaW5zZXJ0RGVsdGEgPSBmb2xsb3dpbmdSb3cgLSBsaW5lc1JhbmdlLmVuZC5yb3dcblxuICAgICAgICAjIEFueSBmb2xkcyBpbiB0aGUgdGV4dCB0aGF0IGlzIG1vdmVkIHdpbGwgbmVlZCB0byBiZSByZS1jcmVhdGVkLlxuICAgICAgICAjIEl0IGluY2x1ZGVzIHRoZSBmb2xkcyB0aGF0IHdlcmUgaW50ZXJzZWN0aW5nIHdpdGggdGhlIHNlbGVjdGlvbi5cbiAgICAgICAgcmFuZ2VzVG9SZWZvbGQgPSBAZGlzcGxheUxheWVyXG4gICAgICAgICAgLmRlc3Ryb3lGb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKGxpbmVzUmFuZ2UpXG4gICAgICAgICAgLm1hcCgocmFuZ2UpIC0+IHJhbmdlLnRyYW5zbGF0ZShbaW5zZXJ0RGVsdGEsIDBdKSlcblxuICAgICAgICAjIERlbGV0ZSBsaW5lcyBzcGFubmVkIGJ5IHNlbGVjdGlvbiBhbmQgaW5zZXJ0IHRoZW0gb24gdGhlIGZvbGxvd2luZyBjb3JyZWN0IGJ1ZmZlciByb3dcbiAgICAgICAgbGluZXMgPSBAYnVmZmVyLmdldFRleHRJblJhbmdlKGxpbmVzUmFuZ2UpXG4gICAgICAgIGlmIGZvbGxvd2luZ1JvdyAtIDEgaXMgQGJ1ZmZlci5nZXRMYXN0Um93KClcbiAgICAgICAgICBsaW5lcyA9IFwiXFxuI3tsaW5lc31cIlxuXG4gICAgICAgIEBidWZmZXIuaW5zZXJ0KFtmb2xsb3dpbmdSb3csIDBdLCBsaW5lcylcbiAgICAgICAgQGJ1ZmZlci5kZWxldGUobGluZXNSYW5nZSlcblxuICAgICAgICAjIFJlc3RvcmUgZm9sZHMgdGhhdCBleGlzdGVkIGJlZm9yZSB0aGUgbGluZXMgd2VyZSBtb3ZlZFxuICAgICAgICBmb3IgcmFuZ2VUb1JlZm9sZCBpbiByYW5nZXNUb1JlZm9sZFxuICAgICAgICAgIEBkaXNwbGF5TGF5ZXIuZm9sZEJ1ZmZlclJhbmdlKHJhbmdlVG9SZWZvbGQpXG5cbiAgICAgICAgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zVG9Nb3ZlXG4gICAgICAgICAgbmV3U2VsZWN0aW9uUmFuZ2VzLnB1c2goc2VsZWN0aW9uLnRyYW5zbGF0ZShbaW5zZXJ0RGVsdGEsIDBdKSlcblxuICAgICAgQHNldFNlbGVjdGVkQnVmZmVyUmFuZ2VzKG5ld1NlbGVjdGlvblJhbmdlcywge2F1dG9zY3JvbGw6IGZhbHNlLCBwcmVzZXJ2ZUZvbGRzOiB0cnVlfSlcbiAgICAgIEBhdXRvSW5kZW50U2VsZWN0ZWRSb3dzKCkgaWYgQHNob3VsZEF1dG9JbmRlbnQoKVxuICAgICAgQHNjcm9sbFRvQnVmZmVyUG9zaXRpb24oW25ld1NlbGVjdGlvblJhbmdlc1swXS5zdGFydC5yb3cgLSAxLCAwXSlcblxuICAjIE1vdmUgYW55IGFjdGl2ZSBzZWxlY3Rpb25zIG9uZSBjb2x1bW4gdG8gdGhlIGxlZnQuXG4gIG1vdmVTZWxlY3Rpb25MZWZ0OiAtPlxuICAgIHNlbGVjdGlvbnMgPSBAZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXMoKVxuICAgIG5vU2VsZWN0aW9uQXRTdGFydE9mTGluZSA9IHNlbGVjdGlvbnMuZXZlcnkoKHNlbGVjdGlvbikgLT5cbiAgICAgIHNlbGVjdGlvbi5zdGFydC5jb2x1bW4gaXNudCAwXG4gICAgKVxuXG4gICAgdHJhbnNsYXRpb25EZWx0YSA9IFswLCAtMV1cbiAgICB0cmFuc2xhdGVkUmFuZ2VzID0gW11cblxuICAgIGlmIG5vU2VsZWN0aW9uQXRTdGFydE9mTGluZVxuICAgICAgQHRyYW5zYWN0ID0+XG4gICAgICAgIGZvciBzZWxlY3Rpb24gaW4gc2VsZWN0aW9uc1xuICAgICAgICAgIGNoYXJUb0xlZnRPZlNlbGVjdGlvbiA9IG5ldyBSYW5nZShzZWxlY3Rpb24uc3RhcnQudHJhbnNsYXRlKHRyYW5zbGF0aW9uRGVsdGEpLCBzZWxlY3Rpb24uc3RhcnQpXG4gICAgICAgICAgY2hhclRleHRUb0xlZnRPZlNlbGVjdGlvbiA9IEBidWZmZXIuZ2V0VGV4dEluUmFuZ2UoY2hhclRvTGVmdE9mU2VsZWN0aW9uKVxuXG4gICAgICAgICAgQGJ1ZmZlci5pbnNlcnQoc2VsZWN0aW9uLmVuZCwgY2hhclRleHRUb0xlZnRPZlNlbGVjdGlvbilcbiAgICAgICAgICBAYnVmZmVyLmRlbGV0ZShjaGFyVG9MZWZ0T2ZTZWxlY3Rpb24pXG4gICAgICAgICAgdHJhbnNsYXRlZFJhbmdlcy5wdXNoKHNlbGVjdGlvbi50cmFuc2xhdGUodHJhbnNsYXRpb25EZWx0YSkpXG5cbiAgICAgICAgQHNldFNlbGVjdGVkQnVmZmVyUmFuZ2VzKHRyYW5zbGF0ZWRSYW5nZXMpXG5cbiAgIyBNb3ZlIGFueSBhY3RpdmUgc2VsZWN0aW9ucyBvbmUgY29sdW1uIHRvIHRoZSByaWdodC5cbiAgbW92ZVNlbGVjdGlvblJpZ2h0OiAtPlxuICAgIHNlbGVjdGlvbnMgPSBAZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXMoKVxuICAgIG5vU2VsZWN0aW9uQXRFbmRPZkxpbmUgPSBzZWxlY3Rpb25zLmV2ZXJ5KChzZWxlY3Rpb24pID0+XG4gICAgICBzZWxlY3Rpb24uZW5kLmNvbHVtbiBpc250IEBidWZmZXIubGluZUxlbmd0aEZvclJvdyhzZWxlY3Rpb24uZW5kLnJvdylcbiAgICApXG5cbiAgICB0cmFuc2xhdGlvbkRlbHRhID0gWzAsIDFdXG4gICAgdHJhbnNsYXRlZFJhbmdlcyA9IFtdXG5cbiAgICBpZiBub1NlbGVjdGlvbkF0RW5kT2ZMaW5lXG4gICAgICBAdHJhbnNhY3QgPT5cbiAgICAgICAgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zXG4gICAgICAgICAgY2hhclRvUmlnaHRPZlNlbGVjdGlvbiA9IG5ldyBSYW5nZShzZWxlY3Rpb24uZW5kLCBzZWxlY3Rpb24uZW5kLnRyYW5zbGF0ZSh0cmFuc2xhdGlvbkRlbHRhKSlcbiAgICAgICAgICBjaGFyVGV4dFRvUmlnaHRPZlNlbGVjdGlvbiA9IEBidWZmZXIuZ2V0VGV4dEluUmFuZ2UoY2hhclRvUmlnaHRPZlNlbGVjdGlvbilcblxuICAgICAgICAgIEBidWZmZXIuZGVsZXRlKGNoYXJUb1JpZ2h0T2ZTZWxlY3Rpb24pXG4gICAgICAgICAgQGJ1ZmZlci5pbnNlcnQoc2VsZWN0aW9uLnN0YXJ0LCBjaGFyVGV4dFRvUmlnaHRPZlNlbGVjdGlvbilcbiAgICAgICAgICB0cmFuc2xhdGVkUmFuZ2VzLnB1c2goc2VsZWN0aW9uLnRyYW5zbGF0ZSh0cmFuc2xhdGlvbkRlbHRhKSlcblxuICAgICAgICBAc2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXModHJhbnNsYXRlZFJhbmdlcylcblxuICBkdXBsaWNhdGVMaW5lczogLT5cbiAgICBAdHJhbnNhY3QgPT5cbiAgICAgIHNlbGVjdGlvbnMgPSBAZ2V0U2VsZWN0aW9uc09yZGVyZWRCeUJ1ZmZlclBvc2l0aW9uKClcbiAgICAgIHByZXZpb3VzU2VsZWN0aW9uUmFuZ2VzID0gW11cblxuICAgICAgaSA9IHNlbGVjdGlvbnMubGVuZ3RoIC0gMVxuICAgICAgd2hpbGUgaSA+PSAwXG4gICAgICAgIGogPSBpXG4gICAgICAgIHByZXZpb3VzU2VsZWN0aW9uUmFuZ2VzW2ldID0gc2VsZWN0aW9uc1tpXS5nZXRCdWZmZXJSYW5nZSgpXG4gICAgICAgIGlmIHNlbGVjdGlvbnNbaV0uaXNFbXB0eSgpXG4gICAgICAgICAge3N0YXJ0fSA9IHNlbGVjdGlvbnNbaV0uZ2V0U2NyZWVuUmFuZ2UoKVxuICAgICAgICAgIHNlbGVjdGlvbnNbaV0uc2V0U2NyZWVuUmFuZ2UoW1tzdGFydC5yb3csIDBdLCBbc3RhcnQucm93ICsgMSwgMF1dLCBwcmVzZXJ2ZUZvbGRzOiB0cnVlKVxuICAgICAgICBbc3RhcnRSb3csIGVuZFJvd10gPSBzZWxlY3Rpb25zW2ldLmdldEJ1ZmZlclJvd1JhbmdlKClcbiAgICAgICAgZW5kUm93KytcbiAgICAgICAgd2hpbGUgaSA+IDBcbiAgICAgICAgICBbcHJldmlvdXNTZWxlY3Rpb25TdGFydFJvdywgcHJldmlvdXNTZWxlY3Rpb25FbmRSb3ddID0gc2VsZWN0aW9uc1tpIC0gMV0uZ2V0QnVmZmVyUm93UmFuZ2UoKVxuICAgICAgICAgIGlmIHByZXZpb3VzU2VsZWN0aW9uRW5kUm93IGlzIHN0YXJ0Um93XG4gICAgICAgICAgICBzdGFydFJvdyA9IHByZXZpb3VzU2VsZWN0aW9uU3RhcnRSb3dcbiAgICAgICAgICAgIHByZXZpb3VzU2VsZWN0aW9uUmFuZ2VzW2kgLSAxXSA9IHNlbGVjdGlvbnNbaSAtIDFdLmdldEJ1ZmZlclJhbmdlKClcbiAgICAgICAgICAgIGktLVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgaW50ZXJzZWN0aW5nRm9sZHMgPSBAZGlzcGxheUxheWVyLmZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2UoW1tzdGFydFJvdywgMF0sIFtlbmRSb3csIDBdXSlcbiAgICAgICAgdGV4dFRvRHVwbGljYXRlID0gQGdldFRleHRJbkJ1ZmZlclJhbmdlKFtbc3RhcnRSb3csIDBdLCBbZW5kUm93LCAwXV0pXG4gICAgICAgIHRleHRUb0R1cGxpY2F0ZSA9ICdcXG4nICsgdGV4dFRvRHVwbGljYXRlIGlmIGVuZFJvdyA+IEBnZXRMYXN0QnVmZmVyUm93KClcbiAgICAgICAgQGJ1ZmZlci5pbnNlcnQoW2VuZFJvdywgMF0sIHRleHRUb0R1cGxpY2F0ZSlcblxuICAgICAgICBpbnNlcnRlZFJvd0NvdW50ID0gZW5kUm93IC0gc3RhcnRSb3dcblxuICAgICAgICBmb3IgayBpbiBbaS4ual0gYnkgMVxuICAgICAgICAgIHNlbGVjdGlvbnNba10uc2V0QnVmZmVyUmFuZ2UocHJldmlvdXNTZWxlY3Rpb25SYW5nZXNba10udHJhbnNsYXRlKFtpbnNlcnRlZFJvd0NvdW50LCAwXSkpXG5cbiAgICAgICAgZm9yIGZvbGQgaW4gaW50ZXJzZWN0aW5nRm9sZHNcbiAgICAgICAgICBmb2xkUmFuZ2UgPSBAZGlzcGxheUxheWVyLmJ1ZmZlclJhbmdlRm9yRm9sZChmb2xkKVxuICAgICAgICAgIEBkaXNwbGF5TGF5ZXIuZm9sZEJ1ZmZlclJhbmdlKGZvbGRSYW5nZS50cmFuc2xhdGUoW2luc2VydGVkUm93Q291bnQsIDBdKSlcblxuICAgICAgICBpLS1cblxuICByZXBsYWNlU2VsZWN0ZWRUZXh0OiAob3B0aW9ucz17fSwgZm4pIC0+XG4gICAge3NlbGVjdFdvcmRJZkVtcHR5fSA9IG9wdGlvbnNcbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+XG4gICAgICBzZWxlY3Rpb24uZ2V0QnVmZmVyUmFuZ2UoKVxuICAgICAgaWYgc2VsZWN0V29yZElmRW1wdHkgYW5kIHNlbGVjdGlvbi5pc0VtcHR5KClcbiAgICAgICAgc2VsZWN0aW9uLnNlbGVjdFdvcmQoKVxuICAgICAgdGV4dCA9IHNlbGVjdGlvbi5nZXRUZXh0KClcbiAgICAgIHNlbGVjdGlvbi5kZWxldGVTZWxlY3RlZFRleHQoKVxuICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uaW5zZXJ0VGV4dChmbih0ZXh0KSlcbiAgICAgIHNlbGVjdGlvbi5zZXRCdWZmZXJSYW5nZShyYW5nZSlcblxuICAjIFNwbGl0IG11bHRpLWxpbmUgc2VsZWN0aW9ucyBpbnRvIG9uZSBzZWxlY3Rpb24gcGVyIGxpbmUuXG4gICNcbiAgIyBPcGVyYXRlcyBvbiBhbGwgc2VsZWN0aW9ucy4gVGhpcyBtZXRob2QgYnJlYWtzIGFwYXJ0IGFsbCBtdWx0aS1saW5lXG4gICMgc2VsZWN0aW9ucyB0byBjcmVhdGUgbXVsdGlwbGUgc2luZ2xlLWxpbmUgc2VsZWN0aW9ucyB0aGF0IGN1bXVsYXRpdmVseSBjb3ZlclxuICAjIHRoZSBzYW1lIG9yaWdpbmFsIGFyZWEuXG4gIHNwbGl0U2VsZWN0aW9uc0ludG9MaW5lczogLT5cbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zID0+XG4gICAgICBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcbiAgICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0QnVmZmVyUmFuZ2UoKVxuICAgICAgICBjb250aW51ZSBpZiByYW5nZS5pc1NpbmdsZUxpbmUoKVxuXG4gICAgICAgIHtzdGFydCwgZW5kfSA9IHJhbmdlXG4gICAgICAgIEBhZGRTZWxlY3Rpb25Gb3JCdWZmZXJSYW5nZShbc3RhcnQsIFtzdGFydC5yb3csIEluZmluaXR5XV0pXG4gICAgICAgIHtyb3d9ID0gc3RhcnRcbiAgICAgICAgd2hpbGUgKytyb3cgPCBlbmQucm93XG4gICAgICAgICAgQGFkZFNlbGVjdGlvbkZvckJ1ZmZlclJhbmdlKFtbcm93LCAwXSwgW3JvdywgSW5maW5pdHldXSlcbiAgICAgICAgQGFkZFNlbGVjdGlvbkZvckJ1ZmZlclJhbmdlKFtbZW5kLnJvdywgMF0sIFtlbmQucm93LCBlbmQuY29sdW1uXV0pIHVubGVzcyBlbmQuY29sdW1uIGlzIDBcbiAgICAgICAgc2VsZWN0aW9uLmRlc3Ryb3koKVxuICAgICAgcmV0dXJuXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCB0cmFuc3Bvc2UgdGhlIHNlbGVjdGVkIHRleHQuXG4gICNcbiAgIyBJZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCB0aGUgY2hhcmFjdGVycyBwcmVjZWRpbmcgYW5kIGZvbGxvd2luZyB0aGUgY3Vyc29yXG4gICMgYXJlIHN3YXBwZWQuIE90aGVyd2lzZSwgdGhlIHNlbGVjdGVkIGNoYXJhY3RlcnMgYXJlIHJldmVyc2VkLlxuICB0cmFuc3Bvc2U6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPlxuICAgICAgaWYgc2VsZWN0aW9uLmlzRW1wdHkoKVxuICAgICAgICBzZWxlY3Rpb24uc2VsZWN0UmlnaHQoKVxuICAgICAgICB0ZXh0ID0gc2VsZWN0aW9uLmdldFRleHQoKVxuICAgICAgICBzZWxlY3Rpb24uZGVsZXRlKClcbiAgICAgICAgc2VsZWN0aW9uLmN1cnNvci5tb3ZlTGVmdCgpXG4gICAgICAgIHNlbGVjdGlvbi5pbnNlcnRUZXh0IHRleHRcbiAgICAgIGVsc2VcbiAgICAgICAgc2VsZWN0aW9uLmluc2VydFRleHQgc2VsZWN0aW9uLmdldFRleHQoKS5zcGxpdCgnJykucmV2ZXJzZSgpLmpvaW4oJycpXG5cbiAgIyBFeHRlbmRlZDogQ29udmVydCB0aGUgc2VsZWN0ZWQgdGV4dCB0byB1cHBlciBjYXNlLlxuICAjXG4gICMgRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBjb252ZXJ0cyB0aGUgY29udGFpbmluZyB3b3JkXG4gICMgdG8gdXBwZXIgY2FzZS4gT3RoZXJ3aXNlIGNvbnZlcnQgdGhlIHNlbGVjdGVkIHRleHQgdG8gdXBwZXIgY2FzZS5cbiAgdXBwZXJDYXNlOiAtPlxuICAgIEByZXBsYWNlU2VsZWN0ZWRUZXh0IHNlbGVjdFdvcmRJZkVtcHR5OiB0cnVlLCAodGV4dCkgLT4gdGV4dC50b1VwcGVyQ2FzZSgpXG5cbiAgIyBFeHRlbmRlZDogQ29udmVydCB0aGUgc2VsZWN0ZWQgdGV4dCB0byBsb3dlciBjYXNlLlxuICAjXG4gICMgRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBjb252ZXJ0cyB0aGUgY29udGFpbmluZyB3b3JkXG4gICMgdG8gdXBwZXIgY2FzZS4gT3RoZXJ3aXNlIGNvbnZlcnQgdGhlIHNlbGVjdGVkIHRleHQgdG8gdXBwZXIgY2FzZS5cbiAgbG93ZXJDYXNlOiAtPlxuICAgIEByZXBsYWNlU2VsZWN0ZWRUZXh0IHNlbGVjdFdvcmRJZkVtcHR5OiB0cnVlLCAodGV4dCkgLT4gdGV4dC50b0xvd2VyQ2FzZSgpXG5cbiAgIyBFeHRlbmRlZDogVG9nZ2xlIGxpbmUgY29tbWVudHMgZm9yIHJvd3MgaW50ZXJzZWN0aW5nIHNlbGVjdGlvbnMuXG4gICNcbiAgIyBJZiB0aGUgY3VycmVudCBncmFtbWFyIGRvZXNuJ3Qgc3VwcG9ydCBjb21tZW50cywgZG9lcyBub3RoaW5nLlxuICB0b2dnbGVMaW5lQ29tbWVudHNJblNlbGVjdGlvbjogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi50b2dnbGVMaW5lQ29tbWVudHMoKVxuXG4gICMgQ29udmVydCBtdWx0aXBsZSBsaW5lcyB0byBhIHNpbmdsZSBsaW5lLlxuICAjXG4gICMgT3BlcmF0ZXMgb24gYWxsIHNlbGVjdGlvbnMuIElmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGpvaW5zIHRoZSBjdXJyZW50XG4gICMgbGluZSB3aXRoIHRoZSBuZXh0IGxpbmUuIE90aGVyd2lzZSBpdCBqb2lucyBhbGwgbGluZXMgdGhhdCBpbnRlcnNlY3QgdGhlXG4gICMgc2VsZWN0aW9uLlxuICAjXG4gICMgSm9pbmluZyBhIGxpbmUgbWVhbnMgdGhhdCBtdWx0aXBsZSBsaW5lcyBhcmUgY29udmVydGVkIHRvIGEgc2luZ2xlIGxpbmUgd2l0aFxuICAjIHRoZSBjb250ZW50cyBvZiBlYWNoIG9mIHRoZSBvcmlnaW5hbCBub24tZW1wdHkgbGluZXMgc2VwYXJhdGVkIGJ5IGEgc3BhY2UuXG4gIGpvaW5MaW5lczogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5qb2luTGluZXMoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIGN1cnNvciwgaW5zZXJ0IGEgbmV3bGluZSBhdCBiZWdpbm5pbmcgdGhlIGZvbGxvd2luZyBsaW5lLlxuICBpbnNlcnROZXdsaW5lQmVsb3c6IC0+XG4gICAgQHRyYW5zYWN0ID0+XG4gICAgICBAbW92ZVRvRW5kT2ZMaW5lKClcbiAgICAgIEBpbnNlcnROZXdsaW5lKClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBjdXJzb3IsIGluc2VydCBhIG5ld2xpbmUgYXQgdGhlIGVuZCBvZiB0aGUgcHJlY2VkaW5nIGxpbmUuXG4gIGluc2VydE5ld2xpbmVBYm92ZTogLT5cbiAgICBAdHJhbnNhY3QgPT5cbiAgICAgIGJ1ZmZlclJvdyA9IEBnZXRDdXJzb3JCdWZmZXJQb3NpdGlvbigpLnJvd1xuICAgICAgaW5kZW50TGV2ZWwgPSBAaW5kZW50YXRpb25Gb3JCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgICAgb25GaXJzdExpbmUgPSBidWZmZXJSb3cgaXMgMFxuXG4gICAgICBAbW92ZVRvQmVnaW5uaW5nT2ZMaW5lKClcbiAgICAgIEBtb3ZlTGVmdCgpXG4gICAgICBAaW5zZXJ0TmV3bGluZSgpXG5cbiAgICAgIGlmIEBzaG91bGRBdXRvSW5kZW50KCkgYW5kIEBpbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhidWZmZXJSb3cpIDwgaW5kZW50TGV2ZWxcbiAgICAgICAgQHNldEluZGVudGF0aW9uRm9yQnVmZmVyUm93KGJ1ZmZlclJvdywgaW5kZW50TGV2ZWwpXG5cbiAgICAgIGlmIG9uRmlyc3RMaW5lXG4gICAgICAgIEBtb3ZlVXAoKVxuICAgICAgICBAbW92ZVRvRW5kT2ZMaW5lKClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBzZWxlY3Rpb24sIGlmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGRlbGV0ZSBhbGwgY2hhcmFjdGVyc1xuICAjIG9mIHRoZSBjb250YWluaW5nIHdvcmQgdGhhdCBwcmVjZWRlIHRoZSBjdXJzb3IuIE90aGVyd2lzZSBkZWxldGUgdGhlXG4gICMgc2VsZWN0ZWQgdGV4dC5cbiAgZGVsZXRlVG9CZWdpbm5pbmdPZldvcmQ6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlVG9CZWdpbm5pbmdPZldvcmQoKVxuXG4gICMgRXh0ZW5kZWQ6IFNpbWlsYXIgdG8gezo6ZGVsZXRlVG9CZWdpbm5pbmdPZldvcmR9LCBidXQgZGVsZXRlcyBvbmx5IGJhY2sgdG8gdGhlXG4gICMgcHJldmlvdXMgd29yZCBib3VuZGFyeS5cbiAgZGVsZXRlVG9QcmV2aW91c1dvcmRCb3VuZGFyeTogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb1ByZXZpb3VzV29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBTaW1pbGFyIHRvIHs6OmRlbGV0ZVRvRW5kT2ZXb3JkfSwgYnV0IGRlbGV0ZXMgb25seSB1cCB0byB0aGVcbiAgIyBuZXh0IHdvcmQgYm91bmRhcnkuXG4gIGRlbGV0ZVRvTmV4dFdvcmRCb3VuZGFyeTogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb05leHRXb3JkQm91bmRhcnkoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgaWYgdGhlIHNlbGVjdGlvbiBpcyBlbXB0eSwgZGVsZXRlIGFsbCBjaGFyYWN0ZXJzXG4gICMgb2YgdGhlIGNvbnRhaW5pbmcgc3Vid29yZCBmb2xsb3dpbmcgdGhlIGN1cnNvci4gT3RoZXJ3aXNlIGRlbGV0ZSB0aGUgc2VsZWN0ZWRcbiAgIyB0ZXh0LlxuICBkZWxldGVUb0JlZ2lubmluZ09mU3Vid29yZDogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb0JlZ2lubmluZ09mU3Vid29yZCgpXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBkZWxldGUgYWxsIGNoYXJhY3RlcnNcbiAgIyBvZiB0aGUgY29udGFpbmluZyBzdWJ3b3JkIGZvbGxvd2luZyB0aGUgY3Vyc29yLiBPdGhlcndpc2UgZGVsZXRlIHRoZSBzZWxlY3RlZFxuICAjIHRleHQuXG4gIGRlbGV0ZVRvRW5kT2ZTdWJ3b3JkOiAtPlxuICAgIEBtdXRhdGVTZWxlY3RlZFRleHQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLmRlbGV0ZVRvRW5kT2ZTdWJ3b3JkKClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBzZWxlY3Rpb24sIGlmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGRlbGV0ZSBhbGwgY2hhcmFjdGVyc1xuICAjIG9mIHRoZSBjb250YWluaW5nIGxpbmUgdGhhdCBwcmVjZWRlIHRoZSBjdXJzb3IuIE90aGVyd2lzZSBkZWxldGUgdGhlXG4gICMgc2VsZWN0ZWQgdGV4dC5cbiAgZGVsZXRlVG9CZWdpbm5pbmdPZkxpbmU6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlVG9CZWdpbm5pbmdPZkxpbmUoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgaWYgdGhlIHNlbGVjdGlvbiBpcyBub3QgZW1wdHksIGRlbGV0ZXMgdGhlXG4gICMgc2VsZWN0aW9uOyBvdGhlcndpc2UsIGRlbGV0ZXMgYWxsIGNoYXJhY3RlcnMgb2YgdGhlIGNvbnRhaW5pbmcgbGluZVxuICAjIGZvbGxvd2luZyB0aGUgY3Vyc29yLiBJZiB0aGUgY3Vyc29yIGlzIGFscmVhZHkgYXQgdGhlIGVuZCBvZiB0aGUgbGluZSxcbiAgIyBkZWxldGVzIHRoZSBmb2xsb3dpbmcgbmV3bGluZS5cbiAgZGVsZXRlVG9FbmRPZkxpbmU6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlVG9FbmRPZkxpbmUoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgaWYgdGhlIHNlbGVjdGlvbiBpcyBlbXB0eSwgZGVsZXRlIGFsbCBjaGFyYWN0ZXJzXG4gICMgb2YgdGhlIGNvbnRhaW5pbmcgd29yZCBmb2xsb3dpbmcgdGhlIGN1cnNvci4gT3RoZXJ3aXNlIGRlbGV0ZSB0aGUgc2VsZWN0ZWRcbiAgIyB0ZXh0LlxuICBkZWxldGVUb0VuZE9mV29yZDogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb0VuZE9mV29yZCgpXG5cbiAgIyBFeHRlbmRlZDogRGVsZXRlIGFsbCBsaW5lcyBpbnRlcnNlY3Rpbmcgc2VsZWN0aW9ucy5cbiAgZGVsZXRlTGluZTogLT5cbiAgICBAbWVyZ2VTZWxlY3Rpb25zT25TYW1lUm93cygpXG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlTGluZSgpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEhpc3RvcnlcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IFVuZG8gdGhlIGxhc3QgY2hhbmdlLlxuICB1bmRvOiAtPlxuICAgIEBhdm9pZE1lcmdpbmdTZWxlY3Rpb25zID0+IEBidWZmZXIudW5kbygpXG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5hdXRvc2Nyb2xsKClcblxuICAjIEVzc2VudGlhbDogUmVkbyB0aGUgbGFzdCBjaGFuZ2UuXG4gIHJlZG86IC0+XG4gICAgQGF2b2lkTWVyZ2luZ1NlbGVjdGlvbnMgPT4gQGJ1ZmZlci5yZWRvKClcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmF1dG9zY3JvbGwoKVxuXG4gICMgRXh0ZW5kZWQ6IEJhdGNoIG11bHRpcGxlIG9wZXJhdGlvbnMgYXMgYSBzaW5nbGUgdW5kby9yZWRvIHN0ZXAuXG4gICNcbiAgIyBBbnkgZ3JvdXAgb2Ygb3BlcmF0aW9ucyB0aGF0IGFyZSBsb2dpY2FsbHkgZ3JvdXBlZCBmcm9tIHRoZSBwZXJzcGVjdGl2ZSBvZlxuICAjIHVuZG9pbmcgYW5kIHJlZG9pbmcgc2hvdWxkIGJlIHBlcmZvcm1lZCBpbiBhIHRyYW5zYWN0aW9uLiBJZiB5b3Ugd2FudCB0b1xuICAjIGFib3J0IHRoZSB0cmFuc2FjdGlvbiwgY2FsbCB7OjphYm9ydFRyYW5zYWN0aW9ufSB0byB0ZXJtaW5hdGUgdGhlIGZ1bmN0aW9uJ3NcbiAgIyBleGVjdXRpb24gYW5kIHJldmVydCBhbnkgY2hhbmdlcyBwZXJmb3JtZWQgdXAgdG8gdGhlIGFib3J0aW9uLlxuICAjXG4gICMgKiBgZ3JvdXBpbmdJbnRlcnZhbGAgKG9wdGlvbmFsKSBUaGUge051bWJlcn0gb2YgbWlsbGlzZWNvbmRzIGZvciB3aGljaCB0aGlzXG4gICMgICB0cmFuc2FjdGlvbiBzaG91bGQgYmUgY29uc2lkZXJlZCAnZ3JvdXBhYmxlJyBhZnRlciBpdCBiZWdpbnMuIElmIGEgdHJhbnNhY3Rpb25cbiAgIyAgIHdpdGggYSBwb3NpdGl2ZSBgZ3JvdXBpbmdJbnRlcnZhbGAgaXMgY29tbWl0dGVkIHdoaWxlIHRoZSBwcmV2aW91cyB0cmFuc2FjdGlvbiBpc1xuICAjICAgc3RpbGwgJ2dyb3VwYWJsZScsIHRoZSB0d28gdHJhbnNhY3Rpb25zIGFyZSBtZXJnZWQgd2l0aCByZXNwZWN0IHRvIHVuZG8gYW5kIHJlZG8uXG4gICMgKiBgZm5gIEEge0Z1bmN0aW9ufSB0byBjYWxsIGluc2lkZSB0aGUgdHJhbnNhY3Rpb24uXG4gIHRyYW5zYWN0OiAoZ3JvdXBpbmdJbnRlcnZhbCwgZm4pIC0+XG4gICAgQGJ1ZmZlci50cmFuc2FjdChncm91cGluZ0ludGVydmFsLCBmbilcblxuICAjIERlcHJlY2F0ZWQ6IFN0YXJ0IGFuIG9wZW4tZW5kZWQgdHJhbnNhY3Rpb24uXG4gIGJlZ2luVHJhbnNhY3Rpb246IChncm91cGluZ0ludGVydmFsKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKCdUcmFuc2FjdGlvbnMgc2hvdWxkIGJlIHBlcmZvcm1lZCB2aWEgVGV4dEVkaXRvcjo6dHJhbnNhY3Qgb25seScpXG4gICAgQGJ1ZmZlci5iZWdpblRyYW5zYWN0aW9uKGdyb3VwaW5nSW50ZXJ2YWwpXG5cbiAgIyBEZXByZWNhdGVkOiBDb21taXQgYW4gb3Blbi1lbmRlZCB0cmFuc2FjdGlvbiBzdGFydGVkIHdpdGggezo6YmVnaW5UcmFuc2FjdGlvbn0uXG4gIGNvbW1pdFRyYW5zYWN0aW9uOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKCdUcmFuc2FjdGlvbnMgc2hvdWxkIGJlIHBlcmZvcm1lZCB2aWEgVGV4dEVkaXRvcjo6dHJhbnNhY3Qgb25seScpXG4gICAgQGJ1ZmZlci5jb21taXRUcmFuc2FjdGlvbigpXG5cbiAgIyBFeHRlbmRlZDogQWJvcnQgYW4gb3BlbiB0cmFuc2FjdGlvbiwgdW5kb2luZyBhbnkgb3BlcmF0aW9ucyBwZXJmb3JtZWQgc28gZmFyXG4gICMgd2l0aGluIHRoZSB0cmFuc2FjdGlvbi5cbiAgYWJvcnRUcmFuc2FjdGlvbjogLT4gQGJ1ZmZlci5hYm9ydFRyYW5zYWN0aW9uKClcblxuICAjIEV4dGVuZGVkOiBDcmVhdGUgYSBwb2ludGVyIHRvIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBidWZmZXIgZm9yIHVzZVxuICAjIHdpdGggezo6cmV2ZXJ0VG9DaGVja3BvaW50fSBhbmQgezo6Z3JvdXBDaGFuZ2VzU2luY2VDaGVja3BvaW50fS5cbiAgI1xuICAjIFJldHVybnMgYSBjaGVja3BvaW50IHZhbHVlLlxuICBjcmVhdGVDaGVja3BvaW50OiAtPiBAYnVmZmVyLmNyZWF0ZUNoZWNrcG9pbnQoKVxuXG4gICMgRXh0ZW5kZWQ6IFJldmVydCB0aGUgYnVmZmVyIHRvIHRoZSBzdGF0ZSBpdCB3YXMgaW4gd2hlbiB0aGUgZ2l2ZW5cbiAgIyBjaGVja3BvaW50IHdhcyBjcmVhdGVkLlxuICAjXG4gICMgVGhlIHJlZG8gc3RhY2sgd2lsbCBiZSBlbXB0eSBmb2xsb3dpbmcgdGhpcyBvcGVyYXRpb24sIHNvIGNoYW5nZXMgc2luY2UgdGhlXG4gICMgY2hlY2twb2ludCB3aWxsIGJlIGxvc3QuIElmIHRoZSBnaXZlbiBjaGVja3BvaW50IGlzIG5vIGxvbmdlciBwcmVzZW50IGluIHRoZVxuICAjIHVuZG8gaGlzdG9yeSwgbm8gY2hhbmdlcyB3aWxsIGJlIG1hZGUgdG8gdGhlIGJ1ZmZlciBhbmQgdGhpcyBtZXRob2Qgd2lsbFxuICAjIHJldHVybiBgZmFsc2VgLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIG9wZXJhdGlvbiBzdWNjZWVkZWQuXG4gIHJldmVydFRvQ2hlY2twb2ludDogKGNoZWNrcG9pbnQpIC0+IEBidWZmZXIucmV2ZXJ0VG9DaGVja3BvaW50KGNoZWNrcG9pbnQpXG5cbiAgIyBFeHRlbmRlZDogR3JvdXAgYWxsIGNoYW5nZXMgc2luY2UgdGhlIGdpdmVuIGNoZWNrcG9pbnQgaW50byBhIHNpbmdsZVxuICAjIHRyYW5zYWN0aW9uIGZvciBwdXJwb3NlcyBvZiB1bmRvL3JlZG8uXG4gICNcbiAgIyBJZiB0aGUgZ2l2ZW4gY2hlY2twb2ludCBpcyBubyBsb25nZXIgcHJlc2VudCBpbiB0aGUgdW5kbyBoaXN0b3J5LCBub1xuICAjIGdyb3VwaW5nIHdpbGwgYmUgcGVyZm9ybWVkIGFuZCB0aGlzIG1ldGhvZCB3aWxsIHJldHVybiBgZmFsc2VgLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIG9wZXJhdGlvbiBzdWNjZWVkZWQuXG4gIGdyb3VwQ2hhbmdlc1NpbmNlQ2hlY2twb2ludDogKGNoZWNrcG9pbnQpIC0+IEBidWZmZXIuZ3JvdXBDaGFuZ2VzU2luY2VDaGVja3BvaW50KGNoZWNrcG9pbnQpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFRleHRFZGl0b3IgQ29vcmRpbmF0ZXNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IENvbnZlcnQgYSBwb3NpdGlvbiBpbiBidWZmZXItY29vcmRpbmF0ZXMgdG8gc2NyZWVuLWNvb3JkaW5hdGVzLlxuICAjXG4gICMgVGhlIHBvc2l0aW9uIGlzIGNsaXBwZWQgdmlhIHs6OmNsaXBCdWZmZXJQb3NpdGlvbn0gcHJpb3IgdG8gdGhlIGNvbnZlcnNpb24uXG4gICMgVGhlIHBvc2l0aW9uIGlzIGFsc28gY2xpcHBlZCB2aWEgezo6Y2xpcFNjcmVlblBvc2l0aW9ufSBmb2xsb3dpbmcgdGhlXG4gICMgY29udmVyc2lvbiwgd2hpY2ggb25seSBtYWtlcyBhIGRpZmZlcmVuY2Ugd2hlbiBgb3B0aW9uc2AgYXJlIHN1cHBsaWVkLlxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIFtyb3csIGNvbHVtbl0uXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiBvcHRpb25zIGhhc2ggZm9yIHs6OmNsaXBTY3JlZW5Qb3NpdGlvbn0uXG4gICNcbiAgIyBSZXR1cm5zIGEge1BvaW50fS5cbiAgc2NyZWVuUG9zaXRpb25Gb3JCdWZmZXJQb3NpdGlvbjogKGJ1ZmZlclBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIGlmIG9wdGlvbnM/LmNsaXA/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgY2xpcGAgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbmAgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBvcHRpb25zLmNsaXBcbiAgICBpZiBvcHRpb25zPy53cmFwQXRTb2Z0TmV3bGluZXM/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgd3JhcEF0U29mdE5ld2xpbmVzYCBwYXJhbWV0ZXIgaGFzIGJlZW4gZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIHNvb24uIFBsZWFzZSwgdXNlIGBjbGlwRGlyZWN0aW9uOiAnZm9yd2FyZCdgIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gaWYgb3B0aW9ucy53cmFwQXRTb2Z0TmV3bGluZXMgdGhlbiAnZm9yd2FyZCcgZWxzZSAnYmFja3dhcmQnXG4gICAgaWYgb3B0aW9ucz8ud3JhcEJleW9uZE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBCZXlvbmROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEJleW9uZE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuXG4gICAgQGRpc3BsYXlMYXllci50cmFuc2xhdGVCdWZmZXJQb3NpdGlvbihidWZmZXJQb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogQ29udmVydCBhIHBvc2l0aW9uIGluIHNjcmVlbi1jb29yZGluYXRlcyB0byBidWZmZXItY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBUaGUgcG9zaXRpb24gaXMgY2xpcHBlZCB2aWEgezo6Y2xpcFNjcmVlblBvc2l0aW9ufSBwcmlvciB0byB0aGUgY29udmVyc2lvbi5cbiAgI1xuICAjICogYGJ1ZmZlclBvc2l0aW9uYCBBIHtQb2ludH0gb3Ige0FycmF5fSBvZiBbcm93LCBjb2x1bW5dLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyBoYXNoIGZvciB7OjpjbGlwU2NyZWVuUG9zaXRpb259LlxuICAjXG4gICMgUmV0dXJucyBhIHtQb2ludH0uXG4gIGJ1ZmZlclBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBpZiBvcHRpb25zPy5jbGlwP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYGNsaXBgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb25gIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gb3B0aW9ucy5jbGlwXG4gICAgaWYgb3B0aW9ucz8ud3JhcEF0U29mdE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBBdFNvZnROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEF0U29mdE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuICAgIGlmIG9wdGlvbnM/LndyYXBCZXlvbmROZXdsaW5lcz9cbiAgICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhlIGB3cmFwQmV5b25kTmV3bGluZXNgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb246ICdmb3J3YXJkJ2AgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBpZiBvcHRpb25zLndyYXBCZXlvbmROZXdsaW5lcyB0aGVuICdmb3J3YXJkJyBlbHNlICdiYWNrd2FyZCdcblxuICAgIEBkaXNwbGF5TGF5ZXIudHJhbnNsYXRlU2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24sIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IENvbnZlcnQgYSByYW5nZSBpbiBidWZmZXItY29vcmRpbmF0ZXMgdG8gc2NyZWVuLWNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgYnVmZmVyUmFuZ2VgIHtSYW5nZX0gaW4gYnVmZmVyIGNvb3JkaW5hdGVzIHRvIHRyYW5zbGF0ZSBpbnRvIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBzY3JlZW5SYW5nZUZvckJ1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgYnVmZmVyUmFuZ2UgPSBSYW5nZS5mcm9tT2JqZWN0KGJ1ZmZlclJhbmdlKVxuICAgIHN0YXJ0ID0gQHNjcmVlblBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb24oYnVmZmVyUmFuZ2Uuc3RhcnQsIG9wdGlvbnMpXG4gICAgZW5kID0gQHNjcmVlblBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb24oYnVmZmVyUmFuZ2UuZW5kLCBvcHRpb25zKVxuICAgIG5ldyBSYW5nZShzdGFydCwgZW5kKVxuXG4gICMgRXNzZW50aWFsOiBDb252ZXJ0IGEgcmFuZ2UgaW4gc2NyZWVuLWNvb3JkaW5hdGVzIHRvIGJ1ZmZlci1jb29yZGluYXRlcy5cbiAgI1xuICAjICogYHNjcmVlblJhbmdlYCB7UmFuZ2V9IGluIHNjcmVlbiBjb29yZGluYXRlcyB0byB0cmFuc2xhdGUgaW50byBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgYnVmZmVyUmFuZ2VGb3JTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlKSAtPlxuICAgIHNjcmVlblJhbmdlID0gUmFuZ2UuZnJvbU9iamVjdChzY3JlZW5SYW5nZSlcbiAgICBzdGFydCA9IEBidWZmZXJQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLnN0YXJ0KVxuICAgIGVuZCA9IEBidWZmZXJQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLmVuZClcbiAgICBuZXcgUmFuZ2Uoc3RhcnQsIGVuZClcblxuICAjIEV4dGVuZGVkOiBDbGlwIHRoZSBnaXZlbiB7UG9pbnR9IHRvIGEgdmFsaWQgcG9zaXRpb24gaW4gdGhlIGJ1ZmZlci5cbiAgI1xuICAjIElmIHRoZSBnaXZlbiB7UG9pbnR9IGRlc2NyaWJlcyBhIHBvc2l0aW9uIHRoYXQgaXMgYWN0dWFsbHkgcmVhY2hhYmxlIGJ5IHRoZVxuICAjIGN1cnNvciBiYXNlZCBvbiB0aGUgY3VycmVudCBjb250ZW50cyBvZiB0aGUgYnVmZmVyLCBpdCBpcyByZXR1cm5lZFxuICAjIHVuY2hhbmdlZC4gSWYgdGhlIHtQb2ludH0gZG9lcyBub3QgZGVzY3JpYmUgYSB2YWxpZCBwb3NpdGlvbiwgdGhlIGNsb3Nlc3RcbiAgIyB2YWxpZCBwb3NpdGlvbiBpcyByZXR1cm5lZCBpbnN0ZWFkLlxuICAjXG4gICMgIyMgRXhhbXBsZXNcbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIGVkaXRvci5jbGlwQnVmZmVyUG9zaXRpb24oWy0xLCAtMV0pICMgLT4gYFswLCAwXWBcbiAgI1xuICAjICMgV2hlbiB0aGUgbGluZSBhdCBidWZmZXIgcm93IDIgaXMgMTAgY2hhcmFjdGVycyBsb25nXG4gICMgZWRpdG9yLmNsaXBCdWZmZXJQb3NpdGlvbihbMiwgSW5maW5pdHldKSAjIC0+IGBbMiwgMTBdYFxuICAjIGBgYFxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIFRoZSB7UG9pbnR9IHJlcHJlc2VudGluZyB0aGUgcG9zaXRpb24gdG8gY2xpcC5cbiAgI1xuICAjIFJldHVybnMgYSB7UG9pbnR9LlxuICBjbGlwQnVmZmVyUG9zaXRpb246IChidWZmZXJQb3NpdGlvbikgLT4gQGJ1ZmZlci5jbGlwUG9zaXRpb24oYnVmZmVyUG9zaXRpb24pXG5cbiAgIyBFeHRlbmRlZDogQ2xpcCB0aGUgc3RhcnQgYW5kIGVuZCBvZiB0aGUgZ2l2ZW4gcmFuZ2UgdG8gdmFsaWQgcG9zaXRpb25zIGluIHRoZVxuICAjIGJ1ZmZlci4gU2VlIHs6OmNsaXBCdWZmZXJQb3NpdGlvbn0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICNcbiAgIyAqIGByYW5nZWAgVGhlIHtSYW5nZX0gdG8gY2xpcC5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBjbGlwQnVmZmVyUmFuZ2U6IChyYW5nZSkgLT4gQGJ1ZmZlci5jbGlwUmFuZ2UocmFuZ2UpXG5cbiAgIyBFeHRlbmRlZDogQ2xpcCB0aGUgZ2l2ZW4ge1BvaW50fSB0byBhIHZhbGlkIHBvc2l0aW9uIG9uIHNjcmVlbi5cbiAgI1xuICAjIElmIHRoZSBnaXZlbiB7UG9pbnR9IGRlc2NyaWJlcyBhIHBvc2l0aW9uIHRoYXQgaXMgYWN0dWFsbHkgcmVhY2hhYmxlIGJ5IHRoZVxuICAjIGN1cnNvciBiYXNlZCBvbiB0aGUgY3VycmVudCBjb250ZW50cyBvZiB0aGUgc2NyZWVuLCBpdCBpcyByZXR1cm5lZFxuICAjIHVuY2hhbmdlZC4gSWYgdGhlIHtQb2ludH0gZG9lcyBub3QgZGVzY3JpYmUgYSB2YWxpZCBwb3NpdGlvbiwgdGhlIGNsb3Nlc3RcbiAgIyB2YWxpZCBwb3NpdGlvbiBpcyByZXR1cm5lZCBpbnN0ZWFkLlxuICAjXG4gICMgIyMgRXhhbXBsZXNcbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIGVkaXRvci5jbGlwU2NyZWVuUG9zaXRpb24oWy0xLCAtMV0pICMgLT4gYFswLCAwXWBcbiAgI1xuICAjICMgV2hlbiB0aGUgbGluZSBhdCBzY3JlZW4gcm93IDIgaXMgMTAgY2hhcmFjdGVycyBsb25nXG4gICMgZWRpdG9yLmNsaXBTY3JlZW5Qb3NpdGlvbihbMiwgSW5maW5pdHldKSAjIC0+IGBbMiwgMTBdYFxuICAjIGBgYFxuICAjXG4gICMgKiBgc2NyZWVuUG9zaXRpb25gIFRoZSB7UG9pbnR9IHJlcHJlc2VudGluZyB0aGUgcG9zaXRpb24gdG8gY2xpcC5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBjbGlwRGlyZWN0aW9uYCB7U3RyaW5nfSBJZiBgJ2JhY2t3YXJkJ2AsIHJldHVybnMgdGhlIGZpcnN0IHZhbGlkXG4gICMgICAgIHBvc2l0aW9uIHByZWNlZGluZyBhbiBpbnZhbGlkIHBvc2l0aW9uLiBJZiBgJ2ZvcndhcmQnYCwgcmV0dXJucyB0aGVcbiAgIyAgICAgZmlyc3QgdmFsaWQgcG9zaXRpb24gZm9sbG93aW5nIGFuIGludmFsaWQgcG9zaXRpb24uIElmIGAnY2xvc2VzdCdgLFxuICAjICAgICByZXR1cm5zIHRoZSBmaXJzdCB2YWxpZCBwb3NpdGlvbiBjbG9zZXN0IHRvIGFuIGludmFsaWQgcG9zaXRpb24uXG4gICMgICAgIERlZmF1bHRzIHRvIGAnY2xvc2VzdCdgLlxuICAjXG4gICMgUmV0dXJucyBhIHtQb2ludH0uXG4gIGNsaXBTY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIGlmIG9wdGlvbnM/LmNsaXA/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgY2xpcGAgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbmAgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBvcHRpb25zLmNsaXBcbiAgICBpZiBvcHRpb25zPy53cmFwQXRTb2Z0TmV3bGluZXM/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgd3JhcEF0U29mdE5ld2xpbmVzYCBwYXJhbWV0ZXIgaGFzIGJlZW4gZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIHNvb24uIFBsZWFzZSwgdXNlIGBjbGlwRGlyZWN0aW9uOiAnZm9yd2FyZCdgIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gaWYgb3B0aW9ucy53cmFwQXRTb2Z0TmV3bGluZXMgdGhlbiAnZm9yd2FyZCcgZWxzZSAnYmFja3dhcmQnXG4gICAgaWYgb3B0aW9ucz8ud3JhcEJleW9uZE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBCZXlvbmROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEJleW9uZE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuXG4gICAgQGRpc3BsYXlMYXllci5jbGlwU2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24sIG9wdGlvbnMpXG5cbiAgIyBFeHRlbmRlZDogQ2xpcCB0aGUgc3RhcnQgYW5kIGVuZCBvZiB0aGUgZ2l2ZW4gcmFuZ2UgdG8gdmFsaWQgcG9zaXRpb25zIG9uIHNjcmVlbi5cbiAgIyBTZWUgezo6Y2xpcFNjcmVlblBvc2l0aW9ufSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgI1xuICAjICogYHJhbmdlYCBUaGUge1JhbmdlfSB0byBjbGlwLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgU2VlIHs6OmNsaXBTY3JlZW5Qb3NpdGlvbn0gYG9wdGlvbnNgLlxuICAjXG4gICMgUmV0dXJucyBhIHtSYW5nZX0uXG4gIGNsaXBTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlLCBvcHRpb25zKSAtPlxuICAgIHNjcmVlblJhbmdlID0gUmFuZ2UuZnJvbU9iamVjdChzY3JlZW5SYW5nZSlcbiAgICBzdGFydCA9IEBkaXNwbGF5TGF5ZXIuY2xpcFNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLnN0YXJ0LCBvcHRpb25zKVxuICAgIGVuZCA9IEBkaXNwbGF5TGF5ZXIuY2xpcFNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLmVuZCwgb3B0aW9ucylcbiAgICBSYW5nZShzdGFydCwgZW5kKVxuXG4gICMjI1xuICBTZWN0aW9uOiBEZWNvcmF0aW9uc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogQWRkIGEgZGVjb3JhdGlvbiB0aGF0IHRyYWNrcyBhIHtEaXNwbGF5TWFya2VyfS4gV2hlbiB0aGVcbiAgIyBtYXJrZXIgbW92ZXMsIGlzIGludmFsaWRhdGVkLCBvciBpcyBkZXN0cm95ZWQsIHRoZSBkZWNvcmF0aW9uIHdpbGwgYmVcbiAgIyB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIG1hcmtlcidzIHN0YXRlLlxuICAjXG4gICMgVGhlIGZvbGxvd2luZyBhcmUgdGhlIHN1cHBvcnRlZCBkZWNvcmF0aW9ucyB0eXBlczpcbiAgI1xuICAjICogX19saW5lX186IEFkZHMgeW91ciBDU1MgYGNsYXNzYCB0byB0aGUgbGluZSBub2RlcyB3aXRoaW4gdGhlIHJhbmdlXG4gICMgICAgIG1hcmtlZCBieSB0aGUgbWFya2VyXG4gICMgKiBfX2xpbmUtbnVtYmVyX186IEFkZHMgeW91ciBDU1MgYGNsYXNzYCB0byB0aGUgbGluZSBudW1iZXIgbm9kZXMgd2l0aGluIHRoZVxuICAjICAgICByYW5nZSBtYXJrZWQgYnkgdGhlIG1hcmtlclxuICAjICogX19oaWdobGlnaHRfXzogQWRkcyBhIG5ldyBoaWdobGlnaHQgZGl2IHRvIHRoZSBlZGl0b3Igc3Vycm91bmRpbmcgdGhlXG4gICMgICAgIHJhbmdlIG1hcmtlZCBieSB0aGUgbWFya2VyLiBXaGVuIHRoZSB1c2VyIHNlbGVjdHMgdGV4dCwgdGhlIHNlbGVjdGlvbiBpc1xuICAjICAgICB2aXN1YWxpemVkIHdpdGggYSBoaWdobGlnaHQgZGVjb3JhdGlvbiBpbnRlcm5hbGx5LiBUaGUgc3RydWN0dXJlIG9mIHRoaXNcbiAgIyAgICAgaGlnaGxpZ2h0IHdpbGwgYmVcbiAgIyAgICAgYGBgaHRtbFxuICAjICAgICA8ZGl2IGNsYXNzPVwiaGlnaGxpZ2h0IDx5b3VyLWNsYXNzPlwiPlxuICAjICAgICAgIDwhLS0gV2lsbCBiZSBvbmUgcmVnaW9uIGZvciBlYWNoIHJvdyBpbiB0aGUgcmFuZ2UuIFNwYW5zIDIgbGluZXM/IFRoZXJlIHdpbGwgYmUgMiByZWdpb25zLiAtLT5cbiAgIyAgICAgICA8ZGl2IGNsYXNzPVwicmVnaW9uXCI+PC9kaXY+XG4gICMgICAgIDwvZGl2PlxuICAjICAgICBgYGBcbiAgIyAqIF9fb3ZlcmxheV9fOiBQb3NpdGlvbnMgdGhlIHZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBpdGVtIGF0IHRoZSBoZWFkXG4gICMgICAgIG9yIHRhaWwgb2YgdGhlIGdpdmVuIGBEaXNwbGF5TWFya2VyYC5cbiAgIyAqIF9fZ3V0dGVyX186IEEgZGVjb3JhdGlvbiB0aGF0IHRyYWNrcyBhIHtEaXNwbGF5TWFya2VyfSBpbiBhIHtHdXR0ZXJ9LiBHdXR0ZXJcbiAgIyAgICAgZGVjb3JhdGlvbnMgYXJlIGNyZWF0ZWQgYnkgY2FsbGluZyB7R3V0dGVyOjpkZWNvcmF0ZU1hcmtlcn0gb24gdGhlXG4gICMgICAgIGRlc2lyZWQgYEd1dHRlcmAgaW5zdGFuY2UuXG4gICMgKiBfX2Jsb2NrX186IFBvc2l0aW9ucyB0aGUgdmlldyBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGl0ZW0gYmVmb3JlIG9yXG4gICMgICAgIGFmdGVyIHRoZSByb3cgb2YgdGhlIGdpdmVuIGBUZXh0RWRpdG9yTWFya2VyYC5cbiAgI1xuICAjICMjIEFyZ3VtZW50c1xuICAjXG4gICMgKiBgbWFya2VyYCBBIHtEaXNwbGF5TWFya2VyfSB5b3Ugd2FudCB0aGlzIGRlY29yYXRpb24gdG8gZm9sbG93LlxuICAjICogYGRlY29yYXRpb25QYXJhbXNgIEFuIHtPYmplY3R9IHJlcHJlc2VudGluZyB0aGUgZGVjb3JhdGlvbiBlLmcuXG4gICMgICBge3R5cGU6ICdsaW5lLW51bWJlcicsIGNsYXNzOiAnbGludGVyLWVycm9yJ31gXG4gICMgICAqIGB0eXBlYCBUaGVyZSBhcmUgc2V2ZXJhbCBzdXBwb3J0ZWQgZGVjb3JhdGlvbiB0eXBlcy4gVGhlIGJlaGF2aW9yIG9mIHRoZVxuICAjICAgICB0eXBlcyBhcmUgYXMgZm9sbG93czpcbiAgIyAgICAgKiBgbGluZWAgQWRkcyB0aGUgZ2l2ZW4gYGNsYXNzYCB0byB0aGUgbGluZXMgb3ZlcmxhcHBpbmcgdGhlIHJvd3NcbiAgIyAgICAgICAgc3Bhbm5lZCBieSB0aGUgYERpc3BsYXlNYXJrZXJgLlxuICAjICAgICAqIGBsaW5lLW51bWJlcmAgQWRkcyB0aGUgZ2l2ZW4gYGNsYXNzYCB0byB0aGUgbGluZSBudW1iZXJzIG92ZXJsYXBwaW5nXG4gICMgICAgICAgdGhlIHJvd3Mgc3Bhbm5lZCBieSB0aGUgYERpc3BsYXlNYXJrZXJgLlxuICAjICAgICAqIGBoaWdobGlnaHRgIENyZWF0ZXMgYSBgLmhpZ2hsaWdodGAgZGl2IHdpdGggdGhlIG5lc3RlZCBjbGFzcyB3aXRoIHVwXG4gICMgICAgICAgdG8gMyBuZXN0ZWQgcmVnaW9ucyB0aGF0IGZpbGwgdGhlIGFyZWEgc3Bhbm5lZCBieSB0aGUgYERpc3BsYXlNYXJrZXJgLlxuICAjICAgICAqIGBvdmVybGF5YCBQb3NpdGlvbnMgdGhlIHZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBpdGVtIGF0IHRoZVxuICAjICAgICAgIGhlYWQgb3IgdGFpbCBvZiB0aGUgZ2l2ZW4gYERpc3BsYXlNYXJrZXJgLCBkZXBlbmRpbmcgb24gdGhlIGBwb3NpdGlvbmBcbiAgIyAgICAgICBwcm9wZXJ0eS5cbiAgIyAgICAgKiBgZ3V0dGVyYCBUcmFja3MgYSB7RGlzcGxheU1hcmtlcn0gaW4gYSB7R3V0dGVyfS4gQ3JlYXRlZCBieSBjYWxsaW5nXG4gICMgICAgICAge0d1dHRlcjo6ZGVjb3JhdGVNYXJrZXJ9IG9uIHRoZSBkZXNpcmVkIGBHdXR0ZXJgIGluc3RhbmNlLlxuICAjICAgICAqIGBibG9ja2AgUG9zaXRpb25zIHRoZSB2aWV3IGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gaXRlbSBiZWZvcmUgb3JcbiAgIyAgICAgICBhZnRlciB0aGUgcm93IG9mIHRoZSBnaXZlbiBgVGV4dEVkaXRvck1hcmtlcmAsIGRlcGVuZGluZyBvbiB0aGUgYHBvc2l0aW9uYFxuICAjICAgICAgIHByb3BlcnR5LlxuICAjICAgICAqIGBjdXJzb3JgIFJlbmRlcnMgYSBjdXJzb3IgYXQgdGhlIGhlYWQgb2YgdGhlIGdpdmVuIG1hcmtlci4gSWYgbXVsdGlwbGVcbiAgIyAgICAgICBkZWNvcmF0aW9ucyBhcmUgY3JlYXRlZCBmb3IgdGhlIHNhbWUgbWFya2VyLCB0aGVpciBjbGFzcyBzdHJpbmdzIGFuZFxuICAjICAgICAgIHN0eWxlIG9iamVjdHMgYXJlIGNvbWJpbmVkIGludG8gYSBzaW5nbGUgY3Vyc29yLiBZb3UgY2FuIHVzZSB0aGlzXG4gICMgICAgICAgZGVjb3JhdGlvbiB0eXBlIHRvIHN0eWxlIGV4aXN0aW5nIGN1cnNvcnMgYnkgcGFzc2luZyBpbiB0aGVpciBtYXJrZXJzXG4gICMgICAgICAgb3IgcmVuZGVyIGFydGlmaWNpYWwgY3Vyc29ycyB0aGF0IGRvbid0IGFjdHVhbGx5IGV4aXN0IGluIHRoZSBtb2RlbFxuICAjICAgICAgIGJ5IHBhc3NpbmcgYSBtYXJrZXIgdGhhdCBpc24ndCBhY3R1YWxseSBhc3NvY2lhdGVkIHdpdGggYSBjdXJzb3IuXG4gICMgICAqIGBjbGFzc2AgVGhpcyBDU1MgY2xhc3Mgd2lsbCBiZSBhcHBsaWVkIHRvIHRoZSBkZWNvcmF0ZWQgbGluZSBudW1iZXIsXG4gICMgICAgIGxpbmUsIGhpZ2hsaWdodCwgb3Igb3ZlcmxheS5cbiAgIyAgICogYHN0eWxlYCBBbiB7T2JqZWN0fSBjb250YWluaW5nIENTUyBzdHlsZSBwcm9wZXJ0aWVzIHRvIGFwcGx5IHRvIHRoZVxuICAjICAgICByZWxldmFudCBET00gbm9kZS4gQ3VycmVudGx5IHRoaXMgb25seSB3b3JrcyB3aXRoIGEgYHR5cGVgIG9mIGBjdXJzb3JgLlxuICAjICAgKiBgaXRlbWAgKG9wdGlvbmFsKSBBbiB7SFRNTEVsZW1lbnR9IG9yIGEgbW9kZWwge09iamVjdH0gd2l0aCBhXG4gICMgICAgIGNvcnJlc3BvbmRpbmcgdmlldyByZWdpc3RlcmVkLiBPbmx5IGFwcGxpY2FibGUgdG8gdGhlIGBndXR0ZXJgLFxuICAjICAgICBgb3ZlcmxheWAgYW5kIGBibG9ja2AgZGVjb3JhdGlvbiB0eXBlcy5cbiAgIyAgICogYG9ubHlIZWFkYCAob3B0aW9uYWwpIElmIGB0cnVlYCwgdGhlIGRlY29yYXRpb24gd2lsbCBvbmx5IGJlIGFwcGxpZWQgdG9cbiAgIyAgICAgdGhlIGhlYWQgb2YgdGhlIGBEaXNwbGF5TWFya2VyYC4gT25seSBhcHBsaWNhYmxlIHRvIHRoZSBgbGluZWAgYW5kXG4gICMgICAgIGBsaW5lLW51bWJlcmAgZGVjb3JhdGlvbiB0eXBlcy5cbiAgIyAgICogYG9ubHlFbXB0eWAgKG9wdGlvbmFsKSBJZiBgdHJ1ZWAsIHRoZSBkZWNvcmF0aW9uIHdpbGwgb25seSBiZSBhcHBsaWVkIGlmXG4gICMgICAgIHRoZSBhc3NvY2lhdGVkIGBEaXNwbGF5TWFya2VyYCBpcyBlbXB0eS4gT25seSBhcHBsaWNhYmxlIHRvIHRoZSBgZ3V0dGVyYCxcbiAgIyAgICAgYGxpbmVgLCBhbmQgYGxpbmUtbnVtYmVyYCBkZWNvcmF0aW9uIHR5cGVzLlxuICAjICAgKiBgb25seU5vbkVtcHR5YCAob3B0aW9uYWwpIElmIGB0cnVlYCwgdGhlIGRlY29yYXRpb24gd2lsbCBvbmx5IGJlIGFwcGxpZWRcbiAgIyAgICAgaWYgdGhlIGFzc29jaWF0ZWQgYERpc3BsYXlNYXJrZXJgIGlzIG5vbi1lbXB0eS4gT25seSBhcHBsaWNhYmxlIHRvIHRoZVxuICAjICAgICBgZ3V0dGVyYCwgYGxpbmVgLCBhbmQgYGxpbmUtbnVtYmVyYCBkZWNvcmF0aW9uIHR5cGVzLlxuICAjICAgKiBgb21pdEVtcHR5TGFzdFJvd2AgKG9wdGlvbmFsKSBJZiBgZmFsc2VgLCB0aGUgZGVjb3JhdGlvbiB3aWxsIGJlIGFwcGxpZWRcbiAgIyAgICAgdG8gdGhlIGxhc3Qgcm93IG9mIGEgbm9uLWVtcHR5IHJhbmdlLCBldmVuIGlmIGl0IGVuZHMgYXQgY29sdW1uIDAuXG4gICMgICAgIERlZmF1bHRzIHRvIGB0cnVlYC4gT25seSBhcHBsaWNhYmxlIHRvIHRoZSBgZ3V0dGVyYCwgYGxpbmVgLCBhbmRcbiAgIyAgICAgYGxpbmUtbnVtYmVyYCBkZWNvcmF0aW9uIHR5cGVzLlxuICAjICAgKiBgcG9zaXRpb25gIChvcHRpb25hbCkgT25seSBhcHBsaWNhYmxlIHRvIGRlY29yYXRpb25zIG9mIHR5cGUgYG92ZXJsYXlgIGFuZCBgYmxvY2tgLlxuICAjICAgICBDb250cm9scyB3aGVyZSB0aGUgdmlldyBpcyBwb3NpdGlvbmVkIHJlbGF0aXZlIHRvIHRoZSBgVGV4dEVkaXRvck1hcmtlcmAuXG4gICMgICAgIFZhbHVlcyBjYW4gYmUgYCdoZWFkJ2AgKHRoZSBkZWZhdWx0KSBvciBgJ3RhaWwnYCBmb3Igb3ZlcmxheSBkZWNvcmF0aW9ucywgYW5kXG4gICMgICAgIGAnYmVmb3JlJ2AgKHRoZSBkZWZhdWx0KSBvciBgJ2FmdGVyJ2AgZm9yIGJsb2NrIGRlY29yYXRpb25zLlxuICAjICAgKiBgYXZvaWRPdmVyZmxvd2AgKG9wdGlvbmFsKSBPbmx5IGFwcGxpY2FibGUgdG8gZGVjb3JhdGlvbnMgb2YgdHlwZVxuICAjICAgICAgYG92ZXJsYXlgLiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGRlY29yYXRpb24gYWRqdXN0cyBpdHMgaG9yaXpvbnRhbCBvclxuICAjICAgICAgdmVydGljYWwgcG9zaXRpb24gdG8gcmVtYWluIGZ1bGx5IHZpc2libGUgd2hlbiBpdCB3b3VsZCBvdGhlcndpc2VcbiAgIyAgICAgIG92ZXJmbG93IHRoZSBlZGl0b3IuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGVjb3JhdGlvbn0gb2JqZWN0XG4gIGRlY29yYXRlTWFya2VyOiAobWFya2VyLCBkZWNvcmF0aW9uUGFyYW1zKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5kZWNvcmF0ZU1hcmtlcihtYXJrZXIsIGRlY29yYXRpb25QYXJhbXMpXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIGRlY29yYXRpb24gdG8gZXZlcnkgbWFya2VyIGluIHRoZSBnaXZlbiBtYXJrZXIgbGF5ZXIuIENhblxuICAjIGJlIHVzZWQgdG8gZGVjb3JhdGUgYSBsYXJnZSBudW1iZXIgb2YgbWFya2VycyB3aXRob3V0IGhhdmluZyB0byBjcmVhdGUgYW5kXG4gICMgbWFuYWdlIG1hbnkgaW5kaXZpZHVhbCBkZWNvcmF0aW9ucy5cbiAgI1xuICAjICogYG1hcmtlckxheWVyYCBBIHtEaXNwbGF5TWFya2VyTGF5ZXJ9IG9yIHtNYXJrZXJMYXllcn0gdG8gZGVjb3JhdGUuXG4gICMgKiBgZGVjb3JhdGlvblBhcmFtc2AgVGhlIHNhbWUgcGFyYW1ldGVycyB0aGF0IGFyZSBwYXNzZWQgdG9cbiAgIyAgIHtUZXh0RWRpdG9yOjpkZWNvcmF0ZU1hcmtlcn0sIGV4Y2VwdCB0aGUgYHR5cGVgIGNhbm5vdCBiZSBgb3ZlcmxheWAgb3IgYGd1dHRlcmAuXG4gICNcbiAgIyBSZXR1cm5zIGEge0xheWVyRGVjb3JhdGlvbn0uXG4gIGRlY29yYXRlTWFya2VyTGF5ZXI6IChtYXJrZXJMYXllciwgZGVjb3JhdGlvblBhcmFtcykgLT5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZGVjb3JhdGVNYXJrZXJMYXllcihtYXJrZXJMYXllciwgZGVjb3JhdGlvblBhcmFtcylcblxuICAjIERlcHJlY2F0ZWQ6IEdldCBhbGwgdGhlIGRlY29yYXRpb25zIHdpdGhpbiBhIHNjcmVlbiByb3cgcmFuZ2Ugb24gdGhlIGRlZmF1bHRcbiAgIyBsYXllci5cbiAgI1xuICAjICogYHN0YXJ0U2NyZWVuUm93YCB0aGUge051bWJlcn0gYmVnaW5uaW5nIHNjcmVlbiByb3dcbiAgIyAqIGBlbmRTY3JlZW5Sb3dgIHRoZSB7TnVtYmVyfSBlbmQgc2NyZWVuIHJvdyAoaW5jbHVzaXZlKVxuICAjXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSBvZiBkZWNvcmF0aW9ucyBpbiB0aGUgZm9ybVxuICAjICBgezE6IFt7aWQ6IDEwLCB0eXBlOiAnbGluZS1udW1iZXInLCBjbGFzczogJ3NvbWVjbGFzcyd9XSwgMjogLi4ufWBcbiAgIyAgIHdoZXJlIHRoZSBrZXlzIGFyZSB7RGlzcGxheU1hcmtlcn0gSURzLCBhbmQgdGhlIHZhbHVlcyBhcmUgYW4gYXJyYXkgb2YgZGVjb3JhdGlvblxuICAjICAgcGFyYW1zIG9iamVjdHMgYXR0YWNoZWQgdG8gdGhlIG1hcmtlci5cbiAgIyBSZXR1cm5zIGFuIGVtcHR5IG9iamVjdCB3aGVuIG5vIGRlY29yYXRpb25zIGFyZSBmb3VuZFxuICBkZWNvcmF0aW9uc0ZvclNjcmVlblJvd1JhbmdlOiAoc3RhcnRTY3JlZW5Sb3csIGVuZFNjcmVlblJvdykgLT5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZGVjb3JhdGlvbnNGb3JTY3JlZW5Sb3dSYW5nZShzdGFydFNjcmVlblJvdywgZW5kU2NyZWVuUm93KVxuXG4gIGRlY29yYXRpb25zU3RhdGVGb3JTY3JlZW5Sb3dSYW5nZTogKHN0YXJ0U2NyZWVuUm93LCBlbmRTY3JlZW5Sb3cpIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLmRlY29yYXRpb25zU3RhdGVGb3JTY3JlZW5Sb3dSYW5nZShzdGFydFNjcmVlblJvdywgZW5kU2NyZWVuUm93KVxuXG4gICMgRXh0ZW5kZWQ6IEdldCBhbGwgZGVjb3JhdGlvbnMuXG4gICNcbiAgIyAqIGBwcm9wZXJ0eUZpbHRlcmAgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSBjb250YWluaW5nIGtleSB2YWx1ZSBwYWlycyB0aGF0XG4gICMgICB0aGUgcmV0dXJuZWQgZGVjb3JhdGlvbnMnIHByb3BlcnRpZXMgbXVzdCBtYXRjaC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7RGVjb3JhdGlvbn1zLlxuICBnZXREZWNvcmF0aW9uczogKHByb3BlcnR5RmlsdGVyKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5nZXREZWNvcmF0aW9ucyhwcm9wZXJ0eUZpbHRlcilcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIGRlY29yYXRpb25zIG9mIHR5cGUgJ2xpbmUnLlxuICAjXG4gICMgKiBgcHJvcGVydHlGaWx0ZXJgIChvcHRpb25hbCkgQW4ge09iamVjdH0gY29udGFpbmluZyBrZXkgdmFsdWUgcGFpcnMgdGhhdFxuICAjICAgdGhlIHJldHVybmVkIGRlY29yYXRpb25zJyBwcm9wZXJ0aWVzIG11c3QgbWF0Y2guXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge0RlY29yYXRpb259cy5cbiAgZ2V0TGluZURlY29yYXRpb25zOiAocHJvcGVydHlGaWx0ZXIpIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLmdldExpbmVEZWNvcmF0aW9ucyhwcm9wZXJ0eUZpbHRlcilcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIGRlY29yYXRpb25zIG9mIHR5cGUgJ2xpbmUtbnVtYmVyJy5cbiAgI1xuICAjICogYHByb3BlcnR5RmlsdGVyYCAob3B0aW9uYWwpIEFuIHtPYmplY3R9IGNvbnRhaW5pbmcga2V5IHZhbHVlIHBhaXJzIHRoYXRcbiAgIyAgIHRoZSByZXR1cm5lZCBkZWNvcmF0aW9ucycgcHJvcGVydGllcyBtdXN0IG1hdGNoLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtEZWNvcmF0aW9ufXMuXG4gIGdldExpbmVOdW1iZXJEZWNvcmF0aW9uczogKHByb3BlcnR5RmlsdGVyKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5nZXRMaW5lTnVtYmVyRGVjb3JhdGlvbnMocHJvcGVydHlGaWx0ZXIpXG5cbiAgIyBFeHRlbmRlZDogR2V0IGFsbCBkZWNvcmF0aW9ucyBvZiB0eXBlICdoaWdobGlnaHQnLlxuICAjXG4gICMgKiBgcHJvcGVydHlGaWx0ZXJgIChvcHRpb25hbCkgQW4ge09iamVjdH0gY29udGFpbmluZyBrZXkgdmFsdWUgcGFpcnMgdGhhdFxuICAjICAgdGhlIHJldHVybmVkIGRlY29yYXRpb25zJyBwcm9wZXJ0aWVzIG11c3QgbWF0Y2guXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge0RlY29yYXRpb259cy5cbiAgZ2V0SGlnaGxpZ2h0RGVjb3JhdGlvbnM6IChwcm9wZXJ0eUZpbHRlcikgLT5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZ2V0SGlnaGxpZ2h0RGVjb3JhdGlvbnMocHJvcGVydHlGaWx0ZXIpXG5cbiAgIyBFeHRlbmRlZDogR2V0IGFsbCBkZWNvcmF0aW9ucyBvZiB0eXBlICdvdmVybGF5Jy5cbiAgI1xuICAjICogYHByb3BlcnR5RmlsdGVyYCAob3B0aW9uYWwpIEFuIHtPYmplY3R9IGNvbnRhaW5pbmcga2V5IHZhbHVlIHBhaXJzIHRoYXRcbiAgIyAgIHRoZSByZXR1cm5lZCBkZWNvcmF0aW9ucycgcHJvcGVydGllcyBtdXN0IG1hdGNoLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtEZWNvcmF0aW9ufXMuXG4gIGdldE92ZXJsYXlEZWNvcmF0aW9uczogKHByb3BlcnR5RmlsdGVyKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5nZXRPdmVybGF5RGVjb3JhdGlvbnMocHJvcGVydHlGaWx0ZXIpXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1hcmtlcnNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IENyZWF0ZSBhIG1hcmtlciBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgd2l0aCB0aGUgZ2l2ZW4gcmFuZ2VcbiAgIyBpbiBidWZmZXIgY29vcmRpbmF0ZXMuIFRoaXMgbWFya2VyIHdpbGwgbWFpbnRhaW4gaXRzIGxvZ2ljYWwgbG9jYXRpb24gYXMgdGhlXG4gICMgYnVmZmVyIGlzIGNoYW5nZWQsIHNvIGlmIHlvdSBtYXJrIGEgcGFydGljdWxhciB3b3JkLCB0aGUgbWFya2VyIHdpbGwgcmVtYWluXG4gICMgb3ZlciB0aGF0IHdvcmQgZXZlbiBpZiB0aGUgd29yZCdzIGxvY2F0aW9uIGluIHRoZSBidWZmZXIgY2hhbmdlcy5cbiAgI1xuICAjICogYHJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9XG4gICMgKiBgcHJvcGVydGllc2AgQSBoYXNoIG9mIGtleS12YWx1ZSBwYWlycyB0byBhc3NvY2lhdGUgd2l0aCB0aGUgbWFya2VyLiBUaGVyZVxuICAjICAgYXJlIGFsc28gcmVzZXJ2ZWQgcHJvcGVydHkgbmFtZXMgdGhhdCBoYXZlIG1hcmtlci1zcGVjaWZpYyBtZWFuaW5nLlxuICAjICAgKiBgbWFpbnRhaW5IaXN0b3J5YCAob3B0aW9uYWwpIHtCb29sZWFufSBXaGV0aGVyIHRvIHN0b3JlIHRoaXMgbWFya2VyJ3NcbiAgIyAgICAgcmFuZ2UgYmVmb3JlIGFuZCBhZnRlciBlYWNoIGNoYW5nZSBpbiB0aGUgdW5kbyBoaXN0b3J5LiBUaGlzIGFsbG93cyB0aGVcbiAgIyAgICAgbWFya2VyJ3MgcG9zaXRpb24gdG8gYmUgcmVzdG9yZWQgbW9yZSBhY2N1cmF0ZWx5IGZvciBjZXJ0YWluIHVuZG8vcmVkb1xuICAjICAgICBvcGVyYXRpb25zLCBidXQgdXNlcyBtb3JlIHRpbWUgYW5kIG1lbW9yeS4gKGRlZmF1bHQ6IGZhbHNlKVxuICAjICAgKiBgcmV2ZXJzZWRgIChvcHRpb25hbCkge0Jvb2xlYW59IENyZWF0ZXMgdGhlIG1hcmtlciBpbiBhIHJldmVyc2VkXG4gICMgICAgIG9yaWVudGF0aW9uLiAoZGVmYXVsdDogZmFsc2UpXG4gICMgICAqIGBpbnZhbGlkYXRlYCAob3B0aW9uYWwpIHtTdHJpbmd9IERldGVybWluZXMgdGhlIHJ1bGVzIGJ5IHdoaWNoIGNoYW5nZXNcbiAgIyAgICAgdG8gdGhlIGJ1ZmZlciAqaW52YWxpZGF0ZSogdGhlIG1hcmtlci4gKGRlZmF1bHQ6ICdvdmVybGFwJykgSXQgY2FuIGJlXG4gICMgICAgIGFueSBvZiB0aGUgZm9sbG93aW5nIHN0cmF0ZWdpZXMsIGluIG9yZGVyIG9mIGZyYWdpbGl0eTpcbiAgIyAgICAgKiBfX25ldmVyX186IFRoZSBtYXJrZXIgaXMgbmV2ZXIgbWFya2VkIGFzIGludmFsaWQuIFRoaXMgaXMgYSBnb29kIGNob2ljZSBmb3JcbiAgIyAgICAgICBtYXJrZXJzIHJlcHJlc2VudGluZyBzZWxlY3Rpb25zIGluIGFuIGVkaXRvci5cbiAgIyAgICAgKiBfX3N1cnJvdW5kX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGNvbXBsZXRlbHkgc3Vycm91bmQgaXQuXG4gICMgICAgICogX19vdmVybGFwX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IHN1cnJvdW5kIHRoZVxuICAjICAgICAgIHN0YXJ0IG9yIGVuZCBvZiB0aGUgbWFya2VyLiBUaGlzIGlzIHRoZSBkZWZhdWx0LlxuICAjICAgICAqIF9faW5zaWRlX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGV4dGVuZCBpbnRvIHRoZVxuICAjICAgICAgIGluc2lkZSBvZiB0aGUgbWFya2VyLiBDaGFuZ2VzIHRoYXQgZW5kIGF0IHRoZSBtYXJrZXIncyBzdGFydCBvclxuICAjICAgICAgIHN0YXJ0IGF0IHRoZSBtYXJrZXIncyBlbmQgZG8gbm90IGludmFsaWRhdGUgdGhlIG1hcmtlci5cbiAgIyAgICAgKiBfX3RvdWNoX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgYSBjaGFuZ2UgdGhhdCB0b3VjaGVzIHRoZSBtYXJrZWRcbiAgIyAgICAgICByZWdpb24gaW4gYW55IHdheSwgaW5jbHVkaW5nIGNoYW5nZXMgdGhhdCBlbmQgYXQgdGhlIG1hcmtlcidzXG4gICMgICAgICAgc3RhcnQgb3Igc3RhcnQgYXQgdGhlIG1hcmtlcidzIGVuZC4gVGhpcyBpcyB0aGUgbW9zdCBmcmFnaWxlIHN0cmF0ZWd5LlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwbGF5TWFya2VyfS5cbiAgbWFya0J1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5tYXJrQnVmZmVyUmFuZ2UoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IENyZWF0ZSBhIG1hcmtlciBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgd2l0aCB0aGUgZ2l2ZW4gcmFuZ2VcbiAgIyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMuIFRoaXMgbWFya2VyIHdpbGwgbWFpbnRhaW4gaXRzIGxvZ2ljYWwgbG9jYXRpb24gYXMgdGhlXG4gICMgYnVmZmVyIGlzIGNoYW5nZWQsIHNvIGlmIHlvdSBtYXJrIGEgcGFydGljdWxhciB3b3JkLCB0aGUgbWFya2VyIHdpbGwgcmVtYWluXG4gICMgb3ZlciB0aGF0IHdvcmQgZXZlbiBpZiB0aGUgd29yZCdzIGxvY2F0aW9uIGluIHRoZSBidWZmZXIgY2hhbmdlcy5cbiAgI1xuICAjICogYHJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9XG4gICMgKiBgcHJvcGVydGllc2AgQSBoYXNoIG9mIGtleS12YWx1ZSBwYWlycyB0byBhc3NvY2lhdGUgd2l0aCB0aGUgbWFya2VyLiBUaGVyZVxuICAjICAgYXJlIGFsc28gcmVzZXJ2ZWQgcHJvcGVydHkgbmFtZXMgdGhhdCBoYXZlIG1hcmtlci1zcGVjaWZpYyBtZWFuaW5nLlxuICAjICAgKiBgbWFpbnRhaW5IaXN0b3J5YCAob3B0aW9uYWwpIHtCb29sZWFufSBXaGV0aGVyIHRvIHN0b3JlIHRoaXMgbWFya2VyJ3NcbiAgIyAgICAgcmFuZ2UgYmVmb3JlIGFuZCBhZnRlciBlYWNoIGNoYW5nZSBpbiB0aGUgdW5kbyBoaXN0b3J5LiBUaGlzIGFsbG93cyB0aGVcbiAgIyAgICAgbWFya2VyJ3MgcG9zaXRpb24gdG8gYmUgcmVzdG9yZWQgbW9yZSBhY2N1cmF0ZWx5IGZvciBjZXJ0YWluIHVuZG8vcmVkb1xuICAjICAgICBvcGVyYXRpb25zLCBidXQgdXNlcyBtb3JlIHRpbWUgYW5kIG1lbW9yeS4gKGRlZmF1bHQ6IGZhbHNlKVxuICAjICAgKiBgcmV2ZXJzZWRgIChvcHRpb25hbCkge0Jvb2xlYW59IENyZWF0ZXMgdGhlIG1hcmtlciBpbiBhIHJldmVyc2VkXG4gICMgICAgIG9yaWVudGF0aW9uLiAoZGVmYXVsdDogZmFsc2UpXG4gICMgICAqIGBpbnZhbGlkYXRlYCAob3B0aW9uYWwpIHtTdHJpbmd9IERldGVybWluZXMgdGhlIHJ1bGVzIGJ5IHdoaWNoIGNoYW5nZXNcbiAgIyAgICAgdG8gdGhlIGJ1ZmZlciAqaW52YWxpZGF0ZSogdGhlIG1hcmtlci4gKGRlZmF1bHQ6ICdvdmVybGFwJykgSXQgY2FuIGJlXG4gICMgICAgIGFueSBvZiB0aGUgZm9sbG93aW5nIHN0cmF0ZWdpZXMsIGluIG9yZGVyIG9mIGZyYWdpbGl0eTpcbiAgIyAgICAgKiBfX25ldmVyX186IFRoZSBtYXJrZXIgaXMgbmV2ZXIgbWFya2VkIGFzIGludmFsaWQuIFRoaXMgaXMgYSBnb29kIGNob2ljZSBmb3JcbiAgIyAgICAgICBtYXJrZXJzIHJlcHJlc2VudGluZyBzZWxlY3Rpb25zIGluIGFuIGVkaXRvci5cbiAgIyAgICAgKiBfX3N1cnJvdW5kX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGNvbXBsZXRlbHkgc3Vycm91bmQgaXQuXG4gICMgICAgICogX19vdmVybGFwX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IHN1cnJvdW5kIHRoZVxuICAjICAgICAgIHN0YXJ0IG9yIGVuZCBvZiB0aGUgbWFya2VyLiBUaGlzIGlzIHRoZSBkZWZhdWx0LlxuICAjICAgICAqIF9faW5zaWRlX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGV4dGVuZCBpbnRvIHRoZVxuICAjICAgICAgIGluc2lkZSBvZiB0aGUgbWFya2VyLiBDaGFuZ2VzIHRoYXQgZW5kIGF0IHRoZSBtYXJrZXIncyBzdGFydCBvclxuICAjICAgICAgIHN0YXJ0IGF0IHRoZSBtYXJrZXIncyBlbmQgZG8gbm90IGludmFsaWRhdGUgdGhlIG1hcmtlci5cbiAgIyAgICAgKiBfX3RvdWNoX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgYSBjaGFuZ2UgdGhhdCB0b3VjaGVzIHRoZSBtYXJrZWRcbiAgIyAgICAgICByZWdpb24gaW4gYW55IHdheSwgaW5jbHVkaW5nIGNoYW5nZXMgdGhhdCBlbmQgYXQgdGhlIG1hcmtlcidzXG4gICMgICAgICAgc3RhcnQgb3Igc3RhcnQgYXQgdGhlIG1hcmtlcidzIGVuZC4gVGhpcyBpcyB0aGUgbW9zdCBmcmFnaWxlIHN0cmF0ZWd5LlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwbGF5TWFya2VyfS5cbiAgbWFya1NjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5tYXJrU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IENyZWF0ZSBhIG1hcmtlciBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgd2l0aCB0aGUgZ2l2ZW4gYnVmZmVyXG4gICMgcG9zaXRpb24gYW5kIG5vIHRhaWwuIFRvIGdyb3VwIG11bHRpcGxlIG1hcmtlcnMgdG9nZXRoZXIgaW4gdGhlaXIgb3duXG4gICMgcHJpdmF0ZSBsYXllciwgc2VlIHs6OmFkZE1hcmtlckxheWVyfS5cbiAgI1xuICAjICogYGJ1ZmZlclBvc2l0aW9uYCBBIHtQb2ludH0gb3IgcG9pbnQtY29tcGF0aWJsZSB7QXJyYXl9XG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGludmFsaWRhdGVgIChvcHRpb25hbCkge1N0cmluZ30gRGV0ZXJtaW5lcyB0aGUgcnVsZXMgYnkgd2hpY2ggY2hhbmdlc1xuICAjICAgICB0byB0aGUgYnVmZmVyICppbnZhbGlkYXRlKiB0aGUgbWFya2VyLiAoZGVmYXVsdDogJ292ZXJsYXAnKSBJdCBjYW4gYmVcbiAgIyAgICAgYW55IG9mIHRoZSBmb2xsb3dpbmcgc3RyYXRlZ2llcywgaW4gb3JkZXIgb2YgZnJhZ2lsaXR5OlxuICAjICAgICAqIF9fbmV2ZXJfXzogVGhlIG1hcmtlciBpcyBuZXZlciBtYXJrZWQgYXMgaW52YWxpZC4gVGhpcyBpcyBhIGdvb2QgY2hvaWNlIGZvclxuICAjICAgICAgIG1hcmtlcnMgcmVwcmVzZW50aW5nIHNlbGVjdGlvbnMgaW4gYW4gZWRpdG9yLlxuICAjICAgICAqIF9fc3Vycm91bmRfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBjaGFuZ2VzIHRoYXQgY29tcGxldGVseSBzdXJyb3VuZCBpdC5cbiAgIyAgICAgKiBfX292ZXJsYXBfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBjaGFuZ2VzIHRoYXQgc3Vycm91bmQgdGhlXG4gICMgICAgICAgc3RhcnQgb3IgZW5kIG9mIHRoZSBtYXJrZXIuIFRoaXMgaXMgdGhlIGRlZmF1bHQuXG4gICMgICAgICogX19pbnNpZGVfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBjaGFuZ2VzIHRoYXQgZXh0ZW5kIGludG8gdGhlXG4gICMgICAgICAgaW5zaWRlIG9mIHRoZSBtYXJrZXIuIENoYW5nZXMgdGhhdCBlbmQgYXQgdGhlIG1hcmtlcidzIHN0YXJ0IG9yXG4gICMgICAgICAgc3RhcnQgYXQgdGhlIG1hcmtlcidzIGVuZCBkbyBub3QgaW52YWxpZGF0ZSB0aGUgbWFya2VyLlxuICAjICAgICAqIF9fdG91Y2hfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBhIGNoYW5nZSB0aGF0IHRvdWNoZXMgdGhlIG1hcmtlZFxuICAjICAgICAgIHJlZ2lvbiBpbiBhbnkgd2F5LCBpbmNsdWRpbmcgY2hhbmdlcyB0aGF0IGVuZCBhdCB0aGUgbWFya2VyJ3NcbiAgIyAgICAgICBzdGFydCBvciBzdGFydCBhdCB0aGUgbWFya2VyJ3MgZW5kLiBUaGlzIGlzIHRoZSBtb3N0IGZyYWdpbGUgc3RyYXRlZ3kuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJ9LlxuICBtYXJrQnVmZmVyUG9zaXRpb246IChidWZmZXJQb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBAZGVmYXVsdE1hcmtlckxheWVyLm1hcmtCdWZmZXJQb3NpdGlvbihidWZmZXJQb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogQ3JlYXRlIGEgbWFya2VyIG9uIHRoZSBkZWZhdWx0IG1hcmtlciBsYXllciB3aXRoIHRoZSBnaXZlbiBzY3JlZW5cbiAgIyBwb3NpdGlvbiBhbmQgbm8gdGFpbC4gVG8gZ3JvdXAgbXVsdGlwbGUgbWFya2VycyB0b2dldGhlciBpbiB0aGVpciBvd25cbiAgIyBwcml2YXRlIGxheWVyLCBzZWUgezo6YWRkTWFya2VyTGF5ZXJ9LlxuICAjXG4gICMgKiBgc2NyZWVuUG9zaXRpb25gIEEge1BvaW50fSBvciBwb2ludC1jb21wYXRpYmxlIHtBcnJheX1cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIEFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgaW52YWxpZGF0ZWAgKG9wdGlvbmFsKSB7U3RyaW5nfSBEZXRlcm1pbmVzIHRoZSBydWxlcyBieSB3aGljaCBjaGFuZ2VzXG4gICMgICAgIHRvIHRoZSBidWZmZXIgKmludmFsaWRhdGUqIHRoZSBtYXJrZXIuIChkZWZhdWx0OiAnb3ZlcmxhcCcpIEl0IGNhbiBiZVxuICAjICAgICBhbnkgb2YgdGhlIGZvbGxvd2luZyBzdHJhdGVnaWVzLCBpbiBvcmRlciBvZiBmcmFnaWxpdHk6XG4gICMgICAgICogX19uZXZlcl9fOiBUaGUgbWFya2VyIGlzIG5ldmVyIG1hcmtlZCBhcyBpbnZhbGlkLiBUaGlzIGlzIGEgZ29vZCBjaG9pY2UgZm9yXG4gICMgICAgICAgbWFya2VycyByZXByZXNlbnRpbmcgc2VsZWN0aW9ucyBpbiBhbiBlZGl0b3IuXG4gICMgICAgICogX19zdXJyb3VuZF9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGNoYW5nZXMgdGhhdCBjb21wbGV0ZWx5IHN1cnJvdW5kIGl0LlxuICAjICAgICAqIF9fb3ZlcmxhcF9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGNoYW5nZXMgdGhhdCBzdXJyb3VuZCB0aGVcbiAgIyAgICAgICBzdGFydCBvciBlbmQgb2YgdGhlIG1hcmtlci4gVGhpcyBpcyB0aGUgZGVmYXVsdC5cbiAgIyAgICAgKiBfX2luc2lkZV9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGNoYW5nZXMgdGhhdCBleHRlbmQgaW50byB0aGVcbiAgIyAgICAgICBpbnNpZGUgb2YgdGhlIG1hcmtlci4gQ2hhbmdlcyB0aGF0IGVuZCBhdCB0aGUgbWFya2VyJ3Mgc3RhcnQgb3JcbiAgIyAgICAgICBzdGFydCBhdCB0aGUgbWFya2VyJ3MgZW5kIGRvIG5vdCBpbnZhbGlkYXRlIHRoZSBtYXJrZXIuXG4gICMgICAgICogX190b3VjaF9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGEgY2hhbmdlIHRoYXQgdG91Y2hlcyB0aGUgbWFya2VkXG4gICMgICAgICAgcmVnaW9uIGluIGFueSB3YXksIGluY2x1ZGluZyBjaGFuZ2VzIHRoYXQgZW5kIGF0IHRoZSBtYXJrZXInc1xuICAjICAgICAgIHN0YXJ0IG9yIHN0YXJ0IGF0IHRoZSBtYXJrZXIncyBlbmQuIFRoaXMgaXMgdGhlIG1vc3QgZnJhZ2lsZSBzdHJhdGVneS5cbiAgIyAgICogYGNsaXBEaXJlY3Rpb25gIHtTdHJpbmd9IElmIGAnYmFja3dhcmQnYCwgcmV0dXJucyB0aGUgZmlyc3QgdmFsaWRcbiAgIyAgICAgcG9zaXRpb24gcHJlY2VkaW5nIGFuIGludmFsaWQgcG9zaXRpb24uIElmIGAnZm9yd2FyZCdgLCByZXR1cm5zIHRoZVxuICAjICAgICBmaXJzdCB2YWxpZCBwb3NpdGlvbiBmb2xsb3dpbmcgYW4gaW52YWxpZCBwb3NpdGlvbi4gSWYgYCdjbG9zZXN0J2AsXG4gICMgICAgIHJldHVybnMgdGhlIGZpcnN0IHZhbGlkIHBvc2l0aW9uIGNsb3Nlc3QgdG8gYW4gaW52YWxpZCBwb3NpdGlvbi5cbiAgIyAgICAgRGVmYXVsdHMgdG8gYCdjbG9zZXN0J2AuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJ9LlxuICBtYXJrU2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBAZGVmYXVsdE1hcmtlckxheWVyLm1hcmtTY3JlZW5Qb3NpdGlvbihzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogRmluZCBhbGwge0Rpc3BsYXlNYXJrZXJ9cyBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgdGhhdFxuICAjIG1hdGNoIHRoZSBnaXZlbiBwcm9wZXJ0aWVzLlxuICAjXG4gICMgVGhpcyBtZXRob2QgZmluZHMgbWFya2VycyBiYXNlZCBvbiB0aGUgZ2l2ZW4gcHJvcGVydGllcy4gTWFya2VycyBjYW4gYmVcbiAgIyBhc3NvY2lhdGVkIHdpdGggY3VzdG9tIHByb3BlcnRpZXMgdGhhdCB3aWxsIGJlIGNvbXBhcmVkIHdpdGggYmFzaWMgZXF1YWxpdHkuXG4gICMgSW4gYWRkaXRpb24sIHRoZXJlIGFyZSBzZXZlcmFsIHNwZWNpYWwgcHJvcGVydGllcyB0aGF0IHdpbGwgYmUgY29tcGFyZWRcbiAgIyB3aXRoIHRoZSByYW5nZSBvZiB0aGUgbWFya2VycyByYXRoZXIgdGhhbiB0aGVpciBwcm9wZXJ0aWVzLlxuICAjXG4gICMgKiBgcHJvcGVydGllc2AgQW4ge09iamVjdH0gY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgZWFjaCByZXR1cm5lZCBtYXJrZXJcbiAgIyAgIG11c3Qgc2F0aXNmeS4gTWFya2VycyBjYW4gYmUgYXNzb2NpYXRlZCB3aXRoIGN1c3RvbSBwcm9wZXJ0aWVzLCB3aGljaCBhcmVcbiAgIyAgIGNvbXBhcmVkIHdpdGggYmFzaWMgZXF1YWxpdHkuIEluIGFkZGl0aW9uLCBzZXZlcmFsIHJlc2VydmVkIHByb3BlcnRpZXNcbiAgIyAgIGNhbiBiZSB1c2VkIHRvIGZpbHRlciBtYXJrZXJzIGJhc2VkIG9uIHRoZWlyIGN1cnJlbnQgcmFuZ2U6XG4gICMgICAqIGBzdGFydEJ1ZmZlclJvd2AgT25seSBpbmNsdWRlIG1hcmtlcnMgc3RhcnRpbmcgYXQgdGhpcyByb3cgaW4gYnVmZmVyXG4gICMgICAgICAgY29vcmRpbmF0ZXMuXG4gICMgICAqIGBlbmRCdWZmZXJSb3dgIE9ubHkgaW5jbHVkZSBtYXJrZXJzIGVuZGluZyBhdCB0aGlzIHJvdyBpbiBidWZmZXJcbiAgIyAgICAgICBjb29yZGluYXRlcy5cbiAgIyAgICogYGNvbnRhaW5zQnVmZmVyUmFuZ2VgIE9ubHkgaW5jbHVkZSBtYXJrZXJzIGNvbnRhaW5pbmcgdGhpcyB7UmFuZ2V9IG9yXG4gICMgICAgICAgaW4gcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9IGluIGJ1ZmZlciBjb29yZGluYXRlcy5cbiAgIyAgICogYGNvbnRhaW5zQnVmZmVyUG9zaXRpb25gIE9ubHkgaW5jbHVkZSBtYXJrZXJzIGNvbnRhaW5pbmcgdGhpcyB7UG9pbnR9XG4gICMgICAgICAgb3Ige0FycmF5fSBvZiBgW3JvdywgY29sdW1uXWAgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtEaXNwbGF5TWFya2VyfXNcbiAgZmluZE1hcmtlcnM6IChwYXJhbXMpIC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5maW5kTWFya2VycyhwYXJhbXMpXG5cbiAgIyBFeHRlbmRlZDogR2V0IHRoZSB7RGlzcGxheU1hcmtlcn0gb24gdGhlIGRlZmF1bHQgbGF5ZXIgZm9yIHRoZSBnaXZlblxuICAjIG1hcmtlciBpZC5cbiAgI1xuICAjICogYGlkYCB7TnVtYmVyfSBpZCBvZiB0aGUgbWFya2VyXG4gIGdldE1hcmtlcjogKGlkKSAtPlxuICAgIEBkZWZhdWx0TWFya2VyTGF5ZXIuZ2V0TWFya2VyKGlkKVxuXG4gICMgRXh0ZW5kZWQ6IEdldCBhbGwge0Rpc3BsYXlNYXJrZXJ9cyBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIuIENvbnNpZGVyXG4gICMgdXNpbmcgezo6ZmluZE1hcmtlcnN9XG4gIGdldE1hcmtlcnM6IC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5nZXRNYXJrZXJzKClcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIG51bWJlciBvZiBtYXJrZXJzIGluIHRoZSBkZWZhdWx0IG1hcmtlciBsYXllci5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfS5cbiAgZ2V0TWFya2VyQ291bnQ6IC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5nZXRNYXJrZXJDb3VudCgpXG5cbiAgZGVzdHJveU1hcmtlcjogKGlkKSAtPlxuICAgIEBnZXRNYXJrZXIoaWQpPy5kZXN0cm95KClcblxuICAjIEVzc2VudGlhbDogQ3JlYXRlIGEgbWFya2VyIGxheWVyIHRvIGdyb3VwIHJlbGF0ZWQgbWFya2Vycy5cbiAgI1xuICAjICogYG9wdGlvbnNgIEFuIHtPYmplY3R9IGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbWFpbnRhaW5IaXN0b3J5YCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgbWFya2VyIHN0YXRlIHNob3VsZCBiZVxuICAjICAgICByZXN0b3JlZCBvbiB1bmRvL3JlZG8uIERlZmF1bHRzIHRvIGBmYWxzZWAuXG4gICMgICAqIGBwZXJzaXN0ZW50YCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IHRoaXMgbWFya2VyIGxheWVyXG4gICMgICAgIHNob3VsZCBiZSBzZXJpYWxpemVkIGFuZCBkZXNlcmlhbGl6ZWQgYWxvbmcgd2l0aCB0aGUgcmVzdCBvZiB0aGVcbiAgIyAgICAgYnVmZmVyLiBEZWZhdWx0cyB0byBgZmFsc2VgLiBJZiBgdHJ1ZWAsIHRoZSBtYXJrZXIgbGF5ZXIncyBpZCB3aWxsIGJlXG4gICMgICAgIG1haW50YWluZWQgYWNyb3NzIHRoZSBzZXJpYWxpemF0aW9uIGJvdW5kYXJ5LCBhbGxvd2luZyB5b3UgdG8gcmV0cmlldmVcbiAgIyAgICAgaXQgdmlhIHs6OmdldE1hcmtlckxheWVyfS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcGxheU1hcmtlckxheWVyfS5cbiAgYWRkTWFya2VyTGF5ZXI6IChvcHRpb25zKSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIuYWRkTWFya2VyTGF5ZXIob3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogR2V0IGEge0Rpc3BsYXlNYXJrZXJMYXllcn0gYnkgaWQuXG4gICNcbiAgIyAqIGBpZGAgVGhlIGlkIG9mIHRoZSBtYXJrZXIgbGF5ZXIgdG8gcmV0cmlldmUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJMYXllcn0gb3IgYHVuZGVmaW5lZGAgaWYgbm8gbGF5ZXIgZXhpc3RzIHdpdGggdGhlXG4gICMgZ2l2ZW4gaWQuXG4gIGdldE1hcmtlckxheWVyOiAoaWQpIC0+XG4gICAgQGRpc3BsYXlMYXllci5nZXRNYXJrZXJMYXllcihpZClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBkZWZhdWx0IHtEaXNwbGF5TWFya2VyTGF5ZXJ9LlxuICAjXG4gICMgQWxsIG1hcmtlciBBUElzIG5vdCB0aWVkIHRvIGFuIGV4cGxpY2l0IGxheWVyIGludGVyYWN0IHdpdGggdGhpcyBkZWZhdWx0XG4gICMgbGF5ZXIuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJMYXllcn0uXG4gIGdldERlZmF1bHRNYXJrZXJMYXllcjogLT5cbiAgICBAZGVmYXVsdE1hcmtlckxheWVyXG5cbiAgIyMjXG4gIFNlY3Rpb246IEN1cnNvcnNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgcG9zaXRpb24gb2YgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgY3Vyc29yIGluIGJ1ZmZlclxuICAjIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgUmV0dXJucyBhIHtQb2ludH1cbiAgZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb246IC0+XG4gICAgQGdldExhc3RDdXJzb3IoKS5nZXRCdWZmZXJQb3NpdGlvbigpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgcG9zaXRpb24gb2YgYWxsIHRoZSBjdXJzb3IgcG9zaXRpb25zIGluIGJ1ZmZlciBjb29yZGluYXRlcy5cbiAgI1xuICAjIFJldHVybnMge0FycmF5fSBvZiB7UG9pbnR9cyBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlIGFkZGVkXG4gIGdldEN1cnNvckJ1ZmZlclBvc2l0aW9uczogLT5cbiAgICBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKSBmb3IgY3Vyc29yIGluIEBnZXRDdXJzb3JzKClcblxuICAjIEVzc2VudGlhbDogTW92ZSB0aGUgY3Vyc29yIHRvIHRoZSBnaXZlbiBwb3NpdGlvbiBpbiBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgY3Vyc29ycywgdGhleSB3aWxsIGJlIGNvbnNvbGlkYXRlZCB0byBhIHNpbmdsZSBjdXJzb3IuXG4gICNcbiAgIyAqIGBwb3NpdGlvbmAgQSB7UG9pbnR9IG9yIHtBcnJheX0gb2YgYFtyb3csIGNvbHVtbl1gXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSBjb250YWluaW5nIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGF1dG9zY3JvbGxgIERldGVybWluZXMgd2hldGhlciB0aGUgZWRpdG9yIHNjcm9sbHMgdG8gdGhlIG5ldyBjdXJzb3Inc1xuICAjICAgICBwb3NpdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgc2V0Q3Vyc29yQnVmZmVyUG9zaXRpb246IChwb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLnNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uLCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBHZXQgYSB7Q3Vyc29yfSBhdCBnaXZlbiBzY3JlZW4gY29vcmRpbmF0ZXMge1BvaW50fVxuICAjXG4gICMgKiBgcG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIGBbcm93LCBjb2x1bW5dYFxuICAjXG4gICMgUmV0dXJucyB0aGUgZmlyc3QgbWF0Y2hlZCB7Q3Vyc29yfSBvciB1bmRlZmluZWRcbiAgZ2V0Q3Vyc29yQXRTY3JlZW5Qb3NpdGlvbjogKHBvc2l0aW9uKSAtPlxuICAgIGlmIHNlbGVjdGlvbiA9IEBnZXRTZWxlY3Rpb25BdFNjcmVlblBvc2l0aW9uKHBvc2l0aW9uKVxuICAgICAgaWYgc2VsZWN0aW9uLmdldEhlYWRTY3JlZW5Qb3NpdGlvbigpLmlzRXF1YWwocG9zaXRpb24pXG4gICAgICAgIHNlbGVjdGlvbi5jdXJzb3JcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBwb3NpdGlvbiBvZiB0aGUgbW9zdCByZWNlbnRseSBhZGRlZCBjdXJzb3IgaW4gc2NyZWVuXG4gICMgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEge1BvaW50fS5cbiAgZ2V0Q3Vyc29yU2NyZWVuUG9zaXRpb246IC0+XG4gICAgQGdldExhc3RDdXJzb3IoKS5nZXRTY3JlZW5Qb3NpdGlvbigpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgcG9zaXRpb24gb2YgYWxsIHRoZSBjdXJzb3IgcG9zaXRpb25zIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjIFJldHVybnMge0FycmF5fSBvZiB7UG9pbnR9cyBpbiB0aGUgb3JkZXIgdGhlIGN1cnNvcnMgd2VyZSBhZGRlZFxuICBnZXRDdXJzb3JTY3JlZW5Qb3NpdGlvbnM6IC0+XG4gICAgY3Vyc29yLmdldFNjcmVlblBvc2l0aW9uKCkgZm9yIGN1cnNvciBpbiBAZ2V0Q3Vyc29ycygpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgdGhlIGN1cnNvciB0byB0aGUgZ2l2ZW4gcG9zaXRpb24gaW4gc2NyZWVuIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgSWYgdGhlcmUgYXJlIG11bHRpcGxlIGN1cnNvcnMsIHRoZXkgd2lsbCBiZSBjb25zb2xpZGF0ZWQgdG8gYSBzaW5nbGUgY3Vyc29yLlxuICAjXG4gICMgKiBgcG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIGBbcm93LCBjb2x1bW5dYFxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4ge09iamVjdH0gY29tYmluaW5nIG9wdGlvbnMgZm9yIHs6OmNsaXBTY3JlZW5Qb3NpdGlvbn0gd2l0aDpcbiAgIyAgICogYGF1dG9zY3JvbGxgIERldGVybWluZXMgd2hldGhlciB0aGUgZWRpdG9yIHNjcm9sbHMgdG8gdGhlIG5ldyBjdXJzb3Inc1xuICAjICAgICBwb3NpdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgc2V0Q3Vyc29yU2NyZWVuUG9zaXRpb246IChwb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBpZiBvcHRpb25zPy5jbGlwP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYGNsaXBgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb25gIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gb3B0aW9ucy5jbGlwXG4gICAgaWYgb3B0aW9ucz8ud3JhcEF0U29mdE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBBdFNvZnROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEF0U29mdE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuICAgIGlmIG9wdGlvbnM/LndyYXBCZXlvbmROZXdsaW5lcz9cbiAgICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhlIGB3cmFwQmV5b25kTmV3bGluZXNgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb246ICdmb3J3YXJkJ2AgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBpZiBvcHRpb25zLndyYXBCZXlvbmROZXdsaW5lcyB0aGVuICdmb3J3YXJkJyBlbHNlICdiYWNrd2FyZCdcblxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3Iuc2V0U2NyZWVuUG9zaXRpb24ocG9zaXRpb24sIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIGN1cnNvciBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24gaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIGBbcm93LCBjb2x1bW5dYFxuICAjXG4gICMgUmV0dXJucyBhIHtDdXJzb3J9LlxuICBhZGRDdXJzb3JBdEJ1ZmZlclBvc2l0aW9uOiAoYnVmZmVyUG9zaXRpb24sIG9wdGlvbnMpIC0+XG4gICAgQHNlbGVjdGlvbnNNYXJrZXJMYXllci5tYXJrQnVmZmVyUG9zaXRpb24oYnVmZmVyUG9zaXRpb24sIE9iamVjdC5hc3NpZ24oe2ludmFsaWRhdGU6ICduZXZlcid9LCBvcHRpb25zKSlcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmN1cnNvci5hdXRvc2Nyb2xsKCkgdW5sZXNzIG9wdGlvbnM/LmF1dG9zY3JvbGwgaXMgZmFsc2VcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmN1cnNvclxuXG4gICMgRXNzZW50aWFsOiBBZGQgYSBjdXJzb3IgYXQgdGhlIHBvc2l0aW9uIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYHNjcmVlblBvc2l0aW9uYCBBIHtQb2ludH0gb3Ige0FycmF5fSBvZiBgW3JvdywgY29sdW1uXWBcbiAgI1xuICAjIFJldHVybnMgYSB7Q3Vyc29yfS5cbiAgYWRkQ3Vyc29yQXRTY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIubWFya1NjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uLCB7aW52YWxpZGF0ZTogJ25ldmVyJ30pXG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5jdXJzb3IuYXV0b3Njcm9sbCgpIHVubGVzcyBvcHRpb25zPy5hdXRvc2Nyb2xsIGlzIGZhbHNlXG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5jdXJzb3JcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIG9yIG5vdCB0aGVyZSBhcmUgbXVsdGlwbGUgY3Vyc29ycy5cbiAgaGFzTXVsdGlwbGVDdXJzb3JzOiAtPlxuICAgIEBnZXRDdXJzb3JzKCkubGVuZ3RoID4gMVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIGV2ZXJ5IGN1cnNvciB1cCBvbmUgcm93IGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYGxpbmVDb3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgbGluZXMgdG8gbW92ZVxuICBtb3ZlVXA6IChsaW5lQ291bnQpIC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVXAobGluZUNvdW50LCBtb3ZlVG9FbmRPZlNlbGVjdGlvbjogdHJ1ZSlcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgZG93biBvbmUgcm93IGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYGxpbmVDb3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgbGluZXMgdG8gbW92ZVxuICBtb3ZlRG93bjogKGxpbmVDb3VudCkgLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVEb3duKGxpbmVDb3VudCwgbW92ZVRvRW5kT2ZTZWxlY3Rpb246IHRydWUpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIGxlZnQgb25lIGNvbHVtbi5cbiAgI1xuICAjICogYGNvbHVtbkNvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiBjb2x1bW5zIHRvIG1vdmUgKGRlZmF1bHQ6IDEpXG4gIG1vdmVMZWZ0OiAoY29sdW1uQ291bnQpIC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlTGVmdChjb2x1bW5Db3VudCwgbW92ZVRvRW5kT2ZTZWxlY3Rpb246IHRydWUpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIHJpZ2h0IG9uZSBjb2x1bW4uXG4gICNcbiAgIyAqIGBjb2x1bW5Db3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgY29sdW1ucyB0byBtb3ZlIChkZWZhdWx0OiAxKVxuICBtb3ZlUmlnaHQ6IChjb2x1bW5Db3VudCkgLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVSaWdodChjb2x1bW5Db3VudCwgbW92ZVRvRW5kT2ZTZWxlY3Rpb246IHRydWUpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgaXRzIGxpbmUgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICBtb3ZlVG9CZWdpbm5pbmdPZkxpbmU6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZkxpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIGl0cyBsaW5lIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZTY3JlZW5MaW5lOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvQmVnaW5uaW5nT2ZTY3JlZW5MaW5lKClcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciBvZiBpdHMgbGluZS5cbiAgbW92ZVRvRmlyc3RDaGFyYWN0ZXJPZkxpbmU6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9GaXJzdENoYXJhY3Rlck9mTGluZSgpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBlbmQgb2YgaXRzIGxpbmUgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICBtb3ZlVG9FbmRPZkxpbmU6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9FbmRPZkxpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgZW5kIG9mIGl0cyBsaW5lIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgbW92ZVRvRW5kT2ZTY3JlZW5MaW5lOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvRW5kT2ZTY3JlZW5MaW5lKClcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiBpdHMgc3Vycm91bmRpbmcgd29yZC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZXb3JkOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvQmVnaW5uaW5nT2ZXb3JkKClcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIGVuZCBvZiBpdHMgc3Vycm91bmRpbmcgd29yZC5cbiAgbW92ZVRvRW5kT2ZXb3JkOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvRW5kT2ZXb3JkKClcblxuICAjIEN1cnNvciBFeHRlbmRlZFxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSB0b3Agb2YgdGhlIGJ1ZmZlci5cbiAgI1xuICAjIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBjdXJzb3JzLCB0aGV5IHdpbGwgYmUgbWVyZ2VkIGludG8gYSBzaW5nbGUgY3Vyc29yLlxuICBtb3ZlVG9Ub3A6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9Ub3AoKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBib3R0b20gb2YgdGhlIGJ1ZmZlci5cbiAgI1xuICAjIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBjdXJzb3JzLCB0aGV5IHdpbGwgYmUgbWVyZ2VkIGludG8gYSBzaW5nbGUgY3Vyc29yLlxuICBtb3ZlVG9Cb3R0b206IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9Cb3R0b20oKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHQgd29yZC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZOZXh0V29yZDogLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVUb0JlZ2lubmluZ09mTmV4dFdvcmQoKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBwcmV2aW91cyB3b3JkIGJvdW5kYXJ5LlxuICBtb3ZlVG9QcmV2aW91c1dvcmRCb3VuZGFyeTogLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVUb1ByZXZpb3VzV29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgbmV4dCB3b3JkIGJvdW5kYXJ5LlxuICBtb3ZlVG9OZXh0V29yZEJvdW5kYXJ5OiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvTmV4dFdvcmRCb3VuZGFyeSgpXG5cbiAgIyBFeHRlbmRlZDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIHByZXZpb3VzIHN1YndvcmQgYm91bmRhcnkuXG4gIG1vdmVUb1ByZXZpb3VzU3Vid29yZEJvdW5kYXJ5OiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvUHJldmlvdXNTdWJ3b3JkQm91bmRhcnkoKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBuZXh0IHN1YndvcmQgYm91bmRhcnkuXG4gIG1vdmVUb05leHRTdWJ3b3JkQm91bmRhcnk6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9OZXh0U3Vid29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBuZXh0IHBhcmFncmFwaC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoKClcblxuICAjIEV4dGVuZGVkOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBwcmV2aW91cyBwYXJhZ3JhcGguXG4gIG1vdmVUb0JlZ2lubmluZ09mUHJldmlvdXNQYXJhZ3JhcGg6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoKClcblxuICAjIEV4dGVuZGVkOiBSZXR1cm5zIHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIHtDdXJzb3J9XG4gIGdldExhc3RDdXJzb3I6IC0+XG4gICAgQGNyZWF0ZUxhc3RTZWxlY3Rpb25JZk5lZWRlZCgpXG4gICAgXy5sYXN0KEBjdXJzb3JzKVxuXG4gICMgRXh0ZW5kZWQ6IFJldHVybnMgdGhlIHdvcmQgc3Vycm91bmRpbmcgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgY3Vyc29yLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBTZWUge0N1cnNvcjo6Z2V0QmVnaW5uaW5nT2ZDdXJyZW50V29yZEJ1ZmZlclBvc2l0aW9ufS5cbiAgZ2V0V29yZFVuZGVyQ3Vyc29yOiAob3B0aW9ucykgLT5cbiAgICBAZ2V0VGV4dEluQnVmZmVyUmFuZ2UoQGdldExhc3RDdXJzb3IoKS5nZXRDdXJyZW50V29yZEJ1ZmZlclJhbmdlKG9wdGlvbnMpKVxuXG4gICMgRXh0ZW5kZWQ6IEdldCBhbiBBcnJheSBvZiBhbGwge0N1cnNvcn1zLlxuICBnZXRDdXJzb3JzOiAtPlxuICAgIEBjcmVhdGVMYXN0U2VsZWN0aW9uSWZOZWVkZWQoKVxuICAgIEBjdXJzb3JzLnNsaWNlKClcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIHtDdXJzb3JzfXMsIG9yZGVyZWQgYnkgdGhlaXIgcG9zaXRpb24gaW4gdGhlIGJ1ZmZlclxuICAjIGluc3RlYWQgb2YgdGhlIG9yZGVyIGluIHdoaWNoIHRoZXkgd2VyZSBhZGRlZC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7U2VsZWN0aW9ufXMuXG4gIGdldEN1cnNvcnNPcmRlcmVkQnlCdWZmZXJQb3NpdGlvbjogLT5cbiAgICBAZ2V0Q3Vyc29ycygpLnNvcnQgKGEsIGIpIC0+IGEuY29tcGFyZShiKVxuXG4gIGN1cnNvcnNGb3JTY3JlZW5Sb3dSYW5nZTogKHN0YXJ0U2NyZWVuUm93LCBlbmRTY3JlZW5Sb3cpIC0+XG4gICAgY3Vyc29ycyA9IFtdXG4gICAgZm9yIG1hcmtlciBpbiBAc2VsZWN0aW9uc01hcmtlckxheWVyLmZpbmRNYXJrZXJzKGludGVyc2VjdHNTY3JlZW5Sb3dSYW5nZTogW3N0YXJ0U2NyZWVuUm93LCBlbmRTY3JlZW5Sb3ddKVxuICAgICAgaWYgY3Vyc29yID0gQGN1cnNvcnNCeU1hcmtlcklkLmdldChtYXJrZXIuaWQpXG4gICAgICAgIGN1cnNvcnMucHVzaChjdXJzb3IpXG4gICAgY3Vyc29yc1xuXG4gICMgQWRkIGEgY3Vyc29yIGJhc2VkIG9uIHRoZSBnaXZlbiB7RGlzcGxheU1hcmtlcn0uXG4gIGFkZEN1cnNvcjogKG1hcmtlcikgLT5cbiAgICBjdXJzb3IgPSBuZXcgQ3Vyc29yKGVkaXRvcjogdGhpcywgbWFya2VyOiBtYXJrZXIsIHNob3dDdXJzb3JPblNlbGVjdGlvbjogQHNob3dDdXJzb3JPblNlbGVjdGlvbilcbiAgICBAY3Vyc29ycy5wdXNoKGN1cnNvcilcbiAgICBAY3Vyc29yc0J5TWFya2VySWQuc2V0KG1hcmtlci5pZCwgY3Vyc29yKVxuICAgIGN1cnNvclxuXG4gIG1vdmVDdXJzb3JzOiAoZm4pIC0+XG4gICAgQHRyYW5zYWN0ID0+XG4gICAgICBmbihjdXJzb3IpIGZvciBjdXJzb3IgaW4gQGdldEN1cnNvcnMoKVxuICAgICAgQG1lcmdlQ3Vyc29ycygpXG5cbiAgY3Vyc29yTW92ZWQ6IChldmVudCkgLT5cbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLWN1cnNvci1wb3NpdGlvbicsIGV2ZW50XG5cbiAgIyBNZXJnZSBjdXJzb3JzIHRoYXQgaGF2ZSB0aGUgc2FtZSBzY3JlZW4gcG9zaXRpb25cbiAgbWVyZ2VDdXJzb3JzOiAtPlxuICAgIHBvc2l0aW9ucyA9IHt9XG4gICAgZm9yIGN1cnNvciBpbiBAZ2V0Q3Vyc29ycygpXG4gICAgICBwb3NpdGlvbiA9IGN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpLnRvU3RyaW5nKClcbiAgICAgIGlmIHBvc2l0aW9ucy5oYXNPd25Qcm9wZXJ0eShwb3NpdGlvbilcbiAgICAgICAgY3Vyc29yLmRlc3Ryb3koKVxuICAgICAgZWxzZVxuICAgICAgICBwb3NpdGlvbnNbcG9zaXRpb25dID0gdHJ1ZVxuICAgIHJldHVyblxuXG4gICMjI1xuICBTZWN0aW9uOiBTZWxlY3Rpb25zXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIHNlbGVjdGVkIHRleHQgb2YgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgc2VsZWN0aW9uLlxuICAjXG4gICMgUmV0dXJucyBhIHtTdHJpbmd9LlxuICBnZXRTZWxlY3RlZFRleHQ6IC0+XG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5nZXRUZXh0KClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSB7UmFuZ2V9IG9mIHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIHNlbGVjdGlvbiBpbiBidWZmZXJcbiAgIyBjb29yZGluYXRlcy5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBnZXRTZWxlY3RlZEJ1ZmZlclJhbmdlOiAtPlxuICAgIEBnZXRMYXN0U2VsZWN0aW9uKCkuZ2V0QnVmZmVyUmFuZ2UoKVxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIHtSYW5nZX1zIG9mIGFsbCBzZWxlY3Rpb25zIGluIGJ1ZmZlciBjb29yZGluYXRlcy5cbiAgI1xuICAjIFRoZSByYW5nZXMgYXJlIHNvcnRlZCBieSB3aGVuIHRoZSBzZWxlY3Rpb25zIHdlcmUgYWRkZWQuIE1vc3QgcmVjZW50IGF0IHRoZSBlbmQuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge1JhbmdlfXMuXG4gIGdldFNlbGVjdGVkQnVmZmVyUmFuZ2VzOiAtPlxuICAgIHNlbGVjdGlvbi5nZXRCdWZmZXJSYW5nZSgpIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnMoKVxuXG4gICMgRXNzZW50aWFsOiBTZXQgdGhlIHNlbGVjdGVkIHJhbmdlIGluIGJ1ZmZlciBjb29yZGluYXRlcy4gSWYgdGhlcmUgYXJlIG11bHRpcGxlXG4gICMgc2VsZWN0aW9ucywgdGhleSBhcmUgcmVkdWNlZCB0byBhIHNpbmdsZSBzZWxlY3Rpb24gd2l0aCB0aGUgZ2l2ZW4gcmFuZ2UuXG4gICNcbiAgIyAqIGBidWZmZXJSYW5nZWAgQSB7UmFuZ2V9IG9yIHJhbmdlLWNvbXBhdGlibGUge0FycmF5fS5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIEFuIG9wdGlvbnMge09iamVjdH06XG4gICMgICAqIGByZXZlcnNlZGAgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGNyZWF0ZSB0aGUgc2VsZWN0aW9uIGluIGFcbiAgIyAgICAgcmV2ZXJzZWQgb3JpZW50YXRpb24uXG4gICMgICAqIGBwcmVzZXJ2ZUZvbGRzYCBBIHtCb29sZWFufSwgd2hpY2ggaWYgYHRydWVgIHByZXNlcnZlcyB0aGUgZm9sZCBzZXR0aW5ncyBhZnRlciB0aGVcbiAgIyAgICAgc2VsZWN0aW9uIGlzIHNldC5cbiAgc2V0U2VsZWN0ZWRCdWZmZXJSYW5nZTogKGJ1ZmZlclJhbmdlLCBvcHRpb25zKSAtPlxuICAgIEBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcyhbYnVmZmVyUmFuZ2VdLCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBTZXQgdGhlIHNlbGVjdGVkIHJhbmdlcyBpbiBidWZmZXIgY29vcmRpbmF0ZXMuIElmIHRoZXJlIGFyZSBtdWx0aXBsZVxuICAjIHNlbGVjdGlvbnMsIHRoZXkgYXJlIHJlcGxhY2VkIGJ5IG5ldyBzZWxlY3Rpb25zIHdpdGggdGhlIGdpdmVuIHJhbmdlcy5cbiAgI1xuICAjICogYGJ1ZmZlclJhbmdlc2AgQW4ge0FycmF5fSBvZiB7UmFuZ2V9cyBvciByYW5nZS1jb21wYXRpYmxlIHtBcnJheX1zLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyB7T2JqZWN0fTpcbiAgIyAgICogYHJldmVyc2VkYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gY3JlYXRlIHRoZSBzZWxlY3Rpb24gaW4gYVxuICAjICAgICByZXZlcnNlZCBvcmllbnRhdGlvbi5cbiAgIyAgICogYHByZXNlcnZlRm9sZHNgIEEge0Jvb2xlYW59LCB3aGljaCBpZiBgdHJ1ZWAgcHJlc2VydmVzIHRoZSBmb2xkIHNldHRpbmdzIGFmdGVyIHRoZVxuICAjICAgICBzZWxlY3Rpb24gaXMgc2V0LlxuICBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlczogKGJ1ZmZlclJhbmdlcywgb3B0aW9ucz17fSkgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXNzZWQgYW4gZW1wdHkgYXJyYXkgdG8gc2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXNcIikgdW5sZXNzIGJ1ZmZlclJhbmdlcy5sZW5ndGhcblxuICAgIHNlbGVjdGlvbnMgPSBAZ2V0U2VsZWN0aW9ucygpXG4gICAgc2VsZWN0aW9uLmRlc3Ryb3koKSBmb3Igc2VsZWN0aW9uIGluIHNlbGVjdGlvbnNbYnVmZmVyUmFuZ2VzLmxlbmd0aC4uLl1cblxuICAgIEBtZXJnZUludGVyc2VjdGluZ1NlbGVjdGlvbnMgb3B0aW9ucywgPT5cbiAgICAgIGZvciBidWZmZXJSYW5nZSwgaSBpbiBidWZmZXJSYW5nZXNcbiAgICAgICAgYnVmZmVyUmFuZ2UgPSBSYW5nZS5mcm9tT2JqZWN0KGJ1ZmZlclJhbmdlKVxuICAgICAgICBpZiBzZWxlY3Rpb25zW2ldXG4gICAgICAgICAgc2VsZWN0aW9uc1tpXS5zZXRCdWZmZXJSYW5nZShidWZmZXJSYW5nZSwgb3B0aW9ucylcbiAgICAgICAgZWxzZVxuICAgICAgICAgIEBhZGRTZWxlY3Rpb25Gb3JCdWZmZXJSYW5nZShidWZmZXJSYW5nZSwgb3B0aW9ucylcbiAgICAgIHJldHVyblxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIHtSYW5nZX0gb2YgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgc2VsZWN0aW9uIGluIHNjcmVlblxuICAjIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgUmV0dXJucyBhIHtSYW5nZX0uXG4gIGdldFNlbGVjdGVkU2NyZWVuUmFuZ2U6IC0+XG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5nZXRTY3JlZW5SYW5nZSgpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUge1JhbmdlfXMgb2YgYWxsIHNlbGVjdGlvbnMgaW4gc2NyZWVuIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgVGhlIHJhbmdlcyBhcmUgc29ydGVkIGJ5IHdoZW4gdGhlIHNlbGVjdGlvbnMgd2VyZSBhZGRlZC4gTW9zdCByZWNlbnQgYXQgdGhlIGVuZC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7UmFuZ2V9cy5cbiAgZ2V0U2VsZWN0ZWRTY3JlZW5SYW5nZXM6IC0+XG4gICAgc2VsZWN0aW9uLmdldFNjcmVlblJhbmdlKCkgZm9yIHNlbGVjdGlvbiBpbiBAZ2V0U2VsZWN0aW9ucygpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgc2VsZWN0ZWQgcmFuZ2UgaW4gc2NyZWVuIGNvb3JkaW5hdGVzLiBJZiB0aGVyZSBhcmUgbXVsdGlwbGVcbiAgIyBzZWxlY3Rpb25zLCB0aGV5IGFyZSByZWR1Y2VkIHRvIGEgc2luZ2xlIHNlbGVjdGlvbiB3aXRoIHRoZSBnaXZlbiByYW5nZS5cbiAgI1xuICAjICogYHNjcmVlblJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9LlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyB7T2JqZWN0fTpcbiAgIyAgICogYHJldmVyc2VkYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gY3JlYXRlIHRoZSBzZWxlY3Rpb24gaW4gYVxuICAjICAgICByZXZlcnNlZCBvcmllbnRhdGlvbi5cbiAgc2V0U2VsZWN0ZWRTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlLCBvcHRpb25zKSAtPlxuICAgIEBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlKEBidWZmZXJSYW5nZUZvclNjcmVlblJhbmdlKHNjcmVlblJhbmdlLCBvcHRpb25zKSwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogU2V0IHRoZSBzZWxlY3RlZCByYW5nZXMgaW4gc2NyZWVuIGNvb3JkaW5hdGVzLiBJZiB0aGVyZSBhcmUgbXVsdGlwbGVcbiAgIyBzZWxlY3Rpb25zLCB0aGV5IGFyZSByZXBsYWNlZCBieSBuZXcgc2VsZWN0aW9ucyB3aXRoIHRoZSBnaXZlbiByYW5nZXMuXG4gICNcbiAgIyAqIGBzY3JlZW5SYW5nZXNgIEFuIHtBcnJheX0gb2Yge1JhbmdlfXMgb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9cy5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIEFuIG9wdGlvbnMge09iamVjdH06XG4gICMgICAqIGByZXZlcnNlZGAgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGNyZWF0ZSB0aGUgc2VsZWN0aW9uIGluIGFcbiAgIyAgICAgcmV2ZXJzZWQgb3JpZW50YXRpb24uXG4gIHNldFNlbGVjdGVkU2NyZWVuUmFuZ2VzOiAoc2NyZWVuUmFuZ2VzLCBvcHRpb25zPXt9KSAtPlxuICAgIHRocm93IG5ldyBFcnJvcihcIlBhc3NlZCBhbiBlbXB0eSBhcnJheSB0byBzZXRTZWxlY3RlZFNjcmVlblJhbmdlc1wiKSB1bmxlc3Mgc2NyZWVuUmFuZ2VzLmxlbmd0aFxuXG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3Rpb25zKClcbiAgICBzZWxlY3Rpb24uZGVzdHJveSgpIGZvciBzZWxlY3Rpb24gaW4gc2VsZWN0aW9uc1tzY3JlZW5SYW5nZXMubGVuZ3RoLi4uXVxuXG4gICAgQG1lcmdlSW50ZXJzZWN0aW5nU2VsZWN0aW9ucyBvcHRpb25zLCA9PlxuICAgICAgZm9yIHNjcmVlblJhbmdlLCBpIGluIHNjcmVlblJhbmdlc1xuICAgICAgICBzY3JlZW5SYW5nZSA9IFJhbmdlLmZyb21PYmplY3Qoc2NyZWVuUmFuZ2UpXG4gICAgICAgIGlmIHNlbGVjdGlvbnNbaV1cbiAgICAgICAgICBzZWxlY3Rpb25zW2ldLnNldFNjcmVlblJhbmdlKHNjcmVlblJhbmdlLCBvcHRpb25zKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgQGFkZFNlbGVjdGlvbkZvclNjcmVlblJhbmdlKHNjcmVlblJhbmdlLCBvcHRpb25zKVxuICAgICAgcmV0dXJuXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIHNlbGVjdGlvbiBmb3IgdGhlIGdpdmVuIHJhbmdlIGluIGJ1ZmZlciBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYGJ1ZmZlclJhbmdlYCBBIHtSYW5nZX1cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIEFuIG9wdGlvbnMge09iamVjdH06XG4gICMgICAqIGByZXZlcnNlZGAgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGNyZWF0ZSB0aGUgc2VsZWN0aW9uIGluIGFcbiAgIyAgICAgcmV2ZXJzZWQgb3JpZW50YXRpb24uXG4gICMgICAqIGBwcmVzZXJ2ZUZvbGRzYCBBIHtCb29sZWFufSwgd2hpY2ggaWYgYHRydWVgIHByZXNlcnZlcyB0aGUgZm9sZCBzZXR0aW5ncyBhZnRlciB0aGVcbiAgIyAgICAgc2VsZWN0aW9uIGlzIHNldC5cbiAgI1xuICAjIFJldHVybnMgdGhlIGFkZGVkIHtTZWxlY3Rpb259LlxuICBhZGRTZWxlY3Rpb25Gb3JCdWZmZXJSYW5nZTogKGJ1ZmZlclJhbmdlLCBvcHRpb25zPXt9KSAtPlxuICAgIHVubGVzcyBvcHRpb25zLnByZXNlcnZlRm9sZHNcbiAgICAgIEBkZXN0cm95Rm9sZHNJbnRlcnNlY3RpbmdCdWZmZXJSYW5nZShidWZmZXJSYW5nZSlcbiAgICBAc2VsZWN0aW9uc01hcmtlckxheWVyLm1hcmtCdWZmZXJSYW5nZShidWZmZXJSYW5nZSwge2ludmFsaWRhdGU6ICduZXZlcicsIHJldmVyc2VkOiBvcHRpb25zLnJldmVyc2VkID8gZmFsc2V9KVxuICAgIEBnZXRMYXN0U2VsZWN0aW9uKCkuYXV0b3Njcm9sbCgpIHVubGVzcyBvcHRpb25zLmF1dG9zY3JvbGwgaXMgZmFsc2VcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIHNlbGVjdGlvbiBmb3IgdGhlIGdpdmVuIHJhbmdlIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYHNjcmVlblJhbmdlYCBBIHtSYW5nZX1cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIEFuIG9wdGlvbnMge09iamVjdH06XG4gICMgICAqIGByZXZlcnNlZGAgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGNyZWF0ZSB0aGUgc2VsZWN0aW9uIGluIGFcbiAgIyAgICAgcmV2ZXJzZWQgb3JpZW50YXRpb24uXG4gICMgICAqIGBwcmVzZXJ2ZUZvbGRzYCBBIHtCb29sZWFufSwgd2hpY2ggaWYgYHRydWVgIHByZXNlcnZlcyB0aGUgZm9sZCBzZXR0aW5ncyBhZnRlciB0aGVcbiAgIyAgICAgc2VsZWN0aW9uIGlzIHNldC5cbiAgIyBSZXR1cm5zIHRoZSBhZGRlZCB7U2VsZWN0aW9ufS5cbiAgYWRkU2VsZWN0aW9uRm9yU2NyZWVuUmFuZ2U6IChzY3JlZW5SYW5nZSwgb3B0aW9ucz17fSkgLT5cbiAgICBAYWRkU2VsZWN0aW9uRm9yQnVmZmVyUmFuZ2UoQGJ1ZmZlclJhbmdlRm9yU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UpLCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBTZWxlY3QgZnJvbSB0aGUgY3VycmVudCBjdXJzb3IgcG9zaXRpb24gdG8gdGhlIGdpdmVuIHBvc2l0aW9uIGluXG4gICMgYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXNlY3RpbmcuXG4gICNcbiAgIyAqIGBwb3NpdGlvbmAgQW4gaW5zdGFuY2Ugb2Yge1BvaW50fSwgd2l0aCBhIGdpdmVuIGByb3dgIGFuZCBgY29sdW1uYC5cbiAgc2VsZWN0VG9CdWZmZXJQb3NpdGlvbjogKHBvc2l0aW9uKSAtPlxuICAgIGxhc3RTZWxlY3Rpb24gPSBAZ2V0TGFzdFNlbGVjdGlvbigpXG4gICAgbGFzdFNlbGVjdGlvbi5zZWxlY3RUb0J1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuICAgIEBtZXJnZUludGVyc2VjdGluZ1NlbGVjdGlvbnMocmV2ZXJzZWQ6IGxhc3RTZWxlY3Rpb24uaXNSZXZlcnNlZCgpKVxuXG4gICMgRXNzZW50aWFsOiBTZWxlY3QgZnJvbSB0aGUgY3VycmVudCBjdXJzb3IgcG9zaXRpb24gdG8gdGhlIGdpdmVuIHBvc2l0aW9uIGluXG4gICMgc2NyZWVuIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXNlY3RpbmcuXG4gICNcbiAgIyAqIGBwb3NpdGlvbmAgQW4gaW5zdGFuY2Ugb2Yge1BvaW50fSwgd2l0aCBhIGdpdmVuIGByb3dgIGFuZCBgY29sdW1uYC5cbiAgc2VsZWN0VG9TY3JlZW5Qb3NpdGlvbjogKHBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIGxhc3RTZWxlY3Rpb24gPSBAZ2V0TGFzdFNlbGVjdGlvbigpXG4gICAgbGFzdFNlbGVjdGlvbi5zZWxlY3RUb1NjcmVlblBvc2l0aW9uKHBvc2l0aW9uLCBvcHRpb25zKVxuICAgIHVubGVzcyBvcHRpb25zPy5zdXBwcmVzc1NlbGVjdGlvbk1lcmdlXG4gICAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zKHJldmVyc2VkOiBsYXN0U2VsZWN0aW9uLmlzUmV2ZXJzZWQoKSlcblxuICAjIEVzc2VudGlhbDogTW92ZSB0aGUgY3Vyc29yIG9mIGVhY2ggc2VsZWN0aW9uIG9uZSBjaGFyYWN0ZXIgdXB3YXJkIHdoaWxlXG4gICMgcHJlc2VydmluZyB0aGUgc2VsZWN0aW9uJ3MgdGFpbCBwb3NpdGlvbi5cbiAgI1xuICAjICogYHJvd0NvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiByb3dzIHRvIHNlbGVjdCAoZGVmYXVsdDogMSlcbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1heSBtZXJnZSBzZWxlY3Rpb25zIHRoYXQgZW5kIHVwIGludGVzZWN0aW5nLlxuICBzZWxlY3RVcDogKHJvd0NvdW50KSAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFVwKHJvd0NvdW50KVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIHRoZSBjdXJzb3Igb2YgZWFjaCBzZWxlY3Rpb24gb25lIGNoYXJhY3RlciBkb3dud2FyZCB3aGlsZVxuICAjIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyAqIGByb3dDb3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2Ygcm93cyB0byBzZWxlY3QgKGRlZmF1bHQ6IDEpXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlc2VjdGluZy5cbiAgc2VsZWN0RG93bjogKHJvd0NvdW50KSAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0RG93bihyb3dDb3VudClcblxuICAjIEVzc2VudGlhbDogTW92ZSB0aGUgY3Vyc29yIG9mIGVhY2ggc2VsZWN0aW9uIG9uZSBjaGFyYWN0ZXIgbGVmdHdhcmQgd2hpbGVcbiAgIyBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgKiBgY29sdW1uQ291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIGNvbHVtbnMgdG8gc2VsZWN0IChkZWZhdWx0OiAxKVxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXNlY3RpbmcuXG4gIHNlbGVjdExlZnQ6IChjb2x1bW5Db3VudCkgLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0JhY2t3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RMZWZ0KGNvbHVtbkNvdW50KVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIHRoZSBjdXJzb3Igb2YgZWFjaCBzZWxlY3Rpb24gb25lIGNoYXJhY3RlciByaWdodHdhcmQgd2hpbGVcbiAgIyBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgKiBgY29sdW1uQ291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIGNvbHVtbnMgdG8gc2VsZWN0IChkZWZhdWx0OiAxKVxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXNlY3RpbmcuXG4gIHNlbGVjdFJpZ2h0OiAoY29sdW1uQ291bnQpIC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RSaWdodChjb2x1bW5Db3VudClcblxuICAjIEVzc2VudGlhbDogU2VsZWN0IGZyb20gdGhlIHRvcCBvZiB0aGUgYnVmZmVyIHRvIHRoZSBlbmQgb2YgdGhlIGxhc3Qgc2VsZWN0aW9uXG4gICMgaW4gdGhlIGJ1ZmZlci5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1lcmdlcyBtdWx0aXBsZSBzZWxlY3Rpb25zIGludG8gYSBzaW5nbGUgc2VsZWN0aW9uLlxuICBzZWxlY3RUb1RvcDogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0JhY2t3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb1RvcCgpXG5cbiAgIyBFc3NlbnRpYWw6IFNlbGVjdHMgZnJvbSB0aGUgdG9wIG9mIHRoZSBmaXJzdCBzZWxlY3Rpb24gaW4gdGhlIGJ1ZmZlciB0byB0aGUgZW5kXG4gICMgb2YgdGhlIGJ1ZmZlci5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1lcmdlcyBtdWx0aXBsZSBzZWxlY3Rpb25zIGludG8gYSBzaW5nbGUgc2VsZWN0aW9uLlxuICBzZWxlY3RUb0JvdHRvbTogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvQm90dG9tKClcblxuICAjIEVzc2VudGlhbDogU2VsZWN0IGFsbCB0ZXh0IGluIHRoZSBidWZmZXIuXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtZXJnZXMgbXVsdGlwbGUgc2VsZWN0aW9ucyBpbnRvIGEgc2luZ2xlIHNlbGVjdGlvbi5cbiAgc2VsZWN0QWxsOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0QWxsKClcblxuICAjIEVzc2VudGlhbDogTW92ZSB0aGUgY3Vyc29yIG9mIGVhY2ggc2VsZWN0aW9uIHRvIHRoZSBiZWdpbm5pbmcgb2YgaXRzIGxpbmVcbiAgIyB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXNlY3RpbmcuXG4gIHNlbGVjdFRvQmVnaW5uaW5nT2ZMaW5lOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvQmVnaW5uaW5nT2ZMaW5lKClcblxuICAjIEVzc2VudGlhbDogTW92ZSB0aGUgY3Vyc29yIG9mIGVhY2ggc2VsZWN0aW9uIHRvIHRoZSBmaXJzdCBub24td2hpdGVzcGFjZVxuICAjIGNoYXJhY3RlciBvZiBpdHMgbGluZSB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLiBJZiB0aGVcbiAgIyBjdXJzb3IgaXMgYWxyZWFkeSBvbiB0aGUgZmlyc3QgY2hhcmFjdGVyIG9mIHRoZSBsaW5lLCBtb3ZlIGl0IHRvIHRoZVxuICAjIGJlZ2lubmluZyBvZiB0aGUgbGluZS5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1heSBtZXJnZSBzZWxlY3Rpb25zIHRoYXQgZW5kIHVwIGludGVyc2VjdGluZy5cbiAgc2VsZWN0VG9GaXJzdENoYXJhY3Rlck9mTGluZTogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0JhY2t3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb0ZpcnN0Q2hhcmFjdGVyT2ZMaW5lKClcblxuICAjIEVzc2VudGlhbDogTW92ZSB0aGUgY3Vyc29yIG9mIGVhY2ggc2VsZWN0aW9uIHRvIHRoZSBlbmQgb2YgaXRzIGxpbmUgd2hpbGVcbiAgIyBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXJzZWN0aW5nLlxuICBzZWxlY3RUb0VuZE9mTGluZTogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvRW5kT2ZMaW5lKClcblxuICAjIEVzc2VudGlhbDogRXhwYW5kIHNlbGVjdGlvbnMgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGVpciBjb250YWluaW5nIHdvcmQuXG4gICNcbiAgIyBPcGVyYXRlcyBvbiBhbGwgc2VsZWN0aW9ucy4gTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZVxuICAjIGNvbnRhaW5pbmcgd29yZCB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICBzZWxlY3RUb0JlZ2lubmluZ09mV29yZDogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0JhY2t3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb0JlZ2lubmluZ09mV29yZCgpXG5cbiAgIyBFc3NlbnRpYWw6IEV4cGFuZCBzZWxlY3Rpb25zIHRvIHRoZSBlbmQgb2YgdGhlaXIgY29udGFpbmluZyB3b3JkLlxuICAjXG4gICMgT3BlcmF0ZXMgb24gYWxsIHNlbGVjdGlvbnMuIE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGVuZCBvZiB0aGUgY29udGFpbmluZ1xuICAjIHdvcmQgd2hpbGUgcHJlc2VydmluZyB0aGUgc2VsZWN0aW9uJ3MgdGFpbCBwb3NpdGlvbi5cbiAgc2VsZWN0VG9FbmRPZldvcmQ6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb0VuZE9mV29yZCgpXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCBtb3ZlIGl0cyBjdXJzb3IgdG8gdGhlIHByZWNlZGluZyBzdWJ3b3JkXG4gICMgYm91bmRhcnkgd2hpbGUgbWFpbnRhaW5pbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlcnNlY3RpbmcuXG4gIHNlbGVjdFRvUHJldmlvdXNTdWJ3b3JkQm91bmRhcnk6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNCYWNrd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9QcmV2aW91c1N1YndvcmRCb3VuZGFyeSgpXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCBtb3ZlIGl0cyBjdXJzb3IgdG8gdGhlIG5leHQgc3Vid29yZCBib3VuZGFyeVxuICAjIHdoaWxlIG1haW50YWluaW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXJzZWN0aW5nLlxuICBzZWxlY3RUb05leHRTdWJ3b3JkQm91bmRhcnk6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb05leHRTdWJ3b3JkQm91bmRhcnkoKVxuXG4gICMgRXNzZW50aWFsOiBGb3IgZWFjaCBjdXJzb3IsIHNlbGVjdCB0aGUgY29udGFpbmluZyBsaW5lLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWVyZ2VzIHNlbGVjdGlvbnMgb24gc3VjY2Vzc2l2ZSBsaW5lcy5cbiAgc2VsZWN0TGluZXNDb250YWluaW5nQ3Vyc29yczogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdExpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBTZWxlY3QgdGhlIHdvcmQgc3Vycm91bmRpbmcgZWFjaCBjdXJzb3IuXG4gIHNlbGVjdFdvcmRzQ29udGFpbmluZ0N1cnNvcnM6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RXb3JkKClcblxuICAjIFNlbGVjdGlvbiBFeHRlbmRlZFxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgbW92ZSBpdHMgY3Vyc29yIHRvIHRoZSBwcmVjZWRpbmcgd29yZCBib3VuZGFyeVxuICAjIHdoaWxlIG1haW50YWluaW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXJzZWN0aW5nLlxuICBzZWxlY3RUb1ByZXZpb3VzV29yZEJvdW5kYXJ5OiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvUHJldmlvdXNXb3JkQm91bmRhcnkoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgbW92ZSBpdHMgY3Vyc29yIHRvIHRoZSBuZXh0IHdvcmQgYm91bmRhcnkgd2hpbGVcbiAgIyBtYWludGFpbmluZyB0aGUgc2VsZWN0aW9uJ3MgdGFpbCBwb3NpdGlvbi5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1heSBtZXJnZSBzZWxlY3Rpb25zIHRoYXQgZW5kIHVwIGludGVyc2VjdGluZy5cbiAgc2VsZWN0VG9OZXh0V29yZEJvdW5kYXJ5OiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9OZXh0V29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBFeHBhbmQgc2VsZWN0aW9ucyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBuZXh0IHdvcmQuXG4gICNcbiAgIyBPcGVyYXRlcyBvbiBhbGwgc2VsZWN0aW9ucy4gTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBuZXh0XG4gICMgd29yZCB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICBzZWxlY3RUb0JlZ2lubmluZ09mTmV4dFdvcmQ6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb0JlZ2lubmluZ09mTmV4dFdvcmQoKVxuXG4gICMgRXh0ZW5kZWQ6IEV4cGFuZCBzZWxlY3Rpb25zIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHQgcGFyYWdyYXBoLlxuICAjXG4gICMgT3BlcmF0ZXMgb24gYWxsIHNlbGVjdGlvbnMuIE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbmV4dFxuICAjIHBhcmFncmFwaCB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICBzZWxlY3RUb0JlZ2lubmluZ09mTmV4dFBhcmFncmFwaDogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoKClcblxuICAjIEV4dGVuZGVkOiBFeHBhbmQgc2VsZWN0aW9ucyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBuZXh0IHBhcmFncmFwaC5cbiAgI1xuICAjIE9wZXJhdGVzIG9uIGFsbCBzZWxlY3Rpb25zLiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHRcbiAgIyBwYXJhZ3JhcGggd2hpbGUgcHJlc2VydmluZyB0aGUgc2VsZWN0aW9uJ3MgdGFpbCBwb3NpdGlvbi5cbiAgc2VsZWN0VG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvQmVnaW5uaW5nT2ZQcmV2aW91c1BhcmFncmFwaCgpXG5cbiAgIyBFeHRlbmRlZDogU2VsZWN0IHRoZSByYW5nZSBvZiB0aGUgZ2l2ZW4gbWFya2VyIGlmIGl0IGlzIHZhbGlkLlxuICAjXG4gICMgKiBgbWFya2VyYCBBIHtEaXNwbGF5TWFya2VyfVxuICAjXG4gICMgUmV0dXJucyB0aGUgc2VsZWN0ZWQge1JhbmdlfSBvciBgdW5kZWZpbmVkYCBpZiB0aGUgbWFya2VyIGlzIGludmFsaWQuXG4gIHNlbGVjdE1hcmtlcjogKG1hcmtlcikgLT5cbiAgICBpZiBtYXJrZXIuaXNWYWxpZCgpXG4gICAgICByYW5nZSA9IG1hcmtlci5nZXRCdWZmZXJSYW5nZSgpXG4gICAgICBAc2V0U2VsZWN0ZWRCdWZmZXJSYW5nZShyYW5nZSlcbiAgICAgIHJhbmdlXG5cbiAgIyBFeHRlbmRlZDogR2V0IHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIHtTZWxlY3Rpb259LlxuICAjXG4gICMgUmV0dXJucyBhIHtTZWxlY3Rpb259LlxuICBnZXRMYXN0U2VsZWN0aW9uOiAtPlxuICAgIEBjcmVhdGVMYXN0U2VsZWN0aW9uSWZOZWVkZWQoKVxuICAgIF8ubGFzdChAc2VsZWN0aW9ucylcblxuICBnZXRTZWxlY3Rpb25BdFNjcmVlblBvc2l0aW9uOiAocG9zaXRpb24pIC0+XG4gICAgbWFya2VycyA9IEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIuZmluZE1hcmtlcnMoY29udGFpbnNTY3JlZW5Qb3NpdGlvbjogcG9zaXRpb24pXG4gICAgaWYgbWFya2Vycy5sZW5ndGggPiAwXG4gICAgICBAY3Vyc29yc0J5TWFya2VySWQuZ2V0KG1hcmtlcnNbMF0uaWQpLnNlbGVjdGlvblxuXG4gICMgRXh0ZW5kZWQ6IEdldCBjdXJyZW50IHtTZWxlY3Rpb259cy5cbiAgI1xuICAjIFJldHVybnM6IEFuIHtBcnJheX0gb2Yge1NlbGVjdGlvbn1zLlxuICBnZXRTZWxlY3Rpb25zOiAtPlxuICAgIEBjcmVhdGVMYXN0U2VsZWN0aW9uSWZOZWVkZWQoKVxuICAgIEBzZWxlY3Rpb25zLnNsaWNlKClcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIHtTZWxlY3Rpb259cywgb3JkZXJlZCBieSB0aGVpciBwb3NpdGlvbiBpbiB0aGUgYnVmZmVyXG4gICMgaW5zdGVhZCBvZiB0aGUgb3JkZXIgaW4gd2hpY2ggdGhleSB3ZXJlIGFkZGVkLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtTZWxlY3Rpb259cy5cbiAgZ2V0U2VsZWN0aW9uc09yZGVyZWRCeUJ1ZmZlclBvc2l0aW9uOiAtPlxuICAgIEBnZXRTZWxlY3Rpb25zKCkuc29ydCAoYSwgYikgLT4gYS5jb21wYXJlKGIpXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIGlmIGEgZ2l2ZW4gcmFuZ2UgaW4gYnVmZmVyIGNvb3JkaW5hdGVzIGludGVyc2VjdHMgYVxuICAjIHNlbGVjdGlvbi5cbiAgI1xuICAjICogYGJ1ZmZlclJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9LlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgc2VsZWN0aW9uSW50ZXJzZWN0c0J1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UpIC0+XG4gICAgXy5hbnkgQGdldFNlbGVjdGlvbnMoKSwgKHNlbGVjdGlvbikgLT5cbiAgICAgIHNlbGVjdGlvbi5pbnRlcnNlY3RzQnVmZmVyUmFuZ2UoYnVmZmVyUmFuZ2UpXG5cbiAgIyBTZWxlY3Rpb25zIFByaXZhdGVcblxuICAjIEFkZCBhIHNpbWlsYXJseS1zaGFwZWQgc2VsZWN0aW9uIHRvIHRoZSBuZXh0IGVsaWdpYmxlIGxpbmUgYmVsb3dcbiAgIyBlYWNoIHNlbGVjdGlvbi5cbiAgI1xuICAjIE9wZXJhdGVzIG9uIGFsbCBzZWxlY3Rpb25zLiBJZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBhZGRzIGFuIGVtcHR5XG4gICMgc2VsZWN0aW9uIHRvIHRoZSBuZXh0IGZvbGxvd2luZyBub24tZW1wdHkgbGluZSBhcyBjbG9zZSB0byB0aGUgY3VycmVudFxuICAjIHNlbGVjdGlvbidzIGNvbHVtbiBhcyBwb3NzaWJsZS4gSWYgdGhlIHNlbGVjdGlvbiBpcyBub24tZW1wdHksIGFkZHMgYVxuICAjIHNlbGVjdGlvbiB0byB0aGUgbmV4dCBsaW5lIHRoYXQgaXMgbG9uZyBlbm91Z2ggZm9yIGEgbm9uLWVtcHR5IHNlbGVjdGlvblxuICAjIHN0YXJ0aW5nIGF0IHRoZSBzYW1lIGNvbHVtbiBhcyB0aGUgY3VycmVudCBzZWxlY3Rpb24gdG8gYmUgYWRkZWQgdG8gaXQuXG4gIGFkZFNlbGVjdGlvbkJlbG93OiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uYWRkU2VsZWN0aW9uQmVsb3coKVxuXG4gICMgQWRkIGEgc2ltaWxhcmx5LXNoYXBlZCBzZWxlY3Rpb24gdG8gdGhlIG5leHQgZWxpZ2libGUgbGluZSBhYm92ZVxuICAjIGVhY2ggc2VsZWN0aW9uLlxuICAjXG4gICMgT3BlcmF0ZXMgb24gYWxsIHNlbGVjdGlvbnMuIElmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGFkZHMgYW4gZW1wdHlcbiAgIyBzZWxlY3Rpb24gdG8gdGhlIG5leHQgcHJlY2VkaW5nIG5vbi1lbXB0eSBsaW5lIGFzIGNsb3NlIHRvIHRoZSBjdXJyZW50XG4gICMgc2VsZWN0aW9uJ3MgY29sdW1uIGFzIHBvc3NpYmxlLiBJZiB0aGUgc2VsZWN0aW9uIGlzIG5vbi1lbXB0eSwgYWRkcyBhXG4gICMgc2VsZWN0aW9uIHRvIHRoZSBuZXh0IGxpbmUgdGhhdCBpcyBsb25nIGVub3VnaCBmb3IgYSBub24tZW1wdHkgc2VsZWN0aW9uXG4gICMgc3RhcnRpbmcgYXQgdGhlIHNhbWUgY29sdW1uIGFzIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB0byBiZSBhZGRlZCB0byBpdC5cbiAgYWRkU2VsZWN0aW9uQWJvdmU6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNCYWNrd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uYWRkU2VsZWN0aW9uQWJvdmUoKVxuXG4gICMgQ2FsbHMgdGhlIGdpdmVuIGZ1bmN0aW9uIHdpdGggZWFjaCBzZWxlY3Rpb24sIHRoZW4gbWVyZ2VzIHNlbGVjdGlvbnNcbiAgZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQ6IChmbikgLT5cbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zID0+XG4gICAgICBmbihzZWxlY3Rpb24pIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnMoKVxuICAgICAgcmV0dXJuXG5cbiAgIyBDYWxscyB0aGUgZ2l2ZW4gZnVuY3Rpb24gd2l0aCBlYWNoIHNlbGVjdGlvbiwgdGhlbiBtZXJnZXMgc2VsZWN0aW9ucyBpbiB0aGVcbiAgIyByZXZlcnNlZCBvcmllbnRhdGlvblxuICBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQ6IChmbikgLT5cbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zIHJldmVyc2VkOiB0cnVlLCA9PlxuICAgICAgZm4oc2VsZWN0aW9uKSBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcbiAgICAgIHJldHVyblxuXG4gIGZpbmFsaXplU2VsZWN0aW9uczogLT5cbiAgICBzZWxlY3Rpb24uZmluYWxpemUoKSBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcbiAgICByZXR1cm5cblxuICBzZWxlY3Rpb25zRm9yU2NyZWVuUm93czogKHN0YXJ0Um93LCBlbmRSb3cpIC0+XG4gICAgQGdldFNlbGVjdGlvbnMoKS5maWx0ZXIgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLmludGVyc2VjdHNTY3JlZW5Sb3dSYW5nZShzdGFydFJvdywgZW5kUm93KVxuXG4gICMgTWVyZ2VzIGludGVyc2VjdGluZyBzZWxlY3Rpb25zLiBJZiBwYXNzZWQgYSBmdW5jdGlvbiwgaXQgZXhlY3V0ZXNcbiAgIyB0aGUgZnVuY3Rpb24gd2l0aCBtZXJnaW5nIHN1cHByZXNzZWQsIHRoZW4gbWVyZ2VzIGludGVyc2VjdGluZyBzZWxlY3Rpb25zXG4gICMgYWZ0ZXJ3YXJkLlxuICBtZXJnZUludGVyc2VjdGluZ1NlbGVjdGlvbnM6IChhcmdzLi4uKSAtPlxuICAgIEBtZXJnZVNlbGVjdGlvbnMgYXJncy4uLiwgKHByZXZpb3VzU2VsZWN0aW9uLCBjdXJyZW50U2VsZWN0aW9uKSAtPlxuICAgICAgZXhjbHVzaXZlID0gbm90IGN1cnJlbnRTZWxlY3Rpb24uaXNFbXB0eSgpIGFuZCBub3QgcHJldmlvdXNTZWxlY3Rpb24uaXNFbXB0eSgpXG5cbiAgICAgIHByZXZpb3VzU2VsZWN0aW9uLmludGVyc2VjdHNXaXRoKGN1cnJlbnRTZWxlY3Rpb24sIGV4Y2x1c2l2ZSlcblxuICBtZXJnZVNlbGVjdGlvbnNPblNhbWVSb3dzOiAoYXJncy4uLikgLT5cbiAgICBAbWVyZ2VTZWxlY3Rpb25zIGFyZ3MuLi4sIChwcmV2aW91c1NlbGVjdGlvbiwgY3VycmVudFNlbGVjdGlvbikgLT5cbiAgICAgIHNjcmVlblJhbmdlID0gY3VycmVudFNlbGVjdGlvbi5nZXRTY3JlZW5SYW5nZSgpXG5cbiAgICAgIHByZXZpb3VzU2VsZWN0aW9uLmludGVyc2VjdHNTY3JlZW5Sb3dSYW5nZShzY3JlZW5SYW5nZS5zdGFydC5yb3csIHNjcmVlblJhbmdlLmVuZC5yb3cpXG5cbiAgYXZvaWRNZXJnaW5nU2VsZWN0aW9uczogKGFyZ3MuLi4pIC0+XG4gICAgQG1lcmdlU2VsZWN0aW9ucyBhcmdzLi4uLCAtPiBmYWxzZVxuXG4gIG1lcmdlU2VsZWN0aW9uczogKGFyZ3MuLi4pIC0+XG4gICAgbWVyZ2VQcmVkaWNhdGUgPSBhcmdzLnBvcCgpXG4gICAgZm4gPSBhcmdzLnBvcCgpIGlmIF8uaXNGdW5jdGlvbihfLmxhc3QoYXJncykpXG4gICAgb3B0aW9ucyA9IGFyZ3MucG9wKCkgPyB7fVxuXG4gICAgcmV0dXJuIGZuPygpIGlmIEBzdXBwcmVzc1NlbGVjdGlvbk1lcmdpbmdcblxuICAgIGlmIGZuP1xuICAgICAgQHN1cHByZXNzU2VsZWN0aW9uTWVyZ2luZyA9IHRydWVcbiAgICAgIHJlc3VsdCA9IGZuKClcbiAgICAgIEBzdXBwcmVzc1NlbGVjdGlvbk1lcmdpbmcgPSBmYWxzZVxuXG4gICAgcmVkdWNlciA9IChkaXNqb2ludFNlbGVjdGlvbnMsIHNlbGVjdGlvbikgLT5cbiAgICAgIGFkamFjZW50U2VsZWN0aW9uID0gXy5sYXN0KGRpc2pvaW50U2VsZWN0aW9ucylcbiAgICAgIGlmIG1lcmdlUHJlZGljYXRlKGFkamFjZW50U2VsZWN0aW9uLCBzZWxlY3Rpb24pXG4gICAgICAgIGFkamFjZW50U2VsZWN0aW9uLm1lcmdlKHNlbGVjdGlvbiwgb3B0aW9ucylcbiAgICAgICAgZGlzam9pbnRTZWxlY3Rpb25zXG4gICAgICBlbHNlXG4gICAgICAgIGRpc2pvaW50U2VsZWN0aW9ucy5jb25jYXQoW3NlbGVjdGlvbl0pXG5cbiAgICBbaGVhZCwgdGFpbC4uLl0gPSBAZ2V0U2VsZWN0aW9uc09yZGVyZWRCeUJ1ZmZlclBvc2l0aW9uKClcbiAgICBfLnJlZHVjZSh0YWlsLCByZWR1Y2VyLCBbaGVhZF0pXG4gICAgcmV0dXJuIHJlc3VsdCBpZiBmbj9cblxuICAjIEFkZCBhIHtTZWxlY3Rpb259IGJhc2VkIG9uIHRoZSBnaXZlbiB7RGlzcGxheU1hcmtlcn0uXG4gICNcbiAgIyAqIGBtYXJrZXJgIFRoZSB7RGlzcGxheU1hcmtlcn0gdG8gaGlnaGxpZ2h0XG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSB0aGF0IHBlcnRhaW5zIHRvIHRoZSB7U2VsZWN0aW9ufSBjb25zdHJ1Y3Rvci5cbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7U2VsZWN0aW9ufS5cbiAgYWRkU2VsZWN0aW9uOiAobWFya2VyLCBvcHRpb25zPXt9KSAtPlxuICAgIGN1cnNvciA9IEBhZGRDdXJzb3IobWFya2VyKVxuICAgIHNlbGVjdGlvbiA9IG5ldyBTZWxlY3Rpb24oT2JqZWN0LmFzc2lnbih7ZWRpdG9yOiB0aGlzLCBtYXJrZXIsIGN1cnNvcn0sIG9wdGlvbnMpKVxuICAgIEBzZWxlY3Rpb25zLnB1c2goc2VsZWN0aW9uKVxuICAgIHNlbGVjdGlvbkJ1ZmZlclJhbmdlID0gc2VsZWN0aW9uLmdldEJ1ZmZlclJhbmdlKClcbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zKHByZXNlcnZlRm9sZHM6IG9wdGlvbnMucHJlc2VydmVGb2xkcylcblxuICAgIGlmIHNlbGVjdGlvbi5kZXN0cm95ZWRcbiAgICAgIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnMoKVxuICAgICAgICBpZiBzZWxlY3Rpb24uaW50ZXJzZWN0c0J1ZmZlclJhbmdlKHNlbGVjdGlvbkJ1ZmZlclJhbmdlKVxuICAgICAgICAgIHJldHVybiBzZWxlY3Rpb25cbiAgICBlbHNlXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtYWRkLWN1cnNvcicsIGN1cnNvclxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWFkZC1zZWxlY3Rpb24nLCBzZWxlY3Rpb25cbiAgICAgIHNlbGVjdGlvblxuXG4gICMgUmVtb3ZlIHRoZSBnaXZlbiBzZWxlY3Rpb24uXG4gIHJlbW92ZVNlbGVjdGlvbjogKHNlbGVjdGlvbikgLT5cbiAgICBfLnJlbW92ZShAY3Vyc29ycywgc2VsZWN0aW9uLmN1cnNvcilcbiAgICBfLnJlbW92ZShAc2VsZWN0aW9ucywgc2VsZWN0aW9uKVxuICAgIEBjdXJzb3JzQnlNYXJrZXJJZC5kZWxldGUoc2VsZWN0aW9uLmN1cnNvci5tYXJrZXIuaWQpXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXJlbW92ZS1jdXJzb3InLCBzZWxlY3Rpb24uY3Vyc29yXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXJlbW92ZS1zZWxlY3Rpb24nLCBzZWxlY3Rpb25cblxuICAjIFJlZHVjZSBvbmUgb3IgbW9yZSBzZWxlY3Rpb25zIHRvIGEgc2luZ2xlIGVtcHR5IHNlbGVjdGlvbiBiYXNlZCBvbiB0aGUgbW9zdFxuICAjIHJlY2VudGx5IGFkZGVkIGN1cnNvci5cbiAgY2xlYXJTZWxlY3Rpb25zOiAob3B0aW9ucykgLT5cbiAgICBAY29uc29saWRhdGVTZWxlY3Rpb25zKClcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmNsZWFyKG9wdGlvbnMpXG5cbiAgIyBSZWR1Y2UgbXVsdGlwbGUgc2VsZWN0aW9ucyB0byB0aGUgbGVhc3QgcmVjZW50bHkgYWRkZWQgc2VsZWN0aW9uLlxuICBjb25zb2xpZGF0ZVNlbGVjdGlvbnM6IC0+XG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3Rpb25zKClcbiAgICBpZiBzZWxlY3Rpb25zLmxlbmd0aCA+IDFcbiAgICAgIHNlbGVjdGlvbi5kZXN0cm95KCkgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zWzEuLi4oc2VsZWN0aW9ucy5sZW5ndGgpXVxuICAgICAgc2VsZWN0aW9uc1swXS5hdXRvc2Nyb2xsKGNlbnRlcjogdHJ1ZSlcbiAgICAgIHRydWVcbiAgICBlbHNlXG4gICAgICBmYWxzZVxuXG4gICMgQ2FsbGVkIGJ5IHRoZSBzZWxlY3Rpb25cbiAgc2VsZWN0aW9uUmFuZ2VDaGFuZ2VkOiAoZXZlbnQpIC0+XG4gICAgQGNvbXBvbmVudD8uZGlkQ2hhbmdlU2VsZWN0aW9uUmFuZ2UoKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2Utc2VsZWN0aW9uLXJhbmdlJywgZXZlbnRcblxuICBjcmVhdGVMYXN0U2VsZWN0aW9uSWZOZWVkZWQ6IC0+XG4gICAgaWYgQHNlbGVjdGlvbnMubGVuZ3RoIGlzIDBcbiAgICAgIEBhZGRTZWxlY3Rpb25Gb3JCdWZmZXJSYW5nZShbWzAsIDBdLCBbMCwgMF1dLCBhdXRvc2Nyb2xsOiBmYWxzZSwgcHJlc2VydmVGb2xkczogdHJ1ZSlcblxuICAjIyNcbiAgU2VjdGlvbjogU2VhcmNoaW5nIGFuZCBSZXBsYWNpbmdcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IFNjYW4gcmVndWxhciBleHByZXNzaW9uIG1hdGNoZXMgaW4gdGhlIGVudGlyZSBidWZmZXIsIGNhbGxpbmcgdGhlXG4gICMgZ2l2ZW4gaXRlcmF0b3IgZnVuY3Rpb24gb24gZWFjaCBtYXRjaC5cbiAgI1xuICAjIGA6OnNjYW5gIGZ1bmN0aW9ucyBhcyB0aGUgcmVwbGFjZSBtZXRob2QgYXMgd2VsbCB2aWEgdGhlIGByZXBsYWNlYFxuICAjXG4gICMgSWYgeW91J3JlIHByb2dyYW1tYXRpY2FsbHkgbW9kaWZ5aW5nIHRoZSByZXN1bHRzLCB5b3UgbWF5IHdhbnQgdG8gdHJ5XG4gICMgezo6YmFja3dhcmRzU2NhbkluQnVmZmVyUmFuZ2V9IHRvIGF2b2lkIHRyaXBwaW5nIG92ZXIgeW91ciBvd24gY2hhbmdlcy5cbiAgI1xuICAjICogYHJlZ2V4YCBBIHtSZWdFeHB9IHRvIHNlYXJjaCBmb3IuXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgbGVhZGluZ0NvbnRleHRMaW5lQ291bnRgIHtOdW1iZXJ9IGRlZmF1bHQgYDBgOyBUaGUgbnVtYmVyIG9mIGxpbmVzXG4gICMgICAgICBiZWZvcmUgdGhlIG1hdGNoZWQgbGluZSB0byBpbmNsdWRlIGluIHRoZSByZXN1bHRzIG9iamVjdC5cbiAgIyAgICogYHRyYWlsaW5nQ29udGV4dExpbmVDb3VudGAge051bWJlcn0gZGVmYXVsdCBgMGA7IFRoZSBudW1iZXIgb2YgbGluZXNcbiAgIyAgICAgIGFmdGVyIHRoZSBtYXRjaGVkIGxpbmUgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0cyBvYmplY3QuXG4gICMgKiBgaXRlcmF0b3JgIEEge0Z1bmN0aW9ufSB0aGF0J3MgY2FsbGVkIG9uIGVhY2ggbWF0Y2hcbiAgIyAgICogYG9iamVjdGAge09iamVjdH1cbiAgIyAgICAgKiBgbWF0Y2hgIFRoZSBjdXJyZW50IHJlZ3VsYXIgZXhwcmVzc2lvbiBtYXRjaC5cbiAgIyAgICAgKiBgbWF0Y2hUZXh0YCBBIHtTdHJpbmd9IHdpdGggdGhlIHRleHQgb2YgdGhlIG1hdGNoLlxuICAjICAgICAqIGByYW5nZWAgVGhlIHtSYW5nZX0gb2YgdGhlIG1hdGNoLlxuICAjICAgICAqIGBzdG9wYCBDYWxsIHRoaXMge0Z1bmN0aW9ufSB0byB0ZXJtaW5hdGUgdGhlIHNjYW4uXG4gICMgICAgICogYHJlcGxhY2VgIENhbGwgdGhpcyB7RnVuY3Rpb259IHdpdGggYSB7U3RyaW5nfSB0byByZXBsYWNlIHRoZSBtYXRjaC5cbiAgc2NhbjogKHJlZ2V4LCBvcHRpb25zPXt9LCBpdGVyYXRvcikgLT5cbiAgICBpZiBfLmlzRnVuY3Rpb24ob3B0aW9ucylcbiAgICAgIGl0ZXJhdG9yID0gb3B0aW9uc1xuICAgICAgb3B0aW9ucyA9IHt9XG5cbiAgICBAYnVmZmVyLnNjYW4ocmVnZXgsIG9wdGlvbnMsIGl0ZXJhdG9yKVxuXG4gICMgRXNzZW50aWFsOiBTY2FuIHJlZ3VsYXIgZXhwcmVzc2lvbiBtYXRjaGVzIGluIGEgZ2l2ZW4gcmFuZ2UsIGNhbGxpbmcgdGhlIGdpdmVuXG4gICMgaXRlcmF0b3IgZnVuY3Rpb24gb24gZWFjaCBtYXRjaC5cbiAgI1xuICAjICogYHJlZ2V4YCBBIHtSZWdFeHB9IHRvIHNlYXJjaCBmb3IuXG4gICMgKiBgcmFuZ2VgIEEge1JhbmdlfSBpbiB3aGljaCB0byBzZWFyY2guXG4gICMgKiBgaXRlcmF0b3JgIEEge0Z1bmN0aW9ufSB0aGF0J3MgY2FsbGVkIG9uIGVhY2ggbWF0Y2ggd2l0aCBhbiB7T2JqZWN0fVxuICAjICAgY29udGFpbmluZyB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBtYXRjaGAgVGhlIGN1cnJlbnQgcmVndWxhciBleHByZXNzaW9uIG1hdGNoLlxuICAjICAgKiBgbWF0Y2hUZXh0YCBBIHtTdHJpbmd9IHdpdGggdGhlIHRleHQgb2YgdGhlIG1hdGNoLlxuICAjICAgKiBgcmFuZ2VgIFRoZSB7UmFuZ2V9IG9mIHRoZSBtYXRjaC5cbiAgIyAgICogYHN0b3BgIENhbGwgdGhpcyB7RnVuY3Rpb259IHRvIHRlcm1pbmF0ZSB0aGUgc2Nhbi5cbiAgIyAgICogYHJlcGxhY2VgIENhbGwgdGhpcyB7RnVuY3Rpb259IHdpdGggYSB7U3RyaW5nfSB0byByZXBsYWNlIHRoZSBtYXRjaC5cbiAgc2NhbkluQnVmZmVyUmFuZ2U6IChyZWdleCwgcmFuZ2UsIGl0ZXJhdG9yKSAtPiBAYnVmZmVyLnNjYW5JblJhbmdlKHJlZ2V4LCByYW5nZSwgaXRlcmF0b3IpXG5cbiAgIyBFc3NlbnRpYWw6IFNjYW4gcmVndWxhciBleHByZXNzaW9uIG1hdGNoZXMgaW4gYSBnaXZlbiByYW5nZSBpbiByZXZlcnNlIG9yZGVyLFxuICAjIGNhbGxpbmcgdGhlIGdpdmVuIGl0ZXJhdG9yIGZ1bmN0aW9uIG9uIGVhY2ggbWF0Y2guXG4gICNcbiAgIyAqIGByZWdleGAgQSB7UmVnRXhwfSB0byBzZWFyY2ggZm9yLlxuICAjICogYHJhbmdlYCBBIHtSYW5nZX0gaW4gd2hpY2ggdG8gc2VhcmNoLlxuICAjICogYGl0ZXJhdG9yYCBBIHtGdW5jdGlvbn0gdGhhdCdzIGNhbGxlZCBvbiBlYWNoIG1hdGNoIHdpdGggYW4ge09iamVjdH1cbiAgIyAgIGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbWF0Y2hgIFRoZSBjdXJyZW50IHJlZ3VsYXIgZXhwcmVzc2lvbiBtYXRjaC5cbiAgIyAgICogYG1hdGNoVGV4dGAgQSB7U3RyaW5nfSB3aXRoIHRoZSB0ZXh0IG9mIHRoZSBtYXRjaC5cbiAgIyAgICogYHJhbmdlYCBUaGUge1JhbmdlfSBvZiB0aGUgbWF0Y2guXG4gICMgICAqIGBzdG9wYCBDYWxsIHRoaXMge0Z1bmN0aW9ufSB0byB0ZXJtaW5hdGUgdGhlIHNjYW4uXG4gICMgICAqIGByZXBsYWNlYCBDYWxsIHRoaXMge0Z1bmN0aW9ufSB3aXRoIGEge1N0cmluZ30gdG8gcmVwbGFjZSB0aGUgbWF0Y2guXG4gIGJhY2t3YXJkc1NjYW5JbkJ1ZmZlclJhbmdlOiAocmVnZXgsIHJhbmdlLCBpdGVyYXRvcikgLT4gQGJ1ZmZlci5iYWNrd2FyZHNTY2FuSW5SYW5nZShyZWdleCwgcmFuZ2UsIGl0ZXJhdG9yKVxuXG4gICMjI1xuICBTZWN0aW9uOiBUYWIgQmVoYXZpb3JcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgYSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHNvZnRUYWJzIGFyZSBlbmFibGVkIGZvciB0aGlzXG4gICMgZWRpdG9yLlxuICBnZXRTb2Z0VGFiczogLT4gQHNvZnRUYWJzXG5cbiAgIyBFc3NlbnRpYWw6IEVuYWJsZSBvciBkaXNhYmxlIHNvZnQgdGFicyBmb3IgdGhpcyBlZGl0b3IuXG4gICNcbiAgIyAqIGBzb2Z0VGFic2AgQSB7Qm9vbGVhbn1cbiAgc2V0U29mdFRhYnM6IChAc29mdFRhYnMpIC0+IEB1cGRhdGUoe0Bzb2Z0VGFic30pXG5cbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciBhdG9taWMgc29mdCB0YWJzIGFyZSBlbmFibGVkIGZvciB0aGlzIGVkaXRvci5cbiAgaGFzQXRvbWljU29mdFRhYnM6IC0+IEBkaXNwbGF5TGF5ZXIuYXRvbWljU29mdFRhYnNcblxuICAjIEVzc2VudGlhbDogVG9nZ2xlIHNvZnQgdGFicyBmb3IgdGhpcyBlZGl0b3JcbiAgdG9nZ2xlU29mdFRhYnM6IC0+IEBzZXRTb2Z0VGFicyhub3QgQGdldFNvZnRUYWJzKCkpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgb24tc2NyZWVuIGxlbmd0aCBvZiB0YWIgY2hhcmFjdGVycy5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfS5cbiAgZ2V0VGFiTGVuZ3RoOiAtPiBAdG9rZW5pemVkQnVmZmVyLmdldFRhYkxlbmd0aCgpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgb24tc2NyZWVuIGxlbmd0aCBvZiB0YWIgY2hhcmFjdGVycy4gU2V0dGluZyB0aGlzIHRvIGFcbiAgIyB7TnVtYmVyfSBUaGlzIHdpbGwgb3ZlcnJpZGUgdGhlIGBlZGl0b3IudGFiTGVuZ3RoYCBzZXR0aW5nLlxuICAjXG4gICMgKiBgdGFiTGVuZ3RoYCB7TnVtYmVyfSBsZW5ndGggb2YgYSBzaW5nbGUgdGFiLiBTZXR0aW5nIHRvIGBudWxsYCB3aWxsXG4gICMgICBmYWxsYmFjayB0byB1c2luZyB0aGUgYGVkaXRvci50YWJMZW5ndGhgIGNvbmZpZyBzZXR0aW5nXG4gIHNldFRhYkxlbmd0aDogKHRhYkxlbmd0aCkgLT4gQHVwZGF0ZSh7dGFiTGVuZ3RofSlcblxuICAjIFJldHVybnMgYW4ge09iamVjdH0gcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IGludmlzaWJsZSBjaGFyYWN0ZXJcbiAgIyBzdWJzdGl0dXRpb25zIGZvciB0aGlzIGVkaXRvci4gU2VlIHs6OnNldEludmlzaWJsZXN9LlxuICBnZXRJbnZpc2libGVzOiAtPlxuICAgIGlmIG5vdCBAbWluaSBhbmQgQHNob3dJbnZpc2libGVzIGFuZCBAaW52aXNpYmxlcz9cbiAgICAgIEBpbnZpc2libGVzXG4gICAgZWxzZVxuICAgICAge31cblxuICBkb2VzU2hvd0luZGVudEd1aWRlOiAtPiBAc2hvd0luZGVudEd1aWRlIGFuZCBub3QgQG1pbmlcblxuICBnZXRTb2Z0V3JhcEhhbmdpbmdJbmRlbnRMZW5ndGg6IC0+IEBkaXNwbGF5TGF5ZXIuc29mdFdyYXBIYW5naW5nSW5kZW50XG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIGlmIHRoZSBidWZmZXIgdXNlcyBoYXJkIG9yIHNvZnQgdGFicy5cbiAgI1xuICAjIFJldHVybnMgYHRydWVgIGlmIHRoZSBmaXJzdCBub24tY29tbWVudCBsaW5lIHdpdGggbGVhZGluZyB3aGl0ZXNwYWNlIHN0YXJ0c1xuICAjIHdpdGggYSBzcGFjZSBjaGFyYWN0ZXIuIFJldHVybnMgYGZhbHNlYCBpZiBpdCBzdGFydHMgd2l0aCBhIGhhcmQgdGFiIChgXFx0YCkuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IG9yIHVuZGVmaW5lZCBpZiBubyBub24tY29tbWVudCBsaW5lcyBoYWQgbGVhZGluZ1xuICAjIHdoaXRlc3BhY2UuXG4gIHVzZXNTb2Z0VGFiczogLT5cbiAgICBmb3IgYnVmZmVyUm93IGluIFswLi5NYXRoLm1pbigxMDAwLCBAYnVmZmVyLmdldExhc3RSb3coKSldXG4gICAgICBjb250aW51ZSBpZiBAdG9rZW5pemVkQnVmZmVyLnRva2VuaXplZExpbmVzW2J1ZmZlclJvd10/LmlzQ29tbWVudCgpXG5cbiAgICAgIGxpbmUgPSBAYnVmZmVyLmxpbmVGb3JSb3coYnVmZmVyUm93KVxuICAgICAgcmV0dXJuIHRydWUgIGlmIGxpbmVbMF0gaXMgJyAnXG4gICAgICByZXR1cm4gZmFsc2UgaWYgbGluZVswXSBpcyAnXFx0J1xuXG4gICAgdW5kZWZpbmVkXG5cbiAgIyBFeHRlbmRlZDogR2V0IHRoZSB0ZXh0IHJlcHJlc2VudGluZyBhIHNpbmdsZSBsZXZlbCBvZiBpbmRlbnQuXG4gICNcbiAgIyBJZiBzb2Z0IHRhYnMgYXJlIGVuYWJsZWQsIHRoZSB0ZXh0IGlzIGNvbXBvc2VkIG9mIE4gc3BhY2VzLCB3aGVyZSBOIGlzIHRoZVxuICAjIHRhYiBsZW5ndGguIE90aGVyd2lzZSB0aGUgdGV4dCBpcyBhIHRhYiBjaGFyYWN0ZXIgKGBcXHRgKS5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfS5cbiAgZ2V0VGFiVGV4dDogLT4gQGJ1aWxkSW5kZW50U3RyaW5nKDEpXG5cbiAgIyBJZiBzb2Z0IHRhYnMgYXJlIGVuYWJsZWQsIGNvbnZlcnQgYWxsIGhhcmQgdGFicyB0byBzb2Z0IHRhYnMgaW4gdGhlIGdpdmVuXG4gICMge1JhbmdlfS5cbiAgbm9ybWFsaXplVGFic0luQnVmZmVyUmFuZ2U6IChidWZmZXJSYW5nZSkgLT5cbiAgICByZXR1cm4gdW5sZXNzIEBnZXRTb2Z0VGFicygpXG4gICAgQHNjYW5JbkJ1ZmZlclJhbmdlIC9cXHQvZywgYnVmZmVyUmFuZ2UsICh7cmVwbGFjZX0pID0+IHJlcGxhY2UoQGdldFRhYlRleHQoKSlcblxuICAjIyNcbiAgU2VjdGlvbjogU29mdCBXcmFwIEJlaGF2aW9yXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBEZXRlcm1pbmUgd2hldGhlciBsaW5lcyBpbiB0aGlzIGVkaXRvciBhcmUgc29mdC13cmFwcGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNTb2Z0V3JhcHBlZDogLT4gQHNvZnRXcmFwcGVkXG5cbiAgIyBFc3NlbnRpYWw6IEVuYWJsZSBvciBkaXNhYmxlIHNvZnQgd3JhcHBpbmcgZm9yIHRoaXMgZWRpdG9yLlxuICAjXG4gICMgKiBgc29mdFdyYXBwZWRgIEEge0Jvb2xlYW59XG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBzZXRTb2Z0V3JhcHBlZDogKHNvZnRXcmFwcGVkKSAtPlxuICAgIEB1cGRhdGUoe3NvZnRXcmFwcGVkfSlcbiAgICBAaXNTb2Z0V3JhcHBlZCgpXG5cbiAgZ2V0UHJlZmVycmVkTGluZUxlbmd0aDogLT4gQHByZWZlcnJlZExpbmVMZW5ndGhcblxuICAjIEVzc2VudGlhbDogVG9nZ2xlIHNvZnQgd3JhcHBpbmcgZm9yIHRoaXMgZWRpdG9yXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICB0b2dnbGVTb2Z0V3JhcHBlZDogLT4gQHNldFNvZnRXcmFwcGVkKG5vdCBAaXNTb2Z0V3JhcHBlZCgpKVxuXG4gICMgRXNzZW50aWFsOiBHZXRzIHRoZSBjb2x1bW4gYXQgd2hpY2ggY29sdW1uIHdpbGwgc29mdCB3cmFwXG4gIGdldFNvZnRXcmFwQ29sdW1uOiAtPlxuICAgIGlmIEBpc1NvZnRXcmFwcGVkKCkgYW5kIG5vdCBAbWluaVxuICAgICAgaWYgQHNvZnRXcmFwQXRQcmVmZXJyZWRMaW5lTGVuZ3RoXG4gICAgICAgIE1hdGgubWluKEBnZXRFZGl0b3JXaWR0aEluQ2hhcnMoKSwgQHByZWZlcnJlZExpbmVMZW5ndGgpXG4gICAgICBlbHNlXG4gICAgICAgIEBnZXRFZGl0b3JXaWR0aEluQ2hhcnMoKVxuICAgIGVsc2VcbiAgICAgIE1BWF9TQ1JFRU5fTElORV9MRU5HVEhcblxuICAjIyNcbiAgU2VjdGlvbjogSW5kZW50YXRpb25cbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgaW5kZW50YXRpb24gbGV2ZWwgb2YgdGhlIGdpdmVuIGJ1ZmZlciByb3cuXG4gICNcbiAgIyBEZXRlcm1pbmVzIGhvdyBkZWVwbHkgdGhlIGdpdmVuIHJvdyBpcyBpbmRlbnRlZCBiYXNlZCBvbiB0aGUgc29mdCB0YWJzIGFuZFxuICAjIHRhYiBsZW5ndGggc2V0dGluZ3Mgb2YgdGhpcyBlZGl0b3IuIE5vdGUgdGhhdCBpZiBzb2Z0IHRhYnMgYXJlIGVuYWJsZWQgYW5kXG4gICMgdGhlIHRhYiBsZW5ndGggaXMgMiwgYSByb3cgd2l0aCA0IGxlYWRpbmcgc3BhY2VzIHdvdWxkIGhhdmUgYW4gaW5kZW50YXRpb25cbiAgIyBsZXZlbCBvZiAyLlxuICAjXG4gICMgKiBgYnVmZmVyUm93YCBBIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGJ1ZmZlciByb3cuXG4gICNcbiAgIyBSZXR1cm5zIGEge051bWJlcn0uXG4gIGluZGVudGF0aW9uRm9yQnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIEBpbmRlbnRMZXZlbEZvckxpbmUoQGxpbmVUZXh0Rm9yQnVmZmVyUm93KGJ1ZmZlclJvdykpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgaW5kZW50YXRpb24gbGV2ZWwgZm9yIHRoZSBnaXZlbiBidWZmZXIgcm93LlxuICAjXG4gICMgSW5zZXJ0cyBvciByZW1vdmVzIGhhcmQgdGFicyBvciBzcGFjZXMgYmFzZWQgb24gdGhlIHNvZnQgdGFicyBhbmQgdGFiIGxlbmd0aFxuICAjIHNldHRpbmdzIG9mIHRoaXMgZWRpdG9yIGluIG9yZGVyIHRvIGJyaW5nIGl0IHRvIHRoZSBnaXZlbiBpbmRlbnRhdGlvbiBsZXZlbC5cbiAgIyBOb3RlIHRoYXQgaWYgc29mdCB0YWJzIGFyZSBlbmFibGVkIGFuZCB0aGUgdGFiIGxlbmd0aCBpcyAyLCBhIHJvdyB3aXRoIDRcbiAgIyBsZWFkaW5nIHNwYWNlcyB3b3VsZCBoYXZlIGFuIGluZGVudGF0aW9uIGxldmVsIG9mIDIuXG4gICNcbiAgIyAqIGBidWZmZXJSb3dgIEEge051bWJlcn0gaW5kaWNhdGluZyB0aGUgYnVmZmVyIHJvdy5cbiAgIyAqIGBuZXdMZXZlbGAgQSB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBuZXcgaW5kZW50YXRpb24gbGV2ZWwuXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYHByZXNlcnZlTGVhZGluZ1doaXRlc3BhY2VgIGB0cnVlYCB0byBwcmVzZXJ2ZSBhbnkgd2hpdGVzcGFjZSBhbHJlYWR5IGF0XG4gICMgICAgICB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lIChkZWZhdWx0OiBmYWxzZSkuXG4gIHNldEluZGVudGF0aW9uRm9yQnVmZmVyUm93OiAoYnVmZmVyUm93LCBuZXdMZXZlbCwge3ByZXNlcnZlTGVhZGluZ1doaXRlc3BhY2V9PXt9KSAtPlxuICAgIGlmIHByZXNlcnZlTGVhZGluZ1doaXRlc3BhY2VcbiAgICAgIGVuZENvbHVtbiA9IDBcbiAgICBlbHNlXG4gICAgICBlbmRDb2x1bW4gPSBAbGluZVRleHRGb3JCdWZmZXJSb3coYnVmZmVyUm93KS5tYXRjaCgvXlxccyovKVswXS5sZW5ndGhcbiAgICBuZXdJbmRlbnRTdHJpbmcgPSBAYnVpbGRJbmRlbnRTdHJpbmcobmV3TGV2ZWwpXG4gICAgQGJ1ZmZlci5zZXRUZXh0SW5SYW5nZShbW2J1ZmZlclJvdywgMF0sIFtidWZmZXJSb3csIGVuZENvbHVtbl1dLCBuZXdJbmRlbnRTdHJpbmcpXG5cbiAgIyBFeHRlbmRlZDogSW5kZW50IHJvd3MgaW50ZXJzZWN0aW5nIHNlbGVjdGlvbnMgYnkgb25lIGxldmVsLlxuICBpbmRlbnRTZWxlY3RlZFJvd3M6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uaW5kZW50U2VsZWN0ZWRSb3dzKClcblxuICAjIEV4dGVuZGVkOiBPdXRkZW50IHJvd3MgaW50ZXJzZWN0aW5nIHNlbGVjdGlvbnMgYnkgb25lIGxldmVsLlxuICBvdXRkZW50U2VsZWN0ZWRSb3dzOiAtPlxuICAgIEBtdXRhdGVTZWxlY3RlZFRleHQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLm91dGRlbnRTZWxlY3RlZFJvd3MoKVxuXG4gICMgRXh0ZW5kZWQ6IEdldCB0aGUgaW5kZW50YXRpb24gbGV2ZWwgb2YgdGhlIGdpdmVuIGxpbmUgb2YgdGV4dC5cbiAgI1xuICAjIERldGVybWluZXMgaG93IGRlZXBseSB0aGUgZ2l2ZW4gbGluZSBpcyBpbmRlbnRlZCBiYXNlZCBvbiB0aGUgc29mdCB0YWJzIGFuZFxuICAjIHRhYiBsZW5ndGggc2V0dGluZ3Mgb2YgdGhpcyBlZGl0b3IuIE5vdGUgdGhhdCBpZiBzb2Z0IHRhYnMgYXJlIGVuYWJsZWQgYW5kXG4gICMgdGhlIHRhYiBsZW5ndGggaXMgMiwgYSByb3cgd2l0aCA0IGxlYWRpbmcgc3BhY2VzIHdvdWxkIGhhdmUgYW4gaW5kZW50YXRpb25cbiAgIyBsZXZlbCBvZiAyLlxuICAjXG4gICMgKiBgbGluZWAgQSB7U3RyaW5nfSByZXByZXNlbnRpbmcgYSBsaW5lIG9mIHRleHQuXG4gICNcbiAgIyBSZXR1cm5zIGEge051bWJlcn0uXG4gIGluZGVudExldmVsRm9yTGluZTogKGxpbmUpIC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5pbmRlbnRMZXZlbEZvckxpbmUobGluZSlcblxuICAjIEV4dGVuZGVkOiBJbmRlbnQgcm93cyBpbnRlcnNlY3Rpbmcgc2VsZWN0aW9ucyBiYXNlZCBvbiB0aGUgZ3JhbW1hcidzIHN1Z2dlc3RlZFxuICAjIGluZGVudCBsZXZlbC5cbiAgYXV0b0luZGVudFNlbGVjdGVkUm93czogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5hdXRvSW5kZW50U2VsZWN0ZWRSb3dzKClcblxuICAjIEluZGVudCBhbGwgbGluZXMgaW50ZXJzZWN0aW5nIHNlbGVjdGlvbnMuIFNlZSB7U2VsZWN0aW9uOjppbmRlbnR9IGZvciBtb3JlXG4gICMgaW5mb3JtYXRpb24uXG4gIGluZGVudDogKG9wdGlvbnM9e30pIC0+XG4gICAgb3B0aW9ucy5hdXRvSW5kZW50ID89IEBzaG91bGRBdXRvSW5kZW50KClcbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5pbmRlbnQob3B0aW9ucylcblxuICAjIENvbnN0cnVjdHMgdGhlIHN0cmluZyB1c2VkIGZvciBpbmRlbnRzLlxuICBidWlsZEluZGVudFN0cmluZzogKGxldmVsLCBjb2x1bW49MCkgLT5cbiAgICBpZiBAZ2V0U29mdFRhYnMoKVxuICAgICAgdGFiU3RvcFZpb2xhdGlvbiA9IGNvbHVtbiAlIEBnZXRUYWJMZW5ndGgoKVxuICAgICAgXy5tdWx0aXBseVN0cmluZyhcIiBcIiwgTWF0aC5mbG9vcihsZXZlbCAqIEBnZXRUYWJMZW5ndGgoKSkgLSB0YWJTdG9wVmlvbGF0aW9uKVxuICAgIGVsc2VcbiAgICAgIGV4Y2Vzc1doaXRlc3BhY2UgPSBfLm11bHRpcGx5U3RyaW5nKCcgJywgTWF0aC5yb3VuZCgobGV2ZWwgLSBNYXRoLmZsb29yKGxldmVsKSkgKiBAZ2V0VGFiTGVuZ3RoKCkpKVxuICAgICAgXy5tdWx0aXBseVN0cmluZyhcIlxcdFwiLCBNYXRoLmZsb29yKGxldmVsKSkgKyBleGNlc3NXaGl0ZXNwYWNlXG5cbiAgIyMjXG4gIFNlY3Rpb246IEdyYW1tYXJzXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIGN1cnJlbnQge0dyYW1tYXJ9IG9mIHRoaXMgZWRpdG9yLlxuICBnZXRHcmFtbWFyOiAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIuZ3JhbW1hclxuXG4gICMgRXNzZW50aWFsOiBTZXQgdGhlIGN1cnJlbnQge0dyYW1tYXJ9IG9mIHRoaXMgZWRpdG9yLlxuICAjXG4gICMgQXNzaWduaW5nIGEgZ3JhbW1hciB3aWxsIGNhdXNlIHRoZSBlZGl0b3IgdG8gcmUtdG9rZW5pemUgYmFzZWQgb24gdGhlIG5ld1xuICAjIGdyYW1tYXIuXG4gICNcbiAgIyAqIGBncmFtbWFyYCB7R3JhbW1hcn1cbiAgc2V0R3JhbW1hcjogKGdyYW1tYXIpIC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5zZXRHcmFtbWFyKGdyYW1tYXIpXG5cbiAgIyBSZWxvYWQgdGhlIGdyYW1tYXIgYmFzZWQgb24gdGhlIGZpbGUgbmFtZS5cbiAgcmVsb2FkR3JhbW1hcjogLT5cbiAgICBAdG9rZW5pemVkQnVmZmVyLnJlbG9hZEdyYW1tYXIoKVxuXG4gICMgRXhwZXJpbWVudGFsOiBHZXQgYSBub3RpZmljYXRpb24gd2hlbiBhc3luYyB0b2tlbml6YXRpb24gaXMgY29tcGxldGVkLlxuICBvbkRpZFRva2VuaXplOiAoY2FsbGJhY2spIC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5vbkRpZFRva2VuaXplKGNhbGxiYWNrKVxuXG4gICMjI1xuICBTZWN0aW9uOiBNYW5hZ2luZyBTeW50YXggU2NvcGVzXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIGEge1Njb3BlRGVzY3JpcHRvcn0gdGhhdCBpbmNsdWRlcyB0aGlzIGVkaXRvcidzIGxhbmd1YWdlLlxuICAjIGUuZy4gYFsnLnNvdXJjZS5ydWJ5J11gLCBvciBgWycuc291cmNlLmNvZmZlZSddYC4gWW91IGNhbiB1c2UgdGhpcyB3aXRoXG4gICMge0NvbmZpZzo6Z2V0fSB0byBnZXQgbGFuZ3VhZ2Ugc3BlY2lmaWMgY29uZmlnIHZhbHVlcy5cbiAgZ2V0Um9vdFNjb3BlRGVzY3JpcHRvcjogLT5cbiAgICBAdG9rZW5pemVkQnVmZmVyLnJvb3RTY29wZURlc2NyaXB0b3JcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBzeW50YWN0aWMgc2NvcGVEZXNjcmlwdG9yIGZvciB0aGUgZ2l2ZW4gcG9zaXRpb24gaW4gYnVmZmVyXG4gICMgY29vcmRpbmF0ZXMuIFVzZWZ1bCB3aXRoIHtDb25maWc6OmdldH0uXG4gICNcbiAgIyBGb3IgZXhhbXBsZSwgaWYgY2FsbGVkIHdpdGggYSBwb3NpdGlvbiBpbnNpZGUgdGhlIHBhcmFtZXRlciBsaXN0IG9mIGFuXG4gICMgYW5vbnltb3VzIENvZmZlZVNjcmlwdCBmdW5jdGlvbiwgdGhlIG1ldGhvZCByZXR1cm5zIHRoZSBmb2xsb3dpbmcgYXJyYXk6XG4gICMgYFtcInNvdXJjZS5jb2ZmZWVcIiwgXCJtZXRhLmlubGluZS5mdW5jdGlvbi5jb2ZmZWVcIiwgXCJ2YXJpYWJsZS5wYXJhbWV0ZXIuZnVuY3Rpb24uY29mZmVlXCJdYFxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIFtyb3csIGNvbHVtbl0uXG4gICNcbiAgIyBSZXR1cm5zIGEge1Njb3BlRGVzY3JpcHRvcn0uXG4gIHNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9uOiAoYnVmZmVyUG9zaXRpb24pIC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5zY29wZURlc2NyaXB0b3JGb3JQb3NpdGlvbihidWZmZXJQb3NpdGlvbilcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIHJhbmdlIGluIGJ1ZmZlciBjb29yZGluYXRlcyBvZiBhbGwgdG9rZW5zIHN1cnJvdW5kaW5nIHRoZVxuICAjIGN1cnNvciB0aGF0IG1hdGNoIHRoZSBnaXZlbiBzY29wZSBzZWxlY3Rvci5cbiAgI1xuICAjIEZvciBleGFtcGxlLCBpZiB5b3Ugd2FudGVkIHRvIGZpbmQgdGhlIHN0cmluZyBzdXJyb3VuZGluZyB0aGUgY3Vyc29yLCB5b3VcbiAgIyBjb3VsZCBjYWxsIGBlZGl0b3IuYnVmZmVyUmFuZ2VGb3JTY29wZUF0Q3Vyc29yKFwiLnN0cmluZy5xdW90ZWRcIilgLlxuICAjXG4gICMgKiBgc2NvcGVTZWxlY3RvcmAge1N0cmluZ30gc2VsZWN0b3IuIGUuZy4gYCcuc291cmNlLnJ1YnknYFxuICAjXG4gICMgUmV0dXJucyBhIHtSYW5nZX0uXG4gIGJ1ZmZlclJhbmdlRm9yU2NvcGVBdEN1cnNvcjogKHNjb3BlU2VsZWN0b3IpIC0+XG4gICAgQGJ1ZmZlclJhbmdlRm9yU2NvcGVBdFBvc2l0aW9uKHNjb3BlU2VsZWN0b3IsIEBnZXRDdXJzb3JCdWZmZXJQb3NpdGlvbigpKVxuXG4gIGJ1ZmZlclJhbmdlRm9yU2NvcGVBdFBvc2l0aW9uOiAoc2NvcGVTZWxlY3RvciwgcG9zaXRpb24pIC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5idWZmZXJSYW5nZUZvclNjb3BlQXRQb3NpdGlvbihzY29wZVNlbGVjdG9yLCBwb3NpdGlvbilcblxuICAjIEV4dGVuZGVkOiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIHJvdyBpcyBlbnRpcmVseSBhIGNvbW1lbnRcbiAgaXNCdWZmZXJSb3dDb21tZW50ZWQ6IChidWZmZXJSb3cpIC0+XG4gICAgaWYgbWF0Y2ggPSBAbGluZVRleHRGb3JCdWZmZXJSb3coYnVmZmVyUm93KS5tYXRjaCgvXFxTLylcbiAgICAgIEBjb21tZW50U2NvcGVTZWxlY3RvciA/PSBuZXcgVGV4dE1hdGVTY29wZVNlbGVjdG9yKCdjb21tZW50LionKVxuICAgICAgQGNvbW1lbnRTY29wZVNlbGVjdG9yLm1hdGNoZXMoQHNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9uKFtidWZmZXJSb3csIG1hdGNoLmluZGV4XSkuc2NvcGVzKVxuXG4gICMgR2V0IHRoZSBzY29wZSBkZXNjcmlwdG9yIGF0IHRoZSBjdXJzb3IuXG4gIGdldEN1cnNvclNjb3BlOiAtPlxuICAgIEBnZXRMYXN0Q3Vyc29yKCkuZ2V0U2NvcGVEZXNjcmlwdG9yKClcblxuICB0b2tlbkZvckJ1ZmZlclBvc2l0aW9uOiAoYnVmZmVyUG9zaXRpb24pIC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci50b2tlbkZvclBvc2l0aW9uKGJ1ZmZlclBvc2l0aW9uKVxuXG4gICMjI1xuICBTZWN0aW9uOiBDbGlwYm9hcmQgT3BlcmF0aW9uc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBjb3B5IHRoZSBzZWxlY3RlZCB0ZXh0LlxuICBjb3B5U2VsZWN0ZWRUZXh0OiAtPlxuICAgIG1haW50YWluQ2xpcGJvYXJkID0gZmFsc2VcbiAgICBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zT3JkZXJlZEJ5QnVmZmVyUG9zaXRpb24oKVxuICAgICAgaWYgc2VsZWN0aW9uLmlzRW1wdHkoKVxuICAgICAgICBwcmV2aW91c1JhbmdlID0gc2VsZWN0aW9uLmdldEJ1ZmZlclJhbmdlKClcbiAgICAgICAgc2VsZWN0aW9uLnNlbGVjdExpbmUoKVxuICAgICAgICBzZWxlY3Rpb24uY29weShtYWludGFpbkNsaXBib2FyZCwgdHJ1ZSlcbiAgICAgICAgc2VsZWN0aW9uLnNldEJ1ZmZlclJhbmdlKHByZXZpb3VzUmFuZ2UpXG4gICAgICBlbHNlXG4gICAgICAgIHNlbGVjdGlvbi5jb3B5KG1haW50YWluQ2xpcGJvYXJkLCBmYWxzZSlcbiAgICAgIG1haW50YWluQ2xpcGJvYXJkID0gdHJ1ZVxuICAgIHJldHVyblxuXG4gICMgUHJpdmF0ZTogRm9yIGVhY2ggc2VsZWN0aW9uLCBvbmx5IGNvcHkgaGlnaGxpZ2h0ZWQgdGV4dC5cbiAgY29weU9ubHlTZWxlY3RlZFRleHQ6IC0+XG4gICAgbWFpbnRhaW5DbGlwYm9hcmQgPSBmYWxzZVxuICAgIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnNPcmRlcmVkQnlCdWZmZXJQb3NpdGlvbigpXG4gICAgICBpZiBub3Qgc2VsZWN0aW9uLmlzRW1wdHkoKVxuICAgICAgICBzZWxlY3Rpb24uY29weShtYWludGFpbkNsaXBib2FyZCwgZmFsc2UpXG4gICAgICAgIG1haW50YWluQ2xpcGJvYXJkID0gdHJ1ZVxuICAgIHJldHVyblxuXG4gICMgRXNzZW50aWFsOiBGb3IgZWFjaCBzZWxlY3Rpb24sIGN1dCB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAgY3V0U2VsZWN0ZWRUZXh0OiAtPlxuICAgIG1haW50YWluQ2xpcGJvYXJkID0gZmFsc2VcbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+XG4gICAgICBpZiBzZWxlY3Rpb24uaXNFbXB0eSgpXG4gICAgICAgIHNlbGVjdGlvbi5zZWxlY3RMaW5lKClcbiAgICAgICAgc2VsZWN0aW9uLmN1dChtYWludGFpbkNsaXBib2FyZCwgdHJ1ZSlcbiAgICAgIGVsc2VcbiAgICAgICAgc2VsZWN0aW9uLmN1dChtYWludGFpbkNsaXBib2FyZCwgZmFsc2UpXG4gICAgICBtYWludGFpbkNsaXBib2FyZCA9IHRydWVcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCByZXBsYWNlIHRoZSBzZWxlY3RlZCB0ZXh0IHdpdGggdGhlIGNvbnRlbnRzIG9mXG4gICMgdGhlIGNsaXBib2FyZC5cbiAgI1xuICAjIElmIHRoZSBjbGlwYm9hcmQgY29udGFpbnMgdGhlIHNhbWUgbnVtYmVyIG9mIHNlbGVjdGlvbnMgYXMgdGhlIGN1cnJlbnRcbiAgIyBlZGl0b3IsIGVhY2ggc2VsZWN0aW9uIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgY29udGVudCBvZiB0aGVcbiAgIyBjb3JyZXNwb25kaW5nIGNsaXBib2FyZCBzZWxlY3Rpb24gdGV4dC5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgU2VlIHtTZWxlY3Rpb246Omluc2VydFRleHR9LlxuICBwYXN0ZVRleHQ6IChvcHRpb25zPXt9KSAtPlxuICAgIHt0ZXh0OiBjbGlwYm9hcmRUZXh0LCBtZXRhZGF0YX0gPSBAY29uc3RydWN0b3IuY2xpcGJvYXJkLnJlYWRXaXRoTWV0YWRhdGEoKVxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQGVtaXRXaWxsSW5zZXJ0VGV4dEV2ZW50KGNsaXBib2FyZFRleHQpXG5cbiAgICBtZXRhZGF0YSA/PSB7fVxuICAgIG9wdGlvbnMuYXV0b0luZGVudCA9IEBzaG91bGRBdXRvSW5kZW50T25QYXN0ZSgpXG5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24sIGluZGV4KSA9PlxuICAgICAgaWYgbWV0YWRhdGEuc2VsZWN0aW9ucz8ubGVuZ3RoIGlzIEBnZXRTZWxlY3Rpb25zKCkubGVuZ3RoXG4gICAgICAgIHt0ZXh0LCBpbmRlbnRCYXNpcywgZnVsbExpbmV9ID0gbWV0YWRhdGEuc2VsZWN0aW9uc1tpbmRleF1cbiAgICAgIGVsc2VcbiAgICAgICAge2luZGVudEJhc2lzLCBmdWxsTGluZX0gPSBtZXRhZGF0YVxuICAgICAgICB0ZXh0ID0gY2xpcGJvYXJkVGV4dFxuXG4gICAgICBkZWxldGUgb3B0aW9ucy5pbmRlbnRCYXNpc1xuICAgICAge2N1cnNvcn0gPSBzZWxlY3Rpb25cbiAgICAgIGlmIGluZGVudEJhc2lzP1xuICAgICAgICBjb250YWluc05ld2xpbmVzID0gdGV4dC5pbmRleE9mKCdcXG4nKSBpc250IC0xXG4gICAgICAgIGlmIGNvbnRhaW5zTmV3bGluZXMgb3Igbm90IGN1cnNvci5oYXNQcmVjZWRpbmdDaGFyYWN0ZXJzT25MaW5lKClcbiAgICAgICAgICBvcHRpb25zLmluZGVudEJhc2lzID89IGluZGVudEJhc2lzXG5cbiAgICAgIHJhbmdlID0gbnVsbFxuICAgICAgaWYgZnVsbExpbmUgYW5kIHNlbGVjdGlvbi5pc0VtcHR5KClcbiAgICAgICAgb2xkUG9zaXRpb24gPSBzZWxlY3Rpb24uZ2V0QnVmZmVyUmFuZ2UoKS5zdGFydFxuICAgICAgICBzZWxlY3Rpb24uc2V0QnVmZmVyUmFuZ2UoW1tvbGRQb3NpdGlvbi5yb3csIDBdLCBbb2xkUG9zaXRpb24ucm93LCAwXV0pXG4gICAgICAgIHJhbmdlID0gc2VsZWN0aW9uLmluc2VydFRleHQodGV4dCwgb3B0aW9ucylcbiAgICAgICAgbmV3UG9zaXRpb24gPSBvbGRQb3NpdGlvbi50cmFuc2xhdGUoWzEsIDBdKVxuICAgICAgICBzZWxlY3Rpb24uc2V0QnVmZmVyUmFuZ2UoW25ld1Bvc2l0aW9uLCBuZXdQb3NpdGlvbl0pXG4gICAgICBlbHNlXG4gICAgICAgIHJhbmdlID0gc2VsZWN0aW9uLmluc2VydFRleHQodGV4dCwgb3B0aW9ucylcblxuICAgICAgZGlkSW5zZXJ0RXZlbnQgPSB7dGV4dCwgcmFuZ2V9XG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtaW5zZXJ0LXRleHQnLCBkaWRJbnNlcnRFdmVudFxuXG4gICMgRXNzZW50aWFsOiBGb3IgZWFjaCBzZWxlY3Rpb24sIGlmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGN1dCBhbGwgY2hhcmFjdGVyc1xuICAjIG9mIHRoZSBjb250YWluaW5nIHNjcmVlbiBsaW5lIGZvbGxvd2luZyB0aGUgY3Vyc29yLiBPdGhlcndpc2UgY3V0IHRoZSBzZWxlY3RlZFxuICAjIHRleHQuXG4gIGN1dFRvRW5kT2ZMaW5lOiAtPlxuICAgIG1haW50YWluQ2xpcGJvYXJkID0gZmFsc2VcbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+XG4gICAgICBzZWxlY3Rpb24uY3V0VG9FbmRPZkxpbmUobWFpbnRhaW5DbGlwYm9hcmQpXG4gICAgICBtYWludGFpbkNsaXBib2FyZCA9IHRydWVcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBjdXQgYWxsIGNoYXJhY3RlcnNcbiAgIyBvZiB0aGUgY29udGFpbmluZyBidWZmZXIgbGluZSBmb2xsb3dpbmcgdGhlIGN1cnNvci4gT3RoZXJ3aXNlIGN1dCB0aGVcbiAgIyBzZWxlY3RlZCB0ZXh0LlxuICBjdXRUb0VuZE9mQnVmZmVyTGluZTogLT5cbiAgICBtYWludGFpbkNsaXBib2FyZCA9IGZhbHNlXG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPlxuICAgICAgc2VsZWN0aW9uLmN1dFRvRW5kT2ZCdWZmZXJMaW5lKG1haW50YWluQ2xpcGJvYXJkKVxuICAgICAgbWFpbnRhaW5DbGlwYm9hcmQgPSB0cnVlXG5cbiAgIyMjXG4gIFNlY3Rpb246IEZvbGRzXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBGb2xkIHRoZSBtb3N0IHJlY2VudCBjdXJzb3IncyByb3cgYmFzZWQgb24gaXRzIGluZGVudGF0aW9uIGxldmVsLlxuICAjXG4gICMgVGhlIGZvbGQgd2lsbCBleHRlbmQgZnJvbSB0aGUgbmVhcmVzdCBwcmVjZWRpbmcgbGluZSB3aXRoIGEgbG93ZXJcbiAgIyBpbmRlbnRhdGlvbiBsZXZlbCB1cCB0byB0aGUgbmVhcmVzdCBmb2xsb3dpbmcgcm93IHdpdGggYSBsb3dlciBpbmRlbnRhdGlvblxuICAjIGxldmVsLlxuICBmb2xkQ3VycmVudFJvdzogLT5cbiAgICBidWZmZXJSb3cgPSBAYnVmZmVyUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbihAZ2V0Q3Vyc29yU2NyZWVuUG9zaXRpb24oKSkucm93XG4gICAgQGZvbGRCdWZmZXJSb3coYnVmZmVyUm93KVxuXG4gICMgRXNzZW50aWFsOiBVbmZvbGQgdGhlIG1vc3QgcmVjZW50IGN1cnNvcidzIHJvdyBieSBvbmUgbGV2ZWwuXG4gIHVuZm9sZEN1cnJlbnRSb3c6IC0+XG4gICAgYnVmZmVyUm93ID0gQGJ1ZmZlclBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oQGdldEN1cnNvclNjcmVlblBvc2l0aW9uKCkpLnJvd1xuICAgIEB1bmZvbGRCdWZmZXJSb3coYnVmZmVyUm93KVxuXG4gICMgRXNzZW50aWFsOiBGb2xkIHRoZSBnaXZlbiByb3cgaW4gYnVmZmVyIGNvb3JkaW5hdGVzIGJhc2VkIG9uIGl0cyBpbmRlbnRhdGlvblxuICAjIGxldmVsLlxuICAjXG4gICMgSWYgdGhlIGdpdmVuIHJvdyBpcyBmb2xkYWJsZSwgdGhlIGZvbGQgd2lsbCBiZWdpbiB0aGVyZS4gT3RoZXJ3aXNlLCBpdCB3aWxsXG4gICMgYmVnaW4gYXQgdGhlIGZpcnN0IGZvbGRhYmxlIHJvdyBwcmVjZWRpbmcgdGhlIGdpdmVuIHJvdy5cbiAgI1xuICAjICogYGJ1ZmZlclJvd2AgQSB7TnVtYmVyfS5cbiAgZm9sZEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBAbGFuZ3VhZ2VNb2RlLmZvbGRCdWZmZXJSb3coYnVmZmVyUm93KVxuXG4gICMgRXNzZW50aWFsOiBVbmZvbGQgYWxsIGZvbGRzIGNvbnRhaW5pbmcgdGhlIGdpdmVuIHJvdyBpbiBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyAqIGBidWZmZXJSb3dgIEEge051bWJlcn1cbiAgdW5mb2xkQnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIuZGVzdHJveUZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2UoUmFuZ2UoUG9pbnQoYnVmZmVyUm93LCAwKSwgUG9pbnQoYnVmZmVyUm93LCBJbmZpbml0eSkpKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgZm9sZCB0aGUgcm93cyBpdCBpbnRlcnNlY3RzLlxuICBmb2xkU2VsZWN0ZWRMaW5lczogLT5cbiAgICBzZWxlY3Rpb24uZm9sZCgpIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnMoKVxuICAgIHJldHVyblxuXG4gICMgRXh0ZW5kZWQ6IEZvbGQgYWxsIGZvbGRhYmxlIGxpbmVzLlxuICBmb2xkQWxsOiAtPlxuICAgIEBsYW5ndWFnZU1vZGUuZm9sZEFsbCgpXG5cbiAgIyBFeHRlbmRlZDogVW5mb2xkIGFsbCBleGlzdGluZyBmb2xkcy5cbiAgdW5mb2xkQWxsOiAtPlxuICAgIEBsYW5ndWFnZU1vZGUudW5mb2xkQWxsKClcbiAgICBAc2Nyb2xsVG9DdXJzb3JQb3NpdGlvbigpXG5cbiAgIyBFeHRlbmRlZDogRm9sZCBhbGwgZm9sZGFibGUgbGluZXMgYXQgdGhlIGdpdmVuIGluZGVudCBsZXZlbC5cbiAgI1xuICAjICogYGxldmVsYCBBIHtOdW1iZXJ9LlxuICBmb2xkQWxsQXRJbmRlbnRMZXZlbDogKGxldmVsKSAtPlxuICAgIEBsYW5ndWFnZU1vZGUuZm9sZEFsbEF0SW5kZW50TGV2ZWwobGV2ZWwpXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGdpdmVuIHJvdyBpbiBidWZmZXIgY29vcmRpbmF0ZXMgaXMgZm9sZGFibGUuXG4gICNcbiAgIyBBICpmb2xkYWJsZSogcm93IGlzIGEgcm93IHRoYXQgKnN0YXJ0cyogYSByb3cgcmFuZ2UgdGhhdCBjYW4gYmUgZm9sZGVkLlxuICAjXG4gICMgKiBgYnVmZmVyUm93YCBBIHtOdW1iZXJ9XG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0ZvbGRhYmxlQXRCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5pc0ZvbGRhYmxlQXRSb3coYnVmZmVyUm93KVxuXG4gICMgRXh0ZW5kZWQ6IERldGVybWluZSB3aGV0aGVyIHRoZSBnaXZlbiByb3cgaW4gc2NyZWVuIGNvb3JkaW5hdGVzIGlzIGZvbGRhYmxlLlxuICAjXG4gICMgQSAqZm9sZGFibGUqIHJvdyBpcyBhIHJvdyB0aGF0ICpzdGFydHMqIGEgcm93IHJhbmdlIHRoYXQgY2FuIGJlIGZvbGRlZC5cbiAgI1xuICAjICogYGJ1ZmZlclJvd2AgQSB7TnVtYmVyfVxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNGb2xkYWJsZUF0U2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBpc0ZvbGRhYmxlQXRCdWZmZXJSb3coQGJ1ZmZlclJvd0ZvclNjcmVlblJvdyhzY3JlZW5Sb3cpKVxuXG4gICMgRXh0ZW5kZWQ6IEZvbGQgdGhlIGdpdmVuIGJ1ZmZlciByb3cgaWYgaXQgaXNuJ3QgY3VycmVudGx5IGZvbGRlZCwgYW5kIHVuZm9sZFxuICAjIGl0IG90aGVyd2lzZS5cbiAgdG9nZ2xlRm9sZEF0QnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIGlmIEBpc0ZvbGRlZEF0QnVmZmVyUm93KGJ1ZmZlclJvdylcbiAgICAgIEB1bmZvbGRCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgIGVsc2VcbiAgICAgIEBmb2xkQnVmZmVyUm93KGJ1ZmZlclJvdylcblxuICAjIEV4dGVuZGVkOiBEZXRlcm1pbmUgd2hldGhlciB0aGUgbW9zdCByZWNlbnRseSBhZGRlZCBjdXJzb3IncyByb3cgaXMgZm9sZGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNGb2xkZWRBdEN1cnNvclJvdzogLT5cbiAgICBAaXNGb2xkZWRBdEJ1ZmZlclJvdyhAZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oKS5yb3cpXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGdpdmVuIHJvdyBpbiBidWZmZXIgY29vcmRpbmF0ZXMgaXMgZm9sZGVkLlxuICAjXG4gICMgKiBgYnVmZmVyUm93YCBBIHtOdW1iZXJ9XG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0ZvbGRlZEF0QnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIHJhbmdlID0gUmFuZ2UoXG4gICAgICBQb2ludChidWZmZXJSb3csIDApLFxuICAgICAgUG9pbnQoYnVmZmVyUm93LCBAYnVmZmVyLmxpbmVMZW5ndGhGb3JSb3coYnVmZmVyUm93KSlcbiAgICApXG4gICAgQGRpc3BsYXlMYXllci5mb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKHJhbmdlKS5sZW5ndGggPiAwXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGdpdmVuIHJvdyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMgaXMgZm9sZGVkLlxuICAjXG4gICMgKiBgc2NyZWVuUm93YCBBIHtOdW1iZXJ9XG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0ZvbGRlZEF0U2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBpc0ZvbGRlZEF0QnVmZmVyUm93KEBidWZmZXJSb3dGb3JTY3JlZW5Sb3coc2NyZWVuUm93KSlcblxuICAjIENyZWF0ZXMgYSBuZXcgZm9sZCBiZXR3ZWVuIHR3byByb3cgbnVtYmVycy5cbiAgI1xuICAjIHN0YXJ0Um93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBzdGFydCBmb2xkaW5nIGF0XG4gICMgZW5kUm93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBlbmQgdGhlIGZvbGRcbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7Rm9sZH0uXG4gIGZvbGRCdWZmZXJSb3dSYW5nZTogKHN0YXJ0Um93LCBlbmRSb3cpIC0+XG4gICAgQGZvbGRCdWZmZXJSYW5nZShSYW5nZShQb2ludChzdGFydFJvdywgSW5maW5pdHkpLCBQb2ludChlbmRSb3csIEluZmluaXR5KSkpXG5cbiAgZm9sZEJ1ZmZlclJhbmdlOiAocmFuZ2UpIC0+XG4gICAgQGRpc3BsYXlMYXllci5mb2xkQnVmZmVyUmFuZ2UocmFuZ2UpXG5cbiAgIyBSZW1vdmUgYW55IHtGb2xkfXMgZm91bmQgdGhhdCBpbnRlcnNlY3QgdGhlIGdpdmVuIGJ1ZmZlciByYW5nZS5cbiAgZGVzdHJveUZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2U6IChidWZmZXJSYW5nZSkgLT5cbiAgICBAZGlzcGxheUxheWVyLmRlc3Ryb3lGb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKGJ1ZmZlclJhbmdlKVxuXG4gICMjI1xuICBTZWN0aW9uOiBHdXR0ZXJzXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBBZGQgYSBjdXN0b20ge0d1dHRlcn0uXG4gICNcbiAgIyAqIGBvcHRpb25zYCBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuICAjICAgKiBgbmFtZWAgKHJlcXVpcmVkKSBBIHVuaXF1ZSB7U3RyaW5nfSB0byBpZGVudGlmeSB0aGlzIGd1dHRlci5cbiAgIyAgICogYHByaW9yaXR5YCAob3B0aW9uYWwpIEEge051bWJlcn0gdGhhdCBkZXRlcm1pbmVzIHN0YWNraW5nIG9yZGVyIGJldHdlZW5cbiAgIyAgICAgICBndXR0ZXJzLiBMb3dlciBwcmlvcml0eSBpdGVtcyBhcmUgZm9yY2VkIGNsb3NlciB0byB0aGUgZWRnZXMgb2YgdGhlXG4gICMgICAgICAgd2luZG93LiAoZGVmYXVsdDogLTEwMClcbiAgIyAgICogYHZpc2libGVgIChvcHRpb25hbCkge0Jvb2xlYW59IHNwZWNpZnlpbmcgd2hldGhlciB0aGUgZ3V0dGVyIGlzIHZpc2libGVcbiAgIyAgICAgICBpbml0aWFsbHkgYWZ0ZXIgYmVpbmcgY3JlYXRlZC4gKGRlZmF1bHQ6IHRydWUpXG4gICNcbiAgIyBSZXR1cm5zIHRoZSBuZXdseS1jcmVhdGVkIHtHdXR0ZXJ9LlxuICBhZGRHdXR0ZXI6IChvcHRpb25zKSAtPlxuICAgIEBndXR0ZXJDb250YWluZXIuYWRkR3V0dGVyKG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGlzIGVkaXRvcidzIGd1dHRlcnMuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge0d1dHRlcn1zLlxuICBnZXRHdXR0ZXJzOiAtPlxuICAgIEBndXR0ZXJDb250YWluZXIuZ2V0R3V0dGVycygpXG5cbiAgZ2V0TGluZU51bWJlckd1dHRlcjogLT5cbiAgICBAbGluZU51bWJlckd1dHRlclxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIGd1dHRlciB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICAjXG4gICMgUmV0dXJucyBhIHtHdXR0ZXJ9LCBvciBgbnVsbGAgaWYgbm8gZ3V0dGVyIGV4aXN0cyBmb3IgdGhlIGdpdmVuIG5hbWUuXG4gIGd1dHRlcldpdGhOYW1lOiAobmFtZSkgLT5cbiAgICBAZ3V0dGVyQ29udGFpbmVyLmd1dHRlcldpdGhOYW1lKG5hbWUpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFNjcm9sbGluZyB0aGUgVGV4dEVkaXRvclxuICAjIyNcblxuICAjIEVzc2VudGlhbDogU2Nyb2xsIHRoZSBlZGl0b3IgdG8gcmV2ZWFsIHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIGN1cnNvciBpZiBpdCBpc1xuICAjIG9mZi1zY3JlZW4uXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBjZW50ZXJgIENlbnRlciB0aGUgZWRpdG9yIGFyb3VuZCB0aGUgY3Vyc29yIGlmIHBvc3NpYmxlLiAoZGVmYXVsdDogdHJ1ZSlcbiAgc2Nyb2xsVG9DdXJzb3JQb3NpdGlvbjogKG9wdGlvbnMpIC0+XG4gICAgQGdldExhc3RDdXJzb3IoKS5hdXRvc2Nyb2xsKGNlbnRlcjogb3B0aW9ucz8uY2VudGVyID8gdHJ1ZSlcblxuICAjIEVzc2VudGlhbDogU2Nyb2xscyB0aGUgZWRpdG9yIHRvIHRoZSBnaXZlbiBidWZmZXIgcG9zaXRpb24uXG4gICNcbiAgIyAqIGBidWZmZXJQb3NpdGlvbmAgQW4gb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGJ1ZmZlciBwb3NpdGlvbi4gSXQgY2FuIGJlIGVpdGhlclxuICAjICAgYW4ge09iamVjdH0gKGB7cm93LCBjb2x1bW59YCksIHtBcnJheX0gKGBbcm93LCBjb2x1bW5dYCksIG9yIHtQb2ludH1cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBjZW50ZXJgIENlbnRlciB0aGUgZWRpdG9yIGFyb3VuZCB0aGUgcG9zaXRpb24gaWYgcG9zc2libGUuIChkZWZhdWx0OiBmYWxzZSlcbiAgc2Nyb2xsVG9CdWZmZXJQb3NpdGlvbjogKGJ1ZmZlclBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIEBzY3JvbGxUb1NjcmVlblBvc2l0aW9uKEBzY3JlZW5Qb3NpdGlvbkZvckJ1ZmZlclBvc2l0aW9uKGJ1ZmZlclBvc2l0aW9uKSwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogU2Nyb2xscyB0aGUgZWRpdG9yIHRvIHRoZSBnaXZlbiBzY3JlZW4gcG9zaXRpb24uXG4gICNcbiAgIyAqIGBzY3JlZW5Qb3NpdGlvbmAgQW4gb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIHNjcmVlbiBwb3NpdGlvbi4gSXQgY2FuIGJlIGVpdGhlclxuICAjICAgIGFuIHtPYmplY3R9IChge3JvdywgY29sdW1ufWApLCB7QXJyYXl9IChgW3JvdywgY29sdW1uXWApLCBvciB7UG9pbnR9XG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgY2VudGVyYCBDZW50ZXIgdGhlIGVkaXRvciBhcm91bmQgdGhlIHBvc2l0aW9uIGlmIHBvc3NpYmxlLiAoZGVmYXVsdDogZmFsc2UpXG4gIHNjcm9sbFRvU2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBAc2Nyb2xsVG9TY3JlZW5SYW5nZShuZXcgUmFuZ2Uoc2NyZWVuUG9zaXRpb24sIHNjcmVlblBvc2l0aW9uKSwgb3B0aW9ucylcblxuICBzY3JvbGxUb1RvcDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OnNjcm9sbFRvVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNjcm9sbFRvVG9wKClcblxuICBzY3JvbGxUb0JvdHRvbTogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OnNjcm9sbFRvVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNjcm9sbFRvQm90dG9tKClcblxuICBzY3JvbGxUb1NjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UsIG9wdGlvbnMgPSB7fSkgLT5cbiAgICBzY3JlZW5SYW5nZSA9IEBjbGlwU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UpIGlmIG9wdGlvbnMuY2xpcCBpc250IGZhbHNlXG4gICAgc2Nyb2xsRXZlbnQgPSB7c2NyZWVuUmFuZ2UsIG9wdGlvbnN9XG4gICAgQGNvbXBvbmVudD8uZGlkUmVxdWVzdEF1dG9zY3JvbGwoc2Nyb2xsRXZlbnQpXG4gICAgQGVtaXR0ZXIuZW1pdCBcImRpZC1yZXF1ZXN0LWF1dG9zY3JvbGxcIiwgc2Nyb2xsRXZlbnRcblxuICBnZXRIb3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0OiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0SG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodCBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5nZXRIb3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0KClcblxuICBnZXRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0VmVydGljYWxTY3JvbGxiYXJXaWR0aCBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5nZXRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoKClcblxuICBwYWdlVXA6IC0+XG4gICAgQG1vdmVVcChAZ2V0Um93c1BlclBhZ2UoKSlcblxuICBwYWdlRG93bjogLT5cbiAgICBAbW92ZURvd24oQGdldFJvd3NQZXJQYWdlKCkpXG5cbiAgc2VsZWN0UGFnZVVwOiAtPlxuICAgIEBzZWxlY3RVcChAZ2V0Um93c1BlclBhZ2UoKSlcblxuICBzZWxlY3RQYWdlRG93bjogLT5cbiAgICBAc2VsZWN0RG93bihAZ2V0Um93c1BlclBhZ2UoKSlcblxuICAjIFJldHVybnMgdGhlIG51bWJlciBvZiByb3dzIHBlciBwYWdlXG4gIGdldFJvd3NQZXJQYWdlOiAtPlxuICAgIGlmIEBjb21wb25lbnQ/XG4gICAgICBjbGllbnRIZWlnaHQgPSBAY29tcG9uZW50LmdldFNjcm9sbENvbnRhaW5lckNsaWVudEhlaWdodCgpXG4gICAgICBsaW5lSGVpZ2h0ID0gQGNvbXBvbmVudC5nZXRMaW5lSGVpZ2h0KClcbiAgICAgIE1hdGgubWF4KDEsIE1hdGguY2VpbChjbGllbnRIZWlnaHQgLyBsaW5lSGVpZ2h0KSlcbiAgICBlbHNlXG4gICAgICAxXG5cbiAgIyMjXG4gIFNlY3Rpb246IENvbmZpZ1xuICAjIyNcblxuICAjIEV4cGVyaW1lbnRhbDogU3VwcGx5IGFuIG9iamVjdCB0aGF0IHdpbGwgcHJvdmlkZSB0aGUgZWRpdG9yIHdpdGggc2V0dGluZ3NcbiAgIyBmb3Igc3BlY2lmaWMgc3ludGFjdGljIHNjb3Blcy4gU2VlIHRoZSBgU2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZWAgaW5cbiAgIyBgdGV4dC1lZGl0b3ItcmVnaXN0cnkuanNgIGZvciBhbiBleGFtcGxlIGltcGxlbWVudGF0aW9uLlxuICBzZXRTY29wZWRTZXR0aW5nc0RlbGVnYXRlOiAoQHNjb3BlZFNldHRpbmdzRGVsZWdhdGUpIC0+XG5cbiAgIyBFeHBlcmltZW50YWw6IFJldHJpZXZlIHRoZSB7T2JqZWN0fSB0aGF0IHByb3ZpZGVzIHRoZSBlZGl0b3Igd2l0aCBzZXR0aW5nc1xuICAjIGZvciBzcGVjaWZpYyBzeW50YWN0aWMgc2NvcGVzLlxuICBnZXRTY29wZWRTZXR0aW5nc0RlbGVnYXRlOiAtPiBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZVxuXG4gICMgRXhwZXJpbWVudGFsOiBJcyBhdXRvLWluZGVudGF0aW9uIGVuYWJsZWQgZm9yIHRoaXMgZWRpdG9yP1xuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgc2hvdWxkQXV0b0luZGVudDogLT4gQGF1dG9JbmRlbnRcblxuICAjIEV4cGVyaW1lbnRhbDogSXMgYXV0by1pbmRlbnRhdGlvbiBvbiBwYXN0ZSBlbmFibGVkIGZvciB0aGlzIGVkaXRvcj9cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIHNob3VsZEF1dG9JbmRlbnRPblBhc3RlOiAtPiBAYXV0b0luZGVudE9uUGFzdGVcblxuICAjIEV4cGVyaW1lbnRhbDogRG9lcyB0aGlzIGVkaXRvciBhbGxvdyBzY3JvbGxpbmcgcGFzdCB0aGUgbGFzdCBsaW5lP1xuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgZ2V0U2Nyb2xsUGFzdEVuZDogLT5cbiAgICBpZiBAZ2V0QXV0b0hlaWdodCgpXG4gICAgICBmYWxzZVxuICAgIGVsc2VcbiAgICAgIEBzY3JvbGxQYXN0RW5kXG5cbiAgIyBFeHBlcmltZW50YWw6IEhvdyBmYXN0IGRvZXMgdGhlIGVkaXRvciBzY3JvbGwgaW4gcmVzcG9uc2UgdG8gbW91c2Ugd2hlZWxcbiAgIyBtb3ZlbWVudHM/XG4gICNcbiAgIyBSZXR1cm5zIGEgcG9zaXRpdmUge051bWJlcn0uXG4gIGdldFNjcm9sbFNlbnNpdGl2aXR5OiAtPiBAc2Nyb2xsU2Vuc2l0aXZpdHlcblxuICAjIEV4cGVyaW1lbnRhbDogRG9lcyB0aGlzIGVkaXRvciBzaG93IGN1cnNvcnMgd2hpbGUgdGhlcmUgaXMgYSBzZWxlY3Rpb24/XG4gICNcbiAgIyBSZXR1cm5zIGEgcG9zaXRpdmUge0Jvb2xlYW59LlxuICBnZXRTaG93Q3Vyc29yT25TZWxlY3Rpb246IC0+IEBzaG93Q3Vyc29yT25TZWxlY3Rpb25cblxuICAjIEV4cGVyaW1lbnRhbDogQXJlIGxpbmUgbnVtYmVycyBlbmFibGVkIGZvciB0aGlzIGVkaXRvcj9cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn1cbiAgZG9lc1Nob3dMaW5lTnVtYmVyczogLT4gQHNob3dMaW5lTnVtYmVyc1xuXG4gICMgRXhwZXJpbWVudGFsOiBHZXQgdGhlIHRpbWUgaW50ZXJ2YWwgd2l0aGluIHdoaWNoIHRleHQgZWRpdGluZyBvcGVyYXRpb25zXG4gICMgYXJlIGdyb3VwZWQgdG9nZXRoZXIgaW4gdGhlIGVkaXRvcidzIHVuZG8gaGlzdG9yeS5cbiAgI1xuICAjIFJldHVybnMgdGhlIHRpbWUgaW50ZXJ2YWwge051bWJlcn0gaW4gbWlsbGlzZWNvbmRzLlxuICBnZXRVbmRvR3JvdXBpbmdJbnRlcnZhbDogLT4gQHVuZG9Hcm91cGluZ0ludGVydmFsXG5cbiAgIyBFeHBlcmltZW50YWw6IEdldCB0aGUgY2hhcmFjdGVycyB0aGF0IGFyZSAqbm90KiBjb25zaWRlcmVkIHBhcnQgb2Ygd29yZHMsXG4gICMgZm9yIHRoZSBwdXJwb3NlIG9mIHdvcmQtYmFzZWQgY3Vyc29yIG1vdmVtZW50cy5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfSBjb250YWluaW5nIHRoZSBub24td29yZCBjaGFyYWN0ZXJzLlxuICBnZXROb25Xb3JkQ2hhcmFjdGVyczogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0Tm9uV29yZENoYXJhY3RlcnM/KHNjb3BlcykgPyBAbm9uV29yZENoYXJhY3RlcnNcblxuICBnZXRDb21tZW50U3RyaW5nczogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0Q29tbWVudFN0cmluZ3M/KHNjb3BlcylcblxuICBnZXRJbmNyZWFzZUluZGVudFBhdHRlcm46IChzY29wZXMpIC0+XG4gICAgQHNjb3BlZFNldHRpbmdzRGVsZWdhdGU/LmdldEluY3JlYXNlSW5kZW50UGF0dGVybj8oc2NvcGVzKVxuXG4gIGdldERlY3JlYXNlSW5kZW50UGF0dGVybjogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0RGVjcmVhc2VJbmRlbnRQYXR0ZXJuPyhzY29wZXMpXG5cbiAgZ2V0RGVjcmVhc2VOZXh0SW5kZW50UGF0dGVybjogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0RGVjcmVhc2VOZXh0SW5kZW50UGF0dGVybj8oc2NvcGVzKVxuXG4gIGdldEZvbGRFbmRQYXR0ZXJuOiAoc2NvcGVzKSAtPlxuICAgIEBzY29wZWRTZXR0aW5nc0RlbGVnYXRlPy5nZXRGb2xkRW5kUGF0dGVybj8oc2NvcGVzKVxuXG4gICMjI1xuICBTZWN0aW9uOiBFdmVudCBIYW5kbGVyc1xuICAjIyNcblxuICBoYW5kbGVHcmFtbWFyQ2hhbmdlOiAtPlxuICAgIEB1bmZvbGRBbGwoKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtZ3JhbW1hcicsIEBnZXRHcmFtbWFyKClcblxuICAjIyNcbiAgU2VjdGlvbjogVGV4dEVkaXRvciBSZW5kZXJpbmdcbiAgIyMjXG5cbiAgIyBHZXQgdGhlIEVsZW1lbnQgZm9yIHRoZSBlZGl0b3IuXG4gIGdldEVsZW1lbnQ6IC0+XG4gICAgaWYgQGNvbXBvbmVudD9cbiAgICAgIEBjb21wb25lbnQuZWxlbWVudFxuICAgIGVsc2VcbiAgICAgIFRleHRFZGl0b3JDb21wb25lbnQgPz0gcmVxdWlyZSgnLi90ZXh0LWVkaXRvci1jb21wb25lbnQnKVxuICAgICAgVGV4dEVkaXRvckVsZW1lbnQgPz0gcmVxdWlyZSgnLi90ZXh0LWVkaXRvci1lbGVtZW50JylcbiAgICAgIG5ldyBUZXh0RWRpdG9yQ29tcG9uZW50KHtcbiAgICAgICAgbW9kZWw6IHRoaXMsXG4gICAgICAgIHVwZGF0ZWRTeW5jaHJvbm91c2x5OiBUZXh0RWRpdG9yRWxlbWVudC5wcm90b3R5cGUudXBkYXRlZFN5bmNocm9ub3VzbHksXG4gICAgICAgIEBpbml0aWFsU2Nyb2xsVG9wUm93LCBAaW5pdGlhbFNjcm9sbExlZnRDb2x1bW5cbiAgICAgIH0pXG4gICAgICBAY29tcG9uZW50LmVsZW1lbnRcblxuICBnZXRBbGxvd2VkTG9jYXRpb25zOiAtPlxuICAgIFsnY2VudGVyJ11cblxuICAjIEVzc2VudGlhbDogUmV0cmlldmVzIHRoZSBncmV5ZWQgb3V0IHBsYWNlaG9sZGVyIG9mIGEgbWluaSBlZGl0b3IuXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ30uXG4gIGdldFBsYWNlaG9sZGVyVGV4dDogLT4gQHBsYWNlaG9sZGVyVGV4dFxuXG4gICMgRXNzZW50aWFsOiBTZXQgdGhlIGdyZXllZCBvdXQgcGxhY2Vob2xkZXIgb2YgYSBtaW5pIGVkaXRvci4gUGxhY2Vob2xkZXIgdGV4dFxuICAjIHdpbGwgYmUgZGlzcGxheWVkIHdoZW4gdGhlIGVkaXRvciBoYXMgbm8gY29udGVudC5cbiAgI1xuICAjICogYHBsYWNlaG9sZGVyVGV4dGAge1N0cmluZ30gdGV4dCB0aGF0IGlzIGRpc3BsYXllZCB3aGVuIHRoZSBlZGl0b3IgaGFzIG5vIGNvbnRlbnQuXG4gIHNldFBsYWNlaG9sZGVyVGV4dDogKHBsYWNlaG9sZGVyVGV4dCkgLT4gQHVwZGF0ZSh7cGxhY2Vob2xkZXJUZXh0fSlcblxuICBwaXhlbFBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb246IChidWZmZXJQb3NpdGlvbikgLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgbWV0aG9kIGlzIGRlcHJlY2F0ZWQgb24gdGhlIG1vZGVsIGxheWVyLiBVc2UgYFRleHRFZGl0b3JFbGVtZW50OjpwaXhlbFBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb25gIGluc3RlYWRcIilcbiAgICBAZ2V0RWxlbWVudCgpLnBpeGVsUG9zaXRpb25Gb3JCdWZmZXJQb3NpdGlvbihidWZmZXJQb3NpdGlvbilcblxuICBwaXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbikgLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgbWV0aG9kIGlzIGRlcHJlY2F0ZWQgb24gdGhlIG1vZGVsIGxheWVyLiBVc2UgYFRleHRFZGl0b3JFbGVtZW50OjpwaXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb25gIGluc3RlYWRcIilcbiAgICBAZ2V0RWxlbWVudCgpLnBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbihzY3JlZW5Qb3NpdGlvbilcblxuICBnZXRWZXJ0aWNhbFNjcm9sbE1hcmdpbjogLT5cbiAgICBtYXhTY3JvbGxNYXJnaW4gPSBNYXRoLmZsb29yKCgoQGhlaWdodCAvIEBnZXRMaW5lSGVpZ2h0SW5QaXhlbHMoKSkgLSAxKSAvIDIpXG4gICAgTWF0aC5taW4oQHZlcnRpY2FsU2Nyb2xsTWFyZ2luLCBtYXhTY3JvbGxNYXJnaW4pXG5cbiAgc2V0VmVydGljYWxTY3JvbGxNYXJnaW46IChAdmVydGljYWxTY3JvbGxNYXJnaW4pIC0+IEB2ZXJ0aWNhbFNjcm9sbE1hcmdpblxuXG4gIGdldEhvcml6b250YWxTY3JvbGxNYXJnaW46IC0+IE1hdGgubWluKEBob3Jpem9udGFsU2Nyb2xsTWFyZ2luLCBNYXRoLmZsb29yKCgoQHdpZHRoIC8gQGdldERlZmF1bHRDaGFyV2lkdGgoKSkgLSAxKSAvIDIpKVxuICBzZXRIb3Jpem9udGFsU2Nyb2xsTWFyZ2luOiAoQGhvcml6b250YWxTY3JvbGxNYXJnaW4pIC0+IEBob3Jpem9udGFsU2Nyb2xsTWFyZ2luXG5cbiAgZ2V0TGluZUhlaWdodEluUGl4ZWxzOiAtPiBAbGluZUhlaWdodEluUGl4ZWxzXG4gIHNldExpbmVIZWlnaHRJblBpeGVsczogKEBsaW5lSGVpZ2h0SW5QaXhlbHMpIC0+IEBsaW5lSGVpZ2h0SW5QaXhlbHNcblxuICBnZXRLb3JlYW5DaGFyV2lkdGg6IC0+IEBrb3JlYW5DaGFyV2lkdGhcbiAgZ2V0SGFsZldpZHRoQ2hhcldpZHRoOiAtPiBAaGFsZldpZHRoQ2hhcldpZHRoXG4gIGdldERvdWJsZVdpZHRoQ2hhcldpZHRoOiAtPiBAZG91YmxlV2lkdGhDaGFyV2lkdGhcbiAgZ2V0RGVmYXVsdENoYXJXaWR0aDogLT4gQGRlZmF1bHRDaGFyV2lkdGhcblxuICByYXRpb0ZvckNoYXJhY3RlcjogKGNoYXJhY3RlcikgLT5cbiAgICBpZiBpc0tvcmVhbkNoYXJhY3RlcihjaGFyYWN0ZXIpXG4gICAgICBAZ2V0S29yZWFuQ2hhcldpZHRoKCkgLyBAZ2V0RGVmYXVsdENoYXJXaWR0aCgpXG4gICAgZWxzZSBpZiBpc0hhbGZXaWR0aENoYXJhY3RlcihjaGFyYWN0ZXIpXG4gICAgICBAZ2V0SGFsZldpZHRoQ2hhcldpZHRoKCkgLyBAZ2V0RGVmYXVsdENoYXJXaWR0aCgpXG4gICAgZWxzZSBpZiBpc0RvdWJsZVdpZHRoQ2hhcmFjdGVyKGNoYXJhY3RlcilcbiAgICAgIEBnZXREb3VibGVXaWR0aENoYXJXaWR0aCgpIC8gQGdldERlZmF1bHRDaGFyV2lkdGgoKVxuICAgIGVsc2VcbiAgICAgIDFcblxuICBzZXREZWZhdWx0Q2hhcldpZHRoOiAoZGVmYXVsdENoYXJXaWR0aCwgZG91YmxlV2lkdGhDaGFyV2lkdGgsIGhhbGZXaWR0aENoYXJXaWR0aCwga29yZWFuQ2hhcldpZHRoKSAtPlxuICAgIGRvdWJsZVdpZHRoQ2hhcldpZHRoID89IGRlZmF1bHRDaGFyV2lkdGhcbiAgICBoYWxmV2lkdGhDaGFyV2lkdGggPz0gZGVmYXVsdENoYXJXaWR0aFxuICAgIGtvcmVhbkNoYXJXaWR0aCA/PSBkZWZhdWx0Q2hhcldpZHRoXG4gICAgaWYgZGVmYXVsdENoYXJXaWR0aCBpc250IEBkZWZhdWx0Q2hhcldpZHRoIG9yIGRvdWJsZVdpZHRoQ2hhcldpZHRoIGlzbnQgQGRvdWJsZVdpZHRoQ2hhcldpZHRoIGFuZCBoYWxmV2lkdGhDaGFyV2lkdGggaXNudCBAaGFsZldpZHRoQ2hhcldpZHRoIGFuZCBrb3JlYW5DaGFyV2lkdGggaXNudCBAa29yZWFuQ2hhcldpZHRoXG4gICAgICBAZGVmYXVsdENoYXJXaWR0aCA9IGRlZmF1bHRDaGFyV2lkdGhcbiAgICAgIEBkb3VibGVXaWR0aENoYXJXaWR0aCA9IGRvdWJsZVdpZHRoQ2hhcldpZHRoXG4gICAgICBAaGFsZldpZHRoQ2hhcldpZHRoID0gaGFsZldpZHRoQ2hhcldpZHRoXG4gICAgICBAa29yZWFuQ2hhcldpZHRoID0ga29yZWFuQ2hhcldpZHRoXG4gICAgICBpZiBAaXNTb2Z0V3JhcHBlZCgpXG4gICAgICAgIEBkaXNwbGF5TGF5ZXIucmVzZXQoe1xuICAgICAgICAgIHNvZnRXcmFwQ29sdW1uOiBAZ2V0U29mdFdyYXBDb2x1bW4oKVxuICAgICAgICB9KVxuICAgIGRlZmF1bHRDaGFyV2lkdGhcblxuICBzZXRIZWlnaHQ6IChoZWlnaHQpIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpzZXRIZWlnaHQgaW5zdGVhZC5cIilcbiAgICBAZ2V0RWxlbWVudCgpLnNldEhlaWdodChoZWlnaHQpXG5cbiAgZ2V0SGVpZ2h0OiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0SGVpZ2h0IGluc3RlYWQuXCIpXG4gICAgQGdldEVsZW1lbnQoKS5nZXRIZWlnaHQoKVxuXG4gIGdldEF1dG9IZWlnaHQ6IC0+IEBhdXRvSGVpZ2h0ID8gdHJ1ZVxuXG4gIGdldEF1dG9XaWR0aDogLT4gQGF1dG9XaWR0aCA/IGZhbHNlXG5cbiAgc2V0V2lkdGg6ICh3aWR0aCkgLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OnNldFdpZHRoIGluc3RlYWQuXCIpXG4gICAgQGdldEVsZW1lbnQoKS5zZXRXaWR0aCh3aWR0aClcblxuICBnZXRXaWR0aDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OmdldFdpZHRoIGluc3RlYWQuXCIpXG4gICAgQGdldEVsZW1lbnQoKS5nZXRXaWR0aCgpXG5cbiAgIyBVc2Ugc2V0U2Nyb2xsVG9wUm93IGluc3RlYWQgb2YgdGhpcyBtZXRob2RcbiAgc2V0Rmlyc3RWaXNpYmxlU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBzZXRTY3JvbGxUb3BSb3coc2NyZWVuUm93KVxuXG4gIGdldEZpcnN0VmlzaWJsZVNjcmVlblJvdzogLT5cbiAgICBAZ2V0RWxlbWVudCgpLmNvbXBvbmVudC5nZXRGaXJzdFZpc2libGVSb3coKVxuXG4gIGdldExhc3RWaXNpYmxlU2NyZWVuUm93OiAtPlxuICAgIEBnZXRFbGVtZW50KCkuY29tcG9uZW50LmdldExhc3RWaXNpYmxlUm93KClcblxuICBnZXRWaXNpYmxlUm93UmFuZ2U6IC0+XG4gICAgW0BnZXRGaXJzdFZpc2libGVTY3JlZW5Sb3coKSwgQGdldExhc3RWaXNpYmxlU2NyZWVuUm93KCldXG5cbiAgIyBVc2Ugc2V0U2Nyb2xsTGVmdENvbHVtbiBpbnN0ZWFkIG9mIHRoaXMgbWV0aG9kXG4gIHNldEZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbjogKGNvbHVtbikgLT5cbiAgICBAc2V0U2Nyb2xsTGVmdENvbHVtbihjb2x1bW4pXG5cbiAgZ2V0Rmlyc3RWaXNpYmxlU2NyZWVuQ29sdW1uOiAtPlxuICAgIEBnZXRFbGVtZW50KCkuY29tcG9uZW50LmdldEZpcnN0VmlzaWJsZUNvbHVtbigpXG5cbiAgZ2V0U2Nyb2xsVG9wOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0U2Nyb2xsVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbFRvcCgpXG5cbiAgc2V0U2Nyb2xsVG9wOiAoc2Nyb2xsVG9wKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2V0U2Nyb2xsVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNldFNjcm9sbFRvcChzY3JvbGxUb3ApXG5cbiAgZ2V0U2Nyb2xsQm90dG9tOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0U2Nyb2xsQm90dG9tIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbEJvdHRvbSgpXG5cbiAgc2V0U2Nyb2xsQm90dG9tOiAoc2Nyb2xsQm90dG9tKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2V0U2Nyb2xsQm90dG9tIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNldFNjcm9sbEJvdHRvbShzY3JvbGxCb3R0b20pXG5cbiAgZ2V0U2Nyb2xsTGVmdDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OmdldFNjcm9sbExlZnQgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuZ2V0U2Nyb2xsTGVmdCgpXG5cbiAgc2V0U2Nyb2xsTGVmdDogKHNjcm9sbExlZnQpIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpzZXRTY3JvbGxMZWZ0IGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNldFNjcm9sbExlZnQoc2Nyb2xsTGVmdClcblxuICBnZXRTY3JvbGxSaWdodDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OmdldFNjcm9sbFJpZ2h0IGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbFJpZ2h0KClcblxuICBzZXRTY3JvbGxSaWdodDogKHNjcm9sbFJpZ2h0KSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2V0U2Nyb2xsUmlnaHQgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuc2V0U2Nyb2xsUmlnaHQoc2Nyb2xsUmlnaHQpXG5cbiAgZ2V0U2Nyb2xsSGVpZ2h0OiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0U2Nyb2xsSGVpZ2h0IGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbEhlaWdodCgpXG5cbiAgZ2V0U2Nyb2xsV2lkdGg6IC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpnZXRTY3JvbGxXaWR0aCBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5nZXRTY3JvbGxXaWR0aCgpXG5cbiAgZ2V0TWF4U2Nyb2xsVG9wOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0TWF4U2Nyb2xsVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldE1heFNjcm9sbFRvcCgpXG5cbiAgZ2V0U2Nyb2xsVG9wUm93OiAtPlxuICAgIEBnZXRFbGVtZW50KCkuY29tcG9uZW50LmdldFNjcm9sbFRvcFJvdygpXG5cbiAgc2V0U2Nyb2xsVG9wUm93OiAoc2Nyb2xsVG9wUm93KSAtPlxuICAgIEBnZXRFbGVtZW50KCkuY29tcG9uZW50LnNldFNjcm9sbFRvcFJvdyhzY3JvbGxUb3BSb3cpXG5cbiAgZ2V0U2Nyb2xsTGVmdENvbHVtbjogLT5cbiAgICBAZ2V0RWxlbWVudCgpLmNvbXBvbmVudC5nZXRTY3JvbGxMZWZ0Q29sdW1uKClcblxuICBzZXRTY3JvbGxMZWZ0Q29sdW1uOiAoc2Nyb2xsTGVmdENvbHVtbikgLT5cbiAgICBAZ2V0RWxlbWVudCgpLmNvbXBvbmVudC5zZXRTY3JvbGxMZWZ0Q29sdW1uKHNjcm9sbExlZnRDb2x1bW4pXG5cbiAgaW50ZXJzZWN0c1Zpc2libGVSb3dSYW5nZTogKHN0YXJ0Um93LCBlbmRSb3cpIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjppbnRlcnNlY3RzVmlzaWJsZVJvd1JhbmdlIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmludGVyc2VjdHNWaXNpYmxlUm93UmFuZ2Uoc3RhcnRSb3csIGVuZFJvdylcblxuICBzZWxlY3Rpb25JbnRlcnNlY3RzVmlzaWJsZVJvd1JhbmdlOiAoc2VsZWN0aW9uKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2VsZWN0aW9uSW50ZXJzZWN0c1Zpc2libGVSb3dSYW5nZSBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5zZWxlY3Rpb25JbnRlcnNlY3RzVmlzaWJsZVJvd1JhbmdlKHNlbGVjdGlvbilcblxuICBzY3JlZW5Qb3NpdGlvbkZvclBpeGVsUG9zaXRpb246IChwaXhlbFBvc2l0aW9uKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2NyZWVuUG9zaXRpb25Gb3JQaXhlbFBvc2l0aW9uIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNjcmVlblBvc2l0aW9uRm9yUGl4ZWxQb3NpdGlvbihwaXhlbFBvc2l0aW9uKVxuXG4gIHBpeGVsUmVjdEZvclNjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UpIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpwaXhlbFJlY3RGb3JTY3JlZW5SYW5nZSBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5waXhlbFJlY3RGb3JTY3JlZW5SYW5nZShzY3JlZW5SYW5nZSlcblxuICAjIyNcbiAgU2VjdGlvbjogVXRpbGl0eVxuICAjIyNcblxuICBpbnNwZWN0OiAtPlxuICAgIFwiPFRleHRFZGl0b3IgI3tAaWR9PlwiXG5cbiAgZW1pdFdpbGxJbnNlcnRUZXh0RXZlbnQ6ICh0ZXh0KSAtPlxuICAgIHJlc3VsdCA9IHRydWVcbiAgICBjYW5jZWwgPSAtPiByZXN1bHQgPSBmYWxzZVxuICAgIHdpbGxJbnNlcnRFdmVudCA9IHtjYW5jZWwsIHRleHR9XG4gICAgQGVtaXR0ZXIuZW1pdCAnd2lsbC1pbnNlcnQtdGV4dCcsIHdpbGxJbnNlcnRFdmVudFxuICAgIHJlc3VsdFxuXG4gICMjI1xuICBTZWN0aW9uOiBMYW5ndWFnZSBNb2RlIERlbGVnYXRlZCBNZXRob2RzXG4gICMjI1xuXG4gIHN1Z2dlc3RlZEluZGVudEZvckJ1ZmZlclJvdzogKGJ1ZmZlclJvdywgb3B0aW9ucykgLT4gQGxhbmd1YWdlTW9kZS5zdWdnZXN0ZWRJbmRlbnRGb3JCdWZmZXJSb3coYnVmZmVyUm93LCBvcHRpb25zKVxuXG4gIGF1dG9JbmRlbnRCdWZmZXJSb3c6IChidWZmZXJSb3csIG9wdGlvbnMpIC0+IEBsYW5ndWFnZU1vZGUuYXV0b0luZGVudEJ1ZmZlclJvdyhidWZmZXJSb3csIG9wdGlvbnMpXG5cbiAgYXV0b0luZGVudEJ1ZmZlclJvd3M6IChzdGFydFJvdywgZW5kUm93KSAtPiBAbGFuZ3VhZ2VNb2RlLmF1dG9JbmRlbnRCdWZmZXJSb3dzKHN0YXJ0Um93LCBlbmRSb3cpXG5cbiAgYXV0b0RlY3JlYXNlSW5kZW50Rm9yQnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPiBAbGFuZ3VhZ2VNb2RlLmF1dG9EZWNyZWFzZUluZGVudEZvckJ1ZmZlclJvdyhidWZmZXJSb3cpXG5cbiAgdG9nZ2xlTGluZUNvbW1lbnRGb3JCdWZmZXJSb3c6IChyb3cpIC0+IEBsYW5ndWFnZU1vZGUudG9nZ2xlTGluZUNvbW1lbnRzRm9yQnVmZmVyUm93KHJvdylcblxuICB0b2dnbGVMaW5lQ29tbWVudHNGb3JCdWZmZXJSb3dzOiAoc3RhcnQsIGVuZCkgLT4gQGxhbmd1YWdlTW9kZS50b2dnbGVMaW5lQ29tbWVudHNGb3JCdWZmZXJSb3dzKHN0YXJ0LCBlbmQpXG4iXX0=
