(function() {
  var LayerDecoration, idCounter, nextId;

  idCounter = 0;

  nextId = function() {
    return idCounter++;
  };

  module.exports = LayerDecoration = (function() {
    function LayerDecoration(markerLayer, decorationManager, properties1) {
      this.markerLayer = markerLayer;
      this.decorationManager = decorationManager;
      this.properties = properties1;
      this.id = nextId();
      this.destroyed = false;
      this.markerLayerDestroyedDisposable = this.markerLayer.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this));
      this.overridePropertiesByMarker = null;
    }

    LayerDecoration.prototype.destroy = function() {
      if (this.destroyed) {
        return;
      }
      this.markerLayerDestroyedDisposable.dispose();
      this.markerLayerDestroyedDisposable = null;
      this.destroyed = true;
      return this.decorationManager.didDestroyLayerDecoration(this);
    };

    LayerDecoration.prototype.isDestroyed = function() {
      return this.destroyed;
    };

    LayerDecoration.prototype.getId = function() {
      return this.id;
    };

    LayerDecoration.prototype.getMarkerLayer = function() {
      return this.markerLayer;
    };

    LayerDecoration.prototype.getProperties = function() {
      return this.properties;
    };

    LayerDecoration.prototype.setProperties = function(newProperties) {
      if (this.destroyed) {
        return;
      }
      this.properties = newProperties;
      return this.decorationManager.emitDidUpdateDecorations();
    };

    LayerDecoration.prototype.setPropertiesForMarker = function(marker, properties) {
      if (this.destroyed) {
        return;
      }
      if (this.overridePropertiesByMarker == null) {
        this.overridePropertiesByMarker = new Map();
      }
      marker = this.markerLayer.getMarker(marker.id);
      if (properties != null) {
        this.overridePropertiesByMarker.set(marker, properties);
      } else {
        this.overridePropertiesByMarker["delete"](marker);
      }
      return this.decorationManager.emitDidUpdateDecorations();
    };

    LayerDecoration.prototype.getPropertiesForMarker = function(marker) {
      var ref;
      return (ref = this.overridePropertiesByMarker) != null ? ref.get(marker) : void 0;
    };

    return LayerDecoration;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2Rpc3RpbGxlci9hdG9tL291dC9hcHAvc3JjL2xheWVyLWRlY29yYXRpb24uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxTQUFBLEdBQVk7O0VBQ1osTUFBQSxHQUFTLFNBQUE7V0FBRyxTQUFBO0VBQUg7O0VBSVQsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLHlCQUFDLFdBQUQsRUFBZSxpQkFBZixFQUFtQyxXQUFuQztNQUFDLElBQUMsQ0FBQSxjQUFEO01BQWMsSUFBQyxDQUFBLG9CQUFEO01BQW9CLElBQUMsQ0FBQSxhQUFEO01BQzlDLElBQUMsQ0FBQSxFQUFELEdBQU0sTUFBQSxDQUFBO01BQ04sSUFBQyxDQUFBLFNBQUQsR0FBYTtNQUNiLElBQUMsQ0FBQSw4QkFBRCxHQUFrQyxJQUFDLENBQUEsV0FBVyxDQUFDLFlBQWIsQ0FBMEIsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxPQUFELENBQUE7UUFBSDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUI7TUFDbEMsSUFBQyxDQUFBLDBCQUFELEdBQThCO0lBSm5COzs4QkFPYixPQUFBLEdBQVMsU0FBQTtNQUNQLElBQVUsSUFBQyxDQUFBLFNBQVg7QUFBQSxlQUFBOztNQUNBLElBQUMsQ0FBQSw4QkFBOEIsQ0FBQyxPQUFoQyxDQUFBO01BQ0EsSUFBQyxDQUFBLDhCQUFELEdBQWtDO01BQ2xDLElBQUMsQ0FBQSxTQUFELEdBQWE7YUFDYixJQUFDLENBQUEsaUJBQWlCLENBQUMseUJBQW5CLENBQTZDLElBQTdDO0lBTE87OzhCQVVULFdBQUEsR0FBYSxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzhCQUViLEtBQUEsR0FBTyxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzhCQUVQLGNBQUEsR0FBZ0IsU0FBQTthQUFHLElBQUMsQ0FBQTtJQUFKOzs4QkFLaEIsYUFBQSxHQUFlLFNBQUE7YUFDYixJQUFDLENBQUE7SUFEWTs7OEJBUWYsYUFBQSxHQUFlLFNBQUMsYUFBRDtNQUNiLElBQVUsSUFBQyxDQUFBLFNBQVg7QUFBQSxlQUFBOztNQUNBLElBQUMsQ0FBQSxVQUFELEdBQWM7YUFDZCxJQUFDLENBQUEsaUJBQWlCLENBQUMsd0JBQW5CLENBQUE7SUFIYTs7OEJBV2Ysc0JBQUEsR0FBd0IsU0FBQyxNQUFELEVBQVMsVUFBVDtNQUN0QixJQUFVLElBQUMsQ0FBQSxTQUFYO0FBQUEsZUFBQTs7O1FBQ0EsSUFBQyxDQUFBLDZCQUFrQyxJQUFBLEdBQUEsQ0FBQTs7TUFDbkMsTUFBQSxHQUFTLElBQUMsQ0FBQSxXQUFXLENBQUMsU0FBYixDQUF1QixNQUFNLENBQUMsRUFBOUI7TUFDVCxJQUFHLGtCQUFIO1FBQ0UsSUFBQyxDQUFBLDBCQUEwQixDQUFDLEdBQTVCLENBQWdDLE1BQWhDLEVBQXdDLFVBQXhDLEVBREY7T0FBQSxNQUFBO1FBR0UsSUFBQyxDQUFBLDBCQUEwQixFQUFDLE1BQUQsRUFBM0IsQ0FBbUMsTUFBbkMsRUFIRjs7YUFJQSxJQUFDLENBQUEsaUJBQWlCLENBQUMsd0JBQW5CLENBQUE7SUFSc0I7OzhCQVV4QixzQkFBQSxHQUF3QixTQUFDLE1BQUQ7QUFDdEIsVUFBQTtrRUFBMkIsQ0FBRSxHQUE3QixDQUFpQyxNQUFqQztJQURzQjs7Ozs7QUE5RDFCIiwic291cmNlc0NvbnRlbnQiOlsiaWRDb3VudGVyID0gMFxubmV4dElkID0gLT4gaWRDb3VudGVyKytcblxuIyBFc3NlbnRpYWw6IFJlcHJlc2VudHMgYSBkZWNvcmF0aW9uIHRoYXQgYXBwbGllcyB0byBldmVyeSBtYXJrZXIgb24gYSBnaXZlblxuIyBsYXllci4gQ3JlYXRlZCB2aWEge1RleHRFZGl0b3I6OmRlY29yYXRlTWFya2VyTGF5ZXJ9LlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgTGF5ZXJEZWNvcmF0aW9uXG4gIGNvbnN0cnVjdG9yOiAoQG1hcmtlckxheWVyLCBAZGVjb3JhdGlvbk1hbmFnZXIsIEBwcm9wZXJ0aWVzKSAtPlxuICAgIEBpZCA9IG5leHRJZCgpXG4gICAgQGRlc3Ryb3llZCA9IGZhbHNlXG4gICAgQG1hcmtlckxheWVyRGVzdHJveWVkRGlzcG9zYWJsZSA9IEBtYXJrZXJMYXllci5vbkRpZERlc3Ryb3kgPT4gQGRlc3Ryb3koKVxuICAgIEBvdmVycmlkZVByb3BlcnRpZXNCeU1hcmtlciA9IG51bGxcblxuICAjIEVzc2VudGlhbDogRGVzdHJveXMgdGhlIGRlY29yYXRpb24uXG4gIGRlc3Ryb3k6IC0+XG4gICAgcmV0dXJuIGlmIEBkZXN0cm95ZWRcbiAgICBAbWFya2VyTGF5ZXJEZXN0cm95ZWREaXNwb3NhYmxlLmRpc3Bvc2UoKVxuICAgIEBtYXJrZXJMYXllckRlc3Ryb3llZERpc3Bvc2FibGUgPSBudWxsXG4gICAgQGRlc3Ryb3llZCA9IHRydWVcbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZGlkRGVzdHJveUxheWVyRGVjb3JhdGlvbih0aGlzKVxuXG4gICMgRXNzZW50aWFsOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGRlY29yYXRpb24gaXMgZGVzdHJveWVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNEZXN0cm95ZWQ6IC0+IEBkZXN0cm95ZWRcblxuICBnZXRJZDogLT4gQGlkXG5cbiAgZ2V0TWFya2VyTGF5ZXI6IC0+IEBtYXJrZXJMYXllclxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhpcyBkZWNvcmF0aW9uJ3MgcHJvcGVydGllcy5cbiAgI1xuICAjIFJldHVybnMgYW4ge09iamVjdH0uXG4gIGdldFByb3BlcnRpZXM6IC0+XG4gICAgQHByb3BlcnRpZXNcblxuICAjIEVzc2VudGlhbDogU2V0IHRoaXMgZGVjb3JhdGlvbidzIHByb3BlcnRpZXMuXG4gICNcbiAgIyAqIGBuZXdQcm9wZXJ0aWVzYCBTZWUge1RleHRFZGl0b3I6OmRlY29yYXRlTWFya2VyfSBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvblxuICAjICAgdGhlIHByb3BlcnRpZXMuIFRoZSBgdHlwZWAgb2YgYGd1dHRlcmAgYW5kIGBvdmVybGF5YCBhcmUgbm90IHN1cHBvcnRlZCBvblxuICAjICAgbGF5ZXIgZGVjb3JhdGlvbnMuXG4gIHNldFByb3BlcnRpZXM6IChuZXdQcm9wZXJ0aWVzKSAtPlxuICAgIHJldHVybiBpZiBAZGVzdHJveWVkXG4gICAgQHByb3BlcnRpZXMgPSBuZXdQcm9wZXJ0aWVzXG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLmVtaXREaWRVcGRhdGVEZWNvcmF0aW9ucygpXG5cbiAgIyBFc3NlbnRpYWw6IE92ZXJyaWRlIHRoZSBkZWNvcmF0aW9uIHByb3BlcnRpZXMgZm9yIGEgc3BlY2lmaWMgbWFya2VyLlxuICAjXG4gICMgKiBgbWFya2VyYCBUaGUge0Rpc3BsYXlNYXJrZXJ9IG9yIHtNYXJrZXJ9IGZvciB3aGljaCB0byBvdmVycmlkZVxuICAjICAgcHJvcGVydGllcy5cbiAgIyAqIGBwcm9wZXJ0aWVzYCBBbiB7T2JqZWN0fSBjb250YWluaW5nIHByb3BlcnRpZXMgdG8gYXBwbHkgdG8gdGhpcyBtYXJrZXIuXG4gICMgICBQYXNzIGBudWxsYCB0byBjbGVhciB0aGUgb3ZlcnJpZGUuXG4gIHNldFByb3BlcnRpZXNGb3JNYXJrZXI6IChtYXJrZXIsIHByb3BlcnRpZXMpIC0+XG4gICAgcmV0dXJuIGlmIEBkZXN0cm95ZWRcbiAgICBAb3ZlcnJpZGVQcm9wZXJ0aWVzQnlNYXJrZXIgPz0gbmV3IE1hcCgpXG4gICAgbWFya2VyID0gQG1hcmtlckxheWVyLmdldE1hcmtlcihtYXJrZXIuaWQpXG4gICAgaWYgcHJvcGVydGllcz9cbiAgICAgIEBvdmVycmlkZVByb3BlcnRpZXNCeU1hcmtlci5zZXQobWFya2VyLCBwcm9wZXJ0aWVzKVxuICAgIGVsc2VcbiAgICAgIEBvdmVycmlkZVByb3BlcnRpZXNCeU1hcmtlci5kZWxldGUobWFya2VyKVxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5lbWl0RGlkVXBkYXRlRGVjb3JhdGlvbnMoKVxuXG4gIGdldFByb3BlcnRpZXNGb3JNYXJrZXI6IChtYXJrZXIpIC0+XG4gICAgQG92ZXJyaWRlUHJvcGVydGllc0J5TWFya2VyPy5nZXQobWFya2VyKVxuIl19
