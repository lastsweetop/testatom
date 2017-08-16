(function() {
  var ElementResizeDetector, OverlayManager, elementResizeDetector;

  ElementResizeDetector = require('element-resize-detector');

  elementResizeDetector = null;

  module.exports = OverlayManager = (function() {
    function OverlayManager(presenter, container, views) {
      this.presenter = presenter;
      this.container = container;
      this.views = views;
      this.overlaysById = {};
    }

    OverlayManager.prototype.render = function(state) {
      var decorationId, id, overlay, overlayNode, ref, ref1, results;
      ref = state.content.overlays;
      for (decorationId in ref) {
        overlay = ref[decorationId];
        if (this.shouldUpdateOverlay(decorationId, overlay)) {
          this.renderOverlay(state, decorationId, overlay);
        }
      }
      ref1 = this.overlaysById;
      results = [];
      for (id in ref1) {
        overlayNode = ref1[id].overlayNode;
        if (!state.content.overlays.hasOwnProperty(id)) {
          delete this.overlaysById[id];
          overlayNode.remove();
          results.push(elementResizeDetector.uninstall(overlayNode));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    OverlayManager.prototype.shouldUpdateOverlay = function(decorationId, overlay) {
      var cachedOverlay, ref, ref1, ref2, ref3;
      cachedOverlay = this.overlaysById[decorationId];
      if (cachedOverlay == null) {
        return true;
      }
      return ((ref = cachedOverlay.pixelPosition) != null ? ref.top : void 0) !== ((ref1 = overlay.pixelPosition) != null ? ref1.top : void 0) || ((ref2 = cachedOverlay.pixelPosition) != null ? ref2.left : void 0) !== ((ref3 = overlay.pixelPosition) != null ? ref3.left : void 0);
    };

    OverlayManager.prototype.measureOverlay = function(decorationId, itemView) {
      var contentMargin, ref;
      contentMargin = (ref = parseInt(getComputedStyle(itemView)['margin-left'])) != null ? ref : 0;
      return this.presenter.setOverlayDimensions(decorationId, itemView.offsetWidth, itemView.offsetHeight, contentMargin);
    };

    OverlayManager.prototype.renderOverlay = function(state, decorationId, arg) {
      var cachedOverlay, item, itemView, klass, overlayNode, pixelPosition;
      item = arg.item, pixelPosition = arg.pixelPosition, klass = arg["class"];
      itemView = this.views.getView(item);
      cachedOverlay = this.overlaysById[decorationId];
      if (!(overlayNode = cachedOverlay != null ? cachedOverlay.overlayNode : void 0)) {
        overlayNode = document.createElement('atom-overlay');
        if (klass != null) {
          overlayNode.classList.add(klass);
        }
        if (elementResizeDetector == null) {
          elementResizeDetector = ElementResizeDetector({
            strategy: 'scroll'
          });
        }
        elementResizeDetector.listenTo(overlayNode, (function(_this) {
          return function() {
            if (overlayNode.parentElement != null) {
              return _this.measureOverlay(decorationId, itemView);
            }
          };
        })(this));
        this.container.appendChild(overlayNode);
        this.overlaysById[decorationId] = cachedOverlay = {
          overlayNode: overlayNode,
          itemView: itemView
        };
      }
      if (!overlayNode.contains(itemView)) {
        overlayNode.appendChild(itemView);
      }
      cachedOverlay.pixelPosition = pixelPosition;
      overlayNode.style.top = pixelPosition.top + 'px';
      overlayNode.style.left = pixelPosition.left + 'px';
      return this.measureOverlay(decorationId, itemView);
    };

    return OverlayManager;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL292ZXJsYXktbWFuYWdlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLHFCQUFBLEdBQXdCLE9BQUEsQ0FBUSx5QkFBUjs7RUFDeEIscUJBQUEsR0FBd0I7O0VBRXhCLE1BQU0sQ0FBQyxPQUFQLEdBQ007SUFDUyx3QkFBQyxTQUFELEVBQWEsU0FBYixFQUF5QixLQUF6QjtNQUFDLElBQUMsQ0FBQSxZQUFEO01BQVksSUFBQyxDQUFBLFlBQUQ7TUFBWSxJQUFDLENBQUEsUUFBRDtNQUNwQyxJQUFDLENBQUEsWUFBRCxHQUFnQjtJQURMOzs2QkFHYixNQUFBLEdBQVEsU0FBQyxLQUFEO0FBQ04sVUFBQTtBQUFBO0FBQUEsV0FBQSxtQkFBQTs7UUFDRSxJQUFHLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixZQUFyQixFQUFtQyxPQUFuQyxDQUFIO1VBQ0UsSUFBQyxDQUFBLGFBQUQsQ0FBZSxLQUFmLEVBQXNCLFlBQXRCLEVBQW9DLE9BQXBDLEVBREY7O0FBREY7QUFJQTtBQUFBO1dBQUEsVUFBQTtRQUFTO1FBQ1AsSUFBQSxDQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQXZCLENBQXNDLEVBQXRDLENBQVA7VUFDRSxPQUFPLElBQUMsQ0FBQSxZQUFhLENBQUEsRUFBQTtVQUNyQixXQUFXLENBQUMsTUFBWixDQUFBO3VCQUNBLHFCQUFxQixDQUFDLFNBQXRCLENBQWdDLFdBQWhDLEdBSEY7U0FBQSxNQUFBOytCQUFBOztBQURGOztJQUxNOzs2QkFXUixtQkFBQSxHQUFxQixTQUFDLFlBQUQsRUFBZSxPQUFmO0FBQ25CLFVBQUE7TUFBQSxhQUFBLEdBQWdCLElBQUMsQ0FBQSxZQUFhLENBQUEsWUFBQTtNQUM5QixJQUFtQixxQkFBbkI7QUFBQSxlQUFPLEtBQVA7OytEQUMyQixDQUFFLGFBQTdCLG1EQUEyRCxDQUFFLGFBQTdELHdEQUM2QixDQUFFLGNBQTdCLG1EQUE0RCxDQUFFO0lBSjdDOzs2QkFNckIsY0FBQSxHQUFnQixTQUFDLFlBQUQsRUFBZSxRQUFmO0FBQ2QsVUFBQTtNQUFBLGFBQUEsK0VBQXNFO2FBQ3RFLElBQUMsQ0FBQSxTQUFTLENBQUMsb0JBQVgsQ0FBZ0MsWUFBaEMsRUFBOEMsUUFBUSxDQUFDLFdBQXZELEVBQW9FLFFBQVEsQ0FBQyxZQUE3RSxFQUEyRixhQUEzRjtJQUZjOzs2QkFJaEIsYUFBQSxHQUFlLFNBQUMsS0FBRCxFQUFRLFlBQVIsRUFBc0IsR0FBdEI7QUFDYixVQUFBO01BRG9DLGlCQUFNLG1DQUFzQixhQUFQO01BQ3pELFFBQUEsR0FBVyxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQVAsQ0FBZSxJQUFmO01BQ1gsYUFBQSxHQUFnQixJQUFDLENBQUEsWUFBYSxDQUFBLFlBQUE7TUFDOUIsSUFBQSxDQUFPLENBQUEsV0FBQSwyQkFBYyxhQUFhLENBQUUsb0JBQTdCLENBQVA7UUFDRSxXQUFBLEdBQWMsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsY0FBdkI7UUFDZCxJQUFvQyxhQUFwQztVQUFBLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBdEIsQ0FBMEIsS0FBMUIsRUFBQTs7O1VBQ0Esd0JBQXlCLHFCQUFBLENBQXNCO1lBQUMsUUFBQSxFQUFVLFFBQVg7V0FBdEI7O1FBQ3pCLHFCQUFxQixDQUFDLFFBQXRCLENBQStCLFdBQS9CLEVBQTRDLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUE7WUFDMUMsSUFBRyxpQ0FBSDtxQkFDRSxLQUFDLENBQUEsY0FBRCxDQUFnQixZQUFoQixFQUE4QixRQUE5QixFQURGOztVQUQwQztRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBNUM7UUFJQSxJQUFDLENBQUEsU0FBUyxDQUFDLFdBQVgsQ0FBdUIsV0FBdkI7UUFDQSxJQUFDLENBQUEsWUFBYSxDQUFBLFlBQUEsQ0FBZCxHQUE4QixhQUFBLEdBQWdCO1VBQUMsYUFBQSxXQUFEO1VBQWMsVUFBQSxRQUFkO1VBVGhEOztNQWFBLElBQUEsQ0FBeUMsV0FBVyxDQUFDLFFBQVosQ0FBcUIsUUFBckIsQ0FBekM7UUFBQSxXQUFXLENBQUMsV0FBWixDQUF3QixRQUF4QixFQUFBOztNQUVBLGFBQWEsQ0FBQyxhQUFkLEdBQThCO01BQzlCLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBbEIsR0FBd0IsYUFBYSxDQUFDLEdBQWQsR0FBb0I7TUFDNUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFsQixHQUF5QixhQUFhLENBQUMsSUFBZCxHQUFxQjthQUU5QyxJQUFDLENBQUEsY0FBRCxDQUFnQixZQUFoQixFQUE4QixRQUE5QjtJQXRCYTs7Ozs7QUE3QmpCIiwic291cmNlc0NvbnRlbnQiOlsiRWxlbWVudFJlc2l6ZURldGVjdG9yID0gcmVxdWlyZSgnZWxlbWVudC1yZXNpemUtZGV0ZWN0b3InKVxuZWxlbWVudFJlc2l6ZURldGVjdG9yID0gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBPdmVybGF5TWFuYWdlclxuICBjb25zdHJ1Y3RvcjogKEBwcmVzZW50ZXIsIEBjb250YWluZXIsIEB2aWV3cykgLT5cbiAgICBAb3ZlcmxheXNCeUlkID0ge31cblxuICByZW5kZXI6IChzdGF0ZSkgLT5cbiAgICBmb3IgZGVjb3JhdGlvbklkLCBvdmVybGF5IG9mIHN0YXRlLmNvbnRlbnQub3ZlcmxheXNcbiAgICAgIGlmIEBzaG91bGRVcGRhdGVPdmVybGF5KGRlY29yYXRpb25JZCwgb3ZlcmxheSlcbiAgICAgICAgQHJlbmRlck92ZXJsYXkoc3RhdGUsIGRlY29yYXRpb25JZCwgb3ZlcmxheSlcblxuICAgIGZvciBpZCwge292ZXJsYXlOb2RlfSBvZiBAb3ZlcmxheXNCeUlkXG4gICAgICB1bmxlc3Mgc3RhdGUuY29udGVudC5vdmVybGF5cy5oYXNPd25Qcm9wZXJ0eShpZClcbiAgICAgICAgZGVsZXRlIEBvdmVybGF5c0J5SWRbaWRdXG4gICAgICAgIG92ZXJsYXlOb2RlLnJlbW92ZSgpXG4gICAgICAgIGVsZW1lbnRSZXNpemVEZXRlY3Rvci51bmluc3RhbGwob3ZlcmxheU5vZGUpXG5cbiAgc2hvdWxkVXBkYXRlT3ZlcmxheTogKGRlY29yYXRpb25JZCwgb3ZlcmxheSkgLT5cbiAgICBjYWNoZWRPdmVybGF5ID0gQG92ZXJsYXlzQnlJZFtkZWNvcmF0aW9uSWRdXG4gICAgcmV0dXJuIHRydWUgdW5sZXNzIGNhY2hlZE92ZXJsYXk/XG4gICAgY2FjaGVkT3ZlcmxheS5waXhlbFBvc2l0aW9uPy50b3AgaXNudCBvdmVybGF5LnBpeGVsUG9zaXRpb24/LnRvcCBvclxuICAgICAgY2FjaGVkT3ZlcmxheS5waXhlbFBvc2l0aW9uPy5sZWZ0IGlzbnQgb3ZlcmxheS5waXhlbFBvc2l0aW9uPy5sZWZ0XG5cbiAgbWVhc3VyZU92ZXJsYXk6IChkZWNvcmF0aW9uSWQsIGl0ZW1WaWV3KSAtPlxuICAgIGNvbnRlbnRNYXJnaW4gPSBwYXJzZUludChnZXRDb21wdXRlZFN0eWxlKGl0ZW1WaWV3KVsnbWFyZ2luLWxlZnQnXSkgPyAwXG4gICAgQHByZXNlbnRlci5zZXRPdmVybGF5RGltZW5zaW9ucyhkZWNvcmF0aW9uSWQsIGl0ZW1WaWV3Lm9mZnNldFdpZHRoLCBpdGVtVmlldy5vZmZzZXRIZWlnaHQsIGNvbnRlbnRNYXJnaW4pXG5cbiAgcmVuZGVyT3ZlcmxheTogKHN0YXRlLCBkZWNvcmF0aW9uSWQsIHtpdGVtLCBwaXhlbFBvc2l0aW9uLCBjbGFzczoga2xhc3N9KSAtPlxuICAgIGl0ZW1WaWV3ID0gQHZpZXdzLmdldFZpZXcoaXRlbSlcbiAgICBjYWNoZWRPdmVybGF5ID0gQG92ZXJsYXlzQnlJZFtkZWNvcmF0aW9uSWRdXG4gICAgdW5sZXNzIG92ZXJsYXlOb2RlID0gY2FjaGVkT3ZlcmxheT8ub3ZlcmxheU5vZGVcbiAgICAgIG92ZXJsYXlOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXRvbS1vdmVybGF5JylcbiAgICAgIG92ZXJsYXlOb2RlLmNsYXNzTGlzdC5hZGQoa2xhc3MpIGlmIGtsYXNzP1xuICAgICAgZWxlbWVudFJlc2l6ZURldGVjdG9yID89IEVsZW1lbnRSZXNpemVEZXRlY3Rvcih7c3RyYXRlZ3k6ICdzY3JvbGwnfSlcbiAgICAgIGVsZW1lbnRSZXNpemVEZXRlY3Rvci5saXN0ZW5UbyhvdmVybGF5Tm9kZSwgPT5cbiAgICAgICAgaWYgb3ZlcmxheU5vZGUucGFyZW50RWxlbWVudD9cbiAgICAgICAgICBAbWVhc3VyZU92ZXJsYXkoZGVjb3JhdGlvbklkLCBpdGVtVmlldylcbiAgICAgIClcbiAgICAgIEBjb250YWluZXIuYXBwZW5kQ2hpbGQob3ZlcmxheU5vZGUpXG4gICAgICBAb3ZlcmxheXNCeUlkW2RlY29yYXRpb25JZF0gPSBjYWNoZWRPdmVybGF5ID0ge292ZXJsYXlOb2RlLCBpdGVtVmlld31cblxuICAgICMgVGhlIHNhbWUgbm9kZSBtYXkgYmUgdXNlZCBpbiBtb3JlIHRoYW4gb25lIG92ZXJsYXkuIFRoaXMgc3RlYWxzIHRoZSBub2RlXG4gICAgIyBiYWNrIGlmIGl0IGhhcyBiZWVuIGRpc3BsYXllZCBpbiBhbm90aGVyIG92ZXJsYXkuXG4gICAgb3ZlcmxheU5vZGUuYXBwZW5kQ2hpbGQoaXRlbVZpZXcpIHVubGVzcyBvdmVybGF5Tm9kZS5jb250YWlucyhpdGVtVmlldylcblxuICAgIGNhY2hlZE92ZXJsYXkucGl4ZWxQb3NpdGlvbiA9IHBpeGVsUG9zaXRpb25cbiAgICBvdmVybGF5Tm9kZS5zdHlsZS50b3AgPSBwaXhlbFBvc2l0aW9uLnRvcCArICdweCdcbiAgICBvdmVybGF5Tm9kZS5zdHlsZS5sZWZ0ID0gcGl4ZWxQb3NpdGlvbi5sZWZ0ICsgJ3B4J1xuXG4gICAgQG1lYXN1cmVPdmVybGF5KGRlY29yYXRpb25JZCwgaXRlbVZpZXcpXG4iXX0=
