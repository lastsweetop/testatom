(function() {
  var cloneObject, ipcHelpers;

  ipcHelpers = require('./ipc-helpers');

  cloneObject = function(object) {
    var clone, key, value;
    clone = {};
    for (key in object) {
      value = object[key];
      clone[key] = value;
    }
    return clone;
  };

  module.exports = function(arg) {
    var ApplicationDelegate, AtomEnvironment, Clipboard, CompileCache, FindParentDir, TextEditor, blobStore, buildAtomEnvironment, buildDefaultApplicationDelegate, clipboard, error, exitWithStatusCode, exportsPath, getWindowLoadSettings, handleKeydown, headless, ipcRenderer, legacyTestRunner, legacyTestRunnerPath, logFile, packageMetadata, packageRoot, path, promise, ref, ref1, remote, startCrashReporter, testPaths, testRunner, testRunnerPath;
    blobStore = arg.blobStore;
    startCrashReporter = require('./crash-reporter-start');
    remote = require('electron').remote;
    startCrashReporter();
    exitWithStatusCode = function(status) {
      remote.app.emit('will-quit');
      return remote.process.exit(status);
    };
    try {
      path = require('path');
      ipcRenderer = require('electron').ipcRenderer;
      getWindowLoadSettings = require('./get-window-load-settings');
      CompileCache = require('./compile-cache');
      AtomEnvironment = require('../src/atom-environment');
      ApplicationDelegate = require('../src/application-delegate');
      Clipboard = require('../src/clipboard');
      TextEditor = require('../src/text-editor');
      require('./electron-shims');
      ref = getWindowLoadSettings(), testRunnerPath = ref.testRunnerPath, legacyTestRunnerPath = ref.legacyTestRunnerPath, headless = ref.headless, logFile = ref.logFile, testPaths = ref.testPaths;
      if (!headless) {
        remote.getCurrentWindow().show();
      }
      handleKeydown = function(event) {
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 82) {
          ipcHelpers.call('window-method', 'reload');
        }
        if (event.keyCode === 73 && ((process.platform === 'darwin' && event.metaKey && event.altKey) || (process.platform !== 'darwin' && event.ctrlKey && event.shiftKey))) {
          ipcHelpers.call('window-method', 'toggleDevTools');
        }
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 87) {
          ipcHelpers.call('window-method', 'close');
        }
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 67) {
          return ipcHelpers.call('window-method', 'copy');
        }
      };
      window.addEventListener('keydown', handleKeydown, true);
      exportsPath = path.join(getWindowLoadSettings().resourcePath, 'exports');
      require('module').globalPaths.push(exportsPath);
      process.env.NODE_PATH = exportsPath;
      FindParentDir = require('find-parent-dir');
      if (packageRoot = FindParentDir.sync(testPaths[0], 'package.json')) {
        packageMetadata = require(path.join(packageRoot, 'package.json'));
        if (packageMetadata.atomTranspilers) {
          CompileCache.addTranspilerConfigForPath(packageRoot, packageMetadata.name, packageMetadata, packageMetadata.atomTranspilers);
        }
      }
      document.title = "Spec Suite";
      clipboard = new Clipboard;
      TextEditor.setClipboard(clipboard);
      TextEditor.viewForItem = function(item) {
        return atom.views.getView(item);
      };
      testRunner = require(testRunnerPath);
      legacyTestRunner = require(legacyTestRunnerPath);
      buildDefaultApplicationDelegate = function() {
        return new ApplicationDelegate();
      };
      buildAtomEnvironment = function(params) {
        var atomEnvironment;
        params = cloneObject(params);
        if (!params.hasOwnProperty("clipboard")) {
          params.clipboard = clipboard;
        }
        if (!params.hasOwnProperty("blobStore")) {
          params.blobStore = blobStore;
        }
        if (!params.hasOwnProperty("onlyLoadBaseStyleSheets")) {
          params.onlyLoadBaseStyleSheets = true;
        }
        atomEnvironment = new AtomEnvironment(params);
        atomEnvironment.initialize(params);
        return atomEnvironment;
      };
      promise = testRunner({
        logFile: logFile,
        headless: headless,
        testPaths: testPaths,
        buildAtomEnvironment: buildAtomEnvironment,
        buildDefaultApplicationDelegate: buildDefaultApplicationDelegate,
        legacyTestRunner: legacyTestRunner
      });
      return promise.then(function(statusCode) {
        if (getWindowLoadSettings().headless) {
          return exitWithStatusCode(statusCode);
        }
      });
    } catch (error1) {
      error = error1;
      if (getWindowLoadSettings().headless) {
        console.error((ref1 = error.stack) != null ? ref1 : error);
        return exitWithStatusCode(1);
      } else {
        throw error;
      }
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2luaXRpYWxpemUtdGVzdC13aW5kb3cuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLGVBQVI7O0VBRWIsV0FBQSxHQUFjLFNBQUMsTUFBRDtBQUNaLFFBQUE7SUFBQSxLQUFBLEdBQVE7QUFDUixTQUFBLGFBQUE7O01BQUEsS0FBTSxDQUFBLEdBQUEsQ0FBTixHQUFhO0FBQWI7V0FDQTtFQUhZOztFQUtkLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFNBQUMsR0FBRDtBQUNmLFFBQUE7SUFEaUIsWUFBRDtJQUNoQixrQkFBQSxHQUFxQixPQUFBLENBQVEsd0JBQVI7SUFDcEIsU0FBVSxPQUFBLENBQVEsVUFBUjtJQUVYLGtCQUFBLENBQUE7SUFFQSxrQkFBQSxHQUFxQixTQUFDLE1BQUQ7TUFDbkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFYLENBQWdCLFdBQWhCO2FBQ0EsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFmLENBQW9CLE1BQXBCO0lBRm1CO0FBSXJCO01BQ0UsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSO01BQ04sY0FBZSxPQUFBLENBQVEsVUFBUjtNQUNoQixxQkFBQSxHQUF3QixPQUFBLENBQVEsNEJBQVI7TUFDeEIsWUFBQSxHQUFlLE9BQUEsQ0FBUSxpQkFBUjtNQUNmLGVBQUEsR0FBa0IsT0FBQSxDQUFRLHlCQUFSO01BQ2xCLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSw2QkFBUjtNQUN0QixTQUFBLEdBQVksT0FBQSxDQUFRLGtCQUFSO01BQ1osVUFBQSxHQUFhLE9BQUEsQ0FBUSxvQkFBUjtNQUNiLE9BQUEsQ0FBUSxrQkFBUjtNQUVBLE1BQXVFLHFCQUFBLENBQUEsQ0FBdkUsRUFBQyxtQ0FBRCxFQUFpQiwrQ0FBakIsRUFBdUMsdUJBQXZDLEVBQWlELHFC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QUFDLGNBQVAsQ0FBc0IsV0FBdEIsQ0FBcEM7VUFBQSxNQUFNLENBQUMsU0FBUCxHQUFtQixVQUFuQjs7UUFDQSxJQUFBLENBQTZDLE1BQU0sQ0FBQyxjQUFQLENBQXNCLHlCQUF0QixDQUE3QztVQUFBLE1BQU0sQ0FBQyx1QkFBUCxHQUFpQyxLQUFqQzs7UUFDQSxlQUFBLEdBQXNCLElBQUEsZUFBQSxDQUFnQixNQUFoQjtRQUN0QixlQUFlLENBQUMsVUFBaEIsQ0FBMkIsTUFBM0I7ZUFDQTtNQVBxQjtNQVN2QixPQUFBLEdBQVUsVUFBQSxDQUFXO1FBQ25CLFNBQUEsT0FEbUI7UUFDVixVQUFBLFFBRFU7UUFDQSxXQUFBLFNBREE7UUFDVyxzQkFBQSxvQkFEWDtRQUNpQyxpQ0FBQSwrQkFEakM7UUFDa0Usa0JBQUEsZ0JBRGxFO09BQVg7YUFJVixPQUFPLENBQUMsSUFBUixDQUFhLFNBQUMsVUFBRDtRQUNYLElBQWtDLHFCQUFBLENBQUEsQ0FBdUIsQ0FBQyxRQUExRDtpQkFBQSxrQkFBQSxDQUFtQixVQUFuQixFQUFBOztNQURXLENBQWIsRUF6RUY7S0FBQSxjQUFBO01BMkVNO01BQ0osSUFBRyxxQkFBQSxDQUFBLENBQXVCLENBQUMsUUFBM0I7UUFDRSxPQUFPLENBQUMsS0FBUix1Q0FBNEIsS0FBNUI7ZUFDQSxrQkFBQSxDQUFtQixDQUFuQixFQUZGO09BQUEsTUFBQTtBQUlFLGNBQU0sTUFKUjtPQTVFRjs7RUFWZTtBQVBqQiIsInNvdXJjZXNDb250ZW50IjpbImlwY0hlbHBlcnMgPSByZXF1aXJlICcuL2lwYy1oZWxwZXJzJ1xuXG5jbG9uZU9iamVjdCA9IChvYmplY3QpIC0+XG4gIGNsb25lID0ge31cbiAgY2xvbmVba2V5XSA9IHZhbHVlIGZvciBrZXksIHZhbHVlIG9mIG9iamVjdFxuICBjbG9uZVxuXG5tb2R1bGUuZXhwb3J0cyA9ICh7YmxvYlN0b3JlfSkgLT5cbiAgc3RhcnRDcmFzaFJlcG9ydGVyID0gcmVxdWlyZSgnLi9jcmFzaC1yZXBvcnRlci1zdGFydCcpXG4gIHtyZW1vdGV9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5cbiAgc3RhcnRDcmFzaFJlcG9ydGVyKCkgIyBCZWZvcmUgYW55dGhpbmcgZWxzZVxuXG4gIGV4aXRXaXRoU3RhdHVzQ29kZSA9IChzdGF0dXMpIC0+XG4gICAgcmVtb3RlLmFwcC5lbWl0KCd3aWxsLXF1aXQnKVxuICAgIHJlbW90ZS5wcm9jZXNzLmV4aXQoc3RhdHVzKVxuXG4gIHRyeVxuICAgIHBhdGggPSByZXF1aXJlICdwYXRoJ1xuICAgIHtpcGNSZW5kZXJlcn0gPSByZXF1aXJlICdlbGVjdHJvbidcbiAgICBnZXRXaW5kb3dMb2FkU2V0dGluZ3MgPSByZXF1aXJlICcuL2dldC13aW5kb3ctbG9hZC1zZXR0aW5ncydcbiAgICBDb21waWxlQ2FjaGUgPSByZXF1aXJlICcuL2NvbXBpbGUtY2FjaGUnXG4gICAgQXRvbUVudmlyb25tZW50ID0gcmVxdWlyZSAnLi4vc3JjL2F0b20tZW52aXJvbm1lbnQnXG4gICAgQXBwbGljYXRpb25EZWxlZ2F0ZSA9IHJlcXVpcmUgJy4uL3NyYy9hcHBsaWNhdGlvbi1kZWxlZ2F0ZSdcbiAgICBDbGlwYm9hcmQgPSByZXF1aXJlICcuLi9zcmMvY2xpcGJvYXJkJ1xuICAgIFRleHRFZGl0b3IgPSByZXF1aXJlICcuLi9zcmMvdGV4dC1lZGl0b3InXG4gICAgcmVxdWlyZSAnLi9lbGVjdHJvbi1zaGltcydcblxuICAgIHt0ZXN0UnVubmVyUGF0aCwgbGVnYWN5VGVzdFJ1bm5lclBhdGgsIGhlYWRsZXNzLCBsb2dGaWxlLCB0ZXN0UGF0aHN9ID0gZ2V0V2luZG93TG9hZFNldHRpbmdzKClcblxuICAgIHVubGVzcyBoZWFkbGVzc1xuICAgICAgIyBTaG93IHdpbmRvdyBzeW5jaHJvbm91c2x5IHNvIGEgZm9jdXNvdXQgZG9lc24ndCBmaXJlIG9uIGlucHV0IGVsZW1lbnRzXG4gICAgICAjIHRoYXQgYXJlIGZvY3VzZWQgaW4gdGhlIHZlcnkgZmlyc3Qgc3BlYyBydW4uXG4gICAgICByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLnNob3coKVxuXG4gICAgaGFuZGxlS2V5ZG93biA9IChldmVudCkgLT5cbiAgICAgICMgUmVsb2FkOiBjbWQtciAvIGN0cmwtclxuICAgICAgaWYgKGV2ZW50Lm1ldGFLZXkgb3IgZXZlbnQuY3RybEtleSkgYW5kIGV2ZW50LmtleUNvZGUgaXMgODJcbiAgICAgICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3JlbG9hZCcpXG5cbiAgICAgICMgVG9nZ2xlIERldiBUb29sczogY21kLWFsdC1pIChNYWMpIC8gY3RybC1zaGlmdC1pIChMaW51eC9XaW5kb3dzKVxuICAgICAgaWYgZXZlbnQua2V5Q29kZSBpcyA3MyBhbmQgKFxuICAgICAgICAocHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJyBhbmQgZXZlbnQubWV0YUtleSBhbmQgZXZlbnQuYWx0S2V5KSBvclxuICAgICAgICAocHJvY2Vzcy5wbGF0Zm9ybSBpc250ICdkYXJ3aW4nIGFuZCBldmVudC5jdHJsS2V5IGFuZCBldmVudC5zaGlmdEtleSkpXG4gICAgICAgICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3RvZ2dsZURldlRvb2xzJylcblxuICAgICAgIyBDbG9zZTogY21kLXcgLyBjdHJsLXdcbiAgICAgIGlmIChldmVudC5tZXRhS2V5IG9yIGV2ZW50LmN0cmxLZXkpIGFuZCBldmVudC5rZXlDb2RlIGlzIDg3XG4gICAgICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdjbG9zZScpXG5cbiAgICAgICMgQ29weTogY21kLWMgLyBjdHJsLWNcbiAgICAgIGlmIChldmVudC5tZXRhS2V5IG9yIGV2ZW50LmN0cmxLZXkpIGFuZCBldmVudC5rZXlDb2RlIGlzIDY3XG4gICAgICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdjb3B5JylcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlS2V5ZG93biwgdHJ1ZSlcblxuICAgICMgQWRkICdleHBvcnRzJyB0byBtb2R1bGUgc2VhcmNoIHBhdGguXG4gICAgZXhwb3J0c1BhdGggPSBwYXRoLmpvaW4oZ2V0V2luZG93TG9hZFNldHRpbmdzKCkucmVzb3VyY2VQYXRoLCAnZXhwb3J0cycpXG4gICAgcmVxdWlyZSgnbW9kdWxlJykuZ2xvYmFsUGF0aHMucHVzaChleHBvcnRzUGF0aClcbiAgICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBleHBvcnRzUGF0aCAjIFNldCBOT0RFX1BBVEggZW52IHZhcmlhYmxlIHNpbmNlIHRhc2tzIG1heSBuZWVkIGl0LlxuXG4gICAgIyBTZXQgdXAgb3B0aW9uYWwgdHJhbnNwaWxhdGlvbiBmb3IgcGFja2FnZXMgdW5kZXIgdGVzdCBpZiBhbnlcbiAgICBGaW5kUGFyZW50RGlyID0gcmVxdWlyZSAnZmluZC1wYXJlbnQtZGlyJ1xuICAgIGlmIHBhY2thZ2VSb290ID0gRmluZFBhcmVudERpci5zeW5jKHRlc3RQYXRoc1swXSwgJ3BhY2thZ2UuanNvbicpXG4gICAgICBwYWNrYWdlTWV0YWRhdGEgPSByZXF1aXJlKHBhdGguam9pbihwYWNrYWdlUm9vdCwgJ3BhY2thZ2UuanNvbicpKVxuICAgICAgaWYgcGFja2FnZU1ldGFkYXRhLmF0b21UcmFuc3BpbGVyc1xuICAgICAgICBDb21waWxlQ2FjaGUuYWRkVHJhbnNwaWxlckNvbmZpZ0ZvclBhdGgocGFja2FnZVJvb3QsIHBhY2thZ2VNZXRhZGF0YS5uYW1lLCBwYWNrYWdlTWV0YWRhdGEsIHBhY2thZ2VNZXRhZGF0YS5hdG9tVHJhbnNwaWxlcnMpXG5cbiAgICBkb2N1bWVudC50aXRsZSA9IFwiU3BlYyBTdWl0ZVwiXG5cbiAgICBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkXG4gICAgVGV4dEVkaXRvci5zZXRDbGlwYm9hcmQoY2xpcGJvYXJkKVxuICAgIFRleHRFZGl0b3Iudmlld0Zvckl0ZW0gPSAoaXRlbSkgLT4gYXRvbS52aWV3cy5nZXRWaWV3KGl0ZW0pXG5cbiAgICB0ZXN0UnVubmVyID0gcmVxdWlyZSh0ZXN0UnVubmVyUGF0aClcbiAgICBsZWdhY3lUZXN0UnVubmVyID0gcmVxdWlyZShsZWdhY3lUZXN0UnVubmVyUGF0aClcbiAgICBidWlsZERlZmF1bHRBcHBsaWNhdGlvbkRlbGVnYXRlID0gLT4gbmV3IEFwcGxpY2F0aW9uRGVsZWdhdGUoKVxuICAgIGJ1aWxkQXRvbUVudmlyb25tZW50ID0gKHBhcmFtcykgLT5cbiAgICAgIHBhcmFtcyA9IGNsb25lT2JqZWN0KHBhcmFtcylcbiAgICAgIHBhcmFtcy5jbGlwYm9hcmQgPSBjbGlwYm9hcmQgdW5sZXNzIHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShcImNsaXBib2FyZFwiKVxuICAgICAgcGFyYW1zLmJsb2JTdG9yZSA9IGJsb2JTdG9yZSB1bmxlc3MgcGFyYW1zLmhhc093blByb3BlcnR5KFwiYmxvYlN0b3JlXCIpXG4gICAgICBwYXJhbXMub25seUxvYWRCYXNlU3R5bGVTaGVldHMgPSB0cnVlIHVubGVzcyBwYXJhbXMuaGFzT3duUHJvcGVydHkoXCJvbmx5TG9hZEJhc2VTdHlsZVNoZWV0c1wiKVxuICAgICAgYXRvbUVudmlyb25tZW50ID0gbmV3IEF0b21FbnZpcm9ubWVudChwYXJhbXMpXG4gICAgICBhdG9tRW52aXJvbm1lbnQuaW5pdGlhbGl6ZShwYXJhbXMpXG4gICAgICBhdG9tRW52aXJvbm1lbnRcblxuICAgIHByb21pc2UgPSB0ZXN0UnVubmVyKHtcbiAgICAgIGxvZ0ZpbGUsIGhlYWRsZXNzLCB0ZXN0UGF0aHMsIGJ1aWxkQXRvbUVudmlyb25tZW50LCBidWlsZERlZmF1bHRBcHBsaWNhdGlvbkRlbGVnYXRlLCBsZWdhY3lUZXN0UnVubmVyXG4gICAgfSlcblxuICAgIHByb21pc2UudGhlbiAoc3RhdHVzQ29kZSkgLT5cbiAgICAgIGV4aXRXaXRoU3RhdHVzQ29kZShzdGF0dXNDb2RlKSBpZiBnZXRXaW5kb3dMb2FkU2V0dGluZ3MoKS5oZWFkbGVzc1xuICBjYXRjaCBlcnJvclxuICAgIGlmIGdldFdpbmRvd0xvYWRTZXR0aW5ncygpLmhlYWRsZXNzXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yLnN0YWNrID8gZXJyb3IpXG4gICAgICBleGl0V2l0aFN0YXR1c0NvZGUoMSlcbiAgICBlbHNlXG4gICAgICB0aHJvdyBlcnJvclxuIl19
