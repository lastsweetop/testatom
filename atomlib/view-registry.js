(function() {
  var AnyConstructor, Disposable, Grim, ViewRegistry, _,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Grim = require('grim');

  Disposable = require('event-kit').Disposable;

  _ = require('underscore-plus');

  AnyConstructor = Symbol('any-constructor');

  module.exports = ViewRegistry = (function() {
    ViewRegistry.prototype.animationFrameRequest = null;

    ViewRegistry.prototype.documentReadInProgress = false;

    function ViewRegistry(atomEnvironment) {
      this.atomEnvironment = atomEnvironment;
      this.performDocumentUpdate = bind(this.performDocumentUpdate, this);
      this.clear();
    }

    ViewRegistry.prototype.clear = function() {
      this.views = new WeakMap;
      this.providers = [];
      return this.clearDocumentRequests();
    };

    ViewRegistry.prototype.addViewProvider = function(modelConstructor, createView) {
      var provider;
      if (arguments.length === 1) {
        switch (typeof modelConstructor) {
          case 'function':
            provider = {
              createView: modelConstructor,
              modelConstructor: AnyConstructor
            };
            break;
          case 'object':
            Grim.deprecate("atom.views.addViewProvider now takes 2 arguments: a model constructor and a createView function. See docs for details.");
            provider = modelConstructor;
            break;
          default:
            throw new TypeError("Arguments to addViewProvider must be functions");
        }
      } else {
        provider = {
          modelConstructor: modelConstructor,
          createView: createView
        };
      }
      this.providers.push(provider);
      return new Disposable((function(_this) {
        return function() {
          return _this.providers = _this.providers.filter(function(p) {
            return p !== provider;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.getViewProviderCount = function() {
      return this.providers.length;
    };

    ViewRegistry.prototype.getView = function(object) {
      var view;
      if (object == null) {
        return;
      }
      if (view = this.views.get(object)) {
        return view;
      } else {
        view = this.createView(object);
        this.views.set(object, view);
        return view;
      }
    };

    ViewRegistry.prototype.createView = function(object) {
      var element, i, len, provider, ref, ref1, view, viewConstructor;
      if (object instanceof HTMLElement) {
        return object;
      }
      if (typeof (object != null ? object.getElement : void 0) === 'function') {
        element = object.getElement();
        if (element instanceof HTMLElement) {
          return element;
        }
      }
      if ((object != null ? object.element : void 0) instanceof HTMLElement) {
        return object.element;
      }
      if (object != null ? object.jquery : void 0) {
        return object[0];
      }
      ref = this.providers;
      for (i = 0, len = ref.length; i < len; i++) {
        provider = ref[i];
        if (provider.modelConstructor === AnyConstructor) {
          if (element = provider.createView(object, this.atomEnvironment)) {
            return element;
          }
          continue;
        }
        if (object instanceof provider.modelConstructor) {
          if (element = typeof provider.createView === "function" ? provider.createView(object, this.atomEnvironment) : void 0) {
            return element;
          }
          if (viewConstructor = provider.viewConstructor) {
            element = new viewConstructor;
                        if ((ref1 = typeof element.initialize === "function" ? element.initialize(object) : void 0) != null) {
              ref1;
            } else {
              if (typeof element.setModel === "function") {
                element.setModel(object);
              }
            };
            return element;
          }
        }
      }
      if (viewConstructor = object != null ? typeof object.getViewClass === "function" ? object.getViewClass() : void 0 : void 0) {
        view = new viewConstructor(object);
        return view[0];
      }
      throw new Error("Can't create a view for " + object.constructor.name + " instance. Please register a view provider.");
    };

    ViewRegistry.prototype.updateDocument = function(fn) {
      this.documentWriters.push(fn);
      if (!this.documentReadInProgress) {
        this.requestDocumentUpdate();
      }
      return new Disposable((function(_this) {
        return function() {
          return _this.documentWriters = _this.documentWriters.filter(function(writer) {
            return writer !== fn;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.readDocument = function(fn) {
      this.documentReaders.push(fn);
      this.requestDocumentUpdate();
      return new Disposable((function(_this) {
        return function() {
          return _this.documentReaders = _this.documentReaders.filter(function(reader) {
            return reader !== fn;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.getNextUpdatePromise = function() {
      return this.nextUpdatePromise != null ? this.nextUpdatePromise : this.nextUpdatePromise = new Promise((function(_this) {
        return function(resolve) {
          return _this.resolveNextUpdatePromise = resolve;
        };
      })(this));
    };

    ViewRegistry.prototype.clearDocumentRequests = function() {
      this.documentReaders = [];
      this.documentWriters = [];
      this.nextUpdatePromise = null;
      this.resolveNextUpdatePromise = null;
      if (this.animationFrameRequest != null) {
        cancelAnimationFrame(this.animationFrameRequest);
        return this.animationFrameRequest = null;
      }
    };

    ViewRegistry.prototype.requestDocumentUpdate = function() {
      return this.animationFrameRequest != null ? this.animationFrameRequest : this.animationFrameRequest = requestAnimationFrame(this.performDocumentUpdate);
    };

    ViewRegistry.prototype.performDocumentUpdate = function() {
      var reader, resolveNextUpdatePromise, writer;
      resolveNextUpdatePromise = this.resolveNextUpdatePromise;
      this.animationFrameRequest = null;
      this.nextUpdatePromise = null;
      this.resolveNextUpdatePromise = null;
      while (writer = this.documentWriters.shift()) {
        writer();
      }
      this.documentReadInProgress = true;
      while (reader = this.documentReaders.shift()) {
        reader();
      }
      this.documentReadInProgress = false;
      while (writer = this.documentWriters.shift()) {
        writer();
      }
      return typeof resolveNextUpdatePromise === "function" ? resolveNextUpdatePromise() : void 0;
    };

    return ViewRegistry;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3ZpZXctcmVnaXN0cnkuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxpREFBQTtJQUFBOztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDTixhQUFjLE9BQUEsQ0FBUSxXQUFSOztFQUNmLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBRUosY0FBQSxHQUFpQixNQUFBLENBQU8saUJBQVA7O0VBcUJqQixNQUFNLENBQUMsT0FBUCxHQUNNOzJCQUNKLHFCQUFBLEdBQXVCOzsyQkFDdkIsc0JBQUEsR0FBd0I7O0lBRVgsc0JBQUMsZUFBRDtNQUFDLElBQUMsQ0FBQSxrQkFBRDs7TUFDWixJQUFDLENBQUEsS0FBRCxDQUFBO0lBRFc7OzJCQUdiLEtBQUEsR0FBTyxTQUFBO01BQ0wsSUFBQyxDQUFBLEtBQUQsR0FBUyxJQUFJO01BQ2IsSUFBQyxDQUFBLFNBQUQsR0FBYTthQUNiLElBQUMsQ0FBQSxxQkFBRCxDQUFBO0lBSEs7OzJCQWlDUCxlQUFBLEdBQWlCLFNBQUMsZ0JBQUQsRUFBbUIsVUFBbkI7QUFDZixVQUFBO01BQUEsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFvQixDQUF2QjtBQUNFLGdCQUFPLE9BQU8sZ0JBQWQ7QUFBQSxlQUNPLFVBRFA7WUFFSSxRQUFBLEdBQVc7Y0FBQyxVQUFBLEVBQVksZ0JBQWI7Y0FBK0IsZ0JBQUEsRUFBa0IsY0FBakQ7O0FBRFI7QUFEUCxlQUdPLFFBSFA7WUFJSSxJQUFJLENBQUMsU0FBTCxDQUFlLHdIQUFmO1lBQ0EsUUFBQSxHQUFXO0FBRlI7QUFIUDtBQU9JLGtCQUFVLElBQUEsU0FBQSxDQUFVLGdEQUFWO0FBUGQsU0FERjtPQUFBLE1BQUE7UUFVRSxRQUFBLEdBQVc7VUFBQyxrQkFBQSxnQkFBRDtVQUFtQixZQUFBLFVBQW5CO1VBVmI7O01BWUEsSUFB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UyxJQUFDLENBQUEsZUFBZSxDQUFDLEtBQWpCLENBQUEsQ0FBZjtRQUFULE1BQUEsQ0FBQTtNQUFTO01BRVQsSUFBQyxDQUFBLHNCQUFELEdBQTBCO0FBQ2pCLGFBQU0sTUFBQSxHQUFTLElBQUMsQ0FBQSxlQUFlLENBQUMsS0FBakIsQ0FBQSxDQUFmO1FBQVQsTUFBQSxDQUFBO01BQVM7TUFDVCxJQUFDLENBQUEsc0JBQUQsR0FBMEI7QUFHakIsYUFBTSxNQUFBLEdBQVMsSUFBQyxDQUFBLGVBQWUsQ0FBQyxLQUFqQixDQUFBLENBQWY7UUFBVCxNQUFBLENBQUE7TUFBUzs4REFFVDtJQWZxQjs7Ozs7QUF6THpCIiwic291cmNlc0NvbnRlbnQiOlsiR3JpbSA9IHJlcXVpcmUgJ2dyaW0nXG57RGlzcG9zYWJsZX0gPSByZXF1aXJlICdldmVudC1raXQnXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuXG5BbnlDb25zdHJ1Y3RvciA9IFN5bWJvbCgnYW55LWNvbnN0cnVjdG9yJylcblxuIyBFc3NlbnRpYWw6IGBWaWV3UmVnaXN0cnlgIGhhbmRsZXMgdGhlIGFzc29jaWF0aW9uIGJldHdlZW4gbW9kZWwgYW5kIHZpZXdcbiMgdHlwZXMgaW4gQXRvbS4gV2UgY2FsbCB0aGlzIGFzc29jaWF0aW9uIGEgVmlldyBQcm92aWRlci4gQXMgaW4sIGZvciBhIGdpdmVuXG4jIG1vZGVsLCB0aGlzIGNsYXNzIGNhbiBwcm92aWRlIGEgdmlldyB2aWEgezo6Z2V0Vmlld30sIGFzIGxvbmcgYXMgdGhlXG4jIG1vZGVsL3ZpZXcgYXNzb2NpYXRpb24gd2FzIHJlZ2lzdGVyZWQgdmlhIHs6OmFkZFZpZXdQcm92aWRlcn1cbiNcbiMgSWYgeW91J3JlIGFkZGluZyB5b3VyIG93biBraW5kIG9mIHBhbmUgaXRlbSwgYSBnb29kIHN0cmF0ZWd5IGZvciBhbGwgYnV0IHRoZVxuIyBzaW1wbGVzdCBpdGVtcyBpcyB0byBzZXBhcmF0ZSB0aGUgbW9kZWwgYW5kIHRoZSB2aWV3LiBUaGUgbW9kZWwgaGFuZGxlc1xuIyBhcHBsaWNhdGlvbiBsb2dpYyBhbmQgaXMgdGhlIHByaW1hcnkgcG9pbnQgb2YgQVBJIGludGVyYWN0aW9uLiBUaGUgdmlld1xuIyBqdXN0IGhhbmRsZXMgcHJlc2VudGF0aW9uLlxuI1xuIyBOb3RlOiBNb2RlbHMgY2FuIGJlIGFueSBvYmplY3QsIGJ1dCBtdXN0IGltcGxlbWVudCBhIGBnZXRUaXRsZSgpYCBmdW5jdGlvblxuIyBpZiB0aGV5IGFyZSB0byBiZSBkaXNwbGF5ZWQgaW4gYSB7UGFuZX1cbiNcbiMgVmlldyBwcm92aWRlcnMgaW5mb3JtIHRoZSB3b3Jrc3BhY2UgaG93IHlvdXIgbW9kZWwgb2JqZWN0cyBzaG91bGQgYmVcbiMgcHJlc2VudGVkIGluIHRoZSBET00uIEEgdmlldyBwcm92aWRlciBtdXN0IGFsd2F5cyByZXR1cm4gYSBET00gbm9kZSwgd2hpY2hcbiMgbWFrZXMgW0hUTUwgNSBjdXN0b20gZWxlbWVudHNdKGh0dHA6Ly93d3cuaHRtbDVyb2Nrcy5jb20vZW4vdHV0b3JpYWxzL3dlYmNvbXBvbmVudHMvY3VzdG9tZWxlbWVudHMvKVxuIyBhbiBpZGVhbCB0b29sIGZvciBpbXBsZW1lbnRpbmcgdmlld3MgaW4gQXRvbS5cbiNcbiMgWW91IGNhbiBhY2Nlc3MgdGhlIGBWaWV3UmVnaXN0cnlgIG9iamVjdCB2aWEgYGF0b20udmlld3NgLlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVmlld1JlZ2lzdHJ5XG4gIGFuaW1hdGlvbkZyYW1lUmVxdWVzdDogbnVsbFxuICBkb2N1bWVudFJlYWRJblByb2dyZXNzOiBmYWxzZVxuXG4gIGNvbnN0cnVjdG9yOiAoQGF0b21FbnZpcm9ubWVudCkgLT5cbiAgICBAY2xlYXIoKVxuXG4gIGNsZWFyOiAtPlxuICAgIEB2aWV3cyA9IG5ldyBXZWFrTWFwXG4gICAgQHByb3ZpZGVycyA9IFtdXG4gICAgQGNsZWFyRG9jdW1lbnRSZXF1ZXN0cygpXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIHByb3ZpZGVyIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGNvbnN0cnVjdCB2aWV3cyBpbiB0aGVcbiAgIyB3b3Jrc3BhY2UncyB2aWV3IGxheWVyIGJhc2VkIG9uIG1vZGVsIG9iamVjdHMgaW4gaXRzIG1vZGVsIGxheWVyLlxuICAjXG4gICMgIyMgRXhhbXBsZXNcbiAgI1xuICAjIFRleHQgZWRpdG9ycyBhcmUgZGl2aWRlZCBpbnRvIGEgbW9kZWwgYW5kIGEgdmlldyBsYXllciwgc28gd2hlbiB5b3UgaW50ZXJhY3RcbiAgIyB3aXRoIG1ldGhvZHMgbGlrZSBgYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpYCB5b3UncmUgb25seSBnb2luZ1xuICAjIHRvIGdldCB0aGUgbW9kZWwgb2JqZWN0LiBXZSBkaXNwbGF5IHRleHQgZWRpdG9ycyBvbiBzY3JlZW4gYnkgdGVhY2hpbmcgdGhlXG4gICMgd29ya3NwYWNlIHdoYXQgdmlldyBjb25zdHJ1Y3RvciBpdCBzaG91bGQgdXNlIHRvIHJlcHJlc2VudCB0aGVtOlxuICAjXG4gICMgYGBgY29mZmVlXG4gICMgYXRvbS52aWV3cy5hZGRWaWV3UHJvdmlkZXIgVGV4dEVkaXRvciwgKHRleHRFZGl0b3IpIC0+XG4gICMgICB0ZXh0RWRpdG9yRWxlbWVudCA9IG5ldyBUZXh0RWRpdG9yRWxlbWVudFxuICAjICAgdGV4dEVkaXRvckVsZW1lbnQuaW5pdGlhbGl6ZSh0ZXh0RWRpdG9yKVxuICAjICAgdGV4dEVkaXRvckVsZW1lbnRcbiAgIyBgYGBcbiAgI1xuICAjICogYG1vZGVsQ29uc3RydWN0b3JgIChvcHRpb25hbCkgQ29uc3RydWN0b3Ige0Z1bmN0aW9ufSBmb3IgeW91ciBtb2RlbC4gSWZcbiAgIyAgIGEgY29uc3RydWN0b3IgaXMgZ2l2ZW4sIHRoZSBgY3JlYXRlVmlld2AgZnVuY3Rpb24gd2lsbCBvbmx5IGJlIHVzZWRcbiAgIyAgIGZvciBtb2RlbCBvYmplY3RzIGluaGVyaXRpbmcgZnJvbSB0aGF0IGNvbnN0cnVjdG9yLiBPdGhlcndpc2UsIGl0IHdpbGxcbiAgIyAgIHdpbGwgYmUgY2FsbGVkIGZvciBhbnkgb2JqZWN0LlxuICAjICogYGNyZWF0ZVZpZXdgIEZhY3Rvcnkge0Z1bmN0aW9ufSB0aGF0IGlzIHBhc3NlZCBhbiBpbnN0YW5jZSBvZiB5b3VyIG1vZGVsXG4gICMgICBhbmQgbXVzdCByZXR1cm4gYSBzdWJjbGFzcyBvZiBgSFRNTEVsZW1lbnRgIG9yIGB1bmRlZmluZWRgLiBJZiBpdCByZXR1cm5zXG4gICMgICBgdW5kZWZpbmVkYCwgdGhlbiB0aGUgcmVnaXN0cnkgd2lsbCBjb250aW51ZSB0byBzZWFyY2ggZm9yIG90aGVyIHZpZXdcbiAgIyAgIHByb3ZpZGVycy5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gcmVtb3ZlIHRoZVxuICAjIGFkZGVkIHByb3ZpZGVyLlxuICBhZGRWaWV3UHJvdmlkZXI6IChtb2RlbENvbnN0cnVjdG9yLCBjcmVhdGVWaWV3KSAtPlxuICAgIGlmIGFyZ3VtZW50cy5sZW5ndGggaXMgMVxuICAgICAgc3dpdGNoIHR5cGVvZiBtb2RlbENvbnN0cnVjdG9yXG4gICAgICAgIHdoZW4gJ2Z1bmN0aW9uJ1xuICAgICAgICAgIHByb3ZpZGVyID0ge2NyZWF0ZVZpZXc6IG1vZGVsQ29uc3RydWN0b3IsIG1vZGVsQ29uc3RydWN0b3I6IEFueUNvbnN0cnVjdG9yfVxuICAgICAgICB3aGVuICdvYmplY3QnXG4gICAgICAgICAgR3JpbS5kZXByZWNhdGUoXCJhdG9tLnZpZXdzLmFkZFZpZXdQcm92aWRlciBub3cgdGFrZXMgMiBhcmd1bWVudHM6IGEgbW9kZWwgY29uc3RydWN0b3IgYW5kIGEgY3JlYXRlVmlldyBmdW5jdGlvbi4gU2VlIGRvY3MgZm9yIGRldGFpbHMuXCIpXG4gICAgICAgICAgcHJvdmlkZXIgPSBtb2RlbENvbnN0cnVjdG9yXG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQXJndW1lbnRzIHRvIGFkZFZpZXdQcm92aWRlciBtdXN0IGJlIGZ1bmN0aW9uc1wiKVxuICAgIGVsc2VcbiAgICAgIHByb3ZpZGVyID0ge21vZGVsQ29uc3RydWN0b3IsIGNyZWF0ZVZpZXd9XG5cbiAgICBAcHJvdmlkZXJzLnB1c2gocHJvdmlkZXIpXG4gICAgbmV3IERpc3Bvc2FibGUgPT5cbiAgICAgIEBwcm92aWRlcnMgPSBAcHJvdmlkZXJzLmZpbHRlciAocCkgLT4gcCBpc250IHByb3ZpZGVyXG5cbiAgZ2V0Vmlld1Byb3ZpZGVyQ291bnQ6IC0+XG4gICAgQHByb3ZpZGVycy5sZW5ndGhcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSB2aWV3IGFzc29jaWF0ZWQgd2l0aCBhbiBvYmplY3QgaW4gdGhlIHdvcmtzcGFjZS5cbiAgI1xuICAjIElmIHlvdSdyZSBqdXN0ICp1c2luZyogdGhlIHdvcmtzcGFjZSwgeW91IHNob3VsZG4ndCBuZWVkIHRvIGFjY2VzcyB0aGUgdmlld1xuICAjIGxheWVyLCBidXQgdmlldyBsYXllciBhY2Nlc3MgbWF5IGJlIG5lY2Vzc2FyeSBpZiB5b3Ugd2FudCB0byBwZXJmb3JtIERPTVxuICAjIG1hbmlwdWxhdGlvbiB0aGF0IGlzbid0IHN1cHBvcnRlZCB2aWEgdGhlIG1vZGVsIEFQSS5cbiAgI1xuICAjICMjIFZpZXcgUmVzb2x1dGlvbiBBbGdvcml0aG1cbiAgI1xuICAjIFRoZSB2aWV3IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0IGlzIHJlc29sdmVkIHVzaW5nIHRoZSBmb2xsb3dpbmdcbiAgIyBzZXF1ZW5jZVxuICAjXG4gICMgIDEuIElzIHRoZSBvYmplY3QgYW4gaW5zdGFuY2Ugb2YgYEhUTUxFbGVtZW50YD8gSWYgdHJ1ZSwgcmV0dXJuIHRoZSBvYmplY3QuXG4gICMgIDIuIERvZXMgdGhlIG9iamVjdCBoYXZlIGEgbWV0aG9kIG5hbWVkIGBnZXRFbGVtZW50YCB0aGF0IHJldHVybnMgYW5cbiAgIyAgICAgaW5zdGFuY2Ugb2YgYEhUTUxFbGVtZW50YD8gSWYgdHJ1ZSwgcmV0dXJuIHRoYXQgdmFsdWUuXG4gICMgIDMuIERvZXMgdGhlIG9iamVjdCBoYXZlIGEgcHJvcGVydHkgbmFtZWQgYGVsZW1lbnRgIHdpdGggYSB2YWx1ZSB3aGljaCBpc1xuICAjICAgICBhbiBpbnN0YW5jZSBvZiBgSFRNTEVsZW1lbnRgPyBJZiB0cnVlLCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlLlxuICAjICA0LiBJcyB0aGUgb2JqZWN0IGEgalF1ZXJ5IG9iamVjdCwgaW5kaWNhdGVkIGJ5IHRoZSBwcmVzZW5jZSBvZiBhIGBqcXVlcnlgXG4gICMgICAgIHByb3BlcnR5PyBJZiB0cnVlLCByZXR1cm4gdGhlIHJvb3QgRE9NIGVsZW1lbnQgKGkuZS4gYG9iamVjdFswXWApLlxuICAjICA1LiBIYXMgYSB2aWV3IHByb3ZpZGVyIGJlZW4gcmVnaXN0ZXJlZCBmb3IgdGhlIG9iamVjdD8gSWYgdHJ1ZSwgdXNlIHRoZVxuICAjICAgICBwcm92aWRlciB0byBjcmVhdGUgYSB2aWV3IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LCBhbmQgcmV0dXJuIHRoZVxuICAjICAgICB2aWV3LlxuICAjXG4gICMgSWYgbm8gYXNzb2NpYXRlZCB2aWV3IGlzIHJldHVybmVkIGJ5IHRoZSBzZXF1ZW5jZSBhbiBlcnJvciBpcyB0aHJvd24uXG4gICNcbiAgIyBSZXR1cm5zIGEgRE9NIGVsZW1lbnQuXG4gIGdldFZpZXc6IChvYmplY3QpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBvYmplY3Q/XG5cbiAgICBpZiB2aWV3ID0gQHZpZXdzLmdldChvYmplY3QpXG4gICAgICB2aWV3XG4gICAgZWxzZVxuICAgICAgdmlldyA9IEBjcmVhdGVWaWV3KG9iamVjdClcbiAgICAgIEB2aWV3cy5zZXQob2JqZWN0LCB2aWV3KVxuICAgICAgdmlld1xuXG4gIGNyZWF0ZVZpZXc6IChvYmplY3QpIC0+XG4gICAgaWYgb2JqZWN0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcbiAgICAgIHJldHVybiBvYmplY3RcblxuICAgIGlmIHR5cGVvZiBvYmplY3Q/LmdldEVsZW1lbnQgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgZWxlbWVudCA9IG9iamVjdC5nZXRFbGVtZW50KClcbiAgICAgIGlmIGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudFxuICAgICAgICByZXR1cm4gZWxlbWVudFxuXG4gICAgaWYgb2JqZWN0Py5lbGVtZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcbiAgICAgIHJldHVybiBvYmplY3QuZWxlbWVudFxuXG4gICAgaWYgb2JqZWN0Py5qcXVlcnlcbiAgICAgIHJldHVybiBvYmplY3RbMF1cblxuICAgIGZvciBwcm92aWRlciBpbiBAcHJvdmlkZXJzXG4gICAgICBpZiBwcm92aWRlci5tb2RlbENvbnN0cnVjdG9yIGlzIEFueUNvbnN0cnVjdG9yXG4gICAgICAgIGlmIGVsZW1lbnQgPSBwcm92aWRlci5jcmVhdGVWaWV3KG9iamVjdCwgQGF0b21FbnZpcm9ubWVudClcbiAgICAgICAgICByZXR1cm4gZWxlbWVudFxuICAgICAgICBjb250aW51ZVxuXG4gICAgICBpZiBvYmplY3QgaW5zdGFuY2VvZiBwcm92aWRlci5tb2RlbENvbnN0cnVjdG9yXG4gICAgICAgIGlmIGVsZW1lbnQgPSBwcm92aWRlci5jcmVhdGVWaWV3PyhvYmplY3QsIEBhdG9tRW52aXJvbm1lbnQpXG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnRcblxuICAgICAgICBpZiB2aWV3Q29uc3RydWN0b3IgPSBwcm92aWRlci52aWV3Q29uc3RydWN0b3JcbiAgICAgICAgICBlbGVtZW50ID0gbmV3IHZpZXdDb25zdHJ1Y3RvclxuICAgICAgICAgIGVsZW1lbnQuaW5pdGlhbGl6ZT8ob2JqZWN0KSA/IGVsZW1lbnQuc2V0TW9kZWw/KG9iamVjdClcbiAgICAgICAgICByZXR1cm4gZWxlbWVudFxuXG4gICAgaWYgdmlld0NvbnN0cnVjdG9yID0gb2JqZWN0Py5nZXRWaWV3Q2xhc3M/KClcbiAgICAgIHZpZXcgPSBuZXcgdmlld0NvbnN0cnVjdG9yKG9iamVjdClcbiAgICAgIHJldHVybiB2aWV3WzBdXG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjcmVhdGUgYSB2aWV3IGZvciAje29iamVjdC5jb25zdHJ1Y3Rvci5uYW1lfSBpbnN0YW5jZS4gUGxlYXNlIHJlZ2lzdGVyIGEgdmlldyBwcm92aWRlci5cIilcblxuICB1cGRhdGVEb2N1bWVudDogKGZuKSAtPlxuICAgIEBkb2N1bWVudFdyaXRlcnMucHVzaChmbilcbiAgICBAcmVxdWVzdERvY3VtZW50VXBkYXRlKCkgdW5sZXNzIEBkb2N1bWVudFJlYWRJblByb2dyZXNzXG4gICAgbmV3IERpc3Bvc2FibGUgPT5cbiAgICAgIEBkb2N1bWVudFdyaXRlcnMgPSBAZG9jdW1lbnRXcml0ZXJzLmZpbHRlciAod3JpdGVyKSAtPiB3cml0ZXIgaXNudCBmblxuXG4gIHJlYWREb2N1bWVudDogKGZuKSAtPlxuICAgIEBkb2N1bWVudFJlYWRlcnMucHVzaChmbilcbiAgICBAcmVxdWVzdERvY3VtZW50VXBkYXRlKClcbiAgICBuZXcgRGlzcG9zYWJsZSA9PlxuICAgICAgQGRvY3VtZW50UmVhZGVycyA9IEBkb2N1bWVudFJlYWRlcnMuZmlsdGVyIChyZWFkZXIpIC0+IHJlYWRlciBpc250IGZuXG5cbiAgZ2V0TmV4dFVwZGF0ZVByb21pc2U6IC0+XG4gICAgQG5leHRVcGRhdGVQcm9taXNlID89IG5ldyBQcm9taXNlIChyZXNvbHZlKSA9PlxuICAgICAgQHJlc29sdmVOZXh0VXBkYXRlUHJvbWlzZSA9IHJlc29sdmVcblxuICBjbGVhckRvY3VtZW50UmVxdWVzdHM6IC0+XG4gICAgQGRvY3VtZW50UmVhZGVycyA9IFtdXG4gICAgQGRvY3VtZW50V3JpdGVycyA9IFtdXG4gICAgQG5leHRVcGRhdGVQcm9taXNlID0gbnVsbFxuICAgIEByZXNvbHZlTmV4dFVwZGF0ZVByb21pc2UgPSBudWxsXG4gICAgaWYgQGFuaW1hdGlvbkZyYW1lUmVxdWVzdD9cbiAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKEBhbmltYXRpb25GcmFtZVJlcXVlc3QpXG4gICAgICBAYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gbnVsbFxuXG4gIHJlcXVlc3REb2N1bWVudFVwZGF0ZTogLT5cbiAgICBAYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID89IHJlcXVlc3RBbmltYXRpb25GcmFtZShAcGVyZm9ybURvY3VtZW50VXBkYXRlKVxuXG4gIHBlcmZvcm1Eb2N1bWVudFVwZGF0ZTogPT5cbiAgICByZXNvbHZlTmV4dFVwZGF0ZVByb21pc2UgPSBAcmVzb2x2ZU5leHRVcGRhdGVQcm9taXNlXG4gICAgQGFuaW1hdGlvbkZyYW1lUmVxdWVzdCA9IG51bGxcbiAgICBAbmV4dFVwZGF0ZVByb21pc2UgPSBudWxsXG4gICAgQHJlc29sdmVOZXh0VXBkYXRlUHJvbWlzZSA9IG51bGxcblxuICAgIHdyaXRlcigpIHdoaWxlIHdyaXRlciA9IEBkb2N1bWVudFdyaXRlcnMuc2hpZnQoKVxuXG4gICAgQGRvY3VtZW50UmVhZEluUHJvZ3Jlc3MgPSB0cnVlXG4gICAgcmVhZGVyKCkgd2hpbGUgcmVhZGVyID0gQGRvY3VtZW50UmVhZGVycy5zaGlmdCgpXG4gICAgQGRvY3VtZW50UmVhZEluUHJvZ3Jlc3MgPSBmYWxzZVxuXG4gICAgIyBwcm9jZXNzIHVwZGF0ZXMgcmVxdWVzdGVkIGFzIGEgcmVzdWx0IG9mIHJlYWRzXG4gICAgd3JpdGVyKCkgd2hpbGUgd3JpdGVyID0gQGRvY3VtZW50V3JpdGVycy5zaGlmdCgpXG5cbiAgICByZXNvbHZlTmV4dFVwZGF0ZVByb21pc2U/KClcbiJdfQ==
