(function() {
  var ApplicationDelegate, AtomEnvironment, Clipboard, CompileCache, FileSystemBlobStore, ModuleCache, NativeCompileCache, TextEditor, TextEditorComponent, clipboard;

  AtomEnvironment = require('./atom-environment');

  ApplicationDelegate = require('./application-delegate');

  Clipboard = require('./clipboard');

  TextEditor = require('./text-editor');

  TextEditorComponent = require('./text-editor-component');

  FileSystemBlobStore = require('./file-system-blob-store');

  NativeCompileCache = require('./native-compile-cache');

  CompileCache = require('./compile-cache');

  ModuleCache = require('./module-cache');

  if (global.isGeneratingSnapshot) {
    require('about');
    require('archive-view');
    require('autocomplete-atom-api');
    require('autocomplete-css');
    require('autocomplete-html');
    require('autocomplete-plus');
    require('autocomplete-snippets');
    require('autoflow');
    require('autosave');
    require('background-tips');
    require('bookmarks');
    require('bracket-matcher');
    require('command-palette');
    require('deprecation-cop');
    require('dev-live-reload');
    require('encoding-selector');
    require('exception-reporting');
    require('dalek');
    require('find-and-replace');
    require('fuzzy-finder');
    require('github');
    require('git-diff');
    require('go-to-line');
    require('grammar-selector');
    require('image-view');
    require('incompatible-packages');
    require('keybinding-resolver');
    require('line-ending-selector');
    require('link');
    require('markdown-preview');
    require('metrics');
    require('notifications');
    require('open-on-github');
    require('package-generator');
    require('settings-view');
    require('snippets');
    require('spell-check');
    require('status-bar');
    require('styleguide');
    require('symbols-view');
    require('tabs');
    require('timecop');
    require('tree-view');
    require('update-package-dependencies');
    require('welcome');
    require('whitespace');
    require('wrap-guide');
  }

  clipboard = new Clipboard;

  TextEditor.setClipboard(clipboard);

  TextEditor.viewForItem = function(item) {
    return atom.views.getView(item);
  };

  global.atom = new AtomEnvironment({
    clipboard: clipboard,
    applicationDelegate: new ApplicationDelegate,
    enablePersistence: true
  });

  global.atom.preloadPackages();

  module.exports = function(arg) {
    var base, blobStore, devMode, env, exportsPath, getWindowLoadSettings, ipcRenderer, path, ref, resourcePath, updateProcessEnv;
    blobStore = arg.blobStore;
    updateProcessEnv = require('./update-process-env').updateProcessEnv;
    path = require('path');
    require('./window');
    getWindowLoadSettings = require('./get-window-load-settings');
    ipcRenderer = require('electron').ipcRenderer;
    ref = getWindowLoadSettings(), resourcePath = ref.resourcePath, devMode = ref.devMode, env = ref.env;
    require('./electron-shims');
    exportsPath = path.join(resourcePath, 'exports');
    require('module').globalPaths.push(exportsPath);
    process.env.NODE_PATH = exportsPath;
    if (!devMode) {
      if ((base = process.env).NODE_ENV == null) {
        base.NODE_ENV = 'production';
      }
    }
    global.atom.initialize({
      window: window,
      document: document,
      blobStore: blobStore,
      configDirPath: process.env.ATOM_HOME,
      env: process.env
    });
    return global.atom.startEditorWindow().then(function() {
      var windowFocused;
      windowFocused = function() {
        window.removeEventListener('focus', windowFocused);
        return setTimeout((function() {
          return document.querySelector('atom-workspace').focus();
        }), 0);
      };
      window.addEventListener('focus', windowFocused);
      return ipcRenderer.on('environment', function(event, env) {
        return updateProcessEnv(env);
      });
    });
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2luaXRpYWxpemUtYXBwbGljYXRpb24td2luZG93LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsZUFBQSxHQUFrQixPQUFBLENBQVEsb0JBQVI7O0VBQ2xCLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx3QkFBUjs7RUFDdEIsU0FBQSxHQUFZLE9BQUEsQ0FBUSxhQUFSOztFQUNaLFVBQUEsR0FBYSxPQUFBLENBQVEsZUFBUjs7RUFDYixtQkFBQSxHQUFzQixPQUFBLENBQVEseUJBQVI7O0VBQ3RCLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSwwQkFBUjs7RUFDdEIsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHdCQUFSOztFQUNyQixZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSOztFQUNmLFdBQUEsR0FBYyxPQUFBLENBQVEsZ0JBQVI7O0VBRWQsSUFBRyxNQUFNLENBQUMsb0JBQVY7SUFDRSxPQUFBLENBQVEsT0FBUjtJQUNBLE9BQUEsQ0FBUSxjQUFSO0lBQ0EsT0FBQSxDQUFRLHVCQUFSO0lBQ0EsT0FBQSxDQUFRLGtCQUFSO0lBQ0EsT0FBQSxDQUFRLG1CQUFSO0lBQ0EsT0FBQSxDQUFRLG1CQUFSO0lBQ0EsT0FBQSxDQUFRLHVCQUFSO0lBQ0EsT0FBQSxDQUFRLFVBQVI7SUFDQSxPQUFBLENBQVEsVUFBUjtJQUNBLE9BQUEsQ0FBUSxpQkFBUjtJQUNBLE9BQUEsQ0FBUSxXQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLG1CQUFSO0lBQ0EsT0FBQSxDQUFRLHFCQUFSO0lBQ0EsT0FBQSxDQUFRLE9BQVI7SUFDQSxPQUFBLENBQVEsa0JBQVI7SUFDQSxPQUFBLENBQVEsY0FB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WixDQUFlLGFBQWYsRUFBOEIsU0FBQyxLQUFELEVBQVEsR0FBUjtlQUM1QixnQkFBQSxDQUFpQixHQUFqQjtNQUQ0QixDQUE5QjtJQU5tQyxDQUFyQztFQXZCZTtBQXhFakIiLCJzb3VyY2VzQ29udGVudCI6WyJBdG9tRW52aXJvbm1lbnQgPSByZXF1aXJlICcuL2F0b20tZW52aXJvbm1lbnQnXG5BcHBsaWNhdGlvbkRlbGVnYXRlID0gcmVxdWlyZSAnLi9hcHBsaWNhdGlvbi1kZWxlZ2F0ZSdcbkNsaXBib2FyZCA9IHJlcXVpcmUgJy4vY2xpcGJvYXJkJ1xuVGV4dEVkaXRvciA9IHJlcXVpcmUgJy4vdGV4dC1lZGl0b3InXG5UZXh0RWRpdG9yQ29tcG9uZW50ID0gcmVxdWlyZSAnLi90ZXh0LWVkaXRvci1jb21wb25lbnQnXG5GaWxlU3lzdGVtQmxvYlN0b3JlID0gcmVxdWlyZSAnLi9maWxlLXN5c3RlbS1ibG9iLXN0b3JlJ1xuTmF0aXZlQ29tcGlsZUNhY2hlID0gcmVxdWlyZSAnLi9uYXRpdmUtY29tcGlsZS1jYWNoZSdcbkNvbXBpbGVDYWNoZSA9IHJlcXVpcmUgJy4vY29tcGlsZS1jYWNoZSdcbk1vZHVsZUNhY2hlID0gcmVxdWlyZSAnLi9tb2R1bGUtY2FjaGUnXG5cbmlmIGdsb2JhbC5pc0dlbmVyYXRpbmdTbmFwc2hvdFxuICByZXF1aXJlKCdhYm91dCcpXG4gIHJlcXVpcmUoJ2FyY2hpdmUtdmlldycpXG4gIHJlcXVpcmUoJ2F1dG9jb21wbGV0ZS1hdG9tLWFwaScpXG4gIHJlcXVpcmUoJ2F1dG9jb21wbGV0ZS1jc3MnKVxuICByZXF1aXJlKCdhdXRvY29tcGxldGUtaHRtbCcpXG4gIHJlcXVpcmUoJ2F1dG9jb21wbGV0ZS1wbHVzJylcbiAgcmVxdWlyZSgnYXV0b2NvbXBsZXRlLXNuaXBwZXRzJylcbiAgcmVxdWlyZSgnYXV0b2Zsb3cnKVxuICByZXF1aXJlKCdhdXRvc2F2ZScpXG4gIHJlcXVpcmUoJ2JhY2tncm91bmQtdGlwcycpXG4gIHJlcXVpcmUoJ2Jvb2ttYXJrcycpXG4gIHJlcXVpcmUoJ2JyYWNrZXQtbWF0Y2hlcicpXG4gIHJlcXVpcmUoJ2NvbW1hbmQtcGFsZXR0ZScpXG4gIHJlcXVpcmUoJ2RlcHJlY2F0aW9uLWNvcCcpXG4gIHJlcXVpcmUoJ2Rldi1saXZlLXJlbG9hZCcpXG4gIHJlcXVpcmUoJ2VuY29kaW5nLXNlbGVjdG9yJylcbiAgcmVxdWlyZSgnZXhjZXB0aW9uLXJlcG9ydGluZycpXG4gIHJlcXVpcmUoJ2RhbGVrJylcbiAgcmVxdWlyZSgnZmluZC1hbmQtcmVwbGFjZScpXG4gIHJlcXVpcmUoJ2Z1enp5LWZpbmRlcicpXG4gIHJlcXVpcmUoJ2dpdGh1YicpXG4gIHJlcXVpcmUoJ2dpdC1kaWZmJylcbiAgcmVxdWlyZSgnZ28tdG8tbGluZScpXG4gIHJlcXVpcmUoJ2dyYW1tYXItc2VsZWN0b3InKVxuICByZXF1aXJlKCdpbWFnZS12aWV3JylcbiAgcmVxdWlyZSgnaW5jb21wYXRpYmxlLXBhY2thZ2VzJylcbiAgcmVxdWlyZSgna2V5YmluZGluZy1yZXNvbHZlcicpXG4gIHJlcXVpcmUoJ2xpbmUtZW5kaW5nLXNlbGVjdG9yJylcbiAgcmVxdWlyZSgnbGluaycpXG4gIHJlcXVpcmUoJ21hcmtkb3duLXByZXZpZXcnKVxuICByZXF1aXJlKCdtZXRyaWNzJylcbiAgcmVxdWlyZSgnbm90aWZpY2F0aW9ucycpXG4gIHJlcXVpcmUoJ29wZW4tb24tZ2l0aHViJylcbiAgcmVxdWlyZSgncGFja2FnZS1nZW5lcmF0b3InKVxuICByZXF1aXJlKCdzZXR0aW5ncy12aWV3JylcbiAgcmVxdWlyZSgnc25pcHBldHMnKVxuICByZXF1aXJlKCdzcGVsbC1jaGVjaycpXG4gIHJlcXVpcmUoJ3N0YXR1cy1iYXInKVxuICByZXF1aXJlKCdzdHlsZWd1aWRlJylcbiAgcmVxdWlyZSgnc3ltYm9scy12aWV3JylcbiAgcmVxdWlyZSgndGFicycpXG4gIHJlcXVpcmUoJ3RpbWVjb3AnKVxuICByZXF1aXJlKCd0cmVlLXZpZXcnKVxuICByZXF1aXJlKCd1cGRhdGUtcGFja2FnZS1kZXBlbmRlbmNpZXMnKVxuICByZXF1aXJlKCd3ZWxjb21lJylcbiAgcmVxdWlyZSgnd2hpdGVzcGFjZScpXG4gIHJlcXVpcmUoJ3dyYXAtZ3VpZGUnKVxuXG5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkXG5UZXh0RWRpdG9yLnNldENsaXBib2FyZChjbGlwYm9hcmQpXG5UZXh0RWRpdG9yLnZpZXdGb3JJdGVtID0gKGl0ZW0pIC0+IGF0b20udmlld3MuZ2V0VmlldyhpdGVtKVxuXG5nbG9iYWwuYXRvbSA9IG5ldyBBdG9tRW52aXJvbm1lbnQoe1xuICBjbGlwYm9hcmQsXG4gIGFwcGxpY2F0aW9uRGVsZWdhdGU6IG5ldyBBcHBsaWNhdGlvbkRlbGVnYXRlLFxuICBlbmFibGVQZXJzaXN0ZW5jZTogdHJ1ZVxufSlcblxuZ2xvYmFsLmF0b20ucHJlbG9hZFBhY2thZ2VzKClcblxuIyBMaWtlIHNhbmRzIHRocm91Z2ggdGhlIGhvdXJnbGFzcywgc28gYXJlIHRoZSBkYXlzIG9mIG91ciBsaXZlcy5cbm1vZHVsZS5leHBvcnRzID0gKHtibG9iU3RvcmV9KSAtPlxuICB7dXBkYXRlUHJvY2Vzc0Vudn0gPSByZXF1aXJlKCcuL3VwZGF0ZS1wcm9jZXNzLWVudicpXG4gIHBhdGggPSByZXF1aXJlICdwYXRoJ1xuICByZXF1aXJlICcuL3dpbmRvdydcbiAgZ2V0V2luZG93TG9hZFNldHRpbmdzID0gcmVxdWlyZSAnLi9nZXQtd2luZG93LWxvYWQtc2V0dGluZ3MnXG4gIHtpcGNSZW5kZXJlcn0gPSByZXF1aXJlICdlbGVjdHJvbidcbiAge3Jlc291cmNlUGF0aCwgZGV2TW9kZSwgZW52fSA9IGdldFdpbmRvd0xvYWRTZXR0aW5ncygpXG4gIHJlcXVpcmUgJy4vZWxlY3Ryb24tc2hpbXMnXG5cbiAgIyBBZGQgYXBwbGljYXRpb24tc3BlY2lmaWMgZXhwb3J0cyB0byBtb2R1bGUgc2VhcmNoIHBhdGguXG4gIGV4cG9ydHNQYXRoID0gcGF0aC5qb2luKHJlc291cmNlUGF0aCwgJ2V4cG9ydHMnKVxuICByZXF1aXJlKCdtb2R1bGUnKS5nbG9iYWxQYXRocy5wdXNoKGV4cG9ydHNQYXRoKVxuICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBleHBvcnRzUGF0aFxuXG4gICMgTWFrZSBSZWFjdCBmYXN0ZXJcbiAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPz0gJ3Byb2R1Y3Rpb24nIHVubGVzcyBkZXZNb2RlXG5cbiAgZ2xvYmFsLmF0b20uaW5pdGlhbGl6ZSh7XG4gICAgd2luZG93LCBkb2N1bWVudCwgYmxvYlN0b3JlLFxuICAgIGNvbmZpZ0RpclBhdGg6IHByb2Nlc3MuZW52LkFUT01fSE9NRSxcbiAgICBlbnY6IHByb2Nlc3MuZW52XG4gIH0pXG5cbiAgZ2xvYmFsLmF0b20uc3RhcnRFZGl0b3JXaW5kb3coKS50aGVuIC0+XG4gICAgIyBXb3JrYXJvdW5kIGZvciBmb2N1cyBnZXR0aW5nIGNsZWFyZWQgdXBvbiB3aW5kb3cgY3JlYXRpb25cbiAgICB3aW5kb3dGb2N1c2VkID0gLT5cbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIHdpbmRvd0ZvY3VzZWQpXG4gICAgICBzZXRUaW1lb3V0ICgtPiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdhdG9tLXdvcmtzcGFjZScpLmZvY3VzKCkpLCAwXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgd2luZG93Rm9jdXNlZClcbiAgICBpcGNSZW5kZXJlci5vbignZW52aXJvbm1lbnQnLCAoZXZlbnQsIGVudikgLT5cbiAgICAgIHVwZGF0ZVByb2Nlc3NFbnYoZW52KVxuICAgIClcbiJdfQ==
