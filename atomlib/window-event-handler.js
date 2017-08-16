(function() {
  var CompositeDisposable, Disposable, WindowEventHandler, listen, ref,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ref = require('event-kit'), Disposable = ref.Disposable, CompositeDisposable = ref.CompositeDisposable;

  listen = require('./delegated-listener');

  module.exports = WindowEventHandler = (function() {
    function WindowEventHandler(arg) {
      this.atomEnvironment = arg.atomEnvironment, this.applicationDelegate = arg.applicationDelegate;
      this.handleDocumentContextmenu = bind(this.handleDocumentContextmenu, this);
      this.handleLinkClick = bind(this.handleLinkClick, this);
      this.handleWindowToggleMenuBar = bind(this.handleWindowToggleMenuBar, this);
      this.handleWindowToggleDevTools = bind(this.handleWindowToggleDevTools, this);
      this.handleWindowReload = bind(this.handleWindowReload, this);
      this.handleWindowClose = bind(this.handleWindowClose, this);
      this.handleWindowToggleFullScreen = bind(this.handleWindowToggleFullScreen, this);
      this.handleWindowBeforeunload = bind(this.handleWindowBeforeunload, this);
      this.handleLeaveFullScreen = bind(this.handleLeaveFullScreen, this);
      this.handleEnterFullScreen = bind(this.handleEnterFullScreen, this);
      this.handleWindowBlur = bind(this.handleWindowBlur, this);
      this.handleFocusPrevious = bind(this.handleFocusPrevious, this);
      this.handleFocusNext = bind(this.handleFocusNext, this);
      this.handleDocumentKeyEvent = bind(this.handleDocumentKeyEvent, this);
      this.reloadRequested = false;
      this.subscriptions = new CompositeDisposable;
      this.handleNativeKeybindings();
    }

    WindowEventHandler.prototype.initialize = function(window, document) {
      var ref1;
      this.window = window;
      this.document = document;
      this.subscriptions.add(this.atomEnvironment.commands.add(this.window, {
        'window:toggle-full-screen': this.handleWindowToggleFullScreen,
        'window:close': this.handleWindowClose,
        'window:reload': this.handleWindowReload,
        'window:toggle-dev-tools': this.handleWindowToggleDevTools
      }));
      if ((ref1 = process.platform) === 'win32' || ref1 === 'linux') {
        this.subscriptions.add(this.atomEnvironment.commands.add(this.window, {
          'window:toggle-menu-bar': this.handleWindowToggleMenuBar
        }));
      }
      this.subscriptions.add(this.atomEnvironment.commands.add(this.document, {
        'core:focus-next': this.handleFocusNext,
        'core:focus-previous': this.handleFocusPrevious
      }));
      this.addEventListener(this.window, 'beforeunload', this.handleWindowBeforeunload);
      this.addEventListener(this.window, 'focus', this.handleWindowFocus);
      this.addEventListener(this.window, 'blur', this.handleWindowBlur);
      this.addEventListener(this.document, 'keyup', this.handleDocumentKeyEvent);
      this.addEventListener(this.document, 'keydown', this.handleDocumentKeyEvent);
      this.addEventListener(this.document, 'drop', this.handleDocumentDrop);
      this.addEventListener(this.document, 'dragover', this.handleDocumentDragover);
      this.addEventListener(this.document, 'contextmenu', this.handleDocumentContextmenu);
      this.subscriptions.add(listen(this.document, 'click', 'a', this.handleLinkClick));
      this.subscriptions.add(listen(this.document, 'submit', 'form', this.handleFormSubmit));
      this.subscriptions.add(this.applicationDelegate.onDidEnterFullScreen(this.handleEnterFullScreen));
      return this.subscriptions.add(this.applicationDelegate.onDidLeaveFullScreen(this.handleLeaveFullScreen));
    };

    WindowEventHandler.prototype.handleNativeKeybindings = function() {
      var bindCommandToAction;
      bindCommandToAction = (function(_this) {
        return function(command, action) {
          return _this.subscriptions.add(_this.atomEnvironment.commands.add('.native-key-bindings', command, (function(event) {
            return _this.applicationDelegate.getCurrentWindow().webContents[action]();
          }), false));
        };
      })(this);
      bindCommandToAction('core:copy', 'copy');
      bindCommandToAction('core:paste', 'paste');
      bindCommandToAction('core:undo', 'undo');
      bindCommandToAction('core:redo', 'redo');
      bindCommandToAction('core:select-all', 'selectAll');
      return bindCommandToAction('core:cut', 'cut');
    };

    WindowEventHandler.prototype.unsubscribe = function() {
      return this.subscriptions.dispose();
    };

    WindowEventHandler.prototype.on = function(target, eventName, handler) {
      target.on(eventName, handler);
      return this.subscriptions.add(new Disposable(function() {
        return target.removeListener(eventName, handler);
      }));
    };

    WindowEventHandler.prototype.addEventListener = function(target, eventName, handler) {
      target.addEventListener(eventName, handler);
      return this.subscriptions.add(new Disposable(function() {
        return target.removeEventListener(eventName, handler);
      }));
    };

    WindowEventHandler.prototype.handleDocumentKeyEvent = function(event) {
      this.atomEnvironment.keymaps.handleKeyboardEvent(event);
      return event.stopImmediatePropagation();
    };

    WindowEventHandler.prototype.handleDrop = function(event) {
      event.preventDefault();
      return event.stopPropagation();
    };

    WindowEventHandler.prototype.handleDragover = function(event) {
      event.preventDefault();
      event.stopPropagation();
      return event.dataTransfer.dropEffect = 'none';
    };

    WindowEventHandler.prototype.eachTabIndexedElement = function(callback) {
      var element, i, len, ref1;
      ref1 = this.document.querySelectorAll('[tabindex]');
      for (i = 0, len = ref1.length; i < len; i++) {
        element = ref1[i];
        if (element.disabled) {
          continue;
        }
        if (!(element.tabIndex >= 0)) {
          continue;
        }
        callback(element, element.tabIndex);
      }
    };

    WindowEventHandler.prototype.handleFocusNext = function() {
      var focusedTabIndex, lowestElement, lowestTabIndex, nextElement, nextTabIndex, ref1;
      focusedTabIndex = (ref1 = this.document.activeElement.tabIndex) != null ? ref1 : -2e308;
      nextElement = null;
      nextTabIndex = 2e308;
      lowestElement = null;
      lowestTabIndex = 2e308;
      this.eachTabIndexedElement(function(element, tabIndex) {
        if (tabIndex < lowestTabIndex) {
          lowestTabIndex = tabIndex;
          lowestElement = element;
        }
        if ((focusedTabIndex < tabIndex && tabIndex < nextTabIndex)) {
          nextTabIndex = tabIndex;
          return nextElement = element;
        }
      });
      if (nextElement != null) {
        return nextElement.focus();
      } else if (lowestElement != null) {
        return lowestElement.focus();
      }
    };

    WindowEventHandler.prototype.handleFocusPrevious = function() {
      var focusedTabIndex, highestElement, highestTabIndex, previousElement, previousTabIndex, ref1;
      focusedTabIndex = (ref1 = this.document.activeElement.tabIndex) != null ? ref1 : 2e308;
      previousElement = null;
      previousTabIndex = -2e308;
      highestElement = null;
      highestTabIndex = -2e308;
      this.eachTabIndexedElement(function(element, tabIndex) {
        if (tabIndex > highestTabIndex) {
          highestTabIndex = tabIndex;
          highestElement = element;
        }
        if ((focusedTabIndex > tabIndex && tabIndex > previousTabIndex)) {
          previousTabIndex = tabIndex;
          return previousElement = element;
        }
      });
      if (previousElement != null) {
        return previousElement.focus();
      } else if (highestElement != null) {
        return highestElement.focus();
      }
    };

    WindowEventHandler.prototype.handleWindowFocus = function() {
      return this.document.body.classList.remove('is-blurred');
    };

    WindowEventHandler.prototype.handleWindowBlur = function() {
      this.document.body.classList.add('is-blurred');
      return this.atomEnvironment.storeWindowDimensions();
    };

    WindowEventHandler.prototype.handleEnterFullScreen = function() {
      return this.document.body.classList.add("fullscreen");
    };

    WindowEventHandler.prototype.handleLeaveFullScreen = function() {
      return this.document.body.classList.remove("fullscreen");
    };

    WindowEventHandler.prototype.handleWindowBeforeunload = function(event) {
      if (!this.reloadRequested && !this.atomEnvironment.inSpecMode() && this.atomEnvironment.getCurrentWindow().isWebViewFocused()) {
        this.atomEnvironment.hide();
      }
      this.reloadRequested = false;
      this.atomEnvironment.storeWindowDimensions();
      this.atomEnvironment.unloadEditorWindow();
      return this.atomEnvironment.destroy();
    };

    WindowEventHandler.prototype.handleWindowToggleFullScreen = function() {
      return this.atomEnvironment.toggleFullScreen();
    };

    WindowEventHandler.prototype.handleWindowClose = function() {
      return this.atomEnvironment.close();
    };

    WindowEventHandler.prototype.handleWindowReload = function() {
      this.reloadRequested = true;
      return this.atomEnvironment.reload();
    };

    WindowEventHandler.prototype.handleWindowToggleDevTools = function() {
      return this.atomEnvironment.toggleDevTools();
    };

    WindowEventHandler.prototype.handleWindowToggleMenuBar = function() {
      var detail;
      this.atomEnvironment.config.set('core.autoHideMenuBar', !this.atomEnvironment.config.get('core.autoHideMenuBar'));
      if (this.atomEnvironment.config.get('core.autoHideMenuBar')) {
        detail = "To toggle, press the Alt key or execute the window:toggle-menu-bar command";
        return this.atomEnvironment.notifications.addInfo('Menu bar hidden', {
          detail: detail
        });
      }
    };

    WindowEventHandler.prototype.handleLinkClick = function(event) {
      var ref1, uri;
      event.preventDefault();
      uri = (ref1 = event.currentTarget) != null ? ref1.getAttribute('href') : void 0;
      if (uri && uri[0] !== '#' && /^https?:\/\//.test(uri)) {
        return this.applicationDelegate.openExternal(uri);
      }
    };

    WindowEventHandler.prototype.handleFormSubmit = function(event) {
      return event.preventDefault();
    };

    WindowEventHandler.prototype.handleDocumentContextmenu = function(event) {
      event.preventDefault();
      return this.atomEnvironment.contextMenu.showForEvent(event);
    };

    return WindowEventHandler;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3dpbmRvdy1ldmVudC1oYW5kbGVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsZ0VBQUE7SUFBQTs7RUFBQSxNQUFvQyxPQUFBLENBQVEsV0FBUixDQUFwQyxFQUFDLDJCQUFELEVBQWE7O0VBQ2IsTUFBQSxHQUFTLE9BQUEsQ0FBUSxzQkFBUjs7RUFHVCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MsNEJBQUMsR0FBRDtNQUFFLElBQUMsQ0FBQSxzQkFBQSxpQkFBaUIsSUFBQyxDQUFBLDBCQUFBOzs7Ozs7Ozs7Ozs7Ozs7TUFDaEMsSUFBQyxDQUFBLGVBQUQsR0FBbUI7TUFDbkIsSUFBQyxDQUFBLGFBQUQsR0FBaUIsSUFBSTtNQUVyQixJQUFDLENBQUEsdUJBQUQsQ0FBQTtJQUpXOztpQ0FNYixVQUFBLEdBQVksU0FBQyxNQUFELEVBQVUsUUFBVjtBQUNWLFVBQUE7TUFEVyxJQUFDLENBQUEsU0FBRDtNQUFTLElBQUMsQ0FBQSxXQUFEO01BQ3BCLElBQUMsQ0FBQSxhQUFhLENBQUMsR0FBZixDQUFtQixJQUFDLENBQUEsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUExQixDQUE4QixJQUFDLENBQUEsTUFBL0IsRUFDakI7UUFBQSwyQkFBQSxFQUE2QixJQUFDLENBQUEsNEJBQTlCO1FBQ0EsY0FBQSxFQUFnQixJQUFDLENBQUEsaUJBRGpCO1FBRUEsZUFBQSxFQUFpQixJQUFDLENBQUEsa0JBRmxCO1FBR0EseUJBQUEsRUFBMkIsSUFBQyxDQUFBLDBCQUg1QjtPQURpQixDQUFuQjtNQU1BLFlBQUcsT0FBTyxDQUFDLFNBQVIsS0FBcUIsT0FBckIsSUFBQSxJQUFBLEtBQThCLE9BQWpDO1FBQ0UsSUFBQyxDQUFBLGFBQWEsQ0FBQyxHQUFmLENBQW1CLElBQUMsQ0FBQSxlQUFlLENBQUMsUUFBUSxDQUFDLEdBQTFC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LGNBQWMsQ0FBQyxJQUFmLENBQW9CLEdBQXBCLENBQS9CO2VBQ0UsSUFBQyxDQUFBLG1CQUFtQixDQUFDLFlBQXJCLENBQWtDLEdBQWxDLEVBREY7O0lBSGU7O2lDQU1qQixnQkFBQSxHQUFrQixTQUFDLEtBQUQ7YUFFaEIsS0FBSyxDQUFDLGNBQU4sQ0FBQTtJQUZnQjs7aUNBSWxCLHlCQUFBLEdBQTJCLFNBQUMsS0FBRDtNQUN6QixLQUFLLENBQUMsY0FBTixDQUFBO2FBQ0EsSUFBQyxDQUFBLGVBQWUsQ0FBQyxXQUFXLENBQUMsWUFBN0IsQ0FBMEMsS0FBMUM7SUFGeUI7Ozs7O0FBMUw3QiIsInNvdXJjZXNDb250ZW50IjpbIntEaXNwb3NhYmxlLCBDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbmxpc3RlbiA9IHJlcXVpcmUgJy4vZGVsZWdhdGVkLWxpc3RlbmVyJ1xuXG4jIEhhbmRsZXMgbG93LWxldmVsIGV2ZW50cyByZWxhdGVkIHRvIHRoZSBAd2luZG93LlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgV2luZG93RXZlbnRIYW5kbGVyXG4gIGNvbnN0cnVjdG9yOiAoe0BhdG9tRW52aXJvbm1lbnQsIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSkgLT5cbiAgICBAcmVsb2FkUmVxdWVzdGVkID0gZmFsc2VcbiAgICBAc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG5cbiAgICBAaGFuZGxlTmF0aXZlS2V5YmluZGluZ3MoKVxuXG4gIGluaXRpYWxpemU6IChAd2luZG93LCBAZG9jdW1lbnQpIC0+XG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBhdG9tRW52aXJvbm1lbnQuY29tbWFuZHMuYWRkIEB3aW5kb3csXG4gICAgICAnd2luZG93OnRvZ2dsZS1mdWxsLXNjcmVlbic6IEBoYW5kbGVXaW5kb3dUb2dnbGVGdWxsU2NyZWVuXG4gICAgICAnd2luZG93OmNsb3NlJzogQGhhbmRsZVdpbmRvd0Nsb3NlXG4gICAgICAnd2luZG93OnJlbG9hZCc6IEBoYW5kbGVXaW5kb3dSZWxvYWRcbiAgICAgICd3aW5kb3c6dG9nZ2xlLWRldi10b29scyc6IEBoYW5kbGVXaW5kb3dUb2dnbGVEZXZUb29sc1xuXG4gICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpbiBbJ3dpbjMyJywgJ2xpbnV4J11cbiAgICAgIEBzdWJzY3JpcHRpb25zLmFkZCBAYXRvbUVudmlyb25tZW50LmNvbW1hbmRzLmFkZCBAd2luZG93LFxuICAgICAgICAnd2luZG93OnRvZ2dsZS1tZW51LWJhcic6IEBoYW5kbGVXaW5kb3dUb2dnbGVNZW51QmFyXG5cbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgQGF0b21FbnZpcm9ubWVudC5jb21tYW5kcy5hZGQgQGRvY3VtZW50LFxuICAgICAgJ2NvcmU6Zm9jdXMtbmV4dCc6IEBoYW5kbGVGb2N1c05leHRcbiAgICAgICdjb3JlOmZvY3VzLXByZXZpb3VzJzogQGhhbmRsZUZvY3VzUHJldmlvdXNcblxuICAgIEBhZGRFdmVudExpc3RlbmVyKEB3aW5kb3csICdiZWZvcmV1bmxvYWQnLCBAaGFuZGxlV2luZG93QmVmb3JldW5sb2FkKVxuICAgIEBhZGRFdmVudExpc3RlbmVyKEB3aW5kb3csICdmb2N1cycsIEBoYW5kbGVXaW5kb3dGb2N1cylcbiAgICBAYWRkRXZlbnRMaXN0ZW5lcihAd2luZG93LCAnYmx1cicsIEBoYW5kbGVXaW5kb3dCbHVyKVxuXG4gICAgQGFkZEV2ZW50TGlzdGVuZXIoQGRvY3VtZW50LCAna2V5dXAnLCBAaGFuZGxlRG9jdW1lbnRLZXlFdmVudClcbiAgICBAYWRkRXZlbnRMaXN0ZW5lcihAZG9jdW1lbnQsICdrZXlkb3duJywgQGhhbmRsZURvY3VtZW50S2V5RXZlbnQpXG4gICAgQGFkZEV2ZW50TGlzdGVuZXIoQGRvY3VtZW50LCAnZHJvcCcsIEBoYW5kbGVEb2N1bWVudERyb3ApXG4gICAgQGFkZEV2ZW50TGlzdGVuZXIoQGRvY3VtZW50LCAnZHJhZ292ZXInLCBAaGFuZGxlRG9jdW1lbnREcmFnb3ZlcilcbiAgICBAYWRkRXZlbnRMaXN0ZW5lcihAZG9jdW1lbnQsICdjb250ZXh0bWVudScsIEBoYW5kbGVEb2N1bWVudENvbnRleHRtZW51KVxuICAgIEBzdWJzY3JpcHRpb25zLmFkZCBsaXN0ZW4oQGRvY3VtZW50LCAnY2xpY2snLCAnYScsIEBoYW5kbGVMaW5rQ2xpY2spXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIGxpc3RlbihAZG9jdW1lbnQsICdzdWJtaXQnLCAnZm9ybScsIEBoYW5kbGVGb3JtU3VibWl0KVxuXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkKEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9uRGlkRW50ZXJGdWxsU2NyZWVuKEBoYW5kbGVFbnRlckZ1bGxTY3JlZW4pKVxuICAgIEBzdWJzY3JpcHRpb25zLmFkZChAYXBwbGljYXRpb25EZWxlZ2F0ZS5vbkRpZExlYXZlRnVsbFNjcmVlbihAaGFuZGxlTGVhdmVGdWxsU2NyZWVuKSlcblxuICAjIFdpcmUgY29tbWFuZHMgdGhhdCBzaG91bGQgYmUgaGFuZGxlZCBieSBDaHJvbWl1bSBmb3IgZWxlbWVudHMgd2l0aCB0aGVcbiAgIyBgLm5hdGl2ZS1rZXktYmluZGluZ3NgIGNsYXNzLlxuICBoYW5kbGVOYXRpdmVLZXliaW5kaW5nczogLT5cbiAgICBiaW5kQ29tbWFuZFRvQWN0aW9uID0gKGNvbW1hbmQsIGFjdGlvbikgPT5cbiAgICAgIEBzdWJzY3JpcHRpb25zLmFkZCBAYXRvbUVudmlyb25tZW50LmNvbW1hbmRzLmFkZChcbiAgICAgICAgJy5uYXRpdmUta2V5LWJpbmRpbmdzJyxcbiAgICAgICAgY29tbWFuZCxcbiAgICAgICAgKChldmVudCkgPT4gQGFwcGxpY2F0aW9uRGVsZWdhdGUuZ2V0Q3VycmVudFdpbmRvdygpLndlYkNvbnRlbnRzW2FjdGlvbl0oKSksXG4gICAgICAgIGZhbHNlXG4gICAgICApXG5cbiAgICBiaW5kQ29tbWFuZFRvQWN0aW9uKCdjb3JlOmNvcHknLCAnY29weScpXG4gICAgYmluZENvbW1hbmRUb0FjdGlvbignY29yZTpwYXN0ZScsICdwYXN0ZScpXG4gICAgYmluZENvbW1hbmRUb0FjdGlvbignY29yZTp1bmRvJywgJ3VuZG8nKVxuICAgIGJpbmRDb21tYW5kVG9BY3Rpb24oJ2NvcmU6cmVkbycsICdyZWRvJylcbiAgICBiaW5kQ29tbWFuZFRvQWN0aW9uKCdjb3JlOnNlbGVjdC1hbGwnLCAnc2VsZWN0QWxsJylcbiAgICBiaW5kQ29tbWFuZFRvQWN0aW9uKCdjb3JlOmN1dCcsICdjdXQnKVxuXG4gIHVuc3Vic2NyaWJlOiAtPlxuICAgIEBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuXG4gIG9uOiAodGFyZ2V0LCBldmVudE5hbWUsIGhhbmRsZXIpIC0+XG4gICAgdGFyZ2V0Lm9uKGV2ZW50TmFtZSwgaGFuZGxlcilcbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQobmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIHRhcmdldC5yZW1vdmVMaXN0ZW5lcihldmVudE5hbWUsIGhhbmRsZXIpXG4gICAgKVxuXG4gIGFkZEV2ZW50TGlzdGVuZXI6ICh0YXJnZXQsIGV2ZW50TmFtZSwgaGFuZGxlcikgLT5cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGhhbmRsZXIpXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkKG5ldyBEaXNwb3NhYmxlKC0+IHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlcikpKVxuXG4gIGhhbmRsZURvY3VtZW50S2V5RXZlbnQ6IChldmVudCkgPT5cbiAgICBAYXRvbUVudmlyb25tZW50LmtleW1hcHMuaGFuZGxlS2V5Ym9hcmRFdmVudChldmVudClcbiAgICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gIGhhbmRsZURyb3A6IChldmVudCkgLT5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcblxuICBoYW5kbGVEcmFnb3ZlcjogKGV2ZW50KSAtPlxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuICAgIGV2ZW50LmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ25vbmUnXG5cbiAgZWFjaFRhYkluZGV4ZWRFbGVtZW50OiAoY2FsbGJhY2spIC0+XG4gICAgZm9yIGVsZW1lbnQgaW4gQGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1t0YWJpbmRleF0nKVxuICAgICAgY29udGludWUgaWYgZWxlbWVudC5kaXNhYmxlZFxuICAgICAgY29udGludWUgdW5sZXNzIGVsZW1lbnQudGFiSW5kZXggPj0gMFxuICAgICAgY2FsbGJhY2soZWxlbWVudCwgZWxlbWVudC50YWJJbmRleClcbiAgICByZXR1cm5cblxuICBoYW5kbGVGb2N1c05leHQ6ID0+XG4gICAgZm9jdXNlZFRhYkluZGV4ID0gQGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQudGFiSW5kZXggPyAtSW5maW5pdHlcblxuICAgIG5leHRFbGVtZW50ID0gbnVsbFxuICAgIG5leHRUYWJJbmRleCA9IEluZmluaXR5XG4gICAgbG93ZXN0RWxlbWVudCA9IG51bGxcbiAgICBsb3dlc3RUYWJJbmRleCA9IEluZmluaXR5XG4gICAgQGVhY2hUYWJJbmRleGVkRWxlbWVudCAoZWxlbWVudCwgdGFiSW5kZXgpIC0+XG4gICAgICBpZiB0YWJJbmRleCA8IGxvd2VzdFRhYkluZGV4XG4gICAgICAgIGxvd2VzdFRhYkluZGV4ID0gdGFiSW5kZXhcbiAgICAgICAgbG93ZXN0RWxlbWVudCA9IGVsZW1lbnRcblxuICAgICAgaWYgZm9jdXNlZFRhYkluZGV4IDwgdGFiSW5kZXggPCBuZXh0VGFiSW5kZXhcbiAgICAgICAgbmV4dFRhYkluZGV4ID0gdGFiSW5kZXhcbiAgICAgICAgbmV4dEVsZW1lbnQgPSBlbGVtZW50XG5cbiAgICBpZiBuZXh0RWxlbWVudD9cbiAgICAgIG5leHRFbGVtZW50LmZvY3VzKClcbiAgICBlbHNlIGlmIGxvd2VzdEVsZW1lbnQ/XG4gICAgICBsb3dlc3RFbGVtZW50LmZvY3VzKClcblxuICBoYW5kbGVGb2N1c1ByZXZpb3VzOiA9PlxuICAgIGZvY3VzZWRUYWJJbmRleCA9IEBkb2N1bWVudC5hY3RpdmVFbGVtZW50LnRhYkluZGV4ID8gSW5maW5pdHlcblxuICAgIHByZXZpb3VzRWxlbWVudCA9IG51bGxcbiAgICBwcmV2aW91c1RhYkluZGV4ID0gLUluZmluaXR5XG4gICAgaGlnaGVzdEVsZW1lbnQgPSBudWxsXG4gICAgaGlnaGVzdFRhYkluZGV4ID0gLUluZmluaXR5XG4gICAgQGVhY2hUYWJJbmRleGVkRWxlbWVudCAoZWxlbWVudCwgdGFiSW5kZXgpIC0+XG4gICAgICBpZiB0YWJJbmRleCA+IGhpZ2hlc3RUYWJJbmRleFxuICAgICAgICBoaWdoZXN0VGFiSW5kZXggPSB0YWJJbmRleFxuICAgICAgICBoaWdoZXN0RWxlbWVudCA9IGVsZW1lbnRcblxuICAgICAgaWYgZm9jdXNlZFRhYkluZGV4ID4gdGFiSW5kZXggPiBwcmV2aW91c1RhYkluZGV4XG4gICAgICAgIHByZXZpb3VzVGFiSW5kZXggPSB0YWJJbmRleFxuICAgICAgICBwcmV2aW91c0VsZW1lbnQgPSBlbGVtZW50XG5cbiAgICBpZiBwcmV2aW91c0VsZW1lbnQ/XG4gICAgICBwcmV2aW91c0VsZW1lbnQuZm9jdXMoKVxuICAgIGVsc2UgaWYgaGlnaGVzdEVsZW1lbnQ/XG4gICAgICBoaWdoZXN0RWxlbWVudC5mb2N1cygpXG5cbiAgaGFuZGxlV2luZG93Rm9jdXM6IC0+XG4gICAgQGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnaXMtYmx1cnJlZCcpXG5cbiAgaGFuZGxlV2luZG93Qmx1cjogPT5cbiAgICBAZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdpcy1ibHVycmVkJylcbiAgICBAYXRvbUVudmlyb25tZW50LnN0b3JlV2luZG93RGltZW5zaW9ucygpXG5cbiAgaGFuZGxlRW50ZXJGdWxsU2NyZWVuOiA9PlxuICAgIEBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoXCJmdWxsc2NyZWVuXCIpXG5cbiAgaGFuZGxlTGVhdmVGdWxsU2NyZWVuOiA9PlxuICAgIEBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJmdWxsc2NyZWVuXCIpXG5cbiAgaGFuZGxlV2luZG93QmVmb3JldW5sb2FkOiAoZXZlbnQpID0+XG4gICAgaWYgbm90IEByZWxvYWRSZXF1ZXN0ZWQgYW5kIG5vdCBAYXRvbUVudmlyb25tZW50LmluU3BlY01vZGUoKSBhbmQgQGF0b21FbnZpcm9ubWVudC5nZXRDdXJyZW50V2luZG93KCkuaXNXZWJWaWV3Rm9jdXNlZCgpXG4gICAgICBAYXRvbUVudmlyb25tZW50LmhpZGUoKVxuICAgIEByZWxvYWRSZXF1ZXN0ZWQgPSBmYWxzZVxuICAgIEBhdG9tRW52aXJvbm1lbnQuc3RvcmVXaW5kb3dEaW1lbnNpb25zKClcbiAgICBAYXRvbUVudmlyb25tZW50LnVubG9hZEVkaXRvcldpbmRvdygpXG4gICAgQGF0b21FbnZpcm9ubWVudC5kZXN0cm95KClcblxuICBoYW5kbGVXaW5kb3dUb2dnbGVGdWxsU2NyZWVuOiA9PlxuICAgIEBhdG9tRW52aXJvbm1lbnQudG9nZ2xlRnVsbFNjcmVlbigpXG5cbiAgaGFuZGxlV2luZG93Q2xvc2U6ID0+XG4gICAgQGF0b21FbnZpcm9ubWVudC5jbG9zZSgpXG5cbiAgaGFuZGxlV2luZG93UmVsb2FkOiA9PlxuICAgIEByZWxvYWRSZXF1ZXN0ZWQgPSB0cnVlXG4gICAgQGF0b21FbnZpcm9ubWVudC5yZWxvYWQoKVxuXG4gIGhhbmRsZVdpbmRvd1RvZ2dsZURldlRvb2xzOiA9PlxuICAgIEBhdG9tRW52aXJvbm1lbnQudG9nZ2xlRGV2VG9vbHMoKVxuXG4gIGhhbmRsZVdpbmRvd1RvZ2dsZU1lbnVCYXI6ID0+XG4gICAgQGF0b21FbnZpcm9ubWVudC5jb25maWcuc2V0KCdjb3JlLmF1dG9IaWRlTWVudUJhcicsIG5vdCBAYXRvbUVudmlyb25tZW50LmNvbmZpZy5nZXQoJ2NvcmUuYXV0b0hpZGVNZW51QmFyJykpXG5cbiAgICBpZiBAYXRvbUVudmlyb25tZW50LmNvbmZpZy5nZXQoJ2NvcmUuYXV0b0hpZGVNZW51QmFyJylcbiAgICAgIGRldGFpbCA9IFwiVG8gdG9nZ2xlLCBwcmVzcyB0aGUgQWx0IGtleSBvciBleGVjdXRlIHRoZSB3aW5kb3c6dG9nZ2xlLW1lbnUtYmFyIGNvbW1hbmRcIlxuICAgICAgQGF0b21FbnZpcm9ubWVudC5ub3RpZmljYXRpb25zLmFkZEluZm8oJ01lbnUgYmFyIGhpZGRlbicsIHtkZXRhaWx9KVxuXG4gIGhhbmRsZUxpbmtDbGljazogKGV2ZW50KSA9PlxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICB1cmkgPSBldmVudC5jdXJyZW50VGFyZ2V0Py5nZXRBdHRyaWJ1dGUoJ2hyZWYnKVxuICAgIGlmIHVyaSBhbmQgdXJpWzBdIGlzbnQgJyMnIGFuZCAvXmh0dHBzPzpcXC9cXC8vLnRlc3QodXJpKVxuICAgICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUub3BlbkV4dGVybmFsKHVyaSlcblxuICBoYW5kbGVGb3JtU3VibWl0OiAoZXZlbnQpIC0+XG4gICAgIyBQcmV2ZW50IGZvcm0gc3VibWl0cyBmcm9tIGNoYW5naW5nIHRoZSBjdXJyZW50IHdpbmRvdydzIFVSTFxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICBoYW5kbGVEb2N1bWVudENvbnRleHRtZW51OiAoZXZlbnQpID0+XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgIEBhdG9tRW52aXJvbm1lbnQuY29udGV4dE1lbnUuc2hvd0ZvckV2ZW50KGV2ZW50KVxuIl19
