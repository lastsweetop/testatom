Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

/** @babel */

var _electron = require('electron');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _ipcHelpers = require('./ipc-helpers');

var _ipcHelpers2 = _interopRequireDefault(_ipcHelpers);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

exports['default'] = _asyncToGenerator(function* () {
  var getWindowLoadSettings = require('./get-window-load-settings');

  var _getWindowLoadSettings = getWindowLoadSettings();

  var test = _getWindowLoadSettings.test;
  var headless = _getWindowLoadSettings.headless;
  var resourcePath = _getWindowLoadSettings.resourcePath;
  var benchmarkPaths = _getWindowLoadSettings.benchmarkPaths;

  try {
    yield* (function* () {
      var Clipboard = require('../src/clipboard');
      var ApplicationDelegate = require('../src/application-delegate');
      var AtomEnvironment = require('../src/atom-environment');
      var TextEditor = require('../src/text-editor');
      require('./electron-shims');

      var exportsPath = _path2['default'].join(resourcePath, 'exports');
      require('module').globalPaths.push(exportsPath); // Add 'exports' to module search path.
      process.env.NODE_PATH = exportsPath; // Set NODE_PATH env variable since tasks may need it.

      document.title = 'Benchmarks';
      // Allow `document.title` to be assigned in benchmarks without actually changing the window title.
      var documentTitle = null;
      Object.defineProperty(document, 'title', {
        get: function get() {
          return documentTitle;
        },
        set: function set(title) {
          documentTitle = title;
        }
      });

      window.addEventListener('keydown', function (event) {
        // Reload: cmd-r / ctrl-r
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 82) {
          _ipcHelpers2['default'].call('window-method', 'reload');
        }

        // Toggle Dev Tools: cmd-alt-i (Mac) / ctrl-shift-i (Linux/Windows)
        if (event.keyCode === 73) {
          var isDarwin = process.platform === 'darwin';
          if (isDarwin && event.metaKey && event.altKey || !isDarwin && event.ctrlKey && event.shiftKey) {
            _ipcHelpers2['default'].call('window-method', 'toggleDevTools');
          }
        }

        // Close: cmd-w / ctrl-w
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 87) {
          _ipcHelpers2['default'].call('window-method', 'close');
        }

        // Copy: cmd-c / ctrl-c
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 67) {
          _ipcHelpers2['default'].call('window-method', 'copy');
        }
      }, true);

      var clipboard = new Clipboard();
      TextEditor.setClipboard(clipboard);
      TextEditor.viewForItem = function (item) {
        return atom.views.getView(item);
      };

      var applicationDelegate = new ApplicationDelegate();
      var environmentParams = {
        applicationDelegate: applicationDelegate,
        window: window,
        document: document,
        clipboard: clipboard,
        configDirPath: process.env.ATOM_HOME,
        enablePersistence: false
      };
      global.atom = new AtomEnvironment(environmentParams);
      global.atom.initialize(environmentParams);

      // Prevent benchmarks from modifying application menus
      global.atom.menu.sendToBrowserProcess = function () {};

      if (headless) {
        Object.defineProperties(process, {
          stdout: { value: _electron.remote.process.stdout },
          stderr: { value: _electron.remote.process.stderr }
        });

        console.log = function () {
          var formatted = _util2['default'].format.apply(_util2['default'], arguments);
          process.stdout.write(formatted + '\n');
        };
        console.warn = function () {
          var formatted = _util2['default'].format.apply(_util2['default'], arguments);
          process.stderr.write(formatted + '\n');
        };
        console.error = function () {
          var formatted = _util2['default'].format.apply(_util2['default'], arguments);
          process.stderr.write(formatted + '\n');
        };
      } else {
        _electron.remote.getCurrentWindow().show();
      }

      var benchmarkRunner = require('../benchmarks/benchmark-runner');
      var statusCode = yield benchmarkRunner({ test: test, benchmarkPaths: benchmarkPaths });
      if (headless) {
        exitWithStatusCode(statusCode);
      }
    })();
  } catch (error) {
    if (headless) {
      console.error(error.stack || error);
      exitWithStatusCode(1);
    } else {
      _ipcHelpers2['default'].call('window-method', 'openDevTools');
      throw error;
    }
  }
});

function exitWithStatusCode(statusCode) {
  _electron.remote.app.emit('will-quit');
  _electron.remote.process.exit(statusCode);
}
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9kaXN0aWxsZXIvYXRvbS9vdXQvYXBwL3NyYy9pbml0aWFsaXplLWJlbmNobWFyay13aW5kb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozt3QkFFcUIsVUFBVTs7b0JBQ2QsTUFBTTs7OzswQkFDQSxlQUFlOzs7O29CQUNyQixNQUFNOzs7O3VDQUVSLGFBQWtCO0FBQy9CLE1BQU0scUJBQXFCLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUE7OytCQUNaLHFCQUFxQixFQUFFOztNQUF2RSxJQUFJLDBCQUFKLElBQUk7TUFBRSxRQUFRLDBCQUFSLFFBQVE7TUFBRSxZQUFZLDBCQUFaLFlBQVk7TUFBRSxjQUFjLDBCQUFkLGNBQWM7O0FBQ25ELE1BQUk7O0FBQ0YsVUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDN0MsVUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtBQUNsRSxVQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQTtBQUMxRCxVQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUNoRCxhQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQTs7QUFFM0IsVUFBTSxXQUFXLEdBQUcsa0JBQUssSUFBSSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUN0RCxhQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUMvQyxhQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUE7O0FBRW5DLGNBQVEsQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFBOztBQUU3QixVQUFJLGFBQWEsR0FBRyxJQUFJLENBQUE7QUFDeEIsWUFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFO0FBQ3ZDLFdBQUcsRUFBQyxlQUFHO0FB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bUJBQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtDQUNoQyIsImZpbGUiOiIvVXNlcnMvZGlzdGlsbGVyL2F0b20vb3V0L2FwcC9zcmMvaW5pdGlhbGl6ZS1iZW5jaG1hcmstd2luZG93LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBiYWJlbCAqL1xuXG5pbXBvcnQge3JlbW90ZX0gZnJvbSAnZWxlY3Ryb24nXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGlwY0hlbHBlcnMgZnJvbSAnLi9pcGMtaGVscGVycydcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnXG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgY29uc3QgZ2V0V2luZG93TG9hZFNldHRpbmdzID0gcmVxdWlyZSgnLi9nZXQtd2luZG93LWxvYWQtc2V0dGluZ3MnKVxuICBjb25zdCB7dGVzdCwgaGVhZGxlc3MsIHJlc291cmNlUGF0aCwgYmVuY2htYXJrUGF0aHN9ID0gZ2V0V2luZG93TG9hZFNldHRpbmdzKClcbiAgdHJ5IHtcbiAgICBjb25zdCBDbGlwYm9hcmQgPSByZXF1aXJlKCcuLi9zcmMvY2xpcGJvYXJkJylcbiAgICBjb25zdCBBcHBsaWNhdGlvbkRlbGVnYXRlID0gcmVxdWlyZSgnLi4vc3JjL2FwcGxpY2F0aW9uLWRlbGVnYXRlJylcbiAgICBjb25zdCBBdG9tRW52aXJvbm1lbnQgPSByZXF1aXJlKCcuLi9zcmMvYXRvbS1lbnZpcm9ubWVudCcpXG4gICAgY29uc3QgVGV4dEVkaXRvciA9IHJlcXVpcmUoJy4uL3NyYy90ZXh0LWVkaXRvcicpXG4gICAgcmVxdWlyZSgnLi9lbGVjdHJvbi1zaGltcycpXG5cbiAgICBjb25zdCBleHBvcnRzUGF0aCA9IHBhdGguam9pbihyZXNvdXJjZVBhdGgsICdleHBvcnRzJylcbiAgICByZXF1aXJlKCdtb2R1bGUnKS5nbG9iYWxQYXRocy5wdXNoKGV4cG9ydHNQYXRoKSAvLyBBZGQgJ2V4cG9ydHMnIHRvIG1vZHVsZSBzZWFyY2ggcGF0aC5cbiAgICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBleHBvcnRzUGF0aCAvLyBTZXQgTk9ERV9QQVRIIGVudiB2YXJpYWJsZSBzaW5jZSB0YXNrcyBtYXkgbmVlZCBpdC5cblxuICAgIGRvY3VtZW50LnRpdGxlID0gJ0JlbmNobWFya3MnXG4gICAgLy8gQWxsb3cgYGRvY3VtZW50LnRpdGxlYCB0byBiZSBhc3NpZ25lZCBpbiBiZW5jaG1hcmtzIHdpdGhvdXQgYWN0dWFsbHkgY2hhbmdpbmcgdGhlIHdpbmRvdyB0aXRsZS5cbiAgICBsZXQgZG9jdW1lbnRUaXRsZSA9IG51bGxcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZG9jdW1lbnQsICd0aXRsZScsIHtcbiAgICAgIGdldCAoKSB7IHJldHVybiBkb2N1bWVudFRpdGxlIH0sXG4gICAgICBzZXQgKHRpdGxlKSB7IGRvY3VtZW50VGl0bGUgPSB0aXRsZSB9XG4gICAgfSlcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICAvLyBSZWxvYWQ6IGNtZC1yIC8gY3RybC1yXG4gICAgICBpZiAoKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSkgJiYgZXZlbnQua2V5Q29kZSA9PT0gODIpIHtcbiAgICAgICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3JlbG9hZCcpXG4gICAgICB9XG5cbiAgICAgIC8vIFRvZ2dsZSBEZXYgVG9vbHM6IGNtZC1hbHQtaSAoTWFjKSAvIGN0cmwtc2hpZnQtaSAoTGludXgvV2luZG93cylcbiAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSA3Mykge1xuICAgICAgICBjb25zdCBpc0RhcndpbiA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nXG4gICAgICAgIGlmICgoaXNEYXJ3aW4gJiYgZXZlbnQubWV0YUtleSAmJiBldmVudC5hbHRLZXkpIHx8ICghaXNEYXJ3aW4gJiYgZXZlbnQuY3RybEtleSAmJiBldmVudC5zaGlmdEtleSkpIHtcbiAgICAgICAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAndG9nZ2xlRGV2VG9vbHMnKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENsb3NlOiBjbWQtdyAvIGN0cmwtd1xuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleUNvZGUgPT09IDg3KSB7XG4gICAgICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdjbG9zZScpXG4gICAgICB9XG5cbiAgICAgIC8vIENvcHk6IGNtZC1jIC8gY3RybC1jXG4gICAgICBpZiAoKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSkgJiYgZXZlbnQua2V5Q29kZSA9PT0gNjcpIHtcbiAgICAgICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ2NvcHknKVxuICAgICAgfVxuICAgIH0sIHRydWUpXG5cbiAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkKClcbiAgICBUZXh0RWRpdG9yLnNldENsaXBib2FyZChjbGlwYm9hcmQpXG4gICAgVGV4dEVkaXRvci52aWV3Rm9ySXRlbSA9IChpdGVtKSA9PiBhdG9tLnZpZXdzLmdldFZpZXcoaXRlbSlcblxuICAgIGNvbnN0IGFwcGxpY2F0aW9uRGVsZWdhdGUgPSBuZXcgQXBwbGljYXRpb25EZWxlZ2F0ZSgpXG4gICAgY29uc3QgZW52aXJvbm1lbnRQYXJhbXMgPSB7XG4gICAgICBhcHBsaWNhdGlvbkRlbGVnYXRlLFxuICAgICAgd2luZG93LFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBjbGlwYm9hcmQsXG4gICAgICBjb25maWdEaXJQYXRoOiBwcm9jZXNzLmVudi5BVE9NX0hPTUUsXG4gICAgICBlbmFibGVQZXJzaXN0ZW5jZTogZmFsc2VcbiAgICB9XG4gICAgZ2xvYmFsLmF0b20gPSBuZXcgQXRvbUVudmlyb25tZW50KGVudmlyb25tZW50UGFyYW1zKVxuICAgIGdsb2JhbC5hdG9tLmluaXRpYWxpemUoZW52aXJvbm1lbnRQYXJhbXMpXG5cbiAgICAvLyBQcmV2ZW50IGJlbmNobWFya3MgZnJvbSBtb2RpZnlpbmcgYXBwbGljYXRpb24gbWVudXNcbiAgICBnbG9iYWwuYXRvbS5tZW51LnNlbmRUb0Jyb3dzZXJQcm9jZXNzID0gZnVuY3Rpb24gKCkgeyB9XG5cbiAgICBpZiAoaGVhZGxlc3MpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHByb2Nlc3MsIHtcbiAgICAgICAgc3Rkb3V0OiB7IHZhbHVlOiByZW1vdGUucHJvY2Vzcy5zdGRvdXQgfSxcbiAgICAgICAgc3RkZXJyOiB7IHZhbHVlOiByZW1vdGUucHJvY2Vzcy5zdGRlcnIgfVxuICAgICAgfSlcblxuICAgICAgY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSB1dGlsLmZvcm1hdCguLi5hcmdzKVxuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShmb3JtYXR0ZWQgKyAnXFxuJylcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUud2FybiA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IHV0aWwuZm9ybWF0KC4uLmFyZ3MpXG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGZvcm1hdHRlZCArICdcXG4nKVxuICAgICAgfVxuICAgICAgY29uc29sZS5lcnJvciA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IHV0aWwuZm9ybWF0KC4uLmFyZ3MpXG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGZvcm1hdHRlZCArICdcXG4nKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLnNob3coKVxuICAgIH1cblxuICAgIGNvbnN0IGJlbmNobWFya1J1bm5lciA9IHJlcXVpcmUoJy4uL2JlbmNobWFya3MvYmVuY2htYXJrLXJ1bm5lcicpXG4gICAgY29uc3Qgc3RhdHVzQ29kZSA9IGF3YWl0IGJlbmNobWFya1J1bm5lcih7dGVzdCwgYmVuY2htYXJrUGF0aHN9KVxuICAgIGlmIChoZWFkbGVzcykge1xuICAgICAgZXhpdFdpdGhTdGF0dXNDb2RlKHN0YXR1c0NvZGUpXG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoZWFkbGVzcykge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvci5zdGFjayB8fCBlcnJvcilcbiAgICAgIGV4aXRXaXRoU3RhdHVzQ29kZSgxKVxuICAgIH0gZWxzZSB7XG4gICAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnb3BlbkRldlRvb2xzJylcbiAgICAgIHRocm93IGVycm9yXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGV4aXRXaXRoU3RhdHVzQ29kZSAoc3RhdHVzQ29kZSkge1xuICByZW1vdGUuYXBwLmVtaXQoJ3dpbGwtcXVpdCcpXG4gIHJlbW90ZS5wcm9jZXNzLmV4aXQoc3RhdHVzQ29kZSlcbn1cbiJdfQ==