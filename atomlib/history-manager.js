Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _eventKit = require('event-kit');

// Extended: History manager for remembering which projects have been opened.
//
// An instance of this class is always available as the `atom.history` global.
//
// The project history is used to enable the 'Reopen Project' menu.

var HistoryManager = (function () {
  function HistoryManager(_ref) {
    var _this = this;

    var project = _ref.project;
    var commands = _ref.commands;
    var stateStore = _ref.stateStore;

    _classCallCheck(this, HistoryManager);

    this.stateStore = stateStore;
    this.emitter = new _eventKit.Emitter();
    this.projects = [];
    this.disposables = new _eventKit.CompositeDisposable();
    this.disposables.add(commands.add('atom-workspace', { 'application:clear-project-history': this.clearProjects.bind(this) }, false));
    this.disposables.add(project.onDidChangePaths(function (projectPaths) {
      return _this.addProject(projectPaths);
    }));
  }

  _createClass(HistoryManager, [{
    key: 'destroy',
    value: function destroy() {
      this.disposables.dispose();
    }

    // Public: Obtain a list of previously opened projects.
    //
    // Returns an {Array} of {HistoryProject} objects, most recent first.
  }, {
    key: 'getProjects',
    value: function getProjects() {
      return this.projects.map(function (p) {
        return new HistoryProject(p.paths, p.lastOpened);
      });
    }

    // Public: Clear all projects from the history.
    //
    // Note: This is not a privacy function - other traces will still exist,
    // e.g. window state.
    //
    // Return a {Promise} that resolves when the history has been successfully
    // cleared.
  }, {
    key: 'clearProjects',
    value: _asyncToGenerator(function* () {
      this.projects = [];
      yield this.saveState();
      this.didChangeProjects();
    })

    // Public: Invoke the given callback when the list of projects changes.
    //
    // * `callback` {Function}
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidChangeProjects',
    value: function onDidChangeProjects(callback) {
      return this.emitter.on('did-change-projects', callback);
    }
  }, {
    key: 'didChangeProjects',
    value: function didChangeProjects(args) {
      this.emitter.emit('did-change-projects', args || { reloaded: false });
    }
  }, {
    key: 'addProject',
    value: _asyncToGenerator(function* (paths, lastOpened) {
      if (paths.length === 0) return;

      var project = this.getProject(paths);
      if (!project) {
        project = new HistoryProject(paths);
        this.projects.push(project);
      }
      project.lastOpened = lastOpened || new Date();
      this.projects.sort(function (a, b) {
        return b.lastOpened - a.lastOpened;
      });

      yield this.saveState();
      this.didChangeProjects();
    })
  }, {
    key: 'removeProject',
    value: _asyncToGenerator(function* (paths) {
      if (paths.length === 0) return;

      var project = this.getProject(paths);
      if (!project) return;

      var index = this.projects.indexOf(project);
      this.projects.splice(index, 1);

      yield this.saveState();
      this.didChangeProjects();
    })
  }, {
    key: 'getProject',
    value: function getProject(paths) {
      for (var i = 0; i < this.projects.length; i++) {
        if (arrayEquivalent(paths, this.projects[i].paths)) {
          return this.projects[i];
        }
      }

      return null;
    }
  }, {
    key: 'loadState',
    value: _asyncToGenerator(function* () {
      var history = yield this.stateStore.load('history-manager');
      if (history && history.projects) {
        this.projects = history.projects.filter(function (p) {
          return Array.isArray(p.paths) && p.paths.length > 0;
        }).map(function (p) {
          return new HistoryProject(p.paths, new Date(p.lastOpened));
        });
        this.didChangeProjects({ reloaded: true });
      } else {
        this.projects = [];
      }
    })
  }, {
    key: 'saveState',
    value: _asyncToGenerator(function* () {
      var projects = this.projects.map(function (p) {
        return { paths: p.paths, lastOpened: p.lastOpened };
      });
      yield this.stateStore.save('history-manager', { projects: projects });
    })
  }]);

  return HistoryManager;
})();

exports.HistoryManager = HistoryManager;

function arrayEquivalent(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

var HistoryProject = (function () {
  function HistoryProject(paths, lastOpened) {
    _classCallCheck(this, HistoryProject);

    this.paths = paths;
    this.lastOpened = lastOpened || new Date();
  }

  _createClass(HistoryProject, [{
    key: 'paths',
    set: function set(paths) {
      this._paths = paths;
    },
    get: function get() {
      return this._paths;
    }
  }, {
    key: 'lastOpened',
    set: function set(lastOpened) {
      this._lastOpened = lastOpened;
    },
    get: function get() {
      return this._lastOpened;
    }
  }]);

  return HistoryProject;
})();

exports.HistoryProject = HistoryProject;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9kaXN0aWxsZXIvYXRvbS9vdXQvYXBwL3NyYy9oaXN0b3J5LW1hbmFnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O3dCQUUyQyxXQUFXOzs7Ozs7OztJQU96QyxjQUFjO0FBQ2IsV0FERCxjQUFjLENBQ1osSUFBK0IsRUFBRTs7O1FBQWhDLE9BQU8sR0FBUixJQUErQixDQUE5QixPQUFPO1FBQUUsUUFBUSxHQUFsQixJQUErQixDQUFyQixRQUFRO1FBQUUsVUFBVSxHQUE5QixJQUErQixDQUFYLFVBQVU7OzBCQURoQyxjQUFjOztBQUV2QixRQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtBQUM1QixRQUFJLENBQUMsT0FBTyxHQUFHLHVCQUFhLENBQUE7QUFDNUIsUUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFDbEIsUUFBSSxDQUFDLFdBQVcsR0FBRyxtQ0FBeUIsQ0FBQTtBQUM1QyxRQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLEVBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0FBQ2pJLFFBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFDLFlBQVk7YUFBSyxNQUFLLFVBQVUsQ0FBQyxZQUFZLENBQUM7S0FBQSxDQUFDLENBQUMsQ0FBQTtHQUNoRzs7ZUFSVSxjQUFjOztXQVVqQixtQkFBRztBQUNULFVBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7S0FDM0I7Ozs7Ozs7V0FLVyx1QkFBRztBQUNiLGFBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO2VBQUksSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENB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OztBQUV2QixRQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtBQUNsQixRQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFBO0dBQzNDOztlQUpVLGNBQWM7O1NBTWYsYUFBQyxLQUFLLEVBQUU7QUFBRSxVQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtLQUFFO1NBQy9CLGVBQUc7QUFBRSxhQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7S0FBRTs7O1NBRXBCLGFBQUMsVUFBVSxFQUFFO0FBQUUsVUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7S0FBRTtTQUM5QyxlQUFHO0FBQUUsYUFBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0tBQUU7OztTQVZsQyxjQUFjIiwiZmlsZSI6Ii9Vc2Vycy9kaXN0aWxsZXIvYXRvbS9vdXQvYXBwL3NyYy9oaXN0b3J5LW1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQGJhYmVsICovXG5cbmltcG9ydCB7RW1pdHRlciwgQ29tcG9zaXRlRGlzcG9zYWJsZX0gZnJvbSAnZXZlbnQta2l0J1xuXG4vLyBFeHRlbmRlZDogSGlzdG9yeSBtYW5hZ2VyIGZvciByZW1lbWJlcmluZyB3aGljaCBwcm9qZWN0cyBoYXZlIGJlZW4gb3BlbmVkLlxuLy9cbi8vIEFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MgaXMgYWx3YXlzIGF2YWlsYWJsZSBhcyB0aGUgYGF0b20uaGlzdG9yeWAgZ2xvYmFsLlxuLy9cbi8vIFRoZSBwcm9qZWN0IGhpc3RvcnkgaXMgdXNlZCB0byBlbmFibGUgdGhlICdSZW9wZW4gUHJvamVjdCcgbWVudS5cbmV4cG9ydCBjbGFzcyBIaXN0b3J5TWFuYWdlciB7XG4gIGNvbnN0cnVjdG9yICh7cHJvamVjdCwgY29tbWFuZHMsIHN0YXRlU3RvcmV9KSB7XG4gICAgdGhpcy5zdGF0ZVN0b3JlID0gc3RhdGVTdG9yZVxuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBFbWl0dGVyKClcbiAgICB0aGlzLnByb2plY3RzID0gW11cbiAgICB0aGlzLmRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKVxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKGNvbW1hbmRzLmFkZCgnYXRvbS13b3Jrc3BhY2UnLCB7J2FwcGxpY2F0aW9uOmNsZWFyLXByb2plY3QtaGlzdG9yeSc6IHRoaXMuY2xlYXJQcm9qZWN0cy5iaW5kKHRoaXMpfSwgZmFsc2UpKVxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKHByb2plY3Qub25EaWRDaGFuZ2VQYXRocygocHJvamVjdFBhdGhzKSA9PiB0aGlzLmFkZFByb2plY3QocHJvamVjdFBhdGhzKSkpXG4gIH1cblxuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICB9XG5cbiAgLy8gUHVibGljOiBPYnRhaW4gYSBsaXN0IG9mIHByZXZpb3VzbHkgb3BlbmVkIHByb2plY3RzLlxuICAvL1xuICAvLyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge0hpc3RvcnlQcm9qZWN0fSBvYmplY3RzLCBtb3N0IHJlY2VudCBmaXJzdC5cbiAgZ2V0UHJvamVjdHMgKCkge1xuICAgIHJldHVybiB0aGlzLnByb2plY3RzLm1hcChwID0+IG5ldyBIaXN0b3J5UHJvamVjdChwLnBhdGhzLCBwLmxhc3RPcGVuZWQpKVxuICB9XG5cbiAgLy8gUHVibGljOiBDbGVhciBhbGwgcHJvamVjdHMgZnJvbSB0aGUgaGlzdG9yeS5cbiAgLy9cbiAgLy8gTm90ZTogVGhpcyBpcyBub3QgYSBwcml2YWN5IGZ1bmN0aW9uIC0gb3RoZXIgdHJhY2VzIHdpbGwgc3RpbGwgZXhpc3QsXG4gIC8vIGUuZy4gd2luZG93IHN0YXRlLlxuICAvL1xuICAvLyBSZXR1cm4gYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBoaXN0b3J5IGhhcyBiZWVuIHN1Y2Nlc3NmdWxseVxuICAvLyBjbGVhcmVkLlxuICBhc3luYyBjbGVhclByb2plY3RzICgpIHtcbiAgICB0aGlzLnByb2plY3RzID0gW11cbiAgICBhd2FpdCB0aGlzLnNhdmVTdGF0ZSgpXG4gICAgdGhpcy5kaWRDaGFuZ2VQcm9qZWN0cygpXG4gIH1cblxuICAvLyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgbGlzdCBvZiBwcm9qZWN0cyBjaGFuZ2VzLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVByb2plY3RzIChjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmVtaXR0ZXIub24oJ2RpZC1jaGFuZ2UtcHJvamVjdHMnLCBjYWxsYmFjaylcbiAgfVxuXG4gIGRpZENoYW5nZVByb2plY3RzIChhcmdzKSB7XG4gICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1jaGFuZ2UtcHJvamVjdHMnLCBhcmdzIHx8IHsgcmVsb2FkZWQ6IGZhbHNlIH0pXG4gIH1cblxuICBhc3luYyBhZGRQcm9qZWN0IChwYXRocywgbGFzdE9wZW5lZCkge1xuICAgIGlmIChwYXRocy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgbGV0IHByb2plY3QgPSB0aGlzLmdldFByb2plY3QocGF0aHMpXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICBwcm9qZWN0ID0gbmV3IEhpc3RvcnlQcm9qZWN0KHBhdGhzKVxuICAgICAgdGhpcy5wcm9qZWN0cy5wdXNoKHByb2plY3QpXG4gICAgfVxuICAgIHByb2plY3QubGFzdE9wZW5lZCA9IGxhc3RPcGVuZWQgfHwgbmV3IERhdGUoKVxuICAgIHRoaXMucHJvamVjdHMuc29ydCgoYSwgYikgPT4gYi5sYXN0T3BlbmVkIC0gYS5sYXN0T3BlbmVkKVxuXG4gICAgYXdhaXQgdGhpcy5zYXZlU3RhdGUoKVxuICAgIHRoaXMuZGlkQ2hhbmdlUHJvamVjdHMoKVxuICB9XG5cbiAgYXN5bmMgcmVtb3ZlUHJvamVjdCAocGF0aHMpIHtcbiAgICBpZiAocGF0aHMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAgIGxldCBwcm9qZWN0ID0gdGhpcy5nZXRQcm9qZWN0KHBhdGhzKVxuICAgIGlmICghcHJvamVjdCkgcmV0dXJuXG5cbiAgICBsZXQgaW5kZXggPSB0aGlzLnByb2plY3RzLmluZGV4T2YocHJvamVjdClcbiAgICB0aGlzLnByb2plY3RzLnNwbGljZShpbmRleCwgMSlcblxuICAgIGF3YWl0IHRoaXMuc2F2ZVN0YXRlKClcbiAgICB0aGlzLmRpZENoYW5nZVByb2plY3RzKClcbiAgfVxuXG4gIGdldFByb2plY3QgKHBhdGhzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnByb2plY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyYXlFcXVpdmFsZW50KHBhdGhzLCB0aGlzLnByb2plY3RzW2ldLnBhdGhzKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9qZWN0c1tpXVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBhc3luYyBsb2FkU3RhdGUgKCkge1xuICAgIGxldCBoaXN0b3J5ID0gYXdhaXQgdGhpcy5zdGF0ZVN0b3JlLmxvYWQoJ2hpc3RvcnktbWFuYWdlcicpXG4gICAgaWYgKGhpc3RvcnkgJiYgaGlzdG9yeS5wcm9qZWN0cykge1xuICAgICAgdGhpcy5wcm9qZWN0cyA9IGhpc3RvcnkucHJvamVjdHMuZmlsdGVyKHAgPT4gQXJyYXkuaXNBcnJheShwLnBhdGhzKSAmJiBwLnBhdGhzLmxlbmd0aCA+IDApLm1hcChwID0+IG5ldyBIaXN0b3J5UHJvamVjdChwLnBhdGhzLCBuZXcgRGF0ZShwLmxhc3RPcGVuZWQpKSlcbiAgICAgIHRoaXMuZGlkQ2hhbmdlUHJvamVjdHMoe3JlbG9hZGVkOiB0cnVlfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcm9qZWN0cyA9IFtdXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZVN0YXRlICgpIHtcbiAgICBjb25zdCBwcm9qZWN0cyA9IHRoaXMucHJvamVjdHMubWFwKHAgPT4gKHtwYXRoczogcC5wYXRocywgbGFzdE9wZW5lZDogcC5sYXN0T3BlbmVkfSkpXG4gICAgYXdhaXQgdGhpcy5zdGF0ZVN0b3JlLnNhdmUoJ2hpc3RvcnktbWFuYWdlcicsIHtwcm9qZWN0c30pXG4gIH1cbn1cblxuZnVuY3Rpb24gYXJyYXlFcXVpdmFsZW50IChhLCBiKSB7XG4gIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuZXhwb3J0IGNsYXNzIEhpc3RvcnlQcm9qZWN0IHtcbiAgY29uc3RydWN0b3IgKHBhdGhzLCBsYXN0T3BlbmVkKSB7XG4gICAgdGhpcy5wYXRocyA9IHBhdGhzXG4gICAgdGhpcy5sYXN0T3BlbmVkID0gbGFzdE9wZW5lZCB8fCBuZXcgRGF0ZSgpXG4gIH1cblxuICBzZXQgcGF0aHMgKHBhdGhzKSB7IHRoaXMuX3BhdGhzID0gcGF0aHMgfVxuICBnZXQgcGF0aHMgKCkgeyByZXR1cm4gdGhpcy5fcGF0aHMgfVxuXG4gIHNldCBsYXN0T3BlbmVkIChsYXN0T3BlbmVkKSB7IHRoaXMuX2xhc3RPcGVuZWQgPSBsYXN0T3BlbmVkIH1cbiAgZ2V0IGxhc3RPcGVuZWQgKCkgeyByZXR1cm4gdGhpcy5fbGFzdE9wZW5lZCB9XG59XG4iXX0=