(function() {
  var Emitter, Gutter, GutterContainer;

  Emitter = require('event-kit').Emitter;

  Gutter = require('./gutter');

  module.exports = GutterContainer = (function() {
    function GutterContainer(textEditor) {
      this.gutters = [];
      this.textEditor = textEditor;
      this.emitter = new Emitter;
    }

    GutterContainer.prototype.scheduleComponentUpdate = function() {
      return this.textEditor.scheduleComponentUpdate();
    };

    GutterContainer.prototype.destroy = function() {
      var gutter, guttersToDestroy, j, len;
      guttersToDestroy = this.gutters.slice(0);
      for (j = 0, len = guttersToDestroy.length; j < len; j++) {
        gutter = guttersToDestroy[j];
        if (gutter.name !== 'line-number') {
          gutter.destroy();
        }
      }
      this.gutters = [];
      return this.emitter.dispose();
    };

    GutterContainer.prototype.addGutter = function(options) {
      var gutterName, i, inserted, j, newGutter, ref;
      options = options != null ? options : {};
      gutterName = options.name;
      if (gutterName === null) {
        throw new Error('A name is required to create a gutter.');
      }
      if (this.gutterWithName(gutterName)) {
        throw new Error('Tried to create a gutter with a name that is already in use.');
      }
      newGutter = new Gutter(this, options);
      inserted = false;
      for (i = j = 0, ref = this.gutters.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        if (this.gutters[i].priority >= newGutter.priority) {
          this.gutters.splice(i, 0, newGutter);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.gutters.push(newGutter);
      }
      this.scheduleComponentUpdate();
      this.emitter.emit('did-add-gutter', newGutter);
      return newGutter;
    };

    GutterContainer.prototype.getGutters = function() {
      return this.gutters.slice();
    };

    GutterContainer.prototype.gutterWithName = function(name) {
      var gutter, j, len, ref;
      ref = this.gutters;
      for (j = 0, len = ref.length; j < len; j++) {
        gutter = ref[j];
        if (gutter.name === name) {
          return gutter;
        }
      }
      return null;
    };

    GutterContainer.prototype.observeGutters = function(callback) {
      var gutter, j, len, ref;
      ref = this.getGutters();
      for (j = 0, len = ref.length; j < len; j++) {
        gutter = ref[j];
        callback(gutter);
      }
      return this.onDidAddGutter(callback);
    };

    GutterContainer.prototype.onDidAddGutter = function(callback) {
      return this.emitter.on('did-add-gutter', callback);
    };

    GutterContainer.prototype.onDidRemoveGutter = function(callback) {
      return this.emitter.on('did-remove-gutter', callback);
    };


    /*
    Section: Private Methods
     */

    GutterContainer.prototype.removeGutter = function(gutter) {
      var index;
      index = this.gutters.indexOf(gutter);
      if (index > -1) {
        this.gutters.splice(index, 1);
        this.scheduleComponentUpdate();
        return this.emitter.emit('did-remove-gutter', gutter.name);
      } else {
        throw new Error('The given gutter cannot be removed because it is not ' + 'within this GutterContainer.');
      }
    };

    GutterContainer.prototype.addGutterDecoration = function(gutter, marker, options) {
      if (gutter.name === 'line-number') {
        options.type = 'line-number';
      } else {
        options.type = 'gutter';
      }
      options.gutterName = gutter.name;
      return this.textEditor.decorateMarker(marker, options);
    };

    return GutterContainer;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2d1dHRlci1jb250YWluZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxVQUFXLE9BQUEsQ0FBUSxXQUFSOztFQUNaLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUjs7RUFFVCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MseUJBQUMsVUFBRDtNQUNYLElBQUMsQ0FBQSxPQUFELEdBQVc7TUFDWCxJQUFDLENBQUEsVUFBRCxHQUFjO01BQ2QsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO0lBSEo7OzhCQUtiLHVCQUFBLEdBQXlCLFNBQUE7YUFDdkIsSUFBQyxDQUFBLFVBQVUsQ0FBQyx1QkFBWixDQUFBO0lBRHVCOzs4QkFHekIsT0FBQSxHQUFTLFNBQUE7QUFHUCxVQUFBO01BQUEsZ0JBQUEsR0FBbUIsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFULENBQWUsQ0FBZjtBQUNuQixXQUFBLGtEQUFBOztRQUNFLElBQW9CLE1BQU0sQ0FBQyxJQUFQLEtBQWlCLGFBQXJDO1VBQUEsTUFBTSxDQUFDLE9BQVAsQ0FBQSxFQUFBOztBQURGO01BRUEsSUFBQyxDQUFBLE9BQUQsR0FBVzthQUNYLElBQUMsQ0FBQSxPQUFPLENBQUMsT0FBVCxDQUFBO0lBUE87OzhCQVNULFNBQUEsR0FBVyxTQUFDLE9BQUQ7QUFDVCxVQUFBO01BQUEsT0FBQSxxQkFBVSxVQUFVO01BQ3BCLFVBQUEsR0FBYSxPQUFPLENBQUM7TUFDckIsSUFBRyxVQUFBLEtBQWMsSUFBakI7QUFDRSxjQUFVLElBQUEsS0FBQSxDQUFNLHdDQUFOLEVBRFo7O01BRUEsSUFBRyxJQUFDLENBQUEsY0FBRCxDQUFnQixVQUFoQixDQUFIO0FBQ0UsY0FBVSxJQUFBLEtBQUEsQ0FBTSw4REFBTixFQURaOztNQUVBLFNBQUEsR0FBZ0IsSUFBQSxNQUFBLENBQU8sSUFBUCxFQUFhLE9BQWI7TUFFaEIsUUFBQSxHQUFXO0FBR1gsV0FBUyw0RkFBVDtRQUNFLElBQUcsSUFBQyxDQUFBLE9BQVEsQ0FBQSxDQUFBLENBQUUsQ0FBQyxRQUFaLElBQXdCLFNBQVMsQ0FBQyxRQUFyQztVQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsTUFBVCxDQUFnQixDQUFoQixFQUFtQixDQUFuQixFQUFzQixTQUF0QjtVQUNBLFFBQUEsR0FBVztBQUNYLGdCQUhGOztBQURGO01BS0EsSUFBRyxDQUFJLFFBQVA7UUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxTQUFkLEVBREY7O01BRUEsSUFBQyxDQUFBLHVCQUFELENBQUE7TUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxnQkFBZCxFQUFnQyxTQUFoQztBQUNBLGFBQU87SUFyQkU7OzhCQXVCWCxVQUFBLEdBQVksU0FBQTthQUNWLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBVCxDQUFBO0lBRFU7OzhCQUdaLGNBQUEsR0FBZ0IsU0FBQyxJQUFEO0FBQ2QsVUFBQTtBQUFBO0FBQUEsV0FBQSxxQ0FBQTs7UUFDRSxJQUFHLE1BQU0sQ0FBQyxJQUFQLEtBQWUsSUFBbEI7QUFBNEIsaUJBQU8sT0FBbkM7O0FBREY7YUFFQTtJQUhjOzs4QkFLaEIsY0FBQSxHQUFnQixTQUFDLFFBQUQ7QUFDZCxVQUFBO0FBQUE7QUFBQSxXQUFBLHFDQUFBOztRQUFBLFFBQUEsQ0FBUyxNQUFUO0FBQUE7YUFDQSxJQUFDLENBQUEsY0FBRCxDQUFnQixRQUFoQjtJQUZjOzs4QkFJaEIsY0FBQSxHQUFnQixTQUFDLFFBQUQ7YUFDZCxJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSxnQkFBWixFQUE4QixRQUE5QjtJQURjOzs4QkFHaEIsaUJBQUEsR0FBbUIsU0FBQyxRQUFEO2FBQ2pCLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLG1CQUFaLEVBQWlDLFFBQWpDO0lBRGlCOzs7QUFHbkI7Ozs7OEJBTUEsWUFBQSxHQUFjLFNBQUMsTUFBRDtBQUNaLFVBQUE7TUFBQSxLQUFBLEdBQVEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxPQUFULENBQWlCLE1BQWpCO01BQ1IsSUFBRyxLQUFBLEdBQVEsQ0FBQyxDQUFaO1FBQ0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxNQUFULENBQWdCLEtBQWhCLEVBQXVCLENBQXZCO1FBQ0EsSUFBQyxDQUFBLHVCQUFELENBQUE7ZUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxtQkFBZCxFQUFtQyxNQUFNLENBQUMsSUFBMUMsRUFIRjtPQUFBLE1BQUE7QUFLRSxjQUFVLElBQUEsS0FBQSxDQUFNLHVEQUFBLEdBQ1osOEJBRE0sRUFMWjs7SUFGWTs7OEJBV2QsbUJBQUEsR0FBcUIsU0FBQyxNQUFELEVBQVMsTUFBVCxFQUFpQixPQUFqQjtNQUNuQixJQUFHLE1BQU0sQ0FBQyxJQUFQLEtBQWUsYUFBbEI7UUFDRSxPQUFPLENBQUMsSUFBUixHQUFlLGNBRGpCO09BQUEsTUFBQTtRQUdFLE9BQU8sQ0FBQyxJQUFSLEdBQWUsU0FIakI7O01BSUEsT0FBTyxDQUFDLFVBQVIsR0FBcUIsTUFBTSxDQUFDO2FBQzVCLElBQUMsQ0FBQSxVQUFVLENBQUMsY0FBWixDQUEyQixNQUEzQixFQUFtQyxPQUFuQztJQU5tQjs7Ozs7QUFoRnZCIiwic291cmNlc0NvbnRlbnQiOlsie0VtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuR3V0dGVyID0gcmVxdWlyZSAnLi9ndXR0ZXInXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEd1dHRlckNvbnRhaW5lclxuICBjb25zdHJ1Y3RvcjogKHRleHRFZGl0b3IpIC0+XG4gICAgQGd1dHRlcnMgPSBbXVxuICAgIEB0ZXh0RWRpdG9yID0gdGV4dEVkaXRvclxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcblxuICBzY2hlZHVsZUNvbXBvbmVudFVwZGF0ZTogLT5cbiAgICBAdGV4dEVkaXRvci5zY2hlZHVsZUNvbXBvbmVudFVwZGF0ZSgpXG5cbiAgZGVzdHJveTogLT5cbiAgICAjIENyZWF0ZSBhIGNvcHksIGJlY2F1c2UgYEd1dHRlcjo6ZGVzdHJveWAgcmVtb3ZlcyB0aGUgZ3V0dGVyIGZyb21cbiAgICAjIEd1dHRlckNvbnRhaW5lcidzIEBndXR0ZXJzLlxuICAgIGd1dHRlcnNUb0Rlc3Ryb3kgPSBAZ3V0dGVycy5zbGljZSgwKVxuICAgIGZvciBndXR0ZXIgaW4gZ3V0dGVyc1RvRGVzdHJveVxuICAgICAgZ3V0dGVyLmRlc3Ryb3koKSBpZiBndXR0ZXIubmFtZSBpc250ICdsaW5lLW51bWJlcidcbiAgICBAZ3V0dGVycyA9IFtdXG4gICAgQGVtaXR0ZXIuZGlzcG9zZSgpXG5cbiAgYWRkR3V0dGVyOiAob3B0aW9ucykgLT5cbiAgICBvcHRpb25zID0gb3B0aW9ucyA/IHt9XG4gICAgZ3V0dGVyTmFtZSA9IG9wdGlvbnMubmFtZVxuICAgIGlmIGd1dHRlck5hbWUgaXMgbnVsbFxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBIG5hbWUgaXMgcmVxdWlyZWQgdG8gY3JlYXRlIGEgZ3V0dGVyLicpXG4gICAgaWYgQGd1dHRlcldpdGhOYW1lKGd1dHRlck5hbWUpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyaWVkIHRvIGNyZWF0ZSBhIGd1dHRlciB3aXRoIGEgbmFtZSB0aGF0IGlzIGFscmVhZHkgaW4gdXNlLicpXG4gICAgbmV3R3V0dGVyID0gbmV3IEd1dHRlcih0aGlzLCBvcHRpb25zKVxuXG4gICAgaW5zZXJ0ZWQgPSBmYWxzZVxuICAgICMgSW5zZXJ0IHRoZSBndXR0ZXIgaW50byB0aGUgZ3V0dGVycyBhcnJheSwgc29ydGVkIGluIGFzY2VuZGluZyBvcmRlciBieSAncHJpb3JpdHknLlxuICAgICMgVGhpcyBjb3VsZCBiZSBvcHRpbWl6ZWQsIGJ1dCB0aGVyZSBhcmUgdW5saWtlbHkgdG8gYmUgbWFueSBndXR0ZXJzLlxuICAgIGZvciBpIGluIFswLi4uQGd1dHRlcnMubGVuZ3RoXVxuICAgICAgaWYgQGd1dHRlcnNbaV0ucHJpb3JpdHkgPj0gbmV3R3V0dGVyLnByaW9yaXR5XG4gICAgICAgIEBndXR0ZXJzLnNwbGljZShpLCAwLCBuZXdHdXR0ZXIpXG4gICAgICAgIGluc2VydGVkID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgIGlmIG5vdCBpbnNlcnRlZFxuICAgICAgQGd1dHRlcnMucHVzaCBuZXdHdXR0ZXJcbiAgICBAc2NoZWR1bGVDb21wb25lbnRVcGRhdGUoKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1hZGQtZ3V0dGVyJywgbmV3R3V0dGVyXG4gICAgcmV0dXJuIG5ld0d1dHRlclxuXG4gIGdldEd1dHRlcnM6IC0+XG4gICAgQGd1dHRlcnMuc2xpY2UoKVxuXG4gIGd1dHRlcldpdGhOYW1lOiAobmFtZSkgLT5cbiAgICBmb3IgZ3V0dGVyIGluIEBndXR0ZXJzXG4gICAgICBpZiBndXR0ZXIubmFtZSBpcyBuYW1lIHRoZW4gcmV0dXJuIGd1dHRlclxuICAgIG51bGxcblxuICBvYnNlcnZlR3V0dGVyczogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKGd1dHRlcikgZm9yIGd1dHRlciBpbiBAZ2V0R3V0dGVycygpXG4gICAgQG9uRGlkQWRkR3V0dGVyIGNhbGxiYWNrXG5cbiAgb25EaWRBZGRHdXR0ZXI6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1ndXR0ZXInLCBjYWxsYmFja1xuXG4gIG9uRGlkUmVtb3ZlR3V0dGVyOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1yZW1vdmUtZ3V0dGVyJywgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZSBNZXRob2RzXG4gICMjI1xuXG4gICMgUHJvY2Vzc2VzIHRoZSBkZXN0cnVjdGlvbiBvZiB0aGUgZ3V0dGVyLiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhpcyBndXR0ZXIgaXNcbiAgIyBub3Qgd2l0aGluIHRoaXMgZ3V0dGVyQ29udGFpbmVyLlxuICByZW1vdmVHdXR0ZXI6IChndXR0ZXIpIC0+XG4gICAgaW5kZXggPSBAZ3V0dGVycy5pbmRleE9mKGd1dHRlcilcbiAgICBpZiBpbmRleCA+IC0xXG4gICAgICBAZ3V0dGVycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICBAc2NoZWR1bGVDb21wb25lbnRVcGRhdGUoKVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXJlbW92ZS1ndXR0ZXInLCBndXR0ZXIubmFtZVxuICAgIGVsc2VcbiAgICAgIHRocm93IG5ldyBFcnJvciAnVGhlIGdpdmVuIGd1dHRlciBjYW5ub3QgYmUgcmVtb3ZlZCBiZWNhdXNlIGl0IGlzIG5vdCAnICtcbiAgICAgICAgICAnd2l0aGluIHRoaXMgR3V0dGVyQ29udGFpbmVyLidcblxuICAjIFRoZSBwdWJsaWMgaW50ZXJmYWNlIGlzIEd1dHRlcjo6ZGVjb3JhdGVNYXJrZXIgb3IgVGV4dEVkaXRvcjo6ZGVjb3JhdGVNYXJrZXIuXG4gIGFkZEd1dHRlckRlY29yYXRpb246IChndXR0ZXIsIG1hcmtlciwgb3B0aW9ucykgLT5cbiAgICBpZiBndXR0ZXIubmFtZSBpcyAnbGluZS1udW1iZXInXG4gICAgICBvcHRpb25zLnR5cGUgPSAnbGluZS1udW1iZXInXG4gICAgZWxzZVxuICAgICAgb3B0aW9ucy50eXBlID0gJ2d1dHRlcidcbiAgICBvcHRpb25zLmd1dHRlck5hbWUgPSBndXR0ZXIubmFtZVxuICAgIEB0ZXh0RWRpdG9yLmRlY29yYXRlTWFya2VyKG1hcmtlciwgb3B0aW9ucylcbiJdfQ==
