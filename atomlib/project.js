(function() {
  var DefaultDirectoryProvider, Disposable, Emitter, GitRepositoryProvider, Model, Project, TextBuffer, _, fs, path, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  path = require('path');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  ref = require('event-kit'), Emitter = ref.Emitter, Disposable = ref.Disposable;

  TextBuffer = require('text-buffer');

  DefaultDirectoryProvider = require('./default-directory-provider');

  Model = require('./model');

  GitRepositoryProvider = require('./git-repository-provider');

  module.exports = Project = (function(superClass) {
    extend(Project, superClass);


    /*
    Section: Construction and Destruction
     */

    function Project(arg) {
      var config, packageManager;
      this.notificationManager = arg.notificationManager, packageManager = arg.packageManager, config = arg.config, this.applicationDelegate = arg.applicationDelegate;
      this.emitter = new Emitter;
      this.buffers = [];
      this.rootDirectories = [];
      this.repositories = [];
      this.directoryProviders = [];
      this.defaultDirectoryProvider = new DefaultDirectoryProvider();
      this.repositoryPromisesByPath = new Map();
      this.repositoryProviders = [new GitRepositoryProvider(this, config)];
      this.loadPromisesByPath = {};
      this.consumeServices(packageManager);
    }

    Project.prototype.destroyed = function() {
      var buffer, j, k, len, len1, ref1, ref2, repository;
      ref1 = this.buffers.slice();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        buffer.destroy();
      }
      ref2 = this.repositories.slice();
      for (k = 0, len1 = ref2.length; k < len1; k++) {
        repository = ref2[k];
        if (repository != null) {
          repository.destroy();
        }
      }
      this.rootDirectories = [];
      return this.repositories = [];
    };

    Project.prototype.reset = function(packageManager) {
      var buffer, j, len, ref1;
      this.emitter.dispose();
      this.emitter = new Emitter;
      ref1 = this.buffers;
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        if (buffer != null) {
          buffer.destroy();
        }
      }
      this.buffers = [];
      this.setPaths([]);
      this.loadPromisesByPath = {};
      return this.consumeServices(packageManager);
    };

    Project.prototype.destroyUnretainedBuffers = function() {
      var buffer, j, len, ref1;
      ref1 = this.getBuffers();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        if (!buffer.isRetained()) {
          buffer.destroy();
        }
      }
    };


    /*
    Section: Serialization
     */

    Project.prototype.deserialize = function(state) {
      var bufferPromises, bufferState, error, j, len, ref1;
      bufferPromises = [];
      ref1 = state.buffers;
      for (j = 0, len = ref1.length; j < len; j++) {
        bufferState = ref1[j];
        if (fs.isDirectorySync(bufferState.filePath)) {
          continue;
        }
        if (bufferState.filePath) {
          try {
            fs.closeSync(fs.openSync(bufferState.filePath, 'r'));
          } catch (error1) {
            error = error1;
            if (error.code !== 'ENOENT') {
              continue;
            }
          }
        }
        if (bufferState.shouldDestroyOnFileDelete == null) {
          bufferState.shouldDestroyOnFileDelete = function() {
            return atom.config.get('core.closeDeletedFileTabs');
          };
        }
        bufferPromises.push(TextBuffer.deserialize(bufferState));
      }
      return Promise.all(bufferPromises).then((function(_this) {
        return function(buffers) {
          var buffer, k, len1, ref2;
          _this.buffers = buffers;
          ref2 = _this.buffers;
          for (k = 0, len1 = ref2.length; k < len1; k++) {
            buffer = ref2[k];
            _this.subscribeToBuffer(buffer);
          }
          return _this.setPaths(state.paths);
        };
      })(this));
    };

    Project.prototype.serialize = function(options) {
      if (options == null) {
        options = {};
      }
      return {
        deserializer: 'Project',
        paths: this.getPaths(),
        buffers: _.compact(this.buffers.map(function(buffer) {
          var isUnloading;
          if (buffer.isRetained()) {
            isUnloading = options.isUnloading === true;
            return buffer.serialize({
              markerLayers: isUnloading,
              history: isUnloading
            });
          }
        }))
      };
    };


    /*
    Section: Event Subscription
     */

    Project.prototype.onDidChangePaths = function(callback) {
      return this.emitter.on('did-change-paths', callback);
    };

    Project.prototype.onDidAddBuffer = function(callback) {
      return this.emitter.on('did-add-buffer', callback);
    };

    Project.prototype.observeBuffers = function(callback) {
      var buffer, j, len, ref1;
      ref1 = this.getBuffers();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        callback(buffer);
      }
      return this.onDidAddBuffer(callback);
    };


    /*
    Section: Accessing the git repository
     */

    Project.prototype.getRepositories = function() {
      return this.repositories;
    };

    Project.prototype.repositoryForDirectory = function(directory) {
      var pathForDirectory, promise, promises;
      pathForDirectory = directory.getRealPathSync();
      promise = this.repositoryPromisesByPath.get(pathForDirectory);
      if (!promise) {
        promises = this.repositoryProviders.map(function(provider) {
          return provider.repositoryForDirectory(directory);
        });
        promise = Promise.all(promises).then((function(_this) {
          return function(repositories) {
            var ref1, repo;
            repo = (ref1 = _.find(repositories, function(repo) {
              return repo != null;
            })) != null ? ref1 : null;
            if (repo == null) {
              _this.repositoryPromisesByPath["delete"](pathForDirectory);
            }
            if (repo != null) {
              if (typeof repo.onDidDestroy === "function") {
                repo.onDidDestroy(function() {
                  return _this.repositoryPromisesByPath["delete"](pathForDirectory);
                });
              }
            }
            return repo;
          };
        })(this));
        this.repositoryPromisesByPath.set(pathForDirectory, promise);
      }
      return promise;
    };


    /*
    Section: Managing Paths
     */

    Project.prototype.getPaths = function() {
      var j, len, ref1, results, rootDirectory;
      ref1 = this.rootDirectories;
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        rootDirectory = ref1[j];
        results.push(rootDirectory.getPath());
      }
      return results;
    };

    Project.prototype.setPaths = function(projectPaths) {
      var j, k, len, len1, projectPath, ref1, repository;
      ref1 = this.repositories;
      for (j = 0, len = ref1.length; j < len; j++) {
        repository = ref1[j];
        if (repository != null) {
          repository.destroy();
        }
      }
      this.rootDirectories = [];
      this.repositories = [];
      for (k = 0, len1 = projectPaths.length; k < len1; k++) {
        projectPath = projectPaths[k];
        this.addPath(projectPath, {
          emitEvent: false
        });
      }
      return this.emitter.emit('did-change-paths', projectPaths);
    };

    Project.prototype.addPath = function(projectPath, options) {
      var directory, existingDirectory, j, k, len, len1, provider, ref1, ref2, repo;
      directory = this.getDirectoryForProjectPath(projectPath);
      if (!directory.existsSync()) {
        return;
      }
      ref1 = this.getDirectories();
      for (j = 0, len = ref1.length; j < len; j++) {
        existingDirectory = ref1[j];
        if (existingDirectory.getPath() === directory.getPath()) {
          return;
        }
      }
      this.rootDirectories.push(directory);
      repo = null;
      ref2 = this.repositoryProviders;
      for (k = 0, len1 = ref2.length; k < len1; k++) {
        provider = ref2[k];
        if (repo = typeof provider.repositoryForDirectorySync === "function" ? provider.repositoryForDirectorySync(directory) : void 0) {
          break;
        }
      }
      this.repositories.push(repo != null ? repo : null);
      if ((options != null ? options.emitEvent : void 0) !== false) {
        return this.emitter.emit('did-change-paths', this.getPaths());
      }
    };

    Project.prototype.getDirectoryForProjectPath = function(projectPath) {
      var directory, j, len, provider, ref1;
      directory = null;
      ref1 = this.directoryProviders;
      for (j = 0, len = ref1.length; j < len; j++) {
        provider = ref1[j];
        if (directory = typeof provider.directoryForURISync === "function" ? provider.directoryForURISync(projectPath) : void 0) {
          break;
        }
      }
      if (directory == null) {
        directory = this.defaultDirectoryProvider.directoryForURISync(projectPath);
      }
      return directory;
    };

    Project.prototype.removePath = function(projectPath) {
      var directory, i, indexToRemove, j, len, ref1, removedDirectory, removedRepository;
      if (indexOf.call(this.getPaths(), projectPath) < 0) {
        projectPath = this.defaultDirectoryProvider.normalizePath(projectPath);
      }
      indexToRemove = null;
      ref1 = this.rootDirectories;
      for (i = j = 0, len = ref1.length; j < len; i = ++j) {
        directory = ref1[i];
        if (directory.getPath() === projectPath) {
          indexToRemove = i;
          break;
        }
      }
      if (indexToRemove != null) {
        removedDirectory = this.rootDirectories.splice(indexToRemove, 1)[0];
        removedRepository = this.repositories.splice(indexToRemove, 1)[0];
        if (indexOf.call(this.repositories, removedRepository) < 0) {
          if (removedRepository != null) {
            removedRepository.destroy();
          }
        }
        this.emitter.emit("did-change-paths", this.getPaths());
        return true;
      } else {
        return false;
      }
    };

    Project.prototype.getDirectories = function() {
      return this.rootDirectories;
    };

    Project.prototype.resolvePath = function(uri) {
      var projectPath;
      if (!uri) {
        return;
      }
      if (uri != null ? uri.match(/[A-Za-z0-9+-.]+:\/\//) : void 0) {
        return uri;
      } else {
        if (fs.isAbsolute(uri)) {
          return this.defaultDirectoryProvider.normalizePath(fs.resolveHome(uri));
        } else if (projectPath = this.getPaths()[0]) {
          return this.defaultDirectoryProvider.normalizePath(fs.resolveHome(path.join(projectPath, uri)));
        } else {
          return void 0;
        }
      }
    };

    Project.prototype.relativize = function(fullPath) {
      return this.relativizePath(fullPath)[1];
    };

    Project.prototype.relativizePath = function(fullPath) {
      var j, len, ref1, relativePath, result, rootDirectory;
      result = [null, fullPath];
      if (fullPath != null) {
        ref1 = this.rootDirectories;
        for (j = 0, len = ref1.length; j < len; j++) {
          rootDirectory = ref1[j];
          relativePath = rootDirectory.relativize(fullPath);
          if ((relativePath != null ? relativePath.length : void 0) < result[1].length) {
            result = [rootDirectory.getPath(), relativePath];
          }
        }
      }
      return result;
    };

    Project.prototype.contains = function(pathToCheck) {
      return this.rootDirectories.some(function(dir) {
        return dir.contains(pathToCheck);
      });
    };


    /*
    Section: Private
     */

    Project.prototype.consumeServices = function(arg) {
      var serviceHub;
      serviceHub = arg.serviceHub;
      serviceHub.consume('atom.directory-provider', '^0.1.0', (function(_this) {
        return function(provider) {
          _this.directoryProviders.unshift(provider);
          return new Disposable(function() {
            return _this.directoryProviders.splice(_this.directoryProviders.indexOf(provider), 1);
          });
        };
      })(this));
      return serviceHub.consume('atom.repository-provider', '^0.1.0', (function(_this) {
        return function(provider) {
          _this.repositoryProviders.unshift(provider);
          if (indexOf.call(_this.repositories, null) >= 0) {
            _this.setPaths(_this.getPaths());
          }
          return new Disposable(function() {
            return _this.repositoryProviders.splice(_this.repositoryProviders.indexOf(provider), 1);
          });
        };
      })(this));
    };

    Project.prototype.getBuffers = function() {
      return this.buffers.slice();
    };

    Project.prototype.isPathModified = function(filePath) {
      var ref1;
      return (ref1 = this.findBufferForPath(this.resolvePath(filePath))) != null ? ref1.isModified() : void 0;
    };

    Project.prototype.findBufferForPath = function(filePath) {
      return _.find(this.buffers, function(buffer) {
        return buffer.getPath() === filePath;
      });
    };

    Project.prototype.findBufferForId = function(id) {
      return _.find(this.buffers, function(buffer) {
        return buffer.getId() === id;
      });
    };

    Project.prototype.bufferForPathSync = function(filePath) {
      var absoluteFilePath, existingBuffer;
      absoluteFilePath = this.resolvePath(filePath);
      if (filePath) {
        existingBuffer = this.findBufferForPath(absoluteFilePath);
      }
      return existingBuffer != null ? existingBuffer : this.buildBufferSync(absoluteFilePath);
    };

    Project.prototype.bufferForIdSync = function(id) {
      var existingBuffer;
      if (id) {
        existingBuffer = this.findBufferForId(id);
      }
      return existingBuffer != null ? existingBuffer : this.buildBufferSync();
    };

    Project.prototype.bufferForPath = function(absoluteFilePath) {
      var existingBuffer;
      if (absoluteFilePath != null) {
        existingBuffer = this.findBufferForPath(absoluteFilePath);
      }
      if (existingBuffer) {
        return Promise.resolve(existingBuffer);
      } else {
        return this.buildBuffer(absoluteFilePath);
      }
    };

    Project.prototype.shouldDestroyBufferOnFileDelete = function() {
      return atom.config.get('core.closeDeletedFileTabs');
    };

    Project.prototype.buildBufferSync = function(absoluteFilePath) {
      var buffer, params;
      params = {
        shouldDestroyOnFileDelete: this.shouldDestroyBufferOnFileDelete
      };
      if (absoluteFilePath != null) {
        buffer = TextBuffer.loadSync(absoluteFilePath, params);
      } else {
        buffer = new TextBuffer(params);
      }
      this.addBuffer(buffer);
      return buffer;
    };

    Project.prototype.buildBuffer = function(absoluteFilePath) {
      var base, params, promise;
      params = {
        shouldDestroyOnFileDelete: this.shouldDestroyBufferOnFileDelete
      };
      if (absoluteFilePath != null) {
        promise = (base = this.loadPromisesByPath)[absoluteFilePath] != null ? base[absoluteFilePath] : base[absoluteFilePath] = TextBuffer.load(absoluteFilePath, params)["catch"]((function(_this) {
          return function(error) {
            delete _this.loadPromisesByPath[absoluteFilePath];
            throw error;
          };
        })(this));
      } else {
        promise = Promise.resolve(new TextBuffer(params));
      }
      return promise.then((function(_this) {
        return function(buffer) {
          delete _this.loadPromisesByPath[absoluteFilePath];
          _this.addBuffer(buffer);
          return buffer;
        };
      })(this));
    };

    Project.prototype.addBuffer = function(buffer, options) {
      if (options == null) {
        options = {};
      }
      return this.addBufferAtIndex(buffer, this.buffers.length, options);
    };

    Project.prototype.addBufferAtIndex = function(buffer, index, options) {
      if (options == null) {
        options = {};
      }
      this.buffers.splice(index, 0, buffer);
      this.subscribeToBuffer(buffer);
      this.emitter.emit('did-add-buffer', buffer);
      return buffer;
    };

    Project.prototype.removeBuffer = function(buffer) {
      var index;
      index = this.buffers.indexOf(buffer);
      if (index !== -1) {
        return this.removeBufferAtIndex(index);
      }
    };

    Project.prototype.removeBufferAtIndex = function(index, options) {
      var buffer;
      if (options == null) {
        options = {};
      }
      buffer = this.buffers.splice(index, 1)[0];
      return buffer != null ? buffer.destroy() : void 0;
    };

    Project.prototype.eachBuffer = function() {
      var args, buffer, callback, j, len, ref1, subscriber;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      if (args.length > 1) {
        subscriber = args.shift();
      }
      callback = args.shift();
      ref1 = this.getBuffers();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        callback(buffer);
      }
      if (subscriber) {
        return subscriber.subscribe(this, 'buffer-created', function(buffer) {
          return callback(buffer);
        });
      } else {
        return this.on('buffer-created', function(buffer) {
          return callback(buffer);
        });
      }
    };

    Project.prototype.subscribeToBuffer = function(buffer) {
      buffer.onWillSave((function(_this) {
        return function(arg) {
          var path;
          path = arg.path;
          return _this.applicationDelegate.emitWillSavePath(path);
        };
      })(this));
      buffer.onDidSave((function(_this) {
        return function(arg) {
          var path;
          path = arg.path;
          return _this.applicationDelegate.emitDidSavePath(path);
        };
      })(this));
      buffer.onDidDestroy((function(_this) {
        return function() {
          return _this.removeBuffer(buffer);
        };
      })(this));
      buffer.onDidChangePath((function(_this) {
        return function() {
          if (!(_this.getPaths().length > 0)) {
            return _this.setPaths([path.dirname(buffer.getPath())]);
          }
        };
      })(this));
      return buffer.onWillThrowWatchError((function(_this) {
        return function(arg) {
          var error, handle;
          error = arg.error, handle = arg.handle;
          handle();
          return _this.notificationManager.addWarning("Unable to read file after file `" + error.eventType + "` event.\nMake sure you have permission to access `" + (buffer.getPath()) + "`.", {
            detail: error.message,
            dismissable: true
          });
        };
      })(this));
    };

    return Project;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3Byb2plY3QuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxrSEFBQTtJQUFBOzs7OztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLEVBQUEsR0FBSyxPQUFBLENBQVEsU0FBUjs7RUFDTCxNQUF3QixPQUFBLENBQVEsV0FBUixDQUF4QixFQUFDLHFCQUFELEVBQVU7O0VBQ1YsVUFBQSxHQUFhLE9BQUEsQ0FBUSxhQUFSOztFQUViLHdCQUFBLEdBQTJCLE9BQUEsQ0FBUSw4QkFBUjs7RUFDM0IsS0FBQSxHQUFRLE9BQUEsQ0FBUSxTQUFSOztFQUNSLHFCQUFBLEdBQXdCLE9BQUEsQ0FBUSwyQkFBUjs7RUFLeEIsTUFBTSxDQUFDLE9BQVAsR0FDTTs7OztBQUNKOzs7O0lBSWEsaUJBQUMsR0FBRDtBQUNYLFVBQUE7TUFEYSxJQUFDLENBQUEsMEJBQUEscUJBQXFCLHFDQUFnQixxQkFBUSxJQUFDLENBQUEsMEJBQUE7TUFDNUQsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO01BQ2YsSUFBQyxDQUFBLE9BQUQsR0FBVztNQUNYLElBQUMsQ0FBQSxlQUFELEdBQW1CO01BQ25CLElBQUMsQ0FBQSxZQUFELEdBQWdCO01BQ2hCLElBQUMsQ0FBQSxrQkFBRCxHQUFzQjtNQUN0QixJQUFDLENBQUEsd0JBQUQsR0FBZ0MsSUFBQSx3QkFBQSxDQUFBO01BQ2hDLElBQUMsQ0FBQSx3QkFBRCxHQUFnQyxJQUFBLEdBQUEsQ0FBQTtNQUNoQyxJQUFDLENBQUEsbUJBQUQsR0FBdUIsQ0FBSyxJQUFBLHFCQUFBLENBQXNCLElBQXRCLEVBQTRCLE1BQTVCLENBQUw7TUFDdkIsSUFBQyxDQUFBLGtCQUFELEdBQXNCO01BQ3RCLElBQUMsQ0FBQSxlQUFELENBQWlC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LElBQUksQ0FBQyxPQUFMLENBQWEsTUFBTSxDQUFDLE9BQVAsQ0FBQSxDQUFiLENBQUQsQ0FBVixFQURGOztRQURxQjtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkI7YUFHQSxNQUFNLENBQUMscUJBQVAsQ0FBNkIsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQ7QUFDM0IsY0FBQTtVQUQ2QixtQkFBTztVQUNwQyxNQUFBLENBQUE7aUJBQ0EsS0FBQyxDQUFBLG1CQUFtQixDQUFDLFVBQXJCLENBQWdDLGtDQUFBLEdBQ0ksS0FBSyxDQUFDLFNBRFYsR0FDb0IscURBRHBCLEdBRVksQ0FBQyxNQUFNLENBQUMsT0FBUCxDQUFBLENBQUQsQ0FGWixHQUU4QixJQUY5RCxFQUlFO1lBQUEsTUFBQSxFQUFRLEtBQUssQ0FBQyxPQUFkO1lBQ0EsV0FBQSxFQUFhLElBRGI7V0FKRjtRQUYyQjtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBN0I7SUFQaUI7Ozs7S0E5WkM7QUFmdEIiLCJzb3VyY2VzQ29udGVudCI6WyJwYXRoID0gcmVxdWlyZSAncGF0aCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcbntFbWl0dGVyLCBEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcblRleHRCdWZmZXIgPSByZXF1aXJlICd0ZXh0LWJ1ZmZlcidcblxuRGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyID0gcmVxdWlyZSAnLi9kZWZhdWx0LWRpcmVjdG9yeS1wcm92aWRlcidcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcbkdpdFJlcG9zaXRvcnlQcm92aWRlciA9IHJlcXVpcmUgJy4vZ2l0LXJlcG9zaXRvcnktcHJvdmlkZXInXG5cbiMgRXh0ZW5kZWQ6IFJlcHJlc2VudHMgYSBwcm9qZWN0IHRoYXQncyBvcGVuZWQgaW4gQXRvbS5cbiNcbiMgQW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcyBpcyBhbHdheXMgYXZhaWxhYmxlIGFzIHRoZSBgYXRvbS5wcm9qZWN0YCBnbG9iYWwuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBQcm9qZWN0IGV4dGVuZHMgTW9kZWxcbiAgIyMjXG4gIFNlY3Rpb246IENvbnN0cnVjdGlvbiBhbmQgRGVzdHJ1Y3Rpb25cbiAgIyMjXG5cbiAgY29uc3RydWN0b3I6ICh7QG5vdGlmaWNhdGlvbk1hbmFnZXIsIHBhY2thZ2VNYW5hZ2VyLCBjb25maWcsIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSkgLT5cbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG4gICAgQGJ1ZmZlcnMgPSBbXVxuICAgIEByb290RGlyZWN0b3JpZXMgPSBbXVxuICAgIEByZXBvc2l0b3JpZXMgPSBbXVxuICAgIEBkaXJlY3RvcnlQcm92aWRlcnMgPSBbXVxuICAgIEBkZWZhdWx0RGlyZWN0b3J5UHJvdmlkZXIgPSBuZXcgRGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyKClcbiAgICBAcmVwb3NpdG9yeVByb21pc2VzQnlQYXRoID0gbmV3IE1hcCgpXG4gICAgQHJlcG9zaXRvcnlQcm92aWRlcnMgPSBbbmV3IEdpdFJlcG9zaXRvcnlQcm92aWRlcih0aGlzLCBjb25maWcpXVxuICAgIEBsb2FkUHJvbWlzZXNCeVBhdGggPSB7fVxuICAgIEBjb25zdW1lU2VydmljZXMocGFja2FnZU1hbmFnZXIpXG5cbiAgZGVzdHJveWVkOiAtPlxuICAgIGJ1ZmZlci5kZXN0cm95KCkgZm9yIGJ1ZmZlciBpbiBAYnVmZmVycy5zbGljZSgpXG4gICAgcmVwb3NpdG9yeT8uZGVzdHJveSgpIGZvciByZXBvc2l0b3J5IGluIEByZXBvc2l0b3JpZXMuc2xpY2UoKVxuICAgIEByb290RGlyZWN0b3JpZXMgPSBbXVxuICAgIEByZXBvc2l0b3JpZXMgPSBbXVxuXG4gIHJlc2V0OiAocGFja2FnZU1hbmFnZXIpIC0+XG4gICAgQGVtaXR0ZXIuZGlzcG9zZSgpXG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuXG4gICAgYnVmZmVyPy5kZXN0cm95KCkgZm9yIGJ1ZmZlciBpbiBAYnVmZmVyc1xuICAgIEBidWZmZXJzID0gW11cbiAgICBAc2V0UGF0aHMoW10pXG4gICAgQGxvYWRQcm9taXNlc0J5UGF0aCA9IHt9XG4gICAgQGNvbnN1bWVTZXJ2aWNlcyhwYWNrYWdlTWFuYWdlcilcblxuICBkZXN0cm95VW5yZXRhaW5lZEJ1ZmZlcnM6IC0+XG4gICAgYnVmZmVyLmRlc3Ryb3koKSBmb3IgYnVmZmVyIGluIEBnZXRCdWZmZXJzKCkgd2hlbiBub3QgYnVmZmVyLmlzUmV0YWluZWQoKVxuICAgIHJldHVyblxuXG4gICMjI1xuICBTZWN0aW9uOiBTZXJpYWxpemF0aW9uXG4gICMjI1xuXG4gIGRlc2VyaWFsaXplOiAoc3RhdGUpIC0+XG4gICAgYnVmZmVyUHJvbWlzZXMgPSBbXVxuICAgIGZvciBidWZmZXJTdGF0ZSBpbiBzdGF0ZS5idWZmZXJzXG4gICAgICBjb250aW51ZSBpZiBmcy5pc0RpcmVjdG9yeVN5bmMoYnVmZmVyU3RhdGUuZmlsZVBhdGgpXG4gICAgICBpZiBidWZmZXJTdGF0ZS5maWxlUGF0aFxuICAgICAgICB0cnlcbiAgICAgICAgICBmcy5jbG9zZVN5bmMoZnMub3BlblN5bmMoYnVmZmVyU3RhdGUuZmlsZVBhdGgsICdyJykpXG4gICAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgICAgY29udGludWUgdW5sZXNzIGVycm9yLmNvZGUgaXMgJ0VOT0VOVCdcbiAgICAgIHVubGVzcyBidWZmZXJTdGF0ZS5zaG91bGREZXN0cm95T25GaWxlRGVsZXRlP1xuICAgICAgICBidWZmZXJTdGF0ZS5zaG91bGREZXN0cm95T25GaWxlRGVsZXRlID0gLT5cbiAgICAgICAgICBhdG9tLmNvbmZpZy5nZXQoJ2NvcmUuY2xvc2VEZWxldGVkRmlsZVRhYnMnKVxuICAgICAgYnVmZmVyUHJvbWlzZXMucHVzaChUZXh0QnVmZmVyLmRlc2VyaWFsaXplKGJ1ZmZlclN0YXRlKSlcbiAgICBQcm9taXNlLmFsbChidWZmZXJQcm9taXNlcykudGhlbiAoQGJ1ZmZlcnMpID0+XG4gICAgICBAc3Vic2NyaWJlVG9CdWZmZXIoYnVmZmVyKSBmb3IgYnVmZmVyIGluIEBidWZmZXJzXG4gICAgICBAc2V0UGF0aHMoc3RhdGUucGF0aHMpXG5cbiAgc2VyaWFsaXplOiAob3B0aW9ucz17fSkgLT5cbiAgICBkZXNlcmlhbGl6ZXI6ICdQcm9qZWN0J1xuICAgIHBhdGhzOiBAZ2V0UGF0aHMoKVxuICAgIGJ1ZmZlcnM6IF8uY29tcGFjdChAYnVmZmVycy5tYXAgKGJ1ZmZlcikgLT5cbiAgICAgIGlmIGJ1ZmZlci5pc1JldGFpbmVkKClcbiAgICAgICAgaXNVbmxvYWRpbmcgPSBvcHRpb25zLmlzVW5sb2FkaW5nIGlzIHRydWVcbiAgICAgICAgYnVmZmVyLnNlcmlhbGl6ZSh7bWFya2VyTGF5ZXJzOiBpc1VubG9hZGluZywgaGlzdG9yeTogaXNVbmxvYWRpbmd9KVxuICAgIClcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlIHByb2plY3QgcGF0aHMgY2hhbmdlLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBwcm9qZWN0IHBhdGhzIGNoYW5nZS5cbiAgIyAgICAqIGBwcm9qZWN0UGF0aHNgIEFuIHtBcnJheX0gb2Yge1N0cmluZ30gcHJvamVjdCBwYXRocy5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlUGF0aHM6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1wYXRocycsIGNhbGxiYWNrXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhIHRleHQgYnVmZmVyIGlzIGFkZGVkIHRvIHRoZVxuICAjIHByb2plY3QuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiBhIHRleHQgYnVmZmVyIGlzIGFkZGVkLlxuICAjICAgKiBgYnVmZmVyYCBBIHtUZXh0QnVmZmVyfSBpdGVtLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRBZGRCdWZmZXI6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1idWZmZXInLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdpdGggYWxsIGN1cnJlbnQgYW5kIGZ1dHVyZSB0ZXh0XG4gICMgYnVmZmVycyBpbiB0aGUgcHJvamVjdC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIGN1cnJlbnQgYW5kIGZ1dHVyZSB0ZXh0IGJ1ZmZlcnMuXG4gICMgICAqIGBidWZmZXJgIEEge1RleHRCdWZmZXJ9IGl0ZW0uXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlQnVmZmVyczogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKGJ1ZmZlcikgZm9yIGJ1ZmZlciBpbiBAZ2V0QnVmZmVycygpXG4gICAgQG9uRGlkQWRkQnVmZmVyIGNhbGxiYWNrXG5cbiAgIyMjXG4gIFNlY3Rpb246IEFjY2Vzc2luZyB0aGUgZ2l0IHJlcG9zaXRvcnlcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEdldCBhbiB7QXJyYXl9IG9mIHtHaXRSZXBvc2l0b3J5fXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBwcm9qZWN0J3NcbiAgIyBkaXJlY3Rvcmllcy5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIHdpbGwgYmUgcmVtb3ZlZCBpbiAyLjAgYmVjYXVzZSBpdCBkb2VzIHN5bmNocm9ub3VzIEkvTy5cbiAgIyBQcmVmZXIgdGhlIGZvbGxvd2luZywgd2hpY2ggZXZhbHVhdGVzIHRvIGEge1Byb21pc2V9IHRoYXQgcmVzb2x2ZXMgdG8gYW5cbiAgIyB7QXJyYXl9IG9mIHtSZXBvc2l0b3J5fSBvYmplY3RzOlxuICAjIGBgYFxuICAjIFByb21pc2UuYWxsKGF0b20ucHJvamVjdC5nZXREaXJlY3RvcmllcygpLm1hcChcbiAgIyAgICAgYXRvbS5wcm9qZWN0LnJlcG9zaXRvcnlGb3JEaXJlY3RvcnkuYmluZChhdG9tLnByb2plY3QpKSlcbiAgIyBgYGBcbiAgZ2V0UmVwb3NpdG9yaWVzOiAtPiBAcmVwb3NpdG9yaWVzXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgcmVwb3NpdG9yeSBmb3IgYSBnaXZlbiBkaXJlY3RvcnkgYXN5bmNocm9ub3VzbHkuXG4gICNcbiAgIyAqIGBkaXJlY3RvcnlgIHtEaXJlY3Rvcnl9IGZvciB3aGljaCB0byBnZXQgYSB7UmVwb3NpdG9yeX0uXG4gICNcbiAgIyBSZXR1cm5zIGEge1Byb21pc2V9IHRoYXQgcmVzb2x2ZXMgd2l0aCBlaXRoZXI6XG4gICMgKiB7UmVwb3NpdG9yeX0gaWYgYSByZXBvc2l0b3J5IGNhbiBiZSBjcmVhdGVkIGZvciB0aGUgZ2l2ZW4gZGlyZWN0b3J5XG4gICMgKiBgbnVsbGAgaWYgbm8gcmVwb3NpdG9yeSBjYW4gYmUgY3JlYXRlZCBmb3IgdGhlIGdpdmVuIGRpcmVjdG9yeS5cbiAgcmVwb3NpdG9yeUZvckRpcmVjdG9yeTogKGRpcmVjdG9yeSkgLT5cbiAgICBwYXRoRm9yRGlyZWN0b3J5ID0gZGlyZWN0b3J5LmdldFJlYWxQYXRoU3luYygpXG4gICAgcHJvbWlzZSA9IEByZXBvc2l0b3J5UHJvbWlzZXNCeVBhdGguZ2V0KHBhdGhGb3JEaXJlY3RvcnkpXG4gICAgdW5sZXNzIHByb21pc2VcbiAgICAgIHByb21pc2VzID0gQHJlcG9zaXRvcnlQcm92aWRlcnMubWFwIChwcm92aWRlcikgLT5cbiAgICAgICAgcHJvdmlkZXIucmVwb3NpdG9yeUZvckRpcmVjdG9yeShkaXJlY3RvcnkpXG4gICAgICBwcm9taXNlID0gUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4gKHJlcG9zaXRvcmllcykgPT5cbiAgICAgICAgcmVwbyA9IF8uZmluZChyZXBvc2l0b3JpZXMsIChyZXBvKSAtPiByZXBvPykgPyBudWxsXG5cbiAgICAgICAgIyBJZiBubyByZXBvc2l0b3J5IGlzIGZvdW5kLCByZW1vdmUgdGhlIGVudHJ5IGluIGZvciB0aGUgZGlyZWN0b3J5IGluXG4gICAgICAgICMgQHJlcG9zaXRvcnlQcm9taXNlc0J5UGF0aCBpbiBjYXNlIHNvbWUgb3RoZXIgUmVwb3NpdG9yeVByb3ZpZGVyIGlzXG4gICAgICAgICMgcmVnaXN0ZXJlZCBpbiB0aGUgZnV0dXJlIHRoYXQgY291bGQgc3VwcGx5IGEgUmVwb3NpdG9yeSBmb3IgdGhlXG4gICAgICAgICMgZGlyZWN0b3J5LlxuICAgICAgICBAcmVwb3NpdG9yeVByb21pc2VzQnlQYXRoLmRlbGV0ZShwYXRoRm9yRGlyZWN0b3J5KSB1bmxlc3MgcmVwbz9cbiAgICAgICAgcmVwbz8ub25EaWREZXN0cm95Pyg9PiBAcmVwb3NpdG9yeVByb21pc2VzQnlQYXRoLmRlbGV0ZShwYXRoRm9yRGlyZWN0b3J5KSlcbiAgICAgICAgcmVwb1xuICAgICAgQHJlcG9zaXRvcnlQcm9taXNlc0J5UGF0aC5zZXQocGF0aEZvckRpcmVjdG9yeSwgcHJvbWlzZSlcbiAgICBwcm9taXNlXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1hbmFnaW5nIFBhdGhzXG4gICMjI1xuXG4gICMgUHVibGljOiBHZXQgYW4ge0FycmF5fSBvZiB7U3RyaW5nfXMgY29udGFpbmluZyB0aGUgcGF0aHMgb2YgdGhlIHByb2plY3Qnc1xuICAjIGRpcmVjdG9yaWVzLlxuICBnZXRQYXRoczogLT4gcm9vdERpcmVjdG9yeS5nZXRQYXRoKCkgZm9yIHJvb3REaXJlY3RvcnkgaW4gQHJvb3REaXJlY3Rvcmllc1xuXG4gICMgUHVibGljOiBTZXQgdGhlIHBhdGhzIG9mIHRoZSBwcm9qZWN0J3MgZGlyZWN0b3JpZXMuXG4gICNcbiAgIyAqIGBwcm9qZWN0UGF0aHNgIHtBcnJheX0gb2Yge1N0cmluZ30gcGF0aHMuXG4gIHNldFBhdGhzOiAocHJvamVjdFBhdGhzKSAtPlxuICAgIHJlcG9zaXRvcnk/LmRlc3Ryb3koKSBmb3IgcmVwb3NpdG9yeSBpbiBAcmVwb3NpdG9yaWVzXG4gICAgQHJvb3REaXJlY3RvcmllcyA9IFtdXG4gICAgQHJlcG9zaXRvcmllcyA9IFtdXG5cbiAgICBAYWRkUGF0aChwcm9qZWN0UGF0aCwgZW1pdEV2ZW50OiBmYWxzZSkgZm9yIHByb2plY3RQYXRoIGluIHByb2plY3RQYXRoc1xuXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1wYXRocycsIHByb2plY3RQYXRoc1xuXG4gICMgUHVibGljOiBBZGQgYSBwYXRoIHRvIHRoZSBwcm9qZWN0J3MgbGlzdCBvZiByb290IHBhdGhzXG4gICNcbiAgIyAqIGBwcm9qZWN0UGF0aGAge1N0cmluZ30gVGhlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSB0byBhZGQuXG4gIGFkZFBhdGg6IChwcm9qZWN0UGF0aCwgb3B0aW9ucykgLT5cbiAgICBkaXJlY3RvcnkgPSBAZ2V0RGlyZWN0b3J5Rm9yUHJvamVjdFBhdGgocHJvamVjdFBhdGgpXG4gICAgcmV0dXJuIHVubGVzcyBkaXJlY3RvcnkuZXhpc3RzU3luYygpXG4gICAgZm9yIGV4aXN0aW5nRGlyZWN0b3J5IGluIEBnZXREaXJlY3RvcmllcygpXG4gICAgICByZXR1cm4gaWYgZXhpc3RpbmdEaXJlY3RvcnkuZ2V0UGF0aCgpIGlzIGRpcmVjdG9yeS5nZXRQYXRoKClcblxuICAgIEByb290RGlyZWN0b3JpZXMucHVzaChkaXJlY3RvcnkpXG5cbiAgICByZXBvID0gbnVsbFxuICAgIGZvciBwcm92aWRlciBpbiBAcmVwb3NpdG9yeVByb3ZpZGVyc1xuICAgICAgYnJlYWsgaWYgcmVwbyA9IHByb3ZpZGVyLnJlcG9zaXRvcnlGb3JEaXJlY3RvcnlTeW5jPyhkaXJlY3RvcnkpXG4gICAgQHJlcG9zaXRvcmllcy5wdXNoKHJlcG8gPyBudWxsKVxuXG4gICAgdW5sZXNzIG9wdGlvbnM/LmVtaXRFdmVudCBpcyBmYWxzZVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1wYXRocycsIEBnZXRQYXRocygpXG5cbiAgZ2V0RGlyZWN0b3J5Rm9yUHJvamVjdFBhdGg6IChwcm9qZWN0UGF0aCkgLT5cbiAgICBkaXJlY3RvcnkgPSBudWxsXG4gICAgZm9yIHByb3ZpZGVyIGluIEBkaXJlY3RvcnlQcm92aWRlcnNcbiAgICAgIGJyZWFrIGlmIGRpcmVjdG9yeSA9IHByb3ZpZGVyLmRpcmVjdG9yeUZvclVSSVN5bmM/KHByb2plY3RQYXRoKVxuICAgIGRpcmVjdG9yeSA/PSBAZGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyLmRpcmVjdG9yeUZvclVSSVN5bmMocHJvamVjdFBhdGgpXG4gICAgZGlyZWN0b3J5XG5cbiAgIyBQdWJsaWM6IHJlbW92ZSBhIHBhdGggZnJvbSB0aGUgcHJvamVjdCdzIGxpc3Qgb2Ygcm9vdCBwYXRocy5cbiAgI1xuICAjICogYHByb2plY3RQYXRoYCB7U3RyaW5nfSBUaGUgcGF0aCB0byByZW1vdmUuXG4gIHJlbW92ZVBhdGg6IChwcm9qZWN0UGF0aCkgLT5cbiAgICAjIFRoZSBwcm9qZWN0UGF0aCBtYXkgYmUgYSBVUkksIGluIHdoaWNoIGNhc2UgaXQgc2hvdWxkIG5vdCBiZSBub3JtYWxpemVkLlxuICAgIHVubGVzcyBwcm9qZWN0UGF0aCBpbiBAZ2V0UGF0aHMoKVxuICAgICAgcHJvamVjdFBhdGggPSBAZGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyLm5vcm1hbGl6ZVBhdGgocHJvamVjdFBhdGgpXG5cbiAgICBpbmRleFRvUmVtb3ZlID0gbnVsbFxuICAgIGZvciBkaXJlY3RvcnksIGkgaW4gQHJvb3REaXJlY3Rvcmllc1xuICAgICAgaWYgZGlyZWN0b3J5LmdldFBhdGgoKSBpcyBwcm9qZWN0UGF0aFxuICAgICAgICBpbmRleFRvUmVtb3ZlID0gaVxuICAgICAgICBicmVha1xuXG4gICAgaWYgaW5kZXhUb1JlbW92ZT9cbiAgICAgIFtyZW1vdmVkRGlyZWN0b3J5XSA9IEByb290RGlyZWN0b3JpZXMuc3BsaWNlKGluZGV4VG9SZW1vdmUsIDEpXG4gICAgICBbcmVtb3ZlZFJlcG9zaXRvcnldID0gQHJlcG9zaXRvcmllcy5zcGxpY2UoaW5kZXhUb1JlbW92ZSwgMSlcbiAgICAgIHJlbW92ZWRSZXBvc2l0b3J5Py5kZXN0cm95KCkgdW5sZXNzIHJlbW92ZWRSZXBvc2l0b3J5IGluIEByZXBvc2l0b3JpZXNcbiAgICAgIEBlbWl0dGVyLmVtaXQgXCJkaWQtY2hhbmdlLXBhdGhzXCIsIEBnZXRQYXRocygpXG4gICAgICB0cnVlXG4gICAgZWxzZVxuICAgICAgZmFsc2VcblxuICAjIFB1YmxpYzogR2V0IGFuIHtBcnJheX0gb2Yge0RpcmVjdG9yeX1zIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHByb2plY3QuXG4gIGdldERpcmVjdG9yaWVzOiAtPlxuICAgIEByb290RGlyZWN0b3JpZXNcblxuICByZXNvbHZlUGF0aDogKHVyaSkgLT5cbiAgICByZXR1cm4gdW5sZXNzIHVyaVxuXG4gICAgaWYgdXJpPy5tYXRjaCgvW0EtWmEtejAtOSstLl0rOlxcL1xcLy8pICMgbGVhdmUgcGF0aCBhbG9uZSBpZiBpdCBoYXMgYSBzY2hlbWVcbiAgICAgIHVyaVxuICAgIGVsc2VcbiAgICAgIGlmIGZzLmlzQWJzb2x1dGUodXJpKVxuICAgICAgICBAZGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyLm5vcm1hbGl6ZVBhdGgoZnMucmVzb2x2ZUhvbWUodXJpKSlcbiAgICAgICMgVE9ETzogd2hhdCBzaG91bGQgd2UgZG8gaGVyZSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZSBkaXJlY3Rvcmllcz9cbiAgICAgIGVsc2UgaWYgcHJvamVjdFBhdGggPSBAZ2V0UGF0aHMoKVswXVxuICAgICAgICBAZGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyLm5vcm1hbGl6ZVBhdGgoZnMucmVzb2x2ZUhvbWUocGF0aC5qb2luKHByb2plY3RQYXRoLCB1cmkpKSlcbiAgICAgIGVsc2VcbiAgICAgICAgdW5kZWZpbmVkXG5cbiAgcmVsYXRpdml6ZTogKGZ1bGxQYXRoKSAtPlxuICAgIEByZWxhdGl2aXplUGF0aChmdWxsUGF0aClbMV1cblxuICAjIFB1YmxpYzogR2V0IHRoZSBwYXRoIHRvIHRoZSBwcm9qZWN0IGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIHRoZSBnaXZlbiBwYXRoLFxuICAjIGFuZCB0aGUgcmVsYXRpdmUgcGF0aCBmcm9tIHRoYXQgcHJvamVjdCBkaXJlY3RvcnkgdG8gdGhlIGdpdmVuIHBhdGguXG4gICNcbiAgIyAqIGBmdWxsUGF0aGAge1N0cmluZ30gQW4gYWJzb2x1dGUgcGF0aC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSB3aXRoIHR3byBlbGVtZW50czpcbiAgIyAqIGBwcm9qZWN0UGF0aGAgVGhlIHtTdHJpbmd9IHBhdGggdG8gdGhlIHByb2plY3QgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgdGhlXG4gICMgICBnaXZlbiBwYXRoLCBvciBgbnVsbGAgaWYgbm9uZSBpcyBmb3VuZC5cbiAgIyAqIGByZWxhdGl2ZVBhdGhgIHtTdHJpbmd9IFRoZSByZWxhdGl2ZSBwYXRoIGZyb20gdGhlIHByb2plY3QgZGlyZWN0b3J5IHRvXG4gICMgICB0aGUgZ2l2ZW4gcGF0aC5cbiAgcmVsYXRpdml6ZVBhdGg6IChmdWxsUGF0aCkgLT5cbiAgICByZXN1bHQgPSBbbnVsbCwgZnVsbFBhdGhdXG4gICAgaWYgZnVsbFBhdGg/XG4gICAgICBmb3Igcm9vdERpcmVjdG9yeSBpbiBAcm9vdERpcmVjdG9yaWVzXG4gICAgICAgIHJlbGF0aXZlUGF0aCA9IHJvb3REaXJlY3RvcnkucmVsYXRpdml6ZShmdWxsUGF0aClcbiAgICAgICAgaWYgcmVsYXRpdmVQYXRoPy5sZW5ndGggPCByZXN1bHRbMV0ubGVuZ3RoXG4gICAgICAgICAgcmVzdWx0ID0gW3Jvb3REaXJlY3RvcnkuZ2V0UGF0aCgpLCByZWxhdGl2ZVBhdGhdXG4gICAgcmVzdWx0XG5cbiAgIyBQdWJsaWM6IERldGVybWluZXMgd2hldGhlciB0aGUgZ2l2ZW4gcGF0aCAocmVhbCBvciBzeW1ib2xpYykgaXMgaW5zaWRlIHRoZVxuICAjIHByb2plY3QncyBkaXJlY3RvcnkuXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBkb2VzIG5vdCBhY3R1YWxseSBjaGVjayBpZiB0aGUgcGF0aCBleGlzdHMsIGl0IGp1c3QgY2hlY2tzIHRoZWlyXG4gICMgbG9jYXRpb25zIHJlbGF0aXZlIHRvIGVhY2ggb3RoZXIuXG4gICNcbiAgIyAjIyBFeGFtcGxlc1xuICAjXG4gICMgQmFzaWMgb3BlcmF0aW9uXG4gICNcbiAgIyBgYGBjb2ZmZWVcbiAgIyAjIFByb2plY3QncyByb290IGRpcmVjdG9yeSBpcyAvZm9vL2JhclxuICAjIHByb2plY3QuY29udGFpbnMoJy9mb28vYmFyL2JheicpICAgICAgICAjID0+IHRydWVcbiAgIyBwcm9qZWN0LmNvbnRhaW5zKCcvdXNyL2xpYi9iYXonKSAgICAgICAgIyA9PiBmYWxzZVxuICAjIGBgYFxuICAjXG4gICMgRXhpc3RlbmNlIG9mIHRoZSBwYXRoIGlzIG5vdCByZXF1aXJlZFxuICAjXG4gICMgYGBgY29mZmVlXG4gICMgIyBQcm9qZWN0J3Mgcm9vdCBkaXJlY3RvcnkgaXMgL2Zvby9iYXJcbiAgIyBmcy5leGlzdHNTeW5jKCcvZm9vL2Jhci9iYXonKSAgICAgICAgICAgIyA9PiBmYWxzZVxuICAjIHByb2plY3QuY29udGFpbnMoJy9mb28vYmFyL2JheicpICAgICAgICAjID0+IHRydWVcbiAgIyBgYGBcbiAgI1xuICAjICogYHBhdGhUb0NoZWNrYCB7U3RyaW5nfSBwYXRoXG4gICNcbiAgIyBSZXR1cm5zIHdoZXRoZXIgdGhlIHBhdGggaXMgaW5zaWRlIHRoZSBwcm9qZWN0J3Mgcm9vdCBkaXJlY3RvcnkuXG4gIGNvbnRhaW5zOiAocGF0aFRvQ2hlY2spIC0+XG4gICAgQHJvb3REaXJlY3Rvcmllcy5zb21lIChkaXIpIC0+IGRpci5jb250YWlucyhwYXRoVG9DaGVjaylcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZVxuICAjIyNcblxuICBjb25zdW1lU2VydmljZXM6ICh7c2VydmljZUh1Yn0pIC0+XG4gICAgc2VydmljZUh1Yi5jb25zdW1lKFxuICAgICAgJ2F0b20uZGlyZWN0b3J5LXByb3ZpZGVyJyxcbiAgICAgICdeMC4xLjAnLFxuICAgICAgKHByb3ZpZGVyKSA9PlxuICAgICAgICBAZGlyZWN0b3J5UHJvdmlkZXJzLnVuc2hpZnQocHJvdmlkZXIpXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlID0+XG4gICAgICAgICAgQGRpcmVjdG9yeVByb3ZpZGVycy5zcGxpY2UoQGRpcmVjdG9yeVByb3ZpZGVycy5pbmRleE9mKHByb3ZpZGVyKSwgMSlcbiAgICApXG5cbiAgICBzZXJ2aWNlSHViLmNvbnN1bWUoXG4gICAgICAnYXRvbS5yZXBvc2l0b3J5LXByb3ZpZGVyJyxcbiAgICAgICdeMC4xLjAnLFxuICAgICAgKHByb3ZpZGVyKSA9PlxuICAgICAgICBAcmVwb3NpdG9yeVByb3ZpZGVycy51bnNoaWZ0KHByb3ZpZGVyKVxuICAgICAgICBAc2V0UGF0aHMoQGdldFBhdGhzKCkpIGlmIG51bGwgaW4gQHJlcG9zaXRvcmllc1xuICAgICAgICBuZXcgRGlzcG9zYWJsZSA9PlxuICAgICAgICAgIEByZXBvc2l0b3J5UHJvdmlkZXJzLnNwbGljZShAcmVwb3NpdG9yeVByb3ZpZGVycy5pbmRleE9mKHByb3ZpZGVyKSwgMSlcbiAgICApXG5cbiAgIyBSZXRyaWV2ZXMgYWxsIHRoZSB7VGV4dEJ1ZmZlcn1zIGluIHRoZSBwcm9qZWN0OyB0aGF0IGlzLCB0aGVcbiAgIyBidWZmZXJzIGZvciBhbGwgb3BlbiBmaWxlcy5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7VGV4dEJ1ZmZlcn1zLlxuICBnZXRCdWZmZXJzOiAtPlxuICAgIEBidWZmZXJzLnNsaWNlKClcblxuICAjIElzIHRoZSBidWZmZXIgZm9yIHRoZSBnaXZlbiBwYXRoIG1vZGlmaWVkP1xuICBpc1BhdGhNb2RpZmllZDogKGZpbGVQYXRoKSAtPlxuICAgIEBmaW5kQnVmZmVyRm9yUGF0aChAcmVzb2x2ZVBhdGgoZmlsZVBhdGgpKT8uaXNNb2RpZmllZCgpXG5cbiAgZmluZEJ1ZmZlckZvclBhdGg6IChmaWxlUGF0aCkgLT5cbiAgICBfLmZpbmQgQGJ1ZmZlcnMsIChidWZmZXIpIC0+IGJ1ZmZlci5nZXRQYXRoKCkgaXMgZmlsZVBhdGhcblxuICBmaW5kQnVmZmVyRm9ySWQ6IChpZCkgLT5cbiAgICBfLmZpbmQgQGJ1ZmZlcnMsIChidWZmZXIpIC0+IGJ1ZmZlci5nZXRJZCgpIGlzIGlkXG5cbiAgIyBPbmx5IHRvIGJlIHVzZWQgaW4gc3BlY3NcbiAgYnVmZmVyRm9yUGF0aFN5bmM6IChmaWxlUGF0aCkgLT5cbiAgICBhYnNvbHV0ZUZpbGVQYXRoID0gQHJlc29sdmVQYXRoKGZpbGVQYXRoKVxuICAgIGV4aXN0aW5nQnVmZmVyID0gQGZpbmRCdWZmZXJGb3JQYXRoKGFic29sdXRlRmlsZVBhdGgpIGlmIGZpbGVQYXRoXG4gICAgZXhpc3RpbmdCdWZmZXIgPyBAYnVpbGRCdWZmZXJTeW5jKGFic29sdXRlRmlsZVBhdGgpXG5cbiAgIyBPbmx5IHRvIGJlIHVzZWQgd2hlbiBkZXNlcmlhbGl6aW5nXG4gIGJ1ZmZlckZvcklkU3luYzogKGlkKSAtPlxuICAgIGV4aXN0aW5nQnVmZmVyID0gQGZpbmRCdWZmZXJGb3JJZChpZCkgaWYgaWRcbiAgICBleGlzdGluZ0J1ZmZlciA/IEBidWlsZEJ1ZmZlclN5bmMoKVxuXG4gICMgR2l2ZW4gYSBmaWxlIHBhdGgsIHRoaXMgcmV0cmlldmVzIG9yIGNyZWF0ZXMgYSBuZXcge1RleHRCdWZmZXJ9LlxuICAjXG4gICMgSWYgdGhlIGBmaWxlUGF0aGAgYWxyZWFkeSBoYXMgYSBgYnVmZmVyYCwgdGhhdCB2YWx1ZSBpcyB1c2VkIGluc3RlYWQuIE90aGVyd2lzZSxcbiAgIyBgdGV4dGAgaXMgdXNlZCBhcyB0aGUgY29udGVudHMgb2YgdGhlIG5ldyBidWZmZXIuXG4gICNcbiAgIyAqIGBmaWxlUGF0aGAgQSB7U3RyaW5nfSByZXByZXNlbnRpbmcgYSBwYXRoLiBJZiBgbnVsbGAsIGFuIFwiVW50aXRsZWRcIiBidWZmZXIgaXMgY3JlYXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB0byB0aGUge1RleHRCdWZmZXJ9LlxuICBidWZmZXJGb3JQYXRoOiAoYWJzb2x1dGVGaWxlUGF0aCkgLT5cbiAgICBleGlzdGluZ0J1ZmZlciA9IEBmaW5kQnVmZmVyRm9yUGF0aChhYnNvbHV0ZUZpbGVQYXRoKSBpZiBhYnNvbHV0ZUZpbGVQYXRoP1xuICAgIGlmIGV4aXN0aW5nQnVmZmVyXG4gICAgICBQcm9taXNlLnJlc29sdmUoZXhpc3RpbmdCdWZmZXIpXG4gICAgZWxzZVxuICAgICAgQGJ1aWxkQnVmZmVyKGFic29sdXRlRmlsZVBhdGgpXG5cbiAgc2hvdWxkRGVzdHJveUJ1ZmZlck9uRmlsZURlbGV0ZTogLT5cbiAgICBhdG9tLmNvbmZpZy5nZXQoJ2NvcmUuY2xvc2VEZWxldGVkRmlsZVRhYnMnKVxuXG4gICMgU3RpbGwgbmVlZGVkIHdoZW4gZGVzZXJpYWxpemluZyBhIHRva2VuaXplZCBidWZmZXJcbiAgYnVpbGRCdWZmZXJTeW5jOiAoYWJzb2x1dGVGaWxlUGF0aCkgLT5cbiAgICBwYXJhbXMgPSB7c2hvdWxkRGVzdHJveU9uRmlsZURlbGV0ZTogQHNob3VsZERlc3Ryb3lCdWZmZXJPbkZpbGVEZWxldGV9XG4gICAgaWYgYWJzb2x1dGVGaWxlUGF0aD9cbiAgICAgIGJ1ZmZlciA9IFRleHRCdWZmZXIubG9hZFN5bmMoYWJzb2x1dGVGaWxlUGF0aCwgcGFyYW1zKVxuICAgIGVsc2VcbiAgICAgIGJ1ZmZlciA9IG5ldyBUZXh0QnVmZmVyKHBhcmFtcylcbiAgICBAYWRkQnVmZmVyKGJ1ZmZlcilcbiAgICBidWZmZXJcblxuICAjIEdpdmVuIGEgZmlsZSBwYXRoLCB0aGlzIHNldHMgaXRzIHtUZXh0QnVmZmVyfS5cbiAgI1xuICAjICogYGFic29sdXRlRmlsZVBhdGhgIEEge1N0cmluZ30gcmVwcmVzZW50aW5nIGEgcGF0aC5cbiAgIyAqIGB0ZXh0YCBUaGUge1N0cmluZ30gdGV4dCB0byB1c2UgYXMgYSBidWZmZXIuXG4gICNcbiAgIyBSZXR1cm5zIGEge1Byb21pc2V9IHRoYXQgcmVzb2x2ZXMgdG8gdGhlIHtUZXh0QnVmZmVyfS5cbiAgYnVpbGRCdWZmZXI6IChhYnNvbHV0ZUZpbGVQYXRoKSAtPlxuICAgIHBhcmFtcyA9IHtzaG91bGREZXN0cm95T25GaWxlRGVsZXRlOiBAc2hvdWxkRGVzdHJveUJ1ZmZlck9uRmlsZURlbGV0ZX1cbiAgICBpZiBhYnNvbHV0ZUZpbGVQYXRoP1xuICAgICAgcHJvbWlzZSA9XG4gICAgICAgIEBsb2FkUHJvbWlzZXNCeVBhdGhbYWJzb2x1dGVGaWxlUGF0aF0gPz1cbiAgICAgICAgVGV4dEJ1ZmZlci5sb2FkKGFic29sdXRlRmlsZVBhdGgsIHBhcmFtcykuY2F0Y2ggKGVycm9yKSA9PlxuICAgICAgICAgIGRlbGV0ZSBAbG9hZFByb21pc2VzQnlQYXRoW2Fic29sdXRlRmlsZVBhdGhdXG4gICAgICAgICAgdGhyb3cgZXJyb3JcbiAgICBlbHNlXG4gICAgICBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKG5ldyBUZXh0QnVmZmVyKHBhcmFtcykpXG4gICAgcHJvbWlzZS50aGVuIChidWZmZXIpID0+XG4gICAgICBkZWxldGUgQGxvYWRQcm9taXNlc0J5UGF0aFthYnNvbHV0ZUZpbGVQYXRoXVxuICAgICAgQGFkZEJ1ZmZlcihidWZmZXIpXG4gICAgICBidWZmZXJcblxuXG4gIGFkZEJ1ZmZlcjogKGJ1ZmZlciwgb3B0aW9ucz17fSkgLT5cbiAgICBAYWRkQnVmZmVyQXRJbmRleChidWZmZXIsIEBidWZmZXJzLmxlbmd0aCwgb3B0aW9ucylcblxuICBhZGRCdWZmZXJBdEluZGV4OiAoYnVmZmVyLCBpbmRleCwgb3B0aW9ucz17fSkgLT5cbiAgICBAYnVmZmVycy5zcGxpY2UoaW5kZXgsIDAsIGJ1ZmZlcilcbiAgICBAc3Vic2NyaWJlVG9CdWZmZXIoYnVmZmVyKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1hZGQtYnVmZmVyJywgYnVmZmVyXG4gICAgYnVmZmVyXG5cbiAgIyBSZW1vdmVzIGEge1RleHRCdWZmZXJ9IGFzc29jaWF0aW9uIGZyb20gdGhlIHByb2plY3QuXG4gICNcbiAgIyBSZXR1cm5zIHRoZSByZW1vdmVkIHtUZXh0QnVmZmVyfS5cbiAgcmVtb3ZlQnVmZmVyOiAoYnVmZmVyKSAtPlxuICAgIGluZGV4ID0gQGJ1ZmZlcnMuaW5kZXhPZihidWZmZXIpXG4gICAgQHJlbW92ZUJ1ZmZlckF0SW5kZXgoaW5kZXgpIHVubGVzcyBpbmRleCBpcyAtMVxuXG4gIHJlbW92ZUJ1ZmZlckF0SW5kZXg6IChpbmRleCwgb3B0aW9ucz17fSkgLT5cbiAgICBbYnVmZmVyXSA9IEBidWZmZXJzLnNwbGljZShpbmRleCwgMSlcbiAgICBidWZmZXI/LmRlc3Ryb3koKVxuXG4gIGVhY2hCdWZmZXI6IChhcmdzLi4uKSAtPlxuICAgIHN1YnNjcmliZXIgPSBhcmdzLnNoaWZ0KCkgaWYgYXJncy5sZW5ndGggPiAxXG4gICAgY2FsbGJhY2sgPSBhcmdzLnNoaWZ0KClcblxuICAgIGNhbGxiYWNrKGJ1ZmZlcikgZm9yIGJ1ZmZlciBpbiBAZ2V0QnVmZmVycygpXG4gICAgaWYgc3Vic2NyaWJlclxuICAgICAgc3Vic2NyaWJlci5zdWJzY3JpYmUgdGhpcywgJ2J1ZmZlci1jcmVhdGVkJywgKGJ1ZmZlcikgLT4gY2FsbGJhY2soYnVmZmVyKVxuICAgIGVsc2VcbiAgICAgIEBvbiAnYnVmZmVyLWNyZWF0ZWQnLCAoYnVmZmVyKSAtPiBjYWxsYmFjayhidWZmZXIpXG5cbiAgc3Vic2NyaWJlVG9CdWZmZXI6IChidWZmZXIpIC0+XG4gICAgYnVmZmVyLm9uV2lsbFNhdmUgKHtwYXRofSkgPT4gQGFwcGxpY2F0aW9uRGVsZWdhdGUuZW1pdFdpbGxTYXZlUGF0aChwYXRoKVxuICAgIGJ1ZmZlci5vbkRpZFNhdmUgKHtwYXRofSkgPT4gQGFwcGxpY2F0aW9uRGVsZWdhdGUuZW1pdERpZFNhdmVQYXRoKHBhdGgpXG4gICAgYnVmZmVyLm9uRGlkRGVzdHJveSA9PiBAcmVtb3ZlQnVmZmVyKGJ1ZmZlcilcbiAgICBidWZmZXIub25EaWRDaGFuZ2VQYXRoID0+XG4gICAgICB1bmxlc3MgQGdldFBhdGhzKCkubGVuZ3RoID4gMFxuICAgICAgICBAc2V0UGF0aHMoW3BhdGguZGlybmFtZShidWZmZXIuZ2V0UGF0aCgpKV0pXG4gICAgYnVmZmVyLm9uV2lsbFRocm93V2F0Y2hFcnJvciAoe2Vycm9yLCBoYW5kbGV9KSA9PlxuICAgICAgaGFuZGxlKClcbiAgICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLmFkZFdhcm5pbmcgXCJcIlwiXG4gICAgICAgIFVuYWJsZSB0byByZWFkIGZpbGUgYWZ0ZXIgZmlsZSBgI3tlcnJvci5ldmVudFR5cGV9YCBldmVudC5cbiAgICAgICAgTWFrZSBzdXJlIHlvdSBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIGAje2J1ZmZlci5nZXRQYXRoKCl9YC5cbiAgICAgICAgXCJcIlwiLFxuICAgICAgICBkZXRhaWw6IGVycm9yLm1lc3NhZ2VcbiAgICAgICAgZGlzbWlzc2FibGU6IHRydWVcbiJdfQ==
