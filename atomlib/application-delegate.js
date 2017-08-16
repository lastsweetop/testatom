(function() {
  var ApplicationDelegate, Disposable, _, getWindowLoadSettings, ipcHelpers, ipcRenderer, ref, remote, shell,
    slice = [].slice;

  _ = require('underscore-plus');

  ref = require('electron'), ipcRenderer = ref.ipcRenderer, remote = ref.remote, shell = ref.shell;

  ipcHelpers = require('./ipc-helpers');

  Disposable = require('event-kit').Disposable;

  getWindowLoadSettings = require('./get-window-load-settings');

  module.exports = ApplicationDelegate = (function() {
    function ApplicationDelegate() {}

    ApplicationDelegate.prototype.getWindowLoadSettings = function() {
      return getWindowLoadSettings();
    };

    ApplicationDelegate.prototype.open = function(params) {
      return ipcRenderer.send('open', params);
    };

    ApplicationDelegate.prototype.pickFolder = function(callback) {
      var responseChannel;
      responseChannel = "atom-pick-folder-response";
      ipcRenderer.on(responseChannel, function(event, path) {
        ipcRenderer.removeAllListeners(responseChannel);
        return callback(path);
      });
      return ipcRenderer.send("pick-folder", responseChannel);
    };

    ApplicationDelegate.prototype.getCurrentWindow = function() {
      return remote.getCurrentWindow();
    };

    ApplicationDelegate.prototype.closeWindow = function() {
      return ipcHelpers.call('window-method', 'close');
    };

    ApplicationDelegate.prototype.getTemporaryWindowState = function() {
      return ipcHelpers.call('get-temporary-window-state').then(function(stateJSON) {
        return JSON.parse(stateJSON);
      });
    };

    ApplicationDelegate.prototype.setTemporaryWindowState = function(state) {
      return ipcHelpers.call('set-temporary-window-state', JSON.stringify(state));
    };

    ApplicationDelegate.prototype.getWindowSize = function() {
      var height, ref1, width;
      ref1 = remote.getCurrentWindow().getSize(), width = ref1[0], height = ref1[1];
      return {
        width: width,
        height: height
      };
    };

    ApplicationDelegate.prototype.setWindowSize = function(width, height) {
      return ipcHelpers.call('set-window-size', width, height);
    };

    ApplicationDelegate.prototype.getWindowPosition = function() {
      var ref1, x, y;
      ref1 = remote.getCurrentWindow().getPosition(), x = ref1[0], y = ref1[1];
      return {
        x: x,
        y: y
      };
    };

    ApplicationDelegate.prototype.setWindowPosition = function(x, y) {
      return ipcHelpers.call('set-window-position', x, y);
    };

    ApplicationDelegate.prototype.centerWindow = function() {
      return ipcHelpers.call('center-window');
    };

    ApplicationDelegate.prototype.focusWindow = function() {
      return ipcHelpers.call('focus-window');
    };

    ApplicationDelegate.prototype.showWindow = function() {
      return ipcHelpers.call('show-window');
    };

    ApplicationDelegate.prototype.hideWindow = function() {
      return ipcHelpers.call('hide-window');
    };

    ApplicationDelegate.prototype.reloadWindow = function() {
      return ipcHelpers.call('window-method', 'reload');
    };

    ApplicationDelegate.prototype.restartApplication = function() {
      return ipcRenderer.send("restart-application");
    };

    ApplicationDelegate.prototype.minimizeWindow = function() {
      return ipcHelpers.call('window-method', 'minimize');
    };

    ApplicationDelegate.prototype.isWindowMaximized = function() {
      return remote.getCurrentWindow().isMaximized();
    };

    ApplicationDelegate.prototype.maximizeWindow = function() {
      return ipcHelpers.call('window-method', 'maximize');
    };

    ApplicationDelegate.prototype.unmaximizeWindow = function() {
      return ipcHelpers.call('window-method', 'unmaximize');
    };

    ApplicationDelegate.prototype.isWindowFullScreen = function() {
      return remote.getCurrentWindow().isFullScreen();
    };

    ApplicationDelegate.prototype.setWindowFullScreen = function(fullScreen) {
      if (fullScreen == null) {
        fullScreen = false;
      }
      return ipcHelpers.call('window-method', 'setFullScreen', fullScreen);
    };

    ApplicationDelegate.prototype.onDidEnterFullScreen = function(callback) {
      return ipcHelpers.on(ipcRenderer, 'did-enter-full-screen', callback);
    };

    ApplicationDelegate.prototype.onDidLeaveFullScreen = function(callback) {
      return ipcHelpers.on(ipcRenderer, 'did-leave-full-screen', callback);
    };

    ApplicationDelegate.prototype.openWindowDevTools = function() {
      return new Promise(process.nextTick).then(function() {
        return ipcHelpers.call('window-method', 'openDevTools');
      });
    };

    ApplicationDelegate.prototype.closeWindowDevTools = function() {
      return new Promise(process.nextTick).then(function() {
        return ipcHelpers.call('window-method', 'closeDevTools');
      });
    };

    ApplicationDelegate.prototype.toggleWindowDevTools = function() {
      return new Promise(process.nextTick).then(function() {
        return ipcHelpers.call('window-method', 'toggleDevTools');
      });
    };

    ApplicationDelegate.prototype.executeJavaScriptInWindowDevTools = function(code) {
      return ipcRenderer.send("execute-javascript-in-dev-tools", code);
    };

    ApplicationDelegate.prototype.setWindowDocumentEdited = function(edited) {
      return ipcHelpers.call('window-method', 'setDocumentEdited', edited);
    };

    ApplicationDelegate.prototype.setRepresentedFilename = function(filename) {
      return ipcHelpers.call('window-method', 'setRepresentedFilename', filename);
    };

    ApplicationDelegate.prototype.addRecentDocument = function(filename) {
      return ipcRenderer.send("add-recent-document", filename);
    };

    ApplicationDelegate.prototype.setRepresentedDirectoryPaths = function(paths) {
      return ipcHelpers.call('window-method', 'setRepresentedDirectoryPaths', paths);
    };

    ApplicationDelegate.prototype.setAutoHideWindowMenuBar = function(autoHide) {
      return ipcHelpers.call('window-method', 'setAutoHideMenuBar', autoHide);
    };

    ApplicationDelegate.prototype.setWindowMenuBarVisibility = function(visible) {
      return remote.getCurrentWindow().setMenuBarVisibility(visible);
    };

    ApplicationDelegate.prototype.getPrimaryDisplayWorkAreaSize = function() {
      return remote.screen.getPrimaryDisplay().workAreaSize;
    };

    ApplicationDelegate.prototype.getUserDefault = function(key, type) {
      return remote.systemPreferences.getUserDefault(key, type);
    };

    ApplicationDelegate.prototype.confirm = function(arg) {
      var buttonLabels, buttons, callback, chosen, detailedMessage, message;
      message = arg.message, detailedMessage = arg.detailedMessage, buttons = arg.buttons;
      if (buttons == null) {
        buttons = {};
      }
      if (_.isArray(buttons)) {
        buttonLabels = buttons;
      } else {
        buttonLabels = Object.keys(buttons);
      }
      chosen = remote.dialog.showMessageBox(remote.getCurrentWindow(), {
        type: 'info',
        message: message,
        detail: detailedMessage,
        buttons: buttonLabels
      });
      if (_.isArray(buttons)) {
        return chosen;
      } else {
        callback = buttons[buttonLabels[chosen]];
        return typeof callback === "function" ? callback() : void 0;
      }
    };

    ApplicationDelegate.prototype.showMessageDialog = function(params) {};

    ApplicationDelegate.prototype.showSaveDialog = function(params) {
      if (typeof params === 'string') {
        params = {
          defaultPath: params
        };
      }
      return this.getCurrentWindow().showSaveDialog(params);
    };

    ApplicationDelegate.prototype.playBeepSound = function() {
      return shell.beep();
    };

    ApplicationDelegate.prototype.onDidOpenLocations = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'open-locations') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onUpdateAvailable = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'did-begin-downloading-update') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onDidBeginDownloadingUpdate = function(callback) {
      return this.onUpdateAvailable(callback);
    };

    ApplicationDelegate.prototype.onDidBeginCheckingForUpdate = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'checking-for-update') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onDidCompleteDownloadingUpdate = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'update-available') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onUpdateNotAvailable = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'update-not-available') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onUpdateError = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'update-error') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onApplicationMenuCommand = function(callback) {
      var outerCallback;
      outerCallback = function() {
        var args, event;
        event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return callback.apply(null, args);
      };
      ipcRenderer.on('command', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('command', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onContextMenuCommand = function(callback) {
      var outerCallback;
      outerCallback = function() {
        var args, event;
        event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return callback.apply(null, args);
      };
      ipcRenderer.on('context-command', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('context-command', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onDidRequestUnload = function(callback) {
      var outerCallback;
      outerCallback = function(event, message) {
        return callback(event).then(function(shouldUnload) {
          return ipcRenderer.send('did-prepare-to-unload', shouldUnload);
        });
      };
      ipcRenderer.on('prepare-to-unload', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('prepare-to-unload', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onDidChangeHistoryManager = function(callback) {
      var outerCallback;
      outerCallback = function(event, message) {
        return callback(event);
      };
      ipcRenderer.on('did-change-history-manager', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('did-change-history-manager', outerCallback);
      });
    };

    ApplicationDelegate.prototype.didChangeHistoryManager = function() {
      return ipcRenderer.send('did-change-history-manager');
    };

    ApplicationDelegate.prototype.openExternal = function(url) {
      return shell.openExternal(url);
    };

    ApplicationDelegate.prototype.checkForUpdate = function() {
      return ipcRenderer.send('command', 'application:check-for-update');
    };

    ApplicationDelegate.prototype.restartAndInstallUpdate = function() {
      return ipcRenderer.send('command', 'application:install-update');
    };

    ApplicationDelegate.prototype.getAutoUpdateManagerState = function() {
      return ipcRenderer.sendSync('get-auto-update-manager-state');
    };

    ApplicationDelegate.prototype.getAutoUpdateManagerErrorMessage = function() {
      return ipcRenderer.sendSync('get-auto-update-manager-error');
    };

    ApplicationDelegate.prototype.emitWillSavePath = function(path) {
      return ipcRenderer.sendSync('will-save-path', path);
    };

    ApplicationDelegate.prototype.emitDidSavePath = function(path) {
      return ipcRenderer.sendSync('did-save-path', path);
    };

    ApplicationDelegate.prototype.resolveProxy = function(requestId, url) {
      return ipcRenderer.send('resolve-proxy', requestId, url);
    };

    ApplicationDelegate.prototype.onDidResolveProxy = function(callback) {
      var outerCallback;
      outerCallback = function(event, requestId, proxy) {
        return callback(requestId, proxy);
      };
      ipcRenderer.on('did-resolve-proxy', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('did-resolve-proxy', outerCallback);
      });
    };

    return ApplicationDelegate;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2FwcGxpY2F0aW9uLWRlbGVnYXRlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsc0dBQUE7SUFBQTs7RUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLE1BQStCLE9BQUEsQ0FBUSxVQUFSLENBQS9CLEVBQUMsNkJBQUQsRUFBYyxtQkFBZCxFQUFzQjs7RUFDdEIsVUFBQSxHQUFhLE9BQUEsQ0FBUSxlQUFSOztFQUNaLGFBQWMsT0FBQSxDQUFRLFdBQVI7O0VBQ2YscUJBQUEsR0FBd0IsT0FBQSxDQUFRLDRCQUFSOztFQUV4QixNQUFNLENBQUMsT0FBUCxHQUNNOzs7a0NBQ0oscUJBQUEsR0FBdUIsU0FBQTthQUFHLHFCQUFBLENBQUE7SUFBSDs7a0NBRXZCLElBQUEsR0FBTSxTQUFDLE1BQUQ7YUFDSixXQUFXLENBQUMsSUFBWixDQUFpQixNQUFqQixFQUF5QixNQUF6QjtJQURJOztrQ0FHTixVQUFBLEdBQVksU0FBQyxRQUFEO0FBQ1YsVUFBQTtNQUFBLGVBQUEsR0FBa0I7TUFDbEIsV0FBVyxDQUFDLEVBQVosQ0FBZSxlQUFmLEVBQWdDLFNBQUMsS0FBRCxFQUFRLElBQVI7UUFDOUIsV0FBVyxDQUFDLGtCQUFaLENBQStCLGVBQS9CO2VBQ0EsUUFBQSxDQUFTLElBQVQ7TUFGOEIsQ0FBaEM7YUFHQSxXQUFXLENBQUMsSUFBWixDQUFpQixhQUFqQixFQUFnQyxlQUFoQztJQUxVOztrQ0FPWixnQkFBQSxHQUFrQixTQUFBO2FBQ2hCLE1BQU0sQ0FBQyxnQkFBUCxDQUFBO0lBRGdCOztrQ0FHbEIsV0FBQSxHQUFhLFNBQUE7YUFDWCxVQUFVLENBQUMsSUFBWCxDQUFnQixlQUFoQixFQUFpQyxPQUFqQztJQURXOztrQ0FHYix1QkFBQSxHQUF5QixTQUFBO2FBQ3ZCLFVBQVUsQ0FBQyxJQUFYLENB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O01BQUEsYUFBQSxHQUFnQixTQUFDLEtBQUQsRUFBUSxTQUFSLEVBQW1CLEtBQW5CO2VBQ2QsUUFBQSxDQUFTLFNBQVQsRUFBb0IsS0FBcEI7TUFEYztNQUdoQixXQUFXLENBQUMsRUFBWixDQUFlLG1CQUFmLEVBQW9DLGFBQXBDO2FBQ0ksSUFBQSxVQUFBLENBQVcsU0FBQTtlQUNiLFdBQVcsQ0FBQyxjQUFaLENBQTJCLG1CQUEzQixFQUFnRCxhQUFoRDtNQURhLENBQVg7SUFMYTs7Ozs7QUF0UnJCIiwic291cmNlc0NvbnRlbnQiOlsiXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbntpcGNSZW5kZXJlciwgcmVtb3RlLCBzaGVsbH0gPSByZXF1aXJlICdlbGVjdHJvbidcbmlwY0hlbHBlcnMgPSByZXF1aXJlICcuL2lwYy1oZWxwZXJzJ1xue0Rpc3Bvc2FibGV9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuZ2V0V2luZG93TG9hZFNldHRpbmdzID0gcmVxdWlyZSAnLi9nZXQtd2luZG93LWxvYWQtc2V0dGluZ3MnXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEFwcGxpY2F0aW9uRGVsZWdhdGVcbiAgZ2V0V2luZG93TG9hZFNldHRpbmdzOiAtPiBnZXRXaW5kb3dMb2FkU2V0dGluZ3MoKVxuXG4gIG9wZW46IChwYXJhbXMpIC0+XG4gICAgaXBjUmVuZGVyZXIuc2VuZCgnb3BlbicsIHBhcmFtcylcblxuICBwaWNrRm9sZGVyOiAoY2FsbGJhY2spIC0+XG4gICAgcmVzcG9uc2VDaGFubmVsID0gXCJhdG9tLXBpY2stZm9sZGVyLXJlc3BvbnNlXCJcbiAgICBpcGNSZW5kZXJlci5vbiByZXNwb25zZUNoYW5uZWwsIChldmVudCwgcGF0aCkgLT5cbiAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUFsbExpc3RlbmVycyhyZXNwb25zZUNoYW5uZWwpXG4gICAgICBjYWxsYmFjayhwYXRoKVxuICAgIGlwY1JlbmRlcmVyLnNlbmQoXCJwaWNrLWZvbGRlclwiLCByZXNwb25zZUNoYW5uZWwpXG5cbiAgZ2V0Q3VycmVudFdpbmRvdzogLT5cbiAgICByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpXG5cbiAgY2xvc2VXaW5kb3c6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ2Nsb3NlJylcblxuICBnZXRUZW1wb3JhcnlXaW5kb3dTdGF0ZTogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ2dldC10ZW1wb3Jhcnktd2luZG93LXN0YXRlJykudGhlbiAoc3RhdGVKU09OKSAtPiBKU09OLnBhcnNlKHN0YXRlSlNPTilcblxuICBzZXRUZW1wb3JhcnlXaW5kb3dTdGF0ZTogKHN0YXRlKSAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnc2V0LXRlbXBvcmFyeS13aW5kb3ctc3RhdGUnLCBKU09OLnN0cmluZ2lmeShzdGF0ZSkpXG5cbiAgZ2V0V2luZG93U2l6ZTogLT5cbiAgICBbd2lkdGgsIGhlaWdodF0gPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmdldFNpemUoKVxuICAgIHt3aWR0aCwgaGVpZ2h0fVxuXG4gIHNldFdpbmRvd1NpemU6ICh3aWR0aCwgaGVpZ2h0KSAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnc2V0LXdpbmRvdy1zaXplJywgd2lkdGgsIGhlaWdodClcblxuICBnZXRXaW5kb3dQb3NpdGlvbjogLT5cbiAgICBbeCwgeV0gPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmdldFBvc2l0aW9uKClcbiAgICB7eCwgeX1cblxuICBzZXRXaW5kb3dQb3NpdGlvbjogKHgsIHkpIC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCdzZXQtd2luZG93LXBvc2l0aW9uJywgeCwgeSlcblxuICBjZW50ZXJXaW5kb3c6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCdjZW50ZXItd2luZG93JylcblxuICBmb2N1c1dpbmRvdzogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ2ZvY3VzLXdpbmRvdycpXG5cbiAgc2hvd1dpbmRvdzogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3Nob3ctd2luZG93JylcblxuICBoaWRlV2luZG93OiAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnaGlkZS13aW5kb3cnKVxuXG4gIHJlbG9hZFdpbmRvdzogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAncmVsb2FkJylcblxuICByZXN0YXJ0QXBwbGljYXRpb246IC0+XG4gICAgaXBjUmVuZGVyZXIuc2VuZChcInJlc3RhcnQtYXBwbGljYXRpb25cIilcblxuICBtaW5pbWl6ZVdpbmRvdzogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnbWluaW1pemUnKVxuXG4gIGlzV2luZG93TWF4aW1pemVkOiAtPlxuICAgIHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkuaXNNYXhpbWl6ZWQoKVxuXG4gIG1heGltaXplV2luZG93OiAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdtYXhpbWl6ZScpXG5cbiAgdW5tYXhpbWl6ZVdpbmRvdzogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAndW5tYXhpbWl6ZScpXG5cbiAgaXNXaW5kb3dGdWxsU2NyZWVuOiAtPlxuICAgIHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkuaXNGdWxsU2NyZWVuKClcblxuICBzZXRXaW5kb3dGdWxsU2NyZWVuOiAoZnVsbFNjcmVlbj1mYWxzZSkgLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnc2V0RnVsbFNjcmVlbicsIGZ1bGxTY3JlZW4pXG5cbiAgb25EaWRFbnRlckZ1bGxTY3JlZW46IChjYWxsYmFjaykgLT5cbiAgICBpcGNIZWxwZXJzLm9uKGlwY1JlbmRlcmVyLCAnZGlkLWVudGVyLWZ1bGwtc2NyZWVuJywgY2FsbGJhY2spXG5cbiAgb25EaWRMZWF2ZUZ1bGxTY3JlZW46IChjYWxsYmFjaykgLT5cbiAgICBpcGNIZWxwZXJzLm9uKGlwY1JlbmRlcmVyLCAnZGlkLWxlYXZlLWZ1bGwtc2NyZWVuJywgY2FsbGJhY2spXG5cbiAgb3BlbldpbmRvd0RldlRvb2xzOiAtPlxuICAgICMgRGVmZXIgRGV2VG9vbHMgaW50ZXJhY3Rpb24gdG8gdGhlIG5leHQgdGljaywgYmVjYXVzZSB1c2luZyB0aGVtIGR1cmluZ1xuICAgICMgZXZlbnQgaGFuZGxpbmcgY2F1c2VzIHNvbWUgd3JvbmcgaW5wdXQgZXZlbnRzIHRvIGJlIHRyaWdnZXJlZCBvblxuICAgICMgYFRleHRFZGl0b3JDb21wb25lbnRgIChSZWYuOiBodHRwczovL2dpdGh1Yi5jb20vYXRvbS9hdG9tL2lzc3Vlcy85Njk3KS5cbiAgICBuZXcgUHJvbWlzZShwcm9jZXNzLm5leHRUaWNrKS50aGVuKC0+IGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdvcGVuRGV2VG9vbHMnKSlcblxuICBjbG9zZVdpbmRvd0RldlRvb2xzOiAtPlxuICAgICMgRGVmZXIgRGV2VG9vbHMgaW50ZXJhY3Rpb24gdG8gdGhlIG5leHQgdGljaywgYmVjYXVzZSB1c2luZyB0aGVtIGR1cmluZ1xuICAgICMgZXZlbnQgaGFuZGxpbmcgY2F1c2VzIHNvbWUgd3JvbmcgaW5wdXQgZXZlbnRzIHRvIGJlIHRyaWdnZXJlZCBvblxuICAgICMgYFRleHRFZGl0b3JDb21wb25lbnRgIChSZWYuOiBodHRwczovL2dpdGh1Yi5jb20vYXRvbS9hdG9tL2lzc3Vlcy85Njk3KS5cbiAgICBuZXcgUHJvbWlzZShwcm9jZXNzLm5leHRUaWNrKS50aGVuKC0+IGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdjbG9zZURldlRvb2xzJykpXG5cbiAgdG9nZ2xlV2luZG93RGV2VG9vbHM6IC0+XG4gICAgIyBEZWZlciBEZXZUb29scyBpbnRlcmFjdGlvbiB0byB0aGUgbmV4dCB0aWNrLCBiZWNhdXNlIHVzaW5nIHRoZW0gZHVyaW5nXG4gICAgIyBldmVudCBoYW5kbGluZyBjYXVzZXMgc29tZSB3cm9uZyBpbnB1dCBldmVudHMgdG8gYmUgdHJpZ2dlcmVkIG9uXG4gICAgIyBgVGV4dEVkaXRvckNvbXBvbmVudGAgKFJlZi46IGh0dHBzOi8vZ2l0aHViLmNvbS9hdG9tL2F0b20vaXNzdWVzLzk2OTcpLlxuICAgIG5ldyBQcm9taXNlKHByb2Nlc3MubmV4dFRpY2spLnRoZW4oLT4gaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3RvZ2dsZURldlRvb2xzJykpXG5cbiAgZXhlY3V0ZUphdmFTY3JpcHRJbldpbmRvd0RldlRvb2xzOiAoY29kZSkgLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kKFwiZXhlY3V0ZS1qYXZhc2NyaXB0LWluLWRldi10b29sc1wiLCBjb2RlKVxuXG4gIHNldFdpbmRvd0RvY3VtZW50RWRpdGVkOiAoZWRpdGVkKSAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdzZXREb2N1bWVudEVkaXRlZCcsIGVkaXRlZClcblxuICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lOiAoZmlsZW5hbWUpIC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3NldFJlcHJlc2VudGVkRmlsZW5hbWUnLCBmaWxlbmFtZSlcblxuICBhZGRSZWNlbnREb2N1bWVudDogKGZpbGVuYW1lKSAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQoXCJhZGQtcmVjZW50LWRvY3VtZW50XCIsIGZpbGVuYW1lKVxuXG4gIHNldFJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHM6IChwYXRocykgLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnc2V0UmVwcmVzZW50ZWREaXJlY3RvcnlQYXRocycsIHBhdGhzKVxuXG4gIHNldEF1dG9IaWRlV2luZG93TWVudUJhcjogKGF1dG9IaWRlKSAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdzZXRBdXRvSGlkZU1lbnVCYXInLCBhdXRvSGlkZSlcblxuICBzZXRXaW5kb3dNZW51QmFyVmlzaWJpbGl0eTogKHZpc2libGUpIC0+XG4gICAgcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5zZXRNZW51QmFyVmlzaWJpbGl0eSh2aXNpYmxlKVxuXG4gIGdldFByaW1hcnlEaXNwbGF5V29ya0FyZWFTaXplOiAtPlxuICAgIHJlbW90ZS5zY3JlZW4uZ2V0UHJpbWFyeURpc3BsYXkoKS53b3JrQXJlYVNpemVcblxuICBnZXRVc2VyRGVmYXVsdDogKGtleSwgdHlwZSkgLT5cbiAgICByZW1vdGUuc3lzdGVtUHJlZmVyZW5jZXMuZ2V0VXNlckRlZmF1bHQoa2V5LCB0eXBlKVxuXG4gIGNvbmZpcm06ICh7bWVzc2FnZSwgZGV0YWlsZWRNZXNzYWdlLCBidXR0b25zfSkgLT5cbiAgICBidXR0b25zID89IHt9XG4gICAgaWYgXy5pc0FycmF5KGJ1dHRvbnMpXG4gICAgICBidXR0b25MYWJlbHMgPSBidXR0b25zXG4gICAgZWxzZVxuICAgICAgYnV0dG9uTGFiZWxzID0gT2JqZWN0LmtleXMoYnV0dG9ucylcblxuICAgIGNob3NlbiA9IHJlbW90ZS5kaWFsb2cuc2hvd01lc3NhZ2VCb3gocmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKSwge1xuICAgICAgdHlwZTogJ2luZm8nXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICBkZXRhaWw6IGRldGFpbGVkTWVzc2FnZVxuICAgICAgYnV0dG9uczogYnV0dG9uTGFiZWxzXG4gICAgfSlcblxuICAgIGlmIF8uaXNBcnJheShidXR0b25zKVxuICAgICAgY2hvc2VuXG4gICAgZWxzZVxuICAgICAgY2FsbGJhY2sgPSBidXR0b25zW2J1dHRvbkxhYmVsc1tjaG9zZW5dXVxuICAgICAgY2FsbGJhY2s/KClcblxuICBzaG93TWVzc2FnZURpYWxvZzogKHBhcmFtcykgLT5cblxuICBzaG93U2F2ZURpYWxvZzogKHBhcmFtcykgLT5cbiAgICBpZiB0eXBlb2YgcGFyYW1zIGlzICdzdHJpbmcnXG4gICAgICBwYXJhbXMgPSB7ZGVmYXVsdFBhdGg6IHBhcmFtc31cbiAgICBAZ2V0Q3VycmVudFdpbmRvdygpLnNob3dTYXZlRGlhbG9nKHBhcmFtcylcblxuICBwbGF5QmVlcFNvdW5kOiAtPlxuICAgIHNoZWxsLmJlZXAoKVxuXG4gIG9uRGlkT3BlbkxvY2F0aW9uczogKGNhbGxiYWNrKSAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSAoZXZlbnQsIG1lc3NhZ2UsIGRldGFpbCkgLT5cbiAgICAgIGNhbGxiYWNrKGRldGFpbCkgaWYgbWVzc2FnZSBpcyAnb3Blbi1sb2NhdGlvbnMnXG5cbiAgICBpcGNSZW5kZXJlci5vbignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG4gICAgbmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKCdtZXNzYWdlJywgb3V0ZXJDYWxsYmFjaylcblxuICBvblVwZGF0ZUF2YWlsYWJsZTogKGNhbGxiYWNrKSAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSAoZXZlbnQsIG1lc3NhZ2UsIGRldGFpbCkgLT5cbiAgICAgICMgVE9ETzogWWVzLCB0aGlzIGlzIHN0cmFuZ2UgdGhhdCBgb25VcGRhdGVBdmFpbGFibGVgIGlzIGxpc3RlbmluZyBmb3JcbiAgICAgICMgYGRpZC1iZWdpbi1kb3dubG9hZGluZy11cGRhdGVgLiBXZSBjdXJyZW50bHkgaGF2ZSBubyBtZWNoYW5pc20gdG8ga25vd1xuICAgICAgIyBpZiB0aGVyZSBpcyBhbiB1cGRhdGUsIHNvIGJlZ2luIG9mIGRvd25sb2FkaW5nIGlzIGEgZ29vZCBwcm94eS5cbiAgICAgIGNhbGxiYWNrKGRldGFpbCkgaWYgbWVzc2FnZSBpcyAnZGlkLWJlZ2luLWRvd25sb2FkaW5nLXVwZGF0ZSdcblxuICAgIGlwY1JlbmRlcmVyLm9uKCdtZXNzYWdlJywgb3V0ZXJDYWxsYmFjaylcbiAgICBuZXcgRGlzcG9zYWJsZSAtPlxuICAgICAgaXBjUmVuZGVyZXIucmVtb3ZlTGlzdGVuZXIoJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuXG4gIG9uRGlkQmVnaW5Eb3dubG9hZGluZ1VwZGF0ZTogKGNhbGxiYWNrKSAtPlxuICAgIEBvblVwZGF0ZUF2YWlsYWJsZShjYWxsYmFjaylcblxuICBvbkRpZEJlZ2luQ2hlY2tpbmdGb3JVcGRhdGU6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlLCBkZXRhaWwpIC0+XG4gICAgICBjYWxsYmFjayhkZXRhaWwpIGlmIG1lc3NhZ2UgaXMgJ2NoZWNraW5nLWZvci11cGRhdGUnXG5cbiAgICBpcGNSZW5kZXJlci5vbignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG4gICAgbmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKCdtZXNzYWdlJywgb3V0ZXJDYWxsYmFjaylcblxuICBvbkRpZENvbXBsZXRlRG93bmxvYWRpbmdVcGRhdGU6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlLCBkZXRhaWwpIC0+XG4gICAgICAjIFRPRE86IFdlIGNvdWxkIHJlbmFtZSB0aGlzIGV2ZW50IHRvIGBkaWQtY29tcGxldGUtZG93bmxvYWRpbmctdXBkYXRlYFxuICAgICAgY2FsbGJhY2soZGV0YWlsKSBpZiBtZXNzYWdlIGlzICd1cGRhdGUtYXZhaWxhYmxlJ1xuXG4gICAgaXBjUmVuZGVyZXIub24oJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG5cbiAgb25VcGRhdGVOb3RBdmFpbGFibGU6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlLCBkZXRhaWwpIC0+XG4gICAgICBjYWxsYmFjayhkZXRhaWwpIGlmIG1lc3NhZ2UgaXMgJ3VwZGF0ZS1ub3QtYXZhaWxhYmxlJ1xuXG4gICAgaXBjUmVuZGVyZXIub24oJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG5cbiAgb25VcGRhdGVFcnJvcjogKGNhbGxiYWNrKSAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSAoZXZlbnQsIG1lc3NhZ2UsIGRldGFpbCkgLT5cbiAgICAgIGNhbGxiYWNrKGRldGFpbCkgaWYgbWVzc2FnZSBpcyAndXBkYXRlLWVycm9yJ1xuXG4gICAgaXBjUmVuZGVyZXIub24oJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG5cbiAgb25BcHBsaWNhdGlvbk1lbnVDb21tYW5kOiAoY2FsbGJhY2spIC0+XG4gICAgb3V0ZXJDYWxsYmFjayA9IChldmVudCwgYXJncy4uLikgLT5cbiAgICAgIGNhbGxiYWNrKGFyZ3MuLi4pXG5cbiAgICBpcGNSZW5kZXJlci5vbignY29tbWFuZCcsIG91dGVyQ2FsbGJhY2spXG4gICAgbmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKCdjb21tYW5kJywgb3V0ZXJDYWxsYmFjaylcblxuICBvbkNvbnRleHRNZW51Q29tbWFuZDogKGNhbGxiYWNrKSAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSAoZXZlbnQsIGFyZ3MuLi4pIC0+XG4gICAgICBjYWxsYmFjayhhcmdzLi4uKVxuXG4gICAgaXBjUmVuZGVyZXIub24oJ2NvbnRleHQtY29tbWFuZCcsIG91dGVyQ2FsbGJhY2spXG4gICAgbmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKCdjb250ZXh0LWNvbW1hbmQnLCBvdXRlckNhbGxiYWNrKVxuXG4gIG9uRGlkUmVxdWVzdFVubG9hZDogKGNhbGxiYWNrKSAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSAoZXZlbnQsIG1lc3NhZ2UpIC0+XG4gICAgICBjYWxsYmFjayhldmVudCkudGhlbiAoc2hvdWxkVW5sb2FkKSAtPlxuICAgICAgICBpcGNSZW5kZXJlci5zZW5kKCdkaWQtcHJlcGFyZS10by11bmxvYWQnLCBzaG91bGRVbmxvYWQpXG5cbiAgICBpcGNSZW5kZXJlci5vbigncHJlcGFyZS10by11bmxvYWQnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcigncHJlcGFyZS10by11bmxvYWQnLCBvdXRlckNhbGxiYWNrKVxuXG4gIG9uRGlkQ2hhbmdlSGlzdG9yeU1hbmFnZXI6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlKSAtPlxuICAgICAgY2FsbGJhY2soZXZlbnQpXG5cbiAgICBpcGNSZW5kZXJlci5vbignZGlkLWNoYW5nZS1oaXN0b3J5LW1hbmFnZXInLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignZGlkLWNoYW5nZS1oaXN0b3J5LW1hbmFnZXInLCBvdXRlckNhbGxiYWNrKVxuXG4gIGRpZENoYW5nZUhpc3RvcnlNYW5hZ2VyOiAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ2RpZC1jaGFuZ2UtaGlzdG9yeS1tYW5hZ2VyJylcblxuICBvcGVuRXh0ZXJuYWw6ICh1cmwpIC0+XG4gICAgc2hlbGwub3BlbkV4dGVybmFsKHVybClcblxuICBjaGVja0ZvclVwZGF0ZTogLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOmNoZWNrLWZvci11cGRhdGUnKVxuXG4gIHJlc3RhcnRBbmRJbnN0YWxsVXBkYXRlOiAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246aW5zdGFsbC11cGRhdGUnKVxuXG4gIGdldEF1dG9VcGRhdGVNYW5hZ2VyU3RhdGU6IC0+XG4gICAgaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2dldC1hdXRvLXVwZGF0ZS1tYW5hZ2VyLXN0YXRlJylcblxuICBnZXRBdXRvVXBkYXRlTWFuYWdlckVycm9yTWVzc2FnZTogLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kU3luYygnZ2V0LWF1dG8tdXBkYXRlLW1hbmFnZXItZXJyb3InKVxuXG4gIGVtaXRXaWxsU2F2ZVBhdGg6IChwYXRoKSAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCd3aWxsLXNhdmUtcGF0aCcsIHBhdGgpXG5cbiAgZW1pdERpZFNhdmVQYXRoOiAocGF0aCkgLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kU3luYygnZGlkLXNhdmUtcGF0aCcsIHBhdGgpXG5cbiAgcmVzb2x2ZVByb3h5OiAocmVxdWVzdElkLCB1cmwpIC0+XG4gICAgaXBjUmVuZGVyZXIuc2VuZCgncmVzb2x2ZS1wcm94eScsIHJlcXVlc3RJZCwgdXJsKVxuXG4gIG9uRGlkUmVzb2x2ZVByb3h5OiAoY2FsbGJhY2spIC0+XG4gICAgb3V0ZXJDYWxsYmFjayA9IChldmVudCwgcmVxdWVzdElkLCBwcm94eSkgLT5cbiAgICAgIGNhbGxiYWNrKHJlcXVlc3RJZCwgcHJveHkpXG5cbiAgICBpcGNSZW5kZXJlci5vbignZGlkLXJlc29sdmUtcHJveHknLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignZGlkLXJlc29sdmUtcHJveHknLCBvdXRlckNhbGxiYWNrKVxuIl19
