(function() {
  var CompositeDisposable, PaneContainerElement, _,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  CompositeDisposable = require('event-kit').CompositeDisposable;

  _ = require('underscore-plus');

  module.exports = PaneContainerElement = (function(superClass) {
    extend(PaneContainerElement, superClass);

    function PaneContainerElement() {
      return PaneContainerElement.__super__.constructor.apply(this, arguments);
    }

    PaneContainerElement.prototype.createdCallback = function() {
      this.subscriptions = new CompositeDisposable;
      return this.classList.add('panes');
    };

    PaneContainerElement.prototype.initialize = function(model, arg) {
      this.model = model;
      this.views = arg.views;
      if (this.views == null) {
        throw new Error("Must pass a views parameter when initializing PaneContainerElements");
      }
      this.subscriptions.add(this.model.observeRoot(this.rootChanged.bind(this)));
      return this;
    };

    PaneContainerElement.prototype.rootChanged = function(root) {
      var focusedElement, ref, view;
      if (this.hasFocus()) {
        focusedElement = document.activeElement;
      }
      if ((ref = this.firstChild) != null) {
        ref.remove();
      }
      if (root != null) {
        view = this.views.getView(root);
        this.appendChild(view);
        return focusedElement != null ? focusedElement.focus() : void 0;
      }
    };

    PaneContainerElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    return PaneContainerElement;

  })(HTMLElement);

  module.exports = PaneContainerElement = document.registerElement('atom-pane-container', {
    prototype: PaneContainerElement.prototype
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL3BhbmUtY29udGFpbmVyLWVsZW1lbnQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSw0Q0FBQTtJQUFBOzs7RUFBQyxzQkFBdUIsT0FBQSxDQUFRLFdBQVI7O0VBQ3hCLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBRUosTUFBTSxDQUFDLE9BQVAsR0FDTTs7Ozs7OzttQ0FDSixlQUFBLEdBQWlCLFNBQUE7TUFDZixJQUFDLENBQUEsYUFBRCxHQUFpQixJQUFJO2FBQ3JCLElBQUMsQ0FBQSxTQUFTLENBQUMsR0FBWCxDQUFlLE9BQWY7SUFGZTs7bUNBSWpCLFVBQUEsR0FBWSxTQUFDLEtBQUQsRUFBUyxHQUFUO01BQUMsSUFBQyxDQUFBLFFBQUQ7TUFBUyxJQUFDLENBQUEsUUFBRixJQUFFO01BQ3JCLElBQThGLGtCQUE5RjtBQUFBLGNBQVUsSUFBQSxLQUFBLENBQU0scUVBQU4sRUFBVjs7TUFFQSxJQUFDLENBQUEsYUFBYSxDQUFDLEdBQWYsQ0FBbUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxXQUFQLENBQW1CLElBQUMsQ0FBQSxXQUFXLENBQUMsSUFBYixDQUFrQixJQUFsQixDQUFuQixDQUFuQjthQUNBO0lBSlU7O21DQU1aLFdBQUEsR0FBYSxTQUFDLElBQUQ7QUFDWCxVQUFBO01BQUEsSUFBMkMsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUEzQztRQUFBLGNBQUEsR0FBaUIsUUFBUSxDQUFDLGNBQTFCOzs7V0FDVyxDQUFFLE1BQWIsQ0FBQTs7TUFDQSxJQUFHLFlBQUg7UUFDRSxJQUFBLEdBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFQLENBQWUsSUFBZjtRQUNQLElBQUMsQ0FBQSxXQUFELENBQWEsSUFBYjt3Q0FDQSxjQUFjLENBQUUsS0FBaEIsQ0FBQSxXQUhGOztJQUhXOzttQ0FRYixRQUFBLEdBQVUsU0FBQTthQUNSLElBQUEsS0FBUSxRQUFRLENBQUMsYUFBakIsSUFBa0MsSUFBQyxDQUFBLFFBQUQsQ0FBVSxRQUFRLENBQUMsYUFBbkI7SUFEMUI7Ozs7S0FuQnVCOztFQXVCbkMsTUFBTSxDQUFDLE9BQVAsR0FBaUIsb0JBQUEsR0FBdUIsUUFBUSxDQUFDLGVBQVQsQ0FBeUIscUJBQXpCLEVBQWdEO0lBQUEsU0FBQSxFQUFXLG9CQUFvQixDQUFDLFNBQWhDO0dBQWhEO0FBM0J4QyIsInNvdXJjZXNDb250ZW50IjpbIntDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFBhbmVDb250YWluZXJFbGVtZW50IGV4dGVuZHMgSFRNTEVsZW1lbnRcbiAgY3JlYXRlZENhbGxiYWNrOiAtPlxuICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAY2xhc3NMaXN0LmFkZCAncGFuZXMnXG5cbiAgaW5pdGlhbGl6ZTogKEBtb2RlbCwge0B2aWV3c30pIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgdmlld3MgcGFyYW1ldGVyIHdoZW4gaW5pdGlhbGl6aW5nIFBhbmVDb250YWluZXJFbGVtZW50c1wiKSB1bmxlc3MgQHZpZXdzP1xuXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBtb2RlbC5vYnNlcnZlUm9vdChAcm9vdENoYW5nZWQuYmluZCh0aGlzKSlcbiAgICB0aGlzXG5cbiAgcm9vdENoYW5nZWQ6IChyb290KSAtPlxuICAgIGZvY3VzZWRFbGVtZW50ID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCBpZiBAaGFzRm9jdXMoKVxuICAgIEBmaXJzdENoaWxkPy5yZW1vdmUoKVxuICAgIGlmIHJvb3Q/XG4gICAgICB2aWV3ID0gQHZpZXdzLmdldFZpZXcocm9vdClcbiAgICAgIEBhcHBlbmRDaGlsZCh2aWV3KVxuICAgICAgZm9jdXNlZEVsZW1lbnQ/LmZvY3VzKClcblxuICBoYXNGb2N1czogLT5cbiAgICB0aGlzIGlzIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgb3IgQGNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lQ29udGFpbmVyRWxlbWVudCA9IGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCAnYXRvbS1wYW5lLWNvbnRhaW5lcicsIHByb3RvdHlwZTogUGFuZUNvbnRhaW5lckVsZW1lbnQucHJvdG90eXBlXG4iXX0=
