(function() {
  var ChildProcess, Emitter, Grim, Task, _,
    slice = [].slice;

  _ = require('underscore-plus');

  ChildProcess = require('child_process');

  Emitter = require('event-kit').Emitter;

  Grim = require('grim');

  module.exports = Task = (function() {
    Task.once = function() {
      var args, task, taskPath;
      taskPath = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      task = new Task(taskPath);
      task.once('task:completed', function() {
        return task.terminate();
      });
      task.start.apply(task, args);
      return task;
    };

    Task.prototype.callback = null;

    function Task(taskPath) {
      var compileCachePath, env;
      this.emitter = new Emitter;
      compileCachePath = require('./compile-cache').getCacheDirectory();
      taskPath = require.resolve(taskPath);
      env = Object.assign({}, process.env, {
        userAgent: navigator.userAgent
      });
      this.childProcess = ChildProcess.fork(require.resolve('./task-bootstrap'), [compileCachePath, taskPath], {
        env: env,
        silent: true
      });
      this.on("task:log", function() {
        return console.log.apply(console, arguments);
      });
      this.on("task:warn", function() {
        return console.warn.apply(console, arguments);
      });
      this.on("task:error", function() {
        return console.error.apply(console, arguments);
      });
      this.on("task:deprecations", function(deprecations) {
        var deprecation, i, len;
        for (i = 0, len = deprecations.length; i < len; i++) {
          deprecation = deprecations[i];
          Grim.addSerializedDeprecation(deprecation);
        }
      });
      this.on("task:completed", (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return typeof _this.callback === "function" ? _this.callback.apply(_this, args) : void 0;
        };
      })(this));
      this.handleEvents();
    }

    Task.prototype.handleEvents = function() {
      this.childProcess.removeAllListeners();
      this.childProcess.on('message', (function(_this) {
        return function(arg) {
          var args, event;
          event = arg.event, args = arg.args;
          if (_this.childProcess != null) {
            return _this.emitter.emit(event, args);
          }
        };
      })(this));
      if (this.childProcess.stdout != null) {
        this.childProcess.stdout.removeAllListeners();
        this.childProcess.stdout.on('data', function(data) {
          return console.log(data.toString());
        });
      }
      if (this.childProcess.stderr != null) {
        this.childProcess.stderr.removeAllListeners();
        return this.childProcess.stderr.on('data', function(data) {
          return console.error(data.toString());
        });
      }
    };

    Task.prototype.start = function() {
      var args, callback, i;
      args = 2 <= arguments.length ? slice.call(arguments, 0, i = arguments.length - 1) : (i = 0, []), callback = arguments[i++];
      if (this.childProcess == null) {
        throw new Error('Cannot start terminated process');
      }
      this.handleEvents();
      if (_.isFunction(callback)) {
        this.callback = callback;
      } else {
        args.push(callback);
      }
      this.send({
        event: 'start',
        args: args
      });
      return void 0;
    };

    Task.prototype.send = function(message) {
      if (this.childProcess != null) {
        this.childProcess.send(message);
      } else {
        throw new Error('Cannot send message to terminated process');
      }
      return void 0;
    };

    Task.prototype.on = function(eventName, callback) {
      return this.emitter.on(eventName, function(args) {
        return callback.apply(null, args);
      });
    };

    Task.prototype.once = function(eventName, callback) {
      var disposable;
      return disposable = this.on(eventName, function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        disposable.dispose();
        return callback.apply(null, args);
      });
    };

    Task.prototype.terminate = function() {
      var ref, ref1;
      if (this.childProcess == null) {
        return false;
      }
      this.childProcess.removeAllListeners();
      if ((ref = this.childProcess.stdout) != null) {
        ref.removeAllListeners();
      }
      if ((ref1 = this.childProcess.stderr) != null) {
        ref1.removeAllListeners();
      }
      this.childProcess.kill();
      this.childProcess = null;
      return true;
    };

    Task.prototype.cancel = function() {
      var didForcefullyTerminate;
      didForcefullyTerminate = this.terminate();
      if (didForcefullyTerminate) {
        this.emitter.emit('task:cancelled');
      }
      return didForcefullyTerminate;
    };

    return Task;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3Rhc2suY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxvQ0FBQTtJQUFBOztFQUFBLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0osWUFBQSxHQUFlLE9BQUEsQ0FBUSxlQUFSOztFQUNkLFVBQVcsT0FBQSxDQUFRLFdBQVI7O0VBQ1osSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQW1DUCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBUUosSUFBQyxDQUFBLElBQUQsR0FBTyxTQUFBO0FBQ0wsVUFBQTtNQURNLHlCQUFVO01BQ2hCLElBQUEsR0FBVyxJQUFBLElBQUEsQ0FBSyxRQUFMO01BQ1gsSUFBSSxDQUFDLElBQUwsQ0FBVSxnQkFBVixFQUE0QixTQUFBO2VBQUcsSUFBSSxDQUFDLFNBQUwsQ0FBQTtNQUFILENBQTVCO01BQ0EsSUFBSSxDQUFDLEtBQUwsYUFBVyxJQUFYO2FBQ0E7SUFKSzs7bUJBWVAsUUFBQSxHQUFVOztJQU1HLGNBQUMsUUFBRDtBQUNYLFVBQUE7TUFBQSxJQUFDLENBQUEsT0FBRCxHQUFXLElBQUk7TUFFZixnQkFBQSxHQUFtQixPQUFBLENBQVEsaUJBQVIsQ0FBMEIsQ0FBQyxpQkFBM0IsQ0FBQTtNQUNuQixRQUFBLEdBQVcsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsUUFBaEI7TUFFWCxHQUFBLEdBQU0sTUFBTSxDQUFDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCLE9BQU8sQ0FBQyxHQUExQixFQUErQjtRQUFDLFNBQUEsRUFBVyxTQUFTLENBQUMsU0FBdEI7T0FBL0I7TUFDTixJQUFDLENBQUEsWUFBRCxHQUFnQixZQUFZLENBQUMsSUFBYixDQUFrQixPQUFPLENBQUMsT0FBUixDQUFnQixrQkFBaEIsQ0FBbEIsRUFBdUQsQ0FBQyxnQkFBRCxFQUFtQixRQUFuQixDQUF2RCxFQUFxRjtR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U0FBWixFQUF1QixTQUFDLElBQUQ7ZUFBVSxRQUFBLGFBQVMsSUFBVDtNQUFWLENBQXZCO0lBQXpCOzttQkFFSixJQUFBLEdBQU0sU0FBQyxTQUFELEVBQVksUUFBWjtBQUNKLFVBQUE7YUFBQSxVQUFBLEdBQWEsSUFBQyxDQUFBLEVBQUQsQ0FBSSxTQUFKLEVBQWUsU0FBQTtBQUMxQixZQUFBO1FBRDJCO1FBQzNCLFVBQVUsQ0FBQyxPQUFYLENBQUE7ZUFDQSxRQUFBLGFBQVMsSUFBVDtNQUYwQixDQUFmO0lBRFQ7O21CQVFOLFNBQUEsR0FBVyxTQUFBO0FBQ1QsVUFBQTtNQUFBLElBQW9CLHlCQUFwQjtBQUFBLGVBQU8sTUFBUDs7TUFFQSxJQUFDLENBQUEsWUFBWSxDQUFDLGtCQUFkLENBQUE7O1dBQ29CLENBQUUsa0JBQXRCLENBQUE7OztZQUNvQixDQUFFLGtCQUF0QixDQUFBOztNQUNBLElBQUMsQ0FBQSxZQUFZLENBQUMsSUFBZCxDQUFBO01BQ0EsSUFBQyxDQUFBLFlBQUQsR0FBZ0I7YUFFaEI7SUFUUzs7bUJBY1gsTUFBQSxHQUFRLFNBQUE7QUFDTixVQUFBO01BQUEsc0JBQUEsR0FBeUIsSUFBQyxDQUFBLFNBQUQsQ0FBQTtNQUN6QixJQUFHLHNCQUFIO1FBQ0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsZ0JBQWQsRUFERjs7YUFFQTtJQUpNOzs7OztBQWhLViIsInNvdXJjZXNDb250ZW50IjpbIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG5DaGlsZFByb2Nlc3MgPSByZXF1aXJlICdjaGlsZF9wcm9jZXNzJ1xue0VtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuR3JpbSA9IHJlcXVpcmUgJ2dyaW0nXG5cbiMgRXh0ZW5kZWQ6IFJ1biBhIG5vZGUgc2NyaXB0IGluIGEgc2VwYXJhdGUgcHJvY2Vzcy5cbiNcbiMgVXNlZCBieSB0aGUgZnV6enktZmluZGVyIGFuZCBbZmluZCBpbiBwcm9qZWN0XShodHRwczovL2dpdGh1Yi5jb20vYXRvbS9hdG9tL2Jsb2IvbWFzdGVyL3NyYy9zY2FuLWhhbmRsZXIuY29mZmVlKS5cbiNcbiMgRm9yIGEgcmVhbC13b3JsZCBleGFtcGxlLCBzZWUgdGhlIFtzY2FuLWhhbmRsZXJdKGh0dHBzOi8vZ2l0aHViLmNvbS9hdG9tL2F0b20vYmxvYi9tYXN0ZXIvc3JjL3NjYW4taGFuZGxlci5jb2ZmZWUpXG4jIGFuZCB0aGUgW2luc3RhbnRpYXRpb24gb2YgdGhlIHRhc2tdKGh0dHBzOi8vZ2l0aHViLmNvbS9hdG9tL2F0b20vYmxvYi80YTIwZjEzMTYyZjY1YWZjODE2YjUxMmFkNzIwMWU1MjhjMzQ0M2Q3L3NyYy9wcm9qZWN0LmNvZmZlZSNMMjQ1KS5cbiNcbiMgIyMgRXhhbXBsZXNcbiNcbiMgSW4geW91ciBwYWNrYWdlIGNvZGU6XG4jXG4jIGBgYGNvZmZlZVxuIyB7VGFza30gPSByZXF1aXJlICdhdG9tJ1xuI1xuIyB0YXNrID0gVGFzay5vbmNlICcvcGF0aC90by90YXNrLWZpbGUuY29mZmVlJywgcGFyYW1ldGVyMSwgcGFyYW1ldGVyMiwgLT5cbiMgICBjb25zb2xlLmxvZyAndGFzayBoYXMgZmluaXNoZWQnXG4jXG4jIHRhc2sub24gJ3NvbWUtZXZlbnQtZnJvbS10aGUtdGFzaycsIChkYXRhKSA9PlxuIyAgIGNvbnNvbGUubG9nIGRhdGEuc29tZVN0cmluZyAjIHByaW50cyAneWVwIHRoaXMgaXMgaXQnXG4jIGBgYFxuI1xuIyBJbiBgJy9wYXRoL3RvL3Rhc2stZmlsZS5jb2ZmZWUnYDpcbiNcbiMgYGBgY29mZmVlXG4jIG1vZHVsZS5leHBvcnRzID0gKHBhcmFtZXRlcjEsIHBhcmFtZXRlcjIpIC0+XG4jICAgIyBJbmRpY2F0ZXMgdGhhdCB0aGlzIHRhc2sgd2lsbCBiZSBhc3luYy5cbiMgICAjIENhbGwgdGhlIGBjYWxsYmFja2AgdG8gZmluaXNoIHRoZSB0YXNrXG4jICAgY2FsbGJhY2sgPSBAYXN5bmMoKVxuI1xuIyAgIGVtaXQoJ3NvbWUtZXZlbnQtZnJvbS10aGUtdGFzaycsIHtzb21lU3RyaW5nOiAneWVwIHRoaXMgaXMgaXQnfSlcbiNcbiMgICBjYWxsYmFjaygpXG4jIGBgYFxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVGFza1xuICAjIFB1YmxpYzogQSBoZWxwZXIgbWV0aG9kIHRvIGVhc2lseSBsYXVuY2ggYW5kIHJ1biBhIHRhc2sgb25jZS5cbiAgI1xuICAjICogYHRhc2tQYXRoYCBUaGUge1N0cmluZ30gcGF0aCB0byB0aGUgQ29mZmVlU2NyaXB0L0phdmFTY3JpcHQgZmlsZSB3aGljaFxuICAjICAgZXhwb3J0cyBhIHNpbmdsZSB7RnVuY3Rpb259IHRvIGV4ZWN1dGUuXG4gICMgKiBgYXJnc2AgVGhlIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBleHBvcnRlZCBmdW5jdGlvbi5cbiAgI1xuICAjIFJldHVybnMgdGhlIGNyZWF0ZWQge1Rhc2t9LlxuICBAb25jZTogKHRhc2tQYXRoLCBhcmdzLi4uKSAtPlxuICAgIHRhc2sgPSBuZXcgVGFzayh0YXNrUGF0aClcbiAgICB0YXNrLm9uY2UgJ3Rhc2s6Y29tcGxldGVkJywgLT4gdGFzay50ZXJtaW5hdGUoKVxuICAgIHRhc2suc3RhcnQoYXJncy4uLilcbiAgICB0YXNrXG5cbiAgIyBDYWxsZWQgdXBvbiB0YXNrIGNvbXBsZXRpb24uXG4gICNcbiAgIyBJdCByZWNlaXZlcyB0aGUgc2FtZSBhcmd1bWVudHMgdGhhdCB3ZXJlIHBhc3NlZCB0byB0aGUgdGFzay5cbiAgI1xuICAjIElmIHN1YmNsYXNzZWQsIHRoaXMgaXMgaW50ZW5kZWQgdG8gYmUgb3ZlcnJpZGRlbi4gSG93ZXZlciBpZiB7OjpzdGFydH1cbiAgIyByZWNlaXZlcyBhIGNvbXBsZXRpb24gY2FsbGJhY2ssIHRoaXMgaXMgb3ZlcnJpZGRlbi5cbiAgY2FsbGJhY2s6IG51bGxcblxuICAjIFB1YmxpYzogQ3JlYXRlcyBhIHRhc2suIFlvdSBzaG91bGQgcHJvYmFibHkgdXNlIHsub25jZX1cbiAgI1xuICAjICogYHRhc2tQYXRoYCBUaGUge1N0cmluZ30gcGF0aCB0byB0aGUgQ29mZmVlU2NyaXB0L0phdmFTY3JpcHQgZmlsZSB0aGF0XG4gICMgICBleHBvcnRzIGEgc2luZ2xlIHtGdW5jdGlvbn0gdG8gZXhlY3V0ZS5cbiAgY29uc3RydWN0b3I6ICh0YXNrUGF0aCkgLT5cbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG5cbiAgICBjb21waWxlQ2FjaGVQYXRoID0gcmVxdWlyZSgnLi9jb21waWxlLWNhY2hlJykuZ2V0Q2FjaGVEaXJlY3RvcnkoKVxuICAgIHRhc2tQYXRoID0gcmVxdWlyZS5yZXNvbHZlKHRhc2tQYXRoKVxuXG4gICAgZW52ID0gT2JqZWN0LmFzc2lnbih7fSwgcHJvY2Vzcy5lbnYsIHt1c2VyQWdlbnQ6IG5hdmlnYXRvci51c2VyQWdlbnR9KVxuICAgIEBjaGlsZFByb2Nlc3MgPSBDaGlsZFByb2Nlc3MuZm9yayByZXF1aXJlLnJlc29sdmUoJy4vdGFzay1ib290c3RyYXAnKSwgW2NvbXBpbGVDYWNoZVBhdGgsIHRhc2tQYXRoXSwge2Vudiwgc2lsZW50OiB0cnVlfVxuXG4gICAgQG9uIFwidGFzazpsb2dcIiwgLT4gY29uc29sZS5sb2coYXJndW1lbnRzLi4uKVxuICAgIEBvbiBcInRhc2s6d2FyblwiLCAtPiBjb25zb2xlLndhcm4oYXJndW1lbnRzLi4uKVxuICAgIEBvbiBcInRhc2s6ZXJyb3JcIiwgLT4gY29uc29sZS5lcnJvcihhcmd1bWVudHMuLi4pXG4gICAgQG9uIFwidGFzazpkZXByZWNhdGlvbnNcIiwgKGRlcHJlY2F0aW9ucykgLT5cbiAgICAgIEdyaW0uYWRkU2VyaWFsaXplZERlcHJlY2F0aW9uKGRlcHJlY2F0aW9uKSBmb3IgZGVwcmVjYXRpb24gaW4gZGVwcmVjYXRpb25zXG4gICAgICByZXR1cm5cbiAgICBAb24gXCJ0YXNrOmNvbXBsZXRlZFwiLCAoYXJncy4uLikgPT4gQGNhbGxiYWNrPyhhcmdzLi4uKVxuXG4gICAgQGhhbmRsZUV2ZW50cygpXG5cbiAgIyBSb3V0ZXMgbWVzc2FnZXMgZnJvbSB0aGUgY2hpbGQgdG8gdGhlIGFwcHJvcHJpYXRlIGV2ZW50LlxuICBoYW5kbGVFdmVudHM6IC0+XG4gICAgQGNoaWxkUHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKVxuICAgIEBjaGlsZFByb2Nlc3Mub24gJ21lc3NhZ2UnLCAoe2V2ZW50LCBhcmdzfSkgPT5cbiAgICAgIEBlbWl0dGVyLmVtaXQoZXZlbnQsIGFyZ3MpIGlmIEBjaGlsZFByb2Nlc3M/XG5cbiAgICAjIENhdGNoIHRoZSBlcnJvcnMgdGhhdCBoYXBwZW5lZCBiZWZvcmUgdGFzay1ib290c3RyYXAuXG4gICAgaWYgQGNoaWxkUHJvY2Vzcy5zdGRvdXQ/XG4gICAgICBAY2hpbGRQcm9jZXNzLnN0ZG91dC5yZW1vdmVBbGxMaXN0ZW5lcnMoKVxuICAgICAgQGNoaWxkUHJvY2Vzcy5zdGRvdXQub24gJ2RhdGEnLCAoZGF0YSkgLT4gY29uc29sZS5sb2cgZGF0YS50b1N0cmluZygpXG5cbiAgICBpZiBAY2hpbGRQcm9jZXNzLnN0ZGVycj9cbiAgICAgIEBjaGlsZFByb2Nlc3Muc3RkZXJyLnJlbW92ZUFsbExpc3RlbmVycygpXG4gICAgICBAY2hpbGRQcm9jZXNzLnN0ZGVyci5vbiAnZGF0YScsIChkYXRhKSAtPiBjb25zb2xlLmVycm9yIGRhdGEudG9TdHJpbmcoKVxuXG4gICMgUHVibGljOiBTdGFydHMgdGhlIHRhc2suXG4gICNcbiAgIyBUaHJvd3MgYW4gZXJyb3IgaWYgdGhpcyB0YXNrIGhhcyBhbHJlYWR5IGJlZW4gdGVybWluYXRlZCBvciBpZiBzZW5kaW5nIGFcbiAgIyBtZXNzYWdlIHRvIHRoZSBjaGlsZCBwcm9jZXNzIGZhaWxzLlxuICAjXG4gICMgKiBgYXJnc2AgVGhlIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBmdW5jdGlvbiBleHBvcnRlZCBieSB0aGlzIHRhc2sncyBzY3JpcHQuXG4gICMgKiBgY2FsbGJhY2tgIChvcHRpb25hbCkgQSB7RnVuY3Rpb259IHRvIGNhbGwgd2hlbiB0aGUgdGFzayBjb21wbGV0ZXMuXG4gIHN0YXJ0OiAoYXJncy4uLiwgY2FsbGJhY2spIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc3RhcnQgdGVybWluYXRlZCBwcm9jZXNzJykgdW5sZXNzIEBjaGlsZFByb2Nlc3M/XG5cbiAgICBAaGFuZGxlRXZlbnRzKClcbiAgICBpZiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spXG4gICAgICBAY2FsbGJhY2sgPSBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIGFyZ3MucHVzaChjYWxsYmFjaylcbiAgICBAc2VuZCh7ZXZlbnQ6ICdzdGFydCcsIGFyZ3N9KVxuICAgIHVuZGVmaW5lZFxuXG4gICMgUHVibGljOiBTZW5kIG1lc3NhZ2UgdG8gdGhlIHRhc2suXG4gICNcbiAgIyBUaHJvd3MgYW4gZXJyb3IgaWYgdGhpcyB0YXNrIGhhcyBhbHJlYWR5IGJlZW4gdGVybWluYXRlZCBvciBpZiBzZW5kaW5nIGFcbiAgIyBtZXNzYWdlIHRvIHRoZSBjaGlsZCBwcm9jZXNzIGZhaWxzLlxuICAjXG4gICMgKiBgbWVzc2FnZWAgVGhlIG1lc3NhZ2UgdG8gc2VuZCB0byB0aGUgdGFzay5cbiAgc2VuZDogKG1lc3NhZ2UpIC0+XG4gICAgaWYgQGNoaWxkUHJvY2Vzcz9cbiAgICAgIEBjaGlsZFByb2Nlc3Muc2VuZChtZXNzYWdlKVxuICAgIGVsc2VcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHNlbmQgbWVzc2FnZSB0byB0ZXJtaW5hdGVkIHByb2Nlc3MnKVxuICAgIHVuZGVmaW5lZFxuXG4gICMgUHVibGljOiBDYWxsIGEgZnVuY3Rpb24gd2hlbiBhbiBldmVudCBpcyBlbWl0dGVkIGJ5IHRoZSBjaGlsZCBwcm9jZXNzXG4gICNcbiAgIyAqIGBldmVudE5hbWVgIFRoZSB7U3RyaW5nfSBuYW1lIG9mIHRoZSBldmVudCB0byBoYW5kbGUuXG4gICMgKiBgY2FsbGJhY2tgIFRoZSB7RnVuY3Rpb259IHRvIGNhbGwgd2hlbiB0aGUgZXZlbnQgaXMgZW1pdHRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gdGhhdCBjYW4gYmUgdXNlZCB0byBzdG9wIGxpc3RlbmluZyBmb3IgdGhlIGV2ZW50LlxuICBvbjogKGV2ZW50TmFtZSwgY2FsbGJhY2spIC0+IEBlbWl0dGVyLm9uIGV2ZW50TmFtZSwgKGFyZ3MpIC0+IGNhbGxiYWNrKGFyZ3MuLi4pXG5cbiAgb25jZTogKGV2ZW50TmFtZSwgY2FsbGJhY2spIC0+XG4gICAgZGlzcG9zYWJsZSA9IEBvbiBldmVudE5hbWUsIChhcmdzLi4uKSAtPlxuICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKClcbiAgICAgIGNhbGxiYWNrKGFyZ3MuLi4pXG5cbiAgIyBQdWJsaWM6IEZvcmNlZnVsbHkgc3RvcCB0aGUgcnVubmluZyB0YXNrLlxuICAjXG4gICMgTm8gbW9yZSBldmVudHMgYXJlIGVtaXR0ZWQgb25jZSB0aGlzIG1ldGhvZCBpcyBjYWxsZWQuXG4gIHRlcm1pbmF0ZTogLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEBjaGlsZFByb2Nlc3M/XG5cbiAgICBAY2hpbGRQcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycygpXG4gICAgQGNoaWxkUHJvY2Vzcy5zdGRvdXQ/LnJlbW92ZUFsbExpc3RlbmVycygpXG4gICAgQGNoaWxkUHJvY2Vzcy5zdGRlcnI/LnJlbW92ZUFsbExpc3RlbmVycygpXG4gICAgQGNoaWxkUHJvY2Vzcy5raWxsKClcbiAgICBAY2hpbGRQcm9jZXNzID0gbnVsbFxuXG4gICAgdHJ1ZVxuXG4gICMgUHVibGljOiBDYW5jZWwgdGhlIHJ1bm5pbmcgdGFzayBhbmQgZW1pdCBhbiBldmVudCBpZiBpdCB3YXMgY2FuY2VsZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0aGUgdGFzayB3YXMgdGVybWluYXRlZC5cbiAgY2FuY2VsOiAtPlxuICAgIGRpZEZvcmNlZnVsbHlUZXJtaW5hdGUgPSBAdGVybWluYXRlKClcbiAgICBpZiBkaWRGb3JjZWZ1bGx5VGVybWluYXRlXG4gICAgICBAZW1pdHRlci5lbWl0KCd0YXNrOmNhbmNlbGxlZCcpXG4gICAgZGlkRm9yY2VmdWxseVRlcm1pbmF0ZVxuIl19
